import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import saveApplicationReview from '@salesforce/apex/WCF_ReviewFormJFController.saveApplicationReview';
import getIndividualApplication from '@salesforce/apex/WCF_ReviewFormJFController.getIndividualApplication';
import hasAlreadyReviewed from '@salesforce/apex/WCF_ReviewFormJFController.hasAlreadyReviewed';
import getDraftReviewRecord from '@salesforce/apex/WCF_ReviewFormJFController.getDraftReviewRecord';
import saveDraftReview from '@salesforce/apex/WCF_ReviewFormJFController.saveDraftReview';
import deleteUploadedFile from '@salesforce/apex/WCF_ReviewFormJFController.deleteUploadedFile';
import getAttachedFiles from '@salesforce/apex/WCF_ReviewFormJFController.getAttachedFiles';
import getRejectionReasonOptions from '@salesforce/apex/WCF_ReviewFormJFController.getRejectionReasonOptions';


// FIX: rating anchors changed from Excellent/Good/Satisfactory/Poor/Very Poor
// to plain quality anchors — "Excellent" doesn't make sense for a rejected
// proposal, so these now read the same way in every context they're used
// (per-question ratings, rubric headers, and recommendation strength).
const RATING_LABEL = { 5: 'Very strong', 4: 'Strong', 3: 'Adequate', 2: 'Weak', 1: 'Very weak' };

const OUTCOME_JF   = 'WCF_Job_Fulfillment';
const OUTCOME_JC   = 'WCF_Job_Creation_Review';
const OUTCOME_BOTH = 'WCF_Job_Fulfillment_Job_Creation';

const TAG_ALL = 'all';
const TAG_JF  = 'jf';
const TAG_JC  = 'jc';

// ── Final Recommendation choices (Step 8) ─────────────────────────
// FIX: replaced the 2-button Yes/No with 4 recommendation levels.
// The 3 "positive" levels all show the same strength+comment fields;
// "Do Not Recommend" shows only rejection reason(s) + rejection comment
// (the reversed "how strongly against" question was removed — the
// non-recommend button itself plus the required comment/reasons already
// capture that).
const REC_STRONGLY   = 'Strongly Recommend';
const REC_RECOMMEND  = 'Recommend';
const REC_RESERVE    = 'Recommend with Reservations';
const REC_DO_NOT     = 'Do Not Recommend';
const POSITIVE_REC_CHOICES = new Set([REC_STRONGLY, REC_RECOMMEND, REC_RESERVE]);

// Recommend_for_CEO_review__c is a Yes/No picklist on the object — it only
// has those two values defined in Setup. The 4 UI buttons are a front-end
// refinement on top of that: the 3 positive buttons all write "Yes", and
// "Do Not Recommend" writes "No". recChoice (the detailed 4-way pick) is
// what drives which fields show and what the Step 9 summary displays;
// only the stored field value collapses to Yes/No.
function storedRecValue(choice) {
    if (POSITIVE_REC_CHOICES.has(choice)) return 'Yes';
    if (choice === REC_DO_NOT) return 'No';
    return '';
}

// ── Word count constants ──────────────────────────────────────────
// FIX: Changed from 500 to 200 words as per client requirement
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

// Keys that should always be permitted regardless of word count
const ALWAYS_ALLOWED_KEYS = new Set([
    'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
    'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab',
    'Enter'
]);


function questionsForOutcome(questions, outcomeDeveloperName) {
    return questions.filter(q => {
        if (q.tag === TAG_ALL) return true;
        if (outcomeDeveloperName === OUTCOME_JF)   return q.tag === TAG_JF;
        if (outcomeDeveloperName === OUTCOME_JC)   return q.tag === TAG_JC;
        if (outcomeDeveloperName === OUTCOME_BOTH) return q.tag === TAG_JF || q.tag === TAG_JC;
        return true;
    });
}

