Map<String, Object> payload = new Map<String, Object>{
    'Id' => '0iTe10000000wATEAY',
    'Submitter_Name__c' => 'Thanmi G',
    'Job_Title__c' => 'test',
    'Organization_Name__c' => 'Quadrobay',
    'Headquarters_City_and_Country__c' => 'Tehran, Iran',
    'Primary_Service_Regions__c' => 'Tehran',
    'Leader_Name__c' => 'Thanmi G',
    'Leader_Title__c' => 'Director',
    'Work_Email_ID__c' => 'ntagro2021@gmail.com',
    'Phone__c' => '9876543210',
    'WG_Phone_Country_Code__c' => '+91',
    'Legal_Type__c' => 'Non-Profit',
    'Registration_Jurisdiction__c' => 'India',
    'Incorporation_Date__c' => '2026-09-02',
    'Legal_Structure__c' => 'Trust',
    'Revenue_Explanation__c' => 'Explanation'
};

WCFFormEngineController.SaveResult result = WCFFormEngineController.submitDynamicApplication(
    '0iTe10000000wATEAY',
    new List<String>{'JOB_FULFILLMENT'},
    JSON.serialize(payload)
);

System.debug(LoggingLevel.ERROR, 'SUBMIT_RESULT_SUCCESS: ' + result.isSuccess);
System.debug(LoggingLevel.ERROR, 'SUBMIT_RESULT_MESSAGE: ' + result.message);
System.debug(LoggingLevel.ERROR, 'SUBMIT_RESULT_RECORD_ID: ' + result.recordId);
