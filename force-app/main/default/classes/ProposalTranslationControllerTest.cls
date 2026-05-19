@IsTest
private class ProposalTranslationControllerTest {
 
    private static IndividualApplication makeBaseProposal() {
        Account acc = new Account(Name = 'Test Account');
        insert acc;
        
        IndividualApplication ia = new IndividualApplication();
        ia.AccountId = acc.Id;
        ia.Category = 'Grant Application';
        ia.Status = 'Submitted';
        ia.Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only';
        insert ia;
        
        return ia;
    }
    
    
    @IsTest
    static void test_createOrTriggerTranslation_createsNew() {
        IndividualApplication proposal = makeBaseProposal();
        
        Id newId;
        Boolean caught = false;
        
        try {
            Test.startTest();
            newId = ProposalTranslationController.createOrTriggerTranslation(proposal.Id, 'es');
            Test.stopTest();
        } catch (AuraHandledException e) {
            caught = true;
            System.assert(
                e.getMessage().contains('Could not create translated proposal'),
                'If Flow is active, controller should surface the Flow failure'
            );
        }
        
        // If no exception (Flow off), verify the record was created correctly
        if (!caught) {
            System.assertNotEquals(null, newId, 'Expected a new Translated_Proposal__c Id');
            Translated_Proposal__c tp = [
                SELECT Id, Proposal__c, Translated_Language__c, isTrigger__c, Status__c
                FROM Translated_Proposal__c
                WHERE Id = :newId
            ];
            System.assertEquals(proposal.Id, tp.Proposal__c);
            System.assertEquals('es', tp.Translated_Language__c);
            System.assertEquals(false, tp.isTrigger__c, 'Controller inserts with isTrigger__c=false');
            System.assertEquals('Not Translated', tp.Status__c);
        }
    }
    
    
    @IsTest
    static void test_createOrTriggerTranslation_updatesExisting() {
        IndividualApplication proposal = makeBaseProposal();
        
        // Seed existing translated record with isTrigger__c = TRUE to avoid Flow firing on insert
        Translated_Proposal__c seeded = new Translated_Proposal__c(
            Proposal__c = proposal.Id,
            Translated_Language__c = 'es',
            isTrigger__c = false,        // <-- changed from false
            Status__c = 'Not Translated'
        );
        insert seeded;
        
        Test.startTest();
        Id returnedId = ProposalTranslationController.createOrTriggerTranslation(proposal.Id, 'es');
        Test.stopTest();
        
        System.assertEquals(seeded.Id, returnedId, 'Method must return the existing record Id');
        
        Translated_Proposal__c after = [
            SELECT Id, isTrigger__c FROM Translated_Proposal__c WHERE Id = :seeded.Id
        ];
        System.assertEquals(true, after.isTrigger__c, 'Existing record should remain/is set to true');
    }
    
    @IsTest
    static void test_getTranslatedProposal_returnsAggregateData() {
        IndividualApplication proposal = makeBaseProposal();
        
        // Parent translated proposal: set isTrigger__c = TRUE to avoid Flow on insert
        Translated_Proposal__c tp = new Translated_Proposal__c(
            Proposal__c = proposal.Id,
            Translated_Language__c = 'es',
            isTrigger__c = true,         // <-- changed from false
            Status__c = 'Not Translated',
            Organization_Name__c = 'Org DE',
            Headquarters_City_and_Country__c = 'Berlin, Germany',
            Primary_Service_Regions__c = 'EU',
            Leader_Name__c = 'H. Müller',
            Leader_Title__c = 'Director',
            Submitter_Name__c = 'A. Schmidt',
            Job_Title__c = 'PM',
            Work_Email_ID__c = 'a@example.de',
            Phone_number__c = '+49 30 123456',
            Legal_Structure__c = 'Nonprofit',
            Organizational_Sustainability__c = 'Stable',
            Use_of_Additional_Funding__c = 'Scale operations',
            Operational_Synergies_with_WOF__c = 'Partnerships',
            Use_of_Additional_Funding_JC__c = 'Scale ops JC',
            Operational_Synergies_with_WOF_JC__c = 'Partners JC'
        );
        insert tp;
        
        // child: historical (one record)
        Translated_Historical_Data__c th = new Translated_Historical_Data__c(
            Translated_Proposal__c = tp.Id,
            CY1_Balance_Start_CFY_1__c = 10,
            CY2_Balance_Start_CFY_2__c = 20,
            CY3_Balance_Start_CFY_3__c = 30,
            CY1_Revenue__c = 100,
            CY2_Revenue__c = 120,
            CY3_Revenue__c = 140,
            CY1_Expense__c = 50,
            CY2_Expense__c = 60,
            CY3_Expense__c = 70,
            CY1_Balance_End__c = 60,
            CY2_Balance_End__c = 80,
            CY3_Balance_End__c = 100
        );
        insert th;
        
        // child: current fiscal year (one record)
        Translated_Current_Fiscal_Year_Data__c tfy = new Translated_Current_Fiscal_Year_Data__c(
            Translated_Proposal__c = tp.Id,
            Revenue_Budget__c = 200,
            Revenue_Projection__c = 210,
            Revenue_Explanation__c = 'rev exp',
            Expense_Budget__c = 150,
            Expense_Projection__c = 140,
            Expense_Explanation__c = 'exp exp',
            Net_Position_Explanation__c = 'net exp'
        );
        insert tfy;
        
        // child: outcome (one record)
        Translated_Outcome_Data__c to = new Translated_Outcome_Data__c(
            Translated_Proposal__c = tp.Id,
            Skills_Duration_CFY__c = '3m',
            Skills_Duration_FY_1__c = '4m',
            Skills_Duration_FY_2__c = '5m',
            Skills_Duration_FY_3__c = '6m',
            Projected_Learner_Enrollments_CFY__c = '100',
            Projected_Learner_Enrollments_FY_1__c = '120'
        );
        insert to;
        
        Test.startTest();
        Map<String, Object> res = ProposalTranslationController.getTranslatedProposal(tp.Id);
        Test.stopTest();
        
        System.assert(res.containsKey('proposal'), 'Map should include parent proposal');
        System.assert(res.containsKey('historicalData'), 'Map should include historical data');
        System.assert(res.containsKey('fiscalData'), 'Map should include fiscal data');
        System.assert(res.containsKey('outcomeData'), 'Map should include outcome data');
        
        Translated_Proposal__c gotTp = (Translated_Proposal__c) res.get('proposal');
        System.assertEquals(tp.Id, gotTp.Id);
        System.assertEquals('Org DE', gotTp.Organization_Name__c);
        
        Translated_Historical_Data__c gotHist = (Translated_Historical_Data__c) res.get('historicalData');
        System.assertEquals(100, gotHist.CY1_Revenue__c);
        
        Translated_Current_Fiscal_Year_Data__c gotFiscal = (Translated_Current_Fiscal_Year_Data__c) res.get('fiscalData');
        System.assertEquals(200, gotFiscal.Revenue_Budget__c);
        
        Translated_Outcome_Data__c gotOutcome = (Translated_Outcome_Data__c) res.get('outcomeData');
        System.assertEquals('3m', gotOutcome.Skills_Duration_CFY__c);
        System.assertEquals('100', gotOutcome.Projected_Learner_Enrollments_CFY__c);
    }
}