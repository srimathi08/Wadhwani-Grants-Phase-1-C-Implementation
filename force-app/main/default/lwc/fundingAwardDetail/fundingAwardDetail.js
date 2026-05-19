import { LightningElement, api, wire, track } from 'lwc';
import getMilestones from '@salesforce/apex/FundingAwardService.getMilestones';
import { refreshApex } from '@salesforce/apex';

export default class FundingAwardDetail extends LightningElement {

    @api recordId; 
    @track milestones = [];
    @track showModal = false;
    @track selectedMilestoneId;

    wiredMilestonesResult;

    @wire(getMilestones, { fundingAwardId: '$recordId' })
    wiredMilestones(result) {
         console.log('=== WIRED MILESTONES RESULT ===', result);
        this.wiredMilestonesResult = result;

        if (result.data) {
            this.milestones = result.data.map(m => ({
                ...m,
                link: '/' + m.Id
            }));
        }
    }

    openModal(event) {
        this.selectedMilestoneId = event.target.dataset.id;
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
    }

    refreshData() {
        refreshApex(this.wiredMilestonesResult);
    }
}