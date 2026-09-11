try {
    RecordType wgRt = [SELECT Id FROM RecordType WHERE SObjectType = 'IndividualApplication' AND DeveloperName = 'Wadhwani_Grants' LIMIT 1];
    User u = [SELECT Id, AccountId FROM User WHERE Id = :UserInfo.getUserId()];
    IndividualApplication app = new IndividualApplication(
        Category = 'WCF Grant Application',
        Status = 'Draft',
        RecordTypeId = wgRt.Id,
        AccountId = u.AccountId,
        Organizational_Area_s_for_Funding_Inves1__c = 'Job Fulfillment;Job Creation;Livelihood'
    );
    insert app;
    System.debug('SUCCESSFULLY INSERTED IA RECORD ID: ' + app.Id);
} catch (Exception e) {
    System.debug('INSERT ERROR: ' + e.getMessage() + ' | Stack: ' + e.getStackTraceString());
}
