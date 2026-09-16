import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
// ── NEW: resolves to '/reviewersite/s' in sandbox and '/internal/s' in production ──
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

export default class WcfProposalListView extends NavigationMixin(LightningElement) {
    @track proposals            = [];
    @track reviewStatusMap      = {};
    @track isLoading            = true;
    @track searchTerm           = '';
    @track selectedTrack        = '';
    @track selectedStatus       = '';
    @track currentPage          = 1;
    @track activeReviewFilter   = ''; // 'reviewed' | 'inProgress' | 'notStarted' | ''

    // pageSize stored as string to match combobox option values.
    // This prevents the "Select an Option" bug where a number (10)
    // doesn't match the string option value ('10')
    @track pageSizeStr  = '10';
    @track sortField    = 'CreatedDate';
    @track sortAscending = false;
    // ── add to @track state ──
@track acceptedApplicationsMap = new Map();

    pageSizeOptions = PAGE_SIZE_OPTIONS;
    trackOptions    = TRACK_OPTIONS;
    statusOptions   = STATUS_OPTIONS;

    // ─────────────────────────────────────────────────────────────
    // SITE BASE PATH (environment-independent navigation)
    // ─────────────────────────────────────────────────────────────
    // Hardcoding '/reviewersite/s/...' worked in sandbox only because the
    // site's own base path there IS '/reviewersite/s' — Experience Cloud
    // saw a URL that already started with the base path and left it alone.
    // In production the base path is '/internal/s', so the same literal got
    // prefixed => '/internal/s/reviewersite/s/review-forms' => "Invalid Page".
    //
    // @salesforce/community/basePath returns the correct prefix per org
    // ('/reviewersite/s', '/internal/s', or '' in Lightning app context),
    // so every URL below is built at runtime instead of being hardcoded.
    get sitePath() {
        return COMMUNITY_BASE_PATH || '';
    }

    /**
     * Build a site-relative URL.
     * @param {string} page  page API/URL name, e.g. 'review-forms'
     * @param {object} params optional query params (values are URI-encoded)
     */
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

