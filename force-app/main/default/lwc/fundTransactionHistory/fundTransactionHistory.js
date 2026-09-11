import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';
import getTransactionHistory from '@salesforce/apex/Fundtransactionhistorycontroller.getTransactionHistory';
import getTransactionHistoryForExport from '@salesforce/apex/Fundtransactionhistorycontroller.getTransactionHistoryForExport';

import XLSX_RESOURCE from '@salesforce/resourceUrl/xlsx';
import JSPDF_RESOURCE from '@salesforce/resourceUrl/downloadjs';
import JSPDF_AUTOTABLE_RESOURCE from '@salesforce/resourceUrl/autotable';

// All records in this org carry CurrencyIsoCode = USD. Change this single constant
// if the org switches to INR — the grid, the KPI tiles and the exports all read it.
const CURRENCY = 'USD';
const CURRENCY_LOCALE = 'en-US';

const TRANSACTION_TYPE_OPTIONS = [
    { label: 'All Types', value: 'All' },
    { label: 'Funding Award', value: 'Funding Award' },
    { label: 'Fund Request', value: 'Fund Request' },
    { label: 'Fund Disbursement', value: 'Fund Disbursement' },
    { label: 'Utilization Update', value: 'Utilization Update' },
    { label: 'Report Submitted', value: 'Report Submitted' },
    { label: 'Report Approved', value: 'Report Approved' }
];

// lightning-datatable's built-in type:'currency' formats using the VIEWING USER'S
// Salesforce locale for digit grouping (so an en-IN user sees "$1,00,000" even with
// currencyCode forced to USD) — there's no override for that on the base type. So
// every financial column below is pre-formatted server-agnostic text using
// Intl.NumberFormat('en-US', ...) in decorateRow(), same approach as the KPI tiles,
// which guarantees "$100,000" style USD formatting for every viewer regardless of
// their personal locale setting.

// Applied to the five financial columns that can show either a single milestone's
// figure or a proposal-wide roll-up, so the roll-up rows read visually distinct
// instead of looking like a data-entry error.
const AGGREGATE_CELL_ATTRS = {
    alignment: 'right',
    class: { fieldName: 'financialsClass' }
};

const RIGHT_ALIGN_CELL_ATTRS = { alignment: 'right' };

const COLUMNS = [
    {
        label: 'Date', fieldName: 'transactionDate', type: 'date-local', sortable: true,
        typeAttributes: { day: '2-digit', month: 'short', year: 'numeric' }, initialWidth: 110
    },
    { label: 'Transaction Type', fieldName: 'transactionType', type: 'text', initialWidth: 150 },
    {
        label: 'Proposal', fieldName: 'proposalUrl', type: 'url', initialWidth: 150,
        typeAttributes: { label: { fieldName: 'proposalName' }, target: '_self' }
    },
    { label: 'Project Title', fieldName: 'projectTitle', type: 'text', initialWidth: 180 },
    {
        label: 'Milestone', fieldName: 'milestoneUrl', type: 'url', initialWidth: 190,
        typeAttributes: { label: { fieldName: 'milestoneName' }, target: '_self' },
        cellAttributes: { class: { fieldName: 'financialsClass' } }
    },
    { label: 'Funding Type', fieldName: 'fundingType', type: 'text', initialWidth: 150 },
    {
        label: 'Amount', fieldName: 'amountDisplay', type: 'text',
        cellAttributes: RIGHT_ALIGN_CELL_ATTRS, initialWidth: 120
    },
    {
        label: 'Total Project Budget', fieldName: 'totalProjectBudgetDisplay', type: 'text',
        cellAttributes: RIGHT_ALIGN_CELL_ATTRS, initialWidth: 160
    },
    {
        label: 'Milestone Budget', fieldName: 'milestoneBudgetDisplay', type: 'text',
        cellAttributes: AGGREGATE_CELL_ATTRS, initialWidth: 150
    },
    {
        label: 'Disbursed Amount', fieldName: 'disbursedAmountDisplay', type: 'text',
        cellAttributes: AGGREGATE_CELL_ATTRS, initialWidth: 150
    },
    {
        label: 'Utilized Amount', fieldName: 'utilizedAmountDisplay', type: 'text',
        cellAttributes: AGGREGATE_CELL_ATTRS, initialWidth: 145
    },
    {
        label: 'Balance Remaining', fieldName: 'milestoneBalanceDisplay', type: 'text',
        cellAttributes: AGGREGATE_CELL_ATTRS, initialWidth: 160
    },
    {
        label: 'Unutilized Amount', fieldName: 'unutilizedAmountDisplay', type: 'text',
        cellAttributes: AGGREGATE_CELL_ATTRS, initialWidth: 155
    }
];

