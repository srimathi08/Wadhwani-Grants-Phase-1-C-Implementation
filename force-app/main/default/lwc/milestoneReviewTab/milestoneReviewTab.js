import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

import getMilestonesByProposal from '@salesforce/apex/AwardeeModuleController.getMilestonesByProposal';
import getProposalHeader from '@salesforce/apex/AwardeeModuleController.getProposalHeader';
import markMilestoneCompleted from '@salesforce/apex/AwardeeModuleController.markMilestoneCompleted';

// ✅ Only this status unlocks Tick / Review Report / Send to Reviewer
const REQUIRED_STATUS_FOR_ACTIONS = 'Report Approved';

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
                const status = (m.Status__c || '').trim();
                const isDone = status.toLowerCase().includes('complete');
                const isReportApproved = status === REQUIRED_STATUS_FOR_ACTIONS;

                // ✅ Actions (tick / Review Report / Send to Reviewer) only unlock on "Report Approved"
                const actionsDisabled = !isReportApproved;

                return {
                    ...m,
                    statusClass: this.getStatusClass(status),

                    // ✅ Tick button UI state
                    completeBtnClass: isDone
                        ? 'tickBtn done'
                        : (isReportApproved ? 'tickBtn pulse' : 'tickBtn disabled'),
                    completeBtnTitle: isDone
                        ? 'Already completed'
                        : (isReportApproved
                            ? 'Mark as Completed'
                            : 'Available only when status is Report Approved'),

                    // ✅ shared disabled flag for tick / Review Report / Send to Reviewer
                    actionsDisabled,
                    tickDisabled: isDone || actionsDisabled
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
       (always available regardless of status)
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
       ✅ Review Report -> open IndividualApplication record page
       Gated on Report Approved status
    --------------------------------------------- */
    handleReviewReport(event) {
        const propId = event.currentTarget.dataset.propid || this.proposalId;
        const milestoneId = event.currentTarget.dataset.id;

        if (!this.isActionAllowed(milestoneId)) {
            return;
        }

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
       ✅ Tick button -> Mark Completed
       Gated on Report Approved status
    --------------------------------------------- */
    handleMarkCompleted(event) {
        const milestoneId = event.currentTarget.dataset.id;

        if (!this.isActionAllowed(milestoneId)) {
            return;
        }

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
       Gated on Report Approved status
    --------------------------------------------- */
    handleSendToReviewer(event) {
        const milestoneId = event.currentTarget.dataset.id;

        if (!this.isActionAllowed(milestoneId)) {
            return;
        }

        this.selectedMilestoneId = milestoneId;

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
       ✅ Shared guard: is this milestone's status "Report Approved"?
    --------------------------------------------- */
    isActionAllowed(milestoneId) {
        const existing = this.milestones.find(x => x.Id === milestoneId);
        const status = (existing?.Status__c || '').trim();

        if (status !== REQUIRED_STATUS_FOR_ACTIONS) {
            this.showToast(
                'Info',
                'This action is only available when the milestone status is Report Approved.',
                'info'
            );
            return false;
        }
        return true;
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