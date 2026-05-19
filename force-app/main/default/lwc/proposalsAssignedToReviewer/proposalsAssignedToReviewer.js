import { LightningElement, api, wire } from 'lwc';
import getSharedApplications from '@salesforce/apex/ProposalsAssignedToReviewers.getSharedApplications';

export default class ProposalTable extends LightningElement {
    @api recordId;
    proposals = [];
    error;

    @wire(getSharedApplications, { accountId: '$recordId' })
    wiredData({ error, data }) {
        if (data) {
            // Add statusClass field to each row
            this.proposals = data.map((row) => ({
                ...row,
                statusClass:
                    row.ReviewStatus === 'Yet to Start'
                        ? 'status-pill not-started'
                        : 'status-pill submitted'
            }));
            this.error = undefined;
        } else if (error) {
            this.error = error.body.message;
            this.proposals = [];
        }
    }
}