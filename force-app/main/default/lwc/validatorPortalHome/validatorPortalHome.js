import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';
import basePath from '@salesforce/community/basePath';
import getActionCounts       from '@salesforce/apex/WCFValidatorController.getActionCounts';
import getValidatedProposals from '@salesforce/apex/WCFProposalListController.getValidatedProposals';
import getReviewStatusMap    from '@salesforce/apex/WCFProposalListController.getReviewStatusMap';
import getApproverQueueCount from '@salesforce/apex/WCFApproverListController.getApproverQueueCount';
import getCurrentAccountId   from '@salesforce/apex/WCFPortalUserController.getCurrentAccountId';

import WCFS_VALIDATOR_FIELD from '@salesforce/schema/Account.WCFs_Validator__c';
import WCF_REVIEWER_FIELD   from '@salesforce/schema/Account.WCF_Reviewer__c';
import WCF_APPROVER_FIELD   from '@salesforce/schema/Account.WCF_Approver__c';

import { ROLES, resolveActiveRole, persistRole, withRole } from 'c/roleContext';

/**
 * Page names only — no site prefix.
 * The site prefix differs per org (sandbox: /reviewersite/s, production: /internal/s)
 * and is supplied at runtime by @salesforce/community/basePath.
 */
const PAGE = {
    vDashboard       : 'wg-validator-dashboard',
    vQueue           : 'wg-validator-queue',
    rDashboard       : 'wg-reviewer-dashboard',
    rQueue           : 'wg-reviewer-queue',
    approverDashboard: 'approverdashboard',
    approverQueue    : 'approverlistview',
    scReport         : 'wg-sourcing-channel-report',
    compliance       : 'wg-compliance-documents',
};

/**
 * Normalises the community base path once, at module load.
 * Handles: trailing slashes, an empty basePath (site mapped to the domain root),
 * and LWR sites where basePath may omit the trailing "/s".
 */
const SITE_BASE = (() => {
    let base = (basePath || '').replace(/\/+$/, '');
    if (base && !/\/s$/.test(base)) {
        base = `${base}/s`;
    }
    return base;
})();

export default class ValidatorPortalHome extends NavigationMixin(LightningElement) {

    vQueueBadge        = null;
    rQueueBadge        = null;
    approverQueueBadge = null;

    @track activeView = 'home';

    // --- Role resolution ---
    accountId;
    isValidator = false;
    isReviewer  = false;
    isApprover  = false;
    rolesLoaded = false;
    activeRole  = null;

    connectedCallback() {
        this._loadCurrentAccountId();
        // Badges are loaded once the active role is known, so a user viewing
        // as Approver doesn't fire the validator and reviewer count queries.
    }

    async _loadCurrentAccountId() {
        try {
            this.accountId = await getCurrentAccountId();
            if (!this.accountId) {
                this.rolesLoaded = true;
            }
        } catch (e) {
            console.error('Error resolving current Person Account Id:', e);
            this.rolesLoaded = true;
        }
    }

    @wire(getRecord, {
        recordId: '$accountId',
        fields: [WCFS_VALIDATOR_FIELD, WCF_REVIEWER_FIELD, WCF_APPROVER_FIELD]
    })
    wiredAccount({ data, error }) {
        if (data) {
            this.isValidator = !!data.fields.WCFs_Validator__c?.value;
            this.isReviewer  = !!data.fields.WCF_Reviewer__c?.value;
            this.isApprover  = !!data.fields.WCF_Approver__c?.value;
            this._resolveRole();
            this.rolesLoaded = true;
            this._loadBadges();
        } else if (error) {
            console.error('Error loading Account role flags:', error);
            this.isValidator = false;
            this.isReviewer  = false;
            this.isApprover  = false;
            this.activeRole  = null;
            this.rolesLoaded = true;
        }
    }

    /*
     * ==========================
     * ACTIVE ROLE
     * ==========================
     */

    get roleContext() {
        return {
            isGuest: false,
            isValidator: this.isValidator,
            isReviewer: this.isReviewer,
            isApprover: this.isApprover
        };
    }

