import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class NavigateRecordPage extends LightningElement {
      @api recordId;  // Pass this from Flow or parent component
    @api objectApiName = 'Translated_Proposal__c'; // Default; can be passed in

    showSpinner = true;

    connectedCallback() {
    console.log('RedirectToRecord LWC: connectedCallback called');
    console.log('recordId:', this.recordId, 'objectApiName:', this.objectApiName);
    if (this.recordId && this.objectApiName) {
        // Slight delay ensures page is ready
        setTimeout(() => {
            console.log('RedirectToRecord LWC: Initiating navigation to record...');
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: this.recordId,
                    objectApiName: this.objectApiName,
                    actionName: 'view'
                }
            });
        }, 100);
    } else {
        console.warn('RedirectToRecord LWC: recordId or objectApiName missing! Navigation aborted.');
    }
}
}