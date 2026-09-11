@IsTest private class ValidatorDashboardControllerTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void readsValidatorCounts() { System.assertNotEquals(null, ValidatorDashboardController.getValidatorCounts()); }
}