const DIMS = [
    {
        id: 1,
        title: 'Institutional Credibility',
        rubric: [
            'Mature, well-governed institution. Verifiable legal standing in a credible jurisdiction. Long-tenured leader with strong sectoral track record. Financial records are complete, consistent, and align with audits. Sustainability vision is clear, specific, and credible.',
            'Solid institution with no governance concerns. Leader is experienced and credible. Financials look clean with no consistency concerns. Sustainability vision is plausible.',
            'Adequate institutional standing. Leadership is credible but tenure or track record is light. Financials are present and internally consistent but light on detail. Sustainability vision is generic.',
            'Notable gaps. Concerns on governance, leadership credibility, or financial completeness. Vision is missing or unconvincing.',
            'Serious institutional concerns: opaque governance, leadership credibility issues, financial records that do not stand up to scrutiny, or no sustainability picture at all.'
        ],
        questions: [
            {
                id: '1.1', tag: TAG_ALL,
                ratingField:  'D1_Governance_Rating__c',
                commentField: 'D1_Governance_Comment__c',
                text: 'Are legal structure, registration, board, and operating governance well-formed and verifiable?',
                hint: 'Look for: registered legal status, named board, evidence of board meetings, signed audited accounts.'
            },
            {
                id: '1.2', tag: TAG_ALL,
                ratingField:  'D1_Leadership_Rating__c',
                commentField: 'D1_Leadership_Comment__c',
                text: 'Does named leadership have credible domain experience and tenure?',
                hint: 'Founder/CEO tenure, prior roles, evidence of sectoral fluency.'
            },
            {
                id: '1.3', tag: TAG_ALL,
                ratingField:  'D1_FinancialRecords_Rating__c',
                commentField: 'D1_FinancialRecords_Comment__c',
                text: 'How complete and credible are the submitted financial records?',
                hint: 'Audited statements for the last 3 years, internal consistency, alignment with narrative.'
            },
            {
                id: '1.4', tag: TAG_ALL,
                ratingField:  'D1_SustainabilityVision_Rating__c',
                commentField: 'D1_SustainabilityVision_Comment__c',
                text: 'How strong is the organisation\'s vision and plan for sustainability?',
                hint: 'Diversification of revenue, plausibility of post-grant continuity.'
            }
        ]
    },
    {
        id: 2,
        title: 'Operational Maturity',
        rubric: [
            'Crisp theory of change, multiple credible primary methods, clearly defensible differentiation, and consistent operational depth across all programmes presented. Innovation visible without losing rigour.',
            'Clear theory of change, credible methods, and distinctive elements that are recognisable. Depth varies a little across programmes but no concerns.',
            'Programme model is recognisable and works in principle, but distinctiveness is generic or claims of innovation are thin.',
            'Programme description is muddled or method choice is hard to defend. Distinctiveness claims do not survive scrutiny.',
            'No coherent programme model. Methods unclear or inappropriate to outcomes claimed. No defensible distinctive value.'
        ],
        questions: [
            {
                id: '2.1jf', tag: TAG_JF,
                ratingField:  'D2_ProgramAlignment_Rating__c',
                commentField: 'D2_ProgramAlignment_Comment__c',
                text: 'Is the theory of change clear and the primary methods well-described — training methodology, placement model, learner profile?',
                hint: 'Look for sequencing logic, employer relationships, evidence of method-to-outcome fit.'
            },
            {
                id: '2.1jc', tag: TAG_JC,
                ratingField:  'D2_JC_SupportModel_Rating__c',
                commentField: 'D2_JC_SupportModel_Comment__c',
                text: 'Is the support model coherent — sector intervention logic, Micro, Small and Medium Enterprise profile, support package design?',
                hint: 'Look for sector thesis, Micro, Small and Medium Enterprise selection criteria, depth of support per Micro, Small and Medium Enterprise.'
            },
            {
                id: '2.2jf', tag: TAG_JF,
                ratingField:  'D2_JF_Distinctiveness_Rating__c',
                commentField: 'D2_JF_Distinctiveness_Comment__c',
                text: 'How distinctive or innovative is the approach versus typical skilling NGOs?',
                hint: 'Differentiation that holds up to scrutiny, not generic "we are different" claims.'
            },
            {
                id: '2.2jc', tag: TAG_JC,
                ratingField:  'D2_JC_Distinctiveness_Rating__c',
                commentField: 'D2_JC_Distinctiveness_Comment__c',
                text: 'How distinctive or innovative is the approach versus typical Micro, Small and Medium Enterprise-support non-governmental organizations?',
                hint: 'Differentiation that holds up to scrutiny.'
            },
            {
                id: '2.3', tag: TAG_ALL,
                ratingField:  'D2_OperationalDepth_Rating__c',
                commentField: 'D2_OperationalDepth_Comment__c',
                text: 'Is operational depth consistent across the programmes presented?',
                hint: 'No major drop-off in rigour across geographies or programme variants.'
            }
        ]
    },
    {
        id: 3,
        title: 'Outcome Track Record',
        rubric: [
            'Strong, multi-year track record at meaningful scale. Healthy conversion / efficacy figures. Cost per beneficiary at or below benchmark with no concerns about quality of outcomes.',
            'Solid track record. Numbers stack up. Conversion or cost slightly off benchmark but well-explained or improving year on year.',
            'Track record is real but modest in scale. Conversion / efficacy is mixed; cost is in the right zone but with some concerns.',
            'Numbers raise questions: scale very small for the maturity claimed, conversion thin, or cost markedly above benchmark without convincing explanation.',
            'No credible track record on the dimension that matters. Numbers do not support the impact claim.'
        ],
        questions: [
            {
                id: '3.1jf', tag: TAG_JF,
                ratingField:  'D3_JF_ScaleRecord_Rating__c',
                commentField: 'D3_JF_ScaleRecord_Comment__c',
                text: 'Is the 3-year enrolment / placement record at meaningful scale?',
                hint: 'Reference benchmark: ~10K placements/year for orgs in Wadhwani Grants missing-middle band.'
            },
            {
                id: '3.1jc', tag: TAG_JC,
                ratingField:  'D3_JC_ScaleRecord_Rating__c',
                commentField: 'D3_JC_ScaleRecord_Comment__c',
                text: 'Is the 3-year businesses-created / jobs-created record at meaningful scale?',
                hint: 'Reference benchmark: ~5K new jobs/year for orgs in Wadhwani Grants missing-middle band.'
            },
            {
                id: '3.2jf', tag: TAG_JF,
                ratingField:  'D3_JF_ConversionRate_Rating__c',
                commentField: 'D3_JF_ConversionRate_Comment__c',
                text: 'Is the enrolment-to-placement conversion rate credible and well-attributed?',
                hint: 'Look for evidence of how placements are tracked, not just claimed.'
            },
            {
                id: '3.2jc', tag: TAG_JC,
                ratingField:  'D3_JC_ConversionRate_Rating__c',
                commentField: 'D3_JC_ConversionRate_Comment__c',
                text: 'Is the conversion of Micro, Small and Medium Enterprise support into actual job creation credible and well-attributed?',
                hint: 'How is "jobs created" measured — survey, tax records, employer reports?'
            },
            {
                id: '3.3jf', tag: TAG_JF,
                ratingField:  'D3_JF_CostPerPlacement_Rating__c',
                commentField: 'D3_JF_CostPerPlacement_Comment__c',
                text: 'Is cost per placement at or below the ~$30 / beneficiary benchmark?',
                hint: 'Wadhwani Grants benchmark for placements; outliers above benchmark need clear justification.'
            },
            {
                id: '3.3jc', tag: TAG_JC,
                ratingField:  'D3_JC_CostPerJob_Rating__c',
                commentField: 'D3_JC_CostPerJob_Comment__c',
                text: 'Is cost per job created at or below the ~$75 / beneficiary benchmark?',
                hint: 'Wadhwani Grants benchmark for job creation; outliers above benchmark need clear justification.'
            },
            {
                id: '3.4', tag: TAG_ALL,
                ratingField:  'D3_ValidationEvidence_Rating__c',
                commentField: 'D3_ValidationEvidence_Comment__c',
                text: 'How credible is the evidence of third-party validation and long-term outcomes?',
                hint: 'External evaluations, audits, longitudinal employment / business survival data.'
            }
        ]
    },
    {
        id: 4,
        title: 'Alignment with Wadhwani Grants Priorities',
        rubric: [
            'Direct, central alignment with the family-sustaining-jobs mandate. Geography is in \Wadhwani Grants priority clusters. Org size sits squarely in the missing-middle zone.',
            'Strong alignment with mandate and geography. Org sits inside the missing-middle window with no concerns.',
            'Alignment is real but partial — e.g., mandate fit is clear but geography is adjacent to priorities, or vice versa.',
            'Alignment is thin. Mandate fit is weak, geography is off, or org size sits well outside the missing-middle target zone.',
            'Misaligned. The programme is not advancing the Wadhwani Grants mandate in any material way.'
        ],
        questions: [
            {
                id: '4.1', tag: TAG_ALL,
                ratingField:  'D4_MandateFit_Rating__c',
                commentField: 'D4_MandateFit_Comment__c',
                text: 'Does the programme materially advance family-sustaining job outcomes (placements at sustainable wages OR jobs created in viable enterprises)?',
                hint: 'Wadhwani Grants core mandate — both outcome types must produce family-sustaining work.'
            },
            {
                id: '4.2', tag: TAG_ALL,
                ratingField:  'D4_Geography_Rating__c',
                commentField: 'D4_Geography_Comment__c',
                text: 'Does the geography sit in Wadhwani Grants priority clusters (India, LATAM, SE Asia)?',
                hint: 'India active; LATAM Brazil/Mexico priority; SE Asia Indonesia/Philippines priority.'
            },
            {
                id: '4.3', tag: TAG_ALL,
                ratingField:  'D4_GenieAI_Rating__c',
                commentField: 'D4_GenieAI_Comment__c',
                text: 'Does the org sit inside the missing-middle annual budget window ($500K–$5M)?',
                hint: 'Below this band, too early for Wadhwani Grants; above, typically institutional-donor scale.'
            }
        ]
    },
    {
        id: 5,
        title: 'Absorptive Capacity',
        rubric: [
            'Financially stable with resilient revenue mix. Grant size proposed is well-calibrated to org budget. Operating infrastructure clearly capable of absorbing a multi-year grant without strain.',
            'Stable financials. Grant size sits within an appropriate range. Operating capability is solid.',
            'Adequate stability. Grant size is workable but on the upper or lower edge of the absorption range. Some operating capability questions exist.',
            'Financials are thin or volatile. Grant size proposed is hard to absorb. Operating capability concerns.',
            'Cannot absorb a multi-year Wadhwani Grants credibly. Financial fragility or operating gaps make this unworkable in current form.'
        ],
        questions: [
            {
                id: '5.1', tag: TAG_ALL,
                ratingField:  'D5_FinancialStability_Rating__c',
                commentField: 'D5_FinancialStability_Comment__c',
                text: 'Is the 3-year financial trajectory stable, with reserves, predictable revenue, and managed concentration risk?',
                hint: 'Look for revenue diversity and reserves of 3+ months operating expenditure.'
            },
            {
                id: '5.2', tag: TAG_ALL,
                ratingField:  'D5_IncrementEstimate_Rating__c',
                commentField: 'D5_IncrementEstimate_Comment__c',
                text: 'Is a meaningful Wadhwani Grants credibly absorbable within 12 months without operational strain?',
                hint: 'Wadhwani Grants typically 10–30% of annual budget; outside this range, examine carefully.'
            },
            {
                id: '5.3', tag: TAG_ALL,
                ratingField:  'D5_OperatingInfra_Rating__c',
                commentField: 'D5_OperatingInfra_Comment__c',
                text: 'Is the operating infrastructure (HR, systems, governance) capable of delivering at the proposed scale?',
                hint: 'Headcount, technology, governance bandwidth.'
            }
        ]
    },
    {
        id: 6,
        title: 'Measurement Readiness',
        rubric: [
            'Mature Monitoring and Evaluation function with clear staffing and systems. Recent third-party verification covering meaningful sample. Active longitudinal tracking with usable historical data.',
            'Discernible Monitoring and Evaluation function. Some third-party verification or willingness to commission. Longitudinal tracking exists in part.',
            'Monitoring and Evaluation exists informally. Third-party verification is patchy. Longitudinal tracking is intent rather than practice.',
            'Limited Monitoring and Evaluation. No third-party verification of outcomes. No longitudinal tracking. The org would need real Monitoring and Evaluation uplift to support an outcome-linked grant.',
            'No meaningful Monitoring and Evaluation function. Cannot support outcome-linked grant structures without rebuilding measurement from the ground up.'
        ],
        questions: [
            {
                id: '6.1', tag: TAG_ALL,
                ratingField:  'D6_MEFunction_Rating__c',
                commentField: 'D6_MEFunction_Comment__c',
                text: 'Does the org have a discernible Monitoring and Evaluation function — people, systems, processes — or is measurement ad-hoc?',
                hint: 'Named Monitoring and Evaluation lead, dedicated tooling, written protocols.'
            },
            {
                id: '6.2', tag: TAG_ALL,
                ratingField:  'D6_ExternalVerification_Rating__c',
                commentField: 'D6_ExternalVerification_Comment__c',
                text: 'Has any external party verified outcomes? What was verified, when, and by whom?',
                hint: 'eSocial, e-Shram, third-party evaluators, academic partnerships.'
            },
            {
                id: '6.3', tag: TAG_ALL,
                ratingField:  'D6_LongitudinalTracking_Rating__c',
                commentField: 'D6_LongitudinalTracking_Comment__c',
                text: 'Are outcomes tracked longitudinally — is there usable historical data for cohort follow-up?',
                hint: '6, 12, 24-month follow-ups beyond placement / business creation.'
            }
        ]
    }
];

