import { LightningElement, wire } from 'lwc';
import getMilestones from '@salesforce/apex/CoeMilestoneController.getMilestones';
import createDisbursement from '@salesforce/apex/CoeMilestoneController.createDisbursement';

export default class CoeProjectMilestones extends LightningElement {

    appId;
    milestones;
    amounts = {};

    connectedCallback() {
        this.appId = new URLSearchParams(window.location.search).get('appId');
    }

    @wire(getMilestones, { appId:'$appId' })
    wired({ data }) {
        if (data) this.milestones = data;
    }

    handleAmt(e) {
        this.amounts[e.target.dataset.id] = e.target.value;
    }

    disburse(e) {
        createDisbursement({
            milestoneId:e.target.dataset.id,
            amount:this.amounts[e.target.dataset.id]
        });
    }
}