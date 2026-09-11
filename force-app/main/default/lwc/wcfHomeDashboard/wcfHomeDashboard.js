import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPipelineCounts from '@salesforce/apex/wcfHomeDashboardController.getPipelineCounts';
import getDashboardAccess from '@salesforce/apex/WCFDashboardAccessController.getDashboardAccess';

import {
    ROLES,
    ROLE_LABELS,
    getHeldRoles,
    resolveActiveRole,
    persistRole,
    setActiveRole
} from 'c/roleContext';

/**
 * Tile definitions. `role` is the role required to DRILL IN — counts stay
 * visible to everyone because the strip is a funnel overview, but the
 * navigation behind each tile belongs to one role.
 */
const TILES = [
    {
        key: 'submitted',
        row: 'intake',
        label: 'Submitted',
        sub: 'Total received',
        icon: 'utility:download',
        dotClass: 'ps-dot ps-dot--blue',
        variant: '',
        role: ROLES.VALIDATOR,
        page: 'ValidatorPortal__c',
        state: { statusFilter: 'validate' }
    },
    {
        key: 'validation',
        row: 'intake',
        label: 'Validated',
        sub: 'Total Validated',
        icon: 'utility:shield',
        dotClass: 'ps-dot ps-dot--orange',
        variant: '',
        role: ROLES.VALIDATOR,
        page: 'ValidatorPortal__c',
        state: { statusFilter: 'validate' }
    },
    {
        key: 'flagged',
        row: 'intake',
        label: 'Flagged',
        sub: 'Needs decision',
        icon: 'utility:flag',
        dotClass: 'ps-dot ps-dot--red',
        variant: 'flag',
        role: ROLES.REVIEWER,
        page: 'wg_Reviewer_Queue__c',
        state: { statusFilter: 'flagged' }
    },
    {
        key: 'review',
        row: 'evaluation',
        label: 'Reviewed',
        sub: 'Evaluated',
        icon: 'utility:search',
        dotClass: 'ps-dot ps-dot--blue',
        variant: '',
        role: ROLES.REVIEWER,
        page: 'wg_Reviewer_Queue__c',
        state: {}
    },
    {
        key: 'approved',
        row: 'evaluation',
        label: 'Approved',
        sub: 'Funded',
        icon: 'utility:check',
        dotClass: 'ps-dot ps-dot--green',
        variant: 'approved',
        role: ROLES.APPROVER,
        page: 'ApproverListView__c',
        state: { statusFilter: 'approved' }
    }
];

export default class WcfPipelineStrip extends NavigationMixin(LightningElement) {

    @track counts = {
        submitted: 0,
        validation: 0,
        flagged: 0,
        review: 0,
        approval: 0,
        approved: 0
    };

    @track isLoading = true;
    @track loadError = null;

    @track isValidator = false;
    @track isReviewer  = false;
    @track isApprover  = false;
    @track activeRole  = null;
    @track accessNotice = null;

    connectedCallback() {
        this._loadAccess();
        this._loadCounts();
    }

    async _loadAccess() {
        try {
            const access = await getDashboardAccess();

            this.isValidator = access?.isValidator === true;
            this.isReviewer  = access?.isReviewer  === true;
            this.isApprover  = access?.isApprover  === true;

            this.activeRole = resolveActiveRole(this.roleContext);
            persistRole(this.activeRole);

        } catch (e) {
            console.error('Dashboard Access Error', e);
            // Fail closed: no role means every tile is locked, which is the
            // safe direction for an access check that didn't complete.
            this.isValidator = false;
            this.isReviewer  = false;
            this.isApprover  = false;
            this.activeRole  = null;
        }
    }

