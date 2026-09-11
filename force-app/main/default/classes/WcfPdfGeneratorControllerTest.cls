@isTest
private class WcfPdfGeneratorControllerTest {

    /**
     * Shared setup: builds one IndividualApplication with a related
     * Historical_Data__c, Current_fiscal_year_data__c, and two Outcomes_Data__c
     * records (Proposal__c on each points directly at the IndividualApplication Id).
     *
     * NOTE: Adjust/add required fields below to match your org's validation
     * rules and page layouts (marked with TODO where I've had to guess).
     *
     * IMPORTANT: Based on the sibling Translated_Current_Fiscal_Year_Data__c object,
     * Revenue_Variance__c, Expense_Variance__c, Net_Budget__c, Net_Projection__c,
     * and Net_Variance__c are likely FORMULA fields on Current_fiscal_year_data__c
     * as well, so they are NOT set here. If your org confirms they're editable,
     * add them back in and update the assertions in the test method below.
     *
     * Similarly, CY1_Balance_End__c / CY2_Balance_End__c / CY3_Balance_End__c on
     * Historical_Data__c look like they could be calculated (Start + Revenue -
     * Expense) - included here as writable for now, but remove/adjust if your
     * org has them as formula fields too.
     */
    @TestSetup
    static void makeData() {

        // ---- IndividualApplication (also the "recordId" the controller expects) ----
        // TODO: add any other fields required by validation rules in your org
        IndividualApplication ia = new IndividualApplication(
            //me                                          = 'Test WCF Application',
            Organizational_Area_s_for_Funding_Inves__c     = 'Job Fulfillment Only',
            Organization_Name__c                           = 'Acme Nonprofit',
            Headquarters_City_and_Country__c               = 'Chennai, India',
            Primary_Service_Regions__c                     = 'South Asia',
            Leader_Name__c                                 = 'Jane Leader',
            Leader_Title__c                                = 'Executive Director',
            Submitter_Name__c                              = 'John Submitter',
            Job_Title__c                                   = 'Program Manager',
            Work_Email_ID__c                               = 'submitter@example.com',
            Phone__c                                       = '1234567890',
            Legal_Structure__c                             = 'Nonprofit',
            Organizational_Sustainability__c               = 'Diversified funding base',
            Use_of_Additional_Funding__c                   = 'Expand training programs',
            Operational_Synergies_with_WOF__c              = 'Shared curriculum',
            Operational_Synergies_with_WOF_JC__c           = 'Shared job coaching resources',
            Operational_Synergies_with_WOF_Both__c         = 'Combined outcome tracking',
Category ='WCF Grant Application'
        );
        insert ia;

        // ---- Historical_Data__c ----
        // TODO: add any other required fields on this custom object
        Historical_Data__c hd = new Historical_Data__c(
            Proposal__c                = ia.Id,
          CY1_Balance_Start_CFY_1__c  = 1000,
            CY1_Revenue__c              = 5000,
            CY1_Expense__c              = 4000,
            //1_Balance_End__c          = 2000,
          CY2_Balance_Start_CFY_2__c  = 2000,
            CY2_Revenue__c              = 6000,
            CY2_Expense__c              = 4500,
            //2_Balance_End__c          = 3500,
          CY3_Balance_Start_CFY_3__c  = 3500,
            CY3_Revenue__c              = 7000,
            CY3_Expense__c              = 5000
            //3_Balance_End__c          = 5500
        );
        insert hd;

        // ---- Current_fiscal_year_data__c ----
        // TODO: add any other required fields on this custom object
        Current_fiscal_year_data__c cfy = new Current_fiscal_year_data__c(
            Proposal__c             = ia.Id,
            Revenue_Budget__c       = 10000,
            Revenue_Projection__c   = 9500,
            Revenue_Explanation__c  = 'Lower enrollment than expected',
            Expense_Budget__c       = 8000,
            Expense_Projection__c   = 8200,
            Expense_Explanation__c  = 'Additional staffing costs',
            Net_Position_Explanation__c = 'Net position impacted by staffing costs'
        );
        insert cfy;

        // ---- Outcomes_Data__c (create two, to confirm the List is returned correctly) ----
        // TODO: add any other required fields on this custom object
        List<Outcomes_Data__c> outcomesToInsert = new List<Outcomes_Data__c>();

        outcomesToInsert.add(new Outcomes_Data__c(
            Proposal__c                            = ia.Id,
            Skills_Duration_CFY__c                 = '12',
            Projected_Learner_Enrollments_CFY__c   = '100',
            Projected_Learner_Placements_CFY__c    = '80',
            Avg_Cost_per_Placement_CFY__c          = 500,
            Avg_Cost_per_Job_CFY__c                = 750,
            Target_Business_Sectors_CFY__c         = 'Manufacturing'
        ));

        outcomesToInsert.add(new Outcomes_Data__c(
            Proposal__c                            = ia.Id,
            Skills_Duration_CFY__c                 = '6',
            Projected_Learner_Enrollments_CFY__c   = '50',
            Projected_Learner_Placements_CFY__c    = '40',
            Avg_Cost_per_Placement_CFY__c          = 300,
            Avg_Cost_per_Job_CFY__c                = 450,
            Target_Business_Sectors_CFY__c         = 'Retail'
        ));

        insert outcomesToInsert;
    }

