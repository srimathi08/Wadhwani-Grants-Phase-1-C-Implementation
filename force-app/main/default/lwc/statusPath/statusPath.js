import { LightningElement, track, wire } from 'lwc';
import GETSTATUS from '@salesforce/apex/PathStatusController.getStatuses';

export default class StatusProgressBar extends LightningElement {
    @track statusBoxes = [];

    // Wire the Apex method to retrieve statuses
    @wire(GETSTATUS)
    wiredStatuses({ error, data }) {
        if (data) {
            console.log('Apex Data:', data);
            this.setStatusBoxes(data); // Populate the statusBoxes array
        } else if (error) {
            console.error('Error retrieving status data: ', error);
        }
    }

    // Method to update statusBoxes with data from Apex
    setStatusBoxes(data) {
        this.statusBoxes = [
            {
                key: 'institutionRegister',
                title: 'Institution Register',
                value: data.accountSubStage || '',
                colorClass: `status-box ${this.getColorClass(data.accountSubStage)}`, // Add 'status-box' class
                showArrow: true,
            },
            {
                key: 'coeProposal',
                title: 'COE Proposal',
                value: data.coeStatus || '',
                colorClass: `status-box ${this.getColorClass(data.coeStatus)}`, // Add 'status-box' class
                showArrow: true,
            },
            {
                key: 'projectApplication',
                title: 'Project Application',
                value: data.winStatus || '',
                colorClass: `status-box ${this.getColorClass(data.winStatus)}`, // Add 'status-box' class
                link: data.kanbanUrl,
                showArrow: true,
            },
            {
                key: 'applicationReview',
                title: 'Application Review',
                value: data.reviewStatus || '',
                colorClass: `status-box ${this.getColorClass(data.reviewStatus)}`, // Add 'status-box' class
            }
        ];
    }

    // Helper method to determine color class based on the status
    getColorClass(status) {
        // Example logic for determining color class, you can adjust based on actual logic
        if (status === 'Approved') {
            return 'green';
        } else if (status === 'Pending') {
            return 'yellow';
        } else if (status === 'In Progress') {
            return 'blue';
        } else if (status === 'Completed') {
            return 'gray';
        } else if (status === 'Rejected') {
            return 'red';
        } else {
            return 'gray'; // Default color
        }
    }
}





/*import { LightningElement, track } from 'lwc';
import GETSTATUS from '@salesforce/apex/PathStatusController.getStatuses';

export default class StatusProgressBar extends LightningElement {
    @track statusBoxes = [];
   
    
    connectedCallback() {
        this.statusBoxes = [
            {
                title: 'Institution Register',
                value: '',
                colorClass: '',
               // arrowClass: 'arrow green',
                showArrow: true
            },
            {
                title: 'COE Proposal',
                value: '',
                colorClass: '',
              //  arrowClass: 'arrow yellow',
                showArrow: true
            },
            {
                title: 'Project Application',
                value: '',
                colorClass: '',
               // arrowClass: 'arrow blue',
                link: '/lightning/o/IndividualApplication__c/list?filterName=Recent',
                showArrow: true
            },
            {
                title: 'Application Review',
                value: '',
                colorClass: '',
                // showArrow: true
            }
        ];
    }
}*/