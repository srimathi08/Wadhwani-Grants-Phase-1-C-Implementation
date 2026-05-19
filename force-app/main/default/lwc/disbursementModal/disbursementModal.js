import { LightningElement, api, track } from 'lwc';
import getMilestone from '@salesforce/apex/FundingAwardService.getMilestone';
import createDisbursement from '@salesforce/apex/FundingAwardService.createDisbursement';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class DisbursementModal extends LightningElement {

    @api milestoneId;
    @api fundingAwardId;

    @track milestoneName;
    @track disbursementDate;
    @track amount;
    @track comments;

    @track documents = [];

    connectedCallback() {
        console.log('Funding Award ID:', this.fundingAwardId);
        console.log('Milestone ID:', this.milestoneId);

        this.documents = [
            { id: 1, value: 'Milestone Report' },
            { id: 2, value: 'UC' },
            { id: 3, value: 'SoE' },
            { id: 4, value: 'Deliverable' }
        ];

        getMilestone({ milestoneId: this.milestoneId })
            .then(res => {
                this.milestoneName = res.Name;
            })
            .catch(err => console.error(err));
    }

    addDocument() {
        this.documents = [...this.documents, { id: Date.now(), value: '' }];
    }

    updateDocument(event) {
        const id = event.target.dataset.id;
        const value = event.target.value;

        this.documents = this.documents.map(doc =>
            doc.id == id ? { ...doc, value } : doc
        );
    }

    handleChange(event) {
        const label = event.target.label;
        const value = event.target.value;

        if (label === 'Disbursement Date') this.disbursementDate = value;
        if (label === 'Amount') this.amount = value;
        if (label === 'Comments') this.comments = value;
    }

    closeModal() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

  submitForm() {

    let finalDateTime = null;

    if (this.disbursementDate) {
        finalDateTime = new Date(this.disbursementDate).toISOString();
    }

    const payload = {
        milestoneId: this.milestoneId,
        fundingAwardId: this.fundingAwardId,
        disbursementDate: finalDateTime,
        amount: this.amount ? Number(this.amount) : null,
        comments: this.comments,
        documents: this.documents.map(d => ({ value: d.value }))
    };

    console.log('=== FINAL PAYLOAD SENT TO APEX ===');
    console.log(JSON.stringify(payload));

  createDisbursement({ payloadJson: JSON.stringify(payload) })
        .then(() => {
             // SUCCESS TOAST
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Disbursement successfully created for the milestone.',
                        variant: 'success',
                        mode: 'dismissable'
                    })
                );
            this.dispatchEvent(new CustomEvent('refresh'));
            this.dispatchEvent(new CustomEvent('closemodal'));
        })
        .catch(error => {
            console.error('Insert Failed:', JSON.stringify(error));
            alert(JSON.stringify(error));
        });
}

}