import { LightningElement, api, track, wire } from 'lwc';
import getReviewData from '@salesforce/apex/WCFApproverListController.getReviewData';

const RATING_LABEL = { 5: 'Very strong', 4: 'Strong', 3: 'Adequate', 2: 'Weak', 1: 'Very weak' };

const OUTCOME_JF   = 'WCF_Job_Fulfillment';
const OUTCOME_JC   = 'WCF_Job_Creation_Review';
const OUTCOME_BOTH = 'WCF_Job_Fulfillment_Job_Creation';

// Mirrors DIMS definition from the reviewer form — same questions, same fields
const DIMS = [
    {
        id: 1, title: 'Institutional credibility',
        questions: [
            { id: '1.1', tag: 'all', ratingField: 'D1_Governance_Rating__c',          commentField: 'D1_Governance_Comment__c',          text: 'Legal structure, registration, board & governance' },
            { id: '1.2', tag: 'all', ratingField: 'D1_Leadership_Rating__c',           commentField: 'D1_Leadership_Comment__c',           text: 'Leadership domain experience & tenure' },
            { id: '1.3', tag: 'all', ratingField: 'D1_FinancialRecords_Rating__c',     commentField: 'D1_FinancialRecords_Comment__c',     text: 'Completeness & credibility of financial records' },
            { id: '1.4', tag: 'all', ratingField: 'D1_SustainabilityVision_Rating__c', commentField: 'D1_SustainabilityVision_Comment__c', text: 'Vision & plan for sustainability' }
        ]
    },
    {
        id: 2, title: 'Operational maturity',
        questions: [
            { id: '2.1jf', tag: 'jf',  ratingField: 'D2_ProgramAlignment_Rating__c',   commentField: 'D2_ProgramAlignment_Comment__c',   text: 'Theory of change & primary methods (JF)' },
            { id: '2.1jc', tag: 'jc',  ratingField: 'D2_JC_SupportModel_Rating__c',    commentField: 'D2_JC_SupportModel_Comment__c',    text: 'Support model coherence (JC)' },
            { id: '2.2jf', tag: 'jf',  ratingField: 'D2_JF_Distinctiveness_Rating__c', commentField: 'D2_JF_Distinctiveness_Comment__c', text: 'Distinctiveness vs typical skilling NGOs (JF)' },
            { id: '2.2jc', tag: 'jc',  ratingField: 'D2_JC_Distinctiveness_Rating__c', commentField: 'D2_JC_Distinctiveness_Comment__c', text: 'Distinctiveness vs typical MSME-support NGOs (JC)' },
            { id: '2.3',   tag: 'all', ratingField: 'D2_OperationalDepth_Rating__c',   commentField: 'D2_OperationalDepth_Comment__c',   text: 'Operational depth consistency' }
        ]
    },
    {
        id: 3, title: 'Outcome track record',
        questions: [
            { id: '3.1jf', tag: 'jf',  ratingField: 'D3_JF_ScaleRecord_Rating__c',      commentField: 'D3_JF_ScaleRecord_Comment__c',      text: '3-year enrolment / placement record (JF)' },
            { id: '3.1jc', tag: 'jc',  ratingField: 'D3_JC_ScaleRecord_Rating__c',      commentField: 'D3_JC_ScaleRecord_Comment__c',      text: '3-year businesses / jobs created record (JC)' },
            { id: '3.2jf', tag: 'jf',  ratingField: 'D3_JF_ConversionRate_Rating__c',   commentField: 'D3_JF_ConversionRate_Comment__c',   text: 'Enrolment-to-placement conversion rate (JF)' },
            { id: '3.2jc', tag: 'jc',  ratingField: 'D3_JC_ConversionRate_Rating__c',   commentField: 'D3_JC_ConversionRate_Comment__c',   text: 'MSME support to job creation conversion (JC)' },
            { id: '3.3jf', tag: 'jf',  ratingField: 'D3_JF_CostPerPlacement_Rating__c', commentField: 'D3_JF_CostPerPlacement_Comment__c', text: 'Cost per placement vs $30 benchmark (JF)' },
            { id: '3.3jc', tag: 'jc',  ratingField: 'D3_JC_CostPerJob_Rating__c',       commentField: 'D3_JC_CostPerJob_Comment__c',       text: 'Cost per job vs $75 benchmark (JC)' },
            { id: '3.4',   tag: 'all', ratingField: 'D3_ValidationEvidence_Rating__c',  commentField: 'D3_ValidationEvidence_Comment__c',  text: 'Third-party validation & long-term outcomes' }
        ]
    },
    {
        id: 4, title: 'Alignment with Wadhwani Grants priorities',
        questions: [
            { id: '4.1', tag: 'all', ratingField: 'D4_MandateFit_Rating__c',  commentField: 'D4_MandateFit_Comment__c',  text: 'Advances family-sustaining job outcomes' },
            { id: '4.2', tag: 'all', ratingField: 'D4_Geography_Rating__c',   commentField: 'D4_Geography_Comment__c',   text: 'Geography in Wadhwani Grants priority clusters' },
            { id: '4.3', tag: 'all', ratingField: 'D4_GenieAI_Rating__c',     commentField: 'D4_GenieAI_Comment__c',     text: 'Org sits inside missing-middle budget window' }
        ]
    },
    {
        id: 5, title: 'Absorptive capacity',
        questions: [
            { id: '5.1', tag: 'all', ratingField: 'D5_FinancialStability_Rating__c',   commentField: 'D5_FinancialStability_Comment__c',   text: '3-year financial trajectory stability' },
            { id: '5.2', tag: 'all', ratingField: 'D5_IncrementEstimate_Rating__c',    commentField: 'D5_IncrementEstimate_Comment__c',    text: 'Wadhwani Grants absorbable within 12 months' },
            { id: '5.3', tag: 'all', ratingField: 'D5_OperatingInfra_Rating__c',       commentField: 'D5_OperatingInfra_Comment__c',       text: 'Operating infrastructure capability' }
        ]
    },
    {
        id: 6, title: 'Measurement readiness',
        questions: [
            { id: '6.1', tag: 'all', ratingField: 'D6_MEFunction_Rating__c',            commentField: 'D6_MEFunction_Comment__c',            text: 'M&E function — people, systems, processes' },
            { id: '6.2', tag: 'all', ratingField: 'D6_ExternalVerification_Rating__c',  commentField: 'D6_ExternalVerification_Comment__c',  text: 'External verification of outcomes' },
            { id: '6.3', tag: 'all', ratingField: 'D6_LongitudinalTracking_Rating__c',  commentField: 'D6_LongitudinalTracking_Comment__c',  text: 'Longitudinal outcome tracking' }
        ]
    }
];

