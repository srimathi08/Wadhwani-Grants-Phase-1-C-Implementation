import { LightningElement, api, wire } from 'lwc';
import getReviewersWithStatus from '@salesforce/apex/ReviewerStatusController.getReviewersWithStatus';

export default class ApplicationReviewStatus extends LightningElement {
    @api recordId;
    reviewers = [];
    error;
    averageScore = 0;

    @wire(getReviewersWithStatus, { applicationId: '$recordId' })
    wiredReviewers({ data, error }) {
        if (data) {
            let total = 0;
            let count = 0;

            this.reviewers = data.map(item => {
                const score = (item.status === 'Yet to Start' || !item.totalScore) ? 0 : item.totalScore;
                total += score;
                count++;
                return {
                    ...item,
                    displayScore: score,
                    statusClass: this.getStatusClass(item.status)
                };
            });

            this.averageScore = count > 0 ? (total / count).toFixed(2) : 0;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.reviewers = [];
        }
    }

    getStatusClass(status) {
    switch (status) {
        case 'Completed':
            return 'status-badge status-completed';
        case 'Yet to Start':
            return 'status-badge status-yet-to-start';
        case 'In Progress':
            return 'status-badge status-in-progress';
        default:
            return 'status-badge';
    }
}

}