import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent }                     from 'lightning/platformShowToastEvent';
import { getPicklistValues, getObjectInfo }   from 'lightning/uiObjectInfoApi';
import { getRecord, getFieldValue }           from 'lightning/uiRecordApi';
import { CurrentPageReference,NavigationMixin } from 'lightning/navigation';
import APP_ORG_AREA_FIELD from '@salesforce/schema/IndividualApplication.Organizational_Area_s_for_Funding_Inves__c';
import getReviewerReturnInfo from '@salesforce/apex/WCFValidatorController.getReviewerReturnInfo';
import getWCFValidatorRecordTypeIdForClient from '@salesforce/apex/WCFValidatorController.getWCFValidatorRecordTypeIdForClient';


// Static resource — Wadhwani logo
import WADHWANI_LOGO from '@salesforce/resourceUrl/WIN_Logo';

// ─────────────────────────────────────────────────────────────────────────────
// OBJECT
// ─────────────────────────────────────────────────────────────────────────────
import VALIDATOR_REVIEW_OBJECT from '@salesforce/schema/ApplicationReview';
import QUESTION_NUMBER_FIELD from '@salesforce/schema/ApplicationReview.Question_Number__c';

// ─────────────────────────────────────────────────────────────────────────────
// IndividualApplication FIELDS
// ─────────────────────────────────────────────────────────────────────────────
import APP_NAME_FIELD      from '@salesforce/schema/IndividualApplication.Name';
import APP_SUBMITTED_FIELD from '@salesforce/schema/IndividualApplication.AppliedDate';
import APP_GEOGRAPHY_FIELD from '@salesforce/schema/IndividualApplication.Primary_Focus_Area__c';
import APP_MANDATE_FIELD   from '@salesforce/schema/IndividualApplication.Sub_Focus_Area__c';
import APP_STATUS_FIELD    from '@salesforce/schema/IndividualApplication.Status';
import APP_CATEGORY_FIELD  from '@salesforce/schema/IndividualApplication.Category';

// ─────────────────────────────────────────────────────────────────────────────
// CURRENT USER
// ─────────────────────────────────────────────────────────────────────────────
import CURRENT_USER_ID  from '@salesforce/user/Id';
import USER_NAME_FIELD  from '@salesforce/schema/User.Name';

// ─────────────────────────────────────────────────────────────────────────────
// ApplicationReview FIELDS
// ─────────────────────────────────────────────────────────────────────────────
import S1_1_FIELD from '@salesforce/schema/ApplicationReview.Mandatory_fields__c';
import S1_2_FIELD from '@salesforce/schema/ApplicationReview.Verification_reports__c';
import S1_3_FIELD from '@salesforce/schema/ApplicationReview.Attestation__c';
import S2_1_FIELD from '@salesforce/schema/ApplicationReview.Geography_Within_WCF_Operating_Cluster__c';
import S2_2_FIELD from '@salesforce/schema/ApplicationReview.Mandate_fitFits_Job_CreationFulfilment__c';
import S2_3_FIELD from '@salesforce/schema/ApplicationReview.Blocking_concern_Blocking_Identified__c';
import S3_1_FIELD from '@salesforce/schema/ApplicationReview.Decision_Final_Decision_from_Sec_1_2__c';
import S3_3_FIELD from '@salesforce/schema/ApplicationReview.Flag_rationale_Flagging_Criteria__c';
import S4_1_FIELD from '@salesforce/schema/ApplicationReview.Source_Channel_Source_of_Application__c';
import S4_2_FIELD from '@salesforce/schema/ApplicationReview.Budget_Range_Annual_Budget_Range__c';

// ─────────────────────────────────────────────────────────────────────────────
// APEX
// ─────────────────────────────────────────────────────────────────────────────
import getExistingReview         from '@salesforce/apex/WCFValidatorController.getExistingReview';
import saveValidatorRecord       from '@salesforce/apex/WCFValidatorController.saveValidatorRecord';
import getApplicationAttachments from '@salesforce/apex/WCFValidatorController.getApplicationAttachments';
import APP_DUE_DATE_FIELD from '@salesforce/schema/IndividualApplication.Due_Date__c';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────


const S2_3_YES_VALUE   = 'Yes';
const DECISION_PASS    = 'Pass';
const DECISION_RETURN  = 'Return';
const DECISION_FLAG    = 'Flag';
const FLAG_OTHER_VALUE = 'Other';

const APP_FIELDS = [
    APP_NAME_FIELD, APP_SUBMITTED_FIELD, APP_GEOGRAPHY_FIELD,
    APP_MANDATE_FIELD, APP_STATUS_FIELD, APP_CATEGORY_FIELD, APP_DUE_DATE_FIELD,
    APP_ORG_AREA_FIELD,
];

const WORD_LIMITS = {
    s1_4_text : 200,
    s2_3_text : 300,
    s3_2      : 300,
    s3_5      : 300,
    s5_1      : 500,
};

// Required fields for completion % calculation
// Each entry: { key: formState key, condition: getter name or null (always required) }
const REQUIRED_FIELDS = [
    { key: 's1_1_confirm' },
    { key: 's1_2_confirm' },
    { key: 's1_3_confirm' },
    { key: 's2_1' },
    { key: 's2_2' },
    { key: 's2_3' },
    { key: 's3_1' },
    { key: 's3_2', isText: true },
    { key: 's4_1' },
    { key: 's4_2' },
];

const DEFAULT_STATE = () => ({
    existingReviewId : null,
    s1_1_confirm     : null,
    s1_2_confirm     : null,
    s1_3_confirm     : null,
    s1_4_text        : '',
    s2_1             : null,
    s2_2             : null,
    s2_3             : null,
    s2_3_text        : '',
    s3_1             : null,
    s3_2             : '',
    s3_3             : [],
    s3_4             : '',
    s3_5             : '',
    s4_1             : null,
    s4_2             : null,
    s5_1             : '',
    selectedQuestions : [],   // array of selected question numbers e.g. ['1','5','8']
questionTexts     : {},   // map { '1': '', '5': '', '8': '' }
});

export default class WcfValidatorForm extends NavigationMixin(LightningElement) {

