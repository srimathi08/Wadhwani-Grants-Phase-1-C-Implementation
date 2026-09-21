import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getApplicationList from '@salesforce/apex/WCFValidatorController.getApplicationList';
import getActionCounts    from '@salesforce/apex/WCFValidatorController.getActionCounts';
import { refreshApex } from '@salesforce/apex';

const PAGE_SIZE = 20;

// ── Status → shared pill (wcfPortalUi vocabulary) ─────────────────
// info = submitted / under review, warning = in progress,
// success = approved, returned = sent back, error = rejected,
// neutral = draft / unknown
const STATUS_PILL_MAP = {
    'Draft'                              : 'wg-pill wg-pill--neutral',
    'Submitted'                          : 'wg-pill wg-pill--info',
    'Under Validation'                   : 'wg-pill wg-pill--info',
    'Under Review'                       : 'wg-pill wg-pill--info',
    'Under External Review'              : 'wg-pill wg-pill--info',
    'Proposal Submitted to WIN Admin'    : 'wg-pill wg-pill--info',
    'Proposal Submitted to COE Admin'    : 'wg-pill wg-pill--info',
    'Approved - Level 1'                 : 'wg-pill wg-pill--success',
    'Approved for Funding'               : 'wg-pill wg-pill--success',
    'Asked for Resubmission by WIN Admin': 'wg-pill wg-pill--returned',
    'Revision Requested'                 : 'wg-pill wg-pill--returned',
    'Returned to Validator'              : 'wg-pill wg-pill--returned',
    'Rejected'                           : 'wg-pill wg-pill--error',
};
const DEFAULT_PILL = 'wg-pill wg-pill--neutral';

// ── Summary buckets (order = display order) ───────────────────────
const SUMMARY_BUCKETS = [
    { id: 'validate',           label: 'To Validate',          countKey: 'validateCount',           tone: 'info'    },
    { id: 'resume',             label: 'In Progress',          countKey: 'resumeCount',             tone: 'warning' },
    { id: 'resubmit',           label: 'Revalidate',           countKey: 'resubmitCount',           tone: 'brand',   alertWhenPositive: true },
    { id: 'returnedByReviewer', label: 'Returned by Reviewer', countKey: 'returnedByReviewerCount', tone: 'error',   alertWhenPositive: true },
    { id: 'awaiting',           label: 'Awaiting Applicant',   countKey: 'awaitingApplicantCount',  tone: 'neutral' },
    { id: 'validated',          label: 'Validated',            countKey: 'validatedCount',          tone: 'success' },
];

export default class WcfApplicationList extends NavigationMixin(LightningElement) {

    @api title;

    _statusFilter;
    @api
    get statusFilter() { return this._statusFilter; }
    set statusFilter(value) {
        this._statusFilter = Array.isArray(value) ? value : (value ? [value] : null);
        this.activeFilter = '';   // clear stale internal filter whenever a new URL filter arrives
        this.currentPage  = 1;
    }

    _rawData          = [];
    _wiredAppsResult;

    @track error;
    @track isLoading      = true;
    @track searchTerm     = '';
    @track currentPage    = 1;
    @track sortField      = 'AppliedDate';
    @track sortDir        = 'desc';
    @track activeFilter   = ''; // 'validated' | 'validate' | 'resume' | 'resubmit' | 'returnedByReviewer' | 'awaiting' | ''

    // ── Summary counts from Apex ─────────────────────────────────
    @track validatedCount          = 0;
    @track validateCount           = 0;
    @track resumeCount             = 0;
    @track resubmitCount           = 0;
    @track returnedByReviewerCount = 0;
    @track awaitingApplicantCount  = 0;

    // ── Wire: application list ───────────────────────────────────
    @wire(getApplicationList)
    wiredApps(result) {
        this._wiredAppsResult = result;
        this.isLoading = false;
        const { data, error } = result;
        if (data) {
            this._rawData = data;
            this.error    = undefined;
        } else if (error) {
            this.error    = error.body?.message || 'Unknown error';
            this._rawData = [];
        }
    }

    // ── Wire: action counts for summary bar ──────────────────────
    @wire(getActionCounts)
    wiredCounts({ data }) {
        if (data) {
            this.validatedCount          = data.validated          || 0;
            this.validateCount           = data.validate           || 0;
            this.resumeCount             = data.resume             || 0;
            this.resubmitCount           = data.resubmit           || 0;
            this.returnedByReviewerCount = data.returnedByReviewer || 0;
            this.awaitingApplicantCount  = data.awaitingApplicant  || 0;
        }
    }

