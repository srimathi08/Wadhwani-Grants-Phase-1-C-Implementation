import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getValidatorFlagInfo  from '@salesforce/apex/WCFProposalListController.getValidatorFlagInfo';
import getIndividualApplication from '@salesforce/apex/WCF_ReviewFormJFController.getIndividualApplication';
import getApproverReturnInfo         from '@salesforce/apex/WCFProposalListController.getApproverReturnInfo';
import updateApproverReturnDecision  from '@salesforce/apex/WCFProposalListController.updateApproverReturnDecision';

export default class WcfReviewerContainer extends NavigationMixin(LightningElement) {

    // ── Core state ────────────────────────────────────────────────────────────
    @track currentRecordId         = null;
    @track currentApplicationId    = null;
    @track currentRecordName       = '';
    @track showPreview             = true;   // split view (RFI + form) is the default
    @track isReady                 = false;
    @track outcomeDeveloperName    = 'WCF_Job_Fulfillment_Job_Creation';
    @track initialAction           = null;
    @track previewApplicationId    = null;

    // ── Flag state — read-only display ──────────────────────────────────────
    @track isFlaggedByValidator   = false;
    @track validatorFlagRationale = '';
    @track otherConcern           = '';

    // ── Approver Return state ────────────────────────────────────────────────
    @track isReturnedByApprover     = false;
    @track approverReturnComment    = '';
    @track reviewerReturnComment    = '';
    @track reviewerApproveComment   = '';
    @track approverRejectionReasons = '';

    @track isReturnToValidatorBusy = false;
    @track isReturnToApproverBusy  = false;

    @track drawerCollapsed = false;
    @track reviewCollapsed = false;

    // ── Custom toast ─────────────────────────────────────────────────────────
    @track showToast    = false;
    @track toastVariant = 'error';
    @track toastTitle   = '';
    @track toastMessage = '';
    _toastTimer = null;

    _resizing        = false;
    _resizeStartX    = 0;
    _resizeStartW    = 0;
    _boundResizeMove = null;
    _boundResizeUp   = null;

    // ─────────────────────────────────────────────────────────────────────────
    // COMPUTED VISIBILITY
    // ─────────────────────────────────────────────────────────────────────────
    get showApproverReturnPending() {
        return this.isReturnedByApprover;
    }

    /** Review form always shows once ready, except while an Approver-return is pending. */
    get showReviewForm() {
        return !this.isReturnedByApprover;
    }

    /** Read-only notice with the Flagging Criteria — shown above the review form. */
    get showFlagNotice() {
        return this.isFlaggedByValidator;
    }

    get reviewFormClass() {
        let cls = this.showPreview
            ? 'rc-review-panel rc-review-panel--with-drawer'
            : 'rc-review-panel';
        if (this.showPreview && this.reviewCollapsed) {
            cls += ' rc-pane-collapsed';
        }
        return cls;
    }

    get drawerClass() {
        return this.drawerCollapsed ? 'rc-drawer rc-pane-collapsed' : 'rc-drawer';
    }

    get drawerToggleIcon() {
        return this.drawerCollapsed ? 'utility:chevronright' : 'utility:chevronleft';
    }
    get drawerToggleTitle() {
        return this.drawerCollapsed ? 'Expand RFI panel' : 'Collapse RFI panel';
    }
    get reviewToggleIcon() {
        return this.reviewCollapsed ? 'utility:chevronleft' : 'utility:chevronright';
    }
    get reviewToggleTitle() {
        return this.reviewCollapsed ? 'Expand review form' : 'Collapse review form';
    }

