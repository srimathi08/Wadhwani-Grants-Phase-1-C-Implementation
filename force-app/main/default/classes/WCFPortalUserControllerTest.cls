@IsTest private class WCFPortalUserControllerTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void resolvesPortalAccount() { System.assertEquals(null, WCFPortalUserController.getCurrentAccountId()); }
}