    // ── Summary bar click — filter table by action bucket ────────
    handleSummaryClick(evt) {
        const filter = evt.currentTarget.dataset.filter;
        this.activeFilter  = (this.effectiveFilter === filter) ? '' : filter;
        this._statusFilter = null;   // internal click takes priority, clear URL filter
        this.currentPage   = 1;
    }

    // ── Search ───────────────────────────────────────────────────
    handleSearch(evt) {
        this.searchTerm  = evt.target.value.toLowerCase();
        this.currentPage = 1;
    }

    handleSearchInput(evt) {
        this.searchTerm  = evt.target.value.toLowerCase();
        this.currentPage = 1;
    }

    // ── Sort ─────────────────────────────────────────────────────
    handleSort(evt) {
        const field = evt.currentTarget.dataset.field;
        if (this.sortField === field) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDir   = 'asc';
        }
        this.currentPage = 1;
    }

    // ── Pagination ───────────────────────────────────────────────
    handlePrevPage() { if (this.currentPage > 1) this.currentPage--; }
    handleNextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }

    handleRefresh() {
        this.isLoading = true;
        this.error     = undefined;
        refreshApex(this._wiredAppsResult)
            .then(() => { this.isLoading = false; })
            .catch(e  => {
                this.error     = e.body?.message || 'Refresh failed';
                this.isLoading = false;
            });
    }

    // ── Navigate to record ───────────────────────────────────────
    handleRecordClick(evt) {
        evt.preventDefault();
        const id = evt.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, objectApiName: 'IndividualApplication__c', actionName: 'view' }
        });
    }

    // ── Validate / Resume / Revalidate → fire event to container ─
    handleValidate(evt) {
        const id   = evt.currentTarget.dataset.id;
        const name = evt.currentTarget.dataset.name;
        this.dispatchEvent(new CustomEvent('validateclick', {
            detail  : { recordId: id, recordName: name },
            bubbles : true,
            composed: true
        }));
    }

    // ── Active filter (internal click wins over URL filter) ──────
    get effectiveFilter() {
        return this.activeFilter || (this._statusFilter && this._statusFilter[0]) || '';
    }

    // ── Core getter: filter + sort ───────────────────────────────
    get allFiltered() {
        const effectiveFilter = this.effectiveFilter;

        let rows = this._rawData.map(wrapper => {
            const a        = wrapper.application;
            const acctName = a.Account ? a.Account.Name : '';

            // ── Determine action bucket for this row ──
            // isAwaitingApplicant MUST be checked ahead of isValidated/hasDraft,
            // otherwise these rows fall into 'validate' and inflate that count.
            const action = wrapper.isReturnedByReviewer
                ? 'returnedByReviewer'
                : wrapper.isResubmission
                    ? 'resubmit'
                    : wrapper.isAwaitingApplicant
                        ? 'awaiting'
                        : wrapper.isValidated
                            ? 'validated'
                            : wrapper.hasDraft
                                ? 'resume'
                                : 'validate';

            if (effectiveFilter && action !== effectiveFilter) return null;

            // ── Search filter ──
            const matchSearch = !this.searchTerm
                || (a.Name   || '').toLowerCase().includes(this.searchTerm)
                || acctName.toLowerCase().includes(this.searchTerm)
                || (a.Status || '').toLowerCase().includes(this.searchTerm)
                || (a.Application_ID__c || '').toLowerCase().includes(this.searchTerm);

            if (!matchSearch) return null;

            const orgArea = a.Organizational_Area_s_for_Funding_Inves1__c || a.Organizational_Area_s_for_Funding_Inves__c || '';
            const trackBadges = [];
            if (orgArea.includes('Job Fulfillment') || orgArea === 'Job Fulfillment Only' || orgArea === 'Both Job Fulfillment and Job Creation') {
                trackBadges.push({ label: 'Job Fulfillment', class: 'wg-tag wg-tag--info' });
            }
            if (orgArea.includes('Job Creation') || orgArea === 'Job Creation Only' || orgArea === 'Both Job Fulfillment and Job Creation') {
                trackBadges.push({ label: 'Job Creation', class: 'wg-tag wg-tag--warning' });
            }
            if (orgArea.includes('Livelihood')) {
                trackBadges.push({ label: 'Livelihood', class: 'wg-tag wg-tag--success' });
            }

            return {
                ...a,
                isValidated         : wrapper.isValidated,
                hasDraft            : wrapper.hasDraft,
                isResubmission      : wrapper.isResubmission,
                isAwaitingApplicant : wrapper.isAwaitingApplicant,
                isReturnedByReviewer: wrapper.isReturnedByReviewer,
                trackBadges,
                hasTrackBadges      : trackBadges.length > 0,
                rowClass            : wrapper.isReturnedByReviewer
                    ? 'wg-row--attention'
                    : wrapper.isValidated
                        ? 'wg-row--success'
                        : '',
                formattedDueDate : a.Due_Date__c
                    ? new Date(a.Due_Date__c).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })
                    : '—',
                statusClass      : STATUS_PILL_MAP[a.Status] || DEFAULT_PILL,
                acctName,
            };
        }).filter(Boolean);

        // ── Sort ──
        const dir = this.sortDir === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
            let va = this.sortField === 'Account.Name' ? (a.acctName || '') : (a[this.sortField] || '');
            let vb = this.sortField === 'Account.Name' ? (b.acctName || '') : (b[this.sortField] || '');
            return va < vb ? -dir : va > vb ? dir : 0;
        });

        // FIX: number rows AFTER filter + sort, so # reads 1, 2, 3…
        // (was the raw data index, which jumped e.g. 17, 22, 23).
        return rows.map((r, idx) => ({ ...r, rowNum: idx + 1 }));
    }

    // ── Paginated slice ──────────────────────────────────────────
    get filteredApplications() {
        const start = (this.currentPage - 1) * PAGE_SIZE;
        return this.allFiltered.slice(start, start + PAGE_SIZE);
    }

    // ── Summary tiles ────────────────────────────────────────────
    get summaryItems() {
        const active = this.effectiveFilter;
        return SUMMARY_BUCKETS.map(b => {
            const count    = this[b.countKey] || 0;
            const isActive = active === b.id;
            const isAlert  = b.alertWhenPositive && count > 0;
            return {
                id      : b.id,
                label   : b.label,
                count,
                pressed : isActive ? 'true' : 'false',
                cls     : 'wg-stat'
                          + (isAlert  ? ' wg-stat--alert'  : '')
                          + (isActive ? ' wg-stat--active' : ''),
                dotCls  : 'wg-stat-dot wg-stat-dot--' + b.tone,
            };
        });
    }

    // ── Computed helpers ─────────────────────────────────────────
    get isLoaded()       { return !this.isLoading; }
    get applications()   { return this._rawData; }
    get hasRecords()     { return this.allFiltered.length > 0; }
    get totalPages()     { return Math.max(1, Math.ceil(this.allFiltered.length / PAGE_SIZE)); }
    get pageStart()      { return (this.currentPage - 1) * PAGE_SIZE + 1; }
    get pageEnd()        { return Math.min(this.currentPage * PAGE_SIZE, this.allFiltered.length); }
    get isPrevDisabled() { return this.currentPage <= 1; }
    get isNextDisabled() { return this.currentPage >= this.totalPages; }

    // FIX: subtitle now reflects the filter/search instead of always the raw total
    get subtitle() {
        const total = (this._rawData || []).length;
        const shown = this.allFiltered.length;
        const noun  = total === 1 ? 'proposal' : 'proposals';
        return shown === total
            ? `${total} ${noun}`
            : `Showing ${shown} of ${total} ${noun}`;
    }

    // ── Sort header helpers (duplicate getters removed) ──────────
    _sortIcon(field) {
        return this.sortField === field
            ? (this.sortDir === 'asc' ? 'utility:arrowup' : 'utility:arrowdown')
            : 'utility:sort';
    }
    _sortClass(field) {
        return 'wg-sort' + (this.sortField === field ? ' wg-sort--active' : '');
    }
    _ariaSort(field) {
        if (this.sortField !== field) return 'none';
        return this.sortDir === 'asc' ? 'ascending' : 'descending';
    }

    get sortIconId()       { return this._sortIcon('Application_ID__c'); }
    get sortIconAccount()  { return this._sortIcon('Account.Name'); }
    get sortIconDueDate()  { return this._sortIcon('Due_Date__c'); }
    get sortClassId()      { return this._sortClass('Application_ID__c'); }
    get sortClassAccount() { return this._sortClass('Account.Name'); }
    get sortClassDueDate() { return this._sortClass('Due_Date__c'); }
    get ariaSortId()       { return this._ariaSort('Application_ID__c'); }
    get ariaSortAccount()  { return this._ariaSort('Account.Name'); }
    get ariaSortDueDate()  { return this._ariaSort('Due_Date__c'); }
}