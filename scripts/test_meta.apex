WCFFormMetadataController.FormMetadataPayload p = WCFFormMetadataController.getFormMetadata('en_US', '03', '31');
System.debug('TOTAL QUESTIONS: ' + p.questions.size());
for (WCFFormMetadataController.QuestionWrapper q : p.questions) {
    if (q.isCustom) {
        System.debug('CUSTOM QUESTION FOUND: ' + q.key + ' | label: ' + q.label + ' | section: ' + q.sectionCode + ' | type: ' + q.displayType + ' | field: ' + q.targetField);
    }
}
