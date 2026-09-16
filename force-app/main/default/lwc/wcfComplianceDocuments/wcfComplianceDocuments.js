import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getComplianceSummary   from '@salesforce/apex/ComplianceDocumentController.getComplianceSummary';
import getComplianceRows      from '@salesforce/apex/ComplianceDocumentController.getComplianceRows';
import saveComplianceRequest  from '@salesforce/apex/ComplianceDocumentController.saveComplianceRequest';
import getOrganisationOptions from '@salesforce/apex/ComplianceDocumentController.getOrganisationOptions';
import getLinkedApplication   from '@salesforce/apex/ComplianceDocumentController.getLinkedApplication';
import getComplianceDocumentReviewItems from '@salesforce/apex/ComplianceDocumentController.getComplianceDocumentReviewItems';
import saveComplianceRequestDecision from '@salesforce/apex/ComplianceDocumentController.saveComplianceRequestDecision';
import getFileBase64 from '@salesforce/apex/WCFValidatorController.getFileBase64';

const GEO_DOC_TYPES = {
    India:  ['80G Certificate', '12A Certificate', 'FCRA Certificate',
             'Audited Financials (FY24-25)', 'Bank Account Proof'],
    Mexico: ['Registration Certificate', 'Bank Account Proof',
             'Tax ID (RFC)', 'Audited Financials (FY24-25)'],
    Brazil: ['CNPJ Registration', 'Bank Account Proof', 'Audited Financials (FY24-25)'],
    USA:    ['501(c)(3) Determination Letter', 'Bank Account Proof',
             'Audited Financials (FY24-25)'],
    Other:  ['Registration Certificate', 'Bank Account Proof',
             'Audited Financials (FY24-25)', 'Other Document']
};

const DEFAULT_FORM = {
    recordId:        null,
    organisationId:  '',
    applicationId:   '',
    applicationName: '',
    geography:       '',
    documentTypes:   [],
    requestedDate:   '',
    dueDate:         '',
    priority:        'Normal',
    notes:           ''
};

export default class WcfComplianceDocuments extends NavigationMixin(LightningElement) {

    @track summary        = { allRequests: 0, pending: 0, overdue: 0, received: 0 };
    @track rows           = [];
    @track orgOptions     = [];
    @track activeFilter   = null;
    @track isLoading      = true;
    @track showModal      = false;
    @track isSaving       = false;
    @track isFetchingApp  = false;
    @track formError      = null;
    @track form           = { ...DEFAULT_FORM };
    @track dateError    = null;

    @track showReviewModal      = false;
    @track isLoadingReviewItems = false;
    @track reviewItems          = [];
    @track reviewRecordId       = null;
    @track reviewRequestId      = '';
    _reviewNotesByLabel = {};

    @track selectedReturnLabels = [];
    _decisionNotes = '';
    @track pendingDecision = null;

    @track currentPage = 1;
    pageSize = 10;

    // ── Lifecycle ─────────────────────────────────────────────────────────
    connectedCallback() {
        this.loadData();
        this.loadOrgOptions();
        this._checkUrlParams();
    }

    renderedCallback() {
        this._syncOrgSelect();
    }

    _checkUrlParams() {
        try {
            const params = new URLSearchParams(window.location.search);
            const orgId = params.get('orgId') || params.get('organisationId');
            if (orgId) {
                this.form = { ...this.form, organisationId: orgId };
                this.fetchLinkedApplication(orgId);
            }
        } catch (e) { }
    }

    get formattedOrgOptions() {
        return (this.orgOptions || []).map(o => ({
            ...o,
            selected: o.value === this.form.organisationId
        }));
    }

    async loadData() {
        this.isLoading = true;
        try {
            const [summary, rows] = await Promise.all([
                getComplianceSummary(),
                getComplianceRows()
            ]);
            this.summary = summary || { allRequests: 0, pending: 0, overdue: 0, received: 0 };
            this.rows    = this._mapRows(rows || []);
            this.currentPage = 1;
        } catch (e) {
            console.error('ComplianceDocuments loadData error:', e);
        } finally {
            this.isLoading = false;
        }
    }

