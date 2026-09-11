@IsTest
private class WCFFormEngineControllerTest {

    @TestSetup
    static void setupTestData() {
        Id personAccountRtId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().containsKey('Reviewer')
            ? Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('Reviewer').getRecordTypeId()
            : null;

        Account acc;
        if (personAccountRtId != null) {
            acc = new Account(
                FirstName = 'Test',
                LastName = 'Applicant',
                PersonEmail = 'test@example.com',
                RecordTypeId = personAccountRtId
            );
        } else {
            acc = new Account(Name = 'Test Organization', Type = 'Grantee');
        }
        insert acc;

        // Create Active FundingOpportunity
        RecordType foRt = [SELECT Id FROM RecordType WHERE SObjectType = 'FundingOpportunity' AND DeveloperName = 'WCF_Project_Proposal' LIMIT 1];
        FundingOpportunity fo = new FundingOpportunity(
            Name = 'Test WCF Proposal FO',
            Status = 'Active',
            FO_Type__c = 'WCF Proposal',
            RecordTypeId = foRt.Id
        );
        insert fo;
    }

    private static RecordType getApplicationRecordType() {
        List<RecordType> rts = [
            SELECT Id, DeveloperName FROM RecordType 
            WHERE SObjectType = 'IndividualApplication' AND DeveloperName IN (
                'WCF_Job_Fulfillment_Job_Creation_Proposals',
                'WCF_Job_Fulfillment_Proposals',
                'WCF_Job_Creation_Proposals'
            )
        ];
        if (!rts.isEmpty()) return rts[0];
        return [SELECT Id, DeveloperName FROM RecordType WHERE SObjectType = 'IndividualApplication' LIMIT 1];
    }

    @IsTest
    static void testSaveDynamicDraftNewRecord() {
        List<String> tracks = new List<String>{ 'JOB_FULFILLMENT', 'JOB_CREATION' };
        String payload = '{"Q_ORG_NAME":"Test Organization","Organization_Name__c":"Test Organization","Work_Email_ID__c":"test@example.com","Submitter_Name__c":"Test Applicant"}';
        
        Test.startTest();
        WCFFormEngineController.SaveResult result = WCFFormEngineController.saveDynamicDraft(null, tracks, payload);
        Test.stopTest();
        
        System.assertNotEquals(null, result, 'SaveResult should not be null');
        System.assertEquals(true, result.isSuccess, 'Result should be successful: ' + result.message);
        System.assertNotEquals(null, result.recordId, 'RecordId should be returned');
        System.assertEquals('Draft', result.status, 'Status should be Draft');

        IndividualApplication app = [SELECT Id, RecordType.DeveloperName, Organizational_Area_s_for_Funding_Inves__c FROM IndividualApplication WHERE Id = :result.recordId];
        System.assertNotEquals(null, app.Organizational_Area_s_for_Funding_Inves__c);
    }

    @IsTest
    static void testSubmitDynamicApplicationExistingRecord() {
        Account acc = [SELECT Id, IsPersonAccount, PersonContactId FROM Account LIMIT 1];
        Id conId = acc.IsPersonAccount ? acc.PersonContactId : null;
        if (conId == null) {
            Contact con = new Contact(FirstName = 'Test', LastName = 'Applicant', Email = 'test@example.com', AccountId = acc.Id);
            insert con;
            conId = con.Id;
        }

        RecordType wgRt = getApplicationRecordType();
        IndividualApplication app = new IndividualApplication(
            Category = 'WCF Grant Application',
            Status = 'Draft',
            AccountId = acc.Id,
            ContactId = conId,
            Principal_Investigator_PI__c = conId,
            PI__c = UserInfo.getUserId(),
            Draft_Email_Sent__c = true,
            RecordTypeId = wgRt.Id,
            Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only'
        );
        insert app;
        
        List<String> tracks = new List<String>{ 'JOB_FULFILLMENT' };
        String payload = '{"Q_ORG_NAME":"Updated Organization","Work_Email_ID__c":"test@example.com","Submitter_Name__c":"Test Applicant"}';
        
        Test.startTest();
        WCFFormEngineController.SaveResult result = WCFFormEngineController.submitDynamicApplication(app.Id, tracks, payload);
        Test.stopTest();
        
        System.assertEquals(true, result.isSuccess, 'Result should be successful: ' + result.message);
        System.assertEquals(app.Id, result.recordId);
        System.assertEquals('Submitted', result.status);

        IndividualApplication updatedApp = [SELECT Id, RecordType.DeveloperName, Organizational_Area_s_for_Funding_Inves__c, Status FROM IndividualApplication WHERE Id = :app.Id];
        System.assertEquals('Job Fulfillment Only', updatedApp.Organizational_Area_s_for_Funding_Inves__c);
    }

