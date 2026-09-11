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
    Organizational_Area_s_for_Funding_Inves1__c = 'Job Fulfillment;Job Creation;Livelihood'
);

Map<String, Object> testFields = new Map<String, Object>{
    'Organization_Name__c' => 'Test Org',
    'Work_Email_ID__c' => 'test@example.com',
    'Submitter_Name__c' => 'Test Submitter',
    'Job_Title__c' => 'CEO',
    'Phone__c' => '1234567890',
    'Headquarters_City_and_Country__c' => 'Chennai, India',
    'Primary_Service_Regions__c' => 'India',
    'Leader_Name__c' => 'Leader',
    'Leader_Title__c' => 'CEO',
    'Legal_Type__c' => 'Non-profit',
    'Registration_Jurisdiction__c' => 'India',
    'Legal_Structure__c' => 'Structure',
    'Has_501c3_Status__c' => 'No',
    'Has_Equivalency_Determination__c' => 'No',
    'Is_FCRA_Registered__c' => 'Yes',
    'Willing_to_Pursue_ED__c' => 'Yes',
    'Fiscal_Month__c' => '03',
    'Fiscal_Day__c' => '31',
    'Skilling_Approach__c' => 'Skilling',
    'Job_Creation_Approach__c' => 'Job creation',
    'Livelihood_Approach__c' => 'Livelihood',
    'Organizational_Sustainability__c' => 'Sustainability',
    'Use_of_Additional_Funding__c' => 'Funding',
    'GenieAI_Interest_Level__c' => 'Yes, interested',
    'Operational_Synergies_with_WOF__c' => 'Synergies'
};

System.debug('=== DIAGNOSING FIELD ASSIGNMENTS ONE BY ONE ===');
for (String f : testFields.keySet()) {
    try {
        app.put(f, testFields.get(f));
    } catch (Exception ex) {
        System.debug('FAIL PUT ON FIELD ' + f + ': ' + ex.getMessage());
    }
}

try {
    insert app;
    System.debug('✅ DIAGNOSTIC INSERT SUCCESSFUL! RecordId=' + app.Id);
} catch (Exception ex) {
    System.debug('❌ DIAGNOSTIC INSERT FAILED: ' + ex.getMessage());
}
