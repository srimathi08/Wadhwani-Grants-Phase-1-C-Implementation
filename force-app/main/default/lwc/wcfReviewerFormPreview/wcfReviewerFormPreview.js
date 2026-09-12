import { LightningElement, api, track, wire } from 'lwc';
import getReviewData from '@salesforce/apex/WCFApproverListController.getReviewData';
import getReviewerFormV5Metadata from '@salesforce/apex/WCFReviewerMetadataController.getReviewerFormV5Metadata';

const RATING_LABEL = { 5: 'Very strong', 4: 'Strong', 3: 'Adequate', 2: 'Weak', 1: 'Very weak' };

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

export default class WcfReviewerFormPreview extends LightningElement {

    @api reviewId;
    @api outcomeDeveloperName;

    @track reviewRecord = null;
    @track categories = [];
    @track isLoading    = true;

    connectedCallback() {
        this.loadData();
    }

    async loadData() {
        this.isLoading = true;
        try {
            const [metaRes, reviewRes] = await Promise.all([
                getReviewerFormV5Metadata({ trackName: this.outcomeDeveloperName }),
                this.reviewId ? getReviewData({ reviewId: this.reviewId }) : null
            ]);

            if (metaRes && metaRes.success && metaRes.categories) {
                this.categories = metaRes.categories;
            }
            if (reviewRes) {
                this.reviewRecord = reviewRes;
            }
        } catch (e) {
            console.error('Error loading review preview:', e);
        } finally {
            this.isLoading = false;
        }
    }

    get hasData() { return !!this.reviewRecord; }

    get reviewName()     { return this.reviewRecord?.Name || ''; }
    get recommendation() { return this.reviewRecord?.Recommend_for_CEO_review__c || '—'; }

    get recClass() {
        const r = this.reviewRecord?.Recommend_for_CEO_review__c;
        return r === 'Yes' ? 'rec-pill rec-yes' : r === 'No' ? 'rec-pill rec-no' : 'rec-pill';
    }
    get recIcon() {
        const r = this.reviewRecord?.Recommend_for_CEO_review__c;
        return r === 'Yes' ? '✓' : r === 'No' ? '✕' : '';
    }

    get recStrengthNum() {
        return this.reviewRecord?.Strength_of_recommendation__c
            || this.reviewRecord?.Strength_of_non_recommendation__c
            || null;
    }
    get recStrengthLabel() {
        const n = parseInt(this.recStrengthNum, 10);
        return n ? RATING_LABEL[n] : null;
    }

    get recComments() {
        return this.reviewRecord?.Recommendation_Strength_Comments__c
            || this.reviewRecord?.Non_Recommendation_Strength_Comments__c
            || this.reviewRecord?.Rejection_Comment__c
            || null;
    }

    get overallScoreDisplay() {
        if (this.reviewRecord?.Overall_Review_Score__c != null) {
            return Number(this.reviewRecord.Overall_Review_Score__c).toFixed(2);
        }
        if (!this.dimensionSummary || !this.dimensionSummary.length) return '—';
        const validMeans = this.dimensionSummary
            .map(d => parseFloat(d.mean))
            .filter(v => !isNaN(v));
        if (!validMeans.length) return '—';
        return (validMeans.reduce((s, v) => s + v, 0) / validMeans.length).toFixed(2);
    }

    get dimensionSummary() {
        if (!this.reviewRecord) return [];
        const r = this.reviewRecord;

        // Parse structured JSON answers if available
        let jsonAnswersMap = {};
        if (r.Decision_Rationale__c) {
            try {
                const parsed = JSON.parse(r.Decision_Rationale__c);
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                        if (item.questionId) {
                            jsonAnswersMap[item.questionId] = item;
                        }
                    });
                }
            } catch (e) {
                // ignore
            }
        }

        return (this.categories || []).map(cat => {
            const qs = cat.questions || [];
            const vals = [];

            const questionList = qs.map(q => {
                const qId = q.questionId;
                const jsonItem = jsonAnswersMap[qId];
                const fieldInfo = QUESTION_FIELD_MAP[qId];

                let rating = null;
                let comment = null;
                let ladderText = '';

                if (jsonItem) {
                    rating = jsonItem.rating != null ? parseInt(jsonItem.rating, 10) : null;
                    comment = jsonItem.comment || null;
                    ladderText = jsonItem.ladderLevelText || '';
                } else if (fieldInfo) {
                    rating = r[fieldInfo.rating] != null ? parseInt(r[fieldInfo.rating], 10) : null;
                    comment = r[fieldInfo.comment] || null;
                    const ladderArr = q.ladder || [];
                    ladderText = rating != null && ladderArr[rating - 1] ? ladderArr[rating - 1] : '';
                }

                if (rating != null && !isNaN(rating)) {
                    vals.push(rating);
                }

                const pipClass = rating != null ? `pip pip-r${rating}` : 'pip pip-empty';

                return {
                    id:          qId,
                    text:        q.questionText,
                    rating:      rating != null ? rating : '—',
                    ratingLabel: rating != null ? (RATING_LABEL[rating] || rating) : 'Not rated',
                    ladderText,
                    comment,
                    pipClass
                };
            });

            const mean = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : '—';

            return {
                id: cat.categoryNumber,
                title: cat.title,
                mean,
                questions: questionList
            };
        });
    }

    _parseSW(val) {
        return (val || '').split('\n').map((t, i) => ({ idx: i, num: i + 1, text: t })).filter(s => s.text.trim());
    }

    get strengthList()  { return this._parseSW(this.reviewRecord?.Top_3_proposal_strengths_ranked__c); }
    get weaknessList()  { return this._parseSW(this.reviewRecord?.Top_3_proposal_weaknesses_ranked__c); }
    get hasStrengths()  { return this.strengthList.length > 0; }
    get hasWeaknesses() { return this.weaknessList.length > 0; }
}