import { LightningElement, api, track } from 'lwc';
import updateProposal from '@salesforce/apex/Coe_ProposalApprovalController.updateProposal';
import getProposalStatus from '@salesforce/apex/Coe_ProposalApprovalController.getProposalStatus';
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

    get isButtonDisabled() {
        return ![
            'Proposal Submitted to COE Admin',
            'Proposal Resubmitted to COE Admin'
        ].includes(this.status);
    }

    get modalTitle() {
        return this.isCommentsStep ? `${this.actionType} Proposal` : 'COE Review Form';
    }

    /*handleAction(event) {
        this.actionType = event.currentTarget.dataset.action;
        this.showModal = true;
        this.isCommentsStep = true;
        this.isFormStep = false;
    }*/
handleAction(event) {
    this.actionType = event.currentTarget.dataset.action; // ✅ FIX
    this.showModal = true;
    this.isCommentsStep = true;
    this.isFormStep = false;
}


    handleCommentsChange(e) {
        this.comments = e.target.value;
    }

    handleDueDateChange(e) {
        this.dueDate = e.target.value;
    }

get shouldShowLevel1Form() {
    // Show form ONLY when:
    // 1. Action is Approve or Reject
    // 2. Status is NOT "Proposal Resubmitted to COE"
    return (
        (this.actionType === 'Approve' || this.actionType === 'Reject') 
        //&&
        //this.status !== 'Proposal Resubmitted to COE Admin'
    );
}


goToFormStep() {
    // Validate comments
    if (!this.comments?.trim()) {
        this.showToast('Comments Required', 'Please enter comments', 'error');
        return;
    }

    // Validate due date only for Resubmit
    if (this.isResubmit && !this.dueDate) {
        this.showToast('Due Date Required', 'Select due date', 'error');
        return;
    }

    // 🔥 CASE 1: NO FORM REQUIRED (Resubmit OR status = Resubmitted to COE)
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

        return; // ⛔ STOP — NO FORM
    }

    // ✅ CASE 2: SHOW LEVEL-1 FORM
    this.isCommentsStep = false;
    this.isFormStep = true;
     this.modalTitle = 'COE Review Form';
}
goBackToComments() {
    this.isFormStep = false;
    this.isCommentsStep = true;
    this.modalTitle =
        this.selectedAction === 'Approve'
            ? 'Approve Proposal'
            : 'Reject Proposal';
}

/*handleResubmit() {
    if (!this.comments || !this.dueDate) {
        this.showToast('Error', 'Please fill all required fields', 'error');
        return;
    }
    // Apex call here
    this.closeModal();
}*/
handleResubmit() {
    if (!this.comments?.trim() || !this.dueDate) {
        this.showToast('Error', 'Please fill all required fields', 'error');
        return;
    }

    updateProposal({
        recordId: this.recordId,
        actionType: 'Resubmit',   // ✅ Explicit
        comments: this.comments,
        dueDate: this.dueDate
    })
        .then(() => {
            this.showToast(
                'Success',
                'Proposal sent back for resubmission',
                'success'
            );
            this.fetchStatus();   // ✅ Refresh status
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
        //this.isCommentsStep = true;
       // this.isFormStep = false;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}