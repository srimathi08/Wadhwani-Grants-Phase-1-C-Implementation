/**
 * @description Controller handling dynamic form state deserialization, multi-track mapping,
 * and database persistence across IndividualApplication (Proposal) and child records
 * (Historical_Data__c, Current_fiscal_year_data__c, Outcomes_Data__c, WCF_Skilling_Domain__c, WCF_Business_Sector__c, etc.).
 */
public without sharing class WCFFormEngineController {

    public class SaveResult {
        @AuraEnabled public Boolean isSuccess;
        @AuraEnabled public Id recordId;
        @AuraEnabled public String message;
        @AuraEnabled public String status;
    }

    public class DynamicDraftWrapper {
        @AuraEnabled public Boolean isSuccess;
        @AuraEnabled public String message;
        @AuraEnabled public Id recordId;
        @AuraEnabled public String status;
        @AuraEnabled public List<String> selectedTracks;
        @AuraEnabled public String activeTabId;
        @AuraEnabled public Decimal lastPage;
        @AuraEnabled public Map<String, Object> formValues;
        @AuraEnabled public List<Map<String, Object>> skillingDomains;
        @AuraEnabled public List<Map<String, Object>> businessSectors;
        @AuraEnabled public List<Map<String, Object>> livelihoodPrograms;
        @AuraEnabled public List<Map<String, Object>> communities;
        @AuraEnabled public List<Map<String, Object>> documents;
        @AuraEnabled public List<Map<String, String>> q24Files;
        @AuraEnabled public List<Map<String, String>> q28Files;

        public DynamicDraftWrapper() {
            this.isSuccess = true;
            this.selectedTracks = new List<String>();
            this.formValues = new Map<String, Object>();
            this.skillingDomains = new List<Map<String, Object>>();
            this.businessSectors = new List<Map<String, Object>>();
            this.livelihoodPrograms = new List<Map<String, Object>>();
            this.communities = new List<Map<String, Object>>();
            this.documents = new List<Map<String, Object>>();
            this.q24Files = new List<Map<String, String>>();
            this.q28Files = new List<Map<String, String>>();
        }
    }

    /**
     * @description Formats selected track codes into semicolon-separated string for multi-select picklist
     * Organizational_Area_s_for_Funding_Inves1__c on IndividualApplication.
     * Allowed picklist values: 'Job Fulfillment', 'Job Creation', 'Livelihood'.
     */
    public static String formatMultiSelectFundingArea(List<String> tracksInput) {
        if (tracksInput == null || tracksInput.isEmpty()) {
            return 'Job Fulfillment Only';
        }
        Boolean hasJF = false;
        Boolean hasJC = false;
        for (String trk : tracksInput) {
            if (String.isBlank(trk)) continue;
            String tUpper = trk.trim().toUpperCase();
            if (tUpper.contains('FULFILLMENT') || tUpper.contains('LIVELIHOOD')) hasJF = true;
            if (tUpper.contains('CREATION')) hasJC = true;
            if (tUpper.contains('BOTH')) { hasJF = true; hasJC = true; }
        }
        if (hasJF && hasJC) {
            return 'Both Job Fulfillment and Job Creation';
        } else if (hasJC) {
            return 'Job Creation Only';
        } else {
            return 'Job Fulfillment Only';
        }
    }

    /**
     * @description Saves dynamic draft payload for the RFI application.
     */
    @AuraEnabled
    public static SaveResult saveDynamicDraft(Id recordId, List<String> selectedTracks, String payloadJson) {
        SaveResult res = new SaveResult();
        try {
            IndividualApplication app = prepareAndSaveApplication(recordId, selectedTracks, payloadJson, 'Draft');
            
            res.isSuccess = true;
            res.recordId = app.Id;
            res.status = 'Draft';
            res.message = 'Draft saved successfully.';
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'Error saving draft: ' + ex.getMessage() + ' | Line: ' + ex.getLineNumber());
            res.isSuccess = false;
            res.message = 'Error saving draft: ' + ex.getMessage();
        }
        return res;
    }

    /**
     * @description Submits dynamic RFI application payload.
     */
    @AuraEnabled
    public static SaveResult submitDynamicApplication(Id recordId, List<String> selectedTracks, String payloadJson) {
        SaveResult res = new SaveResult();
        try {
            IndividualApplication app = prepareAndSaveApplication(recordId, selectedTracks, payloadJson, 'Submitted');
            
            res.isSuccess = true;
            res.recordId = app.Id;
            res.status = 'Submitted';
            res.message = 'Application submitted successfully.';
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'Error submitting application: ' + ex.getMessage() + ' | Line: ' + ex.getLineNumber());
            res.isSuccess = false;
            res.message = 'Error submitting application: ' + ex.getMessage();
        }
        return res;
    }

    /**
     * @description Resubmits dynamic RFI application payload after revision requested.
     */
    @AuraEnabled
    public static SaveResult resubmitDynamicApplication(Id recordId, List<String> selectedTracks, String payloadJson) {
        SaveResult res = new SaveResult();
        try {
            IndividualApplication app = prepareAndSaveApplication(recordId, selectedTracks, payloadJson, 'Application Resubmitted');
            
            res.isSuccess = true;
            res.recordId = app.Id;
            res.status = 'Application Resubmitted';
            res.message = 'Application resubmitted successfully.';
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'Error resubmitting application: ' + ex.getMessage() + ' | Line: ' + ex.getLineNumber());
            res.isSuccess = false;
            res.message = 'Error resubmitting application: ' + ex.getMessage();
        }
        return res;
    }

    /**
     * @description Deletes an uploaded file (ContentDocument / ContentDocumentLink) when user removes it from UI.
     */
    @AuraEnabled
    public static void deleteUploadedFile(String documentId, Id recordId) {
        try {
            if (String.isBlank(documentId)) return;
            Id docId = (Id) documentId.trim();
            if (recordId != null) {
                List<ContentDocumentLink> links = [
                    SELECT Id FROM ContentDocumentLink
                    WHERE ContentDocumentId = :docId AND LinkedEntityId = :recordId
                    WITH SYSTEM_MODE
                ];
                if (!links.isEmpty()) {
                    delete as system links;
                }
            }
            List<ContentDocument> docs = [
                SELECT Id FROM ContentDocument WHERE Id = :docId WITH SYSTEM_MODE
            ];
            if (!docs.isEmpty()) {
                delete as system docs;
            }
        } catch (Exception e) {
            System.debug(LoggingLevel.WARN, 'Could not delete document ' + documentId + ': ' + e.getMessage());
        }
    }

    /**
     * @description Fetches all draft application data, child objects, dynamic table rows,
     * and file attachments for resuming in wcfDynamicForm.
     */
    @AuraEnabled
    public static DynamicDraftWrapper getDynamicDraft(Id recordId) {
        DynamicDraftWrapper wrapper = new DynamicDraftWrapper();
        try {
            User currentUser = [
                SELECT Id, Name, FirstName, LastName, Email, Phone, MobilePhone, Title, AccountId, ContactId,
                       Contact.FirstName, Contact.LastName, Contact.Name, Contact.Email, Contact.Phone, Contact.Title,
                       Contact.Current_Organization__c,
                       Account.Name, Account.IsPersonAccount, Account.WCF_Organizational_Name__c
                FROM User 
                WHERE Id = :UserInfo.getUserId() 
                LIMIT 1
            ];

            Id appId = recordId;
            if (appId == null) {
                List<IndividualApplication> drafts;
                if (currentUser.AccountId != null) {
                    drafts = [
                        SELECT Id FROM IndividualApplication 
                        WHERE (OwnerId = :currentUser.Id OR AccountId = :currentUser.AccountId)
                        AND Status IN ('Draft', 'RevisionRequested', 'AdditionalInfoRequested')
                        ORDER BY LastModifiedDate DESC LIMIT 1
                    ];
                } else {
                    drafts = [
                        SELECT Id FROM IndividualApplication 
                        WHERE OwnerId = :currentUser.Id 
                        AND Status IN ('Draft', 'RevisionRequested', 'AdditionalInfoRequested')
                        ORDER BY LastModifiedDate DESC LIMIT 1
                    ];
                }
                if (!drafts.isEmpty()) {
                    appId = drafts[0].Id;
                }
            }

            String userEmailClean = (String.isNotBlank(currentUser.Email)) ? currentUser.Email.replace('.invalid', '') : '';
            String defaultSubName = (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Name))
                                     ? currentUser.Contact.Name : currentUser.Name;
            String defaultSubEmail = (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Email))
                                      ? currentUser.Contact.Email : userEmailClean;
            String defaultSubPhone = (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Phone))
                                      ? currentUser.Contact.Phone : (String.isNotBlank(currentUser.Phone) ? currentUser.Phone : (String.isNotBlank(currentUser.MobilePhone) ? currentUser.MobilePhone : ''));
            String defaultSubTitle = (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Title))
                                      ? currentUser.Contact.Title : (String.isNotBlank(currentUser.Title) ? currentUser.Title : '');
            
            String defaultOrgName = '';
            if (currentUser.Account != null) {
                if (String.isNotBlank(currentUser.Account.WCF_Organizational_Name__c)) {
                    defaultOrgName = currentUser.Account.WCF_Organizational_Name__c;
                } else if (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Current_Organization__c)) {
                    defaultOrgName = currentUser.Contact.Current_Organization__c;
                } else if (!currentUser.Account.IsPersonAccount && String.isNotBlank(currentUser.Account.Name)) {
                    defaultOrgName = currentUser.Account.Name;
                }
            }

            if (appId == null) {
                wrapper.isSuccess = true;
                wrapper.message = 'No existing draft found.';

                Map<String, Object> defaultFv = new Map<String, Object>();
                defaultFv.put('Submitter_Name__c', defaultSubName != null ? defaultSubName : '');
                defaultFv.put('Work_Email_ID__c', defaultSubEmail != null ? defaultSubEmail : '');
                defaultFv.put('Phone__c', defaultSubPhone != null ? defaultSubPhone : '');
                defaultFv.put('Job_Title__c', defaultSubTitle != null ? defaultSubTitle : '');
                defaultFv.put('Organization_Name__c', defaultOrgName != null ? defaultOrgName : '');
                defaultFv.put('Fiscal_Month__c', '03');
                defaultFv.put('Fiscal_Day__c', '31');
                wrapper.formValues = defaultFv;
                return wrapper;
            }

            // 1. Build dynamic SOQL query for IndividualApplication including all fields from RFI_Question__mdt
            Set<String> fieldNames = new Set<String>{
                'Id', 'Status', 'RecordTypeId', 'AccountId', 'OwnerId', 'Category', 'Last_Page__c',
                'Organizational_Area_s_for_Funding_Inves__c', 'ContactId', 'Principal_Investigator_PI__c', 'PI__c',
                'Organization_Name__c', 'Headquarters_City_and_Country__c', 'Primary_Service_Regions__c',
                'Leader_Name__c', 'Leader_Title__c', 'Leader_Tenure__c',
                'Submitter_Name__c', 'Job_Title__c', 'Work_Email_ID__c', 'Phone__c', 'WG_Phone_Country_Code__c',
                'Legal_Type__c', 'Legal_Type_Other__c', 'Registration_Jurisdiction__c', 'Registration_Jurisdiction_Other__c',
                'Legal_Structure__c', 'Current_fiscal_year_s_end_date__c',
                'Funder_1_Name__c', 'Funder_1_Amount__c', 'Funder_1_Period_Start__c', 'Funder_1_Period_End__c', 'Funder_1_Type__c',
                'Funder_2_Name__c', 'Funder_2_Amount__c', 'Funder_2_Period_Start__c', 'Funder_2_Period_End__c', 'Funder_2_Type__c',
                'Funder_3_Name__c', 'Funder_3_Amount__c', 'Funder_3_Period_Start__c', 'Funder_3_Period_End__c', 'Funder_3_Type__c',
                'Reference_1_Name__c', 'Reference_1_Role__c', 'Reference_1_Email__c',
                'Reference_2_Name__c', 'Reference_2_Role__c', 'Reference_2_Email__c',
                'Skilling_Approach__c', 'Job_Creation_Approach__c',
                'Organizational_Sustainability__c', 'Use_of_Additional_Funding__c',
                'GenieAI_Interest_Level__c', 'Operational_Synergies_with_WOF__c',
                'Attesting_User_Name__c', 'Attesting_User_Title__c'
            };

            Map<String, Schema.SObjectField> appFieldMap = Schema.SObjectType.IndividualApplication.fields.getMap();
            for (RFI_Question__mdt q : [SELECT Field_API_Name__c, Target_Object__c FROM RFI_Question__mdt]) {
                if (String.isNotBlank(q.Field_API_Name__c) && (q.Target_Object__c == 'IndividualApplication' || String.isBlank(q.Target_Object__c))) {
                    if (appFieldMap.containsKey(q.Field_API_Name__c.toLowerCase())) {
                        fieldNames.add(appFieldMap.get(q.Field_API_Name__c.toLowerCase()).getDescribe().getName());
                    }
                }
            }

            String soql = 'SELECT ' + String.join(new List<String>(fieldNames), ', ') + ' FROM IndividualApplication WHERE Id = :appId WITH SYSTEM_MODE LIMIT 1';
            IndividualApplication app = Database.query(soql);

            wrapper.recordId = app.Id;
            wrapper.status = app.Status;
            wrapper.lastPage = app.Last_Page__c;

            // Map Last_Page__c to activeTabId
            if (app.Last_Page__c == 2) wrapper.activeTabId = 'tabJobFulfillment';
            else if (app.Last_Page__c == 4) wrapper.activeTabId = 'tabJobCreation';
            else if (app.Last_Page__c == 5) wrapper.activeTabId = 'tabLivelihood';
            else if (app.Last_Page__c == 6) wrapper.activeTabId = 'tabWhyWadhwani';
            else if (app.Last_Page__c == 7) wrapper.activeTabId = 'tabReviewSubmit';
            else wrapper.activeTabId = 'tabAboutOrg';

            // Selected Tracks
            String tracksStr = app.Organizational_Area_s_for_Funding_Inves__c;
            if (String.isNotBlank(tracksStr)) {
                String tUpper = tracksStr.toUpperCase();
                if (tUpper.contains('FULFILLMENT')) wrapper.selectedTracks.add('JOB_FULFILLMENT');
                if (tUpper.contains('CREATION')) wrapper.selectedTracks.add('JOB_CREATION');
                if (tUpper.contains('LIVELIHOOD')) wrapper.selectedTracks.add('LIVELIHOOD');
            }

            // Populate formValues map from Application
            Map<String, Object> fv = new Map<String, Object>();
            String appOrgName = app.Organization_Name__c;
            if (String.isBlank(appOrgName) || (currentUser.Account != null && currentUser.Account.IsPersonAccount && appOrgName == currentUser.Account.Name && String.isNotBlank(defaultOrgName))) {
                appOrgName = defaultOrgName;
            }
            fv.put('Organization_Name__c', appOrgName != null ? appOrgName : '');
            fv.put('Headquarters_City_and_Country__c', app.Headquarters_City_and_Country__c != null ? app.Headquarters_City_and_Country__c : '');
            fv.put('Primary_Service_Regions__c', app.Primary_Service_Regions__c != null ? app.Primary_Service_Regions__c : '');
            fv.put('Leader_Name__c', app.Leader_Name__c != null ? app.Leader_Name__c : '');
            fv.put('Leader_Title__c', app.Leader_Title__c != null ? app.Leader_Title__c : '');
            fv.put('Leader_Tenure__c', app.Leader_Tenure__c != null ? String.valueOf(app.Leader_Tenure__c) : '');
            fv.put('Submitter_Name__c', String.isNotBlank(app.Submitter_Name__c) ? app.Submitter_Name__c : defaultSubName);
            fv.put('Job_Title__c', String.isNotBlank(app.Job_Title__c) ? app.Job_Title__c : defaultSubTitle);
            fv.put('Work_Email_ID__c', String.isNotBlank(app.Work_Email_ID__c) ? app.Work_Email_ID__c : defaultSubEmail);
            fv.put('Phone__c', String.isNotBlank(app.Phone__c) ? app.Phone__c : defaultSubPhone);
            fv.put('WG_Phone_Country_Code__c', app.WG_Phone_Country_Code__c);
            fv.put('Legal_Type__c', app.Legal_Type__c);
            fv.put('Legal_Type_Other__c', app.Legal_Type_Other__c);
            fv.put('Registration_Jurisdiction__c', app.Registration_Jurisdiction__c);
            fv.put('Registration_Jurisdiction_Other__c', app.Registration_Jurisdiction_Other__c);
            fv.put('Legal_Structure__c', app.Legal_Structure__c);
            fv.put('Current_fiscal_year_s_end_date__c', app.Current_fiscal_year_s_end_date__c);
            fv.put('Funder_1_Name__c', app.Funder_1_Name__c);
            fv.put('Funder_1_Amount__c', app.Funder_1_Amount__c != null ? String.valueOf(app.Funder_1_Amount__c) : '');
            fv.put('Funder_1_Period_Start__c', app.Funder_1_Period_Start__c != null ? String.valueOf(app.Funder_1_Period_Start__c) : '');
            fv.put('Funder_1_Period_End__c', app.Funder_1_Period_End__c != null ? String.valueOf(app.Funder_1_Period_End__c) : '');
            fv.put('Funder_1_Type__c', app.Funder_1_Type__c);
            fv.put('Funder_2_Name__c', app.Funder_2_Name__c);
            fv.put('Funder_2_Amount__c', app.Funder_2_Amount__c != null ? String.valueOf(app.Funder_2_Amount__c) : '');
            fv.put('Funder_2_Period_Start__c', app.Funder_2_Period_Start__c != null ? String.valueOf(app.Funder_2_Period_Start__c) : '');
            fv.put('Funder_2_Period_End__c', app.Funder_2_Period_End__c != null ? String.valueOf(app.Funder_2_Period_End__c) : '');
            fv.put('Funder_2_Type__c', app.Funder_2_Type__c);
            fv.put('Funder_3_Name__c', app.Funder_3_Name__c);
            fv.put('Funder_3_Amount__c', app.Funder_3_Amount__c != null ? String.valueOf(app.Funder_3_Amount__c) : '');
            fv.put('Funder_3_Period_Start__c', app.Funder_3_Period_Start__c != null ? String.valueOf(app.Funder_3_Period_Start__c) : '');
            fv.put('Funder_3_Period_End__c', app.Funder_3_Period_End__c != null ? String.valueOf(app.Funder_3_Period_End__c) : '');
            fv.put('Funder_3_Type__c', app.Funder_3_Type__c);
            fv.put('Reference_1_Name__c', app.Reference_1_Name__c);
            fv.put('Reference_1_Role__c', app.Reference_1_Role__c);
            fv.put('Reference_1_Email__c', app.Reference_1_Email__c);
            fv.put('Reference_2_Name__c', app.Reference_2_Name__c);
            fv.put('Reference_2_Role__c', app.Reference_2_Role__c);
            fv.put('Reference_2_Email__c', app.Reference_2_Email__c);
            fv.put('Skilling_Approach__c', app.Skilling_Approach__c);
            fv.put('Job_Creation_Approach__c', app.Job_Creation_Approach__c);
            fv.put('Organizational_Sustainability__c', app.Organizational_Sustainability__c);
            fv.put('Use_of_Additional_Funding__c', app.Use_of_Additional_Funding__c);
            fv.put('GenieAI_Interest_Level__c', app.GenieAI_Interest_Level__c);
            fv.put('Operational_Synergies_with_WOF__c', app.Operational_Synergies_with_WOF__c);
            fv.put('Attesting_User_Name__c', app.Attesting_User_Name__c);
            fv.put('Attesting_User_Title__c', app.Attesting_User_Title__c);

            fv.put('Incorporation_Date__c', '');
            fv.put('Has_501c3_Status__c', '');
            fv.put('Has_Equivalency_Determination__c', '');
            fv.put('Is_FCRA_Registered__c', '');
            fv.put('Willing_to_Pursue_ED__c', '');
            fv.put('Fiscal_Month__c', '03');
            fv.put('Fiscal_Day__c', '31');

            // Fallback for blank submitter/org fields on existing draft
            if (String.isBlank((String)fv.get('Submitter_Name__c'))) {
                String subName = (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Name)) ? currentUser.Contact.Name : currentUser.Name;
                if (String.isNotBlank(subName)) fv.put('Submitter_Name__c', subName);
            }
            if (String.isBlank((String)fv.get('Work_Email_ID__c'))) {
                String subEmail = (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Email)) ? currentUser.Contact.Email : currentUser.Email;
                if (String.isNotBlank(subEmail)) fv.put('Work_Email_ID__c', subEmail);
            }
            if (String.isBlank((String)fv.get('Phone__c'))) {
                String subPhone = (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Phone)) ? currentUser.Contact.Phone : (String.isNotBlank(currentUser.Phone) ? currentUser.Phone : currentUser.MobilePhone);
                if (String.isNotBlank(subPhone)) fv.put('Phone__c', subPhone);
            }
            if (String.isBlank((String)fv.get('Job_Title__c'))) {
                String subTitle = (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Title)) ? currentUser.Contact.Title : currentUser.Title;
                if (String.isNotBlank(subTitle)) fv.put('Job_Title__c', subTitle);
            }
            if (String.isBlank((String)fv.get('Organization_Name__c')) && currentUser.Account != null && String.isNotBlank(currentUser.Account.Name)) {
                fv.put('Organization_Name__c', currentUser.Account.Name);
            }

            // 2. Historical_Data__c
            List<Historical_Data__c> hists = [
                SELECT Id, CY3_Balance_Start_CFY_3__c, CY2_Balance_Start_CFY_2__c, CY1_Balance_Start_CFY_1__c,
                       CY3_Revenue__c, CY2_Revenue__c, CY1_Revenue__c,
                       CY3_Capital_Expenditure__c, CY2_Capital_Expenditure__c, CY1_Capital_Expenditure__c,
                       CY3_Operating_Expenditure__c, CY2_Operating_Expenditure__c, CY1_Operating_Expenditure__c,
                       CY3_Expense__c, CY2_Expense__c, CY1_Expense__c,
                       CY3_Balance_End__c, CY2_Balance_End__c, CY1_Balance_End__c
                FROM Historical_Data__c 
                WHERE Proposal__c = :appId 
                WITH SYSTEM_MODE LIMIT 1
            ];
            if (!hists.isEmpty()) {
                Historical_Data__c h = hists[0];
                fv.put('CY3_Balance_Start_CFY_3__c', h.CY3_Balance_Start_CFY_3__c != null ? String.valueOf(h.CY3_Balance_Start_CFY_3__c) : '');
                fv.put('CY3_Revenue__c', h.CY3_Revenue__c != null ? String.valueOf(h.CY3_Revenue__c) : '');
                fv.put('CY3_Capital_Expenditure__c', h.CY3_Capital_Expenditure__c != null ? String.valueOf(h.CY3_Capital_Expenditure__c) : '');
                fv.put('CY3_Operating_Expenditure__c', h.CY3_Operating_Expenditure__c != null ? String.valueOf(h.CY3_Operating_Expenditure__c) : '');
                fv.put('CY2_Revenue__c', h.CY2_Revenue__c != null ? String.valueOf(h.CY2_Revenue__c) : '');
                fv.put('CY2_Capital_Expenditure__c', h.CY2_Capital_Expenditure__c != null ? String.valueOf(h.CY2_Capital_Expenditure__c) : '');
                fv.put('CY2_Operating_Expenditure__c', h.CY2_Operating_Expenditure__c != null ? String.valueOf(h.CY2_Operating_Expenditure__c) : '');
                fv.put('CY1_Revenue__c', h.CY1_Revenue__c != null ? String.valueOf(h.CY1_Revenue__c) : '');
                fv.put('CY1_Capital_Expenditure__c', h.CY1_Capital_Expenditure__c != null ? String.valueOf(h.CY1_Capital_Expenditure__c) : '');
                fv.put('CY1_Operating_Expenditure__c', h.CY1_Operating_Expenditure__c != null ? String.valueOf(h.CY1_Operating_Expenditure__c) : '');

                // Aliases for Q9
                fv.put('START_FY3', h.CY3_Balance_Start_CFY_3__c != null ? String.valueOf(h.CY3_Balance_Start_CFY_3__c) : '');
                fv.put('REV_FY3', h.CY3_Revenue__c != null ? String.valueOf(h.CY3_Revenue__c) : '');
                fv.put('CAP_FY3', h.CY3_Capital_Expenditure__c != null ? String.valueOf(h.CY3_Capital_Expenditure__c) : '');
                fv.put('OP_FY3', h.CY3_Operating_Expenditure__c != null ? String.valueOf(h.CY3_Operating_Expenditure__c) : '');
                fv.put('REV_FY2', h.CY2_Revenue__c != null ? String.valueOf(h.CY2_Revenue__c) : '');
                fv.put('CAP_FY2', h.CY2_Capital_Expenditure__c != null ? String.valueOf(h.CY2_Capital_Expenditure__c) : '');
                fv.put('OP_FY2', h.CY2_Operating_Expenditure__c != null ? String.valueOf(h.CY2_Operating_Expenditure__c) : '');
                fv.put('REV_FY1', h.CY1_Revenue__c != null ? String.valueOf(h.CY1_Revenue__c) : '');
                fv.put('CAP_FY1', h.CY1_Capital_Expenditure__c != null ? String.valueOf(h.CY1_Capital_Expenditure__c) : '');
                fv.put('OP_FY1', h.CY1_Operating_Expenditure__c != null ? String.valueOf(h.CY1_Operating_Expenditure__c) : '');
            }

            // 3. Current_fiscal_year_data__c
            List<Current_fiscal_year_data__c> fiscals = [
                SELECT Id, Revenue_Budget__c, Revenue_Projection__c, Revenue_Variance__c, Revenue_Explanation__c,
                       Capital_Expenditure_Budget__c, Capital_Expenditure_Projection__c, Capital_Expenditure_Variance__c,
                       Operating_Expenditure_Budget__c, Operating_Expenditure_Projection__c, Operating_Expenditure_Variance__c,
                       Net_Budget__c, Net_Projection__c, Net_Variance__c
                FROM Current_fiscal_year_data__c 
                WHERE Proposal__c = :appId 
                WITH SYSTEM_MODE LIMIT 1
            ];
            if (!fiscals.isEmpty()) {
                Current_fiscal_year_data__c f = fiscals[0];
                fv.put('Revenue_Budget__c', f.Revenue_Budget__c != null ? String.valueOf(f.Revenue_Budget__c) : '');
                fv.put('Revenue_Projection__c', f.Revenue_Projection__c != null ? String.valueOf(f.Revenue_Projection__c) : '');
                fv.put('Capital_Expenditure_Budget__c', f.Capital_Expenditure_Budget__c != null ? String.valueOf(f.Capital_Expenditure_Budget__c) : '');
                fv.put('Capital_Expenditure_Projection__c', f.Capital_Expenditure_Projection__c != null ? String.valueOf(f.Capital_Expenditure_Projection__c) : '');
                fv.put('Operating_Expenditure_Budget__c', f.Operating_Expenditure_Budget__c != null ? String.valueOf(f.Operating_Expenditure_Budget__c) : '');
                fv.put('Operating_Expenditure_Projection__c', f.Operating_Expenditure_Projection__c != null ? String.valueOf(f.Operating_Expenditure_Projection__c) : '');
                fv.put('Revenue_Explanation__c', f.Revenue_Explanation__c);

                // Aliases for Q10
                fv.put('CFY_REV_BUDGET', f.Revenue_Budget__c != null ? String.valueOf(f.Revenue_Budget__c) : '');
                fv.put('CFY_REV_PROJ', f.Revenue_Projection__c != null ? String.valueOf(f.Revenue_Projection__c) : '');
                fv.put('CFY_CAP_BUDGET', f.Capital_Expenditure_Budget__c != null ? String.valueOf(f.Capital_Expenditure_Budget__c) : '');
                fv.put('CFY_CAP_PROJ', f.Capital_Expenditure_Projection__c != null ? String.valueOf(f.Capital_Expenditure_Projection__c) : '');
                fv.put('CFY_OP_BUDGET', f.Operating_Expenditure_Budget__c != null ? String.valueOf(f.Operating_Expenditure_Budget__c) : '');
                fv.put('CFY_OP_PROJ', f.Operating_Expenditure_Projection__c != null ? String.valueOf(f.Operating_Expenditure_Projection__c) : '');
            }

            // 4. Outcomes_Data__c
            List<Outcomes_Data__c> outcomes = [
                SELECT Id, Projected_Learner_Enrollments_FY_3__c, Projected_Learner_Enrollments_FY_2__c, Projected_Learner_Enrollments_FY_1__c, Projected_Learner_Enrollments_CFY__c,
                       Projected_Learner_Placements_FY_3__c, Projected_Learner_Placements_FY_2__c, Projected_Learner_Placements_FY_1__c, Projected_Learner_Placements_CFY__c,
                       Avg_Cost_per_Placement_FY_3__c, Avg_Cost_per_Placement_FY_2__c, Avg_Cost_per_Placement_FY_1__c, Avg_Cost_per_Placement_CFY__c,
                       Projected_New_Businesses_FY_3__c, Projected_New_Businesses_FY_2__c, Projected_New_Businesses_FY_1__c, Projected_New_Businesses_CFY__c,
                       Projected_Jobs_from_New_Businesses_FY3__c, Projected_Jobs_from_New_Businesses_FY2__c, Projected_Jobs_from_New_Businesses_FY1__c, Projected_Jobs_from_New_Businesses_CFY__c,
                       Growing_Businesses_Supported_FY_3__c, Growing_Businesses_Supported_FY_2__c, Growing_Businesses_Supported_FY_1__c, Growing_Businesses_Supported_CFY__c,
                       Jobs_from_Growing_Businesses_FY_3__c, Jobs_from_Growing_Businesses_FY_2__c, Jobs_from_Growing_Businesses_FY_1__c, Jobs_from_Growing_Businesses_CFY__c,
                       Avg_Cost_per_Job_FY_3__c, Avg_Cost_per_Job_FY_2__c, Avg_Cost_per_Job_FY_1__c, Avg_Cost_per_Job_CFY__c,
                       Job_Verification_3rd_Party_CFY__c
                FROM Outcomes_Data__c 
                WHERE Proposal__c = :appId 
                WITH SYSTEM_MODE 
                ORDER BY CreatedDate DESC LIMIT 1
            ];
            if (!outcomes.isEmpty()) {
                Outcomes_Data__c o = outcomes[0];
                // Job Fulfillment aliases (Q13 & Q14)
                fv.put('JF_ENROLL_FY3', o.Projected_Learner_Enrollments_FY_3__c != null ? String.valueOf(o.Projected_Learner_Enrollments_FY_3__c) : '');
                fv.put('JF_PLACE_FY3', o.Projected_Learner_Placements_FY_3__c != null ? String.valueOf(o.Projected_Learner_Placements_FY_3__c) : '');
                fv.put('JF_COST_FY3', o.Avg_Cost_per_Placement_FY_3__c != null ? String.valueOf(o.Avg_Cost_per_Placement_FY_3__c) : '');

                fv.put('JF_ENROLL_FY2', o.Projected_Learner_Enrollments_FY_2__c != null ? String.valueOf(o.Projected_Learner_Enrollments_FY_2__c) : '');
                fv.put('JF_PLACE_FY2', o.Projected_Learner_Placements_FY_2__c != null ? String.valueOf(o.Projected_Learner_Placements_FY_2__c) : '');
                fv.put('JF_COST_FY2', o.Avg_Cost_per_Placement_FY_2__c != null ? String.valueOf(o.Avg_Cost_per_Placement_FY_2__c) : '');

                fv.put('JF_ENROLL_FY1', o.Projected_Learner_Enrollments_FY_1__c != null ? String.valueOf(o.Projected_Learner_Enrollments_FY_1__c) : '');
                fv.put('JF_PLACE_FY1', o.Projected_Learner_Placements_FY_1__c != null ? String.valueOf(o.Projected_Learner_Placements_FY_1__c) : '');
                fv.put('JF_COST_FY1', o.Avg_Cost_per_Placement_FY_1__c != null ? String.valueOf(o.Avg_Cost_per_Placement_FY_1__c) : '');

                fv.put('JF_ENROLL_PROJ', o.Projected_Learner_Enrollments_CFY__c != null ? String.valueOf(o.Projected_Learner_Enrollments_CFY__c) : '');
                fv.put('JF_PLACE_PROJ', o.Projected_Learner_Placements_CFY__c != null ? String.valueOf(o.Projected_Learner_Placements_CFY__c) : '');
                fv.put('JF_COST_PROJ', o.Avg_Cost_per_Placement_CFY__c != null ? String.valueOf(o.Avg_Cost_per_Placement_CFY__c) : '');

                // Job Creation aliases (Q17 & Q18)
                fv.put('JC_NEW_BIZ_FY3', o.Projected_New_Businesses_FY_3__c != null ? String.valueOf(o.Projected_New_Businesses_FY_3__c) : '');
                fv.put('JC_NEW_JOBS_FY3', o.Projected_Jobs_from_New_Businesses_FY3__c != null ? String.valueOf(o.Projected_Jobs_from_New_Businesses_FY3__c) : '');
                fv.put('JC_EXIST_BIZ_FY3', o.Growing_Businesses_Supported_FY_3__c != null ? String.valueOf(o.Growing_Businesses_Supported_FY_3__c) : '');
                fv.put('JC_EXIST_JOBS_FY3', o.Jobs_from_Growing_Businesses_FY_3__c != null ? String.valueOf(o.Jobs_from_Growing_Businesses_FY_3__c) : '');
                fv.put('JC_COST_FY3', o.Avg_Cost_per_Job_FY_3__c != null ? String.valueOf(o.Avg_Cost_per_Job_FY_3__c) : '');

                fv.put('JC_NEW_BIZ_FY2', o.Projected_New_Businesses_FY_2__c != null ? String.valueOf(o.Projected_New_Businesses_FY_2__c) : '');
                fv.put('JC_NEW_JOBS_FY2', o.Projected_Jobs_from_New_Businesses_FY2__c != null ? String.valueOf(o.Projected_Jobs_from_New_Businesses_FY2__c) : '');
                fv.put('JC_EXIST_BIZ_FY2', o.Growing_Businesses_Supported_FY_2__c != null ? String.valueOf(o.Growing_Businesses_Supported_FY_2__c) : '');
                fv.put('JC_EXIST_JOBS_FY2', o.Jobs_from_Growing_Businesses_FY_2__c != null ? String.valueOf(o.Jobs_from_Growing_Businesses_FY_2__c) : '');
                fv.put('JC_COST_FY2', o.Avg_Cost_per_Job_FY_2__c != null ? String.valueOf(o.Avg_Cost_per_Job_FY_2__c) : '');

                fv.put('JC_NEW_BIZ_FY1', o.Projected_New_Businesses_FY_1__c != null ? String.valueOf(o.Projected_New_Businesses_FY_1__c) : '');
                fv.put('JC_NEW_JOBS_FY1', o.Projected_Jobs_from_New_Businesses_FY1__c != null ? String.valueOf(o.Projected_Jobs_from_New_Businesses_FY1__c) : '');
                fv.put('JC_EXIST_BIZ_FY1', o.Growing_Businesses_Supported_FY_1__c != null ? String.valueOf(o.Growing_Businesses_Supported_FY_1__c) : '');
                fv.put('JC_EXIST_JOBS_FY1', o.Jobs_from_Growing_Businesses_FY_1__c != null ? String.valueOf(o.Jobs_from_Growing_Businesses_FY_1__c) : '');
                fv.put('JC_COST_FY1', o.Avg_Cost_per_Job_FY_1__c != null ? String.valueOf(o.Avg_Cost_per_Job_FY_1__c) : '');

                fv.put('JC_NEW_BIZ_PROJ', o.Projected_New_Businesses_CFY__c != null ? String.valueOf(o.Projected_New_Businesses_CFY__c) : '');
                fv.put('JC_NEW_JOBS_PROJ', o.Projected_Jobs_from_New_Businesses_CFY__c != null ? String.valueOf(o.Projected_Jobs_from_New_Businesses_CFY__c) : '');
                fv.put('JC_EXIST_BIZ_PROJ', o.Growing_Businesses_Supported_CFY__c != null ? String.valueOf(o.Growing_Businesses_Supported_CFY__c) : '');
                fv.put('JC_EXIST_JOBS_PROJ', o.Jobs_from_Growing_Businesses_CFY__c != null ? String.valueOf(o.Jobs_from_Growing_Businesses_CFY__c) : '');
                fv.put('JC_COST_PROJ', o.Avg_Cost_per_Job_CFY__c != null ? String.valueOf(o.Avg_Cost_per_Job_CFY__c) : '');

                if (String.isNotBlank(o.Job_Verification_3rd_Party_CFY__c) && String.isBlank(String.valueOf(fv.get('Q24_VERIFIED__c')))) {
                    fv.put('Q24_VERIFIED__c', o.Job_Verification_3rd_Party_CFY__c);
                }
            }
            wrapper.formValues = fv;

            // 5. WCF_Skilling_Domain__c
            List<WCF_Skilling_Domain__c> domains = [
                SELECT Id, Domain_Programme_Name__c, Hours_of_Training__c,
                       Duration_Months__c, Programme_Start_Date__c, Yearly_Enrolment__c
                FROM WCF_Skilling_Domain__c 
                WHERE Proposal__c = :appId 
                WITH SYSTEM_MODE 
                ORDER BY CreatedDate ASC
            ];
            Integer dIdx = 1;
            for (WCF_Skilling_Domain__c d : domains) {
                Map<String, Object> dMap = new Map<String, Object>();
                dMap.put('id', dIdx++);
                dMap.put('name', d.Domain_Programme_Name__c);
                dMap.put('hours', d.Hours_of_Training__c != null ? String.valueOf(d.Hours_of_Training__c) : '');
                dMap.put('duration', d.Duration_Months__c != null ? String.valueOf(d.Duration_Months__c) : '');
                dMap.put('whenStarted', d.Programme_Start_Date__c != null ? String.valueOf(d.Programme_Start_Date__c) : '');
                dMap.put('enrollment', d.Yearly_Enrolment__c != null ? String.valueOf(d.Yearly_Enrolment__c) : '');
                wrapper.skillingDomains.add(dMap);
            }

            // 6. WCF_Business_Sector__c
            List<WCF_Business_Sector__c> sectors = [
                SELECT Id, Sector_c__c, Business_Sector_Other__c, Support_Begin_Date__c,
                       Support_Types__c, Support_Type_Other__c, Yearly_Enrolment__c
                FROM WCF_Business_Sector__c 
                WHERE Proposal__c = :appId 
                WITH SYSTEM_MODE 
                ORDER BY CreatedDate ASC
            ];
            Integer sIdx = 1;
            for (WCF_Business_Sector__c s : sectors) {
                Map<String, Object> sMap = new Map<String, Object>();
                sMap.put('id', sIdx++);
                sMap.put('sector', s.Sector_c__c);
                sMap.put('sectorOther', s.Business_Sector_Other__c);
                sMap.put('supportTypes', s.Support_Types__c != null ? s.Support_Types__c.split(';') : new List<String>());
                sMap.put('supportTypeOther', s.Support_Type_Other__c);
                sMap.put('whenBegan', s.Support_Begin_Date__c != null ? String.valueOf(s.Support_Begin_Date__c) : '');
                sMap.put('enrollment', s.Yearly_Enrolment__c != null ? String.valueOf(s.Yearly_Enrolment__c) : '');
                wrapper.businessSectors.add(sMap);
            }

            // 7. ContentDocumentLink files
            List<ContentDocumentLink> cdls = [
                SELECT ContentDocumentId,
                       ContentDocument.LatestPublishedVersion.Title,
                       ContentDocument.LatestPublishedVersion.FileExtension,
                       ContentDocument.LatestPublishedVersion.Description,
                       ContentDocument.LatestPublishedVersionId
                FROM ContentDocumentLink
                WHERE LinkedEntityId = :appId
                WITH SYSTEM_MODE
            ];
            for (ContentDocumentLink cdl : cdls) {
                String title = (cdl.ContentDocument.LatestPublishedVersion != null && String.isNotBlank(cdl.ContentDocument.LatestPublishedVersion.Title))
                    ? cdl.ContentDocument.LatestPublishedVersion.Title : 'File';
                String ext   = (cdl.ContentDocument.LatestPublishedVersion != null && String.isNotBlank(cdl.ContentDocument.LatestPublishedVersion.FileExtension))
                    ? cdl.ContentDocument.LatestPublishedVersion.FileExtension : '';
                String name  = String.isBlank(ext) ? title : title + '.' + ext;
                String descTag = (cdl.ContentDocument.LatestPublishedVersion != null)
                    ? cdl.ContentDocument.LatestPublishedVersion.Description : null;

                Map<String, String> fileInfo = new Map<String, String>{
                    'documentId' => String.valueOf(cdl.ContentDocumentId),
                    'contentVersionId' => String.valueOf(cdl.ContentDocument.LatestPublishedVersionId),
                    'name' => name
                };

                if (descTag == 'Q24') {
                    wrapper.q24Files.add(fileInfo);
                } else {
                    wrapper.q28Files.add(fileInfo);
                }
            }

        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'Error in getDynamicDraft: ' + ex.getMessage() + ' | Line: ' + ex.getLineNumber());
            wrapper.isSuccess = false;
            wrapper.message = 'Error loading draft: ' + ex.getMessage();
        }
        return wrapper;
    }

    private static IndividualApplication prepareAndSaveApplication(Id recordId, List<String> selectedTracks, String payloadJson, String targetStatus) {
        User currentUser = [
            SELECT Id, ContactId, AccountId, Account.IsPersonAccount 
            FROM User WHERE Id = :UserInfo.getUserId()
        ];
        Id accountId = currentUser.AccountId;
        Boolean isPersonAccount = currentUser.Account != null && currentUser.Account.IsPersonAccount;

        if (accountId == null) {
            List<Account> accs = [
                SELECT Id, IsPersonAccount FROM Account 
                WHERE Type != 'WIN COE' AND RecordType.DeveloperName != 'COE' AND IsPersonAccount = false
                ORDER BY CreatedDate DESC LIMIT 1
            ];
            if (accs.isEmpty()) {
                accs = [
                    SELECT Id, IsPersonAccount FROM Account 
                    WHERE Type != 'WIN COE' AND RecordType.DeveloperName != 'COE' 
                    ORDER BY CreatedDate DESC LIMIT 1
                ];
            }
            if (!accs.isEmpty()) {
                accountId = accs[0].Id;
                isPersonAccount = accs[0].IsPersonAccount;
            }
        } else if (currentUser.Account == null) {
            List<Account> userAccs = [SELECT Id, IsPersonAccount FROM Account WHERE Id = :accountId LIMIT 1];
            if (!userAccs.isEmpty()) {
                isPersonAccount = userAccs[0].IsPersonAccount;
            }
        }

        // Determine appropriate RecordType
        String formattedTracks = formatMultiSelectFundingArea(selectedTracks);
        RecordType wgRt = null;
        Map<String, RecordType> rtsByDevName = new Map<String, RecordType>();
        for (RecordType rt : [
            SELECT Id, DeveloperName FROM RecordType 
            WHERE SObjectType = 'IndividualApplication'
        ]) {
            rtsByDevName.put(rt.DeveloperName, rt);
        }

        if (formattedTracks == 'Both Job Fulfillment and Job Creation' && rtsByDevName.containsKey('WCF_Job_Fulfillment_Job_Creation_Proposals')) {
            wgRt = rtsByDevName.get('WCF_Job_Fulfillment_Job_Creation_Proposals');
        } else if (formattedTracks == 'Job Creation Only' && rtsByDevName.containsKey('WCF_Job_Creation_Proposals')) {
            wgRt = rtsByDevName.get('WCF_Job_Creation_Proposals');
        } else if (rtsByDevName.containsKey('WCF_Job_Fulfillment_Proposals')) {
            wgRt = rtsByDevName.get('WCF_Job_Fulfillment_Proposals');
        } else if (!rtsByDevName.isEmpty()) {
            wgRt = rtsByDevName.values()[0];
        }

        Map<String, Schema.SObjectField> appFields = Schema.SObjectType.IndividualApplication.fields.getMap();
        Boolean isNew = (recordId == null);
        IndividualApplication app;
        if (isNew) {
            app = new IndividualApplication(
                AccountId = accountId,
                OwnerId = currentUser.Id,
                Category = 'WCF Grant Application',
                Draft_Email_Sent__c = true
            );
        } else {
            Set<String> updateFieldNames = new Set<String>{
                'Id', 'RecordTypeId', 'AccountId', 'Category', 'Status', 'OwnerId', 'Initial_Submission_Date__c', 'Last_Resubmission_Date__c', 'Last_Page__c',
                'Organization_Name__c', 'ContactId', 'Principal_Investigator_PI__c', 'PI__c', 'Attesting_User_Name__c', 'Attesting_User_Title__c', 'Attestation_Date__c',
                'Draft_Email_Sent__c', 'Skilling_Approach__c', 'Job_Creation_Approach__c',
                'Organizational_Sustainability__c', 'Use_of_Additional_Funding__c',
                'GenieAI_Interest_Level__c', 'Operational_Synergies_with_WOF__c',
                'Leader_Tenure__c', 'Organizational_Area_s_for_Funding_Inves__c'
            };
            for (RFI_Question__mdt q : [SELECT Field_API_Name__c, Target_Object__c FROM RFI_Question__mdt]) {
                if (String.isNotBlank(q.Field_API_Name__c) && (q.Target_Object__c == 'IndividualApplication' || String.isBlank(q.Target_Object__c))) {
                    if (appFields.containsKey(q.Field_API_Name__c.toLowerCase())) {
                        updateFieldNames.add(appFields.get(q.Field_API_Name__c.toLowerCase()).getDescribe().getName());
                    }
                }
            }
            String updateSoql = 'SELECT ' + String.join(new List<String>(updateFieldNames), ', ') + ' FROM IndividualApplication WHERE Id = :recordId WITH SYSTEM_MODE LIMIT 1';
            app = Database.query(updateSoql);
        }

        app.Draft_Email_Sent__c = true;
        app.Category = 'WCF Grant Application';
        if (app.AccountId == null && accountId != null) {
            app.AccountId = accountId;
        }
        if (wgRt != null) {
            app.RecordTypeId = wgRt.Id;
        }

        // Set Main Multiselect Picklist Field for Funding Area Tracks
        if (String.isNotBlank(formattedTracks)) {
            app.Organizational_Area_s_for_Funding_Inves__c = formattedTracks;
        }

        // Parse Payload Map
        Map<String, Object> valuesMap = new Map<String, Object>();
        if (String.isNotBlank(payloadJson)) {
            valuesMap = (Map<String, Object>) JSON.deserializeUntyped(payloadJson);
        }

        // Map activeTabId to Last_Page__c
        if (valuesMap.containsKey('activeTabId') && valuesMap.get('activeTabId') != null) {
            String tabId = String.valueOf(valuesMap.get('activeTabId'));
            if (tabId == 'tabAboutOrg') app.Last_Page__c = 1;
            else if (tabId == 'tabJobFulfillment') app.Last_Page__c = 2;
            else if (tabId == 'tabJobCreation') app.Last_Page__c = 4;
            else if (tabId == 'tabLivelihood') app.Last_Page__c = 5;
            else if (tabId == 'tabWhyWadhwani') app.Last_Page__c = 6;
            else if (tabId == 'tabReviewSubmit') app.Last_Page__c = 7;
        }

        // Handle Submitter Contact
        String submitterName  = (String) valuesMap.get('Submitter_Name__c');
        String submitterTitle = (String) valuesMap.get('Job_Title__c');
        String submitterEmail = (String) valuesMap.get('Work_Email_ID__c');
        String submitterPhone = (String) valuesMap.get('Phone__c');

        Contact submitterContact;
        if (currentUser.ContactId != null) {
            submitterContact = new Contact(Id = currentUser.ContactId);
        } else if (!String.isBlank(submitterEmail)) {
            List<Contact> existingContacts = [
                SELECT Id, IsPersonAccount, FirstName, LastName, Title, Phone
                FROM Contact WHERE Email = :submitterEmail LIMIT 1
            ];
            if (!existingContacts.isEmpty()) {
                submitterContact = existingContacts[0];
            } else {
                submitterContact = new Contact(
                    LastName = String.isNotBlank(submitterName) ? submitterName : 'Applicant',
                    Email = submitterEmail,
                    New_PI__c = false
                );
                if (!isPersonAccount && accountId != null) submitterContact.AccountId = accountId;
                if (String.isNotBlank(submitterTitle)) submitterContact.Title = submitterTitle;
                if (String.isNotBlank(submitterPhone)) submitterContact.Phone = submitterPhone;
                insert submitterContact;
            }
        }
        if (submitterContact == null) {
            String cEmail = String.isNotBlank(submitterEmail) ? submitterEmail : UserInfo.getUserEmail();
            String cName = String.isNotBlank(submitterName) ? submitterName : UserInfo.getLastName();
            List<Contact> fallbackContacts = [SELECT Id FROM Contact WHERE Email = :cEmail LIMIT 1];
            if (!fallbackContacts.isEmpty()) {
                submitterContact = fallbackContacts[0];
            } else {
                submitterContact = new Contact(
                    LastName = String.isNotBlank(cName) ? cName : 'Applicant',
                    Email = cEmail,
                    New_PI__c = false
                );
                if (!isPersonAccount && accountId != null) submitterContact.AccountId = accountId;
                insert submitterContact;
            }
        }
        app.ContactId = submitterContact.Id;
        app.Principal_Investigator_PI__c = submitterContact.Id;
        if (app.PI__c == null) {
            app.PI__c = currentUser.Id;
        }

        // Map valuesMap into IndividualApplication fields
        for (String f : valuesMap.keySet()) {
            if (f == 'Id' || f == 'RecordTypeId' || f.equalsIgnoreCase('Organizational_Area_s_for_Funding_Inves__c') || !appFields.containsKey(f.toLowerCase())) continue;
            Object val = valuesMap.get(f);
            if (val == null) continue;
            try {
                Schema.DescribeFieldResult dfr = appFields.get(f.toLowerCase()).getDescribe();
                // Allow custom fields even if portal profile FLS is read-only
                if (!dfr.isCustom() && !dfr.isUpdateable() && !isNew) continue;
                Schema.DisplayType type = dfr.getType();
                String strVal = String.valueOf(val);
                if (String.isBlank(strVal)) continue;

                if (type == Schema.DisplayType.DATE) {
                    app.put(dfr.getName(), Date.valueOf(strVal));
                } else if (type == Schema.DisplayType.CURRENCY || type == Schema.DisplayType.DOUBLE || type == Schema.DisplayType.PERCENT) {
                    app.put(dfr.getName(), Decimal.valueOf(strVal.replaceAll('[^0-9.-]', '')));
                } else if (type == Schema.DisplayType.INTEGER) {
                    app.put(dfr.getName(), Integer.valueOf(strVal.replaceAll('[^0-9-]', '')));
                } else if (type == Schema.DisplayType.BOOLEAN) {
                    app.put(dfr.getName(), Boolean.valueOf(strVal));
                } else if (type == Schema.DisplayType.PICKLIST) {
                    String cleanVal = sanitizePicklistValue(dfr, strVal);
                    if (cleanVal != null) {
                        app.put(dfr.getName(), cleanVal);
                    }
                } else {
                    app.put(dfr.getName(), strVal);
                }
            } catch (Exception fieldEx) {
                System.debug(LoggingLevel.WARN, 'Field mapping note for ' + f + ': ' + fieldEx.getMessage());
            }
        }

        // Explicit fallback mappings for critical fields
        if (valuesMap.containsKey('Leader_Tenure__c') && valuesMap.get('Leader_Tenure__c') != null && String.isNotBlank(String.valueOf(valuesMap.get('Leader_Tenure__c')))) {
            try { app.Leader_Tenure__c = Decimal.valueOf(String.valueOf(valuesMap.get('Leader_Tenure__c')).trim().replaceAll('[^0-9.-]', '')); } catch(Exception e){}
        }
        if (valuesMap.containsKey('GenieAI_Interest_Level__c') && valuesMap.get('GenieAI_Interest_Level__c') != null && String.isNotBlank(String.valueOf(valuesMap.get('GenieAI_Interest_Level__c')))) {
            String gVal = String.valueOf(valuesMap.get('GenieAI_Interest_Level__c')).trim();
            if (gVal.equalsIgnoreCase('Yes') || gVal.equalsIgnoreCase('High') || gVal.toLowerCase().contains('interested')) {
                app.GenieAI_Interest_Level__c = 'Yes, interested';
            } else if (gVal.toLowerCase().contains('maybe') || gVal.toLowerCase().contains('learn')) {
                app.GenieAI_Interest_Level__c = 'Maybe, want to learn more';
            } else if (gVal.toLowerCase().contains('not') || gVal.equalsIgnoreCase('No') || gVal.equalsIgnoreCase('Low')) {
                app.GenieAI_Interest_Level__c = 'Not at this time';
            } else {
                app.GenieAI_Interest_Level__c = gVal;
            }
        }
        if (valuesMap.containsKey('Operational_Synergies_with_WOF__c') && valuesMap.get('Operational_Synergies_with_WOF__c') != null && String.isNotBlank(String.valueOf(valuesMap.get('Operational_Synergies_with_WOF__c')))) {
            app.Operational_Synergies_with_WOF__c = String.valueOf(valuesMap.get('Operational_Synergies_with_WOF__c'));
        }
        if (valuesMap.containsKey('Skilling_Approach__c') && valuesMap.get('Skilling_Approach__c') != null && String.isNotBlank(String.valueOf(valuesMap.get('Skilling_Approach__c')))) {
            app.Skilling_Approach__c = String.valueOf(valuesMap.get('Skilling_Approach__c'));
        }
        if (valuesMap.containsKey('Job_Creation_Approach__c') && valuesMap.get('Job_Creation_Approach__c') != null && String.isNotBlank(String.valueOf(valuesMap.get('Job_Creation_Approach__c')))) {
            app.Job_Creation_Approach__c = String.valueOf(valuesMap.get('Job_Creation_Approach__c'));
        }

        // Map legacy UI key Q_ORG_NAME if present
        if (valuesMap.containsKey('Q_ORG_NAME') && valuesMap.get('Q_ORG_NAME') != null && String.isBlank(app.Organization_Name__c)) {
            app.Organization_Name__c = String.valueOf(valuesMap.get('Q_ORG_NAME'));
        }
        if (valuesMap.containsKey('Skilling_Approach_FR__c') && valuesMap.get('Skilling_Approach_FR__c') != null && String.isBlank(app.Skilling_Approach__c)) {
            app.Skilling_Approach__c = String.valueOf(valuesMap.get('Skilling_Approach_FR__c'));
        }
        if (valuesMap.containsKey('Job_Creation_Approach_FR__c') && valuesMap.get('Job_Creation_Approach_FR__c') != null && String.isBlank(app.Job_Creation_Approach__c)) {
            app.Job_Creation_Approach__c = String.valueOf(valuesMap.get('Job_Creation_Approach_FR__c'));
        }
        if (valuesMap.containsKey('Organizational_Sustainability_FR__c') && valuesMap.get('Organizational_Sustainability_FR__c') != null && String.isBlank(app.Organizational_Sustainability__c)) {
            app.Organizational_Sustainability__c = String.valueOf(valuesMap.get('Organizational_Sustainability_FR__c'));
        }
        if (valuesMap.containsKey('Use_of_Additional_Funding_FR__c') && valuesMap.get('Use_of_Additional_Funding_FR__c') != null && String.isBlank(app.Use_of_Additional_Funding__c)) {
            app.Use_of_Additional_Funding__c = String.valueOf(valuesMap.get('Use_of_Additional_Funding_FR__c'));
        }

        // Funding Opportunity
        List<FundingOpportunity> fos = [
            SELECT Id FROM FundingOpportunity 
            WHERE Status = 'Active' AND FO_Type__c = 'WCF Proposal' AND RecordType.DeveloperName = 'WCF_Project_Proposal' 
            LIMIT 1
        ];
        if (!fos.isEmpty()) {
            app.FundingOpportunityId = fos[0].Id;
        }

        if (targetStatus == 'Submitted' || targetStatus == 'Application Resubmitted') {
            app.IsSubmitted = true;
            if (app.Initial_Submission_Date__c == null) {
                app.Initial_Submission_Date__c = System.now();
            } else {
                app.Last_Resubmission_Date__c = System.now();
            }
            if (String.isBlank(app.Attesting_User_Name__c)) {
                if (String.isNotBlank(submitterName)) {
                    app.Attesting_User_Name__c = submitterName;
                } else if (currentUser != null && currentUser.ContactId != null && currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Name)) {
                    app.Attesting_User_Name__c = currentUser.Contact.Name;
                } else {
                    app.Attesting_User_Name__c = UserInfo.getName();
                }
            }
            if (String.isBlank(app.Attesting_User_Title__c)) {
                app.Attesting_User_Title__c = String.isNotBlank(submitterTitle) ? submitterTitle : 'Applicant';
            }
            app.Attestation_Date__c = System.now();

            if (targetStatus == 'Application Resubmitted' || app.Status == 'Revision Requested') {
                app.Status = 'Application Resubmitted';
                app.Last_Resubmission_Date__c = System.now();
            } else {
                app.Status = 'Submitted';
            }
        } else {
            if (app.Status != 'Revision Requested' && app.Status != 'Application Resubmitted') {
                app.Status = 'Draft';
            }
        }
        upsert app;

        // Upsert Child Objects
        upsertChildObjects(app.Id, valuesMap, targetStatus);

        return app;
    }

    private static void upsertChildObjects(Id appId, Map<String, Object> valuesMap, String statusStr) {
        String childStatus = (statusStr == 'Submitted' || statusStr == 'Application Resubmitted') ? 'Submitted' : 'Draft';
        // 1. Historical_Data__c
        Map<String, Schema.SObjectField> histFields = Schema.SObjectType.Historical_Data__c.fields.getMap();
        Boolean hasHistData = false;
        Historical_Data__c hist = new Historical_Data__c(Proposal__c = appId, Status__c = childStatus);
        List<Historical_Data__c> existingHist = [SELECT Id FROM Historical_Data__c WHERE Proposal__c = :appId LIMIT 1];
        if (!existingHist.isEmpty()) {
            hist.Id = existingHist[0].Id;
        }
        for (String f : valuesMap.keySet()) {
            if (histFields.containsKey(f.toLowerCase())) {
                hasHistData = true;
                Object val = valuesMap.get(f);
                if (val == null) continue;
                String strVal = String.valueOf(val);
                if (String.isBlank(strVal)) continue;
                try {
                    Schema.DisplayType type = histFields.get(f.toLowerCase()).getDescribe().getType();
                    if (type == Schema.DisplayType.CURRENCY || type == Schema.DisplayType.DOUBLE || type == Schema.DisplayType.PERCENT) {
                        hist.put(histFields.get(f.toLowerCase()).getDescribe().getName(), Decimal.valueOf(strVal));
                    } else if (type == Schema.DisplayType.INTEGER) {
                        hist.put(histFields.get(f.toLowerCase()).getDescribe().getName(), Integer.valueOf(strVal));
                    } else {
                        hist.put(histFields.get(f.toLowerCase()).getDescribe().getName(), strVal);
                    }
                } catch (Exception e) {
                    System.debug('Hist field error ' + f + ': ' + e.getMessage());
                }
            }
        }
        // Explicit alias mappings for Historical_Data__c
        if (valuesMap.containsKey('START_FY3') && hist.CY3_Balance_Start_CFY_3__c == null) {
            try { hist.CY3_Balance_Start_CFY_3__c = Decimal.valueOf(String.valueOf(valuesMap.get('START_FY3'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('REV_FY3') && hist.CY3_Revenue__c == null) {
            try { hist.CY3_Revenue__c = Decimal.valueOf(String.valueOf(valuesMap.get('REV_FY3'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('CAP_FY3') && hist.CY3_Capital_Expenditure__c == null) {
            try { hist.CY3_Capital_Expenditure__c = Decimal.valueOf(String.valueOf(valuesMap.get('CAP_FY3'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('OP_FY3') && hist.CY3_Operating_Expenditure__c == null) {
            try { hist.CY3_Operating_Expenditure__c = Decimal.valueOf(String.valueOf(valuesMap.get('OP_FY3'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('REV_FY2') && hist.CY2_Revenue__c == null) {
            try { hist.CY2_Revenue__c = Decimal.valueOf(String.valueOf(valuesMap.get('REV_FY2'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('CAP_FY2') && hist.CY2_Capital_Expenditure__c == null) {
            try { hist.CY2_Capital_Expenditure__c = Decimal.valueOf(String.valueOf(valuesMap.get('CAP_FY2'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('OP_FY2') && hist.CY2_Operating_Expenditure__c == null) {
            try { hist.CY2_Operating_Expenditure__c = Decimal.valueOf(String.valueOf(valuesMap.get('OP_FY2'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('REV_FY1') && hist.CY1_Revenue__c == null) {
            try { hist.CY1_Revenue__c = Decimal.valueOf(String.valueOf(valuesMap.get('REV_FY1'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('CAP_FY1') && hist.CY1_Capital_Expenditure__c == null) {
            try { hist.CY1_Capital_Expenditure__c = Decimal.valueOf(String.valueOf(valuesMap.get('CAP_FY1'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('OP_FY1') && hist.CY1_Operating_Expenditure__c == null) {
            try { hist.CY1_Operating_Expenditure__c = Decimal.valueOf(String.valueOf(valuesMap.get('OP_FY1'))); hasHistData = true; } catch(Exception ignored){}
        }
        if (hasHistData) {
            upsert hist;
        }

        // 2. Current_fiscal_year_data__c
        Map<String, Schema.SObjectField> fiscalFields = Schema.SObjectType.Current_fiscal_year_data__c.fields.getMap();
        Boolean hasFiscalData = false;
        Current_fiscal_year_data__c fiscal = new Current_fiscal_year_data__c(Proposal__c = appId, Status__c = childStatus);
        List<Current_fiscal_year_data__c> existingFiscal = [SELECT Id FROM Current_fiscal_year_data__c WHERE Proposal__c = :appId LIMIT 1];
        if (!existingFiscal.isEmpty()) {
            fiscal.Id = existingFiscal[0].Id;
        }
        for (String f : valuesMap.keySet()) {
            if (fiscalFields.containsKey(f.toLowerCase())) {
                hasFiscalData = true;
                Object val = valuesMap.get(f);
                if (val == null) continue;
                String strVal = String.valueOf(val);
                if (String.isBlank(strVal)) continue;
                try {
                    Schema.DisplayType type = fiscalFields.get(f.toLowerCase()).getDescribe().getType();
                    if (type == Schema.DisplayType.CURRENCY || type == Schema.DisplayType.DOUBLE || type == Schema.DisplayType.PERCENT) {
                        fiscal.put(fiscalFields.get(f.toLowerCase()).getDescribe().getName(), Decimal.valueOf(strVal));
                    } else if (type == Schema.DisplayType.INTEGER) {
                        fiscal.put(fiscalFields.get(f.toLowerCase()).getDescribe().getName(), Integer.valueOf(strVal));
                    } else {
                        fiscal.put(fiscalFields.get(f.toLowerCase()).getDescribe().getName(), strVal);
                    }
                } catch (Exception e) {
                    System.debug('Fiscal field error ' + f + ': ' + e.getMessage());
                }
            }
        }
        // Explicit alias mappings for Current_fiscal_year_data__c
        if (valuesMap.containsKey('CFY_REV_BUDGET') && fiscal.Revenue_Budget__c == null) {
            try { fiscal.Revenue_Budget__c = Decimal.valueOf(String.valueOf(valuesMap.get('CFY_REV_BUDGET'))); hasFiscalData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('CFY_REV_PROJ') && fiscal.Revenue_Projection__c == null) {
            try { fiscal.Revenue_Projection__c = Decimal.valueOf(String.valueOf(valuesMap.get('CFY_REV_PROJ'))); hasFiscalData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('CFY_CAP_BUDGET') && fiscal.Capital_Expenditure_Budget__c == null) {
            try { fiscal.Capital_Expenditure_Budget__c = Decimal.valueOf(String.valueOf(valuesMap.get('CFY_CAP_BUDGET'))); hasFiscalData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('CFY_CAP_PROJ') && fiscal.Capital_Expenditure_Projection__c == null) {
            try { fiscal.Capital_Expenditure_Projection__c = Decimal.valueOf(String.valueOf(valuesMap.get('CFY_CAP_PROJ'))); hasFiscalData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('CFY_OP_BUDGET') && fiscal.Operating_Expenditure_Budget__c == null) {
            try { fiscal.Operating_Expenditure_Budget__c = Decimal.valueOf(String.valueOf(valuesMap.get('CFY_OP_BUDGET'))); hasFiscalData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('CFY_OP_PROJ') && fiscal.Operating_Expenditure_Projection__c == null) {
            try { fiscal.Operating_Expenditure_Projection__c = Decimal.valueOf(String.valueOf(valuesMap.get('CFY_OP_PROJ'))); hasFiscalData = true; } catch(Exception ignored){}
        }
        if (hasFiscalData) {
            upsert fiscal;
        }

        // 3. Outcomes_Data__c
        Map<String, Schema.SObjectField> outFields = Schema.SObjectType.Outcomes_Data__c.fields.getMap();
        Boolean hasOutcomeData = false;
        Outcomes_Data__c out = new Outcomes_Data__c(Proposal__c = appId, Status__c = childStatus);
        List<Outcomes_Data__c> existingOut = [SELECT Id FROM Outcomes_Data__c WHERE Proposal__c = :appId LIMIT 1];
        if (!existingOut.isEmpty()) {
            out.Id = existingOut[0].Id;
        }
        for (String f : valuesMap.keySet()) {
            if (outFields.containsKey(f.toLowerCase())) {
                hasOutcomeData = true;
                Object val = valuesMap.get(f);
                if (val == null) continue;
                String strVal = String.valueOf(val);
                if (String.isBlank(strVal)) continue;
                try {
                    Schema.DescribeFieldResult dfr = outFields.get(f.toLowerCase()).getDescribe();
                    Schema.DisplayType type = dfr.getType();
                    if (type == Schema.DisplayType.CURRENCY || type == Schema.DisplayType.DOUBLE || type == Schema.DisplayType.PERCENT || type == Schema.DisplayType.INTEGER) {
                        out.put(dfr.getName(), Decimal.valueOf(strVal));
                    } else if (type == Schema.DisplayType.BOOLEAN) {
                        out.put(dfr.getName(), Boolean.valueOf(strVal));
                    } else if (type == Schema.DisplayType.PICKLIST) {
                        String cleanVal = sanitizePicklistValue(dfr, strVal);
                        if (cleanVal != null) {
                            out.put(dfr.getName(), cleanVal);
                        }
                    } else {
                        out.put(dfr.getName(), strVal);
                    }
                } catch (Exception e) {
                    System.debug('Outcome field error ' + f + ': ' + e.getMessage());
                }
            }
        }
        // Explicit alias mappings for Outcomes_Data__c (Track 1 & Track 2 & Q24)
        if (valuesMap.containsKey('JF_ENROLL_FY3') && out.Projected_Learner_Enrollments_FY_3__c == null) {
            out.Projected_Learner_Enrollments_FY_3__c = String.valueOf(valuesMap.get('JF_ENROLL_FY3')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JF_PLACE_FY3') && out.Projected_Learner_Placements_FY_3__c == null) {
            out.Projected_Learner_Placements_FY_3__c = String.valueOf(valuesMap.get('JF_PLACE_FY3')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JF_COST_FY3') && out.Avg_Cost_per_Placement_FY_3__c == null) {
            try { out.Avg_Cost_per_Placement_FY_3__c = Decimal.valueOf(String.valueOf(valuesMap.get('JF_COST_FY3'))); hasOutcomeData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('JF_ENROLL_FY2') && out.Projected_Learner_Enrollments_FY_2__c == null) {
            out.Projected_Learner_Enrollments_FY_2__c = String.valueOf(valuesMap.get('JF_ENROLL_FY2')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JF_PLACE_FY2') && out.Projected_Learner_Placements_FY_2__c == null) {
            out.Projected_Learner_Placements_FY_2__c = String.valueOf(valuesMap.get('JF_PLACE_FY2')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JF_COST_FY2') && out.Avg_Cost_per_Placement_FY_2__c == null) {
            try { out.Avg_Cost_per_Placement_FY_2__c = Decimal.valueOf(String.valueOf(valuesMap.get('JF_COST_FY2'))); hasOutcomeData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('JF_ENROLL_FY1') && out.Projected_Learner_Enrollments_FY_1__c == null) {
            out.Projected_Learner_Enrollments_FY_1__c = String.valueOf(valuesMap.get('JF_ENROLL_FY1')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JF_PLACE_FY1') && out.Projected_Learner_Placements_FY_1__c == null) {
            out.Projected_Learner_Placements_FY_1__c = String.valueOf(valuesMap.get('JF_PLACE_FY1')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JF_COST_FY1') && out.Avg_Cost_per_Placement_FY_1__c == null) {
            try { out.Avg_Cost_per_Placement_FY_1__c = Decimal.valueOf(String.valueOf(valuesMap.get('JF_COST_FY1'))); hasOutcomeData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('JF_ENROLL_PROJ') && out.Projected_Learner_Enrollments_CFY__c == null) {
            out.Projected_Learner_Enrollments_CFY__c = String.valueOf(valuesMap.get('JF_ENROLL_PROJ')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JF_PLACE_PROJ') && out.Projected_Learner_Placements_CFY__c == null) {
            out.Projected_Learner_Placements_CFY__c = String.valueOf(valuesMap.get('JF_PLACE_PROJ')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JF_COST_PROJ') && out.Avg_Cost_per_Placement_CFY__c == null) {
            try { out.Avg_Cost_per_Placement_CFY__c = Decimal.valueOf(String.valueOf(valuesMap.get('JF_COST_PROJ'))); hasOutcomeData = true; } catch(Exception ignored){}
        }

        if (valuesMap.containsKey('JC_NEW_BIZ_FY3') && out.Projected_New_Businesses_FY_3__c == null) {
            out.Projected_New_Businesses_FY_3__c = String.valueOf(valuesMap.get('JC_NEW_BIZ_FY3')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_NEW_JOBS_FY3') && out.Projected_Jobs_from_New_Businesses_FY3__c == null) {
            out.Projected_Jobs_from_New_Businesses_FY3__c = String.valueOf(valuesMap.get('JC_NEW_JOBS_FY3')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_EXIST_BIZ_FY3') && out.Growing_Businesses_Supported_FY_3__c == null) {
            out.Growing_Businesses_Supported_FY_3__c = String.valueOf(valuesMap.get('JC_EXIST_BIZ_FY3')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_EXIST_JOBS_FY3') && out.Jobs_from_Growing_Businesses_FY_3__c == null) {
            out.Jobs_from_Growing_Businesses_FY_3__c = String.valueOf(valuesMap.get('JC_EXIST_JOBS_FY3')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_COST_FY3') && out.Avg_Cost_per_Job_FY_3__c == null) {
            try { out.Avg_Cost_per_Job_FY_3__c = Decimal.valueOf(String.valueOf(valuesMap.get('JC_COST_FY3'))); hasOutcomeData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('JC_NEW_BIZ_FY2') && out.Projected_New_Businesses_FY_2__c == null) {
            out.Projected_New_Businesses_FY_2__c = String.valueOf(valuesMap.get('JC_NEW_BIZ_FY2')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_NEW_JOBS_FY2') && out.Projected_Jobs_from_New_Businesses_FY2__c == null) {
            out.Projected_Jobs_from_New_Businesses_FY2__c = String.valueOf(valuesMap.get('JC_NEW_JOBS_FY2')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_EXIST_BIZ_FY2') && out.Growing_Businesses_Supported_FY_2__c == null) {
            out.Growing_Businesses_Supported_FY_2__c = String.valueOf(valuesMap.get('JC_EXIST_BIZ_FY2')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_EXIST_JOBS_FY2') && out.Jobs_from_Growing_Businesses_FY_2__c == null) {
            out.Jobs_from_Growing_Businesses_FY_2__c = String.valueOf(valuesMap.get('JC_EXIST_JOBS_FY2')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_COST_FY2') && out.Avg_Cost_per_Job_FY_2__c == null) {
            try { out.Avg_Cost_per_Job_FY_2__c = Decimal.valueOf(String.valueOf(valuesMap.get('JC_COST_FY2'))); hasOutcomeData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('JC_NEW_BIZ_FY1') && out.Projected_New_Businesses_FY_1__c == null) {
            out.Projected_New_Businesses_FY_1__c = String.valueOf(valuesMap.get('JC_NEW_BIZ_FY1')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_NEW_JOBS_FY1') && out.Projected_Jobs_from_New_Businesses_FY1__c == null) {
            out.Projected_Jobs_from_New_Businesses_FY1__c = String.valueOf(valuesMap.get('JC_NEW_JOBS_FY1')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_EXIST_BIZ_FY1') && out.Growing_Businesses_Supported_FY_1__c == null) {
            out.Growing_Businesses_Supported_FY_1__c = String.valueOf(valuesMap.get('JC_EXIST_BIZ_FY1')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_EXIST_JOBS_FY1') && out.Jobs_from_Growing_Businesses_FY_1__c == null) {
            out.Jobs_from_Growing_Businesses_FY_1__c = String.valueOf(valuesMap.get('JC_EXIST_JOBS_FY1')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_COST_FY1') && out.Avg_Cost_per_Job_FY_1__c == null) {
            try { out.Avg_Cost_per_Job_FY_1__c = Decimal.valueOf(String.valueOf(valuesMap.get('JC_COST_FY1'))); hasOutcomeData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('JC_NEW_BIZ_PROJ') && out.Projected_New_Businesses_CFY__c == null) {
            out.Projected_New_Businesses_CFY__c = String.valueOf(valuesMap.get('JC_NEW_BIZ_PROJ')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_NEW_JOBS_PROJ') && out.Projected_Jobs_from_New_Businesses_CFY__c == null) {
            out.Projected_Jobs_from_New_Businesses_CFY__c = String.valueOf(valuesMap.get('JC_NEW_JOBS_PROJ')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_EXIST_BIZ_PROJ') && out.Growing_Businesses_Supported_CFY__c == null) {
            out.Growing_Businesses_Supported_CFY__c = String.valueOf(valuesMap.get('JC_EXIST_BIZ_PROJ')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_EXIST_JOBS_PROJ') && out.Jobs_from_Growing_Businesses_CFY__c == null) {
            out.Jobs_from_Growing_Businesses_CFY__c = String.valueOf(valuesMap.get('JC_EXIST_JOBS_PROJ')); hasOutcomeData = true;
        }
        if (valuesMap.containsKey('JC_COST_PROJ') && out.Avg_Cost_per_Job_CFY__c == null) {
            try { out.Avg_Cost_per_Job_CFY__c = Decimal.valueOf(String.valueOf(valuesMap.get('JC_COST_PROJ'))); hasOutcomeData = true; } catch(Exception ignored){}
        }
        if (valuesMap.containsKey('Q24_VERIFIED') && out.Job_Verification_3rd_Party_CFY__c == null) {
            out.Job_Verification_3rd_Party_CFY__c = String.valueOf(valuesMap.get('Q24_VERIFIED')); hasOutcomeData = true;
        }
        if (hasOutcomeData) {
            upsert out;
        }

        // 4. WCF_Skilling_Domain__c
        if (valuesMap.containsKey('skillingDomains') && valuesMap.get('skillingDomains') != null) {
            List<Object> skillingDomains = (List<Object>) valuesMap.get('skillingDomains');
            if (!skillingDomains.isEmpty()) {
                List<WCF_Skilling_Domain__c> domainRows = new List<WCF_Skilling_Domain__c>();
                for (Object item : skillingDomains) {
                    Map<String, Object> row = (Map<String, Object>) item;
                    String domainName = (String) row.get('name');
                    if (String.isBlank(domainName)) domainName = (String) row.get('domain');
                    if (String.isBlank(domainName)) continue;
                    WCF_Skilling_Domain__c d = new WCF_Skilling_Domain__c(Proposal__c = appId, Domain_Programme_Name__c = domainName);
                    if (row.get('hours') != null && String.isNotBlank(String.valueOf(row.get('hours'))))
                        d.Hours_of_Training__c = Decimal.valueOf(String.valueOf(row.get('hours')));
                    if (row.get('duration') != null && String.isNotBlank(String.valueOf(row.get('duration'))))
                        d.Duration_Months__c = Decimal.valueOf(String.valueOf(row.get('duration')));
                    Object sDateObj = row.get('whenStarted') != null ? row.get('whenStarted') : row.get('startDate');
                    if (sDateObj != null && String.isNotBlank(String.valueOf(sDateObj)))
                        d.Programme_Start_Date__c = Date.valueOf(String.valueOf(sDateObj));
                    Object yEnrolObj = row.get('enrollment') != null ? row.get('enrollment') : row.get('yearlyEnrolment');
                    if (yEnrolObj != null && String.isNotBlank(String.valueOf(yEnrolObj)))
                        d.Yearly_Enrolment__c = Decimal.valueOf(String.valueOf(yEnrolObj));
                    domainRows.add(d);
                }
                if (!domainRows.isEmpty()) {
                    delete [SELECT Id FROM WCF_Skilling_Domain__c WHERE Proposal__c = :appId];
                    insert domainRows;
                }
            }
        }

        // 5. WCF_Business_Sector__c
        if (valuesMap.containsKey('businessSectors') && valuesMap.get('businessSectors') != null) {
            List<Object> businessSectors = (List<Object>) valuesMap.get('businessSectors');
            if (!businessSectors.isEmpty()) {
                List<WCF_Business_Sector__c> sectorRows = new List<WCF_Business_Sector__c>();
                for (Object item : businessSectors) {
                    Map<String, Object> row = (Map<String, Object>) item;
                    String sectorName = (String) row.get('sector');
                    if (String.isBlank(sectorName)) continue;
                    WCF_Business_Sector__c s = new WCF_Business_Sector__c(Proposal__c = appId, Sector_c__c = sectorName);
                    if (row.get('sectorOther') != null && String.isNotBlank(String.valueOf(row.get('sectorOther'))))
                        s.Business_Sector_Other__c = (String) row.get('sectorOther');
                    if (row.get('supportTypeOther') != null && String.isNotBlank(String.valueOf(row.get('supportTypeOther'))))
                        s.Support_Type_Other__c = (String) row.get('supportTypeOther');
                    Object sBeginObj = row.get('whenBegan') != null ? row.get('whenBegan') : row.get('supportBegin');
                    if (sBeginObj != null && String.isNotBlank(String.valueOf(sBeginObj)))
                        s.Support_Begin_Date__c = Date.valueOf(String.valueOf(sBeginObj));

                    Object yEnrolObj = row.get('enrollment') != null ? row.get('enrollment') : row.get('yearlyEnrolment');
                    if (yEnrolObj != null && String.isNotBlank(String.valueOf(yEnrolObj)))
                        s.Yearly_Enrolment__c = Decimal.valueOf(String.valueOf(yEnrolObj));

                    if (row.get('supportTypes') != null) {
                        List<Object> types = (List<Object>) row.get('supportTypes');
                        List<String> typeStrings = new List<String>();
                        List<Schema.PicklistEntry> validEntries = Schema.SObjectType.WCF_Business_Sector__c.fields.Support_Types__c.getPicklistValues();
                        for (Object t : types) {
                            String tStr = String.valueOf(t).trim();
                            if (tStr.equalsIgnoreCase('Funding')) tStr = 'Capital';
                            for (Schema.PicklistEntry ple : validEntries) {
                                if (ple.isActive() && ple.getValue().equalsIgnoreCase(tStr)) {
                                    typeStrings.add(ple.getValue());
                                    break;
                                }
                            }
                        }
                        if (!typeStrings.isEmpty()) {
                            s.Support_Types__c = String.join(typeStrings, ';');
                        }
                    }
                    sectorRows.add(s);
                }
                if (!sectorRows.isEmpty()) {
                    delete [SELECT Id FROM WCF_Business_Sector__c WHERE Proposal__c = :appId];
                    insert sectorRows;
                }
            }
        }

        // 6. Link Uploaded Files (Q24 & Q28) to IndividualApplication (Proposal)
        Set<String> docIdsToLink = new Set<String>();
        List<Id> q24Ids = new List<Id>();
        List<Id> q28Ids = new List<Id>();

        if (valuesMap.containsKey('q24DocumentIds') && valuesMap.get('q24DocumentIds') != null) {
            List<Object> q24Docs = (List<Object>) valuesMap.get('q24DocumentIds');
            for (Object d : q24Docs) {
                if (d != null && String.isNotBlank(String.valueOf(d))) {
                    String strId = String.valueOf(d).trim();
                    docIdsToLink.add(strId);
                    try { q24Ids.add((Id) strId); } catch(Exception ignored) {}
                }
            }
        }
        if (valuesMap.containsKey('q28DocumentIds') && valuesMap.get('q28DocumentIds') != null) {
            List<Object> q28Docs = (List<Object>) valuesMap.get('q28DocumentIds');
            for (Object d : q28Docs) {
                if (d != null && String.isNotBlank(String.valueOf(d))) {
                    String strId = String.valueOf(d).trim();
                    docIdsToLink.add(strId);
                    try { q28Ids.add((Id) strId); } catch(Exception ignored) {}
                }
            }
        }
        if (valuesMap.containsKey('uploadedDocumentIds') && valuesMap.get('uploadedDocumentIds') != null) {
            List<Object> upDocs = (List<Object>) valuesMap.get('uploadedDocumentIds');
            for (Object d : upDocs) {
                if (d != null && String.isNotBlank(String.valueOf(d))) docIdsToLink.add(String.valueOf(d).trim());
            }
        }

        // Clean up unlinked/cancelled files for Q24 / Q28 on this application
        Set<Id> activeDocIds = new Set<Id>();
        for (String dId : docIdsToLink) {
            try { activeDocIds.add((Id) dId); } catch(Exception ignored) {}
        }

        List<ContentDocumentLink> linksToDelete = new List<ContentDocumentLink>();
        Set<Id> docsToDelete = new Set<Id>();

        for (ContentDocumentLink cdl : [
            SELECT Id, ContentDocumentId, ContentDocument.LatestPublishedVersion.Description
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :appId
            WITH SYSTEM_MODE
        ]) {
            if (!activeDocIds.contains(cdl.ContentDocumentId)) {
                String descTag = (cdl.ContentDocument.LatestPublishedVersion != null)
                    ? cdl.ContentDocument.LatestPublishedVersion.Description : null;
                // Clean up applicant files (Q24, Q28, SUPPORTING, or untagged), preserve reviewer addendums
                if (descTag == 'Q24' || descTag == 'Q28' || descTag == 'SUPPORTING' || String.isBlank(descTag)) {
                    linksToDelete.add(cdl);
                    docsToDelete.add(cdl.ContentDocumentId);
                }
            }
        }
        if (!linksToDelete.isEmpty()) {
            delete as system linksToDelete;
        }
        if (!docsToDelete.isEmpty()) {
            try {
                delete as system [SELECT Id FROM ContentDocument WHERE Id IN :docsToDelete];
            } catch(Exception ignored) {}
        }

        if (!q24Ids.isEmpty()) {
            List<ContentVersion> cvs = [SELECT Id, Description FROM ContentVersion WHERE ContentDocumentId IN :q24Ids];
            for (ContentVersion cv : cvs) {
                cv.Description = 'Q24';
            }
            update cvs;
        }
        if (!q28Ids.isEmpty()) {
            List<ContentVersion> cvs = [SELECT Id, Description FROM ContentVersion WHERE ContentDocumentId IN :q28Ids];
            for (ContentVersion cv : cvs) {
                cv.Description = 'Q28';
            }
            update cvs;
        }

        if (!docIdsToLink.isEmpty()) {
            Set<Id> existingDocIds = new Set<Id>();
            for (ContentDocumentLink cdl : [SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :appId]) {
                existingDocIds.add(cdl.ContentDocumentId);
            }
            List<ContentDocumentLink> linksToInsert = new List<ContentDocumentLink>();
            for (String docIdStr : docIdsToLink) {
                try {
                    Id docId = (Id) docIdStr.trim();
                    if (!existingDocIds.contains(docId)) {
                        linksToInsert.add(new ContentDocumentLink(
                            ContentDocumentId = docId,
                            LinkedEntityId = appId,
                            ShareType = 'V',
                            Visibility = 'AllUsers'
                        ));
                    }
                } catch (Exception ex) {
                    System.debug(LoggingLevel.WARN, 'ContentDocumentLink insert warning: ' + ex.getMessage());
                }
            }
            if (!linksToInsert.isEmpty()) {
                insert linksToInsert;
            }
        }
    }

    private static String sanitizePicklistValue(Schema.DescribeFieldResult dfr, String strVal) {
        if (String.isBlank(strVal)) return null;
        String trimmed = strVal.trim();
        List<Schema.PicklistEntry> entries = dfr.getPicklistValues();
        
        // 1. Direct exact or case-insensitive match
        for (Schema.PicklistEntry ple : entries) {
            if (ple.isActive() && ple.getValue().equalsIgnoreCase(trimmed)) {
                return ple.getValue();
            }
        }
        
        // 2. Known synonym mappings
        String fName = dfr.getName().toLowerCase();
        if (fName.contains('funder') && fName.contains('type')) {
            if (trimmed.equalsIgnoreCase('CSR') || trimmed.equalsIgnoreCase('Foundation') || trimmed.equalsIgnoreCase('Multilateral')) {
                return 'Grant';
            }
            if (trimmed.equalsIgnoreCase('Other')) {
                return 'Grant';
            }
        }
        if (fName == 'is_fcra_registered__c' || fName.contains('fcra')) {
            if (trimmed.equalsIgnoreCase('NA')) return 'Not Applicable';
        }
        if (fName == 'legal_type__c') {
            if (trimmed.equalsIgnoreCase('Non-Profit')) return 'Non-profit';
            if (trimmed.equalsIgnoreCase('For-Profit')) return 'For-profit';
        }
        
        // 3. If restricted picklist and no match, return null to avoid DmlException
        if (dfr.isRestrictedPicklist()) {
            return null;
        }
        return trimmed;
    }
}
