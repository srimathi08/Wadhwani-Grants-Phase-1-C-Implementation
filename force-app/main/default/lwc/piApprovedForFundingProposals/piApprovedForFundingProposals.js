import { LightningElement, track } from 'lwc';
import getMyApprovedForFundingProposals from '@salesforce/apex/PiPortalController.getMyApprovedForFundingProposals';

const BASE = '/WadhwaniOrg';

export default class PiApprovedForFundingProposals extends LightningElement {
    @track proposals = [];
    isLoading = true;
    errorMsg = '';

    connectedCallback() {
        this.load();
    }

    async load() {
        this.isLoading = true;

        try {
            this.errorMsg = '';
            const data = await getMyApprovedForFundingProposals();

            // ✅ DEBUG (remove after verification)
            console.log('Apex proposals data:', JSON.stringify(data));

            this.proposals = (data || []).map(p => {
                const ms = Array.isArray(p.milestones) ? p.milestones : [];

                return {
                    ...p,
                    milestones: ms.map(m => ({
                        ...m,
                        badgeClass: this.getMilestoneStatusClass(m.status)
                    }))
                };
            });

        } catch (e) {
            console.error('Approved funding proposals load error', e);

            this.errorMsg =
                e?.body?.message ||
                e?.message ||
                JSON.stringify(e) ||
                'Unknown error occurred.';
        } finally {
            this.isLoading = false;
        }
    }

    // ✅ Badge color mapping
    getMilestoneStatusClass(status) {
        if (!status) return 'wf-badge wf-badge-default';

        const s = status.toLowerCase();

        if (s.includes('complete')) return 'wf-badge wf-badge-green';
        if (s.includes('submit')) return 'wf-badge wf-badge-blue';
        if (s.includes('progress')) return 'wf-badge wf-badge-amber';
        if (s.includes('pending') || s.includes('not started')) return 'wf-badge wf-badge-gray';
        if (s.includes('reject')) return 'wf-badge wf-badge-red';

        return 'wf-badge wf-badge-default';
    }

    // Navigation actions
    handleViewDetails(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;

        window.location.assign(`${BASE}/s/individualapplication/${id}`);
    }

    handleViewMilestone(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;

        window.location.assign(`${BASE}/s/pi-milestones?appId=${id}`);
    }

    handleBack() {
        window.location.assign(`${BASE}/s/home-pi`);
    }
}