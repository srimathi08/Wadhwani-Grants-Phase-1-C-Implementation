import { LightningElement, wire, track } from 'lwc';
import getQueriesForPI from '@salesforce/apex/ReviewerQueryController.getQueriesForPI';
import replyFromPI from '@salesforce/apex/ReviewerQueryController.replyFromPI';

import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class PiReviewerQueryList extends NavigationMixin(LightningElement) {

    @track data = [];
    isLoading = true;

    selectedQueryId;
    replyText = '';
    showModal = false;

    wiredResult;

    /* ---------------- LOAD DATA ---------------- */
    @wire(getQueriesForPI)
    wiredData(result) {
        this.wiredResult = result;

        if (result.data) {
            this.data = result.data.map(row => ({
                Id: row.Id,
                queryName: row.Name,
                queryText: row.Query__c,
                proposalName: row.Proposal__r.Name,
                proposalId: row.Proposal__c,
                status: row.Status__c,
                isReplied: row.Status__c === 'Answered by PI'
            }));

            this.isLoading = false;
        }

        if (result.error) {
            console.error(result.error);
            this.isLoading = false;
        }
    }

    get isEmpty() {
        return !this.isLoading && (!this.data || this.data.length === 0);
    }

    /* ---------------- NAVIGATION ---------------- */
     handleView(event) {
        const recordId  = event.currentTarget.dataset.id;
        const queryName = event.currentTarget.dataset.name;
        if (!recordId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: 'reviewer-query/' + recordId + '/' + queryName
            }
        });
    }

    handleProposalView(event) {
        const recordId = event.currentTarget.dataset.id;

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId,
                objectApiName: 'Proposal__c',
                actionName: 'view'
            }
        });
    }

    /* ---------------- REPLY ---------------- */
    handleReply(event) {
        this.selectedQueryId = event.currentTarget.dataset.id;
        this.showModal = true;
    }

    handleReplyChange(event) {
        this.replyText = event.target.value;
    }

    closeModal() {
        this.showModal = false;
        this.replyText = '';
    }

    submitReply() {

        if (!this.replyText) {
            this.showToast('Error', 'Reply cannot be empty', 'error');
            return;
        }

        replyFromPI({
            queryId: this.selectedQueryId,
            replyText: this.replyText
        })
        .then(() => {
            this.showToast('Success', 'Reply submitted', 'success');
            this.closeModal();
            return refreshApex(this.wiredResult);
        })
        .catch(error => {
            console.error(error);
            this.showToast('Error', 'Failed to submit reply', 'error');
        });
    }

    /* ---------------- TOAST ---------------- */
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant })
        );
    }
}