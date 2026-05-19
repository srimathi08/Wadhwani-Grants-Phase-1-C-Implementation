import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getQueriesForReviewer from '@salesforce/apex/ReviewerQueryController.getQueriesForReviewer';

export default class ReviewerQueryList extends NavigationMixin(LightningElement) {

    @track queries = [];
    @track isLoading = true;
    @track hasError = false;
    @track errorMessage = '';

    statusClassMap = {
        'Raised'          : 'rql-status rql-status-raised',
        'Sent to COE'     : 'rql-status rql-status-coe',
        'Answered by COE' : 'rql-status rql-status-answered',
        'Sent to PI'      : 'rql-status rql-status-pi',
        'Answered by PI'  : 'rql-status rql-status-answered',
        'Sent to Reviewer': 'rql-status rql-status-reviewer',
    };

    @wire(getQueriesForReviewer)
    wiredQueries({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.queries = data.map((q, index) => ({
                ...q,
                serialNumber : index + 1,
                statusClass  : this.statusClassMap[q.Status__c] || 'rql-status rql-status-default',
                proposalUrl  : '/s/proposal/' + q.Proposal__c,
                queryUrl     : '/s/reviewer-query/' + q.Id + '/' + q.Name
            }));
            this.hasError = false;
        } else if (error) {
            this.hasError     = true;
            this.errorMessage = error.body?.message || 'Failed to load queries.';
        }
    }

    handleProposalClick(event) {
        event.preventDefault();
        const proposalId = event.currentTarget.dataset.id;
        if (!proposalId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/s/proposal/' + proposalId
            }
        });
    }

    handleQueryClick(event) {
        event.preventDefault();
        const queryId   = event.currentTarget.dataset.id;
        const queryName = event.currentTarget.dataset.name;
        if (!queryId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/reviewer-query/' + queryId + '/' + queryName
            }
        });
    }

    get totalCount() { return this.queries.length; }
    get isEmpty()    { return !this.isLoading && !this.hasError && this.queries.length === 0; }
    get hasData()    { return !this.isLoading && !this.hasError && this.queries.length > 0; }
}