    _resolveRole() {
        this.activeRole = resolveActiveRole(this.roleContext);
        persistRole(this.activeRole);
    }

    /*
     * Sidebar visibility. Each block requires BOTH that the user holds the
     * role and that it is the role currently being viewed — held alone is
     * what was showing all three sections at once.
     */

    get showValidatorNav() {
        return this.isValidator && this.activeRole === ROLES.VALIDATOR;
    }

    get showReviewerNav() {
        return this.isReviewer && this.activeRole === ROLES.REVIEWER;
    }

    get showApproverNav() {
        return this.isApprover && this.activeRole === ROLES.APPROVER;
    }

    /*
     * ==========================
     * BADGES — only for the active role
     * ==========================
     */

    async _loadBadges() {
        if (this.showValidatorNav) {
            try {
                const data    = await getActionCounts();
                const pending = (data?.resume ?? 0) + (data?.validate ?? 0);
                this.vQueueBadge = pending > 0 ? pending : null;
            } catch (e) {
                console.error('Badge count error (validator):', e);
            }
        }

        if (this.showReviewerNav) {
            try {
                const [proposals, reviewMap] = await Promise.all([
                    getValidatedProposals(),
                    getReviewStatusMap()
                ]);
                const map = reviewMap || {};
                let notStarted = 0;
                for (const p of (proposals || [])) {
                    const info = map[p.Id] || {};
                    if (!info.isSubmitted
                        && info.status !== 'In Progress'
                        && info.status !== 'Review Submitted') {
                        notStarted++;
                    }
                }
                this.rQueueBadge = notStarted > 0 ? notStarted : null;
            } catch (e) {
                console.error('Badge count error (reviewer):', e);
            }
        }

        if (this.showApproverNav) {
            try {
                const count = await getApproverQueueCount();
                this.approverQueueBadge = count > 0 ? count : null;
            } catch (e) {
                console.error('Badge count error (approver):', e);
            }
        }
    }

    /*
     * ==========================
     * NAVIGATION
     * ==========================
     */

    /**
     * Builds a fully-qualified site URL, carrying ?role= so the active role
     * survives the jump. Without this the destination page falls back to the
     * user's first held role and the header flips to the wrong tabs.
     */
    _buildUrl(pageName) {
        return withRole(`${SITE_BASE}/${pageName}`, this.activeRole);
    }

    _navTo(pageName) {
        this[NavigationMixin.Navigate]({
            type       : 'standard__webPage',
            attributes : { url: this._buildUrl(pageName) }
        });
    }

    handleNav(event) {
        const view = event.currentTarget.dataset.view;
        if (!view) return;

        switch (view) {
            case 'v-dashboard':        this._navTo(PAGE.vDashboard);        break;
            case 'r-dashboard':        this._navTo(PAGE.rDashboard);        break;
            case 'r-queue':            this._navTo(PAGE.rQueue);            break;
            case 'approver-dashboard': this._navTo(PAGE.approverDashboard); break;
            case 'approver-queue':     this._navTo(PAGE.approverQueue);     break;
            case 'sc-report':          this._navTo(PAGE.scReport);          break;
            case 'compliance':         this._navTo(PAGE.compliance);        break;
            default: break;
        }
    }

    handleValidatorQueueNav() {
        this._navTo(PAGE.vQueue);
    }

    get navClass_vDashboard()   { return this._navClass('v-dashboard');    }
    get navClass_vQueue()       { return this._navClass('v-queue');        }
    get navClass_rDashboard()   { return this._navClass('r-dashboard');    }
    get navClass_rQueue()       { return this._navClass('r-queue');        }
    get navClass_approverQueue(){ return this._navClass('approver-queue'); }
    get navClass_scReport()     { return this._navClass('sc-report');      }
    get navClass_compliance()   { return this._navClass('compliance');     }
    get navClass_approverDashboard() { return this._navClass('approver-dashboard'); }

    _navClass(view) {
        return this.activeView === view ? 'sb-item sb-item-active' : 'sb-item';
    }
}