import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createFundingDisbursement from '@salesforce/apex/CoeMilestoneController.createFundingDisbursement';

export default class CoeManageFundModal extends LightningElement {
    @track isOpen = false;

    appId;
    milestoneId;
    milestoneName;

    // NEW FIELDS
    @track budgetRequired;
    @track approvedAmount;

    fixedDocs = ['Milestone Report', 'Deliverables', 'UC', 'SoE'];

    @track extraDocs = [];
    @track comments = '';
    @track disbursementDate;

    docCounter = 1;

    @api
    openModal({ appId, milestoneId, milestoneName, budgetRequired, approvedAmount }) {
        this.appId = appId;
        this.milestoneId = milestoneId;
        this.milestoneName = milestoneName;

        // prefill from milestone tile
        this.budgetRequired = budgetRequired;
        this.approvedAmount = approvedAmount;

        this.comments = '';
        this.disbursementDate = null;

        this.docCounter = 1;
        this.extraDocs = [{ id: this.docCounter, value: '' }];

        this.isOpen = true;
    }

    close() {
        this.isOpen = false;
    }

    handleBudgetRequired(event) {
        this.budgetRequired = event.target.value;
    }

    handleApprovedAmount(event) {
    this.approvedAmount = event.target.value ? Number(event.target.value) : null;
}


    handleAddMore() {
        this.docCounter += 1;
        this.extraDocs = [...this.extraDocs, { id: this.docCounter, value: '' }];
    }

    handleExtraDocChange(event) {
        const id = Number(event.currentTarget.dataset.id);
        const value = event.target.value;

        this.extraDocs = this.extraDocs.map((row) =>
            row.id === id ? { ...row, value } : row
        );
    }

    handleComments(event) {
        this.comments = event.target.value;
    }

    handleDate(event) {
    const value = event.target.value;
    if (value) {
        this.disbursementDate = new Date(value).toISOString();
    } else {
        this.disbursementDate = null;
    }
}


    buildRequestedDocsText() {
        const extras = (this.extraDocs || [])
            .map((x) => (x.value || '').trim())
            .filter((x) => !!x);

        return [...this.fixedDocs, ...extras].join('\n');
    }

    async handleSubmit() {
    try {
        if (!this.approvedAmount || Number(this.approvedAmount) <= 0) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing Approved Amount',
                    message: 'Please enter Approved Amount before submitting.',
                    variant: 'error'
                })
            );
            return;
        }

        if (!this.disbursementDate) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing Disbursement Date',
                    message: 'Please select Date of Funds Disbursed.',
                    variant: 'error'
                })
            );
            return;
        }

        const requestedDocs = this.buildRequestedDocsText();

        await createFundingDisbursement({
            appId: this.appId,
            milestoneId: this.milestoneId,
            requestedDocs,
            comments: this.comments,
            disbursementDate: this.disbursementDate,
            approvedAmount: this.approvedAmount
        });

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Submitted',
                message: 'Funding Disbursement record created successfully.',
                variant: 'success'
            })
        );

        this.close();
        window.location.reload();
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: e?.body?.message || 'Failed to create Funding Disbursement.',
                variant: 'error'
            })
        );
    }
    }
}