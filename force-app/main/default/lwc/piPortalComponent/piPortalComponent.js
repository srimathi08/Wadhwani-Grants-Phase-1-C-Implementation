import { LightningElement, track } from 'lwc';
import getPortalContext from '@salesforce/apex/PiPortalController.getPortalContext';
import getMyProposals from '@salesforce/apex/PiPortalController.getMyProposals';

const BASE = '/WadhwaniOrg';

export default class PiPortalComponent extends LightningElement {

    // =========================
    // STATE
    // =========================
    @track ctx;
    @track myProposals = [];

    isLoading = true;

    selectedProposalId = '';
    selectedProposalStatus = '';

    // =========================
    // LIFECYCLE
    // =========================
    connectedCallback() {
        this.load();
    }

    async load() {
        try {
            this.isLoading = true;
            this.ctx = await getPortalContext();
            this.myProposals = await getMyProposals();
        } catch (e) {
            console.error('PI Portal load error', e);
        } finally {
            this.isLoading = false;
        }
    }

    // =========================
    // CONTEXT GETTERS
    // =========================
    get contactName() {
        return this.ctx?.contactName || 'PI';
    }

    get contactEmail() {
        return this.ctx?.contactEmail;
    }

    get accountName() {
        return this.ctx?.accountName;
    }

    // ✅ COUNTS (used in HTML badges)
    get draftProposalCount() {
        return this.ctx?.draftProposalCount ?? 0;
    }

    get totalProposalCount() {
        return this.ctx?.totalProposalCount ?? 0;
    }

    // =========================
    // PROFILE AVATAR
    // =========================
    get initials() {
        const name = (this.contactName || '').trim();
        if (!name) return 'PI';

        const parts = name.split(' ').filter(Boolean);
        const first = parts[0]?.charAt(0) || 'P';
        const last = parts.length > 1
            ? parts[parts.length - 1].charAt(0)
            : 'I';

        return (first + last).toUpperCase();
    }

    // =========================
    // PROPOSAL DROPDOWN
    // =========================
    get proposalOptions() {
        return (this.myProposals || []).map(p => ({
            label: `${p.name} — ${p.projectTitle || 'Untitled'}`,
            value: p.id
        }));
    }

    handleProposalChange(event) {
        this.selectedProposalId = event.target.value;

        if (!this.selectedProposalId) {
            this.selectedProposalStatus = '';
            return;
        }

        const selected = (this.myProposals || [])
            .find(p => p.id === this.selectedProposalId);

        this.selectedProposalStatus = selected?.status || '';
    }

    // =========================
    // STEPPER LOGIC
    // =========================
    get stepperWrapperClass() {
        return this.selectedProposalId
            ? 'wf-stepper'
            : 'wf-stepper wf-stepper-disabled';
    }

    get majorStage() {
        if (!this.selectedProposalId) return 'NONE';

        const s = (this.selectedProposalStatus || '').toLowerCase();

        if (s.includes('draft')) return 'DRAFT';
        if (s.includes('coe')) return 'COE';
        if (s.includes('win')) return 'WIN';
        if (s.includes('review')) return 'WIN';
        if (s.includes('approved')) return 'APPROVED';
        if (s.includes('rejected') || s.includes('not recommended')) return 'DECISION';

        return 'COE';
    }

    get stepClassDraft() { return this.getStepClass('DRAFT'); }
    get stepClassCOE() { return this.getStepClass('COE'); }
    get stepClassWIN() { return this.getStepClass('WIN'); }
    get stepClassDecision() { return this.getStepClass('DECISION'); }
    get stepClassApproved() { return this.getStepClass('APPROVED'); }

    getStepClass(step) {
        const base = 'wf-step';

        if (!this.selectedProposalId) {
            return `${base} wf-step-inactive`;
        }

        const order = ['DRAFT', 'COE', 'WIN', 'DECISION', 'APPROVED'];
        const current = this.majorStage;

        const idxCurrent = order.indexOf(current);
        const idxStep = order.indexOf(step);

        if (idxStep < idxCurrent) return `${base} wf-step-done`;
        if (idxStep === idxCurrent) return `${base} wf-step-active`;
        return base;
    }

    // =========================
    // NAVIGATION ACTIONS
    // =========================
    handleRegister() {
        window.location.assign(`${BASE}/s/pi-registration`);
    }

    handleSubmitProposal() {
        window.location.assign(`${BASE}/s/project-proposal-submission`);
    }

    handleViewDrafts() {
        window.location.assign(`${BASE}/s/draftlistviewwin`);
    }

    handleViewAllProposals() {
        window.location.assign(
            `${BASE}/s/individualapplication/IndividualApplication/00BGA00000KFvgw2AD`
        );
    }

    handleViewApprovedFunding() {
        window.location.assign(`${BASE}/s/approved-for-funding-proposals`);
    }

    // 🔹 NEW NAVIGATION (Proposal Reviews Tile)
    handleViewProposalReviews() {
        window.location.assign(`${BASE}/s/proposal-reviews`);
    }

    handleViewSelectedProposal() {
        if (!this.selectedProposalId) return;
        window.location.assign(
            `${BASE}/s/individualapplication/${this.selectedProposalId}`
        );
    }
    handleViewReviewerQueries(){
         window.location.assign(`${BASE}/s/pi-reviewer-query-list`);
    }

    get isViewProposalDisabled() {
        return !this.selectedProposalId;
    }
}