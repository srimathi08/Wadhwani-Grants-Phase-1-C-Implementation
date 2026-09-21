import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
// ── resolves to '/reviewersite/s' in sandbox and '/internal/s' in production ──
import COMMUNITY_BASE_PATH from '@salesforce/community/basePath';
import getValidatedProposals  from '@salesforce/apex/WCFProposalListController.getValidatedProposals';
import getReviewStatusMap     from '@salesforce/apex/WCFProposalListController.getReviewStatusMap';
import getAcceptedApplicationsQueue from '@salesforce/apex/WCFProposalListController.getAcceptedApplicationsQueue';

const PAGE_SIZE_OPTIONS = [
    { label: '10', value: '10' },
    { label: '20', value: '20' },
    { label: '50', value: '50' }
];

const TRACK_OPTIONS = [
    { label: 'All Tracks',                               value: '' },
    { label: 'Job Fulfillment Only',                     value: 'Job Fulfillment Only' },
    { label: 'Job Creation Only',                        value: 'Job Creation Only' },
    { label: 'Livelihood Upliftment',                    value: 'Livelihood Upliftment' },
    { label: 'Both Job Fulfillment and Job Creation',    value: 'Both' }
];

const STATUS_OPTIONS = [
    { label: 'All Statuses',                      value: '' },
    { label: 'Under Review',                      value: 'Under Review' },
    { label: 'Review Completed - Recommended',    value: 'Review Completed - Recommended' },
    { label: 'Review Completed - Not Recommended',value: 'Review Completed - Not Recommended' }
];

const VALID_REVIEW_FILTERS = ['total', 'reviewed', 'inProgress', 'notStarted', 'all',
    'flagged', 'rejected', 'returnedByApprover', 'acceptedApplications'];

// ── Readable labels for every filter token (banner + tiles) ──────
const FILTER_LABELS = {
    total               : 'Validated Proposals',
    reviewed            : 'Reviewed',
    inProgress          : 'In Progress',
    notStarted          : 'Not Started',
    flagged             : 'Flagged',
    rejected            : 'Rejected',
    returnedByApprover  : 'Returned by Approver',
    acceptedApplications: 'Accepted Applications'
};

// ── Summary tiles (order = display order) — same shared tile as the validator queue ──
const SUMMARY_TILES = [
    { id: 'total',                countGetter: 'totalCount',              tone: 'info' },
    { id: 'notStarted',           countGetter: 'notStartedCount',         tone: 'neutral' },
    { id: 'inProgress',           countGetter: 'inProgressCount',         tone: 'warning' },
    { id: 'reviewed',             countGetter: 'reviewedCount',           tone: 'success' },
    { id: 'returnedByApprover',   countGetter: 'returnedByApproverCount', tone: 'brand', alertWhenPositive: true },
    { id: 'acceptedApplications', countGetter: 'acceptedCount',           tone: 'success' },
    { id: 'flagged',              countGetter: 'flaggedCount',            tone: 'returned' },
    { id: 'rejected',             countGetter: 'rejectedCount',           tone: 'error' }
];

export default class WcfProposalListView extends NavigationMixin(LightningElement) {
    @track proposals            = [];
    @track reviewStatusMap      = {};
    @track isLoading            = true;
    @track searchTerm           = '';
    @track selectedTrack        = '';
    @track selectedStatus       = '';
    @track currentPage          = 1;
    @track activeReviewFilter   = '';

    // pageSize stored as string to match combobox option values.
    @track pageSizeStr  = '10';
    @track sortField    = 'CreatedDate';
    @track sortAscending = false;
    @track acceptedApplicationsMap = new Map();

    pageSizeOptions = PAGE_SIZE_OPTIONS;
    trackOptions    = TRACK_OPTIONS;
    statusOptions   = STATUS_OPTIONS;

    // ─────────────────────────────────────────────────────────────
    // SITE BASE PATH (environment-independent navigation)
    // ─────────────────────────────────────────────────────────────
    get sitePath() {
        return COMMUNITY_BASE_PATH || '';
    }

    _siteUrl(page, params) {
        const path  = String(page || '').replace(/^\/+/, '');
        let url     = `${this.sitePath}/${path}`;
        if (params) {
            const qs = Object.keys(params)
                .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
                .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
                .join('&');
            if (qs) url += `?${qs}`;
        }
        return url;
    }

