import { LightningElement } from 'lwc';
import getApplicationsByStatus from '@salesforce/apex/ValidatorApplicationController.getApplicationsByStatus';
import { NavigationMixin } from 'lightning/navigation';

const PAGE_TO_STATUS = {
    'validator-draft':             'Draft',
    'validator-yet-to-start':      'Yet to start',
    'validator-in-progress':       'In Progress',
    'validator-review-submitted':  'Review Submitted',
    'validator-reviewer-rejected': 'Reviewer Rejected',
    'validator-not-approved':      'Not Approved',
    'validator-sealed':            'Sealed'
};

export default class ValidatorApplicationList extends NavigationMixin(LightningElement) {
    applications = [];
    status = '';
    isLoading = true;
    error = '';

    connectedCallback() {
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts[pathParts.length - 1];
        this.status = PAGE_TO_STATUS[slug] || '';
        this.loadApplications();
    }

    async loadApplications() {
        try {
            this.isLoading = true;
            const data = await getApplicationsByStatus({ status: this.status });
            // Map correct API field names
            this.applications = data.map(app => ({
                Id: app.Id,
                Name: app.Name,
                ApplicationId: app.ApplicationId,   // correct field
                Status: app.Status,
                DueDate: app.Due_Date__c || '—'                   // correct field (no __c)
            }));
        } catch (error) {
            console.error('Error:', error);
            this.error = error.body?.message || 'Unknown error';
        } finally {
            this.isLoading = false;
        }
    }

    handleReview(event) {
        const recordId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                actionName: 'view'
            }
        });
    }

    get hasApplications() {
        return this.applications && this.applications.length > 0;
    }

    get isEmpty() {
        return !this.isLoading && (!this.applications || this.applications.length === 0);
    }
}