import { LightningElement, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import getActionCounts from '@salesforce/apex/WCFValidatorController.getActionCounts';
import getReviewStatusMap from '@salesforce/apex/WCFProposalListController.getReviewStatusMap';
import getValidatedProposals from '@salesforce/apex/WCFProposalListController.getValidatedProposals';
import getMyPLOrganizations from '@salesforce/apex/PLOfRecordController.getMyPLOrganizations';

export default class WcfPortalSidebar extends NavigationMixin(LightningElement) {

    vQueueBadge = null;
    rQueueBadge = null;
    plRecordBadge = null;
    _currentPage = '';

    @wire(CurrentPageReference)
    handlePageRef(pageRef) {
        if (pageRef) {
            this._currentPage = pageRef?.attributes?.name || '';
        }
    }

    connectedCallback() {
        this._loadBadges();
    }

    async _loadBadges() {
        try {
            const counts = await getActionCounts();
            const pending = (counts?.resume ?? 0) + (counts?.validate ?? 0);
            this.vQueueBadge = pending > 0 ? pending : null;
        } catch(e) { console.error('Sidebar validator badge error', e); }

        try {
            const [proposals, reviewMap] = await Promise.all([
                getValidatedProposals(),
                getReviewStatusMap()
            ]);
            const map = reviewMap || {};
            const notStarted = (proposals || []).filter(p => {
                const info = map[p.Id] || {};
                return !info.isSubmitted && info.status !== 'In Progress' && info.status !== 'Review Submitted';
            }).length;
            this.rQueueBadge = notStarted > 0 ? notStarted : null;
        } catch(e) { console.error('Sidebar reviewer badge error', e); }

        try {
            const orgs = await getMyPLOrganizations();
            this.plRecordBadge = orgs?.length > 0 ? orgs.length : null;
        } catch(e) { console.error('Sidebar PL badge error', e); }
    }

    handleNav(event) {
        const page = event.currentTarget.dataset.page;
        if (!page) return;
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: page }
        });
    }

    _nc(pageName) {
        return this._currentPage === pageName ? 'sb-item sb-item-active' : 'sb-item';
    }

    get navClass_vDashboard() { return this._nc('Home'); }
    get navClass_vQueue()     { return this._nc('ValidatorPortal__c'); }
    get navClass_rDashboard() { return this._nc('WCF_Reviewer_Dashboard__c'); }
    get navClass_rQueue()     { return this._nc('WCF_Reviewer_Application_List__c'); }
    get navClass_scReport()   { return this._nc('WCF_Sourcing_Channel__c'); }
    get navClass_plRecord()   { return this._nc('WCF_PL_of_Record__c'); }
    get navClass_compliance() { return this._nc('WCF_Compliance_Documents__c'); }
}