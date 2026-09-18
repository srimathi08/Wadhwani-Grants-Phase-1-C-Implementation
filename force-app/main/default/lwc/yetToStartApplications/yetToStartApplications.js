import { LightningElement, wire } from 'lwc';
import getYetToStartApplications
    from '@salesforce/apex/YetToStartApplicationsController.getYetToStartApplications';

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
            variant: 'base'   // 🔴 red like In Progress
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
    }
];

export default class YetToStartApplications extends LightningElement {

    columns = COLUMNS;
    data = [];
    error;

    @wire(getYetToStartApplications)
    wiredApps({ data, error }) {
        if (data) {
            this.data = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.data = [];
        }
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        if (actionName === 'openApplication') {
            window.location.href =
                `/reviewportal/s/individualapplication/${row.applicationId}`;
        }
    }
}