    async loadOrgOptions() {
        try {
            const opts = await getOrganisationOptions();
            this.orgOptions = (opts || []).map(o => ({ ...o, selected: o.value === this.form.organisationId }));
        } catch (e) {
            console.error('loadOrgOptions error:', JSON.stringify(e));
            this.formError = e.body?.message || 'Could not load organisations.';
        }
    }

    get sitePrefix() {
        const pathParts = window.location.pathname.split('/s/');
        return pathParts.length > 1 ? pathParts[0] : '';
    }

    async loadReviewItems() {
        this.isLoadingReviewItems = true;
        try {
            const items = await getComplianceDocumentReviewItems({ recordId: this.reviewRecordId });
            this.reviewItems = (items || []).map(d => {
                return {
                    ...d,
                    statusPillClass: this._decisionStatusClass(d.status)
                };
            });
        } catch (e) {
            console.error('loadReviewItems error:', e);
            this.reviewItems = [];
        } finally {
            this.isLoadingReviewItems = false;
        }
    }

    async handlePreviewFile(event) {
        event.preventDefault();
        const versionId = event.currentTarget.dataset.versionId;
        const fileName = event.currentTarget.dataset.fileName;
        if (!versionId) {
            console.error('Missing contentVersionId for preview');
            return;
        }

        try {
            const result = await getFileBase64({ contentVersionId: versionId });
            const extension = (result.fileType || 'pdf').toLowerCase();
            
            const mimeType = (extension === 'pdf') ? 'application/pdf'
                           : (extension === 'png') ? 'image/png'
                           : (extension === 'jpg' || extension === 'jpeg') ? 'image/jpeg'
                           : 'application/octet-stream';

            const byteChars   = atob(result.base64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
                byteNumbers[i] = byteChars.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob      = new Blob([byteArray], { type: mimeType });
            const blobUrl   = URL.createObjectURL(blob);

            const newTab = window.open(blobUrl, '_blank');
            if (!newTab) {
                const a = document.createElement('a');
                a.href     = blobUrl;
                a.download = fileName || ((result.title || 'document') + '.' + extension);
                a.click();
            }
            setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        } catch (e) {
            console.error('File preview error:', e);
        }
    }

_decisionStatusClass(status) {
    if (status === 'Validated') return 'status-pill status-validated';
    if (status === 'Returned')  return 'status-pill status-awaiting';
    if (status === 'Rejected')  return 'status-pill status-rejected';
    if (status === 'Suspended') return 'status-pill status-suspended';
    return 'status-pill status-inprogress';
}

handleReviewNoteInput(event) {
    this._reviewNotesByLabel[event.target.dataset.label] = event.target.value;
}


    
closeReviewModal() {
    this.showReviewModal = false;
    this.reviewItems = [];
    this._reviewNotesByLabel = {};
    this.selectedReturnLabels = [];
    this._decisionNotes = '';
    this.pendingDecision = null;
}
handleReviewBackdropClick() { this.closeReviewModal(); }
    // ── Auto-fetch linked proposal ────────────────────────────────────────
    async fetchLinkedApplication(orgId) {
        if (!orgId) {
            this.form = { ...this.form, applicationId: '', applicationName: '' };
            return;
        }
        this.isFetchingApp = true;
        try {
            const result = await getLinkedApplication({ organisationId: orgId });
            this.form = {
                ...this.form,
                applicationId:   result ? result.recordId        : '',
                applicationName: result ? result.applicationName : ''
            };
        } catch (e) {
            console.error('fetchLinkedApplication error:', e);
            this.form = { ...this.form, applicationId: '', applicationName: '' };
        } finally {
            this.isFetchingApp = false;
        }
    }

    _pad(n) { return String(n).padStart(2, '0'); }

_parseIso(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d); // local midnight, no TZ drift
}

_displayDate(iso) {
    const d = this._parseIso(iso);
    return d ? `${this._pad(d.getDate())}/${this._pad(d.getMonth() + 1)}/${d.getFullYear()}` : '—';
}

