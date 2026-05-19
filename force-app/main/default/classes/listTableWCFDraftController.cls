public class listTableWCFDraftController {
  
   @AuraEnabled(cacheable=true)
    public static List<IndividualApplication> getUserDraftApplications() {
        return [
            SELECT Id, Name, Organization_Name__c, Submitter_Name__c, Status, LastModifiedDate
            FROM IndividualApplication
            WHERE CreatedById = :UserInfo.getUserId()
              AND Status = 'Draft'
            ORDER BY LastModifiedDate DESC
        ];
    }
}