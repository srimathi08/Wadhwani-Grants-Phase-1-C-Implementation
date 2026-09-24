import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import getApproverQueue from '@salesforce/apex/WCFApproverListController.getApproverQueue';

const PAGE_SIZE_OPTIONS = [
    { label: '10', value: '10' },
    { label: '20', value: '20' },
    { label: '50', value: '50' }
];

// ── Readable labels for every filter token (banner + tiles) ──────
const FILTER_LABELS = {
    pending         : 'Pending Decisions',
    backFromReviewer: 'Back from Reviewer',
    returned        : 'Returned to Reviewer',
    recYes          : 'Recommended',
    recNo           : 'Not Recommended',
    approved        : 'Approved',
    declined        : 'Declined'
};

// ── Summary tiles — same order and colors as the Approver Dashboard ──
const SUMMARY_TILES = [
    { id: 'pending',          countGetter: 'pendingCount',          tone: 'brand',    alertWhenPositive: true },
    { id: 'backFromReviewer', countGetter: 'backFromReviewerCount', tone: 'warning',  alertWhenPositive: true },
    { id: 'returned',         countGetter: 'returnedCount',         tone: 'returned' },
    { id: 'recYes',           countGetter: 'recommendedCount',      tone: 'info' },
    { id: 'recNo',            countGetter: 'notRecommendedCount',   tone: 'neutral' },
    { id: 'approved',         countGetter: 'approvedCount',         tone: 'success' },
    { id: 'declined',         countGetter: 'declinedCount',         tone: 'error' }
];

export default class WcfApproverListView extends NavigationMixin(LightningElement) {

    @track items        = [];
    @track isLoading    = true;
    @track searchTerm   = '';
    @track currentPage  = 1;
    @track pageSizeStr  = '10';
    @track _statusFilter = null;  // driven by summary tile clicks OR dashboard tile nav

    pageSizeOptions = PAGE_SIZE_OPTIONS;

    // ── Read statusFilter from dashboard tile navigation ──────────
    @wire(CurrentPageReference)
    wiredPageRef(pageRef) {
        if (pageRef?.state?.statusFilter) {
            this._statusFilter = pageRef.state.statusFilter;
            this.currentPage   = 1;
        }
    }

    connectedCallback() {
        this.loadData();
    }

    // ── Navigation helpers (unchanged) ────────────────────────────
    _basePath() {
        const parts = window.location.pathname.split('/');
        const sIdx  = parts.indexOf('s');
        if (sIdx !== -1) return parts.slice(0, sIdx + 1).join('/');
        return '';
    }

    _siteUrl(page, params = {}) {
        const base        = this._basePath();
        const queryString = Object.keys(params).length
            ? '?' + Object.entries(params)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join('&')
            : '';
        return `${base}/${page}${queryString}`;
    }

    async loadData() {
        this.isLoading = true;
        try {
            const raw = await getApproverQueue();
            this.items = (raw || []).filter(r => r.reviewStatus === 'Review Submitted');
        } catch (e) {
            console.error('Error loading approver queue:', e.body?.message);
        } finally {
            this.isLoading = false;
        }
    }

    // Options for the native rows-per-page <select>
    get pageSizeChoices() {
        return this.pageSizeOptions.map(o => ({ ...o, selected: o.value === this.pageSizeStr }));
    }

    get pageSize() { return parseInt(this.pageSizeStr, 10); }

    // ── Shared row-state rules (used by counts, filters and rows) ─
    _isPending(r) {
        const dec = r.existingDecision;
        if (!dec || dec === 'Revoke') return true;
        if (dec === 'Approved with Resubmission'
            && r.applicationStatus !== 'Returned by Approver') return true;
        return false;
    }
    _isBackFromReviewer(r) {
        return r.existingDecision === 'Approved with Resubmission'
            && r.applicationStatus !== 'Returned by Approver';
    }
    _isReturnedToReviewer(r) {
        return r.existingDecision === 'Approved with Resubmission'
            && r.applicationStatus === 'Returned by Approver';
    }

    // ── Summary counts (always computed from ALL items) ───────────
    get pendingCount()          { return this.items.filter(r => this._isPending(r)).length; }
    get backFromReviewerCount() { return this.items.filter(r => this._isBackFromReviewer(r)).length; }
    get returnedCount()         { return this.items.filter(r => this._isReturnedToReviewer(r)).length; }
    get recommendedCount()      { return this.items.filter(r => r.recommendation === 'Yes').length; }
    get notRecommendedCount()   { return this.items.filter(r => r.recommendation === 'No').length; }
    get approvedCount()         { return this.items.filter(r => r.existingDecision === 'Approve').length; }
    get declinedCount()         { return this.items.filter(r => r.existingDecision === 'Decline').length; }

