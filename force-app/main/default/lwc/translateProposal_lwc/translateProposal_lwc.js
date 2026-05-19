import { LightningElement, api, track } from 'lwc';
import createOrTriggerTranslation from '@salesforce/apex/ProposalTranslationController.createOrTriggerTranslation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TranslateProposal_lwc extends LightningElement {
      @api recordId; // Passed from record page

    @track isTranslating = false;

    handleTranslate() {
        this.isTranslating = true;
        console.log('recordId',this.recordId);
         console.log("Inside apex method");
        createOrTriggerTranslation({ proposalId: this.recordId, targetLanguage: 'en' })      
            .then(result => {
                this.isTranslating = false;
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: 'Translation requested. You will be redirected when ready.',
                    variant: 'success'
                }));
                 // Wait 1s so user sees toast
                setTimeout(() => {
                    // Best practice: use URL with id query param
                    window.open(`/reviewersite/s/translated-proposal/${result}/view`, '_blank');
                }, 1000);
            })
            .catch(error => {
    this.isTranslating = false;
    console.error('Apex Error:', error); // Full error object
    if (error.body && error.body.message) {
        console.error('Apex Error Message:', error.body.message); // Just the message
    }
    this.dispatchEvent(new ShowToastEvent({
        title: 'Error',
        message: error.body && error.body.message ? error.body.message : 'An error occurred.',
        variant: 'error'
    }));
});
    }
}