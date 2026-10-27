import { LightningElement, api, track } from 'lwc';

import CL_Application_FAQ from '@salesforce/label/c.CL_Application_FAQ';
import CL_Application_Timeline from '@salesforce/label/c.CL_Application_Timeline';
import CL_Eligibility_criteria from '@salesforce/label/c.CL_Eligibility_criteria';
import CL_Useful_links from '@salesforce/label/c.CL_Useful_links';
import CL_For_any_queries from '@salesforce/label/c.CL_For_any_queries';
import CL_Your_Programme_Lead from '@salesforce/label/c.CL_Your_Programme_Lead';

// Step labels (11 — Not Started + the 10 sequential flags)
import CL_Not_Started from '@salesforce/label/c.CL_NOT_STARTED';
import CL_In_Progress from '@salesforce/label/c.CL_IN_PROGRESS';
import CL_Completeness_Check from '@salesforce/label/c.CL_Completeness_Check';
import CL_Being_Reviewed from '@salesforce/label/c.CL_Being_Reviewed';
import CL_Approval_In_Progress from '@salesforce/label/c.CL_Approval_In_Progress';
import CL_Approved_For_Onboarding from '@salesforce/label/c.CL_Approved_For_Onboarding';
import CL_Onboarding_Initiated from '@salesforce/label/c.CL_Onboarding_Initiated';
import CL_Onboarding_In_Progress from '@salesforce/label/c.CL_Onboarding_In_Progress';
import CL_Compliance_Review from '@salesforce/label/c.CL_Compliance_Review';
import CL_Onboarding_Approved from '@salesforce/label/c.CL_Onboarding_Approved';
import CL_Onboarded from '@salesforce/label/c.CL_Onboarded';

// Terminal/exception labels
import CL_Rejected from '@salesforce/label/c.CL_Rejected';
import CL_Suspended from '@salesforce/label/c.CL_Suspended';

// Tooltips (11)
import CL_NotStarted_Tooltip from '@salesforce/label/c.CL_NotStarted_Tooltip';
import CL_InProgress_Tooltip from '@salesforce/label/c.CL_InProgress_Tooltip';
import CL_CompletenessCheck_Tooltip from '@salesforce/label/c.CL_CompletenessCheck_Tooltip';
import CL_BeingReviewed_Tooltip from '@salesforce/label/c.CL_BeingReviewed_Tooltip';
import CL_ApprovalInProgress_Tooltip from '@salesforce/label/c.CL_ApprovalInProgress_Tooltip';
import CL_ApprovedOnboarding_Tooltip from '@salesforce/label/c.CL_ApprovedOnboarding_Tooltip';
import CL_OnboardingInitiated_Tooltip from '@salesforce/label/c.CL_OnboardingInitiated_Tooltip';
import CL_OnboardingInProgress_Tooltip from '@salesforce/label/c.CL_OnboardingInProgress_Tooltip';
import CL_ComplianceReview_Tooltip from '@salesforce/label/c.CL_ComplianceReview_Tooltip';
import CL_OnboardingApproved_Tooltip from '@salesforce/label/c.CL_OnboardingApproved_Tooltip';
import CL_Onboarded_Tooltip from '@salesforce/label/c.CL_Onboarded_Tooltip';

