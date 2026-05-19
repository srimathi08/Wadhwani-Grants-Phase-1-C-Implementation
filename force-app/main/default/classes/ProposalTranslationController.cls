public with sharing class ProposalTranslationController {

    @AuraEnabled
    public static Id createOrTriggerTranslation(Id proposalId, String targetLanguage) {
        system.debug('ProposalId >>'+ proposalId);
        system.debug('targetLanguage >>'+ targetLanguage);
        // Check if translation already exists
        List<Translated_Proposal__c> existing = [ SELECT Id, isTrigger__c, Status__c,Proposal__c FROM Translated_Proposal__c
                                                  WHERE Proposal__c = :proposalId AND Translated_Language__c = :targetLanguage LIMIT 1 ];
                  
        System.debug('Queried existing Translated_Proposal__c count: ' + existing.size());
       if (!existing.isEmpty()) {
            // Just update isTrigger__c to true if already exists
            Translated_Proposal__c tp = existing[0];
            tp.isTrigger__c = true;
            update tp;
            System.debug('Updated isTrigger__c to true for Id: ' + tp.Id);
            return tp.Id;
        }
       else{
              // Else create new
        Translated_Proposal__c newRec = new Translated_Proposal__c(
            Proposal__c = proposalId,
            Translated_Language__c = targetLanguage,
            isTrigger__c = false, // so Flow triggers immediately
            Status__c = 'Not Translated'
        );
 try {
        insert newRec;
        System.debug('Inserted new Translated_Proposal__c with Id: ' + newRec.Id);
        return newRec.Id;
    } catch (Exception e) {
        System.debug('FAILED to insert Translated_Proposal__c: ' + e.getMessage());
        // This throws the error so it shows in Flow/LWC error, and in debug logs.
        throw new AuraHandledException('Could not create translated proposal: ' + e.getMessage());
    }
       }
      
    }
    
    @AuraEnabled(cacheable=true)
public static Map<String, Object> getTranslatedProposal(Id translatedProposalId) {
    Map<String, Object> result = new Map<String, Object>();
    Translated_Proposal__c proposal = [
        SELECT Id, Organization_Name__c, Headquarters_City_and_Country__c, Primary_Service_Regions__c, Leader_Name__c, Leader_Title__c, 
            Submitter_Name__c, Job_Title__c, Work_Email_ID__c, Phone_number__c, Legal_Structure__c, Organizational_Sustainability__c, 
            Use_of_Additional_Funding__c, Operational_Synergies_with_WOF__c, Use_of_Additional_Funding_JC__c, Operational_Synergies_with_WOF_JC__c,
        	Operational_Synergies_with_WOF_Both__c, Organizational_Area_s_for_Funding__c
        FROM Translated_Proposal__c
        WHERE Id = :translatedProposalId
        LIMIT 1
    ];
    result.put('proposal', proposal);

    // Fetch one related historical, fiscal, and outcome data record for simplicity
    List<Translated_Historical_Data__c> histList = [
        SELECT CY1_Balance_Start_CFY_1__c, CY2_Balance_Start_CFY_2__c, CY3_Balance_Start_CFY_3__c,
            CY1_Revenue__c, CY2_Revenue__c, CY3_Revenue__c,
            CY1_Expense__c, CY2_Expense__c, CY3_Expense__c,
            CY1_Balance_End__c, CY2_Balance_End__c, CY3_Balance_End__c
        FROM Translated_Historical_Data__c
        WHERE Translated_Proposal__c = :translatedProposalId
        LIMIT 1
    ];
    if (!histList.isEmpty()) result.put('historicalData', histList[0]);

    List<Translated_Current_Fiscal_Year_Data__c> fiscalList = [
        SELECT Revenue_Budget__c, Revenue_Projection__c, Revenue_Explanation__c,Expense_Variance__c,
            Expense_Budget__c, Expense_Projection__c,  Expense_Explanation__c,Revenue_Variance__c,
            Net_Budget__c, Net_Projection__c, Net_Variance__c, Net_Position_Explanation__c
        FROM Translated_Current_Fiscal_Year_Data__c
        WHERE Translated_Proposal__c = :translatedProposalId
        LIMIT 1
    ];
    if (!fiscalList.isEmpty()) result.put('fiscalData', fiscalList[0]);

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
        X3rd_party_verification_details_FY2__c, X3rd_party_verification_details_FY3__c,Projected_Learner_Placements_CFY__c, Projected_Learner_Placements_FY_1__c,
        Projected_Learner_Placements_FY_2__c, Projected_Learner_Placements_FY_3__c
        FROM Translated_Outcome_Data__c
        WHERE Translated_Proposal__c = :translatedProposalId
        LIMIT 1
    ];
    if (!outcomeList.isEmpty()) result.put('outcomeData', outcomeList[0]);

    return result;
}

}