const EXPORT_HEADERS = [
    'Date', 'Transaction Type', 'Proposal', 'Project Title', 'Milestone', 'Funding Type',
    'Amount', 'Total Project Budget', 'Milestone Budget', 'Disbursed Amount',
    'Utilized Amount', 'Balance Remaining', 'Unutilized Amount'
];

export default class FundTransactionHistory extends NavigationMixin(LightningElement) {
    @api cardTitle = 'Fund Transaction History';

    columns = COLUMNS;
    transactionTypeOptions = TRANSACTION_TYPE_OPTIONS;

    filters = this.getDefaultFilters();
    tableRows = [];
    isLoading = false;
    errorMessage = '';

    pageNumber = 1;
    pageSize = 50;
    totalRecords = 0;
    totalPages = 1;

    totals = {
        totalGrantReceived: 0,
        totalFundRequested: 0,
        totalDisbursed: 0,
        totalUtilized: 0,
        remainingGrant: 0
    };

    sheetJsLoaded = false;
    jsPdfLoaded = false;
    urlCache = new Map();

    // ------------------------------------------------------------ lifecycle

    connectedCallback() {
        this.loadData();
    }

    getDefaultFilters() {
        const today = new Date();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(today.getMonth() - 12);
        return {
            dateFrom: this.toIsoDate(twelveMonthsAgo),
            dateTo: this.toIsoDate(today),
            transactionType: 'All',
            proposalSearch: '',
            milestoneSearch: ''
        };
    }

