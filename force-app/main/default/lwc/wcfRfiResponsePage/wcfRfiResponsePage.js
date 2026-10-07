import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getDynamicDraft from '@salesforce/apex/WCFFormEngineController.getDynamicDraft';
import resubmitDynamicApplication from '@salesforce/apex/WCFFormEngineController.resubmitDynamicApplication';
import deleteUploadedFile from '@salesforce/apex/WCFFormEngineController.deleteUploadedFile';
import searchHQLocation from '@salesforce/apex/OpenStreetMapService.searchLocation';
import getFormMetadata from '@salesforce/apex/WCFFormMetadataController.getFormMetadata';
import upsertAIFeedback from '@salesforce/apex/WCFFormController.upsertAIFeedback';
import getAIFeedbackRecord from '@salesforce/apex/WCFFormController.getAIFeedbackRecord';
// ═════════════════════════════════════════════════════════════════════════════
// Constants
// ═════════════════════════════════════════════════════════════════════════════

const CAPEX_HINT = 'Capital expenditure: money spent on lasting assets, such as equipment, vehicles, or premises.';
const OPEX_HINT = 'Operating expenditure: day-to-day running costs, such as salaries, rent, and program delivery.';

// Word limits — identical to the main application form (wcfDynamicForm)
const RICH_TEXT_LIMITS = {
    Legal_Structure__c: 100,
    Revenue_Explanation__c: 200,
    Skilling_Approach__c: 500,
    Job_Creation_Approach__c: 500,
    Livelihood_Approach__c: 500,
    Organizational_Sustainability__c: 100,
    Use_of_Additional_Funding__c: 200
};

const GENIE_TEXT_LIMIT = 200;
const MAX_Q24_SIZE = 10 * 1024 * 1024;
const MAX_Q28_SIZE = 50 * 1024 * 1024;
// ── AI Feedback (same mapping as wcfDynamicForm) ──
const AI_WAIT_MS = 6000;

const AI_MODAL_TITLES = {
    Legal_Structure__c: 'AI Feedback – Legal Structure',
    Revenue_Explanation__c: 'AI Feedback – Explanation of Deviation',
    Skilling_Approach__c: 'AI Feedback – Your Skilling Approach',
    Job_Creation_Approach__c: 'AI Feedback – Your Job Creation Approach',
    Livelihood_Approach__c: 'AI Feedback – Your Livelihood Upliftment Approach',
    Organizational_Sustainability__c: 'AI Feedback – Organizational Sustainability',
    Use_of_Additional_Funding__c: 'AI Feedback – Use of Additional Funds',
    Operational_Synergies_with_WOF__c: 'AI Feedback – Operational Synergies with GenieAI'
};

const AI_OUTPUT_FIELDS = {
    Legal_Structure__c: 'Legal_Structure_FR__c',
    Revenue_Explanation__c: 'Revenue_Explanation_FR__c',
    Skilling_Approach__c: 'Skilling_Approach_FR__c',
    Job_Creation_Approach__c: 'Job_Creation_Approach_FR__c',
    Livelihood_Approach__c: 'Livelihood_Approach_FR__c',
    Operational_Synergies_with_WOF__c: 'Operational_Synergies_with_WOF_FR__c',
    Organizational_Sustainability__c: 'Organizational_Sustainability_FR__c',
    Use_of_Additional_Funding__c: 'Use_of_Additional_Funding_FR__c'
};

const AI_SECTION_LABELS = ['Rating', 'Strengths', 'Weaknesses', 'Summary'];
/**
 * UI key  ->  Salesforce / legacy field names.
 * Used in two directions:
 *   1. On load: if the UI key is empty, back-fill it from the first non-empty alias
 *      (the draft service sometimes only returns the sObject field names).
 *   2. On resubmit: write the UI value to every alias, exactly like the main form's
 *      _syncCalculatedAndAliasFields(), so both key styles stay consistent.
 */
const FIELD_ALIASES = {
    // ── Q9 Historical financials ──
    START_FY3: ['CY3_Balance_Start_CFY_3__c'],
    REV_FY3: ['CY3_Revenue__c'],
    CAP_FY3: ['CY3_Capital_Expenditure__c'],
    OP_FY3: ['CY3_Operating_Expenditure__c'],
    REV_FY2: ['CY2_Revenue__c'],
    CAP_FY2: ['CY2_Capital_Expenditure__c'],
    OP_FY2: ['CY2_Operating_Expenditure__c'],
    REV_FY1: ['CY1_Revenue__c'],
    CAP_FY1: ['CY1_Capital_Expenditure__c'],
    OP_FY1: ['CY1_Operating_Expenditure__c'],

    // ── Q10 Current fiscal year ──
    CFY_REV_BUDGET: ['Revenue_Budget__c'],
    CFY_REV_PROJ: ['Revenue_Projection__c'],
    CFY_CAP_BUDGET: ['Capital_Expenditure_Budget__c'],
    CFY_CAP_PROJ: ['Capital_Expenditure_Projection__c'],
    CFY_OP_BUDGET: ['Operating_Expenditure_Budget__c'],
    CFY_OP_PROJ: ['Operating_Expenditure_Projection__c'],
    Revenue_Explanation__c: ['Explanation_of_Revenue_Deviation__c'],

    // ── Q13 / Q14 Job fulfillment ──
    JF_ENROLL_FY3: ['Projected_Learner_Enrollments_FY_3__c', 'Actual_Learner_Enrollments_FY_3__c'],
    JF_ENROLL_FY2: ['Projected_Learner_Enrollments_FY_2__c', 'Actual_Learner_Enrollments_FY_2__c'],
    JF_ENROLL_FY1: ['Projected_Learner_Enrollments_FY_1__c', 'Actual_Learner_Enrollments_FY_1__c'],
    JF_ENROLL_PROJ: ['Projected_Learner_Enrollments_CFY__c'],
    JF_PLACE_FY3: ['Projected_Learner_Placements_FY_3__c', 'Actual_Learner_Placements_FY_3__c'],
    JF_PLACE_FY2: ['Projected_Learner_Placements_FY_2__c', 'Actual_Learner_Placements_FY_2__c'],
    JF_PLACE_FY1: ['Projected_Learner_Placements_FY_1__c', 'Actual_Learner_Placements_FY_1__c'],
    JF_PLACE_PROJ: ['Projected_Learner_Placements_CFY__c'],
    JF_COST_FY3: ['Avg_Cost_per_Placement_FY_3__c', 'Manual_Avg_Cost_per_Placement_FY_3__c', 'Avg_Cost_per_Placement_FY3__c'],
    JF_COST_FY2: ['Avg_Cost_per_Placement_FY_2__c', 'Manual_Avg_Cost_per_Placement_FY_2__c', 'Avg_Cost_per_Placement_FY2__c'],
    JF_COST_FY1: ['Avg_Cost_per_Placement_FY_1__c', 'Manual_Avg_Cost_per_Placement_FY_1__c', 'Avg_Cost_per_Placement_FY1__c'],
    JF_COST_PROJ: ['Avg_Cost_per_Placement_CFY__c', 'Manual_Avg_Cost_per_Placement_CFY__c'],

    // ── Q17 / Q18 Job creation ──
    JC_NEW_BIZ_FY3: ['Projected_New_Businesses_FY_3__c'],
    JC_NEW_BIZ_FY2: ['Projected_New_Businesses_FY_2__c'],
    JC_NEW_BIZ_FY1: ['Projected_New_Businesses_FY_1__c'],
    JC_NEW_BIZ_PROJ: ['Projected_New_Businesses_CFY__c'],
    JC_NEW_JOBS_FY3: ['Projected_Jobs_from_New_Businesses_FY3__c', 'Jobs_from_New_Businesses_FY_3__c'],
    JC_NEW_JOBS_FY2: ['Projected_Jobs_from_New_Businesses_FY2__c', 'Jobs_from_New_Businesses_FY_2__c'],
    JC_NEW_JOBS_FY1: ['Projected_Jobs_from_New_Businesses_FY1__c', 'Jobs_from_New_Businesses_FY_1__c'],
    JC_NEW_JOBS_PROJ: ['Projected_Jobs_from_New_Businesses_CFY__c', 'Jobs_from_New_Businesses_CFY__c'],
    JC_EXIST_BIZ_FY3: ['Growing_Businesses_Supported_FY_3__c'],
    JC_EXIST_BIZ_FY2: ['Growing_Businesses_Supported_FY_2__c'],
    JC_EXIST_BIZ_FY1: ['Growing_Businesses_Supported_FY_1__c'],
    JC_EXIST_BIZ_PROJ: ['Growing_Businesses_Supported_CFY__c'],
    JC_EXIST_JOBS_FY3: ['Jobs_from_Growing_Businesses_FY_3__c'],
    JC_EXIST_JOBS_FY2: ['Jobs_from_Growing_Businesses_FY_2__c'],
    JC_EXIST_JOBS_FY1: ['Jobs_from_Growing_Businesses_FY_1__c'],
    JC_EXIST_JOBS_PROJ: ['Jobs_from_Growing_Businesses_CFY__c'],
    JC_COST_FY3: ['Avg_Cost_per_Job_FY_3__c', 'Manual_Avg_Cost_per_Job_FY_3__c'],
    JC_COST_FY2: ['Avg_Cost_per_Job_FY_2__c', 'Manual_Avg_Cost_per_Job_FY_2__c'],
    JC_COST_FY1: ['Avg_Cost_per_Job_FY_1__c', 'Manual_Avg_Cost_per_Job_FY_1__c'],
    JC_COST_PROJ: ['Avg_Cost_per_Job_CFY__c', 'Manual_Avg_Cost_per_Job_CFY__c'],

    // ── Q5 Compliance ──
    Has_501c3_Status__c: ['Do_you_have_a_US_501_c_3_organization__c'],
    Has_Equivalency_Determination__c: ['Have_you_cleared_Equivalency_Determinat__c'],
    Is_FCRA_Registered__c: ['Are_you_FCRA_exempted_compliant__c'],
    Willing_to_Pursue_ED__c: ['If_none_of_the_above_apply_would_you__c'],

    // ── Q24 Verification ──
    Q24_VERIFIED__c: [
        'Q24_VERIFIED',
        'Job_Verification_3rd_Party_CFY__c',
        'Job_Verification_3rd_Party_FY1__c',
        'X3rd_Party_Placement_Verification_CFY__c',
        'X3rd_Party_Placement_Verification_FY_1__c'
    ],
    Details_of_Ethical_Received__c: ['X3rd_Party_Verification_Description_FY_1__c']
};

// ── Q22 / Q23 Livelihood (UI key LIV_X_Y <-> field LIV_X_Y__c) ──
['SERVED', 'ENROLL', 'OUTCOME', 'COST'].forEach(metric => {
    ['FY3', 'FY2', 'FY1', 'PROJ'].forEach(sfx => {
        FIELD_ALIASES[`LIV_${metric}_${sfx}`] = [`LIV_${metric}_${sfx}__c`];
    });
});

const NUMERIC_KEYS = Object.keys(FIELD_ALIASES)
    .filter(k => /^(START|REV|CAP|OP|CFY|JF|JC|LIV)_/.test(k))
    .concat(['Funder_1_Amount__c', 'Funder_2_Amount__c', 'Funder_3_Amount__c']);
const NUMBER_LOCALE = 'en-US';   // 1,234,567 grouping. Keep in sync with wcfFormPreview.

const DATE_KEYS = new Set([
    'Incorporation_Date__c',
    ...[1, 2, 3].flatMap(i => [`Funder_${i}_Period_Start__c`, `Funder_${i}_Period_End__c`])
]);

