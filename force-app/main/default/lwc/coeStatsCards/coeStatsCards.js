import { LightningElement, wire } from 'lwc';
import getHomeStats from '@salesforce/apex/CoeHomeStatsController.getHomeStats';

export default class CoeStatsCards extends LightningElement {
    stats = {
        registeredPIs: 0,
        pendingReviews: 0,
        submittedToWIN: 0,
        availableFunds: 0
    };

    @wire(getHomeStats)
    wiredStats({ data, error }) {
        if (data) {
            this.stats = data;
        } else if (error) {
            console.error('Error fetching home stats', error);
        }
    }
}