    /** Local-date safe: toISOString() shifts by the UTC offset and can slip a day in IST. */
    toIsoDate(dateObj) {
        const year = dateObj.getFullYear();
        const month = `${dateObj.getMonth() + 1}`.padStart(2, '0');
        const day = `${dateObj.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ------------------------------------------------------------ filter handlers

    handleDateFromChange(event) {
        this.filters = { ...this.filters, dateFrom: event.target.value };
        this.handleSearch();
    }

    handleDateToChange(event) {
        this.filters = { ...this.filters, dateTo: event.target.value };
        this.handleSearch();
    }

    handleTypeChange(event) {
        this.filters = { ...this.filters, transactionType: event.target.value };
        this.handleSearch();
    }

    handleProposalSearchChange(event) {
        this.filters = { ...this.filters, proposalSearch: event.target.value };
    }

    handleMilestoneSearchChange(event) {
        this.filters = { ...this.filters, milestoneSearch: event.target.value };
    }

    handleSearch() {
        this.pageNumber = 1;
        this.loadData();
    }

    handleReset() {
        this.filters = this.getDefaultFilters();
        this.pageNumber = 1;
        this.loadData();
    }

    // ------------------------------------------------------------ pagination

    get isFirstPage() {
        return this.pageNumber <= 1;
    }

    get isLastPage() {
        return this.pageNumber >= this.totalPages;
    }

    handlePrevPage() {
        if (!this.isFirstPage) {
            this.pageNumber -= 1;
            this.loadData();
        }
    }

    handleNextPage() {
        if (!this.isLastPage) {
            this.pageNumber += 1;
            this.loadData();
        }
    }

    // ------------------------------------------------------------ data loading

    buildFilterPayload() {
        return {
            dateFrom: this.filters.dateFrom || null,
            dateTo: this.filters.dateTo || null,
            transactionType: this.filters.transactionType,
            proposalId: null,
            milestoneId: null,
            proposalNameSearch: this.filters.proposalSearch || null,
            milestoneNameSearch: this.filters.milestoneSearch || null,
            pageNumber: this.pageNumber,
            pageSize: this.pageSize,
            sortField: 'transactionDate',
            sortDirection: 'DESC'
        };
    }

    loadData() {
        this.isLoading = true;
        this.errorMessage = '';
        getTransactionHistory({ filterJson: JSON.stringify(this.buildFilterPayload()) })
            .then((result) => this.applyResult(result))
            .catch((error) => {
                this.errorMessage = this.extractErrorMessage(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    async applyResult(result) {
        this.totalRecords = result.totalRecords;
        this.totalPages = result.totalPages || 1;
        this.totals = {
            totalGrantReceived: result.totalGrantReceived,
            totalFundRequested: result.totalFundRequested,
            totalDisbursed: result.totalDisbursed,
            totalUtilized: result.totalUtilized,
            remainingGrant: result.remainingGrant
        };
        const rows = result.records || [];
        this.tableRows = await Promise.all(rows.map((row, index) => this.decorateRow(row, index)));
    }

    async decorateRow(row, index) {
        const [proposalUrl, milestoneUrl] = await Promise.all([
            this.generateRecordUrl(row.proposalId),
            this.generateRecordUrl(row.milestoneId)
        ]);
        return {
            ...row,
            rowId: row.referenceNumber
                ? `${row.referenceNumber}-${row.transactionType}-${index}`
                : `row-${index}`,
            proposalUrl,
            milestoneUrl,
            // Roll-up figures (proposal-wide, not one milestone) render muted/italic
            // so they're never mistaken for a single milestone's own numbers.
            financialsClass: row.isAggregateFinancials ? 'financials-aggregate' : '',
            // Pre-formatted USD strings (en-US grouping) so every column reads the
            // same regardless of the viewing user's Salesforce locale. Blank instead
            // of "$0" when the underlying value is null, matching prior currency-type behavior.
            amountDisplay: this.formatCurrencyOrBlank(row.amount),
            totalProjectBudgetDisplay: this.formatCurrencyOrBlank(row.totalProjectBudget),
            milestoneBudgetDisplay: this.formatCurrencyOrBlank(row.milestoneBudget),
            disbursedAmountDisplay: this.formatCurrencyOrBlank(row.disbursedAmount),
            utilizedAmountDisplay: this.formatCurrencyOrBlank(row.utilizedAmount),
            milestoneBalanceDisplay: this.formatCurrencyOrBlank(row.milestoneBalance),
            unutilizedAmountDisplay: this.formatCurrencyOrBlank(row.unutilizedAmount)
        };
    }

    generateRecordUrl(recordId) {
        if (!recordId) return Promise.resolve(null);
        if (this.urlCache.has(recordId)) return Promise.resolve(this.urlCache.get(recordId));

        return this[NavigationMixin.GenerateUrl]({
            type: 'standard__recordPage',
            attributes: { recordId, actionName: 'view' }
        })
            .then((url) => {
                this.urlCache.set(recordId, url);
                return url;
            })
            .catch(() => null);
    }

    extractErrorMessage(error) {
        if (error && error.body && error.body.message) {
            return error.body.message;
        }
        return 'Something went wrong while loading the transaction history.';
    }

    // ------------------------------------------------------------ legend visibility

    /** Only show the "All Milestones (Aggregate)" legend when a row on this page actually uses it. */
    get hasAggregateRows() {
        return this.tableRows.some((row) => row.isAggregateFinancials);
    }

    // ------------------------------------------------------------ KPI formatting

    get formattedTotals() {
        return {
            totalGrantReceived: this.formatCurrency(this.totals.totalGrantReceived),
            totalFundRequested: this.formatCurrency(this.totals.totalFundRequested),
            totalDisbursed: this.formatCurrency(this.totals.totalDisbursed),
            totalUtilized: this.formatCurrency(this.totals.totalUtilized),
            remainingGrant: this.formatCurrency(this.totals.remainingGrant)
        };
    }

    formatCurrency(value) {
        return new Intl.NumberFormat(CURRENCY_LOCALE, {
            style: 'currency',
            currency: CURRENCY,
            maximumFractionDigits: 0
        }).format(Number(value || 0));
    }

    /** Same USD/en-US formatting as formatCurrency, but blank (not "$0") when the value is null/undefined. */
    formatCurrencyOrBlank(value) {
        if (value === null || value === undefined || value === '') return '';
        return this.formatCurrency(value);
    }

    // ------------------------------------------------------------ exports

    async fetchExportRows() {
        const result = await getTransactionHistoryForExport({
            filterJson: JSON.stringify(this.buildFilterPayload())
        });
        const rows = result.records || [];
        return Promise.all(rows.map((row, index) => this.decorateRow(row, index)));
    }

    /** Single source of truth for export column order — Excel and PDF both read it. */
    toExportValues(r) {
        return [
            r.transactionDate || '',
            r.transactionType || '',
            r.proposalName || '',
            r.projectTitle || '',
            r.milestoneName || '',
            r.fundingType || '',
            r.amount ?? '',
            r.totalProjectBudget ?? '',
            r.milestoneBudget ?? '',
            r.disbursedAmount ?? '',
            r.utilizedAmount ?? '',
            r.milestoneBalance ?? '',
            r.unutilizedAmount ?? ''
        ];
    }

    async handleExportExcel() {
        try {
            this.isLoading = true;
            if (!this.sheetJsLoaded) {
                await loadScript(this, XLSX_RESOURCE);
                this.sheetJsLoaded = true;
            }
            const rows = await this.fetchExportRows();
            /* global XLSX */
            const sheetRows = [EXPORT_HEADERS, ...rows.map((r) => this.toExportValues(r))];
            const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Fund Transaction History');
            XLSX.writeFile(workbook, `Fund_Transaction_History_${this.toIsoDate(new Date())}.xlsx`);
        } catch (error) {
            this.showToast('Export failed', this.extractErrorMessage(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async handleExportPdf() {
        try {
            this.isLoading = true;
            if (!this.jsPdfLoaded) {
                await loadScript(this, JSPDF_RESOURCE);
                await loadScript(this, JSPDF_AUTOTABLE_RESOURCE);
                this.jsPdfLoaded = true;
            }
            const rows = await this.fetchExportRows();
            /* global jspdf */
            // eslint-disable-next-line new-cap
            const doc = new jspdf.jsPDF({ orientation: 'landscape', format: 'a3' });
            doc.setFontSize(14);
            doc.text('Fund Transaction History', 14, 15);
            doc.setFontSize(9);
            doc.text(
                `${this.filters.dateFrom} to ${this.filters.dateTo}  |  ${rows.length} records`,
                14,
                21
            );

            doc.autoTable({
                startY: 26,
                head: [EXPORT_HEADERS],
                body: rows.map((r) => this.toExportValues(r)),
                styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
                headStyles: { fillColor: [22, 50, 92] },
                columnStyles: {
                    3: { cellWidth: 45 },
                    6: { halign: 'right' },
                    7: { halign: 'right' },
                    8: { halign: 'right' },
                    9: { halign: 'right' },
                    10: { halign: 'right' },
                    11: { halign: 'right' },
                    12: { halign: 'right' }
                }
            });

            doc.save(`Fund_Transaction_History_${this.toIsoDate(new Date())}.pdf`);
        } catch (error) {
            this.showToast('Export failed', this.extractErrorMessage(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}