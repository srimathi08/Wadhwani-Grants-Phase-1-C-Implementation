import { LightningElement, track } from 'lwc';
import getMilestones from '@salesforce/apex/CoeMilestoneController.getMilestones';
import approveMilestoneReport from '@salesforce/apex/CoeMilestoneController.approveMilestoneReport';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CoeMilestoneTiles extends LightningElement {
    @track milestones = [];
    @track isLoading = false;
    @track error;

    appId;

    get hasMilestones() {
        return this.milestones && this.milestones.length > 0;
    }

    connectedCallback() {
        this.appId = this.getQueryParam('appId');

        if (!this.appId) {
            this.error = 'Missing appId in URL.';
            this.milestones = [];
            return;
        }

        this.loadMilestones();
    }

    getQueryParam(param) {
        try {
            return new URL(window.location.href).searchParams.get(param);
        } catch (e) {
            return null;
        }
    }

  async loadMilestones() {
    this.isLoading = true;
    this.error = null;

    const HIDE_MANAGE_FUND_STATUSES = new Set([
        'Fund Disbursed',
        'Report Submitted',
        'Report Approved'
    ]);

    try {
        const result = await getMilestones({ appId: this.appId });

        this.milestones = (result || []).map((m) => {
            return {
                ...m,
                projectStartDate: m.projectStartDate,
                projectEndDate: m.projectEndDate,
                statusClass: this.getStatusClass(m.status),
                showManageFund: !HIDE_MANAGE_FUND_STATUSES.has(m.status),
                showApprove: m.status === 'Report Submitted'
            };
        });

    } catch (err) {
        this.error = err?.body?.message || err?.message || 'Unknown error';
        // eslint-disable-next-line no-console
        console.error('Error loading milestones:', err);
        this.milestones = [];
    } finally {
        this.isLoading = false;
    }
}

    formatDate(dt) {
        if (!dt || dt === 'null') return '-';

        try {
            return new Date(dt).toLocaleDateString();
        } catch (e) {
            return dt;
        }
    }

    getStatusClass(status) {
        let cls = 'status';
        if (!status) return cls;

        if (status === 'Fund Disbursed') {
            cls = 'status status--success';
        }
        return cls;
    }

    handleViewDetails(event) {
        const milestoneId = event.currentTarget.dataset.id;
        const basePath = window.location.pathname.split('/s/')[0];
        window.location.href = `${basePath}/s/detail/${milestoneId}`;
    }

    handleManageFund(event) {
        const milestoneId = event.currentTarget.dataset.id;
        const milestoneName = event.currentTarget.dataset.name;
        const budgetRequired = event.currentTarget.dataset.budgetrequired;

        const modal = this.template.querySelector('c-coe-manage-fund-modal');
        if (!modal) return;

        const payload = {
            appId: this.appId,
            milestoneId,
            milestoneName,
            budgetRequired
        };

        if (typeof modal.open === 'function') modal.open(payload);
        else if (typeof modal.openModal === 'function') modal.openModal(payload);
        else if (typeof modal.show === 'function') modal.show(payload);
    }
 

async handleApproveReport(event) {
    const milestoneId = event.currentTarget.dataset.id;
    try {
        await approveMilestoneReport({ milestoneId });

        // Update locally instead of refetching — getMilestones is cacheable
        // and an immediate refetch can return stale data
        this.milestones = this.milestones.map((m) => {
            if (m.milestoneId !== milestoneId) return m;
            const updatedStatus = 'Report Approved';
            return {
                ...m,
                status: updatedStatus,
                statusClass: this.getStatusClass(updatedStatus),
                showManageFund: false,
                showApprove: false
            };
        });

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Report approved successfully.',
                variant: 'success'
            })
        );
    } catch (err) {
        this.error = err?.body?.message || err?.message || 'Unable to approve report.';
        console.error('Error approving report:', err);

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error approving report',
                message: this.error,
                variant: 'error'
            })
        );
    }
}
}