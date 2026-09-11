import { LightningElement, track } from 'lwc';
import getMilestones from '@salesforce/apex/PiMilestoneController.getMilestones';
import getRequestedSupportDocs from '@salesforce/apex/PiMilestoneController.getRequestedSupportDocs';
import saveMilestoneReport from '@salesforce/apex/PiMilestoneController.saveMilestoneReport';
import getTRLPicklistValues from '@salesforce/apex/PiMilestoneController.getTRLPicklistValues';

export default class PiMilestoneList extends LightningElement {

    @track milestones = [];
    isLoading = false;
    errorMsg = '';

    selectedMilestoneId = null;
    isUploadOpen = false;

    acceptedFormats = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx'];

    @track requestedSupportDocs = '';
    @track requiredDocNames = [];
    @track uploadedFileNames = [];
    @track namingErrorMsg = '';
    @track trlOptions = [];

    // Tracks whether the current upload session has already been
    // auto-saved (see handleUploadFinished), so closeUploadModal
    // doesn't fire a redundant duplicate save.
    reportAlreadyAutoSaved = false;

    htmlRenderedMap = new Set();

    connectedCallback() {
        this.load();
        this.loadTRLOptions();
    }

    async loadTRLOptions() {
        try {
            const values = await getTRLPicklistValues();
            this.trlOptions = (values || []).map(v => ({ label: v, value: v }));
            this.applyTRLSelection();
        } catch (e) {
            console.error('Failed to load TRL picklist values', e);
            this.trlOptions = [];
        }
    }
    applyTRLSelection() {
        if (!this.trlOptions.length) return;
        this.milestones = this.milestones.map(m => this.computeFieldClasses(m));
    }

    get urlAppId() {
        try {
            const url = new URL(window.location.href);
            return url.searchParams.get('appId');
        } catch (e) {
            return null;
        }
    }

    // Derives the CSS classes for the Total Utilized / Current TRL blocks
    // based on their current validation state. Called any time a milestone's
    // input value or invalid flag changes, so the template stays in sync.
    computeFieldClasses(m) {
        const utilizedInvalid = !!m.utilizedInvalid;
        const trlInvalid = !!m.trlInvalid;

        return {
            ...m,
            utilizedInvalid,
            trlInvalid,
            trlOptionsForRow: this.buildTrlOptions(m.currentTRLInput),
            utilizedBlockClass: utilizedInvalid ? 'block editableBlock invalidBlock' : 'block editableBlock',
            utilizedBadgeClass: utilizedInvalid ? 'editBadge invalidBadge' : 'editBadge',
            utilizedInputClass: utilizedInvalid ? 'utilizedInput invalidInput' : 'utilizedInput',
            trlBlockClass: trlInvalid ? 'block editableBlock invalidBlock' : 'block editableBlock',
            trlBadgeClass: trlInvalid ? 'editBadge invalidBadge' : 'editBadge',
            trlSelectClass: trlInvalid ? 'utilizedInput trlSelect invalidInput' : 'utilizedInput trlSelect'
        };
    }

    isEmpty(val) {
        return val === undefined || val === null || String(val).trim() === '';
    }

    async load() {
        this.isLoading = true;
        this.errorMsg = '';

        try {
            const data = await getMilestones({ appId: this.urlAppId });
            this.milestones = (data || []).map(m => {
                // Lock/read-only state now comes straight from the
                // Apex layer: hasUploadedFiles reflects whether files
                // actually exist for this milestone (ContentDocumentLink),
                // which stays accurate even after Status__c moves on to
                // "Report Approved" / "Fund Disbursed" / etc.
                const isUploaded = !!m.hasUploadedFiles;

                const base = {
                    ...m,
                    statusLabel: m.status || 'Not Started',
                    statusClass: this.getStatusClass(m.status),

                    startFormatted: this.safeDateString(m.projectStartDate),
                    endFormatted: this.safeDateString(m.projectEndDate),

                    isAlreadyUploaded: isUploaded,
                    uploadBtnLabel: isUploaded ? 'Reports were uploaded' : 'Upload Files',

                    totalUtilizedInput: m.totalUtilized != null ? String(m.totalUtilized) : '',
                    currentTRLInput: m.currentTRL != null ? String(m.currentTRL) : '',

                    utilizedInvalid: false,
                    trlInvalid: false
                };

                return this.computeFieldClasses(base);
            });
            this.applyTRLSelection();

            this.htmlRenderedMap.clear();
        } catch (e) {
            this.errorMsg = 'Unable to load milestones';
            this.milestones = [];
        } finally {
            this.isLoading = false;
        }
    }