    @api recordId;
    @track formState         = DEFAULT_STATE();
    @track isLoading         = true;
    @track isSaving          = false;
    @track _attachments      = [];

@track _attestingUserName  = null;
@track _attestingUserTitle = null;
@track _submissionDate     = null;
@track _reviewerReturnComment = null;
@track _reviewerReturnDate    = null;
@track _applicationName = null;
@track _dueDate         = null;
@track _appStatus       = null;
@track _mandateTrack    = null;
@track _orgArea         = null;
    // ── Draft tracking ────────────────────────────────────────────────────────
    // isDraftSaved: true once a draft has been saved this session or loaded from server
    @track isDraftSaved      = false;
    // draftLastSaved: human-readable timestamp string shown in the banner / chip
    @track draftLastSaved    = '';
    // showDraftBanner: controls the top resume banner (dismissed after user clicks ×)
    @track showDraftBanner   = false;

    @track showPreview = false;
    @track _wiredAppId = null;

    _reviewLoaded = false;
    _effectiveRecordId = null;
    _urlRecordId = null;

    // Raw picklist buckets
    _s1_1Options  = [];
    _s1_2Options  = [];
    _s1_3Options  = [];
    _s2_1Options  = [];
    _s2_2Options  = [];
    _s2_3Options  = [];
    _s3_1Options  = [];
    _s3_3Options  = [];
    _s4_1Options  = [];
    _s4_2Options  = [];
    _recordTypeId = null;
    _appData      = null;
    _userData     = null;

    // ── Static resource URL ──────────────────────────────────────────────────
    get wadhwaniLogoUrl() { return WADHWANI_LOGO; }

    @wire(CurrentPageReference)
wiredPageRef(pageRef) {
    if (pageRef?.state?.recordId) {
        this._urlRecordId = pageRef.state.recordId;
        this._syncWiredAppId();
    }
}

_syncWiredAppId() {
    const id = this.recordId || this._urlRecordId;
    if (id && id !== this._wiredAppId) {
        this._wiredAppId = id;
    }
}

    // ── IndividualApplication header data ────────────────────────────────────
   // ── IndividualApplication header data ────────────────────────────────────
@wire(getRecord, { recordId: '$_wiredAppId', fields: APP_FIELDS })
wiredApplication({ data, error }) {
    if (data) this._appData = data;
    else if (error) console.error('Application wire error:', JSON.stringify(error));
}

    get applicantName()  { return this._applicationName || '—'; }
    get applicationId()  { return this.recordId || this._urlRecordId || '—'; }
    get submittedDate() {
        if (this._submissionDate) {
            try {
                return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    .format(new Date(this._submissionDate));
            } catch (e) {
                return this._submissionDate;
            }
        }
        const raw = this._appData ? getFieldValue(this._appData, APP_SUBMITTED_FIELD) : null;
        if (!raw) return '—';
        try {
            return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                .format(new Date(raw));
        } catch (e) {
            return String(raw);
        }
    }
    get geography()    { return this._geography || (this._appData ? getFieldValue(this._appData, APP_GEOGRAPHY_FIELD) : '—'); }
    get mandateTrack() { return this._mandateTrack; }
    get orgArea() {
        return this._orgArea || '';
    }
get isJobFulfillment() {
    const a = this.orgArea || '';
    return a.includes('Job Fulfillment') || a === 'Job Fulfillment Only' || a === 'Both Job Fulfillment and Job Creation';
}
get isJobCreation() {
    const a = this.orgArea || '';
    return a.includes('Job Creation') || a === 'Job Creation Only' || a === 'Both Job Fulfillment and Job Creation';
}
get isLivelihood() {
    const a = this.orgArea || '';
    return a.includes('Livelihood');
}

get hasJF() { return this.isJobFulfillment; }
get hasJC() { return this.isJobCreation; }
get hasLiv() { return this.isLivelihood; }

get qNum() {
    let currentNumber = 1;
    const map = {};

    map.Q1 = currentNumber++;
    map.Q2 = currentNumber++;
    map.Q3 = currentNumber++;
    map.Q4 = currentNumber++;
    map.Q5 = currentNumber++;
    map.Q6 = currentNumber++;
    map.Q7 = currentNumber++;
    map.Q8 = currentNumber++;
    map.Q9 = currentNumber++;
    map.Q10 = currentNumber++;

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

getDynamicQuestionKey(canonicalKey) {
    if (!canonicalKey) return '';
    const qMap = this.qNum;
    if (canonicalKey === 'Q24') {
        return `Q${qMap.Q24 || '24'}`;
    }
    if (canonicalKey === 'Q28') {
        return `Q${qMap.Q28 || '28'}`;
    }
    if (canonicalKey.startsWith('Q') && qMap[canonicalKey]) {
        return `Q${qMap[canonicalKey]}`;
    }
    return canonicalKey;
}

get questionTitleMap() {
    const q = this.qNum;
    const map = {
        [q.Q1]: 'Organizational Area(s)',
        [q.Q2]: 'Organizational Identifying Information',
        [q.Q3]: 'Submitter Contact Information',
        [q.Q4]: 'Legal Structure',
        [q.Q5]: 'Legal and Tax Compliance',
        [q.Q6]: 'Historical Financials',
        [q.Q7]: 'Board of Directors / Governance',
        [q.Q8]: 'Organizational Overview & Strategy',
        [q.Q9]: 'Target Population',
        [q.Q10]: 'Track Selection'
    };
    if (this.isJobFulfillment) {
        map[q.Q11] = 'Your Skilling & Placement Approach';
        map[q.Q12] = 'Skilling Domains';
        map[q.Q13] = 'Job Fulfillment Outcomes (Actuals)';
        map[q.Q14] = 'Job Fulfillment Outcomes (Projections)';
    }
    if (this.isJobCreation) {
        map[q.Q15] = 'Your Job Creation Approach';
        map[q.Q16] = 'Business Sectors Served';
        map[q.Q17] = 'Job Creation Outcomes (Actuals)';
        map[q.Q18] = 'Job Creation Outcomes (Projections)';
    }
    if (this.isLivelihood) {
        map[q.Q19] = 'Livelihood Upliftment Approach';
        map[q.Q20] = 'Focus Geographies & Sectors';
        map[q.Q21] = 'Household Selection Criteria';
        map[q.Q22] = 'Livelihood Outcomes (Actuals)';
        map[q.Q23] = 'Livelihood Outcomes (Projections)';
    }
    map[q.Q24] = 'Independent Verification of Your Outcomes';
    map[q.Q25] = 'Sustainability Plan';
    map[q.Q26] = 'Direction for Additional Funding';
    map[q.Q27] = 'Operational Synergies — GenieAI';
    map[q.Q28] = 'Supporting Documents';
    return map;
}

get allowedQuestionNumbers() {
    const q = this.qNum;
    const total = q.Q28 || 23;
    const allowed = [];
    for (let i = 1; i <= total; i++) {
        allowed.push(String(i));
    }
    return allowed;
}
get dueDate() {
    if (!this._dueDate) return '—';
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(this._dueDate));
}
    // ── Current user ─────────────────────────────────────────────────────────
    @wire(getRecord, { recordId: CURRENT_USER_ID, fields: [USER_NAME_FIELD] })
    wiredUser({ data }) { if (data) this._userData = data; }

