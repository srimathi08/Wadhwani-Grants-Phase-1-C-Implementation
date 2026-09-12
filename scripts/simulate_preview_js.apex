Id appId = [SELECT Id FROM IndividualApplication WHERE Name = 'IA-0000001056' LIMIT 1].Id;
WCFValidatorController.WCFPreviewWrapper preview = WCFValidatorController.getWCFFullPreviewData(appId);
WCFFormMetadataController.FormMetadataPayload meta = WCFFormMetadataController.getFormMetadata('en_US', '03', '31');

System.debug(LoggingLevel.ERROR, 'APP_MAP keys: ' + preview.applicationData.keySet());
System.debug(LoggingLevel.ERROR, 'APP_MAP Submitted_notes__c: ' + preview.applicationData.get('Submitted_notes__c'));

for (WCFFormMetadataController.QuestionWrapper q : meta.questions) {
    if (q.isCustom == true && q.key != null && q.key.startsWith('Q3_')) {
        System.debug(LoggingLevel.ERROR, 'MATCHED_Q3_CUSTOM: key=' + q.key + ' targetField=' + q.targetField + ' sectionCode=' + q.sectionCode);
        Object val = preview.applicationData.get(q.targetField);
        System.debug(LoggingLevel.ERROR, 'VAL_BY_TARGET_FIELD: ' + val);
    }
}
