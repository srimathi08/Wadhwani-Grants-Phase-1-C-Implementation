public with sharing class PdfGeneratorController {

    @AuraEnabled
    public static ApplicationWrapper getApplicationWithRelatedData(String recordId) {

        if (String.isBlank(recordId)) {
            throw new AuraHandledException('Record Id is required to generate the PDF.');
        }

        List<IndividualApplication> appList = [
            SELECT Id, Name, AccountId, Account.Name,
                   Project_Title__c, Project_Duration__c, Project_Website_if_any__c, Keywords__c,
                   Primary_Focus_Area__c, Primary_Focus_Area_Other__c,
                   Sub_Focus_Area__c, Sub_Focus_Area_Other__c,
                   Describe_Objective_Relevance_of_Project__c,
                   PI_Name__c, PI_Designation__c, PI_Phone__c, PI_Email__c,
                   PI_Institution__c, PI_Institution_Organization_Name__c,
                   Co_Principal_Investigator_Co_PI__c, CO_PI_Designation__c, CO_PI_Institution__c,
                   CO_PI_Phone__c, CO_PI_Email__c,
                   Project_Team_Members__c, Expertise_and_Experience_of_Team_in_Spec__c,
                   Startup_Name__c, Founder_Name__c, Founder_Designation__c, Founder_Institution__c,
                   Founder_Mobile__c, Founder_Email__c,
                   Is_Startup_Registered__c, Startup_Registration_Date__c, Startup_Registration_No__c,
                   Is_Startup_DPIIT_Registered__c, DPIIT_Registration_No__c,
                   Project_Summary__c, Key_Problem_Being_Solved__c, Proposed_Solution__c,
                   Novelty_of_the_Project__c, Objectives_of_the_Project__c,
                   Current_Technology_Readiness_Level_TRL__c, Work_undertaken_supporting_current_TRL__c,
                   Expected_TRL_at_the_end_of_the_Project__c, Current_status_of_the_Project_Work_und__c,
                   Project_Approach_and_Work_Plan__c, Competitive_Advantage__c,
                   Details_of_IPR_Filed_Granted__c, Details_of_Ethical_Received__c, Full_Proposal_Citations__c,
                   Target_Market_Industry_Application__c, Customer_and_Beneficiaries__c,
                   Plan_for_Commercialization__c, Business_Model_for_Commercialization__c,
                   Project_Revenue_Strategy__c, Main_Risks_and_Barriers__c, Relevant_Partnerships__c,
                   Potential_for_Startup_Formation__c, Incubator_Association_Details__c,
                   Strategy_for_transfer_of_technology__c, Strategy_for_raising_funds_from_Investor__c,
                   Total_Project_Budget_in_USD__c, Total_Project_Budget_INR__c,
                   Proposed_WIN_Grant_Utilization__c, Previous_Funding_Details__c,
                   Additional_Funding_Plans__c, WIN_Support__c,
                   Project_Start_Date__c, Project_End_Date__c,
                   Proposed_Outcomes_Deliverables_under_t__c, Envisioned_Project_Impact__c,
                   Future_Plan_for_next_3_5_on_comple__c
            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ];

        if (appList.isEmpty()) {
            throw new AuraHandledException('No IndividualApplication record found for Id: ' + recordId);
        }

        IndividualApplication app = appList[0];

        // ✅ FIX — COE Institution Name = the application's Account (what the form shows).
        // Reviewers often have no sharing access to the COE Account, in which case Account.Name
        // comes back null. Read only the Name, scoped to this application's AccountId.
        if (app.AccountId != null && (app.Account == null || String.isBlank(app.Account.Name))) {
            String coeName = new CoeNameReader().read(app.AccountId);
            if (String.isNotBlank(coeName)) {
                app.putSObject('Account', new Account(Id = app.AccountId, Name = coeName));
            }
        }

        // ✅ FIX — ORDER BY added so rows print in the order they were entered
        List<Milestone__c> milestones = [
            SELECT Name,
                   Installment_of_Funds_1__c, Installment_of_Funds_2__c, Installment_of_Funds_3__c,
                   Installment_of_Funds_4__c, Installment_of_Funds_5__c, Installment_of_Funds_6__c,
                   Milestone_Description__c, Activities_under_this_Milestone__c, Output_and_Deliverables__c,
                   Project_Start_Date__c, Project_End_Date__c,
                   Budget_Required__c, Budget_Required_INR__c, Target_Completion_Months__c
            FROM Milestone__c
            WHERE Individual_Application__c = :recordId
            ORDER BY CreatedDate ASC, Name ASC
        ];

        List<Budget> budgets = [
            SELECT Name, Justification__c, Year_1__c, Year_2__c, Year_3_USD__c,
                   Total_Amount__c, Total_Amount_INR__c
            FROM Budget
            WHERE Proposal__c = :recordId
            ORDER BY CreatedDate ASC, Name ASC
        ];

        List<Co_Founder__c> coFounders = [
            SELECT Name, Designation__c, Institution__c, Mobile__c, Email__c
            FROM Co_Founder__c
            WHERE Individual_Application__c = :recordId
            ORDER BY CreatedDate ASC
        ];

        Set<Id> docIds = new Set<Id>();
        for (ContentDocumentLink cdl : [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :recordId
        ]) {
            docIds.add(cdl.ContentDocumentId);
        }

        String baseUrl = Site.getBaseUrl();
        if (String.isBlank(baseUrl)) {
            baseUrl = URL.getOrgDomainUrl().toExternalForm();
        }

        // Format kept as "Name: URL" for compatibility; the file name now includes its extension
        List<String> urls = new List<String>();
        if (!docIds.isEmpty()) {
            for (ContentVersion cv : [
                SELECT Id, Title, FileExtension, ContentDocumentId
                FROM ContentVersion
                WHERE ContentDocumentId IN :docIds
                AND IsLatest = true
                ORDER BY CreatedDate ASC
            ]) {
                String fileName = cv.Title;
                if (String.isNotBlank(cv.FileExtension)
                        && !cv.Title.toLowerCase().endsWith('.' + cv.FileExtension.toLowerCase())) {
                    fileName += '.' + cv.FileExtension;
                }
                urls.add(fileName + ': ' + baseUrl + '/sfc/servlet.shepherd/document/download/' + cv.ContentDocumentId);
            }
        }

        ApplicationWrapper wrapper = new ApplicationWrapper();
        wrapper.application = app;
        wrapper.milestones  = milestones;
        wrapper.budgets     = budgets;
        wrapper.coFounders  = coFounders;
        wrapper.fileUrls    = urls;
        return wrapper;
    }

    /**
     * Reads ONLY the Account Name for the COE linked to an application the running user
     * can already see (the parent query above is with sharing). Nothing else is exposed.
     */
    private without sharing class CoeNameReader {
        String read(Id accountId) {
            List<Account> accounts = [SELECT Name FROM Account WHERE Id = :accountId LIMIT 1];
            return accounts.isEmpty() ? null : accounts[0].Name;
        }
    }
}