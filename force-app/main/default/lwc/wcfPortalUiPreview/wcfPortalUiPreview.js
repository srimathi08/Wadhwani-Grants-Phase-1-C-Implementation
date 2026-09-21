import { LightningElement } from 'lwc';

const STATS = [
    { id: 'validate',  label: 'To validate',          count: 12, caption: 'Submitted, ready to validate', tone: 'info' },
    { id: 'resume',    label: 'In progress',          count: 4,  caption: 'Drafts you started',            tone: 'warning' },
    { id: 'validated', label: 'Validated',            count: 37, caption: 'Completed records',             tone: 'success' },
    { id: 'returned',  label: 'Returned by reviewer', count: 2,  caption: 'Needs your decision',           tone: 'returned', alert: true },
    { id: 'awaiting',  label: 'Awaiting applicant',   count: 5,  caption: 'Returned to the applicant',     tone: 'warning' }
];

const JF  = { label: 'Job Fulfillment', cls: 'wg-tag wg-tag--info' };
const JC  = { label: 'Job Creation',    cls: 'wg-tag wg-tag--warning' };
const LIV = { label: 'Livelihood',      cls: 'wg-tag wg-tag--success' };

const SM = ' wg-btn-sm';

const ROWS = [
    { id: '1', appId: 'IA-0000000929', name: 'Skills for Tomorrow', account: 'Pratham Foundation', tags: [JF],
      status: 'Awaiting validation', pillCls: 'wg-pill wg-pill--info', due: '22 Sep 2026',
      action: 'Validate', icon: 'utility:shield', btnCls: 'primary-btn' + SM, rowCls: '' },
    { id: '2', appId: 'IA-0000000931', name: 'Rural Enterprise Hub', account: 'Udyam Trust', tags: [JC, LIV],
      status: 'Returned', pillCls: 'wg-pill wg-pill--returned', due: '19 Sep 2026',
      action: 'Review return', icon: 'utility:reply', btnCls: 'primary-btn' + SM, rowCls: 'wg-row--attention' },
    { id: '3', appId: 'IA-0000000935', name: 'Women in Tech', account: 'NASSCOM Foundation', tags: [JF, JC],
      status: 'In progress', pillCls: 'wg-pill wg-pill--warning', due: '25 Sep 2026',
      action: 'Resume', icon: 'utility:edit', btnCls: 'neutral-btn' + SM, rowCls: '' },
    { id: '4', appId: 'IA-0000000940', name: 'Livelihood Plus', account: 'SEWA', tags: [LIV],
      status: 'Validated', pillCls: 'wg-pill wg-pill--success', due: '30 Sep 2026',
      action: 'View', icon: 'utility:preview', btnCls: 'ghost-btn' + SM, rowCls: 'wg-row--success' },
    { id: '5', appId: 'IA-0000000944', name: 'Green Jobs', account: 'Barefoot College', tags: [],
      status: 'Rejected', pillCls: 'wg-pill wg-pill--error', due: '—',
      action: 'View', icon: 'utility:preview', btnCls: 'ghost-btn' + SM, rowCls: '' }
].map((r, i) => ({ ...r, num: i + 1 }));

export default class WcfPortalUiPreview extends LightningElement {
    activeStat = 'validate';
    rows = ROWS;

    get stats() {
        return STATS.map(s => {
            const active = s.id === this.activeStat;
            return {
                ...s,
                pressed: active ? 'true' : 'false',
                cls: 'wg-stat' + (s.alert ? ' wg-stat--alert' : '') + (active ? ' wg-stat--active' : ''),
                dotCls: 'wg-stat-dot wg-stat-dot--' + s.tone
            };
        });
    }

    handleStatClick(evt) {
        const id = evt.currentTarget.dataset.id;
        this.activeStat = this.activeStat === id ? '' : id;
    }
}