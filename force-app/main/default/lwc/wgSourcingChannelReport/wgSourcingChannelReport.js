import { LightningElement, track } from 'lwc';
import getSourceChannelReport from '@salesforce/apex/WCFValidatorController.getSourceChannelReport';
import getBudgetRangeDistribution from '@salesforce/apex/WCFValidatorController.getBudgetRangeDistribution';
import getSourceChannelFilterOptions from '@salesforce/apex/WCFValidatorController.getSourceChannelFilterOptions';

const ALL = 'ALL';

const TIME_RANGE_OPTIONS = [
    { label: 'All time',        value: ALL },
    { label: 'Last 30 days',    value: 'LAST_30' },
    { label: 'Last 90 days',    value: 'LAST_90' },
    { label: 'Last 6 months',   value: 'LAST_180' },
    { label: 'Last 12 months',  value: 'LAST_365' },
    { label: 'This year',       value: 'THIS_YEAR' },
    { label: 'Custom range',    value: 'CUSTOM' }
];

const DEFAULT_FILTERS = {
    geography: ALL,
    timeRange: ALL,
    stage:     ALL,
    startDate: null,
    endDate:   null
};

export default class WcfSourcingChannelReport extends LightningElement {

    // ─── State ────────────────────────────────────────────────────
    @track filters = { ...DEFAULT_FILTERS };

    @track sourceChannelData = null;   // KPI tiles + source channel bars
    @track sourceChannelRows = [];     // detail table
    @track budgetRangeData   = null;   // independent budget dataset

    geographyOptions = [{ label: 'All geographies', value: ALL }];
    stageOptions     = [{ label: 'All stages', value: ALL }];
    timeRangeOptions = TIME_RANGE_OPTIONS;

    isChannelLoading = false;
    isBudgetLoading  = false;

    // Stale-response guards (one per independent request)
    _channelReqId = 0;
    _budgetReqId  = 0;

    // ─── Lifecycle ────────────────────────────────────────────────
    connectedCallback() {
        this.loadFilterOptions();
        this.refreshAll();
    }

    // ─── Filter handling ──────────────────────────────────────────
    handleFilterChange(event) {
        const field = event.target.name;
        const value = event.detail.value;

        this.filters = { ...this.filters, [field]: value };

        // Clear custom dates when leaving custom mode
        if (field === 'timeRange' && value !== 'CUSTOM') {
            this.filters = { ...this.filters, startDate: null, endDate: null };
        }

        // Invalid custom range (from > to): wait until corrected
        const { startDate, endDate } = this.filters;
        if (startDate && endDate && startDate > endDate) return;

        this.refreshAll();
    }

    handleReset() {
        this.filters = { ...DEFAULT_FILTERS };
        this.refreshAll();
    }

    get isCustomRange() {
        return this.filters.timeRange === 'CUSTOM';
    }

    get requestParams() {
        return {
            geography: this.filters.geography,
            timeRange: this.filters.timeRange,
            stage:     this.filters.stage,
            startDate: this.filters.startDate || null,
            endDate:   this.filters.endDate || null
        };
    }

    // ─── Data loading ─────────────────────────────────────────────
    refreshAll() {
        // Independent requests: run in parallel, each handles its own state
        this.loadSourceChannelReport();
        this.loadBudgetRangeDistribution();
    }

    async loadFilterOptions() {
        try {
            const o = await getSourceChannelFilterOptions();
            if (!o) return;
            this.geographyOptions = [
                { label: 'All geographies', value: ALL },
                ...(o.geographies || []).map(g => ({ label: g, value: g }))
            ];
            this.stageOptions = [
                { label: 'All stages', value: ALL },
                ...(o.stages || []).map(s => ({ label: s, value: s }))
            ];
        } catch (e) {
            console.error('Filter options error:', e);
        }
    }

