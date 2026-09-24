import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getActionCounts     from '@salesforce/apex/WCFValidatorController.getActionCounts';
import getValidatorPreview from '@salesforce/apex/WCFValidatorController.getValidatorPreview';

/*
 * MERGED VERSION (23-09)
 *  - Tile set, labels, counts and order: from the colleague's update
 *      · "In Validator Queue" = resume + awaitingApplicant (combined)
 *      · "My Active Reviews", "Validated", "Resubmissions", "Returned by Reviewer"
 *  - Styling / display classes: from the portal design system (wcfPortalUi)
 *  - Row states: colleague's labels + the Awaiting Applicant / Returned by
 *    Reviewer states (rows show "No action" / "Review return" instead of
 *    a Validate button that does not apply)
 */

// tone → dot color (wcfPortalUi): info = blue, warning = amber, success = green,
// brand/error = red, neutral = grey. half = tile takes half a row (row 2 of 3 + 2).
const TILE_DEFS = [
    { id: 'resume',             label: 'In Validator Queue',   subtitle: 'Draft & resumed proposals awaiting action',        tone: 'warning' },
    { id: 'validate',           label: 'My Active Reviews',    subtitle: 'Submitted proposals ready to validate',            tone: 'info' },
    { id: 'validated',          label: 'Validated',            subtitle: 'Completed & finalised records',                    tone: 'success' },
    { id: 'resubmit',           label: 'Resubmissions',        subtitle: 'Applications resubmitted after return',            tone: 'brand', alertWhenPositive: true, half: true },
    { id: 'returnedByReviewer', label: 'Returned by Reviewer', subtitle: 'Sent back by the Reviewer — needs your decision',   tone: 'error', alertWhenPositive: true, half: true }
];

export default class WgValidatorDashboard extends NavigationMixin(LightningElement) {

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
            const resume             = data?.resume             ?? 0;
            const awaitingApplicant  = data?.awaitingApplicant  ?? 0;
            const validate           = data?.validate           ?? 0;
            const validated          = data?.validated          ?? 0;
            const resubmit           = data?.resubmit           ?? 0;
            const returnedByReviewer = data?.returnedByReviewer ?? 0;

            // Colleague's logic: drafts and awaiting-applicant share one tile
            const counts = {
                resume            : resume + awaitingApplicant,
                validate,
                validated,
                resubmit,
                returnedByReviewer
            };

            this.validatorCards = TILE_DEFS.map(t => {
                const count   = counts[t.id] ?? 0;
                const isAlert = t.alertWhenPositive && count > 0;
                return {
                    id      : t.id,
                    label   : t.label,
                    subtitle: t.subtitle,
                    count,
                    status  : t.id,
                    kpiClass: 'wg-stat'
                              + (t.half   ? ' wg-stat--half'  : '')
                              + (isAlert  ? ' wg-stat--alert' : ''),
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

            // Sort (unchanged): resubmissions first → soonest due date → Resume before Validate → nulls last
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
     * Display state for a preview row.
     * Labels follow the colleague's update ("Application Resubmitted" /
     * "Revalidate", "Resume Validation" / "Resume", "Awaiting Validation" /
     * "Validate"). isReturnedByReviewer / isAwaitingApplicant are read only
     * if the Apex wrapper provides them (undefined → false).
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
                status: 'Resume Validation', statusClass: 'wg-pill wg-pill--warning',
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

    // ─── Handlers (unchanged) ─────────────────────────────────────

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

    // ─── Helpers (unchanged) ──────────────────────────────────────

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