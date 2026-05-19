import { LightningElement, wire, track } from 'lwc';
import getQueriesForCOE from '@salesforce/apex/ReviewerQueryController.getQueriesForCOE';
import replyFromCOE from '@salesforce/apex/ReviewerQueryController.replyFromCOE';
import shareWithPI from '@salesforce/apex/ReviewerQueryController.shareWithPI';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';

export default class CoeReviewerQueryList extends NavigationMixin(LightningElement) {

    @track data = [];
    selectedQueryId;
    replyText = '';
    showModal = false;

    wiredResult;

    /* ---------------- LOAD DATA ---------------- */
    @wire(getQueriesForCOE)
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
                isSharedWithPI: row.Status__c === 'Sent to PI' || row.Status__c === 'Answered by PI'
            }));
        }

        if (result.error) {
            console.error(result.error);
        }
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
        if (!recordId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/s/proposal/' + recordId
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

        replyFromCOE({
            queryId: this.selectedQueryId,
            replyText: this.replyText
        })
        .then(() => {
            this.showToast('Success', 'Reply sent', 'success');
            this.closeModal();
            return refreshApex(this.wiredResult);
        })
        .catch(error => {
            console.error(error);
            this.showToast('Error', 'Failed to send reply', 'error');
        });
    }

    /* ---------------- SHARE WITH PI ---------------- */
    handleSharePI(event) {
        this.selectedQueryId = event.currentTarget.dataset.id;

        shareWithPI({
            queryId: this.selectedQueryId
        })
        .then(() => {
            this.showToast('Success', 'Shared with PI', 'success');
            return refreshApex(this.wiredResult);
        })
        .catch(error => {
            console.error(error);
            this.showToast('Error', 'Failed to share with PI', 'error');
        });
    }

    /* ---------------- TOAST ---------------- */
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant })
        );
    }
}