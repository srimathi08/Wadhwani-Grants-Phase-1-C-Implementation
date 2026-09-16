Map<String, Object> res = WCFReviewerMetadataController.getReviewerFormV5Metadata('Both');
System.debug('RESULT SUCCESS: ' + res.get('success'));
System.debug('RESULT ERROR: ' + res.get('errorMessage'));
System.debug('RESULT TOTAL Q: ' + res.get('totalQuestions'));
List<Object> cats = (List<Object>)res.get('categories');
System.debug('RESULT CATS SIZE: ' + (cats != null ? cats.size() : 0));

List<Reviewer_Category_v5__mdt> allCats = [SELECT Id, MasterLabel, DeveloperName, Category_Number__c, Sequence__c, Is_Active__c FROM Reviewer_Category_v5__mdt];
System.debug('DB CATS COUNT: ' + allCats.size());
for (Reviewer_Category_v5__mdt c : allCats) {
    System.debug('CAT: ' + c.DeveloperName + ' num=' + c.Category_Number__c + ' active=' + c.Is_Active__c);
}

List<Reviewer_Question_v5__mdt> allQs = [SELECT Id, MasterLabel, DeveloperName, Question_Id__c, Category_Number__c, Sequence__c, Is_Active__c FROM Reviewer_Question_v5__mdt];
System.debug('DB QS COUNT: ' + allQs.size());
for (Reviewer_Question_v5__mdt q : allQs) {
    System.debug('Q: ' + q.DeveloperName + ' qId=' + q.Question_Id__c + ' catNum=' + q.Category_Number__c + ' active=' + q.Is_Active__c);
}
