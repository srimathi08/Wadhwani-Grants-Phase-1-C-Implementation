import { LightningElement, track } from 'lwc';
import getValidatedApplications from '@salesforce/apex/PlAssignmentController.getValidatedApplications';
import getPLAccounts            from '@salesforce/apex/PlAssignmentController.getPLAccounts';
import assignPL                 from '@salesforce/apex/PlAssignmentController.assignPL';

const TRACK_OPTIONS = [
    { label: 'All Tracks',                            value: 'All Tracks' },
    { label: 'Job Fulfillment Only',                  value: 'Job Fulfillment Only' },
    { label: 'Job Creation Only',                     value: 'Job Creation Only' },
    { label: 'Both Job Fulfillment and Job Creation', value: 'Both' }
];

const PAGE_SIZE = 10;

export default class WcfPlAssignmentQueue extends LightningElement {

    @track searchTerm      = '';
    @track selectedTrack   = 'All Tracks';
    @track plFilter        = '';
    @track currentPage     = 1;

    @track _allRows        = [];
    @track _allPLRows      = [];
    @track isLoading       = true;
    @track isLoadingPLs    = false;

    // Modal state
    @track showModal          = false;
    @track modalOrgId         = null;
    @track modalOrgName       = '';
    @track modalCurrentPlId   = null;
    @track modalCurrentPlName = '';
    @track modalCurrentCoplId   = null;
    @track modalCurrentCoplName = '';
    @track modalSearchTerm    = '';
    @track selectedPlId       = null;
    @track selectedPlName     = '';
    @track assignRole         = 'PL';     // 'PL' | 'Co-PL'
    @track isSaving           = false;
    @track saveError          = null;

    // Toast state
    @track showToast    = false;
    @track toastTitle   = '';
    @track toastMessage = '';
    @track toastVariant = 'success';
    _toastTimer         = null;

    get trackOptions() { return TRACK_OPTIONS; }

    connectedCallback() { this._loadApplications(); }

    // ── Data loading ──────────────────────────────────────────────────────────