    @isTest
    static void testGetWCFApplicationWithRelatedData_fullData() {
        IndividualApplication ia = [SELECT Id FROM IndividualApplication LIMIT 1];

        Test.startTest();
        WcfPdfGeneratorController.WCFWrapper wrapper =
            WcfPdfGeneratorController.getWCFApplicationWithRelatedData(ia.Id);
        Test.stopTest();

        System.assertNotEquals(null, wrapper, 'Wrapper should not be null');

        // ---- app ----
        System.assertNotEquals(null, wrapper.app, 'app should be populated');
        System.assertEquals('Acme Nonprofit', wrapper.app.Organization_Name__c, 'Organization_Name__c should match inserted record');
        //stem.assertEquals('Workforce Development', wrapper.app.Organizational_Area_s_for_Funding_Inves__c, 'orgArea should match inserted record');

        // ---- historical ----
        System.assertNotEquals(null, wrapper.historical, 'historical should be populated when a related record exists');
        System.assertEquals(1000, wrapper.historical.CY1_Balance_Start_CFY_1__c, 'CY1_Balance_Start_CFY_1__c should match inserted record');
        System.assertEquals(5000, wrapper.historical.CY1_Revenue__c, 'CY1_Revenue__c should match inserted record');

        // ---- fiscalYear ----
        System.assertNotEquals(null, wrapper.fiscalYear, 'fiscalYear should be populated when a related record exists');
        System.assertEquals(10000, wrapper.fiscalYear.Revenue_Budget__c, 'Revenue_Budget__c should match inserted record');
        System.assertEquals('Additional staffing costs', wrapper.fiscalYear.Expense_Explanation__c, 'Expense_Explanation__c should match inserted record');

        // ---- outcomes ----
        System.assertNotEquals(null, wrapper.outcomes, 'outcomes list should not be null');
        System.assertEquals(2, wrapper.outcomes.size(), 'Both Outcomes_Data__c records should be returned');
    }

    @isTest
    static void testGetWCFApplicationWithRelatedData_noRelatedRecords() {
        // A second IndividualApplication with no Historical_Data__c, Current_fiscal_year_data__c,
        // or Outcomes_Data__c records related to it.
        IndividualApplication ia2 = new IndividualApplication(
          //Name                                      = 'Test WCF Application No Related Data',
            Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only',
            Organization_Name__c                       = 'Beta Nonprofit', 
Category ='WCF Grant Application'
        );
        insert ia2;

        Test.startTest();
        WcfPdfGeneratorController.WCFWrapper wrapper =
            WcfPdfGeneratorController.getWCFApplicationWithRelatedData(ia2.Id);
        Test.stopTest();

        System.assertNotEquals(null, wrapper, 'Wrapper should not be null');
        System.assertNotEquals(null, wrapper.app, 'app should still be populated');
        System.assertEquals('Beta Nonprofit', wrapper.app.Organization_Name__c, 'Organization_Name__c should match inserted record');

        System.assertEquals(null, wrapper.historical, 'historical should be null when no related record exists');
        System.assertEquals(null, wrapper.fiscalYear, 'fiscalYear should be null when no related record exists');
        System.assertEquals(0, wrapper.outcomes.size(), 'outcomes should be an empty list when no related records exist');
    }
}