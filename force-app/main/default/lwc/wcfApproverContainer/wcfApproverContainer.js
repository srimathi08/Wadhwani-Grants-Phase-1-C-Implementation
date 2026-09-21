import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveDecision   from '@salesforce/apex/WCFApproverListController.saveDecision';
import revokeDecision from '@salesforce/apex/WCFApproverListController.revokeDecision';
import getExistingDecision from '@salesforce/apex/WCFApproverListController.getExistingDecision';
import getReviewerCommentForApprover from '@salesforce/apex/WCFApproverListController.getReviewerCommentForApprover';
import getApproverRejectionReasonOptions from '@salesforce/apex/WCFApproverListController.getApproverRejectionReasonOptions';

export default class WcfApproverContainer extends NavigationMixin(LightningElement) {

    @track applicationId        = null;
    @track reviewId             = null;
    @track appName              = '';
    @track track                = '';
    @track trackLabel           = '';
    @track outcomeDeveloperName = 'JF';

    @track comment          = '';
    @track pendingDecision  = null;
    @track showModal        = false;
    @track isSubmitting     = false;
    @track existingDecision = null;

    // ── Revoke state ──
    @track isRevokable     = false;
    @track decisionDate    = null;
    @track showRevokeModal = false;
    @track isRevoking      = false;

    // ── Return state ──
    @track isReturned      = false;

    // ── Split-pane state ──
    @track leftCollapsed  = false;
    @track rightCollapsed = false;
    @track leftPaneWidth  = 50; // percent

    // ── Return conversation state ──
    @track isBackFromReviewer = false;
    @track priorReturnComment = '';
    @track priorReturnDate    = null;
    @track reviewerComment = '';
    @track rejectionReasonOptions = [];
    @track selectedReasons = [];
    @track priorRejectionReasons = '';

    // ── Return conversation strip: collapsed by default (display only) ──
    @track convoExpanded = false;

    constructor() {
        super();
        this._boundMouseMove = this.handleResizerMouseMove.bind(this);
        this._boundMouseUp   = this.handleResizerMouseUp.bind(this);
    }

    disconnectedCallback() {
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mouseup', this._boundMouseUp);
    }

    renderedCallback() {
        this._applyPaneWidth();
    }

    _applyPaneWidth() {
        const container = this.template.querySelector('.split-pane');
        if (!container) return;
        container.style.setProperty('--left-width', `${this.leftPaneWidth}%`);
        container.style.setProperty('--right-width', `${100 - this.leftPaneWidth}%`);
    }

    // ── Read page state ──────────────────────────────────────────
    @wire(CurrentPageReference)
    async setPageRef(pageRef) {
        if (!pageRef) return;
        this.applicationId = pageRef.state?.applicationId || null;
        this.reviewId      = pageRef.state?.reviewId      || null;
        this.appName       = pageRef.state?.appName       || '';
        this.track         = pageRef.state?.track         || 'JF';
        this.trackLabel    = pageRef.state?.trackLabel    || '';
        this.outcomeDeveloperName = this.track;

        if (this.applicationId) {
            await this._loadExistingDecision();
            await this._loadReviewerComment();
        }
    }

    async _loadReviewerComment() {
        try {
            const c = await getReviewerCommentForApprover({ applicationId: this.applicationId });
            this.reviewerComment = c || '';
        } catch (e) {
            console.error('Could not load reviewer comment', e);
        }
    }

    async _loadExistingDecision() {
        try {
            const dec = await getExistingDecision({ applicationId: this.applicationId });
            if (dec) {
                this.existingDecision   = dec.decision;
                this.decisionDate       = dec.decisionDate;
                this.isRevokable        = dec.isRevokable;
                this.isReturned         = !!dec.isReturned;
                this.comment            = dec.comment || '';
                this.isBackFromReviewer = !!dec.isBackFromReviewer;
                this.priorReturnComment = dec.priorReturnComment || '';
                this.priorReturnDate    = dec.priorReturnDate || null;
            } else {
                this.existingDecision   = null;
                this.decisionDate       = null;
                this.isRevokable        = false;
                this.isReturned         = false;
                this.isBackFromReviewer = false;
                this.priorReturnComment = '';
                this.priorReturnDate    = null;
            }
        } catch (e) {
            console.error('Could not load existing decision', e);
        }
        try {
            this.rejectionReasonOptions = await getApproverRejectionReasonOptions();
        } catch (e) {
            console.error('Could not load rejection reasons', e);
        }
    }