    async _loadApplications() {
        this.isLoading = true;
        try {
            const rows = await getValidatedApplications({
                searchTerm  : this.searchTerm  || null,
                trackFilter : this.selectedTrack !== 'All Tracks' ? this.selectedTrack : null,
                statusFilter: null
            });
            this._allRows = rows || [];
        } catch (e) {
            console.error('Error loading PL assignment queue:', e);
            this._showToast('Error', 'Failed to load proposals. Please refresh.', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async _loadPLAccounts() {
        this.isLoadingPLs = true;
        try {
            const pls = await getPLAccounts();
            this._allPLRows = pls || [];
        } catch (e) {
            console.error('Error loading PL accounts:', e);
            this._allPLRows = [];
        } finally {
            this.isLoadingPLs = false;
        }
    }

    // ── KPI counts ────────────────────────────────────────────────────────────

    get totalCount()      { return this._allRows.length; }
    get assignedCount()   { return this._allRows.filter(r => !!r.currentPlId).length; }
    get unassignedCount() { return this._allRows.filter(r => !r.currentPlId).length; }

    // ── Filtered + paginated rows ─────────────────────────────────────────────

    get filteredRows() {
        let result = [...this._allRows];
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            result = result.filter(r =>
                (r.applicationId    || '').toLowerCase().includes(term) ||
                (r.organizationName || '').toLowerCase().includes(term) ||
                (r.submitterName    || '').toLowerCase().includes(term)
            );
        }
        if (this.plFilter === 'assigned')   result = result.filter(r => !!r.currentPlId);
        if (this.plFilter === 'unassigned') result = result.filter(r => !r.currentPlId);
        return result;
    }

    get filteredCount()   { return this.filteredRows.length; }
    get hasRows()         { return this.filteredCount > 0; }
    get totalPages()      { return Math.ceil(this.filteredCount / PAGE_SIZE) || 1; }
    get paginationStart() { return (this.currentPage - 1) * PAGE_SIZE + 1; }
    get paginationEnd()   { return Math.min(this.currentPage * PAGE_SIZE, this.filteredCount); }
    get isFirstPage()     { return this.currentPage === 1; }
    get isLastPage()      { return this.currentPage === this.totalPages; }

    get pageNumbers() {
        const total = this.totalPages;
        const curr  = this.currentPage;
        let start = Math.max(1, curr - 2);
        let end   = Math.min(total, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);
        const pages = [];
        for (let i = start; i <= end; i++) {
            pages.push({ num: i, btnClass: i === curr ? 'pla-pg-btn pla-pg-active' : 'pla-pg-btn' });
        }
        return pages;
    }

    get paginatedRows() {
        const start = (this.currentPage - 1) * PAGE_SIZE;
        return this.filteredRows.slice(start, start + PAGE_SIZE).map((r, idx) => {
            const track = r.track || '';
            let trackShort, trackBadgeClass;
            if (track.toLowerCase().includes('both')) {
                trackShort = 'Both'; trackBadgeClass = 'track-badge track-both';
            } else if (track.toLowerCase().includes('fulfillment')) {
                trackShort = 'JF';   trackBadgeClass = 'track-badge track-jf';
            } else if (track.toLowerCase().includes('creation')) {
                trackShort = 'JC';   trackBadgeClass = 'track-badge track-jc';
            } else {
                trackShort = track || '—'; trackBadgeClass = 'track-badge';
            }

            const vs = r.validationStatus || '';
            let statusBadgeClass = 'val-badge';
            if (vs === 'Under Review')        statusBadgeClass += ' val-under-review';
            else if (vs === 'Validated')      statusBadgeClass += ' val-validated';
            else if (vs.includes('Recommended')) statusBadgeClass += ' val-recommended';

            const haspl = !!r.currentPlId;
            const actionLabel    = haspl ? 'Reassign' : 'Assign PL';
            const actionBtnClass = haspl ? 'pla-action-btn btn-reassign' : 'pla-action-btn btn-assign';
            const actionIcon     = haspl ? 'utility:change_owner' : 'utility:user';

            return {
                ...r,
                sno: (this.currentPage - 1) * PAGE_SIZE + idx + 1,
                rowClass: idx % 2 === 0 ? 'pla-tr pla-tr-even' : 'pla-tr pla-tr-odd',
                trackShort, trackBadgeClass, statusBadgeClass,
                actionLabel, actionBtnClass, actionIcon
            };
        });
    }

    // ── Filtered PL rows for modal ────────────────────────────────────────────

   get filteredPLRows() {
    let result = [...this._allPLRows];

    // ── Role filter: only show accounts eligible for the selected role ──
    if (this.assignRole === 'PL') {
        result = result.filter(p => p.isWgPl);
    } else {
        result = result.filter(p => p.isWgCoPl);
    }

    if (this.modalSearchTerm) {
        const term = this.modalSearchTerm.toLowerCase();
        result = result.filter(p =>
            (p.plName  || '').toLowerCase().includes(term) ||
            (p.plEmail || '').toLowerCase().includes(term)
        );
    }

    return result.map(p => {
        const isSelected = p.plAccountId === this.selectedPlId;
        const count = p.assignedOrgCount || 0;
        let loadLabel, loadBadgeClass;
        if (count === 0)     { loadLabel = 'Available';     loadBadgeClass = 'load-badge load-free'; }
        else if (count <= 3) { loadLabel = count + ' orgs'; loadBadgeClass = 'load-badge load-moderate'; }
        else                 { loadLabel = count + ' orgs'; loadBadgeClass = 'load-badge load-heavy'; }
        return {
            ...p,
            rowClass   : isSelected ? 'pla-pl-row pla-pl-selected' : 'pla-pl-row',
            radioClass : isSelected ? 'pl-radio pl-radio-on' : 'pl-radio',
            loadLabel, loadBadgeClass
        };
    });
}

    get hasFilteredPLs()   { return this.filteredPLRows.length > 0; }
    get isAssignDisabled() { return !this.selectedPlId || this.isSaving; }

    // ── Role toggle getters ───────────────────────────────────────────────────

    get roleBtnPL()       { return this.assignRole === 'PL'    ? 'pla-role-btn pla-role-active' : 'pla-role-btn'; }
    get roleBtnCoPL()     { return this.assignRole === 'Co-PL' ? 'pla-role-btn pla-role-active' : 'pla-role-btn'; }
    get assignBtnLabel()  { return this.assignRole === 'Co-PL' ? 'Assign Co-PL' : 'Assign PL'; }

    // Current assignment for the selected role (shown in banner)
    get modalRolePlName() {
        return this.assignRole === 'Co-PL'
            ? this.modalCurrentCoplName
            : this.modalCurrentPlName;
    }
    get modalRolePlId() {
        return this.assignRole === 'Co-PL'
            ? this.modalCurrentCoplId
            : this.modalCurrentPlId;
    }

    // ── Toast ─────────────────────────────────────────────────────────────────

    get toastClass() {
        return this.toastVariant === 'success' ? 'pla-toast pla-toast-success' : 'pla-toast pla-toast-error';
    }
    get toastIcon() {
        return this.toastVariant === 'success' ? 'utility:success' : 'utility:error';
    }

    _showToast(title, message, variant = 'success') {
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this.toastTitle   = title;
        this.toastMessage = message;
        this.toastVariant = variant;
        this.showToast    = true;
        this._toastTimer  = setTimeout(() => { this.showToast = false; }, 4000);
    }

    dismissToast() {
        this.showToast = false;
        if (this._toastTimer) clearTimeout(this._toastTimer);
    }

    // ── Filter / search handlers ──────────────────────────────────────────────

    handleSearch(evt)      { this.searchTerm = evt.target.value; this.currentPage = 1; }
    handleTrackFilter(evt) { this.selectedTrack = evt.target.value; this.currentPage = 1; this._loadApplications(); }
    handleRefresh()        { this.plFilter = ''; this.searchTerm = ''; this.currentPage = 1; this._loadApplications(); }
    filterAssigned()       { this.plFilter = this.plFilter === 'assigned'   ? '' : 'assigned';   this.currentPage = 1; }
    filterUnassigned()     { this.plFilter = this.plFilter === 'unassigned' ? '' : 'unassigned'; this.currentPage = 1; }

    // ── Pagination ────────────────────────────────────────────────────────────

    handlePrevPage()     { if (!this.isFirstPage) this.currentPage--; }
    handleNextPage()     { if (!this.isLastPage)  this.currentPage++; }
    handlePageClick(evt) { this.currentPage = parseInt(evt.currentTarget.dataset.page, 10); }

    // ── Modal open / close ────────────────────────────────────────────────────

    handleOpenModal(evt) {
        const btn = evt.currentTarget;
        this.modalOrgId           = btn.dataset.orgId;
        this.modalOrgName         = btn.dataset.orgName;
        this.modalCurrentPlId     = btn.dataset.currentPlId     || null;
        this.modalCurrentPlName   = btn.dataset.currentPlName   || null;
        this.modalCurrentCoplId   = btn.dataset.currentCoplId   || null;
        this.modalCurrentCoplName = btn.dataset.currentCoplName || null;
        this.assignRole           = 'PL';
        this.selectedPlId         = this.modalCurrentPlId;
        this.selectedPlName       = this.modalCurrentPlName || '';
        this.modalSearchTerm      = '';
        this.saveError            = null;
        this.showModal            = true;
        this._loadPLAccounts();
    }

    handleCloseModal() {
        this.showModal       = false;
        this.selectedPlId    = null;
        this.selectedPlName  = '';
        this.saveError       = null;
        this.isSaving        = false;
    }

    handleBackdropClick() { this.handleCloseModal(); }
    stopPropagation(evt)  { evt.stopPropagation(); }

    // ── Modal interactions ────────────────────────────────────────────────────

    handleModalSearch(evt) { this.modalSearchTerm = evt.target.value; }

    handleRoleSelect(evt) {
        this.assignRole   = evt.currentTarget.dataset.role;
        // Pre-select whichever person is currently in that role
        this.selectedPlId   = this.assignRole === 'Co-PL' ? this.modalCurrentCoplId   : this.modalCurrentPlId;
        this.selectedPlName = this.assignRole === 'Co-PL' ? (this.modalCurrentCoplName || '') : (this.modalCurrentPlName || '');
        this.saveError      = null;
    }

    handleSelectPL(evt) {
        this.selectedPlId   = evt.currentTarget.dataset.plId;
        this.selectedPlName = evt.currentTarget.dataset.plName;
        this.saveError      = null;
    }

    // ── Assign / remove ───────────────────────────────────────────────────────

    async handleConfirmAssign() {
        if (!this.selectedPlId || !this.modalOrgId) return;
        this.isSaving  = true;
        this.saveError = null;
        try {
            await assignPL({
                orgAccountId: this.modalOrgId,
                plAccountId : this.selectedPlId,
                role        : this.assignRole
            });
            this._patchLocalRow(this.modalOrgId, this.selectedPlId, this.selectedPlName, this.assignRole);
            this._showToast(
                this.assignRole === 'Co-PL' ? 'Co-PL Assigned' : 'PL Assigned',
                `${this.selectedPlName} assigned as ${this.assignRole} for ${this.modalOrgName}.`,
                'success'
            );
            this.handleCloseModal();
        } catch (e) {
            this.saveError = e?.body?.message || 'An unexpected error occurred. Please try again.';
        } finally {
            this.isSaving = false;
        }
    }

    async handleRemovePL() {
        if (!this.modalOrgId) return;
        this.isSaving  = true;
        this.saveError = null;
        try {
            await assignPL({
                orgAccountId: this.modalOrgId,
                plAccountId : null,
                role        : this.assignRole
            });
            this._patchLocalRow(this.modalOrgId, null, null, this.assignRole);
            this._showToast(
                'Assignment Removed',
                `${this.assignRole} removed from ${this.modalOrgName}.`,
                'success'
            );
            this.handleCloseModal();
        } catch (e) {
            this.saveError = e?.body?.message || 'Failed to remove assignment.';
        } finally {
            this.isSaving = false;
        }
    }

    _patchLocalRow(orgAccountId, plId, plName, role) {
        this._allRows = this._allRows.map(r => {
            if (r.organizationAccountId === orgAccountId) {
                if (role === 'Co-PL') {
                    return { ...r, currentCoplId: plId, currentCoplName: plName };
                }
                return { ...r, currentPlId: plId, currentPlName: plName };
            }
            return r;
        });
    }
}