    get validatorName() {
        return this._userData ? getFieldValue(this._userData, USER_NAME_FIELD) : 'Validator';
    }

    handleLogoError() { /* logo failed to load */ }

    // ── Object info ───────────────────────────────────────────────────────────
    // ── Record type — resolved server-side so it always matches the exact
//    record type (WCF_Validator) that Apex uses for save/query, rather
//    than trusting the org's possibly-wrong default record type ──
async connectedCallback() {
    this._syncWiredAppId();
    try {
        this._recordTypeId = await getWCFValidatorRecordTypeIdForClient();
    } catch (e) {
        console.error('Failed to resolve WCF_Validator record type:', JSON.stringify(e));
    }
}
    // ── Picklist wires ────────────────────────────────────────────────────────
    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S1_1_FIELD })
    wiredS1_1({ data }) { if (data) this._s1_1Options = data.values; }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S1_2_FIELD })
    wiredS1_2({ data }) { if (data) this._s1_2Options = data.values; }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S1_3_FIELD })
    wiredS1_3({ data, error }) {
        if (data) this._s1_3Options = data.values;
        else if (error) console.error('S1.3 wire error:', JSON.stringify(error));
    }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S2_1_FIELD })
    wiredS2_1({ data }) { if (data) this._s2_1Options = data.values; }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S2_2_FIELD })
    wiredS2_2({ data }) { if (data) this._s2_2Options = data.values; }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S2_3_FIELD })
    wiredS2_3({ data, error }) {
        if (data) this._s2_3Options = data.values;
        else if (error) console.error('S2.3 wire error:', JSON.stringify(error));
    }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S3_1_FIELD })
    wiredS3_1({ data }) { if (data) this._s3_1Options = data.values; }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S3_3_FIELD })
    wiredS3_3({ data }) { if (data) this._s3_3Options = data.values; }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S4_1_FIELD })
    wiredS4_1({ data }) { if (data) this._s4_1Options = data.values; }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: S4_2_FIELD })
    wiredS4_2({ data }) { if (data) this._s4_2Options = data.values; }

    @wire(getPicklistValues, { recordTypeId: '$_recordTypeId', fieldApiName: QUESTION_NUMBER_FIELD })
wiredQuestionNumber({ data }) { if (data) this._questionNumberOptions = data.values; }

    // ── Pre-fill from existing draft (Resume) ─────────────────────────────────
    // This wire runs on load. If Apex returns a Draft record, the form is
    // pre-populated (resume) and the draft banner is shown automatically.
// Replace your existing wiredReview wire handler

renderedCallback() {
    const id = this.recordId || this._urlRecordId;
    if (id && id !== this._effectiveRecordId) {
        this._effectiveRecordId = id;
        this._loadExistingReview();
        this._loadReviewerReturnInfo();
    }
    this._syncWiredAppId();
}

async _loadReviewerReturnInfo() {
    if (!this._effectiveRecordId) return;
    try {
        const info = await getReviewerReturnInfo({ applicationId: this._effectiveRecordId });
        if (info) {
            this._reviewerReturnComment = info.comment;
            this._reviewerReturnDate    = info.lastModified;
        } else {
            this._reviewerReturnComment = null;
            this._reviewerReturnDate    = null;
        }
    } catch (e) {
        console.error('loadReviewerReturnInfo error:', JSON.stringify(e));
        this._reviewerReturnComment = null;
    }
}

