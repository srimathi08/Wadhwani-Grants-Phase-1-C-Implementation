import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import getCurrentAccountId from '@salesforce/apex/WCFPortalUserController.getCurrentAccountId';
import isGuest from '@salesforce/user/isGuest';

import WCFS_VALIDATOR_FIELD from '@salesforce/schema/Account.WCFs_Validator__c';
import WCF_REVIEWER_FIELD from '@salesforce/schema/Account.WCF_Reviewer__c';
import WCF_APPROVER_FIELD from '@salesforce/schema/Account.WCF_Approver__c';

import {
    ROLES,
    ROLE_LABELS,
    getHeldRoles,
    resolveActiveRole,
    persistRole,
    setActiveRole,
    withRole
} from 'c/roleContext';

export default class WcfPortalHeader extends LightningElement {

    @api logoUrl = '/sfsites/c/resource/WIN_Logo';
    @api logoutUrl = '';
    @api loginUrl = '';
    @api homeUrl = '/';

    accountId;

    isValidator = false;
    isReviewer = false;
    isApprover = false;
    isLoading = true;

    isMoreOpen = false;
    isProfileOpen = false;
    isRoleOpen = false;

    activeRole = null;

    isGuestUser = isGuest;

    // Raw paths without the role param. The `urls` getter adds it.
    _baseUrls = {
        validatorDashboard: '#',
        reviewerDashboard: '#',
        approverDashboard: '#',
        complianceDocuments: '#',
        sourcingChannelReport: '#'
    };

    _pagePathMap = {
        validatorDashboard: '/wg-validator-dashboard',
        reviewerDashboard: '/wg-reviewer-dashboard',
        approverDashboard: '/approverdashboard',
        complianceDocuments: '/wg-compliance-documents',
        sourcingChannelReport: '/wg-sourcing-channel-report'
    };

    // Where each role lands when selected from the dropdown.
    _roleLandingKey = {
        [ROLES.VALIDATOR]: 'validatorDashboard',
        [ROLES.REVIEWER]: 'reviewerDashboard',
        [ROLES.APPROVER]: 'approverDashboard'
    };

    _homeUrlExplicitlySet = false;
    _logoutUrlExplicitlySet = false;
    _loginUrlExplicitlySet = false;

    connectedCallback() {

        this._homeUrlExplicitlySet =
            !!this.homeUrl && this.homeUrl !== '/';

        this._logoutUrlExplicitlySet =
            !!this.logoutUrl;

        this._loginUrlExplicitlySet =
            !!this.loginUrl;

        this._resolveUrls();

        if (this.isGuestUser) {
            this.isLoading = false;
        } else {
            this._loadCurrentAccountId();
        }

        this._outsideClickHandler = () => {
            this.isMoreOpen = false;
            this.isProfileOpen = false;
            this.isRoleOpen = false;
        };

        document.addEventListener('click', this._outsideClickHandler);
    }

    disconnectedCallback() {
        document.removeEventListener('click', this._outsideClickHandler);
    }

    _resolveUrls() {

        const currentPath = window.location.pathname;

        const marker = '/s/';
        const markerIndex = currentPath.indexOf(marker);

        const basePath =
            markerIndex !== -1
                ? currentPath.substring(0, markerIndex + marker.length - 1)
                : '';

        const siteRootPath =
            markerIndex !== -1
                ? currentPath.substring(0, markerIndex)
                : '';

        if (!this._homeUrlExplicitlySet) {
            this.homeUrl = basePath ? `${basePath}/` : '/';
        }

        if (!this._loginUrlExplicitlySet) {
            this.loginUrl = siteRootPath
                ? `${siteRootPath}/login`
                : '/login';
        }

        if (!this._logoutUrlExplicitlySet) {
            const loginPath = siteRootPath ? `${siteRootPath}/login` : '/login';
            const returnUrl = encodeURIComponent(loginPath);
            this.logoutUrl = siteRootPath
                ? `${siteRootPath}/secur/logout.jsp?retURL=${returnUrl}`
                : `/secur/logout.jsp?retURL=${returnUrl}`;
        }

        const resolved = {};
        Object.keys(this._pagePathMap).forEach(key => {
            resolved[key] = `${basePath}${this._pagePathMap[key]}`;
        });

        this._baseUrls = resolved;
    }

    async _loadCurrentAccountId() {
        try {
            this.accountId = await getCurrentAccountId();
            if (!this.accountId) {
                this.isLoading = false;
            }
        } catch (e) {
            console.error('Failed to resolve Account Id', e);
            this.isLoading = false;
        }
    }