    // Track tags — same colors as every other portal screen
    get trackBadges() {
        if (!this.track) return [];
        const TAGS = {
            JF  : 'wg-tag wg-tag--info',
            JC  : 'wg-tag wg-tag--warning',
            LU  : 'wg-tag wg-tag--success',
            Both: 'wg-tag'
        };
        return this.track.split(',').map(t => {
            const code = t.trim();
            return { code, badgeClass: TAGS[code] || 'wg-tag' };
        });
    }

    get priorReturnDateFormatted() {
        if (!this.priorReturnDate) return '';
        return new Date(this.priorReturnDate).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    }
    get hasReviewerComment() {
        return !!this.reviewerComment;
    }
    get showConversationThread() {
        return this.isBackFromReviewer || this.hasReviewerComment;
    }
    // ── Compact return conversation ──────────────────────────────
    handleToggleConvo() {
        this.convoExpanded = !this.convoExpanded;
    }
    get isConvoExpanded()   { return this.convoExpanded; }
    get isConvoCollapsed()  { return !this.convoExpanded; }
    get convoExpandedAttr() { return this.convoExpanded ? 'true' : 'false'; }
    get convoClass()        { return this.convoExpanded ? 'ac-convo ac-convo--open' : 'ac-convo'; }
    get convoToggleLabel()  { return this.convoExpanded ? 'Hide' : 'Show'; }
    get convoToggleIcon()   { return this.convoExpanded ? 'utility:chevronup' : 'utility:chevrondown'; }

    get convoMessageCount() {
        const n = (this.isBackFromReviewer && this.priorReturnComment ? 1 : 0)
                + (this.hasReviewerComment ? 1 : 0);
        return n === 1 ? '1 message' : `${n} messages`;
    }

    /** Latest message for the one-line preview: the Reviewer's reply if present, else your note. */
    get convoPreviewAuthor() {
        return this.hasReviewerComment ? 'Reviewer' : 'You';
    }
    get convoPreviewText() {
        return this.hasReviewerComment ? this.reviewerComment : this.priorReturnComment;
    }

    get priorRejectionReasonItems() {
        if (!this.priorRejectionReasons) return [];
        return this.priorRejectionReasons.split(';').map((label, idx) => ({ key: idx, label }));
    }

    get rejectionReasonTiles() {
        return (this.rejectionReasonOptions || []).map(opt => {
            const isChecked = this.selectedReasons.includes(opt.value);
            return {
                value: opt.value,
                label: opt.label,
                isChecked,
                tileClass: isChecked ? 'reason-tile reason-tile--selected' : 'reason-tile'
            };
        });
    }

    handleReasonToggle(evt) {
        const value = evt.target.dataset.value;
        const checked = evt.target.checked;
        if (checked) {
            if (!this.selectedReasons.includes(value)) {
                this.selectedReasons = [...this.selectedReasons, value];
            }
        } else {
            this.selectedReasons = this.selectedReasons.filter(v => v !== value);
        }
    }

    // ── Pane collapse handlers (never both collapsed) ────────────
    handleToggleLeftPane() {
        if (this.leftCollapsed) {
            this.leftCollapsed = false;
            return;
        }
        if (this.rightCollapsed) return;
        this.leftCollapsed = true;
    }

    handleToggleRightPane() {
        if (this.rightCollapsed) {
            this.rightCollapsed = false;
            return;
        }
        if (this.leftCollapsed) return;
        this.rightCollapsed = true;
    }

    // ── Resizable divider handlers ──────────────────────────────
    handleResizerMouseDown(event) {
        event.preventDefault();
        this._isResizing     = true;
        this._resizerStartX  = event.clientX;
        this._startLeftWidth = this.leftPaneWidth;
        window.addEventListener('mousemove', this._boundMouseMove);
        window.addEventListener('mouseup', this._boundMouseUp);
    }

    handleResizerMouseMove(event) {
        if (!this._isResizing) return;
        const container = this.template.querySelector('.split-pane');
        if (!container) return;
        const containerWidth = container.getBoundingClientRect().width;
        const deltaPercent = ((event.clientX - this._resizerStartX) / containerWidth) * 100;
        let newWidth = this._startLeftWidth + deltaPercent;
        newWidth = Math.max(20, Math.min(80, newWidth));
        this.leftPaneWidth = newWidth;
        this._applyPaneWidth();
    }

    handleResizerMouseUp() {
        this._isResizing = false;
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mouseup', this._boundMouseUp);
    }

