import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getDashboardStages from '@salesforce/apex/ProposalDashboardController.getDashboardStages';

export default class CoeApplicationStatusDashboard extends NavigationMixin(LightningElement) {

    @track summaryCards   = [];
    @track allStatusCards = [];
    @track isLoading      = false;
    @track activeTile     = 'all';
    @track activeFilter   = 'all';

    // ── Persist Year to sessionStorage ───────────────────────────────────────
    get selectedYear() {
        return sessionStorage.getItem('coe_dash_year') || new Date().getFullYear().toString();
    }
    set selectedYear(val) {
        sessionStorage.setItem('coe_dash_year', val);
    }

    // ── Persist Month to sessionStorage ──────────────────────────────────────
    get selectedMonth() {
        return sessionStorage.getItem('coe_dash_month') || 'all';
    }
    set selectedMonth(val) {
        sessionStorage.setItem('coe_dash_month', val);
    }

    // ── Persist Date to sessionStorage ───────────────────────────────────────
    get selectedDate() {
        return sessionStorage.getItem('coe_dash_date') || '';
    }
    set selectedDate(val) {
        sessionStorage.setItem('coe_dash_date', val);
    }

    // ── Computed: whether a date is currently selected ───────────────────────
    get hasSelectedDate() {
        return !!this.selectedDate;
    }

    // ── Year options ─────────────────────────────────────────────────────────
    yearOptions = [
        { label: '2024', value: '2024' },
        { label: '2025', value: '2025' },
        { label: '2026', value: '2026' },
    ];

    // ── Month options ─────────────────────────────────────────────────────────
    monthOptions = [
        { label: 'All Months', value: 'all' },
        { label: 'January',    value: '1'  },
        { label: 'February',   value: '2'  },
        { label: 'March',      value: '3'  },
        { label: 'April',      value: '4'  },
        { label: 'May',        value: '5'  },
        { label: 'June',       value: '6'  },
        { label: 'July',       value: '7'  },
        { label: 'August',     value: '8'  },
        { label: 'September',  value: '9'  },
        { label: 'October',    value: '10' },
        { label: 'November',   value: '11' },
        { label: 'December',   value: '12' },
    ];

    // ══════════════════════════════════════
    // COUNTS
    // ══════════════════════════════════════

    get totalCount()       { return this._get('total'); }
    get draftCount()       { return this._get('draft'); }
    get submittedCount()   { return this._get('submitted'); }
    get resubCount()       { return this._get('resubmission'); }
    get shortlistedCount() { return this._get('shortlisted'); }
    get fundedCount()      { return this._get('funded'); }
    get rejectedCount()    { return this._get('rejected'); }

    _get(id) {
        const c = this.summaryCards.find(x => x.id === id);
        return c ? c.count : 0;
    }

    // ══════════════════════════════════════
    // PIPELINE PERCENTAGES
    // ══════════════════════════════════════

    get p1() { return this._pct(this.submittedCount,   this.totalCount); }
    get p2() { return this._pct(this.resubCount,       this.submittedCount); }
    get p3() { return this._pct(this.shortlistedCount, this.resubCount); }
    get p4() { return this._pct(this.fundedCount,      this.shortlistedCount); }

    get rejectedPercent() {
        return this._pct(this.rejectedCount, this.submittedCount);
    }

    _pct(a, b) {
        if (!b || b === 0) return 0;
        return Math.round((a / b) * 100);
    }

    // ══════════════════════════════════════
    // TILE CLASSES
    // ══════════════════════════════════════

    get tileAllClass()         { return this._tileClass('all',         'tile-all'); }
    get tileDraftClass()       { return this._tileClass('draft',       'tile-draft'); }
    get tileSubmittedClass()   { return this._tileClass('submitted',   'tile-submitted'); }
    get tileRejectedClass()    { return this._tileClass('rejected',    'tile-rejected'); }
    get tileResubClass()       { return this._tileClass('resubmission','tile-resub'); }
    get tileShortlistedClass() { return this._tileClass('shortlisted', 'tile-shortlisted'); }
    get tileFundedClass()      { return this._tileClass('funded',      'tile-funded'); }

    _tileClass(key, colorClass) {
        const base = `summary-tile ${colorClass}`;
        return this.activeTile === key ? `${base} summary-tile--active` : base;
    }

    // ══════════════════════════════════════
    // FILTER CLASSES
    // ══════════════════════════════════════

    get filterAllClass()       { return this._filterClass('all'); }
    get filterDraftClass()     { return this._filterClass('draft'); }
    get filterApprovedClass()  { return this._filterClass('approved'); }
    get filterRejectedClass()  { return this._filterClass('rejected'); }
    get filterResubClass()     { return this._filterClass('resubmission'); }
    get filterSubmittedClass() { return this._filterClass('submitted'); }
    get filterFundedClass()    { return this._filterClass('funded'); }

    _filterClass(key) {
        return this.activeFilter === key
            ? 'filter-btn filter-btn--active'
            : 'filter-btn';
    }

    // ══════════════════════════════════════
    // FILTERED CARDS
    // ══════════════════════════════════════

    get filteredCards() {
        if (this.activeFilter === 'all') return this.allStatusCards;
        return this.allStatusCards.filter(c => c.filterKey === this.activeFilter);
    }

    get hasCards() {
        return this.filteredCards && this.filteredCards.length > 0;
    }

    // ══════════════════════════════════════
    // LIFECYCLE
    // ══════════════════════════════════════

    connectedCallback() {
        this.loadCounts();
    }

