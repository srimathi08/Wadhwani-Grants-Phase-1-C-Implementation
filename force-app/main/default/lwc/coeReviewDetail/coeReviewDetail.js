import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getReviewDetail from '@salesforce/apex/CoeReviewDetailController.getReviewDetail';

export default class CoeReviewDetail extends LightningElement {

    reviewId;
    @track review;
    @track isLoading = true;
    @track isAccessDenied = false;

    @wire(CurrentPageReference)
    getStateParameters(pageRef) {

        if(pageRef && pageRef.state && pageRef.state.reviewId){

            this.reviewId = pageRef.state.reviewId;

            getReviewDetail({ reviewId: this.reviewId })
                .then(result => {

                    this.review = result;
                    this.isLoading = false;

                })
                .catch(error => {

                    console.error(error);
                    this.isAccessDenied = true;
                    this.isLoading = false;

                });
        }
    }

    get hasData(){

        return !this.isLoading &&
               !this.isAccessDenied &&
               this.review;
    }
}