const NUMERIC_SUBMIT_FIELDS = new Set([
    ...NUMERIC_KEYS,
    ...NUMERIC_KEYS.flatMap(k => FIELD_ALIASES[k] || []),
    'Leader_Tenure__c'
]);

const ROW_NUMERIC_FIELDS = {
    skilling: ['hours', 'duration', 'enrollment'],
    sector: ['enrollment'],
    program: ['manHours', 'enrollment'],
    community: ['fy3', 'fy2', 'fy1', 'proj']
};
const ROW_DATE_FIELDS = ['whenStarted', 'whenBegan'];

// Label-map keys used by the main form, so metadata overrides apply here too

// Label-map keys used by the main form, so metadata overrides apply here too
const TITLE_LABEL_KEYS = {
    Q2: 'SEC2_TITLE', Q3: 'SEC3_TITLE', Q4: 'SEC4_TITLE', Q5: 'SEC5_TITLE', Q6: 'SEC6_TITLE',
    Q7: 'Q7_TOP_FUNDERS', Q8: 'Q8_REFERENCES', Q9: 'Q9_HIST_FINANCIALS', Q10: 'Q10_CURRENT_FY',
    Q11: 'Q11_SKILLING_APPROACH', Q12: 'Q12_SKILLING_DOMAINS', Q13: 'Q13_JF_HIST_OUTCOMES',
    Q14: 'Q14_JF_PROJ_OUTCOMES', Q15: 'Q15_JOB_CREATION_APPROACH', Q16: 'Q16_BUSINESS_SECTORS',
    Q17: 'Q17_JC_HIST_OUTCOMES', Q18: 'Q18_JC_PROJ_OUTCOMES', Q19: 'Q19_LIVELIHOOD_APPROACH',
    Q20: 'Q20_LIVELIHOOD_PROGRAMS', Q21: 'Q21_COMMUNITIES_SERVED', Q22: 'Q22_LIVELIHOOD_ACTUALS',
    Q23: 'Q23_LIVELIHOOD_PROJ', Q24: 'Q24_INDEPENDENT_VERIFICATION', Q25: 'Q25_SUSTAINABILITY_PLAN',
    Q26: 'Q26_ADDITIONAL_FUNDING', Q27: 'Q27_GENIE_AI', Q28: 'Q28_SUPPORTING_DOCS'
};

const DEFAULT_TITLES = {
    Q1: 'Organizational Area(s) for Funding/Investment',
    Q2: 'Organizational Identifying Information',
    Q3: 'Submitter Contact Information',
    Q4: 'Legal Structure',
    Q5: 'Legal and Tax Compliance',
    Q6: 'Fiscal Year End Date',
    Q7: 'Top 3 Prominent Funders',
    Q8: 'Reference Contacts for Outreach',
    Q9: 'Historical Financial Performance',
    Q10: 'Current Fiscal Year Budget & Projections',
    Q11: 'Your Skilling Approach',
    Q12: 'Skilling Domains Offered',
    Q13: 'Job Fulfillment Outcomes — Last 3 Fiscal Years (Actuals)',
    Q14: 'Job Fulfillment Outcomes — Current FY Projections',
    Q15: 'Your Job Creation Approach',
    Q16: 'Business Sectors Served',
    Q17: 'Job Creation Outcomes — Last 3 Fiscal Years (Actuals)',
    Q18: 'Job Creation Outcomes — Current FY Projections',
    Q19: 'Your Livelihood Upliftment Approach',
    Q20: 'Your Key Programs / Initiatives',
    Q21: 'Communities that you work in',
    Q22: 'Livelihood Outcomes (Actuals)',
    Q23: 'Livelihood Outcomes, Current FY Projections',
    Q24: 'Independent Verification of Your Outcomes',
    Q25: 'Sustainability Plan',
    Q26: 'Direction for Additional Funding',
    Q27: 'Operational Synergies with GenieAI (Optional)',
    Q28: 'Supporting Documents (Optional)'
};

// Descriptions copied from the main form defaults (wcfDynamicForm._getDefaultLabels)
const DEFAULT_DESCRIPTIONS = {
    SEC6_DESC: 'When does your fiscal year close? This helps us align all financial and outcome metrics. (DD/MM/YYYY)',
    Q4_GOVERNANCE_DESC: 'Describe your governance structure and key governing bodies.',
    Q4_GOVERNANCE_HELPER: 'Briefly describe your governance and operational structure — board, leadership, key affiliations (<100 words).',
    Q7_TOP_FUNDERS_DESC: 'Optionally share up to three of your most prominent funders — the backers whose support is most material or most recognisable. All amounts in USD.',
    Q8_REFERENCES_DESC: 'Sharing 1-2 contacts who can speak to your work (funders, board members, partners, or peer leaders) gives us a valuable external reference point. This is optional; it is not required and will not affect your application.',
    Q9_HIST_FINANCIALS_DESC: 'Enter your historical figures across the three prior fiscal years. Starting balance for the earliest year and revenue/expense are inputs; year-end balances are computed automatically.',
    Q10_CURRENT_FY_DESC: 'Your current fiscal year budget, latest projection, and explanation of any deviation.',
    Q10_EXPLANATION_LABEL: 'Explanation of deviation',
    Q10_EXPLANATION_DESC: 'Required if total deviation is non-zero (combined revenue + expense; <200 words).',
    Q11_SKILLING_APPROACH_DESC: 'Tell us about your skilling work in roughly 500 words. If you run named programs, walk us through your top three (names, what they teach, who they serve). Cover your theory of change, the journey from learner enrollment to placement, and what makes your approach different from others.',
    Q12_SKILLING_DOMAINS_DESC: 'List the skilling domains your organization offers (one row each, minimum 1). For each: typical training hours, duration in months, when you started running it, and your annual enrollment.',
    Q13_JF_HIST_OUTCOMES_DESC: 'Enter your enrolment and placement actuals across the three most recent fiscal years. Placement % and average cost per placement are computed for you.',
    Q14_JF_PROJ_OUTCOMES_DESC: 'Enter your projected enrolment and placement numbers for the current fiscal year. These are forward-looking estimates. No verification block — projections aren\'t verifiable at submission.',
    Q15_JOB_CREATION_APPROACH_DESC: 'Tell us about your job creation work in roughly 500 words. Cover (i) your support model (capital, mentorship, business advisory, sector-specific TA, market linkages, etc.); (ii) your theory of change, the journey from engagement through to jobs created and sustained; (iii) what makes your approach different from others.',
    Q16_BUSINESS_SECTORS_DESC: 'List the business sectors in which you support entrepreneurs / Micro, Small, and Medium Enterprises. For each, tell us what type of support you provide, when you started supporting that sector, and your annual enrolment number.',
    Q17_JC_HIST_OUTCOMES_DESC: 'Enter your business creation and job creation actuals across the three most recent fiscal years. Total avg cost per job created is computed for you. Current FY projections are captured separately below.',
    Q18_JC_PROJ_OUTCOMES_DESC: 'Enter projected business and job-creation numbers for the current fiscal year. Forward-looking estimates; historical actuals are in the previous section.',
    Q19_LIVELIHOOD_APPROACH_DESC: 'Tell us about this work in roughly 500 words. Cover (i) who the beneficiary is and how they come to you; (ii) Describe your intervention either to help start a new business (and sustain it) or in helping grow their existing business towards helping them get family-sustaining incomes; (iii) the support that continues after any initial training, such as mentoring, market access, credit linkage or aggregation; (iv) what makes your approach different.',
    Q20_LIVELIHOOD_PROGRAMS_DESC: 'Tell us about your flagship programs and the type of interventions you offer. For each program / initative provide a view on what are the different interventions, how many man-hours do you spend with each beneficiary and how many beneficiaries typically enroll each year for each program.',
    Q21_COMMUNITIES_SERVED_DESC: 'Tell us where this program runs and how many households it reaches. Use the figures you already keep; we are not asking you to build anything new for this form.',
    Q23_LIVELIHOOD_PROJ_DESC: 'Projected figures for the current fiscal year. Forward-looking estimates; historical actuals are in the previous section.',
    Q24_INDEPENDENT_VERIFICATION_DESC: 'This applies to every applicant, whichever track you completed. If a third party has independently verified or evaluated the outcomes you reported, sharing the report strengthens your application; it is not required. If not, we will discuss verification together at the next stage.',
    Q25_SUSTAINABILITY_PLAN_DESC: 'How is your organization positioned to sustain its work over time? In about 100 words cover: (1) funding mix, main revenue sources; (2) programmatic resilience, dependence on any single program or contract; (3) funder concentration, reliance on one funder and how you manage that risk. A plain-language picture is all we need.',
    Q26_ADDITIONAL_FUNDING_DESC: 'Then, in words. If you were given a grant of USD 1 million a year, what would you do with it? In about 200 words, tell us how you would deploy it to scale your impact: program expansion, geographic scaling, new offerings, capacity-building, technology investment, and so on. Treat the figure as approximate; scale it to your own situation. We will work out specifics together at the next stage, so no detailed budget or M&E plan is needed here.',
    Q27_GENIE_AI_DESC: 'GenieAI is Wadhwani Foundation\'s AI platform for skilling, entrepreneurship, and government services. This is fully optional and never disqualifying — we want your honest signal. If you\'re open to exploring synergy, tell us how it could fit. If not, that\'s a complete and acceptable answer.',
    Q28_SUPPORTING_DOCS_DESC: 'If there\'s anything else you\'d like to share in support of your application, you may upload it here.'
};

const MONTH_NAME_MAP = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
    may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
    september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanTitle(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/^(\*?\s*Q\d+\s*:\s*|\*?\s*\d+\.\s*|\*\s*)/i, '').trim();
}

function buildDefaultFormValues() {
    const fv = {
        Fiscal_Month__c: '03',
        Fiscal_Day__c: '31',
        Organization_Name__c: '',
        Headquarters_City_and_Country__c: '',
        Primary_Service_Regions__c: '',
        Leader_Name__c: '',
        Leader_Title__c: '',
        Leader_Tenure__c: '',
        Submitter_Name__c: '',
        Job_Title__c: '',
        Work_Email_ID__c: '',
        Phone__c: '',
        WG_Phone_Country_Code__c: '+91',
        Legal_Type__c: '',
        Legal_Type_Other__c: '',
        Registration_Jurisdiction__c: '',
        Registration_Jurisdiction_Other__c: '',
        Incorporation_Date__c: '',
        Legal_Structure__c: '',
        Has_501c3_Status__c: '',
        Has_Equivalency_Determination__c: '',
        Is_FCRA_Registered__c: '',
        Willing_to_Pursue_ED__c: '',
        Revenue_Explanation__c: '',
        Skilling_Approach__c: '',
        Job_Creation_Approach__c: '',
        Livelihood_Approach__c: '',
        Organizational_Sustainability__c: '',
        Use_of_Additional_Funding__c: '',
        GenieAI_Interest_Level__c: '',
        Operational_Synergies_with_WOF__c: '',
        Q24_VERIFIED__c: '',
        Q24_REPORT_URL__c: '',
        Details_of_Ethical_Received__c: ''
    };
    [1, 2, 3].forEach(i => {
        ['Name', 'Amount', 'Period_Start', 'Period_End', 'Type'].forEach(p => { fv[`Funder_${i}_${p}__c`] = ''; });
    });
    [1, 2].forEach(i => {
        ['Name', 'Role', 'Email'].forEach(p => { fv[`Reference_${i}_${p}__c`] = ''; });
    });
    NUMERIC_KEYS.forEach(k => { if (fv[k] === undefined) fv[k] = ''; });
    return fv;
}

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

export default class WcfRfiResponsePage extends LightningElement {
    @api recordId;
    @api applicationName = '';
    @api questionReturnNotes = [];
    @api selectedLanguage = 'en_US';