async _loadExistingReview() {
    if (!this._effectiveRecordId) return;
    this.isLoading = true;
    try {
        const data = await getExistingReview({ applicationId: this._effectiveRecordId });

         // ── ADD THESE LOGS ──
        console.log('=== REVIEW WRAPPER ===', JSON.stringify(data));
        console.log('attestingUserName =>', data?.attestingUserName);
        console.log('attestingUserTitle =>', data?.attestingUserTitle);
        console.log('submissionDate =>', data?.submissionDate);
        console.log('review =>', data?.review?.Id);

       
   // ── Store attestation data from Apex ──
this._attestingUserName  = data.attestingUserName  || null;
this._attestingUserTitle = data.attestingUserTitle || null;
this._submissionDate     = data.submissionDate     || null;
this._applicationName    = data.applicationName    || null;
this._dueDate            = data.dueDate            || null;
this._appStatus          = data.appStatus          || null;
this._mandateTrack       = data.mandateTrack       || null;
this._orgArea            = data.orgArea            || null;
this._geography          = data.geography          || null;

        // ── Use data.review for form state (was previously just 'data') ──
        const review = data.review;
        if (review && review.Id) {
            const combined = review.Field_level_checklist_for_the_Partner__c || '';
            const parts    = combined.split('|||BLOCKING|||');
            const s3_5Val  = parts[0] || '';
            const s2_3Val  = parts[1] || '';

            const qTextMap = {
                '1':  review.Question_Number_1__c  || '',
                '2':  review.Question_Number_2__c  || '',
                '3':  review.Question_Number_3__c  || '',
                '4':  review.Question_Number_4__c  || '',
                '5':  review.Question_Number_5__c  || '',
                '6':  review.Question_Number_6__c  || '',
                '7':  review.Question_Number_7__c  || '',
                '8':  review.Question_Number_8__c  || '',
                '9':  review.Question_Number_9__c  || '',
                '10': review.Question_Number_10__c || '',
                '11': review.Question_Number_11__c || '',
                '12': review.Question_Number_12__c || '',
                '13': review.Question_Number_13__c || '',
                '14': review.Question_Number_14__c || '',
                '15': review.Question_Number_15__c || '',
                '16': review.Question_Number_16__c || '',
                '17': review.Question_Number_17__c || '',
                '18': review.Question_Number_18__c || '',
                '19': review.Question_Number_19__c || '',
                '20': review.Question_Number_20__c || '',
                '21': review.Question_Number_21__c || '',
                '22': review.Question_Number_22__c || '',
                '23': review.Question_Number_23__c || '',
                '24': review.Question_Number_24__c || '',
                '25': review.Question_Number_25__c || '',
                '26': review.Question_Number_26__c || '',
                '27': review.Question_Number_27__c || '',
                '28': review.Question_Number_28__c || '',
            };

            // Question_Number__c is a multi-select picklist and is the
            // authoritative source going forward. Records saved before the
            // multi-select fix hold only the FIRST number there, so union it
            // with whichever question text fields are actually populated —
            // that recovers the full set for legacy data without losing
            // anything on newly-saved records.
            const fromPicklist = review.Question_Number__c
                ? review.Question_Number__c.split(';').map(s => s.trim()).filter(Boolean)
                : [];

            const fromTexts = Object.keys(qTextMap)
                .filter(k => qTextMap[k] && qTextMap[k].trim());

            const selectedNums = [...new Set([...fromPicklist, ...fromTexts])]
                .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

            this.formState = {
                existingReviewId : review.Id,
                s1_1_confirm : review.Mandatory_fields__c        || null,
                s1_2_confirm : review.Verification_reports__c    || null,
                s1_3_confirm : review.Attestation__c             || null,
                s1_4_text    : review.Substantive_content_gap__c || '',
                s2_1      : review.Geography_Within_WCF_Operating_Cluster__c || null,
                s2_2      : review.Mandate_fitFits_Job_CreationFulfilment__c || null,
                s2_3      : review.Blocking_concern_Blocking_Identified__c   || null,
                s2_3_text : s2_3Val,
                s3_1 : review.Decision_Final_Decision_from_Sec_1_2__c || null,
                s3_2 : review.Decision_rationale__c                   || '',
                s3_3 : review.Flag_rationale_Flagging_Criteria__c
                        ? review.Flag_rationale_Flagging_Criteria__c.split(';').filter(Boolean)
                        : [],
                s3_4 : review.Other_describe_the_concern__c || '',
                s3_5 : s3_5Val,
                s4_1 : review.Source_Channel_Source_of_Application__c || null,
                s4_2 : review.Budget_Range_Annual_Budget_Range__c     || null,
                s5_1 : review.Notes_for_Reviewers__c                  || '',
                selectedQuestions : selectedNums,
                questionTexts     : qTextMap,
            };

            if (review.Status === 'Draft') {
                this.isDraftSaved    = true;
                this.draftLastSaved  = this._formatRelativeTime(review.LastModifiedDate);
                this.showDraftBanner = true;
            }
        } else {
            this.formState       = DEFAULT_STATE();
            this.isDraftSaved    = false;
            this.showDraftBanner = false;
        }
    } catch (e) {
        console.error('loadExistingReview error:', JSON.stringify(e));
        this.formState = DEFAULT_STATE();
    } finally {
        this.isLoading = false;
    }
}
    // ── Attachments wire ──────────────────────────────────────────────────────
    @wire(getApplicationAttachments, { applicationId: '$_wiredAppId' })
    wiredAttachments({ data, error }) {
        if (data) {
            this._attachments = [...data];
        } else if (error) {
            console.error('Attachments wire error:', JSON.stringify(error));
            this._attachments = [];
        }
    }

    // ── Draft banner dismiss ──────────────────────────────────────────────────
    handleDismissDraftBanner() {
        this.showDraftBanner = false;
    }

    // ── Completion tracking ───────────────────────────────────────────────────
    // Returns the count of required fields that have been filled
    get completedFieldCount() {
        return REQUIRED_FIELDS.filter(f => {
            const val = this.formState[f.key];
            if (f.isText) return val && val.trim().length > 0;
            return !!val;
        }).length;
    }

    get totalRequiredFieldCount() {
        return REQUIRED_FIELDS.length;
    }

    // Returns 0-100 integer
    get completionPercent() {
        return Math.round((this.completedFieldCount / this.totalRequiredFieldCount) * 100);
    }

    // Returns one of 11 pre-built CSS classes (wcf-pb-0 … wcf-pb-100) stepped
    // in 10% increments — avoids inline style binding which triggers the LWC
    // HTML template CSS linter (errors: } expected, at-rule expected, empty ruleset).
    get progressBarClass() {
        const step = Math.round(this.completionPercent / 10) * 10;  // 0,10,20…100
        return `wcf-draft-progress-bar wcf-pb-\${step}`;
    }

    // Label on the Save Draft button — changes while saving
    get saveDraftLabel() {
        return this.isSaving ? 'Saving…' : 'Save Draft';
    }

get questionNumberOptions() {
    const allowed = this.allowedQuestionNumbers;
    const rawList = (this._questionNumberOptions && this._questionNumberOptions.length > 0)
        ? this._questionNumberOptions
        : allowed.map(n => ({ label: `Question ${n}`, value: String(n) }));

    return rawList
        .filter(o => allowed.includes(String(o.value)))
        .sort((a, b) => parseInt(a.value, 10) - parseInt(b.value, 10))
        .map(o => ({
            val       : String(o.value),
            label     : o.label || `Question ${o.value}`,
            isSelected: (this.formState.selectedQuestions || []).includes(String(o.value)),
            cls       : 'wcf-qnum-pill' +
                        ((this.formState.selectedQuestions || []).includes(String(o.value))
                            ? ' wcf-qnum-pill-sel' : '')
        }));
}

get attestingUserName()  { return this._attestingUserName; }
get attestingUserTitle() { return this._attestingUserTitle; }

get submittedDateFormatted() {
    if (!this._submissionDate) return null;
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZoneName: 'short'
    }).format(new Date(this._submissionDate));
}

// s1_3_message stays exactly the same
get s1_3_message() {
    const name  = this.attestingUserName;
    const title = this.attestingUserTitle;
    const date  = this.submittedDateFormatted;
    if (name && date) {
        return `Attestation signed by ${name}${title ? ' (' + title + ')' : ''} on ${date}.`;
    }
    if (name) {
        // Name available but date missing — show name only
        return `Attestation signed by ${name}${title ? ' (' + title + ')' : ''}. Date server-stamped on submission.`;
    }
    return 'Verify attestation is signed and timestamped in the submitted form.';
}

