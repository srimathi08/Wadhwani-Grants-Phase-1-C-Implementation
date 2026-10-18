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

const MAX_INLINE_SECONDARY = 3;


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

    // True only when this instance is rendering on the site's Home page
    // (never inside Experience Builder / preview).
    _onHome = false;
    _redirected = false;

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

    // Where each role lands when selected from the dropdown or forwarded from Home.
    _roleLandingKey = {
        [ROLES.VALIDATOR]: 'validatorDashboard',
        [ROLES.REVIEWER]: 'reviewerDashboard',
        [ROLES.APPROVER]: 'approverDashboard'
    };

    // Secondary nav items (inline tab or "More" dropdown) and the roles that
    // may see them. To expose an item to another role, add the role here.
    // Array order = display order. `key` must exist in _pagePathMap.
    _secondaryNavConfig = [
        {
            key: 'complianceDocuments',
            label: 'Compliance Document Requests',
            icon: 'utility:file',
            roles: [ROLES.REVIEWER]
        },
        {
            key: 'sourcingChannelReport',
            label: 'Sourcing Channel Report',
            icon: 'utility:summary',
            roles: [ROLES.VALIDATOR, ROLES.REVIEWER]
        }
    ];

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

        // Decided before first render so the overlay is up from the first paint.
        this._onHome = !this._isBuilderContext() && this._isHomePage();

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

    /*
     * ==========================
     * URL RESOLUTION
     * ==========================
     */

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

    /*
     * ==========================
     * HOME → DASHBOARD REDIRECT
     * ==========================
     */

    // Never redirect inside Experience Builder / preview, or Home can't be edited.
    _isBuilderContext() {
        return /builder|live-preview|sitepreview/i.test(window.location.hostname);
    }

    _isHomePage() {
        const normalize = p => (p || '').replace(/\/+$/, '');
        const homePath = new URL(this.homeUrl, window.location.origin).pathname;
        return normalize(window.location.pathname) === normalize(homePath);
    }

    // Mask is shown only on Home, and only while the role is resolving or the
    // redirect is in flight. Guests and no-role users drop out of both states,
    // so they are never stuck behind it.
    get showRedirectOverlay() {
        return this._onHome && (this.isLoading || this._redirected);
    }

    _redirectHomeToLanding() {
        if (!this._onHome || this._redirected) {
            return;
        }

        const landingKey = this._roleLandingKey[this.activeRole];
        const target = landingKey ? this.urls[landingKey] : null;
        if (!target || target === '#') {
            return;
        }

        this._redirected = true;

        // replace(): Home never enters history, so Back can't bounce through it.
        window.location.replace(target);
    }

    /*
     * ==========================
     * DATA LOAD
     * ==========================
     */

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
        this._redirectHomeToLanding();
    }

    get heldRoles() {
        return getHeldRoles(this.roleContext);
    }

    // Show the chip whenever a role resolved — useful context even when
    // there's nothing to switch to.
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

    // Logo goes to the user's own dashboard; falls back to Home (guest / no role).
    get homeHref() {
        const landingKey = this._roleLandingKey[this.activeRole];
        return landingKey
            ? this.urls[landingKey]
            : withRole(this.homeUrl, this.activeRole);
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

    // True when `role` is the active role (held-check included).
    // Single source of truth for the per-role flags above.
    _isActiveHeldRole(role) {
        switch (role) {
            case ROLES.VALIDATOR:
                return this.showValidatorTabs;
            case ROLES.REVIEWER:
                return this.showReviewerTabs;
            case ROLES.APPROVER:
                return this.showApproverTabs;
            default:
                return false;
        }
    }

    /*
     * Secondary items are driven by _secondaryNavConfig:
     *   Validator → Sourcing Channel Report
     *   Reviewer  → Compliance Document Requests, Sourcing Channel Report
     *   Approver  → nothing, so the trigger is hidden entirely
     */
    get moreItems() {
        return this._secondaryNavConfig
            .filter(item => item.roles.some(role => this._isActiveHeldRole(role)))
            .map(item => ({
                key: item.key,
                label: item.label,
                icon: item.icon,
                url: this.urls[item.key]
            }));
    }

    // One extra item reads better as a normal tab than as a dropdown with a single entry.
       // Overflow rule:
    //  - Up to MAX_INLINE_SECONDARY items: all inline, no dropdown.
    //  - Beyond that: keep (MAX - 1) inline and move the rest into "More",
    //    so the dropdown always holds 2+ items and never a lone entry.
    get _inlineCount() {
        const total = this.moreItems.length;
        return total <= MAX_INLINE_SECONDARY
            ? total
            : MAX_INLINE_SECONDARY - 1;
    }

    get inlineItems() {
        return this.moreItems.slice(0, this._inlineCount);
    }

    get dropdownItems() {
        return this.moreItems.slice(this._inlineCount);
    }

    get showMore() {
        return this.dropdownItems.length > 0;
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