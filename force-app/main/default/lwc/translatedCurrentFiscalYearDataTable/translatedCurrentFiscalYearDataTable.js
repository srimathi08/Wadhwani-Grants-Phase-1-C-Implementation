import { LightningElement, api, wire } from 'lwc';
import getCurrentFiscalYearData from '@salesforce/apex/TranslatedCurrentFiscalDataController.getCurrentFiscalYearData';


export default class TranslatedCurrentFiscalYearDataTable extends LightningElement {
      @api recordId; // translated Proposal record Id
    
        currentData;
    
        @wire(getCurrentFiscalYearData, { translatedProposalId: '$recordId' })
        wiredData({ error, data }) {
            if (data) {
                this.currentData = data;
            }
        }
}