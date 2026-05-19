import { LightningElement, api, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import updateProposal from '@salesforce/apex/WinProposalApprovalController.updateProposal';
import getProposalStatus from '@salesforce/apex/WinProposalApprovalController.getProposalStatus';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class WinAdminApprovalComponent extends LightningElement {
    @api recordId;
    @track showModal = false;
    @track comments = '';
    @track actionType = '';
    @track dueDate = '';
    @track status;
    @track isLoading = false; // ✅ Manual loading control

    _wiredStatusResult; // ✅ Store wire result for refreshApex

    @wire(getProposalStatus, { recordId: '$recordId' })
    wiredStatus(result) {
        this._wiredStatusResult = result; // ✅ Always store full result
        if (result.data !== undefined) {
            this.status = result.data;
        } else if (result.error) {
            console.error('Error fetching status:', result.error);
        }
    }

    get isActionEnabled() {
        return (
            this.status === 'Proposal Submitted to WIN Admin' ||
            this.status === 'Proposal Resubmitted to WIN Admin'
        );
    }

    get isButtonDisabled() {
        return !this.isActionEnabled || this.isLoading;
    }

    get isResubmit() {
        return this.actionType === 'Resubmit';
    }

    handleAction(event) {
        if (this.isButtonDisabled) return;
        this.actionType = event.currentTarget.dataset.action;

        if (this.actionType === 'Approve') {
            this.updateStatus();
        } else {
            this.showModal = true;
        }
    }

    handleCommentsChange(event) {
        this.comments = event.target.value;
    }

    handleDueDateChange(event) {
        this.dueDate = event.target.value;
    }

    getSuccessMessage(actionType) {
        const labels = {
            Approve: 'Approved',
            Reject: 'Rejected',
            Resubmit: 'Sent for Resubmission'
        };
        return `Proposal ${labels[actionType] || actionType} successfully`;
    }

    updateStatus() {
        this.isLoading = true; // ✅ Show spinner manually

        const dateToSend =
            this.actionType === 'Resubmit' && this.dueDate
                ? this.dueDate
                : null;

        updateProposal({
            recordId: this.recordId,
            actionType: this.actionType,
            comments: this.comments,
            dueDate: dateToSend
        })
            .then(() => {
                this.showModal = false;
                this.comments = '';
                this.dueDate = '';

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: this.getSuccessMessage(this.actionType),
                        variant: 'success'
                    })
                );

                // ✅ Only refresh if wire result is ready
                if (this._wiredStatusResult) {
                    return refreshApex(this._wiredStatusResult);
                }
            })
            .catch((error) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error?.body?.message || 'An unexpected error occurred.',
                        variant: 'error'
                    })
                );
            })
            .finally(() => {
                this.isLoading = false; // ✅ Always stop spinner
            });
    }

    closeModal() {
        this.showModal = false;
        this.comments = '';
        this.dueDate = '';
    }
}