import { LightningElement, wire, track } from 'lwc';
import getReviewerQueries from '@salesforce/apex/ReviewerQueryController.getReviewerQueries';
import shareWithCOE from '@salesforce/apex/ReviewerQueryController.shareWithCOE';
import shareWithReviewer from '@salesforce/apex/ReviewerQueryController.shareWithReviewer';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';

export default class ReviewerQueryAdminTable extends NavigationMixin(LightningElement) {

    @track queries = [];
    @track isLoading = true;

    /* ---------------------------
       COMPUTED PROPERTIES
    --------------------------- */

    get noRecords() {
        return !this.isLoading && this.queries.length === 0;
    }

    get queryCount() {
        return this.queries.length;
    }

    /* ---------------------------
       STATUS → CSS CLASS MAPPING
    --------------------------- */

    getStatusClass(status) {
        if (!status) return 'status-badge status-default';
        const s = status.toLowerCase();
        if (s.includes('new'))       return 'status-badge status-new';
        if (s.includes('coe'))       return 'status-badge status-coe';
        if (s.includes('reviewer'))  return 'status-badge status-reviewer';
        if (s.includes('closed'))    return 'status-badge status-closed';
        return 'status-badge status-default';
    }

    /* ---------------------------
       LOAD DATA
    --------------------------- */

    @wire(getReviewerQueries)
    wiredQueries({ error, data }) {

        this.isLoading = false;

        if (data) {
            this.queries = data.map((row, index) => ({
                ...row,
                rowIndex: index + 1,
                queryUrl: '/lightning/r/Reviewer_Query__c/' + row.Id + '/view',
                proposalName: row.Proposal__r ? row.Proposal__r.Name : '',
                proposalUrl: row.Proposal__c
                    ? '/lightning/r/IndividualApplication/' + row.Proposal__c + '/view'
                    : '',
                statusClass: this.getStatusClass(row.Status__c)
            }));
        }

        if (error) {
            console.error(error);
        }
    }

    /* ---------------------------
       ACTION HANDLER
       (custom table uses data-action / data-id on buttons)
    --------------------------- */

    handleRowAction(event) {
        const action = event.currentTarget.dataset.action;
        const rowId  = event.currentTarget.dataset.id;
        const row    = this.queries.find(q => q.Id === rowId);

        if (!row) return;

        if (action === 'view') {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: row.Id,
                    objectApiName: 'Reviewer_Query__c',
                    actionName: 'view'
                }
            });
        }

        if (action === 'coe') {
            shareWithCOE({ queryId: row.Id })
                .then(() => {
                    this.showToast('Success', 'Shared with COE', 'success');
                    location.reload();
                })
                .catch(err => {
                    this.showToast('Error', err.body?.message || 'Could not share with COE', 'error');
                });
        }

        if (action === 'reviewer') {
            shareWithReviewer({ queryId: row.Id })
                .then(() => {
                    this.showToast('Success', 'Shared with Reviewer', 'success');
                    location.reload();
                })
                .catch(err => {
                    this.showToast('Error', err.body?.message || 'Could not share with Reviewer', 'error');
                });
        }
    }

    /* ---------------------------
       TOAST HELPER
    --------------------------- */

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}