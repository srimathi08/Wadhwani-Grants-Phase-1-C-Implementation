public with sharing class OutcomeDataFilesController {
    @AuraEnabled(cacheable=true)
    public static List<ContentDocumentLink> getFiles(Id individualAppId) {
        // Query all child Outcome_Data__c records
        List<Id> outcomeIds = new List<Id>();
        for(Outcomes_Data__c od : [
            SELECT Id 
            FROM Outcomes_Data__c 
            WHERE Proposal__c = :individualAppId
        ]) {
            outcomeIds.add(od.Id);
        }
        
        if(outcomeIds.isEmpty()) return new List<ContentDocumentLink>();

        // Get files linked to Outcome Data
        return [
            SELECT Id, ContentDocumentId, 
                   ContentDocument.Title, 
                   ContentDocument.FileType,
                   ContentDocument.LatestPublishedVersionId
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN :outcomeIds
        ];
    }
}