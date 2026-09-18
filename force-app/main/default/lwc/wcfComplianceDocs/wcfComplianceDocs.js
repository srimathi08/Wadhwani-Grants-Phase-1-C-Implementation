import { LightningElement, api, track } from 'lwc';
// WG TOAST BANNER — ShowToastEvent renders outside the shadow tree and can't
// be restyled to match the brand, so it's replaced with a custom banner (see
// showBanner()/closeBanner()/showToast() below). The import is no longer used.
import getComplianceChecklist from '@salesforce/apex/WCFComplianceController.getComplianceChecklist';
import saveComplianceDocument from '@salesforce/apex/WCFComplianceController.saveComplianceDocument';
import getOrCreateComplianceRecord from '@salesforce/apex/WCFComplianceController.getOrCreateComplianceRecord';
import deleteComplianceDocumentFile from '@salesforce/apex/WCFComplianceController.deleteComplianceDocumentFile';
import saveAdHocComplianceDocument from '@salesforce/apex/WCFComplianceController.saveAdHocComplianceDocument';
import deleteAdHocComplianceDocumentFile from '@salesforce/apex/WCFComplianceController.deleteAdHocComplianceDocumentFile';
import submitComplianceDocuments from '@salesforce/apex/WCFComplianceController.submitComplianceDocuments';

// ─────────────────────────────────────────────────────────────────────────
// BRD B.4 — Compliance upload is triggered when Grant Committee approves
// (IndividualApplication.Status = 'Recommend for Fund', normalised to
// 'Approved' on the dashboard). The donee uploads geography-specific docs;
// the Compliance Reviewer accepts / returns / flags each one.
//
// ROOT CAUSE FIX (why upload wasn't showing):
//   lightning-file-upload requires record-id to be a record the community
//   user can actually access. Passing the IndividualApplication Id fails
//   silently — the upload button never renders because the platform cannot
//   verify the record for the community user's session.
//
//   Fix: record-id now points to WCF_Compliance_Document__c (item.uploadRecordId).
//   For "Not Started" rows (no record yet), handlePrepareUpload calls
//   getOrCreateComplianceRecord to create the shell record first, then
//   sets item.uploadRecordId so the file-upload component can render.
// ─────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    'Not Started':        { badgeClass: 'comp-badge comp-badge--pending',    label: 'NOT STARTED',        canUpload: true,  showReplace: false },
    'Draft':              { badgeClass: 'comp-badge comp-badge--draft',      label: 'DRAFT SAVED',        canUpload: true,  showReplace: true  },
    'Pending Review':     { badgeClass: 'comp-badge comp-badge--inprogress', label: 'PENDING REVIEW',     canUpload: false, showReplace: true  },
    'Validated':          { badgeClass: 'comp-badge comp-badge--active',     label: 'VALIDATED',          canUpload: false, showReplace: true  },
    'Returned':           { badgeClass: 'comp-badge comp-badge--returned',   label: 'ACTION NEEDED',      canUpload: true,  showReplace: false },
    'Flagged':            { badgeClass: 'comp-badge comp-badge--flagged',    label: 'UNDER REVIEW',       canUpload: false, showReplace: true  },
    'Refresh Required':   { badgeClass: 'comp-badge comp-badge--expired',    label: 'REFRESH REQUIRED',   canUpload: true,  showReplace: false },
    'Pending Submission': { badgeClass: 'comp-badge comp-badge--returned',   label: 'DOCUMENT REQUESTED', canUpload: true,  showReplace: false },
    'Rejected':           { badgeClass: 'comp-badge comp-badge--rejected',   label: 'REJECTED',           canUpload: false, showReplace: false },
    'Suspended':          { badgeClass: 'comp-badge comp-badge--suspended',  label: 'SUSPENDED',          canUpload: false, showReplace: false }
};

const OVERALL_STATUS_BADGE_CLASS = {
    'Complete'          : 'comp-overall-badge comp-overall-badge--complete',
    'Submitted'         : 'comp-overall-badge comp-overall-badge--inprogress',
    'Draft'             : 'comp-overall-badge comp-overall-badge--draft',
    'Refresh Required'  : 'comp-overall-badge comp-overall-badge--refresh',
    'In Progress'       : 'comp-overall-badge comp-overall-badge--inprogress',
    'Pending Submission': 'comp-overall-badge comp-overall-badge--pending',
    'Validated'         : 'comp-overall-badge comp-overall-badge--complete',
    'Rejected'          : 'comp-overall-badge comp-overall-badge--rejected',
    'Suspended'         : 'comp-overall-badge comp-overall-badge--suspended',
    'Returned'          : 'comp-overall-badge comp-overall-badge--returned'
};