    @IsTest
    static void testResubmitDynamicApplication() {
        Account acc = [SELECT Id, IsPersonAccount, PersonContactId FROM Account LIMIT 1];
        Id conId = acc.IsPersonAccount ? acc.PersonContactId : null;
        if (conId == null) {
            Contact con = new Contact(FirstName = 'Test', LastName = 'Applicant', Email = 'test@example.com', AccountId = acc.Id);
            insert con;
            conId = con.Id;
        }

        RecordType wgRt = getApplicationRecordType();
        IndividualApplication app = new IndividualApplication(
            Category = 'WCF Grant Application',
            Status = 'Revision Requested',
            AccountId = acc.Id,
            ContactId = conId,
            Principal_Investigator_PI__c = conId,
            PI__c = UserInfo.getUserId(),
            Draft_Email_Sent__c = true,
            RecordTypeId = wgRt.Id,
            Organizational_Area_s_for_Funding_Inves__c = 'Both Job Fulfillment and Job Creation'
        );
        insert app;

        List<String> tracks = new List<String>{ 'JOB_FULFILLMENT', 'JOB_CREATION' };
        String payload = '{"Leader_Name__c":"Updated Leader","GenieAI_Interest_Level__c":"High"}';

        Test.startTest();
        WCFFormEngineController.SaveResult result = WCFFormEngineController.resubmitDynamicApplication(app.Id, tracks, payload);
        Test.stopTest();

        System.assertEquals(true, result.isSuccess, 'Resubmit failure message: ' + result.message);
        System.assertEquals(app.Id, result.recordId);
        System.assertEquals('Application Resubmitted', result.status);
    }

    @IsTest
    static void testGetDynamicDraft() {
        Account acc = [SELECT Id, IsPersonAccount, PersonContactId FROM Account LIMIT 1];
        Id conId = acc.IsPersonAccount ? acc.PersonContactId : null;
        if (conId == null) {
            Contact con = new Contact(FirstName = 'Test', LastName = 'Applicant', Email = 'test@example.com', AccountId = acc.Id);
            insert con;
            conId = con.Id;
        }

        RecordType wgRt = getApplicationRecordType();
        IndividualApplication app = new IndividualApplication(
            Category = 'WCF Grant Application',
            Status = 'Draft',
            AccountId = acc.Id,
            ContactId = conId,
            Principal_Investigator_PI__c = conId,
            PI__c = UserInfo.getUserId(),
            Draft_Email_Sent__c = true,
            RecordTypeId = wgRt.Id,
            Organizational_Area_s_for_Funding_Inves__c = 'Both Job Fulfillment and Job Creation'
        );
        insert app;

        Test.startTest();
        WCFFormEngineController.DynamicDraftWrapper draft = WCFFormEngineController.getDynamicDraft(app.Id);
        Test.stopTest();

        System.assertNotEquals(null, draft);
        System.assertEquals(true, draft.isSuccess);
        System.assertEquals(app.Id, draft.recordId);
    }
}
