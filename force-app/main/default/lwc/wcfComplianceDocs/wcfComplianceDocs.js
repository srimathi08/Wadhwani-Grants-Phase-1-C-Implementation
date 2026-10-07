import { LightningElement, api, track } from 'lwc';
import getComplianceChecklist from '@salesforce/apex/WCFComplianceController.getComplianceChecklist';
import saveComplianceDocument from '@salesforce/apex/WCFComplianceController.saveComplianceDocument';
import getOrCreateComplianceRecord from '@salesforce/apex/WCFComplianceController.getOrCreateComplianceRecord';
import deleteComplianceDocumentFile from '@salesforce/apex/WCFComplianceController.deleteComplianceDocumentFile';
import saveAdHocComplianceDocument from '@salesforce/apex/WCFComplianceController.saveAdHocComplianceDocument';
import deleteAdHocComplianceDocumentFile from '@salesforce/apex/WCFComplianceController.deleteAdHocComplianceDocumentFile';
import submitComplianceDocuments from '@salesforce/apex/WCFComplianceController.submitComplianceDocuments';
import discardUploadedFile from '@salesforce/apex/WCFComplianceController.discardUploadedFile';

// ─────────────────────────────────────────────────────────────────────────
// BRD B.4 — Compliance upload after Grant Committee approval. The donee
// uploads geography-specific documents; the Compliance Reviewer decides
// Pass / Return / Reject / Suspend per document.
//
// EDIT RULES (mirrors WCFComplianceController — Apex enforces them too):
//
//   Reviewer decision        Donee can…
//   ───────────────────────  ─────────────────────────────────────────
//   Pass (Validated)         view / download only
//   Reject                   nothing — whole checklist frozen
//   Suspend                  nothing — whole checklist frozen
//   Return                   upload a corrected copy (no delete)
//   Refresh Required         upload a renewed copy (no delete)
//   Pending Review/Flagged   view only (it is with the reviewer)
//   Not started / Requested  upload, replace, delete, then Submit
//   / Draft
//
// record-id on lightning-file-upload is the WCF_Compliance_Document__c Id
// (item.uploadRecordId), never the IndividualApplication Id.
//
// Live updates: background re-sync every POLL_INTERVAL_MS while visible and
// on tab focus; skipped while any upload / submit / dialog is in progress.
// A reviewer decision arriving mid-session locks the rows immediately.
//
// Upload dialog: lightning-file-upload opens its own "Upload Files" dialog,
// and `uploadfinished` fires while that dialog is still on screen. The row
// must NOT be re-rendered (which removes the uploader) and the dialog must
// NOT be force-hidden until it has closed — otherwise Salesforce never runs
// its own teardown and the page is left behind an invisible, still-active
// modal (nothing can be clicked or typed = "read-only"). The checklist is
// therefore refreshed only after the dialog closes.
// ─────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    'Not Started':        { badgeClass: 'comp-badge comp-badge--pending',    label: 'NOT STARTED' },
    'Draft':              { badgeClass: 'comp-badge comp-badge--draft',      label: 'DRAFT SAVED' },
    'Pending Review':     { badgeClass: 'comp-badge comp-badge--inprogress', label: 'PENDING REVIEW' },
    'Validated':          { badgeClass: 'comp-badge comp-badge--active',     label: 'VALIDATED' },
    'Returned':           { badgeClass: 'comp-badge comp-badge--returned',   label: 'ACTION NEEDED' },
    'Flagged':            { badgeClass: 'comp-badge comp-badge--flagged',    label: 'UNDER REVIEW' },
    'Refresh Required':   { badgeClass: 'comp-badge comp-badge--expired',    label: 'REFRESH REQUIRED' },
    'Pending Submission': { badgeClass: 'comp-badge comp-badge--returned',   label: 'DOCUMENT REQUESTED' },
    'Rejected':           { badgeClass: 'comp-badge comp-badge--rejected',   label: 'REJECTED' },
    'Suspended':          { badgeClass: 'comp-badge comp-badge--suspended',  label: 'SUSPENDED' }
};

// Reviewer / legacy spellings → canonical status
const STATUS_ALIASES = {
    'pass'              : 'Validated',
    'approved'          : 'Validated',
    'validated'         : 'Validated',
    'reject'            : 'Rejected',
    'rejected'          : 'Rejected',
    'suspend'           : 'Suspended',
    'suspended'         : 'Suspended',
    'return'            : 'Returned',
    'returned'          : 'Returned',
    'submitted'         : 'Pending Review',
    'under review'      : 'Pending Review',
    'received'          : 'Pending Review',
    'pending review'    : 'Pending Review',
    'draft'             : 'Draft',
    'not started'       : 'Not Started',
    'pending submission': 'Pending Submission',
    'refresh required'  : 'Refresh Required',
    'flagged'           : 'Flagged'
};