const STEP_TITLES = [
    'Institutional Credibility',
    'Operational Maturity',
    'Outcome Track Record',
    'Alignment with Wadhwani Grants Priorities',
    'Absorptive Capacity',
    'Measurement Readiness',
    'Strengths & Weaknesses',
    'Final Recommendation',
    'Review & Submit'
];

const STEPS = [
    { kind: 'dim', dimIdx: 0 },
    { kind: 'dim', dimIdx: 1 },
    { kind: 'dim', dimIdx: 2 },
    { kind: 'dim', dimIdx: 3 },
    { kind: 'dim', dimIdx: 4 },
    { kind: 'dim', dimIdx: 5 },
    { kind: 'sw' },
    { kind: 'rec' },
    { kind: 'review' }
];

const OUTCOME_LABEL_MAP = {
    [OUTCOME_JF]:   'Job Fulfilment Only',
    [OUTCOME_JC]:   'Job Creation Only',
    [OUTCOME_BOTH]: 'Both — Job Fulfilment + Job Creation'
};

export default class WcfProposalReviewerForm extends NavigationMixin(LightningElement) {

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

    // ── File upload tracking ─────────────────────────────────────
    @track uploadedFiles = [];

    // ── Rejection reasons (dynamic picklist) ──────────────────────
    @track rejectionReasons = []; // array of selected picklist API values
    @track rejectionReasonOptions = []; // [{ value, label }] fetched via wire

