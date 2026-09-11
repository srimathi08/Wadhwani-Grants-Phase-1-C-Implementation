public with sharing class ProposalDataCollector {

public class Request {
        @InvocableVariable(required=true)
        public Id proposalId;
    }

    public class Response {
        @InvocableVariable
        public String jsonPayload;
    }

    @InvocableMethod(label='Build Proposal JSON')
    public static List<Response> buildProposalJson(List<Request> requests) {
        List<Response> results = new List<Response>();

        for (Request req : requests) {
            Response resp = new Response();
        

        // 1. Query Proposal fields
        IndividualApplication proposal = [
            SELECT Id, Organizational_Area_s_for_Funding_Inves__c, Organization_Name__c, Headquarters_City_and_Country__c, Primary_Service_Regions__c, Leader_Name__c,
            Leader_Title__c, Submitter_Name__c, Job_Title__c, Work_Email_ID__c, Phone__c, Legal_Structure__c, 
            Organizational_Sustainability__c, Use_of_Additional_Funding__c, Operational_Synergies_with_WOF__c, Operational_Synergies_with_WOF_Both__c,
            Use_of_Additional_Funding_JC__c, Operational_Synergies_with_WOF_JC__c, Legal_Structure_AI_Feedback__c,
            Use_of_Funds_AI_Feedback__c, Operational_Synergies_AI_Feedback__c, Organizational_Stability_AI_Feedback__c,
            Legal_Structure_Strength__c, Legal_Structure_Weakness__c, Legal_Structure_Summary__c, Legal_Rating__c,
            Organizational_Stability_Rating__c, Organizational_Stability_Strength__c, Organizational_Stability_Weakness__c, Organizational_Stability_Summary__c,
            Use_of_Funds_Rating__c, Use_of_Funds_Strength__c, Use_of_Funds_Weakness__c, Use_of_Funds_Summary__c, Operational_Synergies_Rating__c,
            Operational_Synergies_Strength__c, Operational_Synergies_Weakness__c, Operational_Synergies_Summary__c, Skilling_Approach__c, Revenue_Explanation__c, Job_Creation_Approach__c,
            Job_Creation_Rating__c, Job_Creation_Strength__c, Job_Creation_Weakness__c, Job_Creation_Summary__c,
            Skilling_Approach_Rating__c, Skilling_Approach_Strength__c, Skilling_Approach_Weakness__c, Skilling_Approach_Summary__c
            FROM IndividualApplication
            WHERE Id = :req.proposalId
            LIMIT 1
        ];
            
        system.debug ('proposal >>'+ proposal);  

        // 2. Query Historical Data
        List<Historical_Data__c> histList = [
            SELECT Id, CY1_Balance_Start_CFY_1__c, CY1_Revenue__c, CY1_Expense__c, CY1_Balance_End__c,
            CY2_Balance_Start_CFY_2__c, CY2_Revenue__c, CY2_Expense__c, CY2_Balance_End__c,    
            CY3_Balance_Start_CFY_3__c, CY3_Revenue__c, CY3_Expense__c, CY3_Balance_End__c    
            FROM Historical_Data__c
            WHERE Proposal__c = :req.proposalId
            LIMIT 1
        ];

        // 3. Query Current Fiscal Year Data
        List<Current_Fiscal_Year_Data__c> fiscalList = [
            SELECT Id, Revenue_Budget__c, Revenue_Projection__c, Revenue_Variance__c, Revenue_Explanation__c,
                Expense_Budget__c, Expense_Projection__c, Expense_Variance__c, Expense_Explanation__c,
                Net_Budget__c, Net_Projection__c, Net_Variance__c, Net_Position_Explanation__c
            FROM Current_fiscal_year_data__c WHERE Proposal__c  = :req.proposalId
            LIMIT 1
        ];

        // 4. Query Outcome Data
        List<Outcomes_Data__c> outcomeList = [
             SELECT Id, Name, Skills_Duration_CFY__c, Skills_Duration_FY_1__c, Skills_Duration_FY_2__c, Skills_Duration_FY_3__c,
                        Projected_Learner_Enrollments_CFY__c, Projected_Learner_Enrollments_FY_1__c, Projected_Learner_Enrollments_FY_2__c, 
                        Projected_Learner_Enrollments_FY_3__c, Projected_Learner_Placements_CFY__c, Projected_Learner_Placements_FY_1__c, 
                        Projected_Learner_Placements_FY_2__c, Projected_Learner_Placements_FY_3__c, Projected_Learner_placement_CFY__c,
                        Projected_Learner_placement_FY_1__c, Projected_Learner_placement_FY_2__c, Projected_Learner_placement_FY_3__c, 
                        Avg_Cost_per_Placement_CFY__c, Avg_Cost_per_Placement_FY_1__c, Avg_Cost_per_Placement_FY_2__c, Avg_Cost_per_Placement_FY_3__c, 
                        Manual_Avg_Cost_per_Placement_CFY__c, Manual_Avg_Cost_per_Placement_FY_1__c, Manual_Avg_Cost_per_Placement_FY_2__c, Manual_Avg_Cost_per_Placement_FY_3__c,
                        X3rd_Party_Placement_Verification_CFY__c, X3rd_Party_Placement_Verification_FY_1__c, X3rd_Party_Placement_Verification_FY_2__c, 
                        X3rd_Party_Placement_Verification_FY_3__c, X3rd_Party_Verification_Description_CFY__c, 
                        X3rd_Party_Verification_Description_FY_1__c, X3rd_Party_Verification_Description_FY_2__c, X3rd_Party_Verification_Description_FY_3__c,
                        Long_Term_Outcomes_CFY__c, Long_Term_Outcomes_FY_1__c, Long_Term_Outcomes_FY_2__c, Long_Term_Outcomes_FY_3__c,Outcome_Tracking_Details_CFY__c,
                        Outcome_Tracking_Details_FY_1__c, Outcome_Tracking_Details_FY_2__c, Outcome_Tracking_Details_FY_3__c,
                        Target_Business_Sectors_CFY__c, Target_Business_Sectors_FY_1__c, Target_Business_Sectors_FY_2__c, Target_Business_Sectors_FY_3__c,
                        Projected_New_Businesses_CFY__c, Projected_New_Businesses_FY_1__c, Projected_New_Businesses_FY_2__c, Projected_New_Businesses_FY_3__c,
                        Projected_Jobs_from_New_Businesses_CFY__c, Projected_Jobs_from_New_Businesses_FY1__c, Projected_Jobs_from_New_Businesses_FY2__c, 
                        Projected_Jobs_from_New_Businesses_FY3__c, Growing_Businesses_Supported_CFY__c, Growing_Businesses_Supported_FY_1__c, 
                        Growing_Businesses_Supported_FY_2__c, Growing_Businesses_Supported_FY_3__c, Jobs_from_Growing_Businesses_CFY__c, 
                        Jobs_from_Growing_Businesses_FY_1__c, Jobs_from_Growing_Businesses_FY_2__c, Jobs_from_Growing_Businesses_FY_3__c, 
                        Avg_Cost_per_Job_CFY__c, Avg_Cost_per_Job_FY_1__c, Avg_Cost_per_Job_FY_2__c, Avg_Cost_per_Job_FY_3__c, 
                        Manual_Avg_Cost_per_Job_CFY__c, Manual_Avg_Cost_per_Job_FY_1__c, Manual_Avg_Cost_per_Job_FY_2__c, Manual_Avg_Cost_per_Job_FY_3__c,
                        Job_Verification_3rd_Party_CFY__c, Job_Verification_3rd_Party_FY1__c, Job_Verification_3rd_Party_FY2__c, Job_Verification_3rd_Party_FY3__c,
                        X3rd_party_verification_details_CFY__c, X3rd_party_verification_details_FY1__c, X3rd_party_verification_details_FY2__c, X3rd_party_verification_details_FY3__c
                        FROM Outcomes_Data__c WHERE Proposal__c = :req.proposalId
            LIMIT 1
        ];

        // Build JSON structure
        Map<String, Object> payload = new Map<String, Object>();

        // Proposal section
        Map<String, Object> proposalMap = new Map<String, Object>{
            'Organizational Area(s) for Funding' => String.valueOf(proposal.Organizational_Area_s_for_Funding_Inves__c),
            'Organization Name' =>  proposal.Organization_Name__c,
            'Headquarters City and Country' => proposal.Headquarters_City_and_Country__c,
            'Primary Service Regions' => proposal.Primary_Service_Regions__c,
            'Leader Name' => proposal.Leader_Name__c,
            'Leader Title' => proposal.Leader_Title__c,
            'Submitter Name' => proposal.Submitter_Name__c,
            'Job Title' => proposal.Job_Title__c,
            'Work Email ID' => proposal.Work_Email_ID__c,
            'Phone' => proposal.Phone__c,
            'Legal Structure' => proposal.Legal_Structure__c,
            'Organizational Sustainability' => proposal.Organizational_Sustainability__c,
            'Use of Additional Funding' => proposal.Use_of_Additional_Funding__c,
            'Operational Synergies with the Wadhwani' => proposal.Operational_Synergies_with_WOF__c,
            'Use of Additional Funding JC' => proposal.Use_of_Additional_Funding_JC__c,
            'Operational Synergies with WOF JC' => proposal.Operational_Synergies_with_WOF_JC__c,
            'Legal Structure AI Feedback' => proposal.Legal_Structure_AI_Feedback__c,
            'Use of Funds AI Feedback'   => proposal.Use_of_Funds_AI_Feedback__c,
            'Operational Synergies AI Feedback' => proposal.Operational_Synergies_AI_Feedback__c,
            'Organizational Stability AI Feedback' => proposal.Organizational_Stability_AI_Feedback__c,
            'Operational Synergies with WOF Both' => proposal.Operational_Synergies_with_WOF_Both__c,
            'Job Creation Approach' => proposal.Job_Creation_Approach__c,
            'Skilling Approach' => proposal.Skilling_Approach__c,   
            'Legal Rating' => proposal.Legal_Rating__c,
            'Legal Structure Strength' => proposal.Legal_Structure_Strength__c,
            'Legal Structure Weakness' =>  proposal.Legal_Structure_Weakness__c,
            'Legal Structure Summary' => proposal.Legal_Structure_Summary__c,
            'Organizational Stability Rating' => proposal.Organizational_Stability_Rating__c,
            'Organizational Stability Strength' => proposal.Organizational_Stability_Strength__c,
            'Organizational Stability Weakness' => proposal.Organizational_Stability_Weakness__c,
            'Organizational Stability Summary'  => proposal.Organizational_Stability_Summary__c,
            'Use of Funds Rating'  => proposal.Use_of_Funds_Rating__c,
            'Use of Funds Strength' => proposal.Use_of_Funds_Strength__c,
            'Use of Funds Weakness' => proposal.Use_of_Funds_Weakness__c,
            'Use of Funds Summary' => proposal.Use_of_Funds_Summary__c,
            'Operational Synergies Rating' => proposal.Operational_Synergies_Rating__c,
            'Operational Synergies Strength' => proposal.Operational_Synergies_Strength__c,
            'Operational Synergies Weakness' => proposal.Operational_Synergies_Weakness__c,
            'Operational Synergies Summary' => proposal.Operational_Synergies_Summary__c,
            'Job Creation Rating' => proposal.Job_Creation_Rating__c,
            'Job Creation Strength' => proposal.Job_Creation_Strength__c,
            'Job Creation Weakness' => proposal.Job_Creation_Weakness__c,
            'Job Creation Summary' =>  proposal.Job_Creation_Summary__c,
            'Skilling Approach Rating' => proposal.Skilling_Approach_Rating__c,
            'Skilling Approach Strength' => proposal.Skilling_Approach_Strength__c,
            'Skilling Approach Weakness' => proposal.Skilling_Approach_Weakness__c,
            'Skilling Approach Summary' =>  proposal.Skilling_Approach_Summary__c    
        };
        payload.put('Proposal', proposalMap);

        // Historical Data section
        if (!histList.isEmpty()) {
            Historical_Data__c hist = histList[0];
            Map<String, Object> histMap = new Map<String, Object>{
                'CY1 Balance Start (CFY - 1)' => hist.CY1_Balance_Start_CFY_1__c,
                'CY2 Balance Start (CFY - 2)' => hist.CY2_Balance_Start_CFY_2__c,
                'CY3 Balance Start (CFY - 3)' => hist.CY3_Balance_Start_CFY_3__c,
                'CY1 Revenue' => hist.CY1_Revenue__c,
                'CY2 Revenue' => hist.CY2_Revenue__c,
                'CY3 Revenue' => hist.CY3_Revenue__c,
                'CY1 Expense' => hist.CY1_Expense__c,
                'CY2 Expense' => hist.CY2_Expense__c,
                'CY3 Expense' => hist.CY3_Expense__c,
                'CY1 Balance End' => hist.CY1_Balance_End__c,
                'CY2 Balance End' => hist.CY2_Balance_End__c,
                'CY3 Balance End' => hist.CY3_Balance_End__c    
            };
            payload.put('Historical Data', histMap);
        }

        // Fiscal Data section
        if (!fiscalList.isEmpty()) {
            Current_Fiscal_Year_Data__c fy = fiscalList[0];
            Map<String, Object> fiscalMap = new Map<String, Object>{
                'Revenue Budget' => fy.Revenue_Budget__c,
                'Revenue Projection' => fy.Revenue_Projection__c,
                'Revenue Explanation' => fy.Revenue_Explanation__c,    
                'Expense Budget' => fy.Expense_Budget__c,
                'Expense Projection' => fy.Expense_Projection__c,
                'Expense Explanation' => fy.Expense_Explanation__c,    
                'Net Position Explanation' => fy.Net_Position_Explanation__c
            };
            payload.put('Current Fiscal Year Data', fiscalMap);
        }

        // Outcomes Data section
        if (!outcomeList.isEmpty()) {
            Outcomes_Data__c out = outcomeList[0];
            Map<String, Object> outcomeMap = new Map<String, Object>{
                'Skills & Duration(CFY)' => out.Skills_Duration_CFY__c,
                'Skills & Duration(FY-1)' => out.Skills_Duration_FY_1__c,
                'Skills & Duration(FY-2)' => out.Skills_Duration_FY_2__c,
                'Skills & Duration(FY-3)' => out.Skills_Duration_FY_3__c,
                'Avg. Cost per Job (CFY)' => out.Avg_Cost_per_Job_CFY__c,
                'Avg. Cost per Job (FY-1)' => out.Avg_Cost_per_Job_FY_1__c,
                'Avg. Cost per Job (FY-2)' => out.Avg_Cost_per_Job_FY_2__c,
                'Avg. Cost per Job (FY-3)' => out.Avg_Cost_per_Job_FY_3__c,
                'Manual Avg. Cost per Job (CFY)' => out.Manual_Avg_Cost_per_Job_CFY__c,
                'Manual Avg. Cost per Job (FY-1)' => out.Manual_Avg_Cost_per_Job_FY_1__c,
                'Manual Avg. Cost per Job (FY-2)' => out.Manual_Avg_Cost_per_Job_FY_2__c,
                'Manual Avg. Cost per Job (FY-3)' => out.Manual_Avg_Cost_per_Job_FY_3__c,
                'Avg. Cost per Placement(CFY)' => out.Avg_Cost_per_Placement_CFY__c,
            'Avg. Cost per Placement(FY-1)' => out.Avg_Cost_per_Placement_FY_1__c,
            'Avg. Cost per Placement(FY-2)' => out.Avg_Cost_per_Placement_FY_2__c,
            'Avg. Cost per Placement(FY-3)' => out.Avg_Cost_per_Placement_FY_3__c,
            'Manual Avg. Cost per Placement(CFY)' => out.Manual_Avg_Cost_per_Placement_CFY__c,
            'Manual Avg. Cost per Placement(FY-1)' => out.Manual_Avg_Cost_per_Placement_FY_1__c,
            'Manual Avg. Cost per Placement(FY-2)' => out.Manual_Avg_Cost_per_Placement_FY_2__c,
            'Manual Avg. Cost per Placement(FY-3)' => out.Manual_Avg_Cost_per_Placement_FY_3__c,
            'Growing Businesses Supported (CFY)' => out.Growing_Businesses_Supported_CFY__c,
            'Growing Businesses Supported (FY-1)' =>  out.Growing_Businesses_Supported_FY_1__c,
            'Growing Businesses Supported (FY-2)' => out.Growing_Businesses_Supported_FY_2__c,
            'Growing Businesses Supported (FY-3)' => out.Growing_Businesses_Supported_FY_3__c,
            'Job Verification (3rd Party CFY)'  => out.Job_Verification_3rd_Party_CFY__c,
            'Job Verification (3rd Party FY1)'  => out.Job_Verification_3rd_Party_FY1__c,
            'Job Verification (3rd Party FY2)' => out.Job_Verification_3rd_Party_FY2__c, 
            'Job Verification (3rd Party FY3)' => out.Job_Verification_3rd_Party_FY3__c,
            'Jobs from Growing Businesses (CFY)' => out.Jobs_from_Growing_Businesses_CFY__c,
            'Jobs from Growing Businesses (FY-1)' => out.Jobs_from_Growing_Businesses_FY_1__c,
            'Jobs from Growing Businesses (FY-2)' => out.Jobs_from_Growing_Businesses_FY_2__c,
            'Jobs from Growing Businesses (FY-3)'  => out.Jobs_from_Growing_Businesses_FY_3__c,
            'Long-Term Outcomes (CFY)'  => out.Long_Term_Outcomes_CFY__c,
            'Long-Term Outcomes (FY-1)' => out.Long_Term_Outcomes_FY_1__c,
            'Long-Term Outcomes (FY-2)' => out.Long_Term_Outcomes_FY_2__c,
            'Long-Term Outcomes (FY-3)' => out.Long_Term_Outcomes_FY_3__c,
            'Outcome Tracking Details(CFY)' => out.Outcome_Tracking_Details_CFY__c,
            'Outcome Tracking Details(FY-1)' => out.Outcome_Tracking_Details_FY_1__c,
            'Outcome Tracking Details(FY-2)' => out.Outcome_Tracking_Details_FY_2__c,
            'Outcome Tracking Details(FY-3)' => out.Outcome_Tracking_Details_FY_3__c,
            'Projected Jobs from New Businesses (CFY)' => out.Projected_Jobs_from_New_Businesses_CFY__c,
            'Projected Jobs from New Businesses (FY1)'  => out.Projected_Jobs_from_New_Businesses_FY1__c,
            'Projected Jobs from New Businesses (FY2)' => out.Projected_Jobs_from_New_Businesses_FY2__c,
            'Projected Jobs from New Businesses (FY3)' => out.Projected_Jobs_from_New_Businesses_FY3__c,
            'Projected Learner Enrollments (CFY)'  => out.Projected_Learner_Enrollments_CFY__c,
            'Projected Learner Enrollments (FY-1)' => out.Projected_Learner_Enrollments_FY_1__c,
            'Projected Learner Enrollments (FY-2)' => out.Projected_Learner_Enrollments_FY_2__c,
            'Projected Learner Enrollments (FY-3)' => out.Projected_Learner_Enrollments_FY_3__c,
            'Projected Learner placement %(CFY)' =>  out.Projected_Learner_placement_CFY__c,
            'Projected Learner placement %(FY-1)' => out.Projected_Learner_placement_FY_1__c,
            'Projected Learner placement %(FY-2)'  => out.Projected_Learner_placement_FY_2__c,
            'Projected Learner placement %(FY-3)' => out.Projected_Learner_placement_FY_3__c,
            'Projected Learner Placements (CFY)' => out.Projected_Learner_Placements_CFY__c,
            'Projected Learner Placements (FY-1)' => out.Projected_Learner_Placements_FY_1__c,
            'Projected Learner Placements (FY-2)'  => out.Projected_Learner_Placements_FY_2__c,
            'Projected Learner Placements (FY-3)' => out.Projected_Learner_Placements_FY_3__c,
            'Projected New Businesses (CFY)' => out.Projected_New_Businesses_CFY__c,
            'Projected New Businesses (FY-1)' => out.Projected_New_Businesses_FY_1__c,
            'Projected New Businesses (FY-2)' => out.Projected_New_Businesses_FY_2__c,
            'Projected New Businesses (FY-3)' => out.Projected_New_Businesses_FY_3__c,
            'Target Business Sectors CFY'  => out.Target_Business_Sectors_CFY__c,
            'Target Business Sectors FY-1' => out.Target_Business_Sectors_FY_1__c,
            'Target Business Sectors FY-2' => out.Target_Business_Sectors_FY_2__c,
            'Target Business Sectors FY-3' => out.Target_Business_Sectors_FY_3__c,
            '3rd-Party Placement Verification (CFY)'  => out.X3rd_Party_Placement_Verification_CFY__c,
            '3rd-Party Placement Verification (FY-1)' => out.X3rd_Party_Placement_Verification_FY_1__c,
            '3rd-Party Placement Verification (FY-2)' => out.X3rd_Party_Placement_Verification_FY_2__c,
            '3rd-Party Placement Verification (FY-3)' => out.X3rd_Party_Placement_Verification_FY_3__c,
            '3rd-Party Verification Description(CFY)' => out.X3rd_Party_Verification_Description_CFY__c,
            '3rd-Party Verification Description(FY-1)' => out.X3rd_Party_Verification_Description_FY_1__c,
            '3rd-Party Verification Description(FY-2)' => out.X3rd_Party_Verification_Description_FY_2__c,
            '3rd-Party Verification Description(FY-3)' => out.X3rd_Party_Verification_Description_FY_3__c      
            };
            payload.put('Outcomes Data', outcomeMap);
        }

       resp.jsonPayload = JSON.serializePretty(payload);
            results.add(resp);
        }

        return results;
    }
}