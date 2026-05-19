import { LightningElement, track } from 'lwc';
import getApprovedProposals from '@salesforce/apex/ApprovedProposalsController.getApprovedProposals';
import handleProposalAction from '@salesforce/apex/ApprovedProposalsController.handleProposalAction';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ApprovedProposalsDashboard extends LightningElement {

    @track proposals = [];
    @track approvedCount = 0;
    @track fundingCount = 0;
    @track notRecommendedCount = 0;
    @track resubmissionCount = 0;
    @track showModal = false;
    @track selectedRecordId;
    @track selectedAction;
    @track comments = '';

    currentPage = 1;
    totalPages = 1;
    pageSize = 5;

    actionOptions = [
        { label: 'Approved for Funding', value: 'Approved for Funding' },
        { label: 'Not Recommended for Funding', value: 'Not Recommended for Funding' },
        { label: 'Approved with Resubmission', value: 'Approved with Resubmission' }
    ];

    connectedCallback() {
        this.loadData();
    }

    loadData() {
        getApprovedProposals({ pageNumber: this.currentPage, pageSize: this.pageSize })
            .then(result => {

                // ✅ Only addition: recordUrl for UI
                this.proposals = result.records.map(rec => ({
                    ...rec,
                    selectedAction: null,
                    recordUrl: `/lightning/r/IndividualApplication/${rec.Id}/view`
                }));

                this.totalPages = result.totalPages;
                this.approvedCount = result.approvedCount;
                this.fundingCount = result.fundingCount;
                this.notRecommendedCount = result.notRecommendedCount;
                this.resubmissionCount = result.resubmissionCount;
            })
            .catch(error => console.error('Error fetching proposals', error));
    }

    handleActionChange(event) {
        this.selectedRecordId = event.target.dataset.id;
        this.selectedAction = event.detail.value;
        this.showModal = true;
    }

    handleCommentChange(event) {
        this.comments = event.target.value;
    }

    closeModal() {
        this.showModal = false;
        this.comments = '';
        this.selectedAction = '';
    }

    submitAction() {
        if (!this.selectedAction) {
            this.showToast('Error', 'Please select an action before submitting.', 'error');
            return;
        }

        handleProposalAction({
            recordId: this.selectedRecordId,
            actionValue: this.selectedAction,
            comments: this.comments
        })
            .then(() => {
                this.showToast('Success', `Action "${this.selectedAction}" applied successfully.`, 'success');
                this.closeModal();
                this.loadData();
            })
            .catch(error => {
                console.error(error);
                this.showToast('Error', error.body.message, 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handlePrev() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadData();
        }
    }

    handleNext() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadData();
        }
    }
}