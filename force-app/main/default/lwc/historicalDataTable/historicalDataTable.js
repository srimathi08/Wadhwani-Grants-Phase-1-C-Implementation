import { LightningElement, api, wire } from 'lwc';
import getHistoricalData from '@salesforce/apex/HistoricalDataController.getHistoricalData';

export default class HistoricalDataTable extends LightningElement {
    @api recordId; // IndividualApplication recordId passed automatically on record page

    historicalData;

    @wire(getHistoricalData, { individualApplicationId: '$recordId' })
    wiredHistoricalData({ error, data }) {
        if (data) {
            this.historicalData = data;
        }
        // handle error if needed
    }
}