import { LightningElement, api, wire, track } from 'lwc';
import getProposalStatus from '@salesforce/apex/ProposalPathController.getProposalStatus';
import syncUnderReviewStatus from '@salesforce/apex/ProposalPathController.syncUnderReviewStatus';

/**
 * Single source of truth for every Application Status picklist value.
 * Each entry maps a status string to:
 *   - stage:   index into STAGE_DEFINITIONS (0-7) — where the tracker sits
 *   - variant: 'active' | 'approved' | 'rejected' | 'resubmit' — how the
 *              current stage is colored
 *   - label:   (optional) overrides the generic stage label with a
 *              status-specific one, e.g. "Approved by COE Admin"
 *
 * IMPORTANT: If a new picklist value is ever added on the object, it MUST
 * be added here too, or it will fall back to stage 0 (see statusConfig
 * getter below) and a console.warn will fire so it's easy to catch in dev.
 *
 * NOTE: The Level 1 / Level 2 and "Submitted Back" mappings below are my
 * best guess based on the label text — please confirm the intended stage
 * for these with the business/Afrose, since I don't have visibility into
 * the flow/Apex that sets them.
 */
const STATUS_CONFIG = {
    // --- Stage 0: Draft ---
    'Draft':                                              { stage: 0, variant: 'active' },
    'Submitted':                                          { stage: 0, variant: 'approved' },
    'Revision Requested':                                 { stage: 0, variant: 'resubmit' },

    // --- Stage 1: Submitted to COE Admin ---
    'Proposal Submitted to COE Admin':                    { stage: 1, variant: 'active' },
    'Proposal Resubmitted to COE Admin':                  { stage: 1, variant: 'resubmit' },

    // --- Stage 2: COE Admin decision ---
    'Proposal Approved by COE Admin':                     { stage: 2, variant: 'approved', label: 'Approved by COE Admin' },
    'Proposal Rejected by COE Admin':                     { stage: 2, variant: 'rejected', label: 'Not Shortlisted by COE Admin' },
    'Asked for Resubmission by COE Admin':                { stage: 2, variant: 'resubmit', label: 'Revision Requested by COE Admin' },

    // --- Stage 3: Submitted to WIN Admin ---
    'Proposal Submitted to WIN Admin':                    { stage: 3, variant: 'active' },
    'Proposal Resubmitted to WIN Admin':                  { stage: 3, variant: 'resubmit' },

    // --- Stage 4: WIN Admin decision ---
    'Proposal Approved by WIN Admin':                     { stage: 4, variant: 'approved', label: 'Approved by WIN Admin' },
    'Proposal Approved by Win Admin':                     { stage: 4, variant: 'approved', label: 'Approved by WIN Admin' },
    'Proposal Rejected by WIN Admin':                     { stage: 4, variant: 'rejected', label: 'Not Shortlisted by WIN Admin' },
    'Proposal Rejected by Win Admin':                     { stage: 4, variant: 'rejected', label: 'Not Shortlisted by WIN Admin' },
    'Asked for Resubmission by WIN Admin':                { stage: 4, variant: 'resubmit', label: 'Revision Requested by WIN Admin' },
    'Asked for Resubmission by Win Admin':                { stage: 4, variant: 'resubmit', label: 'Revision Requested by WIN Admin' },

    // --- Stage 5: Under review ---
    'In Review':                                          { stage: 5, variant: 'active' },
    'Under Review':                                       { stage: 5, variant: 'active' },

    // --- Stage 6: Reviewer recommendation ---
    'Approved':                                           { stage: 6, variant: 'approved', label: 'Approved' },
    'Rejected':                                           { stage: 6, variant: 'rejected', label: 'Rejected' },
    'Recommended':                                        { stage: 6, variant: 'approved', label: 'Recommended' },
    'Not Recommended':                                    { stage: 6, variant: 'rejected', label: 'Not Recommended' },
    'Approved with Resubmission':                         { stage: 6, variant: 'resubmit', label: 'Approved with Resubmission' },
    'Submitted Back - Approved for Funding Resubmission': { stage: 6, variant: 'resubmit', label: 'Sent Back for Resubmission' },

    // --- Stage 7: Final funding decision ---
    'Approved for Funding':                               { stage: 7, variant: 'approved', label: 'Approved for Funding' },
    'Not Recommended for Funding':                        { stage: 7, variant: 'rejected', label: 'Not Recommended for Funding' },
    'Approved - Level 1':                                 { stage: 7, variant: 'approved', label: 'Approved - Level 1' },
    'Rejected - Level 1':                                 { stage: 7, variant: 'rejected', label: 'Rejected - Level 1' },
    'Approved - Level 2':                                 { stage: 7, variant: 'approved', label: 'Approved - Level 2' },
    'Rejected - Level 2':                                 { stage: 7, variant: 'rejected', label: 'Rejected - Level 2' },
    'Funded':                                             { stage: 7, variant: 'approved', label: 'Funded' }
};

