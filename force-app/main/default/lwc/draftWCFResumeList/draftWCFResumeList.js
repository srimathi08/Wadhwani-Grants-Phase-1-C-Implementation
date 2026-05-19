import { LightningElement, wire, track } from 'lwc';
import getUserDraftApplications from '@salesforce/apex/listTableWCFDraftController.getUserDraftApplications';
import { NavigationMixin } from 'lightning/navigation';

export default class DraftWCFResumeList extends NavigationMixin(LightningElement) { @track draftRecords = [];
        isLoading = true;
        hasError = false;
    
        columns = [
            { label: 'Application ID', fieldName: 'Name'},
            { label: 'Organization Name', fieldName: 'Organization_Name__c' },
            { label: 'Submitter Name', fieldName: 'Submitter_Name__c' },
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
                this.draftRecords = data;
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
                       url: `/draftwcfform?recordId=${recordId}` //   /draftwcfform?recordId=${recordId}
                    }
                });
            }
        }
    }