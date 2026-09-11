import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getActionCounts from '@salesforce/apex/WCFValidatorController.getActionCounts';

export default class ValidatorDashboard extends NavigationMixin(LightningElement) {
    cards = [];

    connectedCallback() {
        this.loadCounts();
    }

    async loadCounts() {
        try {
            const data = await getActionCounts();

            this.cards = [
                {
                    id:            'pendingReview',
                    label:         'Draft Reviews',
                    subtitle:      'Draft & resumed proposals awaiting action',
                    count:         data?.resume ?? 0,
                    status:        'resume',
                    combinedClass: 'card card-pendingReview'
                },
                {
                    id:            'awaitingValidation',
                    label:         'Awaiting Validation',
                    subtitle:      'Submitted proposals ready to validate',
                    count:         data?.validate ?? 0,
                    status:        'validate',
                    combinedClass: 'card card-awaitingValidation'
                },
                {
                    id:            'sealed',
                    label:         'Validated',
                    subtitle:      'Completed & finalised records',
                    count:         data?.validated ?? 0,
                    status:        'validated',
                    combinedClass: 'card card-sealed'
                }
            ];
        } catch (error) {
            console.error('Error loading counts:', error);
        }
    }

    handleNavigate(event) {
        const status = event.currentTarget.dataset.status;
        if (status) {
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: { name: 'ValidatorPortal__c' },
                state: { statusFilter: status }
            });
        }
    }
}