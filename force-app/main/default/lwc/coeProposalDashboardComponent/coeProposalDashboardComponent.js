import { LightningElement, track } from 'lwc';
import getProposalCounts from '@salesforce/apex/ProposalDashboardController.getProposalCounts';

export default class CoeProposalDashboardComponent extends LightningElement {

    @track cards = [];

    connectedCallback() {
        this.loadCounts();
    }

    async loadCounts() {
        try {
            const data = await getProposalCounts();

            const make = (id, label, count, listViewApiName) => ({
                id,
                label,
                count: count ?? 0,
                combinedClass: 'card',
                listViewApiName
            });

            // Row 1 - COE
            const row1 = [
                make('submitted', 'Proposal Submitted to COE Admin', data?.SubmittedToCOE, 'Proposal_Submitted_COE_Admin'),
                make('approved', 'Proposal Approved by COE Admin', data?.ApprovedByCOE, 'Proposal_Approved_COE_Admin'),
                make('rejected', 'Proposal Not Shortlisted by COE Admin', data?.RejectedByCOE, 'Proposal_Rejected_COE_Admin'),
                make('resubmission', 'Proposal Asked for Resubmission by COE Admin', data?.ResubmissionByCOE, 'Proposal_Resubmission_COE_Admin')
            ];

            // Row 2 - WIN
            const row2 = [
                make('resubmittedPI', 'Proposal Resubmitted by PI', data?.ResubmittedByPI, 'Proposal_Resubmitted_By_PI'),
                make('submittedWin', 'Proposal Submitted to WIN Admin', data?.SubmittedToWIN, 'Proposal_Submitted_WIN_Admin'),
                make('approvedWin', 'Proposal Approved by WIN Admin', data?.ApprovedByWIN, 'Proposal_Approved_WIN_Admin'),
                make('rejectedWin', 'Proposal Not Shortlisted by WIN Admin', data?.RejectedByWIN, 'Proposal_Rejected_WIN_Admin')
            ];

            // Row 3 - Funding
            const row3 = [
                make('askedResubmissionWin', 'Proposal Asked for Resubmission by WIN Admin', data?.AskedResubmissionWIN, 'Proposal_AskedResubmission_WIN_Admin'),
                make('resubmittedWin', 'Proposal Resubmitted to WIN Admin', data?.ResubmittedToWIN, 'Proposal_Resubmitted_WIN_Admin'),
                make('approvedFunding', 'Proposal Approved for Funding', data?.ApprovedForFunding, 'Proposal_Approved_For_Funding'),
                make('notRecommended', 'Proposal Not Recommended for Funding', data?.NotRecommendedFunding, 'Proposal_Not_Recommended_For_Funding')
            ];

            // ✅ NEW ROW (your requirement)
            const row4 = [
                make('approvedLevel1', 'Approved - Level 1', data?.ApprovedLevel1, 'Approved_Level_1'),
                make('rejectedLevel1', 'Rejected - Level 1', data?.RejectedLevel1, 'Rejected_Level_1')
            ];

            this.cards = [...row1, ...row2, ...row3, ...row4];

        } catch (error) {
            console.error('Error loading proposal counts:', error);
        }
    }

    handleNavigate(event) {
        const filterName = event.currentTarget.dataset.filter;
        const baseUrl = window.location.origin;

        if (baseUrl.includes('my.site.com')) {
            const sitePath = '/WadhwaniOrg/s/individualapplication/IndividualApplication/Default';
            const fullUrl = `${baseUrl}${sitePath}?IndividualApplication-filterId=${filterName}`;
            window.open(fullUrl, '_blank');
        } else {
            window.open(`/lightning/o/IndividualApplication/list?filterName=${filterName}`, '_blank');
        }
    }
}