@IsTest private class WcfProposalDashboardControllerTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void readsDashboardCounts() { System.assertNotEquals(null, WcfProposalDashboardController.getWcfProposalCounts()); }
}