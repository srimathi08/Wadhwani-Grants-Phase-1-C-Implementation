import { LightningElement, api, wire, track } from 'lwc';
import getApprovalHistory from '@salesforce/apex/ApprovalHistoryService.getRecords';
import shareWithPI from '@salesforce/apex/ApprovalHistorySharingController.shareWithPI';
import askToWIN from '@salesforce/apex/ApprovalHistorySharingController.askToWIN';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class ApprovalHistoryDataTableForCOE extends LightningElement {
    @api recordId;
    @track rows = [];
    wiredResult;

    // Ask to WIN modal fields
    @track showAskModal = false;
    @track selectedHistoryId;
    @track askWinComments = '';

    // Wire data
    @wire(getApprovalHistory, { proposalId: '$recordId' })
    wiredRecords(result) {
        this.wiredResult = result;

        const { data, error } = result;

        if (data) {
            this.rows = data.map(w => {
                let rec = w.record;
                return {
                    Id: rec.Id,
                    Name: rec.Name,
                    Status__c: rec.Status__c,
                    Assigned_To_Name__c: rec.Assigned_To_Name__c,
                    Comments__c: rec.Comments__c,
                    formattedDate: this.formatDate(rec.CreatedDate),
                    statusClass: this.computeStatusClass(rec.Status__c),
                    alreadyShared: w.alreadyShared
                };
            });
        } else if (error) {
            console.error(error);
        }
    }

    // Open Ask to WIN Modal
    openAskWinModal = (event) => {
        this.selectedHistoryId = event.target.dataset.id;
        this.showAskModal = true;
    };

    closeAskWinModal = () => {
        this.showAskModal = false;
        this.askWinComments = '';
    };

    handleAskCommentChange(event) {
        this.askWinComments = event.target.value;
    }

    // Submit Ask to WIN
    submitAskToWin = () => {
        askToWIN({
            approvalHistoryId: this.selectedHistoryId,
            comment: this.askWinComments
        })
            .then(() => {
                this.showToast('Success', 'Sent to WIN successfully', 'success');
                this.closeAskWinModal();
                refreshApex(this.wiredResult);
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            });
    };

    // Share with PI
    handleShare(event) {
        let historyId = event.target.dataset.id;

        shareWithPI({ approvalHistoryId: historyId })
            .then(() => {
                this.showToast('Success', 'Shared with PI', 'success');
                refreshApex(this.wiredResult);
            })
            .catch(err => {
                this.showToast('Error', err.body.message, 'error');
            });
    }

    // Helpers
    formatDate(dateTime) {
        return dateTime ? dateTime.split('T')[0] : '';
    }

    computeStatusClass(status) {
        switch (status) {
            case 'Approved': return 'status-badge approved';
            case 'Rejected': return 'status-badge rejected';
            case 'Resubmit': return 'status-badge resubmit';
            case 'Submitted': return 'status-badge submitted';
            case 'Question from Coe': return 'status-badge question';
            default: return 'status-badge';
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}