// Base labels for each stage node, in display order.
// Stages 2, 4, 6 and 7 get their label swapped dynamically based on
// the specific status (see STATUS_CONFIG above).
const STAGE_DEFINITIONS = [
    { label: 'Draft' },
    { label: 'Submitted to COE Admin' },
    { label: 'COE Admin Actions' },
    { label: 'Submitted to WIN Admin' },
    { label: 'WIN Admin Actions' },
    { label: 'Under Review' },
    { label: 'Recommendation' },
    { label: 'Decision' }
];

export default class ProposalPathWinComponent extends LightningElement {
    @api recordId;
    @track currentStatus;
    @track pathItems = [];

    connectedCallback() {
        if (this.recordId) {
            syncUnderReviewStatus({ recordId: this.recordId })
                .catch(error => {
                    console.error('Status sync error', error);
                });
        }
    }

    @wire(getProposalStatus, { recordId: '$recordId' })
    wiredStatus({ data, error }) {
        if (data) {
            this.currentStatus = data;
            this.initializePath();
        } else if (error) {
            console.error('Error fetching proposal status', error);
        }
    }

    // Looks up the config for the current status. Falls back to stage 0
    // (and logs a warning) if a status ever shows up that isn't mapped —
    // this is what prevented the "Approved for Funding stuck at Under
    // Review" bug from happening silently.
    get statusConfig() {
        const config = STATUS_CONFIG[this.currentStatus];
        if (!config) {
            console.warn(
                `ProposalPathWinComponent: unmapped status "${this.currentStatus}" ` +
                `— add it to STATUS_CONFIG so the tracker can reflect it.`
            );
            return { stage: 0, variant: 'active' };
        }
        return config;
    }

    initializePath() {
        const { stage, label } = this.statusConfig;

        this.pathItems = STAGE_DEFINITIONS.map((item, idx) => ({
            label: idx === stage && label ? label : item.label,
            isLast: idx === STAGE_DEFINITIONS.length - 1
        }));
    }

    get computedPath() {
        const { stage, variant } = this.statusConfig;

        return this.pathItems.map((item, index) => {
            let colorClass = 'upcoming';
            let connectorClass = 'connector-default';
            let isCompleted = false;

            if (index < stage) {
                colorClass = 'completed';
                connectorClass = 'connector-green';
                isCompleted = true;
            } else if (index === stage) {
                if (variant === 'rejected') {
                    colorClass = 'rejected-outline';
                    connectorClass = 'connector-red';
                } else if (variant === 'resubmit') {
                    colorClass = 'resubmit-outline';
                    connectorClass = 'connector-yellow';
                } else if (variant === 'approved') {
                    colorClass = 'approved-outline';
                    connectorClass = 'connector-blue';
                } else {
                    colorClass = 'active';
                    connectorClass = 'connector-blue';
                }
            }

            return {
                ...item,
                isCompleted,
                displayNumber: index + 1,
                combinedClass: `path-item ${colorClass}`,
                connectorClass
            };
        });
    }
}