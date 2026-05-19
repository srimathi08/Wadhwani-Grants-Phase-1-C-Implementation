import { LightningElement, track } from 'lwc';
import getReport from '@salesforce/apex/ReviewerReportService.getReport';
import getUnassignedProposals from '@salesforce/apex/ReviewerReportService.getUnassignedProposals';
import getProposalReviewReport from '@salesforce/apex/ReviewerReportService.getProposalReviewReport';
import { loadScript } from 'lightning/platformResourceLoader';
import XLSX_LIB from '@salesforce/resourceUrl/xlsx';

export default class ReviewerReport extends LightningElement {

    /* ================= STATE ================= */
    @track rows = [];              // Assigned proposals
    @track unassignedRows = [];    // Unassigned proposals
    @track proposalRows = [];      // Proposal review report

    fromDate;
    toDate;
    showFilter = false;
    xlsxLoaded = false;
    activeTab = 'assigned';

    /* ================= COLUMNS ================= */

    // ----- Assigned proposals -----
    columns = [
        {
            label: 'Reviewer Name',
            fieldName: 'reviewerUrl',
            type: 'url',
            typeAttributes: {
                label: { fieldName: 'reviewerName' },
                target: '_blank'
            },
            sortable: true
        },
        {
            label: 'Proposal ID',
            fieldName: 'proposalUrl',
            type: 'url',
            typeAttributes: {
                label: { fieldName: 'proposalName' },
                target: '_blank'
            },
            sortable: true
        },
        {
            label: 'Project Title',
            fieldName: 'projectTitle',
            sortable: true
        },
        {
            label: 'Proposal Review Status',
            fieldName: 'reviewStatus',
            sortable: true
        },
        {
            label: 'COE Name',
            fieldName: 'coeName',
            sortable: true
        },
        {
            label: 'Assigned Date',
            fieldName: 'assignedDate',
            type: 'date',
            sortable: true,
            typeAttributes: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }
        }
    ];

    // ----- Unassigned proposals -----
    unassignedColumns = [
        {
            label: 'Proposal ID',
            fieldName: 'proposalUrl',
            type: 'url',
            typeAttributes: {
                label: { fieldName: 'proposalName' },
                target: '_blank'
            }
        },
        {
            label: 'Project Title',
            fieldName: 'projectTitle'
        },
        {
            label: 'COE Name',
            fieldName: 'coeName'
        },
        {
            label: 'Created Date',
            fieldName: 'createdDate',
            type: 'date',
            sortable: true,
            typeAttributes: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }
        }
    ];

    // ----- Proposal review report -----
    proposalColumns = [
        {
            label: 'Proposal ID',
            fieldName: 'proposalUrl',
            type: 'url',
            typeAttributes: {
                label: { fieldName: 'proposalName' },
                target: '_blank'
            }
        },
        {
            label: 'Proposal Title',
            fieldName: 'projectTitle'
        },
        {
            label: 'COE Name',
            fieldName: 'coeName'
        },
        {
            label: 'Reviewer Name',
            fieldName: 'reviewerName'
        },
        {
            label: 'Review Status',
            fieldName: 'reviewStatus'
        },

        /* 🔹 NEW FIELDS – ADDED WITHOUT AFFECTING LOGIC */
        {
            label: 'Total Score',
            fieldName: 'totalScore'
        },
        {
            label: 'Final Recommendation',
            fieldName: 'finalRecommendation'
        },

        {
            label: 'Assigned Date',
            fieldName: 'assignedDate',
            type: 'date',
            sortable: true,
            typeAttributes: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }
        }
    ];

    /* ================= LIFECYCLE ================= */
    connectedCallback() {
        this.loadAssignedData();
        this.loadUnassignedData();
        this.loadProposalData();
    }

    renderedCallback() {
        if (this.xlsxLoaded) return;

        this.xlsxLoaded = true;
        loadScript(this, XLSX_LIB).catch(error => {
            console.error('Failed to load XLSX library', error);
        });
    }

    /* ================= TAB HANDLING ================= */
    handleTabChange(event) {
        this.activeTab = event.target.value;
    }

    get filterTitle() {
        return this.activeTab === 'unassigned'
            ? 'Filter by Proposal Created Date'
            : 'Filter by Assignment Date';
    }

    /* ================= FILTER MODAL ================= */
    openFilterModal() {
        this.showFilter = true;
    }

    closeFilterModal() {
        this.showFilter = false;
    }

    applyFilters() {
        this.showFilter = false;

        if (this.activeTab === 'assigned') {
            this.loadAssignedData();
        } else if (this.activeTab === 'unassigned') {
            this.loadUnassignedData();
        } else if (this.activeTab === 'proposal') {
            this.loadProposalData();
        }
    }

    /* ================= DATE HANDLERS ================= */
    handleFromDate(event) {
        this.fromDate = event.target.value;
    }

    handleToDate(event) {
        this.toDate = event.target.value;
    }

    /* ================= DATA LOAD ================= */

    loadAssignedData() {
        getReport({ fromDate: this.fromDate, toDate: this.toDate })
            .then(data => {
                this.rows = (data || []).map((row, index) => ({
                    ...row,
                    rowKey: index,
                    reviewerUrl: '/' + row.reviewerId,
                    proposalUrl: '/' + row.proposalId
                }));
            })
            .catch(error => {
                console.error('Error loading reviewer assignment report', error);
            });
    }

    loadUnassignedData() {
        getUnassignedProposals({ fromDate: this.fromDate, toDate: this.toDate })
            .then(data => {
                this.unassignedRows = (data || []).map((row, index) => ({
                    ...row,
                    rowKey: index,
                    proposalUrl: '/' + row.proposalId
                }));
            })
            .catch(error => {
                console.error('Error loading unassigned proposals', error);
            });
    }

    loadProposalData() {
        getProposalReviewReport({ fromDate: this.fromDate, toDate: this.toDate })
            .then(data => {
                this.proposalRows = (data || []).map((row, index) => ({
                    ...row,
                    rowKey: index,
                    proposalUrl: '/' + row.proposalId
                }));
            })
            .catch(error => {
                console.error('Error loading proposal review report', error);
            });
    }

    /* ================= XLSX EXPORT ================= */

    buildExportData(data, columns) {
        return data.map(row => {
            const exportRow = {};

            columns.forEach(col => {
                if (!col.label || !col.fieldName) return;

                if (
                    col.type === 'url' &&
                    col.typeAttributes &&
                    col.typeAttributes.label &&
                    col.typeAttributes.label.fieldName
                ) {
                    exportRow[col.label] =
                        row[col.typeAttributes.label.fieldName] ?? '';
                } else {
                    exportRow[col.label] =
                        row[col.fieldName] ?? '';
                }
            });

            return exportRow;
        });
    }

    exportExcel() {
        const exportData = this.buildExportData(this.rows, this.columns);
        this.exportGenericExcel(exportData, 'Reviewer_Assignment_Report');
    }

    exportUnassignedExcel() {
        const exportData = this.buildExportData(
            this.unassignedRows,
            this.unassignedColumns
        );
        this.exportGenericExcel(exportData, 'Unassigned_Proposals_Report');
    }

    exportProposalExcel() {
        const exportData = this.buildExportData(
            this.proposalRows,
            this.proposalColumns
        );
        this.exportGenericExcel(exportData, 'Proposal_Review_Report');
    }

    exportGenericExcel(data, fileName) {
        if (!data || !data.length || !window.XLSX) return;

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
}