import { NavigationMixin } from 'lightning/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ NEW UI STRINGS — currently hardcoded English.
// Create these as Custom Labels and swap the values when you're ready for
// es / pt_BR. Nothing else in this file needs to change when you do.
// ─────────────────────────────────────────────────────────────────────────────
const UI_TEXT = {
    phaseApplication: 'Application',
    phaseReview: 'Review',
    phaseOnboarding: 'Onboarding',
    stepOf: 'Step {0} of {1}',
    complete: 'Complete',
    completeTitle: "You're onboarded",
    completeBody: 'All steps are finished.',
    notStarted: 'Not started',
    inProgress: 'In progress',
    actionNeeded: 'Action needed',
    onHold: 'On hold',
    stepsDone: '{0} steps done',
    stepsTotal: '{0} steps',
    remainingOne: '1 remaining step',
    remainingMany: '{0} remaining steps',
    showAll: 'Show all 11 steps',
    showLess: 'Show less',
    uploadDocs: 'Upload documents',
    reviewAndResubmit: 'Review and resubmit',
    viewDocs: 'View documents',
    noteReturned: 'Your documents were returned. Please review the comments and resubmit.',
    noteRejected: 'Your documents did not pass review. Contact your Programme Lead.',
    noteSuspended: 'Your review is on hold while we carry out additional checks.',
    revisionTitle: 'Revision requested',
    revisionBody: 'Our team reviewed your application and returned it with feedback.',
    revisionNote: 'Review the comments, update the flagged answers and resubmit.',
    notRecommendedTitle: 'Application Not Selected',
    notRecommendedBody: 'After careful review, your application was not selected for funding at this time. Please reach out to your Programme Lead if you have questions.',
    suspendedTitle: 'Application Suspended',
    suspendedBody: 'Your application has been suspended due to 100 days of inactivity.',
    suspendedNote: 'This application is closed and can no longer be edited or resumed.'
};

const fmt = (tpl, ...args) => args.reduce((s, a, i) => s.replace(`{${i}}`, a), tpl);

// 11 steps: Not Started (0) is a real bubble now, followed by the 10
// sequential flags (1-10) per spec section 2.
const STEP_DEFS = [
    { key: 'notStarted', number: 1, label: CL_Not_Started, tooltip: CL_NotStarted_Tooltip },
    { key: 'inProgress', number: 2, label: CL_In_Progress, tooltip: CL_InProgress_Tooltip },
    { key: 'completenessCheck', number: 3, label: CL_Completeness_Check, tooltip: CL_CompletenessCheck_Tooltip },
    { key: 'beingReviewed', number: 4, label: CL_Being_Reviewed, tooltip: CL_BeingReviewed_Tooltip },
    { key: 'approvalInProgress', number: 5, label: CL_Approval_In_Progress, tooltip: CL_ApprovalInProgress_Tooltip },
    { key: 'applicationApproved', number: 6, label: CL_Approved_For_Onboarding, tooltip: CL_ApprovedOnboarding_Tooltip },
    { key: 'onboardingInitiated', number: 7, label: CL_Onboarding_Initiated, tooltip: CL_OnboardingInitiated_Tooltip },
    { key: 'onboardingInProgress', number: 8, label: CL_Onboarding_In_Progress, tooltip: CL_OnboardingInProgress_Tooltip },
    { key: 'complianceReview', number: 9, label: CL_Compliance_Review, tooltip: CL_ComplianceReview_Tooltip },
    { key: 'onboardingApproved', number: 10, label: CL_Onboarding_Approved, tooltip: CL_OnboardingApproved_Tooltip },
    { key: 'onboarded', number: 11, label: CL_Onboarded, tooltip: CL_Onboarded_Tooltip }
];

// Three phases over the same 11 steps. start/end are inclusive 0-based
// indices into STEP_DEFS — no step data is duplicated.
const PHASE_DEFS = [
    { key: 'application', number: 1, label: UI_TEXT.phaseApplication, start: 0, end: 2 },
    { key: 'review', number: 2, label: UI_TEXT.phaseReview, start: 3, end: 5 },
    { key: 'onboarding', number: 3, label: UI_TEXT.phaseOnboarding, start: 6, end: 10 }
];

const STATUS_TO_STEP_INDEX = {
    NotStarted: 0,                 // Not Started
    RevisionRequested: 1,          // In Progress (editing again)
    Draft: 1,                      // In Progress  (was 2)
    ApplicationSuspended: 1,

    Submitted: 2,                  // Completeness Check  (was 3)
    Sealed: 2,                     // Completeness Check  (was 3)
    ApplicationResubmitted: 2,     // Completeness Check  (was 3)

    UnderReview: 3,                // Being Reviewed  (was 4)
    InReview: 3,                   // Being Reviewed  (was 4)

    ReviewSubmitted: 4,            // Approval in Progress  (was 5)
    Decided: 5,                    // Approved for Onboarding
    Approved: 5,                   // Approved for Onboarding   (was 6)

    OnboardingInitiated: 6,        // was 7
    OnboardingInProgress: 7,       // was 8
    ComplianceReview: 8,           // was 9
    OnboardingSuspended: 8,
    OnboardingRejected: 8,
    OnboardingApproved: 9,         // was 10
    Onboarded: 10                  // Complete
};

