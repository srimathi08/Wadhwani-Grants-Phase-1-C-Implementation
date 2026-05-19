public without sharing class ApplicationReviewExternalController {
    
    @AuraEnabled
public static void saveApplicationReview(String Level2DataJson) {
    if (String.isBlank(Level2DataJson)) {
        throw new AuraHandledException('No data received for saving.');
    }

    try {
        ApplicationReview review = (ApplicationReview) JSON.deserialize(Level2DataJson, ApplicationReview.class);
        review.RecordTypeId = '012F6000000UQi2IAG'; // 012F6000000UQi2IAG 012GA000000nZP2YAM
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
              AND RecordTypeId = '012F6000000UQi2IAG' 
            LIMIT 1
        ];// 012F6000000UQi2IAG 012GA000000nZP2YAM

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
                SELECT Id, Name, Project_Title__c, RecordTypeId,
                         AccountId, Account.Name,
                       COE_Admin__c, PI_Name__c, Co_Principal_Investigator_Co_PI__c,Primary_Focus_Area__c,Sub_Focus_Area__c
                FROM IndividualApplication
                WHERE Id = :recordId
                LIMIT 1
            ]; // Institution_Name__c  Institution_Name__r.Name

            IndividualApplicationWrapper wrap = new IndividualApplicationWrapper();
            wrap.recordId = app.Id;
            wrap.applicationName = app.Name;
            wrap.projectTitle = app.Project_Title__c;
            wrap.institutionId = app.AccountId;//app.Institution_Name__c
            wrap.institutionName = (app.Account.Name != null) ? app.Account.Name : '';
            wrap.principalInvestigatorName = app.PI_Name__c;
            wrap.coPrincipalInvestigator = app.Co_Principal_Investigator_Co_PI__c;
            wrap.primaryFocusArea = app.Primary_Focus_Area__c;
            wrap.subFocusArea = app.Sub_Focus_Area__c;
            wrap.recordTypeId = app.RecordTypeId;
           

            return wrap;
        } catch (Exception e) {
            System.debug('Error fetching record: ' + e.getMessage());
            throw new AuraHandledException('Error fetching record: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static ApplicationReview saveDraftReview(String Level2DataJson) {
        if (String.isBlank(Level2DataJson)) {
            throw new AuraHandledException('No data received for saving.');
        }
        
        ApplicationReview review = (ApplicationReview) JSON.deserialize(Level2DataJson, ApplicationReview.class);
        review.RecordTypeId = '012F6000000UQi2IAG'; // 012F6000000UQi2IAG 012GA000000nZP2YAM
        review.ReviewedById = UserInfo.getUserId();
        review.IsSubmitted = false;
        review.Status = 'Draft';
        
        List<ApplicationReview> existingDraft = [
            SELECT Id FROM ApplicationReview
            WHERE ApplicationId = :review.ApplicationId
            AND ReviewedById = :review.ReviewedById
            AND status = 'Draft'
            AND RecordTypeId = '012F6000000UQi2IAG'  
            LIMIT 1
        ];// 012F6000000UQi2IAG 012GA000000nZP2YAM
        
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
        SELECT Id, ApplicationId, Institution_Name__c, Focus_Area__c, Sub_Focus_Area__c,
               Does_the_Focus_and_Sub_Focus_area_fall_w__c, Innovation_Novelty__c, Commercial_viability_Rationale__c,
               PI_Name__c, Co_Principal_Investigators_PI__c,Institution_Name__r.Name,Market_Potential_Rationale__c,Final_recommendation_Not_recommended__c,
               Commercial_Viability__c,  Market_Potential__c,Social_Impact__c, Social_Impact_Rationale__c, Milestone_Planning_Remarks__c,
               External_Funding_Potential__c,Team_Strength_and_Expertise__c, External_Funding_Potential_Rationale__c,Budget_Adequacy_Remarks__c,Milestone_Planning_Justification__c,
               Total_Score__c, Milestone_Planning__c, Overall_Remarks__c, Rationale_for_Scoring__c, Team_Strength_and_Expertise_Rationale__c, Budget_Requisite_Justification__c,            
               Budget_Requisite__c, Final_recommendation_ExternalReviewer__c, ForWINTeam__c, CommunicateToPI__c, Status, Milestone_Planning_Justification_NWP__c, Budget_Requisite_Justification_UB__c
        FROM ApplicationReview
        WHERE ApplicationId = :applicationId
          AND ReviewedById = :userId
          AND RecordTypeId = '012F6000000UQi2IAG'
          AND Status = 'Draft'
        LIMIT 1
    ]; // 012F6000000UQi2IAG 012GA000000nZP2YAM

   if (!draftReviews.isEmpty()) {
        return draftReviews[0];
    }
    return null;
}

    
    @AuraEnabled
    public static Boolean hasAlreadyReviewed(String applicationId) {
        String userId = UserInfo.getUserId();
        
        List<ApplicationReview> existingReviews = [
            SELECT Id FROM ApplicationReview WHERE ApplicationId = :applicationId AND ReviewedById = :userId
            AND RecordTypeId = '012F6000000UQi2IAG' AND IsSubmitted = true
            LIMIT 1
        ]; //012F6000000UQi2IAG 012GA000000nZP2YAM
        
        //return !existingReviews.isEmpty();
        return !existingReviews.isEmpty(); // Only return true if a submitted record exists
    }


    // Wrapper Class for LWC
    public class IndividualApplicationWrapper {
        @AuraEnabled public String recordId;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String projectTitle;
        @AuraEnabled public String institutionName;
        @AuraEnabled public String institutionId;
        @AuraEnabled public String principalInvestigatorName;
        @AuraEnabled public String coPrincipalInvestigator;
        @AuraEnabled public String primaryFocusArea;
        @AuraEnabled public String subFocusArea;
        @AuraEnabled public String recordTypeId;
    }
}


 /* @AuraEnabled
    public static void saveApplicationReview(String Level2DataJson) {
        System.debug('DEBUG: Received JSON: ' + Level2DataJson);

        if (String.isBlank(Level2DataJson)) {
            throw new AuraHandledException('No data received for saving.');
        }

        try {
            // Deserialize JSON into an ApplicationReview object
            ApplicationReview Level2Data = (ApplicationReview) JSON.deserialize(Level2DataJson, ApplicationReview.class);
            System.debug('DEBUG: Deserialized ApplicationReview: ' + Level2Data);

            Level2Data.RecordTypeId = '012GA000000nZP2YAM'; // 012F6000000UQi2IAG 012GA000000nZP2YAM


             // Set ReviewedById to the logged-in user
        Level2Data.ReviewedById = UserInfo.getUserId(); 
       
         // Set IsSubmitted to true and SubmissionDate to today
         Level2Data.IsSubmitted = true;
         //Level2Data.SubmissionDate = Date.today();

            // Insert the record
            insert Level2Data;

            System.debug('DEBUG: Successfully inserted ApplicationReview record with Id: ' + Level2Data.Id);
        } catch (Exception e) {
            System.debug('DEBUG: Error saving ApplicationReview record: ' + e.getMessage());
            throw new AuraHandledException('Error saving record: ' + e.getMessage());
        }
    } */