    // ── Row mapping ───────────────────────────────────────────────────────
   _mapRows(rawRows) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rawRows.map((r, i) => {
        const dueDateRaw = this._parseIso(r.dueDate);
        const isOverdue  = dueDateRaw && dueDateRaw < today && r.status !== 'Received';
        const isUrgent   = dueDateRaw && !isOverdue &&
                           Math.ceil((dueDateRaw - today) / 86400000) <= 3;
        const effectiveStatus = isOverdue ? 'Overdue' : r.status;
        return {
            rowNum:          i + 1,
            recordId:        r.recordId,
            requestId:       r.requestId,
            orgName:         r.orgName  || '—',
            orgId:           r.orgId    || '',
            applicationId:   r.applicationId   || '',
            applicationName: r.applicationName || '',
            documents:       r.documents || [],
            requestedDateIso: r.requestedDate || '',
            dueDateIso:       r.dueDate || '',
            requestedDate:   this._displayDate(r.requestedDate),
            dueDate:         this._displayDate(r.dueDate),
            dueDateClass:    isOverdue ? 'due-date due-overdue'
                           : isUrgent  ? 'due-date due-urgent'
                           : 'due-date',
            priority:        r.priority || '—',
            priorityClass:   this._priorityClass(r.priority),
            status:          effectiveStatus,
            statusClass:     this._statusClass(effectiveStatus),
            geography:       r.geography || '—',
            notes:           r.notes || '',
            isOverdue
        };
    });
}

    _priorityClass(p) {
        if (p === 'Critical') return 'decision-pill decision-return';
        if (p === 'High')     return 'decision-pill decision-flag';
        return 'decision-pill decision-pending';
    }

    _statusClass(s) {
        if (s === 'Received')     return 'status-pill status-validated';
        if (s === 'Overdue')      return 'status-pill status-awaiting';
        if (s === 'Under Review') return 'status-pill status-inprogress';
        if (s === 'Submitted')    return 'status-pill status-inprogress';
        return 'status-pill status-notstarted';
    }

    // ── KPI filter ────────────────────────────────────────────────────────
    get filteredRows() {
        let src = this.rows;
        if (this.activeFilter === 'pending') {
            src = src.filter(r => r.status !== 'Received' && !r.isOverdue);
        } else if (this.activeFilter === 'overdue') {
            src = src.filter(r => r.isOverdue);
        } else if (this.activeFilter === 'received') {
            src = src.filter(r => r.status === 'Received');
        }
        return src.map((r, i) => ({ ...r, rowNum: i + 1 }));
    }

    get pagedRows() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end   = start + this.pageSize;
        return this.filteredRows.slice(start, end);
    }

    get totalPages() {
        return Math.ceil(this.filteredRows.length / this.pageSize) || 1;
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage >= this.totalPages;
    }

    get hasPagination() {
        return this.filteredRows.length > this.pageSize;
    }

    handlePrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    handleNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    get noRows()       { return this.filteredRows.length === 0; }

    get emptyMessage() {
        if (this.activeFilter === 'pending')  return 'No pending compliance document requests.';
        if (this.activeFilter === 'overdue')  return 'No overdue requests — great work!';
        if (this.activeFilter === 'received') return 'No received documents yet.';
        return 'No compliance document requests found. Click "+ New Request" to create one.';
    }

    get tableTitle() {
        if (this.activeFilter === 'pending')  return 'Pending Requests';
        if (this.activeFilter === 'overdue')  return 'Overdue Requests';
        if (this.activeFilter === 'received') return 'Received Documents';
        return 'All Compliance Document Requests';
    }

    handleKpiClick(event) {
        const f = event.currentTarget.dataset.filter;
        this.activeFilter = this.activeFilter === f ? null : f;
        this.currentPage = 1;
    }

    clearFilter() {
        this.activeFilter = null;
        this.currentPage = 1;
    }

    get kpiClassAll()      { return this._kpiClass('all');      }
    get kpiClassPending()  { return this._kpiClass('pending');  }
    get kpiClassOverdue()  { return this._kpiClass('overdue');  }
    get kpiClassReceived() { return this._kpiClass('received'); }

    _kpiClass(f) {
        return this.activeFilter === f || (!this.activeFilter && f === 'all')
            ? 'kpi-card kpi-card-active' : 'kpi-card';
    }

    get docTypeOptions() {
        const types = GEO_DOC_TYPES[this.form.geography] || GEO_DOC_TYPES['Other'];
        return types.map(t => ({
            value:   t,
            label:   t,
            checked: this.form.documentTypes.includes(t)
        }));
    }

    // ── Computed getters for banner ───────────────────────────────────────
    get hasLinkedApp() { return !!this.form.applicationId; }
    get noLinkedApp()  {
        return !this.isFetchingApp && !this.form.applicationId && !!this.form.organisationId;
    }

    // ── Modal ─────────────────────────────────────────────────────────────
    get modalTitle() {
        return this.form.recordId ? 'Edit Compliance Request' : 'New Compliance Document Request';
    }
    get saveLabel() {
        return this.form.recordId ? 'Save Changes' : 'Create Request';
    }


    openNewModal() {
        this.form      = { ...DEFAULT_FORM, documentTypes: [] };
        this.formError = null;
        this.showModal = true;
        this.loadOrgOptions();
    }

    handleEdit(event) {
        const id  = event.currentTarget.dataset.id;
        const row = this.rows.find(r => r.recordId === id);
        if (!row) return;

        // Ensure the edited record's organization is in the dropdown options
        if (row.orgId && row.orgName && row.orgName !== '—') {
            const exists = this.orgOptions.some(o => o.value === row.orgId);
            if (!exists) {
                this.orgOptions = [...this.orgOptions, { value: row.orgId, label: row.orgName, selected: true }];
            }
        }

        this.form = {
            recordId:        row.recordId,
            organisationId:  row.orgId || '',
            applicationId:   row.applicationId || '',
            applicationName: row.applicationName || '',
            geography:       row.geography !== '—' ? row.geography : '',
            documentTypes:   [...(row.documents || [])],
            requestedDate:   row.requestedDateIso || '',
            dueDate:         row.dueDateIso || '',
            priority:        row.priority !== '—' ? row.priority : 'Normal',
            notes:           row.notes || ''
        };
        this.formError = null;
        this.showModal = true;

        if (row.orgId && !row.applicationId) {
            this.fetchLinkedApplication(row.orgId);
        }
    }

    closeModal()          { this.showModal = false; }
    handleBackdropClick() { this.showModal = false; }
    stopProp(event)       { event.stopPropagation(); }

    handleOpenReview(event) {
    const id = event.currentTarget.dataset.id;
    const row = this.rows.find(r => r.recordId === id);
    if (!row) return;

    this.reviewRecordId  = id;
    this.reviewRequestId = row.requestId;
    this.formError       = null;
    this.showReviewModal = true;
    this.loadReviewItems();
}

    // ── Form handlers ─────────────────────────────────────────────────────
