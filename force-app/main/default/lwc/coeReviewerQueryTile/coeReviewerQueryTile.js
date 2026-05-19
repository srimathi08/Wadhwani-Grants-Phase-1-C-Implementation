import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class CoeReviewerQueryTile extends NavigationMixin(LightningElement) {

    navigateToList() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'COE_query_list__c'
            }
        });
    }
}