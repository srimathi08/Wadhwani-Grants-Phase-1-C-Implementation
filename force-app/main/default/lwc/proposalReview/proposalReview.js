import { LightningElement, wire, track } from 'lwc';
import getSubmittedProposals from '@salesforce/apex/ProposalReviewController.getSubmittedProposals';
import getCOEAccounts from '@salesforce/apex/ProposalReviewController.getCOEAccounts';
import updateProposalStatus from '@salesforce/apex/ProposalReviewController.updateProposalStatus';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class ProposalReviewDashboard extends NavigationMixin(LightningElement) {

    @track proposals    = [];
    @track allProposals = [];
    @track coeOptions   = [];

    selectedCoEId = null;
    searchKey     = '';
    wiredResult;

    // Modal state
    @track showModal    = false;
    @track comments     = '';
    @track isSubmitting = false;
    pendingProposalId   = null;
    pendingActionType   = null;

    /* =====================================================
       FETCH COE ACCOUNTS (Dropdown)
    ===================================================== */
    @wire(getCOEAccounts)
    wiredCOEs({ data, error }) {
        if (data) {
            this.coeOptions = [
                { label: 'All COEs', value: null },
                ...data.map(coe => ({
                    label: coe.Name,
                    value: coe.Id
                }))
            ];
        } else if (error) {
            console.error(error);
        }
    }

    /* =====================================================
       FETCH PROPOSALS (COE FILTERED)
    ===================================================== */
    @wire(getSubmittedProposals, { coeId: '$selectedCoEId' })
    wiredProposals(result) {
        this.wiredResult = result;

        const { data, error } = result;

        if (data) {
            this.prepareTable(data);
            this.allProposals = [...this.proposals];
        } else if (error) {
            console.error(error);
        }
    }

    /* =====================================================
       HANDLE COE CHANGE
    ===================================================== */
    handleCoeChange(event) {
        this.selectedCoEId = event.detail.value || null;
    }

    /* =====================================================
       TRANSFORM DATA
    ===================================================== */
    prepareTable(data) {

        this.proposals = data.map(proposal => {

            const reviews = (proposal.reviews || []).map((review, index) => {
                return {
                    ...review,
                    reviewStatus: review.reviewStatus ? review.reviewStatus : '—',
                    isFirst: index === 0,
                    rowKey: `${proposal.proposalId}-${index}`
                };
            });

            let decisionClass = '';
            if (proposal.finalDecision === 'Approved - Level 1') {
                decisionClass = 'decision-approved';
            } else if (proposal.finalDecision === 'Rejected - Level 1') {
                decisionClass = 'decision-rejected';
            }

            return {
                ...proposal,
                reviews: reviews,
                rowspan: reviews.length || 1,
                disableApprove: proposal.disableApprove,
                decisionTaken: proposal.decisionTaken,
                finalDecision: proposal.finalDecision,
                decisionClass: decisionClass
            };
        });
    }

    /* =====================================================
       SEARCH
    ===================================================== */
    handleSearch(event) {
        this.searchKey = event.target.value.toLowerCase();

        if (!this.searchKey) {
            this.proposals = [...this.allProposals];
            return;
        }

        this.proposals = this.allProposals.filter(proposal => {

            const proposalName = proposal.proposalName ? proposal.proposalName.toLowerCase() : '';
            const projectTitle = proposal.projectTitle ? proposal.projectTitle.toLowerCase() : '';
            const focusArea    = proposal.primaryFocusArea ? proposal.primaryFocusArea.toLowerCase() : '';

            return (
                proposalName.includes(this.searchKey) ||
                projectTitle.includes(this.searchKey) ||
                focusArea.includes(this.searchKey)
            );
        });
    }

    /* =====================================================
       NAVIGATION
    ===================================================== */
    navigateToRecord(event) {
        const recordId = event.currentTarget.dataset.id;

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'IndividualApplication',
                actionName: 'view'
            }
        });
    }

    /* =====================================================
       OPEN MODAL — APPROVE
    ===================================================== */
    handleApproveClick(event) {
        this.pendingProposalId = event.currentTarget.dataset.id;
        this.pendingActionType = 'approve';
        this.comments          = '';
        this.showModal         = true;
    }

    /* =====================================================
       OPEN MODAL — REJECT
    ===================================================== */
    handleRejectClick(event) {
        this.pendingProposalId = event.currentTarget.dataset.id;
        this.pendingActionType = 'reject';
        this.comments          = '';
        this.showModal         = true;
    }

    /* =====================================================
       MODAL COMPUTED PROPERTIES
    ===================================================== */
    get modalTitle() {
        return this.pendingActionType === 'approve'
            ? 'Approve Proposal'
            : 'Reject Proposal';
    }

    get modalConfirmLabel() {
        return this.pendingActionType === 'approve' ? 'Approve' : 'Reject';
    }

    get modalConfirmVariant() {
        return this.pendingActionType === 'approve' ? 'brand' : 'destructive';
    }

    /* =====================================================
       MODAL — COMMENTS CHANGE
    ===================================================== */
    handleCommentsChange(event) {
        this.comments = event.detail.value;
    }

    /* =====================================================
       MODAL — CLOSE / CANCEL
    ===================================================== */
    handleModalClose() {
        this.showModal         = false;
        this.comments          = '';
        this.pendingProposalId = null;
        this.pendingActionType = null;
        this.isSubmitting      = false;
    }

    /* =====================================================
       MODAL — CONFIRM (SUBMIT)
    ===================================================== */
    handleModalConfirm() {
        this.isSubmitting = true;

        updateProposalStatus({
            proposalId : this.pendingProposalId,
            actionType : this.pendingActionType,
            comments   : this.comments
        })
        .then(() => {
            const successMsg = this.pendingActionType === 'approve'
                ? 'Proposal Approved'
                : 'Proposal Rejected';

            this.showToast('Success', successMsg, 'success');
            this.handleModalClose();
            return refreshApex(this.wiredResult);
        })
        .then(() => {
            this.allProposals = [...this.proposals];
        })
        .catch(error => {
            console.error(error);
            this.showToast(
                'Error',
                this.pendingActionType === 'approve' ? 'Approval failed' : 'Rejection failed',
                'error'
            );
            this.isSubmitting = false;
        });
    }

    /* =====================================================
       TOAST
    ===================================================== */
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant })
        );
    }
}