    /** Converts 'A;B;C' → [{key, label}] for the Flagging Criteria list */
    get flagRationaleItems() {
        if (!this.validatorFlagRationale || this.validatorFlagRationale === '—') return [];
        return this.validatorFlagRationale
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map((label, idx) => ({ key: idx, label }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WIRES
    // ─────────────────────────────────────────────────────────────────────────
    @wire(CurrentPageReference)
    wiredPageRef(ref) {
        if (ref?.state?.recordId) {
            this.currentRecordId      = ref.state.recordId;
            this.currentApplicationId = ref.state.applicationId || null;
            this.previewApplicationId = ref.state.applicationId || ref.state.recordId;
            this.currentRecordName    = ref.state.recordName
                                        ? decodeURIComponent(ref.state.recordName)
                                        : ref.state.recordId;
            this.initialAction        = ref.state.action || null;

            this.isReady              = true;
            if (this.currentApplicationId) {
                this._loadFlagInfo();
                this._loadOutcomeTrack();
                this._loadApproverReturnInfo();
            }
        } else {
            this.isReady              = false;
            this.currentRecordId      = null;
            this.currentApplicationId = null;
            this.currentRecordName    = '';
            this._resetFlagState();
            this._resetApproverReturnState();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────
    connectedCallback() {
        this._boundResizeMove = this._onResizeMove.bind(this);
        this._boundResizeUp   = this._onResizeUp.bind(this);

        // Split view is the default on desktop. On narrow screens the panes
        // stack vertically, so start with the RFI closed there instead.
        if (typeof window !== 'undefined' && window.innerWidth <= 860) {
            this.showPreview = false;
        }
    }

    disconnectedCallback() {
        document.removeEventListener('mousemove', this._boundResizeMove);
        document.removeEventListener('mouseup',   this._boundResizeUp);
        document.body.style.cursor     = '';
        document.body.style.userSelect = '';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLAG INFO LOADER
    // ─────────────────────────────────────────────────────────────────────────
    async _loadFlagInfo() {
        try {
            const info = await getValidatorFlagInfo({
                applicationId: this.currentApplicationId
            });

            if (!info) {
                this._resetFlagState();
                return;
            }

            this.isFlaggedByValidator   = true;
            this.validatorFlagRationale = info.flagRationale || '—';
            this.otherConcern           = info.otherConcern || '';

        } catch (e) {
            console.error('Flag info load error:', JSON.stringify(e));
            this._resetFlagState();
        }
    }

    _resetFlagState() {
        this.isFlaggedByValidator   = false;
        this.validatorFlagRationale = '';
        this.otherConcern           = '';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPROVER RETURN INFO LOADER
    // ─────────────────────────────────────────────────────────────────────────
    async _loadApproverReturnInfo() {
        try {
            const info = await getApproverReturnInfo({
                applicationId: this.currentApplicationId
            });

            if (!info) {
                this._resetApproverReturnState();
                return;
            }

            this.isReturnedByApprover     = true;
            this.approverReturnComment    = info.comment || '—';
            this.approverRejectionReasons = info.rejectionReasons || '';

        } catch (e) {
            console.error('Approver return info load error:', JSON.stringify(e));
            this._resetApproverReturnState();
        }
    }

    _resetApproverReturnState() {
        this.isReturnedByApprover   = false;
        this.approverReturnComment  = '';
        this.reviewerReturnComment  = '';
        this.reviewerApproveComment = '';
    }

    handleReviewerReturnCommentInput(evt) {
        this.reviewerReturnComment = evt.target.value;
    }
    handleReviewerApproveCommentInput(evt) {
        this.reviewerApproveComment = evt.target.value;
    }

    _showCustomToast(title, message, variant = 'error') {
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this.toastTitle   = title;
        this.toastMessage = message;
        this.toastVariant = variant;
        this.showToast    = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._toastTimer = setTimeout(() => { this.showToast = false; }, 4500);
    }

    handleDismissToast() {
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this.showToast = false;
    }

    get toastIcon() {
        return this.toastVariant === 'success' ? 'utility:success' : 'utility:error';
    }

    get toastClass() {
        return `rc-toast rc-toast--${this.toastVariant}`;
    }

    // ── APPROVER RETURN ACTION HANDLERS ─────────────────────────────────────
    async handleApproverReturnApprove() {
        if (this.isReturnActionBusy) return;
        if (!this.reviewerApproveComment?.trim()) {
            this.dispatchEvent(new ShowToastEvent({
                title:   'Comment Required',
                message: 'Please add a note for the Approver before approving.',
                variant: 'error'
            }));
            return;
        }
        this.isReturnToApproverBusy = true;
        try {
            await updateApproverReturnDecision({
                applicationId:   this.currentApplicationId,
                action:          'Approve',
                reviewerComment: this.reviewerApproveComment
            });
            this.dispatchEvent(new ShowToastEvent({
                title:   'Sent to Approver',
                message: 'Application has been sent back to the Approver for a final decision.',
                variant: 'success'
            }));
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this[NavigationMixin.Navigate]({
                    type:       'comm__namedPage',
                    attributes: { name: 'Home' }
                });
            }, 1500);
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title:   'Action failed',
                message: e.body?.message || e.message || 'Unknown error',
                variant: 'error'
            }));
            // FIX: was `= true`, which left both buttons stuck on "Saving…"
            // after a failed save. Matches handleReviewerReturnToValidator.
            this.isReturnToApproverBusy = false;
        }
    }

    async handleReviewerReturnToValidator() {
        if (this.isReturnActionBusy) return;
        if (!this.reviewerReturnComment?.trim()) {
            this._showCustomToast('Comment Required', 'Please explain what needs to be revalidated.', 'error');
            return;
        }
        this.isReturnToValidatorBusy = true;
        try {
            await updateApproverReturnDecision({
                applicationId:   this.currentApplicationId,
                action:          'ReturnToValidator',
                reviewerComment: this.reviewerReturnComment
            });
            this.dispatchEvent(new ShowToastEvent({
                title:   'Returned to Validator',
                message: 'The application has been sent back to the Validator for revalidation.',
                variant: 'success'
            }));
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this[NavigationMixin.Navigate]({
                    type:       'comm__namedPage',
                    attributes: { name: 'Home' }
                });
            }, 1500);
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title:   'Action failed',
                message: e.body?.message || e.message || 'Unknown error',
                variant: 'error'
            }));
            this.isReturnToValidatorBusy = false;
        }
    }

    /**
     * FIX: the template has always bound onsubmitcomplete={handleSubmitComplete},
     * but the method did not exist, which makes LWC log an "invalid event handler"
     * error. The review form shows its own success screen, so nothing else is needed.
     */
    handleSubmitComplete() {
        // intentionally empty
    }

    async _loadOutcomeTrack() {
        try {
            const result = await getIndividualApplication({ recordId: this.currentApplicationId });
            if (result?.track) {
                this.outcomeDeveloperName = result.track;
            }
        } catch (e) {
            console.error('Error loading outcome track:', e);
        }
    }

    // ── PANE COLLAPSE HANDLERS (never both collapsed) ───────────────────────
    handleToggleDrawerPane() {
        if (this.drawerCollapsed) {
            this.drawerCollapsed = false;
            return;
        }
        if (this.reviewCollapsed) return;
        this.drawerCollapsed = true;
    }

    handleToggleReviewPane() {
        if (this.reviewCollapsed) {
            this.reviewCollapsed = false;
            return;
        }
        if (this.drawerCollapsed) return;
        this.reviewCollapsed = true;
    }

    // ── RESIZE HANDLERS ─────────────────────────────────────────────────────
    handleResizeStart(e) {
        if (this.drawerCollapsed || this.reviewCollapsed) return;
        const drawer = this.template.querySelector('[data-id="drawer"]');
        if (!drawer) return;
        this._resizing     = true;
        this._resizeStartX = e.clientX;
        this._resizeStartW = drawer.offsetWidth;
        document.addEventListener('mousemove', this._boundResizeMove);
        document.addEventListener('mouseup',   this._boundResizeUp);
        document.body.style.cursor     = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }

    _onResizeMove(e) {
        if (!this._resizing) return;
        const drawer      = this.template.querySelector('[data-id="drawer"]');
        const reviewPanel = this.template.querySelector('[data-id="reviewPanel"]');
        if (!drawer || !reviewPanel) return;
        const delta = e.clientX - this._resizeStartX;
        const total = drawer.parentElement.offsetWidth;
        const newW  = Math.min(Math.max(this._resizeStartW + delta, 320), total - 400);
        drawer.style.flex      = `0 0 ${newW}px`;
        reviewPanel.style.flex = `0 0 ${total - newW}px`;
    }

    _onResizeUp() {
        this._resizing = false;
        document.removeEventListener('mousemove', this._boundResizeMove);
        document.removeEventListener('mouseup',   this._boundResizeUp);
        document.body.style.cursor     = '';
        document.body.style.userSelect = '';
    }

    // ── DRAWER + NAVIGATION ─────────────────────────────────────────────────
    handleShowPreview() {
        this.showPreview = true;
        this.drawerCollapsed = false;
        this.reviewCollapsed = false;
    }

    handleHidePreview() {
        this.showPreview = false;
        this.drawerCollapsed = false;
        this.reviewCollapsed = false;
        const drawer      = this.template.querySelector('[data-id="drawer"]');
        const reviewPanel = this.template.querySelector('[data-id="reviewPanel"]');
        if (drawer)      drawer.style.flex      = '';
        if (reviewPanel) reviewPanel.style.flex = '';
    }

    _navigateBackToApplication() {
        if (this.currentApplicationId) {
            this[NavigationMixin.Navigate]({
                type       : 'standard__recordPage',
                attributes : {
                    recordId   : this.currentApplicationId,
                    actionName : 'view'
                }
            });
        } else {
            this[NavigationMixin.Navigate]({
                type       : 'comm__namedPage',
                attributes : { name: 'Proposals__c' }
            });
        }
    }

    handleBack() { this._navigateBackToApplication(); }

    get showReviewPreview() {
        return this.initialAction === 'view';
    }

    get approverRejectionReasonItems() {
        if (!this.approverRejectionReasons) return [];
        return this.approverRejectionReasons.split(';').map((label, idx) => ({ key: idx, label }));
    }

    get hasOtherConcern() {
        return this.otherConcern && this.otherConcern.trim().length > 0;
    }

    get isReturnActionBusy() {
        return this.isReturnToValidatorBusy || this.isReturnToApproverBusy;
    }
}