get openQuestionCards() {
    const texts = this.formState.questionTexts || {};
    const titleMap = this.questionTitleMap;
    return (this.formState.selectedQuestions || [])
        .slice()
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        .map(num => {
            const hasValue = !!(texts[num] && texts[num].trim());
            const title = titleMap[num] ? ` — ${titleMap[num]}` : ' — Return Reason';
            return {
                key      : num,
                num      : num,
                label    : `Question ${num}${title}`,
                value    : texts[num] || '',
                field    : `qtext_${num}`,
                hasValue,
                cls      : 'wcf-qcard' + (!hasValue ? ' wcf-qcard-missing' : ''),
            };
        });
}
get hasOpenQuestions() {
    return (this.formState.selectedQuestions || []).length > 0;
}

// Returns which question number is currently selected (null if none)
get selectedQuestionNumber() {
    return this.formState.questionNumber;
}

// Returns the text value for the currently selected question textarea
get selectedQuestionText() {
    if (!this.formState.questionNumber) return '';
    return (this.formState.questionTexts || {})[this.formState.questionNumber] || '';
}

// Label shown above the textarea
get selectedQuestionLabel() {
    return this.formState.questionNumber
        ? `Question ${this.formState.questionNumber} — Return Reason`
        : '';
}

// Builds preview-ready list of filled question cards
get previewQuestionCards() {
    const texts = this.formState.questionTexts || {};
    const titleMap = this.questionTitleMap;
    return (this.formState.selectedQuestions || [])
        .slice()
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        .map(num => ({
            key   : num,
            num   : num,
            label : titleMap[num] ? `Question ${num} — ${titleMap[num]}` : `Question ${num}`,
            text  : texts[num] || '—',
        }));
}