    @wire(getRejectionReasonOptions)
    wiredRejectionReasons({ data, error }) {
        if (data) {
            this.rejectionReasonOptions = data;
        } else if (error) {
            console.error('Error loading rejection reason picklist:', error);
        }
    }

    // Accepted file types for lightning-file-upload
    get acceptedFormats() {
        return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                '.txt', '.csv', '.png', '.jpg', '.jpeg'];
    }

    // The ApplicationReview record Id to attach files against.
    // Populated once a draft is first saved and an Id is returned.
    get reviewRecordId() {
        return this.reviewData.Id || null;
    }

    // ────────────────────────────────────────────────────────────

    @track reviewData = {
        ApplicationId: '',
        Id: null,
        Recommendation_Strength_Comments__c: '',
        Recommend_for_CEO_review__c: '',
        Strength_of_recommendation__c: '',
        Rejection_Reasons__c: '',
        Rejection_Comment__c: '',
        Top_3_proposal_strengths_ranked__c: '',
        Top_3_proposal_weaknesses_ranked__c: ''
    };

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            const rawRecordId    = currentPageReference.state.recordId;
            this._applicationId  = currentPageReference.state.applicationId || rawRecordId;
            this._incomingTrack  = currentPageReference.state.track || null;

            // 'new' = Start Review, no existing ApplicationReview record yet
            this.recordId = (rawRecordId === 'new') ? null : rawRecordId;

            this.reviewData = { ...this.reviewData, ApplicationId: this._applicationId };
            this.checkIfAlreadyReviewed();
            this.fetchIndividualApplication();
        }
    }

    /**
     * If a review has already been submitted for this application (e.g. the
     * reviewer refreshed the page, or came back to it later), show the exact
     * same "Evaluation submitted" success screen as right after a fresh
     * submit — just one consistent screen with a single Back to Dashboard
     * button, instead of a separate "already reviewed" page.
     */
    checkIfAlreadyReviewed() {
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
                    this.outcomeDisplayLabel  = OUTCOME_LABEL_MAP[this.outcomeDeveloperName]
                                                || result.trackLabel
                                                || '';
                     this._resolvedRecordTypeId = result.recordTypeId || recordTypeIdForOutcome(this.outcomeDeveloperName);
                }
            })
            .catch(error => console.error('Error fetching application:', error));
    }

    loadDraftReview() {
        getDraftReviewRecord({ applicationId: this._applicationId})
            .then(review => {
                if (!review) return;
                DIMS.forEach(dim => {
                    dim.questions.forEach(q => {
                        if (review[q.ratingField] != null) {
                            this.ratings = { ...this.ratings, [q.id]: parseInt(review[q.ratingField], 10) };
                        }
                        if (review[q.commentField]) {
                            this.comments = { ...this.comments, [q.id]: review[q.commentField] };
                        }
                    });
                });
                this.strengths  = this._parseSW(review.Top_3_proposal_strengths_ranked__c);
                this.weaknesses = this._parseSW(review.Top_3_proposal_weaknesses_ranked__c);
                // The stored field only ever holds Yes/No, so on reload we
                // can't recover which of the 3 positive buttons was picked —
                // default to the middle option "Recommend". The reviewer's
                // actual strength rating (recStrength, loaded below) is
                // preserved exactly either way.
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

                // Rejection reasons: multi-select picklist stored as ';'-joined string
                this.rejectionReasons = (review.Rejection_Reasons__c || '')
                    .split(';')
                    .map(v => v.trim())
                    .filter(v => v);

                this.reviewData = { ...this.reviewData, ...review };
                // Load already-attached files so the user sees them and can't re-upload duplicates
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

    get hasOutcomeType() { return !!this.outcomeDisplayLabel; }
    get currentStepDisplay() { return this.currentStep + 1; }
    get currentStepTitle()   { return STEP_TITLES[this.currentStep]; }
    get isDimStep()    { return STEPS[this.currentStep].kind === 'dim'; }
    get isSwStep()     { return STEPS[this.currentStep].kind === 'sw';  }
    get isRecStep()    { return STEPS[this.currentStep].kind === 'rec'; }
    get isReviewStep() { return STEPS[this.currentStep].kind === 'review'; }
    get isPrevDisabled() { return this.currentStep === 0; }
    get nextBtnLabel() { return this.currentStep === 8 ? 'Submit ' : 'Next step →'; }
    get nextBtnClass() { return this.currentStep === 8 ? 'btn btn-submit' : 'btn btn-primary'; }

    get progressDots() {
        return Array.from({ length: 9 }, (_, i) => ({
            idx:   i,
            cls:   i < this.currentStep ? 'done' : i === this.currentStep ? 'curr' : '',
            title: STEP_TITLES[i]
        }));
    }

    get currentDim() {
        const step = STEPS[this.currentStep];
        if (step.kind !== 'dim') return null;
        const dim  = DIMS[step.dimIdx];
        // FIX: rubric column headers now use the same plain anchors as the
        // rating scale itself (Very strong / Strong / Adequate / Weak / Very weak).
        const LVLS = ['Very strong', 'Strong', 'Adequate', 'Weak', 'Very weak'];
        const NS   = [5, 4, 3, 2, 1];
        const CLS  = ['col col-l5', 'col col-l4', 'col col-l3', 'col col-l2', 'col col-l1'];
        return {
            ...dim,
            questionCount: questionsForOutcome(dim.questions, this.outcomeDeveloperName).length,
            rubricCols: dim.rubric.map((text, i) => ({
                lvl: LVLS[i], n: NS[i], cls: CLS[i], text
            }))
        };
    }

    get rubricBtnClass() { return this.rubricOpen ? 'btn-soft btn-soft-open' : 'btn-soft'; }
    get rubricBtnLabel() { return this.rubricOpen ? 'Hide rating rubric' : 'View rating rubric'; }
    get rubricClass()    { return this.rubricOpen ? 'rubric-panel' : 'rubric-panel rubric-hidden'; }

    get currentQuestions() {
        const step = STEPS[this.currentStep];
        if (step.kind !== 'dim') return [];
        const dim = DIMS[step.dimIdx];
        const qs  = questionsForOutcome(dim.questions, this.outcomeDeveloperName);
        return qs.map(q => {
            const r           = this.ratings[q.id];
            const cmtRequired = r != null;
            const isComplete  = r != null && (!cmtRequired || (this.comments[q.id] || '').trim().length > 0);
            const showTag  = this.outcomeDeveloperName === OUTCOME_BOTH && q.tag !== TAG_ALL;
            const tagLabel = showTag ? (q.tag === TAG_JF ? 'Job Fulfilment' : 'Job Creation') : '';
            const tagClass = showTag ? `track-tag${q.tag === TAG_JF ? ' jf' : ' jc'}` : 'track-tag-hidden';

            // ── Word count ──
            const wc           = countWords(this.comments[q.id]);
            const atLimit      = wc >= MAX_WORDS;
            const nearLimit    = wc >= MAX_WORDS - 20;
            const wordCountDisplay = `${wc} / ${MAX_WORDS}`;
            const wordCountClass   = atLimit
                ? 'wc-counter wc-limit'
                : nearLimit
                    ? 'wc-counter wc-near'
                    : 'wc-counter';
            const commentTextareaClass = cmtRequired ? 'lwc-textarea lwc-textarea-req' : 'lwc-textarea';

            return {
                ...q,
                showTag, tagLabel, tagClass,
                cardClass: `subq${isComplete ? ' subq-complete' : ''}`,
                ratingBtns: [5, 4, 3, 2, 1].map(n => {
                    const sel = r === n;
                    let cls = '';
                    if (sel) {
                        if      (n === 2) cls = 'seg-sel-poor';
                        else if (n === 1) cls = 'seg-sel-vpoor';
                        else              cls = 'seg-sel';
                    }
                    return { n, label: RATING_LABEL[n], cls };
                }),
                commentClass:          `comment${cmtRequired ? ' comment-req-now' : ''}`,
                commentRequired:       cmtRequired,
                commentHelp:           cmtRequired ? 'Comment required for this rating' : 'Rate first to add a comment',
commentValue:          this.comments[q.id] || '',
commentPlaceholder:    cmtRequired
                        ? 'Required: explain the basis for this rating…'
                        : 'Add context if helpful…',
                commentTextareaClass,
                wordCountDisplay,
                wordCountClass
            };
        });
    }

    get strengthRows() {
        return [0, 1, 2].map(i => ({
            idx: i, num: i + 1,
            strengthField: `strength_${i}`,
            strengthValue: this.strengths[i],
            sPlaceholder:  i === 0 ? 'Required — most material strength…' : 'Optional…',
            reqMark:       i === 0 ? '*' : ''
        }));
    }

    get weaknessRows() {
        return [0, 1, 2].map(i => ({
            idx: i, num: i + 1,
            weaknessField: `weakness_${i}`,
            weaknessValue: this.weaknesses[i],
            wPlaceholder:  i === 0 ? 'Required — most material concern…' : 'Optional…',
            reqMark:       i === 0 ? '*' : ''
        }));
    }

    // ── Recommendation choice getters (Step 8) ────────────────────
    get showCeoRecommendationYes() { return POSITIVE_REC_CHOICES.has(this.recChoice); }
    get showCeoRecommendationNo()  { return this.recChoice === REC_DO_NOT; }
    get hasRecChoice()             { return this.recChoice != null;   }

    get recStronglyRecommendClass() { return this.recChoice === REC_STRONGLY ? 'yesno-yes-sel' : ''; }
    get recRecommendClass()         { return this.recChoice === REC_RECOMMEND ? 'yesno-yes-sel' : ''; }
    get recReservationsClass()      { return this.recChoice === REC_RESERVE  ? 'yesno-yes-sel' : ''; }
    get recDoNotRecommendClass()    { return this.recChoice === REC_DO_NOT   ? 'yesno-no-sel'  : ''; }

    get recStrengthBtns() {
        return [5, 4, 3, 2, 1].map(n => ({
            n, label: RATING_LABEL[n],
            yesSelCls: this.recStrength === n ? 'seg-sel-yes' : ''
        }));
    }

    get recStrengthLabel() { return this.recStrength ? RATING_LABEL[this.recStrength] : null; }

    // Step 9 summary shows the detailed 4-way choice (e.g. "Recommend with
    // Reservations"), not the raw Yes/No that gets saved to the field.
    get recChoiceDisplayLabel() { return this.recChoice || ''; }

    get recValueClass() {
        if (this.recChoice === REC_DO_NOT) return 'recvalue-no';
        return this.recChoice ? 'recvalue-yes' : '';
    }
    get recValueIcon() {
        if (this.recChoice === REC_DO_NOT) return '✕';
        return this.recChoice ? '✓' : '';
    }

    // ── Word count getters for Step 8 recommendation comment field ──
    get recYesWordCountDisplay() {
        const wc = countWords(this.reviewData.Recommendation_Strength_Comments__c);
        return `${wc} / ${MAX_WORDS}`;
    }
    get recYesWordCountClass() {
        const wc = countWords(this.reviewData.Recommendation_Strength_Comments__c);
        return wc >= MAX_WORDS ? 'wc-counter wc-limit' : wc >= MAX_WORDS - 20 ? 'wc-counter wc-near' : 'wc-counter';
    }

    // ── Rejection reason getters (Step 8, "Do Not Recommend" path) ───
    get rejectionReasonRows() {
        return this.rejectionReasonOptions.map(r => ({
            value:   r.value,
            label:   r.label,
            checked: this.rejectionReasons.includes(r.value)
        }));
    }

    get showRejectionOther() {
        return this.rejectionReasons.includes('Other');
    }

    get rejectionCommentWordCountDisplay() {
        const wc = countWords(this.reviewData.Rejection_Comment__c);
        return `${wc} / ${MAX_WORDS}`;
    }

    get rejectionCommentWordCountClass() {
        const wc = countWords(this.reviewData.Rejection_Comment__c);
        return wc >= MAX_WORDS ? 'wc-counter wc-limit' : wc >= MAX_WORDS - 20 ? 'wc-counter wc-near' : 'wc-counter';
    }

    // For Step 9 preview
    get reviewRejectionReasonLabels() {
        return this.rejectionReasons.map(v => {
            if (v === 'Other' && this.reviewData.Rejection_Reason_Other__c) {
                return `Other — ${this.reviewData.Rejection_Reason_Other__c}`;
            }
            const match = this.rejectionReasonOptions.find(r => r.value === v);
            return match ? match.label : v;
        });
    }

    // FIX: reviewSummaryDims now exposes comment + hasComment per question
    // so Step 9 preview can render the reviewer's typed comments
    get reviewSummaryDims() {
        return DIMS.map(dim => {
            const qs   = questionsForOutcome(dim.questions, this.outcomeDeveloperName);
            const vals = qs.map(q => this.ratings[q.id]).filter(v => v != null);
            const mean = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : '—';
            return {
                id: dim.id, title: dim.title, mean,
                qs: qs.map(q => {
                    const r   = this.ratings[q.id];
                    const cmt = (this.comments[q.id] || '').trim();
                    return {
                        id:          q.id,
                        text:        q.text,
                        ratingLabel: r != null ? RATING_LABEL[r] : 'Not rated',
                        ratingNum:   r != null ? r : '',
                        pipCls:      r != null ? `pip pip-r${r}` : 'pip',
                        comment:     cmt,
                        hasComment:  cmt.length > 0
                    };
                })
            };
        });
    }

    get reviewStrengths()  { return this.strengths.filter(s  => s.trim()); }
    get reviewWeaknesses() { return this.weaknesses.filter(w => w.trim()); }
    scrollToTopOfStep() {
        requestAnimationFrame(() => {
            const bodyEl = this.template.querySelector('.body');
            if (bodyEl) {
                bodyEl.scrollTop = 0;
            }
        });
    }
    handleProgressClick(event) {
        this.currentStep = parseInt(event.target.dataset.idx, 10);
        this.validationError = '';
        this.rubricOpen = false;

        this.scrollToTopOfStep();
    }

    toggleRubric() { this.rubricOpen = !this.rubricOpen; }

    handleRating(event) {
        const qid = event.currentTarget.dataset.qid;
        const val = parseInt(event.currentTarget.dataset.rate, 10);
        this.ratings = { ...this.ratings, [qid]: val };
        this._triggerAutosave();
    }

    // ── Comment textarea handlers (dimension steps) ──────────────────

    handleCommentInput(event) {
        const qid  = event.currentTarget.dataset.qid;
        let   val  = event.target.value;
        if (countWords(val) > MAX_WORDS) {
            val = truncateToWordLimit(val, MAX_WORDS);
            event.target.value = val;
        }
        this.comments = { ...this.comments, [qid]: val };
        this._triggerAutosave();
    }

    handleCommentKeyDown(event) {
        const qid = event.currentTarget.dataset.qid;
        const currentText = this.comments[qid] || '';
        if (countWords(currentText) >= MAX_WORDS) {
            if (ALWAYS_ALLOWED_KEYS.has(event.key)) return;
            if (event.ctrlKey || event.metaKey) return; // allow Ctrl+A, C, X etc.
            event.preventDefault();
        }
    }

    handleCommentPaste(event) {
        const qid = event.currentTarget.dataset.qid;
        const currentText = this.comments[qid] || '';
        const pasteText   = (event.clipboardData || window.clipboardData).getData('text');
        const combined    = currentText + pasteText;
        if (countWords(combined) > MAX_WORDS) {
            event.preventDefault();
            const truncated = truncateToWordLimit(combined, MAX_WORDS);
            this.comments   = { ...this.comments, [qid]: truncated };
            event.target.value = truncated;
            this._triggerAutosave();
        }
    }

    // ── Recommendation comment textarea handlers (step 8) ───────────

    handleRecCommentInput(event) {
        const field = event.currentTarget.dataset.field;
        let   val   = event.target.value;
        if (countWords(val) > MAX_WORDS) {
            val = truncateToWordLimit(val, MAX_WORDS);
            event.target.value = val;
        }
        this.reviewData = { ...this.reviewData, [field]: val };
        this._triggerAutosave();
    }

    handleRecCommentKeyDown(event) {
        const field       = event.currentTarget.dataset.field;
        const currentText = this.reviewData[field] || '';
        if (countWords(currentText) >= MAX_WORDS) {
            if (ALWAYS_ALLOWED_KEYS.has(event.key)) return;
            if (event.ctrlKey || event.metaKey) return;
            event.preventDefault();
        }
    }

    handleRecCommentPaste(event) {
        const field       = event.currentTarget.dataset.field;
        const currentText = this.reviewData[field] || '';
        const pasteText   = (event.clipboardData || window.clipboardData).getData('text');
        const combined    = currentText + pasteText;
        if (countWords(combined) > MAX_WORDS) {
            event.preventDefault();
            const truncated = truncateToWordLimit(combined, MAX_WORDS);
            this.reviewData = { ...this.reviewData, [field]: truncated };
            event.target.value = truncated;
            this._triggerAutosave();
        }
    }

    // ── Rejection reason handlers (step 8, "Do Not Recommend" path) ──

    handleRejectionReasonToggle(event) {
        const val     = event.currentTarget.dataset.value;
        const checked = event.target.checked;
        let arr = [...this.rejectionReasons];
        if (checked) {
            if (!arr.includes(val)) arr.push(val);
        } else {
            arr = arr.filter(v => v !== val);
            if (val === 'Other') {
                this.reviewData = { ...this.reviewData, Rejection_Reason_Other__c: '' };
            }
        }
        this.rejectionReasons = arr;
        this.reviewData = { ...this.reviewData, Rejection_Reasons__c: arr.join(';') };
        this._triggerAutosave();
    }

    handleRejectionOtherInput(event) {
        this.reviewData = { ...this.reviewData, Rejection_Reason_Other__c: event.target.value };
        this._triggerAutosave();
    }

    handleRejectionCommentInput(event) {
        let val = event.target.value;
        if (countWords(val) > MAX_WORDS) {
            val = truncateToWordLimit(val, MAX_WORDS);
            event.target.value = val;
        }
        this.reviewData = { ...this.reviewData, Rejection_Comment__c: val };
        this._triggerAutosave();
    }

    handleRejectionCommentKeyDown(event) {
        const currentText = this.reviewData.Rejection_Comment__c || '';
        if (countWords(currentText) >= MAX_WORDS) {
            if (ALWAYS_ALLOWED_KEYS.has(event.key)) return;
            if (event.ctrlKey || event.metaKey) return;
            event.preventDefault();
        }
    }

    handleRejectionCommentPaste(event) {
        const currentText = this.reviewData.Rejection_Comment__c || '';
        const pasteText   = (event.clipboardData || window.clipboardData).getData('text');
        const combined    = currentText + pasteText;
        if (countWords(combined) > MAX_WORDS) {
            event.preventDefault();
            const truncated = truncateToWordLimit(combined, MAX_WORDS);
            this.reviewData = { ...this.reviewData, Rejection_Comment__c: truncated };
            event.target.value = truncated;
            this._triggerAutosave();
        }
    }

    handleSwChange(event) {
        const kind = event.currentTarget.dataset.kind;
        const idx  = parseInt(event.currentTarget.dataset.idx, 10);
        const val  = event.detail.value;
        if (kind === 'strength') {
            const arr = [...this.strengths]; arr[idx] = val; this.strengths = arr;
        } else {
            const arr = [...this.weaknesses]; arr[idx] = val; this.weaknesses = arr;
        }
        this._triggerAutosave();
    }

    handleRecChoice(event) {
        this.recChoice  = event.currentTarget.dataset.rec;
        // Clear rating strength when switching into the "Do Not Recommend"
        // path since that path no longer captures a strength value.
        if (this.recChoice === REC_DO_NOT) {
            this.recStrength = null;
        }
        this.reviewData = { ...this.reviewData, Recommend_for_CEO_review__c: this.recChoice };
        this._triggerAutosave();
    }

    handleRecStrength(event) {
        this.recStrength = parseInt(event.currentTarget.dataset.recstr, 10);
        this.reviewData = { ...this.reviewData, Strength_of_recommendation__c: String(this.recStrength) };
        this._triggerAutosave();
    }

    handleInputChange(event) {
        this.reviewData = { ...this.reviewData, [event.target.name]: event.detail.value };
        this._triggerAutosave();
    }

    // ── File upload handler ──────────────────────────────────────
handleUploadFinished(event) {
    const newFiles = event.detail.files; // Array of { documentId, name, size, sourceObjectId }
    if (!newFiles || newFiles.length === 0) return;

    const existingNames = new Set(this.uploadedFiles.map(f => f.name.trim().toLowerCase()));
    const uniqueFiles   = [];
    const duplicates    = [];

    newFiles.forEach(f => {
        const key = f.name.trim().toLowerCase();
        if (existingNames.has(key)) {
            duplicates.push(f);
        } else {
            existingNames.add(key);
            uniqueFiles.push(f);
        }
    });

    if (uniqueFiles.length > 0) {
        this.uploadedFiles = [...this.uploadedFiles, ...uniqueFiles];
        this.dispatchEvent(new ShowToastEvent({
            title:   'File uploaded',
            message: `${uniqueFiles.length} file(s) attached to this review.`,
            variant: 'success'
        }));
    }

    if (duplicates.length > 0) {
        // lightning-file-upload has already created these ContentDocuments —
        // remove them so we don't leave orphaned duplicate files behind.
        duplicates.forEach(f => {
            deleteUploadedFile({ contentDocumentId: f.documentId })
                .catch(err => console.error('Error removing duplicate upload:', err));
        });
        this.dispatchEvent(new ShowToastEvent({
            title:   'Duplicate file',
            message: `${duplicates.map(f => f.name).join(', ')} ${duplicates.length > 1 ? 'were' : 'was'} already attached and ${duplicates.length > 1 ? 'were' : 'was'} skipped.`,
            variant: 'warning'
        }));
    }
}

    handleDeleteFile(event) {
        const docId = event.currentTarget.dataset.docid;
        deleteUploadedFile({ contentDocumentId: docId })
            .then(() => {
                this.uploadedFiles = this.uploadedFiles.filter(f => f.documentId !== docId);
                this.dispatchEvent(new ShowToastEvent({
                    title:   'File removed',
                    message: 'The attached file has been deleted.',
                    variant: 'success'
                }));
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title:   'Error removing file',
                    message: error.body?.message || 'Could not delete the file.',
                    variant: 'error'
                }));
            });
    }
    // ────────────────────────────────────────────────────────────

    nextStep() {
        const err = this._validateCurrentStep();
        if (err) {
            this.validationError = err;
            return;
        }

        this.validationError = '';

        if (this.currentStep === 8) {
            this._submitForm();
            return;
        }

        this.currentStep += 1;
        this.rubricOpen = false;

        this.scrollToTopOfStep();
    }

    prevStep() {
        if (this.currentStep === 0) return;

        this.validationError = '';
        this.currentStep -= 1;
        this.rubricOpen = false;

        this.scrollToTopOfStep();
    }
    _validateCurrentStep() {
        const step = STEPS[this.currentStep];

        if (step.kind === 'dim') {
            const qs = questionsForOutcome(DIMS[step.dimIdx].questions, this.outcomeDeveloperName);
            for (const q of qs) {
                if (this.ratings[q.id] == null) {
                    return `Rate every sub-question before continuing. Missing: "${q.text.slice(0, 60)}…"`;
                }
                if (!(this.comments[q.id] || '').trim()) {
    return `A comment is required for every rating. Missing on: "${q.text.slice(0, 60)}…"`;
}
            }
            return null;
        }

        if (step.kind === 'sw') {
            if (!this.strengths[0].trim())  return 'At least one strength is required (rank #1).';
            if (!this.weaknesses[0].trim()) return 'At least one weakness is required (rank #1).';
            return null;
        }

        if (step.kind === 'rec') {
            if (!this.recChoice) return 'Select a recommendation option to continue.';

            if (POSITIVE_REC_CHOICES.has(this.recChoice)) {
                if (!this.recStrength) return 'Select a recommendation strength.';
                if (!(this.reviewData.Recommendation_Strength_Comments__c || '').trim()) {
                    return 'Recommendation strength comments are required.';
                }
            } else if (this.recChoice === REC_DO_NOT) {
                if (this.rejectionReasons.length === 0) {
                    return 'Select at least one rejection reason.';
                }
                
                if (!(this.reviewData.Rejection_Comment__c || '').trim()) {
                    return 'A rejection comment is required.';
                }
            }
            return null;
        }

        if (step.kind === 'review') {
            const prev = this.currentStep;
            for (let i = 0; i < 8; i++) {
                this.currentStep = i;
                const err = this._validateCurrentStep();
                this.currentStep = prev;
                if (err) return `Step ${i + 1} is incomplete. Use the progress bar to jump back.`;
            }
            return null;
        }

        return null;
    }

    _triggerAutosave() {
         if (!this._resolvedRecordTypeId) return;
        this.saveStateClass = 'save-saving';
        this.saveStateText  = 'Saving…';
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this._persistDraft(), 1500);
    }

    _buildPayload(status) {
        const data = { ...this.reviewData };
        data.ApplicationId = this._applicationId;
        data.RecordTypeId  = this._resolvedRecordTypeId
                             || recordTypeIdForOutcome(this.outcomeDeveloperName);
        DIMS.forEach(dim => {
            dim.questions.forEach(q => {
                const relevant = questionsForOutcome([q], this.outcomeDeveloperName).length > 0;
                data[q.ratingField]  = relevant && this.ratings[q.id] != null
                    ? String(this.ratings[q.id])
                    : null;
                data[q.commentField] = relevant ? (this.comments[q.id] || '') : null;
            });
        });

        data.Top_3_proposal_strengths_ranked__c  = this.strengths.join('\n');
        data.Top_3_proposal_weaknesses_ranked__c = this.weaknesses.join('\n');

        data.Recommend_for_CEO_review__c = storedRecValue(this.recChoice);
        if (POSITIVE_REC_CHOICES.has(this.recChoice)) {
            data.Strength_of_recommendation__c = this.recStrength ? String(this.recStrength) : '';
            // Clear rejection details if the reviewer switched to a positive choice
            data.Rejection_Reasons__c      = '';
            data.Rejection_Reason_Other__c = '';
            data.Rejection_Comment__c      = '';
        } else if (this.recChoice === REC_DO_NOT) {
            data.Strength_of_recommendation__c = '';
            data.Rejection_Reasons__c          = this.rejectionReasons.join(';');
            data.Rejection_Reason_Other__c     = this.rejectionReasons.includes('Other')
                                                  ? (this.reviewData.Rejection_Reason_Other__c || '')
                                                  : '';
            data.Rejection_Comment__c          = this.reviewData.Rejection_Comment__c || '';
        }

        if (status) data.Status = status;
        return data;
    }

    _persistDraft() {
        saveDraftReview({ reviewDataJson: JSON.stringify(this._buildPayload(null)) })
            .then(result => {
                if (result?.Id) this.reviewData = { ...this.reviewData, Id: result.Id };
                this.saveStateClass = 'save-saved';
                this.saveStateText  = 'Saved · just now';
                setTimeout(() => {
                    this.saveStateClass = 'save-idle';
                    this.saveStateText  = 'Auto-saved · just now';
                }, 2000);
            })
            .catch(err => {
                this.saveStateClass = 'save-idle';
                this.saveStateText  = 'Auto-saved · just now';
                console.error('Draft save error:', err);
            });
    }

    handleSaveDraft() {
        saveDraftReview({ reviewDataJson: JSON.stringify(this._buildPayload(null)) })
            .then(result => {
                if (result?.Id) this.reviewData = { ...this.reviewData, Id: result.Id };
                this.dispatchEvent(new ShowToastEvent({ title: 'Draft Saved', message: 'Your draft was saved successfully.', variant: 'success' }));
                this.saveStateClass = 'save-saved';
                this.saveStateText  = 'Saved · just now';
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error Saving Draft', message: error.body?.message || 'Unknown error', variant: 'error' }));
            });
    }

    _submitForm() {
        saveApplicationReview({ reviewDataJson: JSON.stringify(this._buildPayload('Submitted')) })
            .then(() => {
                this.showForm  = false;
                this.submitted = true;
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title:   'Error',
                    message: error.body?.message || 'Failed to submit evaluation.',
                    variant: 'error'
                }));
            });
    }

    // ── Navigation ─────────────────────────────────────────────────
    handleBackToDashboard() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
              //  url: '/reviewersite/s/wg-reviewer-dashboard'
                url: '/internal/s/wg-reviewer-dashboard'
            }
        });
    }

}