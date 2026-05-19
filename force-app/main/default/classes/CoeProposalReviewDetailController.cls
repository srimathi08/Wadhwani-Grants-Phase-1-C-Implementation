public without sharing class CoeProposalReviewDetailController {

    public class ReviewWrapper {
        @AuraEnabled public Id reviewId;
        @AuraEnabled public String reviewName;
        @AuraEnabled public String reviewerName;
        @AuraEnabled public String totalScore;
        @AuraEnabled public String recommendation;
        @AuraEnabled public String recommendationClass;
    }

    public class ReviewDetailWrapper {
        @AuraEnabled public String reviewName;
        @AuraEnabled public String applicationId;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String reviewerName;
        @AuraEnabled public String totalScore;
        @AuraEnabled public String fundingRecommendation;
        @AuraEnabled public String fundingRecommendationClass;
        @AuraEnabled public String innovationNovelty;
        @AuraEnabled public String rationaleForScoring;
        @AuraEnabled public String commercialViability;
        @AuraEnabled public String commercialViabilityRationale;
        @AuraEnabled public String teamStrengthRationale;
        @AuraEnabled public String milestonePlanning;
        @AuraEnabled public String milestonePlanningJustification;
        @AuraEnabled public String milestonePlanningJustificationNWP;
        @AuraEnabled public String budgetAdequacy;
        @AuraEnabled public String budgetRequisiteJustification;
        @AuraEnabled public String budgetRequisiteJustificationUB;
        @AuraEnabled public String finalRecommendation;
        @AuraEnabled public String finalRecommendationClass;
        @AuraEnabled public String forWINTeam;
        @AuraEnabled public String communicateToPI;
    }

    /* =====================================================
       FETCH REVIEWS FOR PROPOSAL
    ===================================================== */

    @AuraEnabled(cacheable=true)
    public static List<ReviewWrapper> getProposalReviews(Id proposalId) {

        List<ReviewWrapper> result = new List<ReviewWrapper>();

        if (proposalId == null) {
            return result;
        }

        List<ApplicationReview> reviews = [
            SELECT Id,
                   Name,
                   Reviewer__r.Name,
                   Total_Score__c,
                   Final_recommendation_ExternalReviewer__c
            FROM ApplicationReview
            WHERE ApplicationId = :proposalId
            AND Reviewer__c != NULL
            ORDER BY CreatedDate DESC
        ];

        for (ApplicationReview ar : reviews) {

            ReviewWrapper rw = new ReviewWrapper();

            rw.reviewId = ar.Id;
            rw.reviewName = ar.Name;

            rw.reviewerName = ar.Reviewer__r != null
                ? ar.Reviewer__r.Name
                : 'Unknown';

            rw.totalScore = ar.Total_Score__c != null
                ? String.valueOf(ar.Total_Score__c)
                : '-';

            String rec = ar.Final_recommendation_ExternalReviewer__c;

            rw.recommendation = String.isNotBlank(rec) ? rec : 'Pending';

            if (rec == 'Recommended for Funding') {
                rw.recommendationClass = 'status-recommended';
            }
            else if (rec == 'Not Recommended for Funding') {
                rw.recommendationClass = 'status-not-recommended';
            }
            else {
                rw.recommendationClass = 'status-neutral';
            }

            result.add(rw);
        }

        return result;
    }

    /* =====================================================
       FETCH REVIEW DETAIL
    ===================================================== */

    @AuraEnabled(cacheable=true)
    public static ReviewDetailWrapper getReviewDetail(Id reviewId) {

        if (reviewId == null) {
            return null;
        }

        List<ApplicationReview> reviews = [
            SELECT Id,
                   Name,
                   ApplicationId,
                   Application.Name,
                   Reviewer__r.Name,
                   Total_Score__c,
                   Innovation_Novelty__c,
                   Rationale_for_Scoring__c,
                   Commercial_Viability__c,
                   Commercial_viability_Rationale__c,
                   Team_Strength_and_Expertise_Rationale__c,
                   Milestone_Planning__c,
                   Milestone_Planning_Justification__c,
                   Milestone_Planning_Justification_NWP__c,
                   Budget_Requisite__c,
                   Budget_Requisite_Justification__c,
                   Budget_Requisite_Justification_UB__c,
                   Final_recommendation_ExternalReviewer__c,
                   ForWINTeam__c,
                   CommunicateToPI__c
            FROM ApplicationReview
            WHERE Id = :reviewId
            LIMIT 1
        ];

        if (reviews.isEmpty()) {
            return null;
        }

        ApplicationReview ar = reviews[0];

        ReviewDetailWrapper w = new ReviewDetailWrapper();

        w.reviewName = ar.Name;
        w.applicationId = ar.ApplicationId;
        w.applicationName = ar.Application != null ? ar.Application.Name : '';
        w.reviewerName = ar.Reviewer__r != null ? ar.Reviewer__r.Name : '';

        w.totalScore = ar.Total_Score__c != null
            ? String.valueOf(ar.Total_Score__c)
            : '-';

        w.innovationNovelty = ar.Innovation_Novelty__c != null
            ? String.valueOf(ar.Innovation_Novelty__c)
            : '-';

        w.rationaleForScoring = ar.Rationale_for_Scoring__c;

        w.commercialViability = ar.Commercial_Viability__c != null
            ? String.valueOf(ar.Commercial_Viability__c)
            : '-';

        w.commercialViabilityRationale = ar.Commercial_viability_Rationale__c;
        w.teamStrengthRationale = ar.Team_Strength_and_Expertise_Rationale__c;

        w.milestonePlanning = ar.Milestone_Planning__c;
        w.milestonePlanningJustification = ar.Milestone_Planning_Justification__c;
        w.milestonePlanningJustificationNWP = ar.Milestone_Planning_Justification_NWP__c;

        w.budgetAdequacy = ar.Budget_Requisite__c;
        w.budgetRequisiteJustification = ar.Budget_Requisite_Justification__c;
        w.budgetRequisiteJustificationUB = ar.Budget_Requisite_Justification_UB__c;

        String rec = ar.Final_recommendation_ExternalReviewer__c;

        w.fundingRecommendation = String.isNotBlank(rec) ? rec : '-';

        if (rec == 'Recommended for Funding') {
            w.fundingRecommendationClass = 'status-recommended';
        }
        else if (rec == 'Not Recommended for Funding') {
            w.fundingRecommendationClass = 'status-not-recommended';
        }
        else {
            w.fundingRecommendationClass = 'status-neutral';
        }

        w.finalRecommendation = w.fundingRecommendation;
        w.finalRecommendationClass = w.fundingRecommendationClass;

        w.forWINTeam = ar.ForWINTeam__c;
        w.communicateToPI = ar.CommunicateToPI__c;

        return w;
    }
}