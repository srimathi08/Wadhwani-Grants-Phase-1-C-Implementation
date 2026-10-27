@isTest
private class WCFApplicationInactivityBatchTest {

    @testSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test Inactivity Org');
        insert acc;

        Contact con = new Contact(FirstName = 'Test', LastName = 'Applicant', Email = 'applicant@test.com', AccountId = acc.Id);
        insert con;

        // Draft application
        IndividualApplication draftApp = new IndividualApplication(
            AccountId = acc.Id,
            ContactId = con.Id,
            Category = 'WCF Grant Application',
            Status = 'Draft',
            Organization_Name__c = 'Test Inactivity Org'
        );
        insert draftApp;

        // Revision requested application
        IndividualApplication revApp = new IndividualApplication(
            AccountId = acc.Id,
            ContactId = con.Id,
            Category = 'WCF Grant Application',
            Status = 'Revision Requested',
            Revision_Requested_Date__c = System.now().addDays(-105),
            Organization_Name__c = 'Test Inactivity Org'
        );
        insert revApp;
    }

    @isTest
    static void testBatchExecution() {
        Test.startTest();
        // Run with 0 days threshold to test execution on setup data
        WCFApplicationInactivityBatch batch = new WCFApplicationInactivityBatch(0);
        Database.executeBatch(batch);
        Test.stopTest();

        List<IndividualApplication> apps = [
            SELECT Id, Status, Suspension_Reason__c, Suspension_Date__c 
            FROM IndividualApplication 
            WHERE Status = 'Application Suspended'
        ];
        System.assert(!apps.isEmpty(), 'Expected applications to be suspended by batch');
    }

    @isTest
    static void testSchedulable() {
        Test.startTest();
        String cron = '0 0 0 15 3 ? 2030';
        String jobId = System.schedule('Test Inactivity Schedule', cron, new WCFApplicationInactivityBatch());
        Test.stopTest();
        System.assertNotEquals(null, jobId, 'Job should be scheduled');
    }

    @isTest
    static void testFormControllerSuspendedStatus() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Inactivity Org' LIMIT 1];
        IndividualApplication app = [SELECT Id FROM IndividualApplication WHERE AccountId = :acc.Id LIMIT 1];
        app.Status = 'Application Suspended';
        app.Suspension_Reason__c = WCFApplicationInactivityBatch.REASON_DRAFT_100;
        app.Suspension_Date__c = System.today();
        update app;

        Test.startTest();
        WCFFormController.ApplicationStatusWrapper wrapper = WCFFormController.getApplicationStatusForUser();
        Test.stopTest();
        System.assertNotEquals(null, wrapper);
    }
}