const ALERT_STATUSES = new Set(['Rejected', 'Suspended', 'OnboardingRejected', 'OnboardingSuspended', 'ApplicationSuspended']);

// Compliance doc status → activeIndex (the step now in progress).
const COMPLIANCE_TO_STEP_INDEX = {
    'Pending Submission': 6,
    'Received': 8,
    'Returned': 8,
    'Rejected': 8,
    'Suspended': 8,
    'Validated': 9
};

const ONBOARDING_STATUSES = new Set([
    'Approved', 'OnboardingInitiated', 'OnboardingInProgress',
    'ComplianceReview', 'OnboardingApproved', 'Onboarded',
    'OnboardingSuspended', 'OnboardingRejected'
]);

const UPLOAD_STEP_INDEX = 7;

// Compliance states that put an action button on the active step
const ACTIONABLE_COMPLIANCE = new Set(['Pending Submission', 'Received', 'Returned']);

const norm = (s) => (s == null ? '' : String(s)).replace(/[\s_-]/g, '').toLowerCase();

// Map any extra values your record can send to an existing key in STATUS_TO_STEP_INDEX.
// ⚠️ Replace these with the REAL picklist API values from the status field.
const STATUS_ALIASES = {
    'Passed for Onboarding': 'Approved',
    'Passed for Onboarded': 'Onboarded',
    'Onboarding Suspended': 'OnboardingSuspended',
    'Onboarding Rejected': 'OnboardingRejected',
    'Application Suspended': 'ApplicationSuspended'
};

const STATUS_LOOKUP = {};
Object.keys(STATUS_TO_STEP_INDEX).forEach((k) => {
    STATUS_LOOKUP[norm(k)] = STATUS_TO_STEP_INDEX[k];
});
Object.keys(STATUS_ALIASES).forEach((k) => {
    STATUS_LOOKUP[norm(k)] = STATUS_TO_STEP_INDEX[STATUS_ALIASES[k]];
});

const COMPLIANCE_LOOKUP = {};
Object.keys(COMPLIANCE_TO_STEP_INDEX).forEach((k) => {
    COMPLIANCE_LOOKUP[norm(k)] = COMPLIANCE_TO_STEP_INDEX[k];
});

const ALERT_KEYS = new Set([...ALERT_STATUSES].map(norm));
const ONBOARDING_KEYS = new Set([...ONBOARDING_STATUSES].map(norm));
const ACTIONABLE_KEYS = new Set([...ACTIONABLE_COMPLIANCE].map(norm));
const EXCEPTION_COMPLIANCE_KEYS = new Set(['returned', 'rejected', 'suspended']);

// Maps the compliance screen's vocabulary onto the timeline's vocabulary.
const COMPLIANCE_ALIASES = {
    pendingreview: 'received',
    submitted: 'received',
    underreview: 'received',
    flagged: 'received',
    draft: 'pendingsubmission',
    notstarted: 'pendingsubmission',
    refreshrequired: 'returned',
    return: 'returned',
    reject: 'rejected',
    suspend: 'suspended',
    complete: 'validated',
    approved: 'validated',
    pass: 'validated'
};
const canonCompliance = (s) => {
    const k = norm(s);
    return COMPLIANCE_ALIASES[k] || k;
};

export default class WcfApplicationTimeline extends NavigationMixin(LightningElement) {

    label = {
        CL_Application_FAQ,
        CL_Application_Timeline,
        CL_Eligibility_criteria,
        CL_Useful_links,
        CL_For_any_queries,
        CL_Your_Programme_Lead
    };

    t = UI_TEXT;

    @track showEligibilityModal = false;
    @track showFaqModal = false;

    // Phase expand/collapse. Key = phase key, value = true/false.
    // Absent key means "use the default" (active phase open, others closed).
    @track expandedOverrides = {};
    @track showAllSteps = false;

