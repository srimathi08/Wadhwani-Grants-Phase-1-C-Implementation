public class translatedOutcomeDataTableController {
 @AuraEnabled(cacheable=true)
    public static Map<String, Object> getOutcomeData(Id translatedProposalId) {
        Map<String, Object> result = new Map<String, Object>();
        
        //Get Translated Proposal Id 
        Translated_Proposal__c tp = [SELECT Id, Proposal__c FROM Translated_Proposal__c
                                     WHERE Id =: translatedProposalId];
        Id Ia_Id = tp.Proposal__c;

        // Get picklist value from IndividualApplication
        IndividualApplication ia = [SELECT Id, Organizational_Area_s_for_Funding_Inves__c FROM IndividualApplication
                                    WHERE Id = :Ia_Id  LIMIT 1];
        result.put('orgArea', ia.Organizational_Area_s_for_Funding_Inves__c);

        // Get related Outcome_Data__c record(s)
        List<Translated_Outcome_Data__c> outcomeList = [
            SELECT Skills_Duration_CFY__c, Skills_Duration_FY_1__c, Skills_Duration_FY_2__c, Skills_Duration_FY_3__c, Avg_Cost_per_Job_CFY__c, Avg_Cost_per_Job_FY_1__c,
        Avg_Cost_per_Job_FY_2__c, Avg_Cost_per_Job_FY_3__c, Avg_Cost_per_Placement_CFY__c, Avg_Cost_per_Placement_FY_1__c, Avg_Cost_per_Placement_FY_2__c,
        Avg_Cost_per_Placement_FY_3__c, Growing_Businesses_Supported_CFY__c, Growing_Businesses_Supported_FY_1__c, Growing_Businesses_Supported_FY_2__c,
        Growing_Businesses_Supported_FY_3__c, Job_Verification_3rd_Party_CFY__c, Job_Verification_3rd_Party_FY1__c, Job_Verification_3rd_Party_FY2__c,Job_Verification_3rd_Party_FY3__c,
        Jobs_from_Growing_Businesses_CFY__c, Jobs_from_Growing_Businesses_FY_1__c, Jobs_from_Growing_Businesses_FY_2__c, Jobs_from_Growing_Businesses_FY_3__c,
        Long_Term_Outcomes_CFY_c__c, Long_Term_Outcomes_FY_1__c, Long_Term_Outcomes_FY_2__c, Long_Term_Outcomes_FY_3__c, Outcome_Tracking_Details_CFY__c,
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
        WHERE Translated_Proposal__c = :translatedProposalId LIMIT 1
            ];

        if (!outcomeList.isEmpty()) {
            result.put('outcomeData', outcomeList[0]);
        }
        return result;
    }
}