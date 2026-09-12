WCFFormMetadataController.FormMetadataPayload meta = WCFFormMetadataController.getFormMetadata('en_US', '03', '31');
for (WCFFormMetadataController.QuestionWrapper q : meta.questions) {
    if (q.key != null && (q.key.contains('Submit') || q.key.contains('Q3'))) {
        System.debug(LoggingLevel.ERROR, 'Q_DEBUG: key=' + q.key 
            + ' | label=' + q.label 
            + ' | targetField=' + q.targetField 
            + ' | sectionCode=' + q.sectionCode 
            + ' | isCustom=' + q.isCustom 
            + ' | displayType=' + q.displayType);
    }
}
