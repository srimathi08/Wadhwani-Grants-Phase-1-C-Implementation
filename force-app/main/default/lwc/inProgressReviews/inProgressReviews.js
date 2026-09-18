import { LightningElement, wire, track } from 'lwc';
import getInProgressReviews
    from '@salesforce/apex/InProgressReviewsController.getInProgressReviews';

/* =========================
   Datatable Columns
   ========================= */
const COLUMNS = [
    {
        label: 'COE Name',
        fieldName: 'coeName',
        wrapText: true
    },
    {
        label: 'Application Name',
        fieldName: 'applicationName',
        type: 'button',
        wrapText: true,
        typeAttributes: {
            label: { fieldName: 'applicationName' },
            name: 'openApplication',
            variant: 'base'   // makes it look like a link (blue)
        }
    },
    {
        label: 'Project Title',
        fieldName: 'projectTitle',
        wrapText: true
    },
    {
        label: 'Primary Focus Area',
        fieldName: 'primaryFocusArea',
        wrapText: true
    },
    {
        label: 'Status',
        fieldName: 'status',
        cellAttributes: {
            class: { fieldName: 'statusClass' }
        }
    }
];

export default class InProgressReviews extends LightningElement {

    /* =========================
       Component State
       ========================= */
    columns = COLUMNS;

    @track data = [];
    @track error = null;
    @track isLoading = true;

    /* =========================
       Data Wire
       ========================= */
    @wire(getInProgressReviews)
    wiredReviews({ data, error }) {

        // Stop spinner once wire fires
        this.isLoading = false;

        if (data) {
            this.data = data.map(row => ({
                ...row,
                statusClass:
                    row.status === 'Draft' ? 'status-draft' : ''
            }));

            this.error = null;

        } else if (error) {
            console.error('InProgressReviews error:', error);
            this.error = error;
            this.data = [];
        }
    }

    /* =========================
       Row Action Handler
       ========================= */
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        if (actionName === 'openApplication') {
            window.location.href =
                `/reviewportal/s/individualapplication/${row.applicationId}`;
        }
    }
}