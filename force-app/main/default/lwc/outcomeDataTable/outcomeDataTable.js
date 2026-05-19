import { LightningElement, api, wire } from 'lwc';
import getOutcomeData from '@salesforce/apex/OutcomeDataTableController.getOutcomeData';

export default class OutcomeDataTable extends LightningElement {
    @api recordId;
    outcomeData;
    orgArea;

    @wire(getOutcomeData, { individualApplicationId: '$recordId' })
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