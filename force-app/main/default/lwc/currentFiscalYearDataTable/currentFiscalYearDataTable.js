import { LightningElement, api, wire } from 'lwc';
import getCurrentFiscalYearData from '@salesforce/apex/CurrentFiscalYearDataController.getCurrentFiscalYearData';

export default class CurrentFiscalYearDataTable extends LightningElement {
       @api recordId; // IndividualApplication record Id

    currentData;

    @wire(getCurrentFiscalYearData, { individualApplicationId: '$recordId' })
    wiredData({ error, data }) {
        if (data) {
            this.currentData = data;
        }
    }
}