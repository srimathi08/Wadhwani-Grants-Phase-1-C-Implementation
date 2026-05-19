@IsTest
public class ProposalTranslationUpdaterTest {
    
    // --- helper: create a WCF-style parent proposal and a Translated_Proposal__c ---
    public static Id makeTranslatedProposalParent() {
        Account acc = new Account(Name = 'Updater Org');
        insert acc;
        
        IndividualApplication ia = new IndividualApplication(
            AccountId = acc.Id,
            Category = 'Grant Application',
            Status   = 'Submitted',
            Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only'
        );
        insert ia;
        
        // isTrigger__c = TRUE so any record-triggered Flow that expects inputs won't fire
        Translated_Proposal__c tp = new Translated_Proposal__c(
            Proposal__c = ia.Id,
            Translated_Language__c = 'pt',
            isTrigger__c = true,
            Status__c = 'Not Translated'
        );
        insert tp;
        
        return tp.Id;
    }
    
    // Build the JSON payload your invocable expects
    private static String buildPayload(String orgName, String leaderName,
                                       String cy1Rev, String cy1Exp,
                                       String revBudget, String expBudget,
                                       String skillsCFY, String enrollCFY) {
                                           Map<String, Object> root = new Map<String, Object>();
                                           
                                           // parent fields
                                           root.put('recordFields', new List<Object>{
                                               new Map<String, Object>{ 'label' => 'Organizational Name', 'value' => orgName },
                                                   new Map<String, Object>{ 'label' => 'Leader Name',          'value' => leaderName }
                                           });
                                           
                                           Map<String, Object> related = new Map<String, Object>();
                                           
                                           // Historical Data
                                           related.put('Historical Data', new Map<String, Object>{
                                               'records' => new List<Object>{
                                                   new Map<String, Object>{
                                                       'fields' => new List<Object>{
                                                           new Map<String, Object>{ 'label' => 'CY1 Revenue', 'value' => cy1Rev },
                                                               new Map<String, Object>{ 'label' => 'CY1 Expense', 'value' => cy1Exp }
                                                       }
                                                   }
                                               }
                                           });
                                           
                                           // Current fiscal year data
                                           related.put('Current fiscal year data', new Map<String, Object>{
                                               'records' => new List<Object>{
                                                   new Map<String, Object>{
                                                       'fields' => new List<Object>{
                                                           new Map<String, Object>{ 'label' => 'Revenue Budget', 'value' => revBudget },
                                                               new Map<String, Object>{ 'label' => 'Expense Budget', 'value' => expBudget }
                                                       }
                                                   }
                                               }
                                           });
                                           
                                           // Outcomes Data
                                           related.put('Outcomes Data', new Map<String, Object>{
                                               'records' => new List<Object>{
                                                   new Map<String, Object>{
                                                       'fields' => new List<Object>{
                                                           new Map<String, Object>{ 'label' => 'Skills & Duration(CFY)', 'value' => skillsCFY },
                                                               new Map<String, Object>{ 'label' => 'Projected Learner Enrollments (CFY)', 'value' => enrollCFY }
                                                       }
                                                   }
                                               }
                                           });
                                           
                                           root.put('relatedRecords', related);
                                           return JSON.serialize(root);
                                       }
    
    @IsTest
    static void test_updateTranslatedRecords_insert_then_update() {
        Id tpId = makeTranslatedProposalParent();
        
        // 1) First invocation payload
        ProposalTranslationUpdater.Request req1 = new ProposalTranslationUpdater.Request();
        req1.translatedProposalId = tpId;
        req1.jsonText = buildPayload('Updater Org Name','Jane Doe','100','40','200','150','3m','100');
        
        // 2) Second invocation payload
        ProposalTranslationUpdater.Request req2 = new ProposalTranslationUpdater.Request();
        req2.translatedProposalId = tpId;
        req2.jsonText = buildPayload('Updater Org Name 2','John Smith','101','45','205','155','4m','130');
        
        Test.startTest();
        // ---- First call (insert/initial update of child rows) ----
        ProposalTranslationUpdater.updateTranslatedRecords(new List<ProposalTranslationUpdater.Request>{ req1 });
        
        // You can assert after the first call while still inside startTest()
        Translated_Proposal__c parentAfterFirst = [
            SELECT Organization_Name__c, Leader_Name__c, Status__c
            FROM Translated_Proposal__c WHERE Id = :tpId
        ];
        System.assertEquals('Updater Org Name', parentAfterFirst.Organization_Name__c);
        System.assertEquals('Jane Doe', parentAfterFirst.Leader_Name__c);
        System.assertEquals('Translated', parentAfterFirst.Status__c);
        
        System.assertEquals(1, [SELECT COUNT() FROM Translated_Historical_Data__c WHERE Translated_Proposal__c = :tpId]);
        System.assertEquals(1, [SELECT COUNT() FROM Translated_Current_Fiscal_Year_Data__c WHERE Translated_Proposal__c = :tpId]);
        System.assertEquals(1, [SELECT COUNT() FROM Translated_Outcome_Data__c            WHERE Translated_Proposal__c = :tpId]);
        
        // ---- Second call (update existing rows) ----
        ProposalTranslationUpdater.updateTranslatedRecords(new List<ProposalTranslationUpdater.Request>{ req2 });
        Test.stopTest();
        
        // Final assertions
        Translated_Proposal__c parent2 = [
            SELECT Organization_Name__c, Leader_Name__c
            FROM Translated_Proposal__c WHERE Id = :tpId
        ];
        System.assertEquals('Updater Org Name 2', parent2.Organization_Name__c);
        System.assertEquals('John Smith',        parent2.Leader_Name__c);
        
        Translated_Historical_Data__c hist2 = [
            SELECT CY1_Revenue__c, CY1_Expense__c
            FROM Translated_Historical_Data__c WHERE Translated_Proposal__c = :tpId LIMIT 1
        ];
        System.assertEquals(101, hist2.CY1_Revenue__c);
        System.assertEquals(45,  hist2.CY1_Expense__c);
        
        Translated_Current_Fiscal_Year_Data__c fiscal2 = [
            SELECT Revenue_Budget__c, Expense_Budget__c
            FROM Translated_Current_Fiscal_Year_Data__c WHERE Translated_Proposal__c = :tpId LIMIT 1
        ];
        System.assertEquals(205, fiscal2.Revenue_Budget__c);
        System.assertEquals(155, fiscal2.Expense_Budget__c);
        
        Translated_Outcome_Data__c outcome2 = [
            SELECT Skills_Duration_CFY__c, Projected_Learner_Enrollments_CFY__c
            FROM Translated_Outcome_Data__c WHERE Translated_Proposal__c = :tpId LIMIT 1
        ];
        System.assertEquals('4m',  outcome2.Skills_Duration_CFY__c);
        System.assertEquals('130', outcome2.Projected_Learner_Enrollments_CFY__c);
    }
    
}