public class listTableDraftController {
    
   @AuraEnabled(cacheable=true)
    public static List<IndividualApplication> getUserDraftApplications() {
        return [
            SELECT Id, Name, Project_Title__c, Primary_Focus_Area__c, Status, LastModifiedDate
            FROM IndividualApplication
            WHERE CreatedById = :UserInfo.getUserId()
              AND Status = 'Draft'
            ORDER BY LastModifiedDate DESC
        ];
    }
}