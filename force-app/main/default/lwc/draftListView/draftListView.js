import { LightningElement, wire, track } from 'lwc';
import getUserDraftApplications from '@salesforce/apex/listTableDraftController.getUserDraftApplications';
import { NavigationMixin } from 'lightning/navigation';

export default class DraftListView extends NavigationMixin(LightningElement) {
        @track draftRecords = [];
        isLoading = true;
        hasError = false;
    
        columns = [
            { label: 'Application ID', fieldName: 'Name'},
            { label: 'Project Title', fieldName: 'Project_Title__c' },
            { label: 'Focus Area', fieldName: 'Primary_Focus_Area__c' },
            { label: 'Status', fieldName: 'Status' },
            { label: 'Last Modified', fieldName: 'LastModifiedDate', type: 'date' },
            {
                type: 'button',
                label: 'Action',
                typeAttributes: {
                    label: 'Resume Form',
                    name: 'resume',
                    variant: 'brand',
                    title: 'Resume your draft form'
                }
            }
        ];
    
        @wire(getUserDraftApplications)
        wiredDrafts({ data, error }) {
            this.isLoading = false;
            if (data) {
                //this.draftRecords = data;
                 this.draftRecords = data.map(rec => ({
                ...rec,
                formattedDate: rec.LastModifiedDate
                    ? rec.LastModifiedDate.split('T')[0]
                    : ''
            }));
                this.hasError = false;
            } else if (error) {
                console.error('Error loading drafts:', error);
                this.hasError = true;
            }
        }
    
        handleRowAction(event) {
            const action = event.detail.action;
            const row = event.detail.row;
    
            if (action.name === 'resume') {
                const recordId = row.Id;
                this[NavigationMixin.Navigate]({
                    type: 'standard__webPage',
                    attributes: {
                       url: `/draftformsb?recordId=${recordId}` //   /resumesavedraftwin?recordId=${recordId}
                    }
                });
            }
        }
        handleResume(event) {
    const recordId = event.target.dataset.id;
    this[NavigationMixin.Navigate]({
        type: 'standard__webPage',
        attributes: {
            url: `/draftformsb?recordId=${recordId}`
        }
    });
}

    }