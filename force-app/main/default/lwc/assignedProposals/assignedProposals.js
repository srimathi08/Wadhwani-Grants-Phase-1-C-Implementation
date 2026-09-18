import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import basePath from '@salesforce/community/basePath';

import getTotalAssignedApplications
    from '@salesforce/apex/AssignedProposalsController.getTotalAssignedApplications';

import rejectProposal
    from '@salesforce/apex/AssignedProposalsController.rejectProposal';

export default class AssignedProposals extends LightningElement {

    @track applications = [];
    @track error;

    isLoading = true;

    // Holds the raw wire result so refreshApex can re-run it
    wiredResult;

    // Reject modal state
    isRejectModalOpen = false;
    rejectComment = '';
    selectedApplicationId;

    /* =====================================================
       LOAD ASSIGNED APPLICATIONS
       ===================================================== */
    @wire(getTotalAssignedApplications)
    wiredApplications(result) {
        this.wiredResult = result;

        const { data, error } = result;

        if (data) {
            this.applications = this.mapRows(data);
            this.error = undefined;
            this.isLoading = false;
        } else if (error) {
            this.error = error;
            this.applications = [];
            this.isLoading = false;
        }
    }

    /* =====================================================
       ROW MAPPER — single source of truth
       ===================================================== */
    mapRows(rows) {
        return rows.map((row, index) => ({
            applicationId: row.applicationId,
            index: index + 1,

            applicationName: row.applicationName,
            projectTitle: row.projectTitle,
            primaryFocusArea: row.primaryFocusArea,
            coeName: row.coeName,

            reviewerAction: row.reviewerAction,
            isActionDisabled: row.isActionDisabled,

            reviewerActionClass: this.getStatusClass(row.reviewerAction),

            // basePath resolves per-org: /reviewportal in prod,
            // /ProposallReviewerPortal in the wfdev sandbox
            recordUrl: this.buildRecordUrl(row.applicationId)
        }));
    }

    getStatusClass(action) {
        if (action === 'Rejected') {
            return 'status-rejected';
        }
        if (action === 'Accepted') {
            return 'status-accepted';
        }
        return 'status-pending';
    }
buildRecordUrl(applicationId) {
    // basePath is '/prefix/s' on Aura sites, '/prefix' on LWR sites
    const root = basePath.endsWith('/s') ? basePath : `${basePath}/s`;
    return `${root}/individualapplication/${applicationId}`;
}

    /* =====================================================
       ACCEPT (redirect only)
       ===================================================== */
    handleAccept(event) {
        const applicationId = event.currentTarget.dataset.id;
        window.location.href = this.buildRecordUrl(applicationId);
    }

    /* =====================================================
       REJECT (OPEN MODAL)
       ===================================================== */
    handleReject(event) {
        this.selectedApplicationId = event.currentTarget.dataset.id;
        this.rejectComment = '';
        this.isRejectModalOpen = true;
    }

    handleCommentChange(event) {
        this.rejectComment = event.target.value;
    }

    closeRejectModal() {
        this.isRejectModalOpen = false;
        this.selectedApplicationId = null;
        this.rejectComment = '';
    }

    /* =====================================================
       CONFIRM REJECT
       ===================================================== */
    confirmReject() {

        if (!this.rejectComment || !this.rejectComment.trim()) {
            this.showToast(
                'Validation Error',
                'Please enter a rejection comment.',
                'error'
            );
            return;
        }

        this.isLoading = true;

        rejectProposal({
            applicationId: this.selectedApplicationId,
            reviewerComment: this.rejectComment
        })
        .then(() => {
            this.showToast(
                'Rejected',
                'Proposal has been rejected successfully.',
                'success'
            );

            this.closeRejectModal();

            // Re-runs the wire, which re-maps rows and disables buttons
            return refreshApex(this.wiredResult);
        })
        .catch(error => {
            this.showToast(
                'Error',
                error?.body?.message || 'Error rejecting proposal',
                'error'
            );
        })
        .finally(() => {
            this.isLoading = false;
        });
    }

    /* =====================================================
       HELPERS
       ===================================================== */
    get hasData() {
        return this.applications && this.applications.length > 0;
    }

    get showEmptyState() {
        return !this.isLoading && !this.error && !this.hasData;
    }

    get errorMessage() {
        return this.error?.body?.message || 'Unknown error occurred';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}