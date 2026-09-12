import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import getReviewerFormV5Metadata from '@salesforce/apex/WCF_ReviewFormJFController.getReviewerFormV5Metadata';
import saveApplicationReview from '@salesforce/apex/WCF_ReviewFormJFController.saveApplicationReview';
import getIndividualApplication from '@salesforce/apex/WCF_ReviewFormJFController.getIndividualApplication';
import hasAlreadyReviewed from '@salesforce/apex/WCF_ReviewFormJFController.hasAlreadyReviewed';
import getDraftReviewRecord from '@salesforce/apex/WCF_ReviewFormJFController.getDraftReviewRecord';
import saveDraftReview from '@salesforce/apex/WCF_ReviewFormJFController.saveDraftReview';
import deleteUploadedFile from '@salesforce/apex/WCF_ReviewFormJFController.deleteUploadedFile';
import getAttachedFiles from '@salesforce/apex/WCF_ReviewFormJFController.getAttachedFiles';
import getRejectionReasonOptions from '@salesforce/apex/WCF_ReviewFormJFController.getRejectionReasonOptions';

const RATING_LABEL = { 5: 'Very strong', 4: 'Strong', 3: 'Adequate', 2: 'Weak', 1: 'Very weak' };

const OUTCOME_JF   = 'WCF_Job_Fulfillment';
const OUTCOME_JC   = 'WCF_Job_Creation_Review';
const OUTCOME_BOTH = 'WCF_Job_Fulfillment_Job_Creation';

const REC_STRONGLY   = 'Strongly Recommend';
const REC_RECOMMEND  = 'Recommend';
const REC_RESERVE    = 'Recommend with Reservations';
const REC_DO_NOT     = 'Do Not Recommend';
const POSITIVE_REC_CHOICES = new Set([REC_STRONGLY, REC_RECOMMEND, REC_RESERVE]);

function storedRecValue(choice) {
    if (POSITIVE_REC_CHOICES.has(choice)) return 'Yes';
    if (choice === REC_DO_NOT) return 'No';
    return '';
}

const MAX_WORDS = 200;