    faqUrl = '/s/application-faq';
    eligibilityUrl = '/s/eligibility-criteria';

    @api currentStatus = 'NotStarted';
    @api lastActiveStepIndex;
    @api programmeLeadName;
    @api programmeLeadEmail;
    @api complianceDocStatus;
    @api complianceHasUploads = false;
    @api decisionOutcome;
    @api complianceReviewerNotes;

    connectedCallback() {
        this.resolvePageUrls();
    }

    resolvePageUrls() {
        this[NavigationMixin.GenerateUrl]({
            type: 'comm__namedPage',
            attributes: { name: 'ApplicationFAQ__c' }
        }).then((url) => { this.faqUrl = url; });

        this[NavigationMixin.GenerateUrl]({
            type: 'comm__namedPage',
            attributes: { name: 'EligiblityCri__c' }
        }).then((url) => { this.eligibilityUrl = url; });
    }

    renderedCallback() {
        const fill = this.template.querySelector('.tl-progress-fill');
        if (fill) {
            fill.style.width = `${this.progressPercent}%`;
        }
    }

    get statusKey() {
        return norm(this.currentStatus);
    }

    get complianceKey() {
        return canonCompliance(this.complianceDocStatus);
    }

    get isAlertStatus() {
        return ALERT_KEYS.has(this.statusKey);
    }
    get isNotRecommended() {
        const k = norm(this.decisionOutcome);
        return k === 'notrecommendforfund'
            || k === 'notrecommendedforfund'
            || k === 'notrecommended';
    }

    get activeIndex() {
        if (this.isAlertStatus && this.lastActiveStepIndex != null) {
            return this.lastActiveStepIndex;
        }

        const base = STATUS_LOOKUP[this.statusKey];
        if (base === undefined && !this.isAlertStatus) {
            // eslint-disable-next-line no-console
            console.warn('WcfApplicationTimeline: unmapped currentStatus =', this.currentStatus);
        }
        let idx = base === undefined ? 0 : base;

        if (base === undefined || ONBOARDING_KEYS.has(this.statusKey)) {
            const compIdx = this.complianceStepIndex;
            if (compIdx != null && compIdx > idx) {
                idx = compIdx;
            }
        }
        return idx;
    }

    get complianceStepIndex() {
        const k = this.complianceKey;
        let idx = COMPLIANCE_LOOKUP[k] !== undefined ? COMPLIANCE_LOOKUP[k] : null;

        if (this.complianceHasUploads && !EXCEPTION_COMPLIANCE_KEYS.has(k)) {
            idx = Math.max(idx == null ? 0 : idx, UPLOAD_STEP_INDEX);
        }
        return idx;
    }

    // ── Header ────────────────────────────────────────────────────────
    get totalSteps() {
        return STEP_DEFS.length;
    }
    get doneCount() {
        const ai = this.activeIndex;
        const tickCurrent = !this.exceptionLevel && ai > 0;
        return Math.min(tickCurrent ? ai + 1 : ai, STEP_DEFS.length);
    }

    get isComplete() {
        return this.doneCount >= STEP_DEFS.length;
    }

    get progressPercent() {
        return Math.round((this.doneCount / STEP_DEFS.length) * 100);
    }
    get stepCounterLabel() {
        if (this.isComplete) return UI_TEXT.complete;
        return fmt(UI_TEXT.stepOf, this.activeIndex + 1, STEP_DEFS.length);
    }

    get progressFillClass() {
        return this.exceptionLevel
            ? `tl-progress-fill tl-progress-fill--${this.exceptionLevel}`
            : 'tl-progress-fill';
    }

    // ── Exception handling ────────────────────────────────────────────
    get activeCardClass() {
        if (this.exceptionLevel) return `tl-active-card tl-active-card--${this.exceptionLevel}`;
        return this.isNotStarted
            ? 'tl-active-card tl-active-card--neutral'
            : 'tl-active-card tl-active-card--success';
    }

    get activeBadgeClass() {
        if (this.exceptionLevel) return `tl-badge tl-badge--${this.exceptionLevel}`;
        return this.isNotStarted
            ? 'tl-badge tl-badge--neutral'
            : 'tl-badge tl-badge--success';
    }

