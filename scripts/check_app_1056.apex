List<IndividualApplication> apps = [SELECT Id, Name, Submitter_Name__c, Job_Title__c, Submitted_notes__c, CreatedDate FROM IndividualApplication ORDER BY CreatedDate DESC LIMIT 3];
for (IndividualApplication app : apps) {
    System.debug(LoggingLevel.ERROR, 'APP: ' + app.Id + ' | Name: ' + app.Name + ' | Submitter: ' + app.Submitter_Name__c + ' | Submitted_notes: ' + app.Submitted_notes__c);
}
