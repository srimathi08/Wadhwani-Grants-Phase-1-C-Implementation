import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getApplicationList from '@salesforce/apex/WCFValidatorController.getApplicationList';
import getActionCounts    from '@salesforce/apex/WCFValidatorController.getActionCounts';
import { refreshApex } from '@salesforce/apex';

const PAGE_SIZE = 20;

const STATUS_CLASS_MAP = {
    'Draft'                              : 'wcf-badge wcf-badge-grey',
    'Approved - Level 1'                 : 'wcf-badge wcf-badge-green',
    'Approved for Funding'               : 'wcf-badge wcf-badge-green',
    'Proposal Submitted to WIN Admin'    : 'wcf-badge wcf-badge-blue',
    'Proposal Submitted to COE Admin'    : 'wcf-badge wcf-badge-blue',
    'Under External Review'              : 'wcf-badge wcf-badge-blue',
    'Under Review'                       : 'wcf-badge wcf-badge-blue',
    'Asked for Resubmission by WIN Admin': 'wcf-badge wcf-badge-amber',
    'Revision Requested'                 : 'wcf-badge wcf-badge-amber',
    'Rejected'                           : 'wcf-badge wcf-badge-red',
    'Submitted'                          : 'wcf-badge wcf-badge-grey',
};

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
    @track activeFilter   = ''; // 'validated' | 'validate' | 'resume' | 'resubmit' | 'awaiting' | ''

    // ── Summary counts from Apex ─────────────────────────────────
    @track validatedCount = 0;
    @track validateCount  = 0;
    @track resumeCount    = 0;
    @track resubmitCount  = 0;
    @track returnedByReviewerCount = 0;   // ← ADD
    @track awaitingApplicantCount = 0;


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
    wiredCounts({ data, error }) {
        if (data) {
            this.validatedCount = data.validated || 0;
            this.validateCount  = data.validate  || 0;
            this.resumeCount    = data.resume     || 0;
            this.resubmitCount  = data.resubmit   || 0;
            this.returnedByReviewerCount = data.returnedByReviewer || 0; 
            this.awaitingApplicantCount = data.awaitingApplicant  || 0;
        }
    }

    // ── Summary bar click — filter table by action bucket ────────
    handleSummaryClick(evt) {
        const filter = evt.currentTarget.dataset.filter;
        this.activeFilter = (this.activeFilter === filter) ? '' : filter;
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

    // ── Core getter: filter + sort ───────────────────────────────
    get allFiltered() {
        const effectiveFilter = this.activeFilter || (this._statusFilter && this._statusFilter[0]) || '';

        let rows = this._rawData.map((wrapper, i) => {
            const a        = wrapper.application;
            const acctName = a.Account ? a.Account.Name : '';

            // ── Determine action bucket for this row ──
            // IMPORTANT: isAwaitingApplicant MUST be checked here, ahead of isValidated/hasDraft,
            // otherwise these rows silently fall through into 'validate' and inflate that count
            // beyond what getActionCounts() reports (that was this exact bug).
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
                trackBadges.push({ label: 'Job Fulfillment', class: 'wcf-trk-badge wcf-trk-jf' });
            }
            if (orgArea.includes('Job Creation') || orgArea === 'Job Creation Only' || orgArea === 'Both Job Fulfillment and Job Creation') {
                trackBadges.push({ label: 'Job Creation', class: 'wcf-trk-badge wcf-trk-jc' });
            }
            if (orgArea.includes('Livelihood')) {
                trackBadges.push({ label: 'Livelihood', class: 'wcf-trk-badge wcf-trk-liv' });
            }

            return {
                ...a,
                isValidated        : wrapper.isValidated,
                hasDraft           : wrapper.hasDraft,
                isResubmission     : wrapper.isResubmission,
                isAwaitingApplicant: wrapper.isAwaitingApplicant,
                 isReturnedByReviewer: wrapper.isReturnedByReviewer, 
                rowNum             : i + 1,
                trackBadges,
                hasTrackBadges     : trackBadges.length > 0,
                 rowClass            : wrapper.isReturnedByReviewer
                        ? 'wcf-tr wcf-tr-returned'          // ← give it its own row tint, add CSS
                        : wrapper.isValidated
                        ? 'wcf-tr wcf-tr-validated'
                        : (i % 2 === 0 ? 'wcf-tr wcf-tr-even' : 'wcf-tr wcf-tr-odd'),
                formattedDueDate : a.Due_Date__c
                    ? new Date(a.Due_Date__c).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })
                    : '—',
                statusClass      : STATUS_CLASS_MAP[a.Status] || 'wcf-badge wcf-badge-grey',
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

        return rows;
    }

    // ── Paginated slice ──────────────────────────────────────────
    get filteredApplications() {
        const start = (this.currentPage - 1) * PAGE_SIZE;
        return this.allFiltered.slice(start, start + PAGE_SIZE);
    }

    // ── Computed helpers ─────────────────────────────────────────
    get applications()   { return this._rawData; }
    get hasRecords()     { return this.allFiltered.length > 0; }
    get totalPages()     { return Math.max(1, Math.ceil(this.allFiltered.length / PAGE_SIZE)); }
    get pageStart()      { return (this.currentPage - 1) * PAGE_SIZE + 1; }
    get pageEnd()        { return Math.min(this.currentPage * PAGE_SIZE, this.allFiltered.length); }
    get isPrevDisabled() { return this.currentPage <= 1; }
    get isNextDisabled() { return this.currentPage >= this.totalPages; }

    get sortIconId()      { return this.sortField === 'Application_ID__c' ? (this.sortDir === 'asc' ? 'utility:arrowup' : 'utility:arrowdown') : 'utility:arrowup'; }
    get sortIconAccount() { return this.sortField === 'Account.Name'       ? (this.sortDir === 'asc' ? 'utility:arrowup' : 'utility:arrowdown') : 'utility:arrowup'; }
    get sortIconId()      { return this.sortField === 'Application_ID__c' ? (this.sortDir === 'asc' ? 'utility:arrowup' : 'utility:arrowdown') : 'utility:arrowup'; }
get sortIconAccount() { return this.sortField === 'Account.Name'       ? (this.sortDir === 'asc' ? 'utility:arrowup' : 'utility:arrowdown') : 'utility:arrowup'; }
get sortIconDueDate() { return this.sortField === 'Due_Date__c'        ? (this.sortDir === 'asc' ? 'utility:arrowup' : 'utility:arrowdown') : 'utility:arrowup'; }
}