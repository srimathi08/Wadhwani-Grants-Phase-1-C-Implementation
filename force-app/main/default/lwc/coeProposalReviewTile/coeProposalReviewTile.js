import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class CoeProposalReviewTile extends NavigationMixin(LightningElement) {

    handleClick() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Proposal_Reviews__c'  // ✅ Use the API Name, not the URL
            }
        });
    }

}