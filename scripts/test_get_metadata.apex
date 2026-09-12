WCFFormMetadataController.FormMetadataPayload res = WCFFormMetadataController.getFormMetadata('en_US', '03', '31');
for (WCFFormMetadataController.QuestionWrapper q : res.questions) {
    if (q.key != null && q.key.contains('VOLUNTEER')) {
        System.debug(LoggingLevel.ERROR, '>>> FOUND VOLUNTEER: key=' + q.key + ', isCustom=' + q.isCustom + ', sectionCode=' + q.sectionCode + ', displayType=' + q.displayType + ', label=' + q.label);
    }
}