    async _loadCounts() {
        try {
            const counts = await getPipelineCounts();

            if (!counts) {
                throw new Error('Apex returned null — check class permissions');
            }

            this.counts = {
                submitted:  counts.submitted  ?? 0,
                validation: counts.validation ?? 0,
                flagged:    counts.flagged    ?? 0,
                review:     counts.review     ?? 0,
                approval:   counts.approval   ?? 0,
                approved:   counts.approved   ?? 0
            };
            this.loadError = null;

        } catch (e) {
            const msg = e?.body?.message
                     || e?.body?.output?.errors?.[0]?.message
                     || e?.message
                     || JSON.stringify(e);

            console.error('WcfPipelineStrip load error:', msg);
            this.loadError = msg;

            this.dispatchEvent(new ShowToastEvent({
                title   : 'Pipeline Strip — load error',
                message : msg,
                variant : 'error',
                mode    : 'sticky'
            }));

        } finally {
            this.isLoading = false;
        }
    }

    /*
     * ==========================
     * ROLE
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

    get heldRoles() {
        return getHeldRoles(this.roleContext);
    }

    /*
     * ==========================
     * TILES
     * ==========================
     */

    _buildTile(def) {
        const unlocked = this.activeRole === def.role;

        const cardClasses = ['ps-card'];
        if (def.variant === 'flag')     cardClasses.push('ps-card--flag');
        if (def.variant === 'approved') cardClasses.push('ps-card--approved');
        cardClasses.push(unlocked ? 'ps-card--clickable' : 'ps-card--locked');

        const countClasses = ['ps-count'];
        if (unlocked && def.variant === 'flag')     countClasses.push('ps-count--flag');
        if (unlocked && def.variant === 'approved') countClasses.push('ps-count--approved');
        if (!unlocked) countClasses.push('ps-count--locked');

        const iconClasses = ['ps-card-icon'];
        if (unlocked && def.variant === 'flag')     iconClasses.push('ps-card-icon--flag');
        if (unlocked && def.variant === 'approved') iconClasses.push('ps-card-icon--approved');

        return {
            key: def.key,
            label: def.label,
            sub: def.sub,
            icon: def.icon,
            dotClass: def.dotClass,
            count: this.counts[def.key] ?? 0,
            locked: !unlocked,
            cardClass: cardClasses.join(' '),
            countClass: countClasses.join(' '),
            iconClass: iconClasses.join(' '),
            lockHint: `${ROLE_LABELS[def.role]} only`
        };
    }

    get intakeTiles() {
        return TILES.filter(t => t.row === 'intake').map(t => this._buildTile(t));
    }

    get evaluationTiles() {
        return TILES.filter(t => t.row === 'evaluation').map(t => this._buildTile(t));
    }

    /*
     * ==========================
     * INTERACTION
     * ==========================
     */

    handleTileClick(event) {
        const key = event.currentTarget.dataset.key;
        const def = TILES.find(t => t.key === key);
        if (!def) return;

        if (this.activeRole === def.role) {
            this.accessNotice = null;
            this._navTo(def);
            return;
        }

        this.accessNotice = this._buildNotice(def);
    }

    /**
     * Two different situations, two different messages. Telling someone who
     * holds the role "you don't have access" would be wrong and confusing —
     * they do, they're just viewing as something else.
     */
    _buildNotice(def) {
        const roleLabel = ROLE_LABELS[def.role];
        const holdsRole = this.heldRoles.includes(def.role);

        if (holdsRole) {
            return {
                title: `${roleLabel} view required`,
                body: `${def.label} opens the ${roleLabel.toLowerCase()} queue. You're currently viewing as ${ROLE_LABELS[this.activeRole] || 'no role'}.`,
                canSwitch: true,
                switchRole: def.role,
                switchLabel: `Switch to ${roleLabel}`
            };
        }

        return {
            title: `No ${roleLabel.toLowerCase()} access`,
            body: `${def.label} is only available to users with the ${roleLabel} role. Contact your administrator if you need it.`,
            canSwitch: false
        };
    }

    handleSwitchRole() {
        const role = this.accessNotice?.switchRole;
        if (role) {
            setActiveRole(role);
        }
    }

    dismissNotice() {
        this.accessNotice = null;
    }

    _navTo(def) {
        // Carry the role forward so the destination page doesn't fall back
        // to the user's first held role on arrival.
        const state = { ...(def.state || {}), role: this.activeRole };

        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: def.page },
            state
        });
    }

    get hasError() {
        return !!this.loadError;
    }
}