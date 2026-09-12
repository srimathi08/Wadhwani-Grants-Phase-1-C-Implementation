Id appId = '0iTe10000000wC5EAI';
WCFValidatorController.WCFPreviewWrapper data = WCFValidatorController.getWCFFullPreviewData(appId);
WCFFormMetadataController.FormMetadataPayload meta = WCFFormMetadataController.getFormMetadata('en_US', '03', '31');

System.debug(LoggingLevel.ERROR, 'APP_SUBMITTED_NOTES_FIELD: ' + data.application.Submitted_notes__c);
System.debug(LoggingLevel.ERROR, 'APP_KEYS: ' + data.application.getPopulatedFieldsAsMap().keySet());

for (WCFFormMetadataController.QuestionWrapper q : meta.questions) {
    if (q.key == 'Q3_Submitted_notes') {
        System.debug(LoggingLevel.ERROR, 'Q3_META_KEY: ' + q.key);
        System.debug(LoggingLevel.ERROR, 'Q3_META_TARGET_FIELD: ' + q.targetField);
        System.debug(LoggingLevel.ERROR, 'Q3_META_IS_CUSTOM: ' + q.isCustom);
        System.debug(LoggingLevel.ERROR, 'Q3_META_SECTION_CODE: ' + q.sectionCode);
        
        Object val = data.application.get(q.targetField);
        System.debug(LoggingLevel.ERROR, 'EVALUATED_VAL: ' + val);
    }
}