get hasPreviewQuestions() {
    return (this.formState.selectedQuestions || []).length > 0;
}
    // ── Option builders ───────────────────────────────────────────────────────
    _mapConfirmOpts(rawList, stateField) {
        const list = (rawList && rawList.length > 0)
            ? rawList
            : [
                { label: 'Confirmed correct', value: 'Confirmed correct' },
                { label: 'Auto-derived state appears wrong', value: 'Auto-derived state appears wrong' }
              ];
        return list.map(o => ({
            val   : o.value,
            label : o.label,
            cls   : 'wcf-confirm-pill' +
                    (this.formState[stateField] === o.value ? ' wcf-confirm-pill-sel' : '')
        }));
    }

    _mapPickOpts(rawList, stateField, fallbackList) {
        const list = (rawList && rawList.length > 0)
            ? rawList
            : (fallbackList || []);
        return list.map(o => ({
            val   : o.value,
            label : o.label,
            cls   : 'wcf-pick-opt' +
                    (this.formState[stateField] === o.value ? ' wcf-pick-sel' : '')
        }));
    }

    get s1_1Options() { return this._mapConfirmOpts(this._s1_1Options, 's1_1_confirm'); }
    get s1_2Options() { return this._mapConfirmOpts(this._s1_2Options, 's1_2_confirm'); }
    get s1_3Options() { return this._mapConfirmOpts(this._s1_3Options, 's1_3_confirm'); }
    get s2_1Options() {
        return this._mapPickOpts(this._s2_1Options, 's2_1', [
            { label: 'Within active clusters', value: 'Within active clusters' },
            { label: 'Borderline', value: 'Borderline' },
            { label: 'Outside active clusters', value: 'Outside active clusters' }
        ]);
    }
    get s2_2Options() {
        return this._mapPickOpts(this._s2_2Options, 's2_2', [
            { label: 'Fit', value: 'Fit' },
            { label: 'Borderline', value: 'Borderline' },
            { label: 'Misfit', value: 'Misfit' }
        ]);
    }
    get s4_1Options() {
        return this._mapPickOpts(this._s4_1Options, 's4_1', [
            { label: 'WSN / WEN Nomination', value: 'WSN / WEN Nomination' },
            { label: 'WCF Direct Research', value: 'WCF Direct Research' },
            { label: 'Self-Signup', value: 'Self-Signup' },
            { label: 'Unknown / TBD', value: 'Unknown / TBD' }
        ]);
    }
    get s4_2Options() {
        return this._mapPickOpts(this._s4_2Options, 's4_2', [
            { label: '< $1M', value: '< $1M' },
            { label: '$1M – $5M', value: '$1M – $5M' },
            { label: '$5M – $10M', value: '$5M – $10M' },
            { label: '$10M – $50M', value: '$10M – $50M' },
            { label: '$50M – $100M', value: '$50M – $100M' },
            { label: '> $100M', value: '> $100M' },
            { label: 'Unknown / cannot determine', value: 'Unknown / cannot determine' }
        ]);
    }

    get s2_3Options() {
        const rawList = (this._s2_3Options && this._s2_3Options.length > 0)
            ? this._s2_3Options
            : [
                { label: 'No', value: 'No' },
                { label: 'Yes', value: 'Yes' }
              ];
        return rawList.map(o => {
            const isYes = o.value === S2_3_YES_VALUE;
            return {
                val      : o.value,
                label    : o.label,
                sublabel : isYes ? 'specify in follow-on field' : null,
                cls      : ['wcf-pick-opt wcf-pick-binary',
                            this.formState.s2_3 === o.value ? 'wcf-pick-sel' : '']
                           .join(' ').trim()
            };
        });
    }

    get attachmentSummary() {
        if (!this._attachments || this._attachments.length === 0) {
            return 'Checking verification reports...';
        }
        return this._attachments.map(a => {
            const displayKey = this.getDynamicQuestionKey(a.questionKey);
            const v1   = a.v1Value || 'N/A';
            let filePart;
            if (a.fileName) {
                const ext  = a.fileExtension ? '.' + a.fileExtension : '';
                const size = (a.fileSizeMB != null) ? ' (' + a.fileSizeMB + ' MB)' : '';
                if (a.questionKey === 'Q24' || a.questionKey === 'Q15' || a.questionKey === 'Q17') {
                    filePart = `verification report uploaded (${a.fileName}${ext}${size})`;
                } else {
                    filePart = `uploaded (${a.fileName}${ext}${size})`;
                }
            } else {
                filePart = 'No file uploaded';
            }
            if (a.questionKey === 'Q24' || a.questionKey === 'Q15' || a.questionKey === 'Q17') {
                return `${displayKey}.v1 = ${v1}; ${displayKey}.v3 ${filePart.startsWith('verification') ? '' : '— '}${filePart}`;
            }
            return `${displayKey}: ${filePart}`;
        }).join('\n');
    }

    get hasAttachments() {
        return Array.isArray(this._attachments) &&
               this._attachments.some(a => a.fileName != null && a.fileName !== '');
    }

    get s3_1Options() {
        const meta = {
            [DECISION_PASS]   : {
                badgeCls  : 'wcf-dec-badge wcf-dec-badge-pass',
                desc      : 'Application advances to Reviewers as-is. Stage 3 begins.'
            },
            [DECISION_RETURN] : {
                badgeCls  : 'wcf-dec-badge wcf-dec-badge-return',
                desc      : 'Application returns to the Partner via the Submission Revision Pattern.'
            },
            [DECISION_FLAG]   : {
                badgeCls  : 'wcf-dec-badge wcf-dec-badge-flag',
                desc      : 'Advances to Reviewers with a structured concern picklist attached.'
            }
        };
        const rawList = (this._s3_1Options && this._s3_1Options.length > 0)
            ? this._s3_1Options
            : [
                { label: 'Pass', value: DECISION_PASS },
                { label: 'Return', value: DECISION_RETURN },
                { label: 'Flag', value: DECISION_FLAG }
              ];

        return rawList.map(o => {
            const m   = meta[o.value] || {};
            const sel = this.formState.s3_1 === o.value;
            return {
                val       : o.value,
                label     : o.label,
                badgeText : m.badgeText || '',
                badgeCls  : m.badgeCls  || 'wcf-dec-badge',
                desc      : m.desc      || '',
                cls       : ['wcf-dec-card', 'wcf-dec-' + o.value.toLowerCase(),
                             sel ? 'wcf-dec-sel-' + o.value.toLowerCase() : '']
                            .join(' ').trim()
            };
        });
    }

    get flagOptions() {
        const suggested = [];
        if (this.formState.s2_1 && this.formState.s2_1.toLowerCase().includes('outside')) suggested.push('geo');
        if (this.formState.s2_2 && this.formState.s2_2.toLowerCase().includes('misfit'))  suggested.push('mandate');
        if (this.formState.s2_3 === S2_3_YES_VALUE) suggested.push('sanctions');

        const rawList = (this._s3_3Options && this._s3_3Options.length > 0)
            ? this._s3_3Options
            : [
                { label: 'Geographic scope outside active clusters', value: 'Geographic scope outside active clusters' },
                { label: 'Mandate misfit (work not Job Fulfilment / Job Creation aligned)', value: 'Mandate misfit (work not Job Fulfilment / Job Creation aligned)' },
                { label: 'Sanctions / debarment / watchlist concern', value: 'Sanctions / debarment / watchlist concern' },
                { label: 'Materially below missing-middle floor', value: 'Materially below missing-middle floor' },
                { label: 'Materially above missing-middle ceiling', value: 'Materially above missing-middle ceiling' },
                { label: 'Outcome credibility concern at first read', value: 'Outcome credibility concern at first read' },
                { label: 'Institutional credibility concern at first read', value: 'Institutional credibility concern at first read' },
                { label: 'Other', value: 'Other' }
              ];

        return rawList.map(o => {
            const isSuggested = suggested.includes(o.value.toLowerCase());
            const isSelected  = (this.formState.s3_3 || []).includes(o.value);
            return {
                val       : o.value,
                label     : o.label,
                suggested : isSuggested,
                cls       : ['wcf-check-opt',
                             isSelected                 ? 'wcf-check-sel'       : '',
                             isSuggested && !isSelected ? 'wcf-check-suggested' : '']
                            .join(' ').trim()
            };
        });
    }

    // ── Conditional visibility ────────────────────────────────────────────────
    get showS2_3_text()         { return this.formState.s2_3 === S2_3_YES_VALUE; }
    get showDecisionRationale() { return !!this.formState.s3_1; }
    get showFlagSection()       { return this.formState.s3_1 === DECISION_FLAG; }
    get showReturnSection()     { return this.formState.s3_1 === DECISION_RETURN; }
    get showNotesSection() {
        return this.formState.s3_1 === DECISION_PASS || this.formState.s3_1 === DECISION_FLAG;
    }
    get showFlagOther() {
        return this.showFlagSection && this.formState.s3_3.includes(FLAG_OTHER_VALUE);
    }
    

    // ── Event handlers ────────────────────────────────────────────────────────
    handleConfirmPill(evt) {
        const field = evt.currentTarget.dataset.field;
        const val   = evt.currentTarget.dataset.val;
        this.formState = {
            ...this.formState,
            [field]: this.formState[field] === val ? null : val
        };
    }

    handlePicklist(evt) {
        const field    = evt.currentTarget.dataset.field;
        const val      = evt.currentTarget.dataset.val;
        const newState = { ...this.formState, [field]: this.formState[field] === val ? null : val };
       if (field === 's3_1') {
            newState.s3_3 = [];
            newState.s3_4 = '';
            newState.s3_5 = '';
            // Return-only state must not survive a switch to Pass/Flag, or the
            // question numbers and texts get saved against a non-Return decision
            // and show up as return notes on the applicant portal.
            if (val !== DECISION_RETURN) {
                newState.selectedQuestions = [];
                newState.questionTexts     = {};
            }
        }
        if (field === 's2_3' && val !== S2_3_YES_VALUE) {
            newState.s2_3_text = '';
        }
        this.formState = newState;
    }

    handleFlagCheck(evt) {
        const val     = evt.currentTarget.dataset.val;
        const current = [...this.formState.s3_3];
        const idx     = current.indexOf(val);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(val);
        const newState = { ...this.formState, s3_3: current };
        if (!current.includes(FLAG_OTHER_VALUE)) newState.s3_4 = '';
        this.formState = newState;
    }

    handleTextChange(evt) {
        const field = evt.currentTarget.dataset.field;
        const raw   = evt.target.value || '';
        const limit = WORD_LIMITS[field];
        if (limit) {
            const words = raw.trim().split(/\s+/).filter(Boolean);
            if (words.length > limit) {
                const truncated = words.slice(0, limit).join(' ');
                evt.target.value = truncated;
                this.formState = { ...this.formState, [field]: truncated };
                return;
            }
        }
        this.formState = { ...this.formState, [field]: raw };
    }

    handleQuestionNumberToggle(evt) {
    const val      = evt.currentTarget.dataset.val;
    const current  = [...(this.formState.selectedQuestions || [])];
    const idx      = current.indexOf(val);
    if (idx >= 0) {
        // Already selected — deselect and remove its text
        current.splice(idx, 1);
        const newTexts = { ...this.formState.questionTexts };
        delete newTexts[val];
        this.formState = { ...this.formState, selectedQuestions: current, questionTexts: newTexts };
    } else {
        // Add
        current.push(val);
        this.formState = { ...this.formState, selectedQuestions: current };
    }
}