    @track isLoading = true;
    @track isSaving = false;
    @track isSubmitted = false;

    @track selectedTracks = [];
    @track formValues = buildDefaultFormValues();

    @track skillingDomainRows = [];
    @track businessSectorRows = [];
    @track livelihoodProgramRows = [];
    @track communityRows = [];
    @track docRows = [];
    @track q24UploadedFiles = [];
    @track q28UploadedFiles = [];

    @track fiscalYears = {};
    @track labelMap = {};

    @track locationResults = [];
    @track showLocationDropdown = false;
    @track isSearchingLocation = false;
    searchTimeout = null;
    _uidCounter = 0;
        // ── AI Feedback modal state ──
    @track isAIModalOpen = false;
    @track aiModalTitle = 'AI Feedback';
    @track isAiLoading = false;
    @track aiResponse = '';
    _aiRequestSeq = 0;
    _aiTimeout = null;

    acceptedFileFormats = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
    pdfOnlyFormats = ['.pdf'];

    // ── Lifecycle ───────────────────────────────────────────────────────────
    connectedCallback() {
        this.loadApplicationData();
    }

    renderedCallback() {
        if (!this.isLoading && !this.isSubmitted) {
            this.restoreRichTextFields();
        }
    }

       disconnectedCallback() {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        if (this._aiTimeout) clearTimeout(this._aiTimeout);
    }

    async loadApplicationData() {
        this.isLoading = true;
        try {
            const result = await getDynamicDraft({ recordId: this.recordId });
            if (result && result.isSuccess) {
                if (result.selectedTracks && result.selectedTracks.length > 0) {
                    this.selectedTracks = [...result.selectedTracks];
                }

                const merged = { ...this.formValues, ...(result.formValues || {}) };
                this.formValues = this._hydrateFormValues(merged);

                this.skillingDomainRows = this._mapSkillingRows(result.skillingDomains);
                this.businessSectorRows = this._mapSectorRows(result.businessSectors);
                this.livelihoodProgramRows = this._mapProgramRows(result.livelihoodPrograms);
                this.communityRows = this._mapCommunityRows(result.communities);

                if (result.documents && result.documents.length > 0) {
                    this.docRows = [...result.documents];
                }
                if (result.q24Files && result.q24Files.length > 0) {
                    this.q24UploadedFiles = [...result.q24Files];
                }
                if (result.q28Files && result.q28Files.length > 0) {
                    this.q28UploadedFiles = [...result.q28Files];
                }

                await this._loadFiscalMetadata();
            } else {
                this.skillingDomainRows = this._mapSkillingRows([]);
                this.businessSectorRows = this._mapSectorRows([]);
                this.livelihoodProgramRows = this._mapProgramRows([]);
                this.communityRows = this._mapCommunityRows([]);
            }
        } catch (err) {
            console.error('Error loading dynamic draft for revision:', err);
        } finally {
            this.isLoading = false;
        }
    }

    async _loadFiscalMetadata() {
        try {
            const meta = await getFormMetadata({
                languageCode: this.selectedLanguage || 'en_US',
                fiscalMonth: this.formValues.Fiscal_Month__c || '03',
                fiscalDay: this.formValues.Fiscal_Day__c || '31'
            });
            if (meta && meta.fiscalYears) {
                this.fiscalYears = meta.fiscalYears;
            }
            if (meta && meta.labelMap) {
                this.labelMap = meta.labelMap;
            }
        } catch (err) {
            console.warn('Metadata load warning:', err);
        }
    }

    // ── Load-time normalisation ─────────────────────────────────────────────
    _hydrateFormValues(fv) {
        const out = { ...fv };

        // Back-fill UI keys from their Salesforce/legacy field names
        Object.keys(FIELD_ALIASES).forEach(uiKey => {
            if (this._isBlank(out[uiKey])) {
                const alias = FIELD_ALIASES[uiKey].find(a => !this._isBlank(out[a]));
                if (alias) out[uiKey] = out[alias];
            }
        });

        // Numbers are stored raw (no thousands separators)
        NUMERIC_KEYS.forEach(k => {
            out[k] = this._cleanNum(out[k]);
        });

        // Fiscal month -> '01'..'12', day -> '1'..'31' (same values as the main form)
        if (!this._isBlank(out.Fiscal_Month__c)) {
            let m = parseInt(out.Fiscal_Month__c, 10);
            if (isNaN(m)) m = MONTH_NAME_MAP[String(out.Fiscal_Month__c).toLowerCase().trim()];
            if (m) out.Fiscal_Month__c = String(m).padStart(2, '0');
        }
        if (!this._isBlank(out.Fiscal_Day__c)) {
            const d = parseInt(out.Fiscal_Day__c, 10);
            if (!isNaN(d)) out.Fiscal_Day__c = String(d);
        }

        // Q27 is a plain-text field; strip any HTML left by an older version of this page
        if (out.Operational_Synergies_with_WOF__c && /<[a-z][\s\S]*>/i.test(out.Operational_Synergies_with_WOF__c)) {
            out.Operational_Synergies_with_WOF__c = this.stripHtml(out.Operational_Synergies_with_WOF__c).trim();
        }

        // Null -> '' for simple bindings
        Object.keys(out).forEach(k => {
            if (out[k] === null || out[k] === undefined) out[k] = '';
        });

        return out;
    }

    _newUid() {
        this._uidCounter += 1;
        return `row-${Date.now()}-${this._uidCounter}`;
    }

    _newRowId() {
        this._uidCounter += 1;
        return Date.now() + this._uidCounter;
    }

    _mapSkillingRows(list) {
        if (!list || list.length === 0) return [this._blankSkillingRow()];
        return list.map((d, idx) => ({
            ...d,
            uid: this._newUid(),
            id: (d.id !== undefined && d.id !== null) ? d.id : idx + 1,
            name: d.name || '',
            hours: this._cleanNum(d.hours),
            duration: this._cleanNum(d.duration),
            whenStarted: d.whenStarted || '',
            enrollment: this._cleanNum(d.enrollment)
        }));
    }

    _mapSectorRows(list) {
        if (!list || list.length === 0) return [this._blankSectorRow()];
        return list.map((s, idx) => {
            let types = [];
            if (Array.isArray(s.supportTypes)) types = [...s.supportTypes];
            else if (typeof s.supportTypes === 'string' && s.supportTypes) types = s.supportTypes.split(';').map(t => t.trim()).filter(Boolean);
            else if (s.supportType) types = [s.supportType];
            return {
                ...s,
                uid: this._newUid(),
                id: (s.id !== undefined && s.id !== null) ? s.id : idx + 1,
                sector: s.sector || '',
                sectorOther: s.sectorOther || '',
                supportTypes: types,
                supportTypeOther: s.supportTypeOther || '',
                whenBegan: s.whenBegan || '',
                enrollment: this._cleanNum(s.enrollment)
            };
        });
    }

    _mapProgramRows(list) {
        if (!list || list.length === 0) return [this._blankProgramRow()];
        return list.map((lp, idx) => ({
            ...lp,
            uid: this._newUid(),
            id: (lp.id !== undefined && lp.id !== null) ? lp.id : idx + 1,
            name: lp.name || lp.programName || '',
            supportType: lp.supportType || lp.interventionType || '',
            manHours: this._cleanNum(lp.manHours),
            enrollment: this._cleanNum(!this._isBlank(lp.enrollment) ? lp.enrollment : lp.annualHouseholds)
        }));
    }

    _mapCommunityRows(list) {
        if (!list || list.length === 0) return [this._blankCommunityRow()];
        return list.map((c, idx) => ({
            ...c,
            uid: this._newUid(),
            id: (c.id !== undefined && c.id !== null) ? c.id : idx + 1,
            state: c.state || '',
            district: c.district || '',
            fy3: this._cleanNum(c.fy3),
            fy2: this._cleanNum(c.fy2),
            fy1: this._cleanNum(c.fy1),
            proj: this._cleanNum(c.proj)
        }));
    }

    _blankSkillingRow() {
        return { uid: this._newUid(), id: this._newRowId(), name: '', hours: '', duration: '', whenStarted: '', enrollment: '' };
    }
    _blankSectorRow() {
        return { uid: this._newUid(), id: this._newRowId(), sector: '', sectorOther: '', supportTypes: [], supportTypeOther: '', whenBegan: '', enrollment: '' };
    }
    _blankProgramRow() {
        return { uid: this._newUid(), id: this._newRowId(), name: '', supportType: '', manHours: '', enrollment: '' };
    }
    _blankCommunityRow() {
        return { uid: this._newUid(), id: this._newRowId(), state: '', district: '', fy3: '', fy2: '', fy1: '', proj: '' };
    }

        _rowsForSubmit(rows, numericFields) {
        return this._stripUi(rows).map(r => {
            const out = { ...r };
            numericFields.forEach(f => {
                const c = this._cleanNum(out[f]);
                out[f] = (c === '' || isNaN(Number(c))) ? null : c;
            });
            ROW_DATE_FIELDS.forEach(f => {
                if (f in out && this._isBlank(out[f])) out[f] = null;
            });
            return out;
        });
    }

        _stripUi(rows) {
        // eslint-disable-next-line no-unused-vars
        return (rows || []).map(({ uid, ...rest }) => rest);
    }

    // ── Generic helpers ─────────────────────────────────────────────────────
    _isBlank(v) {
        return v === undefined || v === null || String(v).trim() === '';
    }

    _cleanNum(v) {
        if (this._isBlank(v)) return '';
        return String(v).replace(/,/g, '').trim();
    }

    _num(v) {
        if (this._isBlank(v)) return 0;
        const n = Number(String(v).replace(/,/g, '').trim());
        return isNaN(n) ? 0 : n;
    }

    /** Formats a raw numeric string with thousands separators, preserving a partly-typed decimal. */
       _fmtNum(v) {
        if (this._isBlank(v)) return '';
        const s = String(v).replace(/,/g, '').trim();
        const m = s.match(/^(-?)(\d*)(\.\d*)?$/);
        if (!m) return s;
        let intPart = '';
        if (m[2]) intPart = Number(m[2]).toLocaleString(NUMBER_LOCALE, { maximumFractionDigits: 0 });
        else if (m[3]) intPart = '0';
        return `${m[1]}${intPart}${m[3] || ''}`;
    }

    _fmtComputed(n) {
        const num = Number(n);
        if (!Number.isFinite(num)) return '0';
        return num.toLocaleString(NUMBER_LOCALE, { maximumFractionDigits: 2 });
    }

    _pctValue(enrollKey, placeKey) {
        const e = this._num(this.formValues[enrollKey]);
        const p = this._num(this.formValues[placeKey]);
        return e > 0 ? ((p / e) * 100).toFixed(1) : '0.0';
    }

    _pctDisplay(enrollKey, placeKey) {
        return `${this._pctValue(enrollKey, placeKey)}%`;
    }

    _setField(field, value) {
        this.formValues = { ...this.formValues, [field]: value };
    }

    _lbl(key, fallback) {
        return (this.labelMap && this.labelMap[key]) ? this.labelMap[key] : fallback;
    }

    stripHtml(html) {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(String(html), 'text/html');
        return doc.body.textContent || '';
    }

    _countWords(value) {
        const text = this.stripHtml(value).replace(/\u00A0/g, ' ').trim();
        return text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
    }

    get todayDateString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    get minProgrammeStartDate() {
        return this.formValues.Incorporation_Date__c || '1900-01-01';
    }

    _fmtDate(v) {
        const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : (v || '');
    }

    // ── Tracks & numbering ──────────────────────────────────────────────────
    get hasJobFulfillmentTrack() {
        return (this.selectedTracks || []).includes('JOB_FULFILLMENT');
    }
    get hasJobCreationTrack() {
        return (this.selectedTracks || []).includes('JOB_CREATION');
    }
    get hasLivelihoodTrack() {
        return (this.selectedTracks || []).includes('LIVELIHOOD');
    }

