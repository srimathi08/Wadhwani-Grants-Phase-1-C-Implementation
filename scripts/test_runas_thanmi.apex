User u = [SELECT Id FROM User WHERE Account.Name LIKE '%Thanmi%' OR Name LIKE '%Thanmi%' LIMIT 1];

System.runAs(u) {
    WCFFormEngineController.DynamicDraftWrapper wrap = WCFFormEngineController.getDynamicDraft(null);
    System.debug('Submitter_Name__c: ' + wrap.formValues.get('Submitter_Name__c'));
    System.debug('Organization_Name__c: ' + wrap.formValues.get('Organization_Name__c'));
}
