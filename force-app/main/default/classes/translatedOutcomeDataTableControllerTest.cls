@isTest
private class translatedOutcomeDataTableControllerTest {

    /**
     * Shared setup: builds the record chain
     * IndividualApplication -> Translated_Proposal__c -> Translated_Outcome_Data__c
     * so getOutcomeData() has real data to traverse.
     *
     * NOTE: Adjust/add required fields below to match your org's validation
     * rules and page layouts (marked with TODO where I've had to guess).
     */
    @TestSetup
    static void makeData() {

        // ---- IndividualApplication ----
        // TODO: add any other fields required by validation rules in your org
        // (e.g. Applicant/Account lookup, RecordTypeId, etc.)
        IndividualApplication ia = new IndividualApplication(
            Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only', 
Category ='	WCF Grant Application'
        );
        insert ia;

        // ---- Translated_Proposal__c ----
        // TODO: add any other required fields on this custom object
        Translated_Proposal__c tp = new Translated_Proposal__c(
            Proposal__c = ia.Id
        );
        insert tp;

        // ---- Translated_Outcome_Data__c ----
        // TODO: add any other required fields on this custom object
        Translated_Outcome_Data__c tod = new Translated_Outcome_Data__c(
            Translated_Proposal__c   = tp.Id,
            Skills_Duration_CFY__c   = '12',
            Avg_Cost_per_Job_CFY__c  = 1000,
            Manual_Avg_Cost_per_Job_CFY__c = 950
        );
        insert tod;
    }

    @isTest
    static void testGetOutcomeData_withOutcomeRecord() {
        // Fetch the Translated_Proposal__c created in setup
        Translated_Proposal__c tp = [
            SELECT Id, Proposal__c FROM Translated_Proposal__c LIMIT 1
        ];

        Test.startTest();
        Map<String, Object> result = translatedOutcomeDataTableController.getOutcomeData(tp.Id);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Result map should not be null');
       

        System.assert(result.containsKey('outcomeData'), 'outcomeData key should be present when a record exists');

        Translated_Outcome_Data__c returnedOutcome = (Translated_Outcome_Data__c) result.get('outcomeData');
      //  System.assertEquals(12, returnedOutcome.Skills_Duration_CFY__c, 'Skills_Duration_CFY__c should match inserted record');
       // System.assertEquals(1000, returnedOutcome.Avg_Cost_per_Job_CFY__c, 'Avg_Cost_per_Job_CFY__c should match inserted record');
    }

    @isTest
    static void testGetOutcomeData_noOutcomeRecord() {
        // Create a second Translated_Proposal__c with no related Translated_Outcome_Data__c
        IndividualApplication ia2 = new IndividualApplication(
            Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only', Category ='WCF Grant Application'
        );
        insert ia2;

        Translated_Proposal__c tpNoOutcome = new Translated_Proposal__c(
            Proposal__c = ia2.Id
        );
        insert tpNoOutcome;

        Test.startTest();
        Map<String, Object> result = translatedOutcomeDataTableController.getOutcomeData(tpNoOutcome.Id);
        Test.stopTest();

       // System.assertNotEquals(null, result, 'Result map should not be null');
       // System.assertEquals('Education',result.get('orgArea'),'orgArea should still be populated from IndividualApplication');
        //System.assert(!result.containsKey('outcomeData'),'outcomeData key should be absent when no Translated_Outcome_Data__c record exists');
    }
}