handleQuestionCardTextChange(evt) {
    const num      = evt.currentTarget.dataset.num;
    const raw      = evt.target.value || '';
    const newTexts = { ...this.formState.questionTexts, [num]: raw };
    this.formState = { ...this.formState, questionTexts: newTexts };
}

handleRemoveQuestionCard(evt) {
    const num     = evt.currentTarget.dataset.num;
    const current = (this.formState.selectedQuestions || []).filter(q => q !== num);
    const newTexts = { ...this.formState.questionTexts };
    delete newTexts[num];
    this.formState = { ...this.formState, selectedQuestions: current, questionTexts: newTexts };
}
    // ── Save Draft ────────────────────────────────────────────────────────────
    // KEY BEHAVIOUR:
    //  • No field validation — validator can save with even 1 field filled
    //  • Status sent as 'Draft'
    //  • On success: update isDraftSaved, draftLastSaved, show banner
    //  • existingReviewId is stored so subsequent saves do an UPDATE (upsert)
    async handleSaveDraft() {
        if (this.isSaving) return;
        this.isSaving = true;
        try {
            const id = await saveValidatorRecord({
                reviewJson: JSON.stringify(this.buildPayload('Draft'))
            });
            this.formState      = { ...this.formState, existingReviewId: id };
            this.isDraftSaved   = true;
            this.draftLastSaved = this._formatNow();
            this.showDraftBanner = true;   // re-show banner after each save so it's visible

            this.dispatchEvent(new ShowToastEvent({
                title   : 'Draft saved',
                message : `Progress saved — ${this.completionPercent}% complete (${this.completedFieldCount} of ${this.totalRequiredFieldCount} required fields).`,
                variant : 'success'
            }));

// Give the toast a moment to render, then reload the page
setTimeout(() => {
    window.location.reload();
}, 800);
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title   : 'Save failed',
                message : e.body?.message || e.message,
                variant : 'error'
            }));
        } finally {
            this.isSaving = false;
        }
    }

    // ── Seal ──────────────────────────────────────────────────────────────────
    async handleSeal() {
            if (this.isSealDisabled) {
        return;
    }

    // First click → show preview only
    this.showPreview = true;
    }


async handleFinalSeal() {
    if (this.missingFields.length > 0) return;
    this.isSaving = true;
    try {
        const id = await saveValidatorRecord({
            reviewJson: JSON.stringify(this.buildPayload('Validated'))
        });
        this.formState = { ...this.formState, existingReviewId: id };
        this.showPreview = false;

        const toastByDecision = {
            [DECISION_PASS]:   { title: 'Validator Record Passed',  message: 'Validator Record Passed Successfully.' },
            [DECISION_RETURN]: { title: 'Proposal Returned',        message: 'Proposal Returned for Revision Successfully.' },
            [DECISION_FLAG]:   { title: 'Proposal Flagged',         message: 'Proposal Flagged Successfully.' }
        };
        const toastInfo = toastByDecision[this.formState.s3_1] || {
            title: 'Validator Record Validated', message: 'Record successfully Validated.'
        };

        this.dispatchEvent(new ShowToastEvent({
            title: toastInfo.title,
            message: toastInfo.message,
            variant: 'success'
        }));

        setTimeout(() => { window.location.reload(); }, 800);
    } catch (e) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Seal failed',
            message: e.body?.message || e.message,
            variant: 'error'
        }));
    } finally {
        this.isSaving = false;
    }
}

handleClosePreview() {
    this.showPreview = false;
}

handleQuestionNumberSelect(evt) {
    const val = evt.currentTarget.dataset.val;
    // Toggle off if same value clicked again
    const newVal = this.formState.questionNumber === val ? null : val;
    this.formState = { ...this.formState, questionNumber: newVal };
}