    get qNum() {
        let n = 1;
        const map = {};
        for (let i = 1; i <= 10; i++) map[`Q${i}`] = n++;
        if (this.hasJobFulfillmentTrack) {
            for (let i = 11; i <= 14; i++) map[`Q${i}`] = n++;
        }
        if (this.hasJobCreationTrack) {
            for (let i = 15; i <= 18; i++) map[`Q${i}`] = n++;
        }
        if (this.hasLivelihoodTrack) {
            for (let i = 19; i <= 23; i++) map[`Q${i}`] = n++;
        }
        for (let i = 24; i <= 28; i++) map[`Q${i}`] = n++;
        return map;
    }

    get canonicalTitles() {
        const out = {};
        Object.keys(DEFAULT_TITLES).forEach(k => {
            const override = (this.labelMap && (this.labelMap[`${k}_TITLE`] || this.labelMap[TITLE_LABEL_KEYS[k]])) || '';
            out[k] = cleanTitle(override || DEFAULT_TITLES[k]);
        });
        return out;
    }

    get descriptions() {
        const d = key => this._lbl(key, DEFAULT_DESCRIPTIONS[key]);
        return {
            Q4GovLabel: cleanTitle(d('Q4_GOVERNANCE_DESC')),
            Q4GovHelper: d('Q4_GOVERNANCE_HELPER'),
            Q6: d('SEC6_DESC'),
            Q7: d('Q7_TOP_FUNDERS_DESC'),
            Q8: d('Q8_REFERENCES_DESC'),
            Q9: d('Q9_HIST_FINANCIALS_DESC'),
            Q10: d('Q10_CURRENT_FY_DESC'),
            Q10ExplLabel: cleanTitle(d('Q10_EXPLANATION_LABEL')),
            Q10ExplDesc: d('Q10_EXPLANATION_DESC'),
            Q11: d('Q11_SKILLING_APPROACH_DESC'),
            Q12: d('Q12_SKILLING_DOMAINS_DESC'),
            Q13: d('Q13_JF_HIST_OUTCOMES_DESC'),
            Q14: d('Q14_JF_PROJ_OUTCOMES_DESC'),
            Q15: d('Q15_JOB_CREATION_APPROACH_DESC'),
            Q16: d('Q16_BUSINESS_SECTORS_DESC'),
            Q17: d('Q17_JC_HIST_OUTCOMES_DESC'),
            Q18: d('Q18_JC_PROJ_OUTCOMES_DESC'),
            Q19: d('Q19_LIVELIHOOD_APPROACH_DESC'),
            Q20: d('Q20_LIVELIHOOD_PROGRAMS_DESC'),
            Q21: d('Q21_COMMUNITIES_SERVED_DESC'),
            Q23: d('Q23_LIVELIHOOD_PROJ_DESC'),
            Q24: d('Q24_INDEPENDENT_VERIFICATION_DESC'),
            Q25: d('Q25_SUSTAINABILITY_PLAN_DESC'),
            Q26: d('Q26_ADDITIONAL_FUNDING_DESC'),
            Q27: d('Q27_GENIE_AI_DESC'),
            Q28: d('Q28_SUPPORTING_DOCS_DESC')
        };
    }

    get fyLabels() {
        const f = this.fiscalYears || {};
        return {
            fy3: f.fy3Label || 'CFY-3',
            fy2: f.fy2Label || 'CFY-2',
            fy1: f.fy1Label || 'CFY-1'
        };
    }

    /** Same header the main form shows on Q14 ("FY-2026 (CFY) — Projection"). */
    get cfyProjectionHeader() {
        const cfy = this.fiscalYears && this.fiscalYears.cfyLabel;
        return cfy ? `${cfy} (CFY) — Projection` : 'FY-2026 (CFY) — Projection';
    }

    // ── Flagged questions ───────────────────────────────────────────────────
    get flaggedQuestions() {
        const qMap = this.qNum;
        const titles = this.canonicalTitles;
        const notes = this.questionReturnNotes || [];

        const numToKey = {};
        Object.keys(qMap).forEach(key => { numToKey[qMap[key]] = key; });

        const items = [];
        const seen = new Set();

        notes.forEach(note => {
            if (!note) return;
            const rawNum = Number(note.questionNum);
            let key = null;

            if (numToKey[rawNum]) {
                key = numToKey[rawNum];
            } else if (note.questionKey && qMap[note.questionKey]) {
                key = note.questionKey;
            } else if (qMap[`Q${rawNum}`]) {
                key = `Q${rawNum}`;
            }

            if (!key || seen.has(key)) return;
            seen.add(key);

            const table = this._tableFor(key);
            const item = {
                key,
                displayNumber: qMap[key] || rawNum,
                title: titles[key] || `Question ${qMap[key] || rawNum}`,
                returnText: note.returnText,
                table,
                hasTable: !!table
            };
            for (let i = 1; i <= 28; i++) item[`isQ${i}`] = key === `Q${i}`;
            items.push(item);
        });

        return items.sort((a, b) => a.displayNumber - b.displayNumber);
    }

    get hasFlaggedQuestions() {
        return this.flaggedQuestions.length > 0;
    }

    // ── Numeric tables (Q9, Q10, Q13, Q14, Q17, Q18, Q22, Q23) ──────────────
    // Rows, labels, auto-computed cells and currency prefixes mirror the main form exactly.
    _inputCell(key, colLabel, rowLabel, currency) {
        return {
            id: key,
            key,
            isInput: true,
            isComputed: false,
            isCurrency: !!currency,
            display: this._fmtNum(this.formValues[key]),
            ariaLabel: `${rowLabel} – ${colLabel}`,
            rowLabel,
            colLabel
        };
    }

    _computedCell(id, display, currency) {
        return { id, isInput: false, isComputed: true, isCurrency: !!currency, display };
    }

    _row(id, label, cells, opts = {}) {
        return {
            id,
            label,
            cells,
            required: !!opts.required,
            subtext: opts.subtext || '',
            rowClass: opts.total ? 'rfi-total-row' : ''
        };
    }

    _tableFor(key) {
        const fy = this.fyLabels;
        const histCols = [['FY3', fy.fy3], ['FY2', fy.fy2], ['FY1', fy.fy1]];
        const histHeaders = histCols.map(([id, label]) => ({ id, label }));

        const histRow = (id, label, prefix, opts = {}) =>
            this._row(id, label, histCols.map(([sfx, col]) => this._inputCell(`${prefix}_${sfx}`, col, label, opts.currency)), opts);

        const projRow = (colLabel) => (id, label, prefix, opts = {}) =>
            this._row(id, label, [this._inputCell(`${prefix}_PROJ`, colLabel, label, opts.currency)], opts);

        switch (key) {
            case 'Q9':
                return {
                    headers: histHeaders,
                    rows: [
                        this._row('start', 'Balance at Start of Year', [
                            this._inputCell('START_FY3', fy.fy3, 'Balance at Start of Year', true),
                            this._computedCell('start-fy2', this._fmtComputed(this.cy3BalanceEnd), true),
                            this._computedCell('start-fy1', this._fmtComputed(this.cy2BalanceEnd), true)
                        ], { subtext: 'Earliest year only — chains forward automatically.' }),
                        histRow('rev', 'Revenue', 'REV', { currency: true }),
                        histRow('cap', 'Capital expenditure', 'CAP', { currency: true, subtext: CAPEX_HINT }),
                        histRow('op', 'Operating expenditure', 'OP', { currency: true, subtext: OPEX_HINT }),
                        this._row('end', 'Balance at End of Year', [
                            this._computedCell('end-fy3', this._fmtComputed(this.cy3BalanceEnd), true),
                            this._computedCell('end-fy2', this._fmtComputed(this.cy2BalanceEnd), true),
                            this._computedCell('end-fy1', this._fmtComputed(this.cy1BalanceEnd), true)
                        ], { subtext: 'Auto-computed = Start + Revenue - Expense', total: true })
                    ]
                };

            case 'Q10': {
                const cfyRow = (id, label, prefix, deviation, subtext) => this._row(id, label, [
                    this._inputCell(`${prefix}_BUDGET`, 'Budget', label, true),
                    this._inputCell(`${prefix}_PROJ`, 'Projection', label, true),
                    this._computedCell(`${id}-dev`, this._fmtComputed(deviation), true)
                ], { subtext });
                return {
                    headers: [
                        { id: 'budget', label: 'Budget' },
                        { id: 'proj', label: 'Projection' },
                        { id: 'dev', label: 'Deviation (auto-computed: Projection – Budget)' }
                    ],
                    rows: [
                        cfyRow('rev', 'Revenue', 'CFY_REV', this.cfyRevenueVariance),
                        cfyRow('cap', 'Capital expenditure', 'CFY_CAP', this.cfyCapexVariance, CAPEX_HINT),
                        cfyRow('op', 'Operating expenditure', 'CFY_OP', this.cfyOpexVariance, OPEX_HINT),
                        this._row('net', 'Revenue - Expense', [
                            this._computedCell('net-budget', this._fmtComputed(this.cfyNetBudget), true),
                            this._computedCell('net-proj', this._fmtComputed(this.cfyNetProj), true),
                            this._computedCell('net-dev', this._fmtComputed(this.cfyNetVariance), true)
                        ], { subtext: 'Auto-computed', total: true })
                    ]
                };
            }

            case 'Q13':
                return {
                    headers: histHeaders,
                    rows: [
                        histRow('enroll', '# Learner Enrolments', 'JF_ENROLL', { required: true }),
                        histRow('place', '# of learner placements', 'JF_PLACE', { required: true }),
                        this._row('pct', 'Placement %', histCols.map(([sfx]) =>
                            this._computedCell(`pct-${sfx}`, this._pctDisplay(`JF_ENROLL_${sfx}`, `JF_PLACE_${sfx}`), false)
                        ), { subtext: 'Auto-computed' }),
                        histRow('cost', 'Avg Cost per Placement', 'JF_COST', {
                            required: true, currency: true,
                            subtext: 'Formula: (training + placement expense) ÷ people placed'
                        })
                    ]
                };

            case 'Q14': {
                const col = this.cfyProjectionHeader;
                const pr = projRow(col);
                return {
                    headers: [{ id: 'proj', label: col }],
                    rows: [
                        pr('enroll', '# Learner Enrolments', 'JF_ENROLL', { required: true }),
                        pr('place', '# of learner placements', 'JF_PLACE', { required: true }),
                        this._row('pct', 'Placement %', [
                            this._computedCell('pct-proj', this._pctDisplay('JF_ENROLL_PROJ', 'JF_PLACE_PROJ'), false)
                        ], { subtext: 'Auto-computed' }),
                        pr('cost', 'Avg Cost per Placement', 'JF_COST', {
                            required: true, currency: true,
                            subtext: 'Formula: (training + placement expense) ÷ people placed'
                        })
                    ]
                };
            }

            case 'Q17':
                return {
                    headers: histHeaders,
                    rows: [
                        histRow('newbiz', '# New Businesses Started', 'JC_NEW_BIZ', { required: true }),
                        histRow('newjobs', '# jobs created by new businesses', 'JC_NEW_JOBS', { required: true }),
                        histRow('existbiz', 'Existing Businesses Supported', 'JC_EXIST_BIZ', { required: true }),
                        histRow('existjobs', '# jobs created by existing businesses', 'JC_EXIST_JOBS', { required: true }),
                        histRow('cost', 'Total Avg Cost per Job Created', 'JC_COST', {
                            required: true, currency: true, subtext: 'Formula: program expense ÷ jobs created'
                        })
                    ]
                };

            case 'Q18': {
                const col = 'CFY (projected)';
                const pr = projRow(col);
                return {
                    headers: [{ id: 'proj', label: col }],
                    rows: [
                        pr('newbiz', '# New Businesses Started', 'JC_NEW_BIZ', { required: true }),
                        pr('newjobs', '# jobs created by new businesses', 'JC_NEW_JOBS', { required: true }),
                        pr('existbiz', 'Existing Businesses Supported', 'JC_EXIST_BIZ', { required: true }),
                        pr('existjobs', '# jobs created by existing businesses', 'JC_EXIST_JOBS', { required: true }),
                        pr('cost', 'Total Avg Cost per Job Created', 'JC_COST', {
                            required: true, currency: true, subtext: 'Formula: program expense ÷ jobs created'
                        })
                    ]
                };
            }

            case 'Q22':
                return {
                    headers: histHeaders,
                    rows: [
                        histRow('served', 'Households served during the year', 'LIV_SERVED', { required: true }),
                        histRow('enroll', 'Households newly enrolled during the year', 'LIV_ENROLL', { required: true }),
                        histRow('outcome', 'Households meeting outcome criteria', 'LIV_OUTCOME', { required: true }),
                        histRow('cost', 'Avg. cost per outcome (USD)', 'LIV_COST', {
                            required: true, currency: true, subtext: 'Formula: program expense ÷ outcomes achieved'
                        })
                    ]
                };

            case 'Q23': {
                const col = 'CFY (projected)';
                const pr = projRow(col);
                return {
                    headers: [{ id: 'proj', label: col }],
                    rows: [
                        pr('served', 'Households served during the year (projected)', 'LIV_SERVED', { required: true }),
                        pr('enroll', 'Households newly enrolled during the year (projected)', 'LIV_ENROLL', { required: true }),
                        pr('outcome', 'Households expected to meet outcome criteria (projected)', 'LIV_OUTCOME', { required: true }),
                        pr('cost', 'Avg. cost per outcome (USD) - projected', 'LIV_COST', {
                            required: true, currency: true, subtext: 'Formula: program expense ÷ outcomes achieved'
                        })
                    ]
                };
            }

            default:
                return null;
        }
    }