    renderedCallback() {
        this.milestones.forEach(m => {
            this.injectHtml(m.milestoneId, 'desc', m.milestoneDescription);
        });
    }

    injectHtml(mid, type, html) {
        const key = `${mid}-${type}`;
        if (this.htmlRenderedMap.has(key)) return;

        const el = this.template.querySelector(
            `[data-mid="${mid}"][data-type="${type}"]`
        );

        if (el) {
            el.innerHTML = html || '';
            this.htmlRenderedMap.add(key);
        }
    }

    safeDateString(val) {
        if (!val) return '-';
        const d = new Date(val);
        return isNaN(d) ? val : String(d.getMonth() + 1).padStart(2, '0');
    }

    getStatusClass(status) {
        const s = (status || '').toLowerCase();

        if (s.includes('disbursed') || s.includes('paid'))
            return 'badge badgeGreen';

        if (s.includes('submitted') || s.includes('review'))
            return 'badge badgeBlue';

        if (s.includes('resubmit'))
            return 'badge badgeWarn';

        if (s.includes('rejected'))
            return 'badge badgeDanger';

        return 'badge badgeNeutral';
    }

    handleView(e) {
        window.location.assign(
            `/WadhwaniOrg/s/milestone/${e.currentTarget.dataset.id}`
        );
    }

    async handleUpload(e) {
        const id = e.currentTarget.dataset.id;
        const m = this.milestones.find(x => x.milestoneId === id);
        if (m?.isAlreadyUploaded) return;

        // Total Utilized and Current TRL are mandatory before the upload
        // modal can be opened. If either is missing, mark that milestone's
        // fields invalid (turns them red + shows inline errors) and stop.
        const utilizedInvalid = this.isEmpty(m.totalUtilizedInput);
        const trlInvalid = this.isEmpty(m.currentTRLInput);

        if (utilizedInvalid || trlInvalid) {
            this.milestones = this.milestones.map(x => {
                if (x.milestoneId !== id) return x;
                return this.computeFieldClasses({ ...x, utilizedInvalid, trlInvalid });
            });
            return;
        }

        this.selectedMilestoneId = id;
        this.isUploadOpen = true;
        this.resetUploadUI();
        await this.fetchRequestedSupportDocs();
    }

    handleTotalUtilizedChange(e) {
        const id = e.currentTarget.dataset.id;
        const value = e.target.value;
        this.milestones = this.milestones.map(m => {
            if (m.milestoneId !== id) return m;
            return this.computeFieldClasses({
                ...m,
                totalUtilizedInput: value,
                utilizedInvalid: this.isEmpty(value) ? m.utilizedInvalid : false
            });
        });
    }

    handleCurrentTRLChange(e) {
        const id = e.currentTarget.dataset.id;
        const value = e.target.value;
        this.milestones = this.milestones.map(m => {
            if (m.milestoneId !== id) return m;
            return this.computeFieldClasses({
                ...m,
                currentTRLInput: value,
                trlInvalid: this.isEmpty(value) ? m.trlInvalid : false
            });
        });
    }

