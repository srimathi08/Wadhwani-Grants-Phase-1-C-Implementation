for (IndividualApplication app : [SELECT Id, Name, Status, RecordTypeId, RecordType.Name, RecordType.DeveloperName, Is_Submitted__c, Submitter_Name__c, Job_Title__c, Work_Email_ID__c, Phone__c, CreatedDate FROM IndividualApplication ORDER BY CreatedDate DESC LIMIT 5]) {
    System.debug(LoggingLevel.ERROR, 'APP_RECORD: ' + JSON.serialize(app));
}
