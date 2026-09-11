import { LightningElement, api, track } from 'lwc';
import getStatus from '@salesforce/apex/ProposalLevel1ActionController.getStatus';
import escalateToPI from '@salesforce/apex/ProposalLevel1ActionController.escalateToPI';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ProposalLevel1Action extends LightningElement {

    @api recordId;
    @track status = '';
    @track showConfirmModal = false;
    @track isEscalated = false;
    @track escalatedAt = '';
    @track coeComments = '';         // ← NEW: stores textarea input
    isLoaded = false;

    renderedCallback() {
        if (this.recordId && !this.isLoaded) {
            this.isLoaded = true;
            this.loadStatus();
        }
    }

    loadStatus() {
        getStatus({ recordId: this.recordId })
            .then(result => {
                this.status = result;
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    handleEscalateClick() {
        this.coeComments = '';       // ← Reset comments each time modal opens
        this.showConfirmModal = true;
    }

    handleCancel() {
        this.showConfirmModal = false;
        this.coeComments = '';
    }

    // ← NEW: capture textarea changes
    handleCommentsChange(event) {
        this.coeComments = event.target.value;
    }

    handleEscalate() {
        // ← Validate comments are not empty
        if (!this.coeComments || this.coeComments.trim() === '') {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Validation Error',
                message: 'Please enter COE comments before sending.',
                variant: 'error'
            }));
            return;
        }

        this.showConfirmModal = false;

        // ← Pass coeComments to Apex
        escalateToPI({ recordId: this.recordId, coeComments: this.coeComments })
         .then(() => {
    this.isEscalated = true;

    this.dispatchEvent(
        new CustomEvent('mailcompleted')
    );

    const now = new Date();

    this.escalatedAt =
        'Sent on ' +
        now.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) +
        ' at ' +
        now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Success',
            message: 'Email sent to PI successfully',
            variant: 'success'
        })
    );
})
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error?.body?.message || 'Something went wrong',
                    variant: 'error'
                }));
            });
    }

    get statusCardClass() {
        if (this.status === 'Approved - Level 1') return 'status-card status-card-success';
        if (this.status === 'Rejected - Level 1') return 'status-card status-card-danger';
        if (this.status === 'Asked for Resubmission by WIN Admin') return 'status-card status-card-warning';
        return 'status-card';
    }

    get statusDotClass() {
        if (this.status === 'Approved - Level 1') return 'status-dot dot-success';
        if (this.status === 'Rejected - Level 1') return 'status-dot dot-danger';
        return 'status-dot dot-warning';
    }

    get badgeClass() {
        if (this.status === 'Approved - Level 1') return 'status-badge badge-success';
        if (this.status === 'Rejected - Level 1') return 'status-badge badge-danger';
        return 'status-badge badge-warning';
    }

    get badgeIcon() {
        if (this.status === 'Approved - Level 1') return 'utility:success';
        if (this.status === 'Rejected - Level 1') return 'utility:error';
        return 'utility:warning';
    }

    get badgeLabel() {
        if (this.status === 'Approved - Level 1') return 'Approved';
        if (this.status === 'Rejected - Level 1') return 'Rejected';
        if (this.status === 'Asked for Resubmission by WIN Admin') return 'Resubmission Needed';
        return '';
    }

    get actionHint() {
        if (this.status === 'Approved - Level 1') return 'Proposal approved — notify the PI to proceed.';
        if (this.status === 'Rejected - Level 1') return 'Proposal rejected — notify the PI to review feedback.';
        return 'Action required — notify the Principal Investigator to resubmit.';
    }

    get showButton() {
        return !this.isEscalated && (
            this.status === 'Approved - Level 1' ||
            this.status === 'Rejected - Level 1' ||
            this.status === 'Asked for Resubmission by WIN Admin'
        );
    }
}