    async loadSourceChannelReport() {
        const reqId = ++this._channelReqId;
        this.isChannelLoading = true;
        try {
            const d = await getSourceChannelReport(this.requestParams);
            if (reqId !== this._channelReqId) return; // newer request in flight

            if (!d) {
                this.sourceChannelData = null;
                this.sourceChannelRows = [];
                return;
            }

            const total = d.total || 1;
            const pct = n => Math.round(((n || 0) / total) * 100);

            this.sourceChannelData = [
                {
                    id: 'wsn', label: 'WSN/WEN Nomination',
                    count: d.wsnWen || 0, pct: pct(d.wsnWen),
                    chipClass: 'sc-chip sc-chip-wsn'
                },
                {
                    id: 'wcf', label: 'WCF Direct Research',
                    count: d.wcfDirect || 0, pct: pct(d.wcfDirect),
                    chipClass: 'sc-chip sc-chip-wcf'
                },
                {
                    id: 'self', label: 'Self-Signup',
                    count: d.selfSignup || 0, pct: pct(d.selfSignup),
                    chipClass: 'sc-chip sc-chip-self'
                },
                {
                    id: 'unk', label: 'Unknown / TBD',
                    count: d.unknown || 0, pct: pct(d.unknown),
                    chipClass: 'sc-chip sc-chip-unk'
                }
            ];

            this.sourceChannelRows = (d.rows || []).map((r, i) => ({
                ...r,
                rowNum:        i + 1,
                channelClass:  this._channelClass(r.sourceChannel),
                decisionClass: this._decisionClass(r.decision)
            }));
        } catch (e) {
            if (reqId !== this._channelReqId) return;
            console.error('Source channel report error:', e);
            this.sourceChannelData = null;
            this.sourceChannelRows = [];
        } finally {
            if (reqId === this._channelReqId) this.isChannelLoading = false;
        }
    }

    async loadBudgetRangeDistribution() {
        const reqId = ++this._budgetReqId;
        this.isBudgetLoading = true;
        try {
            const list = await getBudgetRangeDistribution(this.requestParams);
            if (reqId !== this._budgetReqId) return;
            this.budgetRangeData = list || [];
        } catch (e) {
            if (reqId !== this._budgetReqId) return;
            console.error('Budget range distribution error:', e);
            this.budgetRangeData = [];
        } finally {
            if (reqId === this._budgetReqId) this.isBudgetLoading = false;
        }
    }

    // ─── Getters ──────────────────────────────────────────────────
    get scTotal() {
        if (!this.sourceChannelData) return 0;
        return this.sourceChannelData.reduce((sum, t) => sum + (t.count || 0), 0);
    }

    get sourceChannelBars() {
        if (!this.sourceChannelData || this.scTotal === 0) return null;
        const max = Math.max(...this.sourceChannelData.map(t => t.count || 0), 1);
        const barClasses = [
            'sc-bar-inner',
            'sc-bar-inner sc-bar-inner-blue',
            'sc-bar-inner sc-bar-inner-green',
            'sc-bar-inner sc-bar-inner-grey'
        ];
        return this.sourceChannelData.map((t, i) => ({
            id:       t.id,
            label:    t.label,
            count:    t.count,
            barClass: barClasses[i] || 'sc-bar-inner',
            barStyle: `width: ${Math.round((t.count / max) * 100)}%`
        }));
    }

    get noChannelBars() {
        return !this.isChannelLoading && !this.sourceChannelBars;
    }

    get budgetRangeBars() {
        if (!this.budgetRangeData || this.budgetRangeData.length === 0) return null;

        const barColorClasses = [
            'sc-bar-inner',
            'sc-bar-inner sc-bar-inner-blue',
            'sc-bar-inner sc-bar-inner-teal',
            'sc-bar-inner sc-bar-inner-green',
            'sc-bar-inner sc-bar-inner-amber',
            'sc-bar-inner sc-bar-inner-purple',
            'sc-bar-inner sc-bar-inner-grey'
        ];

        const entries = [...this.budgetRangeData]
            .map(e => ({ label: e.label || 'Unknown', count: e.count || 0 }))
            .sort((a, b) => b.count - a.count);
        const max = entries[0]?.count || 1;

        return entries.map((e, i) => ({
            id:       `br-${i}`,
            label:    e.label,
            count:    e.count,
            barClass: barColorClasses[i % barColorClasses.length],
            barStyle: `width: ${Math.round((e.count / max) * 100)}%`
        }));
    }

    get noBudgetRangeBars() {
        return !this.isBudgetLoading && !this.budgetRangeBars;
    }

    get noSourceChannelRows() {
        return !this.sourceChannelRows || this.sourceChannelRows.length === 0;
    }

    // ─── Helpers ──────────────────────────────────────────────────
    _channelClass(ch) {
        if (!ch) return 'sc-chip sc-chip-unk';
        if (ch.includes('WSN') || ch.includes('WEN')) return 'sc-chip sc-chip-wsn';
        if (ch.includes('Direct')) return 'sc-chip sc-chip-wcf';
        if (ch.includes('Self'))   return 'sc-chip sc-chip-self';
        return 'sc-chip sc-chip-unk';
    }

    _decisionClass(d) {
        if (!d || d === '—') return 'decision-pill decision-pending';
        if (d === 'Pass')    return 'decision-pill decision-pass';
        if (d === 'Return')  return 'decision-pill decision-return';
        if (d === 'Flag')    return 'decision-pill decision-flag';
        return 'decision-pill decision-pending';
    }
}