    parseUtilized(val) {
        if (val === undefined || val === null || val === '') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    }
    parseTRL(val) {
        if (val === undefined || val === null || val === '') return null;
        return String(val);
    }

    async closeUploadModal() {
        // If the upload already triggered an auto-save (see
        // handleUploadFinished), don't save again here — just close
        // and make sure the list is current.
        if (this.reportAlreadyAutoSaved) {
            this.isUploadOpen = false;
            this.selectedMilestoneId = null;
            this.resetUploadUI();
            await this.load();
            return;
        }

        try {
            const m = this.milestones.find(x => x.milestoneId === this.selectedMilestoneId);
            const totalUtilizedVal = m ? this.parseUtilized(m.totalUtilizedInput) : null;
            const currentTRLVal = m ? this.parseTRL(m.currentTRLInput) : null;

            if (this.selectedMilestoneId && (this.uploadedFileNames.length || totalUtilizedVal !== null || currentTRLVal !== null)) {
                await saveMilestoneReport({
                    milestoneId: this.selectedMilestoneId,
                    totalUtilized: totalUtilizedVal,
                    currentTRL: currentTRLVal,
                    markSubmitted: this.uploadedFileNames.length > 0
                });
            }
        } catch (e) {
            console.error(e);
            alert(e?.body?.message || 'Status update failed');
        }

        this.isUploadOpen = false;
        this.selectedMilestoneId = null;
        this.resetUploadUI();
        await this.load();
    }

    resetUploadUI() {
        this.requestedSupportDocs = '';
        this.requiredDocNames = [];
        this.uploadedFileNames = [];
        this.namingErrorMsg = '';
        this.reportAlreadyAutoSaved = false;
    }

    async fetchRequestedSupportDocs() {
        const txt = await getRequestedSupportDocs({
            milestoneId: this.selectedMilestoneId
        });

        this.requestedSupportDocs = txt || '';
        this.requiredDocNames = this.parseRequiredDocs(txt);
    }

    parseRequiredDocs(txt) {
        if (!txt) return [];
        return txt.split('\n').map(x => x.trim()).filter(x => x);
    }

    async handleUploadFinished(e) {
        const files = e.detail.files || [];
        this.uploadedFileNames = [
            ...this.uploadedFileNames,
            ...files.map(f => f.name)
        ];
        alert(`✅ ${files.length} file(s) uploaded successfully.`);

        // Auto-save Total Utilized / Current TRL and mark the report
        // submitted as soon as the upload finishes, then refresh the
        // milestones list in the background — no need to wait for the
        // user to click "Save & Close" for the card to lock and show
        // the saved values.
        await this.autoSaveAndRefresh();
    }

    async autoSaveAndRefresh() {
        try {
            const m = this.milestones.find(x => x.milestoneId === this.selectedMilestoneId);
            const totalUtilizedVal = m ? this.parseUtilized(m.totalUtilizedInput) : null;
            const currentTRLVal = m ? this.parseTRL(m.currentTRLInput) : null;

            if (this.selectedMilestoneId) {
                await saveMilestoneReport({
                    milestoneId: this.selectedMilestoneId,
                    totalUtilized: totalUtilizedVal,
                    currentTRL: currentTRLVal,
                    markSubmitted: true
                });
                this.reportAlreadyAutoSaved = true;
            }
        } catch (e) {
            console.error(e);
            alert(e?.body?.message || 'Status update failed');
            return;
        }

        // Refresh the underlying list in the background so the card
        // is already correct once the user closes the modal. The
        // modal itself stays open so they can keep uploading more
        // files if needed.
        await this.load();
    }

    buildTrlOptions(currentVal) {
        const val = currentVal == null ? '' : String(currentVal);
        const opts = [{ label: 'Select TRL', value: '', selected: val === '' }];
        this.trlOptions.forEach(o => {
            opts.push({
                label: o.label,
                value: o.value,
                selected: String(o.value) === val
            });
        });
        return opts;
    }
}