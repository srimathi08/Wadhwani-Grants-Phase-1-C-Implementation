@IsTest private class listTableWCFDraftControllerTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void returnsDraftApplications() { System.assertNotEquals(null, listTableWCFDraftController.getUserDraftApplications()); }
}