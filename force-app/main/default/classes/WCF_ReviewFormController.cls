public without sharing class WCF_ReviewFormController {
     @AuraEnabled
public static void saveApplicationReview(String reviewDataJson) {
    if (String.isBlank(reviewDataJson)) {
        throw new AuraHandledException('No data received for saving.');
    }

    try {
        ApplicationReview review = (ApplicationReview) JSON.deserialize(reviewDataJson, ApplicationReview.class);
        review.RecordTypeId = '012F6000000USP8IAO'; // 012F6000000USP8IAO - JC
        review.ReviewedById = UserInfo.getUserId();
        review.IsSubmitted = true;
        review.Status = 'Review Submitted';
        review.EndDate = date.Today();

        // 🔁 Check for existing draft
        List<ApplicationReview> existingDraft = [
            SELECT Id FROM ApplicationReview
            WHERE ApplicationId = :review.ApplicationId
              AND ReviewedById = :review.ReviewedById
              AND Status = 'Draft'
              AND RecordTypeId = '012F6000000USP8IAO' 
            LIMIT 1
        ];//  012F6000000USP8IAO - jc

        if (!existingDraft.isEmpty()) {
            update review;
            review.Id = existingDraft[0].Id;
        } else {
            insert review;
        }

    } catch (Exception e) {
        throw new AuraHandledException('Error saving record: ' + e.getMessage());
    }
}

    @AuraEnabled(cacheable=true)
    public static IndividualApplicationWrapper getIndividualApplication(Id recordId) {
        try {
            System.debug('getIndividualApplication called with recordId: ' + recordId);
            
            if (recordId == null) {
                throw new AuraHandledException('Record ID is required.');
            }

            IndividualApplication app = [
                SELECT Id, Name, Organizational_Area_s_for_Funding_Inves__c,RecordTypeId FROM IndividualApplication
                WHERE Id = :recordId LIMIT 1];

            IndividualApplicationWrapper wrap = new IndividualApplicationWrapper();
            wrap.recordId = app.Id;
            //wrap.applicationName = app.Name;
            wrap.OrgAreaArea = app.Organizational_Area_s_for_Funding_Inves__c;
            wrap.recordTypeId = app.RecordTypeId;
           

            return wrap;
        } catch (Exception e) {
            System.debug('Error fetching record: ' + e.getMessage());
            throw new AuraHandledException('Error fetching record: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static ApplicationReview saveDraftReview(String reviewDataJson) {
        if (String.isBlank(reviewDataJson)) {
            throw new AuraHandledException('No data received for saving.');
        }
        
        ApplicationReview review = (ApplicationReview) JSON.deserialize(reviewDataJson, ApplicationReview.class);
        review.RecordTypeId = '012F6000000USP8IAO'; // 012F6000000UQi2IAG 012GA000000nZP2YAM
        review.ReviewedById = UserInfo.getUserId();
        review.IsSubmitted = false;
        review.Status = 'Draft';
        
        List<ApplicationReview> existingDraft = [
            SELECT Id FROM ApplicationReview
            WHERE ApplicationId = :review.ApplicationId
            AND ReviewedById = :review.ReviewedById
            AND status = 'Draft'
            AND RecordTypeId = '012F6000000USP8IAO'  
            LIMIT 1
        ];// 012F6000000USP8IAO - JC
        
        if (!existingDraft.isEmpty()) {
            review.Id = existingDraft[0].Id;
            update review;
        } else {
            insert review;
        }
        
        return review;
    }

    
  @AuraEnabled(cacheable=false)
public static ApplicationReview getDraftReviewRecord(Id applicationId) {
    String userId = UserInfo.getUserId();
    
    List<ApplicationReview> draftReviews  = [
        SELECT Id, ApplicationId, ReviewedById, Status, Rate_financial_stability_over_3_years__c, Financial_Stability_Comments_3Y__c,
        Financial_records_credible_complete__c, Financial_Records_Comments__c, How_strong_is_the_sustainability_vision__c,
        Sustainability_Plan_Comments__c, Program_alignment_with_WCF_priorities__c, Program_Job_Alignment_WCF_Comments__c,Measurable_Business_Creation_Comments__c,
        Org_scale_vs_funding_goals__c,  Org_Scale_vs_WCF_Strategy_Comments__c, X1M_plan_clear_feasible_linked__c,Business_Creation_Growth_Effectiveness__c,
         Proposed_1M_Funding_Use_Comments__c,Estimated_Jobs_with_WCF_Funding__c,Estd_job_placements_comments__c,Recommendation_Strength_Comments__c,
         Rationale_for_Added_Placements_Comments__c, GenieAI_adoption_potential__c,Strength_of_non_recommendation__c,Non_Recommendation_Strength_Comments__c,
        GenieAI_Adoption_Strength_Comments__c, Skilling_model_clarity_innovation__c, Model_Articulation_Innovation_Comments__c,
        X3yr_enrollment_placement_credibility__c,  Enrollment_Placement_Credibility_Comment__c, Cost_placement_vs_benchmark__c,
        Cost_Per_Placement_Benchmarks_Comments__c,Evidence_of_validation_long_term_jobs__c, Evidence_of_Validation_Jobs_Comments__c,
      Recommend_for_CEO_review__c, Strength_of_recommendation__c, Top_3_proposal_strengths_ranked__c, Top_3_proposal_weaknesses_ranked__c                                   
        FROM ApplicationReview
        WHERE ApplicationId = :applicationId
          AND ReviewedById = :userId
          AND RecordTypeId = '012F6000000USP8IAO'
          AND Status = 'Draft'
        LIMIT 1
    ]; // 012F6000000USP8IAO - JC

   if (!draftReviews.isEmpty()) {
        return draftReviews[0];
    }
    return null;
}

    
    @AuraEnabled
    public static Boolean hasAlreadyReviewed(String applicationId) {
        String userId = UserInfo.getUserId();
        
        List<ApplicationReview> existingReviews = [
            SELECT Id,ApplicationId FROM ApplicationReview WHERE ApplicationId = :applicationId AND ReviewedById = :userId
            AND RecordTypeId = '012F6000000USP8IAO' AND IsSubmitted = true
            LIMIT 1
        ]; 
        
        //return !existingReviews.isEmpty();
        return !existingReviews.isEmpty(); // Only return true if a submitted record exists
    }


    // Wrapper Class for LWC
    public class IndividualApplicationWrapper {
        @AuraEnabled public String recordId;
        //@AuraEnabled public String applicationName;
        @AuraEnabled public String OrgAreaArea;
        @AuraEnabled public String recordTypeId;
    }
}









/*public with sharing class WCF_ReviewFormController {

    // 1. Get Organizational Area (for section logic)
    @AuraEnabled(cacheable=true)
    public static ReviewSetupResponse getReviewSetup(String proposalId) {
        ReviewSetupResponse result = new ReviewSetupResponse();

        IndividualApplication app = [
                 WHERE Id = :proposalId LIMIT 1  ];
        result.area = app.Organizational_Area_s_for_Funding_Inves__c;
        return result;
    }

    public class ReviewSetupResponse {
        @AuraEnabled public String area;
    }

    // 2. Get review for this user & application (returns ApplicationReview if draft or submitted)
    @AuraEnabled(cacheable=true)
    public static ApplicationReview getExistingReview(Id applicationId) {
        List<ApplicationReview> reviews = [SELECT Id, ApplicationId, ReviewedById, Status, Rate_financial_stability_over_3_years__c, Financial_Stability_Comments_3Y__c,
                                           Financial_records_credible_complete__c, Financial_Records_Comments__c, How_strong_is_the_sustainability_vision__c,
                                           Sustainability_Plan_Comments__c, Program_alignment_with_WCF_priorities__c, Program_Job_Alignment_WCF_Comments__c,
                                           Org_scale_vs_funding_goals__c,  Org_Scale_vs_WCF_Strategy_Comments__c, X1M_plan_clear_feasible_linked__c,
                                           Proposed_1M_Funding_Use_Comments__c,Estimated_Jobs_with_WCF_Funding__c,Estd_job_placements_comments__c,
                                           Rationale_for_Added_Placements_Comments__c, GenieAI_adoption_potential__c,
                                           GenieAI_Adoption_Strength_Comments__c, Skilling_model_clarity_innovation__c, Model_Articulation_Innovation_Comments__c,
                                           X3yr_enrollment_placement_credibility__c,  Enrollment_Placement_Credibility_Comment__c, Cost_placement_vs_benchmark__c,
                                           Cost_Per_Placement_Benchmarks_Comments__c,Evidence_of_validation_long_term_jobs__c, Evidence_of_Validation_Jobs_Comments__c,
                                           Recommend_for_CEO_review__c, Strength_of_recommendation__c, Top_3_proposal_strengths_ranked__c,  Top_3_proposal_weaknesses_ranked__c,
                                           Strength_of_non_recommendation__c FROM ApplicationReview
                                           WHERE ApplicationId = :applicationId AND ReviewedById = :UserInfo.getUserId() LIMIT 1  ]; 
                             
        return reviews.isEmpty() ? null : reviews[0];
    }

    // 3. Insert or Update review (used for both Save Draft & Submit)
    @AuraEnabled
    public static ApplicationReview saveReview(ApplicationReview review) {
        if (String.isNotBlank(review.Id)) {
            update review;
        } else {
            insert review;
        }
        return review;
    }

    // 4. Get current userId (if needed)
    @AuraEnabled(cacheable=true)
    public static Id getUserId() {
        return UserInfo.getUserId();
    }

}*/