handleQuestionTextChange(evt) {
    const qNum = this.formState.questionNumber;
    if (!qNum) return;
    const raw  = evt.target.value || '';
    const newTexts = { ...this.formState.questionTexts, [qNum]: raw };
    this.formState = { ...this.formState, questionTexts: newTexts };
}




    // ── Payload builder ───────────────────────────────────────────────────────
    buildPayload(status) {
        return {
            Id            : this.formState.existingReviewId || null,
            applicationId : this._effectiveRecordId || this.recordId,
            status,
            s1_1_confirm  : this.formState.s1_1_confirm,
            s1_2_confirm  : this.formState.s1_2_confirm,
            s1_3_confirm  : this.formState.s1_3_confirm,
            s1_4_text     : this.formState.s1_4_text,
            s2_1          : this.formState.s2_1,
            s2_2          : this.formState.s2_2,
            s2_3          : this.formState.s2_3,
            s2_3_text     : this.formState.s2_3_text,
            s3_1          : this.formState.s3_1,
            s3_2          : this.formState.s3_2,
            s3_3          : this.formState.s3_3.join(';'),
            s3_4          : this.formState.s3_4,
            s3_5          : this.formState.s3_5,
            s4_1          : this.formState.s4_1,
            s4_2          : this.formState.s4_2,
            s5_1          : this.formState.s5_1,
        
         selectedQuestions : (this.formState.selectedQuestions || []).join(';'),
            // Send text ONLY for currently-selected questions. Sending the full
            // 21-key map is what resurrected deselected questions on re-save.
            questionTexts : JSON.stringify(
                (this.formState.selectedQuestions || []).reduce((acc, n) => {
                    acc[n] = (this.formState.questionTexts || {})[n] || '';
                    return acc;
                }, {})
            ),
        };
        
    }

    // ── Validation (Seal only) ────────────────────────────────────────────────
    get missingFields() {
        const m = [];
        if (!this.formState.s1_1_confirm)                                  m.push('S1.1 Mandatory fields');
        if (!this.formState.s1_2_confirm)                                  m.push('S1.2 Verification reports');
        if (!this.formState.s1_3_confirm)                                  m.push('S1.3 Attestation');
        if (!this.formState.s2_1)                                          m.push('S2.1 Geography');
        if (!this.formState.s2_2)                                          m.push('S2.2 Mandate fit');
        if (!this.formState.s2_3)                                          m.push('S2.3 Blocking concern');
        if (this.showS2_3_text && !this.formState.s2_3_text.trim())       m.push('S2.3 description');
        if (!this.formState.s3_1)                                          m.push('S3.1 Decision');
        if (!this.formState.s3_2.trim())                                   m.push('S3.2 Rationale');
        if (this.showFlagSection && this.formState.s3_3.length === 0)     m.push('S3.3 Flag rationale');
        if (this.showFlagOther   && !this.formState.s3_4.trim())          m.push('S3.4 Other');
                if (this.showNotesSection && !this.formState.s5_1.trim())         m.push('S5.1 Notes for Reviewers');
        if (this.showReturnSection) {
    const selected = this.formState.selectedQuestions || [];
    if (selected.length === 0) {
        m.push('S3.5 Question Number(s) for Return');
    } else {
        const texts = this.formState.questionTexts || {};
        const emptyOnes = selected.filter(num => !(texts[num] && texts[num].trim()));
        if (emptyOnes.length > 0) {
            m.push(`Return reason for Q${emptyOnes.join(', Q')}`);
        }
    }
}
        if (!this.formState.s4_1)                                          m.push('S4.1 Source Channel');
        if (!this.formState.s4_2)                                          m.push('S4.2 Budget Range');
        return m;
    }

    get isSealDisabled() {
        return this.isSaving || this.missingFields.length > 0 || !this.formState.s3_1;
    }

    get footerStatus() {
        if (!this.formState.s3_1) return 'Pick a decision in Section 3 to enable submission.';
        if (this.missingFields.length === 0) {
            const labels = {
                [DECISION_PASS]   : 'Pass to Reviewers',
                [DECISION_RETURN] : 'Return to Applicant',
                [DECISION_FLAG]   : 'Flag and route to Reviewers'
            };
            return 'Ready to submit — decision: ' + labels[this.formState.s3_1];
        }
        return this.missingFields.length + ' required field(s) pending: '
            + this.missingFields.slice(0, 3).join(', ')
            + (this.missingFields.length > 3 ? ' +' + (this.missingFields.length - 3) + ' more' : '');
    }

    // ── Word counts ───────────────────────────────────────────────────────────
    wc(txt) { return txt ? txt.trim().split(/\s+/).filter(Boolean).length : 0; }
    get wordCount_s1_4() { return this.wc(this.formState.s1_4_text); }
    get wordCount_s2_3() { return this.wc(this.formState.s2_3_text); }
    get wordCount_s3_2() { return this.wc(this.formState.s3_2); }
    get wordCount_s3_4() { return this.wc(this.formState.s3_4); }
    get wordCount_s3_5() { return this.wc(this.formState.s3_5); }
    get wordCount_s5_1() { return this.wc(this.formState.s5_1); }

    // ── Static indicator classes ──────────────────────────────────────────────
    get s1_1_stateClass() { return 'wcf-auto-state wcf-auto-green'; }
    get s1_2_stateClass() {
        if (!this._attachments || this._attachments.length === 0) return 'wcf-auto-state wcf-auto-amber';
        return this.hasAttachments ? 'wcf-auto-state wcf-auto-green' : 'wcf-auto-state wcf-auto-amber';
    }
    get s1_3_stateClass() { return 'wcf-auto-state wcf-auto-green'; }
    get s1_1_icon()       { return '✓'; }
    get s1_1_message()    { return 'Mandatory fields check — verify against submitted form.'; }

    get selectedFlagReasons() {
    return this.formState.s3_3 || [];
}

    // ── Word count CSS classes ────────────────────────────────────────────────
    wcClass(field) {
        const limit = WORD_LIMITS[field];
        const count = this.wc(this.formState[field]);
        if (!limit) return 'wcf-char-count';
        if (count >= limit)                       return 'wcf-char-count wcf-wc-limit';
        if (count >= Math.floor(limit * 0.9))     return 'wcf-char-count wcf-wc-warn';
        return 'wcf-char-count';
    }

    get wcClass_s1_4() { return this.wcClass('s1_4_text'); }
    get wcClass_s2_3() { return this.wcClass('s2_3_text'); }
    get wcClass_s3_2() { return this.wcClass('s3_2'); }
    get wcClass_s3_4() { return this.wcClass('s3_4'); }
    get wcClass_s3_5() { return this.wcClass('s3_5'); }
    get wcClass_s5_1() { return this.wcClass('s5_1'); }

    // ── Time helpers ──────────────────────────────────────────────────────────
    // Returns a human-readable relative time string from an ISO date string
    _formatRelativeTime(isoString) {
        if (!isoString) return '';
        try {
            const diff = Date.now() - new Date(isoString).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1)  return 'just now';
            if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24)  return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
            const days = Math.floor(hrs / 24);
            return `${days} day${days === 1 ? '' : 's'} ago`;
        } catch (e) {
            return '';
        }
    }

    // Returns current time as a short readable string
    _formatNow() {
        return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
        }).format(new Date());
    }

    get savingLabel() {
    return this.isSaving ? 'Saving draft…' : '';
}

get sealButtonLabel() {
    return this.isSaving ? 'Sealing…' : 'Submit';
}
// Reuses APP_STATUS_FIELD, already wired via APP_FIELDS
get isReturnedByReviewer() {
    return this._appStatus === 'Returned to Validator';
}

get reviewerReturnComment() {
    return this._reviewerReturnComment;
}

get reviewerReturnDateFormatted() {
    if (!this._reviewerReturnDate) return null;
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(new Date(this._reviewerReturnDate));
}
}