WCFFormMetadataController.FormMetadataPayload p = WCFFormMetadataController.getFormMetadata('en_US', '03', '31');
System.debug(LoggingLevel.ERROR, 'TOTAL_QUESTIONS: ' + p.questions.size());
for (WCFFormMetadataController.QuestionWrapper q : p.questions) {
    if (q.isCustom) {
        System.debug(LoggingLevel.ERROR, 'CUSTOM_QUESTION: key=' + q.key + ' | label=' + q.label + ' | type=' + q.displayType + ' | sec=' + q.sectionCode + ' | field=' + q.targetField);
    }
}
