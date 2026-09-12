WCFFormMetadataController.FormMetadataPayload meta = WCFFormMetadataController.getFormMetadata('en_US', '03', '31');
for (WCFFormMetadataController.QuestionWrapper q : meta.questions) {
    if (q.key.contains('Submitted') || (q.targetField != null && q.targetField.contains('Submitted')) || (q.label != null && q.label.contains('submitter notes'))) {
        System.debug(LoggingLevel.ERROR, 'QUESTION_WRAPPER: ' + JSON.serialize(q));
    }
}
