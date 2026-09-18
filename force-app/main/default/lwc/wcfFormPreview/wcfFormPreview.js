import { LightningElement, api, track, wire } from 'lwc';
import getWCFFullPreviewData       from '@salesforce/apex/WCFValidatorController.getWCFFullPreviewData';
import getApplicationAttachments   from '@salesforce/apex/WCFValidatorController.getApplicationAttachments';
import getFormMetadata             from '@salesforce/apex/WCFFormMetadataController.getFormMetadata';
import WCF_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import getFileBase64 from '@salesforce/apex/WCFValidatorController.getFileBase64';
import { loadScript } from 'lightning/platformResourceLoader';
import JSPDF from '@salesforce/resourceUrl/downloadjs';
import AUTO_TABLE from '@salesforce/resourceUrl/autotable';
import JSZIP from '@salesforce/resourceUrl/jszip';
import MAMMOTH_LIB from '@salesforce/resourceUrl/mammoth';
import XLSX_LIB from '@salesforce/resourceUrl/xlsx';

const MONTH_NAMES = {
    '01': 'January', '1': 'January', 'january': 'January', 'jan': 'January',
    '02': 'February', '2': 'February', 'february': 'February', 'feb': 'February',
    '03': 'March', '3': 'March', 'march': 'March', 'mar': 'March',
    '04': 'April', '4': 'April', 'april': 'April', 'apr': 'April',
    '05': 'May', '5': 'May', 'may': 'May',
    '06': 'June', '6': 'June', 'june': 'June', 'jun': 'June',
    '07': 'July', '7': 'July', 'july': 'July', 'jul': 'July',
    '08': 'August', '8': 'August', 'august': 'August', 'aug': 'August',
    '09': 'September', '9': 'September', 'september': 'September', 'sep': 'September',
    '10': 'October', '10': 'October', 'october': 'October', 'oct': 'October',
    '11': 'November', '11': 'November', 'november': 'November', 'nov': 'November',
    '12': 'December', '12': 'December', 'december': 'December', 'dec': 'December'
};

function getFieldValue(obj, fieldName) {
    if (!obj || !fieldName) return undefined;
    const cleanField = String(fieldName).trim();
    if (obj[cleanField] !== undefined && obj[cleanField] !== null && obj[cleanField] !== '') {
        return obj[cleanField];
    }
    const lower = cleanField.toLowerCase();
    if (obj[lower] !== undefined && obj[lower] !== null && obj[lower] !== '') {
        return obj[lower];
    }
    const noSuffix = lower.endsWith('__c') ? lower.slice(0, -3) : lower;
    if (obj[noSuffix] !== undefined && obj[noSuffix] !== null && obj[noSuffix] !== '') {
        return obj[noSuffix];
    }

    try {
        const keys = Object.keys(obj);
        for (const key of keys) {
            const kLower = key.toLowerCase();
            const kNoSuffix = kLower.endsWith('__c') ? kLower.slice(0, -3) : kLower;
            if (kLower === lower || kNoSuffix === noSuffix) {
                if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
                    return obj[key];
                }
            }
        }
    } catch (e) {}

    for (const key in obj) {
        const kLower = key.toLowerCase();
        const kNoSuffix = kLower.endsWith('__c') ? kLower.slice(0, -3) : kLower;
        if (kLower === lower || kNoSuffix === noSuffix) {
            if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
                return obj[key];
            }
        }
    }
    return undefined;
}

export default class WcfFormPreview extends LightningElement {

    _recordId;
    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(val) {
        this._recordId = val;
        if (val) {
            this._loadPreviewData();
        }
    }

    @api hideAutoComputed = false;
    WCF_Logo = WCF_LOGO;

    @track isJsLoaded = false;
    _scriptsInitiated = false;
    logoBase64 = null;
    @track isPdfGenerating = false;

    @track isLoading = true;
    @track _app      = null;
    @track _hist     = null;
    @track _fiscal   = null;
    @track _outcome  = null;

    @track isPreviewLoading = false;
    @track _skillingDomains = [];
    @track _businessSectors = [];
    @track _attachments     = [];
    @track _additionalInfoFiles = [];

    @track isOfficePreviewOpen = false;
    officePreviewTitle = '';
    _officeLibsLoaded = false;
    _pendingOfficeRender = null;

    MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // ── Imperative: full preview data (always fresh, no wire cache) ──────────
    async _loadPreviewData() {
        if (!this.recordId) return;
        this.isLoading = true;
        try {
            const data = await getWCFFullPreviewData({ applicationId: this.recordId });
            if (data) {
                this._app     = data.applicationData ? { ...data.applicationData } : (data.application ? { ...data.application } : null);
                this._hist    = data.historicalData ? { ...data.historicalData } : (data.historical ? { ...data.historical } : null);
                this._fiscal  = data.fiscalData ? { ...data.fiscalData } : (data.fiscal ? { ...data.fiscal } : null);
                this._outcome = data.outcomeData ? { ...data.outcomeData } : (data.outcome ? { ...data.outcome } : null);
                await this._loadMetadata();

                if (data.skillingDomains?.length > 0) {
                    this._skillingDomains = data.skillingDomains.map((r, i) => ({
                        idx            : i,
                        domain         : r.Domain_Programme_Name__c || '—',
                        hours          : (r.Hours_of_Training__c != null && r.Hours_of_Training__c !== '') ? r.Hours_of_Training__c : '—',
                        duration       : (r.Duration_Months__c != null && r.Duration_Months__c !== '') ? r.Duration_Months__c : '—',
                        startDate      : r.Programme_Start_Date__c
                                           ? this._fmtDate(r.Programme_Start_Date__c) : '—',
                        yearlyEnrolment: (r.Yearly_Enrolment__c != null && r.Yearly_Enrolment__c !== '') ? r.Yearly_Enrolment__c : '—'
                    }));
                } else {
                    this._skillingDomains = [];
                }

                if (data.businessSectors?.length > 0) {
                    this._businessSectors = data.businessSectors.map((r, i) => {
                        const typesLabel = r.Support_Types__c
                            ? r.Support_Types__c.split(';')
                                .map(t => (t.trim() === 'Other' && r.Support_Type_Other__c)
                                    ? `Other: ${r.Support_Type_Other__c}`
                                    : t.trim())
                                .join(', ')
                            : '—';
                        return {
                            idx              : i,
                            sector           : (r.Sector_c__c === 'Other' && r.Business_Sector_Other__c)
                                                   ? `Other: ${r.Business_Sector_Other__c}`
                                                   : (r.Sector_c__c || '—'),
                            supportBegin     : r.Support_Begin_Date__c
                                                   ? this._fmtDate(r.Support_Begin_Date__c) : '—',
                            supportTypesLabel: typesLabel,
                            yearlyEnrolment  : (r.Yearly_Enrolment__c != null && r.Yearly_Enrolment__c !== '') ? r.Yearly_Enrolment__c : '—'
                        };
                    });
                } else {
                    this._businessSectors = [];
                }
            } else {
                this._app = null;
                console.error('WcfFormPreview load error: no data returned');
            }
        } catch (error) {
            this._app = null;
            console.error('WcfFormPreview load error:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // ── Wire: attachments ────────────────────────────────────────────────────
    @wire(getApplicationAttachments, { applicationId: '$recordId' })
    wiredAttachments({ data, error }) {
        if (data) {
            this._attachments = data;
        }
        if (error) {
            console.error('Attachment Error', error);
        }
    }

    get hasAdditionalInfoFiles() {
        return this.additionalInfoFiles && this.additionalInfoFiles.length > 0;
    }
    get additionalInfoFiles() {
        return (this._attachments || [])
            .filter(a => a.contentDocumentId && a.questionKey === 'ADDENDUM')
            .map(a => {
                const ext = a.fileExtension ? '.' + a.fileExtension : '';
                let fullName = a.fileName || 'Document';
                if (ext && !fullName.toLowerCase().endsWith(ext.toLowerCase())) {
                    fullName += ext;
                }
                return {
                    documentId: a.contentDocumentId,
                    versionId : a.contentVersionId,
                    name      : fullName + (a.fileSizeMB ? ` (${a.fileSizeMB} MB)` : '')
                };
            });
    }

    // ── Lifecycle Callbacks ──────────────────────────────────────────────────
    @track metadataQuestions = [];
    @track _metaVersion = 0;

    connectedCallback() {
        this._loadPdfLibraries();
        this._loadPreviewData();
    }

    @api
    refreshPreview() {
        return this._loadPreviewData();
    }

    async _loadMetadata() {
        try {
            const meta = await getFormMetadata({
                languageCode: 'en_US',
                fiscalMonth: this._app?.Fiscal_Month__c || '03',
                fiscalDay: this._app?.Fiscal_Day__c || '31'
            });
            if (meta && meta.questions) {
                this.metadataQuestions = [...meta.questions];
                this._metaVersion++;
            }
        } catch (err) {
            console.warn('WcfFormPreview metadata load warning:', err);
        }
    }

    _getCustomQuestions(filterFn, basePrefix) {
        // Read _metaVersion to establish reactive dependency
        const _ = this._metaVersion;
        if (!this.metadataQuestions || !this.metadataQuestions.length || !this._app) return [];
        const filtered = this.metadataQuestions.filter(q => q.isCustom && filterFn(q));
        return filtered.map((q, idx) => {
            let val = undefined;
            const targetSources = [this._app, this._hist, this._fiscal, this._outcome].filter(Boolean);
            
            for (const src of targetSources) {
                if (q.targetField) {
                    val = getFieldValue(src, q.targetField);
                    if (val !== undefined && val !== null && val !== '') break;
                }
                if (q.key) {
                    val = getFieldValue(src, q.key);
                    if (val !== undefined && val !== null && val !== '') break;
                }
            }

            const dt = (q.displayType || 'Text').toLowerCase();
            let displayVal = val;
            if (val === undefined || val === null || val === '') {
                displayVal = '—';
            } else if (typeof val === 'boolean' || dt === 'checkbox' || dt === 'boolean') {
                displayVal = (val === true || val === 'true') ? 'Yes' : 'No';
            }
            const keyVal = q.key || q.targetField || `preview-cq-${idx}`;
            return {
                ...q,
                key: keyVal,
                displayNumber: basePrefix ? `${basePrefix}.${idx + 1}` : `${idx + 1}`,
                displayValue: String(displayVal)
            };
        });
    }

    // Section 2: Organizational Identifying Information (e.g. Q2_VOLUNTEER_COUNT)
    get customQuestionsQ2() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q2' || q.sectionCode === 'Q2'
        ) && (
            (q.key && q.key.toUpperCase().startsWith('Q2_')) ||
            (q.targetField && q.targetField.toLowerCase() === 'annual_volunteer_count__c')
        ), '2');
    }
    get hasCustomQuestionsQ2() {
        return this.customQuestionsQ2 && this.customQuestionsQ2.length > 0;
    }

