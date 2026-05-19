import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';

import getSharedProposals
    from '@salesforce/apex/CoeProposalReviewController.getSharedProposals';

import getPIProposals
    from '@salesforce/apex/CoeProposalReviewController.getPIProposals';

import shareWithPI
    from '@salesforce/apex/CoeProposalReviewController.shareWithPI';

import isCoeUser
    from '@salesforce/apex/CoeProposalReviewController.isCoeUser';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CoeProposalReviewList extends NavigationMixin(LightningElement) {

    @track proposals = [];
    wiredResult;

    /* ======================================
       FLAG — show action button only for COE
    ====================================== */
    isCoeUser = false;

    /* ======================================
       CHECK USER TYPE
    ====================================== */

    @wire(isCoeUser)
    wiredUserType({ data, error }) {

        if (data !== undefined) {
            this.isCoeUser = data;
        }

        if (error) {
            console.error('User check failed', error);
        }
    }

    /* ======================================
       FETCH PROPOSALS — COE PORTAL
       Queries WIN_COE_Share_Log__c via
       getSharedProposals()
    ====================================== */

    @wire(getSharedProposals)
    wiredCOEProposals(result) {

        if (!this.isCoeUser) return;

        this.wiredResult = result;

        const { data, error } = result;

        if (data) {
            this.prepareTable(data);
        } else if (error) {
            console.error('getSharedProposals error:', error);
            this.showToast(
                'Error',
                'Unable to load proposals',
                'error'
            );
        }
    }

    /* ======================================
       FETCH PROPOSALS — PI PORTAL
       Queries COE_PI_Share_Log__c via
       getPIProposals()
    ====================================== */

    @wire(getPIProposals)
    wiredPIProposals(result) {

        if (this.isCoeUser) return;

        this.wiredResult = result;

        const { data, error } = result;

        if (data) {
            this.prepareTable(data);
        } else if (error) {
            console.error('getPIProposals error:', error);
            this.showToast(
                'Error',
                'Unable to load proposals',
                'error'
            );
        }
    }

    /* ======================================
       TRANSFORM DATA FOR TABLE
    ====================================== */

    prepareTable(data) {

        this.proposals = data.map(proposal => {

            const reviews = proposal.reviews.map((review, index) => {

                return {
                    ...review,
                    isFirst: index === 0,
                    rowKey: proposal.proposalId + '-' + index
                };
            });

            return {
                ...proposal,
                reviews: reviews,
                rowspan: reviews.length
            };
        });
    }

    /* ======================================
       NAVIGATE TO PROPOSAL RECORD
    ====================================== */

    navigateToRecord(event) {

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
       SHARE WITH PI
       Only available to COE users
    ====================================== */

    handleShareWithPI(event) {

        const proposalId = event.currentTarget.dataset.id;

        shareWithPI({ proposalId })

            .then(() => {

                this.showToast(
                    'Success',
                    'Proposal review shared with PI successfully',
                    'success'
                );

                return refreshApex(this.wiredResult);
            })

            .catch(error => {

                console.error('Share with PI error:', error);

                let message = 'Unable to share proposal with PI';

                if (error?.body?.message) {
                    message = error.body.message;
                }

                this.showToast('Error', message, 'error');
            });
    }

    /* ======================================
       TOAST METHOD
    ====================================== */

    showToast(title, message, variant) {

        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant })
        );
    }
}