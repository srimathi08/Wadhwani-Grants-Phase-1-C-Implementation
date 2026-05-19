import { LightningElement, wire } from 'lwc';
import getReviewSummary from '@salesforce/apex/ReviewSummaryController.getReviewSummary';
import { NavigationMixin } from 'lightning/navigation';

export default class ReviewSummary extends NavigationMixin(LightningElement) {
    totalAssigned = 0;
    submitted = 0;
    yetToStart = 0;
    error;

    @wire(getReviewSummary)
    wiredSummary({ error, data }) {
        if (data) {
            this.totalAssigned = data.totalAssigned;
            this.submitted = data.submitted;
            this.yetToStart = data.yetToStart;
        } else if (error) {
            this.error = error;
        }
    }

    handleTotalClick() {
        this.navigateToListView('IndividualApplicationShare', 'All');
    }

    handleReviewedClick() {
        this.navigateToListView('RApplicationReview', 'Submitted');
    }

    handleYetToStartClick() {
        // Custom logic: maybe navigate to ApplicationShare list or a filtered page
        this.navigateToListView('IndividualApplicationShare', 'YetToStart');
    }

    navigateToListView(objectApiName, filterName) {
        this[NavigationMixin.Navigate]({
            type: 'ApplicationReview',
            attributes: {
                objectApiName: ApplicationReview,
                actionName: 'list'
            },
            state: {
                filterName: 'Project_Proposal_Review'
            }
        });
    }
}