    // Section 3: Submitter Contact Information
    get customQuestionsQ3() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q3' || q.sectionCode === 'Q3'
        ) && q.key && q.key.toUpperCase().startsWith('Q3_'), '3');
    }
    get hasCustomQuestionsQ3() {
        return this.customQuestionsQ3 && this.customQuestionsQ3.length > 0;
    }

    // Section 4: Legal & Governance Structure
    get customQuestionsQ4() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q4' || q.sectionCode === 'Q4'
        ) && q.key && q.key.toUpperCase().startsWith('Q4_'), '4');
    }
    get hasCustomQuestionsQ4() {
        return this.customQuestionsQ4 && this.customQuestionsQ4.length > 0;
    }

    // Section 5: Legal & Tax Compliance
    get customQuestionsQ5() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q5' || q.sectionCode === 'Q5'
        ) && q.key && q.key.toUpperCase().startsWith('Q5_'), '5');
    }
    get hasCustomQuestionsQ5() {
        return this.customQuestionsQ5 && this.customQuestionsQ5.length > 0;
    }

    // Section 6: Fiscal Year
    get customQuestionsQ6() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q6' || q.sectionCode === 'Q6'
        ) && q.key && q.key.toUpperCase().startsWith('Q6_'), '6');
    }
    get hasCustomQuestionsQ6() {
        return this.customQuestionsQ6 && this.customQuestionsQ6.length > 0;
    }

    // General Custom Questions for Tab 1 (About Org) - remaining ones
    get customQuestionsAboutOrg() {
        const renderedKeys = new Set([
            ...this.customQuestionsQ2.map(x => x.key),
            ...this.customQuestionsQ3.map(x => x.key),
            ...this.customQuestionsQ4.map(x => x.key),
            ...this.customQuestionsQ5.map(x => x.key),
            ...this.customQuestionsQ6.map(x => x.key)
        ]);
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'ABOUT_ORG'
        ) && !renderedKeys.has(q.key), '10');
    }
    get hasCustomQuestionsAboutOrg() {
        return this.customQuestionsAboutOrg && this.customQuestionsAboutOrg.length > 0;
    }

    get customQuestionsJobFulfillment() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_JOB_FULFILLMENT' || q.sectionCode === 'SEC_WHAT_YOU_DO' || q.sectionCode === 'JOB_FULFILLMENT'
        ), `Q${this.qNum?.Q14 || '14'}`);
    }
    get hasCustomQuestionsJobFulfillment() {
        return this.customQuestionsJobFulfillment && this.customQuestionsJobFulfillment.length > 0;
    }

    get customQuestionsJobCreation() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_JOB_CREATION' || q.sectionCode === 'JOB_CREATION'
        ), `Q${this.qNum?.Q18 || '18'}`);
    }
    get hasCustomQuestionsJobCreation() {
        return this.customQuestionsJobCreation && this.customQuestionsJobCreation.length > 0;
    }

    get customQuestionsLivelihood() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_LIVELIHOOD' || q.sectionCode === 'LIVELIHOOD'
        ), `Q${this.qNum?.Q23 || '23'}`);
    }
    get hasCustomQuestionsLivelihood() {
        return this.customQuestionsLivelihood && this.customQuestionsLivelihood.length > 0;
    }

    get customQuestionsWhyWadhwani() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_WHY_WADHWANI' || q.sectionCode === 'SEC_WHY_WCF' || q.sectionCode === 'WHY_WADHWANI'
        ), `Q${this.qNum?.Q28 || '28'}`);
    }
    get hasCustomQuestionsWhyWadhwani() {
        return this.customQuestionsWhyWadhwani && this.customQuestionsWhyWadhwani.length > 0;
    }

    renderedCallback() {
        if (this._pendingOfficeRender && this.isOfficePreviewOpen) {
            const { extension, base64Data, title } = this._pendingOfficeRender;
            const container = this.template.querySelector('[data-id="office-preview-body"]');
            if (container) {
                this._pendingOfficeRender = null;
                this._paintOfficePreview(container, extension, base64Data, title);
            }
        }
    }

    // ── Formatters & Basic Helpers ───────────────────────────────────────────
    get hasRecord() { return !!this._app; }
    handleLogoError(event) { event.target.style.display = 'none'; }

    _fmtCurrency(v) {
        if (v == null || v === '') return '—';
        const n = Number(v);
        if (isNaN(n)) return '—';
        const hasCents = Math.round(n * 100) % 100 !== 0;
        return '$' + n.toLocaleString('en-US', {
            minimumFractionDigits: hasCents ? 2 : 0,
            maximumFractionDigits: 2
        });
    }

    _fmtDate(d) {
        if (!d) return '—';
        const iso = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) {
            const [, yr, mo, da] = iso;
            const mIdx = parseInt(mo, 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
                return `${parseInt(da, 10)} ${this.MONTH_ABBR[mIdx]} ${yr}`;
            }
        }
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        return `${dt.getDate()} ${this.MONTH_ABBR[dt.getMonth()]} ${dt.getFullYear()}`;
    }

    _fmtDateTime(d) {
        if (!d) return '—';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        return `${dt.getDate()} ${this.MONTH_ABBR[dt.getMonth()]} ${dt.getFullYear()}, ${hh}:${mm}`;
    }

    _fmtPct(v) {
        if (v == null || v === '' || v === '—') return '—';
        const str = String(v).trim();
        if (str.endsWith('%')) return str;
        const num = Number(str);
        if (isNaN(num)) return str;
        return `${str}%`;
    }

    _val(v) { return (v != null && v !== '') ? v : '—'; }

    // ── Multi-Track Detection & Dynamic Section Labels ───────────────────────
    get _orgArea() {
        return this._app?.Organizational_Area_s_for_Funding_Inves1__c 
            || this._app?.Organizational_Area_s_for_Funding_Inves__c 
            || '';
    }

    get isJobFulfillment() {
        const a = this._orgArea;
        return a.includes('Job Fulfillment') || a === 'Job Fulfillment Only' || a === 'Both Job Fulfillment and Job Creation';
    }

    get isJobCreation() {
        const a = this._orgArea;
        return a.includes('Job Creation') || a === 'Job Creation Only' || a === 'Both Job Fulfillment and Job Creation';
    }

    get isLivelihood() {
        const a = this._orgArea;
        return a.includes('Livelihood');
    }

    get selectedTrackBadges() {
        const badges = [];
        if (this.isJobFulfillment) badges.push({ label: 'Job Fulfillment', class: 'rv-tag rv-tag-jf' });
        if (this.isJobCreation)    badges.push({ label: 'Job Creation', class: 'rv-tag rv-tag-jc' });
        if (this.isLivelihood)     badges.push({ label: 'Livelihood Upliftment', class: 'rv-tag rv-tag-liv' });
        if (badges.length === 0 && this.orgArea && this.orgArea !== '—') {
            badges.push({ label: this.orgArea, class: 'rv-tag' });
        }
        return badges;
    }

    get totalSections() {
        let count = 2; // Section 1 (About) + Section Final (Why WCF)
        if (this.isJobFulfillment) count++;
        if (this.isJobCreation) count++;
        if (this.isLivelihood) count++;
        return count;
    }

    get section1StepLabel() {
        return `Section 1 of ${this.totalSections}`;
    }

    get sectionJfStepLabel() {
        return `Section 2 of ${this.totalSections}`;
    }

    get sectionJcStepLabel() {
        const step = 2 + (this.isJobFulfillment ? 1 : 0);
        return `Section ${step} of ${this.totalSections}`;
    }

    get sectionLivStepLabel() {
        const step = 2 + (this.isJobFulfillment ? 1 : 0) + (this.isJobCreation ? 1 : 0);
        return `Section ${step} of ${this.totalSections}`;
    }

    get sectionWhyStepLabel() {
        return `Section ${this.totalSections} of ${this.totalSections}`;
    }

    // ── Dynamic Continuous Question Numbering (1 to N) ───────────────────
    get qNum() {
        let currentNumber = 1;
        const map = {};

        map.Q1 = currentNumber++; // 1
        map.Q2 = currentNumber++; // 2
        map.Q3 = currentNumber++; // 3
        map.Q4 = currentNumber++; // 4
        map.Q5 = currentNumber++; // 5
        map.Q6 = currentNumber++; // 6
        map.Q7 = currentNumber++; // 7
        map.Q8 = currentNumber++; // 8
        map.Q9 = currentNumber++; // 9
        map.Q10 = currentNumber++; // 10

        if (this.isJobFulfillment) {
            map.Q11 = currentNumber++;
            map.Q12 = currentNumber++;
            map.Q13 = currentNumber++;
            map.Q14 = currentNumber++;
        }

        if (this.isJobCreation) {
            map.Q15 = currentNumber++;
            map.Q16 = currentNumber++;
            map.Q17 = currentNumber++;
            map.Q18 = currentNumber++;
        }

        if (this.isLivelihood) {
            map.Q19 = currentNumber++;
            map.Q20 = currentNumber++;
            map.Q21 = currentNumber++;
            map.Q22 = currentNumber++;
            map.Q23 = currentNumber++;
        }

        map.Q24 = currentNumber++;
        map.Q25 = currentNumber++;
        map.Q26 = currentNumber++;
        map.Q27 = currentNumber++;
        map.Q28 = currentNumber++;

        return map;
    }

    // ── Dynamic FY Labels ────────────────────────────────────────────────────
    get fiscalEndYear() {
        const dateStr = this._app?.Current_fiscal_year_s_end_date__c;
        if (!dateStr) return null;
        return new Date(dateStr).getFullYear();
    }
    get fyLabel1() {
        return this.fiscalEndYear ? `FY-${this.fiscalEndYear - 1}` : 'FY-1';
    }
    get fyLabel2() {
        return this.fiscalEndYear ? `FY-${this.fiscalEndYear - 2}` : 'FY-2';
    }
    get fyLabel3() {
        return this.fiscalEndYear ? `FY-${this.fiscalEndYear - 3}` : 'FY-3';
    }

    // ── Section 1: About Your Organisation Getters ───────────────────────────
    get orgArea()               { return this._val(this._orgArea); }
    get orgName()               { return this._val(this._app?.Organization_Name__c); }
    get hqCity()                { return this._val(this._app?.Headquarters_City_and_Country__c); }
    get primaryServiceRegions() { return this._val(this._app?.Primary_Service_Regions__c); }
    get leaderName()            { return this._val(this._app?.Leader_Name__c); }
    get leaderTitle()           { return this._val(this._app?.Leader_Title__c); }
    get leaderTenure() {
        const v = this._app?.Leader_Tenure__c;
        return (v != null && v !== '') ? `${v} years` : '—';
    }
    get piName()                { return this._val(this._app?.Submitter_Name__c); }
    get piDesignation()         { return this._val(this._app?.Job_Title__c); }
    get piEmail()               { return this._val(this._app?.Work_Email_ID__c); }
    get phoneCountryCode() {
        const val = this._app?.WG_Phone_Country_Code__c || this._app?.Phone_Country_Code__c;
        if (!val) return '';
        const match = String(val).match(/^\+\d+/);
        return match ? match[0] : val;
    }
    get piPhone()               { return this._val(this._app?.Phone__c); }
    get phoneDisplay() {
        const code = this.phoneCountryCode ? `${this.phoneCountryCode} ` : '';
        return this.piPhone !== '—' ? `${code}${this.piPhone}`.trim() : '—';
    }

    get legalType()             { return this._val(this._app?.Legal_Type__c); }
    get showLegalTypeOther()    { return this._app?.Legal_Type__c === 'Other'; }
    get legalTypeOtherSpecified() { return this._val(this._app?.Legal_Type_Other__c); }
    get registrationJurisdiction() { return this._val(this._app?.Registration_Jurisdiction__c); }
    get showRegistrationJurisdictionOther() { return this._app?.Registration_Jurisdiction__c === 'Other'; }
    get registrationJurisdictionOtherSpecified() { return this._val(this._app?.Registration_Jurisdiction_Other__c); }
    get incorporationDate()     { return this._fmtDate(this._app?.Incorporation_Date__c); }
    get legalDescription()      { return this._app?.Legal_Structure__c; }

    // Q5 Getters
    get has501c3()              { return this._val(this._app?.Has_501c3_Status__c); }
    get hasEquivalencyDetermination() { return this._val(this._app?.Has_Equivalency_Determination__c); }
    get isFcraRegistered()      { return this._val(this._app?.Is_FCRA_Registered__c); }
    get openToEquivalencyDetermination() { return this._val(this._app?.Willing_to_Pursue_ED__c || this._app?.Open_to_Equivalency_Determination__c); }

    // Q6 Getters - Human Readable Date
    get fiscalYearEnd() {
        const moRaw = this._app?.Fiscal_Month__c;
        const daRaw = this._app?.Fiscal_Day__c;
        if (moRaw && daRaw) {
            const moKey = String(moRaw).trim().toLowerCase();
            const moName = MONTH_NAMES[moKey] || moRaw;
            const daNum = parseInt(daRaw, 10) || daRaw;
            return `${daNum} ${moName}`;
        }
        if (this._app?.Current_fiscal_year_s_end_date__c) {
            return this._fmtDate(this._app.Current_fiscal_year_s_end_date__c);
        }
        return '—';
    }

    // Q7 Getters
    get funders() {
        const result = [];
        [1, 2, 3].forEach(n => {
            const name = this._app?.[`Funder_${n}_Name__c`];
            if (name) {
                result.push({
                    key   : n,
                    header: `FUNDER ${n}`,
                    name,
                    amount: this._fmtCurrency(this._app?.[`Funder_${n}_Amount__c`]),
                    period: `${this._fmtDate(this._app?.[`Funder_${n}_Period_Start__c`])} – ${this._fmtDate(this._app?.[`Funder_${n}_Period_End__c`])}`,
                    type  : this._val(this._app?.[`Funder_${n}_Type__c`]),
                });
            }
        });
        return result;
    }
    get hasFunders() { return this.funders.length > 0; }

    // Q8 Getters
    get references() {
        const result = [];
        [1, 2].forEach(n => {
            const name = this._app?.[`Reference_${n}_Name__c`];
            if (name) {
                result.push({
                    key         : n,
                    header      : `REFERENCE ${n}`,
                    name,
                    organisation: this._val(this._app?.[`Reference_${n}_Role__c`]),
                    email       : this._val(this._app?.[`Reference_${n}_Email__c`]),
                });
            }
        });
        return result;
    }
    get hasReferences() { return this.references.length > 0; }

    // Q9 Getters
    get historicalData() {
        const h = this._hist;
        return {
            balanceStartFY3 : this._fmtCurrency(h?.CY3_Balance_Start_CFY_3__c),
            balanceStartFY2 : this._fmtCurrency(h?.CY2_Balance_Start_CFY_2__c),
            balanceStartFY1 : this._fmtCurrency(h?.CY1_Balance_Start_CFY_1__c),
            revenueFY3      : this._fmtCurrency(h?.CY3_Revenue__c),
            revenueFY2      : this._fmtCurrency(h?.CY2_Revenue__c),
            revenueFY1      : this._fmtCurrency(h?.CY1_Revenue__c),
            capitalExpFY3   : this._fmtCurrency(h?.CY3_Capital_Expenditure__c),
            capitalExpFY2   : this._fmtCurrency(h?.CY2_Capital_Expenditure__c),
            capitalExpFY1   : this._fmtCurrency(h?.CY1_Capital_Expenditure__c),
            operatingExpFY3 : this._fmtCurrency(h?.CY3_Operating_Expenditure__c),
            operatingExpFY2 : this._fmtCurrency(h?.CY2_Operating_Expenditure__c),
            operatingExpFY1 : this._fmtCurrency(h?.CY1_Operating_Expenditure__c),
            balanceEndFY3   : this._fmtCurrency(h?.CY3_Balance_End__c),
            balanceEndFY2   : this._fmtCurrency(h?.CY2_Balance_End__c),
            balanceEndFY1   : this._fmtCurrency(h?.CY1_Balance_End__c),
        };
    }

    // Q10 Getters
    get fiscalData() {
        const fc = this._fiscal;
        return {
            revenueBudget         : this._fmtCurrency(fc?.Revenue_Budget__c),
            revenueProjection     : this._fmtCurrency(fc?.Revenue_Projection__c),
            revenueVariance       : this._fmtCurrency(fc?.Revenue_Variance__c),
            capitalExpBudget      : this._fmtCurrency(fc?.Capital_Expenditure_Budget__c),
            capitalExpProjection  : this._fmtCurrency(fc?.Capital_Expenditure_Projection__c),
            capitalExpVariance    : this._fmtCurrency(fc?.Capital_Expenditure_Variance__c),
            operatingExpBudget    : this._fmtCurrency(fc?.Operating_Expenditure_Budget__c),
            operatingExpProjection: this._fmtCurrency(fc?.Operating_Expenditure_Projection__c),
            operatingExpVariance  : this._fmtCurrency(fc?.Operating_Expenditure_Variance__c),
            netBudget             : this._fmtCurrency(fc?.Net_Budget__c),
            netProjection         : this._fmtCurrency(fc?.Net_Projection__c),
            netVariance           : this._fmtCurrency(fc?.Net_Variance__c),
        };
    }

    get showCFYExplanation() {
        const rBudget   = Number(this._fiscal?.Revenue_Budget__c) || 0;
        const capBudget = Number(this._fiscal?.Capital_Expenditure_Budget__c) || 0;
        const opBudget  = Number(this._fiscal?.Operating_Expenditure_Budget__c) || 0;

        const rPct   = rBudget   ? Math.abs((Number(this._fiscal?.Revenue_Variance__c)||0) / rBudget) * 100   : 0;
        const capPct = capBudget ? Math.abs((Number(this._fiscal?.Capital_Expenditure_Variance__c)||0) / capBudget) * 100 : 0;
        const opPct  = opBudget  ? Math.abs((Number(this._fiscal?.Operating_Expenditure_Variance__c)||0) / opBudget) * 100  : 0;

        const THRESHOLD = 10;
        return rPct > THRESHOLD || capPct > THRESHOLD || opPct > THRESHOLD || !!this._fiscal?.Revenue_Explanation__c;
    }
    get cfyVarianceExplanation() { return this._val(this._fiscal?.Revenue_Explanation__c); }

    // ── Track 1: Job Fulfillment Getters (Q11 - Q14) ─────────────────────────
    get skillingApproach()    { return this._val(this._app?.Skilling_Approach__c); }
    get skillingDomains()     { return this._skillingDomains; }
    get hasSkillingDomains()  { return this._skillingDomains.length > 0; }

    // ── Track 2: Job Creation Getters (Q15 - Q18) ────────────────────────────
    get jobCreationApproach() { return this._val(this._app?.Job_Creation_Approach__c); }
    get businessSectors()     { return this._businessSectors; }
    get hasBusinessSectors()  { return this._businessSectors.length > 0; }

    // ── Track 3: Livelihood Upliftment Getters (Q19 - Q23) ───────────────────
    get livelihoodApproach()         { return this._val(this._app?.Livelihood_Approach__c); }

    // ── Outcome Data Grid (All Tracks) ───────────────────────────────────────
    get outcomeData() {
        const o = this._outcome;
        const f = v => this._val(v);
        const c = v => this._fmtCurrency(v);
        return {
            // Track 1: Job Fulfillment
            learnerEnrolFY3 : f(o?.Projected_Learner_Enrollments_FY_3__c),
            learnerEnrolFY2 : f(o?.Projected_Learner_Enrollments_FY_2__c),
            learnerEnrolFY1 : f(o?.Projected_Learner_Enrollments_FY_1__c),
            learnerEnrolCFY : f(o?.Projected_Learner_Enrollments_CFY__c),
            learnerPlaceFY3 : f(o?.Projected_Learner_Placements_FY_3__c),
            learnerPlaceFY2 : f(o?.Projected_Learner_Placements_FY_2__c),
            learnerPlaceFY1 : f(o?.Projected_Learner_Placements_FY_1__c),
            learnerPlaceCFY : f(o?.Projected_Learner_Placements_CFY__c),
            placePctFY3     : this._fmtPct(o?.Projected_Learner_placement_FY_3__c),
            placePctFY2     : this._fmtPct(o?.Projected_Learner_placement_FY_2__c),
            placePctFY1     : this._fmtPct(o?.Projected_Learner_placement_FY_1__c),
            placePctCFY     : this._fmtPct(o?.Projected_Learner_placement_CFY__c),

            costPerPlaceFY3 : c(o?.Avg_Cost_per_Placement_FY_3__c),
            costPerPlaceFY2 : c(o?.Avg_Cost_per_Placement_FY_2__c),
            costPerPlaceFY1 : c(o?.Avg_Cost_per_Placement_FY_1__c),
            costPerPlaceCFY : c(o?.Avg_Cost_per_Placement_CFY__c),

            manualCostPerPlaceFY3: c(o?.Manual_Avg_Cost_per_Placement_FY_3__c || o?.Avg_Cost_per_Placement_FY_3__c),
            manualCostPerPlaceFY2: c(o?.Manual_Avg_Cost_per_Placement_FY_2__c || o?.Avg_Cost_per_Placement_FY_2__c),
            manualCostPerPlaceFY1: c(o?.Manual_Avg_Cost_per_Placement_FY_1__c || o?.Avg_Cost_per_Placement_FY_1__c),
            manualCostPerPlaceCFY: c(o?.Manual_Avg_Cost_per_Placement_CFY__c || o?.Avg_Cost_per_Placement_CFY__c),

            // Track 2: Job Creation
            newBizFY3      : f(o?.Projected_New_Businesses_FY_3__c),
            newBizFY2      : f(o?.Projected_New_Businesses_FY_2__c),
            newBizFY1      : f(o?.Projected_New_Businesses_FY_1__c),
            newBizCFY      : f(o?.Projected_New_Businesses_CFY__c),
            jobsNewBizFY3  : f(o?.Projected_Jobs_from_New_Businesses_FY3__c),
            jobsNewBizFY2  : f(o?.Projected_Jobs_from_New_Businesses_FY2__c),
            jobsNewBizFY1  : f(o?.Projected_Jobs_from_New_Businesses_FY1__c),
            jobsNewBizCFY  : f(o?.Projected_Jobs_from_New_Businesses_CFY__c),
            growBizFY3     : f(o?.Growing_Businesses_Supported_FY_3__c),
            growBizFY2     : f(o?.Growing_Businesses_Supported_FY_2__c),
            growBizFY1     : f(o?.Growing_Businesses_Supported_FY_1__c),
            growBizCFY     : f(o?.Growing_Businesses_Supported_CFY__c),
            jobsGrowBizFY3 : f(o?.Jobs_from_Growing_Businesses_FY_3__c),
            jobsGrowBizFY2 : f(o?.Jobs_from_Growing_Businesses_FY_2__c),
            jobsGrowBizFY1 : f(o?.Jobs_from_Growing_Businesses_FY_1__c),
            jobsGrowBizCFY : f(o?.Jobs_from_Growing_Businesses_CFY__c),

            costPerJobFY3  : c(o?.Avg_Cost_per_Job_FY_3__c),
            costPerJobFY2  : c(o?.Avg_Cost_per_Job_FY_2__c),
            costPerJobFY1  : c(o?.Avg_Cost_per_Job_FY_1__c),
            costPerJobCFY  : c(o?.Avg_Cost_per_Job_CFY__c),

            manualCostPerJobFY3: c(o?.Manual_Avg_Cost_per_Job_FY_3__c || o?.Avg_Cost_per_Job_FY_3__c),
            manualCostPerJobFY2: c(o?.Manual_Avg_Cost_per_Job_FY_2__c || o?.Avg_Cost_per_Job_FY_2__c),
            manualCostPerJobFY1: c(o?.Manual_Avg_Cost_per_Job_FY_1__c || o?.Avg_Cost_per_Job_FY_1__c),
            manualCostPerJobCFY: c(o?.Manual_Avg_Cost_per_Job_CFY__c || o?.Avg_Cost_per_Job_CFY__c),

            // Track 3: Livelihood Upliftment
            livServedFY3       : f(o?.LIV_SERVED_FY3__c),
            livServedFY2       : f(o?.LIV_SERVED_FY2__c),
            livServedFY1       : f(o?.LIV_SERVED_FY1__c),
            livServedProj      : f(o?.LIV_SERVED_PROJ__c),
            livEnrollFY3       : f(o?.LIV_ENROLL_FY3__c),
            livEnrollFY2       : f(o?.LIV_ENROLL_FY2__c),
            livEnrollFY1       : f(o?.LIV_ENROLL_FY1__c),
            livEnrollProj      : f(o?.LIV_ENROLL_PROJ__c),
            livOutcomeFY3      : f(o?.LIV_OUTCOME_FY3__c),
            livOutcomeFY2      : f(o?.LIV_OUTCOME_FY2__c),
            livOutcomeFY1      : f(o?.LIV_OUTCOME_FY1__c),
            livOutcomeProj     : f(o?.LIV_OUTCOME_PROJ__c),
            livCostManualFY3   : c(o?.LIV_COST_FY3__c),
            livCostManualFY2   : c(o?.LIV_COST_FY2__c),
            livCostManualFY1   : c(o?.LIV_COST_FY1__c),
            livCostManualProj  : c(o?.LIV_COST_PROJ__c),
        };
    }

    // ── Section 5: Why Wadhwani Grants & Supporting Docs (Q24 - Q28) ─────────
    get q24Verified() {
        return this._val(
            this._app?.Q24_VERIFIED__c ||
            this._outcome?.Job_Verification_3rd_Party_CFY__c ||
            this._outcome?.X3rd_Party_Placement_Verification_FY_1__c ||
            this._outcome?.Job_Verification_3rd_Party_FY1__c
        );
    }
    get isQ24VerifiedYes() {
        return this.q24Verified === 'Yes';
    }
    get q24BadgeClass() {
        return this.isQ24VerifiedYes ? 'rv-badge rv-badge-green' : 'rv-badge rv-badge-grey';
    }
    get detailsOfEthicalReceived() {
        return this._val(
            this._app?.Details_of_Ethical_Received__c ||
            this._outcome?.X3rd_Party_Verification_Description_FY_1__c ||
            this._outcome?.X3rd_party_verification_details_FY1__c
        );
    }
    get q24Documents() {
        const allAtts = this._attachments || [];
        const q24Files = allAtts.filter(a => a.contentDocumentId && a.questionKey === 'Q24');
        const listToMap = q24Files.length > 0 ? q24Files : allAtts.filter(a => a.contentDocumentId && (a.questionKey === 'Q15' || a.questionKey === 'Q17'));

        return listToMap.map(a => {
            const ext = a.fileExtension ? '.' + a.fileExtension : '';
            let fullName = a.fileName || 'Document';
            if (ext && !fullName.toLowerCase().endsWith(ext.toLowerCase())) {
                fullName += ext;
            }
            return {
                documentId: a.contentDocumentId,
                versionId : a.contentVersionId,
                name      : fullName + (a.fileSizeMB ? ` (${a.fileSizeMB} MB)` : '')
            };
        });
    }
    get hasQ24Documents() {
        return this.q24Documents.length > 0;
    }

    get orgSustainability() {
        return this._val(this._app?.Organizational_Sustainability__c || this._app?.Financial_Sustainability__c);
    }

    get additionalFunding() {
        return this._val(this._app?.Use_of_Additional_Funding__c || this._app?.Use_of_Additional_Funding_JC__c);
    }
    get genieInterestLevel() { return this._val(this._app?.GenieAI_Interest_Level__c); }
    get showSynergies() {
        const l = this._app?.GenieAI_Interest_Level__c;
        return l === 'Yes, interested' || l === 'Maybe, want to learn more' || !!this.synergiesValue;
    }
    get genieInterestBadgeClass() { return (this.showSynergies && this.genieInterestLevel !== '—') ? 'rv-badge rv-badge-green' : 'rv-badge rv-badge-grey'; }
    get synergiesValue() {
        if (!this._app) return '';
        return this._app.Operational_Synergies_with_WOF__c 
            || this._app.GenieAI_Synergies__c 
            || this._app.Operational_Synergies_with_WOF_JC__c 
            || this._app.Operational_Synergies_with_WOF_Both__c
            || '';
    }

    get supportingDocuments() {
        return (this._attachments || [])
            .filter(a => a.contentDocumentId && (a.questionKey === 'Q28' || a.questionKey === 'SUPPORTING' || a.questionKey === 'OTHER'))
            .map(a => {
                const ext = a.fileExtension ? '.' + a.fileExtension : '';
                let fullName = a.fileName || 'Document';
                if (ext && !fullName.toLowerCase().endsWith(ext.toLowerCase())) {
                    fullName += ext;
                }
                return {
                    documentId: a.contentDocumentId,
                    versionId : a.contentVersionId,
                    name      : fullName + (a.fileSizeMB ? ` (${a.fileSizeMB} MB)` : '')
                };
            });
    }
    get hasSupportingDocuments() {
        return this.supportingDocuments.length > 0;
    }

    // ── Attestation ──────────────────────────────────────────────────────────
    get attestingName()  {
        return this._val(this._app?.Attesting_User_Name__c || this._app?.Submitter_Name__c || this._app?.CreatedBy?.Name);
    }
    get attestingTitle() {
        return this._val(this._app?.Attesting_User_Title__c || this._app?.Job_Title__c || this._app?.CreatedBy?.Title);
    }
    get attestingDate()  {
        return this._fmtDateTime(this._app?.Attestation_Date__c || this._app?.Initial_Submission_Date__c || this._app?.LastModifiedDate || this._app?.CreatedDate);
    }

    // ── Preview & Document Download Handling ─────────────────────────────────
    async handlePreview(event) {
        const docId = event.currentTarget.dataset.docid;
        const versionId = event.currentTarget.dataset.versionid;
        if (!docId && !versionId) return;
        const att = (this._attachments || []).find(a => a.contentDocumentId === docId || a.contentVersionId === versionId);
        const targetVersionId = versionId || att?.contentVersionId || docId;

        await this._openOrDownloadFile(att, docId, targetVersionId);
    }

    async handleOpenAdditionalInfoFile(event) {
        const versionId = event.currentTarget.dataset.versionid;
        const docId = event.currentTarget.dataset.docid;
        if (!docId && !versionId) return;
        const att = (this.additionalInfoFiles || []).find(a => a.documentId === docId || a.versionId === versionId);
        const targetVersionId = versionId || att?.versionId || docId;

        await this._openOrDownloadFile(att, docId, targetVersionId);
    }

    async _openOrDownloadFile(att, docId, targetVersionId) {
        const fileIdToQuery = targetVersionId || docId || att?.contentVersionId || att?.contentDocumentId || att?.versionId || att?.documentId;
        if (fileIdToQuery) {
            try {
                this.isLoading = true;
                const fileData = await getFileBase64({ contentVersionId: fileIdToQuery });
                if (fileData && fileData.base64) {
                    const ext = (fileData.fileType || att?.fileExtension || 'pdf').toLowerCase().replace(/^\./, '');
                    let fileName = fileData.title || att?.fileName || att?.name || 'document';
                    if (!fileName.toLowerCase().endsWith('.' + ext)) {
                        fileName += '.' + ext;
                    }

                    const currentVerId = fileData.versionId || targetVersionId;
                    const currentDocId = fileData.documentId || docId;

                    if (ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif') {
                        try {
                            const mimeTypes = {
                                pdf: 'application/pdf',
                                png: 'image/png',
                                jpg: 'image/jpeg',
                                jpeg: 'image/jpeg',
                                gif: 'image/gif'
                            };
                            const mimeType = mimeTypes[ext] || 'application/pdf';
                            const byteCharacters = atob(fileData.base64);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: mimeType });
                            const blobUrl = URL.createObjectURL(blob);
                            const opened = window.open(blobUrl, '_blank');
                            if (!opened) {
                                const a = document.createElement('a');
                                a.href = blobUrl;
                                a.download = fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            }
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
                        } catch (blobErr) {
                            console.warn('Direct blob open failed, falling back to download url:', blobErr);
                            if (currentVerId) {
                                window.open('/sfc/servlet.shepherd/version/download/' + currentVerId, '_blank');
                            }
                        }
                        return;
                    } else {
                        // For Office Documents & Spreadsheets, open the in-app preview modal directly.
                        // We do NOT create a Blob here, which avoids LWS "Unsupported MIME type" errors.
                        this.officePreviewTitle = fileName;
                        this.isOfficePreviewOpen = true;
                        this._currentOfficeFile = { 
                            fileName, 
                            ext, 
                            base64: fileData.base64,
                            versionId: currentVerId,
                            documentId: currentDocId
                        };
                        this._pendingOfficeRender = { 
                            extension: ext, 
                            base64Data: fileData.base64, 
                            title: fileName 
                        };

                        // If container is already in DOM, render immediately
                        setTimeout(() => {
                            const container = this.template.querySelector('[data-id="office-preview-body"]');
                            if (container) {
                                this._pendingOfficeRender = null;
                                this._paintOfficePreview(container, ext, fileData.base64, fileName);
                            }
                        }, 100);
                        return;
                    }
                }
            } catch (err) {
                console.error('Error opening file base64:', err);
            } finally {
                this.isLoading = false;
            }
        }
    }

    handleDownloadCurrentOfficeDoc() {
        if (!this._currentOfficeFile) return;
        const { versionId, documentId, fileName, base64 } = this._currentOfficeFile;
        if (versionId) {
            const url = `/sfc/servlet.shepherd/version/download/${versionId}`;
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        } else if (documentId) {
            const url = `/sfc/servlet.shepherd/document/download/${documentId}`;
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }
        
        if (base64) {
            const a = document.createElement('a');
            a.href = 'data:application/octet-stream;base64,' + base64;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    closeOfficePreview() {
        this.isOfficePreviewOpen = false;
        this._pendingOfficeRender = null;
    }

    async _paintOfficePreview(container, extension, base64Data, title) {
        if (!container) return;
        container.innerHTML = '<div style="text-align: center; padding: 40px;"><p style="color: var(--wg-text-muted); font-size: var(--wg-font-size-body);">Loading document preview...</p></div>';

        const ext = (extension || '').toLowerCase().replace(/^\./, '');

        try {
            if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'xlsm' || ext === 'xlsb') {
                if (!window.XLSX && !window.xlsx) {
                    try {
                        await loadScript(this, XLSX_LIB);
                    } catch (loadErr) {
                        console.error('Failed to load XLSX static resource:', loadErr);
                    }
                }
                const xlsxLib = window.XLSX || window.xlsx || (typeof XLSX !== 'undefined' ? XLSX : null);
                if (xlsxLib) {
                    let cleanBase64 = base64Data || '';
                    if (cleanBase64.indexOf(',') !== -1) {
                        cleanBase64 = cleanBase64.split(',')[1];
                    }
                    cleanBase64 = cleanBase64.replace(/\s/g, '');
                    let workbook;
                    try {
                        workbook = xlsxLib.read(cleanBase64, { type: 'base64' });
                    } catch (readErr) {
                        console.warn('XLSX base64 read failed, trying Uint8Array buffer:', readErr);
                        try {
                            const binaryStr = atob(cleanBase64);
                            const len = binaryStr.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryStr.charCodeAt(i);
                            }
                            workbook = xlsxLib.read(bytes, { type: 'array' });
                        } catch (arrErr) {
                            console.error('XLSX Uint8Array read also failed:', arrErr);
                            throw arrErr;
                        }
                    }

                    let html = '';
                    if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
                        workbook.SheetNames.forEach((sheetName, idx) => {
                            const worksheet = workbook.Sheets[sheetName];
                            if (worksheet) {
                                if (workbook.SheetNames.length > 1) {
                                    html += `<div style="font-weight: var(--wg-weight-bold); font-size: var(--wg-font-size-sub-heading); color: var(--wg-orange); margin: 16px 0 8px; border-bottom: 2px solid var(--wg-orange); padding-bottom: 4px;">📊 Sheet: ${this._escapeHtml(sheetName)}</div>`;
                                }
                                const tableHtml = xlsxLib.utils.sheet_to_html(worksheet, { id: `preview-table-${idx}`, editable: false });
                                html += `<div style="overflow-x: auto; margin-bottom: 20px; border: 1px solid var(--wg-border); border-radius: 6px;">${tableHtml}</div>`;
                            }
                        });
                        container.innerHTML = html || '<p style="padding: 20px; color: var(--wg-text-muted);">No data found in spreadsheet.</p>';
                        return;
                    }
                }
            } else if (ext === 'docx') {
                try {
                    if (!window.mammoth) {
                        await loadScript(this, MAMMOTH_LIB);
                    }
                    if (window.mammoth) {
                        const binaryString = atob(base64Data);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        const result = await window.mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
                        container.innerHTML = `<div style="line-height: 1.6; color: var(--wg-gray); padding: 12px; font-size: var(--wg-font-size-body);">${result.value || '<p>Empty document.</p>'}</div>`;
                        return;
                    }
                } catch (mammothErr) {
                    console.warn('Mammoth preview warning:', mammothErr);
                }
            } else if (ext === 'txt') {
                const text = atob(base64Data);
                container.innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace; font-size: var(--wg-font-size-label); line-height: 1.5; padding: 16px; background: #f8f9fa; border: 1px solid var(--wg-border); border-radius: 6px;">${this._escapeHtml(text)}</pre>`;
                return;
            }

            // Fallback for formats that cannot be rendered inline (ppt, pptx, binary doc)
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 12px;">📁</div>
                    <h3 style="font-size: 18px; font-weight: var(--wg-weight-bold); color: var(--wg-gray); margin-bottom: 6px;">${title}</h3>
                    <p style="color: var(--wg-text-muted); margin-bottom: 20px; font-size: var(--wg-font-size-body);">This file type (${ext.toUpperCase()}) is not supported for inline browser rendering.</p>
                    <p style="color: var(--wg-text-muted); font-size: var(--wg-font-size-label);">Please click <strong>Download File</strong> above to open it on your device.</p>
                </div>
            `;
        } catch (err) {
            console.error('Error rendering office preview:', err);
            container.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <p style="color: var(--wg-error); font-weight: var(--wg-weight-semibold); margin-bottom: 12px;">Could not render preview for ${title}.</p>
                    <p style="color: var(--wg-text-muted); font-size: var(--wg-font-size-label);">Please click <strong>Download File</strong> in the header to view this document.</p>
                </div>
            `;
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ── PDF Generation & Scripts ─────────────────────────────────────────────
    _loadPdfLibraries() {
        if (this._scriptsInitiated) return;
        this._scriptsInitiated = true;

        Promise.all([
            loadScript(this, JSPDF),
            loadScript(this, AUTO_TABLE),
            loadScript(this, JSZIP)
        ]).then(() => {
            this.isJsLoaded = true;
            this._loadLogo();
        }).catch(err => {
            console.error('Error loading PDF / ZIP libraries', err);
        });
    }

    async _waitForPdfLibrary(timeoutMs = 8000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (this.isJsLoaded && window.jspdf?.jsPDF) return true;
            await new Promise(r => setTimeout(r, 200));
        }
        return false;
    }

    _loadLogo() {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = this.WCF_Logo;
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                this.logoBase64 = canvas.toDataURL('image/png');
            } catch (e) {
                console.warn('Could not cache logo base64:', e);
            }
        };
    }

    async _buildCombinedZip(pdfBlob, fileName) {
        const zip = new window.JSZip();
        zip.file(fileName, pdfBlob);

        // Fetch all attachments linked to the application (Q24, Q28, Addendum, etc.)
        const allAtts = (this._attachments || []).filter(a => a && a.contentVersionId);

        const usedNames = new Set();
        usedNames.add(fileName);

        const fetchPromises = allAtts.map(async (att) => {
            try {
                const res = await getFileBase64({ contentVersionId: att.contentVersionId });
                if (res && res.base64) {
                    let baseName = att.fileName || res.title || 'Document';
                    const ext = (att.fileExtension || res.fileType || '').replace(/^\./, '');
                    if (ext && !baseName.toLowerCase().endsWith('.' + ext.toLowerCase())) {
                        baseName += '.' + ext;
                    }
                    baseName = baseName.replace(/[/\\?%*:|"<>]/g, '_');

                    let uniqueName = baseName;
                    let counter = 1;
                    while (usedNames.has(uniqueName)) {
                        const dotIdx = baseName.lastIndexOf('.');
                        if (dotIdx !== -1) {
                            uniqueName = `${baseName.substring(0, dotIdx)}_${counter}${baseName.substring(dotIdx)}`;
                        } else {
                            uniqueName = `${baseName}_${counter}`;
                        }
                        counter++;
                    }
                    usedNames.add(uniqueName);

                    zip.file(uniqueName, res.base64, { base64: true });
                }
            } catch (err) {
                console.warn(`Could not bundle attachment in zip: ${att.fileName}`, err);
            }
        });

        await Promise.all(fetchPromises);

        const content = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = fileName.replace(/\.pdf$/i, '.zip');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);
    }

    async handleDownloadPDF() {
        if (!this.hasRecord) return;

        if (!this.isJsLoaded || !window.jspdf?.jsPDF) {
            this._scriptsInitiated = false;
            this._loadPdfLibraries();
            const ready = await this._waitForPdfLibrary(8000);
            if (!ready) {
                console.error('PDF library failed to load.');
                return;
            }
        }

        this.isPdfGenerating = true;

        try {
            const jsPDFLib = window.jspdf?.jsPDF;
            if (!jsPDFLib) return;

            const RED    = [191, 32, 38];     // corrected to var(--wg-red)'s actual rgb (was stale pre-rebrand #990000; audit sweep fix)
            const NAVY   = [27, 42, 74];      // #1B2A4A
            const LIGHT  = [253, 246, 244];  // soft tint
            const GREY   = [112, 110, 107];
            const BORDER = [240, 232, 230];

            const parseHtml = (html) => {
                if (!html) return '';
                const el = new DOMParser().parseFromString(html, 'text/html').body;
                let result = '';
                const process = (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        result += node.nodeValue;
                    } else if (node.nodeName === 'BR') {
                        result += '\n';
                    } else if (node.nodeName === 'LI') {
                        result += `• ${node.textContent.trim()}\n`;
                    } else {
                        node.childNodes.forEach(process);
                        if (['DIV', 'P'].includes(node.nodeName)) result += '\n';
                    }
                };
                el.childNodes.forEach(process);
                return result.trim();
            };

            const doc = new jsPDFLib();
            const pageWidth  = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const marginX    = 15;
            const contentW   = pageWidth - marginX * 2;
            const labelW     = 50;
            const valueX     = marginX + labelW + 4;
            const valueW     = contentW - labelW - 4;
            let y = 20;
            let pageCount = 1;

            const addHeader = () => {
                doc.setFillColor(...NAVY);
                doc.rect(0, 0, pageWidth, 4, 'F');
                if (pageCount === 1) {
                    if (this.logoBase64) {
                        doc.addImage(this.logoBase64, 'PNG', (pageWidth - 46) / 2, 10, 46, 18);
                        y = 34;
                    } else {
                        y = 16;
                    }
                    doc.setFontSize(15);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(...NAVY);
                    doc.text('Wadhwani Grants Application', pageWidth / 2, y, { align: 'center' });
                    y += 10;
                } else {
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(...RED);
                    doc.text('WADHWANI GRANTS APPLICATION', marginX, 12);
                    doc.setDrawColor(...RED);
                    doc.setLineWidth(0.3);
                    doc.line(marginX, 15, pageWidth - marginX, 15);
                    y = 22;
                }
                doc.setTextColor(0, 0, 0);
            };

            const checkPage = (needed = 15) => {
                if (y + needed >= pageHeight - 18) {
                    doc.addPage();
                    pageCount++;
                    addHeader();
                }
            };

            const sectionHeader = (title, stepLabel) => {
                checkPage(22);
                y += 3;
                doc.setFillColor(...NAVY);
                doc.rect(marginX, y - 6, contentW, 10, 'F');
                doc.setFillColor(...RED);
                doc.rect(marginX, y + 3.2, contentW, 0.8, 'F');
                if (stepLabel) {
                    doc.setFontSize(7.5);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(255, 150, 130);
                    doc.text(stepLabel.toUpperCase(), marginX + 6, y - 1.3);
                }
                doc.setFontSize(11.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(title, marginX + (stepLabel ? doc.getTextWidth(stepLabel.toUpperCase()) + 12 : 6), y);
                y += 10;
                doc.setFontSize(9.5);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);
            };

            const drawQLabel = (num, label, top) => {
                doc.setFillColor(...RED);
                doc.circle(marginX + 4, top + 1, 3.1, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.text(String(num), marginX + 4, top + 2.1, { align: 'center' });
                doc.setTextColor(...NAVY);
                doc.setFontSize(9.3);
                doc.setFont(undefined, 'bold');
                const labelLines = doc.splitTextToSize(label, labelW - 10);
                labelLines.forEach((l, i) => doc.text(l, marginX + 10, top + 2 + i * 4.2));
                return labelLines.length * 4.2 + 4;
            };

            const rowDivider = () => {
                doc.setDrawColor(...BORDER);
                doc.setLineWidth(0.2);
                doc.line(marginX, y, pageWidth - marginX, y);
                y += 3;
            };

            const simpleQRow = (num, label, value, bold = false) => {
                if (value === null || value === undefined || value === '' || value === '—') return;
                doc.setFontSize(9.5);
                doc.setFont(undefined, bold ? 'bold' : 'normal');
                const lines = doc.splitTextToSize(String(value), valueW);
                const labelLines = doc.splitTextToSize(label, labelW - 10);
                const rowH = Math.max(lines.length * 4.6, labelLines.length * 4.2) + 8;
                checkPage(rowH + 4);
                const top = y;
                drawQLabel(num, label, top);
                doc.setTextColor(...(bold ? NAVY : [0, 0, 0]));
                doc.setFontSize(9.5);
                doc.setFont(undefined, bold ? 'bold' : 'normal');
                lines.forEach((l, i) => doc.text(l, valueX, top + 2 + i * 4.6));
                y = top + rowH;
                rowDivider();
            };

            const gridQRow = (num, label, fields, cols = 2) => {
                const items = fields.filter(f => f.value && f.value !== '—');
                if (items.length === 0) return;

                const cellW = (valueW - (cols - 1) * 8) / cols;
                doc.setFontSize(9.3);
                doc.setFont(undefined, 'normal');
                const cellLines = items.map(f => doc.splitTextToSize(String(f.value), cellW));

                const gridRows = [];
                for (let i = 0; i < cellLines.length; i += cols) gridRows.push(cellLines.slice(i, i + cols));
                let gridHeight = 0;
                gridRows.forEach(gr => {
                    const maxLines = Math.max(...gr.map(l => l.length));
                    gridHeight += 4.3 + maxLines * 4.3 + 4;
                });

                const labelLines = doc.splitTextToSize(label, labelW - 10);
                const labelHeight = labelLines.length * 4.2 + 4;
                const rowHeight = Math.max(gridHeight, labelHeight, 14) + 4;

                checkPage(rowHeight + 4);
                const top = y;
                drawQLabel(num, label, top);

                let gy = top;
                let idx = 0;
                gridRows.forEach(gr => {
                    const maxLines = Math.max(...gr.map(l => l.length));
                    gr.forEach((lines, ci) => {
                        const f = items[idx];
                        const cx = valueX + ci * (cellW + 8);
                        doc.setFontSize(7.8);
                        doc.setFont(undefined, 'bold');
                        doc.setTextColor(...RED);
                        doc.text(f.label.toUpperCase(), cx, gy + 2);
                        doc.setFontSize(9.3);
                        doc.setFont(undefined, 'normal');
                        doc.setTextColor(...NAVY);
                        lines.forEach((l, li) => doc.text(l, cx, gy + 6.3 + li * 4.3));
                        idx++;
                    });
                    gy += 4.3 + maxLines * 4.3 + 4;
                });

                y = top + rowHeight;
                rowDivider();
            };

            const richBoxUnder = (label, value) => {
                if (value === null || value === undefined || value === '' || value === '—') return;
                const text = parseHtml(String(value));
                doc.setFontSize(9.3);
                const lines = doc.splitTextToSize(text, valueW - 8);
                const boxH = lines.length * 4.4 + 10;
                checkPage(boxH + 4);
                doc.setFillColor(...LIGHT);
                doc.rect(valueX, y, valueW, boxH, 'F');
                doc.setFillColor(...RED);
                doc.rect(valueX, y, 1, boxH, 'F');
                doc.setFontSize(7.8);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...RED);
                doc.text(label.toUpperCase(), valueX + 5, y + 5.5);
                doc.setFontSize(9.3);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(...NAVY);
                lines.forEach((l, i) => doc.text(l, valueX + 5, y + 10.5 + i * 4.4));
                y += boxH + 4;
                rowDivider();
            };

            const table = (head, body) => {
                checkPage(40);
                doc.autoTable({
                    startY: y,
                    margin: { left: marginX, right: marginX },
                    head: [head],
                    body,
                    theme: 'striped',
                    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 30, 30] },
                    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: LIGHT },
                    columnStyles: { 0: { fontStyle: 'bold', textColor: NAVY } }
                });
                y = doc.lastAutoTable.finalY + 8;
            };

            addHeader();
            const q = this.qNum;

            // ══ SECTION 1 — About Your Organisation ══
            sectionHeader('About Your Organisation', this.section1StepLabel);

            // Q1: Selected Track
            const trackNames = this.selectedTrackBadges.map(b => b.label).join(', ');
            simpleQRow(q.Q1, 'Organizational Area(s) for Funding/Investment', trackNames || this.orgArea);

            // Q2: Organizational Identifying Info
            gridQRow(q.Q2, 'Organizational Identifying Information', [
                { label: 'Organizational Name', value: this.orgName },
                { label: 'Headquarters City and Country', value: this.hqCity },
                { label: 'Primary Service Regions', value: this.primaryServiceRegions },
                { label: 'Leader Name', value: this.leaderName },
                { label: 'Leader Title', value: this.leaderTitle },
                { label: 'Leader Tenure', value: this.leaderTenure },
                ...(this.customQuestionsQ2 || []).map(cq => ({ label: cq.label, value: cq.displayValue }))
            ], 2);

            // Q3: Submitter Contact Information
            gridQRow(q.Q3, 'Submitter Contact Information', [
                { label: 'Name', value: this.piName },
                { label: 'Title', value: this.piDesignation },
                { label: 'Email Address', value: this.piEmail },
                { label: 'Phone Number', value: this.phoneDisplay },
                ...(this.customQuestionsQ3 || []).map(cq => ({ label: cq.label, value: cq.displayValue }))
            ], 2);

            // Q4: Legal Structure
            gridQRow(q.Q4, 'Legal Structure', [
                { label: 'Type', value: this.legalType },
                ...(this.showLegalTypeOther ? [{ label: 'Legal Type — Specified', value: this.legalTypeOtherSpecified }] : []),
                { label: 'Registration Jurisdiction', value: this.registrationJurisdiction },
                ...(this.showRegistrationJurisdictionOther ? [{ label: 'Registration Jurisdiction — Specified', value: this.registrationJurisdictionOtherSpecified }] : []),
                { label: 'Incorporation Date', value: this.incorporationDate },
                ...(this.customQuestionsQ4 || []).map(cq => ({ label: cq.label, value: cq.displayValue }))
            ], 3);
            if (this.legalDescription) richBoxUnder('Brief Description of Legal Structure', this.legalDescription);

            // Q5: Legal and Tax Compliance
            gridQRow(q.Q5, 'Legal and Tax Compliance', [
                { label: '501(c)(3) Status in US', value: this.has501c3 },
                { label: 'Equivalency Determination (ED)', value: this.hasEquivalencyDetermination },
                { label: 'FCRA Registered (India)', value: this.isFcraRegistered },
                { label: 'Willing to Pursue ED', value: this.openToEquivalencyDetermination },
                ...(this.customQuestionsQ5 || []).map(cq => ({ label: cq.label, value: cq.displayValue }))
            ], 2);

            // Q6: Fiscal Year End Date
            simpleQRow(q.Q6, 'Fiscal Year End Date', this.fiscalYearEnd, true);
            if (this.hasCustomQuestionsQ6) {
                this.customQuestionsQ6.forEach(cq => {
                    simpleQRow(cq.displayNumber, cq.label, cq.displayValue);
                });
            }

            // Q7: Top 3 Most Prominent Funders
            if (this.hasFunders) {
                checkPage(10);
                const topFundersTop = y;
                drawQLabel(q.Q7, 'Top 3 Most Prominent Funders', topFundersTop);
                y = topFundersTop + 10;
                table(['Funder', 'Amount (USD)', 'Period', 'Type'],
                    this.funders.map(f => [f.name, f.amount, f.period, f.type]));
            }

            // Q8: References for Outreach
            if (this.hasReferences) {
                checkPage(10);
                const refTop = y;
                drawQLabel(q.Q8, 'References for Outreach', refTop);
                y = refTop + 10;
                table(['Name', 'Organisation / Role', 'Email'],
                    this.references.map(r => [r.name, r.organisation, r.email]));
            }

            // Q9: Historical Financial Data
            checkPage(10);
            const finTrackTop = y;
            drawQLabel(q.Q9, 'Historical Financial Data', finTrackTop);
            y = finTrackTop + 10;

            const h = this.historicalData;
            doc.setFontSize(8.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...NAVY);
            doc.text('Historical Financial Data (Three Prior Fiscal Years)', marginX, y);
            y += 4;
            table(['Item', this.fyLabel3, this.fyLabel2, this.fyLabel1], [
                ['Balance at Start of Year', h.balanceStartFY3, h.balanceStartFY2, h.balanceStartFY1],
                ['Revenue', h.revenueFY3, h.revenueFY2, h.revenueFY1],
                ['Capital Expenditure', h.capitalExpFY3, h.capitalExpFY2, h.capitalExpFY1],
                ['Operating Expenditure', h.operatingExpFY3, h.operatingExpFY2, h.operatingExpFY1],
                ['Balance at End of Year', h.balanceEndFY3, h.balanceEndFY2, h.balanceEndFY1]
            ]);

            // Q10: Current Fiscal Year Data
            checkPage(10);
            const cfyTop = y;
            drawQLabel(q.Q10, 'Current Fiscal Year Data', cfyTop);
            y = cfyTop + 10;

            const fc = this.fiscalData;
            doc.setFontSize(8.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...NAVY);
            doc.text('Current Fiscal Year (CFY)', marginX, y);
            y += 4;
            table(['Item', 'Budget', 'Projection', 'Deviation'], [
                ['Revenue', fc.revenueBudget, fc.revenueProjection, fc.revenueVariance],
                ['Capital Expenditure', fc.capitalExpBudget, fc.capitalExpProjection, fc.capitalExpVariance],
                ['Operating Expenditure', fc.operatingExpBudget, fc.operatingExpProjection, fc.operatingExpVariance],
                ['Revenue - Expense Net', fc.netBudget, fc.netProjection, fc.netVariance]
            ]);
            if (this.showCFYExplanation) richBoxUnder('Explanation of Deviation', this.cfyVarianceExplanation);

            if (this.hasCustomQuestionsAboutOrg) {
                this.customQuestionsAboutOrg.forEach(cq => {
                    simpleQRow(cq.displayNumber, cq.label, cq.displayValue);
                });
            }

            // ══ SECTION 2 — Track 1: Job Fulfillment (Q11 - Q14) ══
            if (this.isJobFulfillment) {
                sectionHeader('Track 1: Job Fulfillment', this.sectionJfStepLabel);

                simpleQRow(q.Q11, 'Your Skilling Approach', parseHtml(this.skillingApproach));

                if (this.hasSkillingDomains) {
                    checkPage(10);
                    const t = y;
                    drawQLabel(q.Q12, 'Skilling Domains Offered', t);
                    y = t + 10;
                    table(['Domain / Program Name', 'Hours of Training', 'Duration (Months)', 'When Started', 'Annual Enrollment'],
                        this.skillingDomains.map(r => [r.domain, r.hours, r.duration, r.startDate, r.yearlyEnrolment]));
                }

                const o = this.outcomeData;
                checkPage(10);
                const t13 = y;
                drawQLabel(q.Q13, 'Job Fulfillment Outcomes (Actuals)', t13);
                y = t13 + 10;

                doc.setFontSize(8.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...NAVY);
                doc.text('Job Fulfillment Outcomes — Last 3 Fiscal Years (Actuals)', marginX, y);
                y += 4;

                const jfRows = [
                    ['# Learner Enrolments', o.learnerEnrolFY3, o.learnerEnrolFY2, o.learnerEnrolFY1],
                    ['# of learner placements', o.learnerPlaceFY3, o.learnerPlaceFY2, o.learnerPlaceFY1],
                    ['Placement %', o.placePctFY3, o.placePctFY2, o.placePctFY1],
                    ['Avg Cost per Placement', o.manualCostPerPlaceFY3, o.manualCostPerPlaceFY2, o.manualCostPerPlaceFY1]
                ];
                table(['Item', this.fyLabel3, this.fyLabel2, this.fyLabel1], jfRows);

                checkPage(10);
                const t14 = y;
                drawQLabel(q.Q14, 'Job Fulfillment Outcomes (Projections)', t14);
                y = t14 + 10;

                doc.setFontSize(8.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...NAVY);
                doc.text('Job Fulfillment Outcomes — Current FY Projections', marginX, y);
                y += 4;

                const jfProjRows = [
                    ['# Learner Enrolments', o.learnerEnrolCFY],
                    ['# of learner placements', o.learnerPlaceCFY],
                    ['Placement %', o.placePctCFY],
                    ['Avg Cost per Placement', o.manualCostPerPlaceCFY]
                ];
                table(['Item', 'FY-2026 (CFY) — Projection'], jfProjRows);

                if (this.hasCustomQuestionsJobFulfillment) {
                    this.customQuestionsJobFulfillment.forEach(cq => {
                        simpleQRow(cq.displayNumber, cq.label, cq.displayValue);
                    });
                }
            }

            // ══ SECTION 3 — Track 2: Job Creation (Q15 - Q18) ══
            if (this.isJobCreation) {
                sectionHeader('Track 2: Job Creation / Entrepreneurship', this.sectionJcStepLabel);

                simpleQRow(q.Q15, 'Your Job Creation Approach', parseHtml(this.jobCreationApproach));

                if (this.hasBusinessSectors) {
                    checkPage(10);
                    const t = y;
                    drawQLabel(q.Q16, 'Business Sectors Served', t);
                    y = t + 10;
                    table(['Business Sector', 'When Support Began', 'Type of Support Provided', 'Yearly Enrolment'],
                        this.businessSectors.map(s => [s.sector, s.supportBegin, s.supportTypesLabel, s.yearlyEnrolment]));
                }

                const o = this.outcomeData;
                checkPage(10);
                const t17 = y;
                drawQLabel(q.Q17, 'Job Creation Outcomes (Actuals)', t17);
                y = t17 + 10;

                doc.setFontSize(8.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...NAVY);
                doc.text('Job Creation Outcomes — Last 3 Fiscal Years (Actuals)', marginX, y);
                y += 4;

                const jcRows = [
                    ['# New Businesses Started', o.newBizFY3, o.newBizFY2, o.newBizFY1],
                    ['# jobs created by new businesses', o.jobsNewBizFY3, o.jobsNewBizFY2, o.jobsNewBizFY1],
                    ['Existing Businesses Supported', o.growBizFY3, o.growBizFY2, o.growBizFY1],
                    ['# jobs created by existing businesses', o.jobsGrowBizFY3, o.jobsGrowBizFY2, o.jobsGrowBizFY1],
                    ['Total Avg Cost per Job Created', o.manualCostPerJobFY3, o.manualCostPerJobFY2, o.manualCostPerJobFY1]
                ];
                table(['Item', this.fyLabel3, this.fyLabel2, this.fyLabel1], jcRows);

                checkPage(10);
                const t18 = y;
                drawQLabel(q.Q18, 'Job Creation Outcomes (Projections)', t18);
                y = t18 + 10;

                doc.setFontSize(8.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...NAVY);
                doc.text('Job Creation Outcomes — Current FY Projections', marginX, y);
                y += 4;

                const jcProjRows = [
                    ['# New Businesses Started', o.newBizCFY],
                    ['# jobs created by new businesses', o.jobsNewBizCFY],
                    ['Existing Businesses Supported', o.growBizCFY],
                    ['# jobs created by existing businesses', o.jobsGrowBizCFY],
                    ['Total Avg Cost per Job Created', o.manualCostPerJobCFY]
                ];
                table(['Item', 'CFY (projected)'], jcProjRows);

                if (this.hasCustomQuestionsJobCreation) {
                    this.customQuestionsJobCreation.forEach(cq => {
                        simpleQRow(cq.displayNumber, cq.label, cq.displayValue);
                    });
                }
            }

            // ══ SECTION 4 — Track 3: Livelihood Upliftment (Q19 - Q23) ══
            if (this.isLivelihood) {
                sectionHeader('Track 3: Livelihood Upliftment', this.sectionLivStepLabel);

                simpleQRow(q.Q19, 'Your Livelihood Upliftment Approach', parseHtml(this.livelihoodApproach));

                const o = this.outcomeData;
                checkPage(10);
                const t22 = y;
                drawQLabel(q.Q22, 'Livelihood Outcomes (Actuals)', t22);
                y = t22 + 10;

                doc.setFontSize(8.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...NAVY);
                doc.text('Livelihood Outcomes (Actuals)', marginX, y);
                y += 4;

                const livRows = [
                    ['Households served during the year', o.livServedFY3, o.livServedFY2, o.livServedFY1],
                    ['Households newly enrolled during the year', o.livEnrollFY3, o.livEnrollFY2, o.livEnrollFY1],
                    ['Households meeting outcome criteria', o.livOutcomeFY3, o.livOutcomeFY2, o.livOutcomeFY1],
                    ['Avg. cost per outcome (USD)', o.livCostManualFY3, o.livCostManualFY2, o.livCostManualFY1]
                ];
                table(['Item', this.fyLabel3, this.fyLabel2, this.fyLabel1], livRows);

                checkPage(10);
                const t23 = y;
                drawQLabel(q.Q23, 'Livelihood Outcomes (Projections)', t23);
                y = t23 + 10;

                doc.setFontSize(8.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...NAVY);
                doc.text('Livelihood Outcomes, Current FY Projections', marginX, y);
                y += 4;

                const livProjRows = [
                    ['Households served during the year (projected)', o.livServedProj],
                    ['Households newly enrolled during the year (projected)', o.livEnrollProj],
                    ['Households expected to meet outcome criteria (projected)', o.livOutcomeProj],
                    ['Avg. cost per outcome (USD) - projected', o.livCostManualProj]
                ];
                table(['Item', 'CFY (projected)'], livProjRows);

                if (this.hasCustomQuestionsLivelihood) {
                    this.customQuestionsLivelihood.forEach(cq => {
                        simpleQRow(cq.displayNumber, cq.label, cq.displayValue);
                    });
                }
            }

            // ══ SECTION 5 — Why Wadhwani Grants & Organizational Sustainability (Q24 - Q28) ══
            sectionHeader('Why Wadhwani Grants & Organizational Sustainability', this.sectionWhyStepLabel);

            // Q24: Independent Verification
            gridQRow(q.Q24, 'Independent Verification of Your Outcomes', [
                { label: 'Outcomes Verified by a Third Party?', value: this.q24Verified },
                ...(this.isQ24VerifiedYes ? [{ label: 'Verification Details', value: this.detailsOfEthicalReceived }] : []),
                ...(this.hasQ24Documents ? [{ label: 'Verification Reports', value: this.q24Documents.map(f => f.name).join(', ') }] : [])
            ], 1);

            // Q25: Sustainability Plan
            simpleQRow(q.Q25, 'Sustainability Plan', parseHtml(this.orgSustainability));

            // Q26: Direction for Additional Funding
            simpleQRow(q.Q26, 'Direction for Additional Funding', parseHtml(this.additionalFunding));

            // Q27: Operational Synergies — GenieAI
            simpleQRow(q.Q27, 'Operational Synergies — GenieAI', this.genieInterestLevel, true);
            if (this.showSynergies && this.synergiesValue) richBoxUnder('How GenieAI could contribute', this.synergiesValue);

            // Q28: Supporting Documents
            if (this.hasSupportingDocuments) {
                checkPage(10);
                const docTop = y;
                drawQLabel(q.Q28, 'Supporting Documents', docTop);
                y = docTop + 10;
                table(['File Name'], this.supportingDocuments.map(f => [f.name]));
            }

            if (this.hasCustomQuestionsWhyWadhwani) {
                this.customQuestionsWhyWadhwani.forEach(cq => {
                    simpleQRow(cq.displayNumber, cq.label, cq.displayValue);
                });
            }

            // ══ Addendum — Reviewer Additional Info ══
            if (this.hasAdditionalInfoFiles) {
                sectionHeader('Additional Information Requested by Reviewer', 'Addendum');
                checkPage(14);
                const tA1 = y;
                drawQLabel('A1', 'Additional Documentation Provided', tA1);
                y = tA1 + 10;

                doc.setFontSize(8.5);
                doc.setFont(undefined, 'italic');
                doc.setTextColor(...GREY);
                const noteLines = doc.splitTextToSize(
                    "The applicant uploaded the following document(s) in response to the Reviewer's request.",
                    valueW
                );
                noteLines.forEach((l, i) => doc.text(l, valueX, y + i * 4));
                y += noteLines.length * 4 + 6;
                doc.setTextColor(0, 0, 0);

                table(['File Name'], this.additionalInfoFiles.map(f => [f.name]));
            }

            // ══ Attestation ══
            checkPage(20);
            doc.setFillColor(...NAVY);
            doc.rect(marginX, y, contentW, 22, 'F');
            doc.setFillColor(...RED);
            doc.rect(marginX, y, 3, 22, 'F');
            doc.setFontSize(10.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('Attestation — Confirmation of Accuracy', marginX + 8, y + 7);
            doc.setFontSize(8.5);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(230, 230, 230);
            doc.text(`Attesting User: ${this.attestingName}`, marginX + 8, y + 13);
            doc.text(`Title: ${this.attestingTitle}`, marginX + 8, y + 18);
            doc.text(`Date: ${this.attestingDate}`, marginX + contentW / 2 + 10, y + 18);
            y += 28;

            // ── Page numbering on every page ──
            const totalPages = doc.internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setDrawColor(...RED);
                doc.setLineWidth(0.3);
                doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(...GREY);
                doc.text(`${this._app?.Name || ''} · Generated ${new Date().toLocaleDateString()}`, marginX, pageHeight - 9);
                doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 9, { align: 'right' });
            }

            const fileName = `Wadhwani_Grants_Application_${this.orgName !== '—' ? this.orgName : (this._app?.Name || 'Preview')}.pdf`;
            const pdfBlob = doc.output('blob');
            await this._buildCombinedZip(pdfBlob, fileName);

        } catch (e) {
            console.error('PDF generation error:', e?.message || String(e), e?.stack);
            alert('Could not generate the PDF. Please try again — if this keeps happening, refresh the page first.');
        } finally {
            this.isPdfGenerating = false;
        }
    }
}