const EDITABLE_STATUSES        = new Set(['Not Started', 'Pending Submission', 'Draft', 'Returned', 'Refresh Required']);
const DELETABLE_STATUSES       = new Set(['Not Started', 'Pending Submission', 'Draft']);
const REUPLOAD_STATUSES        = new Set(['Returned', 'Refresh Required']);
const NEWLY_REQUESTED_STATUSES = new Set(['Not Started', 'Pending Submission']);
const FREEZE_STATUSES          = new Set(['Rejected', 'Suspended']);

const LOCKED_HINTS = {
    'Pending Review': 'With the compliance team for review. You can update it only if the team returns it to you.',
    'Flagged'       : 'Under additional review by the compliance team. It cannot be changed right now.',
    'Validated'     : 'Validated by the compliance team. This document is final and can no longer be changed.'
};

const FROZEN_ROW_HINTS = {
    'Rejected' : 'Locked — this compliance submission was rejected.',
    'Suspended': 'Locked while the compliance review is suspended.'
};

const DEFAULT_REASONS = {
    'Returned' : 'Please upload a corrected copy.',
    'Rejected' : 'Please contact the compliance team for details.',
    'Suspended': 'Please contact the compliance team for details.'
};

const OVERALL_STATUS_BADGE_CLASS = {
    'Complete'          : 'comp-overall-badge comp-overall-badge--complete',
    'Validated'         : 'comp-overall-badge comp-overall-badge--complete',
    'Submitted'         : 'comp-overall-badge comp-overall-badge--inprogress',
    'Pending Review'    : 'comp-overall-badge comp-overall-badge--inprogress',
    'In Progress'       : 'comp-overall-badge comp-overall-badge--inprogress',
    'Draft'             : 'comp-overall-badge comp-overall-badge--draft',
    'Refresh Required'  : 'comp-overall-badge comp-overall-badge--refresh',
    'Pending Submission': 'comp-overall-badge comp-overall-badge--pending',
    'Rejected'          : 'comp-overall-badge comp-overall-badge--rejected',
    'Suspended'         : 'comp-overall-badge comp-overall-badge--suspended',
    'Returned'          : 'comp-overall-badge comp-overall-badge--returned'
};

const EXPIRY_WARNING_DAYS = 30;
const POLL_INTERVAL_MS    = 30000;
const MIN_REFRESH_GAP_MS  = 5000;

// Upload dialog hand-off (see header note).
const UPLOAD_DIALOG_SELECTOR = 'div.uiModal.open.active';
const DIALOG_POLL_MS         = 250;
const DIALOG_MAX_WAIT_MS     = 5 * 60 * 1000;   // then close it the supported way

function normalizeStatus(status) {
    if (status === undefined || status === null || status === '') return null;
    const trimmed = String(status).trim();
    return STATUS_ALIASES[trimmed.toLowerCase()] || trimmed;
}

export default class WcfComplianceDocs extends LightningElement {

    // IndividualApplication Id from wcfApplicantDashboard — Apex calls only.
    @api recordId;

    @track isLoading       = true;
    @track isSubmitting    = false;
    @track isSubmitted     = false;
    @track loadError;
    @track geography;
    @track checklistItems  = [];
    @track overallStatus   = 'In Progress';
    @track complianceStatus;
    @track complianceReviewerNotes;
    @track totalRequired   = 0;
    @track totalValidated  = 0;
    @track totalUploaded   = 0;
    @track uploadingDocType;
    @track lockReason;          // 'Rejected' | 'Suspended' | 'Validated' | undefined
    @track isFrozen = false;    // Rejected / Suspended → nothing editable

    // In-page status banner (replaces the platform's ShowToastEvent, which
    // renders outside this component and can't use the brand styles).
    // Uses commonStyleTheme's .error-banner / .warning-banner /
    // .success-banner / .info-banner. See showToast() below.
    @track bannerVisible = false;
    @track bannerVariant = 'info';   // 'error' | 'warning' | 'success' | 'info'
    @track bannerTitle   = '';
    @track bannerMessage = '';
    _bannerTimeout;

    expiryDateByType = {};

    _pollTimer;
    _loadSeq          = 0;
    _lastSignature;
    _lastRefreshAt    = 0;
    _hasLoadedOnce    = false;
    _onVisibility;
    _onFocus;

    // Waiting for lightning-file-upload's dialog to close before re-rendering.
    _awaitingDialogClose = false;
    _dialogWaitTimer;

    // ─────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────

    connectedCallback() {
        this.loadChecklist();
        this.startLiveRefresh();
    }

