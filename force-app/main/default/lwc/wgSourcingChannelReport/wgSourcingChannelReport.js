import { LightningElement, track } from 'lwc';
import getSourceChannelReport from '@salesforce/apex/WCFValidatorController.getSourceChannelReport';

export default class WcfSourcingChannelReport extends LightningElement {

    // ─── State ────────────────────────────────────────────────────
    @track sourceChannelData = null;
    @track sourceChannelRows = [];

    // ─── Lifecycle ────────────────────────────────────────────────
    connectedCallback() {
        this.loadSourceChannelReport();
    }

    // ─── Data loading ─────────────────────────────────────────────
    async loadSourceChannelReport() {
        try {
            const d = await getSourceChannelReport();
            if (!d) return;

            const total = d.total || 1;

            this.sourceChannelData = [
                {
                    id:    'wsn',
                    label: 'WSN/WEN Nomination',
                    count: d.wsnWen,
                    pct:   Math.round((d.wsnWen / total) * 100),
                    chipClass: 'sc-chip sc-chip-wsn',
                    dotClass:  'kpi-dot kpi-dot-red',
                    barStyle:  `width: ${Math.round((d.wsnWen / total) * 100)}%`
                },
                {
                    id:    'wcf',
                    label: 'WCF Direct Research',
                    count: d.wcfDirect,
                    pct:   Math.round((d.wcfDirect / total) * 100),
                    chipClass: 'sc-chip sc-chip-wcf',
                    dotClass:  'kpi-dot kpi-dot-blue',
                    barStyle:  `width: ${Math.round((d.wcfDirect / total) * 100)}%`
                },
                {
                    id:    'self',
                    label: 'Self-Signup',
                    count: d.selfSignup,
                    pct:   Math.round((d.selfSignup / total) * 100),
                    chipClass: 'sc-chip sc-chip-self',
                    dotClass:  'kpi-dot kpi-dot-green',
                    barStyle:  `width: ${Math.round((d.selfSignup / total) * 100)}%`
                },
                {
                    id:    'unk',
                    label: 'Unknown / TBD',
                    count: d.unknown,
                    pct:   Math.round((d.unknown / total) * 100),
                    chipClass: 'sc-chip sc-chip-unk',
                    dotClass:  'kpi-dot kpi-dot-grey',
                    barStyle:  `width: ${Math.round((d.unknown / total) * 100)}%`
                }
            ];

            this.sourceChannelRows = (d.rows || []).map((r, i) => ({
                ...r,
                rowNum:        i + 1,
                channelClass:  this._channelClass(r.sourceChannel),
                decisionClass: this._decisionClass(r.decision)
            }));

        } catch (e) {
            console.error('Source channel report error:', e);
        }
    }

    // ─── Getters ──────────────────────────────────────────────────
    get scTotal() {
        if (!this.sourceChannelData) return 0;
        return this.sourceChannelData.reduce((sum, t) => sum + (t.count || 0), 0);
    }

    get sourceChannelBars() {
        if (!this.sourceChannelData) return null;
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

    get budgetRangeBars() {
        if (!this.sourceChannelRows || this.sourceChannelRows.length === 0) return null;

        const tally = {};
        for (const row of this.sourceChannelRows) {
            const br = row.budgetRange && row.budgetRange !== '—' ? row.budgetRange : 'Unknown';
            tally[br] = (tally[br] || 0) + 1;
        }

        const barColorClasses = [
            'sc-bar-inner',
            'sc-bar-inner sc-bar-inner-blue',
            'sc-bar-inner sc-bar-inner-teal',
            'sc-bar-inner sc-bar-inner-green',
            'sc-bar-inner sc-bar-inner-amber',
            'sc-bar-inner sc-bar-inner-purple',
            'sc-bar-inner sc-bar-inner-grey'
        ];

        const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
        const max     = entries[0]?.[1] || 1;

        return entries.map(([label, count], i) => ({
            id:       `br-${i}`,
            label,
            count,
            barClass: barColorClasses[i % barColorClasses.length],
            barStyle: `width: ${Math.round((count / max) * 100)}%`
        }));
    }

    get noBudgetRangeBars() {
        return !this.budgetRangeBars || this.budgetRangeBars.length === 0;
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