    // ── Read review filter from page state on EVERY navigation ──
    @wire(CurrentPageReference)
    setCurrentPageReference(pageRef) {
        if (!pageRef) return;
        const filter = pageRef.state?.reviewFilter || '';

        if (VALID_REVIEW_FILTERS.includes(filter)) {
            this.activeReviewFilter = filter === 'all' ? '' : filter;
        } else if (!filter) {
            this.activeReviewFilter = '';
        }
        this.currentPage = 1;
    }

    connectedCallback() {
        this.loadData();
        this.loadAcceptedApplications();
    }

    async loadAcceptedApplications() {
        try {
            const rows = await getAcceptedApplicationsQueue();
            const map = new Map();
            (rows || []).forEach(r => map.set(r.applicationId, r.approverComment));
            this.acceptedApplicationsMap = map;
        } catch (e) {
            console.error('Accepted applications error:', e);
        }
    }

    async loadData() {
        this.isLoading = true;
        try {
            const [proposals, reviewMap] = await Promise.all([
                getValidatedProposals(),
                getReviewStatusMap()
            ]);
            this.proposals       = proposals;
            this.reviewStatusMap = reviewMap || {};
        } catch (e) {
            console.error('Error loading proposals:', e);
        } finally {
            this.isLoading = false;
        }
    }

    get pageSize() {
        return parseInt(this.pageSizeStr, 10);
    }

    // ── Filtering & Sorting (unchanged) ──────────────────────────
    get filteredProposals() {
        let result = [...this.proposals];

        if (this.activeReviewFilter) {
            result = result.filter(p => {
                const info = this.reviewStatusMap[p.Id] || {};

                if (this.activeReviewFilter === 'total') {
                    return this._isEligibleForQueue(p);
                }
                if (this.activeReviewFilter === 'reviewed') {
                    return this._isEligibleForQueue(p) &&
                           (info.isSubmitted || info.status === 'Review Submitted');
                }
                if (this.activeReviewFilter === 'inProgress') {
                    return this._isEligibleForQueue(p) &&
                           !info.isSubmitted && info.status === 'In Progress';
                }
                if (this.activeReviewFilter === 'notStarted') {
                    return this._isEligibleForQueue(p) &&
                           !info.isSubmitted && info.status !== 'In Progress';
                }
                if (this.activeReviewFilter === 'flagged') {
                    return !!info.isFlagged;
                }
                if (this.activeReviewFilter === 'rejected') {
                    return p.Status === 'Reviewer Rejected';
                }
                if (this.activeReviewFilter === 'returnedByApprover') {
                    return p.Status === 'Returned by Approver';
                }
                if (this.activeReviewFilter === 'acceptedApplications') {
                    return this.acceptedApplicationsMap.has(p.Id);
                }
                return true;
            });
        }

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            result = result.filter(p =>
                (p.Name || '').toLowerCase().includes(term) ||
                (p.Organization_Name__c || '').toLowerCase().includes(term) ||
                (p.Submitter_Name__c || '').toLowerCase().includes(term) ||
                (p.Headquarters_City_and_Country__c || '').toLowerCase().includes(term)
            );
        }

        if (this.selectedTrack) {
            const t = this.selectedTrack.toLowerCase();
            result = result.filter(p => {
                const track1 = (p.Organizational_Area_s_for_Funding_Inves1__c || '').toLowerCase();
                const trackLegacy = (p.Organizational_Area_s_for_Funding_Inves__c || '').toLowerCase();
                const combined = track1 + ' ' + trackLegacy;
                if (t === 'both') return combined.includes('both') || (combined.includes('creation') && combined.includes('fulfillment'));
                if (t.includes('livelihood') || t.includes('upliftment') || t === 'lu') return combined.includes('livelihood') || combined.includes('upliftment') || combined.includes('lu');
                if (t.includes('creation') || t === 'jc') return combined.includes('creation') || combined.includes('jc');
                if (t.includes('fulfillment') || t.includes('fulfilment') || t === 'jf') return combined.includes('fulfillment') || combined.includes('fulfilment') || combined.includes('jf');
                return combined.includes(t);
            });
        }

        if (this.selectedStatus) {
            result = result.filter(p => p.Status === this.selectedStatus);
        }