    // ── Decision handlers (unchanged) ────────────────────────────
    handleBack() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'ApproverListView__c' }
        });
    }

    handleCommentInput(evt) {
        this.comment = evt.target.value;
    }

    handleApprove() {
        this.pendingDecision = 'Accept';
    }

    handleConditionallyApprove() {
        this.pendingDecision = 'Conditionally Approve';
        this.showModal       = true;
    }

    handleReturn() {
        this.pendingDecision = 'Return';
    }

    // Shared by Accept and Reject
    handleCancelDecisionPanel() {
        this.pendingDecision = null;
        this.comment = '';
        this.selectedReasons = [];
    }

    handleReturnClick() {
        if (this.pendingDecision !== 'Return') {
            this.pendingDecision = 'Return';
            return;
        }
        this.showModal = true;
    }

    handleDecline() {
        this.pendingDecision = 'Decline';
        this.showModal       = true;
    }

    handleDecisionPanelContinue() {
        if (!this.comment?.trim()) {
            this.dispatchEvent(new ShowToastEvent({
                title:   'Comment Required',
                message: this.pendingDecision === 'Accept'
                    ? 'Please add a comment to support this decision.'
                    : 'Please add a comment explaining why this application is being returned.',
                variant: 'error'
            }));
            return;
        }
        if (this.pendingDecision === 'Return' && (!this.selectedReasons || this.selectedReasons.length === 0)) {
            this.dispatchEvent(new ShowToastEvent({
                title:   'Reason Required',
                message: 'Please select at least one rejection reason.',
                variant: 'error'
            }));
            return;
        }
        this.showModal = true;
    }

    handleModalCancel() {
        this.showModal = false;
    }

    async handleModalConfirm() {
        if ((this.pendingDecision === 'Accept' || this.pendingDecision === 'Conditionally Approve' || this.pendingDecision === 'Return')
            && !this.comment?.trim()) {
            this.dispatchEvent(new ShowToastEvent({
                title:   'Comment Required',
                message: 'A comment is required for this decision.',
                variant: 'error'
            }));
            return;
        }
        if (this.pendingDecision === 'Return' && (!this.selectedReasons || this.selectedReasons.length === 0)) {
            this.dispatchEvent(new ShowToastEvent({
                title:   'Reason Required',
                message: 'Please select at least one rejection reason.',
                variant: 'error'
            }));
            return;
        }

        this.isSubmitting = true;
        try {
            const newStatus = await saveDecision({
                applicationId: this.applicationId,
                reviewId:      this.reviewId,
                decision:      this.pendingDecision,
                comment:       this.comment,
                rejectionReasons: this.selectedReasons?.join(';') || null
            });

            this.existingDecision = this.pendingDecision;
            this.showModal        = false;
            this.pendingDecision  = null;

            await this._loadExistingDecision();

            let resultMessage;
            if (newStatus === 'Not Recommend for Fund') {
                resultMessage = 'not recommended for fund';
            } else if (newStatus === 'Returned by Approver') {
                resultMessage = 'returned to the Reviewer for further evaluation';
            } else {
                resultMessage = 'recommended for fund';
            }

            this.dispatchEvent(new ShowToastEvent({
                title:   'Decision Saved',
                message: `Application has been ${resultMessage}.`,
                variant: 'success'
            }));

            setTimeout(() => {
                this[NavigationMixin.Navigate]({
                    type: 'comm__namedPage',
                    attributes: { name: 'ApproverListView__c' }
                });
            }, 1500);

        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title:   'Error',
                message: e.body?.message || 'Failed to save decision.',
                variant: 'error'
            }));
        } finally {
            this.isSubmitting = false;
        }
    }

    // ── Revoke handlers (unchanged) ──────────────────────────────
    handleRevokeClick() {
        this.showRevokeModal = true;
    }

    handleRevokeCancel() {
        this.showRevokeModal = false;
    }

    async handleRevokeConfirm() {
        this.isRevoking = true;
        try {
            await revokeDecision({ applicationId: this.applicationId });

            this.existingDecision = null;
            this.isRevokable      = false;
            this.isReturned       = false;
            this.decisionDate     = null;
            this.comment          = '';
            this.showRevokeModal  = false;

            this.dispatchEvent(new ShowToastEvent({
                title:   'Decision Revoked',
                message: 'The decision has been revoked. You may now re-submit.',
                variant: 'warning'
            }));

        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title:   'Error',
                message: e.body?.message || 'Failed to revoke decision.',
                variant: 'error'
            }));
        } finally {
            this.isRevoking = false;
        }
    }

    // ── Computed ─────────────────────────────────────────────────
    get daysRemaining() {
        if (!this.decisionDate) return 0;
        const diff = new Date(this.decisionDate).getTime()
                     + (7 * 24 * 60 * 60 * 1000)
                     - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    get returnedDateFormatted() {
        if (!this.decisionDate) return '';
        return new Date(this.decisionDate).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    get isDecisionMade() {
        return !!this.existingDecision || this.isSubmitting;
    }

    get isCommentRequired() {
        return this.pendingDecision === 'Accept'
            || this.pendingDecision === 'Conditionally Approve'
            || this.pendingDecision === 'Return';
    }

    get isReasonsRequired() {
        return this.pendingDecision === 'Return';
    }

    get isConfirmDisabled() {
        if (this.isSubmitting) return true;
        if (this.isCommentRequired && !this.comment?.trim()) return true;
        if (this.pendingDecision === 'Return' && (!this.selectedReasons || this.selectedReasons.length === 0)) return true;
        return false;
    }

    get modalTitle() {
        if (this.pendingDecision === 'Accept') return 'Confirm Acceptance';
        if (this.pendingDecision === 'Conditionally Approve') return 'Confirm Conditional Approval';
        if (this.pendingDecision === 'Return') return 'Confirm Return to Reviewer';
        return 'Confirm Decline';
    }

    get modalMessage() {
        if (this.pendingDecision === 'Accept') {
            return `You are about to ACCEPT application ${this.appName}. A comment is required. Depending on the Reviewer's recommendation, this will update the status to Recommend for Fund or Not Recommend for Fund.`;
        }
        if (this.pendingDecision === 'Conditionally Approve') {
            return `You are about to CONDITIONALLY APPROVE application ${this.appName}. A comment is required. This will update the application status to Recommend for Fund.`;
        }
        if (this.pendingDecision === 'Return') {
            return `You are about to REJECT application ${this.appName} and return it to the Reviewer. A comment is required so the Reviewer understands your concern.`;
        }
        return `You are about to DECLINE application ${this.appName}. This will update the application status to Not Recommend for Fund.`;
    }

    get modalHeaderClass() {
        if (this.pendingDecision === 'Accept') return 'modal-header modal-approve';
        if (this.pendingDecision === 'Conditionally Approve') return 'modal-header modal-conditional';
        if (this.pendingDecision === 'Return') return 'modal-header modal-return';
        return 'modal-header modal-decline';
    }

    get modalConfirmClass() {
        if (this.pendingDecision === 'Accept') return 'modal-btn btn-confirm-approve';
        if (this.pendingDecision === 'Conditionally Approve') return 'modal-btn btn-confirm-conditional';
        if (this.pendingDecision === 'Return') return 'modal-btn btn-confirm-return';
        return 'modal-btn btn-confirm-decline';
    }

    get existingDecisionClass() {
        const d = this.existingDecision;
        if (d === 'Accept' || d === 'Approve') return 'decision-tag dec-approve';
        if (d === 'Conditionally Approve') return 'decision-tag dec-conditional';
        if (d === 'Decline') return 'decision-tag dec-decline';
        return 'decision-tag';
    }

    // ── Split-pane computed ──────────────────────────────────────
    get leftPaneClass() {
        return this.leftCollapsed ? 'pane pane-left pane-collapsed' : 'pane pane-left';
    }
    get rightPaneClass() {
        return this.rightCollapsed ? 'pane pane-right pane-collapsed' : 'pane pane-right';
    }
    get isLeftOpen()  { return !this.leftCollapsed; }
    get isRightOpen() { return !this.rightCollapsed; }
    get leftToggleIcon() {
        return this.leftCollapsed ? 'utility:chevronright' : 'utility:chevronleft';
    }
    get rightToggleIcon() {
        return this.rightCollapsed ? 'utility:chevronleft' : 'utility:chevronright';
    }
    get leftToggleTitle() {
        return this.leftCollapsed ? 'Expand Applicant Proposal' : 'Collapse Applicant Proposal';
    }
    get rightToggleTitle() {
        return this.rightCollapsed ? 'Expand Reviewer Evaluation' : 'Collapse Reviewer Evaluation';
    }
    get showResizer() {
        return !this.leftCollapsed && !this.rightCollapsed;
    }
    get showDecisionPanel() {
        return this.pendingDecision === 'Accept' || this.pendingDecision === 'Return';
    }

    get isReturnDecision() {
        return this.pendingDecision === 'Return';
    }

    get decisionPanelButtonLabel() {
        return this.pendingDecision === 'Accept' ? 'Continue — Accept' : 'Continue — Reject';
    }

    // NEW (display only): the Continue button used the red "Reject" style
    // for both decisions. Accept now shows green, Reject stays red.
    get decisionPanelButtonClass() {
        return this.pendingDecision === 'Accept'
            ? 'success-btn wg-btn-sm'
            : 'primary-btn wg-btn-sm';
    }
    get decisionPanelButtonIcon() {
        return this.pendingDecision === 'Accept' ? 'utility:check' : 'utility:reply';
    }
}