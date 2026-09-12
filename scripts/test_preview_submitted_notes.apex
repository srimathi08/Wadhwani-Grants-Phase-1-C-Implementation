WCFValidatorController.WCFPreviewWrapper preview = WCFValidatorController.getWCFFullPreviewData('0iTe10000000w7FEAQ');
System.debug(LoggingLevel.ERROR, 'APP_SUBMITTER_NAME: ' + preview.application.Submitter_Name__c);
System.debug(LoggingLevel.ERROR, 'APP_JOB_TITLE: ' + preview.application.Job_Title__c);
try {
    System.debug(LoggingLevel.ERROR, 'APP_SUBMITTED_NOTES: ' + preview.application.get('Submitted_notes__c'));
} catch (Exception e) {
    System.debug(LoggingLevel.ERROR, 'ERROR_GETTING_SUBMITTED_NOTES: ' + e.getMessage());
}
Map<String, Object> fieldsMap = preview.application.getPopulatedFieldsAsMap();
System.debug(LoggingLevel.ERROR, 'ALL_POPULATED_FIELDS: ' + JSON.serialize(fieldsMap.keySet()));
