import { LightningElement, api, track } from 'lwc';
import updateProposal from '@salesforce/apex/Coe_ProposalApprovalController.updateProposal';
import getProposalStatus from '@salesforce/apex/Coe_ProposalApprovalController.getProposalStatus';
import escalateToPI from '@salesforce/apex/ProposalLevel1ActionController.escalateToPI';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CoeApprovalComponent extends LightningElement {
    @api recordId;

    @track showModal = false;
    @track comments = '';
    @track dueDate;
    @track actionType;
    @track status;

    @track isCommentsStep = true;
    @track isFormStep = false;

    connectedCallback() {
        this.fetchStatus();
    }

    fetchStatus() {
        getProposalStatus({ recordId: this.recordId })
            .then(res => this.status = res.Status)
            .catch(err => console.error(err));
    }

    get isResubmit() {
        return this.actionType === 'Resubmit';
    }

    // NEW: identifies the Escalate to PI flow
    get isEscalateAction() {
        return this.actionType === 'Escalate';
    }

    // UPDATED: Asked for Resubmission by WIN Admin now also enables
    // Approve/Reject/Resubmit, not just Escalate
    get isButtonDisabled() {
        return ![
            'Proposal Submitted to COE Admin',
            'Proposal Resubmitted to COE Admin',
            'Asked for Resubmission by WIN Admin'
        ].includes(this.status);
    }

    // NEW: shows the 4th button once WIN Admin has made a Level 1 decision
    get showEscalateButton() {
        return [
            'Approved - Level 1',
            'Rejected - Level 1',
            'Asked for Resubmission by WIN Admin'
        ].includes(this.status);
    }

    get commentsLabel() {
        return this.isEscalateAction ? 'COE Comments' : 'Comments';
    }

    get modalTitle() {
        if (this.isEscalateAction) {
            return 'Escalate to Principal Investigator';
        }
        return this.isCommentsStep ? `${this.actionType} Proposal` : 'COE Review Form';
    }

    handleAction(event) {
        this.actionType = event.currentTarget.dataset.action;
        this.showModal = true;
        this.isCommentsStep = true;
        this.isFormStep = false;
        this.comments = '';
        this.dueDate = null;
    }

    handleCommentsChange(e) {
        this.comments = e.target.value;
    }

    handleDueDateChange(e) {
        this.dueDate = e.target.value;
    }

    get shouldShowLevel1Form() {
        return (
            (this.actionType === 'Approve' || this.actionType === 'Reject')
        );
    }

    goToFormStep() {
        if (!this.comments?.trim()) {
            this.showToast('Comments Required', 'Please enter comments', 'error');
            return;
        }

        if (this.isResubmit && !this.dueDate) {
            this.showToast('Due Date Required', 'Select due date', 'error');
            return;
        }

        if (!this.shouldShowLevel1Form) {
            updateProposal({
                recordId: this.recordId,
                actionType: this.actionType,
                comments: this.comments,
                dueDate: this.isResubmit ? this.dueDate : null
            })
                .then(() => {
                    this.showToast(
                        'Success',
                        'Proposal updated successfully',
                        'success'
                    );
                    this.fetchStatus();
                    this.closeModal();
                })
                .catch(err => {
                    this.showToast(
                        'Error',
                        err?.body?.message || 'Update failed',
                        'error'
                    );
                });

            return;
        }

        this.isCommentsStep = false;
        this.isFormStep = true;
    }

    goBackToComments() {
        this.isFormStep = false;
        this.isCommentsStep = true;
    }

    handleResubmit() {
        if (!this.comments?.trim() || !this.dueDate) {
            this.showToast('Error', 'Please fill all required fields', 'error');
            return;
        }

        updateProposal({
            recordId: this.recordId,
            actionType: 'Resubmit',
            comments: this.comments,
            dueDate: this.dueDate
        })
            .then(() => {
                this.showToast(
                    'Success',
                    'Proposal sent back for resubmission',
                    'success'
                );
                this.fetchStatus();
                this.closeModal();
            })
            .catch(err => {
                this.showToast(
                    'Error',
                    err?.body?.message || 'Resubmission failed',
                    'error'
                );
            });
    }

    // NEW: Escalate to PI submit handler
    handleEscalateSubmit() {
        if (!this.comments?.trim()) {
            this.showToast('Validation Error', 'Please enter COE comments before sending.', 'error');
            return;
        }

        escalateToPI({ recordId: this.recordId, coeComments: this.comments })
            .then(() => {
                this.showToast('Success', 'Email sent to PI successfully', 'success');
                this.fetchStatus();
                this.closeModal();
            })
            .catch(err => {
                this.showToast('Error', err?.body?.message || 'Escalation failed', 'error');
            });
    }

    handleReviewCompleted() {
        updateProposal({
            recordId: this.recordId,
            actionType: this.actionType,
            comments: this.comments,
            dueDate: this.isResubmit ? this.dueDate : null
        })
            .then(() => {
                this.showToast('Success', 'Proposal updated successfully', 'success');
                this.fetchStatus();
                this.closeModal();
            })
            .catch(err => {
                this.showToast('Error', err?.body?.message || 'Update failed', 'error');
            });
    }

    closeModal() {
        this.showModal = false;
        this.comments = '';
        this.dueDate = null;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}