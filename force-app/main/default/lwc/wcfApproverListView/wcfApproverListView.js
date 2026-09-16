import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import getApproverQueue from '@salesforce/apex/WCFApproverListController.getApproverQueue';

const PAGE_SIZE_OPTIONS = [
    { label: '10', value: '10' },
    { label: '20', value: '20' },
    { label: '50', value: '50' }
];

export default class WcfApproverListView extends NavigationMixin(LightningElement) {

    @track items        = [];
    @track isLoading    = true;
    @track searchTerm   = '';
    @track currentPage  = 1;
    @track pageSizeStr  = '10';
    @track _statusFilter = null;  // driven by summary bar clicks OR dashboard tile nav

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

    // ── Navigation helpers ────────────────────────────────────────
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
    get pageSize() { return parseInt(this.pageSizeStr, 10); }

    // ── Summary bar counts (always computed from ALL items) ───────
    get pendingCount() {
    return this.items.filter(r => {
        const dec = r.existingDecision;
        if (!dec || dec === 'Revoke') return true;
        if (dec === 'Approved with Resubmission'
            && r.applicationStatus !== 'Returned by Approver') return true;
        return false;
    }).length;
}
    get recommendedCount() { return this.items.filter(r => r.recommendation === 'Yes').length; }
    get approvedCount()    { return this.items.filter(r => r.existingDecision === 'Approve').length; }
    get declinedCount()    { return this.items.filter(r => r.existingDecision === 'Decline').length; }

    // ── Summary bar click: toggle filter on/off ───────────────────
    handleSummaryClick(evt) {
        const filter = evt.currentTarget.dataset.filter;
        this._statusFilter = (this._statusFilter === filter) ? null : filter;
        this.currentPage   = 1;
    }

    get filteredItems() {
        let result = [...this.items];

        if (this._statusFilter) {
            switch (this._statusFilter) {
               case 'pending':
    result = result.filter(r => {
        const dec = r.existingDecision;
        if (!dec || dec === 'Revoke') return true;
        if (dec === 'Approved with Resubmission'
            && r.applicationStatus !== 'Returned by Approver') return true;
        return false;
    });
    break;
                case 'recYes':
                    result = result.filter(r => r.recommendation === 'Yes');
                    break;
                 case 'recNo':                                         // ← NEW
        result = result.filter(r => r.recommendation === 'No');
        break;
                case 'approved':
                    result = result.filter(r => r.existingDecision === 'Approve');
                    break;
                case 'declined':
                    result = result.filter(r => r.existingDecision === 'Decline');
                    break;
                         // ── NEW: Reviewer sent it back, ready for Approver's final call ──
            case 'backFromReviewer':
                result = result.filter(r =>
                    r.existingDecision === 'Approved with Resubmission'
                    && r.applicationStatus !== 'Returned by Approver'
                );
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
            pages.push({ num: i, btnClass: i === curr ? 'pg-btn pg-btn-active' : 'pg-btn' });
        }
        return pages;
    }

    get paginatedItems() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredItems.slice(start, start + this.pageSize).map((row, idx) => {

            // Track badges
            const trackBadges = (row.track || '').split(',').filter(Boolean).map(code => {
                const trimmed = code.trim();
                let badgeClass = 'track-badge';
                if      (trimmed === 'Both') badgeClass += ' track-both';
                else if (trimmed === 'JF')   badgeClass += ' track-jf';
                else if (trimmed === 'JC')   badgeClass += ' track-jc';
                else if (trimmed === 'LU')   badgeClass += ' track-lu';
                return { code: trimmed, badgeClass };
            });

            // Review status badge
            const reviewStatusClass = 'status-badge status-recommended';

            // Recommendation badge
            const rec = row.recommendation || '';
            let recBadgeClass = 'rec-badge';
            if      (rec === 'Yes') recBadgeClass += ' rec-yes';
            else if (rec === 'No')  recBadgeClass += ' rec-no';

            // Decision badge
            const dec = row.existingDecision || '';
            let decisionBadgeClass = 'decision-badge';
            let decisionLabel = dec;   // ← NEW

            if      (dec === 'Approve') decisionBadgeClass += ' dec-approve';
            else if (dec === 'Decline') decisionBadgeClass += ' dec-decline';
            else if (dec === 'Approved with Resubmission') {
    decisionBadgeClass += row.applicationStatus === 'Returned by Approver'
        ? ' dec-returned'
        : ' dec-backfromreviewer';
    decisionLabel = row.applicationStatus === 'Returned by Approver'
        ? 'Returned to Reviewer'
        : 'Back from Reviewer';
}

// Action button
let actionLabel, actionBtnClass, actionIcon;
const isBackFromReviewer =
    row.existingDecision === 'Approved with Resubmission'
    && row.applicationStatus !== 'Returned by Approver';

if (isBackFromReviewer) {
    // ── NEW: Reviewer closed the loop — this needs a fresh decision,
    // even though existingDecision is still populated from the old
    // Return record. Distinct wording from "Start Approve" so the
    // Approver knows this is a re-review, not a first pass. ──
    actionLabel    = 'Start Reapprove';
    actionBtnClass = 'action-btn btn-validate';
    actionIcon     = 'utility:preview';
} else if (row.existingDecision) {
    actionLabel    = 'View Decision';
    actionBtnClass = 'action-btn btn-view';
    actionIcon     = 'utility:preview';
} else if (!row.reviewId) {
    actionLabel    = 'Not Ready';
    actionBtnClass = 'action-btn btn-disabled';
    actionIcon     = 'utility:block_visitor';
} else {
    actionLabel    = 'Start Approve';
    actionBtnClass = 'action-btn btn-start';
    actionIcon     = 'utility:approval';
}

            return {
                ...row,
                sno: start + idx + 1,
                rowClass: idx % 2 === 0 ? 'table-row row-even' : 'table-row row-odd',
                trackBadges,
                reviewStatusClass,
                recBadgeClass,
                decisionBadgeClass,
                decisionLabel, 
                actionLabel,
                actionBtnClass,
                actionIcon
            };
        });
    }

    // ── Handlers ─────────────────────────────────────────────────
    handleSearch(evt)         { this.searchTerm    = evt.target.value; this.currentPage = 1; }
    handleRefresh()           { this._statusFilter = null; this.loadData(); }
    handlePrevPage()          { if (!this.isFirstPage) this.currentPage--; }
    handleNextPage()          { if (!this.isLastPage)  this.currentPage++; }
    handlePageClick(evt)      { this.currentPage = parseInt(evt.currentTarget.dataset.page, 10); }
    handlePageSizeChange(evt) { this.pageSizeStr = evt.detail.value; this.currentPage = 1; }

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