function countWords(text) {
    const trimmed = (text || '').trim();
    return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

function truncateToWordLimit(text, limit) {
    const words = (text || '').trim().split(/\s+/);
    if (words.length <= limit) return text;
    return words.slice(0, limit).join(' ');
}

const ALWAYS_ALLOWED_KEYS = new Set([
    'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
    'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab',
    'Enter'
]);

// Map of question IDs to ApplicationReview physical fields for backwards compatibility
const QUESTION_FIELD_MAP = {
    '1.1': { rating: 'D1_Governance_Rating__c', comment: 'D1_Governance_Comment__c' },
    '1.2': { rating: 'D1_Leadership_Rating__c', comment: 'D1_Leadership_Comment__c' },
    '1.3': { rating: 'D1_FinancialRecords_Rating__c', comment: 'D1_FinancialRecords_Comment__c' },
    '1.4': { rating: 'D1_SustainabilityVision_Rating__c', comment: 'D1_SustainabilityVision_Comment__c' },
    '2.1': { rating: 'D2_ProgramAlignment_Rating__c', comment: 'D2_ProgramAlignment_Comment__c' },
    '2.2': { rating: 'D2_JF_Distinctiveness_Rating__c', comment: 'D2_JF_Distinctiveness_Comment__c' },
    '2.3': { rating: 'D2_OperationalDepth_Rating__c', comment: 'D2_OperationalDepth_Comment__c' },
    '3.1': { rating: 'D3_JF_ScaleRecord_Rating__c', comment: 'D3_JF_ScaleRecord_Comment__c' },
    '3.2': { rating: 'D3_JF_ConversionRate_Rating__c', comment: 'D3_JF_ConversionRate_Comment__c' },
    '3.3': { rating: 'D3_JF_CostPerPlacement_Rating__c', comment: 'D3_JF_CostPerPlacement_Comment__c' },
    '3.4': { rating: 'D3_ValidationEvidence_Rating__c', comment: 'D3_ValidationEvidence_Comment__c' },
    '4.1': { rating: 'D4_MandateFit_Rating__c', comment: 'D4_MandateFit_Comment__c' },
    '4.2': { rating: 'D4_Geography_Rating__c', comment: 'D4_Geography_Comment__c' },
    '4.3': { rating: 'D4_GenieAI_Rating__c', comment: 'D4_GenieAI_Comment__c' },
    '5.1': { rating: 'D5_FinancialStability_Rating__c', comment: 'D5_FinancialStability_Comment__c' },
    '5.2': { rating: 'D5_IncrementEstimate_Rating__c', comment: 'D5_IncrementEstimate_Comment__c' },
    '5.3': { rating: 'D5_OperatingInfra_Rating__c', comment: 'D5_OperatingInfra_Comment__c' },
    '6.1': { rating: 'D6_MEFunction_Rating__c', comment: 'D6_MEFunction_Comment__c' },
    '6.2': { rating: 'D6_ExternalVerification_Rating__c', comment: 'D6_ExternalVerification_Comment__c' },
    '6.3': { rating: 'D6_LongitudinalTracking_Rating__c', comment: 'D6_LongitudinalTracking_Comment__c' },
    '7.1': { rating: 'D5_RationaleCredibility_Rating__c', comment: 'D5_Rationale_Credibility_Comment__c' },
    '7.2': { rating: 'D2_JC_SupportModel_Rating__c', comment: 'D2_JC_SupportModel_Comment__c' }
};

// Initial built-in 7 Categories & 22 Questions to ensure instant non-empty rendering
const FALLBACK_CATEGORIES = [
    {
        categoryNumber: 1,
        title: 'Institutional Credibility',
        lede: 'Evaluate the founding governance, leadership integrity, financial stewardship, and strategic sustainability vision.',
        sequence: 1,
        questions: [
            {
                questionId: '1.1',
                questionText: 'How credible, experienced, and actively involved is the governing board and senior leadership team?',
                trackAware: false,
                resolvedDescription: 'Assess board governance, meeting frequency, leadership background, and organizational oversight.',
                ladder: ['1  Weak governance, no independent board', '2  Occasional board meetings, limited oversight', '3  Regular meetings, standard governance structure', '4  Active and experienced board with strong oversight', '5  Exemplary governance with distinguished independent board']
            },
            {
                questionId: '1.2',
                questionText: 'Does the organization demonstrate transparent leadership succession, accountability, and key personnel stability?',
                trackAware: false,
                resolvedDescription: 'Assess management stability, low turnover in senior roles, and clear accountability structures.',
                ladder: ['1  High turnover, lack of accountability', '2  Frequent leadership changes with some disruption', '3  Stable leadership with adequate succession awareness', '4  Strong, stable leadership team with clear succession plan', '5  Exceptional leadership stability, culture of excellence and accountability']
            },
            {
                questionId: '1.3',
                questionText: 'Are statutory audits, compliance filings, and financial records up-to-date and free of major adverse audit remarks?',
                trackAware: false,
                resolvedDescription: 'Check statutory audit history, FCRA/12A/80G filings, and unqualified audit reports.',
                ladder: ['1  Adverse audit remarks or severe non-compliance', '2  Delayed filings or unresolved minor remarks', '3  Compliant with standard filings and clear audit reports', '4  Consistently clean audits with strong internal controls', '5  Flawless multi-year audit history with top-tier accounting standards']
            },
            {
                questionId: '1.4',
                questionText: 'Does the organization possess a coherent long-term sustainability vision beyond grant reliance?',
                trackAware: false,
                resolvedDescription: 'Evaluate diversification of funding, revenue models, government co-funding, and donor retention.',
                ladder: ['1  100% dependent on short-term single grants', '2  Limited funding diversity with high vulnerability', '3  Moderate donor diversification and basic sustainability vision', '4  Strong multi-channel funding model with high donor retention', '5  Highly sustainable with robust multi-year partnerships and diverse revenue streams']
            }
        ]
    },
    {
        categoryNumber: 2,
        title: 'Operational Maturity',
        lede: 'Evaluate the operational depth, field delivery mechanics, standardized processes, and distinctiveness.',
        sequence: 2,
        questions: [
            {
                questionId: '2.1',
                questionText: 'How mature and standardized are the organization\'s operating processes and curriculum/delivery models?',
                trackAware: true,
                resolvedDescription: 'Evaluate standard operating procedures, training modules, quality assurance, and operational guidelines.',
                ladder: ['1  Ad-hoc, undocumented processes', '2  Partially documented with uneven execution across centers', '3  Standardized operating procedures implemented in most locations', '4  Well-documented, rigorously tested delivery models with continuous improvement', '5  Gold-standard operating model, ISO/industry benchmarked and digitally enabled']
            },
            {
                questionId: '2.2',
                questionText: 'What is the distinctiveness and competitive advantage of the organization\'s intervention approach?',
                trackAware: true,
                resolvedDescription: 'Assess unique value proposition, employer partnerships, pedagogical innovation, or specialized support mechanics.',
                ladder: ['1  Generic model with no clear differentiation', '2  Minor differentiation with limited competitive advantage', '3  Demonstrated value proposition recognized by local stakeholders', '4  Distinctive model with proprietary methodology and high employer traction', '5  Pioneering, best-in-class innovation that sets new standards in the sector']
            },
            {
                questionId: '2.3',
                questionText: 'How robust is the organization\'s operational footprint, physical/digital delivery infrastructure, and field team capability?',
                trackAware: false,
                resolvedDescription: 'Review center infrastructure, trainer-to-trainee ratios, tech platform adoption, and field staffing.',
                ladder: ['1  Inadequate infrastructure, under-resourced field staff', '2  Basic facilities with noticeable constraints', '3  Adequate infrastructure meeting standard delivery needs', '4  High-quality infrastructure with well-trained, competent field personnel', '5  State-of-the-art hybrid infrastructure with exceptional field capacity and high digital enablement']
            }
        ]
    },
    {
        categoryNumber: 3,
        title: 'Outcome Track Record',
        lede: 'Assess past execution track record, verified placement/creation scale, retention rates, and unit economics.',
        sequence: 3,
        questions: [
            {
                questionId: '3.1',
                questionText: 'What is the historical track record of candidate placement or enterprise creation over the last 2–3 fiscal years?',
                trackAware: true,
                resolvedDescription: 'Examine verified placement/enterprise numbers against targets across recent years.',
                ladder: ['1  Track record < 50% of stated targets or unverified', '2  Moderate delivery with significant target shortfalls (50–70%)', '3  Consistent delivery meeting 70–85% of stated targets', '4  Strong delivery achieving 85–100% of targets with verified proof', '5  Outstanding track record exceeding targets (>100%) with robust third-party verification']
            },
            {
                questionId: '3.2',
                questionText: 'What is the verified retention or survival rate at 3/6 months post-placement or venture launch?',
                trackAware: true,
                resolvedDescription: 'Evaluate post-placement retention tracking (offer letters, salary slips, provident fund records) or enterprise survival.',
                ladder: ['1  Retention rate < 40% or not tracked', '2  Retention rate 40–55% with informal tracking', '3  Retention rate 55–70% backed by basic documentation', '4  Retention rate 70–85% systematically tracked and verified', '5  Exceptional retention rate >85% with comprehensive longitudinal documentation']
            },
            {
                questionId: '3.3',
                questionText: 'Are the unit economics and cost per placement/creation benchmarked efficiently relative to sector norms?',
                trackAware: true,
                resolvedDescription: 'Analyze cost per beneficiary, cost per placement, and budgetary efficiency relative to geographic norms.',
                ladder: ['1  Significantly inflated unit cost without justification', '2  Higher than average unit costs with limited efficiency', '3  Unit cost within reasonable sector benchmarks', '4  Highly cost-effective model with strong unit economics', '5  Industry benchmark in efficiency and high return on grant capital']
            },
            {
                questionId: '3.4',
                questionText: 'What depth of empirical validation evidence (offer letters, salary slips, PF records) is provided?',
                trackAware: false,
                resolvedDescription: 'Review documentation rigor supporting reported outcomes.',
                ladder: ['1  No documentary evidence provided', '2  Self-reported spreadsheets without primary proofs', '3  Sample proof of documentation (10–25% verified)', '4  Comprehensive documentation provided for majority of cohort (>60%)', '5  100% auditable proof including salary credits, bank statements, or official PF data']
            }
        ]
    },
    {
        categoryNumber: 4,
        title: 'Alignment with WCF Priorities',
        lede: 'Examine alignment with WCF mandate, geographic clusters, marginalized group inclusion, and technology readiness.',
        sequence: 4,
        questions: [
            {
                questionId: '4.1',
                questionText: 'How tightly does the proposed program align with WCF\'s core mandate of wage employment and sustainable livelihoods?',
                trackAware: false,
                resolvedDescription: 'Check whether program objectives directly advance formal wage jobs, high-growth employment, or sustainable income enhancement.',
                ladder: ['1  Misaligned with core WCF grant objectives', '2  Peripheral alignment with indirect outcome link', '3  Direct alignment with standard WCF outcome expectations', '4  Strong, tightly integrated alignment across all target outcomes', '5  Perfect alignment serving as an ideal flagship model for WCF priorities']
            },
            {
                questionId: '4.2',
                questionText: 'Does the program target priority geographic regions, underserved clusters, or marginalized beneficiary groups?',
                trackAware: false,
                resolvedDescription: 'Review focus on Tier 2/3 cities, aspirational districts, women, PwD, and economically disadvantaged youth.',
                ladder: ['1  No specific focus on underserved groups or priority areas', '2  Marginal representation of vulnerable populations (<20%)', '3  Adequate representation in line with standard demographics (20–40%)', '4  High representation (>50%) of marginalized groups / Tier 2/3 clusters', '5  Deep focus on most vulnerable segments (>75%) in high-priority underserved clusters']
            },
            {
                questionId: '4.3',
                questionText: 'How prepared is the applicant to adopt and integrate WCF digital tools (e.g. Genie AI, digital LMS, tracking portals)?',
                trackAware: false,
                resolvedDescription: 'Assess tech appetite, existing digital systems, staff digital literacy, and readiness for AI/portal integration.',
                ladder: ['1  Resistant to tech adoption, purely manual operations', '2  Low tech capability with high friction to system integration', '3  Standard tech infrastructure, willing and capable of tool adoption', '4  Strong digital adoption with eager leadership and tech-savvy staff', '5  Advanced digital ecosystem, fully ready for seamless AI and platform integration']
            }
        ]
    },
    {
        categoryNumber: 5,
        title: 'Absorptive Capacity',
        lede: 'Assess financial health, realistic growth velocity, operational scaling feasibility, and risk mitigation.',
        sequence: 5,
        questions: [
            {
                questionId: '5.1',
                questionText: 'Is the organization financially resilient with healthy operating reserves and manageable liabilities?',
                trackAware: false,
                resolvedDescription: 'Examine reserve months, debt-to-asset ratio, annual revenue stability, and co-funding commitments.',
                ladder: ['1  High financial distress, severe working capital deficit', '2  Low reserves (< 2 months) and high funding volatility', '3  Healthy operating reserves (3–6 months) and balanced liabilities', '4  Strong financial position with 6–12 months operating runway', '5  Extremely sound financial footing with substantial reserves and diversified cashflows']
            },
            {
                questionId: '5.2',
                questionText: 'Is the proposed incremental scale realistic relative to the organization\'s historical growth trajectory?',
                trackAware: false,
                resolvedDescription: 'Assess requested grant volume and beneficiary increment (e.g. < 2x historical capacity vs 5x unrealistic surge).',
                ladder: ['1  Unrealistic surge (>5x historical capacity) without infrastructure', '2  Aggressive targets with high risk of operational bottlenecks', '3  Realistic scale (1.5x–2x) within feasible expansion capacity', '4  Well-calibrated, phased expansion plan with clear milestone markers', '5  Prudently paced expansion with pre-existing ready capacity and proven scale mechanics']
            },
            {
                questionId: '5.3',
                questionText: 'Does the organization have the management infrastructure to absorb and deploy the requested budget effectively?',
                trackAware: false,
                resolvedDescription: 'Review project management capacity, finance team size, HR recruitment speed, and monitoring resources.',
                ladder: ['1  Severe management deficit, inability to manage grant budget', '2  Constrained management bandwidth requiring significant external support', '3  Adequate team and systems to handle proposed grant size', '4  Robust project management office with dedicated program managers', '5  Enterprise-grade grant management capacity and proven multi-crore execution systems']
            }
        ]
    },
    {
        categoryNumber: 6,
        title: 'Measurement Readiness',
        lede: 'Review monitoring and evaluation (M&E) systems, data integrity protocols, external audit readiness, and longitudinal tracking.',
        sequence: 6,
        questions: [
            {
                questionId: '6.1',
                questionText: 'How robust, digitized, and audit-ready are the organization\'s internal M&E data collection systems?',
                trackAware: false,
                resolvedDescription: 'Evaluate MIS software, real-time attendance, digital beneficiary tracking, and verification workflows.',
                ladder: ['1  No dedicated M&E system, manual error-prone records', '2  Basic spreadsheets with periodic manual checks', '3  Functional MIS with standard data validation checks', '4  Advanced digital M&E system with real-time dashboards and audit trails', '5  Cutting-edge automated M&E system with API integration and tamper-proof verification']
            },
            {
                questionId: '6.2',
                questionText: 'Has the organization successfully undergone external impact evaluations or third-party verification audits?',
                trackAware: false,
                resolvedDescription: 'Check past evaluations by external agencies, government monitoring reports, or independent reviews.',
                ladder: ['1  No external evaluation or audit experience', '2  Informal donor feedback without rigorous external study', '3  At least one third-party evaluation with positive findings', '4  Multiple rigorous independent evaluations confirming high outcome fidelity', '5  Routinely audited by leading global/national evaluation bodies with stellar findings']
            },
            {
                questionId: '6.3',
                questionText: 'Is there an established process for longitudinal tracking of beneficiary career progression and income growth?',
                trackAware: false,
                resolvedDescription: 'Assess mechanism to track candidates at 6, 12, and 24 months post-program.',
                ladder: ['1  No post-program tracking mechanism', '2  Informal, sporadic contact with alumni', '3  Standard 6-month tracking protocol with reasonable response rates', '4  Systematic 12-month longitudinal tracking with verified wage progression data', '5  Comprehensive multi-year alumni tracking ecosystem with strong community engagement']
            }
        ]
    },
    {
        categoryNumber: 7,
        title: 'Use of WCF Funds & Support Model',
        lede: 'Evaluate budget line-item justification, capital allocation efficiency, non-financial support needs, and co-funding leverage.',
        sequence: 7,
        questions: [
            {
                questionId: '7.1',
                questionText: 'How credible, justified, and transparent is the itemized budget allocation for the requested WCF funds?',
                trackAware: false,
                resolvedDescription: 'Review direct vs indirect cost ratio, salary benchmarks, capital expenditure, and compliance with WCF cost caps.',
                ladder: ['1  Vague, unjustified budget lines with excessive administrative overhead', '2  High overheads or unconvincing line items requiring major revisions', '3  Reasonable budget allocation with standard overheads (<15%)', '4  Highly transparent, value-optimized budget with strong direct cost orientation', '5  Meticulously costed budget with maximum direct beneficiary impact and zero waste']
            },
            {
                questionId: '7.2',
                questionText: 'How effectively will the organization leverage WCF\'s non-financial support (mentorship, tech, networks) and co-funding?',
                trackAware: false,
                resolvedDescription: 'Assess clear strategy to utilize WCF strategic inputs, employer connects, and catalytic co-investor funding.',
                ladder: ['1  Interest only in financial grant, indifferent to advisory/network support', '2  Limited plan to leverage non-financial support', '3  Clear understanding and receptivity to WCF advisory and network inputs', '4  Proactive strategy to leverage WCF ecosystem, tech tools, and co-funders', '5  Strategic partnership vision maximizing catalytic multiplier effects and co-investment']
            }
        ]
    }
];

export default class WcfProposalReviewForm extends NavigationMixin(LightningElement) {

    logoUrl = WIN_LOGO;

    @track recordId;
    @track _applicationId = null;
    @track showForm        = false;
    @track submitted       = false;
    @track _resolvedRecordTypeId = null;
    @track institutionName      = '';
    @track applicationName      = '';
    @track outcomeDeveloperName = OUTCOME_BOTH;
    @track outcomeDisplayLabel  = '';

    @track isLoadingMetadata = false;
    @track categories = FALLBACK_CATEGORIES;
    @track openLadders = {};

    @track currentStep     = 0;
    @track rubricOpen      = false;
    @track validationError = '';

    @track saveStateText  = 'Auto-saved · just now';
    @track saveStateClass = 'save-idle';
    _saveTimer = null;

    @track ratings  = {};
    @track comments = {};

    @track strengths  = ['', '', ''];
    @track weaknesses = ['', '', ''];

    @track recChoice   = null;
    @track recStrength = null;
    @track _incomingTrack = null;

    @track uploadedFiles = [];

    @track rejectionReasons = [];
    @track rejectionReasonOptions = [];

    @wire(getRejectionReasonOptions)
    wiredRejectionReasons({ data, error }) {
        if (data) {
            this.rejectionReasonOptions = data;
        } else if (error) {
            console.error('Error loading rejection reason picklist:', error);
        }
    }

    get acceptedFormats() {
        return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                '.txt', '.csv', '.png', '.jpg', '.jpeg'];
    }

    get reviewRecordId() {
        return this.reviewData.Id || null;
    }

    @track reviewData = {
        ApplicationId: '',
        Id: null,
        Recommendation_Strength_Comments__c: '',
        Recommend_for_CEO_review__c: '',
        Strength_of_recommendation__c: '',
        Rejection_Reasons__c: '',
        Rejection_Comment__c: '',
        Top_3_proposal_strengths_ranked__c: '',
        Top_3_proposal_weaknesses_ranked__c: '',
        Decision_Rationale__c: ''
    };

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            const rawRecordId    = currentPageReference.state.recordId;
            this._applicationId  = currentPageReference.state.applicationId || rawRecordId;
            this._incomingTrack  = currentPageReference.state.track || null;

            this.recordId = (rawRecordId === 'new') ? null : rawRecordId;
            this.reviewData = { ...this.reviewData, ApplicationId: this._applicationId };

            this.checkIfAlreadyReviewed();
            this.fetchIndividualApplication();
        }
    }

    connectedCallback() {
        this.loadFormMetadata();
    }

    loadFormMetadata() {
        const trackParam = this._incomingTrack || this.outcomeDisplayLabel || null;
        getReviewerFormV5Metadata({ trackName: trackParam })
            .then(res => {
                if (res && res.success && res.categories && res.categories.length > 0) {
                    this.categories = res.categories;
                }
                this.isLoadingMetadata = false;
            })
            .catch(err => {
                console.error('Error loading reviewer form metadata (using fallback):', err);
                this.isLoadingMetadata = false;
            });
    }

    checkIfAlreadyReviewed() {
        if (!this._applicationId) return;
        hasAlreadyReviewed({ applicationId: this._applicationId })
            .then(result => {
                if (result) {
                    this.showForm  = false;
                    this.submitted = true;
                } else {
                    this.showForm = true;
                    this.loadDraftReview();
                }
            })
            .catch(error => console.error('Error checking review status:', error));
    }

    fetchIndividualApplication() {
        if (!this._applicationId) return;
        getIndividualApplication({ recordId: this._applicationId })
            .then(result => {
                if (result) {
                    this.institutionName      = result.institutionName || '';
                    this.applicationName      = result.applicationName || '';
                    this.outcomeDeveloperName = result.track || OUTCOME_BOTH;
                    this.outcomeDisplayLabel  = result.trackLabel || result.orgArea || '';
                    this._resolvedRecordTypeId = result.recordTypeId || null;

                    // Reload metadata if track is now known
                    this.loadFormMetadata();
                }
            })
            .catch(error => console.error('Error fetching application:', error));
    }

    loadDraftReview() {
        getDraftReviewRecord({ applicationId: this._applicationId })
            .then(review => {
                if (!review) return;

                // Restore ratings and comments from physical fields
                Object.keys(QUESTION_FIELD_MAP).forEach(qId => {
                    const fields = QUESTION_FIELD_MAP[qId];
                    if (review[fields.rating] != null) {
                        this.ratings = { ...this.ratings, [qId]: parseInt(review[fields.rating], 10) };
                    }
                    if (review[fields.comment]) {
                        this.comments = { ...this.comments, [qId]: review[fields.comment] };
                    }
                });

                // Also check if structured JSON answers exist in Decision_Rationale__c
                if (review.Decision_Rationale__c) {
                    try {
                        const parsed = JSON.parse(review.Decision_Rationale__c);
                        if (Array.isArray(parsed)) {
                            parsed.forEach(item => {
                                if (item.questionId && item.rating != null) {
                                    this.ratings = { ...this.ratings, [item.questionId]: parseInt(item.rating, 10) };
                                }
                                if (item.questionId && item.comment) {
                                    this.comments = { ...this.comments, [item.questionId]: item.comment };
                                }
                            });
                        }
                    } catch (e) {
                        // ignore JSON parse error
                    }
                }

                this.strengths  = this._parseSW(review.Top_3_proposal_strengths_ranked__c);
                this.weaknesses = this._parseSW(review.Top_3_proposal_weaknesses_ranked__c);

                if (review.Recommend_for_CEO_review__c === 'Yes') {
                    this.recChoice = REC_RECOMMEND;
                } else if (review.Recommend_for_CEO_review__c === 'No') {
                    this.recChoice = REC_DO_NOT;
                } else {
                    this.recChoice = null;
                }

                this.recStrength = review.Strength_of_recommendation__c
                                ? parseInt(review.Strength_of_recommendation__c, 10)
                                : null;

                this.rejectionReasons = (review.Rejection_Reasons__c || '')
                    .split(';')
                    .map(v => v.trim())
                    .filter(v => v);

                this.reviewData = { ...this.reviewData, ...review };

                if (review.Id) {
                    getAttachedFiles({ reviewRecordId: review.Id })
                        .then(files => {
                            this.uploadedFiles = files.map(f => ({
                                documentId: f.documentId,
                                name:       f.name
                            }));
                        })
                        .catch(err => console.error('Error loading attached files:', err));
                }
            })
            .catch(error => console.error('Error loading draft:', error));
    }

    _parseSW(val) {
        const parts = (val || '').split('\n');
        return [parts[0] || '', parts[1] || '', parts[2] || ''];
    }

    get totalCategoryCount() {
        return (this.categories && this.categories.length > 0) ? this.categories.length : 7;
    }

    get totalStepsDisplay() {
        // 7 Categories + Strengths/Weaknesses + Recommendation + Review = 10 steps
        return this.totalCategoryCount + 3;
    }

    get stepTitles() {
        const titles = (this.categories || []).map(c => `Category ${c.categoryNumber}: ${c.title}`);
        titles.push('Strengths & Weaknesses');
        titles.push('Final Recommendation');
        titles.push('Review & Submit');
        return titles;
    }

    get currentStepTitle() {
        const titles = this.stepTitles;
        return titles[this.currentStep] || '';
    }

    get hasOutcomeType() { return !!this.outcomeDisplayLabel; }
    get currentStepDisplay() { return this.currentStep + 1; }

    get isDimStep() {
        const numCats = this.totalCategoryCount;
        return this.currentStep >= 0 && this.currentStep < numCats;
    }

    get isSwStep() {
        const numCats = this.totalCategoryCount;
        return this.currentStep === numCats;
    }

    get isRecStep() {
        const numCats = this.totalCategoryCount;
        return this.currentStep === numCats + 1;
    }

    get isReviewStep() {
        const numCats = this.totalCategoryCount;
        return this.currentStep === numCats + 2;
    }

    get isPrevDisabled() { return this.currentStep === 0; }
    get nextBtnLabel() { return this.isReviewStep ? 'Submit Review' : 'Next Category →'; }
    get nextBtnClass() { return this.isReviewStep ? 'btn btn-submit' : 'btn btn-primary'; }

    get progressDots() {
        const total = this.totalStepsDisplay;
        const titles = this.stepTitles;
        return Array.from({ length: total }, (_, i) => ({
            idx:   i,
            cls:   i < this.currentStep ? 'done' : i === this.currentStep ? 'curr' : '',
            title: titles[i] || `Step ${i + 1}`
        }));
    }

    get currentDim() {
        if (!this.isDimStep || !this.categories || !this.categories[this.currentStep]) {
            return null;
        }
        const cat = this.categories[this.currentStep];
        const LVLS = ['Very strong', 'Strong', 'Adequate', 'Weak', 'Very weak'];
        const NS   = [5, 4, 3, 2, 1];
        const CLS  = ['col col-l5', 'col col-l4', 'col col-l3', 'col col-l2', 'col col-l1'];
        const TEXTS = [
            'Level 5: Exceptional, verified standard across all sub-criteria with robust multi-year evidence.',
            'Level 4: Strong capability meeting benchmarks with verifiable documentation.',
            'Level 3: Adequate baseline meeting minimum operational standards with minor gaps.',
            'Level 2: Weak capability, notable omissions, or inconsistent track record.',
            'Level 1: Very weak, unverified claims, or serious institutional/operational deficiencies.'
        ];

        return {
            ...cat,
            questionCount: cat.questions ? cat.questions.length : 0,
            rubricCols: NS.map((n, i) => ({
                n, label: LVLS[i], cls: CLS[i], text: TEXTS[i]
            }))
        };
    }

    get rubricBtnClass() { return this.rubricOpen ? 'btn-soft btn-soft-open' : 'btn-soft'; }
    get rubricBtnLabel() { return this.rubricOpen ? 'Hide scoring philosophy' : 'View scoring philosophy'; }
    get rubricClass()    { return this.rubricOpen ? 'rubric-panel' : 'rubric-panel rubric-hidden'; }

    get currentQuestions() {
        if (!this.isDimStep || !this.categories || !this.categories[this.currentStep]) {
            return [];
        }
        const cat = this.categories[this.currentStep];
        const qs  = cat.questions || [];

        return qs.map(q => {
            const qId = q.questionId;
            const r = this.ratings[qId];
            const cmtRequired = r != null;
            const isComplete = r != null && (!cmtRequired || (this.comments[qId] || '').trim().length > 0);

            // Ladder map
            const ladderArr = q.ladder || [];
            const ladderItems = [
                { level: 5, text: ladderArr[4] || 'Level 5: Very strong' },
                { level: 4, text: ladderArr[3] || 'Level 4: Strong' },
                { level: 3, text: ladderArr[2] || 'Level 3: Adequate' },
                { level: 2, text: ladderArr[1] || 'Level 2: Weak' },
                { level: 1, text: ladderArr[0] || 'Level 1: Very weak' }
            ];

            const selectedLadderText = r != null && ladderArr[r - 1] ? ladderArr[r - 1] : '';
            const showLadder = !!this.openLadders[qId];

            // Word count
            const wc = countWords(this.comments[qId]);
            const atLimit   = wc >= MAX_WORDS;
            const nearLimit = wc >= MAX_WORDS - 20;
            const wordCountDisplay = `${wc} / ${MAX_WORDS}`;
            const wordCountClass = atLimit ? 'wc-counter wc-limit' : nearLimit ? 'wc-counter wc-near' : 'wc-counter';
            const commentTextareaClass = cmtRequired ? 'lwc-textarea lwc-textarea-req' : 'lwc-textarea';

            return {
                ...q,
                cardClass: `subq${isComplete ? ' subq-complete' : ''}`,
                selectedRating: r,
                selectedLadderText,
                showLadder,
                ladderToggleLabel: showLadder ? '▾ Hide 5-Point Ladder Details' : '▸ View 5-Point Ladder Details',
                ladderItems,
                ratingBtns: [5, 4, 3, 2, 1].map(n => {
                    const sel = r === n;
                    let cls = '';
                    if (sel) {
                        if (n === 2) cls = 'seg-sel-poor';
                        else if (n === 1) cls = 'seg-sel-vpoor';
                        else cls = 'seg-sel';
                    }
                    const anchorText = ladderArr[n - 1] || RATING_LABEL[n];
                    return { n, label: RATING_LABEL[n], ladderAnchor: anchorText, cls };
                }),
                commentClass: `comment${cmtRequired ? ' comment-req-now' : ''}`,
                commentRequired: cmtRequired,
                commentHelp: cmtRequired ? 'Comment required for this rating' : 'Rate first to add justification',
                commentValue: this.comments[qId] || '',
                commentPlaceholder: cmtRequired ? 'Required: explain the basis for this rating…' : 'Add context if helpful…',
                commentTextareaClass,
                wordCountDisplay,
                wordCountClass
            };
        });
    }

    handleToggleQuestionLadder(event) {
        const qId = event.currentTarget.dataset.qid;
        this.openLadders = { ...this.openLadders, [qId]: !this.openLadders[qId] };
    }

    get strengthRows() {
        return [0, 1, 2].map(i => ({
            idx: i, num: i + 1,
            strengthField: `strength_${i}`,
            strengthValue: this.strengths[i] || '',
            sPlaceholder: i === 0 ? 'Primary strength (most material)…' : `Strength #${i + 1}…`,
            reqMark: i === 0 ? '*' : ''
        }));
    }

    get weaknessRows() {
        return [0, 1, 2].map(i => ({
            idx: i, num: i + 1,
            weaknessField: `weakness_${i}`,
            weaknessValue: this.weaknesses[i] || '',
            wPlaceholder: i === 0 ? 'Primary concern or weakness (most material)…' : `Weakness #${i + 1}…`,
            reqMark: i === 0 ? '*' : ''
        }));
    }

    get isRecPositive() { return POSITIVE_REC_CHOICES.has(this.recChoice); }
    get isRecNegative() { return this.recChoice === REC_DO_NOT; }
    get isRecChosen()   { return this.recChoice !== null; }

    get recOptions() {
        return [
            { value: REC_STRONGLY, label: 'Strongly Recommend', desc: 'Outstanding proposal, top-tier institutional capacity, highly verified outcomes' },
            { value: REC_RECOMMEND, label: 'Recommend', desc: 'Solid proposal meeting all evaluation criteria with manageable risks' },
            { value: REC_RESERVE, label: 'Recommend with Reservations', desc: 'Recommend funding subject to specific conditions or closer milestone monitoring' },
            { value: REC_DO_NOT, label: 'Do Not Recommend', desc: 'Significant deficiencies, mandate misalignment, or critical operational concerns' }
        ].map(opt => ({
            ...opt,
            cls: this.recChoice === opt.value ? 'rec-card rec-card-selected' : 'rec-card'
        }));
    }

    get strengthRatingBtns() {
        return [5, 4, 3, 2, 1].map(n => ({
            n,
            label: RATING_LABEL[n],
            cls: this.recStrength === n ? 'seg-sel' : ''
        }));
    }

    get dimensionSummary() {
        return (this.categories || []).map(cat => {
            const qs = cat.questions || [];
            const vals = qs.map(q => this.ratings[q.questionId]).filter(v => v != null);
            const mean = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : '—';
            return {
                id: cat.categoryNumber,
                title: cat.title,
                mean,
                questions: qs.map(q => {
                    const r = this.ratings[q.questionId];
                    const ladderArr = q.ladder || [];
                    const ladderText = r != null && ladderArr[r - 1] ? ladderArr[r - 1] : '';
                    return {
                        id: q.questionId,
                        text: q.questionText,
                        rating: r != null ? r : '—',
                        ratingLabel: r != null ? (RATING_LABEL[r] || r) : 'Not rated',
                        ladderText,
                        comment: this.comments[q.questionId] || null,
                        pipClass: r != null ? `pip pip-r${r}` : 'pip pip-empty'
                    };
                })
            };
        });
    }

    get overallScoreDisplay() {
        const validMeans = this.dimensionSummary
            .map(d => parseFloat(d.mean))
            .filter(v => !isNaN(v));
        if (!validMeans.length) return '—';
        return (validMeans.reduce((s, v) => s + v, 0) / validMeans.length).toFixed(2);
    }

    get isAllCompleted() {
        const allQuestions = (this.categories || []).flatMap(c => c.questions || []);
        const unrated = allQuestions.filter(q => this.ratings[q.questionId] == null);
        const uncommented = allQuestions.filter(q => {
            const r = this.ratings[q.questionId];
            return r != null && !(this.comments[q.questionId] || '').trim();
        });
        const hasS = (this.strengths[0] || '').trim().length > 0;
        const hasW = (this.weaknesses[0] || '').trim().length > 0;
        const hasRec = !!this.recChoice;
        return unrated.length === 0 && uncommented.length === 0 && hasS && hasW && hasRec;
    }

    get missingItemsList() {
        const list = [];
        (this.categories || []).forEach(c => {
            (c.questions || []).forEach(q => {
                if (this.ratings[q.questionId] == null) {
                    list.push(`Category ${c.categoryNumber} - Q${q.questionId}: Rating missing`);
                } else if (!(this.comments[q.questionId] || '').trim()) {
                    list.push(`Category ${c.categoryNumber} - Q${q.questionId}: Justification comment missing`);
                }
            });
        });
        if (!(this.strengths[0] || '').trim()) list.push('Top Strength #1 missing');
        if (!(this.weaknesses[0] || '').trim()) list.push('Top Weakness #1 missing');
        if (!this.recChoice) list.push('Final recommendation missing');
        return list;
    }

    toggleRubric() {
        this.rubricOpen = !this.rubricOpen;
    }

    handleRatingClick(event) {
        const qId = event.currentTarget.dataset.qid;
        const val = parseInt(event.currentTarget.dataset.val, 10);
        this.ratings = { ...this.ratings, [qId]: val };
        this.autoSave();
    }

    handleCommentInput(event) {
        const qId = event.target.dataset.qid;
        let text  = event.target.value;
        if (countWords(text) > MAX_WORDS) {
            text = truncateToWordLimit(text, MAX_WORDS);
            event.target.value = text;
        }
        this.comments = { ...this.comments, [qId]: text };
        this.autoSave();
    }

    handleCommentKeyDown(event) {
        if (ALWAYS_ALLOWED_KEYS.has(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        const text = event.target.value;
        const selStart = event.target.selectionStart;
        const selEnd   = event.target.selectionEnd;
        const hasSelection = selStart !== selEnd;
        if (!hasSelection && countWords(text) >= MAX_WORDS && (event.key === ' ' || event.key.length === 1)) {
            event.preventDefault();
        }
    }

    handleCommentPaste(event) {
        const pasted = (event.clipboardData || window.clipboardData).getData('text');
        const current = event.target.value;
        const selStart = event.target.selectionStart;
        const selEnd   = event.target.selectionEnd;
        const combined = current.slice(0, selStart) + pasted + current.slice(selEnd);
        if (countWords(combined) > MAX_WORDS) {
            event.preventDefault();
            const truncated = truncateToWordLimit(combined, MAX_WORDS);
            const qId = event.target.dataset.qid;
            event.target.value = truncated;
            this.comments = { ...this.comments, [qId]: truncated };
            this.autoSave();
        }
    }

    handleSwChange(event) {
        const kind = event.target.dataset.kind;
        const idx  = parseInt(event.target.dataset.idx, 10);
        let val    = event.target.value;
        if (countWords(val) > MAX_WORDS) {
            val = truncateToWordLimit(val, MAX_WORDS);
            event.target.value = val;
        }
        if (kind === 'strength') {
            const next = [...this.strengths];
            next[idx] = val;
            this.strengths = next;
        } else {
            const next = [...this.weaknesses];
            next[idx] = val;
            this.weaknesses = next;
        }
        this.autoSave();
    }

    handleRecCardClick(event) {
        this.recChoice = event.currentTarget.dataset.val;
        this.autoSave();
    }

    handleRecStrengthClick(event) {
        this.recStrength = parseInt(event.currentTarget.dataset.val, 10);
        this.autoSave();
    }

    handleRejectionReasonChange(event) {
        this.rejectionReasons = event.detail.value;
        this.autoSave();
    }

    handleProgressClick(event) {
        const targetStep = parseInt(event.currentTarget.dataset.idx, 10);
        if (targetStep <= this.currentStep) {
            this.currentStep = targetStep;
            this.validationError = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    handlePrev() {
        if (this.currentStep > 0) {
            this.currentStep -= 1;
            this.validationError = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    handleNext() {
        this.validationError = '';

        // Validate Category Step
        if (this.isDimStep) {
            const cat = this.categories[this.currentStep];
            const qs = cat.questions || [];
            for (let q of qs) {
                const r = this.ratings[q.questionId];
                if (r == null) {
                    this.validationError = `Please select a rating for question ${q.questionId}.`;
                    return;
                }
                const c = (this.comments[q.questionId] || '').trim();
                if (!c) {
                    this.validationError = `Please enter a justification comment for question ${q.questionId}.`;
                    return;
                }
            }
        }

        // Validate Strengths & Weaknesses Step
        if (this.isSwStep) {
            if (!(this.strengths[0] || '').trim()) {
                this.validationError = 'Please provide at least your #1 primary strength.';
                return;
            }
            if (!(this.weaknesses[0] || '').trim()) {
                this.validationError = 'Please provide at least your #1 primary weakness / concern.';
                return;
            }
        }

        // Validate Recommendation Step
        if (this.isRecStep) {
            if (!this.recChoice) {
                this.validationError = 'Please select a final recommendation decision.';
                return;
            }
        }

        if (this.isReviewStep) {
            this.handleSubmit();
            return;
        }

        this.currentStep += 1;
        this.rubricOpen = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    handleUploadFinished(event) {
        const files = event.detail.files;
        if (files && files.length > 0) {
            this.uploadedFiles = [
                ...this.uploadedFiles,
                ...files.map(f => ({ documentId: f.documentId, name: f.name }))
            ];
            this.showToast('Success', `${files.length} file(s) attached successfully`, 'success');
        }
    }

    handleDeleteFile(event) {
        const docId = event.target.dataset.id;
        deleteUploadedFile({ contentDocumentId: docId })
            .then(() => {
                this.uploadedFiles = this.uploadedFiles.filter(f => f.documentId !== docId);
                this.showToast('Success', 'File removed', 'success');
            })
            .catch(err => {
                console.error('Error deleting file:', err);
                this.showToast('Error', 'Failed to delete file', 'error');
            });
    }

    handleViewRfi() {
        if (!this._applicationId) return;
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__webPage',
            attributes: {
                url: `/reviewersite/s/rfi-application-form?recordId=${this._applicationId}&mode=preview`
            }
        }).then(url => {
            window.open(url, '_blank');
        });
    }

    // Build structured payload for saving
    buildReviewPayload(isFinalSubmit) {
        const payload = {
            ...this.reviewData,
            ApplicationId: this._applicationId,
            RecordTypeId:  this._resolvedRecordTypeId,
            Recommend_for_CEO_review__c: storedRecValue(this.recChoice),
            Strength_of_recommendation__c: this.recStrength ? String(this.recStrength) : null,
            Top_3_proposal_strengths_ranked__c: this.strengths.filter(s => s && s.trim()).join('\n'),
            Top_3_proposal_weaknesses_ranked__c: this.weaknesses.filter(w => w && w.trim()).join('\n'),
            Rejection_Reasons__c: this.rejectionReasons.join(';')
        };

        // Populate physical fields for standard reporting
        Object.keys(QUESTION_FIELD_MAP).forEach(qId => {
            const mapping = QUESTION_FIELD_MAP[qId];
            if (this.ratings[qId] != null) {
                payload[mapping.rating] = String(this.ratings[qId]);
            }
            if (this.comments[qId] != null) {
                payload[mapping.comment] = this.comments[qId];
            }
        });

        // Pack full structured answers in Decision_Rationale__c
        const structuredAnswers = [];
        (this.categories || []).forEach(cat => {
            (cat.questions || []).forEach(q => {
                const ladderArr = q.ladder || [];
                const r = this.ratings[q.questionId];
                structuredAnswers.push({
                    questionId: q.questionId,
                    categoryNumber: cat.categoryNumber,
                    categoryTitle: cat.title,
                    questionText: q.questionText,
                    rating: r != null ? r : null,
                    ladderLevelText: r != null && ladderArr[r - 1] ? ladderArr[r - 1] : '',
                    comment: this.comments[q.questionId] || ''
                });
            });
        });
        payload.Decision_Rationale__c = JSON.stringify(structuredAnswers);

        return payload;
    }

    autoSave() {
        if (!this._applicationId) return;
        this.saveStateText  = 'Saving…';
        this.saveStateClass = 'save-saving';

        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            const payload = this.buildReviewPayload(false);
            saveDraftReview({ reviewDataJson: JSON.stringify(payload) })
                .then(saved => {
                    if (saved && saved.Id) {
                        this.reviewData.Id = saved.Id;
                    }
                    this.saveStateText  = 'Auto-saved · just now';
                    this.saveStateClass = 'save-idle';
                })
                .catch(err => {
                    console.error('Draft auto-save error:', err);
                    this.saveStateText  = 'Save error';
                    this.saveStateClass = 'save-error';
                });
        }, 600);
    }

    handleSubmit() {
        if (!this.isAllCompleted) {
            this.validationError = 'Please complete all ratings, comments, strengths, weaknesses, and recommendation before submitting.';
            return;
        }

        const payload = this.buildReviewPayload(true);
        saveApplicationReview({ reviewDataJson: JSON.stringify(payload) })
            .then(res => {
                if (res && res.success) {
                    this.showToast('Success', 'Evaluation submitted successfully!', 'success');
                    this.showForm = false;
                    this.submitted = true;
                } else {
                    this.showToast('Error', res?.errorMessage || 'Failed to submit review.', 'error');
                }
            })
            .catch(err => {
                console.error('Submit error:', err);
                this.showToast('Error', err?.body?.message || 'An error occurred while submitting.', 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}