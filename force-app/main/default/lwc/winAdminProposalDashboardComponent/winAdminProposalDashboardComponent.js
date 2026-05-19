import { LightningElement } from 'lwc';
import getAllProposalCounts from '@salesforce/apex/AdminProposalDashboardController.getAllProposalCounts';

export default class WinAdminProposalDashboardComponent extends LightningElement {
    coeCards = [];
    winCards = [];

    connectedCallback() {
        this.loadCounts();
    }

    async loadCounts() {
        try {
            const data = await getAllProposalCounts();
            console.log('✅ Admin Apex Data:', JSON.stringify(data));
            const make = (id, label, count, listViewApiName) => ({
                id,
                label,
                count: count ?? 0,
                combinedClass: 'card',
                listViewApiName
            });

           /*const make = (id, label, count, grad, listViewApiName) => ({
                id,
                label,
                count: count ?? 0,
                combinedClass: `card ${grad}`,
                listViewApiName
            });*/

        // 🟩 COE Admin Actions
/*this.coeCards = [
    make('coe-sub', 'Proposal Submitted to COE Admin', data?.SubmittedToCOE, 'grad-yellow', 'Proposal_Submitted_COE_Admin'),
    make('coe-app', 'Proposal Approved by COE Admin', data?.ApprovedByCOE, 'grad-orange', 'Proposal_Approved_COE_Admin'),
    make('coe-rej', 'Proposal Not Shortlisted by COE Admin', data?.RejectedByCOE, 'grad-pink', 'Proposal_Rejected_COE_Admin'),
    make('coe-res', 'Proposal Asked for Resubmission by COE Admin', data?.ResubmissionByCOE, 'grad-tangerine', 'Proposal_Resubmission_COE_Admin'),
    make('coe-resub', 'Proposal Resubmitted to COE Admin', data?.ResubmittedToCOE, 'grad-rose', 'Proposal_Resubmitted_By_PI'),
    make('win-resub', 'Proposal Resubmitted to WIN Admin', data?.ResubmittedToWIN, 'grad-peach', 'Proposal_Resubmitted_WIN_Admin')
];

// 🟦 WIN Admin Actions
this.winCards = [
    make('win-sub', 'Proposal Submitted to WIN Admin', data?.SubmittedToWIN, 'grad-yellow', 'Proposal_Submitted_WIN_Admin'),
    make('win-app', 'Proposal Approved by WIN Admin', data?.ApprovedByWIN, 'grad-red', 'Proposal_Approved_WIN_Admin'),
    make('win-rej', 'Proposal Not Shortlisted by WIN Admin', data?.RejectedByWIN, 'grad-burgundy', 'Proposal_Rejected_WIN_Admin'),
    make('win-res', 'Proposal Asked for Resubmission by WIN Admin', data?.ResubmissionByWIN, 'grad-orange', 'Proposal_AskedResubmission_WIN_Admin'),
    make('fund-app', 'Proposal Approved for Funding', data?.ApprovedForFunding, 'grad-peach', 'Proposal_Approved_For_Funding'),
    make('fund-not', 'Proposal Not Recommended for Funding', data?.NotRecommendedForFunding, 'grad-red', 'Proposal_Not_Recommended_For_Funding')
];*/

 // 🟥 COE Admin Actions
 this.coeCards = [
    make('coe-sub', 'Proposal Submitted to COE Admin', data?.SubmittedToCOE, 'Proposal_Submitted_COE_Admin'),
    make('coe-app', 'Proposal Approved by COE Admin', data?.ApprovedByCOE, 'Proposal_Approved_COE_Admin'),
    make('coe-rej', 'Proposal Not Shortlisted by COE Admin', data?.RejectedByCOE, 'Proposal_Rejected_COE_Admin'),
    make('coe-res', 'Proposal Asked for Resubmission by COE Admin', data?.ResubmissionByCOE, 'Proposal_Resubmission_COE_Admin'),
    make('coe-resub', 'Proposal Resubmitted to COE Admin', data?.ResubmittedToCOE, 'Proposal_Resubmitted_By_PI'),
    make('win-resub', 'Proposal Resubmitted to WIN Admin', data?.ResubmittedToWIN, 'Proposal_Resubmitted_WIN_Admin')
];

// 🟧 WIN Admin Actions
this.winCards = [
    make('win-sub', 'Proposal Submitted to WIN Admin', data?.SubmittedToWIN, 'Proposal_Submitted_WIN_Admin'),
    make('win-app', 'Proposal Approved by WIN Admin', data?.ApprovedByWIN, 'Proposal_Approved_WIN_Admin'),
    make('win-rej', 'Proposal Not Shortlisted by WIN Admin', data?.RejectedByWIN, 'Proposal_Rejected_WIN_Admin'),
    make('win-res', 'Proposal Asked for Resubmission by WIN Admin', data?.ResubmissionByWIN, 'Proposal_AskedResubmission_WIN_Admin'),
    make('fund-app', 'Proposal Approved for Funding', data?.ApprovedForFunding, 'Proposal_Approved_For_Funding'),
    make('fund-not', 'Proposal Not Recommended for Funding', data?.NotRecommendedForFunding, 'Proposal_Not_Recommended_For_Funding')
];
 
        } catch (error) {
            console.error('❌ Error fetching admin proposal counts:', error);
        }
    }

    handleNavigate(event) {
        const filterName = event.currentTarget.dataset.filter;
        window.open(`/lightning/o/IndividualApplication/list?filterName=${filterName}`, '_blank');
    }
}