import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getWcfProposalCounts from '@salesforce/apex/WcfProposalDashboardController.getWcfProposalCounts';

export default class WcfproposaldashboardComponent extends NavigationMixin(LightningElement) {
    cards = [];

    connectedCallback() {
        this.loadCounts();
    }

    async loadCounts() {
        try {
            const data = await getWcfProposalCounts();

            const make = (id, label, count, listViewApiName) => ({
                id,
                label,
                count: count ?? 0,
                combinedClass: `card card-${id}`,
                listViewApiName
            });

            this.cards = [
                make('draft', 'Draft', data?.Draft, 'WCF_Draft'),
                make('submitted', 'Submitted', data?.Submitted, 'WCF_Submitted'),
                make('revisionRequested', 'Revision Requested', data?.RevisionRequested, 'WCF_Revision_Requested'),
                make('inReview', 'In Review', data?.InReview, 'WCF_In_Review'),
                make('approved', 'Approved', data?.Approved, 'WCF_Approved'),
                make('rejected', 'Rejected', data?.Rejected, 'WCF_Rejected')
            ];

        } catch (error) {
            console.error('Error loading WCF proposal counts:', error);
        }
    }

   handleNavigate(event) {
    const filterName = event.currentTarget.dataset.filter;

    const filterUrlMap = {
        'WCF_Draft':              '/wcf/s/draft-wcf-proposal',
        'WCF_Submitted':          '/wcf/s/wcf-submitted',
        'WCF_Revision_Requested': '/wcf/s/wcf-revision-requested',
        'WCF_In_Review':          '/wcf/s/wcf-in-review',
        'WCF_Approved':           '/wcf/s/wcf-approved',
        'WCF_Rejected':           '/wcf/s/wcf-rejected'
    };

    const url = filterUrlMap[filterName];
    if (url) {
        window.location.href = window.location.origin + url;
    }
}
}