    // ── Read review filter from page state on EVERY navigation, not just mount ──
    // Why: dashboard tiles navigate two different ways —
    //   1. reviewSummary.js uses NavigationMixin standard__webPage with a literal
    //      "?reviewFilter=xxx" query string.
    //   2. ValidatorPortalHome.js uses comm__namedPage with state: { reviewFilter }.
    // Neither of these reliably shows up in window.location.search at the time
    // connectedCallback runs, especially on SPA navigation (no full page reload).
    // CurrentPageReference is the supported way to read BOTH cases, and it re-fires
    // whenever page reference state changes, so it also fixes the "navigate while
    // already on this page" case that a one-time connectedCallback read can't catch.
    @wire(CurrentPageReference)
    setCurrentPageReference(pageRef) {
        if (!pageRef) return;

        // comm__namedPage state lands in pageRef.state
        // standard__webPage query params also land in pageRef.state on Experience Cloud
        const filter = pageRef.state?.reviewFilter || '';

        if (VALID_REVIEW_FILTERS.includes(filter)) {
            this.activeReviewFilter = filter === 'all' ? '' : filter;
        } else if (!filter) {
            // No filter param present on this navigation — clear any previously active filter
            // so navigating back to the plain list (e.g. via "View all") doesn't keep a stale filter.
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

    // ── pageSize as number for math ──────────────────────────────
    get pageSize() {
        return parseInt(this.pageSizeStr, 10);
    }

    // ── Filtering & Sorting ──────────────────────────────────────

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
        // ── Search ──────────────────────────────────────────────
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            result = result.filter(p =>
                (p.Name || '').toLowerCase().includes(term) ||
                (p.Organization_Name__c || '').toLowerCase().includes(term) ||
                (p.Submitter_Name__c || '').toLowerCase().includes(term) ||
                (p.Headquarters_City_and_Country__c || '').toLowerCase().includes(term)
            );
        }

        // ── Track filter ─────────────────────────────────────────
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

        // ── Status filter ────────────────────────────────────────
        if (this.selectedStatus) {
            result = result.filter(p => p.Status === this.selectedStatus);
        }

        // ── Sort ─────────────────────────────────────────────────
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
    // These mirror the ReviewSummaryController counts exactly
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
    // ── Active filter label (shown in UI when filter is active) ──
    get activeFilterLabel() {
        if (this.activeReviewFilter === 'reviewed')   return 'Reviewed';
        if (this.activeReviewFilter === 'inProgress') return 'In Progress';
        if (this.activeReviewFilter === 'notStarted') return 'Not Started';
         if (this.activeReviewFilter === 'flagged')    return 'Flagged';  // ADD
         if (this.activeReviewFilter === 'rejected')
    return 'Rejected';
        return '';
    }

    get hasActiveReviewFilter() { return !!this.activeReviewFilter; }

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
            pages.push({ num: i, btnClass: i === curr ? 'pg-btn pg-btn-active' : 'pg-btn' });
        }
        return pages;
    }

    handleFilterClick(evt) {
    const filter = evt.currentTarget.dataset.filter; // '' for Total, or reviewed/inProgress/notStarted/flagged
    this.activeReviewFilter = filter;
    this.currentPage = 1;
}
// ADD this new method
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
        
        return this.filteredProposals.slice(start, start + this.pageSize).map((p, idx) => {

            const reviewInfo   = this.reviewStatusMap[p.Id] || {};
            const isSubmitted  = reviewInfo.isSubmitted || false;
            const reviewStatus = reviewInfo.status || null;
            const reviewId     = reviewInfo.reviewId || null;
            const dueDate      = reviewInfo.dueDate || null;

            // ── Track badges (Multi-Track Aware) ─────────────────
            const rawTrack = p.Organizational_Area_s_for_Funding_Inves1__c || p.Organizational_Area_s_for_Funding_Inves__c || '';
            const rawLower = rawTrack.toLowerCase();
            const hasJF = rawLower.includes('fulfillment') || rawLower.includes('fulfilment') || rawLower.includes('jf') || rawLower.includes('both');
            const hasJC = rawLower.includes('creation') || rawLower.includes('jc') || rawLower.includes('both');
            const hasLU = rawLower.includes('livelihood') || rawLower.includes('upliftment') || rawLower.includes('lu');

            const trackBadges = [];
            if (hasJF) trackBadges.push({ code: 'JF', label: 'Job Fulfillment', badgeClass: 'track-badge track-jf' });
            if (hasJC) trackBadges.push({ code: 'JC', label: 'Job Creation', badgeClass: 'track-badge track-jc' });
            if (hasLU) trackBadges.push({ code: 'LU', label: 'Livelihood Upliftment', badgeClass: 'track-badge track-lu' });

            if (trackBadges.length === 0 && rawTrack) {
                trackBadges.push({ code: rawTrack, label: rawTrack, badgeClass: 'track-badge' });
            }

            const trackShort = trackBadges.map(b => b.code).join(', ');
            const trackParam = trackBadges.map(b => b.code).join(',');
            const trackBadgeClass = trackBadges.length > 0 ? trackBadges[0].badgeClass : 'track-badge';

            // ── Application Status badge ─────────────────────────
            const status = p.Status || '';
            let statusBadgeClass = 'status-badge';
            if (status === 'Submitted')               statusBadgeClass += ' status-submitted';
            else if (status === 'Under Review')       statusBadgeClass += ' status-under-review';
            else if (status === 'Revision Requested') statusBadgeClass += ' status-revision';
           // else if (status === 'Draft')              statusBadgeClass += ' status-draft';

            // ── Review Status badge ──────────────────────────────
            let reviewBadgeLabel = 'Not Started';
            let reviewBadgeClass = 'review-badge review-not-started';
            if (isSubmitted || reviewStatus === 'Review Submitted') {
                reviewBadgeLabel = 'Reviewed';
                reviewBadgeClass = 'review-badge review-done';
            } else if (reviewId && reviewStatus === 'In Progress') {
                reviewBadgeLabel = 'In Progress';
                reviewBadgeClass = 'review-badge review-progress';
            }

            // ── Action button ────────────────────────────────────
            // ── Action button ────────────────────────────────────
const isRejected = p.Status === 'Reviewer Rejected';
 const isAccepted = this.acceptedApplicationsMap.has(p.Id);

let actionLabel, actionBtnClass, actionIcon, reviewAction;
if (isRejected) {
    actionLabel    = 'Rejected';
    actionBtnClass = 'action-btn btn-disabled';
    actionIcon     = 'utility:ban';
    reviewAction   = 'rejected';
  } else if (isAccepted) {
            // ← NEW: overrides the normal View/Resume/Start action for accepted apps
            actionLabel    = 'Request Compliance';
            actionBtnClass = 'action-btn btn-compliance';
            actionIcon     = 'utility:new';
            reviewAction   = 'complianceRequest';
        } else if (isSubmitted || reviewStatus === 'Review Submitted') {
    actionLabel    = 'View Review';
    actionBtnClass = 'action-btn btn-done';
    actionIcon     = 'utility:preview';
    reviewAction   = 'view';
} else if (reviewId && reviewStatus === 'In Progress') {
    actionLabel    = 'Resume Review';
    actionBtnClass = 'action-btn btn-resume';
    actionIcon     = 'utility:redo';
    reviewAction   = 'resume';
} else {
    actionLabel    = 'Start Review';
    actionBtnClass = 'action-btn btn-start';
    actionIcon     = 'utility:play';
    reviewAction   = 'start';
}
            // ── Due date styling ─────────────────────────────────
           // AFTER:
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
            // ── Date formatting ──────────────────────────────────
            const formattedDate = p.CreatedDate
                ? new Date(p.CreatedDate).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })
                : '—';

            return {
                ...p,
                sno: start + idx + 1,
                rowClass: idx % 2 === 0 ? 'table-row row-even' : 'table-row row-odd',
                trackShort,
                trackParam,
                trackBadges,
                trackBadgeClass,
                statusBadgeClass,
                reviewBadgeLabel, reviewBadgeClass,
                formattedDate,
                reviewId, reviewAction,
                approverComment: this.acceptedApplicationsMap.get(p.Id) || '—',   // ← NEW
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
    get flaggedCount() {
    return this.proposals.filter(p => {
        return !!(this.reviewStatusMap[p.Id] || {}).isFlagged;
    }).length;
}

get rejectedCount() {
    return this.proposals.filter(p => {
        return p.Status === 'Reviewer Rejected';
    }).length;
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
        this.activeReviewFilter = ''; // also clears dashboard-driven filter
        this.currentPage        = 1;
    }

    // ── Clear just the review filter pill ────────────────────────
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

    // ── Navigation ───────────────────────────────────────────────
handleReviewAction(evt) {
    const action = evt.currentTarget.dataset.action;
        if (action === 'rejected') return;

    if (action === 'complianceRequest') {
        const proposalId = evt.currentTarget.dataset.id;
        const appName    = evt.currentTarget.dataset.appname;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                // CHANGED: was `/reviewersite/s/wg-compliance-documents?...`
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

/**
 * Shared reviewer navigation logic.
 * - Non-English (Mexico / Brazil HQ) → IA record page (for Translate button)
 * - English, action=start, no reviewId → review form with recordId=new
 * - English, action=resume/view, reviewId exists → direct to review form
 *
 * NOTE: this is the definition that actually runs. An earlier duplicate of the
 * same method name existed in the original file and was silently overridden by
 * this one (last definition wins in a JS class), so it has been removed —
 * runtime behaviour is unchanged.
 *
 * @param {string} proposalId   - IndividualApplication Id
 * @param {string} appName      - Application Name (e.g. IA-0000000518)
 * @param {string} reviewId     - ApplicationReview Id (null for 'start')
 * @param {string} action       - 'start' | 'resume' | 'view'
 * @param {string} headquarters - Headquarters_City_and_Country__c value
 * @param {string} track        - passed through for record creation
 */
async _navigateReviewer(proposalId, appName, reviewId, action, headquarters, track) {
    const hq = (headquarters || '').toLowerCase();
    const isNonEnglish = hq.includes('mexico') || hq.includes('brazil');

   /* if (isNonEnglish) {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: this._siteUrl(`individualapplication/${proposalId}/${(appName || '').toLowerCase()}`)
            }
        });
        return;
    } */

    if ((action === 'resume' || action === 'view') && reviewId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                // CHANGED: was `/reviewersite/s/review-forms?...`
                url: this._siteUrl('review-forms', {
                    recordId      : reviewId,
                    applicationId : proposalId,
                    action        : action
                })
            }
        });
        return;
    }

    // English + start → create record then navigate
    this[NavigationMixin.Navigate]({
        type: 'standard__webPage',
        attributes: {
            // CHANGED: was `/reviewersite/s/review-forms?recordId=new...`
            url: this._siteUrl('review-forms', {
                recordId      : 'new',
                applicationId : proposalId,
                track         : track
            })
        }
    });
}

  /*  handleRowClick(evt) {
        evt.preventDefault();
        const proposalId = evt.currentTarget.dataset.id;
        const appName    = evt.currentTarget.dataset.appname;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                // CHANGED: was `/reviewersite/s/individualapplication/...`
                url: this._siteUrl(`individualapplication/${proposalId}/${(appName || '').toLowerCase()}`)
            }
        });
    } */

    get isAcceptedFilterActive() {
    return this.activeReviewFilter === 'acceptedApplications';
}
}