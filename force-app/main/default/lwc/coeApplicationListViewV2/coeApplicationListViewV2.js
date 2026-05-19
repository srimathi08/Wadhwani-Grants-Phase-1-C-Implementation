import { LightningElement, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getApplications from '@salesforce/apex/CoeApplicationListController.getApplications';

export default class CoeApplicationListViewV2 extends NavigationMixin(LightningElement) {

    statusKey;
    year;
    month;  // ✅ NEW: month from page state
    records;
    error;

    columns = [
        {
            label: 'Application Name',
            fieldName: 'Name',
            type: 'button',
            typeAttributes: {
                label: { fieldName: 'Name' },
                name: 'view_record',
                variant: 'base'
            }
        },
        { label: 'Status',       fieldName: 'Status' },
        { label: 'Created Date', fieldName: 'CreatedDate', type: 'date' }
    ];

    @wire(CurrentPageReference)
    getStateParameters(pageRef) {
        if (pageRef) {
            this.statusKey = pageRef.state.c__statusKey;
            this.year      = parseInt(pageRef.state.c__year,  10);

            // ✅ month: convert 'all' sentinel to null for Apex
            const rawMonth = pageRef.state.c__month;
            this.month = (rawMonth && rawMonth !== 'all')
                ? parseInt(rawMonth, 10)
                : null;

            this.loadData();
        }
    }

    loadData() {
        getApplications({
            statusKey:     this.statusKey,
            selectedYear:  this.year,
            selectedMonth: this.month   // ✅ NEW param
        })
        .then(result => {
            this.records = result;
            this.error   = undefined;
        })
        .catch(error => {
            this.error   = error.body?.message || 'An error occurred';
            this.records = undefined;
        });
    }

    handleRowAction(event) {
        const recordId = event.detail.row.Id;

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId:      recordId,
                objectApiName: 'IndividualApplication',
                actionName:    'view'
            }
        });
    }

    get noData() {
        return this.records && this.records.length === 0;
    }
}