handleFieldChange(event) {
    const field = event.currentTarget.dataset.field;
    const val   = event.target.value;
    this.form   = { ...this.form, [field]: val };

    if (field === 'geography') {
        this.form = { ...this.form, documentTypes: [] };
    }
    if (field === 'organisationId') {
        this.fetchLinkedApplication(val);
    }
    if (field === 'requestedDate' || field === 'dueDate') {
        this._validateDates();
    }
}

_validateDates() {
    if (this._hasDateError()) {
        this.dateError = 'Due Date cannot be earlier than the Requested Date.';
    } else {
        this.dateError = null;
    }
}
    handleDocTypeChange(event) {
        const dtype   = event.target.dataset.dtype;
        const checked = event.target.checked;
        let types     = [...this.form.documentTypes];
        if (checked) {
            if (!types.includes(dtype)) types.push(dtype);
        } else {
            types = types.filter(t => t !== dtype);
        }
        this.form = { ...this.form, documentTypes: types };
    }

    get hasUploadedDocs() {
    return this.reviewItems.some(i => i.hasFile);
}

get isReturnDecision() {
    return this.pendingDecision === 'Return';
}

handleChooseDecision(event) {
    this.pendingDecision = event.currentTarget.dataset.decision;
    this.formError = null;
}

handleCancelDecision() {
    this.pendingDecision = null;
    this._decisionNotes = '';
    this.selectedReturnLabels = [];
    this.formError = null;
}

