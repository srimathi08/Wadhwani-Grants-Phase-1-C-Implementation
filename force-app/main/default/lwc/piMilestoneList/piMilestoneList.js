import { LightningElement, track } from 'lwc';
import getMilestones from '@salesforce/apex/PiMilestoneController.getMilestones';
import getRequestedSupportDocs from '@salesforce/apex/PiMilestoneController.getRequestedSupportDocs';
import markMilestoneAsReportSubmitted from '@salesforce/apex/PiMilestoneController.markMilestoneAsReportSubmitted';

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

    htmlRenderedMap = new Set();

    connectedCallback() {
        this.load();
    }

    get urlAppId() {
        try {
            const url = new URL(window.location.href);
            return url.searchParams.get('appId');
        } catch (e) {
            return null;
        }
    }

    async load() {
        this.isLoading = true;
        this.errorMsg = '';

        try {
            const data = await getMilestones({ appId: this.urlAppId });

            this.milestones = (data || []).map(m => {
                const statusStr = (m.status || '').toLowerCase();
                const isUploaded = statusStr === 'report submitted';

                return {
                    ...m,
                    statusLabel: m.status || 'Not Started',
                    statusClass: this.getStatusClass(m.status),

                    startFormatted: this.safeDateString(m.projectStartDate),
                    endFormatted: this.safeDateString(m.projectEndDate),

                    isAlreadyUploaded: isUploaded,
                    uploadBtnLabel: isUploaded ? 'Reports were uploaded' : 'Upload Files'
                };
            });

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

        this.selectedMilestoneId = id;
        this.isUploadOpen = true;
        this.resetUploadUI();
        await this.fetchRequestedSupportDocs();
    }

    // ✅ SAFE CLOSE
    async closeUploadModal() {
        try {
            if (this.uploadedFileNames.length && this.selectedMilestoneId) {
                await markMilestoneAsReportSubmitted({
                    milestoneId: this.selectedMilestoneId
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

    handleUploadFinished(e) {
        const files = e.detail.files || [];
        this.uploadedFileNames = [
            ...this.uploadedFileNames,
            ...files.map(f => f.name)
        ];
        alert(`✅ ${files.length} file(s) uploaded successfully.`);
    }
}