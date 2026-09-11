@IsTest
private class wcfTranslatePdfGeneratorControllerTest {

    @IsTest
    static void testGetWCFApplicationWithRelatedData() {

        // Create Translated Proposal
        Translated_Proposal__c proposal = new Translated_Proposal__c(
           
        );
        insert proposal;

        // Historical Data
        Translated_Historical_Data__c historical = new Translated_Historical_Data__c(
            Translated_Proposal__c = proposal.Id,
            CY1_Revenue__c = 100,
            CY2_Revenue__c = 200,
            CY3_Revenue__c = 300
        );
        insert historical;

        // Fiscal Year Data
        Translated_Current_Fiscal_Year_Data__c fiscal = new Translated_Current_Fiscal_Year_Data__c(
            Translated_Proposal__c = proposal.Id,
            Revenue_Budget__c = 1000,
            Expense_Budget__c = 500
        );
        insert fiscal;

        // Outcome Data
        Translated_Outcome_Data__c outcome = new Translated_Outcome_Data__c(
            
            Translated_Proposal__c = proposal.Id,
            Skills_Duration_CFY__c = '3 Months'
        );
        insert outcome;

        Test.startTest();

        wcfTranslatePdfGeneratorController.WCFWrapper wrapper =
            wcfTranslatePdfGeneratorController.getWCFApplicationWithRelatedData(
                proposal.Id
            );

        Test.stopTest();

        System.assertNotEquals(null, wrapper);

        System.assertNotEquals(null, wrapper.app);
        System.assertEquals(proposal.Id, wrapper.app.Id);

        System.assertNotEquals(null, wrapper.historical);

        System.assertNotEquals(null, wrapper.fiscalYear);

        System.assertEquals(1, wrapper.outcomes.size());

        System.assertEquals(
            proposal.Id,
            wrapper.outcomes[0].Translated_Proposal__c
        );
    }

    @IsTest
    static void testGetWCFApplicationWithoutChildren() {

        Translated_Proposal__c proposal = new Translated_Proposal__c(
            
        );
        insert proposal;

        Test.startTest();

        wcfTranslatePdfGeneratorController.WCFWrapper wrapper =
            wcfTranslatePdfGeneratorController.getWCFApplicationWithRelatedData(
                proposal.Id
            );

        Test.stopTest();

        System.assertNotEquals(null, wrapper);
        System.assertNotEquals(null, wrapper.app);

        System.assertEquals(null, wrapper.historical);
        System.assertEquals(null, wrapper.fiscalYear);
        System.assertEquals(0, wrapper.outcomes.size());
    }
}