    // Progress-bar widths are set here instead of with style={...} in the
    // template, so the HTML has no inline style bindings (VS Code's HTML
    // checker flags those as CSS errors). Same values as
    // validatedProgressStyle / uploadedProgressStyle.
    renderedCallback() {
        const validatedFill = this.template.querySelector('.comp-fill-validated');
        if (validatedFill) {
            validatedFill.style.width = `${this.overallProgressPercent}%`;
        }
        const uploadedFill = this.template.querySelector('.comp-fill-uploaded');
        if (uploadedFill) {
            const pending = Math.max(this.uploadedProgressPercent - this.overallProgressPercent, 0);
            uploadedFill.style.width = `${pending}%`;
        }
    }

    disconnectedCallback() {
        this.stopLiveRefresh();
        this.stopDialogWait();
        if (this._bannerTimeout) {
            clearTimeout(this._bannerTimeout);
            this._bannerTimeout = undefined;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Live refresh
    // ─────────────────────────────────────────────────────────────

    startLiveRefresh() {
        this.stopLiveRefresh();

        this._onVisibility = () => {
            if (document.visibilityState === 'visible') {
                this.refreshIfIdle();
            }
        };
        this._onFocus = () => this.refreshIfIdle();

        document.addEventListener('visibilitychange', this._onVisibility);
        window.addEventListener('focus', this._onFocus);

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._pollTimer = setInterval(() => this.refreshIfIdle(), POLL_INTERVAL_MS);
    }

    stopLiveRefresh() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = undefined;
        }
        if (this._onVisibility) {
            document.removeEventListener('visibilitychange', this._onVisibility);
            this._onVisibility = undefined;
        }
        if (this._onFocus) {
            window.removeEventListener('focus', this._onFocus);
            this._onFocus = undefined;
        }
    }

    get isBusy() {
        return this.isLoading
            || this.isSubmitting
            || this._awaitingDialogClose
            || !!this.uploadingDocType
            || (this.checklistItems || []).some(i => i.isPreparing || i.isUploadingThis)
            || this.isUploadDialogOpen();
    }

    isUploadDialogOpen() {
        return !!this.findOpenUploadDialog();
    }

    refreshIfIdle() {
        if (!this.recordId || !this._hasLoadedOnce) return;
        if (document.visibilityState === 'hidden') return;
        if (this.isBusy) return;
        if (Date.now() - this._lastRefreshAt < MIN_REFRESH_GAP_MS) return;
        this.loadChecklist({ silent: true, background: true });
    }

    // ─────────────────────────────────────────────────────────────
    // Data load
    // ─────────────────────────────────────────────────────────────

    loadChecklist({ silent = false, background = false } = {}) {
        if (!this.recordId) {
            console.warn('wcfComplianceDocs: recordId not set, skipping loadChecklist');
            this.isLoading = false;
            return Promise.resolve();
        }

        const seq = ++this._loadSeq;
        this._lastRefreshAt = Date.now();
        if (!silent) {
            this.isLoading = true;
        }

        return getComplianceChecklist({ applicationId: this.recordId })
            .then(result => {
                if (seq !== this._loadSeq) return;
                if (background && this.isBusy) return;

                this.loadError = undefined;

                const signature = this.buildSignature(result);
                if (this._hasLoadedOnce && signature === this._lastSignature) {
                    return;
                }

                const previousItems = this.checklistItems || [];
                const previousLock  = this.lockReason;
                this.applyResult(result);
                this._lastSignature = signature;

                if (background && this._hasLoadedOnce) {
                    this.announceReviewerChanges(previousItems, this.checklistItems, previousLock);
                }
                this._hasLoadedOnce = true;
                this.notifyParent();
            })
            .catch(error => {
                if (seq !== this._loadSeq) return;
                if (background) {
                    console.warn('wcfComplianceDocs: background refresh failed', this.extractErrorMessage(error));
                    return;
                }
                this.loadError = this.extractErrorMessage(error);
            })
            .finally(() => {
                if (seq === this._loadSeq) {
                    this.isLoading = false;
                }
            });
    }

    applyResult(result) {
        const rawItems   = result.items || [];
        const prevByType = new Map(
            (this.checklistItems || []).map(i => [i.documentType, i])
        );

        this.geography               = result.geography;
        this.totalRequired           = result.totalRequired || 0;
        this.totalValidated          = result.totalValidated || 0;
        this.totalUploaded           = result.totalUploaded || 0;
        this.isSubmitted             = !!result.isSubmitted;
        this.overallStatus           = result.overallStatus;
        this.complianceStatus        = result.complianceStatus;
        this.complianceReviewerNotes = result.reviewerNotes;

        // Lock state must be known before rows are decorated.
        this.lockReason = result.lockReason || this.deriveLockReason(rawItems);
        this.isFrozen   = FREEZE_STATUSES.has(this.lockReason);

        this.checklistItems = rawItems.map(raw =>
            this.decorateItem(raw, prevByType.get(raw.documentType))
        );

        const liveTypes = new Set(this.checklistItems.map(i => i.documentType));
        Object.keys(this.expiryDateByType).forEach(type => {
            if (!liveTypes.has(type)) delete this.expiryDateByType[type];
        });
    }

