import { LightningElement, wire } from 'lwc';
import getApplicationsWithFiles from '@salesforce/apex/IndividualApplicationExportController.getApplicationsWithFiles';

export default class IndividualApplicationExport extends LightningElement {
       data = [];

    columns = [
        { label: 'Application Name', fieldName: 'appName' },
        { label: 'COE Approver', fieldName: 'approverName' },
        { label: 'Account', fieldName: 'accountName' },
        { label: 'Files', fieldName: 'files', wrapText: true }
    ];

    @wire(getApplicationsWithFiles)
    wiredApps({ data, error }) {
        if (data) {
            this.data = data;
        } else if (error) {
            console.error(error);
        }
    }

    downloadExcel() {
        let csv = 'Application Name,COE Approver,Account,Files\n';

        this.data.forEach(row => {
            csv += `"${row.appName}","${row.approverName}","${row.accountName}","${row.files}"\n`;
        });

        const element = document.createElement('a');
        element.href =
            'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        element.download = 'IndividualApplications.csv';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}