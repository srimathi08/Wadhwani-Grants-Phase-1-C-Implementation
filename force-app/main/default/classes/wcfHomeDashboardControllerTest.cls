@IsTest private class wcfHomeDashboardControllerTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void readsPipelineCounts() { System.assertNotEquals(null, wcfHomeDashboardController.getPipelineCounts()); }
}