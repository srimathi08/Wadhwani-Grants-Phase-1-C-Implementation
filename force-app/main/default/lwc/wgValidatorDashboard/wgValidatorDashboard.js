import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getActionCounts    from '@salesforce/apex/WCFValidatorController.getActionCounts';
import getValidatorPreview from '@salesforce/apex/WCFValidatorController.getValidatorPreview';

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
        const resume    = (data?.resume ?? 0) + (data?.awaitingApplicant ?? 0);
        const validate  = data?.validate  ?? 0;
        const validated = data?.validated ?? 0;
        const resubmit  = data?.resubmit  ?? 0;
        const returnedByReviewer = data?.returnedByReviewer ?? 0;

        this.validatorCards = [
            { /* resume card — unchanged */
                id: 'resume', label: 'In Validator Queue',
                subtitle: 'Draft & resumed proposals awaiting action',
                count: resume, status: 'resume',
                kpiClass: 'kpi-card', dotClass: 'kpi-dot kpi-dot-red'
            },
            { /* validate card — unchanged */
                id: 'validate', label: 'My Active Reviews',
                subtitle: 'Submitted proposals ready to validate',
                count: validate, status: 'validate',
                kpiClass: 'kpi-card', dotClass: 'kpi-dot kpi-dot-blue'
            },
            { /* validated card — unchanged */
                id: 'validated', label: 'Validated',
                subtitle: 'Completed & finalised records',
                count: validated, status: 'validated',
                kpiClass: 'kpi-card', dotClass: 'kpi-dot kpi-dot-amber'
            },
            { /* resubmit card — unchanged */
                id: 'resubmit', label: 'Resubmissions',
                subtitle: 'Applications resubmitted after return',
                count: resubmit, status: 'resubmit',
                kpiClass: resubmit > 0 ? 'kpi-card kpi-card-alert' : 'kpi-card',
                dotClass: 'kpi-dot kpi-dot-red'
            },
            {
                id:       'returnedByReviewer',
                label:    'Returned by Reviewer',
                subtitle: 'Sent back by the Reviewer — needs your decision',
                count:    returnedByReviewer,
                status:   'returnedByReviewer',
                kpiClass: returnedByReviewer > 0 ? 'kpi-card kpi-card-alert' : 'kpi-card',
                dotClass: 'kpi-dot kpi-dot-red'
            }
        ];
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
                        status: w.isResubmission
                            ? 'Application Resubmitted'
                            : w.hasDraft
                            ? 'Resume Validation'
                            : 'Awaiting Validation',
                        statusClass: w.isResubmission
                            ? 'status-pill status-resubmission'
                            : w.hasDraft
                            ? 'status-pill status-inprogress'
                            : 'status-pill status-awaiting',
                        action: w.isResubmission ? 'Revalidate' : w.hasDraft ? 'Resume' : 'Validate',
                        actionClass: w.isResubmission
                            ? 'action-btn-revalidate'
                            : w.hasDraft
                            ? 'action-btn-resume'
                            : 'action-btn-validate'
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

    // ─── Handlers ─────────────────────────────────────────────────

    /**
     * KPI tile click → navigate to Validator Queue page,
     * passing statusFilter in URL state so wcfValidatorContainer
     * can pre-filter on arrival (same behaviour as the parent).
     */
    handleValidatorTileClick(event) {
        const status = event.currentTarget.dataset.status;
        if (!status) return;
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'ValidatorPortal__c' },
            state: { statusFilter: status }
        });
    }

    /**
     * "View all in Queue →" link / preview-footer link
     * → navigate to the standalone Validator Queue page.
     */
    handleViewAllValidatorQueue() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'ValidatorPortal__c' }
        });
    }

    /**
     * Per-row Validate / Resume button in the preview table
     * → navigate to Validator Queue page and auto-open the record
     * (same state params as handleDashboardPreviewValidate in the parent).
     */
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