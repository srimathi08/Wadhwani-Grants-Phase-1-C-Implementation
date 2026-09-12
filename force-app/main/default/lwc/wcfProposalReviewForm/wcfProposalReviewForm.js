import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import getReviewerFormV5Metadata from '@salesforce/apex/WCFReviewerMetadataController.getReviewerFormV5Metadata';
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
        const trackParam = this._incomingTrack || this.outcomeDisplayLabel || null;
        getReviewerFormV5Metadata({ trackName: trackParam })
            .then(res => {
                if (res && res.success && res.categories) {
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

    get totalStepsDisplay() {
        // 7 Categories + Strengths/Weaknesses + Recommendation + Review = 10 steps
        return (this.categories ? this.categories.length : 7) + 3;
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
        const numCats = this.categories ? this.categories.length : 7;
        return this.currentStep >= 0 && this.currentStep < numCats;
    }

    get isSwStep() {
        const numCats = this.categories ? this.categories.length : 7;
        return this.currentStep === numCats;
    }

    get isRecStep() {
        const numCats = this.categories ? this.categories.length : 7;
        return this.currentStep === numCats + 1;
    }

    get isReviewStep() {
        const numCats = this.categories ? this.categories.length : 7;
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
    get recChoiceDisplayLabel() { return this.recChoice || ''; }

    get recValueClass() {
        if (this.recChoice === REC_DO_NOT) return 'recvalue-no';
        return this.recChoice ? 'recvalue-yes' : '';
    }
    get recValueIcon() {
        if (this.recChoice === REC_DO_NOT) return '✕';
        return this.recChoice ? '✓' : '';
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

    get reviewRejectionReasonLabels() {
        return this.rejectionReasons.map(v => {
            if (v === 'Other' && this.reviewData.Rejection_Reason_Other__c) {
                return `Other — ${this.reviewData.Rejection_Reason_Other__c}`;
            }
            const match = this.rejectionReasonOptions.find(r => r.value === v);
            return match ? match.label : v;
        });
    }

    get overallCalculatedScore() {
        if (!this.categories || !this.categories.length) return '—';
        const catMeans = [];
        this.categories.forEach(cat => {
            const vals = (cat.questions || []).map(q => this.ratings[q.questionId]).filter(v => v != null);
            if (vals.length) {
                const sum = vals.reduce((s, v) => s + v, 0);
                catMeans.push(sum / vals.length);
            }
        });
        if (!catMeans.length) return '—';
        const overall = catMeans.reduce((s, v) => s + v, 0) / catMeans.length;
        return overall.toFixed(2);
    }

    get reviewSummaryDims() {
        return (this.categories || []).map(cat => {
            const qs = cat.questions || [];
            const vals = qs.map(q => this.ratings[q.questionId]).filter(v => v != null);
            const mean = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : '—';

            return {
                id: cat.categoryNumber,
                title: cat.title,
                mean,
                qs: qs.map(q => {
                    const r = this.ratings[q.questionId];
                    const cmt = (this.comments[q.questionId] || '').trim();
                    const ladderArr = q.ladder || [];
                    const ladderText = r != null && ladderArr[r - 1] ? ladderArr[r - 1] : '';

                    return {
                        id:          q.questionId,
                        text:        q.questionText,
                        ratingLabel: r != null ? RATING_LABEL[r] : 'Not rated',
                        ratingNum:   r != null ? `Level ${r}` : '',
                        pipCls:      r != null ? `pip pip-r${r}` : 'pip',
                        ladderText,
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
            if (event.ctrlKey || event.metaKey) return;
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
        this.recChoice = event.currentTarget.dataset.rec;
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

    handleUploadFinished(event) {
        const newFiles = event.detail.files;
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
            duplicates.forEach(f => {
                deleteUploadedFile({ contentDocumentId: f.documentId })
                    .catch(err => console.error('Error removing duplicate upload:', err));
            });
            this.dispatchEvent(new ShowToastEvent({
                title:   'Duplicate file',
                message: `${duplicates.map(f => f.name).join(', ')} ${duplicates.length > 1 ? 'were' : 'was'} already attached and skipped.`,
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

    nextStep() {
        const err = this._validateCurrentStep();
        if (err) {
            this.validationError = err;
            return;
        }

        this.validationError = '';

        if (this.isReviewStep) {
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
        if (this.isDimStep) {
            const cat = this.categories[this.currentStep];
            const qs = cat.questions || [];
            for (const q of qs) {
                if (this.ratings[q.questionId] == null) {
                    return `Rate every question before continuing. Missing: "${q.questionText.slice(0, 60)}…"`;
                }
                if (!(this.comments[q.questionId] || '').trim()) {
                    return `A comment / justification is required for every rating. Missing on: "${q.questionText.slice(0, 60)}…"`;
                }
            }
            return null;
        }

        if (this.isSwStep) {
            if (!this.strengths[0].trim())  return 'At least one strength is required (rank #1).';
            if (!this.weaknesses[0].trim()) return 'At least one weakness is required (rank #1).';
            return null;
        }

        if (this.isRecStep) {
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

        if (this.isReviewStep) {
            const prev = this.currentStep;
            const totalPreviousSteps = (this.categories ? this.categories.length : 7) + 2;
            for (let i = 0; i < totalPreviousSteps; i++) {
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
        this.saveStateClass = 'save-saving';
        this.saveStateText  = 'Saving…';
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this._persistDraft(), 1500);
    }

    _buildPayload(status) {
        const data = { ...this.reviewData };
        data.ApplicationId = this._applicationId;
        data.RecordTypeId  = this._resolvedRecordTypeId || null;
        data.Form_Template_Version__c = 'v5';

        // Build structured answers array for JSON storage in Decision_Rationale__c
        const answersArray = [];

        (this.categories || []).forEach(cat => {
            (cat.questions || []).forEach(q => {
                const qId = q.questionId;
                const r = this.ratings[qId];
                const cmt = this.comments[qId] || '';
                const ladderArr = q.ladder || [];
                const ladderText = r != null && ladderArr[r - 1] ? ladderArr[r - 1] : '';

                answersArray.push({
                    questionId: qId,
                    categoryNumber: cat.categoryNumber,
                    questionText: q.questionText,
                    rating: r,
                    ladderLevelText: ladderText,
                    comment: cmt
                });

                // Write to physical fields
                if (QUESTION_FIELD_MAP[qId]) {
                    const fields = QUESTION_FIELD_MAP[qId];
                    data[fields.rating]  = r != null ? String(r) : null;
                    data[fields.comment] = cmt;
                }
            });
        });

        data.Decision_Rationale__c = JSON.stringify(answersArray);
        data.Top_3_proposal_strengths_ranked__c  = this.strengths.join('\n');
        data.Top_3_proposal_weaknesses_ranked__c = this.weaknesses.join('\n');

        data.Recommend_for_CEO_review__c = storedRecValue(this.recChoice);
        if (POSITIVE_REC_CHOICES.has(this.recChoice)) {
            data.Strength_of_recommendation__c = this.recStrength ? String(this.recStrength) : '';
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
                this.dispatchEvent(new ShowToastEvent({ title: 'Draft Saved', message: 'Your evaluation draft was saved successfully.', variant: 'success' }));
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
                this.dispatchEvent(new CustomEvent('submitcomplete', {
                    detail: { applicationId: this._applicationId }
                }));
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title:   'Error',
                    message: error.body?.message || 'Failed to submit evaluation.',
                    variant: 'error'
                }));
            });
    }

    handleBackToDashboard() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/internal/s/wg-reviewer-dashboard'
            }
        });
    }

}