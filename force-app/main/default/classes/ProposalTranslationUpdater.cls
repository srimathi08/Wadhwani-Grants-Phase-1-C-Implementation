public with sharing class ProposalTranslationUpdater {
    
    @InvocableMethod(label='Update Translated Proposal and Related Data')
    public static void updateTranslatedRecords(List<Request> requests) {
        System.debug('=== [updateTranslatedRecords] Invoked with ' + requests.size() + ' requests ===');

        // ---------------- Label → API Mappings ----------------
        Map<String, String> proposalLabelToApi = new Map<String, String>{
            'Organizational Area(s) for Funding' => 'Organizational_Area_s_for_Funding__c',
            'Organization Name' => 'Organization_Name__c',
            'Headquarters City and Country' => 'Headquarters_City_and_Country__c',
            'Primary Service Regions' => 'Primary_Service_Regions__c',
            'Leader Name' => 'Leader_Name__c',
            'Leader Title' => 'Leader_Title__c',
            'Submitter Name' => 'Submitter_Name__c',
            'Job Title' => 'Job_Title__c',
            'Work Email ID' => 'Work_Email_ID__c',
            'Phone' => 'Phone_number__c',
            'Legal Structure' => 'Legal_Structure__c',
            'Organizational Sustainability' => 'Organizational_Sustainability__c',
            'Use of Additional Funding' => 'Use_of_Additional_Funding__c',
            'Operational Synergies with the Wadhwani' => 'Operational_Synergies_with_WOF__c',
            'Use of Additional Funding JC' => 'Use_of_Additional_Funding_JC__c',
            'Operational Synergies with WOF JC' => 'Operational_Synergies_with_WOF_JC__c',
            'Operational Synergies with WOF Both' => 'Operational_Synergies_with_WOF_Both__c',  
            'Legal Structure AI Feedback' => 'Legal_Structure_AI_Feedback__c',
            'Use of Funds AI Feedback' => 'Use_of_Funds_AI_Feedback__c',
            'Operational Synergies AI Feedback' => 'Operational_Synergies_AI_Feedback__c',
            'Organizational Stability AI Feedback' => 'Organizational_Stability_AI_Feedback__c',
            'Legal Rating' => 'Legal_Rating__c',
            'Legal Structure Strength' => 'Legal_Structure_Strength__c',
            'Legal Structure Weakness' =>  'Legal_Structure_Weakness__c',
            'Legal Structure Summary' => 'Legal_Structure_Summary__c',
            'Organizational Stability Rating' => 'Organizational_Stability_Rating__c',
            'Organizational Stability Strength' => 'Organizational_Stability_Strength__c',
            'Organizational Stability Weakness' => 'Organizational_Stability_Weakness__c',
            'Organizational Stability Summary'  => 'Organizational_Stability_Summary__c',
            'Use of Funds Rating'  => 'Use_of_Funds_Rating__c',
            'Use of Funds Strength' => 'Use_of_Funds_Strength__c',
            'Use of Funds Weakness' => 'Use_of_Funds_Weakness__c',
            'Use of Funds Summary' => 'Use_of_Funds_Summary__c',
            'Operational Synergies Rating' => 'Operational_Synergies_Rating__c',
            'Operational Synergies Strength' => 'Operational_Synergies_Strength__c',
            'Operational Synergies Weakness' => 'Operational_Synergies_Weakness__c',
            'Operational Synergies Summary' => 'Operational_Synergies_Summary__c',

            // ---- Job Creation Approach fields ----
            'Job Creation Approach' => 'Job_Creation_Approach__c',
            'Job Creation Rating' => 'Job_Creation_Rating__c',
            'Job Creation Strength' => 'Job_Creation_Strength__c',
            'Job Creation Weakness' => 'Job_Creation_Weakness__c',
            'Job Creation Summary' => 'Job_Creation_Summary__c',

            // ---- Skilling Approach fields ----
            'Skilling Approach' => 'Skilling_Approach__c',
            'Skilling Approach Rating' => 'Skilling_Approach_Rating__c',
            'Skilling Approach Strength' => 'Skilling_Approach_Strength__c',
            'Skilling Approach Weakness' => 'Skilling_Approach_Weakness__c',
            'Skilling Approach Summary' => 'Skilling_Approach_Summary__c'
        };

        Map<String, String> historicalLabelToApi = new Map<String, String>{
            'CY1 Balance Start (CFY - 1)' => 'CY1_Balance_Start_CFY_1__c',
            'CY2 Balance Start (CFY - 2)' => 'CY2_Balance_Start_CFY_2__c',
            'CY3 Balance Start (CFY - 3)' => 'CY3_Balance_Start_CFY_3__c',
            'CY1 Revenue' => 'CY1_Revenue__c',
            'CY2 Revenue' => 'CY2_Revenue__c',
            'CY3 Revenue' => 'CY3_Revenue__c',
            'CY1 Expense' => 'CY1_Expense__c',
            'CY2 Expense' => 'CY2_Expense__c',
            'CY3 Expense' => 'CY3_Expense__c',
            'CY1 Balance End' => 'CY1_Balance_End__c',
            'CY2 Balance End' => 'CY2_Balance_End__c',
            'CY3 Balance End' => 'CY3_Balance_End__c'
        };

        Map<String, String> fiscalLabelToApi = new Map<String, String>{
            'Revenue Budget' => 'Revenue_Budget__c',
            'Revenue Projection' => 'Revenue_Projection__c',
            'Revenue Explanation' => 'Revenue_Explanation__c',
            'Expense Budget' => 'Expense_Budget__c',
            'Expense Projection' => 'Expense_Projection__c',
            'Expense Explanation' => 'Expense_Explanation__c',
            'Net Position Explanation' => 'Net_Position_Explanation__c'
        };

        Map<String, String> outcomeLabelToApi = new Map<String, String>{
            'Skills & Duration(CFY)' => 'Skills_Duration_CFY__c',
            'Skills & Duration(FY-1)' => 'Skills_Duration_FY_1__c',
            'Skills & Duration(FY-2)' => 'Skills_Duration_FY_2__c',
            'Skills & Duration(FY-3)' => 'Skills_Duration_FY_3__c',
            'Avg. Cost per Job (CFY)' => 'Avg_Cost_per_Job_CFY__c',
            'Avg. Cost per Job (FY-1)' => 'Avg_Cost_per_Job_FY_1__c',
            'Avg. Cost per Job (FY-2)' => 'Avg_Cost_per_Job_FY_2__c',
            'Avg. Cost per Job (FY-3)' => 'Avg_Cost_per_Job_FY_3__c',
            'Avg. Cost per Placement(CFY)' => 'Avg_Cost_per_Placement_CFY__c',
            'Avg. Cost per Placement(FY-1)' => 'Avg_Cost_per_Placement_FY_1__c',
            'Avg. Cost per Placement(FY-2)' => 'Avg_Cost_per_Placement_FY_2__c',
            'Avg. Cost per Placement(FY-3)' => 'Avg_Cost_per_Placement_FY_3__c',

            // ---- Manual Avg Cost per Job fields ----
            'Manual Avg. Cost per Job (CFY)' => 'Manual_Avg_Cost_per_Job_CFY__c',
            'Manual Avg. Cost per Job (FY-1)' => 'Manual_Avg_Cost_per_Job_FY_1__c',
            'Manual Avg. Cost per Job (FY-2)' => 'Manual_Avg_Cost_per_Job_FY_2__c',
            'Manual Avg. Cost per Job (FY-3)' => 'Manual_Avg_Cost_per_Job_FY_3__c',

            // ---- Manual Avg Cost per Placement fields ----
            'Manual Avg. Cost per Placement(CFY)' => 'Manual_Avg_Cost_per_Placement_CFY__c',
            'Manual Avg. Cost per Placement(FY-1)' => 'Manual_Avg_Cost_per_Placement_FY_1__c',
            'Manual Avg. Cost per Placement(FY-2)' => 'Manual_Avg_Cost_per_Placement_FY_2__c',
            'Manual Avg. Cost per Placement(FY-3)' => 'Manual_Avg_Cost_per_Placement_FY_3__c',

            'Growing Businesses Supported (CFY)' => 'Growing_Businesses_Supported_CFY__c',
            'Growing Businesses Supported (FY-1)' =>  'Growing_Businesses_Supported_FY_1__c',
            'Growing Businesses Supported (FY-2)' => 'Growing_Businesses_Supported_FY_2__c',
            'Growing Businesses Supported (FY-3)' => 'Growing_Businesses_Supported_FY_3__c',
            'Job Verification (3rd Party CFY)'  => 'Job_Verification_3rd_Party_CFY__c',
            'Job Verification (3rd Party FY1)'  => 'Job_Verification_3rd_Party_FY1__c',
            'Job Verification (3rd Party FY2)' => 'Job_Verification_3rd_Party_FY2__c', 
            'Job Verification (3rd Party FY3)' => 'Job_Verification_3rd_Party_FY3__c',
            'Jobs from Growing Businesses (CFY)' => 'Jobs_from_Growing_Businesses_CFY__c',
            'Jobs from Growing Businesses (FY-1)' => 'Jobs_from_Growing_Businesses_FY_1__c',
            'Jobs from Growing Businesses (FY-2)' => 'Jobs_from_Growing_Businesses_FY_2__c',
            'Jobs from Growing Businesses (FY-3)'  => 'Jobs_from_Growing_Businesses_FY_3__c',
            // NOTE: confirmed against object metadata — this field's real API name is
            // Long_Term_Outcomes_CFY_c__c (not a typo here, the object field itself is
            // named this way; its label just displays as "Long_Term_Outcomes_CFY__c").
            'Long-Term Outcomes (CFY)'  => 'Long_Term_Outcomes_CFY_c__c',
            'Long-Term Outcomes (FY-1)' => 'Long_Term_Outcomes_FY_1__c',
            'Long-Term Outcomes (FY-2)' => 'Long_Term_Outcomes_FY_2__c',
            'Long-Term Outcomes (FY-3)' => 'Long_Term_Outcomes_FY_3__c',
            'Outcome Tracking Details(CFY)' => 'Outcome_Tracking_Details_CFY__c',
            'Outcome Tracking Details(FY-1)' => 'Outcome_Tracking_Details_FY_1__c',
            'Outcome Tracking Details(FY-2)' => 'Outcome_Tracking_Details_FY_2__c',
            'Outcome Tracking Details(FY-3)' => 'Outcome_Tracking_Details_FY_3__c',
            'Projected Jobs from New Businesses (CFY)' => 'Projected_Jobs_from_New_Businesses_CFY__c',
            'Projected Jobs from New Businesses (FY1)'  => 'Projected_Jobs_from_New_Businesses_FY1__c',
            'Projected Jobs from New Businesses (FY2)' => 'Projected_Jobs_from_New_Businesses_FY2__c',
            'Projected Jobs from New Businesses (FY3)' => 'Projected_Jobs_from_New_Businesses_FY3__c',
            'Projected Learner Enrollments (CFY)'  => 'Projected_Learner_Enrollments_CFY__c',
            'Projected Learner Enrollments (FY-1)' => 'Projected_Learner_Enrollments_FY_1__c',
            'Projected Learner Enrollments (FY-2)' => 'Projected_Learner_Enrollments_FY_2__c',
            'Projected Learner Enrollments (FY-3)' => 'Projected_Learner_Enrollments_FY_3__c',
            'Projected Learner placement %(CFY)' =>  'Projected_Learner_placement_CFY__c',
            'Projected Learner placement %(FY-1)' => 'Projected_Learner_placement_FY_1__c',
            'Projected Learner placement %(FY-2)'  => 'Projected_Learner_placement_FY_2__c',
            'Projected Learner placement %(FY-3)' => 'Projected_Learner_placement_FY_3__c',
            'Projected Learner Placements (CFY)' => 'Projected_Learner_Placements_CFY__c',
            'Projected Learner Placements (FY-1)' => 'Projected_Learner_Placements_FY_1__c',
            'Projected Learner Placements (FY-2)'  => 'Projected_Learner_Placements_FY_2__c',
            'Projected Learner Placements (FY-3)' => 'Projected_Learner_Placements_FY_3__c',
            'Projected New Businesses (CFY)' => 'Projected_New_Businesses_CFY__c',
            'Projected New Businesses (FY-1)' => 'Projected_New_Businesses_FY_1__c',
            'Projected New Businesses (FY-2)' => 'Projected_New_Businesses_FY_2__c',
            'Projected New Businesses (FY-3)' => 'Projected_New_Businesses_FY_3__c',
            'Target Business Sectors CFY'  => 'Target_Business_Sectors_CFY__c',
            'Target Business Sectors FY-1' => 'Target_Business_Sectors_FY_1__c',
            'Target Business Sectors FY-2' => 'Target_Business_Sectors_FY_2__c',
            'Target Business Sectors FY-3' => 'Target_Business_Sectors_FY_3__c',
            '3rd-Party Placement Verification (CFY)'  => 'X3rd_Party_Placement_Verification_CFY__c',
            '3rd-Party Placement Verification (FY-1)' => 'X3rd_Party_Placement_Verification_FY_1__c',
            '3rd-Party Placement Verification (FY-2)' => 'X3rd_Party_Placement_Verification_FY_2__c',
            '3rd-Party Placement Verification (FY-3)' => 'X3rd_Party_Placement_Verification_FY_3__c',
            '3rd-Party Verification Description(CFY)' => 'X3rd_Party_Verification_Description_CFY__c',
            '3rd-Party Verification Description(FY-1)' => 'X3rd_Party_Verification_Description_FY1__c',
            '3rd-Party Verification Description(FY-2)' => 'X3rd_Party_Verification_Description_FY2__c',
            '3rd-Party Verification Description(FY-3)' => 'X3rd_Party_Verification_Description_FY3__c'            
        };

        // ---------------- Field Describes ----------------
        Map<String, Schema.SObjectField> proposalFieldsDescribe = Schema.SObjectType.Translated_Proposal__c.fields.getMap();
        Map<String, Schema.SObjectField> histFieldsDescribe     = Schema.SObjectType.Translated_Historical_Data__c.fields.getMap();
        Map<String, Schema.SObjectField> fiscalFieldsDescribe   = Schema.SObjectType.Translated_Current_Fiscal_Year_Data__c.fields.getMap();
        Map<String, Schema.SObjectField> outcomeFieldsDescribe  = Schema.SObjectType.Translated_Outcome_Data__c.fields.getMap();

        // ---------------- Process Each Request ----------------
        for (Request req : requests) {
            if (String.isBlank(req.jsonText) || req.translatedProposalId == null) continue;

            Map<String, Object> parsed = (Map<String, Object>)JSON.deserializeUntyped(req.jsonText);
            System.debug('=== Parsed JSON === ' + JSON.serializePretty(parsed));

            // ---- Proposal ----
            if (parsed.containsKey('Proposal')) {
                Translated_Proposal__c proposal = [
                    SELECT Id FROM Translated_Proposal__c WHERE Id = :req.translatedProposalId LIMIT 1
                ];
                Map<String, Object> propSection = (Map<String, Object>)parsed.get('Proposal');
                safeAssign(proposal, proposalLabelToApi, proposalFieldsDescribe, propSection);
                proposal.Status__c = 'Translated';
                update proposal;
            }

            // ---- Historical Data ----
            if (parsed.containsKey('Historical Data')) {
                Map<String, Object> histSection = (Map<String, Object>)parsed.get('Historical Data');
                Translated_Historical_Data__c hist = getOrCreateHist(req.translatedProposalId);
                safeAssign(hist, historicalLabelToApi, histFieldsDescribe, histSection);
                upsert hist;
            }

            // ---- Fiscal Data ----
            if (parsed.containsKey('Current Fiscal Year Data')) {
                Map<String, Object> fySection = (Map<String, Object>)parsed.get('Current Fiscal Year Data');
                Translated_Current_Fiscal_Year_Data__c fiscal = getOrCreateFiscal(req.translatedProposalId);
                safeAssign(fiscal, fiscalLabelToApi, fiscalFieldsDescribe, fySection);
                upsert fiscal;
            }

            // ---- Outcome Data ----
            if (parsed.containsKey('Outcomes Data')) {
                Map<String, Object> outSection = (Map<String, Object>)parsed.get('Outcomes Data');
                Translated_Outcome_Data__c outcome = getOrCreateOutcome(req.translatedProposalId);
                safeAssign(outcome, outcomeLabelToApi, outcomeFieldsDescribe, outSection);
                upsert outcome;
            }
        }
    }

    // ---------------- Generic Safe Assignment ----------------
    private static void safeAssign(SObject record,
                                   Map<String, String> labelToApi,
                                   Map<String, Schema.SObjectField> fieldsDescribe,
                                   Map<String, Object> section) {
        for (String label : section.keySet()) {
            String apiName = labelToApi.get(label);
            if (apiName == null) {
                // Surfaces unmapped labels instead of silently skipping them.
                // If a new field is ever added to ProposalDataCollector without a
                // matching entry in the label→API map above, this line will flag it
                // in the debug log instead of the data just quietly not saving.
                System.debug('⚠️ No API mapping found for label: "' + label + '" — value was NOT saved.');
                continue;
            }

            Schema.SObjectField fld = fieldsDescribe.get(apiName);
            if (fld == null) {
                // Same idea — apiName resolved but no such field exists on the object.
                System.debug('⚠️ Label "' + label + '" mapped to "' + apiName +
                             '" but no matching field exists on ' + record.getSObjectType() +
                             ' — value was NOT saved.');
                continue;
            }

            Schema.DescribeFieldResult dfr = fld.getDescribe();
            Object val = section.get(label);

            if (val == null) continue;

            try {
                if (dfr.getType() == Schema.DisplayType.Currency 
                    || dfr.getType() == Schema.DisplayType.Double
                    || dfr.getType() == Schema.DisplayType.Percent) {
                    record.put(apiName, Decimal.valueOf(String.valueOf(val)));
                } else if (dfr.getType() == Schema.DisplayType.Integer) {
                    record.put(apiName, Integer.valueOf(String.valueOf(val)));
                } else {
                    record.put(apiName, String.valueOf(val));
                }
            } catch (Exception e) {
                System.debug('⚠️ Skipped assignment for ' + apiName + ' due to ' + e.getMessage());
            }
        }
    }

    // ---------------- Helper methods ----------------
    private static Translated_Historical_Data__c getOrCreateHist(Id proposalId) {
        List<Translated_Historical_Data__c> lst = [
            SELECT Id FROM Translated_Historical_Data__c WHERE Translated_Proposal__c = :proposalId LIMIT 1
        ];
        return lst.isEmpty() ? new Translated_Historical_Data__c(Translated_Proposal__c = proposalId) : lst[0];
    }

    private static Translated_Current_Fiscal_Year_Data__c getOrCreateFiscal(Id proposalId) {
        List<Translated_Current_Fiscal_Year_Data__c> lst = [
            SELECT Id FROM Translated_Current_Fiscal_Year_Data__c WHERE Translated_Proposal__c = :proposalId LIMIT 1
        ];
        return lst.isEmpty() ? new Translated_Current_Fiscal_Year_Data__c(Translated_Proposal__c = proposalId) : lst[0];
    }

    private static Translated_Outcome_Data__c getOrCreateOutcome(Id proposalId) {
        List<Translated_Outcome_Data__c> lst = [
            SELECT Id FROM Translated_Outcome_Data__c WHERE Translated_Proposal__c = :proposalId LIMIT 1
        ];
        return lst.isEmpty() ? new Translated_Outcome_Data__c(Translated_Proposal__c = proposalId) : lst[0];
    }

    // ---------------- Request DTO ----------------
    public class Request {
        @InvocableVariable public Id translatedProposalId;
        @InvocableVariable public String jsonText;
    }
}