const EXPIRY_WARNING_DAYS = 30;

export default class WcfComplianceDocs extends LightningElement {

    // Passed in from wcfApplicantDashboard — the IndividualApplication Id.
    // Used ONLY for Apex calls (getComplianceChecklist, saveComplianceDocument, submitComplianceDocuments).
    // Never passed directly to lightning-file-upload.
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

    // WG TOAST BANNER state (replaces ShowToastEvent — see showToast() below)
    @track bannerVisible = false;
    @track bannerVariant = 'info';
    @track bannerTitle   = '';
    @track bannerMessage = '';
    _bannerTimeout;

    expiryDateByType = {};

    // ─────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────

    connectedCallback() {
        this.loadChecklist();
    }

    renderedCallback() {
        const fill = this.template.querySelector('.comp-overall-progress-fill');
        if (fill) {
            fill.style.width = `${this.overallProgressPercent}%`;
        }
    }

    loadChecklist() {
        if (!this.recordId) {
            console.warn('wcfComplianceDocs: recordId not set, skipping loadChecklist');
            this.isLoading = false;
            return Promise.resolve();
        }
        this.isLoading  = true;
        this.loadError  = undefined;

        return getComplianceChecklist({ applicationId: this.recordId })
            .then(result => {
                this.geography               = result.geography;
                this.totalRequired           = result.totalRequired;
                this.totalValidated          = result.totalValidated;
                this.totalUploaded           = result.totalUploaded || 0;
                this.isSubmitted             = !!result.isSubmitted;
                this.overallStatus           = result.overallStatus;
                this.complianceStatus        = result.complianceStatus;
                this.complianceReviewerNotes = result.reviewerNotes;
                this.checklistItems          = (result.items || []).map(item => this.decorateItem(item));
                this.notifyParent();
            })
            .catch(error => {
                this.loadError = this.extractErrorMessage(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // ─────────────────────────────────────────────────────────────
    // Decoration
    // ─────────────────────────────────────────────────────────────

    get sitePrefix() {
        const pathParts = window.location.pathname.split('/s/');
        return pathParts.length > 1 ? pathParts[0] : '';
    }

    decorateItem(raw) {
        const config  = STATUS_CONFIG[raw.status] || STATUS_CONFIG['Not Started'];
        const hasFile = !!raw.contentDocumentId;
        const isDraft = raw.status === 'Draft';

        return {
            ...raw,
            badgeClass  : config.badgeClass,
            statusLabel : config.label,
            canUpload   : config.canUpload,
            showReplace : (config.showReplace || isDraft) && hasFile,
            hasFile,
            isDraft,
            // uploadRecordId — the WCF_Compliance_Document__c Id used as
            // record-id on lightning-file-upload. If the record already exists
            // (raw.recordId is set by Apex), use it immediately.
            // If not (status = 'Not Started' with no existing record), it will
            // be populated by handlePrepareUpload after getOrCreateComplianceRecord.
            uploadRecordId      : raw.recordId || null,
            isPreparing         : false,
            downloadUrl         : hasFile ? `${this.sitePrefix}/sfc/servlet.shepherd/document/download/${raw.contentDocumentId}` : null,
            isReturned          : raw.status === 'Returned',
            isRefreshRequired   : raw.status === 'Refresh Required',
            isRejected          : raw.status === 'Rejected',
            isSuspended         : raw.status === 'Suspended',
            isExpiringSoon      : this.computeExpiryWarning(raw.expiryDate, raw.status),
            expiryDateFormatted : this.formatDate(raw.expiryDate),
            submittedDateFormatted: this.formatDate(raw.submittedDate),
            isUploadingThis     : this.uploadingDocType === raw.documentType
        };
    }

    computeExpiryWarning(expiryDate, status) {
        if (!expiryDate || status === 'Refresh Required') return false;
        const diffDays = Math.ceil(
            (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays >= 0 && diffDays <= EXPIRY_WARNING_DAYS;
    }

    formatDate(dateVal) {
        if (!dateVal) return '';
        return new Date(dateVal).toLocaleDateString(undefined,
            { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ─────────────────────────────────────────────────────────────
    // Getters
    // ─────────────────────────────────────────────────────────────

    get overallProgressPercent() {
        return this.totalRequired > 0
            ? Math.min(Math.round((this.totalValidated / this.totalRequired) * 100), 100)
            : 0;
    }

    get overallProgressStyle() {
        return `width: ${this.overallProgressPercent}%;`;
    }

    get overallStatusBadgeClass() {
        let status = this.complianceStatus || this.overallStatus;
        if (!this.complianceStatus && this.checklistItems && this.checklistItems.length > 0) {
            if (this.checklistItems.some(item => item.status === 'Rejected')) {
                status = 'Rejected';
            } else if (this.checklistItems.some(item => item.status === 'Suspended')) {
                status = 'Suspended';
            } else if (this.checklistItems.some(item => item.status === 'Returned')) {
                status = 'Returned';
            }
        }
        return OVERALL_STATUS_BADGE_CLASS[status]
            || OVERALL_STATUS_BADGE_CLASS['In Progress'];
    }

    get overallStatusDisplay() {
        if (this.complianceStatus === 'Rejected') return 'REJECTED';
        if (this.complianceStatus === 'Suspended') return 'SUSPENDED';
        if (this.complianceStatus === 'Returned') return 'ACTION NEEDED';
        if (this.complianceStatus === 'Validated') return 'COMPLETE';

        if (this.checklistItems && this.checklistItems.length > 0) {
            if (this.checklistItems.some(item => item.status === 'Rejected')) return 'REJECTED';
            if (this.checklistItems.some(item => item.status === 'Suspended')) return 'SUSPENDED';
            if (this.checklistItems.some(item => item.status === 'Returned')) return 'ACTION NEEDED';
        }

        if (this.overallStatus === 'Draft') return 'DRAFT';
        if (this.overallStatus === 'Submitted') return 'SUBMITTED';
        if (this.overallStatus === 'Complete') return 'COMPLETE';
        return this.overallStatus ? this.overallStatus.toUpperCase() : 'IN PROGRESS';
    }

    get progressSummaryLabel() {
        return `${this.totalValidated} of ${this.totalRequired} required documents validated`;
    }

    get hasItems() {
        return this.checklistItems && this.checklistItems.length > 0;
    }

    get allDocumentsUploaded() {
        return this.totalRequired > 0 && this.totalUploaded >= this.totalRequired;
    }

    get isSubmitDisabled() {
        return !this.allDocumentsUploaded || this.isSubmitting || this.isLoading || this.isSubmitted;
    }

    get showActionFooter() {
        return this.hasItems && !this.isSubmitted && this.complianceStatus !== 'Validated';
    }

    get uploadProgressText() {
        return `${this.totalUploaded} of ${this.totalRequired} documents uploaded`;
    }

    get showPassedBanner() {
        return this.complianceStatus === 'Validated';
    }

    get showRejectedBanner() {
        return this.complianceStatus === 'Rejected';
    }

    get showSuspendedBanner() {
        return this.complianceStatus === 'Suspended';
    }

    get showReturnedBanner() {
        return this.complianceStatus === 'Returned';
    }

    // ─────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────

    handleExpiryDateChange(event) {
        const docType = event.target.dataset.doctype;
        this.expiryDateByType[docType] = event.target.value;
    }

    handlePrepareUpload(event) {
        const docType = event.target.dataset.doctype;

        // Show spinner on the row
        this.checklistItems = this.checklistItems.map(i =>
            i.documentType === docType ? { ...i, isPreparing: true } : i
        );

        getOrCreateComplianceRecord({
            applicationId: this.recordId,
            documentType : docType
        })
            .then(complianceDocId => {
                // Set the real record Id — lightning-file-upload will now render
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
            });
    }

    handleUploadFinished(event) {
        const docType    = event.target.dataset.doctype;
        const recordHint = event.target.dataset.recordId;
        const files      = event.detail.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        this.uploadingDocType = docType;

        this.checklistItems = this.checklistItems.map(i =>
            i.documentType === docType ? { ...i, isUploadingThis: true } : i
        );

        // Route to correct Apex method based on whether this is an ad hoc row
        const item        = this.checklistItems.find(i => i.documentType === docType);
        const isAdHoc     = !!(item && item.adHocParentId);

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
                this.showToast(
                    'Document Saved as Draft',
                    `${file.name} was saved as draft. Click 'Submit Compliance Documents' when all required documents are ready.`,
                    'success'
                );
                return this.loadChecklist();
            })
            .catch(error => {
                console.error('Upload error full:', JSON.stringify(error));
                console.error('Upload error body:', error?.body?.message);
                console.error('Upload error body output:', JSON.stringify(error?.body?.output));
                this.showToast('Upload failed', this.extractErrorMessage(error), 'error');
                return this.loadChecklist();
            })
            .finally(() => {
                this.uploadingDocType = undefined;
                this.checklistItems = this.checklistItems.map(i =>
                    i.documentType === docType ? { ...i, isUploadingThis: false } : i
                );
                this.cleanupStaleModal();
            });
    }

    handleSaveDraft() {
        this.showToast(
            'Draft Saved',
            'Your uploaded compliance documents are saved as drafts. You can return anytime to continue or submit.',
            'info'
        );
    }

    handleSubmit() {
        if (!this.allDocumentsUploaded) {
            this.showToast(
                'Incomplete Submission',
                `Please upload all ${this.totalRequired} required documents before submitting.`,
                'warning'
            );
            return;
        }

        this.isSubmitting = true;
        submitComplianceDocuments({ applicationId: this.recordId })
            .then(() => {
                this.showToast(
                    'Documents Submitted',
                    'All compliance documents have been successfully submitted for review.',
                    'success'
                );
                return this.loadChecklist();
            })
            .catch(error => {
                this.showToast('Submission Failed', this.extractErrorMessage(error), 'error');
            })
            .finally(() => {
                this.isSubmitting = false;
            });
    }

    handleReplaceClick(event) {
        const docType = event.target.dataset.doctype;
        this.checklistItems = this.checklistItems.map(i =>
            i.documentType === docType
                ? { ...i, canUpload: true, showReplace: false }
                : i
        );
    }

handleDeleteClick(event) {
    const docType = event.target.dataset.doctype;
    const recId   = event.target.dataset.recordId;

    // eslint-disable-next-line no-alert
    if (!confirm('Delete this document? You will need to upload it again.')) return;

    const item    = this.checklistItems.find(i => i.documentType === docType);
    const isAdHoc = !!(item && item.adHocParentId);

    const deletePromise = isAdHoc
        ? deleteAdHocComplianceDocumentFile({
              adHocRecordId : item.adHocParentId,
              documentLabel : docType
          })
        : deleteComplianceDocumentFile({ recordId: recId });

    deletePromise
        .then(() => {
            this.showToast('Document removed', 'The file was deleted. You can upload a new one.', 'success');
            return this.loadChecklist();
        })
        .catch(error => {
            this.showToast('Could not delete document', this.extractErrorMessage(error), 'error');
        });
}
    // ── Defensive cleanup ─────────────────────────────────────────────
// lightning-file-upload's internal "Upload Files" modal can fail to
// fully tear down when the row hosting it gets unmounted (canUpload
// flips to false) mid-close-animation, leaving an orphaned backdrop
// that dims the page and traps focus via aria-hidden. This is a known
// Aura/LWC interop quirk on Experience sites, not specific to this
// component — force-close anything left stuck open as a safety net.
cleanupStaleModal() {
    // Handle both class variants seen in Experience Cloud
    const staleModals = document.querySelectorAll(
        'div.uiModal.open.active, div.DESKTOP.uiModal.open.active'
    );
    staleModals.forEach(modal => {
        modal.classList.remove('open', 'active');
        modal.setAttribute('aria-hidden', 'false');
        modal.style.display = 'none';
    });
}

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    notifyParent() {
        this.dispatchEvent(new CustomEvent('uploadcomplete', {
            detail: {
                uploaded: this.totalValidated,
                total   : this.totalRequired,
                status  : this.overallStatus
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

    // All existing call sites already funnel through this one wrapper (like
    // wcfProposalReviewForm's showToast precedent), so only its body needed
    // to change — no call site needed touching.
    showToast(title, message, variant) {
        this.showBanner({ title, message, variant });
    }

    // ─────────────────────────────────────────────────────────────
    // WG TOAST BANNER — replaces native ShowToastEvent (renders outside the
    // shadow tree and cannot be restyled to match the brand).
    // ─────────────────────────────────────────────────────────────

    showBanner(config) {
        const { title, message, variant, autoDismissMs = 6000 } = config || {};
        if (this._bannerTimeout) {
            clearTimeout(this._bannerTimeout);
            this._bannerTimeout = null;
        }
        this.bannerVariant = variant || 'info';
        this.bannerTitle   = title || '';
        this.bannerMessage = message || '';
        this.bannerVisible = true;
        if (autoDismissMs) {
            this._bannerTimeout = setTimeout(() => {
                this.bannerVisible = false;
            }, autoDismissMs);
        }
    }

    closeBanner() {
        if (this._bannerTimeout) {
            clearTimeout(this._bannerTimeout);
            this._bannerTimeout = null;
        }
        this.bannerVisible = false;
    }

    handleDismissBanner() {
        this.closeBanner();
    }

    get isBannerError()   { return this.bannerVariant === 'error'; }
    get isBannerWarning() { return this.bannerVariant === 'warning'; }
    get isBannerSuccess() { return this.bannerVariant === 'success'; }
    get isBannerInfo()    { return this.bannerVariant === 'info'; }

    get bannerClass() {
        return 'wg-toast-banner ' + this.bannerVariant + '-banner';
    }
}