@IsTest
private class TranslatedHistoricalDataControllerTest {

    @TestSetup
    static void setupData() {

        // Create Translated Proposal
       Translated_Proposal__c proposal = new Translated_Proposal__c();
// Populate only the required editable fields
insert proposal;

        // Create Historical Data
        Translated_Historical_Data__c history = new Translated_Historical_Data__c(
            Translated_Proposal__c = proposal.Id,

            CY1_Balance_Start_CFY_1__c = 100,
            CY2_Balance_Start_CFY_2__c = 200,
            CY3_Balance_Start_CFY_3__c = 300,

            CY1_Revenue__c = 1000,
            CY2_Revenue__c = 2000,
            CY3_Revenue__c = 3000,

            CY1_Expense__c = 500,
            CY2_Expense__c = 1000,
            CY3_Expense__c = 1500,

            CY1_Balance_End__c = 600,
            CY2_Balance_End__c = 1200,
            CY3_Balance_End__c = 1800
        );
        insert history;
    }

    @IsTest
    static void testGetHistoricalData() {

        Translated_Proposal__c proposal = [
            SELECT Id
            FROM Translated_Proposal__c
            LIMIT 1
        ];

        Test.startTest();

        Translated_Historical_Data__c result =
            TranslatedHistoricalDataController.getHistoricalData(proposal.Id);

        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assertEquals(100, result.CY1_Balance_Start_CFY_1__c);
        System.assertEquals(200, result.CY2_Balance_Start_CFY_2__c);
        System.assertEquals(300, result.CY3_Balance_Start_CFY_3__c);

        System.assertEquals(1000, result.CY1_Revenue__c);
        System.assertEquals(2000, result.CY2_Revenue__c);
        System.assertEquals(3000, result.CY3_Revenue__c);

        System.assertEquals(500, result.CY1_Expense__c);
        System.assertEquals(1000, result.CY2_Expense__c);
        System.assertEquals(1500, result.CY3_Expense__c);

        System.assertEquals(600, result.CY1_Balance_End__c);
        System.assertEquals(1200, result.CY2_Balance_End__c);
        System.assertEquals(1800, result.CY3_Balance_End__c);
    }
}