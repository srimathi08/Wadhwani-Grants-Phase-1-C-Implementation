public with sharing class ApplicationReviewController {
    @AuraEnabled
public static void saveApplicationReview(ApplicationReview Level1Data) {
    System.debug('DEBUG: saveApplicationReview called with: ' + JSON.serialize(Level1Data));
    System.debug('Received Application Data: ' + Level1Data);
  

    if (Level1Data == null) {
        System.debug('DEBUG: No data received for saving.');
        throw new AuraHandledException('No data received for saving.');
    }

    try {

        // Level1Data.RecordTypeId = '012F6000000UQi2IAG'; //Project Proposal Review

Id recordTypeId = Schema.SObjectType.ApplicationReview
    .getRecordTypeInfosByName()
    .get('CEO Admin Project Proposal Review') //Project Proposal Review
    .getRecordTypeId();

Level1Data.RecordTypeId = recordTypeId;
// Set ReviewedById to the logged-in user
        Level1Data.ReviewedById = UserInfo.getUserId(); 

// ✅ Set Status field to "Review Submitted"
        Level1Data.Status = 'Review Submitted';

 Level1Data.IsSubmitted = true;

        insert Level1Data;
        System.debug('DEBUG: Successfully inserted record with Id: ' + Level1Data.Id);
    } catch (Exception e) {
        System.debug('DEBUG: Error saving record: ' + e.getMessage());
        throw new AuraHandledException('Error saving record: ' + e.getMessage());
    }
}


    @AuraEnabled(cacheable=true)
    public static IndividualApplicationWrapper getIndividualApplication(Id recordId) {
        try {
            System.debug('getIndividualApplication called with recordId: ' + recordId);
            
            if (recordId == null) {
                System.debug('Record ID is required but received null.');
                throw new AuraHandledException('Record ID is required.');
            }

            IndividualApplication app = [
                SELECT Id, Name,RecordTypeId, Project_Title__c,Co_Principal_Investigator_Co_PI__c,Primary_Focus_Area__c,
                  Sub_Focus_Area__c,AccountId, Account.Name,
                    COE_Admin__c, PI_Name__c  // Contact fields 
                FROM IndividualApplication
                WHERE Id = :recordId
                LIMIT 1
            ];

            System.debug('Queried IndividualApplication: ' + app);
            
            // Create Wrapper Instance
            IndividualApplicationWrapper wrap = new IndividualApplicationWrapper();
            wrap.recordId = app.Id;
            wrap.projectTitle = app.Project_Title__c;
            wrap.applicationName = app.Name;
            wrap.coPrincipalInvestigator = app.Co_Principal_Investigator_Co_PI__c;
            wrap.principalInvestigatorName = app.PI_Name__c;
            wrap.focusArea=app.Primary_Focus_Area__c;
            wrap.subFocusArea=app.Sub_Focus_Area__c;
             wrap.recordTypeId = app.RecordTypeId;


            // Fetch Institution Name from Account (Handling Null Values)
            wrap.institutionId = app.AccountId; // Stores the Account ID
            wrap.institutionName = (app.Account!= null) ? app.Account.Name : '';
            
            System.debug('Institution ID: ' + wrap.institutionId);
            System.debug('Institution Name: ' + wrap.institutionName);
            System.debug('Principal Investigator Name: ' + wrap.principalInvestigatorName);

            return wrap;
        } catch (Exception e) {
            System.debug('Error fetching record: ' + e.getMessage());
            throw new AuraHandledException('Error fetching record: ' + e.getMessage());
        }
    }

//To restrict the currently logged-in user to submitted Again for Level 1 review for a given application
@AuraEnabled(cacheable=true)
public static Boolean hasAlreadySubmittedLevel1Review(String applicationId) {
    String userId = UserInfo.getUserId();

    Id recordTypeId = Schema.SObjectType.ApplicationReview
        .getRecordTypeInfosByName()
        .get('CEO Admin Project Proposal Review')//Project Proposal Review
        .getRecordTypeId();

    List<ApplicationReview> existing = [
        SELECT Id FROM ApplicationReview
        WHERE ApplicationId = :applicationId
        AND ReviewedById = :userId
        AND RecordTypeId = :recordTypeId
        LIMIT 1
    ];

    return !existing.isEmpty();
}


    // Wrapper Class
    public class IndividualApplicationWrapper {
        @AuraEnabled public String recordId;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String projectTitle;
        @AuraEnabled public String institutionName;
        @AuraEnabled public String institutionId;  // Add Institution ID
        @AuraEnabled public String principalInvestigatorName;
        @AuraEnabled public String coPrincipalInvestigator;
        @AuraEnabled public String focusArea;
        @AuraEnabled public String subFocusArea;
      @AuraEnabled public String recordTypeId;
       
    }
}