try {
    List<String> tracks = new List<String>{ 'JOB_FULFILLMENT', 'JOB_CREATION', 'LIVELIHOOD' };
    Map<String, Object> payloadMap = new Map<String, Object>{
        'Organization_Name__c' => 'Test Engine Org ' + System.currentTimeMillis(),
        'Work_Email_ID__c' => 'priya.sharma@fullverification.org',
        'Submitter_Name__c' => 'Priya Sharma',
        'Job_Title__c' => 'Head of Grant Partnerships',
        'Phone__c' => '9876543210',
        'Headquarters_City_and_Country__c' => 'Chennai, India',
        'Primary_Service_Regions__c' => 'Tamil Nadu',
        'Leader_Name__c' => 'Dr. Rajesh Kumar',
        'Leader_Title__c' => 'CEO',
        'Legal_Type__c' => 'Non-Profit',
        'Registration_Jurisdiction__c' => 'India',
        'Legal_Structure__c' => 'Section 8 Non-Profit',
        'Has_501c3_Status__c' => 'No',
        'Has_Equivalency_Determination__c' => 'No',
        'Is_FCRA_Registered__c' => 'Yes',
        'Willing_to_Pursue_ED__c' => 'Yes',
        'Fiscal_Month__c' => '03',
        'Fiscal_Day__c' => '31',
        'Skilling_Approach__c' => 'Comprehensive technical skilling',
        'Job_Creation_Approach__c' => 'Incubation of micro-enterprises',
        'Livelihood_Approach__c' => 'Climate-resilient agriculture',
        'Organizational_Sustainability__c' => 'Diverse CSR funding',
        'Use_of_Additional_Funding__c' => 'Expand centers to 5 cities',
        'GenieAI_Interest_Level__c' => 'Yes, interested',
        'Operational_Synergies_with_WOF__c' => 'GenieAI integration'
    };

    String payloadJson = JSON.serialize(payloadMap);

    System.debug('=== TESTING saveDynamicDraft ===');
    WCFFormEngineController.SaveResult draftRes = WCFFormEngineController.saveDynamicDraft(null, tracks, payloadJson);
    System.debug('DRAFT RESULT: isSuccess=' + draftRes.isSuccess + ', RecordId=' + draftRes.recordId + ', Message=' + draftRes.message);

    if (draftRes.isSuccess) {
        IndividualApplication app = [
            SELECT Id, RecordType.DeveloperName, Organizational_Area_s_for_Funding_Inves1__c, Status, Category, ContactId
            FROM IndividualApplication WHERE Id = :draftRes.recordId
        ];
        System.debug('SAVED DRAFT RECORD ID: ' + app.Id);
        System.debug('SAVED DRAFT RECORD TYPE: ' + app.RecordType.DeveloperName);
        System.debug('SAVED DRAFT FUNDING TRACKS: ' + app.Organizational_Area_s_for_Funding_Inves1__c);
        System.debug('SAVED DRAFT STATUS: ' + app.Status);

        System.debug('=== TESTING submitDynamicApplication ===');
        WCFFormEngineController.SaveResult submitRes = WCFFormEngineController.submitDynamicApplication(app.Id, tracks, payloadJson);
        System.debug('SUBMIT RESULT: isSuccess=' + submitRes.isSuccess + ', RecordId=' + submitRes.recordId + ', Message=' + submitRes.message);

        IndividualApplication submittedApp = [
            SELECT Id, RecordType.DeveloperName, Organizational_Area_s_for_Funding_Inves1__c, Status, IsSubmitted
            FROM IndividualApplication WHERE Id = :submitRes.recordId
        ];
        System.debug('SUBMITTED RECORD ID: ' + submittedApp.Id);
        System.debug('SUBMITTED RECORD TYPE: ' + submittedApp.RecordType.DeveloperName);
        System.debug('SUBMITTED FUNDING TRACKS: ' + submittedApp.Organizational_Area_s_for_Funding_Inves1__c);
        System.debug('SUBMITTED STATUS: ' + submittedApp.Status);
    }
} catch (Exception e) {
    System.debug('❌ ENGINE TEST FAILED: ' + e.getMessage() + ' | Stack: ' + e.getStackTraceString());
}
