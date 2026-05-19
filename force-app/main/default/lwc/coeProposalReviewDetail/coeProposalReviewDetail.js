import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import getProposalReviews from '@salesforce/apex/CoeProposalReviewDetailController.getProposalReviews';

export default class CoeProposalReviewDetail extends NavigationMixin(LightningElement) {

    @api recordId;
    @track reviews = [];
    @track isLoading = true;
    @track hasError = false;

    /* Get recordId from Experience Cloud URL */
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.attributes.recordId;
        }
    }

    /* Fetch Reviews */
    @wire(getProposalReviews, { proposalId: '$recordId' })
    wiredReviews({ data, error }) {

        this.isLoading = false;

        if (data) {
            this.reviews = data;
            this.hasError = false;
        }
        else if (error) {
            console.error('Error loading reviews', error);
            this.hasError = true;
        }
    }

    /* Navigate to review detail */
    navigateToReview(event) {

        const reviewId = event.currentTarget.dataset.id;

        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Review_Detail__c'
            },
            state: {
                reviewId: reviewId
            }
        });
    }

    /* UI helpers */

    get hasReviews() {
        return !this.isLoading && !this.hasError && this.reviews.length > 0;
    }

    get isEmpty() {
        return !this.isLoading && !this.hasError && this.reviews.length === 0;
    }

    get reviewCount() {
        return this.reviews.length;
    }
}