        result.sort((a, b) => {
            let valA = a[this.sortField] || '';
            let valB = b[this.sortField] || '';
            if (valA < valB) return this.sortAscending ? -1 : 1;
            if (valA > valB) return this.sortAscending ? 1 : -1;
            return 0;
        });

        return result;
    }

    get filteredCount() { return this.filteredProposals.length; }

    // ── Shared eligibility rule — MUST match every summary tile getter below ──
    _isEligibleForQueue(p) {
        const info = this.reviewStatusMap[p.Id] || {};
        return !info.isFlagged &&
               p.Status !== 'Reviewer Rejected' &&
               p.Status !== 'Returned by Approver';
    }

    get totalCount() {
        return this.proposals.filter(p => this._isEligibleForQueue(p)).length;
    }
    get hasProposals()  { return this.filteredCount > 0; }

    // ── Summary counters (always based on ALL proposals, not filtered) ──
    get reviewedCount() {
        return this.proposals.filter(p => {
            if (!this._isEligibleForQueue(p)) return false;
            const info = this.reviewStatusMap[p.Id] || {};
            return info.isSubmitted || info.status === 'Review Submitted';
        }).length;
    }

    get inProgressCount() {
        return this.proposals.filter(p => {
            if (!this._isEligibleForQueue(p)) return false;
            const info = this.reviewStatusMap[p.Id] || {};
            return !info.isSubmitted && info.status === 'In Progress';
        }).length;
    }

    get notStartedCount() {
        return this.proposals.filter(p => {
            if (!this._isEligibleForQueue(p)) return false;
            const info = this.reviewStatusMap[p.Id] || {};
            return !info.isSubmitted && info.status !== 'In Progress';
        }).length;
    }

    get flaggedCount() {
        return this.proposals.filter(p => !!(this.reviewStatusMap[p.Id] || {}).isFlagged).length;
    }

    get rejectedCount() {
        return this.proposals.filter(p => p.Status === 'Reviewer Rejected').length;
    }

    // NEW (display only): same rules the existing filters already use,
    // so the dashboard's "Returned by Approver" / "Accepted" tiles now
    // have a matching tile and count here.
    get returnedByApproverCount() {
        return this.proposals.filter(p => p.Status === 'Returned by Approver').length;
    }

    get acceptedCount() {
        return this.proposals.filter(p => this.acceptedApplicationsMap.has(p.Id)).length;
    }

    // ── Summary tiles for the template ───────────────────────────
    get summaryItems() {
        return SUMMARY_TILES.map(t => {
            const count    = this[t.countGetter] || 0;
            const isActive = this.activeReviewFilter === t.id;
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

    // ── Active filter label (banner) ─────────────────────────────
    get activeFilterLabel() {
        return FILTER_LABELS[this.activeReviewFilter] || '';
    }

    get hasActiveReviewFilter() { return !!this.activeReviewFilter; }

    // FIX: was "{filteredCount} of {totalCount}" — totalCount excludes flagged,
    // rejected and returned rows, so the unfiltered list could read "150 of 144".
    get subtitle() {
        const all   = (this.proposals || []).length;
        const shown = this.filteredCount;
        const noun  = all === 1 ? 'validated proposal' : 'validated proposals';
        return shown === all ? `${all} ${noun}` : `Showing ${shown} of ${all} ${noun}`;
    }

    // ── Pagination ───────────────────────────────────────────────
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

    // Clicking the active tile again clears the filter (same as the validator queue)
    handleFilterClick(evt) {
        const filter = evt.currentTarget.dataset.filter;
        this.activeReviewFilter = this.activeReviewFilter === filter ? '' : filter;
        this.currentPage = 1;
    }

    _parseDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return new Date(
                parseInt(parts[0], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[2], 10)
            );
        }
        return new Date(dateStr);
    }

    get paginatedProposals() {
        const start = (this.currentPage - 1) * this.pageSize;
        const SM = ' wg-btn-sm';

        return this.filteredProposals.slice(start, start + this.pageSize).map((p, idx) => {

            const reviewInfo   = this.reviewStatusMap[p.Id] || {};
            const isSubmitted  = reviewInfo.isSubmitted || false;
            const reviewStatus = reviewInfo.status || null;
            const reviewId     = reviewInfo.reviewId || null;
            const dueDate      = reviewInfo.dueDate || null;

            // ── Track tags (same colors as every other portal screen) ──
            const rawTrack = p.Organizational_Area_s_for_Funding_Inves1__c || p.Organizational_Area_s_for_Funding_Inves__c || '';
            const rawLower = rawTrack.toLowerCase();
            const hasJF = rawLower.includes('fulfillment') || rawLower.includes('fulfilment') || rawLower.includes('jf') || rawLower.includes('both');
            const hasJC = rawLower.includes('creation') || rawLower.includes('jc') || rawLower.includes('both');
            const hasLU = rawLower.includes('livelihood') || rawLower.includes('upliftment') || rawLower.includes('lu');

            const trackBadges = [];
            if (hasJF) trackBadges.push({ code: 'JF', label: 'Job Fulfillment',       badgeClass: 'wg-tag wg-tag--info' });
            if (hasJC) trackBadges.push({ code: 'JC', label: 'Job Creation',          badgeClass: 'wg-tag wg-tag--warning' });
            if (hasLU) trackBadges.push({ code: 'LU', label: 'Livelihood Upliftment', badgeClass: 'wg-tag wg-tag--success' });

            if (trackBadges.length === 0 && rawTrack) {
                trackBadges.push({ code: rawTrack, label: rawTrack, badgeClass: 'wg-tag' });
            }

            const trackShort = trackBadges.map(b => b.code).join(', ');
            const trackParam = trackBadges.map(b => b.code).join(',');
            const trackBadgeClass = trackBadges.length > 0 ? trackBadges[0].badgeClass : 'wg-tag';

            // ── Application status pill (column currently hidden in the template) ──
            const status = p.Status || '';
            let statusBadgeClass = 'wg-pill wg-pill--neutral';
            if (status === 'Submitted' || status === 'Under Review') statusBadgeClass = 'wg-pill wg-pill--info';
            else if (status === 'Revision Requested')                statusBadgeClass = 'wg-pill wg-pill--returned';

            // ── Review status pill ──
            let reviewBadgeLabel = 'Not Started';
            let reviewBadgeClass = 'wg-pill wg-pill--neutral';
            if (isSubmitted || reviewStatus === 'Review Submitted') {
                reviewBadgeLabel = 'Reviewed';
                reviewBadgeClass = 'wg-pill wg-pill--success';
            } else if (reviewId && reviewStatus === 'In Progress') {
                reviewBadgeLabel = 'In Progress';
                reviewBadgeClass = 'wg-pill wg-pill--warning';
            }

            // ── Action button (same priority order as before) ──
            const isRejected = p.Status === 'Reviewer Rejected';
            const isAccepted = this.acceptedApplicationsMap.has(p.Id);

            let actionLabel, actionBtnClass, actionIcon, reviewAction;
            if (isRejected) {
                actionLabel    = 'Rejected';
                actionBtnClass = 'neutral-btn' + SM;
                actionIcon     = 'utility:ban';
                reviewAction   = 'rejected';
            } else if (isAccepted) {
                actionLabel    = 'Request Compliance';
                actionBtnClass = 'success-btn' + SM;
                actionIcon     = 'utility:new';
                reviewAction   = 'complianceRequest';
            } else if (isSubmitted || reviewStatus === 'Review Submitted') {
                actionLabel    = 'View Review';
                actionBtnClass = 'neutral-btn' + SM;
                actionIcon     = 'utility:preview';
                reviewAction   = 'view';
            } else if (reviewId && reviewStatus === 'In Progress') {
                actionLabel    = 'Resume Review';
                actionBtnClass = 'primary-btn' + SM;
                actionIcon     = 'utility:edit';
                reviewAction   = 'resume';
            } else {
                actionLabel    = 'Start Review';
                actionBtnClass = 'primary-btn' + SM;
                actionIcon     = 'utility:play';
                reviewAction   = 'start';
            }

            // ── Due date ──
            const parsedDue    = this._parseDate(dueDate);
            let dueDateDisplay = parsedDue
                ? parsedDue.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
            let dueDateClass   = 'due-date';
            if (parsedDue && !isSubmitted) {
                const today    = new Date(); today.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((parsedDue - today) / 86400000);
                if (diffDays < 0)       dueDateClass = 'due-date due-overdue';
                else if (diffDays <= 3) dueDateClass = 'due-date due-urgent';
            }

            const formattedDate = p.CreatedDate
                ? new Date(p.CreatedDate).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })
                : '—';

            return {
                ...p,
                sno: start + idx + 1,
                // Rows waiting on the reviewer's Approve/Return decision stand out
                rowClass: p.Status === 'Returned by Approver' ? 'wg-row--attention' : '',
                trackShort,
                trackParam,
                trackBadges,
                trackBadgeClass,
                statusBadgeClass,
                reviewBadgeLabel, reviewBadgeClass,
                formattedDate,
                reviewId, reviewAction,
                approverComment: this.acceptedApplicationsMap.get(p.Id) || '—',
                actionLabel, actionBtnClass, actionIcon,
                dueDateDisplay, dueDateClass,
                isRejected
            };
        });
    }

    // ── Sort ─────────────────────────────────────────────────────
    get isSortedByName() { return this.sortField === 'Name'; }
    get isSortedByDate() { return this.sortField === 'CreatedDate'; }
    get sortIcon()       { return this.sortAscending ? 'utility:arrowup' : 'utility:arrowdown'; }

    get sortIconName()  { return this.isSortedByName ? this.sortIcon : 'utility:sort'; }
    get sortClassName() { return 'wg-sort' + (this.isSortedByName ? ' wg-sort--active' : ''); }
    get ariaSortName() {
        if (!this.isSortedByName) return 'none';
        return this.sortAscending ? 'ascending' : 'descending';
    }

    handleSort(evt) {
        const field = evt.currentTarget.dataset.field;
        if (this.sortField === field) {
            this.sortAscending = !this.sortAscending;
        } else {
            this.sortField     = field;
            this.sortAscending = true;
        }
        this.currentPage = 1;
    }

    // ── Filter handlers ──────────────────────────────────────────
    handleSearch(evt)       { this.searchTerm     = evt.target.value;  this.currentPage = 1; }
    handleTrackFilter(evt)  { this.selectedTrack  = evt.detail.value;  this.currentPage = 1; }
    handleStatusFilter(evt) { this.selectedStatus = evt.detail.value;  this.currentPage = 1; }

    handleClearFilters() {
        this.searchTerm         = '';
        this.selectedTrack      = '';
        this.selectedStatus     = '';
        this.activeReviewFilter = '';
        this.currentPage        = 1;
    }

    handleClearReviewFilter() {
        this.activeReviewFilter = '';
        this.currentPage        = 1;
    }

    handleRefresh() {
        this.loadData();
    }

    // ── Pagination handlers ──────────────────────────────────────
    handlePrevPage()     { if (!this.isFirstPage) this.currentPage--; }
    handleNextPage()     { if (!this.isLastPage)  this.currentPage++; }
    handlePageClick(evt) { this.currentPage = parseInt(evt.currentTarget.dataset.page, 10); }

    handlePageSizeChange(evt) {
        this.pageSizeStr = evt.detail.value;
        this.currentPage = 1;
    }

    // ── Navigation (unchanged) ───────────────────────────────────
    handleReviewAction(evt) {
        const action = evt.currentTarget.dataset.action;
        if (action === 'rejected') return;

        if (action === 'complianceRequest') {
            const proposalId = evt.currentTarget.dataset.id;
            const appName    = evt.currentTarget.dataset.appname;
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    url: this._siteUrl('wg-compliance-documents', {
                        applicationId : proposalId,
                        appName       : appName
                    })
                }
            });
            return;
        }

        const proposalId   = evt.currentTarget.dataset.id;
        const appName      = evt.currentTarget.dataset.appname;
        const reviewId     = evt.currentTarget.dataset.reviewId;
        const headquarters = evt.currentTarget.dataset.headquarters;
        const track        = evt.currentTarget.dataset.track;
        this._navigateReviewer(proposalId, appName, reviewId, action, headquarters, track);
    }

    async _navigateReviewer(proposalId, appName, reviewId, action, headquarters, track) {
        if ((action === 'resume' || action === 'view') && reviewId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    url: this._siteUrl('review-forms', {
                        recordId      : reviewId,
                        applicationId : proposalId,
                        action        : action
                    })
                }
            });
            return;
        }

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: this._siteUrl('review-forms', {
                    recordId      : 'new',
                    applicationId : proposalId,
                    track         : track
                })
            }
        });
    }

    get isAcceptedFilterActive() {
        return this.activeReviewFilter === 'acceptedApplications';
    }
}