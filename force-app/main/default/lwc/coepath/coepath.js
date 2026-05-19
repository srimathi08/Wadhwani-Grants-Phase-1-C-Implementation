import { LightningElement, track, wire } from 'lwc';
import getAccountRegistrationStatus from '@salesforce/apex/WcfCoeSiteHome.getAccountRegistrationStatus';
import getCOEProposalStatus from '@salesforce/apex/WcfCoeSiteHome.getCOEProposalStatus';
import getProjectProposalSummary from '@salesforce/apex/WcfCoeSiteHome.getProjectProposalSummary';

export default class Coepath extends LightningElement {

    /* =========================
       STEP 1 – REGISTRATION
       ========================= */
    @track registrationCompleted = false;
    @track registrationStatusText = 'Yet to Start';
    @track registrationStatusIcon = '🕒';
    @track showStep1Link = false;

    /* =========================
       STEP 2 – COE PROPOSAL
       ========================= */
    @track coeProposalStatus = 'Yet to Start';
    @track showStep2Link = false;

    /* =========================
       STEP 3 – PROJECT PROPOSAL
       ========================= */
    @track showStep3Links = false;

    /* =========================
       URLS
       ========================= */
    coeProposalLink =
        'https://wadhwanifoundation--wfdev.sandbox.my.site.com/WadhwaniOrg/s/proposal-submission-page';

    /* =========================
       STEP 1 – COE REGISTRATION
       ========================= */
    @wire(getAccountRegistrationStatus)
    wiredRegistration({ data, error }) {
        if (data !== undefined) {
            this.registrationCompleted = data;
            this.registrationStatusText = data ? 'Completed' : 'Yet to Start';
            this.registrationStatusIcon = data ? '✅' : '🕒';

            // OLD LOGIC: show link only if NOT completed
            this.showStep1Link = !data;
        } else if (error) {
            console.error('Error fetching registration status:', error);
        }
    }

    /* =========================
       STEP 2 – COE PROPOSAL
       (OLD FUNCTIONAL LOGIC)
       ========================= */
    @wire(getCOEProposalStatus)
    wiredProposal({ data, error }) {
        if (data !== undefined) {

            this.coeProposalStatus = data || 'Yet to Start';

            // OLD LOGIC:
            // Show Step-2 only when:
            // 1. Step-1 completed
            // 2. Status is Yet to Start OR In Progress
            this.showStep2Link =
                this.registrationCompleted &&
                (this.coeProposalStatus === 'Yet to Start' ||
                 this.coeProposalStatus === 'In Progress');

            // OLD LOGIC:
            // Step-3 visible ONLY when Approved
            this.showStep3Links =
                this.coeProposalStatus === 'Approved';

        } else if (error) {
            console.error('Error fetching COE Proposal status:', error);
        }
    }

    /* =========================
       STEP 3 – PROJECT SUMMARY
       ========================= */
    @wire(getProjectProposalSummary)
    wiredProjectProposals;
}