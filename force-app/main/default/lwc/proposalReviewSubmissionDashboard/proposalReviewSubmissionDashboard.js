import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

import getSubmittedReviews from '@salesforce/apex/ProposalReviewSubmissionController.getSubmittedReviews';
import shareReview from '@salesforce/apex/ProposalReviewSubmissionController.shareReview';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ProposalReviewSubmissionDashboard extends NavigationMixin(LightningElement) {

    @track proposals = [];
    @track allProposals = [];

    wiredResult;

    /* ======================================
       FETCH DATA
    ====================================== */

    @wire(getSubmittedReviews)
    wiredProposals(result){

        this.wiredResult = result;

        const {data,error} = result;

        if(data){

            this.prepareTable(data);
            this.allProposals = [...this.proposals];

        }
        else if(error){

            console.error(error);

        }
    }

    /* ======================================
       TABLE TRANSFORMATION
    ====================================== */

    prepareTable(data){

        this.proposals = data.map(proposal => {

            const reviews = proposal.reviews.map((review,index)=>{

                return{
                    ...review,
                    isFirst : index === 0,
                    rowKey : proposal.proposalId + '-' + index
                }

            });

            return{
                ...proposal,
                reviews : reviews,
                rowspan : reviews.length
            }

        });

    }

    /* ======================================
       NAVIGATE TO PROPOSAL RECORD
    ====================================== */

    navigateToRecord(event){

        const recordId = event.currentTarget.dataset.id;

        this[NavigationMixin.Navigate]({

            type: 'standard__recordPage',

            attributes: {
                recordId: recordId,
                objectApiName: 'IndividualApplication',
                actionName: 'view'
            }

        });

    }

    /* ======================================
       SEARCH
    ====================================== */

    handleSearch(event){

        const searchKey = event.target.value.toLowerCase();

        if(!searchKey){
            this.proposals = [...this.allProposals];
            return;
        }

        this.proposals = this.allProposals.filter(proposal => {

            const proposalName = proposal.proposalName ? proposal.proposalName.toLowerCase() : '';
            const projectTitle = proposal.projectTitle ? proposal.projectTitle.toLowerCase() : '';
            const focusArea = proposal.primaryFocusArea ? proposal.primaryFocusArea.toLowerCase() : '';

            return (
                proposalName.includes(searchKey) ||
                projectTitle.includes(searchKey) ||
                focusArea.includes(searchKey)
            );

        });

    }

    /* ======================================
       SHARE REVIEW
    ====================================== */

    handleShare(event){

        const proposalId = event.currentTarget.dataset.id;

        shareReview({proposalId})

        .then(()=>{

            this.showToast(
                'Success',
                'Review shared with COE Admin',
                'success'
            );

        })

        .catch(error=>{

            console.error(error);

            this.showToast(
                'Error',
                error.body.message,
                'error'
            );

        });

    }

    /* ======================================
       TOAST
    ====================================== */

    showToast(title,message,variant){

        this.dispatchEvent(

            new ShowToastEvent({
                title,
                message,
                variant
            })

        );

    }

}