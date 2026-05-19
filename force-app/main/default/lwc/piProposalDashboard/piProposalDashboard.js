import { LightningElement } from 'lwc';
import getPICounts from '@salesforce/apex/PIDashboardController.getPICounts';

export default class PiProposalDashboard extends LightningElement {
    cards = [];

    connectedCallback() {
        this.loadCounts();
    }

    async loadCounts() {
        try {
            const data = await getPICounts();
            console.log('✅ PI Dashboard data:', data);

            const make = (id, label, count, listViewApiName) => ({
                id,
                label,
                count: count ?? 0,
                combinedClass: 'card',
                listViewApiName
            });

            // ================= ROW 1 - COE =================
            const row1 = [
                make('draft', 'Proposal in Draft', data?.Draft, 'Draft_Proposals'),
                make('submittedCOE', 'Proposal Submitted to COE Admin', data?.SubmittedToCOE, 'Proposal_Submitted_COE_Admin'),
                make('approvedCOE', 'Proposal Approved by COE Admin', data?.ApprovedByCOE, 'Proposal_Approved_COE_Admin'),
                make('rejectedCOE', 'Proposal Not Shortlisted by COE Admin', data?.RejectedByCOE, 'Proposal_Rejected_COE_Admin')
            ];

            // ================= ROW 2 =================
            const row2 = [
                make(
                    'askedResubCOE',
                    'Proposal Asked for Resubmission by COE Admin',
                    data?.RevisionByCOE,
                    'Proposal_AskedResubmission_COE_Admin'
                ),
                make(
                    'resubmittedCOE',
                    'Proposal Resubmitted to COE Admin',
                    data?.ResubmittedToCOE,
                    'Proposal_Resubmitted_COE_Admin'
                ),
                make(
                    'submittedWIN',
                    'Proposal Submitted to WIN Admin',
                    data?.SubmittedToWIN,
                    'Proposal_Submitted_WIN_Admin'
                ),
                make(
                    'approvedWIN',
                    'Proposal Approved by WIN Admin',
                    data?.ApprovedByWIN,
                    'Proposal_Approved_WIN_Admin'
                )
            ];

            // ================= ROW 3 =================
            const row3 = [
                make(
                    'rejectedWIN',
                    'Proposal Not Shortlisted by WIN Admin',
                    data?.RejectedByWIN,
                    'Proposal_Rejected_WIN_Admin'
                ),
                make(
                    'askedResubWIN',
                    'Proposal Asked for Resubmission by WIN Admin',
                    data?.RevisionByWIN,
                    'Proposal_AskedResubmission_WIN_Admin'
                )
            ];

            this.cards = [...row1, ...row2, ...row3];

        } catch (error) {
            console.error('❌ Error loading PI proposal counts:', error);
        }
    }

    handleNavigate(event) {
        const filterName = event.currentTarget.dataset.filter;
        const baseUrl = window.location.origin;

        // 🔹 Draft special handling
        if (filterName === 'Draft_Proposals') {
            const draftUrl =
                'https://wadhwanifoundation--wfdev.sandbox.my.site.com/WadhwaniOrg/s/draftlistviewwin';
            window.open(draftUrl, '_blank');
            return;
        }

        // 🔹 Portal
        if (baseUrl.includes('my.site.com')) {
            const sitePath =
                '/WadhwaniOrg/s/individualapplication/IndividualApplication/Default';
            const fullUrl =
                `${baseUrl}${sitePath}?IndividualApplication-filterId=${filterName}`;
            window.open(fullUrl, '_blank');
        }
        // 🔹 Internal org
        else {
            window.open(
                `/lightning/o/IndividualApplication/list?filterName=${filterName}`,
                '_blank'
            );
        }
    }
}