handleDecisionNoteInput(event) {
    this._decisionNotes = event.target.value;
}

handleReturnCheckboxChange(event) {
    const label = event.target.dataset.label;
    if (event.target.checked) {
        if (!this.selectedReturnLabels.includes(label)) {
            this.selectedReturnLabels = [...this.selectedReturnLabels, label];
        }
    } else {
        this.selectedReturnLabels = this.selectedReturnLabels.filter(l => l !== label);
    }
}

async handleConfirmDecision() {
    const decision = this.pendingDecision;

    if (!this._decisionNotes.trim()) {
        this.formError = 'Please add a comment before recording this decision.';
        return;
    }
    if (decision === 'Return' && this.selectedReturnLabels.length === 0) {
        this.formError = 'Select at least one document to return.';
        return;
    }

    try {
        await saveComplianceRequestDecision({
            recordId: this.reviewRecordId,
            decision,
            reviewerNotes: this._decisionNotes,
            returnLabels: decision === 'Return' ? this.selectedReturnLabels : null
        });
        this.pendingDecision = null;
        this.selectedReturnLabels = [];
        this._decisionNotes = '';
        await this.loadReviewItems();
        await this.loadData();
    } catch (e) {
        console.error('saveComplianceRequestDecision error:', e);
        this.formError = e.body?.message || 'Could not save decision.';
    }
}

    // ── Save ─────────────────────────────────────────────────────────────
async handleSave() {
    this.formError = null;

    if (!this.form.organisationId) {
        this.formError = 'Please select an Organisation.'; return;
    }
    if (!this.form.geography) {
        this.formError = 'Please select a Geography.'; return;
    }
    if (!this.form.documentTypes || this.form.documentTypes.length === 0) {
        this.formError = 'Please select at least one Document Type.'; return;
    }
    if (!this.form.dueDate) {
        this.formError = 'Please enter a Due Date.'; return;
    }
    if (this._hasDateError()) {
        this.dateError = 'Due Date cannot be earlier than the Requested Date.'; return;
    }

    this.isSaving = true;
    // ...rest unchanged
        try {
            await saveComplianceRequest({
                recordId:       this.form.recordId || null,
                organisationId: this.form.organisationId,
                applicationId:  this.form.applicationId || null,
                documentTypes:  this.form.documentTypes.join(';'),
                requestedDate:  this.form.requestedDate || null,
                dueDate:        this.form.dueDate,
                priority:       this.form.priority,
                geography:      this.form.geography,
                notes:          this.form.notes || null
            });
            this.showModal = false;
            await this.loadData();
            await this.loadOrgOptions();  
        } catch (e) {
    console.error('FULL SAVE ERROR:', JSON.stringify(e));

    this.formError =
        e?.body?.message ||
        e?.body?.output?.errors?.[0]?.message ||
        e?.body?.pageErrors?.[0]?.message ||
        e?.body?.fieldErrors
            ? JSON.stringify(e.body.fieldErrors)
            : null ||
        e?.message ||
        'Save failed. Please try again.';
} finally {
            this.isSaving = false;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    _isoDate(displayDate) {
        if (!displayDate || displayDate === '—') return '';
        const d = new Date(displayDate);
        if (isNaN(d)) return '';
        return d.toISOString().split('T')[0];
    }

    _syncOrgSelect() {
        const orgId = this.form.organisationId;
        const sel   = this.template.querySelector('select[data-field="organisationId"]');
        if (sel && orgId) sel.value = orgId;
    }

get isSaveDisabled() {
    return this.isSaving || !!this.dateError;
}

_hasDateError() {
    const { requestedDate, dueDate } = this.form;
    return !!(requestedDate && dueDate && dueDate < requestedDate);
}
}