    async loadCounts() {
        this.isLoading = true;
        try {
            // Pass null for month when "All Months" is selected
            const monthParam = (this.selectedMonth === 'all')
                ? null
                : parseInt(this.selectedMonth, 10);

            // Pass null for date when no date is selected
            const dateParam = this.selectedDate || null;

            const res = await getDashboardStages({
                selectedYear:  parseInt(this.selectedYear, 10),
                selectedMonth: monthParam,
                selectedDate:  dateParam      // ✅ NEW: pass date param
            });

            const data = res?.counts || res || {};

            // Summary tiles
            this.summaryCards = [
                { id: 'total',        count: data.Total          || 0 },
                { id: 'draft',        count: data.Draft          || 0 },
                { id: 'submitted',    count: data.Submitted      || 0 },
                { id: 'resubmission', count: data.Resubmission   || 0 },
                { id: 'shortlisted',  count: data.Shortlisted    || 0 },
                { id: 'funded',       count: data.Funded         || 0 },
                { id: 'rejected',     count: data.Rejected       || 0 },
            ];

            // Breakdown cards
            this.allStatusCards = [
                {
                    id: 'card-draft',
                    filterKey: 'draft',
                    cssClass: 'card draft',
                    count: data.Draft         || 0,
                    label: 'Draft Applications'
                },
                {
                    id: 'card-submitted',
                    filterKey: 'submitted',
                    cssClass: 'card submitted',
                    count: data.Submitted     || 0,
                    label: 'Submitted to WIN / COE Admin'
                },
                {
                    id: 'card-resubmission',
                    filterKey: 'resubmission',
                    cssClass: 'card resub',
                    count: data.Resubmission  || 0,
                    label: 'Under Resubmission (WIN & COE)'
                },
                {
                    id: 'card-shortlisted',
                    filterKey: 'approved',
                    cssClass: 'card approved',
                    count: data.Shortlisted   || 0,
                    label: 'Shortlisted for Presentation'
                },
                {
                    id: 'card-funded',
                    filterKey: 'funded',
                    cssClass: 'card funded',
                    count: data.Funded        || 0,
                    label: 'Recommended for Funding'
                },
                {
                    id: 'card-rejected-win',
                    filterKey: 'rejected',
                    cssClass: 'card rejected',
                    count: data.RejectedByWIN || 0,
                    label: 'Rejected by WIN Admin'
                },
                {
                    id: 'card-rejected-coe',
                    filterKey: 'rejected',
                    cssClass: 'card rejected',
                    count: data.RejectedByCOE || 0,
                    label: 'Rejected by COE Admin'
                },
                {
                    id: 'card-not-recommended',
                    filterKey: 'rejected',
                    cssClass: 'card rejected',
                    count: data.NotRecommended || 0,
                    label: 'Not Recommended for Funding'
                },
            ];

        } catch (e) {
            console.error('Dashboard Error:', e);
        } finally {
            this.isLoading = false;
        }
    }

    // ══════════════════════════════════════
    // EVENT HANDLERS
    // ══════════════════════════════════════

    handleYearChange(event) {
        this.selectedYear = event.detail.value;
        this.selectedDate = '';   // ✅ Clear date when year changes
        this._resetFilters();
        this.loadCounts();
    }

    handleMonthChange(event) {
        this.selectedMonth = event.detail.value;
        this.selectedDate  = '';  // ✅ Clear date when month changes
        this._resetFilters();
        this.loadCounts();
    }

    // ✅ NEW: Date filter handler
    handleDateChange(event) {
        const raw = event.detail.value; // "YYYY-MM-DD" or ""
        this.selectedDate = raw || '';
        this._resetFilters();
        this.loadCounts();
    }

    // ✅ NEW: Clear date handler
    handleClearDate() {
        this.selectedDate = '';
        this._resetFilters();
        this.loadCounts();
    }

    _resetFilters() {
        this.activeTile   = 'all';
        this.activeFilter = 'all';
    }

    handleTileClick(event) {
        const key = event.currentTarget.dataset.key;
        this.activeTile   = key;
        this.activeFilter = key === 'all' ? 'all' : key;

        const statusMap = {
            draft:        'Draft',
            submitted:    'Submitted',
            resubmission: 'ResubmissionByCOE',
            shortlisted:  'ApprovedByCOE',
            funded:       'ApprovedForFunding',
            rejected:     'RejectedByWIN'
        };

        const statusKey = statusMap[key];
        if (!statusKey) return;
        this.navigate(statusKey);
    }

    handleFilterClick(event) {
        this.activeFilter = event.currentTarget.dataset.f;
        this.activeTile   = this.activeFilter;
    }

    handleCardClick(event) {
        const map = {
            'card-draft':           'Draft',
            'card-submitted':       'Submitted',
            'card-resubmission':    'ResubmissionByCOE',
            'card-shortlisted':     'ApprovedByCOE',
            'card-funded':          'ApprovedForFunding',
            'card-rejected-win':    'RejectedByWIN',
            'card-rejected-coe':    'RejectedByCOE',
            'card-not-recommended': 'NotRecommendedFunding'
        };

        const statusKey = map[event.currentTarget.dataset.id];
        if (!statusKey) return;
        this.navigate(statusKey);
    }

    navigate(statusKey) {
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: { name: 'My_Applications__c' },
            state: {
                c__statusKey: statusKey,
                c__year:      this.selectedYear,
                c__month:     this.selectedMonth,
                c__date:      this.selectedDate   // ✅ NEW: pass date to list view
            }
        });
    }
}