    // ── Action button on the active step ──────────────────────────────


    get exceptionLevel() {
        if (this.statusKey === 'revisionrequested') return 'warning';
        if (this.statusKey === 'rejected' || this.statusKey === 'onboardingrejected') return 'danger';
        if (this.statusKey === 'suspended' || this.statusKey === 'onboardingsuspended' || this.statusKey === 'applicationsuspended') return 'warning';
        const k = this.complianceKey;
        if (k === 'rejected') return 'danger';
        if (k === 'returned' || k === 'suspended') return 'warning';
        return null;
    }
    get isNotStarted() {
        return !this.exceptionLevel && this.activeIndex === 0;
    }

    get activeBadgeText() {
        const lvl = this.exceptionLevel;
        if (lvl === 'danger') return UI_TEXT.actionNeeded;
        if (lvl === 'warning') {
            if (this.statusKey === 'applicationsuspended') {
                return 'SUSPENDED';
            }
            return this.complianceKey === 'suspended' || this.statusKey === 'suspended' || this.statusKey === 'onboardingsuspended'
                ? UI_TEXT.onHold
                : UI_TEXT.actionNeeded;
        }
        return this.isNotStarted ? UI_TEXT.notStarted : UI_TEXT.inProgress;
    }

    get showComplianceAction() {
        return ONBOARDING_KEYS.has(this.statusKey)
            && ACTIONABLE_KEYS.has(this.complianceKey);
    }

    get complianceActionLabel() {
        if (this.complianceKey === 'returned') return UI_TEXT.reviewAndResubmit;
        if (this.complianceKey === 'received') return UI_TEXT.viewDocs;
        return UI_TEXT.uploadDocs;
    }

    // ── Steps (same shape as before, plus phase metadata) ─────────────
    get steps() {
        const ai = this.activeIndex;
        const dc = this.doneCount;
        const isRevision = this.statusKey === 'revisionrequested';

        return STEP_DEFS.map((def, i) => {
            const isDone = i < dc;
            const isActive = i === ai && !this.isComplete;

            let subLabel = '';
            let label = def.label;
            let tooltip = def.tooltip;

            if (isActive) {
                if (this.isNotRecommended && i === 5) {
                    label = UI_TEXT.notRecommendedTitle;
                    tooltip = UI_TEXT.notRecommendedBody;
                } else if (this.statusKey === 'applicationsuspended') {
                    label = UI_TEXT.suspendedTitle;
                    tooltip = UI_TEXT.suspendedBody;
                    subLabel = UI_TEXT.suspendedNote;
                } else if (isRevision) {
                    label = UI_TEXT.revisionTitle;
                    tooltip = UI_TEXT.revisionBody;
                    subLabel = UI_TEXT.revisionNote;
                } else if (this.statusKey === 'rejected' || this.statusKey === 'onboardingrejected') {
                    subLabel = this.complianceReviewerNotes || CL_Rejected;
                } else if (this.statusKey === 'suspended' || this.statusKey === 'onboardingsuspended') {
                    subLabel = this.complianceReviewerNotes || CL_Suspended;
                } else if (this.complianceKey === 'returned') subLabel = UI_TEXT.noteReturned;
                else if (this.complianceKey === 'rejected') subLabel = this.complianceReviewerNotes || UI_TEXT.noteRejected;
                else if (this.complianceKey === 'suspended') subLabel = this.complianceReviewerNotes || UI_TEXT.noteSuspended;
            }

            return {
                ...def,
                label,
                tooltip,
                index: i,
                isDone,
                isActive,
                isUpcoming: i > ai,
                subLabel,
                dotClass: isActive && this.exceptionLevel
                    ? `tl-dot tl-dot--active tl-dot--${this.exceptionLevel}`
                    : isDone
                        ? 'tl-dot tl-dot--done'
                        : isActive
                            ? 'tl-dot tl-dot--neutral'
                            : 'tl-dot',
                lineClass: i < dc - 1
                    ? 'tl-line tl-line--done'
                    : i === dc - 1
                        ? 'tl-line tl-line--half'
                        : 'tl-line'
            };
        });
    }

