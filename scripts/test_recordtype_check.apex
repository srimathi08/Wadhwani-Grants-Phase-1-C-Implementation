WCFFormEngineController.SaveResult draftRes = WCFFormEngineController.saveDynamicDraft(
    null,
    new List<String>{ 'JOB_FULFILLMENT' },
    '{"Organization_Name__c":"Test Wadhwani Org","Submitter_Name__c":"Test User"}'
);

System.debug('DRAFT_RESULT: ' + draftRes.isSuccess + ' | ID: ' + draftRes.recordId);

if (draftRes.recordId != null) {
    IndividualApplication app = [SELECT Id, Name, Status, RecordType.Name, RecordType.DeveloperName FROM IndividualApplication WHERE Id = :draftRes.recordId];
    System.debug(LoggingLevel.ERROR, 'CREATED_APP_RECORD_TYPE_NAME: ' + app.RecordType.Name);
    System.debug(LoggingLevel.ERROR, 'CREATED_APP_RECORD_TYPE_DEVNAME: ' + app.RecordType.DeveloperName);
    
    // Clean up test record
    delete [SELECT Id FROM IndividualApplication WHERE Id = :draftRes.recordId];
}