    /** Fallback when an older Apex version doesn't send lockReason. */
    deriveLockReason(rawItems) {
        const statuses = rawItems.map(i => normalizeStatus(i.status));
        if (statuses.includes('Rejected'))  return 'Rejected';
        if (statuses.includes('Suspended')) return 'Suspended';
        const required = rawItems.filter(i => i.required);
        const counted  = required.length ? required : rawItems;
        if (counted.length && counted.every(i => normalizeStatus(i.status) === 'Validated')) {
            return 'Validated';
        }
        return undefined;
    }

    buildSignature(result) {
        try {
            return JSON.stringify(result);
        } catch (e) {
            return String(Date.now());
        }
    }

    announceReviewerChanges(previousItems, currentItems, previousLock) {
        // A final decision outranks row-level news.
        if (this.lockReason !== previousLock && this.lockReason) {
            const banner = this.decisionBanner;
            if (banner) {
                const variant = this.lockReason === 'Validated' ? 'success' : 'warning';
                this.showToast(banner.title, banner.message, variant);
                return;
            }
        }

        const labelOf    = i => i.documentLabel || i.documentType;
        const prevTypes  = new Set(previousItems.map(i => i.documentType));
        const currTypes  = new Set(currentItems.map(i => i.documentType));
        const prevStatus = new Map(previousItems.map(i => [i.documentType, i.status]));
        const changed    = i => prevTypes.has(i.documentType) && prevStatus.get(i.documentType) !== i.status;

        const added     = currentItems.filter(i => !prevTypes.has(i.documentType)).map(labelOf);
        const removed   = previousItems.filter(i => !currTypes.has(i.documentType)).map(labelOf);
        const validated = currentItems.filter(i => changed(i) && i.status === 'Validated').map(labelOf);
        const actionOn  = currentItems
            .filter(i => changed(i) && (REUPLOAD_STATUSES.has(i.status) || i.status === 'Pending Submission'))
            .map(labelOf);

        const parts = [];
        if (added.length)     parts.push(`New document requested: ${added.join(', ')}.`);
        if (removed.length)   parts.push(`No longer required: ${removed.join(', ')}.`);
        if (actionOn.length)  parts.push(`Action needed on: ${actionOn.join(', ')}.`);
        if (validated.length) parts.push(`Validated: ${validated.join(', ')}.`);

        if (parts.length) {
            this.showToast('Checklist updated by the compliance team', parts.join(' '), 'info');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Decoration
    // ─────────────────────────────────────────────────────────────

    get sitePrefix() {
        const pathParts = window.location.pathname.split('/s/');
        return pathParts.length > 1 ? pathParts[0] : '';
    }

    decorateItem(raw, prev) {
        const status  = normalizeStatus(raw.status) || 'Not Started';
        const config  = STATUS_CONFIG[status] || STATUS_CONFIG['Not Started'];
        const hasFile = !!raw.contentDocumentId;

        // Apex decides (and enforces) editability; the same matrix is the
        // fallback if an older controller doesn't send the flags.
        const serverEditable  = typeof raw.isEditable === 'boolean' ? raw.isEditable : EDITABLE_STATUSES.has(status);
        const serverDeletable = typeof raw.canDelete  === 'boolean' ? raw.canDelete  : DELETABLE_STATUSES.has(status);
        const isEditable      = !this.isFrozen && serverEditable;
        const canDelete       = isEditable && hasFile && serverDeletable;

        const needsReupload = REUPLOAD_STATUSES.has(status);
        // Upload control shown straight away when nothing is on file yet,
        // or the reviewer returned / expired the file.
        const directUpload  = isEditable && (!hasFile || needsReupload);
        // A saved draft is changed through Replace / Delete.
        const replaceable   = isEditable && hasFile && !needsReupload;

        // Keep "Replace" mode open across a live refresh only if nothing
        // changed underneath the donee.
        const keepReplacing = !!(replaceable && prev && prev.isReplacing
            && prev.status === status
            && prev.contentDocumentId === raw.contentDocumentId);

        const isExpiringSoon = this.computeExpiryWarning(raw.expiryDate, status);

        return {
            ...raw,
            status,
            badgeClass  : config.badgeClass,
            statusLabel : config.label,
            hasFile,
            isEditable,
            isLocked    : !isEditable,
            canDelete,
            canUpload   : directUpload || keepReplacing,
            showReplace : replaceable && !keepReplacing,
            showDelete  : canDelete && !keepReplacing,
            isReplacing : keepReplacing,
            isDraft     : status === 'Draft',
            isUploaded  : hasFile && !needsReupload,
            isValidated : status === 'Validated',
            needsDoneeAction : isEditable,
            isNewlyRequested : NEWLY_REQUESTED_STATUSES.has(status) && !hasFile,
            uploadRecordId   : raw.recordId || (prev && prev.uploadRecordId) || null,
            isPreparing      : false,
            expiryDateInput  : this.expiryDateByType[raw.documentType] || null,
            downloadUrl      : hasFile ? `${this.sitePrefix}/sfc/servlet.shepherd/document/download/${raw.contentDocumentId}` : null,
            isReturned        : status === 'Returned',
            isRefreshRequired : status === 'Refresh Required',
            isRejected        : status === 'Rejected',
            isSuspended       : status === 'Suspended',
                        reasonText        : raw.returnReason || DEFAULT_REASONS[status] || '',
            description       : raw.dueDate
                ? `${raw.description} — due ${this.formatDate(raw.dueDate)}.`
                : (raw.description && !raw.description.endsWith('.') ? `${raw.description}.` : raw.description),
            lockedHint        : this.lockedHintFor(status, isEditable),
            isExpiringSoon,
            expiryHint        : isEditable
                ? 'Consider uploading a renewed copy soon.'
                : 'The compliance team will ask you for a renewed copy if one is needed.',
            expiryDateFormatted    : this.formatDate(raw.expiryDate),
            submittedDateFormatted : this.formatDate(raw.submittedDate),
            isUploadingThis        : this.uploadingDocType === raw.documentType
        };
    }

    lockedHintFor(status, isEditable) {
        if (isEditable) return null;
        if (this.isFrozen && !FREEZE_STATUSES.has(status)) return FROZEN_ROW_HINTS[this.lockReason] || null;
        if (this.lockReason === 'Validated') return null; // the card-level banner says it once
        return LOCKED_HINTS[status] || null;
    }

    computeExpiryWarning(expiryDate, status) {
        if (!expiryDate || status === 'Refresh Required' || FREEZE_STATUSES.has(status)) return false;
        const diffDays = Math.ceil(
            (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays >= 0 && diffDays <= EXPIRY_WARNING_DAYS;
    }

        formatDate(dateVal) {
        if (!dateVal) return '';
        // Plain yyyy-mm-dd values are parsed as local dates so the day never shifts with timezone.
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateVal));
        const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateVal);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString(undefined,
            { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ─────────────────────────────────────────────────────────────
    // Progress counts
    // ─────────────────────────────────────────────────────────────

    get countedItems() {
        const items    = this.checklistItems || [];
        const required = items.filter(i => i.required);
        return required.length ? required : items;
    }

    get requiredCount() {
        return this.countedItems.length || this.totalRequired || 0;
    }

    get uploadedCount() {
        return this.countedItems.length
            ? this.countedItems.filter(i => i.isUploaded).length
            : this.totalUploaded;
    }

    get validatedCount() {
        return this.countedItems.length
            ? this.countedItems.filter(i => i.isValidated).length
            : this.totalValidated;
    }

    toPercent(n) {
        const total = this.requiredCount;
        return total > 0 ? Math.min(Math.round((n / total) * 100), 100) : 0;
    }

    get overallProgressPercent() {
        return this.toPercent(this.validatedCount);
    }

    get uploadedProgressPercent() {
        return this.toPercent(this.uploadedCount);
    }

    get validatedProgressStyle() {
        return `width: ${this.overallProgressPercent}%;`;
    }

    get uploadedProgressStyle() {
        const pending = Math.max(this.uploadedProgressPercent - this.overallProgressPercent, 0);
        return `width: ${pending}%;`;
    }

    get progressSummaryLabel() {
        return `${this.uploadedCount} of ${this.requiredCount} required documents uploaded · ${this.validatedCount} validated`;
    }

    // ─────────────────────────────────────────────────────────────
    // Submission / lock state
    // ─────────────────────────────────────────────────────────────

    /** Any editable row (Draft, requested, returned, refresh) or open Replace. */
    get hasPendingDoneeAction() {
        return !this.isFrozen
            && (this.checklistItems || []).some(i => i.needsDoneeAction || i.isReplacing);
    }

    get hasNewlyRequestedDocs() {
        return (this.checklistItems || []).some(i => i.isNewlyRequested);
    }

    get isEffectivelySubmitted() {
        return this.isSubmitted && !this.hasPendingDoneeAction;
    }

    /** Card-level banner for a final (or on-hold) reviewer decision. */
    get decisionBanner() {
        switch (this.lockReason) {
            case 'Rejected':
                return {
                    cssClass: 'comp-decision-banner comp-decision-banner--rejected',
                    icon    : 'utility:ban',
                    title   : 'Compliance submission rejected',
                    message : 'The compliance team has rejected this submission. Your documents are locked and can no longer be changed.',
                    notes   : this.complianceReviewerNotes || null
                };
            case 'Suspended':
                return {
                    cssClass: 'comp-decision-banner comp-decision-banner--suspended',
                    icon    : 'utility:pause',
                    title   : 'Compliance review suspended',
                    message : 'Your submission is on hold pending further review. Documents are locked until the compliance team lifts the suspension.',
                    notes   : this.complianceReviewerNotes || null
                };
            case 'Validated':
                return {
                    cssClass: 'comp-decision-banner comp-decision-banner--validated',
                    icon    : 'utility:success',
                    title   : 'Compliance complete',
                    message : 'All compliance documents have been validated. No further action is needed.',
                    notes   : null
                };
            default:
                return null;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Getters
    // ─────────────────────────────────────────────────────────────

    get effectiveOverallStatus() {
        if (this.isFrozen) return this.lockReason;
        if (this.lockReason === 'Validated') return 'Validated';
        if (this.complianceStatus && !this.hasPendingDoneeAction) {
            return this.complianceStatus;
        }
        const items = this.checklistItems || [];
        if (items.some(i => i.status === 'Returned'))         return 'Returned';
        if (items.some(i => i.status === 'Refresh Required')) return 'Refresh Required';
        if (this.isSubmitted && this.hasNewlyRequestedDocs)   return 'Pending Submission';
        return this.complianceStatus || this.overallStatus;
    }

    get overallStatusBadgeClass() {
        return OVERALL_STATUS_BADGE_CLASS[this.effectiveOverallStatus]
            || OVERALL_STATUS_BADGE_CLASS['In Progress'];
    }

    get overallStatusDisplay() {
        const status = this.effectiveOverallStatus;
        if (status === 'Rejected')           return 'REJECTED';
        if (status === 'Suspended')          return 'SUSPENDED';
        if (status === 'Returned')           return 'ACTION NEEDED';
        if (status === 'Pending Submission') return 'DOCUMENTS REQUESTED';
        if (status === 'Validated')          return 'COMPLETE';
        if (status === 'Complete')           return 'COMPLETE';
        if (status === 'Draft')              return 'DRAFT';
        if (status === 'Submitted')          return 'SUBMITTED';
        if (status === 'Pending Review')     return 'PENDING REVIEW';
        return status ? status.toUpperCase() : 'IN PROGRESS';
    }

    get hasItems() {
        return this.checklistItems && this.checklistItems.length > 0;
    }

    get allDocumentsUploaded() {
        return this.requiredCount > 0 && this.uploadedCount >= this.requiredCount;
    }

    get isSubmitDisabled() {
        return this.isFrozen
            || !this.allDocumentsUploaded
            || !this.hasPendingDoneeAction
            || this.isSubmitting
            || this.isLoading
            || this.isEffectivelySubmitted;
    }

    get showActionFooter() {
        if (!this.hasItems || this.isFrozen || this.lockReason === 'Validated') return false;
        return this.hasPendingDoneeAction || !this.isSubmitted;
    }

    get uploadProgressText() {
        return `${this.uploadedCount} of ${this.requiredCount} documents uploaded`;
    }

    // ─────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────

    findItem(docType) {
        return (this.checklistItems || []).find(i => i.documentType === docType);
    }

    handleExpiryDateChange(event) {
        const docType = event.target.dataset.doctype;
        this.expiryDateByType[docType] = event.target.value;
    }

    handlePrepareUpload(event) {
        const docType = event.target.dataset.doctype;
        const item    = this.findItem(docType);
        if (!item || !item.isEditable) return;

        this.checklistItems = this.checklistItems.map(i =>
            i.documentType === docType ? { ...i, isPreparing: true } : i
        );

        getOrCreateComplianceRecord({
            applicationId: this.recordId,
            documentType : docType
        })
            .then(complianceDocId => {
                this.checklistItems = this.checklistItems.map(i =>
                    i.documentType === docType
                        ? { ...i, uploadRecordId: complianceDocId, isPreparing: false }
                        : i
                );
            })
            .catch(error => {
                this.checklistItems = this.checklistItems.map(i =>
                    i.documentType === docType ? { ...i, isPreparing: false } : i
                );
                this.showToast('Could not prepare upload', this.extractErrorMessage(error), 'error');
                this._lastSignature = undefined;
                this.loadChecklist({ silent: true });
            });
    }

    handleUploadFinished(event) {
        const docType    = event.target.dataset.doctype;
        const recordHint = event.target.dataset.recordId;
        const files      = event.detail.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // The uploader's "Upload Files" dialog is still open at this point.
        // Remember it so the row is not re-rendered until it has closed.
        const uploadDialog = this.findOpenUploadDialog();

        this.uploadingDocType = docType;

        this.checklistItems = this.checklistItems.map(i =>
            i.documentType === docType
                ? { ...i, isUploadingThis: true, isUploaded: true, isReplacing: false }
                : i
        );
        this.notifyParent();

        const item    = this.findItem(docType);
        const isAdHoc = !!(item && item.adHocParentId);

        const savePromise = isAdHoc
            ? saveAdHocComplianceDocument({
                  adHocRecordId    : item.adHocParentId,
                  documentLabel    : docType,
                  contentDocumentId: file.documentId,
                  fileName         : file.name,
                  issueDate        : null,
                  expiryDate       : this.expiryDateByType[docType] || null
              })
            : saveComplianceDocument({
                  applicationId    : this.recordId,
                  documentType     : docType,
                  contentDocumentId: file.documentId,
                  fileName         : file.name,
                  issueDate        : null,
                  expiryDate       : this.expiryDateByType[docType] || null,
                  existingRecordId : recordHint || null
              });

        savePromise
            .then(() => {
                delete this.expiryDateByType[docType];
                this.showToast(
                    'Document Saved as Draft',
                    `${file.name} was saved as draft. Click 'Submit Compliance Documents' when all required documents are ready.`,
                    'success'
                );
            })
            .catch(error => {
                // The save was refused (e.g. the reviewer locked this row while
                // the page was open) — remove the file the uploader already stored.
                discardUploadedFile({ applicationId: this.recordId, contentDocumentId: file.documentId })
                    .catch(() => { /* best effort */ });
                this.showToast('Upload not saved', this.extractErrorMessage(error), 'error');
            })
            .finally(() => {
                this.uploadingDocType = undefined;
                this.checklistItems = this.checklistItems.map(i =>
                    i.documentType === docType ? { ...i, isUploadingThis: false } : i
                );
                // Refresh only once the uploader's dialog is gone, so the
                // lightning-file-upload that owns it is still mounted while it
                // closes and Salesforce can tear the modal down properly.
                return this.afterUploadDialogCloses(uploadDialog).then(() => {
                    this._lastSignature = undefined;
                    return this.loadChecklist({ silent: true });
                });
            });
    }

    handleSaveDraft() {
        this.showToast(
            'Draft Saved',
            'Your uploaded compliance documents are saved as drafts. You can return anytime to continue or submit.',
            'success'
        );
    }

    handleSubmit() {
        if (this.isSubmitting || this.isSubmitDisabled) return;

        if (!this.allDocumentsUploaded) {
            this.showToast(
                'Incomplete Submission',
                `Please upload all ${this.requiredCount} required documents before submitting.`,
                'warning'
            );
            return;
        }

        this.isSubmitting = true;
        submitComplianceDocuments({ applicationId: this.recordId })
            .then(() => {
                this.showToast(
                    'Documents Submitted',
                    'Your compliance documents have been submitted for review.',
                    'success'
                );
            })
            .catch(error => {
                this.showToast('Submission Failed', this.extractErrorMessage(error), 'error');
            })
            .finally(() => {
                this.isSubmitting = false;
                this._lastSignature = undefined;
                return this.loadChecklist({ silent: true });
            });
    }

    handleReplaceClick(event) {
        const docType = event.target.dataset.doctype;
        const item    = this.findItem(docType);
        if (!item || !item.showReplace) return;

        this.checklistItems = this.checklistItems.map(i =>
            i.documentType === docType
                ? { ...i, canUpload: true, showReplace: false, showDelete: false, isReplacing: true }
                : i
        );
    }

    handleCancelReplace(event) {
        const docType = event.target.dataset.doctype;
        this.checklistItems = this.checklistItems.map(i =>
            i.documentType === docType
                ? { ...i, canUpload: false, showReplace: true, showDelete: i.canDelete, isReplacing: false }
                : i
        );
    }

    handleDeleteClick(event) {
        const docType = event.target.dataset.doctype;
        const recId   = event.target.dataset.recordId;
        const item    = this.findItem(docType);
        if (!item || !item.showDelete) return;

        // eslint-disable-next-line no-alert
        if (!confirm('Delete this document? You will need to upload it again.')) return;

        const deletePromise = item.adHocParentId
            ? deleteAdHocComplianceDocumentFile({
                  adHocRecordId : item.adHocParentId,
                  documentLabel : docType
              })
            : deleteComplianceDocumentFile({ recordId: recId });

        deletePromise
            .then(() => {
                this.showToast('Document removed', 'The file was deleted. You can upload a new one.', 'success');
            })
            .catch(error => {
                this.showToast('Could not delete document', this.extractErrorMessage(error), 'error');
            })
            .finally(() => {
                this._lastSignature = undefined;
                return this.loadChecklist({ silent: true });
            });
    }

    // ─────────────────────────────────────────────────────────────
    // Upload dialog hand-off
    //
    // Previously the dialog was force-hidden (classes stripped +
    // display:none) and the row re-rendered straight away. That left the
    // platform believing a modal was still open — its backdrop / focus trap
    // / aria-hidden on the page were never released — so the component (and
    // page) became unclickable after every upload. Now we wait for the
    // dialog to close, and if it ever has to be closed for the user we use
    // its own close button so the normal teardown runs.
    // ─────────────────────────────────────────────────────────────

    findOpenUploadDialog() {
        try {
            return document.querySelector(UPLOAD_DIALOG_SELECTOR);
        } catch (e) {
            return null;
        }
    }

    isDialogStillOpen(dialog) {
        try {
            if (!dialog || dialog.isConnected === false) return false;
            return dialog.classList.contains('open') && dialog.style.display !== 'none';
        } catch (e) {
            return false;
        }
    }

    /** Resolves once the given upload dialog has closed (immediately if none). */
    afterUploadDialogCloses(dialog) {
        if (!this.isDialogStillOpen(dialog)) {
            return Promise.resolve();
        }

        this.stopDialogWait();
        this._awaitingDialogClose = true;
        const startedAt = Date.now();

        return new Promise(resolve => {
            const check = () => {
                if (!this.isDialogStillOpen(dialog)) {
                    this._awaitingDialogClose = false;
                    resolve();
                    return;
                }
                if (Date.now() - startedAt >= DIALOG_MAX_WAIT_MS) {
                    this.closeUploadDialog(dialog);
                    this._awaitingDialogClose = false;
                    resolve();
                    return;
                }
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                this._dialogWaitTimer = setTimeout(check, DIALOG_POLL_MS);
            };
            check();
        });
    }

    stopDialogWait() {
        if (this._dialogWaitTimer) {
            clearTimeout(this._dialogWaitTimer);
            this._dialogWaitTimer = undefined;
        }
        this._awaitingDialogClose = false;
    }

    /** Last resort: close the dialog via its own button so the platform tears it down. */
    closeUploadDialog(dialog) {
        try {
            const closeBtn = dialog && dialog.querySelector(
                'button.slds-modal__close, button[title="Close"], .modal-footer button, .slds-modal__footer button'
            );
            if (closeBtn) closeBtn.click();
        } catch (e) {
            /* best effort */
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    notifyParent() {
        this.dispatchEvent(new CustomEvent('uploadcomplete', {
            detail: {
                uploaded : this.uploadedCount,
                validated: this.validatedCount,
                total    : this.requiredCount,
                status   : this.effectiveOverallStatus,
                locked   : !!this.lockReason,
                lockReason: this.lockReason || null
            }
        }));
    }

    extractErrorMessage(error) {
        if (error?.body?.output?.errors?.[0]?.message) {
            return error.body.output.errors[0].message;
        }
        if (error?.body?.message) return error.body.message;
        if (error?.message)       return error.message;
        return 'Something went wrong. Please try again.';
    }

    // Same signature as before, so every existing showToast(...) call is
    // unchanged — it now shows the branded in-page banner instead of the
    // platform toast.
    showToast(title, message, variant) {
        const allowed = ['error', 'warning', 'success', 'info'];
        const bannerVariant = allowed.includes(variant) ? variant : 'info';
        const duration = bannerVariant === 'error' ? 8000 : 6000;
        this.showBanner(bannerVariant, title, message, duration);
    }

    showBanner(variant, title, message, duration = 6000) {
        if (this._bannerTimeout) {
            clearTimeout(this._bannerTimeout);
        }
        this.bannerVariant = variant;
        this.bannerTitle   = title || '';
        this.bannerMessage = message || '';
        this.bannerVisible = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._bannerTimeout = setTimeout(() => {
            this.bannerVisible = false;
            this._bannerTimeout = undefined;
        }, duration);
    }

    closeBanner() {
        if (this._bannerTimeout) {
            clearTimeout(this._bannerTimeout);
            this._bannerTimeout = undefined;
        }
        this.bannerVisible = false;
    }

    get isBannerError()   { return this.bannerVariant === 'error'; }
    get isBannerWarning() { return this.bannerVariant === 'warning'; }
    get isBannerSuccess() { return this.bannerVariant === 'success'; }
    get isBannerInfo()    { return this.bannerVariant === 'info'; }

    get bannerClass() {
        return `wg-toast-banner ${this.bannerVariant}-banner`;
    }

    get bannerRole() {
        return this.bannerVariant === 'error' ? 'alert' : 'status';
    }

    /** "Document removed" → "Document removed." (matches the banner spec). */
    get bannerTitleDisplay() {
        const t = (this.bannerTitle || '').trim();
        if (!t) return '';
        return /[.!?]$/.test(t) ? t : `${t}.`;
    }
}