    // ── Phases ────────────────────────────────────────────────────────
    get phases() {
        const all = this.steps;
        const ai = this.activeIndex;

        return PHASE_DEFS.map((p) => {
            const slice = all.slice(p.start, p.end + 1);
            const count = slice.length;
            const dc = this.doneCount;
            const isDone = dc > p.end;
            const hasActive = !this.isComplete && ai >= p.start && ai <= p.end;
            const isActive = hasActive && !isDone;
            const isUpcoming = !isDone && !hasActive;

            const override = this.expandedOverrides[p.key];
            const openByDefault = hasActive || (this.isComplete && p.key === 'onboarding');
            const expanded = this.showAllSteps
                ? true
                : (override === undefined ? openByDefault : override);
            const doneOrActive = slice.filter(s => !s.isUpcoming);
            const upcoming = slice.filter(s => s.isUpcoming);

            const visibleSteps = this.showAllSteps ? slice : doneOrActive;
            const showRemaining = !this.showAllSteps && upcoming.length > 0;

            const decorated = visibleSteps.map((s, i) => ({
                ...s,
                hideLine: (i === visibleSteps.length - 1) && !showRemaining
            }));

            let meta;
            if (isDone) meta = fmt(UI_TEXT.stepsDone, count);
            else if (isUpcoming) meta = fmt(UI_TEXT.stepsTotal, count);
            else meta = fmt(UI_TEXT.stepsDone, Math.max(dc - p.start, 0));

            return {
                key: p.key,
                number: p.number,
                label: p.label,
                meta,
                isDone,
                isActive,
                expanded,
                expandedStr: String(expanded),
                visibleSteps: decorated,
                showRemaining,
                remainingLabel: upcoming.length === 1
                    ? UI_TEXT.remainingOne
                    : fmt(UI_TEXT.remainingMany, upcoming.length),
                remainingNames: upcoming.map(s => s.label).join(', '),
                iconClass: isDone
                    ? 'tl-phase-icon tl-phase-icon--done'
                    : hasActive
                        ? (this.exceptionLevel
                            ? `tl-phase-icon tl-phase-icon--active tl-phase-icon--${this.exceptionLevel}`
                            : (dc > 0
                                ? 'tl-phase-icon tl-phase-icon--success'
                                : 'tl-phase-icon tl-phase-icon--neutral'))   // was --active
                        : 'tl-phase-icon',
                rowClass: expanded ? 'tl-phase tl-phase--open' : 'tl-phase',
                chevronClass: expanded ? 'tl-chev tl-chev--open' : 'tl-chev',
                badgeText: this.activeBadgeText,
                badgeClass: this.activeBadgeClass
            };
        });
    }

    get toggleAllLabel() {
        return this.showAllSteps ? UI_TEXT.showLess : UI_TEXT.showAll;
    }

    // ── Handlers ──────────────────────────────────────────────────────
    handleTogglePhase(event) {
        const key = event.currentTarget.dataset.phase;
        if (!key) return;
        const current = this.phases.find(p => p.key === key);
        this.expandedOverrides = {
            ...this.expandedOverrides,
            [key]: !(current && current.expanded)
        };
    }

    handleToggleAll(event) {
        if (event) event.preventDefault();
        this.showAllSteps = !this.showAllSteps;
        if (!this.showAllSteps) {
            this.expandedOverrides = {};
        }
    }

    handleComplianceAction() {
        this.dispatchEvent(new CustomEvent('complianceaction'));
    }

    // ── Unchanged ─────────────────────────────────────────────────────
    get showProgrammeLead() {
        return !!this.programmeLeadName;
    }

    get programmeLeadInitials() {
        if (!this.programmeLeadName) return '';
        return this.programmeLeadName
            .split(' ')
            .map(w => w.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    handleOpenEligibility(event) {
        if (event) event.preventDefault();
        this.showEligibilityModal = true;
    }

    handleCloseEligibility() {
        this.showEligibilityModal = false;
    }

    handleOpenFaq(event) {
        if (event) event.preventDefault();
        this.showFaqModal = true;
    }

    handleCloseFaq() {
        this.showFaqModal = false;
    }
}