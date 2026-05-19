import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class CoeApplicationStatusTile extends NavigationMixin(LightningElement) {
navigateToPage() {
    this[NavigationMixin.Navigate]({
        type: 'standard__webPage',
        attributes: {
            url: '/application-status'  // ✅ your page URL
        }
    });
}
}