    // ── Computed financials ─────────────────────────────────────────────────
    get cy3BalanceEnd() {
        const f = this.formValues;
        return this._num(f.START_FY3) + this._num(f.REV_FY3) - (this._num(f.CAP_FY3) + this._num(f.OP_FY3));
    }
    get cy2BalanceEnd() {
        const f = this.formValues;
        return this.cy3BalanceEnd + this._num(f.REV_FY2) - (this._num(f.CAP_FY2) + this._num(f.OP_FY2));
    }
    get cy1BalanceEnd() {
        const f = this.formValues;
        return this.cy2BalanceEnd + this._num(f.REV_FY1) - (this._num(f.CAP_FY1) + this._num(f.OP_FY1));
    }
    get cfyRevenueVariance() {
        return this._num(this.formValues.CFY_REV_PROJ) - this._num(this.formValues.CFY_REV_BUDGET);
    }
    get cfyCapexVariance() {
        return this._num(this.formValues.CFY_CAP_PROJ) - this._num(this.formValues.CFY_CAP_BUDGET);
    }
    get cfyOpexVariance() {
        return this._num(this.formValues.CFY_OP_PROJ) - this._num(this.formValues.CFY_OP_BUDGET);
    }
    get cfyNetBudget() {
        const f = this.formValues;
        return this._num(f.CFY_REV_BUDGET) - (this._num(f.CFY_CAP_BUDGET) + this._num(f.CFY_OP_BUDGET));
    }
    get cfyNetProj() {
        const f = this.formValues;
        return this._num(f.CFY_REV_PROJ) - (this._num(f.CFY_CAP_PROJ) + this._num(f.CFY_OP_PROJ));
    }
    get cfyNetVariance() {
        return this.cfyNetProj - this.cfyNetBudget;
    }
    get isDeviationExplanationRequired() {
        return this.cfyRevenueVariance !== 0 || this.cfyCapexVariance !== 0
            || this.cfyOpexVariance !== 0 || this.cfyNetVariance !== 0;
    }

    // ── Field handlers ──────────────────────────────────────────────────────
    handleFieldChange(event) {
        const target = event.currentTarget || event.target;
        const field = target?.dataset?.field;
        if (!field) return;
        const value = (event.detail && event.detail.value !== undefined) ? event.detail.value : event.target.value;

        const patch = { [field]: value };
        if (field === 'Legal_Type__c' && value !== 'Other') patch.Legal_Type_Other__c = '';
        if (field === 'Registration_Jurisdiction__c' && value !== 'Other') patch.Registration_Jurisdiction_Other__c = '';
        if (field === 'GenieAI_Interest_Level__c' && value !== 'Yes, interested' && value !== 'Maybe, want to learn more') {
            patch.Operational_Synergies_with_WOF__c = '';
        }
        this.formValues = { ...this.formValues, ...patch };

        if (field === 'Incorporation_Date__c' && typeof event.target.setCustomValidity === 'function') {
            event.target.setCustomValidity(value && value > this.todayDateString ? 'Incorporation Date cannot be a future date.' : '');
            event.target.reportValidity();
        }
    }

    /** Numeric text inputs: display with commas, store raw. */
    handleNumericChange(event) {
        const field = event.target?.dataset?.field;
        if (!field) return;
        const raw = (event.detail && event.detail.value !== undefined) ? event.detail.value : event.target.value;
        const clean = this._cleanNum(raw);
        this._setField(field, clean);

        let msg = '';
        if (clean !== '' && clean !== '.' && isNaN(Number(clean))) msg = 'Please enter a valid number.';
        else if (clean !== '' && Number(clean) < 0) msg = 'Value cannot be negative.';
        if (typeof event.target.setCustomValidity === 'function') {
            event.target.setCustomValidity(msg);
            event.target.reportValidity();
        }
    }

    // ── Q1 Track cards (read-only) ──────────────────────────────────────────
    get trackCards() {
        const sel = this.selectedTracks || [];
        return [
            { code: 'JOB_FULFILLMENT', label: 'Job Fulfillment (Skilling and Placement)' },
            { code: 'JOB_CREATION', label: 'Job Creation (SME / Enterprise Support)' },
            { code: 'LIVELIHOOD', label: 'Livelihood Upliftment' }
        ].map(t => ({
            ...t,
            isSelected: sel.includes(t.code),
            cssClass: sel.includes(t.code) ? 'rfi-track-card rfi-track-card--selected' : 'rfi-track-card'
        }));
    }

    // ── Q2 HQ location autocomplete ─────────────────────────────────────────
    handleLocationInput(event) {
        const query = event.detail?.value ?? event.target.value ?? '';
        this._setField('Headquarters_City_and_Country__c', query);
        if (this.searchTimeout) clearTimeout(this.searchTimeout);

        if (!query || query.trim().length < 2) {
            this.locationResults = [];
            this.showLocationDropdown = false;
            this.isSearchingLocation = false;
            return;
        }

        this.isSearchingLocation = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.searchTimeout = setTimeout(() => this._fetchLocations(query), 300);
    }

    async _fetchLocations(query) {
        try {
            const response = await searchHQLocation({ query });
            // The Apex service returns a GeoJSON string (same as the main form)
            const data = typeof response === 'string' ? JSON.parse(response) : response;
            const features = Array.isArray(data) ? data : ((data && data.features) || []);
            const typed = query.split(',')[0].toLowerCase().trim();
            const seen = new Set();
            const results = [];

            features.forEach(feature => {
                const props = feature.properties || feature;
                const city = props.name || props.city || props.label;
                if (!city) return;
                const lc = String(city).toLowerCase();
                if (typed && !lc.startsWith(typed) && !lc.includes(typed)) return;

                const country = props.country || '';
                const value = [city, country].filter(Boolean).join(', ');
                if (seen.has(value)) return;
                seen.add(value);
                results.push({
                    value,
                    label: city,
                    subDisplay: [props.state, country].filter(Boolean).join(', ')
                });
            });

            this.locationResults = results;
            this.showLocationDropdown = results.length > 0;
        } catch (err) {
            console.error('Error fetching HQ locations:', err);
            this.locationResults = [];
            this.showLocationDropdown = false;
        } finally {
            this.isSearchingLocation = false;
        }
    }

    handleSelectLocation(event) {
        const val = event.currentTarget.dataset.value;
        this._setField('Headquarters_City_and_Country__c', val);
        this.showLocationDropdown = false;
        this.locationResults = [];
    }