    get summaryItems() {
        return SUMMARY_TILES.map(t => {
            const count    = this[t.countGetter] || 0;
            const isActive = this._statusFilter === t.id;
            const isAlert  = t.alertWhenPositive && count > 0;
            return {
                id      : t.id,
                label   : FILTER_LABELS[t.id],
                count,
                pressed : isActive ? 'true' : 'false',
                cls     : 'wg-stat'
                          + (isAlert  ? ' wg-stat--alert'  : '')
                          + (isActive ? ' wg-stat--active' : ''),
                dotCls  : 'wg-stat-dot wg-stat-dot--' + t.tone
            };
        });
    }

    get hasStatusFilter()   { return !!this._statusFilter; }
    get activeFilterLabel() { return FILTER_LABELS[this._statusFilter] || this._statusFilter || ''; }

    // ── Summary tile click: toggle filter on/off ──────────────────
    handleSummaryClick(evt) {
        const filter = evt.currentTarget.dataset.filter;
        this._statusFilter = (this._statusFilter === filter) ? null : filter;
        this.currentPage   = 1;
    }

    handleClearFilter() {
        this._statusFilter = null;
        this.currentPage   = 1;
    }

    get filteredItems() {
        let result = [...this.items];

        if (this._statusFilter) {
            switch (this._statusFilter) {
                case 'pending':
                    result = result.filter(r => this._isPending(r));
                    break;
                case 'recYes':
                    result = result.filter(r => r.recommendation === 'Yes');
                    break;
                case 'recNo':
                    result = result.filter(r => r.recommendation === 'No');
                    break;
                case 'approved':
                    result = result.filter(r => r.existingDecision === 'Approve');
                    break;
                case 'declined':
                    result = result.filter(r => r.existingDecision === 'Decline');
                    break;
                case 'backFromReviewer':
                    result = result.filter(r => this._isBackFromReviewer(r));
                    break;
                // FIX: the dashboard's "Returned" tile sends statusFilter=returned,
                // but this list had no case for it, so it showed every row.
                case 'returned':
                    result = result.filter(r => this._isReturnedToReviewer(r));
                    break;
                default:
                    break;
            }
        }

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            result = result.filter(r =>
                (r.applicationName  || '').toLowerCase().includes(term) ||
                (r.organizationName || '').toLowerCase().includes(term) ||
                (r.submitterName    || '').toLowerCase().includes(term) ||
                (r.headquarters     || '').toLowerCase().includes(term)
            );
        }
        return result;
    }

    get totalCount()    { return this.items.length; }
    get filteredCount() { return this.filteredItems.length; }
    get hasItems()      { return this.filteredCount > 0; }

    get subtitle() {
        const all   = this.totalCount;
        const shown = this.filteredCount;
        const noun  = all === 1 ? 'reviewed proposal' : 'reviewed proposals';
        return shown === all ? `${all} ${noun}` : `Showing ${shown} of ${all} ${noun}`;
    }

    // ── Pagination ────────────────────────────────────────────────
    get totalPages()      { return Math.ceil(this.filteredCount / this.pageSize) || 1; }
    get paginationStart() { return (this.currentPage - 1) * this.pageSize + 1; }
    get paginationEnd()   { return Math.min(this.currentPage * this.pageSize, this.filteredCount); }
    get isFirstPage()     { return this.currentPage === 1; }
    get isLastPage()      { return this.currentPage === this.totalPages; }

    get pageNumbers() {
        const pages = [];
        const total = this.totalPages;
        const curr  = this.currentPage;
        let start = Math.max(1, curr - 2);
        let end   = Math.min(total, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);
        for (let i = start; i <= end; i++) {
            const active = i === curr;
            pages.push({
                num     : i,
                btnClass: active ? 'wg-icon-btn wcf-pg-num wcf-pg-num--active' : 'wg-icon-btn wcf-pg-num',
                current : active ? 'page' : 'false'
            });
        }
        return pages;
    }

    get paginatedItems() {
        const start = (this.currentPage - 1) * this.pageSize;
        const SM = ' wg-btn-sm';

        return this.filteredItems.slice(start, start + this.pageSize).map((row, idx) => {

            // Track tags — same colors as every other portal screen
            const TAGS = {
                JF  : { label: 'Job Fulfillment',       cls: 'wg-tag wg-tag--info' },
                JC  : { label: 'Job Creation',          cls: 'wg-tag wg-tag--warning' },
                LU  : { label: 'Livelihood Upliftment', cls: 'wg-tag wg-tag--success' },
                Both: { label: 'JF + JC',               cls: 'wg-tag' }
            };
            const trackBadges = (row.track || '').split(',').filter(Boolean).map(code => {
                const trimmed = code.trim();
                const t = TAGS[trimmed] || { label: trimmed, cls: 'wg-tag' };
                return { code: trimmed, label: t.label, badgeClass: t.cls };
            });

            // Recommendation pill
            const rec = row.recommendation || '';
            let recBadgeClass = 'wg-pill wg-pill--neutral';
            if      (rec === 'Yes') recBadgeClass = 'wg-pill wg-pill--success';
            else if (rec === 'No')  recBadgeClass = 'wg-pill wg-pill--error';

            // Decision pill
            const dec = row.existingDecision || '';
            let decisionBadgeClass = 'wg-pill wg-pill--neutral';
            let decisionLabel = dec;

            if (dec === 'Approve' || dec === 'Accept') decisionBadgeClass = 'wg-pill wg-pill--success';
            else if (dec === 'Decline')               decisionBadgeClass = 'wg-pill wg-pill--error';
            else if (dec === 'Approved with Resubmission') {
                if (row.applicationStatus === 'Returned by Approver') {
                    decisionBadgeClass = 'wg-pill wg-pill--returned';
                    decisionLabel      = 'Returned to Reviewer';
                } else {
                    decisionBadgeClass = 'wg-pill wg-pill--warning';
                    decisionLabel      = 'Back from Reviewer';
                }
            }

            // Action button (same priority order as before)
            let actionLabel, actionBtnClass, actionIcon, isDisabled = false;
            const isBackFromReviewer = this._isBackFromReviewer(row);

            if (isBackFromReviewer) {
                actionLabel    = 'Start Reapprove';
                actionBtnClass = 'primary-btn' + SM;
                actionIcon     = 'utility:refresh';
            } else if (row.existingDecision) {
                actionLabel    = 'View Decision';
                actionBtnClass = 'neutral-btn' + SM;
                actionIcon     = 'utility:preview';
            } else if (!row.reviewId) {
                actionLabel    = 'Not Ready';
                actionBtnClass = 'neutral-btn' + SM;
                actionIcon     = 'utility:block_visitor';
                // FIX: "Not Ready" looked disabled but was still clickable and
                // navigated to the decision page without a review.
                isDisabled     = true;
            } else {
                actionLabel    = 'Start Approve';
                actionBtnClass = 'primary-btn' + SM;
                actionIcon     = 'utility:approval';
            }

            return {
                ...row,
                sno: start + idx + 1,
                // Rows the Reviewer sent back need the Approver's attention
                rowClass: isBackFromReviewer ? 'wg-row--attention' : '',
                trackBadges,
                recBadgeClass,
                recommendationLabel: rec || '—',
                decisionBadgeClass,
                decisionLabel,
                actionLabel,
                actionBtnClass,
                actionIcon,
                isDisabled
            };
        });
    }

    // ── Handlers ─────────────────────────────────────────────────
    handleSearch(evt)         { this.searchTerm    = evt.target.value; this.currentPage = 1; }
    handleRefresh()           { this._statusFilter = null; this.loadData(); }
    handlePrevPage()          { if (!this.isFirstPage) this.currentPage--; }
    handleNextPage()          { if (!this.isLastPage)  this.currentPage++; }
    handlePageClick(evt)      { this.currentPage = parseInt(evt.currentTarget.dataset.page, 10); }
    // Rows per page — native <select> (was lightning-combobox), so read evt.target.value
    handlePageSizeChange(evt) { this.pageSizeStr = evt.target.value; this.currentPage = 1; }

    handleStartApprove(evt) {
        const applicationId = evt.currentTarget.dataset.id;
        const appName       = evt.currentTarget.dataset.appname;
        const reviewId      = evt.currentTarget.dataset.reviewId;
        const track         = evt.currentTarget.dataset.track;
        const trackLabel    = evt.currentTarget.dataset.trackLabel;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: this._siteUrl('approvercontainer', { applicationId, appName, reviewId, track, trackLabel })
            }
        });
    }
}