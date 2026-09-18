import { LightningElement, api, track } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import flagTelpicker from '@salesforce/resourceUrl/flagTelpicker';
import JSPDF from '@salesforce/resourceUrl/downloadjs';
import AUTO_TABLE from '@salesforce/resourceUrl/autotable';
import searchHQLocation from '@salesforce/apex/OpenStreetMapService.searchLocation';
import getFormMetadata from '@salesforce/apex/WCFFormMetadataController.getFormMetadata';
import getDynamicDraft from '@salesforce/apex/WCFFormEngineController.getDynamicDraft';
import saveDynamicDraft from '@salesforce/apex/WCFFormEngineController.saveDynamicDraft';
import submitDynamicApplication from '@salesforce/apex/WCFFormEngineController.submitDynamicApplication';
import deleteUploadedFile from '@salesforce/apex/WCFFormEngineController.deleteUploadedFile';
import upsertAIFeedback from '@salesforce/apex/WCFFormController.upsertAIFeedback';
import getAIFeedbackRecord from '@salesforce/apex/WCFFormController.getAIFeedbackRecord';

function calculateEndingBalance(startBalance, revenue, expense) {
    const start = Number(startBalance) || 0;
    const rev = Number(revenue) || 0;
    const exp = Number(expense) || 0;
    return start + rev - exp;
}

function cleanTitle(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/^(\*?\s*Q\d+\s*:\s*|\*?\s*\d+\.\s*|\*\s*)/i, '').trim();
}

export default class WcfDynamicForm extends LightningElement {
    _recordId;
    _hasLoadedDraft = false;
    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(val) {
        const oldVal = this._recordId;
        this._recordId = val;
        if (val && val !== oldVal && this.isConnected && !this._hasLoadedDraft) {
            this._hasLoadedDraft = true;
            this.loadDraftData();
        }
    }
    @api selectedLanguage = 'en_US';

    winLogoUrl = WIN_LOGO; // Set logo URL from static resource

    @track isLoading = false;
    // In-component replacement for native ShowToastEvent — see showBanner()/
    // closeBanner() below. Renders using commonStyleTheme's existing
    // .error-banner/.warning-banner/.success-banner/.info-banner classes
    // so notifications match brand styling instead of the platform's
    // default SLDS toast (solid-fill, not tokenized, can't be restyled
    // from component CSS since it renders outside this shadow tree).
    @track bannerVisible = false;
    @track bannerVariant = 'info'; // 'error' | 'warning' | 'success' | 'info'
    @track bannerTitle = '';
    @track bannerMessage = '';
    _bannerTimeout;
    @track currentScreen = 'screen1'; // Screen 1 is Track Selection & FAQ (2nd Image is first page)
    @track activeTabId = 'tabAboutOrg';

    @track selectedTracks = []; // No auto-selected track by default

    get isNextDisabled() {
        return !this.selectedTracks || this.selectedTracks.length === 0;
    }

    // FAQ Accordion State (Matching 1st image: Job Fulfillment open by default, Job Creation & Livelihood closed)
    @track faqOpen = {
        jobFulfillment: true,
        jobCreation: false,
        livelihood: false
    };

    @track formValues = {
        Fiscal_Month__c: '03',
        Fiscal_Day__c: '31',
        Organization_Name__c: '',
        Headquarters_City_and_Country__c: '',
        Primary_Service_Regions__c: '',
        Leader_Name__c: '',
        Leader_Title__c: '',
        Submitter_Name__c: '',
        Job_Title__c: '',
        Work_Email_ID__c: '',
        Phone__c: '',
        Legal_Type__c: '',
        Registration_Jurisdiction__c: '',
        Incorporation_Date__c: '',
        Legal_Structure__c: '',
        Has_501c3_Status__c: '',
        Has_Equivalency_Determination__c: '',
        Is_FCRA_Registered__c: '',
        Willing_to_Pursue_ED__c: '',
        Reference_1_Name__c: '',
        Reference_1_Role__c: '',
        Reference_1_Email__c: '',
        Reference_2_Name__c: '',
        Reference_2_Role__c: '',
        Reference_2_Email__c: '',
        Revenue_Explanation__c: ''
    };

    @track fiscalYears = {};

    // ── Dynamic Child Grids & File State ─────────────────────────────────
    @track skillingDomainRows = [
        { id: 1, name: '', hours: '', duration: '', whenStarted: '', enrollment: '', displayWhenStarted: '' }
    ];
    @track businessSectorRows = [
        { id: 1, sector: '', sectorOther: '', supportTypes: [], supportTypeOther: '', whenBegan: '', enterprises: '', jobs: '', displayWhenBegan: '' }
    ];
    @track livelihoodProgramRows = [
        { id: 1, name: '', supportType: '', manHours: '', enrollment: '' }
    ];
    @track communityRows = [
        { id: 1, state: '', district: '', fy3: '', fy2: '', fy1: '', proj: '' }
    ];
    @track docRows = [];
    @track q24UploadedFiles = [];
    @track q28UploadedFiles = [];

    // ── Funder & Reference Toggle State (Q7 & Q8) ─────────────────────────
    @track showFunder2 = false;
    @track showFunder3 = false;
    @track showReference2 = false;

    // ── Rich Text & Word Count State ─────────────────────────────────────
    @track legalStructureWordCount = 0;
    @track deviationExplanationWordCount = 0;
    @track skillingApproachWordCount = 0;
    @track jobCreationApproachWordCount = 0;
    @track livelihoodApproachWordCount = 0;
    @track sustainabilityWordCount = 0;
    @track useOfFundingWordCount = 0;
    activeField = null;

    // ── AI Feedback Modal State ──────────────────────────────────────────
    @track isAIModalOpen = false;
    @track aiModalTitle = 'AI Feedback';
    @track isAiLoading = false;
    @track aiResponse = '';

    // ── Phone ITI & Validation State ─────────────────────────────────────
    _phoneIti = null;
    _phoneItiInitialized = false;
    _phoneScriptsLoaded = false;
    _invalidElements = [];
    @track phoneNumberError = '';

    // ── HQ Autocomplete State ─────────────────────────────────────────────
    @track hqSearchKey = '';
    @track hqResults = [];
    @track hqIsLoading = false;
    @track hqShowNoResults = false;
    hqDelayTimeout;

    PHONE_LENGTH_BY_COUNTRY_CODE = {
        '+1':   { min: 10, max: 10, example: '2025551234' },
        '+20':  { min: 9,  max: 10, example: '1001234567' },
        '+234': { min: 10, max: 10, example: '8031234567' },
        '+27':  { min: 9,  max: 9,  example: '821234567' },
        '+31':  { min: 9,  max: 9,  example: '612345678' },
        '+33':  { min: 9,  max: 9,  example: '612345678' },
        '+34':  { min: 9,  max: 9,  example: '612345678' },
        '+39':  { min: 9,  max: 10, example: '3123456789' },
        '+41':  { min: 9,  max: 9,  example: '781234567' },
        '+44':  { min: 10, max: 10, example: '7123456789' },
        '+49':  { min: 7,  max: 11, example: '15123456789' },
        '+52':  { min: 10, max: 10, example: '5512345678' },
        '+54':  { min: 10, max: 11, example: '91123456789' },
        '+55':  { min: 10, max: 11, example: '11987654321' },
        '+60':  { min: 9,  max: 10, example: '123456789' },
        '+61':  { min: 9,  max: 9,  example: '412345678' },
        '+63':  { min: 10, max: 10, example: '9171234567' },
        '+64':  { min: 8,  max: 10, example: '211234567' },
        '+65':  { min: 8,  max: 8,  example: '81234567' },
        '+7':   { min: 10, max: 10, example: '9123456789' },
        '+81':  { min: 10, max: 10, example: '9012345678' },
        '+82':  { min: 9,  max: 10, example: '1012345678' },
        '+86':  { min: 11, max: 11, example: '13123456789' },
        '+91':  { min: 10, max: 10, example: '9812345678' },
        '+966': { min: 9,  max: 9,  example: '512345678' },
        '+971': { min: 9,  max: 9,  example: '501234567' },
    };

    @track isDirty = false;
    _beforeUnloadHandler = null;

    connectedCallback() {
        try {
            this._beforeUnloadHandler = (event) => {
                if (this.isDirty) {
                    event.preventDefault();
                    event.returnValue = '';
                    return '';
                }
            };
            window.addEventListener('beforeunload', this._beforeUnloadHandler);
        } catch (e) {
            // Sandboxed iframe safety
        }

        this.loadMetadata();
        this._loadPdfLibraries();
        this.loadDraftData();
    }

    renderedCallback() {
        this._managePhoneIti();
        if (this.formValues.Headquarters_City_and_Country__c && !this.hqSearchKey) {
            this.hqSearchKey = this.formValues.Headquarters_City_and_Country__c;
        }

        // Sync rich text contenteditable divs with loaded formValues
        const richTextElements = this.template.querySelectorAll('div[contenteditable="true"]');
        richTextElements.forEach(el => {
            const field = el.dataset?.field || el.dataset?.id || el.dataset?.key;
            if (field && this.formValues[field] !== undefined && document.activeElement !== el) {
                if (el.innerHTML !== this.formValues[field]) {
                    el.innerHTML = this.formValues[field];
                }
            }
        });
    }

    disconnectedCallback() {
        this._destroyPhoneIti();
        try {
            if (this._beforeUnloadHandler) {
                window.removeEventListener('beforeunload', this._beforeUnloadHandler);
            }
        } catch (e) {}
    }

    @track metadataQuestions = [];
    @track metadataTracks = [];
    @track metadataSections = [];
    @track labelMap = {};

    loadMetadata() {
        getFormMetadata({
            languageCode: this.selectedLanguage || 'en_US',
            fiscalMonth: this.formValues.Fiscal_Month__c || '03',
            fiscalDay: this.formValues.Fiscal_Day__c || '31'
        })
        .then(result => {
            if (result && result.questions) {
                this.metadataQuestions = result.questions;
            }
            if (result && result.tracks) {
                this.metadataTracks = result.tracks;
            }
            if (result && result.sections) {
                this.metadataSections = result.sections;
            }
            if (result && result.fiscalYears) {
                this.fiscalYears = result.fiscalYears;
            }
            if (result && result.labelMap) {
                this.labelMap = result.labelMap;
            }
        })
        .catch(err => {
            console.warn('Metadata load warning:', err);
        });
    }

    getQuestionLabel(key, defaultVal) {
        let raw = defaultVal;
        if (this.labelMap && this.labelMap[key]) {
            raw = this.labelMap[key];
        } else if (this.metadataQuestions && this.metadataQuestions.length) {
            const found = this.metadataQuestions.find(q => q.key === key || q.targetField === key);
            if (found && found.label) raw = found.label;
        }
        return cleanTitle(raw);
    }

    getSectionTitle(code, defaultVal) {
        let raw = defaultVal;
        if (this.labelMap && this.labelMap[code]) {
            raw = this.labelMap[code];
        } else if (this.metadataSections && this.metadataSections.length) {
            const found = this.metadataSections.find(s => s.code === code);
            if (found && found.title) raw = found.title;
        }
        return cleanTitle(raw);
    }


    get labels() {
        return {
            // Screen 1 & Track Selection
            TRACK_SELECTION_TITLE: this.getQuestionLabel('TRACK_SELECTION_TITLE', 'Which of these does your work cover?'),
            TRACK_SELECTION_SUBTITLE: this.getQuestionLabel('TRACK_SELECTION_SUBTITLE', 'Select all that apply. Your answer sets which questions you get later in the form.'),
            
            // Overview & FAQ
            OVERVIEW_TITLE: this.getQuestionLabel('OVERVIEW_TITLE', 'APPLICATION OVERVIEW · SECTIONS 2 & 3'),
            OVERVIEW_SEC2_TAG: 'SECTION 2',
            OVERVIEW_SEC2_HEADING: this.getQuestionLabel('OVERVIEW_SEC2_HEADING', 'What You Do'),
            OVERVIEW_SEC2_DESC: this.getQuestionLabel('OVERVIEW_SEC2_DESC', 'Tell us about your work: your top programs, your approach, and what makes it different.'),
            OVERVIEW_SEC3_TAG: 'SECTION 3',
            OVERVIEW_SEC3_HEADING: this.getQuestionLabel('OVERVIEW_SEC3_HEADING', 'What You\'ve Delivered'),
            OVERVIEW_SEC3_DESC: this.getQuestionLabel('OVERVIEW_SEC3_DESC', 'Tell us what you\'ve achieved: your results for the last three years, plus your estimate for this year.'),
            FAQ_SECTION_TITLE: this.getQuestionLabel('FAQ_SECTION_TITLE', 'FREQUENTLY ASKED QUESTIONS · WHAT THE TRACKS MEAN'),
            FAQ_JF_TITLE: this.getQuestionLabel('FAQ_JF_TITLE', 'Job Fulfillment (Skilling and Placement)'),
            FAQ_JC_TITLE: this.getQuestionLabel('FAQ_JC_TITLE', 'Job Creation (SME / Enterprise Support)'),
            FAQ_LIV_TITLE: this.getQuestionLabel('FAQ_LIV_TITLE', 'Livelihood Upliftment'),

            // Section Titles & Subtitles
            SEC_ABOUT_ORG: this.getSectionTitle('SEC_ABOUT_ORG', '1. About Your Organization'),
            SEC_JOB_FULFILLMENT: this.getSectionTitle('SEC_JOB_FULFILLMENT', '2. What You Do'),
            SEC_JOB_CREATION: this.getSectionTitle('SEC_JOB_CREATION', '3. Job Creation'),
            SEC_LIVELIHOOD: this.getSectionTitle('SEC_LIVELIHOOD', '4. Livelihood Upliftment'),
            SEC_OUTCOMES: this.getSectionTitle('SEC_OUTCOMES', '3. What You Have Delivered'),
            SEC_WHY_WADHWANI: this.getSectionTitle('SEC_WHY_WADHWANI', '4. Why Wadhwani Grants'),
            SEC_REVIEW_SUBMIT: this.getSectionTitle('SEC_REVIEW_SUBMIT', '5. Review and Submit'),

            // Section Cards (Q2 - Q6)
            SEC2_TITLE: this.getQuestionLabel('SEC2_TITLE', 'Organizational Identifying Information'),
            SEC2_DESC: this.getQuestionLabel('SEC2_DESC', 'A few details so we know who we\'re talking to.'),
            SEC3_TITLE: this.getQuestionLabel('SEC3_TITLE', 'Submitter Contact Information'),
            SEC3_DESC: this.getQuestionLabel('SEC3_DESC', 'Who is filling out this form? You\'ll be the initial point of contact for your organisation.'),
            SEC4_TITLE: this.getQuestionLabel('SEC4_TITLE', 'Legal Structure'),
            SEC4_DESC: this.getQuestionLabel('SEC4_DESC', 'Tell us how your organisation is legally constituted and where it\'s registered.'),
            SEC5_TITLE: this.getQuestionLabel('SEC5_TITLE', 'Legal and Tax Compliance'),
            SEC5_DESC: this.getQuestionLabel('SEC5_DESC', 'Wadhwani Grants disburses from a US entity, so cross-border grants require certain compliance credentials. Tell us what your organization holds today. If you hold none yet, the last question simply asks whether you would be open to pursuing an Equivalency Determination (ED), a process Wadhwani Grants supports for selected partners. This is for our compliance planning; it does not affect how we read the rest of your application.'),
            SEC6_TITLE: this.getQuestionLabel('SEC6_TITLE', 'Fiscal Year End Date'),
            SEC6_DESC: this.getQuestionLabel('SEC6_DESC', 'When does your fiscal year close? This helps us align all financial and outcome metrics. (DD/MM/YYYY)'),

            // Tab 1 / Category 1 Flat Questions
            Q1_SELECTED_TRACKS: this.getQuestionLabel('Q1_SELECTED_TRACKS', 'Selected Track'),
            Q2_ORG_NAME: this.getQuestionLabel('Q2_ORG_NAME', 'Organizational Name'),
            Q2_HQ_LOCATION: this.getQuestionLabel('Q2_HQ_LOCATION', 'Headquarters City and Country'),
            Q2_PRIMARY_REGIONS: this.getQuestionLabel('Q2_PRIMARY_REGIONS', 'Primary Service Regions'),
            Q2_LEADER_NAME: this.getQuestionLabel('Q2_LEADER_NAME', 'Leader Name'),
            Q2_LEADER_TITLE: this.getQuestionLabel('Q2_LEADER_TITLE', 'Leader Title'),
            Q2_LEADER_TENURE: this.getQuestionLabel('Q2_LEADER_TENURE', 'Leader Tenure (Optional)'),
            
            Q3_SUBMITTER_NAME: this.getQuestionLabel('Q3_SUBMITTER_NAME', 'Submitter Name'),
            Q3_JOB_TITLE: this.getQuestionLabel('Q3_JOB_TITLE', 'Job Title'),
            Q3_WORK_EMAIL: this.getQuestionLabel('Q3_WORK_EMAIL', 'Work Email'),
            Q3_PHONE: this.getQuestionLabel('Q3_PHONE', 'Phone Number'),

            Q4_LEGAL_TYPE: this.getQuestionLabel('Q4_LEGAL_TYPE', 'Legal Structure'),
            Q4_JURISDICTION: this.getQuestionLabel('Q4_JURISDICTION', 'Registration Jurisdiction'),
            Q4_INCORP_DATE: this.getQuestionLabel('Q4_INCORP_DATE', 'Incorporation Date'),
            Q4_GOVERNANCE_DESC: this.getQuestionLabel('Q4_GOVERNANCE_DESC', 'Describe your governance structure and key governing bodies.'),
            Q4_GOVERNANCE_HELPER: this.getQuestionLabel('Q4_GOVERNANCE_HELPER', 'Briefly describe your governance and operational structure — board, leadership, key affiliations (<100 words).'),

            Q5_US_501C3: this.getQuestionLabel('Q5_US_501C3', 'Do you have 501(c)(3) status or equivalent US tax-exempt determination?'),
            Q5_ED_STATUS: this.getQuestionLabel('Q5_ED_STATUS', 'Do you currently hold an active Equivalency Determination (ED) certificate?'),
            Q5_FCRA_STATUS: this.getQuestionLabel('Q5_FCRA_STATUS', 'Do you have a valid FCRA registration?'),
            Q5_WILLING_ED: this.getQuestionLabel('Q5_WILLING_ED', 'Are you willing to pursue an Equivalency Determination (ED) if selected?'),

            Q6_FISCAL_MONTH: this.getQuestionLabel('Q6_FISCAL_MONTH', 'Fiscal Year End Month'),
            Q6_FISCAL_DAY: this.getQuestionLabel('Q6_FISCAL_DAY', 'Fiscal Year End Day'),
            Q6_FISCAL_DATE: this.getQuestionLabel('Q6_FISCAL_DATE', 'Fiscal Year End Date'),

            Q7_TOP_FUNDERS: this.getQuestionLabel('Q7_TOP_FUNDERS', 'Top 3 Prominent Funders'),
            Q7_TOP_FUNDERS_DESC: this.getQuestionLabel('Q7_TOP_FUNDERS_DESC', 'Optionally share up to three of your most prominent funders — the backers whose support is most material or most recognisable. All amounts in USD.'),
            Q8_REFERENCES: this.getQuestionLabel('Q8_REFERENCES', 'Reference Contacts for Outreach'),
            Q8_REFERENCES_DESC: this.getQuestionLabel('Q8_REFERENCES_DESC', 'Sharing 1-2 contacts who can speak to your work (funders, board members, partners, or peer leaders) gives us a valuable external reference point. This is optional; it is not required and will not affect your application.'),

            // Financials & Outcomes (Q9 & Q10)
            Q9_HIST_FINANCIALS: this.getQuestionLabel('Q9_HIST_FINANCIALS', 'Historical Financial Performance'),
            Q9_HIST_FINANCIALS_DESC: this.getQuestionLabel('Q9_HIST_FINANCIALS_DESC', 'Enter your historical figures across the three prior fiscal years. Starting balance for the earliest year and revenue/expense are inputs; year-end balances are computed automatically.'),
            Q10_CURRENT_FY: this.getQuestionLabel('Q10_CURRENT_FY', 'Current Fiscal Year Budget & Projections'),
            Q10_CURRENT_FY_DESC: this.getQuestionLabel('Q10_CURRENT_FY_DESC', 'Your current fiscal year budget, latest projection, and explanation of any deviation.'),
            Q10_EXPLANATION_LABEL: this.getQuestionLabel('Q10_EXPLANATION_LABEL', 'Explanation of deviation'),
            Q10_EXPLANATION_DESC: this.getQuestionLabel('Q10_EXPLANATION_DESC', 'Required if total deviation is non-zero (combined revenue + expense; <200 words).'),

            // Track Questions
            Q11_SKILLING_APPROACH: this.getQuestionLabel('Q11_SKILLING_APPROACH', 'Your Skilling Approach'),
            Q11_SKILLING_APPROACH_DESC: this.getQuestionLabel('Q11_SKILLING_APPROACH_DESC', 'Tell us about your skilling work in roughly 500 words. If you run named programs, walk us through your top three (names, what they teach, who they serve). Cover your theory of change, the journey from learner enrollment to placement, and what makes your approach different from others.'),
            Q12_SKILLING_DOMAINS: this.getQuestionLabel('Q12_SKILLING_DOMAINS', 'Skilling Domains Offered'),
            Q12_SKILLING_DOMAINS_DESC: this.getQuestionLabel('Q12_SKILLING_DOMAINS_DESC', 'List the skilling domains your organization offers (one row each, minimum 1). For each: typical training hours, duration in months, when you started running it, and your annual enrollment.'),
            Q13_JF_HIST_OUTCOMES: this.getQuestionLabel('Q13_JF_HIST_OUTCOMES', 'Job Fulfillment Outcomes — Last 3 Fiscal Years (Actuals)'),
            Q13_JF_HIST_OUTCOMES_DESC: this.getQuestionLabel('Q13_JF_HIST_OUTCOMES_DESC', 'Enter your enrolment and placement actuals across the three most recent fiscal years. Placement % and average cost per placement are computed for you.'),
            Q14_JF_PROJ_OUTCOMES: this.getQuestionLabel('Q14_JF_PROJ_OUTCOMES', 'Job Fulfillment Outcomes — Current FY Projections'),
            Q14_JF_PROJ_OUTCOMES_DESC: this.getQuestionLabel('Q14_JF_PROJ_OUTCOMES_DESC', 'Enter your projected enrolment and placement numbers for the current fiscal year. These are forward-looking estimates. No verification block — projections aren\'t verifiable at submission.'),

            Q15_JOB_CREATION_APPROACH: this.getQuestionLabel('Q15_JOB_CREATION_APPROACH', 'Your Job Creation Approach'),
            Q15_JOB_CREATION_APPROACH_DESC: this.getQuestionLabel('Q15_JOB_CREATION_APPROACH_DESC', 'Tell us about your job creation work in roughly 500 words. Cover (i) your support model (capital, mentorship, business advisory, sector-specific TA, market linkages, etc.); (ii) your theory of change, the journey from engagement through to jobs created and sustained; (iii) what makes your approach different from others.'),
            Q16_BUSINESS_SECTORS: this.getQuestionLabel('Q16_BUSINESS_SECTORS', 'Business Sectors Served'),
            Q16_BUSINESS_SECTORS_DESC: this.getQuestionLabel('Q16_BUSINESS_SECTORS_DESC', 'List the business sectors in which you support entrepreneurs / Micro, Small, and Medium Enterprises. For each, tell us what type of support you provide, when you started supporting that sector, and your annual enrolment number.'),
            Q17_JC_HIST_OUTCOMES: this.getQuestionLabel('Q17_JC_HIST_OUTCOMES', 'Job Creation Outcomes — Last 3 Fiscal Years (Actuals)'),
            Q17_JC_HIST_OUTCOMES_DESC: this.getQuestionLabel('Q17_JC_HIST_OUTCOMES_DESC', 'Enter your business creation and job creation actuals across the three most recent fiscal years. Total avg cost per job created is computed for you. Current FY projections are captured separately below.'),
            Q18_JC_PROJ_OUTCOMES: this.getQuestionLabel('Q18_JC_PROJ_OUTCOMES', 'Job Creation Outcomes — Current FY Projections'),
            Q18_JC_PROJ_OUTCOMES_DESC: this.getQuestionLabel('Q18_JC_PROJ_OUTCOMES_DESC', 'Enter projected business and job-creation numbers for the current fiscal year. Forward-looking estimates; historical actuals are in the previous section.'),

            Q19_LIVELIHOOD_APPROACH: this.getQuestionLabel('Q19_LIVELIHOOD_APPROACH', 'Your Livelihood Upliftment Approach'),
            Q19_LIVELIHOOD_APPROACH_DESC: this.getQuestionLabel('Q19_LIVELIHOOD_APPROACH_DESC', 'Tell us about this work in roughly 500 words. Cover (i) who the beneficiary is and how they come to you; (ii) Describe your intervention either to help start a new business (and sustain it) or in helping grow their existing business towards helping them get family-sustaining incomes; (iii) the support that continues after any initial training, such as mentoring, market access, credit linkage or aggregation; (iv) what makes your approach different.'),
            Q20_LIVELIHOOD_PROGRAMS: this.getQuestionLabel('Q20_LIVELIHOOD_PROGRAMS', 'Your Key Programs / Initiatives'),
            Q20_LIVELIHOOD_PROGRAMS_DESC: this.getQuestionLabel('Q20_LIVELIHOOD_PROGRAMS_DESC', 'Tell us about your flagship programs and the type of interventions you offer. For each program / initative provide a view on what are the different interventions, how many man-hours do you spend with each beneficiary and how many beneficiaries typically enroll each year for each program.'),
            Q21_COMMUNITIES_SERVED: this.getQuestionLabel('Q21_COMMUNITIES_SERVED', 'Communities that you work in'),
            Q21_COMMUNITIES_SERVED_DESC: this.getQuestionLabel('Q21_COMMUNITIES_SERVED_DESC', 'Tell us where this program runs and how many households it reaches. Use the figures you already keep; we are not asking you to build anything new for this form.'),
            Q22_LIVELIHOOD_ACTUALS: this.getQuestionLabel('Q22_LIVELIHOOD_ACTUALS', 'Livelihood Outcomes (Actuals)'),
            Q23_LIVELIHOOD_PROJ: this.getQuestionLabel('Q23_LIVELIHOOD_PROJ', 'Livelihood Outcomes, Current FY Projections'),
            Q23_LIVELIHOOD_PROJ_DESC: this.getQuestionLabel('Q23_LIVELIHOOD_PROJ_DESC', 'Projected figures for the current fiscal year. Forward-looking estimates; historical actuals are in the previous section.'),

            // Section 4 & Category 1 Questions (Q24, Q25, Q26, Q27, Q28)
            Q24_INDEPENDENT_VERIFICATION: this.getQuestionLabel('Q24_INDEPENDENT_VERIFICATION', 'Independent Verification of Your Outcomes'),
            Q24_INDEPENDENT_VERIFICATION_DESC: this.getQuestionLabel('Q24_INDEPENDENT_VERIFICATION_DESC', 'This applies to every applicant, whichever track you completed. If a third party has independently verified or evaluated the outcomes you reported, sharing the report strengthens your application; it is not required. If not, we will discuss verification together at the next stage.'),
            Q24_OPERATIONAL_SYNERGIES: this.getQuestionLabel('Q24_OPERATIONAL_SYNERGIES', 'Operational Synergies'),
            Q25_SUSTAINABILITY_PLAN: this.getQuestionLabel('Q25_SUSTAINABILITY_PLAN', 'Sustainability Plan'),
            Q25_SUSTAINABILITY_PLAN_DESC: this.getQuestionLabel('Q25_SUSTAINABILITY_PLAN_DESC', 'How is your organization positioned to sustain its work over time? In about 100 words cover: (1) funding mix, main revenue sources; (2) programmatic resilience, dependence on any single program or contract; (3) funder concentration, reliance on one funder and how you manage that risk. A plain-language picture is all we need.'),
            Q26_ADDITIONAL_FUNDING: this.getQuestionLabel('Q26_ADDITIONAL_FUNDING', 'Direction for Additional Funding'),
            Q26_ADDITIONAL_FUNDING_DESC: this.getQuestionLabel('Q26_ADDITIONAL_FUNDING_DESC', 'Then, in words. If you were given a grant of USD 1 million a year, what would you do with it? In about 200 words, tell us how you would deploy it to scale your impact: program expansion, geographic scaling, new offerings, capacity-building, technology investment, and so on. Treat the figure as approximate; scale it to your own situation. We will work out specifics together at the next stage, so no detailed budget or M&E plan is needed here.'),
            Q27_GENIE_AI: this.getQuestionLabel('Q27_GENIE_AI', 'Operational Synergies with GenieAI (Optional)'),
            Q27_GENIE_AI_DESC: this.getQuestionLabel('Q27_GENIE_AI_DESC', 'GenieAI is Wadhwani Foundation\'s AI platform for skilling, entrepreneurship, and government services. This is fully optional and never disqualifying — we want your honest signal. If you\'re open to exploring synergy, tell us how it could fit. If not, that\'s a complete and acceptable answer.'),
            Q28_SUPPORTING_DOCS: this.getQuestionLabel('Q28_SUPPORTING_DOCS', 'Supporting Documents (Optional)'),
            Q28_SUPPORTING_DOCS_DESC: this.getQuestionLabel('Q28_SUPPORTING_DOCS_DESC', 'If there\'s anything else you\'d like to share in support of your application, you may upload it here.'),

            // Review & Submit
            REVIEW_SUBMIT_TITLE: this.getQuestionLabel('REVIEW_SUBMIT_TITLE', 'Review & Submit'),
            REVIEW_SUBMIT_DESC: this.getQuestionLabel('REVIEW_SUBMIT_DESC', 'Take a final look at what you\'ve entered. Go back to any previous section to make edits before submitting.'),
            REVIEW_SEC_ABOUT_ORG: this.getSectionTitle('SEC_ABOUT_ORG', 'ABOUT YOUR ORGANISATION'),
            REVIEW_SEC_JOB_FULFILLMENT: this.getSectionTitle('SEC_JOB_FULFILLMENT', 'JOB FULFILLMENT'),
            REVIEW_SEC_JOB_CREATION: this.getSectionTitle('SEC_JOB_CREATION', 'JOB CREATION'),
            REVIEW_SEC_LIVELIHOOD: this.getSectionTitle('SEC_LIVELIHOOD', 'LIVELIHOOD UPLIFTMENT'),
            REVIEW_SEC_WHY_WADHWANI: this.getSectionTitle('SEC_WHY_WADHWANI', 'WHY WADHWANI GRANTS')
        };
    }