    @wire(getRecord, {
        recordId: '$accountId',
        fields: [WCFS_VALIDATOR_FIELD, WCF_REVIEWER_FIELD, WCF_APPROVER_FIELD]
    })
    wiredAccount({ data, error }) {

        if (data) {
            this.isValidator = Boolean(data.fields.WCFs_Validator__c?.value);
            this.isReviewer = Boolean(data.fields.WCF_Reviewer__c?.value);
            this.isApprover = Boolean(data.fields.WCF_Approver__c?.value);

            this._resolveRole();
            this.isLoading = false;

        } else if (error) {
            console.error('Failed loading Account', error);
            this.isValidator = false;
            this.isReviewer = false;
            this.isApprover = false;
            this.activeRole = null;
            this.isLoading = false;
        }
    }

    /*
     * ==========================
     * ROLE SWITCHER
     * ==========================
     */

    get roleContext() {
        return {
            isGuest: this.isGuestUser,
            isValidator: this.isValidator,
            isReviewer: this.isReviewer,
            isApprover: this.isApprover
        };
    }

    _resolveRole() {
        this.activeRole = resolveActiveRole(this.roleContext);
        persistRole(this.activeRole);
    }

    get heldRoles() {
        return getHeldRoles(this.roleContext);
    }

    // A one-item picklist is noise. Single-role users get it applied silently.
    // Show the chip whenever a role resolved — it's useful context even
// when there's nothing to switch to.
get showRoleChip() {
    return !this.isGuestUser && !!this.activeRole;
}

// Only interactive when there's an actual choice to make.
get isRoleSwitchable() {
    return this.heldRoles.length > 1;
}

    get activeRoleLabel() {
        return this.activeRole ? ROLE_LABELS[this.activeRole] : '';
    }

    get roleOptions() {
        return this.heldRoles.map(role => {
            const isSelected = role === this.activeRole;
            return {
                value: role,
                label: ROLE_LABELS[role],
                isSelected,
                cssClass: isSelected
                    ? 'wcf-dropdown__item wcf-dropdown__item--role wcf-dropdown__item--role-active'
                    : 'wcf-dropdown__item wcf-dropdown__item--role'
            };
        });
    }

    toggleRole(event) {
        event.stopPropagation();
        this.isMoreOpen = false;
        this.isProfileOpen = false;
        this.isRoleOpen = !this.isRoleOpen;
    }

    handleRoleSelect(event) {
        event.stopPropagation();
        const role = event.currentTarget.dataset.role;
        this.isRoleOpen = false;

        if (!role || role === this.activeRole) {
            return;
        }

        const landingKey = this._roleLandingKey[role];
        setActiveRole(role, landingKey ? this._baseUrls[landingKey] : null);
    }

    /*
     * ==========================
     * LINKS — every in-app link carries ?role= so the role survives the hop
     * ==========================
     */

    get urls() {
        const out = {};
        Object.keys(this._baseUrls).forEach(key => {
            out[key] = withRole(this._baseUrls[key], this.activeRole);
        });
        return out;
    }

    get homeHref() {
        return withRole(this.homeUrl, this.activeRole);
    }

    /*
     * ==========================
     * ROLE VISIBILITY
     *
     * Gated on the active role AND on the role being held. The held check
     * means a tampered ?role= can never surface a tab the user has no
     * claim to; the active check is what makes the switcher filter.
     * ==========================
     */

    get showValidatorTabs() {
        return !this.isGuestUser
            && this.isValidator
            && this.activeRole === ROLES.VALIDATOR;
    }

    get showReviewerTabs() {
        return !this.isGuestUser
            && this.isReviewer
            && this.activeRole === ROLES.REVIEWER;
    }

    get showApproverTabs() {
        return !this.isGuestUser
            && this.isApprover
            && this.activeRole === ROLES.APPROVER;
    }

    /*
     * "More" contents are role-specific:
     *   Validator → Sourcing Channel Report
     *   Reviewer  → Compliance Documents
     *   Approver  → nothing, so the trigger is hidden entirely
     */
    get moreItems() {
        const items = [];

        if (this.showValidatorTabs) {
            items.push({
                key: 'sourcingChannelReport',
                label: 'Sourcing Channel Report',
                icon: 'utility:summary',
                url: this.urls.sourcingChannelReport
            });
        }

        if (this.showReviewerTabs) {
            items.push({
                key: 'complianceDocuments',
                label: 'Compliance Document Requests',
                icon: 'utility:file',
                url: this.urls.complianceDocuments
            });
        }

        return items;
    }

    get showMore() {
        return this.moreItems.length > 0;
    }

    toggleMore(event) {
        event.stopPropagation();
        this.isProfileOpen = false;
        this.isRoleOpen = false;
        this.isMoreOpen = !this.isMoreOpen;
    }

    toggleProfile(event) {
        event.stopPropagation();
        this.isMoreOpen = false;
        this.isRoleOpen = false;
        this.isProfileOpen = !this.isProfileOpen;
    }
}