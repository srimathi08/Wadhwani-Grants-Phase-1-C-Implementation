import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getActionCounts     from '@salesforce/apex/WCFValidatorController.getActionCounts';
import getValidatorPreview from '@salesforce/apex/WCFValidatorController.getValidatorPreview';

// ── KPI tiles — same buckets, labels and colors as the Validator Queue ──
// status = token passed in the URL; wcfValidatorContainer turns it into
// a readable filter label and wcfApplicationList filters by it.
const TILE_DEFS = [
    { id: 'validate',           label: 'To Validate',          subtitle: 'Submitted proposals ready to validate',  countKey: 'validate',           tone: 'info' },
    { id: 'resume',             label: 'In Progress',          subtitle: 'Drafts you have started',                countKey: 'resume',             tone: 'warning' },
    { id: 'resubmit',           label: 'Revalidate',           subtitle: 'Resubmitted after a return',             countKey: 'resubmit',           tone: 'brand', alertWhenPositive: true },
    { id: 'returnedByReviewer', label: 'Returned by Reviewer', subtitle: 'Sent back by the Reviewer — needs your decision', countKey: 'returnedByReviewer', tone: 'error', alertWhenPositive: true },
    { id: 'awaiting',           label: 'Awaiting Applicant',   subtitle: 'Returned to the applicant for changes',  countKey: 'awaitingApplicant',  tone: 'neutral' },
    { id: 'validated',          label: 'Validated',            subtitle: 'Completed and finalised records',        countKey: 'validated',          tone: 'success' },
];

export default class WcfValidatorDashboard extends NavigationMixin(LightningElement) {

    // ─── State ────────────────────────────────────────────────────
    @track validatorCards       = [];
    @track validatorPreviewRows = [];

    // ─── Lifecycle ────────────────────────────────────────────────
    connectedCallback() {
        this.loadValidatorCounts();
        this.loadValidatorPreview();
    }

    // ─── Data loading ─────────────────────────────────────────────
    async loadValidatorCounts() {
        try {
            const data = await getActionCounts();
            this.validatorCards = TILE_DEFS.map(t => {
                const count   = data?.[t.countKey] ?? 0;
                const isAlert = t.alertWhenPositive && count > 0;
                return {
                    id      : t.id,
                    label   : t.label,
                    subtitle: t.subtitle,
                    count,
                    status  : t.id,
                    kpiClass: 'wg-stat' + (isAlert ? ' wg-stat--alert' : ''),
                    dotClass: 'wg-stat-dot wg-stat-dot--' + t.tone
                };
            });
        } catch (e) {
            console.error('Validator counts error:', e);
        }
    }

    async loadValidatorPreview() {
        try {
            const rows = await getValidatorPreview({ maxRows: 50 });
            const mapped = (rows || [])
                .filter(w => !w.isValidated)
                .map(w => {
                    const app        = w.application;
                    const dueDateRaw = app.Due_Date__c || null;
                    return {
                        id:             app.Id,
                        appId:          app.Name,
                        account:        app.Account?.Name ?? '—',
                        hasDraft:       w.hasDraft,
                        isResubmission: w.isResubmission,
                        dueDateRaw,
                        dueDate: dueDateRaw
                            ? this._parseDate(dueDateRaw).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })
                            : '—',
                        dueDateClass: this._computeDueDateClass(dueDateRaw),
                        ...this._rowState(w)
                    };
                });

            // Sort: resubmissions first → soonest due date → Resume before Validate → nulls last
            mapped.sort((a, b) => {
                if (a.isResubmission !== b.isResubmission) return a.isResubmission ? -1 : 1;
                if (a.dueDateRaw && b.dueDateRaw) {
                    const diff = this._parseDate(a.dueDateRaw) - this._parseDate(b.dueDateRaw);
                    if (diff !== 0) return diff;
                    if (a.hasDraft !== b.hasDraft) return a.hasDraft ? -1 : 1;
                    return 0;
                }
                if (a.dueDateRaw && !b.dueDateRaw) return -1;
                if (!a.dueDateRaw && b.dueDateRaw) return 1;
                if (a.hasDraft !== b.hasDraft) return a.hasDraft ? -1 : 1;
                return 0;
            });

            this.validatorPreviewRows = mapped.slice(0, 5).map((r, i) => ({ ...r, rowNum: i + 1 }));
        } catch (e) {
            console.error('Validator preview error:', e);
        }
    }

    /**
     * Display state for a preview row — same priority order as the
     * Validator Queue. isReturnedByReviewer / isAwaitingApplicant are
     * read only if the Apex wrapper provides them (undefined → false),
     * so this is safe whether or not getValidatorPreview returns them.
     */
    _rowState(w) {
        const SM = ' wg-btn-sm';
        if (w.isReturnedByReviewer) {
            return {
                status: 'Returned by Reviewer', statusClass: 'wg-pill wg-pill--returned',
                showAction: true, action: 'Review return', actionIcon: 'utility:reply',
                actionClass: 'primary-btn' + SM, rowClass: 'wg-row--attention'
            };
        }
        if (w.isResubmission) {
            return {
                status: 'Application Resubmitted', statusClass: 'wg-pill wg-pill--returned',
                showAction: true, action: 'Revalidate', actionIcon: 'utility:redo',
                actionClass: 'primary-btn' + SM, rowClass: ''
            };
        }
        if (w.isAwaitingApplicant) {
            return {
                status: 'Awaiting Applicant', statusClass: 'wg-pill wg-pill--warning',
                showAction: false, rowClass: ''
            };
        }
        if (w.hasDraft) {
            return {
                status: 'In Progress', statusClass: 'wg-pill wg-pill--warning',
                showAction: true, action: 'Resume', actionIcon: 'utility:edit',
                actionClass: 'neutral-btn' + SM, rowClass: ''
            };
        }
        return {
            status: 'Awaiting Validation', statusClass: 'wg-pill wg-pill--info',
            showAction: true, action: 'Validate', actionIcon: 'utility:shield',
            actionClass: 'primary-btn' + SM, rowClass: ''
        };
    }

    // ─── Handlers ─────────────────────────────────────────────────

    /** KPI tile → Validator Queue page, pre-filtered via URL state */
    handleValidatorTileClick(event) {
        const status = event.currentTarget.dataset.status;
        if (!status) return;
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'ValidatorPortal__c' },
            state: { statusFilter: status }
        });
    }

    /** "View full queue" → Validator Queue page, unfiltered */
    handleViewAllValidatorQueue() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'ValidatorPortal__c' }
        });
    }

    /** Row action → Validator Queue page with the record auto-opened */
    handlePreviewValidate(event) {
        const recordId   = event.currentTarget.dataset.id;
        const recordName = event.currentTarget.dataset.appname;
        if (!recordId) return;
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'ValidatorPortal__c' },
            state: { recordId, recordName }
        });
    }

    // ─── Getters ──────────────────────────────────────────────────
    get noValidatorPreviewRows() {
        return !this.validatorPreviewRows || this.validatorPreviewRows.length === 0;
    }

    get greeting() {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }

    get todayDate() {
        return new Date().toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────

    /** Treat "YYYY-MM-DD" as LOCAL time, not UTC (avoids off-by-one on due dates) */
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

    _computeDueDateClass(dueDate) {
        if (!dueDate) return 'due-date';
        const due      = this._parseDate(dueDate);
        const today    = new Date(); today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due - today) / 86400000);
        if (diffDays < 0)  return 'due-date due-overdue';
        if (diffDays <= 3) return 'due-date due-urgent';
        return 'due-date';
    }
}