    handleLocationBlur() {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => { this.showLocationDropdown = false; }, 200);
    }

    _validateHQ(value) {
        const trimmed = String(value || '').trim();
        if (!trimmed) return 'Headquarters City and Country is required.';
        const parts = trimmed.split(',').map(p => p.trim());
        if (parts.length !== 2 || parts.some(p => p === '')) {
            return 'Please enter exactly one city and one country separated by a comma (e.g., "Chennai, India").';
        }
        if (!/[a-zA-Z]/.test(parts[0])) return 'Please enter a valid city name.';
        if (!/[a-zA-Z]/.test(parts[1])) return 'Please enter a valid country name.';
        return null;
    }

    // ── Q6 Fiscal year ──────────────────────────────────────────────────────
    get fiscalMonthOptions() {
        return [
            { label: 'January', value: '01' }, { label: 'February', value: '02' },
            { label: 'March', value: '03' }, { label: 'April', value: '04' },
            { label: 'May', value: '05' }, { label: 'June', value: '06' },
            { label: 'July', value: '07' }, { label: 'August', value: '08' },
            { label: 'September', value: '09' }, { label: 'October', value: '10' },
            { label: 'November', value: '11' }, { label: 'December', value: '12' }
        ];
    }

    _daysInMonth(month) {
        const m = parseInt(month, 10);
        if ([4, 6, 9, 11].includes(m)) return 30;
        if (m === 2) return 29;
        return 31;
    }

    get fiscalDayOptions() {
        const max = this._daysInMonth(this.formValues.Fiscal_Month__c || '03');
        const opts = [];
        for (let d = 1; d <= max; d++) {
            opts.push({ label: String(d).padStart(2, '0'), value: String(d) });
        }
        return opts;
    }

    handleFiscalMonthChange(event) {
        const month = event.detail.value;
        const max = this._daysInMonth(month);
        let day = this.formValues.Fiscal_Day__c;
        if (parseInt(day, 10) > max) day = String(max);
        this.formValues = { ...this.formValues, Fiscal_Month__c: month, Fiscal_Day__c: day };
        this._loadFiscalMetadata();
    }

    handleFiscalDayChange(event) {
        this._setField('Fiscal_Day__c', event.detail.value);
        this._loadFiscalMetadata();
    }

    // ── Picklists ───────────────────────────────────────────────────────────
    get yesNoOptions() {
        return [
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' }
        ];
    }

    get yesNoNotApplicableOptions() {
        return [
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' },
            { label: 'Not Applicable', value: 'Not Applicable' }
        ];
    }

    get legalTypeOptions() {
        return [
            { label: '— Select type —', value: '' },
            { label: 'Non-profit', value: 'Non-profit' },
            { label: 'For-profit', value: 'For-profit' },
            { label: 'Hybrid', value: 'Hybrid' },
            { label: 'Government-affiliated', value: 'Government-affiliated' },
            { label: 'Other', value: 'Other' }
        ];
    }

    get countryOptions() {
        return [
            { label: '— Select country —', value: '' },
            { label: 'Brazil', value: 'Brazil' },
            { label: 'Egypt', value: 'Egypt' },
            { label: 'India', value: 'India' },
            { label: 'Indonesia', value: 'Indonesia' },
            { label: 'Mexico', value: 'Mexico' },
            { label: 'Philippines', value: 'Philippines' },
            { label: 'United States', value: 'United States' },
            { label: 'Other', value: 'Other' }
        ];
    }

    get isLegalTypeOther() {
        return this.formValues.Legal_Type__c === 'Other';
    }

    get isRegistrationJurisdictionOther() {
        return this.formValues.Registration_Jurisdiction__c === 'Other';
    }

    get funderTypeOptions() {
        return [
            { label: '— Select —', value: '' },
            { label: 'Grant', value: 'Grant' },
            { label: 'Loan', value: 'Loan' },
            { label: 'Equity', value: 'Equity' },
            { label: 'In-Kind', value: 'In-Kind' }
        ];
    }

    get funderAmounts() {
        return {
            f1: this._fmtNum(this.formValues.Funder_1_Amount__c),
            f2: this._fmtNum(this.formValues.Funder_2_Amount__c),
            f3: this._fmtNum(this.formValues.Funder_3_Amount__c)
        };
    }

    get genieAIOptions() {
        return [
            { label: 'Yes, interested', value: 'Yes, interested' },
            { label: 'Maybe, want to learn more', value: 'Maybe, want to learn more' },
            { label: 'Not at this time', value: 'Not at this time' }
        ];
    }

    get showSynergiesTextBox() {
        const v = this.formValues.GenieAI_Interest_Level__c;
        return v === 'Yes, interested' || v === 'Maybe, want to learn more';
    }

    get genieWordCountDisplay() {
        return `${this._countWords(this.formValues.Operational_Synergies_with_WOF__c)} / ${GENIE_TEXT_LIMIT} words`;
    }

    get genieWordCountClass() {
        return this._countWords(this.formValues.Operational_Synergies_with_WOF__c) > GENIE_TEXT_LIMIT
            ? 'rfi-word-count rfi-word-count--over' : 'rfi-word-count';
    }

    // ── Rich text ───────────────────────────────────────────────────────────
    handleRichTextInput(event) {
        const field = event.currentTarget.dataset.field;
        if (field) this._setField(field, event.currentTarget.innerHTML);
    }

    handlePaste(event) {
        event.preventDefault();
        const el = event.currentTarget;
        const text = (event.clipboardData || window.clipboardData).getData('text/plain');
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        selection.deleteFromDocument();
        const range = selection.getRangeAt(0);
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        if (el && el.dataset.field) this._setField(el.dataset.field, el.innerHTML);
    }

    restoreRichTextFields() {
        const active = this.template.activeElement;
        this.template.querySelectorAll('div[contenteditable="true"][data-field]').forEach(el => {
            if (el === active) return;
            const value = this.formValues[el.dataset.field] || '';
            if (el.innerHTML !== value) el.innerHTML = value;
        });
    }

    _syncRichTextFromDom() {
        const updates = {};
        this.template.querySelectorAll('div[contenteditable="true"][data-field]').forEach(el => {
            updates[el.dataset.field] = el.innerHTML;
        });
        if (Object.keys(updates).length) {
            this.formValues = { ...this.formValues, ...updates };
        }
    }

    get wordCountDisplay() {
        const out = {};
        Object.keys(RICH_TEXT_LIMITS).forEach(f => {
            out[f] = `${this._countWords(this.formValues[f])} / ${RICH_TEXT_LIMITS[f]} words`;
        });
        return out;
    }

    get wordCountClass() {
        const out = {};
        Object.keys(RICH_TEXT_LIMITS).forEach(f => {
            out[f] = this._countWords(this.formValues[f]) > RICH_TEXT_LIMITS[f]
                ? 'rfi-word-count rfi-word-count--over' : 'rfi-word-count';
        });
        return out;
    }

    preventFocusLoss(event) {
        // Keeps the caret/selection inside the editor when a toolbar button is pressed
        event.preventDefault();
    }

    handleBold() { document.execCommand('bold', false, null); }
    handleItalic() { document.execCommand('italic', false, null); }
    handleUnderline() { document.execCommand('underline', false, null); }

        // ── AI Feedback ─────────────────────────────────────────────────────────
    handleAIClick(event) {
        const fieldApiName = event.currentTarget.dataset.id;
        if (!fieldApiName || this.isAiLoading) return;

        const submitterName = this.formValues.Submitter_Name__c || '';
        if (!submitterName) {
            this._toast('Missing Info', 'Submitter Name is missing on this application, so AI Feedback cannot be used.', 'warning');
            return;
        }

        // Take the live editor content and keep formValues in sync
        let fieldValue = this.formValues[fieldApiName] || '';
        const rtEl = this.template.querySelector(`div[contenteditable="true"][data-field="${fieldApiName}"]`);
        if (rtEl) {
            fieldValue = rtEl.innerHTML;
            this._setField(fieldApiName, fieldValue);
        }

        const plain = this.stripHtml(fieldValue).replace(/\u00A0/g, ' ').trim();
        if (!plain) {
            this._toast('Empty Field', 'Please write something in this field before requesting AI feedback.', 'warning');
            return;
        }

        // Q4 gets legal type / jurisdiction as context (same as the main form)
        if (fieldApiName === 'Legal_Structure__c') {
            const fv = this.formValues;
            let legalType = fv.Legal_Type__c || '';
            if (legalType === 'Other') legalType += ' ' + (fv.Legal_Type_Other__c || '');
            let jurisdiction = fv.Registration_Jurisdiction__c || '';
            if (jurisdiction === 'Other') jurisdiction += ' ' + (fv.Registration_Jurisdiction_Other__c || '');
            fieldValue = ' Legal Type: ' + legalType + ' Registration Jurisdiction: ' + jurisdiction + ' ' + fieldValue;
        }

        const seq = ++this._aiRequestSeq;
        if (this._aiTimeout) clearTimeout(this._aiTimeout);

        this.aiModalTitle = AI_MODAL_TITLES[fieldApiName] || 'AI Feedback – Legal Structure';
        this.aiResponse = '';
        this.isAiLoading = true;
        this.isAIModalOpen = true;

        upsertAIFeedback({ fieldApiName, fieldValue, submitterName })
            .then(() => {
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                this._aiTimeout = setTimeout(() => {
                    this._loadAIFeedback(fieldApiName, submitterName, seq);
                }, AI_WAIT_MS);
            })
            .catch(err => {
                console.error('Apex upsertAIFeedback call failed:', err);
                if (seq !== this._aiRequestSeq) return;
                this.aiResponse = 'Error generating AI feedback.';
                this.isAiLoading = false;
            });
    }

    _loadAIFeedback(fieldApiName, submitterName, seq) {
        getAIFeedbackRecord({ submitterName })
            .then(result => {
                if (seq !== this._aiRequestSeq) return; // modal closed / newer request
                const outField = AI_OUTPUT_FIELDS[fieldApiName] || 'Legal_Structure_FR__c';
                this.aiResponse = (result && result[outField]) || 'No feedback available yet.';
                this.isAiLoading = false;
            })
            .catch(err => {
                console.error('Failed to load AI feedback:', err);
                if (seq !== this._aiRequestSeq) return;
                this.aiResponse = 'Error loading AI feedback.';
                this.isAiLoading = false;
            });
    }

    closeAIModal() {
        this._aiRequestSeq += 1; // invalidates any pending callback
        if (this._aiTimeout) clearTimeout(this._aiTimeout);
        this.isAIModalOpen = false;
        this.aiResponse = '';
        this.isAiLoading = false;
    }

    get formattedAiSections() {
        const text = this.aiResponse;
        if (!text) return [];

        const pattern = new RegExp(`(${AI_SECTION_LABELS.join('|')})\\s*:?`, 'gi');
        const parts = text.split(pattern).filter(p => p !== undefined && p.trim() !== '');
        const toPoints = body => body
            .split(/\n|(?<=\.)\s+(?=[A-Z])/)
            .map(s => s.replace(/^[-•*]\s*/, '').trim())
            .filter(Boolean)
            .map((t, i) => ({ id: `p-${i}`, text: t }));

        const sections = [];
        for (let i = 0; i < parts.length; i++) {
            const label = AI_SECTION_LABELS.find(l => l.toLowerCase() === parts[i].trim().toLowerCase());
            if (label) {
                sections.push({ id: `s-${sections.length}`, title: label, points: toPoints(parts[i + 1] || '') });
                i++;
            }
        }

        if (sections.length === 0 && text.trim()) {
            sections.push({ id: 's-0', title: 'Feedback', points: toPoints(text) });
        }
        return sections;
    }

    // ── Q12 Skilling domains ────────────────────────────────────────────────
    get skillingDomainRowsIndexed() {
        return (this.skillingDomainRows || []).map((r, i) => ({ ...r, displayIdx: i + 1 }));
    }
    get canRemoveSkillingDomainRow() {
        return this.skillingDomainRows.length > 1;
    }
    handleAddSkillingDomain() {
        this.skillingDomainRows = [...this.skillingDomainRows, this._blankSkillingRow()];
    }
    handleRemoveSkillingDomain(event) {
        const uid = event.currentTarget.dataset.uid;
        const rows = this.skillingDomainRows.filter(r => r.uid !== uid);
        this.skillingDomainRows = rows.length ? rows : [this._blankSkillingRow()];
    }
    handleSkillingDomainChange(event) {
        const { uid, field } = event.currentTarget.dataset;
        const value = event.target.value;
        this.skillingDomainRows = this.skillingDomainRows.map(r => (r.uid === uid ? { ...r, [field]: value } : r));
    }

    // ── Q16 Business sectors ────────────────────────────────────────────────
    get sectorDropdownOptions() {
        return [
            { label: '— Select —', value: '' },
            { label: 'Agriculture and allied', value: 'Agriculture and allied' },
            { label: 'Manufacturing', value: 'Manufacturing' },
            { label: 'Textiles and apparel', value: 'Textiles and apparel' },
            { label: 'Automotive', value: 'Automotive' },
            { label: 'Construction and real estate', value: 'Construction and real estate' },
            { label: 'Retail and trade', value: 'Retail and trade' },
            { label: 'IT and technology services', value: 'IT and technology services' },
            { label: 'Financial services', value: 'Financial services' },
            { label: 'Healthcare', value: 'Healthcare' },
            { label: 'Education and training', value: 'Education and training' },
            { label: 'Hospitality and tourism', value: 'Hospitality and tourism' },
            { label: 'Logistics and transport', value: 'Logistics and transport' },
            { label: 'Energy and environment', value: 'Energy and environment' },
            { label: 'Media and creative', value: 'Media and creative' },
            { label: 'Other', value: 'Other' }
        ];
    }

    get supportTypeOptionsList() {
        return [
            { value: 'Capital', label: 'Capital' },
            { value: 'Mentorship', label: 'Mentorship' },
            { value: 'Business Advisory', label: 'Business Advisory' },
            { value: 'Market Linkages', label: 'Market Linkages' },
            { value: 'Sector Technical Assistance', label: 'Sector Technical Assistance' },
            { value: 'Other', label: 'Other' }
        ];
    }

    get businessSectorRowsIndexed() {
        const supportOpts = this.supportTypeOptionsList;
        const sectorOpts = this.sectorDropdownOptions;
        return (this.businessSectorRows || []).map((row, index) => {
            const types = Array.isArray(row.supportTypes) ? row.supportTypes : [];
            return {
                ...row,
                displayIdx: index + 1,
                sectorOptions: sectorOpts.map(o => ({ ...o, isSelected: o.value === row.sector })),
                isOtherSector: row.sector === 'Other',
                showSupportTypeOther: types.includes('Other'),
                supportTypeChips: supportOpts.map(o => ({
                    ...o,
                    isSelected: types.includes(o.value),
                    chipClass: types.includes(o.value) ? 'rfi-chip selected' : 'rfi-chip'
                }))
            };
        });
    }

    get canRemoveBusinessSectorRow() {
        return this.businessSectorRows.length > 1;
    }
    handleAddBusinessSector() {
        this.businessSectorRows = [...this.businessSectorRows, this._blankSectorRow()];
    }
    handleRemoveBusinessSector(event) {
        const uid = event.currentTarget.dataset.uid;
        const rows = this.businessSectorRows.filter(r => r.uid !== uid);
        this.businessSectorRows = rows.length ? rows : [this._blankSectorRow()];
    }
    handleBusinessSectorChange(event) {
        const { uid, field } = event.currentTarget.dataset;
        const value = event.target.value;
        this.businessSectorRows = this.businessSectorRows.map(r => {
            if (r.uid !== uid) return r;
            const updated = { ...r, [field]: value };
            if (field === 'sector' && value !== 'Other') updated.sectorOther = '';
            return updated;
        });
    }
    handleSupportTypeChip(event) {
        event.preventDefault();
        const { uid, chip } = event.currentTarget.dataset;
        this.businessSectorRows = this.businessSectorRows.map(r => {
            if (r.uid !== uid) return r;
            const current = Array.isArray(r.supportTypes) ? r.supportTypes : [];
            const updated = current.includes(chip) ? current.filter(c => c !== chip) : [...current, chip];
            return { ...r, supportTypes: updated, supportTypeOther: updated.includes('Other') ? r.supportTypeOther : '' };
        });
    }

    // ── Q20 Livelihood programs ─────────────────────────────────────────────
    get canRemoveLivelihoodProgramRow() {
        return this.livelihoodProgramRows.length > 1;
    }
    handleAddLivelihoodProgram() {
        this.livelihoodProgramRows = [...this.livelihoodProgramRows, this._blankProgramRow()];
    }
    handleRemoveLivelihoodProgram(event) {
        const uid = event.currentTarget.dataset.uid;
        const rows = this.livelihoodProgramRows.filter(r => r.uid !== uid);
        this.livelihoodProgramRows = rows.length ? rows : [this._blankProgramRow()];
    }
    handleLivelihoodProgramChange(event) {
        const { uid, field } = event.currentTarget.dataset;
        const value = event.target.value;
        this.livelihoodProgramRows = this.livelihoodProgramRows.map(r => (r.uid === uid ? { ...r, [field]: value } : r));
    }

    // ── Q21 Communities ─────────────────────────────────────────────────────
    get stateOptions() {
        return [
            '— Select State —', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
            'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
            'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
            'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
            'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
            'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry', 'Other'
        ].map((label, i) => ({ label, value: i === 0 ? '' : label }));
    }

    get communityRowsWithStateOptions() {
        const options = this.stateOptions;
        return (this.communityRows || []).map(row => ({
            ...row,
            stateDropdownOptions: options.map(opt => ({ ...opt, isSelected: opt.value === row.state }))
        }));
    }

    get canRemoveCommunityRow() {
        return this.communityRows.length > 1;
    }
    handleAddCommunity() {
        this.communityRows = [...this.communityRows, this._blankCommunityRow()];
    }
    handleRemoveCommunity(event) {
        const uid = event.currentTarget.dataset.uid;
        const rows = this.communityRows.filter(r => r.uid !== uid);
        this.communityRows = rows.length ? rows : [this._blankCommunityRow()];
    }
    handleCommunityChange(event) {
        const { uid, field } = event.currentTarget.dataset;
        const value = event.target.value;
        this.communityRows = this.communityRows.map(r => (r.uid === uid ? { ...r, [field]: value } : r));
    }

    // ── Q24 / Q28 uploads ───────────────────────────────────────────────────
    get isQ24VerifiedYes() {
        return this.formValues.Q24_VERIFIED__c === 'Yes';
    }
    get isQ24VerifiedNo() {
        return this.formValues.Q24_VERIFIED__c === 'No';
    }
    get hasQ24UploadedFiles() {
        return this.q24UploadedFiles.length > 0;
    }
    get hasQ28UploadedFiles() {
        return this.q28UploadedFiles.length > 0;
    }

    _acceptUploads(uploaded, currentFiles, maxSize, limitLabel) {
        const valid = [];
        const dupes = [];
        const oversized = [];
        (uploaded || []).forEach(f => {
            const size = f.size || f.sizeInBytes || 0;
            const lower = (f.name || '').toLowerCase();
            const isDup = currentFiles.some(e => (e.name || '').toLowerCase() === lower)
                || valid.some(v => (v.name || '').toLowerCase() === lower);
            if (size > maxSize || isDup) {
                (size > maxSize ? oversized : dupes).push(f.name);
                if (f.documentId) {
                    deleteUploadedFile({ documentId: f.documentId, recordId: this.recordId })
                        .catch(err => console.warn('Upload cleanup warning:', err));
                }
            } else {
                valid.push({ name: f.name, documentId: f.documentId, contentVersionId: f.contentVersionId });
            }
        });
        if (oversized.length) this._toast('File Size Limit Exceeded', `"${oversized.join(', ')}" exceeds the ${limitLabel} limit.`, 'error');
        if (dupes.length) this._toast('Duplicate File', `"${dupes.join(', ')}" is already uploaded.`, 'warning');
        return valid;
    }

    handleQ24UploadFinished(event) {
        const valid = this._acceptUploads(event.detail.files, this.q24UploadedFiles, MAX_Q24_SIZE, '10 MB');
        if (valid.length) {
            this.q24UploadedFiles = [...this.q24UploadedFiles, ...valid];
            this._toast('File Uploaded', 'Verification Report uploaded successfully.', 'success');
        }
    }

    handleRemoveQ24File(event) {
        const docId = event.currentTarget?.dataset?.id;
        this.q24UploadedFiles = this.q24UploadedFiles.filter(f => f.documentId !== docId);
        if (docId) {
            deleteUploadedFile({ documentId: docId, recordId: this.recordId })
                .catch(err => console.warn('File delete error:', err));
        }
    }

    handleQ28UploadFinished(event) {
        const valid = this._acceptUploads(event.detail.files, this.q28UploadedFiles, MAX_Q28_SIZE, '50 MB');
        if (valid.length) {
            this.q28UploadedFiles = [...this.q28UploadedFiles, ...valid];
            this._toast('File Uploaded', 'Supporting Document uploaded successfully.', 'success');
        }
    }

    handleRemoveQ28File(event) {
        const docId = event.currentTarget?.dataset?.id;
        this.q28UploadedFiles = this.q28UploadedFiles.filter(f => f.documentId !== docId);
        if (docId) {
            deleteUploadedFile({ documentId: docId, recordId: this.recordId })
                .catch(err => console.warn('File delete error:', err));
        }
    }

    // ── Validation ──────────────────────────────────────────────────────────
    _markCellInvalid(key, msg) {
        const el = this.template.querySelector(`lightning-input[data-field="${key}"]`);
        if (el && typeof el.setCustomValidity === 'function') {
            el.setCustomValidity(msg);
            el.reportValidity();
        }
    }

    _validateTable(table, title) {
        let firstError = null;
        table.rows.forEach(row => {
            row.cells.forEach(cell => {
                if (!cell.isInput) return;
                const raw = this.formValues[cell.key];
                let msg = '';
                if (this._isBlank(raw)) msg = 'This field is required.';
                else if (isNaN(Number(this._cleanNum(raw)))) msg = 'Please enter a valid number.';
                else if (Number(this._cleanNum(raw)) < 0) msg = 'Value cannot be negative.';

                if (msg) {
                    this._markCellInvalid(cell.key, msg);
                    if (!firstError) firstError = `${title}: ${cell.rowLabel} (${cell.colLabel}) — ${msg}`;
                }
            });
        });
        return firstError;
    }

    _richTextError(field, label, required) {
        const words = this._countWords(this.formValues[field]);
        if (required && words === 0) return `${label} is required.`;
        const limit = RICH_TEXT_LIMITS[field];
        if (limit && words > limit) return `${label} exceeds the ${limit}-word limit (currently ${words} words).`;
        return null;
    }

    _validNonNeg(v) {
        if (this._isBlank(v)) return false;
        const n = Number(this._cleanNum(v));
        return !isNaN(n) && n >= 0;
    }

    _validateProgrammeDate(value, label) {
        const incorp = this.formValues.Incorporation_Date__c;
        if (!value) return `${label} is required.`;
        if (value > this.todayDateString) return `${label} cannot be a future date.`;
        if (incorp && value < incorp) return `${label} cannot be earlier than your Incorporation Date (${this._fmtDate(incorp)}).`;
        return null;
    }

    _validateFunders() {
        const fv = this.formValues;
        const parts = ['Name', 'Amount', 'Period_Start', 'Period_End', 'Type'];
        const filled = [1, 2, 3].map(i => parts.some(p => !this._isBlank(fv[`Funder_${i}_${p}__c`])));
        for (let i = 1; i <= 3; i++) {
            if (!filled[i - 1]) {
                if (filled.slice(i).some(Boolean)) return `Please complete Funder ${i} before adding later funders.`;
                continue;
            }
            if (parts.some(p => this._isBlank(fv[`Funder_${i}_${p}__c`]))) {
                return `Funder ${i}: complete all fields or clear this funder.`;
            }
            if (!this._validNonNeg(fv[`Funder_${i}_Amount__c`])) {
                return `Funder ${i}: please enter a valid positive amount.`;
            }
            if (fv[`Funder_${i}_Period_End__c`] <= fv[`Funder_${i}_Period_Start__c`]) {
                return `Funder ${i}: funding end date must be after start date.`;
            }
        }
        return null;
    }

    _validateReferences() {
        const fv = this.formValues;
        const parts = ['Name', 'Role', 'Email'];
        const filled = [1, 2].map(i => parts.some(p => !this._isBlank(fv[`Reference_${i}_${p}__c`])));
        if (filled[1] && !filled[0]) return 'Please complete Reference 1 before providing Reference 2.';
        for (let i = 1; i <= 2; i++) {
            if (!filled[i - 1]) continue;
            if (parts.some(p => this._isBlank(fv[`Reference_${i}_${p}__c`]))) {
                return `Reference ${i}: complete all fields or clear this reference.`;
            }
            if (!EMAIL_REGEX.test(fv[`Reference_${i}_Email__c`])) {
                return `Reference ${i}: please enter a valid email address.`;
            }
        }
        return null;
    }

    _validateQuestion(item) {
        const fv = this.formValues;
        const blank = v => this._isBlank(v);

        if (item.table) {
            const tableErr = this._validateTable(item.table, `Question ${item.displayNumber}`);
            if (tableErr) return tableErr;
        }

        switch (item.key) {
            case 'Q2': {
                const hqErr = this._validateHQ(fv.Headquarters_City_and_Country__c);
                if (hqErr) return hqErr;
                if (blank(fv.Primary_Service_Regions__c)) return 'Primary Service Regions is required.';
                if (blank(fv.Leader_Name__c)) return 'Leader Name is required.';
                if (blank(fv.Leader_Title__c)) return 'Leader Title is required.';
                if (!blank(fv.Leader_Tenure__c)) {
                    const t = Number(fv.Leader_Tenure__c);
                    if (!Number.isInteger(t) || t < 0 || t > 99) return 'Leader Tenure must be a whole number between 0 and 99.';
                }
                return null;
            }
            case 'Q3':
                return blank(fv.Job_Title__c) ? 'Job Title is required.' : null;
            case 'Q4':
                if (blank(fv.Legal_Type__c)) return 'Legal Structure type is required.';
                if (this.isLegalTypeOther && blank(fv.Legal_Type_Other__c)) return 'Please specify your legal structure type.';
                if (blank(fv.Registration_Jurisdiction__c)) return 'Registration Jurisdiction is required.';
                if (this.isRegistrationJurisdictionOther && blank(fv.Registration_Jurisdiction_Other__c)) return 'Please specify the registration country.';
                if (blank(fv.Incorporation_Date__c)) return 'Incorporation Date is required.';
                if (fv.Incorporation_Date__c > this.todayDateString) return 'Incorporation Date cannot be a future date.';
                return this._richTextError('Legal_Structure__c', 'Governance structure description', true);
            case 'Q5':
                if (blank(fv.Has_501c3_Status__c) || blank(fv.Has_Equivalency_Determination__c)
                    || blank(fv.Is_FCRA_Registered__c) || blank(fv.Willing_to_Pursue_ED__c)) {
                    return 'Please answer all compliance questions.';
                }
                return null;
            case 'Q6':
                return (blank(fv.Fiscal_Month__c) || blank(fv.Fiscal_Day__c)) ? 'Fiscal Year End Month and Day are required.' : null;
            case 'Q7':
                return this._validateFunders();
            case 'Q8':
                return this._validateReferences();
            case 'Q10':
                return this._richTextError('Revenue_Explanation__c', 'Explanation of deviation', this.isDeviationExplanationRequired);
            case 'Q11':
                return this._richTextError('Skilling_Approach__c', 'Your Skilling Approach', true);
            case 'Q12': {
                const rows = this.skillingDomainRows;
                for (let i = 0; i < rows.length; i++) {
                    const r = rows[i];
                    const n = i + 1;
                    if (blank(r.name)) return `Domain ${n}: Domain / Programme Name is required.`;
                    if (rows.some((o, j) => j !== i && o.name && o.name.trim().toLowerCase() === r.name.trim().toLowerCase())) {
                        return `Domain ${n}: duplicate domain name. Please enter a unique name.`;
                    }
                    if (!this._validNonNeg(r.hours)) return `Domain ${n}: valid Hours of Training is required.`;
                    if (!this._validNonNeg(r.duration)) return `Domain ${n}: valid Duration (Months) is required.`;
                    const dErr = this._validateProgrammeDate(r.whenStarted, `Domain ${n}: "When Started"`);
                    if (dErr) return dErr;
                    if (!this._validNonNeg(r.enrollment)) return `Domain ${n}: Annual Enrollment is required.`;
                }
                return null;
            }
            case 'Q15':
                return this._richTextError('Job_Creation_Approach__c', 'Your Job Creation Approach', true);
            case 'Q16': {
                const rows = this.businessSectorRows;
                for (let i = 0; i < rows.length; i++) {
                    const r = rows[i];
                    const n = i + 1;
                    if (blank(r.sector)) return `Sector ${n}: Business Sector is required.`;
                    if (r.sector === 'Other' && blank(r.sectorOther)) return `Sector ${n}: please specify your business sector.`;
                    const dErr = this._validateProgrammeDate(r.whenBegan, `Sector ${n}: "When Programme Started"`);
                    if (dErr) return dErr;
                    const types = Array.isArray(r.supportTypes) ? r.supportTypes : [];
                    if (!types.length) return `Sector ${n}: select at least one Type of Support Provided.`;
                    if (types.includes('Other') && blank(r.supportTypeOther)) return `Sector ${n}: please specify the type of support.`;
                    if (!this._validNonNeg(r.enrollment)) return `Sector ${n}: Yearly Enrolment is required.`;
                }
                return null;
            }
            case 'Q19':
                return this._richTextError('Livelihood_Approach__c', 'Your Livelihood Upliftment Approach', true);
            case 'Q20': {
                const rows = this.livelihoodProgramRows;
                for (let i = 0; i < rows.length; i++) {
                    const r = rows[i];
                    const n = i + 1;
                    if (blank(r.name)) return `Program ${n}: Program / Initiative Name is required.`;
                    if (rows.some((o, j) => j !== i && o.name && o.name.trim().toLowerCase() === r.name.trim().toLowerCase())) {
                        return `Program ${n}: duplicate program name. Please enter a unique name.`;
                    }
                    if (blank(r.supportType)) return `Program ${n}: Type of Support Provided is required.`;
                    if (!this._validNonNeg(r.manHours)) return `Program ${n}: valid Duration in Man-Hours is required.`;
                    if (!this._validNonNeg(r.enrollment)) return `Program ${n}: valid Annual Enrollment is required.`;
                }
                return null;
            }
            case 'Q21': {
                const rows = this.communityRows;
                for (let i = 0; i < rows.length; i++) {
                    const r = rows[i];
                    const n = i + 1;
                    if (blank(r.state)) return `Community row ${n}: please select a State.`;
                    if (blank(r.district)) return `Community row ${n}: District / Area is required.`;
                    if (rows.some((o, j) => j !== i && o.state === r.state && o.district
                        && o.district.trim().toLowerCase() === r.district.trim().toLowerCase())) {
                        return `Community row ${n}: duplicate entry for the same State and District.`;
                    }
                    if (!['fy3', 'fy2', 'fy1', 'proj'].every(f => this._validNonNeg(r[f]))) {
                        return `Community row ${n}: enter non-negative household numbers for every year.`;
                    }
                }
                return null;
            }
            case 'Q24':
                if (blank(fv.Q24_VERIFIED__c)) return 'Please select whether outcomes were verified by a third party.';
                if (this.isQ24VerifiedYes) {
                    if (blank(fv.Details_of_Ethical_Received__c)) return 'Please specify who conducted the verification.';
                    if (!this.hasQ24UploadedFiles) return 'Please upload your third-party verification report (PDF).';
                }
                return null;
            case 'Q25':
                return this._richTextError('Organizational_Sustainability__c', 'Sustainability Plan', true);
            case 'Q26':
                return this._richTextError('Use_of_Additional_Funding__c', 'Direction for Additional Funding', true);
            case 'Q27':
                if (this.showSynergiesTextBox) {
                    const words = this._countWords(fv.Operational_Synergies_with_WOF__c);
                    if (words === 0) return 'Please describe how GenieAI could contribute, or change your interest level to "Not at this time".';
                    if (words > GENIE_TEXT_LIMIT) return `GenieAI description exceeds the ${GENIE_TEXT_LIMIT}-word limit (currently ${words} words).`;
                }
                return null;
            default:
                return null;
        }
    }

    // ── Payload (mirrors wcfDynamicForm._syncCalculatedAndAliasFields) ──────
    _buildSubmitValues() {
        const f = { ...this.formValues };

        Object.keys(FIELD_ALIASES).forEach(uiKey => {
            const val = f[uiKey] === undefined || f[uiKey] === null ? '' : f[uiKey];
            FIELD_ALIASES[uiKey].forEach(alias => { f[alias] = val; });
        });

        const n = k => this._num(f[k]);
        const s = v => String(v);

        // Q9 derived
        f.CY3_Expense__c = s(n('CAP_FY3') + n('OP_FY3'));
        f.CY3_Balance_End__c = s(this.cy3BalanceEnd);
        f.CY2_Balance_Start_CFY_2__c = s(this.cy3BalanceEnd);
        f.CY2_Expense__c = s(n('CAP_FY2') + n('OP_FY2'));
        f.CY2_Balance_End__c = s(this.cy2BalanceEnd);
        f.CY1_Balance_Start_CFY_1__c = s(this.cy2BalanceEnd);
        f.CY1_Expense__c = s(n('CAP_FY1') + n('OP_FY1'));
        f.CY1_Balance_End__c = s(this.cy1BalanceEnd);

        // Q10 derived
        f.Revenue_Variance__c = s(this.cfyRevenueVariance);
        f.Capital_Expenditure_Variance__c = s(this.cfyCapexVariance);
        f.Operating_Expenditure_Variance__c = s(this.cfyOpexVariance);
        f.Net_Budget__c = s(this.cfyNetBudget);
        f.Net_Projection__c = s(this.cfyNetProj);
        f.Net_Variance__c = s(this.cfyNetVariance);

        // Q13/Q14 derived placement %
        [['FY3', 'FY_3'], ['FY2', 'FY_2'], ['FY1', 'FY_1']].forEach(([ui, db]) => {
            const pct = this._pctValue(`JF_ENROLL_${ui}`, `JF_PLACE_${ui}`);
            f[`Projected_Learner_placement_${db}__c`] = pct;
            f[`Actual_Learner_placement_${db}__c`] = pct;
        });
            f.Projected_Learner_placement_CFY__c = this._pctValue('JF_ENROLL_PROJ', 'JF_PLACE_PROJ');

        // Cleared numeric/date answers go to Apex as null, never ''
        Object.keys(f).forEach(k => {
            if (NUMERIC_SUBMIT_FIELDS.has(k)) {
                const c = this._cleanNum(f[k]);
                f[k] = (c === '' || isNaN(Number(c))) ? null : c;
            } else if (DATE_KEYS.has(k) && this._isBlank(f[k])) {
                f[k] = null;
            }
        });

        return f;
    }

    // ── Resubmit ────────────────────────────────────────────────────────────
    async handleSubmitResponse() {
        if (this.isSaving) return;

        this._syncRichTextFromDom();

        // 1. Built-in validity of rendered base components
        let standardValid = true;
        this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea').forEach(i => {
            if (typeof i.reportValidity === 'function' && !i.reportValidity()) standardValid = false;
        });
        if (!standardValid) {
            this._toastError('Please correct the highlighted fields before resubmitting.');
            return;
        }

        // 2. Question-specific validation for every returned question
        for (const item of this.flaggedQuestions) {
            const err = this._validateQuestion(item);
            if (err) {
                this._toastError(err);
                const card = this.template.querySelector(`[data-qkey="${item.key}"]`);
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }

        if (!this.selectedTracks || this.selectedTracks.length === 0) {
            this._toastError('Application must have at least one track selected before resubmitting.');
            return;
        }

        this.isSaving = true;
        try {
            const values = this._buildSubmitValues();
            const q24DocIds = this.q24UploadedFiles.map(f => f.documentId);
            const q28DocIds = this.q28UploadedFiles.map(f => f.documentId);

            const payload = {
                ...values,
                activeTabId: 'tabReviewSubmit',
                                skillingDomains: this._rowsForSubmit(this.skillingDomainRows, ROW_NUMERIC_FIELDS.skilling),
                businessSectors: this._rowsForSubmit(this.businessSectorRows, ROW_NUMERIC_FIELDS.sector),
                livelihoodPrograms: this._rowsForSubmit(this.livelihoodProgramRows, ROW_NUMERIC_FIELDS.program),
                communities: this._rowsForSubmit(this.communityRows, ROW_NUMERIC_FIELDS.community),
                documents: this.docRows,
                q24DocumentIds: q24DocIds,
                q28DocumentIds: q28DocIds,
                uploadedDocumentIds: [...q24DocIds, ...q28DocIds]
            };

            const result = await resubmitDynamicApplication({
                recordId: this.recordId,
                selectedTracks: this.selectedTracks,
                payloadJson: JSON.stringify(payload)
            });

            if (result && result.isSuccess) {
                this.isSubmitted = true;
                this._toast('Revision Submitted', 'Your updated answers have been submitted for review.', 'success');
                this.dispatchEvent(new CustomEvent('submitted'));
            } else {
                this._toast('Submission Error', result ? result.message : 'Could not submit revision.', 'error');
            }
        } catch (err) {
            console.error('Error in resubmitDynamicApplication:', err);
            this._toast('Submission Error', (err && err.body && err.body.message) || (err && err.message) || 'Error resubmitting application.', 'error');
        } finally {
            this.isSaving = false;
        }
    }

    _toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    _toastError(msg) {
        this._toast('Validation Error', msg, 'error');
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleBackToDashboard() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }
}