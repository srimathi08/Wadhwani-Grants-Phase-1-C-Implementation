import { LightningElement,wire, api } from 'lwc';
import getHistoricalData from '@salesforce/apex/TranslatedHistoricalDataController.getHistoricalData';

export default class TranslatedHistoricalDataTable extends LightningElement {
     @api recordId; 
    
        historicalData;
    
        @wire(getHistoricalData, { translatedProposalId: '$recordId' })
        wiredHistoricalData({ error, data }) {
            if (data) {
                this.historicalData = data;
            }
            // handle error if needed
        }
}