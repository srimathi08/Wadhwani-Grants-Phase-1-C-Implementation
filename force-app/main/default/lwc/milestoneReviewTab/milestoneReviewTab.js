import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

import getMilestonesByProposal from '@salesforce/apex/AwardeeModuleController.getMilestonesByProposal';
import getProposalHeader from '@salesforce/apex/AwardeeModuleController.getProposalHeader';
import markMilestoneCompleted from '@salesforce/apex/AwardeeModuleController.markMilestoneCompleted';

export default class MilestoneReviewTab extends NavigationMixin(LightningElement) {

    @track proposalId;
    @track accountId;

    @track milestones = [];
    @track selectedMilestoneId;

    // ✅ Proposal Header Info
    @track proposalInfo;

    // ✅ Flow Modal state
    @track showFlowModal = false;

    // ✅ confirmed flow details
    FLOW_API_NAME = 'Share_Proposal_with_Reviewer_Group';
    FLOW_INPUT_VARIABLE = 'recordId';

    // ✅ for refresh
    wiredMilestonesResult;

    /* ---------------------------------------------
       Get state params from tab url
    --------------------------------------------- */
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference && currentPageReference.state) {
            this.proposalId = currentPageReference.state.c__proposalId;
            this.accountId = currentPageReference.state.c__accountId;
        }
    }

    /* ---------------------------------------------
       ✅ Fetch Proposal Header Info
    --------------------------------------------- */
    @wire(getProposalHeader, { proposalId: '$proposalId' })
    wiredProposalHeader({ data, error }) {
        if (data) {
            this.proposalInfo = data;
        } else if (error) {
            console.error('Proposal Header Load Error', error);
            this.proposalInfo = null;
        }
    }

    /* ---------------------------------------------
       Fetch milestones by proposal
    --------------------------------------------- */
    @wire(getMilestonesByProposal, { proposalId: '$proposalId' })
    wiredMilestones(result) {
        this.wiredMilestonesResult = result;

        const { data, error } = result;
        if (data) {
            this.milestones = (data || []).map(m => {
                const isDone = (m.Status__c || '').toLowerCase().includes('complete');

                return {
                    ...m,
                    statusClass: this.getStatusClass(m.Status__c),

                    // ✅ Tick button UI state
                    completeBtnClass: isDone ? 'tickBtn done' : 'tickBtn pulse',
                    completeBtnTitle: isDone ? 'Already completed' : 'Mark as Completed'
                };
            });
        } else if (error) {
            console.error('Milestone Load Error', error);
            this.milestones = [];
        }
    }

    getStatusClass(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('disbursed') || s.includes('complete')) return 'status-chip green';
        if (s.includes('pending')) return 'status-chip orange';
        if (s.includes('reject')) return 'status-chip red';
        return 'status-chip blue';
    }

    /* ---------------------------------------------
       View Details -> open milestone record page
    --------------------------------------------- */
    handleViewDetails(event) {
        const milestoneId = event.currentTarget.dataset.id;

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: milestoneId,
                objectApiName: 'Milestone__c',
                actionName: 'view'
            }
        });
    }

    /* ---------------------------------------------
       ✅ NEW: Review Report -> open IndividualApplication record page
    --------------------------------------------- */
    handleReviewReport(event) {
        const propId = event.currentTarget.dataset.propid || this.proposalId;

        if (!propId) {
            this.showToast('Error', 'Proposal record not found.', 'error');
            return;
        }

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: propId,
                objectApiName: 'IndividualApplication',
                actionName: 'view'
            }
        });
    }

    /* ---------------------------------------------
       ✅ NEW: Tick button -> Mark Completed
    --------------------------------------------- */
    handleMarkCompleted(event) {
        const milestoneId = event.currentTarget.dataset.id;

        // ✅ stop if already completed
        const existing = this.milestones.find(x => x.Id === milestoneId);
        const isDone = (existing?.Status__c || '').toLowerCase().includes('complete');

        if (isDone) {
            this.showToast('Info', 'Milestone already marked Completed.', 'info');
            return;
        }

        markMilestoneCompleted({ milestoneId })
            .then(() => {
                this.showToast('Success', 'Milestone marked as Completed.', 'success');
                return refreshApex(this.wiredMilestonesResult);
            })
            .catch(error => {
                console.error(error);
                this.showToast('Error', error?.body?.message || 'Unable to update Milestone', 'error');
            });
    }

    /* ---------------------------------------------
       Send To Reviewer -> open modal + start flow
    --------------------------------------------- */
    handleSendToReviewer(event) {
        this.selectedMilestoneId = event.currentTarget.dataset.id;

        if (!this.proposalId) {
            this.showToast('Error', 'Proposal Id not found. Please open from Awardee Module again.', 'error');
            return;
        }

        // ✅ open modal
        this.showFlowModal = true;

        // ✅ wait for modal to render then start flow
        setTimeout(() => {
            const flow = this.template.querySelector('lightning-flow');
            if (!flow) {
                this.showToast('Error', 'Flow component not found.', 'error');
                return;
            }

            const inputVariables = [
                {
                    name: this.FLOW_INPUT_VARIABLE,
                    type: 'String',
                    value: this.proposalId
                }
            ];

            flow.startFlow(this.FLOW_API_NAME, inputVariables);
        }, 0);
    }

    /* ---------------------------------------------
       Close modal manually
    --------------------------------------------- */
    closeFlowModal() {
        this.showFlowModal = false;
    }

    /* ---------------------------------------------
       Flow status handler
    --------------------------------------------- */
    handleFlowStatus(event) {
        const status = event.detail.status;

        if (status === 'FINISHED') {
            this.showToast('Success', 'Shared successfully with Reviewer Group.', 'success');
            this.showFlowModal = false;
        }
    }

    /* ---------------------------------------------
       Toast helper
    --------------------------------------------- */
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}