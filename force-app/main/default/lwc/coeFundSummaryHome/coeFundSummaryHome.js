import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getFundSummary from '@salesforce/apex/CoeHomeFundController.getFundSummary';
import getTRLProjects from '@salesforce/apex/CoeHomeFundController.getTRLProjects';

export default class CoeFundSummaryHome extends NavigationMixin(LightningElement) {

    /* ── Summary fields ── */
    totalReceived = 0;
    disbursed = 0;
    available = 0;
    projectGrantReceived = 0;
    operationalGrantReceived = 0;
    totalProjectsFunded = 0;
    grantAvailable = 0;
    avgTRL = 0;
    expectedTRL = 0;
    duration = 0;

    /* ── TRL modal ── */
    isTRLModalOpen = false;
    isTRLLoaded = false;
    @track trlProjects = [];

    /* ── Cycle filter ── */
    selectedCycle = 'All';

    /* ── Date range filter ── */
    @track fromDate = '';
    @track toDate   = '';

    trlScaleLabels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    /* ================================
       WIRE: SUMMARY
    ================================= */
    @wire(getFundSummary)
    wiredSummary({ data }) {
        if (data) {
            Object.assign(this, data);
        }
    }

    /* ================================
       WIRE: TRL PROJECTS
    ================================= */
    @wire(getTRLProjects, {
        fromDate: '$fromDate',
        toDate:   '$toDate'
    })
    wiredTRL({ data, error }) {
        if (data) {
            this.trlProjects = data.map(p => ({
                ...p,
                steps: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
                    n,
                    colClass:
                        n === p.currentTRL  ? 'trl-scale-col is-current'  :
                        n === p.expectedTRL ? 'trl-scale-col is-expected' :
                        n === p.baseTRL     ? 'trl-scale-col is-base'     :
                        'trl-scale-col',
                    stepClass:
                        n === p.currentTRL  ? 'trl-step step-current'  :
                        n === p.expectedTRL ? 'trl-step step-expected' :
                        n === p.baseTRL     ? 'trl-step step-base'     :
                        n < p.currentTRL    ? 'trl-step step-filled'   :
                        'trl-step'
                }))
            }));
            this.isTRLLoaded = true;
        } else if (error) {
            this.isTRLLoaded = true;
            console.error('TRL load error', error);
        }
    }

    /* ================================
       FUNDING YEAR PILLS
    ================================= */
    get fundingYears() {
        const years = [...new Set(
            this.trlProjects
                .map(p => p.fundingYear)
                .filter(y => y != null && y !== '')
        )].sort();

        const pills = [{ value: 'All', label: 'All', btnClass: this.pillClass('All') }];
        years.forEach(y => {
            pills.push({ value: y, label: y, btnClass: this.pillClass(y) });
        });
        return pills;
    }

    pillClass(year) {
        return this.selectedCycle === year
            ? 'cycle-pill cycle-pill-active'
            : 'cycle-pill';
    }

    /* ================================
       CYCLE FILTER HANDLER
    ================================= */
    handleCycleFilter(e) {
        this.selectedCycle = e.currentTarget.dataset.year;
    }

    /* ================================
       DATE RANGE HANDLERS
    ================================= */
    handleFromDateChange(e) {
        this.fromDate      = e.detail.value || '';
        this.selectedCycle = 'All';
        this.isTRLLoaded   = false;
    }

    handleToDateChange(e) {
        this.toDate        = e.detail.value || '';
        this.selectedCycle = 'All';
        this.isTRLLoaded   = false;
    }

    handleClearDates() {
        this.fromDate      = '';
        this.toDate        = '';
        this.selectedCycle = 'All';
        this.isTRLLoaded   = false;
    }

    get hasDateRange() {
        return !!this.fromDate || !!this.toDate;
    }

    /* ================================
       FILTERED PROJECT LIST
    ================================= */
    get filteredTRLProjects() {
        let list = this.trlProjects;
        if (this.selectedCycle !== 'All') {
            list = list.filter(p => p.fundingYear === this.selectedCycle);
        }
        return list;
    }

    get expectedTRLFormatted() {
        return Number(this.expectedTRL).toFixed(2);
    }

    get filteredCount() {
        return this.filteredTRLProjects.length;
    }

    get totalCount() {
        return this.trlProjects.length;
    }

    get hasFilteredProjects() {
        return this.filteredTRLProjects.length > 0;
    }

    get isFiltered() {
        return this.selectedCycle !== 'All' || this.hasDateRange;
    }

    /* ================================
       RESET ALL FILTERS
    ================================= */
    resetAllFilters() {
        this.selectedCycle = 'All';
        this.fromDate      = '';
        this.toDate        = '';
        this.isTRLLoaded   = false;
    }

    /* ================================
       FORMATTED AVG TRL — 2 decimals
    ================================= */
    get avgTRLFormatted() {
        return Number(this.avgTRL).toFixed(2);
    }

    /* ================================
       COMPUTED STYLES
    ================================= */
    get avgTRLStyle() {
        const ceiling = this.expectedTRL > 0 ? this.expectedTRL : 9;
        return `width:${Math.min((this.avgTRL / ceiling) * 100, 100)}%`;
    }

    get expectedTRLStyle() {
        return `width:${(this.expectedTRL / 9) * 100}%`;
    }

    /* ================================
       MODAL
    ================================= */
    openTRLModal() {
        this.isTRLModalOpen = true;
    }

    closeTRLModal() {
        this.isTRLModalOpen = false;
        this.selectedCycle  = 'All';
        this.fromDate       = '';
        this.toDate         = '';
    }

    /* ================================
       NAVIGATION
    ================================= */
    navigateToFund() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: '/WadhwaniOrg/s/fund-management' }
        });
    }
}