    loadDraftData() {
        this.isLoading = true;
        getDynamicDraft({ recordId: this.recordId })
            .then(result => {
                if (result && result.isSuccess) {
                    if (result.recordId) {
                        this._recordId = result.recordId;
                    }
                    if (result.selectedTracks && result.selectedTracks.length > 0) {
                        this.selectedTracks = result.selectedTracks;
                    }
                    if (result.activeTabId) {
                        this.activeTabId = result.activeTabId;
                        this.currentScreen = 'screen2';
                    }
                    if (result.formValues) {
                        this.formValues = {
                            ...this.formValues,
                            ...result.formValues
                        };
                        if (result.formValues.Headquarters_City_and_Country__c) {
                            this.hqSearchKey = result.formValues.Headquarters_City_and_Country__c;
                        }
                    }
                    if (result.skillingDomains && result.skillingDomains.length > 0) {
                        this.skillingDomainRows = result.skillingDomains;
                    }
                    if (result.businessSectors && result.businessSectors.length > 0) {
                        this.businessSectorRows = result.businessSectors;
                    }
                    if (result.livelihoodPrograms && result.livelihoodPrograms.length > 0) {
                        this.livelihoodProgramRows = result.livelihoodPrograms;
                    }
                    if (result.communities && result.communities.length > 0) {
                        this.communityRows = result.communities;
                    }
                    if (result.documents && result.documents.length > 0) {
                        this.docRows = result.documents;
                    }
                    if (result.q24Files && result.q24Files.length > 0) {
                        this.q24UploadedFiles = result.q24Files;
                    }
                    if (result.q28Files && result.q28Files.length > 0) {
                        this.q28UploadedFiles = result.q28Files;
                    }
                    this.loadMetadata();
                }
            })
            .catch(err => {
                console.error('Error loading dynamic draft:', err);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    _buildQuestionItem(q) {
        const key = q.key || q.Question_Code__c || q.DeveloperName || q.targetField;
        const targetField = q.targetField || q.Field_API_Name__c || key;
        const label = this.getQuestionLabel(key, q.label || q.Label__c || q.MasterLabel || key);
        const dt = (q.displayType || q.Display_Type__c || 'Text').toLowerCase();
        
        let val = this.formValues[targetField];
        if (val === undefined && targetField) {
            const targetLower = targetField.toLowerCase();
            const matchedKey = Object.keys(this.formValues).find(k => k.toLowerCase() === targetLower);
            if (matchedKey) val = this.formValues[matchedKey];
        }
        if (val === undefined) val = '';

        let isRequired = q.isRequired !== undefined ? q.isRequired : true;
        if (key === 'Q2_LEADER_TENURE' || targetField === 'Leader_Tenure__c') {
            isRequired = false;
        }

        const isHqSearch = key === 'Q2_HQ_LOCATION' || targetField === 'Headquarters_City_and_Country__c';
        const isPhoneInput = key === 'Q3_PHONE' || targetField === 'Phone__c' || dt === 'phone';
        const isEmail = (key === 'Q3_WORK_EMAIL' || targetField === 'Work_Email_ID__c' || dt === 'email') && !isPhoneInput;
        const isNumber = (key === 'Q2_LEADER_TENURE' || targetField === 'Leader_Tenure__c' || dt === 'number' || dt === 'currency' || dt === 'percent') && !isPhoneInput;
        
        const isLegalType = key === 'Q4_LEGAL_TYPE' || targetField === 'Legal_Type__c';
        const isJurisdiction = key === 'Q4_JURISDICTION' || targetField === 'Registration_Jurisdiction__c';
        const isIncorpDate = key === 'Q4_INCORP_DATE' || targetField === 'Incorporation_Date__c';
        const isGovernanceRichText = key === 'Q4_GOVERNANCE_DESC' || targetField === 'Legal_Structure__c';
        
        const isCompliancePicklist = (key && key.startsWith('Q5_')) || (targetField && (targetField.includes('501c3') || targetField.includes('Equivalency') || targetField.includes('FCRA') || targetField.includes('Willing')));
        const isFiscalMonth = key === 'Q6_FISCAL_MONTH' || targetField === 'Fiscal_Month__c';
        const isFiscalDay = key === 'Q6_FISCAL_DAY' || targetField === 'Fiscal_Day__c';
        
        const isPicklist = (dt === 'picklist' || dt === 'combobox') && !isLegalType && !isJurisdiction && !isCompliancePicklist && !isFiscalMonth && !isFiscalDay;
        const isDate = (dt === 'date' || dt === 'datetime') && !isIncorpDate;
        const isTextArea = (dt === 'textarea' || dt === 'richtext') && !isGovernanceRichText;
        const isCheckbox = (dt === 'checkbox' || dt === 'boolean');
        const isText = !isHqSearch && !isPhoneInput && !isEmail && !isNumber && !isLegalType && !isJurisdiction && !isIncorpDate && !isGovernanceRichText && !isCompliancePicklist && !isFiscalMonth && !isFiscalDay && !isPicklist && !isDate && !isTextArea && !isCheckbox;

        let options = [];
        if (isLegalType) {
            options = this.legalTypeOptions;
        } else if (isJurisdiction) {
            options = this.countryOptions;
        } else if (key === 'Q5_FCRA_STATUS') {
            options = this.yesNoNotApplicableOptions;
        } else if (isCompliancePicklist) {
            options = this.yesNoOptions;
        } else if (isFiscalMonth) {
            options = this.fiscalMonthOptions;
        } else if (isFiscalDay) {
            options = this.fiscalDayOptions;
        } else if (q.options && q.options.length) {
            options = q.options;
        } else if (q.picklistOptions && q.picklistOptions.length) {
            options = q.picklistOptions;
        }

        let wrapperClass = 'modern-field';
        if (key === 'Q2_PRIMARY_REGIONS' || targetField === 'Primary_Service_Regions__c' || isTextArea) {
            wrapperClass = 'modern-field full-width';
        } else if (key === 'Q2_LEADER_TENURE' || targetField === 'Leader_Tenure__c') {
            wrapperClass = 'modern-field optional-field';
        }

        let helpText = q.helpText;
        if (!helpText && (key === 'Q4_GOVERNANCE_DESC' || targetField === 'Legal_Structure__c')) {
            helpText = this.getQuestionLabel('Q4_GOVERNANCE_HELPER', 'Briefly describe your governance and operational structure — board, leadership, key affiliations (<100 words).');
        }

        return {
            key,
            targetField,
            label,
            value: val,
            isRequired,
            helpText: helpText,
            placeholder: q.placeholder || '',
            wrapperClass,
            isHqSearch,
            isPhoneInput,
            isEmail,
            isNumber,
            isLegalType,
            isJurisdiction,
            isIncorpDate,
            isGovernanceRichText,
            isCompliancePicklist,
            isFiscalMonth,
            isFiscalDay,
            isPicklist,
            isDate,
            isTextArea,
            isCheckbox,
            isText,
            options
        };
    }

    _getSectionQuestionList(sectionCode, keyPrefix, defaults, extraFilterFn) {
        let list = [];
        if (this.metadataQuestions && this.metadataQuestions.length) {
            const matched = this.metadataQuestions.filter(q => {
                const qKey = q.key || q.Question_Code__c || q.DeveloperName || '';
                const qSec = q.sectionCode || q.Section_Code__c || '';
                const matchesKey = qKey && qKey.toUpperCase().startsWith(keyPrefix.toUpperCase());
                const matchesSection = qSec === sectionCode || qSec.toUpperCase() === keyPrefix.toUpperCase();
                const passes = matchesKey || matchesSection;
                return passes && (extraFilterFn ? extraFilterFn(q) : true);
            });
            if (matched.length > 0) {
                list = [...matched].sort((a, b) => (a.sequence || 99) - (b.sequence || 99));
            }
        }
        if (!list.length && defaults) {
            list = defaults;
        }
        return list.map(q => this._buildQuestionItem(q));
    }

    get q2Questions() {
        const defaults = [
            { key: 'Q2_ORG_NAME', targetField: 'Organization_Name__c', label: 'Organizational Name', displayType: 'Text', isRequired: true, sequence: 1 },
            { key: 'Q2_HQ_LOCATION', targetField: 'Headquarters_City_and_Country__c', label: 'Headquarters City and Country', displayType: 'Text', isRequired: true, sequence: 2 },
            { key: 'Q2_PRIMARY_REGIONS', targetField: 'Primary_Service_Regions__c', label: 'Primary Service Regions', displayType: 'Text', isRequired: true, sequence: 3 },
            { key: 'Q2_LEADER_NAME', targetField: 'Leader_Name__c', label: 'Leader Name', displayType: 'Text', isRequired: true, sequence: 4 },
            { key: 'Q2_LEADER_TITLE', targetField: 'Leader_Title__c', label: 'Leader Title', displayType: 'Text', isRequired: true, sequence: 5 },
            { key: 'Q2_LEADER_TENURE', targetField: 'Leader_Tenure__c', label: 'Leader Tenure (Optional)', displayType: 'Number', isRequired: false, sequence: 6 }
        ];
        return this._getSectionQuestionList('SEC_ABOUT_ORG', 'Q2_', defaults);
    }

    get q3Questions() {
        const defaults = [
            { key: 'Q3_SUBMITTER_NAME', targetField: 'Submitter_Name__c', label: 'Submitter Name', displayType: 'Text', isRequired: true, sequence: 1 },
            { key: 'Q3_JOB_TITLE', targetField: 'Job_Title__c', label: 'Job Title', displayType: 'Text', isRequired: true, sequence: 2 },
            { key: 'Q3_PHONE', targetField: 'Phone__c', label: 'Phone Number', displayType: 'Phone', isRequired: true, sequence: 3 },
            { key: 'Q3_WORK_EMAIL', targetField: 'Work_Email_ID__c', label: 'Work Email', displayType: 'Email', isRequired: true, sequence: 4 }
        ];
        return this._getSectionQuestionList('SEC_ABOUT_ORG', 'Q3_', defaults);
    }

    get q4Questions() {
        const defaults = [
            { key: 'Q4_LEGAL_TYPE', targetField: 'Legal_Type__c', label: 'Legal Structure', displayType: 'Picklist', isRequired: true, sequence: 1 },
            { key: 'Q4_JURISDICTION', targetField: 'Registration_Jurisdiction__c', label: 'Registration Jurisdiction', displayType: 'Picklist', isRequired: true, sequence: 2 },
            { key: 'Q4_INCORP_DATE', targetField: 'Incorporation_Date__c', label: 'Incorporation Date', displayType: 'Date', isRequired: true, sequence: 3 }
        ];
        return this._getSectionQuestionList('SEC_ABOUT_ORG', 'Q4_', defaults, q => {
            const k = q.key || q.Question_Code__c || '';
            const f = q.targetField || q.Field_API_Name__c || '';
            return k !== 'Q4_GOVERNANCE_DESC' && f !== 'Legal_Structure__c';
        });
    }

    get q4GovernanceQuestions() {
        const defaults = [
            { key: 'Q4_GOVERNANCE_DESC', targetField: 'Legal_Structure__c', label: 'Describe your governance structure and key governing bodies.', displayType: 'TextArea', isRequired: true, sequence: 4 }
        ];
        return this._getSectionQuestionList('SEC_ABOUT_ORG', 'Q4_GOVERNANCE', defaults, q => {
            const k = q.key || q.Question_Code__c || '';
            const f = q.targetField || q.Field_API_Name__c || '';
            return k === 'Q4_GOVERNANCE_DESC' || f === 'Legal_Structure__c';
        });
    }

    get q5Questions() {
        const defaults = [
            { key: 'Q5_US_501C3', targetField: 'Has_501c3_Status__c', label: 'Do you have 501(c)(3) status in the US?', displayType: 'Picklist', isRequired: true, sequence: 1 },
            { key: 'Q5_ED_STATUS', targetField: 'Has_Equivalency_Determination__c', label: 'Do you have an Equivalency Determination (ED) in place?', displayType: 'Picklist', isRequired: true, sequence: 2 },
            { key: 'Q5_FCRA_STATUS', targetField: 'Is_FCRA_Registered__c', label: 'If you operate in India, are you FCRA-registered?', displayType: 'Picklist', isRequired: true, sequence: 3 },
            { key: 'Q5_WILLING_ED', targetField: 'Willing_to_Pursue_ED__c', label: 'If none of the above apply, would you be willing to pursue ED certification if selected?', displayType: 'Picklist', isRequired: true, sequence: 4 }
        ];
        return this._getSectionQuestionList('SEC_ABOUT_ORG', 'Q5_', defaults);
    }

    get q6Questions() {
        const defaults = [
            { key: 'Q6_FISCAL_MONTH', targetField: 'Fiscal_Month__c', label: 'Month', displayType: 'Picklist', isRequired: true, sequence: 1 },
            { key: 'Q6_FISCAL_DAY', targetField: 'Fiscal_Day__c', label: 'Day', displayType: 'Picklist', isRequired: true, sequence: 2 }
        ];
        return this._getSectionQuestionList('SEC_ABOUT_ORG', 'Q6_', defaults);
    }

    _getCustomQuestions(filterFn, basePrefix) {
        if (!this.metadataQuestions || !this.metadataQuestions.length) return [];
        const filtered = this.metadataQuestions.filter(q => q.isCustom && filterFn(q));
        return filtered.map((q, idx) => {
            let val = undefined;
            if (q.targetField) {
                val = this.formValues[q.targetField];
                if (val === undefined) {
                    const targetLower = q.targetField.toLowerCase();
                    const matchedKey = Object.keys(this.formValues).find(k => k.toLowerCase() === targetLower);
                    if (matchedKey) {
                        val = this.formValues[matchedKey];
                    }
                }
            }
            if (val === undefined && q.key) {
                val = this.formValues[q.key];
            }
            const dt = (q.displayType || 'Text').toLowerCase();
            let displayVal = val;
            if (val === undefined || val === null || val === '') {
                displayVal = '—';
            } else if (typeof val === 'boolean' || dt === 'checkbox' || dt === 'boolean') {
                displayVal = (val === true || val === 'true') ? 'Yes' : 'No';
            }
            const rawOpts = q.options || q.picklistOptions || [];
            const options = rawOpts.map(opt => {
                if (typeof opt === 'string') {
                    const cleanOpt = opt.trim();
                    return { label: cleanOpt, value: cleanOpt };
                }
                return opt;
            });
            const keyVal = q.key || q.targetField || `cq-${idx}`;
            return {
                ...q,
                key: keyVal,
                displayNumber: basePrefix ? `${basePrefix}.${idx + 1}` : `${idx + 1}`,
                value: val !== undefined ? val : '',
                displayValue: String(displayVal),
                isText: dt === 'text' || dt === 'string' || dt === 'phone' || dt === 'email',
                isTextArea: dt === 'textarea' || dt === 'richtext',
                isNumber: dt === 'number' || dt === 'currency' || dt === 'percent',
                isDate: dt === 'date' || dt === 'datetime',
                isCheckbox: dt === 'checkbox' || dt === 'boolean',
                isPicklist: (dt === 'picklist' || dt === 'combobox') && options.length > 0,
                options: options,
                wrapperClass: (dt === 'textarea' || dt === 'richtext') ? 'modern-field full-width' : 'modern-field'
            };
        });
    }

    // Sub-section 2: Organizational Identifying Information (e.g. Q2_VOLUNTEER_COUNT, Annual_Volunteer_Count__c)
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

    // Sub-section 3: Submitter Contact Information
    get customQuestionsQ3() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q3' || q.sectionCode === 'Q3'
        ) && q.key && q.key.toUpperCase().startsWith('Q3_'), '3');
    }
    get hasCustomQuestionsQ3() {
        return this.customQuestionsQ3 && this.customQuestionsQ3.length > 0;
    }

