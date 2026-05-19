public with sharing class ProposalEvaluationController {
    
    // Wrapper to get user info (already correct)
    @AuraEnabled(cacheable=true)
    public static UserInfoWrapper getUserDetails() {
        User usr = [
            SELECT ContactId, Contact.AccountId, Contact.Name, Contact.Account.Name
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];
        
        UserInfoWrapper wrapper = new UserInfoWrapper();
        wrapper.contactId = usr.ContactId;
        wrapper.accountId = usr.Contact.AccountId;
        wrapper.contactName = usr.Contact.Name;
        wrapper.accountName = usr.Contact.Account.Name;
        
        return wrapper;
    }
    
    public class UserInfoWrapper {
        @AuraEnabled public String contactId;
        @AuraEnabled public String accountId;
        @AuraEnabled public String contactName;
        @AuraEnabled public String accountName;
    }
    
    @AuraEnabled
    public static Boolean hasAlreadyReviewed(String applicationId) {
        String userId = UserInfo.getUserId();
        
        List<ApplicationReview> reviews = [
            SELECT Id FROM ApplicationReview WHERE ApplicationId = :applicationId AND ReviewedById = :userId   LIMIT 1];        
        return !reviews.isEmpty(); // true if already reviewed
    }

    
    @AuraEnabled
    public static void saveEvaluation(
        String applicationId,
        String accountId,
        String contactId,
        String researchRating,
        String researchRemarks,
        String subAreaRating,
        String subAreaRemarks,
        String ecosystemRating,
        String ecosystemRemarks,
        String projectRating,
        String projectRemarks,
        String facilitiesRating,
        String facilitiesRemarks,
        String otherWeakness,
        String overallRemarks
    ) {
        if (String.isEmpty(applicationId) || String.isEmpty(accountId) || String.isEmpty(contactId)) {
            throw new AuraHandledException('Application, Account, and Contact IDs are required.');
        }
        
        ApplicationReview review = new ApplicationReview();
        review.ApplicationId = applicationId;
        review.Institution_Name__c = accountId;
        review.ReviewedById = UserInfo.getUserId();//contactId
        review.RecordTypeId = '012GA000000nZOxYAM'; //  012GA000000nZOxYAM 012F6000000UQi2IAG 012F6000000UQhxIAG
        
        review.Demonstration_of_overall_research_trans__c = researchRating;
        review.Research_Commercialization_Remarks__c = researchRemarks;
        review.Sub_Area_Rating__c = subAreaRating;
        review.Sub_Area_Remarks__c = subAreaRemarks;
        review.Ecosystem_Infra_Rating__c = ecosystemRating;
        review.Ecosystem_and_Infra_Remarks__c = ecosystemRemarks;
        review.Project_List_Quality_rating__c = projectRating;
        review.Project_List_Quality_remarks__c = projectRemarks;
        review.Facilities_Faculty_Rating__c = facilitiesRating;
        review.Facilities_Faculty_Remarks__c = facilitiesRemarks;
        review.Any_other_weaknesses_in_the_proposal__c = otherWeakness;
        review.Overall_Remarks__c = overallRemarks;
        
        insert review;
    }
    
}