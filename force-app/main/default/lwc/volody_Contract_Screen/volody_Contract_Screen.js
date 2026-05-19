import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import ACCOUNT_NAME from '@salesforce/schema/Contact.Account.Name';
import CONTACT_EMAIL from '@salesforce/schema/Contact.Email';
import createVolodyContract from '@salesforce/apex/volody_screenController.createVolodyContract';

export default class Volody_Contract_Screen  extends LightningElement {
    @api recordId; // Contact ID from record page
    @track isModalOpen = false;
    @track companyName = '';
    @track requesterEmail = '';
    @track counterpartyName = '';
    @track contractTemplate = '';

    contractOptions = [
        { label: 'NDA', value: 'NDA' },
        { label: 'Grant Agreement', value: 'Grant Agreement' }
    ];

    // Fetch Contact's Account Name & Email
    @wire(getRecord, { recordId: '$recordId', fields: [ACCOUNT_NAME, CONTACT_EMAIL] })
    wiredContact({ error, data }) {
        if (data) {
            this.companyName = getFieldValue(data, ACCOUNT_NAME);
            this.requesterEmail = getFieldValue(data, CONTACT_EMAIL);
        } else if (error) {
            console.error('Error fetching Contact:', error);
        }
    }

    // Open modal
    openModal() {
        this.isModalOpen = true;
    }

    // Close modal
    closeModal() {
        this.isModalOpen = false;
    }

    // Handle input changes
    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    // Handle form submission
    handleSubmit() {
        if (!this.counterpartyName || !this.contractTemplate) {
            alert('Please fill all fields');
            return;
        }

        const contractData = {
            contactId: this.recordId,
            accountName: this.companyName,
            requesterEmail: this.requesterEmail,
            counterpartyName: this.counterpartyName,
            contractTemplate: this.contractTemplate
        };

        createVolodyContract({ contractDetails: contractData })
            .then(() => {
                alert('Contract sent successfully!');
                this.closeModal();
            })
            .catch(error => {
                console.error('Error creating contract:', error);
                alert('Failed to send NDA');
            });
    }
}