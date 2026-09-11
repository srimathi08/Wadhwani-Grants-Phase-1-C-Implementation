Account acc = [SELECT Id FROM Account LIMIT 1];
Contact c = [SELECT Id FROM Contact LIMIT 1];
FundingOpportunity fo = [SELECT Id FROM FundingOpportunity WHERE Status = 'Active' AND FO_Type__c = 'WCF Proposal' AND RecordType.DeveloperName = 'WCF_Project_Proposal' LIMIT 1];
RecordType wgRt = [SELECT Id FROM RecordType WHERE SObjectType = 'IndividualApplication' AND DeveloperName = 'Wadhwani_Grants' LIMIT 1];

IndividualApplication app = new IndividualApplication(
    AccountId = acc.Id,
    ContactId = c.Id,
    Principal_Investigator_PI__c = c.Id,
    OwnerId = UserInfo.getUserId(),
    Category = 'WCF Grant Application',
    Status = 'Draft',
    RecordTypeId = wgRt.Id,
    FundingOpportunityId = fo.Id,
    Organizational_Area_s_for_Funding_Inves__c = 'Both Job Fulfillment and Job Creation',
    Organizational_Area_s_for_Funding_Inves1__c = 'Job Fulfillment;Job Creation;Livelihood'
);

try {
    insert app;
    System.debug('✅ BASIC INSERT PASSED! ID=' + app.Id);
} catch (Exception e) {
    System.debug('❌ BASIC INSERT FAILED: ' + e.getMessage());
}
