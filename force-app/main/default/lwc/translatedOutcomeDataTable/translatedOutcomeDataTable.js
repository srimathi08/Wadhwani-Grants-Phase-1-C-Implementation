import { LightningElement, api, wire } from 'lwc';
import getOutcomeData from '@salesforce/apex/translatedOutcomeDataTableController.getOutcomeData';

export default class TranslatedOutcomeDataTable extends LightningElement {
      @api recordId;
        outcomeData;
        orgArea;
    
        @wire(getOutcomeData, { translatedProposalId: '$recordId' })
        wiredOutcomeData({ error, data }) {
            if (data) {
                this.orgArea = data.orgArea;
                console.log('Value',this.orgArea);
                this.outcomeData = data.outcomeData;
            }
        }
    
        // Helper getters for table display logic
        get showJobFulfillment() {
            return this.orgArea === 'Job Fulfillment Only' || this.orgArea === 'Both Job Fulfillment and Job Creation';
        }
        get showJobCreation() {
            return this.orgArea === 'Job Creation Only' || this.orgArea === 'Both Job Fulfillment and Job Creation';
        }
}