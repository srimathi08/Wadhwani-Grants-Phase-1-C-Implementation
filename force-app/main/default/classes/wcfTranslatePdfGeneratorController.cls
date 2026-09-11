public class wcfTranslatePdfGeneratorController {
     public class WCFWrapper {
        @AuraEnabled public Translated_Proposal__c app;
        @AuraEnabled public Translated_Historical_Data__c historical;
        @AuraEnabled public Translated_Current_Fiscal_Year_Data__c fiscalYear;
        @AuraEnabled public List<Translated_Outcome_Data__c> outcomes;
        @AuraEnabled public List<String> fileUrls;
    }
    
     @AuraEnabled
    public static WCFWrapper getWCFApplicationWithRelatedData(String recordId) {
        system.debug('RecordId >>'+ recordId);
        WCFWrapper wrapper = new WCFWrapper();

        // Main record
        wrapper.app = [SELECT Id, Organizational_Area_s_for_Funding__c, Organization_Name__c, Headquarters_City_and_Country__c, Primary_Service_Regions__c, Leader_Name__c, Leader_Title__c, 
                       Submitter_Name__c, Job_Title__c, Work_Email_ID__c, Phone_number__c, Legal_Structure__c, Organizational_Sustainability__c, Operational_Synergies_with_WOF_Both__c,
                       Use_of_Additional_Funding__c, Operational_Synergies_with_WOF__c, Use_of_Additional_Funding_JC__c, Operational_Synergies_with_WOF_JC__c
                       FROM Translated_Proposal__c WHERE Id = :recordId LIMIT 1];
        

        // Historical Data (1 record per app, all 3 years as fields)
        List<Translated_Historical_Data__c> historicalList = [SELECT CY1_Balance_Start_CFY_1__c, CY2_Balance_Start_CFY_2__c, CY3_Balance_Start_CFY_3__c,
                                                   CY1_Revenue__c, CY2_Revenue__c, CY3_Revenue__c,
                                                   CY1_Expense__c, CY2_Expense__c, CY3_Expense__c,
                                                   CY1_Balance_End__c, CY2_Balance_End__c, CY3_Balance_End__c
                                                   FROM Translated_Historical_Data__c WHERE Translated_Proposal__c = :recordId LIMIT 1];
        
        system.debug('historicalList Size >>'+ historicalList.size());
            
        wrapper.historical = historicalList.isEmpty() ? null : historicalList[0];

        // Current Fiscal Year Data (1 record per app)
        List<Translated_Current_Fiscal_Year_Data__c> fiscalList = [SELECT Revenue_Budget__c, Revenue_Projection__c, Revenue_Explanation__c, Expense_Variance__c,
                                                                   Expense_Budget__c, Expense_Projection__c, Expense_Explanation__c,Revenue_Variance__c,
                                                                   Net_Budget__c, Net_Projection__c, Net_Variance__c, Net_Position_Explanation__c
                                                                   FROM Translated_Current_Fiscal_Year_Data__c WHERE Translated_Proposal__c = :recordId LIMIT 1];
        wrapper.fiscalYear = fiscalList.isEmpty() ? null : fiscalList[0];
        
        system.debug('fiscalList Size >>'+ fiscalList.size());

        // Outcome Data (multiple records, can be for job fulfillment or creation or both)
        wrapper.outcomes = [
        SELECT Skills_Duration_CFY__c, Skills_Duration_FY_1__c, Skills_Duration_FY_2__c, Skills_Duration_FY_3__c, Avg_Cost_per_Job_CFY__c, Avg_Cost_per_Job_FY_1__c,
        Avg_Cost_per_Job_FY_2__c, Avg_Cost_per_Job_FY_3__c, Avg_Cost_per_Placement_CFY__c, Avg_Cost_per_Placement_FY_1__c, Avg_Cost_per_Placement_FY_2__c,
        Avg_Cost_per_Placement_FY_3__c, Growing_Businesses_Supported_CFY__c, Growing_Businesses_Supported_FY_1__c, Growing_Businesses_Supported_FY_2__c,
        Growing_Businesses_Supported_FY_3__c, Job_Verification_3rd_Party_CFY__c, Job_Verification_3rd_Party_FY1__c, Job_Verification_3rd_Party_FY2__c,Job_Verification_3rd_Party_FY3__c,
        Jobs_from_Growing_Businesses_CFY__c, Jobs_from_Growing_Businesses_FY_1__c, Jobs_from_Growing_Businesses_FY_2__c, Jobs_from_Growing_Businesses_FY_3__c,
       Long_Term_Outcomes_CFY_c__c,
        Long_Term_Outcomes_FY_1__c, Long_Term_Outcomes_FY_2__c, Long_Term_Outcomes_FY_3__c, Outcome_Tracking_Details_CFY__c,
        Outcome_Tracking_Details_FY_1__c, Outcome_Tracking_Details_FY_2__c, Outcome_Tracking_Details_FY_3__c, Outcomes_Data__c, Projected_Jobs_from_New_Businesses_CFY__c, Name,
        Projected_Jobs_from_New_Businesses_FY1__c, Projected_Jobs_from_New_Businesses_FY2__c, Projected_Jobs_from_New_Businesses_FY3__c, Projected_Learner_Enrollments_CFY__c,
        Projected_Learner_Enrollments_FY_1__c, Projected_Learner_Enrollments_FY_2__c,Projected_Learner_Enrollments_FY_3__c, Projected_Learner_placement_CFY__c,
        Projected_Learner_placement_FY_1__c, Projected_Learner_placement_FY_2__c, Projected_Learner_placement_FY_3__c, Projected_New_Businesses_CFY__c,
        Projected_New_Businesses_FY_1__c, Projected_New_Businesses_FY_2__c, Projected_New_Businesses_FY_3__c,
        Target_Business_Sectors_CFY__c, Target_Business_Sectors_FY_1__c, Target_Business_Sectors_FY_2__c,
        Target_Business_Sectors_FY_3__c, Translated_Proposal__c, X3rd_Party_Placement_Verification_CFY__c, X3rd_Party_Placement_Verification_FY_1__c,
        X3rd_Party_Placement_Verification_FY_2__c, X3rd_Party_Placement_Verification_FY_3__c, X3rd_Party_Verification_Description_CFY__c, X3rd_Party_Verification_Description_FY1__c,
        X3rd_Party_Verification_Description_FY2__c, X3rd_Party_Verification_Description_FY3__c, X3rd_party_verification_details_CFY__c, X3rd_party_verification_details_FY1__c,
        X3rd_party_verification_details_FY2__c, X3rd_party_verification_details_FY3__c, Projected_Learner_Placements_CFY__c, Projected_Learner_Placements_FY_1__c,
        Projected_Learner_Placements_FY_2__c, Projected_Learner_Placements_FY_3__c    
        FROM Translated_Outcome_Data__c
       WHERE Translated_Proposal__c = :recordId ];
        system.debug('outcomes >>'+ wrapper.outcomes);

      
        return wrapper;
    }

}