    // Sub-section 4: Legal & Governance Structure
    get customQuestionsQ4() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q4' || q.sectionCode === 'Q4'
        ) && q.key && q.key.toUpperCase().startsWith('Q4_'), '4');
    }
    get hasCustomQuestionsQ4() {
        return this.customQuestionsQ4 && this.customQuestionsQ4.length > 0;
    }

    // Sub-section 5: Legal & Tax Compliance
    get customQuestionsQ5() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q5' || q.sectionCode === 'Q5'
        ) && q.key && q.key.toUpperCase().startsWith('Q5_'), '5');
    }
    get hasCustomQuestionsQ5() {
        return this.customQuestionsQ5 && this.customQuestionsQ5.length > 0;
    }

    // Sub-section 6: Fiscal Year
    get customQuestionsQ6() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q6' || q.sectionCode === 'Q6'
        ) && q.key && q.key.toUpperCase().startsWith('Q6_'), '6');
    }
    get hasCustomQuestionsQ6() {
        return this.customQuestionsQ6 && this.customQuestionsQ6.length > 0;
    }

    // Sub-section 7: Top Funders
    get customQuestionsQ7() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q7' || q.sectionCode === 'Q7'
        ) && q.key && q.key.toUpperCase().startsWith('Q7_'), '7');
    }
    get hasCustomQuestionsQ7() {
        return this.customQuestionsQ7 && this.customQuestionsQ7.length > 0;
    }

    // Sub-section 8: References
    get customQuestionsQ8() {
        return this._getCustomQuestions(q => (
            q.sectionCode === 'SEC_ABOUT_ORG' || q.sectionCode === 'SEC_ABOUT_ORG_Q8' || q.sectionCode === 'Q8'
        ) && q.key && q.key.toUpperCase().startsWith('Q8_'), '8');
    }
    get hasCustomQuestionsQ8() {
        return this.customQuestionsQ8 && this.customQuestionsQ8.length > 0;
    }

    // General Custom Questions for Tab 1 (About Org) - remaining ones
    get customQuestionsAboutOrg() {
        const renderedKeys = new Set([
            ...this.customQuestionsQ2.map(x => x.key),
            ...this.customQuestionsQ3.map(x => x.key),
            ...this.customQuestionsQ4.map(x => x.key),
            ...this.customQuestionsQ5.map(x => x.key),
            ...this.customQuestionsQ6.map(x => x.key),
            ...this.customQuestionsQ7.map(x => x.key),
            ...this.customQuestionsQ8.map(x => x.key)
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

    loadDraftData() {
        this.isLoading = true;
        getDynamicDraft({ recordId: this.recordId })
            .then(result => {
                if (result && result.isSuccess) {
                    if (result.recordId) {
                        this.recordId = result.recordId;
                    }

                    // 1. Tracks & Screen
                    if (result.selectedTracks && result.selectedTracks.length > 0) {
                        this.selectedTracks = [...result.selectedTracks];
                        this.currentScreen = 'screen2'; // Jump directly to the form screen
                    }

                    // 2. Active Tab
                    if (result.activeTabId) {
                        this.activeTabId = result.activeTabId;
                    }

                    // 3. Form Values
                    if (result.formValues) {
                        this.formValues = {
                            ...this.formValues,
                            ...result.formValues
                        };

                        if (this.formValues.Headquarters_City_and_Country__c) {
                            this.hqSearchKey = this.formValues.Headquarters_City_and_Country__c;
                        }

                        // Sync native phone input DOM if ITI is already initialized
                        const phoneInput = this.template.querySelector('input[data-id="phone"]');
                        if (phoneInput && this._phoneIti && this.formValues.Phone__c) {
                            const storedDial = this._extractDialCode(this.formValues.WG_Phone_Country_Code__c) || this._currentDialCode();
                            if (storedDial) {
                                try { this._phoneIti.setNumber(storedDial + this.formValues.Phone__c); }
                                catch (e) { /* ignore */ }
                            }
                            phoneInput.value = this._normalizeNationalNumber(
                                this.formValues.Phone__c,
                                storedDial || this._currentDialCode()
                            );
                        }

                        // Sync funder visibility toggles
                        if (result.formValues.Funder_2_Name__c || result.formValues.Funder_2_Amount__c) {
                            this.showFunder2 = true;
                        }
                        if (result.formValues.Funder_3_Name__c || result.formValues.Funder_3_Amount__c) {
                            this.showFunder3 = true;
                        }

                        // Sync reference visibility toggle
                        if (result.formValues.Reference_2_Name__c || result.formValues.Reference_2_Email__c) {
                            this.showReference2 = true;
                        }

                        // Recalculate word counts for loaded text
                        this._recalculateAllWordCounts();
                    }

                    // 4. Dynamic Grids
                    if (result.skillingDomains && result.skillingDomains.length > 0) {
                        this.skillingDomainRows = result.skillingDomains.map(d => ({
                            ...d,
                            displayWhenStarted: d.whenStarted ? this._formatDateDDMMYYYY(d.whenStarted) : ''
                        }));
                    }

                    if (result.businessSectors && result.businessSectors.length > 0) {
                        this.businessSectorRows = result.businessSectors.map(s => ({
                            ...s,
                            displayWhenBegan: s.whenBegan ? this._formatDateDDMMYYYY(s.whenBegan) : ''
                        }));
                    }

                    if (result.livelihoodPrograms && result.livelihoodPrograms.length > 0) {
                        this.livelihoodProgramRows = [...result.livelihoodPrograms];
                    }

                    if (result.communities && result.communities.length > 0) {
                        this.communityRows = [...result.communities];
                    }

                    if (result.documents && result.documents.length > 0) {
                        this.docRows = [...result.documents];
                    }

                    // 5. Uploaded Files
                    if (result.q24Files && result.q24Files.length > 0) {
                        this.q24UploadedFiles = [...result.q24Files];
                    }
                    if (result.q28Files && result.q28Files.length > 0) {
                        this.q28UploadedFiles = [...result.q28Files];
                    }

                    // Refresh metadata for fiscal calendar
                    this.loadMetadata();
                }
            })
            .catch(err => {
                console.error('Error loading dynamic draft:', err);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    _recalculateAllWordCounts() {
        const fields = [
            'Legal_Structure__c',
            'Revenue_Explanation__c',
            'Skilling_Approach__c',
            'Job_Creation_Approach__c',
            'Livelihood_Approach__c',
            'Organizational_Sustainability__c',
            'Use_of_Additional_Funding__c'
        ];
        fields.forEach(f => {
            const val = this.formValues[f] || '';
            const plain = this.stripHtml(val).trim();
            const words = plain ? plain.split(/\s+/).filter(w => w.length > 0).length : 0;
            this._updateWordCountForField(f, words);
        });
    }

    // ── FAQ Accordion Toggle Handler ────────────────────────────────────
    toggleFaq(event) {
        const faqKey = event.currentTarget.dataset.faq;
        if (faqKey && this.faqOpen.hasOwnProperty(faqKey)) {
            this.faqOpen = {
                ...this.faqOpen,
                [faqKey]: !this.faqOpen[faqKey]
            };
        }
    }

    get isFaqJobFulfillmentOpen() { return this.faqOpen.jobFulfillment; }
    get isFaqJobCreationOpen() { return this.faqOpen.jobCreation; }
    get isFaqLivelihoodOpen() { return this.faqOpen.livelihood; }

    get faqJobFulfillmentSymbol() { return this.faqOpen.jobFulfillment ? '–' : '+'; }
    get faqJobCreationSymbol() { return this.faqOpen.jobCreation ? '–' : '+'; }
    get faqLivelihoodSymbol() { return this.faqOpen.livelihood ? '–' : '+'; }

    // ── Screen Navigation ────────────────────────────────────────────────
    get isScreen1() {
        return this.currentScreen === 'screen1';
    }

    showBanner(variant, title, message, duration = 6000) {
        if (this._bannerTimeout) {
            clearTimeout(this._bannerTimeout);
        }
        this.bannerVariant = variant;
        this.bannerTitle = title;
        this.bannerMessage = message;
        this.bannerVisible = true;
        this._bannerTimeout = setTimeout(() => {
            this.bannerVisible = false;
        }, duration);
    }

    closeBanner() {
        if (this._bannerTimeout) {
            clearTimeout(this._bannerTimeout);
        }
        this.bannerVisible = false;
    }

    get isBannerError() { return this.bannerVariant === 'error'; }
    get isBannerWarning() { return this.bannerVariant === 'warning'; }
    get isBannerSuccess() { return this.bannerVariant === 'success'; }
    get isBannerInfo() { return this.bannerVariant === 'info'; }
    get bannerClass() {
        return 'wg-toast-banner ' + this.bannerVariant + '-banner';
    }

    handleGoToForm() {
        if (this.isNextDisabled) {
            this.showBanner('warning', 'Track Selection Required', 'Please select at least one track that your work covers.');
            return;
        }
        this.currentScreen = 'screen2';
        this.activeTabId = 'tabAboutOrg';
    }

    handleBackToTrackSelection() {
        this.currentScreen = 'screen1';
    }

    scrollToFaq(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const faqElement = this.template.querySelector('[data-id="faq-section"]') || 
                           this.template.querySelector('.faq-section-target') ||
                           this.template.querySelector('c-wcf-application-faq-modal');
        if (faqElement) {
            faqElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ── Track Choice Cards (2nd Image) ───────────────────────────────────
    get trackCards() {
        let allTracks = [];
        if (this.metadataTracks && this.metadataTracks.length > 0) {
            allTracks = this.metadataTracks.map(trk => ({
                code: trk.code,
                label: trk.label || trk.code
            }));
        } else {
            allTracks = [
                { code: 'JOB_FULFILLMENT', label: 'Job Fulfillment' },
                { code: 'JOB_CREATION', label: 'Job Creation' },
                { code: 'LIVELIHOOD', label: 'Livelihood upliftment' }
            ];
        }

        return allTracks.map(trk => {
            const isSelected = (this.selectedTracks || []).includes(trk.code);
            return {
                ...trk,
                isSelected,
                cssClass: isSelected ? 'track-card-option selected' : 'track-card-option'
            };
        });
    }

    handleTrackSelect(event) {
        const code = event.currentTarget.dataset.code;
        if (!code) return;

        this.isDirty = true;
        if (this.selectedTracks.includes(code)) {
            this.selectedTracks = this.selectedTracks.filter(t => t !== code);
        } else {
            this.selectedTracks = [...this.selectedTracks, code];
        }
    }

    // ── Dynamic Continuous Question Numbering (1 to N) ───────────────────
    get qNum() {
        let currentNumber = 1;
        const map = {};

        // Q1 is Track Selection on Screen 1
        map.Q1 = currentNumber++; // 1

        // Section 1: About Your Organization (Q2 - Q10)
        map.Q2 = currentNumber++; // 2
        map.Q3 = currentNumber++; // 3
        map.Q4 = currentNumber++; // 4
        map.Q5 = currentNumber++; // 5
        map.Q6 = currentNumber++; // 6
        map.Q7 = currentNumber++; // 7
        map.Q8 = currentNumber++; // 8
        map.Q9 = currentNumber++; // 9
        map.Q10 = currentNumber++; // 10

        const trks = this.selectedTracks || [];

        // Section 2: Job Fulfillment (Q11 - Q14)
        if (trks.includes('JOB_FULFILLMENT')) {
            map.Q11 = currentNumber++;
            map.Q12 = currentNumber++;
            map.Q13 = currentNumber++;
            map.Q14 = currentNumber++;
        } else {
            map.Q11 = '11';
            map.Q12 = '12';
            map.Q13 = '13';
            map.Q14 = '14';
        }

        // Section 2: Job Creation (Q15 - Q18)
        if (trks.includes('JOB_CREATION')) {
            map.Q15 = currentNumber++;
            map.Q16 = currentNumber++;
            map.Q17 = currentNumber++;
            map.Q18 = currentNumber++;
        } else {
            map.Q15 = '15';
            map.Q16 = '16';
            map.Q17 = '17';
            map.Q18 = '18';
        }

        // Section 2: Livelihood (Q19 - Q23)
        if (trks.includes('LIVELIHOOD')) {
            map.Q19 = currentNumber++;
            map.Q20 = currentNumber++;
            map.Q21 = currentNumber++;
            map.Q22 = currentNumber++;
            map.Q23 = currentNumber++;
        } else {
            map.Q19 = '19';
            map.Q20 = '20';
            map.Q21 = '21';
            map.Q22 = '22';
            map.Q23 = '23';
        }

        // Section 3: Why Wadhwani / Deliverables & Synergies (Q24 - Q28)
        map.Q24 = currentNumber++;
        map.Q25 = currentNumber++;
        map.Q26 = currentNumber++;
        map.Q27 = currentNumber++;
        map.Q28 = currentNumber++;

        return map;
    }

    // ── Dynamic Stepper Tabs ──────────────────────────────────────────────
    get dynamicTabs() {
        const tabs = [];
        let step = 1;
        const trks = this.selectedTracks || [];

        const aboutOrgTitle = this.getSectionTitle('SEC_ABOUT_ORG', 'About Your Organization');
        const step1 = step++;
        tabs.push({
            id: 'tabAboutOrg',
            stepNum: step1,
            mainTitle: `${aboutOrgTitle}`,
            qRange: '',
            fullTitle: `${aboutOrgTitle.toUpperCase()}`
        });

        if (trks.includes('JOB_FULFILLMENT')) {
            const jfTitle = this.getSectionTitle('SEC_JOB_FULFILLMENT', 'Job Fulfillment');
            const stepJF = step++;
            tabs.push({
                id: 'tabJobFulfillment',
                stepNum: stepJF,
                mainTitle: `${jfTitle}`,
                qRange: '',
                fullTitle: `${jfTitle.toUpperCase()}`
            });
        }

        if (trks.includes('JOB_CREATION')) {
            const jcTitle = this.getSectionTitle('SEC_JOB_CREATION', 'Job Creation');
            const stepJC = step++;
            tabs.push({
                id: 'tabJobCreation',
                stepNum: stepJC,
                mainTitle: `${jcTitle}`,
                qRange: '',
                fullTitle: `${jcTitle.toUpperCase()}`
            });
        }

        if (trks.includes('LIVELIHOOD')) {
            const livTitle = this.getSectionTitle('SEC_LIVELIHOOD', 'Livelihood Upliftment');
            const stepLiv = step++;
            tabs.push({
                id: 'tabLivelihood',
                stepNum: stepLiv,
                mainTitle: `${livTitle}`,
                qRange: '',
                fullTitle: `${livTitle.toUpperCase()}`
            });
        }

        // Dynamic Custom Track Tabs from Metadata
        const standardTrackCodes = new Set(['JOB_FULFILLMENT', 'JOB_CREATION', 'LIVELIHOOD']);
        const customSelectedTracks = trks.filter(t => !standardTrackCodes.has(t));
        customSelectedTracks.forEach(ctCode => {
            const matchedSection = (this.metadataSections || []).find(s => s.applicableTracks && s.applicableTracks.includes(ctCode));
            const secTitle = cleanTitle(matchedSection ? matchedSection.title : ctCode);
            const tabKey = `tab_${ctCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            const stepCustom = step++;

            tabs.push({
                id: tabKey,
                stepNum: stepCustom,
                trackCode: ctCode,
                mainTitle: `${secTitle}`,
                qRange: '',
                fullTitle: `${secTitle.toUpperCase()}`
            });
        });

        const whyTitle = this.getSectionTitle('SEC_WHY_WADHWANI', 'Why Wadhwani Grants');
        const stepWhy = step++;
        tabs.push({
            id: 'tabWhyWadhwani',
            stepNum: stepWhy,
            mainTitle: `${whyTitle}`,
            qRange: '',
            fullTitle: `${whyTitle.toUpperCase()}`
        });

        const revTitle = this.getSectionTitle('SEC_REVIEW_SUBMIT', 'Review & Submit');
        const stepRev = step++;
        tabs.push({
            id: 'tabReviewSubmit',
            stepNum: stepRev,
            mainTitle: `${revTitle}`,
            qRange: '',
            fullTitle: `${revTitle.toUpperCase()}`
        });

        const total = tabs.length;
        const activeIdx = tabs.findIndex(t => t.id === this.activeTabId);

        return tabs.map((t, idx) => {
            const isCompleted = idx < activeIdx;
            const isActive = idx === activeIdx;

            let bubbleClass = 'tracker-bubble';
            if (isActive) bubbleClass += ' tracker-bubble--active';
            else if (isCompleted) bubbleClass += ' tracker-bubble--done';

            let labelClass = 'tracker-label';
            if (isActive) labelClass += ' tracker-label--active';

            let connectorClass = '';
            if (idx < total - 1) {
                connectorClass = 'tracker-connector';
                if (idx < activeIdx) {
                    connectorClass += ' tracker-connector--done';
                }
            }

            return {
                ...t,
                isCompleted,
                isActive,
                bubbleClass,
                labelClass,
                connectorClass,
                cssClass: isActive ? 'step-btn active' : 'step-btn'
            };
        });
    }

    get currentTabSubTitle() {
        const current = this.dynamicTabs.find(t => t.id === this.activeTabId);
        return current ? current.fullTitle : 'ABOUT YOUR ORGANIZATION';
    }

    get isTabAboutOrg() { return this.activeTabId === 'tabAboutOrg'; }
    get isTabJobFulfillment() { return this.activeTabId === 'tabJobFulfillment'; }
    get isTabJobCreation() { return this.activeTabId === 'tabJobCreation'; }
    get isTabLivelihood() { return this.activeTabId === 'tabLivelihood'; }
    get isTabWhyWadhwani() { return this.activeTabId === 'tabWhyWadhwani'; }
    get isTabReviewSubmit() { return this.activeTabId === 'tabReviewSubmit'; }

    get activeCustomTrackTab() {
        const tab = (this.dynamicTabs || []).find(t => t.id === this.activeTabId && t.trackCode);
        if (!tab) return null;
        const trackCode = tab.trackCode;
        const questions = this._getCustomQuestions(q => (
            (q.applicableTracks && q.applicableTracks.includes(trackCode)) ||
            (q.sectionCode && q.sectionCode.toUpperCase().includes(trackCode.toUpperCase()))
        ), `${tab.stepNum}`);
        return {
            trackCode: trackCode,
            title: tab.mainTitle,
            questions: questions,
            hasQuestions: questions && questions.length > 0
        };
    }

    get hasJobFulfillmentTrack() {
        return this.selectedTracks && this.selectedTracks.includes('JOB_FULFILLMENT');
    }

    get hasJobCreationTrack() {
        return this.selectedTracks && this.selectedTracks.includes('JOB_CREATION');
    }

    get hasLivelihoodTrack() {
        return this.selectedTracks && this.selectedTracks.includes('LIVELIHOOD');
    }

    get isFirstTab() { return this.dynamicTabs[0]?.id === this.activeTabId; }
    get isLastTab() { return this.dynamicTabs[this.dynamicTabs.length - 1]?.id === this.activeTabId; }

    @track isAttested = false;

    handleAttestationChange(event) {
        this.isAttested = event.target?.checked || false;
    }

    get isSubmitDisabled() {
        return !this.isAttested || this.isLoading;
    }

    get attestingUserName() {
        return this.formValues.Attesting_User_Name__c !== undefined ? this.formValues.Attesting_User_Name__c : (this.formValues.Submitter_Name__c || '');
    }

    get attestingUserTitle() {
        return this.formValues.Attesting_User_Title__c !== undefined ? this.formValues.Attesting_User_Title__c : (this.formValues.Job_Title__c || '');
    }

    get selectedTrackLabelsDisplay() {
        if (!this.selectedTracks || this.selectedTracks.length === 0) return '—';
        const labelsMap = {
            JOB_FULFILLMENT: 'Job Fulfillment',
            JOB_CREATION: 'Job Creation',
            LIVELIHOOD: 'Livelihood upliftment'
        };
        return this.selectedTracks.map(t => labelsMap[t] || t).join(' and ');
    }

    get formattedFiscalYearEndReview() {
        const m = this.formValues.Fiscal_Month__c || '';
        const d = this.formValues.Fiscal_Day__c || '';
        if (!m && !d) return '—';
        return `${d} ${m}`.trim();
    }

    get skillingDomainsForReview() {
        return (this.skillingDomainRows || [])
            .filter(r => r && r.name && r.name.trim() !== '')
            .map(r => ({
                ...r,
                displayWhenStarted: r.displayWhenStarted || (r.whenStarted ? this._formatDateDDMMYYYY(r.whenStarted) : '—')
            }));
    }

    get hasSkillingDomainsForReview() {
        return this.skillingDomainsForReview.length > 0;
    }

    get businessSectorsForReview() {
        return (this.businessSectorRows || [])
            .filter(r => r && (r.sector || r.sectorOther))
            .map(r => {
                const sectorName = r.sector === 'Other' ? (r.sectorOther || 'Other') : (r.sector || '—');
                let typesArr = Array.isArray(r.supportTypes) ? [...r.supportTypes] : [];
                if (typesArr.includes('Other') && r.supportTypeOther) {
                    typesArr = typesArr.map(t => t === 'Other' ? `Other: ${r.supportTypeOther}` : t);
                }
                return {
                    ...r,
                    sectorDisplay: sectorName,
                    supportTypesDisplay: typesArr.length > 0 ? typesArr.join(', ') : '—',
                    displayWhenBegan: r.displayWhenBegan || (r.whenBegan ? this._formatDateDDMMYYYY(r.whenBegan) : '—')
                };
            });
    }

    get hasBusinessSectorsForReview() {
        return this.businessSectorsForReview.length > 0;
    }

    get livelihoodProgramsForReview() {
        return (this.livelihoodProgramRows || [])
            .filter(r => r && r.name && r.name.trim() !== '')
            .map(r => ({
                ...r,
                supportType: r.supportType || '—',
                manHours: (r.manHours !== null && r.manHours !== undefined && r.manHours !== '') ? r.manHours : '—',
                enrollment: (r.enrollment !== null && r.enrollment !== undefined && r.enrollment !== '') ? r.enrollment : '—'
            }));
    }

    get hasLivelihoodProgramsForReview() {
        return this.livelihoodProgramsForReview.length > 0;
    }

    get communityRowsForReview() {
        return (this.communityRows || [])
            .filter(r => r && (r.state || r.district))
            .map(r => ({
                ...r,
                state: r.state || '—',
                district: r.district || '—',
                fy3: (r.fy3 !== null && r.fy3 !== undefined && r.fy3 !== '') ? r.fy3 : '—',
                fy2: (r.fy2 !== null && r.fy2 !== undefined && r.fy2 !== '') ? r.fy2 : '—',
                fy1: (r.fy1 !== null && r.fy1 !== undefined && r.fy1 !== '') ? r.fy1 : '—',
                proj: (r.proj !== null && r.proj !== undefined && r.proj !== '') ? r.proj : '—'
            }));
    }

    get hasCommunityRowsForReview() {
        return this.communityRowsForReview.length > 0;
    }

    _scriptsInitiated = false;
    isJsLoaded = false;
    logoBase64 = null;
    _logoAspectRatio = null;

    _loadPdfLibraries() {
        if (this._scriptsInitiated) return;
        this._scriptsInitiated = true;

        loadScript(this, JSPDF)
            .then(() => loadScript(this, AUTO_TABLE))
            .then(() => {
                this.isJsLoaded = true;
                console.log('✅ jsPDF and AutoTable loaded successfully in WCF Dynamic Form');

                if (this.winLogoUrl) {
                    fetch(this.winLogoUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                this.logoBase64 = reader.result;
                                const img = new Image();
                                img.onload = () => {
                                    if (img.naturalWidth && img.naturalHeight) {
                                        this._logoAspectRatio = img.naturalWidth / img.naturalHeight;
                                    }
                                };
                                img.src = this.logoBase64;
                            };
                            reader.readAsDataURL(blob);
                        })
                        .catch(err => console.warn('⚠️ Logo load failed (non-critical):', err));
                }
            })
            .catch(err => {
                console.error('❌ jsPDF/AutoTable load error:', err);
                this._scriptsInitiated = false;
                this.isJsLoaded = false;
            });
    }

    async _waitForPdfLibrary(timeout = 8000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (window.jspdf?.jsPDF) return true;
            await new Promise(r => setTimeout(r, 200));
        }
        return Boolean(window.jspdf?.jsPDF);
    }

    async handleDownloadPDF() {
        if (!this.isJsLoaded || !window.jspdf?.jsPDF) {
            this.showBanner('info', 'Preparing PDF', 'Loading PDF library, please wait…');
            this._scriptsInitiated = false;
            this._loadPdfLibraries();
            const ready = await this._waitForPdfLibrary(8000);
            if (!ready) {
                window.print();
                return;
            }
        }

        const jsPDFLib = window.jspdf?.jsPDF;
        if (!jsPDFLib) {
            window.print();
            return;
        }

        const form = this.formValues;
        const val = v => (v === null || v === undefined || v === '') ? '—' : String(v);
        const val$ = v => {
            if (v === null || v === undefined || v === '') return '—';
            const n = Number(v);
            if (isNaN(n)) return `$${v}`;
            return `$${n.toLocaleString('en-US')}`;
        };

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
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = 20;
        let pageCount = 1;

        const BRAND      = [191, 32, 38];    // Wadhwani Crimson Red -- corrected to var(--wg-red)'s actual rgb (was stale pre-rebrand #990000; audit sweep fix)
        const NAVY       = [27, 42, 74];     // Navy (#1B2A4A)
        const BRAND_SOFT = [253, 246, 244];  // Soft tint
        const TEXT_DARK  = [33, 37, 41];
        const TEXT_GRAY  = [100, 100, 100];
        const LINE_GRAY  = [220, 220, 220];

        const addHeader = () => {
            if (this.logoBase64 && pageCount === 1) {
                const logoW = 40;
                const ratio = this._logoAspectRatio || (242 / 120);
                const logoH = logoW / ratio;
                doc.addImage(this.logoBase64, 'PNG', (pageWidth - logoW) / 2, 12, logoW, logoH);
                y = 12 + logoH + 8;
            }
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...BRAND);
            doc.text('Wadhwani Grants Application', pageWidth / 2, y, { align: 'center' });
            y += 5;
            doc.setDrawColor(...BRAND);
            doc.setLineWidth(0.6);
            doc.line(15, y, pageWidth - 15, y);
            y += 10;
            doc.setTextColor(...TEXT_DARK);
        };

        const checkPage = (needed = 15) => {
            if (y + needed >= pageHeight - 20) {
                doc.addPage();
                pageCount++;
                y = 20;
            }
        };

        const section = (title) => {
            checkPage(24);
            y += 6;
            doc.setFillColor(...NAVY);
            doc.rect(15, y, pageWidth - 30, 10, 'F');
            doc.setFillColor(...BRAND);
            doc.rect(15, y + 10, pageWidth - 30, 1, 'F');
            doc.setFontSize(10.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(title.toUpperCase(), 19, y + 6.8);
            y += 16;
            doc.setFontSize(9.5);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...TEXT_DARK);
        };

        const subHead = (qNum, title) => {
            checkPage(16);
            y += 4;
            if (qNum) {
                doc.setFillColor(...BRAND_SOFT);
                const w = doc.getTextWidth(qNum) + 6;
                doc.roundedRect(15, y - 4, w, 5.5, 1, 1, 'F');
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...BRAND);
                doc.text(qNum, 18, y);
                doc.setFontSize(9.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...TEXT_DARK);
                doc.text(title, 15 + w + 3, y);
            } else {
                doc.setFontSize(9.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...TEXT_DARK);
                doc.text(title, 15, y);
            }
            y += 7;
        };

        const printLines = (text, indent = 15) => {
            const lines = doc.splitTextToSize(text, pageWidth - indent - 15);
            lines.forEach(line => {
                checkPage(6);
                doc.text(line, indent, y);
                y += 5;
            });
        };

        const labelValue = (label, value, qNum = null) => {
            if (value === null || value === undefined || value === '') return;
            checkPage(16);

            let labelX = 15;
            if (qNum) {
                doc.setFontSize(7.5);
                doc.setFont(undefined, 'bold');
                const bw = doc.getTextWidth(qNum) + 5;
                doc.setFillColor(...BRAND_SOFT);
                doc.roundedRect(15, y - 3.5, bw, 5, 1, 1, 'F');
                doc.setTextColor(...BRAND);
                doc.text(qNum, 17.5, y);
                labelX = 15 + bw + 3;
            }

            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...TEXT_GRAY);
            doc.text(label.toUpperCase(), labelX, y);
            y += 4.5;

            doc.setFontSize(9.5);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...TEXT_DARK);
            printLines(parseHtml(String(value)), labelX);

            checkPage(4);
            doc.setDrawColor(...LINE_GRAY);
            doc.setLineWidth(0.2);
            doc.line(15, y + 1, pageWidth - 15, y + 1);
            y += 5.5;
        };

        const table = (head, body, aligns = null) => {
            checkPage(35);
            const columnStyles = {};
            const resolvedAligns = aligns || head.map((_, i) => (i === 0 ? 'left' : 'right'));
            resolvedAligns.forEach((a, i) => { columnStyles[i] = { halign: a }; });
            doc.autoTable({
                startY: y,
                head: [head],
                body,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 3.5,
                    lineColor: LINE_GRAY,
                    lineWidth: 0.2,
                    textColor: TEXT_DARK,
                    valign: 'middle'
                },
                headStyles: {
                    fillColor: NAVY,
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles,
                alternateRowStyles: { fillColor: BRAND_SOFT },
                margin: { left: 15, right: 15 }
            });
            y = doc.lastAutoTable.finalY + 8;
        };

        addHeader();

        // ══ SECTION 1 — About Your Organisation ══
        section('1. ABOUT YOUR ORGANISATION');
        labelValue('Selected Track', this.selectedTrackLabelsDisplay, 'Q1');
        labelValue('Organizational Name', form.Organization_Name__c, 'Q2');
        labelValue('Headquarters City and Country', form.Headquarters_City_and_Country__c, 'Q2');
        labelValue('Primary Service Regions', form.Primary_Service_Regions__c, 'Q2');
        labelValue('Leader Name', form.Leader_Name__c, 'Q2');
        labelValue('Leader Title', form.Leader_Title__c, 'Q2');
        labelValue('Leader Tenure', form.Leader_Tenure__c ? `${form.Leader_Tenure__c} years` : '', 'Q2');
        if (this.hasCustomQuestionsQ2) {
            this.customQuestionsQ2.forEach(cq => {
                if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                    labelValue(cq.label, String(cq.value), cq.displayNumber);
                }
            });
        }
        labelValue('Submitter Name', form.Submitter_Name__c, 'Q3');
        labelValue('Title', form.Job_Title__c, 'Q3');
        labelValue('Work Email', form.Work_Email_ID__c, 'Q3');
        labelValue('Phone number', form.Phone__c, 'Q3');
        if (this.hasCustomQuestionsQ3) {
            this.customQuestionsQ3.forEach(cq => {
                if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                    labelValue(cq.label, String(cq.value), cq.displayNumber);
                }
            });
        }
        labelValue('Legal Type', form.Legal_Type__c, 'Q4');
        labelValue('Registration Jurisdiction', form.Registration_Jurisdiction__c, 'Q4');
        labelValue('Incorporation Date', this.formattedIncorporationDate, 'Q4');
        labelValue('Brief Description', form.Legal_Structure__c, 'Q4');
        if (this.hasCustomQuestionsQ4) {
            this.customQuestionsQ4.forEach(cq => {
                if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                    labelValue(cq.label, String(cq.value), cq.displayNumber);
                }
            });
        }
        labelValue('501(c)(3) Status in US', form.Has_501c3_Status__c, 'Q5');
        labelValue('Equivalency Determination (ED)', form.Has_Equivalency_Determination__c, 'Q5');
        labelValue('FCRA Registered (India)', form.Is_FCRA_Registered__c, 'Q5');
        labelValue('Willing to Pursue ED', form.Willing_to_Pursue_ED__c, 'Q5');
        if (this.hasCustomQuestionsQ5) {
            this.customQuestionsQ5.forEach(cq => {
                if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                    labelValue(cq.label, String(cq.value), cq.displayNumber);
                }
            });
        }
        labelValue('Fiscal Year End Date', this.formattedFiscalYearEndReview, 'Q6');
        if (this.hasCustomQuestionsQ6) {
            this.customQuestionsQ6.forEach(cq => {
                if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                    labelValue(cq.label, String(cq.value), cq.displayNumber);
                }
            });
        }

        if (form.Funder_1_Name__c) {
            labelValue('Funder 1', `${form.Funder_1_Name__c} - ${val$(form.Funder_1_Amount__c)} (${val(form.Funder_1_Type__c)})`, 'Q7');
        }
        if (form.Funder_2_Name__c) {
            labelValue('Funder 2', `${form.Funder_2_Name__c} - ${val$(form.Funder_2_Amount__c)} (${val(form.Funder_2_Type__c)})`, 'Q7');
        }
        if (form.Funder_3_Name__c) {
            labelValue('Funder 3', `${form.Funder_3_Name__c} - ${val$(form.Funder_3_Amount__c)} (${val(form.Funder_3_Type__c)})`, 'Q7');
        }
        if (form.Reference_1_Name__c) {
            labelValue('Reference 1', `${form.Reference_1_Name__c} (${val(form.Reference_1_Role__c)}) - ${val(form.Reference_1_Email__c)}`, 'Q8');
        }
        if (form.Reference_2_Name__c) {
            labelValue('Reference 2', `${form.Reference_2_Name__c} (${val(form.Reference_2_Role__c)}) - ${val(form.Reference_2_Email__c)}`, 'Q8');
        }

        subHead('Q9', 'Historical Financial Data (Three Prior Fiscal Years)');
        table(['ITEM', val(this.fiscalYears.fy3Label), val(this.fiscalYears.fy2Label), val(this.fiscalYears.fy1Label)], [
            ['Balance at Start of Year', val$(form.START_FY3), val$(this.computedStartFY2), val$(this.computedStartFY1)],
            ['Revenue', val$(form.REV_FY3), val$(form.REV_FY2), val$(form.REV_FY1)],
            ['Capital Expenditure', val$(form.CAP_FY3), val$(form.CAP_FY2), val$(form.CAP_FY1)],
            ['Operating Expenditure', val$(form.OP_FY3), val$(form.OP_FY2), val$(form.OP_FY1)],
            ['Balance at End of Year', val$(this.computedEndFY3), val$(this.computedEndFY2), val$(this.computedEndFY1)]
        ]);

        subHead('Q10', 'Current Fiscal Year Data');
        table(['ITEM', 'BUDGET', 'PROJECTION', 'DEVIATION'], [
            ['Revenue', val$(form.CFY_REV_BUDGET), val$(form.CFY_REV_PROJ), val$(this.computedRevDeviation)],
            ['Capital Expenditure', val$(form.CFY_CAP_BUDGET), val$(form.CFY_CAP_PROJ), val$(this.computedCapDeviation)],
            ['Operating Expenditure', val$(form.CFY_OP_BUDGET), val$(form.CFY_OP_PROJ), val$(this.computedOpDeviation)],
            ['Revenue - Expense Net', val$(this.computedNetBudget), val$(this.computedNetProjection), val$(this.computedNetDeviation)]
        ]);
        if (this.isDeviationExplanationRequired) {
            labelValue('Explanation of Deviation', form.Revenue_Explanation__c, 'Q10');
        }
        if (this.hasCustomQuestionsAboutOrg) {
            this.customQuestionsAboutOrg.forEach(cq => {
                if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                    labelValue(cq.label, String(cq.value), cq.displayNumber);
                }
            });
        }

        // ══ SECTION 2 — Job Fulfillment ══
        if (this.hasJobFulfillmentTrack) {
            section('2. JOB FULFILLMENT');
            labelValue('Your Skilling Approach', form.Skilling_Approach__c, 'Q11');

            if (this.hasSkillingDomainsForReview) {
                subHead('Q12', 'Skilling Domains Offered');
                const domRows = this.skillingDomainsForReview.map(r => [r.name, val(r.hours), val(r.duration), val(r.displayWhenStarted), val(r.enrollment)]);
                table(['Domain / Program Name', 'Hours of Training', 'Duration (Months)', 'When Started', 'Annual Enrollment'], domRows);
            }

            subHead('Q13', 'Job Fulfillment Outcomes — Last 3 Fiscal Years (Actuals)');
            table(['ITEM', val(this.fiscalYears.fy3Label), val(this.fiscalYears.fy2Label), val(this.fiscalYears.fy1Label)], [
                ['# Learner Enrolments', val(this.formattedJfEnrollFY3), val(this.formattedJfEnrollFY2), val(this.formattedJfEnrollFY1)],
                ['# of learner placements', val(this.formattedJfPlaceFY3), val(this.formattedJfPlaceFY2), val(this.formattedJfPlaceFY1)],
                ['Placement %', `${val(this.computedJfPlacePctFY3)}%`, `${val(this.computedJfPlacePctFY2)}%`, `${val(this.computedJfPlacePctFY1)}%`],
                ['Avg Cost per Placement', val$(form.JF_COST_FY3), val$(form.JF_COST_FY2), val$(form.JF_COST_FY1)]
            ]);

            subHead('Q14', 'Job Fulfillment Outcomes — Current FY Projections');
            table(['ITEM', 'FY-2026 (CFY) — PROJECTION'], [
                ['# Learner Enrolments', val(this.formattedJfEnrollProj)],
                ['# of learner placements', val(this.formattedJfPlaceProj)],
                ['Placement %', `${val(this.computedJfPlacePctProj)}%`],
                ['Avg Cost per Placement', val$(form.JF_COST_PROJ)]
            ]);

            if (this.hasCustomQuestionsJobFulfillment) {
                this.customQuestionsJobFulfillment.forEach(cq => {
                    if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                        labelValue(cq.label, String(cq.value), cq.displayNumber);
                    }
                });
            }
        }

        // ══ SECTION 3 — Job Creation ══
        if (this.hasJobCreationTrack) {
            section('3. JOB CREATION');
            labelValue('Your Job Creation Approach', form.Job_Creation_Approach__c, 'Q15');

            if (this.hasBusinessSectorsForReview) {
                subHead('Q16', 'Business Sectors Served');
                const secRows = this.businessSectorsForReview.map(s => [s.sectorDisplay, val(s.displayWhenBegan), val(s.supportTypesDisplay), val(s.enrollment)]);
                table(['Business Sector', 'When Support Began', 'Type of Support Provided', 'Yearly Enrolment'], secRows);
            }

            subHead('Q17', 'Job Creation Outcomes — Last 3 Fiscal Years (Actuals)');
            table(['ITEM', val(this.fiscalYears.fy3Label), val(this.fiscalYears.fy2Label), val(this.fiscalYears.fy1Label)], [
                ['# New Businesses Started', val(form.JC_NEW_BIZ_FY3), val(form.JC_NEW_BIZ_FY2), val(form.JC_NEW_BIZ_FY1)],
                ['# jobs created by new businesses', val(form.JC_NEW_JOBS_FY3), val(form.JC_NEW_JOBS_FY2), val(form.JC_NEW_JOBS_FY1)],
                ['Existing Businesses Supported', val(form.JC_EXIST_BIZ_FY3), val(form.JC_EXIST_BIZ_FY2), val(form.JC_EXIST_BIZ_FY1)],
                ['# jobs created by existing businesses', val(form.JC_EXIST_JOBS_FY3), val(form.JC_EXIST_JOBS_FY2), val(form.JC_EXIST_JOBS_FY1)],
                ['Total Avg Cost per Job Created', val$(form.JC_COST_FY3), val$(form.JC_COST_FY2), val$(form.JC_COST_FY1)]
            ]);

            subHead('Q18', 'Job Creation Outcomes — Current FY Projections');
            table(['ITEM', 'CFY (PROJECTED)'], [
                ['# New Businesses Started', val(form.JC_NEW_BIZ_PROJ)],
                ['# jobs created by new businesses', val(form.JC_NEW_JOBS_PROJ)],
                ['Existing Businesses Supported', val(form.JC_EXIST_BIZ_PROJ)],
                ['# jobs created by existing businesses', val(form.JC_EXIST_JOBS_PROJ)],
                ['Total Avg Cost per Job Created', val$(form.JC_COST_PROJ)]
            ]);

            if (this.hasCustomQuestionsJobCreation) {
                this.customQuestionsJobCreation.forEach(cq => {
                    if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                        labelValue(cq.label, String(cq.value), cq.displayNumber);
                    }
                });
            }
        }

        // ══ SECTION 4 — Livelihood Upliftment ══
        if (this.hasLivelihoodTrack) {
            section('4. LIVELIHOOD UPLIFTMENT');
            labelValue('Your Livelihood Upliftment Approach', form.Livelihood_Approach__c, 'Q19');

            if (this.hasLivelihoodProgramsForReview) {
                subHead('Q20', 'Key Programs / Initiatives');
                const progRows = this.livelihoodProgramsForReview.map(p => [p.name, val(p.supportType), val(p.manHours), val(p.enrollment)]);
                table(['Program / Initiative Name', 'Type of Support Provided', 'Duration (Man-Hours)', 'Annual Enrollment'], progRows);
            }

            if (this.hasCommunityRowsForReview) {
                subHead('Q21', 'Communities Worked In');
                const commRows = this.communityRowsForReview.map(c => [c.state, val(c.district), val(c.fy3), val(c.fy2), val(c.fy1), val(c.proj)]);
                table(['State', 'District / Area', val(this.fiscalYears.fy3Label), val(this.fiscalYears.fy2Label), val(this.fiscalYears.fy1Label), 'CFY (projected)'], commRows);
            }

            subHead('Q22', 'Livelihood Outcomes (Actuals)');
            table(['ITEM', val(this.fiscalYears.fy3Label), val(this.fiscalYears.fy2Label), val(this.fiscalYears.fy1Label)], [
                ['Households served during the year', val(form.LIV_SERVED_FY3), val(form.LIV_SERVED_FY2), val(form.LIV_SERVED_FY1)],
                ['Households newly enrolled during the year', val(form.LIV_ENROLL_FY3), val(form.LIV_ENROLL_FY2), val(form.LIV_ENROLL_FY1)],
                ['Households meeting outcome criteria', val(form.LIV_OUTCOME_FY3), val(form.LIV_OUTCOME_FY2), val(form.LIV_OUTCOME_FY1)],
                ['Avg. cost per outcome (USD)', val$(form.LIV_COST_FY3), val$(form.LIV_COST_FY2), val$(form.LIV_COST_FY1)]
            ]);

            subHead('Q23', 'Livelihood Outcomes (Projections)');
            table(['ITEM', 'CFY (PROJECTED)'], [
                ['Households served during the year (projected)', val(form.LIV_SERVED_PROJ)],
                ['Households newly enrolled during the year (projected)', val(form.LIV_ENROLL_PROJ)],
                ['Households expected to meet outcome criteria', val(form.LIV_OUTCOME_PROJ)],
                ['Avg. cost per outcome (USD) - projected', val$(form.LIV_COST_PROJ)]
            ]);

            if (this.hasCustomQuestionsLivelihood) {
                this.customQuestionsLivelihood.forEach(cq => {
                    if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                        labelValue(cq.label, String(cq.value), cq.displayNumber);
                    }
                });
            }
        }

        // ══ SECTION 5 — Why Wadhwani Grants ══
        section('5. WHY WADHWANI GRANTS');
        labelValue('Outcomes Verified by Third Party', form.Q24_VERIFIED, 'Q24');
        labelValue('Verification Details', form.Details_of_Ethical_Received__c, 'Q24');
        if (this.q24UploadedFiles && this.q24UploadedFiles.length > 0) {
            labelValue('Verification Reports', this.q24UploadedFiles.map(f => f.name).join(', '), 'Q24');
        }
        labelValue('Organizational Sustainability', form.Organizational_Sustainability__c, 'Q25');
        labelValue('Desired Use of Additional Funding / Investment', form.Use_of_Additional_Funding__c, 'Q26');
        labelValue('Operational Synergies - Interest Level', form.GenieAI_Interest_Level__c, 'Q27');
        labelValue('Operational Synergies - Description', form.GenieAI_Synergies_Description__c, 'Q27');
        if (this.q28UploadedFiles && this.q28UploadedFiles.length > 0) {
            labelValue('Supporting Documents', this.q28UploadedFiles.map(f => f.name).join(', '), 'Q28');
        }

        if (this.hasCustomQuestionsWhyWadhwani) {
            this.customQuestionsWhyWadhwani.forEach(cq => {
                if (cq.value !== null && cq.value !== undefined && cq.value !== '') {
                    labelValue(cq.label, String(cq.value), cq.displayNumber);
                }
            });
        }

        section('CONFIRMATION OF ACCURACY');
        labelValue('Attesting User Name', this.attestingUserName);
        labelValue('Attesting User Title', this.attestingUserTitle);

        checkPage(15);
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_GRAY);
        doc.text(
            `Submitted by: ${form.Submitter_Name__c || ''}  |  Generated: ${new Date().toLocaleDateString()}`,
            15, pageHeight - 10
        );

        const fileName = `Wadhwani Grants Application ${form.Organization_Name__c || 'Draft'}.pdf`;
        doc.save(fileName);

        this.showBanner('success', 'PDF Downloaded', `${fileName} has been saved to your downloads.`);
    }

    _syncRichTextFieldsFromDOM() {
        const richTextElements = this.template.querySelectorAll('div[contenteditable="true"]');
        richTextElements.forEach(el => {
            const field = el.dataset?.field || el.dataset?.id || el.dataset?.key;
            if (field) {
                const htmlVal = el.innerHTML || '';
                const text = (el.innerText || '').trim();
                // Only overwrite formValues if DOM element has non-empty text
                if (text.length > 0) {
                    this.formValues[field] = htmlVal;
                    const words = text.split(/\s+/).filter(w => w.length > 0);
                    this._updateWordCountForField(field, words.length);
                } else if (this.formValues[field] && String(this.formValues[field]).trim() !== '') {
                    // Restore from formValues into empty DOM element
                    el.innerHTML = this.formValues[field];
                    const restoredText = (el.innerText || '').trim();
                    const words = restoredText ? restoredText.split(/\s+/).filter(w => w.length > 0) : [];
                    this._updateWordCountForField(field, words.length);
                }
            }
        });
    }

    handleTabClick(event) {
        this._syncRichTextFieldsFromDOM();
        const tabId = event.currentTarget.dataset.tabid;
        if (tabId) {
            this.activeTabId = tabId;
        }
    }

    handleNextTab() {
        this._syncRichTextFieldsFromDOM();
        if (!this.validateActiveTab()) {
            return;
        }

        const tabs = this.dynamicTabs;
        const index = tabs.findIndex(t => t.id === this.activeTabId);
        if (index !== -1 && index < tabs.length - 1) {
            const nextTab = tabs[index + 1];
            if (nextTab.id === 'tabReviewSubmit') {
                if (!this.formValues.Attesting_User_Name__c) {
                    this.formValues.Attesting_User_Name__c = this.formValues.Submitter_Name__c || '';
                }
                if (!this.formValues.Attesting_User_Title__c) {
                    this.formValues.Attesting_User_Title__c = this.formValues.Job_Title__c || '';
                }
            }
            this.activeTabId = nextTab.id;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Auto-save draft on moving to the next tab in background
        this.handleSaveDraft(false);
    }

    handlePrevTab() {
        this._syncRichTextFieldsFromDOM();
        const tabs = this.dynamicTabs;
        const index = tabs.findIndex(t => t.id === this.activeTabId);
        if (index > 0) {
            this.activeTabId = tabs[index - 1].id;
        }
    }

    // ── Form Input Handlers & Live Validators ──────────────────────────────
    handleInput(event) {
        this.handleInputChange(event);
    }

    handleInputChange(event) {
        const key = event.currentTarget?.dataset?.key || event.target?.dataset?.key || 
                    event.currentTarget?.dataset?.id || event.target?.dataset?.id ||
                    event.currentTarget?.dataset?.field || event.target?.dataset?.field;
        if (!key) return;

        this.isDirty = true;

        let val;
        if (event.target?.isContentEditable) {
            val = event.target.innerHTML;
            const text = (event.target.innerText || '').trim();
            const words = text ? text.split(/\s+/).filter(w => w.length > 0) : [];
            this._updateWordCountForField(key, words.length);
            if (words.length > 0) {
                this._clearFieldError(key);
            }
        } else if (event.detail?.checked !== undefined) {
            val = event.detail.checked;
        } else if (event.target?.type === 'checkbox') {
            val = event.target.checked;
        } else if (event.detail?.value !== undefined) {
            val = event.detail.value;
        } else {
            val = event.target?.value ?? '';
        }

        this.formValues = {
            ...this.formValues,
            [key]: val
        };

        const fldAttr = event.currentTarget?.dataset?.field || event.target?.dataset?.field;
        if (fldAttr && fldAttr !== key) {
            this.formValues[fldAttr] = val;
        }
        const idAttr = event.currentTarget?.dataset?.id || event.target?.dataset?.id;
        if (idAttr && idAttr !== key) {
            this.formValues[idAttr] = val;
        }

        if (key === 'GenieAI_Interest_Level__c' && (val === 'Not at this time' || !val)) {
            this.formValues = {
                ...this.formValues,
                Operational_Synergies_with_WOF__c: '',
                GenieAI_Synergies_Description__c: ''
            };
        }

        // Real-time quality validation for Q2 & Q3 text fields
        const liveTextValidators = {
            Organization_Name__c:             v => this._validateNameLikeField(v, 'Organization Name'),
            Headquarters_City_and_Country__c: v => this._validateHQCityCountry(v),
            Primary_Service_Regions__c:       v => this._validateRegionsField(v),
            Leader_Name__c:                   v => this._validateNameLikeField(v, 'Leader Name'),
            Leader_Title__c:                  v => this._validateNameLikeField(v, 'Leader Title'),
            Submitter_Name__c:                v => this._validateNameLikeField(v, 'Submitter Name'),
            Job_Title__c:                      v => this._validateNameLikeField(v, 'Submitter Title')
        };

        if (key && liveTextValidators[key]) {
            if (val) {
                const err = liveTextValidators[key](val);
                if (err) this._showLightningError(key, err);
                else this._clearLightningError(key);
            } else {
                this._clearLightningError(key);
            }
        }

        if ((key === 'Work_Email_ID__c' || key === 'Leader_Email__c' || key === 'Reference_1_Email__c' || key === 'Reference_2_Email__c') && val) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(val)) {
                this._showLightningError(key, 'Please enter a valid email address.');
            } else {
                this._clearLightningError(key);
            }
        } else if (key === 'Work_Email_ID__c' || key === 'Leader_Email__c' || key === 'Reference_1_Email__c' || key === 'Reference_2_Email__c') {
            this._clearLightningError(key);
        }

        if (key === 'Incorporation_Date__c') {
            if (val) {
                const todayStr = this.todayDateString;
                if (val > todayStr) {
                    this._showLightningError(key, 'Incorporation date cannot be in the future.');
                } else if (val < '1800-01-01') {
                    this._showLightningError(key, 'Please enter a valid incorporation date.');
                } else {
                    this._clearLightningError(key);
                }
            } else {
                this._clearLightningError(key);
            }
        }

        if (key && key.startsWith('Funder_')) {
            if (key.endsWith('_Amount__c')) {
                if (val !== '' && val !== null && val !== undefined) {
                    const n = Number(val);
                    if (isNaN(n) || n < 0) {
                        this._showLightningError(key, 'Please enter a valid positive amount.');
                    } else {
                        this._clearLightningError(key);
                    }
                } else {
                    this._clearLightningError(key);
                }
            } else if (key.includes('_Period_')) {
                const funderPrefix = key.substring(0, 8); // 'Funder_1', 'Funder_2', 'Funder_3'
                const sKey = `${funderPrefix}_Period_Start__c`;
                const eKey = `${funderPrefix}_Period_End__c`;
                const sVal = this.formValues[sKey];
                const eVal = this.formValues[eKey];
                if (sVal && eVal && eVal < sVal) {
                    this._showLightningError(eKey, 'Funding end date must be on or after start date.');
                } else {
                    this._clearLightningError(eKey);
                }
            } else {
                this._clearLightningError(key);
            }
        }
    }

    // ── Phone ITI Methods & Helpers ────────────────────────────────────────
    get phoneFieldWrapperClass() {
        return this.phoneNumberError ? 'phone-input-group has-error' : 'phone-input-group';
    }

    _extractDialCode(countryCodeValue) {
        if (!countryCodeValue) return null;
        const match = String(countryCodeValue).match(/^\+\d+/);
        return match ? match[0] : null;
    }

    _currentDialCode() {
        if (!this._phoneIti) return '';
        const d = this._phoneIti.getSelectedCountryData();
        return (d && d.dialCode) ? '+' + d.dialCode : '';
    }

    _normalizeNationalNumber(raw, dialCode) {
        if (raw === null || raw === undefined) return '';
        let digits = String(raw).replace(/\D/g, '');
        if (!digits) return '';

        const dc = dialCode ? String(dialCode).replace('+', '') : '';
        if (dc && digits.length > dc.length && digits.startsWith(dc)) {
            const rule = this.PHONE_LENGTH_BY_COUNTRY_CODE[dialCode];
            const rest = digits.slice(dc.length);
            if (!rule || rest.length >= rule.min) digits = rest;
        }
        return digits.replace(/^0+/, '');
    }

    _applyItiScopeToken(input) {
        const token = Array.from(input.attributes)
            .map(a => a.name)
            .find(n => n.startsWith('c-') && n.includes('_'));
        if (!token) return;
        const wrapper = input.closest('.iti');
        if (!wrapper) return;
        wrapper.setAttribute(token, '');
        wrapper.querySelectorAll('*').forEach(el => el.setAttribute(token, ''));
    }

    _managePhoneIti() {
        if (!this._phoneScriptsLoaded) {
            this._phoneScriptsLoaded = true;
            Promise.all([
                loadStyle(this, flagTelpicker + '/css/intlTelInput.css'),
                loadScript(this, flagTelpicker + '/js/utils.js'),
                loadScript(this, flagTelpicker + '/js/intlTelInput.js')
            ])
            .then(() => this._managePhoneIti())
            .catch(err => console.error('flagTelpicker load error', err));
            return;
        }
        if (typeof window.intlTelInput !== 'function') return;

        const input = this.template.querySelector('input[data-id="phone"]');
        if (input && !this._phoneItiInitialized) {
            this._initPhoneIti(input);
        } else if (input && this._phoneItiInitialized && this._phoneIti) {
            // Keep phone input in sync if formValues.Phone__c is populated but input is empty
            if (this.formValues.Phone__c && (!input.value || input.value === '')) {
                const storedDial = this._extractDialCode(this.formValues.WG_Phone_Country_Code__c) || this._currentDialCode();
                if (storedDial) {
                    try { this._phoneIti.setNumber(storedDial + this.formValues.Phone__c); }
                    catch (e) { /* ignore */ }
                }
                input.value = this._normalizeNationalNumber(
                    this.formValues.Phone__c,
                    storedDial || this._currentDialCode()
                );
            }
        } else if (!input && this._phoneItiInitialized) {
            this._destroyPhoneIti();
        }
    }

    _initPhoneIti(input) {
        const storedDial = this._extractDialCode(this.formValues.WG_Phone_Country_Code__c);

        this._phoneIti = window.intlTelInput(input, {
            separateDialCode:   true,
            showFlags:          false,
            excludeCountries:   ['il'],
            initialCountry:     'in',
            preferredCountries: ['in', 'us', 'gb', 'ae', 'sg', 'au'],
            utilsScript:        flagTelpicker + '/js/utils.js',
            customPlaceholder:  (ph) => (ph && ph.startsWith('0')) ? ph.slice(1).trim() : ph
        });

        const wrapper = input.closest('.iti');
        if (wrapper) wrapper.style.width = '100%';
        this._applyItiScopeToken(input);
        if (typeof this._phoneIti._updateInputPadding === 'function') {
            this._phoneIti._updateInputPadding();
        }

        const national = this.formValues.Phone__c;
        if (national) {
            if (storedDial) {
                try { this._phoneIti.setNumber(storedDial + national); }
                catch (e) { /* ignore */ }
            }
            input.value = this._normalizeNationalNumber(
                input.value || national,
                storedDial || this._currentDialCode()
            );
        }

        this._onPhoneCountryChange = () => this._syncPhoneFromIti(input, false, true);
        input.addEventListener('countrychange', this._onPhoneCountryChange);

        this._phoneItiInitialized = true;
        this._syncPhoneFromIti(input, true, true);
    }

    _destroyPhoneIti() {
        const input = this.template.querySelector('input[data-id="phone"]');
        if (input && this._onPhoneCountryChange) {
            input.removeEventListener('countrychange', this._onPhoneCountryChange);
        }
        if (this._phoneIti) {
            try { this._phoneIti.destroy(); } catch (e) { /* ignore */ }
        }
        this._phoneIti = null;
        this._phoneItiInitialized = false;
        this._onPhoneCountryChange = null;
    }

    _syncPhoneFromIti(input, skipUnsavedFlag, normalizeDisplay) {
        if (!this._phoneIti || !input) return;
        const data = this._phoneIti.getSelectedCountryData();
        const dial = (data && data.dialCode) ? '+' + data.dialCode : '';
        const national = this._normalizeNationalNumber(input.value, dial);

        if (normalizeDisplay && input.value !== national) {
            input.value = national;
        }

        // Only overwrite formValues.Phone__c if input has a value OR if formValues.Phone__c was not set yet
        if (input.value || !this.formValues.Phone__c) {
            this.formValues = {
                ...this.formValues,
                WG_Phone_Country_Code__c: dial,
                Phone__c: national
            };
        }

        if (national) {
            const err = this._validatePhoneField(national, dial);
            this.phoneNumberError = err || '';
        } else {
            this.phoneNumberError = '';
        }
    }

    handlePhoneNumberInput(event) {
        this._syncPhoneFromIti(event.target, false, false);
    }

    // ── Headquarters City Search Handlers ────────────────────────────────
    get hqHasResults() {
        return this.hqResults && this.hqResults.length > 0;
    }

    get hqNoResults() {
        return this.hqShowNoResults
            && !this.hqIsLoading
            && this.hqResults.length === 0
            && (this.hqSearchKey || '').length > 1;
    }

    handleHQFocus() {
        if (this.hqSearchKey && this.hqSearchKey.length > 1 && this.hqResults.length > 0) {
            this.hqResults = [...this.hqResults];
        }
    }

    handleHQBlur() {
        setTimeout(() => {
            this.hqResults = [];
            this.hqShowNoResults = false;
        }, 200);
    }

    handleHQChange(event) {
        const val = event.target.value;
        this.hqSearchKey = val;
        this.hqShowNoResults = false;

        this._setHQValue(val);
        window.clearTimeout(this.hqDelayTimeout);

        if (!val || val.trim().length === 0) {
            this.hqResults = [];
            this.hqIsLoading = false;
            return;
        }

        if (val.trim().length > 1) {
            this.hqIsLoading = true;
            this.hqDelayTimeout = setTimeout(() => {
                this.fetchHQLocations();
            }, 300);
        } else {
            this.hqResults = [];
        }
    }

    async fetchHQLocations() {
        try {
            const response = await searchHQLocation({ query: this.hqSearchKey });
            const data = JSON.parse(response);

            const seen = new Set();
            const tempResults = [];
            const typed = this.hqSearchKey.split(',')[0].toLowerCase().trim();

            (data.features || []).forEach(feature => {
                const props = feature.properties || {};
                const cityName = props.name || props.city;
                const state    = props.state || '';
                const country  = props.country || '';

                if (!cityName) return;

                if (!cityName.toLowerCase().startsWith(typed) &&
                    !cityName.toLowerCase().includes(typed)) {
                    return;
                }

                const value      = [cityName, state, country].filter(Boolean).join(', ');
                const subDisplay = [state, country].filter(Boolean).join(', ');

                if (!seen.has(value)) {
                    seen.add(value);
                    tempResults.push({
                        label: cityName,
                        subDisplay: subDisplay,
                        display: value,
                        value: value,
                        country: country
                    });
                }
            });

            this.hqResults = tempResults;
            this.hqShowNoResults = tempResults.length === 0;

        } catch (error) {
            console.error('Error fetching HQ locations:', error);
            this.hqResults = [];
            this.hqShowNoResults = true;
        } finally {
            this.hqIsLoading = false;
        }
    }

    handleHQSelect(event) {
        const label   = event.currentTarget.dataset.label;
        const country = event.currentTarget.dataset.country || '';
        const val     = [label, country].filter(Boolean).join(', ');

        this.hqSearchKey     = val;
        this.hqResults       = [];
        this.hqShowNoResults = false;

        this._setHQValue(val);
    }

    _setHQValue(val) {
        this.formValues = {
            ...this.formValues,
            Headquarters_City_and_Country__c: val
        };

        const err = val ? this._validateHQCityCountry(val) : null;
        if (err) {
            this._showLightningError('Headquarters_City_and_Country__c', err);
        } else {
            this._clearLightningError('Headquarters_City_and_Country__c');
        }
    }

    // ── Field Quality & Validation Helpers ─────────────────────────────────
    _validateNameLikeField(value, fieldLabel) {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        if (trimmed === '') return `${fieldLabel} cannot be blank or contain only spaces.`;

        const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
        if (emojiPattern.test(trimmed)) {
            return `${fieldLabel} cannot contain emoji characters.`;
        }

        if (/<\s*\/?\s*[a-zA-Z][^>]*>/.test(trimmed)) {
            return `${fieldLabel} cannot contain HTML or script tags.`;
        }

        if (/(--|;|\bor\b\s+\d+\s*=\s*\d+|\bunion\b\s+\bselect\b|'\s*or\s*')/i.test(trimmed)) {
            return `${fieldLabel} contains characters that are not allowed.`;
        }

        if (!/[a-zA-Z\u00C0-\u024F\u0400-\u04FF]/.test(trimmed)) {
            return `${fieldLabel} must contain at least one letter — numbers or symbols alone are not allowed.`;
        }

        return null;
    }

    _validateHQCityCountry(value) {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        if (trimmed === '') return 'Headquarters City and Country cannot be blank or contain only spaces.';
        if (!/[a-zA-Z]/.test(trimmed)) return 'Headquarters City and Country must contain letters.';

        const parts = trimmed.split(',').map(p => p.trim());
        if (parts.length < 2) {
            return 'Please enter both headquarters city and country, separated by a comma (e.g., "Chennai, India").';
        }
        if (parts.length > 2 || parts.some(p => p === '')) {
            return 'Please enter exactly one city and one country separated by a single comma (e.g., "Chennai, India").';
        }
        const [city, country] = parts;
        if (!/[a-zA-Z]/.test(city))    return 'Please enter a valid city name.';
        if (!/[a-zA-Z]/.test(country)) return 'Please enter a valid country name.';
        return null;
    }

    _validateRegionsField(value) {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        if (trimmed === '') return 'Primary Service Regions cannot be blank or contain only spaces.';

        const baseErr = this._validateNameLikeField(trimmed, 'Primary Service Regions');
        if (baseErr) return baseErr;

        const LETTER = /[a-zA-Z\u00C0-\u024F\u0400-\u04FF]/;
        const parts = trimmed.split(/[,;/|]/).map(p => p.trim()).filter(p => p !== '');
        if (parts.length === 0) return 'Please enter at least one state, province or region.';

        for (const part of parts) {
            const letterCount = (part.match(new RegExp(LETTER, 'g')) || []).length;
            if (letterCount < 1) {
                return `"${part}" is not a valid region name — each entry must contain letters.`;
            }
            if (!/^[a-zA-Z\u00C0-\u024F\u0400-\u04FF0-9 .'()&-]+$/.test(part)) {
                return `"${part}" contains characters that are not allowed in a region name.`;
            }
        }
        return null;
    }

    _validatePhoneField(value, countryCodeValue) {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        if (trimmed === '') return 'Phone number cannot be blank or contain only spaces.';
        if (!/^[0-9+\-()\s]+$/.test(trimmed)) {
            return 'Phone number can only contain digits and characters like +, -, (), or spaces.';
        }

        const dialCode   = this._extractDialCode(countryCodeValue);
        const digitsOnly = this._normalizeNationalNumber(trimmed, dialCode);
        if (!digitsOnly) return 'Phone number cannot be blank or contain only spaces.';

        const rule = dialCode ? this.PHONE_LENGTH_BY_COUNTRY_CODE[dialCode] : null;

        if (rule) {
            if (digitsOnly.length < rule.min || digitsOnly.length > rule.max) {
                const expected = rule.min === rule.max
                    ? `${rule.min} digits`
                    : `${rule.min}–${rule.max} digits`;
                return `Enter a valid phone number for the selected country (expected ${expected}, e.g. ${dialCode} ${rule.example}).`;
            }
            return null;
        }

        if (digitsOnly.length < 7) {
            return 'Please enter a valid phone number with at least 7 digits.';
        }
        return null;
    }

    _showLightningError(dataId, message) {
        const el = this.template.querySelector(`[data-id="${dataId}"]`) ||
                   this.template.querySelector(`[data-key="${dataId}"]`) ||
                   this.template.querySelector(`[data-field="${dataId}"]`);
        if (el) {
            if (el.setCustomValidity) {
                el.setCustomValidity(message);
                el.reportValidity();
            } else {
                this._showNativeError(el, message);
            }
            this._registerInvalid(el);
        }
    }

    _clearLightningError(dataId) {
        const el = this.template.querySelector(`[data-id="${dataId}"]`) ||
                   this.template.querySelector(`[data-key="${dataId}"]`) ||
                   this.template.querySelector(`[data-field="${dataId}"]`);
        if (el) {
            if (el.setCustomValidity) {
                el.setCustomValidity('');
                el.reportValidity();
            } else {
                this._clearNativeError(el);
            }
            this._invalidElements = this._invalidElements.filter(x => x !== el);
        }
    }

    _showFieldError(fieldName, message) {
        const el = this.template.querySelector(`[data-field="${fieldName}"]`) ||
                   this.template.querySelector(`[data-id="${fieldName}"]`) ||
                   this.template.querySelector(`[data-key="${fieldName}"]`);
        if (el) {
            el.classList.add('richtext-invalid');
            this._registerInvalid(el);
        }
        const errEl = this.template.querySelector(`[data-error="${fieldName}"]`);
        if (errEl) {
            errEl.textContent = message;
            errEl.style.display = 'block';
        }
    }

    _clearFieldError(fieldName) {
        const el = this.template.querySelector(`[data-field="${fieldName}"]`) ||
                   this.template.querySelector(`[data-id="${fieldName}"]`) ||
                   this.template.querySelector(`[data-key="${fieldName}"]`);
        if (el) el.classList.remove('richtext-invalid', 'invalid-field', 'richtext-overlimit');
        if (el) this._invalidElements = this._invalidElements.filter(x => x !== el);

        const errEl = this.template.querySelector(`[data-error="${fieldName}"]`);
        if (errEl) {
            errEl.textContent = '';
            errEl.style.display = 'none';
        }
    }

    _fieldErrorHost(el) {
        return el.closest('.domain-field-item, .domain-name-field, .modern-field, .verify-block, .table-container, td')
            || el.parentElement;
    }

    _showNativeError(el, message) {
        if (!el) return;
        el.classList.add('input-error');
        const host = this._fieldErrorHost(el);
        if (!host) return;
        let errEl = host.querySelector('.field-error-msg');
        if (!errEl) {
            errEl = document.createElement('p');
            errEl.className = 'field-error-msg';
            errEl.style.color      = 'var(--wg-error)'; // audit sweep fix -- was stale literal #C23934, now uses the token (inherits through the shadow tree from :host)
            errEl.style.fontSize   = '12px';
            errEl.style.lineHeight = '1.4';
            errEl.style.marginTop  = '4px';
            host.appendChild(errEl);
        }
        errEl.textContent = message;
        errEl.style.display = 'block';
        this._registerInvalid(el);
    }

    _clearNativeError(el) {
        if (!el) return;
        el.classList.remove('input-error');
        const host = this._fieldErrorHost(el);
        const errEl = host && host.querySelector('.field-error-msg');
        if (errEl) {
            errEl.textContent = '';
            errEl.style.display = 'none';
        }
        this._invalidElements = this._invalidElements.filter(x => x !== el);
    }

    _showChipError(card, message) {
        const row = card?.querySelector('.sector-chips-row');
        if (!row) return;
        row.classList.add('chips-error');
        let errEl = row.parentElement.querySelector('.field-error-msg');
        if (!errEl) {
            errEl = document.createElement('p');
            errEl.className = 'field-error-msg';
            errEl.style.color = 'var(--wg-error)'; // audit sweep fix -- was stale literal #C23934
            errEl.style.fontSize = '12px';
            errEl.style.marginTop = '4px';
            row.parentElement.appendChild(errEl);
        }
        errEl.textContent = message;
        errEl.style.display = 'block';
        this._registerInvalid(row);
    }

    _clearChipError(card) {
        const row = card?.querySelector('.sector-chips-row');
        if (!row) return;
        row.classList.remove('chips-error');
        const errEl = row.parentElement.querySelector('.field-error-msg');
        if (errEl) {
            errEl.style.display = 'none';
        }
        this._invalidElements = this._invalidElements.filter(x => x !== row);
    }

    _registerInvalid(el) {
        if (el && !this._invalidElements.includes(el)) {
            this._invalidElements.push(el);
        }
    }

    _resetInvalidTracking() {
        this._invalidElements = [];
    }

    _clearAllInlineErrors() {
        this.template.querySelectorAll('.field-error-msg, .inline-date-error-msg')
            .forEach(el => { el.textContent = ''; el.style.display = 'none'; });

        this.template.querySelectorAll('p.error-msg')
            .forEach(el => { el.textContent = ''; el.style.display = 'none'; });

        this.template.querySelectorAll(
            '.input-error, .invalid-field, .richtext-invalid, .richtext-overlimit, .chips-error'
        ).forEach(el => el.classList.remove(
            'input-error', 'invalid-field', 'richtext-invalid', 'richtext-overlimit', 'chips-error'
        ));

        this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea')
            .forEach(el => { if (el.setCustomValidity) { el.setCustomValidity(''); el.reportValidity(); } });

        this.phoneNumberError = '';
        this._invalidElements = [];
    }

    _scrollToFirstError() {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const marked = Array.from(this.template.querySelectorAll(
                '.richtext-invalid, .invalid-field, .richtext-overlimit, ' +
                '.input-error, .chips-error, .file-upload-error'
            ));

            const messages = Array.from(this.template.querySelectorAll(
                '.error-msg, .file-error-msg, .phone-error-msg, .field-error-msg, ' +
                '.inline-date-error-msg, .word-count-over'
            )).filter(el =>
                el.offsetParent !== null &&
                el.style.display !== 'none' &&
                (el.textContent || '').trim() !== ''
            );

            const all = [...this._invalidElements, ...marked, ...messages]
                .filter(el => el && el.isConnected && el.offsetParent !== null);

            if (all.length === 0) return;

            let target = all[0];
            let minTop = target.getBoundingClientRect().top;
            all.forEach(el => {
                const t = el.getBoundingClientRect().top;
                if (t < minTop) { minTop = t; target = el; }
            });

            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            if (typeof target.focus === 'function') {
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => { try { target.focus(); } catch (e) { /* noop */ } }, 400);
            }
        }, 60);
    }

    _nativeFieldLabel(el) {
        const wrap = el.closest ? el.closest('.slds-form-element, .modern-field, .domain-field-item, .date-field-wrapper') : null;
        const lbl = wrap?.querySelector('.slds-form-element__label, .date-field-label, .domain-field-label, label, .field-label-bold');
        return lbl ? lbl.textContent.replace(/[*]/g, '').trim() : 'This field';
    }

    _fmtDateDisplay(dateStr) {
        if (!dateStr) return '';
        try {
            const parts = String(dateStr).split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        } catch (_) {}
        return dateStr;
    }

    _getLabelForFieldKey(key) {
        if (!key) return '';
        const specMap = {
            Organization_Name__c: 'Organization Name',
            Headquarters_City_and_Country__c: 'Headquarters City and Country',
            Primary_Service_Regions__c: 'Primary Service Regions',
            Leader_Name__c: 'Leader Name',
            Leader_Title__c: 'Leader Title',
            Leader_Tenure__c: 'Leader Tenure',
            Submitter_Name__c: 'Submitter Name',
            Job_Title__c: 'Submitter Title',
            Work_Email_ID__c: 'Work Email Address',
            Phone__c: 'Phone number',
            phone: 'Phone number',
            Legal_Type__c: 'Organizational Legal Type',
            Legal_Type_Other__c: 'Other Legal Type',
            Registration_Jurisdiction__c: 'Registration Jurisdiction',
            Registration_Jurisdiction_Other__c: 'Other Registration Jurisdiction',
            Incorporation_Date__c: 'Incorporation Date',
            Legal_Structure__c: 'Organizational Legal Structure',
            Has_501c3_Status__c: 'US 501(c)(3) Status',
            Has_Equivalency_Determination__c: 'Equivalency Determination (ED) Status',
            Is_FCRA_Registered__c: 'FCRA Registration Status',
            Willing_to_Pursue_ED__c: 'Willingness to Pursue ED Certification',
            Fiscal_Month__c: 'Fiscal Year End Month',
            Fiscal_Day__c: 'Fiscal Year End Day',
            Funder_1_Name__c: 'Funder 1 Name',
            Funder_1_Amount__c: 'Funder 1 Amount',
            Funder_1_Period_Start__c: 'Funder 1 Period Start',
            Funder_1_Period_End__c: 'Funder 1 Period End',
            Funder_1_Type__c: 'Funder 1 Type',
            Funder_2_Name__c: 'Funder 2 Name',
            Funder_2_Amount__c: 'Funder 2 Amount',
            Funder_2_Period_Start__c: 'Funder 2 Period Start',
            Funder_2_Period_End__c: 'Funder 2 Period End',
            Funder_2_Type__c: 'Funder 2 Type',
            Funder_3_Name__c: 'Funder 3 Name',
            Funder_3_Amount__c: 'Funder 3 Amount',
            Funder_3_Period_Start__c: 'Funder 3 Period Start',
            Funder_3_Period_End__c: 'Funder 3 Period End',
            Funder_3_Type__c: 'Funder 3 Type',
            Reference_1_Name__c: 'Reference 1 Name',
            Reference_1_Role__c: 'Reference 1 Role',
            Reference_1_Email__c: 'Reference 1 Email',
            Reference_2_Name__c: 'Reference 2 Name',
            Reference_2_Role__c: 'Reference 2 Role',
            Reference_2_Email__c: 'Reference 2 Email',
            // Q9 Historical Financials
            START_FY3: 'Historical Balance - Start of FY-3',
            REV_FY3: 'Historical Revenue - FY-3',
            REV_FY2: 'Historical Revenue - FY-2',
            REV_FY1: 'Historical Revenue - FY-1',
            CAP_FY3: 'Historical Capital Expenditure - FY-3',
            CAP_FY2: 'Historical Capital Expenditure - FY-2',
            CAP_FY1: 'Historical Capital Expenditure - FY-1',
            OP_FY3: 'Historical Operating Expenditure - FY-3',
            OP_FY2: 'Historical Operating Expenditure - FY-2',
            OP_FY1: 'Historical Operating Expenditure - FY-1',
            // Q10 Current FY Financials
            CFY_REV_BUDGET: 'Current FY Revenue (Budget)',
            CFY_REV_PROJ: 'Current FY Revenue (Projection)',
            CFY_CAP_BUDGET: 'Current FY Capital Expenditure (Budget)',
            CFY_CAP_PROJ: 'Current FY Capital Expenditure (Projection)',
            CFY_OP_BUDGET: 'Current FY Operating Expenditure (Budget)',
            CFY_OP_PROJ: 'Current FY Operating Expenditure (Projection)',
            Revenue_Explanation__c: 'CFY Deviation Explanation',
            // Tab 2 Skilling
            Skilling_Approach__c: 'Your Skilling Approach',
            name: 'Domain / Program Name',
            hours: 'Hours of Training',
            duration: 'Duration (Months)',
            whenStarted: 'When Program Started',
            enrollment: 'Annual Enrollment',
            JF_ENROLL_FY3: 'Learner Enrollments (FY-3)',
            JF_ENROLL_FY2: 'Learner Enrollments (FY-2)',
            JF_ENROLL_FY1: 'Learner Enrollments (FY-1)',
            JF_ENROLL_PROJ: 'Learner Enrollments (Projected)',
            JF_PLACE_FY3: 'Learner Placements (FY-3)',
            JF_PLACE_FY2: 'Learner Placements (FY-2)',
            JF_PLACE_FY1: 'Learner Placements (FY-1)',
            JF_PLACE_PROJ: 'Learner Placements (Projected)',
            JF_COST_FY3: 'Avg Cost per Placement (FY-3)',
            JF_COST_FY2: 'Avg Cost per Placement (FY-2)',
            JF_COST_FY1: 'Avg Cost per Placement (FY-1)',
            JF_COST_PROJ: 'Avg Cost per Placement (Projected)',
            // Tab 3 Job Creation
            Job_Creation_Approach__c: 'Your Job Creation Approach',
            sector: 'Business Sector',
            sectorOther: 'Other Business Sector',
            supportTypes: 'Type of Support Provided',
            supportTypeOther: 'Other Type of Support',
            whenBegan: 'When Program Began',
            JC_NEW_BIZ_FY3: 'New Businesses Started (FY-3)',
            JC_NEW_BIZ_FY2: 'New Businesses Started (FY-2)',
            JC_NEW_BIZ_FY1: 'New Businesses Started (FY-1)',
            JC_NEW_BIZ_PROJ: 'New Businesses Started (Projected)',
            JC_NEW_JOBS_FY3: 'Jobs Created by New Businesses (FY-3)',
            JC_NEW_JOBS_FY2: 'Jobs Created by New Businesses (FY-2)',
            JC_NEW_JOBS_FY1: 'Jobs Created by New Businesses (FY-1)',
            JC_NEW_JOBS_PROJ: 'Jobs Created by New Businesses (Projected)',
            JC_EXIST_BIZ_FY3: 'Existing Businesses Supported (FY-3)',
            JC_EXIST_BIZ_FY2: 'Existing Businesses Supported (FY-2)',
            JC_EXIST_BIZ_FY1: 'Existing Businesses Supported (FY-1)',
            JC_EXIST_BIZ_PROJ: 'Existing Businesses Supported (Projected)',
            JC_EXIST_JOBS_FY3: 'Jobs Created by Existing Businesses (FY-3)',
            JC_EXIST_JOBS_FY2: 'Jobs Created by Existing Businesses (FY-2)',
            JC_EXIST_JOBS_FY1: 'Jobs Created by Existing Businesses (FY-1)',
            JC_EXIST_JOBS_PROJ: 'Jobs Created by Existing Businesses (Projected)',
            JC_COST_FY3: 'Avg Cost per Job Created (FY-3)',
            JC_COST_FY2: 'Avg Cost per Job Created (FY-2)',
            JC_COST_FY1: 'Avg Cost per Job Created (FY-1)',
            JC_COST_PROJ: 'Avg Cost per Job Created (Projected)',
            // Tab 4 Livelihood
            Livelihood_Approach__c: 'Your Livelihood Upliftment Approach',
            supportType: 'Type of Support Provided',
            manHours: 'Duration in Man-Hours',
            state: 'State',
            district: 'District / Area',
            LIV_SERVED_FY3: 'Households Served (FY-3)',
            LIV_SERVED_FY2: 'Households Served (FY-2)',
            LIV_SERVED_FY1: 'Households Served (FY-1)',
            LIV_SERVED_PROJ: 'Households Served (Projected)',
            LIV_ENROLL_FY3: 'Households Newly Enrolled (FY-3)',
            LIV_ENROLL_FY2: 'Households Newly Enrolled (FY-2)',
            LIV_ENROLL_FY1: 'Households Newly Enrolled (FY-1)',
            LIV_ENROLL_PROJ: 'Households Newly Enrolled (Projected)',
            LIV_OUTCOME_FY3: 'Households Meeting Outcome Criteria (FY-3)',
            LIV_OUTCOME_FY2: 'Households Meeting Outcome Criteria (FY-2)',
            LIV_OUTCOME_FY1: 'Households Meeting Outcome Criteria (FY-1)',
            LIV_OUTCOME_PROJ: 'Households Meeting Outcome Criteria (Projected)',
            LIV_COST_FY3: 'Avg Cost per Outcome (FY-3)',
            LIV_COST_FY2: 'Avg Cost per Outcome (FY-2)',
            LIV_COST_FY1: 'Avg Cost per Outcome (FY-1)',
            LIV_COST_PROJ: 'Avg Cost per Outcome (Projected)',
            // Tab 5 Why Wadhwani
            Q24_VERIFIED: 'Outcomes Verified by Third Party',
            Details_of_Ethical_Received__c: 'Verification Conductor Details',
            q24Upload: 'Verification Report Upload',
            Organizational_Sustainability__c: 'Sustainability Plan',
            Use_of_Additional_Funding__c: 'Direction for Additional Funding',
            GenieAI_Interest_Level__c: 'GenieAI Interest Level',
            Operational_Synergies_with_WOF__c: 'Operational Synergies with GenieAI',
            // Tab 6 Review & Submit
            Attesting_User_Name__c: 'Attesting User Name',
            Attesting_User_Title__c: 'Attesting User Title',
            'attest-checkbox': 'Attestation Confirmation'
        };
        return specMap[key] || key;
    }

    _getFieldLabel(el) {
        if (!el) return '';
        if (typeof el === 'string') {
            return this._getLabelForFieldKey(el);
        }

        const targetId = el.dataset?.key || el.dataset?.id || el.dataset?.field || el.dataset?.error;
        if (targetId) {
            const mapped = this._getLabelForFieldKey(targetId);
            if (mapped && mapped !== targetId) return mapped;
        }

        const tr = el.closest ? el.closest('tr') : null;
        if (tr) {
            const td = el.closest('td');
            const rowLabelEl = tr.querySelector('.row-label-cell, td:first-child');
            let rowLabel = rowLabelEl ? rowLabelEl.textContent.replace(/[*]/g, '').trim() : '';
            if (rowLabel.includes('\n')) {
                rowLabel = rowLabel.split('\n')[0].trim();
            }
            const colIndex = td ? Array.from(tr.children).indexOf(td) : -1;
            if (colIndex !== -1) {
                const table = el.closest('table');
                const th = table?.querySelector(`thead tr th:nth-child(${colIndex + 1})`);
                const colLabel = th ? th.textContent.replace(/[*]/g, '').trim() : '';
                if (colLabel && rowLabel) {
                    return `${colLabel} - ${rowLabel}`;
                }
            }
            if (rowLabel) return rowLabel;
        }

        if (el.label) return el.label;
        if (el.dataset?.id === 'phone') return 'Phone number';

        const wrap = el.closest ? el.closest('.slds-form-element, .modern-field, .domain-field-item, .date-field-wrapper') : null;
        if (wrap && wrap.contains(el)) {
            const lbl = wrap.querySelector('.slds-form-element__label, .date-field-label, .domain-field-label, label, .field-label-bold');
            if (lbl) {
                return lbl.textContent.replace(/[*]/g, '').trim();
            }
        }

        const nativeLabel = this._nativeFieldLabel(el);
        if (nativeLabel && nativeLabel !== 'This field') {
            return nativeLabel;
        }

        return targetId ? this._getLabelForFieldKey(targetId) : 'This field';
    }

    _checkRichText(field, label, limit) {
        const el = this.template.querySelector(`[data-field="${field}"]`) ||
                   this.template.querySelector(`[data-id="${field}"]`) ||
                   this.template.querySelector(`[data-key="${field}"]`);
        
        let text = '';
        let htmlVal = '';
        if (el) {
            const elText = (el.innerText || '').trim();
            if (elText.length > 0) {
                htmlVal = el.innerHTML || '';
                text = elText;
                this.formValues = {
                    ...this.formValues,
                    [field]: htmlVal
                };
            } else if (this.formValues[field] && String(this.formValues[field]).trim() !== '') {
                htmlVal = this.formValues[field];
                text = this.stripHtml(htmlVal).trim();
                el.innerHTML = htmlVal;
            }
        } else if (this.formValues[field]) {
            htmlVal = this.formValues[field];
            text = this.stripHtml(htmlVal).trim();
        }

        const words = text ? text.split(/\s+/).filter(w => w.length > 0) : [];
        this._updateWordCountForField(field, words.length);

        if (words.length === 0) {
            this._showFieldError(field, `${label} is required.`);
            return false;
        }
        if (words.length > limit) {
            this._showFieldError(field, `${label} exceeds the ${limit}-word limit (currently ${words.length} words). Please shorten it before proceeding.`);
            return false;
        }
        this._clearFieldError(field);
        return true;
    }

    // ── Tab 1: About Your Organisation Validation ──────────────────────────
    validateTabAboutOrg() {
        let isValid = true;
        const org = this.formValues;

        // Leader Tenure: Optional but whole number between 0 and 99
        const tenure = org.Leader_Tenure__c;
        if (tenure !== '' && tenure !== null && tenure !== undefined) {
            const n = Number(tenure);
            if (!Number.isInteger(n) || n < 0 || n > 99) {
                this._showLightningError('Leader_Tenure__c', 'Must be a whole number between 0 and 99.');
                isValid = false;
            } else {
                this._clearLightningError('Leader_Tenure__c');
            }
        } else {
            this._clearLightningError('Leader_Tenure__c');
        }

        // Incorporation Date
        const incDate = org.Incorporation_Date__c;
        const todayStr = this.todayDateString;
        if (!incDate) {
            this._showLightningError('Incorporation_Date__c', 'Incorporation Date is required.');
            isValid = false;
        } else if (incDate > todayStr) {
            this._showLightningError('Incorporation_Date__c', 'Incorporation date cannot be in the future.');
            isValid = false;
        } else if (incDate < '1900-01-01') {
            this._showLightningError('Incorporation_Date__c', 'Please enter a valid incorporation date.');
            isValid = false;
        } else {
            this._clearLightningError('Incorporation_Date__c');
        }

        // Text-quality checks
        const textFieldChecks = [
            { id: 'Organization_Name__c', run: v => this._validateNameLikeField(v, 'Organization Name') },
            { id: 'Headquarters_City_and_Country__c', run: v => this._validateHQCityCountry(v) },
            { id: 'Primary_Service_Regions__c', run: v => this._validateRegionsField(v) },
            { id: 'Leader_Name__c', run: v => this._validateNameLikeField(v, 'Leader Name') },
            { id: 'Leader_Title__c', run: v => this._validateNameLikeField(v, 'Leader Title') },
            { id: 'Submitter_Name__c', run: v => this._validateNameLikeField(v, 'Submitter Name') },
            { id: 'Job_Title__c', run: v => this._validateNameLikeField(v, 'Submitter Title') }
        ];

        textFieldChecks.forEach(({ id, run }) => {
            const val = org[id];
            if (!val || String(val).trim() === '') {
                const label = this._getFieldLabel({ dataset: { id } });
                this._showLightningError(id, `${label} is required.`);
                isValid = false;
            } else {
                const err = run(val);
                if (err) {
                    this._showLightningError(id, err);
                    isValid = false;
                } else {
                    this._clearLightningError(id);
                }
            }
        });

        // Email address
        const emailVal = org.Work_Email_ID__c;
        if (!emailVal || String(emailVal).trim() === '') {
            this._showLightningError('Work_Email_ID__c', 'Work Email Address is required.');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            this._showLightningError('Work_Email_ID__c', 'Please enter a valid email address.');
            isValid = false;
        } else {
            this._clearLightningError('Work_Email_ID__c');
        }

        // Phone number & country code
        const countryCode = this.formValues.WG_Phone_Country_Code__c || this._currentDialCode();
        const phoneVal = org.Phone__c;
        const phoneEl = this.template.querySelector('[data-id="phone"]');

        if (!countryCode || String(countryCode).trim() === '') {
            this.phoneNumberError = 'Please select a country code.';
            isValid = false;
            if (phoneEl) this._registerInvalid(phoneEl);
        } else if (!phoneVal || String(phoneVal).trim() === '') {
            this.phoneNumberError = 'Phone number cannot be blank or contain only spaces.';
            isValid = false;
            if (phoneEl) this._registerInvalid(phoneEl);
        } else {
            const phoneErr = this._validatePhoneField(phoneVal, countryCode);
            this.phoneNumberError = phoneErr || '';
            if (phoneErr) {
                isValid = false;
                if (phoneEl) this._registerInvalid(phoneEl);
            } else {
                if (phoneEl) this._invalidElements = this._invalidElements.filter(x => x !== phoneEl);
            }
        }

        // Legal Type & Jurisdiction
        if (!org.Legal_Type__c) {
            this._showLightningError('Legal_Type__c', 'Please select a Legal Type.');
            isValid = false;
        } else {
            this._clearLightningError('Legal_Type__c');
            if (org.Legal_Type__c === 'Other') {
                if (!org.Legal_Type_Other__c || String(org.Legal_Type_Other__c).trim() === '') {
                    this._showLightningError('Legal_Type_Other__c', 'Please specify your legal type.');
                    isValid = false;
                } else {
                    const err = this._validateNameLikeField(org.Legal_Type_Other__c, 'Legal Type');
                    if (err) { this._showLightningError('Legal_Type_Other__c', err); isValid = false; }
                    else { this._clearLightningError('Legal_Type_Other__c'); }
                }
            }
        }

        if (!org.Registration_Jurisdiction__c) {
            this._showLightningError('Registration_Jurisdiction__c', 'Please select a Registration Jurisdiction.');
            isValid = false;
        } else {
            this._clearLightningError('Registration_Jurisdiction__c');
            if (org.Registration_Jurisdiction__c === 'Other') {
                if (!org.Registration_Jurisdiction_Other__c || String(org.Registration_Jurisdiction_Other__c).trim() === '') {
                    this._showLightningError('Registration_Jurisdiction_Other__c', 'Please specify your registration jurisdiction.');
                    isValid = false;
                } else {
                    const err = this._validateNameLikeField(org.Registration_Jurisdiction_Other__c, 'Registration Jurisdiction');
                    if (err) { this._showLightningError('Registration_Jurisdiction_Other__c', err); isValid = false; }
                    else { this._clearLightningError('Registration_Jurisdiction_Other__c'); }
                }
            }
        }

        // Rich Text: Legal Structure (Q4)
        if (!this._checkRichText('Legal_Structure__c', 'Organizational Legal Structure', 100)) {
            isValid = false;
        }

        // Compliance picklists (Q5)
        const compFields = [
            { key: 'Has_501c3_Status__c', label: 'US 501(c)(3) status' },
            { key: 'Has_Equivalency_Determination__c', label: 'Equivalency Determination (ED) status' },
            { key: 'Is_FCRA_Registered__c', label: 'FCRA registration status' },
            { key: 'Willing_to_Pursue_ED__c', label: 'ED certification willingness' }
        ];
        compFields.forEach(({ key, label }) => {
            if (!org[key]) {
                this._showLightningError(key, `Please select an option for ${label}.`);
                isValid = false;
            } else {
                this._clearLightningError(key);
            }
        });

        // Fiscal Month & Day (Q6)
        if (!org.Fiscal_Month__c) {
            this._showLightningError('Fiscal_Month__c', 'Fiscal year end month is required.');
            isValid = false;
        } else {
            this._clearLightningError('Fiscal_Month__c');
        }
        if (!org.Fiscal_Day__c) {
            this._showLightningError('Fiscal_Day__c', 'Fiscal year end day is required.');
            isValid = false;
        } else {
            this._clearLightningError('Fiscal_Day__c');
        }

        // Funders (Q7) partial-fill check
        const funderSets = [
            {
                label: 'Funder 1',
                fields: {
                    name:   'Funder_1_Name__c',
                    amount: 'Funder_1_Amount__c',
                    start:  'Funder_1_Period_Start__c',
                    end:    'Funder_1_Period_End__c',
                    type:   'Funder_1_Type__c',
                },
                show: true,
            },
            {
                label: 'Funder 2',
                fields: {
                    name:   'Funder_2_Name__c',
                    amount: 'Funder_2_Amount__c',
                    start:  'Funder_2_Period_Start__c',
                    end:    'Funder_2_Period_End__c',
                    type:   'Funder_2_Type__c',
                },
                show: this.showFunder2,
            },
            {
                label: 'Funder 3',
                fields: {
                    name:   'Funder_3_Name__c',
                    amount: 'Funder_3_Amount__c',
                    start:  'Funder_3_Period_Start__c',
                    end:    'Funder_3_Period_End__c',
                    type:   'Funder_3_Type__c',
                },
                show: this.showFunder3,
            },
        ];

        funderSets.forEach(({ label, fields, show }) => {
            if (!show) return;
            const f = fields;
            const values = Object.values(f).map(key => org[key]);
            const anyFilled = values.some(v => v !== '' && v !== null && v !== undefined);

            if (!anyFilled) {
                Object.values(f).forEach(key => this._clearLightningError(key));
                return;
            }

            const requiredKeys = [f.name, f.amount, f.start, f.end, f.type];
            requiredKeys.forEach(key => {
                if (!org[key] && org[key] !== 0) {
                    this._showLightningError(key, `${label}: complete all fields or clear this row.`);
                    isValid = false;
                } else {
                    this._clearLightningError(key);
                }
            });

            if (org[f.amount] !== '' && org[f.amount] !== null && org[f.amount] !== undefined) {
                const n = Number(org[f.amount]);
                if (isNaN(n) || n < 0) {
                    this._showLightningError(f.amount, 'Please enter a valid positive amount.');
                    isValid = false;
                }
            }

            if (org[f.start] && org[f.end]) {
                try {
                    const s = new Date(org[f.start]);
                    const e = new Date(org[f.end]);
                    if (!isNaN(s) && !isNaN(e) && s >= e) {
                        this._showLightningError(f.end, 'Funding end date must be after start date.');
                        isValid = false;
                    }
                } catch (_) { /* ignore */ }
            }
        });

        // References (Q8) partial-fill check
        const refSets = [
            {
                label: 'Reference 1',
                fields: {
                    name:  'Reference_1_Name__c',
                    role:  'Reference_1_Role__c',
                    email: 'Reference_1_Email__c'
                },
                show: true
            },
            {
                label: 'Reference 2',
                fields: {
                    name:  'Reference_2_Name__c',
                    role:  'Reference_2_Role__c',
                    email: 'Reference_2_Email__c'
                },
                show: this.showReference2
            }
        ];

        refSets.forEach(({ label, fields, show }) => {
            if (!show) return;
            const f = fields;
            const values = [org[f.name], org[f.role], org[f.email]];
            const anyFilled = values.some(v => v !== '' && v !== null && v !== undefined);

            if (!anyFilled) {
                Object.values(f).forEach(key => this._clearLightningError(key));
                return;
            }

            Object.values(f).forEach(key => {
                if (!org[key]) {
                    this._showLightningError(key, `${label}: complete all fields or clear this row.`);
                    isValid = false;
                } else {
                    this._clearLightningError(key);
                }
            });

            if (org[f.email]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(org[f.email])) {
                    this._showLightningError(f.email, 'Please enter a valid email address.');
                    isValid = false;
                }
            }
        });

        // Q9 Historical Financials: check negative numbers
        const histNumKeys = [
            'START_FY3',
            'REV_FY3', 'REV_FY2', 'REV_FY1',
            'CAP_FY3', 'CAP_FY2', 'CAP_FY1',
            'OP_FY3', 'OP_FY2', 'OP_FY1'
        ];
        histNumKeys.forEach(k => {
            const v = org[k];
            if (v !== '' && v !== null && v !== undefined) {
                if (Number(v) < 0) {
                    this._showLightningError(k, 'Amount cannot be negative.');
                    isValid = false;
                } else {
                    this._clearLightningError(k);
                }
            }
        });

        // Q10 Current FY Financials: check negative numbers & deviation explanation
        const cfyNumKeys = [
            'CFY_REV_BUDGET', 'CFY_REV_PROJ',
            'CFY_CAP_BUDGET', 'CFY_CAP_PROJ',
            'CFY_OP_BUDGET', 'CFY_OP_PROJ'
        ];
        cfyNumKeys.forEach(k => {
            const v = org[k];
            if (v !== '' && v !== null && v !== undefined) {
                if (Number(v) < 0) {
                    this._showLightningError(k, 'Amount cannot be negative.');
                    isValid = false;
                } else {
                    this._clearLightningError(k);
                }
            }
        });

        if (this.isDeviationExplanationRequired) {
            if (!this._checkRichText('Revenue_Explanation__c', 'CFY Deviation Explanation', 200)) {
                isValid = false;
            }
        } else {
            this._clearFieldError('Revenue_Explanation__c');
        }

        return isValid;
    }

    // ── Tab 2: Job Fulfillment Validation ─────────────────────────────────
    validateTabJobFulfillment() {
        let isValid = true;
        const incorp = this.formValues.Incorporation_Date__c;
        const today = this.todayDateString;

        // Q11 Skilling Approach
        if (!this._checkRichText('Skilling_Approach__c', 'Your Skilling Approach', 500)) {
            isValid = false;
        }

        // Q12 Skilling Domains table
        const checkNumber = (el, value, label) => {
            if (value === '' || value === null || value === undefined) {
                this._showNativeError(el, `${label} is required.`);
                return false;
            }
            if (isNaN(Number(value))) {
                this._showNativeError(el, `${label} must be a number.`);
                return false;
            }
            if (Number(value) < 0) {
                this._showNativeError(el, `${label} cannot be negative.`);
                return false;
            }
            this._clearNativeError(el);
            return true;
        };

        const checkDate = (el, value, label) => {
            if (!value || String(value).trim() === '') {
                this._showNativeError(el, `${label} is required.`);
                return false;
            }
            if (incorp && value < incorp) {
                this._showNativeError(el, `${label} cannot be earlier than your Incorporation Date (${this._fmtDateDisplay(incorp)}).`);
                return false;
            }
            if (value > today) {
                this._showNativeError(el, `${label} cannot be a future date.`);
                return false;
            }
            this._clearNativeError(el);
            return true;
        };

        this.skillingDomainRows.forEach(row => {
            const nameEl = this.template.querySelector(`lightning-input[data-id="${row.id}"][data-field="name"]`);
            if (!row.name || String(row.name).trim() === '') {
                if (nameEl?.setCustomValidity) {
                    nameEl.setCustomValidity('Domain / Programme Name is required.');
                    nameEl.reportValidity();
                    this._registerInvalid(nameEl);
                }
                isValid = false;
            } else {
                const nameErr = this._validateNameLikeField(row.name, 'Domain / Programme Name');
                if (nameErr) {
                    if (nameEl?.setCustomValidity) {
                        nameEl.setCustomValidity(nameErr);
                        nameEl.reportValidity();
                        this._registerInvalid(nameEl);
                    }
                    isValid = false;
                } else if (nameEl?.setCustomValidity) {
                    nameEl.setCustomValidity('');
                    nameEl.reportValidity();
                    this._invalidElements = this._invalidElements.filter(x => x !== nameEl);
                }
            }

            const hoursEl = this.template.querySelector(`input[data-id="${row.id}"][data-field="hours"]`);
            if (!checkNumber(hoursEl, row.hours, 'Hours of Training')) isValid = false;

            const durEl = this.template.querySelector(`input[data-id="${row.id}"][data-field="duration"]`);
            if (!checkNumber(durEl, row.duration, 'Duration (Months)')) isValid = false;

            const dateEl = this.template.querySelector(`input[data-id="${row.id}"][data-field="whenStarted"]`);
            if (!checkDate(dateEl, row.whenStarted, 'When Programme Started')) isValid = false;

            const enrollEl = this.template.querySelector(`input[data-id="${row.id}"][data-field="enrollment"]`);
            if (!checkNumber(enrollEl, row.enrollment, 'Annual Enrollment')) isValid = false;
        });

        // Q13 & Q14 Outcomes
        const outcomeNumFields = [
            { key: 'JF_ENROLL_FY3', label: 'Learner Enrollments (FY-3)' },
            { key: 'JF_ENROLL_FY2', label: 'Learner Enrollments (FY-2)' },
            { key: 'JF_ENROLL_FY1', label: 'Learner Enrollments (FY-1)' },
            { key: 'JF_ENROLL_PROJ', label: 'Learner Enrollments (Projected)' },
            { key: 'JF_PLACE_FY3', label: 'Learner Placements (FY-3)' },
            { key: 'JF_PLACE_FY2', label: 'Learner Placements (FY-2)' },
            { key: 'JF_PLACE_FY1', label: 'Learner Placements (FY-1)' },
            { key: 'JF_PLACE_PROJ', label: 'Learner Placements (Projected)' },
            { key: 'JF_COST_FY3', label: 'Avg Cost per Placement (FY-3)' },
            { key: 'JF_COST_FY2', label: 'Avg Cost per Placement (FY-2)' },
            { key: 'JF_COST_FY1', label: 'Avg Cost per Placement (FY-1)' },
            { key: 'JF_COST_PROJ', label: 'Avg Cost per Placement (Projected)' }
        ];

        outcomeNumFields.forEach(({ key, label }) => {
            const raw = this.formValues[key];
            const cleanStr = raw !== null && raw !== undefined ? String(raw).replace(/,/g, '').trim() : '';
            if (cleanStr === '') {
                this._showLightningError(key, `${label} is required.`);
                isValid = false;
            } else if (isNaN(Number(cleanStr))) {
                this._showLightningError(key, `${label} must be a number.`);
                isValid = false;
            } else if (Number(cleanStr) < 0) {
                this._showLightningError(key, `${label} cannot be negative.`);
                isValid = false;
            } else {
                this._clearLightningError(key);
            }
        });

        return isValid;
    }

    // ── Tab 3: Job Creation Validation ───────────────────────────────────
    validateTabJobCreation() {
        let isValid = true;
        const incorp = this.formValues.Incorporation_Date__c;
        const today = this.todayDateString;

        // Q15 Job Creation Approach
        if (!this._checkRichText('Job_Creation_Approach__c', 'Your Job Creation Approach', 500)) {
            isValid = false;
        }

        // Q16 Business Sectors
        const checkNumber = (el, value, label) => {
            if (value === '' || value === null || value === undefined) {
                this._showNativeError(el, `${label} is required.`);
                return false;
            }
            if (isNaN(Number(value))) {
                this._showNativeError(el, `${label} must be a number.`);
                return false;
            }
            if (Number(value) < 0) {
                this._showNativeError(el, `${label} cannot be negative.`);
                return false;
            }
            this._clearNativeError(el);
            return true;
        };

        const checkDate = (el, value, label) => {
            if (!value || String(value).trim() === '') {
                this._showNativeError(el, `${label} is required.`);
                return false;
            }
            if (incorp && value < incorp) {
                this._showNativeError(el, `${label} cannot be earlier than your Incorporation Date (${this._fmtDateDisplay(incorp)}).`);
                return false;
            }
            if (value > today) {
                this._showNativeError(el, `${label} cannot be a future date.`);
                return false;
            }
            this._clearNativeError(el);
            return true;
        };

        this.businessSectorRows.forEach(row => {
            const sectorEl = this.template.querySelector(`lightning-combobox[data-id="${row.id}"][data-field="sector"]`);
            if (!row.sector || String(row.sector).trim() === '') {
                if (sectorEl?.setCustomValidity) {
                    sectorEl.setCustomValidity('Please select a Business Sector.');
                    sectorEl.reportValidity();
                    this._registerInvalid(sectorEl);
                }
                isValid = false;
            } else {
                if (sectorEl?.setCustomValidity) {
                    sectorEl.setCustomValidity('');
                    sectorEl.reportValidity();
                    this._invalidElements = this._invalidElements.filter(x => x !== sectorEl);
                }
            }

            if (row.sector === 'Other') {
                const otherEl = this.template.querySelector(`lightning-input[data-id="${row.id}"][data-field="sectorOther"]`);
                if (!row.sectorOther || String(row.sectorOther).trim() === '') {
                    if (otherEl?.setCustomValidity) {
                        otherEl.setCustomValidity('Please specify your business sector.');
                        otherEl.reportValidity();
                        this._registerInvalid(otherEl);
                    }
                    isValid = false;
                } else {
                    const err = this._validateNameLikeField(row.sectorOther, 'Business sector');
                    if (err) {
                        if (otherEl?.setCustomValidity) {
                            otherEl.setCustomValidity(err);
                            otherEl.reportValidity();
                            this._registerInvalid(otherEl);
                        }
                        isValid = false;
                    } else if (otherEl?.setCustomValidity) {
                        otherEl.setCustomValidity('');
                        otherEl.reportValidity();
                        this._invalidElements = this._invalidElements.filter(x => x !== otherEl);
                    }
                }
            }

            const beginEl = this.template.querySelector(`input[data-id="${row.id}"][data-field="whenBegan"]`);
            if (!checkDate(beginEl, row.whenBegan, 'When Programme Started')) isValid = false;

            const card = beginEl?.closest('.domain-card, .sector-card');
            if (!row.supportTypes || row.supportTypes.length === 0) {
                this._showChipError(card, 'Select at least one type of support provided.');
                isValid = false;
            } else {
                this._clearChipError(card);
                if (row.supportTypes.includes('Other')) {
                    const otherSupportEl = this.template.querySelector(`lightning-input[data-id="${row.id}"][data-field="supportTypeOther"]`);
                    if (!row.supportTypeOther || String(row.supportTypeOther).trim() === '') {
                        if (otherSupportEl?.setCustomValidity) {
                            otherSupportEl.setCustomValidity('Please specify the type of support.');
                            otherSupportEl.reportValidity();
                            this._registerInvalid(otherSupportEl);
                        }
                        isValid = false;
                    } else if (otherSupportEl?.setCustomValidity) {
                        otherSupportEl.setCustomValidity('');
                        otherSupportEl.reportValidity();
                        this._invalidElements = this._invalidElements.filter(x => x !== otherSupportEl);
                    }
                }
            }

            const enrolEl = this.template.querySelector(`input[data-id="${row.id}"][data-field="enrollment"]`);
            if (!checkNumber(enrolEl, row.enrollment, 'Yearly Enrolment')) isValid = false;
        });

        // Q17 & Q18 Outcomes
        const outcomeNumFields = [
            { key: 'JC_NEW_BIZ_FY3', label: 'New Businesses Started (FY-3)' },
            { key: 'JC_NEW_BIZ_FY2', label: 'New Businesses Started (FY-2)' },
            { key: 'JC_NEW_BIZ_FY1', label: 'New Businesses Started (FY-1)' },
            { key: 'JC_NEW_BIZ_PROJ', label: 'New Businesses Started (Projected)' },
            { key: 'JC_NEW_JOBS_FY3', label: 'Jobs Created by New Businesses (FY-3)' },
            { key: 'JC_NEW_JOBS_FY2', label: 'Jobs Created by New Businesses (FY-2)' },
            { key: 'JC_NEW_JOBS_FY1', label: 'Jobs Created by New Businesses (FY-1)' },
            { key: 'JC_NEW_JOBS_PROJ', label: 'Jobs Created by New Businesses (Projected)' },
            { key: 'JC_EXIST_BIZ_FY3', label: 'Existing Businesses Supported (FY-3)' },
            { key: 'JC_EXIST_BIZ_FY2', label: 'Existing Businesses Supported (FY-2)' },
            { key: 'JC_EXIST_BIZ_FY1', label: 'Existing Businesses Supported (FY-1)' },
            { key: 'JC_EXIST_BIZ_PROJ', label: 'Existing Businesses Supported (Projected)' },
            { key: 'JC_EXIST_JOBS_FY3', label: 'Jobs Created by Existing Businesses (FY-3)' },
            { key: 'JC_EXIST_JOBS_FY2', label: 'Jobs Created by Existing Businesses (FY-2)' },
            { key: 'JC_EXIST_JOBS_FY1', label: 'Jobs Created by Existing Businesses (FY-1)' },
            { key: 'JC_EXIST_JOBS_PROJ', label: 'Jobs Created by Existing Businesses (Projected)' },
            { key: 'JC_COST_FY3', label: 'Avg Cost per Job Created (FY-3)' },
            { key: 'JC_COST_FY2', label: 'Avg Cost per Job Created (FY-2)' },
            { key: 'JC_COST_FY1', label: 'Avg Cost per Job Created (FY-1)' },
            { key: 'JC_COST_PROJ', label: 'Avg Cost per Job Created (Projected)' }
        ];

        outcomeNumFields.forEach(({ key, label }) => {
            const raw = this.formValues[key];
            const cleanStr = raw !== null && raw !== undefined ? String(raw).replace(/,/g, '').trim() : '';
            if (cleanStr === '') {
                this._showLightningError(key, `${label} is required.`);
                isValid = false;
            } else if (isNaN(Number(cleanStr))) {
                this._showLightningError(key, `${label} must be a number.`);
                isValid = false;
            } else if (Number(cleanStr) < 0) {
                this._showLightningError(key, `${label} cannot be negative.`);
                isValid = false;
            } else {
                this._clearLightningError(key);
            }
        });

        return isValid;
    }

    // ── Tab 4: Livelihood Upliftment Validation ───────────────────────────
    validateTabLivelihood() {
        let isValid = true;

        // Q19 Livelihood Approach
        if (!this._checkRichText('Livelihood_Approach__c', 'Your Livelihood Upliftment Approach', 500)) {
            isValid = false;
        }

        // Q20 Livelihood Programs
        const checkNumber = (el, value, label) => {
            if (value === '' || value === null || value === undefined) {
                this._showNativeError(el, `${label} is required.`);
                return false;
            }
            if (isNaN(Number(value))) {
                this._showNativeError(el, `${label} must be a number.`);
                return false;
            }
            if (Number(value) < 0) {
                this._showNativeError(el, `${label} cannot be negative.`);
                return false;
            }
            this._clearNativeError(el);
            return true;
        };

        this.livelihoodProgramRows.forEach(row => {
            const nameEl = this.template.querySelector(`lightning-input[data-id="${row.id}"][data-field="name"]`);
            if (!row.name || String(row.name).trim() === '') {
                if (nameEl?.setCustomValidity) {
                    nameEl.setCustomValidity('Program / Initiative Name is required.');
                    nameEl.reportValidity();
                    this._registerInvalid(nameEl);
                }
                isValid = false;
            } else if (nameEl?.setCustomValidity) {
                nameEl.setCustomValidity('');
                nameEl.reportValidity();
                this._invalidElements = this._invalidElements.filter(x => x !== nameEl);
            }

            const typeEl = this.template.querySelector(`lightning-input[data-id="${row.id}"][data-field="supportType"]`);
            if (!row.supportType || String(row.supportType).trim() === '') {
                if (typeEl?.setCustomValidity) {
                    typeEl.setCustomValidity('Type of Support Provided is required.');
                    typeEl.reportValidity();
                    this._registerInvalid(typeEl);
                }
                isValid = false;
            } else if (typeEl?.setCustomValidity) {
                typeEl.setCustomValidity('');
                typeEl.reportValidity();
                this._invalidElements = this._invalidElements.filter(x => x !== typeEl);
            }

            const hoursEl = this.template.querySelector(`input[data-id="${row.id}"][data-field="manHours"]`);
            if (!checkNumber(hoursEl, row.manHours, 'Duration in Man-Hours')) isValid = false;

            const enrollEl = this.template.querySelector(`input[data-id="${row.id}"][data-field="enrollment"]`);
            if (!checkNumber(enrollEl, row.enrollment, 'Annual Enrollment')) isValid = false;
        });

        // Q21 Community Rows
        this.communityRows.forEach(row => {
            const stateEl = this.template.querySelector(`select[data-id="${row.id}"][data-field="state"]`);
            if (!row.state || String(row.state).trim() === '') {
                this._showNativeError(stateEl, 'Please select a State.');
                isValid = false;
            } else {
                this._clearNativeError(stateEl);
            }

            const distEl = this.template.querySelector(`lightning-input[data-id="${row.id}"][data-field="district"]`);
            if (!row.district || String(row.district).trim() === '') {
                if (distEl?.setCustomValidity) {
                    distEl.setCustomValidity('District / Area is required.');
                    distEl.reportValidity();
                    this._registerInvalid(distEl);
                }
                isValid = false;
            } else if (distEl?.setCustomValidity) {
                distEl.setCustomValidity('');
                distEl.reportValidity();
                this._invalidElements = this._invalidElements.filter(x => x !== distEl);
            }

            ['fy3', 'fy2', 'fy1', 'proj'].forEach(f => {
                const el = this.template.querySelector(`lightning-input[data-id="${row.id}"][data-field="${f}"]`);
                const val = row[f];
                if (val !== '' && val !== null && val !== undefined && Number(val) < 0) {
                    if (el?.setCustomValidity) {
                        el.setCustomValidity('Value cannot be negative.');
                        el.reportValidity();
                        this._registerInvalid(el);
                    }
                    isValid = false;
                } else if (el?.setCustomValidity) {
                    el.setCustomValidity('');
                    el.reportValidity();
                    this._invalidElements = this._invalidElements.filter(x => x !== el);
                }
            });
        });

        // Q22 & Q23 Outcomes
        const outcomeNumFields = [
            { key: 'LIV_SERVED_FY3', label: 'Households Served (FY-3)' },
            { key: 'LIV_SERVED_FY2', label: 'Households Served (FY-2)' },
            { key: 'LIV_SERVED_FY1', label: 'Households Served (FY-1)' },
            { key: 'LIV_SERVED_PROJ', label: 'Households Served (Projected)' },
            { key: 'LIV_ENROLL_FY3', label: 'Households Newly Enrolled (FY-3)' },
            { key: 'LIV_ENROLL_FY2', label: 'Households Newly Enrolled (FY-2)' },
            { key: 'LIV_ENROLL_FY1', label: 'Households Newly Enrolled (FY-1)' },
            { key: 'LIV_ENROLL_PROJ', label: 'Households Newly Enrolled (Projected)' },
            { key: 'LIV_OUTCOME_FY3', label: 'Households Meeting Outcome Criteria (FY-3)' },
            { key: 'LIV_OUTCOME_FY2', label: 'Households Meeting Outcome Criteria (FY-2)' },
            { key: 'LIV_OUTCOME_FY1', label: 'Households Meeting Outcome Criteria (FY-1)' },
            { key: 'LIV_OUTCOME_PROJ', label: 'Households Meeting Outcome Criteria (Projected)' },
            { key: 'LIV_COST_FY3', label: 'Avg Cost per Outcome (FY-3)' },
            { key: 'LIV_COST_FY2', label: 'Avg Cost per Outcome (FY-2)' },
            { key: 'LIV_COST_FY1', label: 'Avg Cost per Outcome (FY-1)' },
            { key: 'LIV_COST_PROJ', label: 'Avg Cost per Outcome (Projected)' }
        ];

        outcomeNumFields.forEach(({ key, label }) => {
            const raw = this.formValues[key];
            const cleanStr = raw !== null && raw !== undefined ? String(raw).replace(/,/g, '').trim() : '';
            if (cleanStr === '') {
                this._showLightningError(key, `${label} is required.`);
                isValid = false;
            } else if (isNaN(Number(cleanStr))) {
                this._showLightningError(key, `${label} must be a number.`);
                isValid = false;
            } else if (Number(cleanStr) < 0) {
                this._showLightningError(key, `${label} cannot be negative.`);
                isValid = false;
            } else {
                this._clearLightningError(key);
            }
        });

        return isValid;
    }

    // ── Tab 5: Why Wadhwani Grants Validation ─────────────────────────────
    validateTabWhyWadhwani() {
        let isValid = true;
        const org = this.formValues;

        // Q24 Verified
        if (!org.Q24_VERIFIED) {
            this._showLightningError('Q24_VERIFIED', 'Please select whether outcomes were verified by a third party.');
            isValid = false;
        } else {
            this._clearLightningError('Q24_VERIFIED');
            if (org.Q24_VERIFIED === 'Yes') {
                if (!org.Details_of_Ethical_Received__c || String(org.Details_of_Ethical_Received__c).trim() === '') {
                    this._showLightningError('Details_of_Ethical_Received__c', 'Please specify who conducted the verification.');
                    isValid = false;
                } else {
                    this._clearLightningError('Details_of_Ethical_Received__c');
                }

                if (!this.q24UploadedFiles || this.q24UploadedFiles.length === 0) {
                    const q24ErrEl = this.template.querySelector('[data-error="q24Upload"]');
                    if (q24ErrEl) {
                        q24ErrEl.textContent = 'Please upload your third-party verification report.';
                        q24ErrEl.style.display = 'block';
                        this._registerInvalid(q24ErrEl);
                    }
                    isValid = false;
                } else {
                    const q24ErrEl = this.template.querySelector('[data-error="q24Upload"]');
                    if (q24ErrEl) {
                        q24ErrEl.textContent = '';
                        q24ErrEl.style.display = 'none';
                        this._invalidElements = this._invalidElements.filter(x => x !== q24ErrEl);
                    }
                }
            }
        }

        // Q25 Sustainability Plan
        if (!this._checkRichText('Organizational_Sustainability__c', 'Sustainability Plan', 100)) {
            isValid = false;
        }

        // Q26 Direction for Additional Funding
        if (!this._checkRichText('Use_of_Additional_Funding__c', 'Direction for Additional Funding', 200)) {
            isValid = false;
        }

        // Q27 GenieAI interest & description
        if (org.GenieAI_Interest_Level__c === 'Yes, interested' || org.GenieAI_Interest_Level__c === 'Maybe, want to learn more') {
            const desc = (org.Operational_Synergies_with_WOF__c || '').trim();
            const words = desc.split(/\s+/).filter(w => w.length > 0);
            if (words.length === 0) {
                this._showLightningError('Operational_Synergies_with_WOF__c', 'Please describe how GenieAI could contribute, or change your interest level to "Not at this time".');
                isValid = false;
            } else if (words.length > 200) {
                this._showLightningError('Operational_Synergies_with_WOF__c', `Exceeds 200-word limit (currently ${words.length} words). Please shorten before proceeding.`);
                isValid = false;
            } else {
                this._clearLightningError('Operational_Synergies_with_WOF__c');
            }
        } else {
            this._clearLightningError('Operational_Synergies_with_WOF__c');
        }

        return isValid;
    }

    // ── Tab 6: Review & Submit Validation ─────────────────────────────────
    validateTabReviewSubmit() {
        let isValid = true;

        if (!this.isAttested) {
            this.showBanner('error', 'Validation Error', 'Please confirm the accuracy of your application before submitting.');
            const box = this.template.querySelector('.attest-checkbox');
            if (box) {
                this._registerInvalid(box);
                this._scrollToFirstError();
            }
            return false;
        }

        const attestFields = [
            { id: 'Attesting_User_Name__c', label: 'Attesting User Name', val: this.attestingUserName },
            { id: 'Attesting_User_Title__c', label: 'Attesting User Title', val: this.attestingUserTitle }
        ];

        attestFields.forEach(({ id, label, val }) => {
            if (!val || String(val).trim() === '') {
                this._showLightningError(id, `${label} is required.`);
                isValid = false;
            } else {
                const err = this._validateNameLikeField(val, label);
                if (err) {
                    this._showLightningError(id, err);
                    isValid = false;
                } else {
                    this._clearLightningError(id);
                }
            }
        });

        return isValid;
    }

    // ── Unified Active Tab Validator ──────────────────────────────────────
    validateActiveTab(targetTabId = this.activeTabId) {
        this._syncRichTextFieldsFromDOM();
        this._resetInvalidTracking();
        let isTabValid = true;

        if (targetTabId === 'tabAboutOrg') {
            isTabValid = this.validateTabAboutOrg();
        } else if (targetTabId === 'tabJobFulfillment') {
            isTabValid = this.validateTabJobFulfillment();
        } else if (targetTabId === 'tabJobCreation') {
            isTabValid = this.validateTabJobCreation();
        } else if (targetTabId === 'tabLivelihood') {
            isTabValid = this.validateTabLivelihood();
        } else if (targetTabId === 'tabWhyWadhwani') {
            isTabValid = this.validateTabWhyWadhwani();
        } else if (targetTabId === 'tabReviewSubmit') {
            isTabValid = this.validateTabReviewSubmit();
        }

        if (!isTabValid) {
            const currentInvalidElements = this._invalidElements.filter(el => {
                return el && el.isConnected && (el.offsetParent !== null || el.closest('.modern-richtext-wrapper') !== null || el.closest('table') !== null || el.closest('.modern-subsection-card') !== null);
            });
            const validElementsList = currentInvalidElements.length > 0 ? currentInvalidElements : this._invalidElements;
            const uniqueLabels = Array.from(new Set(
                validElementsList.map(el => this._getFieldLabel(el)).filter(Boolean)
            ));
            const labelsStr = uniqueLabels.map(l => `"${l}"`).join(', ');

            this.showBanner(
                'error',
                'Missing Required Fields',
                labelsStr
                    ? `Please complete all required fields before proceeding: ${labelsStr}`
                    : 'Please complete all required fields before proceeding.'
            );

            this._scrollToFirstError();
            return false;
        }

        return true;
    }

    handleFiscalMonthChange(event) {
        this.handleInputChange(event);
        this.loadMetadata();
    }

    handleFiscalDayChange(event) {
        this.handleInputChange(event);
        this.loadMetadata();
    }

    get todayDateString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    handleDateKeyDown(event) {
        if (event.key === 'Tab' || event.key === 'Escape' || event.key === 'Enter') {
            return;
        }
        // Prevent manual keyboard entry to prevent invalid years; enforce picking via calendar popup
        event.preventDefault();
    }

    handleDateClick(event) {
        if (event.target && typeof event.target.showPicker === 'function') {
            try {
                event.target.showPicker();
            } catch (_) {
                // ignore
            }
        }
    }

    // ── Date Formatting (DD/MM/YYYY) ─────────────────────────────────────
    _formatDateDDMMYYYY(v) {
        if (!v) return '';
        const s = (v instanceof Date) ? v.toISOString() : String(v);
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return s;
        return `${m[3]}/${m[2]}/${m[1]}`;
    }

    get formattedIncorporationDate() {
        return this._formatDateDDMMYYYY(this.formValues.Incorporation_Date__c);
    }
    get formattedFunder1PeriodStart() {
        return this._formatDateDDMMYYYY(this.formValues.Funder_1_Period_Start__c);
    }
    get formattedFunder1PeriodEnd() {
        return this._formatDateDDMMYYYY(this.formValues.Funder_1_Period_End__c);
    }
    get formattedFunder2PeriodStart() {
        return this._formatDateDDMMYYYY(this.formValues.Funder_2_Period_Start__c);
    }
    get formattedFunder2PeriodEnd() {
        return this._formatDateDDMMYYYY(this.formValues.Funder_2_Period_End__c);
    }
    get formattedFunder3PeriodStart() {
        return this._formatDateDDMMYYYY(this.formValues.Funder_3_Period_Start__c);
    }
    get formattedFunder3PeriodEnd() {
        return this._formatDateDDMMYYYY(this.formValues.Funder_3_Period_End__c);
    }

    // ── Q9 Math End Balances & Auto-Chained Start Balances ────────────────
    get computedEndFY3() {
        return calculateEndingBalance(this.formValues.START_FY3, this.formValues.REV_FY3, (Number(this.formValues.CAP_FY3)||0) + (Number(this.formValues.OP_FY3)||0));
    }
    get computedStartFY2() {
        return this.computedEndFY3;
    }
    get computedEndFY2() {
        return calculateEndingBalance(this.computedStartFY2, this.formValues.REV_FY2, (Number(this.formValues.CAP_FY2)||0) + (Number(this.formValues.OP_FY2)||0));
    }
    get computedStartFY1() {
        return this.computedEndFY2;
    }
    get computedEndFY1() {
        return calculateEndingBalance(this.computedStartFY1, this.formValues.REV_FY1, (Number(this.formValues.CAP_FY1)||0) + (Number(this.formValues.OP_FY1)||0));
    }

    // ── Q10 Math Deviations & Net Position Totals ─────────────────────────
    get computedRevDeviation() {
        const budget = Number(this.formValues.CFY_REV_BUDGET) || 0;
        const proj = Number(this.formValues.CFY_REV_PROJ) || 0;
        return proj - budget;
    }
    get computedCapDeviation() {
        const budget = Number(this.formValues.CFY_CAP_BUDGET) || 0;
        const proj = Number(this.formValues.CFY_CAP_PROJ) || 0;
        return proj - budget;
    }
    get computedOpDeviation() {
        const budget = Number(this.formValues.CFY_OP_BUDGET) || 0;
        const proj = Number(this.formValues.CFY_OP_PROJ) || 0;
        return proj - budget;
    }

    get computedNetBudget() {
        const rev = Number(this.formValues.CFY_REV_BUDGET) || 0;
        const cap = Number(this.formValues.CFY_CAP_BUDGET) || 0;
        const op  = Number(this.formValues.CFY_OP_BUDGET)  || 0;
        return rev - (cap + op);
    }
    get computedNetProjection() {
        const rev = Number(this.formValues.CFY_REV_PROJ) || 0;
        const cap = Number(this.formValues.CFY_CAP_PROJ) || 0;
        const op  = Number(this.formValues.CFY_OP_PROJ)  || 0;
        return rev - (cap + op);
    }
    get computedNetDeviation() {
        return this.computedNetProjection - this.computedNetBudget;
    }

    get isDeviationExplanationRequired() {
        return (
            this.computedRevDeviation !== 0 ||
            this.computedCapDeviation !== 0 ||
            this.computedOpDeviation  !== 0 ||
            this.computedNetDeviation  !== 0
        );
    }

    get deviationExplanationCounterClass() {
        return this.deviationExplanationWordCount > 200 ? 'word-count-over' : 'word-count';
    }

    // ── Q13 & Q14 Placement % Calculations ──────────────────────────────
    get computedJfPlacePctFY3() {
        const enroll = Number(this.formValues.JF_ENROLL_FY3) || 0;
        const place = Number(this.formValues.JF_PLACE_FY3) || 0;
        return enroll > 0 ? ((place / enroll) * 100).toFixed(1) : '0.0';
    }
    get computedJfPlacePctFY2() {
        const enroll = Number(this.formValues.JF_ENROLL_FY2) || 0;
        const place = Number(this.formValues.JF_PLACE_FY2) || 0;
        return enroll > 0 ? ((place / enroll) * 100).toFixed(1) : '0.0';
    }
    get computedJfPlacePctFY1() {
        const enroll = Number(this.formValues.JF_ENROLL_FY1) || 0;
        const place = Number(this.formValues.JF_PLACE_FY1) || 0;
        return enroll > 0 ? ((place / enroll) * 100).toFixed(1) : '0.0';
    }
    get computedJfPlacePctProj() {
        const enroll = Number(this.formValues.JF_ENROLL_PROJ) || 0;
        const place = Number(this.formValues.JF_PLACE_PROJ) || 0;
        return enroll > 0 ? ((place / enroll) * 100).toFixed(1) : '0.0';
    }

    _formatNumberWithCommas(val) {
        if (val === null || val === undefined || val === '') return '';
        const cleanStr = String(val).replace(/,/g, '');
        const num = Number(cleanStr);
        if (isNaN(num)) return val;
        return num.toLocaleString('en-US');
    }

    get formattedJfEnrollFY3() { return this._formatNumberWithCommas(this.formValues.JF_ENROLL_FY3); }
    get formattedJfEnrollFY2() { return this._formatNumberWithCommas(this.formValues.JF_ENROLL_FY2); }
    get formattedJfEnrollFY1() { return this._formatNumberWithCommas(this.formValues.JF_ENROLL_FY1); }

    get formattedJfPlaceFY3() { return this._formatNumberWithCommas(this.formValues.JF_PLACE_FY3); }
    get formattedJfPlaceFY2() { return this._formatNumberWithCommas(this.formValues.JF_PLACE_FY2); }
    get formattedJfPlaceFY1() { return this._formatNumberWithCommas(this.formValues.JF_PLACE_FY1); }

    get formattedJfEnrollProj() { return this._formatNumberWithCommas(this.formValues.JF_ENROLL_PROJ); }
    get formattedJfPlaceProj() { return this._formatNumberWithCommas(this.formValues.JF_PLACE_PROJ); }

    get skillingApproachCounterClass() {
        return this.skillingApproachWordCount > 500 ? 'word-count-over' : 'word-count';
    }

    get jobCreationApproachCounterClass() {
        return this.jobCreationApproachWordCount > 500 ? 'word-count-over' : 'word-count';
    }

    // ── Rich Text Word Count Error Getters & Flags ───────────────────────
    get skillingApproachError() {
        if (this.skillingApproachWordCount > 500) {
            return `Word limit exceeded (${this.skillingApproachWordCount} / 500 words). Please shorten your text.`;
        }
        return '';
    }
    get isSkillingApproachOverLimit() {
        return this.skillingApproachWordCount > 500;
    }

    get jobCreationApproachError() {
        if (this.jobCreationApproachWordCount > 500) {
            return `Word limit exceeded (${this.jobCreationApproachWordCount} / 500 words). Please shorten your text.`;
        }
        return '';
    }
    get isJobCreationApproachOverLimit() {
        return this.jobCreationApproachWordCount > 500;
    }

    get livelihoodApproachCounterClass() {
        return this.livelihoodApproachWordCount > 500 ? 'word-count-over' : 'word-count';
    }
    get livelihoodApproachError() {
        if (this.livelihoodApproachWordCount > 500) {
            return `Word limit exceeded (${this.livelihoodApproachWordCount} / 500 words). Please shorten your text.`;
        }
        return '';
    }
    get isLivelihoodApproachOverLimit() {
        return this.livelihoodApproachWordCount > 500;
    }

    get sustainabilityCounterClass() {
        return this.sustainabilityWordCount > 100 ? 'word-count-over' : 'word-count';
    }
    get sustainabilityError() {
        if (this.sustainabilityWordCount > 100) {
            return `Word limit exceeded (${this.sustainabilityWordCount} / 100 words). Please shorten your text.`;
        }
        return '';
    }
    get isSustainabilityOverLimit() {
        return this.sustainabilityWordCount > 100;
    }

    get useOfFundingCounterClass() {
        return this.useOfFundingWordCount > 200 ? 'word-count-over' : 'word-count';
    }
    get useOfFundingError() {
        if (this.useOfFundingWordCount > 200) {
            return `Word limit exceeded (${this.useOfFundingWordCount} / 200 words). Please shorten your text.`;
        }
        return '';
    }
    get isUseOfFundingOverLimit() {
        return this.useOfFundingWordCount > 200;
    }

    get legalStructureError() {
        if (this.legalStructureWordCount > 100) {
            return `Word limit exceeded (${this.legalStructureWordCount} / 100 words). Please shorten your text.`;
        }
        return '';
    }
    get isLegalStructureOverLimit() {
        return this.legalStructureWordCount > 100;
    }

    get deviationExplanationError() {
        if (this.deviationExplanationWordCount > 200) {
            return `Word limit exceeded (${this.deviationExplanationWordCount} / 200 words). Please shorten your text.`;
        }
        return '';
    }
    get isDeviationExplanationOverLimit() {
        return this.deviationExplanationWordCount > 200;
    }

    // ── Q24 Verified Flag ───────────────────────────────────────────────
    get isThirdPartyVerified() {
        return this.formValues.Q24_VERIFIED === 'Yes';
    }

    // ── Dynamic Grid Rows State ──────────────────────────────────────────
    @track skillingDomainRows = [{ id: 1, name: '', hours: '', duration: '', whenStarted: '', displayWhenStarted: '', enrollment: '' }];
    @track businessSectorRows = [{ id: 1, sector: '', sectorOther: '', supportTypes: [], supportTypeOther: '', whenBegan: '', displayWhenBegan: '', enrollment: '' }];
    @track livelihoodProgramRows = [{ id: 1, name: '', supportType: '', manHours: '', enrollment: '' }];
    @track communityRows = [{ id: 1, state: '', district: '', fy3: '', fy2: '', fy1: '', proj: '' }];
    @track docRows = [
        { id: 1, name: 'Proposal / Concept Note', url: '' },
        { id: 2, name: 'Annual Report / Audited Financials', url: '' }
    ];

    addSkillingDomainRow() {
        this.skillingDomainRows = [...this.skillingDomainRows, { id: Date.now(), name: '', hours: '', duration: '', whenStarted: '', displayWhenStarted: '', enrollment: '' }];
    }
    handleSkillingDomainChange(event) {
        const rawId = event.target?.dataset?.id || event.currentTarget?.dataset?.id;
        const field = event.target?.dataset?.field || event.currentTarget?.dataset?.field;
        const val = event.target?.value ?? '';
        this.skillingDomainRows = this.skillingDomainRows.map(r => {
            if (String(r.id) === String(rawId)) {
                const updated = { ...r, [field]: val };
                if (field === 'whenStarted') {
                    updated.displayWhenStarted = this._formatDateDDMMYYYY(val);
                }
                return updated;
            }
            return r;
        });
        if (event.target) {
            if (event.target.setCustomValidity) {
                event.target.setCustomValidity('');
                event.target.reportValidity();
            }
            this._clearNativeError(event.target);
            this._invalidElements = this._invalidElements.filter(x => x !== event.target);
        }
    }
    handleRemoveSkillingDomainRow(event) {
        const rawId = event.currentTarget?.dataset?.id || event.target?.dataset?.id;
        if (this.skillingDomainRows.length > 1) {
            this.skillingDomainRows = this.skillingDomainRows.filter(r => String(r.id) !== String(rawId));
        } else {
            this.skillingDomainRows = [{ id: Date.now(), name: '', hours: '', duration: '', whenStarted: '', displayWhenStarted: '', enrollment: '' }];
        }
    }

    get canRemoveSkillingDomainRow() {
        return this.skillingDomainRows.length > 1;
    }

    addBusinessSectorRow() {
        this.businessSectorRows = [...this.businessSectorRows, { id: Date.now(), sector: '', sectorOther: '', supportTypes: [], supportTypeOther: '', whenBegan: '', displayWhenBegan: '', enrollment: '' }];
    }
    handleBusinessSectorChange(event) {
        const rawId = event.target?.dataset?.id || event.currentTarget?.dataset?.id;
        const field = event.target?.dataset?.field || event.currentTarget?.dataset?.field;
        const val = event.target?.value ?? event.detail?.value ?? '';
        this.businessSectorRows = this.businessSectorRows.map(r => {
            if (String(r.id) === String(rawId)) {
                const updated = { ...r, [field]: val };
                if (field === 'whenBegan') {
                    updated.displayWhenBegan = this._formatDateDDMMYYYY(val);
                }
                if (field === 'sector' && val !== 'Other') {
                    updated.sectorOther = '';
                }
                return updated;
            }
            return r;
        });
        if (event.target) {
            if (event.target.setCustomValidity) {
                event.target.setCustomValidity('');
                event.target.reportValidity();
            }
            this._clearNativeError(event.target);
            this._invalidElements = this._invalidElements.filter(x => x !== event.target);
        }
    }
    handleSupportTypeChip(event) {
        const rawId = event.currentTarget?.dataset?.id || event.target?.dataset?.id;
        const chipVal = event.currentTarget?.dataset?.chip || event.target?.dataset?.chip;
        this.businessSectorRows = this.businessSectorRows.map(r => {
            if (String(r.id) === String(rawId)) {
                let current = Array.isArray(r.supportTypes) ? [...r.supportTypes] : [];
                if (current.includes(chipVal)) {
                    current = current.filter(t => t !== chipVal);
                } else {
                    current.push(chipVal);
                }
                let supportTypeOtherVal = r.supportTypeOther;
                if (!current.includes('Other')) {
                    supportTypeOtherVal = '';
                }
                return { ...r, supportTypes: current, supportTypeOther: supportTypeOtherVal };
            }
            return r;
        });
        const card = event.currentTarget?.closest('.domain-card, .sector-card');
        if (card) {
            this._clearChipError(card);
        }
    }
    handleRemoveBusinessSectorRow(event) {
        const rawId = event.currentTarget?.dataset?.id || event.target?.dataset?.id;
        if (this.businessSectorRows.length > 1) {
            this.businessSectorRows = this.businessSectorRows.filter(r => String(r.id) !== String(rawId));
        } else {
            this.businessSectorRows = [{ id: Date.now(), sector: '', sectorOther: '', supportTypes: [], supportTypeOther: '', whenBegan: '', displayWhenBegan: '', enrollment: '' }];
        }
    }

    addLivelihoodProgramRow() {
        this.livelihoodProgramRows = [...this.livelihoodProgramRows, { id: Date.now(), name: '', supportType: '', manHours: '', enrollment: '' }];
    }
    handleLivelihoodProgramChange(event) {
        const rawId = event.target?.dataset?.id || event.currentTarget?.dataset?.id;
        const field = event.target?.dataset?.field || event.currentTarget?.dataset?.field;
        const val = event.target?.value ?? '';
        this.livelihoodProgramRows = this.livelihoodProgramRows.map(r => String(r.id) === String(rawId) ? { ...r, [field]: val } : r);
        if (event.target) {
            if (event.target.setCustomValidity) {
                event.target.setCustomValidity('');
                event.target.reportValidity();
            }
            this._clearNativeError(event.target);
            this._invalidElements = this._invalidElements.filter(x => x !== event.target);
        }
    }
    handleRemoveLivelihoodProgramRow(event) {
        const rawId = event.currentTarget?.dataset?.id || event.target?.dataset?.id;
        if (this.livelihoodProgramRows.length > 1) {
            this.livelihoodProgramRows = this.livelihoodProgramRows.filter(r => String(r.id) !== String(rawId));
        } else {
            this.livelihoodProgramRows = [{ id: Date.now(), name: '', supportType: '', manHours: '', enrollment: '' }];
        }
    }
    get canRemoveLivelihoodProgramRow() {
        return this.livelihoodProgramRows.length > 1;
    }

    addCommunityRow() {
        this.communityRows = [...this.communityRows, { id: Date.now(), state: '', district: '', fy3: '', fy2: '', fy1: '', proj: '' }];
    }
    get stateOptions() {
        return [
            { label: '— Select State —', value: '' },
            { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
            { label: 'Arunachal Pradesh', value: 'Arunachal Pradesh' },
            { label: 'Assam', value: 'Assam' },
            { label: 'Bihar', value: 'Bihar' },
            { label: 'Chhattisgarh', value: 'Chhattisgarh' },
            { label: 'Goa', value: 'Goa' },
            { label: 'Gujarat', value: 'Gujarat' },
            { label: 'Haryana', value: 'Haryana' },
            { label: 'Himachal Pradesh', value: 'Himachal Pradesh' },
            { label: 'Jharkhand', value: 'Jharkhand' },
            { label: 'Karnataka', value: 'Karnataka' },
            { label: 'Kerala', value: 'Kerala' },
            { label: 'Madhya Pradesh', value: 'Madhya Pradesh' },
            { label: 'Maharashtra', value: 'Maharashtra' },
            { label: 'Manipur', value: 'Manipur' },
            { label: 'Meghalaya', value: 'Meghalaya' },
            { label: 'Mizoram', value: 'Mizoram' },
            { label: 'Nagaland', value: 'Nagaland' },
            { label: 'Odisha', value: 'Odisha' },
            { label: 'Punjab', value: 'Punjab' },
            { label: 'Rajasthan', value: 'Rajasthan' },
            { label: 'Sikkim', value: 'Sikkim' },
            { label: 'Tamil Nadu', value: 'Tamil Nadu' },
            { label: 'Telangana', value: 'Telangana' },
            { label: 'Tripura', value: 'Tripura' },
            { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
            { label: 'Uttarakhand', value: 'Uttarakhand' },
            { label: 'West Bengal', value: 'West Bengal' },
            { label: 'Andaman and Nicobar Islands', value: 'Andaman and Nicobar Islands' },
            { label: 'Chandigarh', value: 'Chandigarh' },
            { label: 'Dadra and Nagar Haveli and Daman and Diu', value: 'Dadra and Nagar Haveli and Daman and Diu' },
            { label: 'Delhi', value: 'Delhi' },
            { label: 'Jammu and Kashmir', value: 'Jammu and Kashmir' },
            { label: 'Ladakh', value: 'Ladakh' },
            { label: 'Lakshadweep', value: 'Lakshadweep' },
            { label: 'Puducherry', value: 'Puducherry' },
            { label: 'Other', value: 'Other' }
        ];
    }

    get canRemoveCommunityRow() {
        return this.communityRows.length > 1;
    }

    get communityRowsWithStateOptions() {
        const options = this.stateOptions;
        return (this.communityRows || []).map(row => {
            return {
                ...row,
                stateDropdownOptions: options.map(opt => ({
                    ...opt,
                    isSelected: opt.value === row.state
                }))
            };
        });
    }

    handleCommunityChange(event) {
        const rawId = event.target?.dataset?.id || event.currentTarget?.dataset?.id;
        const field = event.target?.dataset?.field || event.currentTarget?.dataset?.field;
        const val = event.detail?.value !== undefined ? event.detail.value : (event.target?.value ?? '');
        this.communityRows = this.communityRows.map(r => String(r.id) === String(rawId) ? { ...r, [field]: val } : r);
        if (event.target) {
            if (event.target.setCustomValidity) {
                event.target.setCustomValidity('');
                event.target.reportValidity();
            }
            this._clearNativeError(event.target);
            this._invalidElements = this._invalidElements.filter(x => x !== event.target);
        }
    }
    handleRemoveCommunityRow(event) {
        const rawId = event.currentTarget?.dataset?.id || event.target?.dataset?.id;
        if (this.communityRows.length > 1) {
            this.communityRows = this.communityRows.filter(r => String(r.id) !== String(rawId));
        } else {
            this.communityRows = [{ id: Date.now(), state: '', district: '', fy3: '', fy2: '', fy1: '', proj: '' }];
        }
    }

    addDocRow() {
        this.docRows = [...this.docRows, { id: Date.now(), name: '', url: '' }];
    }
    handleDocRowChange(event) {
        const rawId = event.target?.dataset?.id || event.currentTarget?.dataset?.id;
        const field = event.target?.dataset?.field || event.currentTarget?.dataset?.field;
        const val = event.target?.value ?? '';
        this.docRows = this.docRows.map(r => String(r.id) === String(rawId) ? { ...r, [field]: val } : r);
    }
    handleRemoveDocRow(event) {
        const rawId = event.currentTarget?.dataset?.id || event.target?.dataset?.id;
        if (this.docRows.length > 1) {
            this.docRows = this.docRows.filter(r => String(r.id) !== String(rawId));
        } else {
            this.docRows = [{ id: Date.now(), name: '', url: '' }];
        }
    }
    get canRemoveDocRow() {
        return this.docRows.length > 1;
    }

    // ── Picklist Options & Conditional Getters (Q4, Q5, Q6) ────────────
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

    get showLegalTypeOther() {
        return this.formValues.Legal_Type__c === 'Other';
    }

    get showRegistrationJurisdictionOther() {
        return this.formValues.Registration_Jurisdiction__c === 'Other';
    }

    get entityTypeOptions() {
        return [
            { label: 'Section 8 Non-Profit Company', value: 'Section 8' },
            { label: 'Registered Trust', value: 'Trust' },
            { label: 'Registered Society', value: 'Society' },
            { label: 'US 501(c)(3) Public Charity', value: '501c3' },
            { label: 'International Non-Profit / NGO', value: 'NGO' },
            { label: 'Other', value: 'Other' }
        ];
    }

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

    get funderTypeOptions() {
        return [
            { label: '— Select —', value: '' },
            { label: 'Grant', value: 'Grant' },
            { label: 'Loan', value: 'Loan' },
            { label: 'Equity', value: 'Equity' },
            { label: 'In-Kind', value: 'In-Kind' }
        ];
    }

    get genieAiOptions() {
        return [
            { label: 'Yes, interested', value: 'Yes, interested' },
            { label: 'Maybe, want to learn more', value: 'Maybe, want to learn more' },
            { label: 'Not at this time', value: 'Not at this time' }
        ];
    }

    get showGenieAiText() {
        const val = this.formValues.GenieAI_Interest_Level__c;
        return Boolean(val && (val === 'Yes, interested' || val === 'Maybe, want to learn more'));
    }

    get fiscalMonthOptions() {
        return [
            { label: 'January', value: '01' }, { label: 'February', value: '02' },
            { label: 'March', value: '03' },   { label: 'April', value: '04' },
            { label: 'May', value: '05' },     { label: 'June', value: '06' },
            { label: 'July', value: '07' },    { label: 'August', value: '08' },
            { label: 'September', value: '09' },{ label: 'October', value: '10' },
            { label: 'November', value: '11' },{ label: 'December', value: '12' }
        ];
    }

    get fiscalDayOptions() {
        const opts = [];
        for (let d = 1; d <= 31; d++) {
            const val = String(d);
            const label = String(d).padStart(2, '0');
            opts.push({ label: label, value: val });
        }
        return opts;
    }

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
        return this.businessSectorRows.map((row, index) => {
            const currentTypes = Array.isArray(row.supportTypes) ? row.supportTypes : [];
            const supportTypeChips = supportOpts.map(opt => ({
                value: opt.value,
                label: opt.label,
                isSelected: currentTypes.includes(opt.value),
                chipClass: currentTypes.includes(opt.value) ? 'sector-chip selected' : 'sector-chip'
            }));
            return {
                ...row,
                displayIdx: index + 1,
                isOtherSector: row.sector === 'Other',
                showSupportTypeOther: currentTypes.includes('Other'),
                supportTypeChips: supportTypeChips
            };
        });
    }

    get canRemoveSectorRow() {
        return this.businessSectorRows.length > 1;
    }

    // ── Funder Card Toggle & Validation Methods (Q6) ───────────────────
    get isFunderLimitReached() {
        return this.showFunder3 === true;
    }

    handleAddFunder() {
        if (!this.showFunder2) {
            this.showFunder2 = true;
        } else if (!this.showFunder3) {
            this.showFunder3 = true;
        }
    }

    handleRemoveFunder2() {
        this.showFunder2 = false;
        this.formValues = {
            ...this.formValues,
            Funder_2_Name__c: '',
            Funder_2_Amount__c: '',
            Funder_2_Period_Start__c: '',
            Funder_2_Period_End__c: '',
            Funder_2_Type__c: ''
        };
        this._clearLightningError('Funder_2_Name__c');
        this._clearLightningError('Funder_2_Amount__c');
        this._clearLightningError('Funder_2_Period_Start__c');
        this._clearLightningError('Funder_2_Period_End__c');
        this._clearLightningError('Funder_2_Type__c');
    }

    handleRemoveFunder3() {
        this.showFunder3 = false;
        this.formValues = {
            ...this.formValues,
            Funder_3_Name__c: '',
            Funder_3_Amount__c: '',
            Funder_3_Period_Start__c: '',
            Funder_3_Period_End__c: '',
            Funder_3_Type__c: ''
        };
        this._clearLightningError('Funder_3_Name__c');
        this._clearLightningError('Funder_3_Amount__c');
        this._clearLightningError('Funder_3_Period_Start__c');
        this._clearLightningError('Funder_3_Period_End__c');
        this._clearLightningError('Funder_3_Type__c');
    }

    _validateFunderFields() {
        const org = this.formValues;
        const funderSets = [
            {
                label: 'Funder 1',
                fields: {
                    name:   'Funder_1_Name__c',
                    amount: 'Funder_1_Amount__c',
                    start:  'Funder_1_Period_Start__c',
                    end:    'Funder_1_Period_End__c',
                    type:   'Funder_1_Type__c',
                },
                show: true,
            },
            {
                label: 'Funder 2',
                fields: {
                    name:   'Funder_2_Name__c',
                    amount: 'Funder_2_Amount__c',
                    start:  'Funder_2_Period_Start__c',
                    end:    'Funder_2_Period_End__c',
                    type:   'Funder_2_Type__c',
                },
                show: this.showFunder2,
            },
            {
                label: 'Funder 3',
                fields: {
                    name:   'Funder_3_Name__c',
                    amount: 'Funder_3_Amount__c',
                    start:  'Funder_3_Period_Start__c',
                    end:    'Funder_3_Period_End__c',
                    type:   'Funder_3_Type__c',
                },
                show: this.showFunder3,
            },
        ];

        funderSets.forEach(({ label, fields, show }) => {
            if (!show) return;

            const f = fields;
            const values = Object.values(f).map(key => org[key]);
            const anyFilled = values.some(v => v !== '' && v !== null && v !== undefined);

            if (!anyFilled) {
                Object.values(f).forEach(key => this._clearLightningError(key));
                return;
            }

            const requiredKeys = [f.name, f.amount, f.start, f.end, f.type];
            requiredKeys.forEach(key => {
                if (!org[key] && org[key] !== 0) {
                    this._showLightningError(key, `${label}: complete all fields or clear this row.`);
                } else {
                    this._clearLightningError(key);
                }
            });

            if (org[f.amount] !== '' && org[f.amount] !== null && org[f.amount] !== undefined) {
                const n = Number(org[f.amount]);
                if (isNaN(n) || n < 0) {
                    this._showLightningError(f.amount, 'Please enter a valid positive amount.');
                }
            }

            if (org[f.start] && org[f.end]) {
                try {
                    const s = new Date(org[f.start]);
                    const e = new Date(org[f.end]);
                    if (!isNaN(s) && !isNaN(e) && s >= e) {
                        this._showLightningError(f.end, 'Funding end date must be after start date.');
                    }
                } catch (_) { /* ignore */ }
            }
        });
    }

    // ── Reference Card Toggle & Validation Methods (Q8) ───────────────────
    get isReferenceLimitReached() {
        return this.showReference2 === true;
    }

    handleAddReference() {
        if (!this.showReference2) {
            this.showReference2 = true;
        }
    }

    handleRemoveReference2() {
        this.showReference2 = false;
        this.formValues = {
            ...this.formValues,
            Reference_2_Name__c: '',
            Reference_2_Role__c: '',
            Reference_2_Email__c: ''
        };
        this._clearLightningError('Reference_2_Name__c');
        this._clearLightningError('Reference_2_Role__c');
        this._clearLightningError('Reference_2_Email__c');
    }

    _validateReferenceFields() {
        const org = this.formValues;
        const refSets = [
            {
                label: 'Reference 1',
                fields: {
                    name:  'Reference_1_Name__c',
                    role:  'Reference_1_Role__c',
                    email: 'Reference_1_Email__c'
                },
                show: true
            },
            {
                label: 'Reference 2',
                fields: {
                    name:  'Reference_2_Name__c',
                    role:  'Reference_2_Role__c',
                    email: 'Reference_2_Email__c'
                },
                show: this.showReference2
            }
        ];

        refSets.forEach(({ label, fields, show }) => {
            if (!show) return;
            const f = fields;
            const values = [org[f.name], org[f.role], org[f.email]];
            const anyFilled = values.some(v => v !== '' && v !== null && v !== undefined);

            if (!anyFilled) {
                Object.values(f).forEach(key => this._clearLightningError(key));
                return;
            }

            Object.values(f).forEach(key => {
                if (!org[key]) {
                    this._showLightningError(key, `${label}: complete all fields or clear this row.`);
                } else {
                    this._clearLightningError(key);
                }
            });

            if (org[f.email]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(org[f.email])) {
                    this._showLightningError(f.email, 'Please enter a valid email address.');
                }
            }
        });
    }

    // ── Q5 Legal and Tax Compliance Validation Helper ─────────────────────
    _validateComplianceFields() {
        const reqFields = [
            { key: 'Has_501c3_Status__c', label: 'US 501(c)(3) status' },
            { key: 'Has_Equivalency_Determination__c', label: 'Equivalency Determination (ED) status' },
            { key: 'Is_FCRA_Registered__c', label: 'FCRA registration status' },
            { key: 'Willing_to_Pursue_ED__c', label: 'ED certification willingness' }
        ];

        reqFields.forEach(({ key, label }) => {
            if (!this.formValues[key]) {
                this._showLightningError(key, `Please select an option for ${label}.`);
            } else {
                this._clearLightningError(key);
            }
        });
    }

    // ── Rich Text Toolbar & Word Count Helpers (Q4) ────────────────────
    setActiveField(event) {
        this.activeField = event.target;
    }

    boldText() {
        if (this.activeField) {
            document.execCommand('bold', false, null);
        }
    }

    italicText() {
        if (this.activeField) {
            document.execCommand('italic', false, null);
        }
    }

    underlineText() {
        if (this.activeField) {
            document.execCommand('underline', false, null);
        }
    }

    insertBulletPoints() {
        const field = this.activeField;
        if (!field) return;

        field.focus();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode('• ');
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    _updateWordCountForField(fieldKey, wordsCount) {
        if (fieldKey === 'Legal_Structure__c') {
            this.legalStructureWordCount = wordsCount;
        } else if (fieldKey === 'Revenue_Explanation__c') {
            this.deviationExplanationWordCount = wordsCount;
        } else if (fieldKey === 'Skilling_Approach__c') {
            this.skillingApproachWordCount = wordsCount;
        } else if (fieldKey === 'Job_Creation_Approach__c') {
            this.jobCreationApproachWordCount = wordsCount;
        } else if (fieldKey === 'Livelihood_Approach__c') {
            this.livelihoodApproachWordCount = wordsCount;
        } else if (fieldKey === 'Organizational_Sustainability__c') {
            this.sustainabilityWordCount = wordsCount;
        } else if (fieldKey === 'Use_of_Additional_Funding__c') {
            this.useOfFundingWordCount = wordsCount;
        }
    }

    handleKeyDown(event) {
        const el = event.target;
        if (el?.isContentEditable) {
            const text = (el.innerText || '').trim();
            const words = text.split(/\s+/).filter(w => w.length > 0);
            const fieldKey = el.dataset?.field || el.dataset?.id;
            if (fieldKey) {
                this.formValues = {
                    ...this.formValues,
                    [fieldKey]: el.innerHTML
                };
                this._updateWordCountForField(fieldKey, words.length);
            }
        }

        if (event.key === 'Enter') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            const container = range.startContainer;
            const lineText = container.textContent || container.parentNode?.textContent || '';

            if (lineText.trim().startsWith('• ')) {
                event.preventDefault();
                const br = document.createElement('br');
                const bullet = document.createTextNode('• ');
                range.insertNode(br);
                range.collapse(false);
                range.insertNode(bullet);
                const newRange = document.createRange();
                newRange.setStartAfter(bullet);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
    }

    handlePaste(event) {
        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData).getData('text/plain');
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        selection.deleteFromDocument();
        selection.getRangeAt(0).insertNode(document.createTextNode(text));

        const el = event.target;
        if (el?.isContentEditable) {
            const rawWords = (el.innerText || '').trim().split(/\s+/).filter(w => w.length > 0);
            const fieldKey = el.dataset?.field || el.dataset?.id;
            if (fieldKey) {
                this.formValues = {
                    ...this.formValues,
                    [fieldKey]: el.innerHTML
                };
                this._updateWordCountForField(fieldKey, rawWords.length);
            }
        }
    }

    get legalStructureCounterClass() {
        return this.legalStructureWordCount > 550 ? 'word-count-over' : 'word-count';
    }

    stripHtml(html) {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || doc.body.innerText || '';
    }

    _sanitizeHtml(html) {
        if (!html) return '';
        return html;
    }

    // ── AI Feedback Modal Logic ──────────────────────────────────────────
    handleAIClick(event) {
        const fieldApiName = event.currentTarget.dataset.id || 'Legal_Structure__c';
        const submitterName = this.formValues.Submitter_Name__c || '';

        if (!submitterName) {
            this.showBanner('warning', 'Missing Info', 'Please fill in the Submitter Name on Page 1 before using AI Feedback.');
            return;
        }

        let fieldValue = this.formValues[fieldApiName] || '';
        const rtEl = this.template.querySelector(`[contenteditable="true"][data-field="${fieldApiName}"]`);
        if (rtEl) {
            fieldValue = this._sanitizeHtml(rtEl.innerHTML);
            this.formValues = {
                ...this.formValues,
                [fieldApiName]: fieldValue
            };
        }

        const plain = this.stripHtml(fieldValue).replace(/\u00A0/g, ' ').trim();
        if (!plain) {
            this.showBanner('warning', 'Empty Field', 'Please write something in this field before requesting AI feedback.');
            return;
        }

        if (fieldApiName === 'Legal_Structure__c') {
            let legalType = this.formValues.Legal_Type__c || '';
            if (legalType === 'Other') {
                legalType += ' ' + (this.formValues.Legal_Type_Other__c || '');
            }
            let regJurisdiction = this.formValues.Registration_Jurisdiction__c || '';
            if (regJurisdiction === 'Other') {
                regJurisdiction += ' ' + (this.formValues.Registration_Jurisdiction_Other__c || '');
            }
            fieldValue = ' Legal Type: ' + legalType + ' Registration Jurisdiction: ' + regJurisdiction + ' ' + fieldValue;
        }

        this.isAIModalOpen = true;
        const titleMap = {
            'Revenue_Explanation__c': 'AI Feedback – Explanation of Deviation',
            'Livelihood_Approach__c': 'AI Feedback – Your Livelihood Upliftment Approach',
            'Job_Creation_Approach__c': 'AI Feedback – Your Job Creation Approach',
            'Skilling_Approach__c': 'AI Feedback – Your Skilling Approach',
            'Organizational_Sustainability__c': 'AI Feedback – Organizational Sustainability',
            'Use_of_Additional_Funding__c': 'AI Feedback – Use of Additional Funds',
            'Operational_Synergies_with_WOF__c': 'AI Feedback – Operational Synergies with GenieAI'
        };
        this.aiModalTitle = titleMap[fieldApiName] || 'AI Feedback – Legal Structure';
        this.isAiLoading = true;
        this.aiResponse = '';

        upsertAIFeedback({
            fieldApiName: fieldApiName,
            fieldValue: fieldValue,
            submitterName: submitterName
        })
        .then(() => {
            setTimeout(() => {
                this.loadAIFeedback(fieldApiName, submitterName);
            }, 6000);
        })
        .catch(err => {
            console.error('Apex upsertAIFeedback call failed:', err);
            this.aiResponse = 'Error generating AI feedback.';
            this.isAiLoading = false;
        });
    }

    loadAIFeedback(fieldApiName, submitterName) {
        getAIFeedbackRecord({ submitterName })
        .then(result => {
            if (result) {
                const flexFieldMap = {
                    'Legal_Structure__c': 'Legal_Structure_FR__c',
                    'Revenue_Explanation__c': 'Revenue_Explanation_FR__c',
                    'Skilling_Approach__c': 'Skilling_Approach_FR__c',
                    'Job_Creation_Approach__c': 'Job_Creation_Approach_FR__c',
                    'Livelihood_Approach__c': 'Livelihood_Approach_FR__c',
                    'Operational_Synergies_with_WOF__c': 'Operational_Synergies_with_WOF_FR__c',
                    'Organizational_Sustainability__c': 'Organizational_Sustainability_FR__c',
                    'Use_of_Additional_Funding__c': 'Use_of_Additional_Funding_FR__c'
                };
                const flexField = flexFieldMap[fieldApiName] || 'Legal_Structure_FR__c';
                this.aiResponse = result[flexField] || 'No feedback available yet.';
            } else {
                this.aiResponse = 'No feedback available yet.';
            }
            this.isAiLoading = false;
        })
        .catch(err => {
            console.error('Failed to load AI feedback:', err);
            this.aiResponse = 'Error loading AI feedback.';
            this.isAiLoading = false;
        });
    }

    closeAIModal() {
        this.isAIModalOpen = false;
        this.aiResponse = '';
        this.isAiLoading = false;
    }

    get formattedAiSections() {
        if (!this.aiResponse) return [];

        const labels = ['Rating', 'Strengths', 'Weaknesses', 'Summary'];
        const pattern = new RegExp(`(${labels.join('|')})\\s*:?`, 'gi');
        const parts = this.aiResponse.split(pattern).filter(p => p !== undefined && p.trim() !== '');

        const sections = [];
        for (let i = 0; i < parts.length; i++) {
            if (labels.includes(parts[i])) {
                const label = parts[i];
                const body = parts[i + 1] || '';
                const points = body
                    .split(/\n|(?<=\.)\s+(?=[A-Z])/)
                    .map(s => s.replace(/^[-•*]\s*/, '').trim())
                    .filter(s => s.length > 0);
                sections.push({ title: label, points });
                i++;
            }
        }

        if (sections.length === 0 && this.aiResponse.trim()) {
            sections.push({
                title: 'Feedback',
                points: this.aiResponse.split(/\n+/).map(l => l.trim()).filter(l => l)
            });
        }
        return sections;
    }

    // ── Accepted File Format Getters (Q24 & Q28) ────────────────────────
    get pdfAcceptFormats() {
        return ['.pdf'];
    }

    get supportingDocsAcceptFormats() {
        return ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
    }

    // ── Q24 Third-Party Verification File Upload ──────────────────────────
    @track q24UploadedFiles = [];

    get hasQ24UploadedFiles() {
        return this.q24UploadedFiles && this.q24UploadedFiles.length > 0;
    }

    handleQ24UploadFinished(event) {
        const uploaded = event.detail.files || [];
        if (uploaded.length > 0) {
            const newFiles = uploaded.map(f => ({
                name: f.name,
                documentId: f.documentId,
                contentVersionId: f.contentVersionId
            }));
            this.q24UploadedFiles = [...this.q24UploadedFiles, ...newFiles];
            this.showBanner('success', 'File Uploaded', 'Verification Report uploaded successfully.');
        }
    }

    handleRemoveQ24File(event) {
        const docId = event.currentTarget?.dataset?.id || event.target?.dataset?.id;
        this.q24UploadedFiles = this.q24UploadedFiles.filter(f => f.documentId !== docId);
        if (docId) {
            deleteUploadedFile({ documentId: docId, recordId: this.recordId })
                .catch(err => console.warn('File delete warning:', err));
        }
    }

    // ── Q28 Additional Supporting Documents File Upload ─────────────────
    @track q28UploadedFiles = [];

    get hasQ28UploadedFiles() {
        return this.q28UploadedFiles && this.q28UploadedFiles.length > 0;
    }

    handleQ28UploadFinished(event) {
        const uploaded = event.detail.files || [];
        if (uploaded.length > 0) {
            const newFiles = uploaded.map(f => ({
                name: f.name,
                documentId: f.documentId,
                contentVersionId: f.contentVersionId
            }));
            this.q28UploadedFiles = [...this.q28UploadedFiles, ...newFiles];
            this.showBanner('success', 'File Uploaded', 'Supporting Document uploaded successfully.');
        }
    }

    handleRemoveQ28File(event) {
        const docId = event.currentTarget?.dataset?.id || event.target?.dataset?.id;
        this.q28UploadedFiles = this.q28UploadedFiles.filter(f => f.documentId !== docId);
        if (docId) {
            deleteUploadedFile({ documentId: docId, recordId: this.recordId })
                .catch(err => console.warn('File delete warning:', err));
        }
    }

    _syncCalculatedAndAliasFields() {
        const f = { ...this.formValues };

        // 1. Historical Financial Data (Historical_Data__c)
        f.CY3_Balance_Start_CFY_3__c = f.START_FY3 || f.CY3_Balance_Start_CFY_3__c || '';
        f.CY3_Revenue__c = f.REV_FY3 || f.CY3_Revenue__c || '';
        f.CY3_Capital_Expenditure__c = f.CAP_FY3 || f.CY3_Capital_Expenditure__c || '';
        f.CY3_Operating_Expenditure__c = f.OP_FY3 || f.CY3_Operating_Expenditure__c || '';
        f.CY3_Expense__c = String((Number(f.CY3_Capital_Expenditure__c)||0) + (Number(f.CY3_Operating_Expenditure__c)||0));
        f.CY3_Balance_End__c = String((Number(f.CY3_Balance_Start_CFY_3__c)||0) + (Number(f.CY3_Revenue__c)||0) - (Number(f.CY3_Expense__c)||0));

        f.CY2_Balance_Start_CFY_2__c = f.CY3_Balance_End__c;
        f.CY2_Revenue__c = f.REV_FY2 || f.CY2_Revenue__c || '';
        f.CY2_Capital_Expenditure__c = f.CAP_FY2 || f.CY2_Capital_Expenditure__c || '';
        f.CY2_Operating_Expenditure__c = f.OP_FY2 || f.CY2_Operating_Expenditure__c || '';
        f.CY2_Expense__c = String((Number(f.CY2_Capital_Expenditure__c)||0) + (Number(f.CY2_Operating_Expenditure__c)||0));
        f.CY2_Balance_End__c = String((Number(f.CY2_Balance_Start_CFY_2__c)||0) + (Number(f.CY2_Revenue__c)||0) - (Number(f.CY2_Expense__c)||0));

        f.CY1_Balance_Start_CFY_1__c = f.CY2_Balance_End__c;
        f.CY1_Revenue__c = f.REV_FY1 || f.CY1_Revenue__c || '';
        f.CY1_Capital_Expenditure__c = f.CAP_FY1 || f.CY1_Capital_Expenditure__c || '';
        f.CY1_Operating_Expenditure__c = f.OP_FY1 || f.CY1_Operating_Expenditure__c || '';
        f.CY1_Expense__c = String((Number(f.CY1_Capital_Expenditure__c)||0) + (Number(f.CY1_Operating_Expenditure__c)||0));
        f.CY1_Balance_End__c = String((Number(f.CY1_Balance_Start_CFY_1__c)||0) + (Number(f.CY1_Revenue__c)||0) - (Number(f.CY1_Expense__c)||0));

        // 2. Current Fiscal Year Data (Current_fiscal_year_data__c)
        f.Revenue_Budget__c = f.CFY_REV_BUDGET || f.Revenue_Budget__c || '';
        f.Revenue_Projection__c = f.CFY_REV_PROJ || f.Revenue_Projection__c || '';
        f.Revenue_Variance__c = String(this.computedRevDeviation);

        f.Capital_Expenditure_Budget__c = f.CFY_CAP_BUDGET || f.Capital_Expenditure_Budget__c || '';
        f.Capital_Expenditure_Projection__c = f.CFY_CAP_PROJ || f.Capital_Expenditure_Projection__c || '';
        f.Capital_Expenditure_Variance__c = String(this.computedCapDeviation);

        f.Operating_Expenditure_Budget__c = f.CFY_OP_BUDGET || f.Operating_Expenditure_Budget__c || '';
        f.Operating_Expenditure_Projection__c = f.CFY_OP_PROJ || f.Operating_Expenditure_Projection__c || '';
        f.Operating_Expenditure_Variance__c = String(this.computedOpDeviation);

        f.Net_Budget__c = String(this.computedNetBudget);
        f.Net_Projection__c = String(this.computedNetProjection);
        f.Net_Variance__c = String(this.computedNetDeviation);

        // 3. Job Fulfillment Outcomes (Outcomes_Data__c)
        f.Projected_Learner_Enrollments_FY_3__c = f.JF_ENROLL_FY3 || f.Projected_Learner_Enrollments_FY_3__c || f.Actual_Learner_Enrollments_FY_3__c || '';
        f.Projected_Learner_Placements_FY_3__c = f.JF_PLACE_FY3 || f.Projected_Learner_Placements_FY_3__c || f.Actual_Learner_Placements_FY_3__c || '';
        f.Projected_Learner_placement_FY_3__c = this.computedJfPlacePctFY3 || f.Projected_Learner_placement_FY_3__c || '';
        f.Avg_Cost_per_Placement_FY_3__c = f.JF_COST_FY3 || f.Avg_Cost_per_Placement_FY_3__c || f.Avg_Cost_per_Placement_FY3__c || '';
        f.Manual_Avg_Cost_per_Placement_FY_3__c = f.JF_COST_FY3 || f.Manual_Avg_Cost_per_Placement_FY_3__c || '';

        f.Projected_Learner_Enrollments_FY_2__c = f.JF_ENROLL_FY2 || f.Projected_Learner_Enrollments_FY_2__c || f.Actual_Learner_Enrollments_FY_2__c || '';
        f.Projected_Learner_Placements_FY_2__c = f.JF_PLACE_FY2 || f.Projected_Learner_Placements_FY_2__c || f.Actual_Learner_Placements_FY_2__c || '';
        f.Projected_Learner_placement_FY_2__c = this.computedJfPlacePctFY2 || f.Projected_Learner_placement_FY_2__c || '';
        f.Avg_Cost_per_Placement_FY_2__c = f.JF_COST_FY2 || f.Avg_Cost_per_Placement_FY_2__c || f.Avg_Cost_per_Placement_FY2__c || '';
        f.Manual_Avg_Cost_per_Placement_FY_2__c = f.JF_COST_FY2 || f.Manual_Avg_Cost_per_Placement_FY_2__c || '';

        f.Projected_Learner_Enrollments_FY_1__c = f.JF_ENROLL_FY1 || f.Projected_Learner_Enrollments_FY_1__c || f.Actual_Learner_Enrollments_FY_1__c || '';
        f.Projected_Learner_Placements_FY_1__c = f.JF_PLACE_FY1 || f.Projected_Learner_Placements_FY_1__c || f.Actual_Learner_Placements_FY_1__c || '';
        f.Projected_Learner_placement_FY_1__c = this.computedJfPlacePctFY1 || f.Projected_Learner_placement_FY_1__c || '';
        f.Avg_Cost_per_Placement_FY_1__c = f.JF_COST_FY1 || f.Avg_Cost_per_Placement_FY_1__c || f.Avg_Cost_per_Placement_FY1__c || '';
        f.Manual_Avg_Cost_per_Placement_FY_1__c = f.JF_COST_FY1 || f.Manual_Avg_Cost_per_Placement_FY_1__c || '';

        f.Projected_Learner_Enrollments_CFY__c = f.JF_ENROLL_PROJ || f.Projected_Learner_Enrollments_CFY__c || '';
        f.Projected_Learner_Placements_CFY__c = f.JF_PLACE_PROJ || f.Projected_Learner_Placements_CFY__c || '';
        f.Projected_Learner_placement_CFY__c = this.computedJfPlacePctProj || f.Projected_Learner_placement_CFY__c || '';
        f.Avg_Cost_per_Placement_CFY__c = f.JF_COST_PROJ || f.Avg_Cost_per_Placement_CFY__c || '';
        f.Manual_Avg_Cost_per_Placement_CFY__c = f.JF_COST_PROJ || f.Manual_Avg_Cost_per_Placement_CFY__c || '';

        // Also populate legacy actual field names for safety
        f.Actual_Learner_Enrollments_FY_3__c = f.Projected_Learner_Enrollments_FY_3__c;
        f.Actual_Learner_Placements_FY_3__c = f.Projected_Learner_Placements_FY_3__c;
        f.Actual_Learner_placement_FY_3__c = f.Projected_Learner_placement_FY_3__c;
        f.Avg_Cost_per_Placement_FY3__c = f.Avg_Cost_per_Placement_FY_3__c;
        f.Actual_Learner_Enrollments_FY_2__c = f.Projected_Learner_Enrollments_FY_2__c;
        f.Actual_Learner_Placements_FY_2__c = f.Projected_Learner_Placements_FY_2__c;
        f.Actual_Learner_placement_FY_2__c = f.Projected_Learner_placement_FY_2__c;
        f.Avg_Cost_per_Placement_FY2__c = f.Avg_Cost_per_Placement_FY_2__c;
        f.Actual_Learner_Enrollments_FY_1__c = f.Projected_Learner_Enrollments_FY_1__c;
        f.Actual_Learner_Placements_FY_1__c = f.Projected_Learner_Placements_FY_1__c;
        f.Actual_Learner_placement_FY_1__c = f.Projected_Learner_placement_FY_1__c;
        f.Avg_Cost_per_Placement_FY1__c = f.Avg_Cost_per_Placement_FY_1__c;

        // 4. Job Creation Outcomes (Outcomes_Data__c)
        f.Projected_New_Businesses_FY_3__c = f.JC_NEW_BIZ_FY3 || f.Projected_New_Businesses_FY_3__c || '';
        f.Projected_Jobs_from_New_Businesses_FY3__c = f.JC_NEW_JOBS_FY3 || f.Projected_Jobs_from_New_Businesses_FY3__c || f.Jobs_from_New_Businesses_FY_3__c || '';
        f.Growing_Businesses_Supported_FY_3__c = f.JC_EXIST_BIZ_FY3 || f.Growing_Businesses_Supported_FY_3__c || '';
        f.Jobs_from_Growing_Businesses_FY_3__c = f.JC_EXIST_JOBS_FY3 || f.Jobs_from_Growing_Businesses_FY_3__c || '';
        f.Avg_Cost_per_Job_FY_3__c = f.JC_COST_FY3 || f.Avg_Cost_per_Job_FY_3__c || '';
        f.Manual_Avg_Cost_per_Job_FY_3__c = f.JC_COST_FY3 || f.Manual_Avg_Cost_per_Job_FY_3__c || '';

        f.Projected_New_Businesses_FY_2__c = f.JC_NEW_BIZ_FY2 || f.Projected_New_Businesses_FY_2__c || '';
        f.Projected_Jobs_from_New_Businesses_FY2__c = f.JC_NEW_JOBS_FY2 || f.Projected_Jobs_from_New_Businesses_FY2__c || f.Jobs_from_New_Businesses_FY_2__c || '';
        f.Growing_Businesses_Supported_FY_2__c = f.JC_EXIST_BIZ_FY2 || f.Growing_Businesses_Supported_FY_2__c || '';
        f.Jobs_from_Growing_Businesses_FY_2__c = f.JC_EXIST_JOBS_FY2 || f.Jobs_from_Growing_Businesses_FY_2__c || '';
        f.Avg_Cost_per_Job_FY_2__c = f.JC_COST_FY2 || f.Avg_Cost_per_Job_FY_2__c || '';
        f.Manual_Avg_Cost_per_Job_FY_2__c = f.JC_COST_FY2 || f.Manual_Avg_Cost_per_Job_FY_2__c || '';

        f.Projected_New_Businesses_FY_1__c = f.JC_NEW_BIZ_FY1 || f.Projected_New_Businesses_FY_1__c || '';
        f.Projected_Jobs_from_New_Businesses_FY1__c = f.JC_NEW_JOBS_FY1 || f.Projected_Jobs_from_New_Businesses_FY1__c || f.Jobs_from_New_Businesses_FY_1__c || '';
        f.Growing_Businesses_Supported_FY_1__c = f.JC_EXIST_BIZ_FY1 || f.Growing_Businesses_Supported_FY_1__c || '';
        f.Jobs_from_Growing_Businesses_FY_1__c = f.JC_EXIST_JOBS_FY1 || f.Jobs_from_Growing_Businesses_FY_1__c || '';
        f.Avg_Cost_per_Job_FY_1__c = f.JC_COST_FY1 || f.Avg_Cost_per_Job_FY_1__c || '';
        f.Manual_Avg_Cost_per_Job_FY_1__c = f.JC_COST_FY1 || f.Manual_Avg_Cost_per_Job_FY_1__c || '';

        f.Projected_New_Businesses_CFY__c = f.JC_NEW_BIZ_PROJ || f.Projected_New_Businesses_CFY__c || '';
        f.Projected_Jobs_from_New_Businesses_CFY__c = f.JC_NEW_JOBS_PROJ || f.Projected_Jobs_from_New_Businesses_CFY__c || f.Jobs_from_New_Businesses_CFY__c || '';
        f.Growing_Businesses_Supported_CFY__c = f.JC_EXIST_BIZ_PROJ || f.Growing_Businesses_Supported_CFY__c || '';
        f.Jobs_from_Growing_Businesses_CFY__c = f.JC_EXIST_JOBS_PROJ || f.Jobs_from_Growing_Businesses_CFY__c || '';
        f.Avg_Cost_per_Job_CFY__c = f.JC_COST_PROJ || f.Avg_Cost_per_Job_CFY__c || '';
        f.Manual_Avg_Cost_per_Job_CFY__c = f.JC_COST_PROJ || f.Manual_Avg_Cost_per_Job_CFY__c || '';

        // Also populate legacy field names for safety
        f.Jobs_from_New_Businesses_FY_3__c = f.Projected_Jobs_from_New_Businesses_FY3__c;
        f.Jobs_from_New_Businesses_FY_2__c = f.Projected_Jobs_from_New_Businesses_FY2__c;
        f.Jobs_from_New_Businesses_FY_1__c = f.Projected_Jobs_from_New_Businesses_FY1__c;
        f.Jobs_from_New_Businesses_CFY__c = f.Projected_Jobs_from_New_Businesses_CFY__c;

        // 5. Livelihood Outcomes (Outcomes_Data__c)
        f.LIV_SERVED_FY3__c = f.LIV_SERVED_FY3 || f.LIV_SERVED_FY3__c || '';
        f.LIV_ENROLL_FY3__c = f.LIV_ENROLL_FY3 || f.LIV_ENROLL_FY3__c || '';
        f.LIV_OUTCOME_FY3__c = f.LIV_OUTCOME_FY3 || f.LIV_OUTCOME_FY3__c || '';
        f.LIV_COST_FY3__c = f.LIV_COST_FY3 || f.LIV_COST_FY3__c || '';

        f.LIV_SERVED_FY2__c = f.LIV_SERVED_FY2 || f.LIV_SERVED_FY2__c || '';
        f.LIV_ENROLL_FY2__c = f.LIV_ENROLL_FY2 || f.LIV_ENROLL_FY2__c || '';
        f.LIV_OUTCOME_FY2__c = f.LIV_OUTCOME_FY2 || f.LIV_OUTCOME_FY2__c || '';
        f.LIV_COST_FY2__c = f.LIV_COST_FY2 || f.LIV_COST_FY2__c || '';

        f.LIV_SERVED_FY1__c = f.LIV_SERVED_FY1 || f.LIV_SERVED_FY1__c || '';
        f.LIV_ENROLL_FY1__c = f.LIV_ENROLL_FY1 || f.LIV_ENROLL_FY1__c || '';
        f.LIV_OUTCOME_FY1__c = f.LIV_OUTCOME_FY1 || f.LIV_OUTCOME_FY1__c || '';
        f.LIV_COST_FY1__c = f.LIV_COST_FY1 || f.LIV_COST_FY1__c || '';

        f.LIV_SERVED_PROJ__c = f.LIV_SERVED_PROJ || f.LIV_SERVED_PROJ__c || '';
        f.LIV_ENROLL_PROJ__c = f.LIV_ENROLL_PROJ || f.LIV_ENROLL_PROJ__c || '';
        f.LIV_OUTCOME_PROJ__c = f.LIV_OUTCOME_PROJ || f.LIV_OUTCOME_PROJ__c || '';
        f.LIV_COST_PROJ__c = f.LIV_COST_PROJ || f.LIV_COST_PROJ__c || '';

        // 6. Section 5: Why Wadhwani Grants & Verification & Rich-Text Approaches
        f.Skilling_Approach__c = f.Skilling_Approach__c || f.Skilling_Approach_FR__c || '';
        f.Job_Creation_Approach__c = f.Job_Creation_Approach__c || f.Job_Creation_Approach_FR__c || '';
        f.Livelihood_Approach__c = f.Livelihood_Approach__c || f.Livelihood_Approach_FR__c || '';
        f.Q24_VERIFIED__c = f.Q24_VERIFIED || f.Q24_VERIFIED__c || '';
        f.Job_Verification_3rd_Party_CFY__c = f.Q24_VERIFIED || f.Job_Verification_3rd_Party_CFY__c || '';
        f.Job_Verification_3rd_Party_FY1__c = f.Q24_VERIFIED || f.Job_Verification_3rd_Party_FY1__c || '';
        f.Details_of_Ethical_Received__c = f.Details_of_Ethical_Received__c || '';
        f.X3rd_Party_Verification_Description_FY_1__c = f.Details_of_Ethical_Received__c || f.X3rd_Party_Verification_Description_FY_1__c || '';
        f.Organizational_Sustainability__c = f.Organizational_Sustainability__c || f.Organizational_Sustainability_FR__c || '';
        f.Use_of_Additional_Funding__c = f.Use_of_Additional_Funding__c || f.Use_of_Additional_Funding_FR__c || '';
        f.GenieAI_Interest_Level__c = f.GenieAI_Interest_Level__c || '';
        f.Operational_Synergies_with_WOF__c = f.Operational_Synergies_with_WOF__c || '';
        f.Leader_Tenure__c = (f.Leader_Tenure__c !== undefined && f.Leader_Tenure__c !== null && String(f.Leader_Tenure__c).trim() !== '') ? String(f.Leader_Tenure__c).trim() : '';

        return f;
    }

    // ── Draft & Submit Apex Integration ────────────────────────────────
    handleSaveDraft(showToast = true) {
        this._syncRichTextFieldsFromDOM();
        if (showToast) {
            this.isLoading = true;
        }
        const q24DocIds = this.q24UploadedFiles.map(f => f.documentId);
        const q28DocIds = this.q28UploadedFiles.map(f => f.documentId);
        const syncedValues = this._syncCalculatedAndAliasFields();

        const payload = {
            ...syncedValues,
            activeTabId: this.activeTabId,
            skillingDomains: this.skillingDomainRows,
            businessSectors: this.businessSectorRows,
            livelihoodPrograms: this.livelihoodProgramRows,
            communities: this.communityRows,
            documents: this.docRows,
            q24DocumentIds: q24DocIds,
            q28DocumentIds: q28DocIds,
            uploadedDocumentIds: [...q24DocIds, ...q28DocIds]
        };
        return saveDynamicDraft({
            recordId: this.recordId,
            selectedTracks: this.selectedTracks,
            payloadJson: JSON.stringify(payload)
        })
        .then(result => {
            if (result && result.isSuccess) {
                this._recordId = result.recordId;
                this.isDirty = false;
                if (showToast) {
                    this.showBanner('success', 'Draft Saved', 'Your RFI application draft has been saved successfully.');
                }
            } else if (showToast) {
                this.showBanner('error', 'Error Saving Draft', result ? result.message : 'Draft save failed.');
            }
        })
        .catch(err => {
            console.error('Draft save failed:', err);
            if (showToast) {
                this.showBanner('error', 'Error Saving Draft', err.body ? err.body.message : err.message || 'Draft save failed.');
            }
        })
        .finally(() => {
            if (showToast) {
                this.isLoading = false;
            }
        });
    }

    async handleSubmit() {
        if (this.isLoading) return;
        this._syncRichTextFieldsFromDOM();

        // Auto-populate attestation fields from submitter contact if blank
        if (!this.formValues.Attesting_User_Name__c) {
            this.formValues.Attesting_User_Name__c = this.formValues.Submitter_Name__c || '';
        }
        if (!this.formValues.Attesting_User_Title__c) {
            this.formValues.Attesting_User_Title__c = this.formValues.Job_Title__c || '';
        }

        // Validate attestation on current review tab
        if (!this.validateTabReviewSubmit()) {
            return;
        }

        // Validate all required tabs directly without cycling DOM
        if (!this.validateTabAboutOrg()) {
            this.activeTabId = 'tabAboutOrg';
            return;
        }
        if (this.hasJobFulfillmentTrack && !this.validateTabJobFulfillment()) {
            this.activeTabId = 'tabJobFulfillment';
            return;
        }
        if (this.hasJobCreationTrack && !this.validateTabJobCreation()) {
            this.activeTabId = 'tabJobCreation';
            return;
        }
        if (this.hasLivelihoodTrack && !this.validateTabLivelihood()) {
            this.activeTabId = 'tabLivelihood';
            return;
        }
        if (!this.validateTabWhyWadhwani()) {
            this.activeTabId = 'tabWhyWadhwani';
            return;
        }

        this.isLoading = true;
        const q24DocIds = this.q24UploadedFiles.map(f => f.documentId);
        const q28DocIds = this.q28UploadedFiles.map(f => f.documentId);
        const syncedValues = this._syncCalculatedAndAliasFields();

        const payload = {
            ...syncedValues,
            activeTabId: 'tabReviewSubmit',
            skillingDomains: this.skillingDomainRows,
            businessSectors: this.businessSectorRows,
            livelihoodPrograms: this.livelihoodProgramRows,
            communities: this.communityRows,
            documents: this.docRows,
            q24DocumentIds: q24DocIds,
            q28DocumentIds: q28DocIds,
            uploadedDocumentIds: [...q24DocIds, ...q28DocIds]
        };
        submitDynamicApplication({
            recordId: this.recordId,
            selectedTracks: this.selectedTracks,
            payloadJson: JSON.stringify(payload)
        })
        .then(result => {
            if (result && result.isSuccess) {
                this.isDirty = false;
                this.showBanner('success', 'Submitted', 'Your RFI application has been successfully submitted.');
                this.dispatchEvent(new CustomEvent('submitted', { detail: { recordId: result.recordId } }));
                setTimeout(() => {
                    window.location.href = '/wcf/s/';
                }, 1500);
            } else {
                this.showBanner('error', 'Submission Error', result ? result.message : 'Submission failed.');
            }
        })
        .catch(err => {
            console.error('Submit failed:', err);
            this.showBanner('error', 'Submission Error', err.body ? err.body.message : err.message || 'Submission failed.');
        })
        .finally(() => {
            this.isLoading = false;
        });
    }
}