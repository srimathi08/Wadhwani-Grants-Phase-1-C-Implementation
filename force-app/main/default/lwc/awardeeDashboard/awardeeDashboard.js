import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

/* ================= APEX ================= */

import getTotalApprovedProjectBudget
    from '@salesforce/apex/AwardeeModuleController.getTotalApprovedProjectBudget';

import getTotalFundsReleasedSafe
    from '@salesforce/apex/AwardeeModuleController.getTotalFundsReleasedSafe';

import getTotalFundsAvailableSafe
    from '@salesforce/apex/AwardeeModuleController.getTotalFundsAvailableSafe';

import getApprovedCoes
    from '@salesforce/apex/AwardeeModuleController.getApprovedCoes';

import getProposalsWithMilestoneStatus
    from '@salesforce/apex/AwardeeModuleController.getProposalsWithMilestoneStatus';

/* ================= COMPONENT ================= */

export default class AwardeeDashboard extends NavigationMixin(LightningElement) {

    /* ================= KPI ================= */

    @track totalProposalCost = 0;
    @track totalFundsReleased = 0;
    @track totalFundsAvailable = 0;

    /* ================= MODE ================= */

    @track isCoeMode = false;
    @track selectedFundingYear = null;

    /* ================= DATA ================= */

    @track proposalList = [];
    @track coeList = [];

    @track offsetValue = 0;
    pageSize = 10;

    @track showProposalTab = true;
    @track showCoeTab = false;

    /* ================= FILTER STATE ================= */

    // UI-only values
    @track uiFundingYear = null;
    @track uiFundingType = null;

    // Applied values (used in Apex)
    @track appliedFundingYear = null;
    @track appliedFundingType = null;

   fundingYearOptions = [
    { label: 'All Years', value: '' },
    { label: '2024', value: '2024' },
    { label: '2025', value: '2025' },
    { label: '2026', value: '2026' }
];

    fundingTypeOptions = [
        { label: 'COE Operational Grant', value: 'COE Operational Grant' },
        { label: 'COE Project Grant', value: 'COE Project Grant' }
    ];

    /* ================= MODAL ================= */

    @track isDisburseModalOpen = false;
    @track selectedAccountId = null;

    /* ================= INIT ================= */

    connectedCallback() {
        const currentYear = new Date().getFullYear().toString();

        //this.uiFundingYear = currentYear;
        this.uiFundingType = null;
        this.selectedFundingYear = currentYear;
this.uiFundingYear = currentYear;
this.appliedFundingYear = currentYear;
        //this.appliedFundingYear = currentYear;
        this.appliedFundingType = null;

        this.isCoeMode = false;

        this.loadKpiData();
        this.loadProposals();
        this.loadCoes();
    }

    /* ================= KPI ================= */

    loadKpiData() {
        getTotalApprovedProjectBudget({
            fundingYear: this.appliedFundingYear
        }).then(res => {
            this.totalProposalCost = res || 0;
        });

        getTotalFundsReleasedSafe({
            fundingYear: this.appliedFundingYear,
            fundingType: this.appliedFundingType,
            isCoeMode: this.isCoeMode
        }).then(res => {
            this.totalFundsReleased = res || 0;
        });

        getTotalFundsAvailableSafe({
            fundingYear: this.appliedFundingYear,
            fundingType: this.appliedFundingType,
            isCoeMode: this.isCoeMode
        }).then(res => {
            this.totalFundsAvailable = res || 0;
        });
    }

    /* ================= DATA ================= */

    loadProposals() {
        getProposalsWithMilestoneStatus({
            offsetValue: this.offsetValue,
            pageSize: this.pageSize,
            fundingYear: this.appliedFundingYear
        }).then(result => {
            this.proposalList = (result || []).map(row => {
                const total = row.totalMilestones || 0;
                const done = row.reportSubmitted || 0;
                const percent = total > 0 ? Math.round((done / total) * 100) : 0;

                return {
                    ...row,
                    milestoneChipClass: this.getMilestoneChipClass(row.chipType),
                    milestoneStyle: `--progress:${percent}%`
                };
            });
        });
    }

    loadCoes() {
        getApprovedCoes().then(result => {
            this.coeList = result || [];
        });
    }

    /* ================= FILTER HANDLERS ================= */

  handleFundingYearChange(event) {
    this.selectedFundingYear = event.detail.value;
    this.uiFundingYear = event.detail.value || null;
}

    handleFundingTypeChange(event) {
        this.uiFundingType = event.detail.value || null;
    }

    handleApplyFilters() {
        this.offsetValue = 0;

        this.appliedFundingYear = this.uiFundingYear;
        this.appliedFundingType = this.uiFundingType;

        this.loadKpiData();

        this.isCoeMode ? this.loadCoes() : this.loadProposals();
    }

    handleResetFilters() {
        const currentYear = new Date().getFullYear().toString();

        this.uiFundingYear = currentYear;
        this.uiFundingType = null;

        this.appliedFundingYear = currentYear;
        this.appliedFundingType = null;

        this.offsetValue = 0;

        this.loadKpiData();
        this.loadProposals();
    }

    /* ================= PAGINATION ================= */

    handleNext() {
        this.offsetValue += this.pageSize;
        this.loadProposals();
    }

    handlePrevious() {
        if (this.offsetValue > 0) {
            this.offsetValue -= this.pageSize;
            this.loadProposals();
        }
    }

    /* ================= TABS ================= */

    openProposalTab() {
        this.showProposalTab = true;
        this.showCoeTab = false;
        this.isCoeMode = false;
        this.loadKpiData();
        this.loadProposals();
    }

    openCoeTab() {
        this.showProposalTab = false;
        this.showCoeTab = true;
        this.isCoeMode = true;
        this.loadKpiData();
        this.loadCoes();
    }

    get proposalTabClass() {
        return this.showProposalTab ? 'tab-pill active' : 'tab-pill';
    }

    get coeTabClass() {
        return this.showCoeTab ? 'tab-pill active' : 'tab-pill';
    }
    get isReadOnly() {
    return true;
}
    /* ================= NAV ================= */

    handleOpenProposal(event) {
        const proposalId = event.currentTarget.dataset.id;
        if (!proposalId) return;

        window.open(`/lightning/r/IndividualApplication/${proposalId}/view`, '_blank');
    }

    handleViewAllMilestones(event) {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: { apiName: 'Milestone_Review' },
            state: {
                c__proposalId: event.currentTarget.dataset.proposalId,
                c__accountId: event.currentTarget.dataset.accountId
            }
        });
    }

    /* ================= MODAL ================= */

    handleOpenDisburseModal(event) {
        this.selectedAccountId = event.currentTarget.dataset.accountId;
        this.isDisburseModalOpen = true;
    }

    handleCloseModal() {
        this.isDisburseModalOpen = false;
        this.selectedAccountId = null;
    }

    handleRecordSaved() {
        this.handleCloseModal();
        this.loadKpiData();
        this.loadCoes();
        this.loadProposals();
    }

    /* ================= UTIL ================= */

    getMilestoneChipClass(type) {
        if (type === 'completed') return 'milestone-chip green';
        if (type === 'progress') return 'milestone-chip orange';
        if (type === 'pending') return 'milestone-chip red';
        return 'milestone-chip gray';
    }
    @track isHistoryModalOpen = false;
@track historyAccountId = null;

handleOpenHistoryModal(event) {
    this.historyAccountId = event.currentTarget.dataset.accountId;
    this.isHistoryModalOpen = true;
}

handleCloseHistoryModal() {
    this.isHistoryModalOpen = false;
    this.historyAccountId = null;
}
}