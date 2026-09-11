@isTest
private class TranslatedCurrentFiscalDataContTest {

    /**
     * Shared setup: builds the record chain
     * IndividualApplication -> Translated_Proposal__c -> Translated_Current_Fiscal_Year_Data__c
     *
     * NOTE: Adjust/add required fields below to match your org's validation
     * rules and page layouts (marked with TODO where I've had to guess).
     * Field types for the budget/projection/variance fields are assumed to be
     * Number/Currency (Decimal) and explanation fields assumed to be Text/Text Area (String) -
     * update the literals below if your org's field types differ.
     */
    @TestSetup
    static void makeData() {

        // ---- IndividualApplication ----
        // TODO: add any other fields required by validation rules in your org
        IndividualApplication ia = new IndividualApplication(
            Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only',  Category ='WCF Grant Application'
        );
        insert ia;

        // ---- Translated_Proposal__c ----
        // TODO: add any other required fields on this custom object
        Translated_Proposal__c tp = new Translated_Proposal__c(
            Proposal__c = ia.Id
        );
        insert tp;

        // ---- Translated_Current_Fiscal_Year_Data__c ----
        // TODO: add any other required fields on this custom object
        Translated_Current_Fiscal_Year_Data__c cfy = new Translated_Current_Fiscal_Year_Data__c(
            Translated_Proposal__c    = tp.Id,
            Revenue_Budget__c         = 10000,
            Revenue_Projection__c     = 9500,
          //  Revenue_Variance__c       = -500,
            Revenue_Explanation__c    = 'Lower enrollment than expected',
            Expense_Budget__c         = 8000,
            Expense_Projection__c     = 8200,
            //Expense_Variance__c       = 200,
            Expense_Explanation__c    = 'Additional staffing costs',
           // Net_Budget__c             = 2000,
            //Net_Projection__c         = 1300,
            //Net_Variance__c           = -700,
            Net_Position_Explanation__c = 'Net position impacted by staffing costs'
        );
        insert cfy;
    }

    @isTest
    static void testGetCurrentFiscalYearData_withRecord() {
        Translated_Proposal__c tp = [SELECT Id FROM Translated_Proposal__c LIMIT 1];

        Test.startTest();
        Translated_Current_Fiscal_Year_Data__c result =
            TranslatedCurrentFiscalDataController.getCurrentFiscalYearData(tp.Id);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Expected a Translated_Current_Fiscal_Year_Data__c record to be returned');
        System.assertEquals(10000, result.Revenue_Budget__c, 'Revenue_Budget__c should match inserted record');
        System.assertEquals(9500, result.Revenue_Projection__c, 'Revenue_Projection__c should match inserted record');
        System.assertEquals(-500, result.Revenue_Variance__c, 'Revenue_Variance__c should match inserted record');
        System.assertEquals('Lower enrollment than expected', result.Revenue_Explanation__c, 'Revenue_Explanation__c should match inserted record');
        System.assertEquals(8000, result.Expense_Budget__c, 'Expense_Budget__c should match inserted record');
        System.assertEquals(8200, result.Expense_Projection__c, 'Expense_Projection__c should match inserted record');
        System.assertEquals(200, result.Expense_Variance__c, 'Expense_Variance__c should match inserted record');
        System.assertEquals('Additional staffing costs', result.Expense_Explanation__c, 'Expense_Explanation__c should match inserted record');
        System.assertEquals(2000, result.Net_Budget__c, 'Net_Budget__c should match inserted record');
        System.assertEquals(1300, result.Net_Projection__c, 'Net_Projection__c should match inserted record');
        System.assertEquals(-700, result.Net_Variance__c, 'Net_Variance__c should match inserted record');
        System.assertEquals('Net position impacted by staffing costs', result.Net_Position_Explanation__c, 'Net_Position_Explanation__c should match inserted record');
    }

    @isTest
    static void testGetCurrentFiscalYearData_noRecord() {
        // Create a Translated_Proposal__c with no related Translated_Current_Fiscal_Year_Data__c
        IndividualApplication ia2 = new IndividualApplication(
            Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only',  Category ='WCF Grant Application'
        );
        insert ia2;

        Translated_Proposal__c tpNoData = new Translated_Proposal__c(
            Proposal__c = ia2.Id
        );
        insert tpNoData;

        Boolean exceptionThrown = false;

        Test.startTest();
        try {
            TranslatedCurrentFiscalDataController.getCurrentFiscalYearData(tpNoData.Id);
        } catch (System.QueryException qe) {
            exceptionThrown = true;
        }
        Test.stopTest();

        System.assert(exceptionThrown, 'Expected a QueryException when no matching record exists, since the query is assigned to a single sObject variable');
    }
}