function filterQsByTrack(questions, track) {
    return questions.filter(q => {
        if (q.tag === 'all') return true;
        if (track === OUTCOME_JF)   return q.tag === 'jf';
        if (track === OUTCOME_JC)   return q.tag === 'jc';
        if (track === OUTCOME_BOTH) return q.tag === 'jf' || q.tag === 'jc';
        return true;
    });
}

export default class WcfReviewerFormPreview extends LightningElement {

    @api reviewId;
    @api outcomeDeveloperName = OUTCOME_BOTH;

    @track reviewRecord = null;
    @track isLoading    = true;

    connectedCallback() {
        if (this.reviewId) {
            this.loadReview();
        }
    }

    async loadReview() {
        this.isLoading = true;
        try {
            this.reviewRecord = await getReviewData({ reviewId: this.reviewId });
        } catch (e) {
            console.error('Error loading review data:', e);
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
            || null;
    }

    get dimensionSummary() {
        if (!this.reviewRecord) return [];
        const r = this.reviewRecord;
        return DIMS.map(dim => {
            const qs = filterQsByTrack(dim.questions, this.outcomeDeveloperName);
            const vals = qs.map(q => parseFloat(r[q.ratingField])).filter(v => !isNaN(v));
            const mean = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : '—';
            return {
                id: dim.id,
                title: dim.title,
                mean,
                questions: qs.map(q => {
                    const rating = r[q.ratingField] != null ? parseInt(r[q.ratingField], 10) : null;
                    const pipClass = rating != null ? `pip pip-r${rating}` : 'pip pip-empty';
                    return {
                        id:          q.id,
                        text:        q.text,
                        rating:      rating != null ? rating : '—',
                        ratingLabel: rating != null ? (RATING_LABEL[rating] || rating) : 'Not rated',
                        comment:     r[q.commentField] || null,
                        pipClass
                    };
                })
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