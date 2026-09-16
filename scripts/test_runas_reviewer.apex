// Check CustomObject permissions for Custom Metadata
// In Salesforce, Custom Metadata Type permissions in PermissionSet are stored in CustomMetadataTypeAccess / SetupEntityAccess or SOQL
// In Apex 'without sharing', SOQL on Custom Metadata works automatically once Apex Class has access.

// Let's test running as the Reviewer user to be 100% sure!
User reviewerUser = [SELECT Id, Name, Username FROM User WHERE Profile.Name = 'WCF Reviewer' AND IsActive = true LIMIT 1];
System.debug('Testing as Reviewer User: ' + reviewerUser.Username);

System.runAs(reviewerUser) {
    Map<String, Object> res = WCFReviewerMetadataController.getReviewerFormV5Metadata('Both');
    System.debug('RUNAS REVIEWER RESULT SUCCESS: ' + res.get('success'));
    System.debug('RUNAS REVIEWER RESULT ERROR: ' + res.get('errorMessage'));
    System.debug('RUNAS REVIEWER RESULT TOTAL Q: ' + res.get('totalQuestions'));
    List<Object> cats = (List<Object>)res.get('categories');
    System.debug('RUNAS REVIEWER RESULT CATS SIZE: ' + (cats != null ? cats.size() : 0));
}
