@IsTest private class PLOfRecordControllerTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void returnsPlQueues() { System.assertNotEquals(null, PLOfRecordController.getMyPLOrganizations()); System.assertNotEquals(null, PLOfRecordController.getFlaggedApplicationsForPL()); }
}