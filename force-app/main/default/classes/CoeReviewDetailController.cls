public without sharing class CoeReviewDetailController {

    public class ReviewDetailWrapper {

        @AuraEnabled public String reviewName;
        @AuraEnabled public String applicationId;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String status;
        @AuraEnabled public String reviewerName;
        @AuraEnabled public String totalScore;

        @AuraEnabled public String innovationNovelty;
        @AuraEnabled public String innovationNoveltyHelp;

        @AuraEnabled public String rationaleForScoring;
        @AuraEnabled public String rationaleForScoringHelp;

        @AuraEnabled public String commercialViability;
        @AuraEnabled public String commercialViabilityHelp;

        @AuraEnabled public String commercialViabilityRationale;
        @AuraEnabled public String commercialViabilityRationaleHelp;

        @AuraEnabled public String marketPotential;
        @AuraEnabled public String marketPotentialHelp;

        @AuraEnabled public String marketPotentialRationale;
        @AuraEnabled public String marketPotentialRationaleHelp;

        @AuraEnabled public String socialImpact;
        @AuraEnabled public String socialImpactHelp;

        @AuraEnabled public String socialImpactRationale;
        @AuraEnabled public String socialImpactRationaleHelp;

        @AuraEnabled public String externalFundingPotential;
        @AuraEnabled public String externalFundingPotentialHelp;

        @AuraEnabled public String externalFundingPotentialRationale;
        @AuraEnabled public String externalFundingPotentialRationaleHelp;

        @AuraEnabled public String teamStrength;
        @AuraEnabled public String teamStrengthHelp;

        @AuraEnabled public String teamStrengthRationale;
        @AuraEnabled public String teamStrengthRationaleHelp;

        @AuraEnabled public String milestonePlanning;
        @AuraEnabled public String milestonePlanningHelp;

        @AuraEnabled public String milestonePlanningJustification;
        @AuraEnabled public String milestonePlanningJustificationHelp;

        @AuraEnabled public String milestonePlanningJustificationNWP;
        @AuraEnabled public String milestonePlanningJustificationNWPHelp;

        @AuraEnabled public String budgetAdequacy;
        @AuraEnabled public String budgetAdequacyHelp;

        @AuraEnabled public String budgetRequisiteJustification;
        @AuraEnabled public String budgetRequisiteJustificationHelp;

        @AuraEnabled public String budgetRequisiteJustificationUB;
        @AuraEnabled public String budgetRequisiteJustificationUBHelp;

        @AuraEnabled public String comment;
        @AuraEnabled public String commentHelp;

        @AuraEnabled public String fundingRecommendation;
        @AuraEnabled public String fundingRecommendationClass;

        @AuraEnabled public String finalRecommendation;
        @AuraEnabled public String finalRecommendationClass;

        @AuraEnabled public String finalRecommendationNotRecommended;
        @AuraEnabled public String finalRecommendationNotRecommendedHelp;

        @AuraEnabled public String forWINTeam;
        @AuraEnabled public String forWINTeamHelp;

        @AuraEnabled public String communicateToPI;
        @AuraEnabled public String communicateToPIHelp;
    }

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
                   Status,
                   Reviewer__r.Name,

                   Total_Score__c,

                   Innovation_Novelty__c,
                   Rationale_for_Scoring__c,

                   Commercial_Viability__c,
                   Commercial_viability_Rationale__c,

                   Market_Potential__c,
                   Market_Potential_Rationale__c,

                   Social_Impact__c,
                   Social_Impact_Rationale__c,

                   External_Funding_Potential__c,
                   External_Funding_Potential_Rationale__c,

                   Team_Strength_and_Expertise__c,
                   Team_Strength_and_Expertise_Rationale__c,

                   Milestone_Planning__c,
                   Milestone_Planning_Justification__c,
                   Milestone_Planning_Justification_NWP__c,

                   Budget_Requisite__c,
                   Budget_Requisite_Justification__c,
                   Budget_Requisite_Justification_UB__c,

                   Comment,

                   Final_recommendation_ExternalReviewer__c,
                   Final_recommendation_Not_recommended__c,

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
        w.status = ar.Status;
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

        w.marketPotential = ar.Market_Potential__c != null
            ? String.valueOf(ar.Market_Potential__c)
            : '-';

        w.marketPotentialRationale = ar.Market_Potential_Rationale__c;

        w.socialImpact = ar.Social_Impact__c != null
            ? String.valueOf(ar.Social_Impact__c)
            : '-';

        w.socialImpactRationale = ar.Social_Impact_Rationale__c;

        w.externalFundingPotential = ar.External_Funding_Potential__c != null
            ? String.valueOf(ar.External_Funding_Potential__c)
            : '-';

        w.externalFundingPotentialRationale =
            ar.External_Funding_Potential_Rationale__c;

        w.teamStrength = ar.Team_Strength_and_Expertise__c != null
            ? String.valueOf(ar.Team_Strength_and_Expertise__c)
            : '-';

        w.teamStrengthRationale = ar.Team_Strength_and_Expertise_Rationale__c;

        w.milestonePlanning = ar.Milestone_Planning__c;
        w.milestonePlanningJustification = ar.Milestone_Planning_Justification__c;
        w.milestonePlanningJustificationNWP =
            ar.Milestone_Planning_Justification_NWP__c;

        w.budgetAdequacy = ar.Budget_Requisite__c;
        w.budgetRequisiteJustification = ar.Budget_Requisite_Justification__c;
        w.budgetRequisiteJustificationUB =
            ar.Budget_Requisite_Justification_UB__c;

        w.comment = ar.Comment;

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

        w.finalRecommendationNotRecommended =
            ar.Final_recommendation_Not_recommended__c;

        w.forWINTeam = ar.ForWINTeam__c;
        w.communicateToPI = ar.CommunicateToPI__c;


        /* ---------- FETCH HELP TEXTS FROM FIELD METADATA ---------- */

        w.innovationNoveltyHelp =
            ApplicationReview.Innovation_Novelty__c.getDescribe().getInlineHelpText();

        w.rationaleForScoringHelp =
            ApplicationReview.Rationale_for_Scoring__c.getDescribe().getInlineHelpText();

        w.commercialViabilityHelp =
            ApplicationReview.Commercial_Viability__c.getDescribe().getInlineHelpText();

        w.commercialViabilityRationaleHelp =
            ApplicationReview.Commercial_viability_Rationale__c.getDescribe().getInlineHelpText();

        w.marketPotentialHelp =
            ApplicationReview.Market_Potential__c.getDescribe().getInlineHelpText();

        w.marketPotentialRationaleHelp =
            ApplicationReview.Market_Potential_Rationale__c.getDescribe().getInlineHelpText();

        w.socialImpactHelp =
            ApplicationReview.Social_Impact__c.getDescribe().getInlineHelpText();

        w.socialImpactRationaleHelp =
            ApplicationReview.Social_Impact_Rationale__c.getDescribe().getInlineHelpText();

        w.externalFundingPotentialHelp =
            ApplicationReview.External_Funding_Potential__c.getDescribe().getInlineHelpText();

        w.externalFundingPotentialRationaleHelp =
            ApplicationReview.External_Funding_Potential_Rationale__c.getDescribe().getInlineHelpText();

        w.teamStrengthHelp =
            ApplicationReview.Team_Strength_and_Expertise__c.getDescribe().getInlineHelpText();

        w.teamStrengthRationaleHelp =
            ApplicationReview.Team_Strength_and_Expertise_Rationale__c.getDescribe().getInlineHelpText();

        w.milestonePlanningHelp =
            ApplicationReview.Milestone_Planning__c.getDescribe().getInlineHelpText();

        w.milestonePlanningJustificationHelp =
            ApplicationReview.Milestone_Planning_Justification__c.getDescribe().getInlineHelpText();

        w.milestonePlanningJustificationNWPHelp =
            ApplicationReview.Milestone_Planning_Justification_NWP__c.getDescribe().getInlineHelpText();

        w.budgetAdequacyHelp =
            ApplicationReview.Budget_Requisite__c.getDescribe().getInlineHelpText();

        w.budgetRequisiteJustificationHelp =
            ApplicationReview.Budget_Requisite_Justification__c.getDescribe().getInlineHelpText();

        w.budgetRequisiteJustificationUBHelp =
            ApplicationReview.Budget_Requisite_Justification_UB__c.getDescribe().getInlineHelpText();

        w.commentHelp =
            ApplicationReview.Comment.getDescribe().getInlineHelpText();

        w.finalRecommendationNotRecommendedHelp =
            ApplicationReview.Final_recommendation_Not_recommended__c.getDescribe().getInlineHelpText();

        w.forWINTeamHelp =
            ApplicationReview.ForWINTeam__c.getDescribe().getInlineHelpText();

        w.communicateToPIHelp =
            ApplicationReview.CommunicateToPI__c.getDescribe().getInlineHelpText();

        return w;
    }
}