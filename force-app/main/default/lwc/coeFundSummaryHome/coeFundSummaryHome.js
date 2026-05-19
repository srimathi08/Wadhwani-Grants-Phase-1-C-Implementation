import { LightningElement, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getFundSummary from '@salesforce/apex/CoeHomeFundController.getFundSummary';
import getTRLProjects from '@salesforce/apex/CoeHomeFundController.getTRLProjects';

export default class CoeFundSummaryHome extends NavigationMixin(LightningElement) {

    /* ── summary fields ── */
    totalReceived = 0;
    disbursed = 0;
    available = 0;
    projectGrantReceived = 0;
    operationalGrantReceived = 0;
    totalProjectsFunded = 0;
    grantAvailable = 0;
    avgTRL = 0;
    expectedTRL = 0;
    duration = 0;

    /* ── TRL modal ── */
    isTRLModalOpen = false;
    isTRLLoaded = false;
    trlProjects = [];

    trlScaleLabels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    /* ================================
       WIRE: SUMMARY
    ================================= */
    @wire(getFundSummary)
    wiredSummary({ data }) {
        if (data) {
            Object.assign(this, data);
        }
    }

    /* ================================
       WIRE: TRL PROJECTS
    ================================= */
    @wire(getTRLProjects)
    wiredTRL({ data, error }) {
        if (data) {
            this.trlProjects = data.map(p => ({
                ...p,
                steps: [1,2,3,4,5,6,7,8,9].map(n => ({
                    n,
                    // Column class — controls number color
                    colClass:
                        n === p.currentTRL  ? 'trl-scale-col is-current'  :
                        n === p.expectedTRL ? 'trl-scale-col is-expected' :
                        'trl-scale-col',
                    // Step block class — controls bar color
                    stepClass:
                        n === p.currentTRL  ? 'trl-step step-current'  :
                        n === p.expectedTRL ? 'trl-step step-expected' :
                        n < p.currentTRL    ? 'trl-step step-filled'   :
                        'trl-step'
                }))
            }));
            this.isTRLLoaded = true;
        } else if (error) {
            this.isTRLLoaded = true;
            console.error('TRL load error', error);
        }
    }

    /* ================================
       COMPUTED STYLES
    ================================= */
   /* get avgTRLStyle() {
        return `width:${(this.avgTRL / 9) * 100}%`;
    } */

    get avgTRLStyle() {
    const ceiling = this.expectedTRL > 0 ? this.expectedTRL : 9;
    return `width:${Math.min((this.avgTRL / ceiling) * 100, 100)}%`;
}
    get expectedTRLStyle() {
        return `width:${(this.expectedTRL / 9) * 100}%`;
    }

    /* ================================
       MODAL — no more applyTRLStepColors needed
    ================================= */
    openTRLModal() {
        this.isTRLModalOpen = true;
    }

    closeTRLModal() {
        this.isTRLModalOpen = false;
    }

    /* ================================
       NAVIGATION
    ================================= */
    navigateToFund() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: '/WadhwaniOrg/s/fund-management' }
        });
    }
}