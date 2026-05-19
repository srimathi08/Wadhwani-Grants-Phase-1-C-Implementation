public with sharing class PdfGeneratorController {
    @AuraEnabled
    public static ApplicationWrapper getApplicationWithRelatedData(String recordId) {
        
        List<IndividualApplication> appList = [
            SELECT Id, Name, Project_Title__c, Project_Duration__c, Project_Website_if_any__c, Keywords__c,
            Primary_Focus_Area__c, Sub_Focus_Area__c, PI_Name__c, PI_Designation__c, PI_Phone__c, PI_Email__c,
            AccountId, Co_Principal_Investigator_Co_PI__c, CO_PI_Designation__c, CO_PI_Institution__c,
            CO_PI_Phone__c, CO_PI_Email__c, Project_Team_Members__c, Primary_Focus_Area_Other__c,Expertise_and_Experience_of_Team_in_Spec__c,
            Project_Summary__c, Objectives_of_the_Project__c, Project_Approach_and_Work_Plan__c,
            Key_Problem_Being_Solved__c, Proposed_Solution__c, Current_status_of_the_Project_Work_und__c,
            Current_Technology_Readiness_Level_TRL__c, Expected_TRL_at_the_end_of_the_Project__c,Total_Project_Budget_INR__c,
            Novelty_of_the_Project__c, Details_of_IPR_Filed_Granted__c, PI_Institution_Organization_Name__c,
            Details_of_Ethical_Received__c, Full_Proposal_Citations__c, Target_Market_Industry_Application__c,
            Customer_and_Beneficiaries__c, Plan_for_Commercialization__c, Competitive_Advantage__c,
            Business_Model_for_Commercialization__c, Project_Revenue_Strategy__c, Sub_Focus_Area_Other__c,
            Main_Risks_and_Barriers__c, Relevant_Partnerships__c, Potential_for_Startup_Formation__c,
            Incubator_Association_Details__c, Total_Project_Budget_in_USD__c,Describe_Objective_Relevance_of_Project__c,
            Proposed_WIN_Grant_Utilization__c, Previous_Funding_Details__c,Work_undertaken_supporting_current_TRL__c,
            Additional_Funding_Plans__c, WIN_Support__c, Project_Start_Date__c, Project_End_Date__c,Strategy_for_raising_funds_from_Investor__c ,
            Proposed_Outcomes_Deliverables_under_t__c, Envisioned_Project_Impact__c,Strategy_for_transfer_of_technology__c,
            Future_Plan_for_next_3_5_on_comple__c
            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ];
        
        if (appList.isEmpty()) {
            throw new AuraHandledException('No IndividualApplication record found for Id: ' + recordId);
        }
        
        IndividualApplication app = appList[0];
        
        // ✅ FIXED — all milestone fields added, nothing else changed
        List<Milestone__c> milestones = [
            SELECT Name,
                   Installment_of_Funds_1__c,
                   Installment_of_Funds_2__c,
                   Installment_of_Funds_3__c,
                   Installment_of_Funds_4__c,
                   Installment_of_Funds_5__c,
                   Installment_of_Funds_6__c,
                   Milestone_Description__c,
                   Activities_under_this_Milestone__c,
                   Output_and_Deliverables__c,
                   Project_Start_Date__c,
                   Project_End_Date__c,
                   Budget_Required__c,
                   Budget_Required_INR__c,
                   Target_Completion_Months__c
            FROM Milestone__c
            WHERE Individual_Application__c = :recordId
        ];
        
        List<Budget> budgets = [
            SELECT Name, Justification__c, Year_1__c, Year_2__c, Year_3_USD__c, Total_Amount__c, Total_Amount_INR__c
            FROM Budget
            WHERE Proposal__c = :recordId
        ];

        List<ContentDocumentLink> cdlList = [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :recordId
        ];

        Set<Id> docIds = new Set<Id>();
        for (ContentDocumentLink cdl : cdlList) {
            docIds.add(cdl.ContentDocumentId);
        }

        List<ContentVersion> versions = [
            SELECT Id, Title, ContentDocumentId
            FROM ContentVersion
            WHERE ContentDocumentId IN :docIds
            AND IsLatest = true
        ];
        
        List<String> urls = new List<String>();
        for (ContentVersion cv : versions) {
            String fileUrl = 'https://wadhwanifoundation.my.site.com/sfc/servlet.shepherd/document/download/' + cv.ContentDocumentId;
            urls.add(cv.Title + ': ' + fileUrl);
        }

        ApplicationWrapper wrapper = new ApplicationWrapper();
        wrapper.application = app;
        wrapper.milestones = milestones;
        wrapper.budgets = budgets;
        wrapper.fileUrls = urls;
        
        return wrapper;
    }
}