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
const OUTCOME_LU   = 'WCF_Livelihood_Upliftment';
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

/**
 * Dynamic physical field mapping resolver based on question ID and active track.
 * Newly created custom metadata questions without a physical field mapping
 * will automatically and seamlessly store in Decision_Rationale__c JSON.
 */
function resolvePhysicalFields(qId, track) {
    const normTrack = (track || '').toUpperCase();
    const isJC = normTrack.includes('CREATION') || normTrack === 'JC';
    const isLU = normTrack.includes('LIVELIHOOD') || normTrack.includes('UPLIFTMENT') || normTrack === 'LU';

    if (qId === '1.1') return { rating: 'D1_Governance_Rating__c', comment: 'D1_Governance_Comment__c' };
    if (qId === '1.2') return { rating: 'D1_Leadership_Rating__c', comment: 'D1_Leadership_Comment__c' };
    if (qId === '1.3') return { rating: 'D1_FinancialRecords_Rating__c', comment: 'D1_FinancialRecords_Comment__c' };
    if (qId === '1.4') return { rating: 'D1_SustainabilityVision_Rating__c', comment: 'D1_SustainabilityVision_Comment__c' };

    if (qId === '2.1') return { rating: 'D2_ProgramAlignment_Rating__c', comment: 'D2_ProgramAlignment_Comment__c' };
    if (qId === '2.2') {
        if (isLU) return { rating: 'D2_LU_Distinctiveness_Rating__c', comment: 'D2_LU_Distinctiveness_Comment__c' };
        if (isJC) return { rating: 'D2_JC_Distinctiveness_Rating__c', comment: 'D2_JC_Distinctiveness_Comment__c' };
        return { rating: 'D2_JF_Distinctiveness_Rating__c', comment: 'D2_JF_Distinctiveness_Comment__c' };
    }
    if (qId === '2.3') return { rating: 'D2_OperationalDepth_Rating__c', comment: 'D2_OperationalDepth_Comment__c' };

    if (qId === '3.1') {
        if (isLU) return { rating: 'D3_LU_ScaleRecord_Rating__c', comment: 'D3_LU_ScaleRecord_Comment__c' };
        if (isJC) return { rating: 'D3_JC_ScaleRecord_Rating__c', comment: 'D3_JC_ScaleRecord_Comment__c' };
        return { rating: 'D3_JF_ScaleRecord_Rating__c', comment: 'D3_JF_ScaleRecord_Comment__c' };
    }
    if (qId === '3.2') {
        if (isLU) return { rating: 'D3_LU_ConversionRate_Rating__c', comment: 'D3_LU_ConversionRate_Comment__c' };
        if (isJC) return { rating: 'D3_JC_ConversionRate_Rating__c', comment: 'D3_JC_ConversionRate_Comment__c' };
        return { rating: 'D3_JF_ConversionRate_Rating__c', comment: 'D3_JF_ConversionRate_Comment__c' };
    }
    if (qId === '3.3') {
        if (isLU) return { rating: 'D3_LU_CostPerOutcome_Rating__c', comment: 'D3_LU_CostPerOutcome_Comment__c' };
        if (isJC) return { rating: 'D3_JC_CostPerJob_Rating__c', comment: 'D3_JC_CostPerJob_Comment__c' };
        return { rating: 'D3_JF_CostPerPlacement_Rating__c', comment: 'D3_JF_CostPerPlacement_Comment__c' };
    }
    if (qId === '3.4') return { rating: 'D3_ValidationEvidence_Rating__c', comment: 'D3_ValidationEvidence_Comment__c' };

    if (qId === '4.1') return { rating: 'D4_MandateFit_Rating__c', comment: 'D4_MandateFit_Comment__c' };
    if (qId === '4.2') return { rating: 'D4_Geography_Rating__c', comment: 'D4_Geography_Comment__c' };
    if (qId === '4.3') return { rating: 'D4_GenieAI_Rating__c', comment: 'D4_GenieAI_Comment__c' };

    if (qId === '5.1') return { rating: 'D5_FinancialStability_Rating__c', comment: 'D5_FinancialStability_Comment__c' };
    if (qId === '5.2') return { rating: 'D5_IncrementEstimate_Rating__c', comment: 'D5_IncrementEstimate_Comment__c' };
    if (qId === '5.3') return { rating: 'D5_OperatingInfra_Rating__c', comment: 'D5_OperatingInfra_Comment__c' };

    if (qId === '6.1') return { rating: 'D6_MEFunction_Rating__c', comment: 'D6_MEFunction_Comment__c' };
    if (qId === '6.2') return { rating: 'D6_ExternalVerification_Rating__c', comment: 'D6_ExternalVerification_Comment__c' };
    if (qId === '6.3') return { rating: 'D6_LongitudinalTracking_Rating__c', comment: 'D6_LongitudinalTracking_Comment__c' };

    if (qId === '7.1') return { rating: 'D5_RationaleCredibility_Rating__c', comment: 'D5_Rationale_Credibility_Comment__c' };
    if (qId === '7.2') return { rating: 'D2_JC_SupportModel_Rating__c', comment: 'D2_JC_SupportModel_Comment__c' };

    return null;
}

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

    @track isLoadingMetadata = true;
    @track categories = [];
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
        this.isLoadingMetadata = true;
        const trackParam = this._incomingTrack || this.outcomeDisplayLabel || this.outcomeDeveloperName || null;
        getReviewerFormV5Metadata({ trackName: trackParam })
            .then(res => {
                if (res && res.success && res.categories && res.categories.length > 0) {
                    this.categories = res.categories;
                }
                this.isLoadingMetadata = false;
            })
            .catch(err => {
                console.error('Error loading reviewer form metadata:', err);
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

                // 1. Restore ratings and comments from physical fields
                const activeTrack = this.outcomeDeveloperName || this._incomingTrack || '';
                const allQuestions = (this.categories || []).flatMap(c => c.questions || []);
                allQuestions.forEach(q => {
                    const mapping = resolvePhysicalFields(q.questionId, activeTrack);
                    if (mapping) {
                        if (review[mapping.rating] != null && review[mapping.rating] !== '') {
                            this.ratings = { ...this.ratings, [q.questionId]: parseInt(review[mapping.rating], 10) };
                        }
                        if (review[mapping.comment]) {
                            this.comments = { ...this.comments, [q.questionId]: review[mapping.comment] };
                        }
                    }
                });

                // 2. Also check if structured JSON answers exist in Decision_Rationale__c
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
        return (this.categories && this.categories.length > 0) ? this.categories.length : 0;
    }

    get totalStepsDisplay() {
        // Dynamic categories count + Strengths/Weaknesses + Recommendation + Review
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

    get headerTrackBadges() {
        const raw = this.outcomeDisplayLabel || this.outcomeDeveloperName || this._incomingTrack || '';
        const lower = raw.toLowerCase();
        const hasJF = lower.includes('fulfillment') || lower.includes('fulfilment') || lower.includes('jf') || lower.includes('both');
        const hasJC = lower.includes('creation') || lower.includes('jc') || lower.includes('both');
        const hasLU = lower.includes('livelihood') || lower.includes('upliftment') || lower.includes('lu');

        const badges = [];
        if (hasJF) badges.push({ label: 'Job Fulfillment', badgeClass: 'track-badge track-jf' });
        if (hasJC) badges.push({ label: 'Job Creation', badgeClass: 'track-badge track-jc' });
        if (hasLU) badges.push({ label: 'Livelihood Upliftment', badgeClass: 'track-badge track-lu' });

        if (badges.length === 0 && raw) {
            badges.push({ label: raw, badgeClass: 'track-badge' });
        }
        return badges;
    }

    get hasOutcomeType() { return this.headerTrackBadges.length > 0; }
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
    get isRecChosen()   { return this.recChoice !== null && this.recChoice !== undefined; }
    get hasRecChoice()   { return this.isRecChosen; }

    get recStronglyRecommendClass() {
        return this.recChoice === REC_STRONGLY ? 'yn rec-sel' : 'yn';
    }
    get recRecommendClass() {
        return this.recChoice === REC_RECOMMEND ? 'yn rec-sel' : 'yn';
    }
    get recReservationsClass() {
        return this.recChoice === REC_RESERVE ? 'yn rec-sel' : 'yn';
    }
    get recDoNotRecommendClass() {
        return this.recChoice === REC_DO_NOT ? 'yn rec-sel-no' : 'yn';
    }

    get showCeoRecommendationYes() {
        return POSITIVE_REC_CHOICES.has(this.recChoice);
    }
    get showCeoRecommendationNo() {
        return this.recChoice === REC_DO_NOT;
    }

    get recStrengthBtns() {
        return [5, 4, 3, 2, 1].map(n => ({
            n,
            label: RATING_LABEL[n],
            yesSelCls: this.recStrength === n ? 'seg-sel' : ''
        }));
    }

    get recYesWordCountDisplay() {
        const wc = countWords(this.reviewData.Recommendation_Strength_Comments__c);
        return `${wc} / ${MAX_WORDS}`;
    }
    get recYesWordCountClass() {
        const wc = countWords(this.reviewData.Recommendation_Strength_Comments__c);
        return wc >= MAX_WORDS ? 'wc-counter wc-limit' : wc >= MAX_WORDS - 20 ? 'wc-counter wc-near' : 'wc-counter';
    }

    get rejectionReasonRows() {
        const defaultOpts = [
            { label: 'Weak Institutional Credibility & Governance', value: 'Weak Institutional Credibility & Governance' },
            { label: 'Insufficient Operational Scale & Team Maturity', value: 'Insufficient Operational Scale & Team Maturity' },
            { label: 'Unverified / Poor Historical Outcome Metrics', value: 'Unverified / Poor Historical Outcome Metrics' },
            { label: 'Misaligned with WCF Core Strategic Priorities', value: 'Misaligned with WCF Core Strategic Priorities' },
            { label: 'Lack of Absorptive & Financial Capacity', value: 'Lack of Absorptive & Financial Capacity' },
            { label: 'Inadequate M&E / Measurement Systems', value: 'Inadequate M&E / Measurement Systems' },
            { label: 'Unjustified Budget Allocation / Cost Structure', value: 'Unjustified Budget Allocation / Cost Structure' },
            { label: 'Other', value: 'Other' }
        ];
        const opts = (this.rejectionReasonOptions && this.rejectionReasonOptions.length > 0)
            ? this.rejectionReasonOptions
            : defaultOpts;

        return opts.map(opt => ({
            ...opt,
            checked: this.rejectionReasons.includes(opt.value)
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

    // Review Step Getters
    get overallCalculatedScore() {
        const validRatings = Object.values(this.ratings).filter(r => r != null && !isNaN(r));
        if (!validRatings.length) return '—';
        return (validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length).toFixed(2);
    }

    get reviewSummaryDims() {
        return (this.categories || []).map(cat => {
            const qs = cat.questions || [];
            const catRatings = qs.map(q => this.ratings[q.questionId]).filter(r => r != null);
            const mean = catRatings.length ? (catRatings.reduce((s, r) => s + r, 0) / catRatings.length).toFixed(2) : '—';
            return {
                id: cat.categoryNumber,
                title: cat.title,
                mean,
                qs: qs.map(q => {
                    const r = this.ratings[q.questionId];
                    const ladderArr = q.ladder || [];
                    return {
                        id: q.questionId,
                        text: q.questionText,
                        pipCls: r != null ? `pip pip-r${r}` : 'pip pip-empty',
                        ratingLabel: r != null ? (RATING_LABEL[r] || `Level ${r}`) : 'Not rated',
                        ratingNum: r != null ? `(${r}/5)` : '',
                        ladderText: r != null && ladderArr[r - 1] ? ladderArr[r - 1] : '',
                        hasComment: !!(this.comments[q.questionId] && this.comments[q.questionId].trim()),
                        comment: this.comments[q.questionId] || ''
                    };
                })
            };
        });
    }

    get reviewStrengths() {
        return this.strengths.filter(s => s && s.trim());
    }

    get reviewWeaknesses() {
        return this.weaknesses.filter(w => w && w.trim());
    }

    get recValueClass() {
        return this.recChoice === REC_DO_NOT ? 'recval recval-no' : 'recval recval-yes';
    }

    get recValueIcon() {
        return this.recChoice === REC_DO_NOT ? '✕' : '✓';
    }

    get recChoiceDisplayLabel() {
        return this.recChoice || 'No Decision Selected';
    }

    get recStrengthLabel() {
        return this.recStrength ? `${this.recStrength} - ${RATING_LABEL[this.recStrength] || ''}` : '';
    }

    get reviewRejectionReasonLabels() {
        return this.rejectionReasons;
    }

    get isAllCompleted() {
        const allQuestions = (this.categories || []).flatMap(c => c.questions || []);
        if (allQuestions.length === 0) return false;
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

    toggleRubric() {
        this.rubricOpen = !this.rubricOpen;
    }

    // Rating Selection Handler
    handleRating(event) {
        const qId = event.currentTarget.dataset.qid;
        const val = parseInt(event.currentTarget.dataset.rate || event.currentTarget.dataset.val, 10);
        if (qId && !isNaN(val)) {
            this.ratings = { ...this.ratings, [qId]: val };
            this.validationError = '';
            this.autoSave();
        }
    }
    handleRatingClick(event) {
        this.handleRating(event);
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

    handleRecChoice(event) {
        this.recChoice = event.currentTarget.dataset.rec || event.currentTarget.dataset.val;
        this.validationError = '';
        this.autoSave();
    }
    handleRecCardClick(event) {
        this.handleRecChoice(event);
    }

    handleRecStrength(event) {
        this.recStrength = parseInt(event.currentTarget.dataset.recstr || event.currentTarget.dataset.val, 10);
        this.validationError = '';
        this.autoSave();
    }
    handleRecStrengthClick(event) {
        this.handleRecStrength(event);
    }

    handleRecCommentInput(event) {
        let text = event.target.value;
        if (countWords(text) > MAX_WORDS) {
            text = truncateToWordLimit(text, MAX_WORDS);
            event.target.value = text;
        }
        this.reviewData = { ...this.reviewData, Recommendation_Strength_Comments__c: text };
        this.autoSave();
    }
    handleRecCommentKeyDown(event) {
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
    handleRecCommentPaste(event) {
        const pasted = (event.clipboardData || window.clipboardData).getData('text');
        const current = event.target.value;
        const selStart = event.target.selectionStart;
        const selEnd   = event.target.selectionEnd;
        const combined = current.slice(0, selStart) + pasted + current.slice(selEnd);
        if (countWords(combined) > MAX_WORDS) {
            event.preventDefault();
            const truncated = truncateToWordLimit(combined, MAX_WORDS);
            event.target.value = truncated;
            this.reviewData = { ...this.reviewData, Recommendation_Strength_Comments__c: truncated };
            this.autoSave();
        }
    }

    handleRejectionReasonToggle(event) {
        const val = event.currentTarget.dataset.value || event.target.dataset.value;
        const checked = event.target.checked;
        if (checked) {
            if (!this.rejectionReasons.includes(val)) {
                this.rejectionReasons = [...this.rejectionReasons, val];
            }
        } else {
            this.rejectionReasons = this.rejectionReasons.filter(v => v !== val);
        }
        this.autoSave();
    }
    handleRejectionReasonChange(event) {
        this.rejectionReasons = event.detail.value;
        this.autoSave();
    }

    handleRejectionCommentInput(event) {
        let text = event.target.value;
        if (countWords(text) > MAX_WORDS) {
            text = truncateToWordLimit(text, MAX_WORDS);
            event.target.value = text;
        }
        this.reviewData = { ...this.reviewData, Rejection_Comment__c: text };
        this.autoSave();
    }
    handleRejectionCommentKeyDown(event) {
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
    handleRejectionCommentPaste(event) {
        const pasted = (event.clipboardData || window.clipboardData).getData('text');
        const current = event.target.value;
        const selStart = event.target.selectionStart;
        const selEnd   = event.target.selectionEnd;
        const combined = current.slice(0, selStart) + pasted + current.slice(selEnd);
        if (countWords(combined) > MAX_WORDS) {
            event.preventDefault();
            const truncated = truncateToWordLimit(combined, MAX_WORDS);
            event.target.value = truncated;
            this.reviewData = { ...this.reviewData, Rejection_Comment__c: truncated };
            this.autoSave();
        }
    }

    handleProgressClick(event) {
        const targetStep = parseInt(event.currentTarget.dataset.idx, 10);
        if (targetStep <= this.currentStep) {
            this.currentStep = targetStep;
            this.validationError = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Previous button handler
    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep -= 1;
            this.validationError = '';
            this.rubricOpen = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    handlePrev() {
        this.prevStep();
    }

    // Next / Submit button handler
    nextStep() {
        this.validationError = '';

        // Validate Dynamic Category Step (0 to totalCategoryCount - 1)
        if (this.isDimStep) {
            const cat = this.categories[this.currentStep];
            const qs = (cat && cat.questions) ? cat.questions : [];
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

        // Validate Final Recommendation Step
        if (this.isRecStep) {
            if (!this.recChoice) {
                this.validationError = 'Please select a final recommendation decision.';
                return;
            }
            if (this.showCeoRecommendationYes) {
                if (this.recStrength == null) {
                    this.validationError = 'Please select a recommendation strength level (1 to 5).';
                    return;
                }
                if (!(this.reviewData.Recommendation_Strength_Comments__c || '').trim()) {
                    this.validationError = 'Please provide recommendation strength comments.';
                    return;
                }
            }
            if (this.showCeoRecommendationNo) {
                if (!this.rejectionReasons || this.rejectionReasons.length === 0) {
                    this.validationError = 'Please select at least one rejection reason.';
                    return;
                }
                if (!(this.reviewData.Rejection_Comment__c || '').trim()) {
                    this.validationError = 'Please provide a detailed rejection comment.';
                    return;
                }
            }
        }

        // Submit Step
        if (this.isReviewStep) {
            this.handleSubmit();
            return;
        }

        // Advance to next step
        this.currentStep += 1;
        this.rubricOpen = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    handleNext() {
        this.nextStep();
    }

    // Manual Save Draft button handler
    handleSaveDraft() {
        if (!this._applicationId) return;
        this.saveStateText  = 'Saving…';
        this.saveStateClass = 'save-saving';

        const payload = this.buildReviewPayload(false);
        saveDraftReview({ reviewDataJson: JSON.stringify(payload) })
            .then(saved => {
                if (saved && saved.Id) {
                    this.reviewData.Id = saved.Id;
                }
                this.saveStateText  = 'Saved · just now';
                this.saveStateClass = 'save-idle';
                this.showToast('Success', 'Draft saved successfully.', 'success');
            })
            .catch(err => {
                console.error('Draft manual save error:', err);
                this.saveStateText  = 'Save error';
                this.saveStateClass = 'save-error';
                this.showToast('Error', 'Failed to save draft.', 'error');
            });
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

    handleBackToDashboard() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/reviewersite/s/wcf-reviewer-application-list?role=reviewer'
            }
        });
    }

    // Build structured payload for saving
    buildReviewPayload(isFinalSubmit) {
        const activeTrack = this.outcomeDeveloperName || this._incomingTrack || '';
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

        // Populate physical fields dynamically based on active track
        const structuredAnswers = [];
        (this.categories || []).forEach(cat => {
            (cat.questions || []).forEach(q => {
                const ladderArr = q.ladder || [];
                const r = this.ratings[q.questionId];
                const c = this.comments[q.questionId] || '';

                // Map physical fields if available
                const mapping = resolvePhysicalFields(q.questionId, activeTrack);
                if (mapping) {
                    if (r != null) {
                        payload[mapping.rating] = String(r);
                    }
                    if (c) {
                        payload[mapping.comment] = c;
                    }
                }

                // Append full structured answer to JSON array
                structuredAnswers.push({
                    questionId: q.questionId,
                    categoryNumber: cat.categoryNumber,
                    categoryTitle: cat.title,
                    questionText: q.questionText,
                    rating: r != null ? r : null,
                    ladderLevelText: r != null && ladderArr[r - 1] ? ladderArr[r - 1] : '',
                    comment: c
                });
            });
        });

        // Pack full structured answers in Decision_Rationale__c for zero-loss persistence
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
                if (res && res.isSuccess) {
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