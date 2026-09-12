public without sharing class WCFValidatorController {
    
    // ─────────────────────────────────────────────────────────────
    // 1. LIST VIEW
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static List<ApplicationWrapper> getApplicationList() {

        Set<Id> allowedTypeIds = RecordTypeHelper.individualApplicationAllowedIds();

        List<IndividualApplication> apps = [
            SELECT
                Id, Name, AccountId, Account.Name,
                Status, AppliedDate, Funding_Year__c,
                Category, ApplicationType, RecordType.Name, Due_Date__c,
                Organizational_Area_s_for_Funding_Inves1__c, Organizational_Area_s_for_Funding_Inves__c
            FROM IndividualApplication
            WHERE RecordTypeId IN :allowedTypeIds
            AND Status IN (
                'Submitted',
                'Revision Requested',
                'Under Review',
                'Application Resubmitted',
                'Under External Review',
                'Reviewer Rejected',
                'Validated',
                'Under Validation',
                'Returned to Validator'
            )
            WITH SYSTEM_MODE
            ORDER BY AppliedDate DESC NULLS LAST
            LIMIT 500
        ];

        Id validatorRecordTypeId = getWCFValidatorRecordTypeId();
        Set<Id> appIds = new Map<Id, IndividualApplication>(apps).keySet();

        Set<Id> sealedAppIds = new Set<Id>();
        for (ApplicationReview ar : [
            SELECT ApplicationId
            FROM ApplicationReview
            WHERE ApplicationId IN :appIds
            AND Status IN ('Validated', 'Flagged') 
            AND RecordTypeId = :validatorRecordTypeId
            WITH SYSTEM_MODE
        ]) {
            sealedAppIds.add(ar.ApplicationId);
        }

        Set<Id> draftAppIds = new Set<Id>();
        for (ApplicationReview ar : [
            SELECT ApplicationId
            FROM ApplicationReview
            WHERE ApplicationId IN :appIds
            AND Status = 'Draft'
            AND RecordTypeId = :validatorRecordTypeId
            WITH SYSTEM_MODE
        ]) {
            draftAppIds.add(ar.ApplicationId);
        }

        List<ApplicationWrapper> result = new List<ApplicationWrapper>();
        for (IndividualApplication app : apps) {
            ApplicationWrapper w = new ApplicationWrapper();
            w.application = app;

            Boolean isResubmission       = (app.Status == 'Application Resubmitted');
            Boolean isUnderValidation    = (app.Status == 'Under Validation');
            Boolean isAwaitingApplicant  = (app.Status == 'Revision Requested');
            Boolean isReturnedByReviewer = (app.Status == 'Returned to Validator');

            w.isValidated          = sealedAppIds.contains(app.Id) && !isResubmission && !isAwaitingApplicant && !isReturnedByReviewer;
            w.hasDraft             = (draftAppIds.contains(app.Id) || isUnderValidation) && !isResubmission && !isAwaitingApplicant && !isReturnedByReviewer;
            w.isResubmission       = isResubmission;
            w.isAwaitingApplicant  = isAwaitingApplicant;
            w.isReturnedByReviewer = isReturnedByReviewer;

            result.add(w);
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // NEW: RETURN WCF VALIDATOR RECORD TYPE ID TO CLIENT
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static String getWCFValidatorRecordTypeIdForClient() {
        return getWCFValidatorRecordTypeId();
    }

    // ─────────────────────────────────────────────────────────────
    // ATTACHMENT WRAPPER CLASS
    // ─────────────────────────────────────────────────────────────
    public class AttachmentWrapper {
        @AuraEnabled public String questionKey;
        @AuraEnabled public String v1Value;
        @AuraEnabled public String fileName;
        @AuraEnabled public String fileExtension;
        @AuraEnabled public Decimal fileSizeMB;
        @AuraEnabled public Id contentDocumentId;
        @AuraEnabled public Id contentVersionId;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. GET ATTACHMENTS FOR PREVIEW
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static List<AttachmentWrapper> getApplicationAttachments(Id applicationId) {

        List<AttachmentWrapper> result = new List<AttachmentWrapper>();
        if (applicationId == null) return result;

        List<IndividualApplication> appRows = [
            SELECT Id, Q24_VERIFIED__c, Details_of_Ethical_Received__c,
                   Organizational_Area_s_for_Funding_Inves__c, Organizational_Area_s_for_Funding_Inves1__c
            FROM IndividualApplication
            WHERE Id = :applicationId
            WITH SYSTEM_MODE
            LIMIT 1
        ];

        String q24v1 = (!appRows.isEmpty() && String.isNotBlank(appRows[0].Q24_VERIFIED__c))
            ? appRows[0].Q24_VERIFIED__c
            : 'N/A';

        Set<Id> linkedEntityIds = new Set<Id>{ applicationId };

        for (Outcomes_Data__c o : [
            SELECT Id, Job_Verification_3rd_Party_CFY__c, X3rd_Party_Placement_Verification_FY_1__c, Job_Verification_3rd_Party_FY1__c
            FROM Outcomes_Data__c
            WHERE Proposal__c = :applicationId
            WITH SYSTEM_MODE
            LIMIT 1
        ]) {
            linkedEntityIds.add(o.Id);
            if (q24v1 == 'N/A') {
                if (String.isNotBlank(o.Job_Verification_3rd_Party_CFY__c)) {
                    q24v1 = o.Job_Verification_3rd_Party_CFY__c;
                } else if (String.isNotBlank(o.Job_Verification_3rd_Party_FY1__c)) {
                    q24v1 = o.Job_Verification_3rd_Party_FY1__c;
                } else if (String.isNotBlank(o.X3rd_Party_Placement_Verification_FY_1__c)) {
                    q24v1 = o.X3rd_Party_Placement_Verification_FY_1__c;
                }
            }
        }

        for (Historical_Data__c h : [
            SELECT Id FROM Historical_Data__c WHERE Proposal__c = :applicationId WITH SYSTEM_MODE LIMIT 1
        ]) { linkedEntityIds.add(h.Id); }

        for (Current_fiscal_year_data__c f : [
            SELECT Id FROM Current_fiscal_year_data__c WHERE Proposal__c = :applicationId WITH SYSTEM_MODE LIMIT 1
        ]) { linkedEntityIds.add(f.Id); }

        for (WCF_Business_Sector__c bs : [
            SELECT Id FROM WCF_Business_Sector__c WHERE Proposal__c = :applicationId WITH SYSTEM_MODE
        ]) { linkedEntityIds.add(bs.Id); }

        for (WCF_Skilling_Domain__c sd : [
            SELECT Id FROM WCF_Skilling_Domain__c WHERE Proposal__c = :applicationId WITH SYSTEM_MODE
        ]) { linkedEntityIds.add(sd.Id); }

        List<ContentDocumentLink> allFiles = [
            SELECT
                ContentDocumentId,
                LinkedEntityId,
                ContentDocument.Title,
                ContentDocument.FileExtension,
                ContentDocument.ContentSize,
                ContentDocument.Description,
                ContentDocument.LatestPublishedVersionId,
                ContentDocument.LatestPublishedVersion.Title,
                ContentDocument.LatestPublishedVersion.FileExtension,
                ContentDocument.LatestPublishedVersion.Description
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN :linkedEntityIds
            WITH SYSTEM_MODE
            ORDER BY ContentDocument.CreatedDate DESC
        ];

        Map<String, List<ContentDocumentLink>> filesByKey = new Map<String, List<ContentDocumentLink>>{
            'Q24' => new List<ContentDocumentLink>(),
            'Q28' => new List<ContentDocumentLink>(),
            'ADDENDUM' => new List<ContentDocumentLink>()
        };
        List<ContentDocumentLink> unmatched = new List<ContentDocumentLink>();

        for (ContentDocumentLink cdl : allFiles) {
            String fileDesc = cdl.ContentDocument.LatestPublishedVersion != null && String.isNotBlank(cdl.ContentDocument.LatestPublishedVersion.Description)
                ? cdl.ContentDocument.LatestPublishedVersion.Description
                : cdl.ContentDocument.Description;
            String upper = String.isNotBlank(fileDesc) ? fileDesc.trim().toUpperCase() : '';

            if (upper == 'Q24' || upper.endsWith('_LV') || upper == 'LIV_VERIF' || upper.endsWith('_PV') || upper.endsWith('_JV') || upper == 'Q15' || upper == 'Q17' || upper == 'Q14' || upper == 'P4_FY1_PV' || upper == 'P5_FY1_JV') {
                filesByKey.get('Q24').add(cdl);
            } else if (upper == 'Q28' || upper == 'Q26' || upper == 'SUPPORTING' || upper == 'SUPPORT') {
                filesByKey.get('Q28').add(cdl);
            } else if (upper.startsWith('RFI_') || upper == 'ADDENDUM' || upper == 'Q21') {
                filesByKey.get('ADDENDUM').add(cdl);
            } else {
                unmatched.add(cdl);
            }
        }

        // Q24: Independent Verification of Outcomes (Always evaluated)
        result.addAll(buildWrappers('Q24', q24v1, filesByKey.get('Q24')));

        // Q28: Supporting Materials
        for (ContentDocumentLink cdl : filesByKey.get('Q28')) {
            result.add(buildSingleWrapper('Q28', 'N/A', cdl));
        }

        // ADDENDUM: Reviewer Addendum files
        for (ContentDocumentLink cdl : filesByKey.get('ADDENDUM')) {
            result.add(buildSingleWrapper('ADDENDUM', 'N/A', cdl));
        }

        // UNMATCHED: any other document uploaded
        for (ContentDocumentLink cdl : unmatched) {
            result.add(buildSingleWrapper('OTHER', 'N/A', cdl));
        }

        return result;
    }

    private static AttachmentWrapper buildSingleWrapper(String key, String v1Value, ContentDocumentLink cdl) {
        AttachmentWrapper w = new AttachmentWrapper();
        w.questionKey       = key;
        w.v1Value           = String.isNotBlank(v1Value) ? v1Value : 'N/A';
        w.contentDocumentId = cdl.ContentDocumentId;
        w.contentVersionId  = cdl.ContentDocument.LatestPublishedVersionId;
        w.fileName          = (cdl.ContentDocument.LatestPublishedVersion != null && String.isNotBlank(cdl.ContentDocument.LatestPublishedVersion.Title))
                              ? cdl.ContentDocument.LatestPublishedVersion.Title
                              : cdl.ContentDocument.Title;
        w.fileExtension     = (cdl.ContentDocument.LatestPublishedVersion != null && String.isNotBlank(cdl.ContentDocument.LatestPublishedVersion.FileExtension))
                              ? cdl.ContentDocument.LatestPublishedVersion.FileExtension
                              : cdl.ContentDocument.FileExtension;
        w.fileSizeMB        = cdl.ContentDocument.ContentSize != null
                              ? (Decimal.valueOf(cdl.ContentDocument.ContentSize) / 1048576).setScale(2)
                              : 0;
        return w;
    }

    private static List<AttachmentWrapper> buildWrappers(String key, String v1Value, List<ContentDocumentLink> files) {
        List<AttachmentWrapper> wrappers = new List<AttachmentWrapper>();

        if (files.isEmpty()) {
            AttachmentWrapper empty = new AttachmentWrapper();
            empty.questionKey = key;
            empty.v1Value     = String.isNotBlank(v1Value) ? v1Value : 'N/A';
            wrappers.add(empty);
            return wrappers;
        }

        Boolean first = true;
        for (ContentDocumentLink cdl : files) {
            AttachmentWrapper w = buildSingleWrapper(key, first ? v1Value : 'N/A', cdl);
            wrappers.add(w);
            first = false;
        }
        return wrappers;
    }

    @AuraEnabled(cacheable=true)
    public static String getContentDownloadUrl(Id contentVersionId) {
        ContentVersion cv = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE Id = :contentVersionId
            LIMIT 1
        ];
        PageReference pr = new PageReference(
            '/sfc/servlet.shepherd/document/download/' + cv.ContentDocumentId
        );
        return pr.getUrl();
    }

    @AuraEnabled(cacheable=false)
    public static Map<String, String> getFileBase64(Id contentVersionId) {
        try {
            ContentVersion cv = [
                SELECT Id, VersionData, FileType, Title, FileExtension, ContentDocumentId
                FROM ContentVersion
                WHERE Id = :contentVersionId OR ContentDocumentId = :contentVersionId
                WITH SYSTEM_MODE
                ORDER BY IsLatest DESC, CreatedDate DESC
                LIMIT 1
            ];
            Map<String, String> result = new Map<String, String>();
            result.put('base64', EncodingUtil.base64Encode(cv.VersionData));
            result.put('fileType', cv.FileExtension != null ? cv.FileExtension.toLowerCase() : (cv.FileType != null ? cv.FileType.toLowerCase() : 'pdf'));
            result.put('title', cv.Title);
            result.put('versionId', cv.Id);
            result.put('documentId', cv.ContentDocumentId);
            return result;
        } catch (Exception e) {
            throw new AuraHandledException('File access error: ' + e.getMessage());
        }
    }

    public class ApplicationWrapper {
        @AuraEnabled public IndividualApplication application;
        @AuraEnabled public Boolean isValidated;
        @AuraEnabled public Boolean hasDraft;   
        @AuraEnabled public Boolean isResubmission;
        @AuraEnabled public Boolean isAwaitingApplicant;
        @AuraEnabled public Boolean isReturnedByReviewer; 
        @AuraEnabled public String reviewStatus;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. FORM PREVIEW
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static IndividualApplication getApplicationDetail(Id recordId) {
        return [
            SELECT
                Id, Name, AccountId, Account.Name, Status, AppliedDate,
                Funding_Year__c, Category, ApplicationType, Review_Status__c,
                COE_Name__c, PI_Name__c, Project_Title__c, Primary_Focus_Area__c,
                Sub_Focus_Area__c, Project_Duration__c, Keywords__c, Average_score__c,
                Coe_Email_Address__c, PI_Comments__c, COE_Comments__c,
                WIN_Approval_Comments__c, WIN_Approved_Comments__c,
                Resubmitted_Approved_for_Funding__c, Funding_Approval_Resubmission__c,
                Approved_by_COE_on__c, Rejected_by_COE_on__c,
                Asked_for_Resubmission_by_COE_on__c, Due_Date_for_Resubmission__c,
                Application_Asked_for_Rsubmission__c, Application_Resubmitted_to_COE__c,
                Asked_for_Resubmission_by_WIN_Admin__c, Application_Resubmitted_to_WIN_Admin__c,
                Due_Date_for_Resubmission_WIN__c, COE_Location__c,
                Primary_Focus_Area_Other__c, Sub_Focus_Area_Other__c,
                Total_Project_Budget_INR__c, Target_Completion_Month_c__c,
                PI_Institution_Organization_Name__c, Requested_Support_Documents_Portal_c__c,
                Skilling_Approach__c, PI_Designation__c, PI_Institution__c, PI_Phone__c,
                PI_Email__c, Co_Principal_Investigator_Co_PI__c, CO_PI_Designation__c,
                CO_PI_Institution__c, CO_PI_Phone__c, CO_PI_Email__c, Project_Summary__c,
                Objectives_of_the_Project__c, Project_Approach_and_Work_Plan__c,
                Key_Problem_Being_Solved__c, Proposed_Solution__c,
                Current_status_of_the_Project_Work_und__c,
                Current_Technology_Readiness_Level_TRL__c,
                Expected_TRL_at_the_end_of_the_Project__c, Novelty_of_the_Project__c,
                Competitive_Advantage__c, Details_of_IPR_Filed_Granted__c,
                Details_of_Ethical_Received__c, Full_Proposal_Citations__c,
                Target_Market_Industry_Application__c, Customer_and_Beneficiaries__c,
                Business_Model_for_Commercialization__c, Main_Risks_and_Barriers__c,
                Relevant_Partnerships__c, Potential_for_Startup_Formation__c,
                Incubator_Association_Details__c, Total_Project_Budget_in_USD__c,
                Assigned_reviewers__c, Describe_Objective_Relevance_of_Project__c,
                Work_undertaken_supporting_current_TRL__c,
                Strategy_for_transfer_of_technology__c,
                Strategy_for_raising_funds_from_Investor__c,
                Additional_Funding_Plans__c, WIN_Support__c, Project_Start_Date__c,
                Project_End_Date__c, Proposed_Outcomes_Deliverables_under_t__c,
                Envisioned_Project_Impact__c, Future_Plan_for_next_3_5_on_comple__c,
                COE_Approver__c, COE_Approval_Comments__c, PI_User_Email__c,
                Funder_1_Name__c, Funder_1_Amount__c, Funder_1_Period_Start__c,
                Funder_1_Period_End__c, Funder_1_Type__c,
                Funder_2_Name__c, Funder_2_Amount__c, Funder_2_Period_Start__c,
                Funder_2_Period_End__c, Funder_2_Type__c,
                Funder_3_Name__c, Funder_3_Amount__c, Funder_3_Period_Start__c,
                Reference_1_Name__c, Reference_1_Role__c, Reference_1_Email__c,
                Reference_2_Name__c, Reference_2_Role__c, Reference_2_Email__c,
                Funder_3_Period_End__c, Funder_3_Type__c, Due_Date__c
            FROM IndividualApplication
            WHERE Id = :recordId
            WITH SYSTEM_MODE
            LIMIT 1
        ];
    }

    public class ReviewWrapper {
        @AuraEnabled public ApplicationReview review;
        @AuraEnabled public String attestingUserName;
        @AuraEnabled public String attestingUserTitle;
        @AuraEnabled public String submissionDate;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String dueDate;
        @AuraEnabled public String appStatus;
        @AuraEnabled public String mandateTrack;
        @AuraEnabled public String orgArea;
        @AuraEnabled public String geography;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. CHECK EXISTING REVIEW
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled
    public static ReviewWrapper getExistingReview(Id applicationId) {
        ReviewWrapper wrapper = new ReviewWrapper();
        
        List<IndividualApplication> apps = [
            SELECT Id, Name, Due_Date__c, Status, Primary_Focus_Area__c,
                   Sub_Focus_Area__c, Organizational_Area_s_for_Funding_Inves__c, Organizational_Area_s_for_Funding_Inves1__c,
                   Attesting_User_Name__c, Attesting_User_Title__c, 
                   Initial_Submission_Date__c
            FROM IndividualApplication 
            WHERE Id = :applicationId 
            WITH SYSTEM_MODE
            LIMIT 1
        ];

        if (!apps.isEmpty()) {
            IndividualApplication app = apps[0];
            wrapper.attestingUserName  = app.Attesting_User_Name__c;
            wrapper.attestingUserTitle = app.Attesting_User_Title__c;
            wrapper.submissionDate     = app.Initial_Submission_Date__c != null
                                         ? String.valueOf(app.Initial_Submission_Date__c) 
                                         : null;
            wrapper.applicationName = app.Name;
            wrapper.dueDate         = app.Due_Date__c != null ? String.valueOf(app.Due_Date__c) : null;
            wrapper.appStatus       = app.Status;
            wrapper.mandateTrack    = app.Sub_Focus_Area__c;
            wrapper.geography       = app.Primary_Focus_Area__c;
            wrapper.orgArea         = String.isNotBlank(app.Organizational_Area_s_for_Funding_Inves1__c)
                                         ? app.Organizational_Area_s_for_Funding_Inves1__c
                                         : app.Organizational_Area_s_for_Funding_Inves__c;
        }

        Id validatorRecordTypeId = getWCFValidatorRecordTypeId();

        List<ApplicationReview> reviews = [
            SELECT Id, Status, LastModifiedDate,
                   Mandatory_fields__c,
                   Verification_reports__c,
                   Attestation__c,
                   Substantive_content_gap__c,
                   Geography_Within_WCF_Operating_Cluster__c,
                   Mandate_fitFits_Job_CreationFulfilment__c,
                   Blocking_concern_Blocking_Identified__c,
                   Decision_Final_Decision_from_Sec_1_2__c,
                   Decision_rationale__c,
                   Flag_rationale_Flagging_Criteria__c,
                   Other_describe_the_concern__c,
                   Field_level_checklist_for_the_Partner__c,
                   Source_Channel_Source_of_Application__c,
                   Budget_Range_Annual_Budget_Range__c,
                   Notes_for_Reviewers__c,
                   Question_Number__c,
                   Question_Number_1__c, Question_Number_2__c,
                   Question_Number_3__c, Question_Number_4__c,
                   Question_Number_5__c, Question_Number_6__c,
                   Question_Number_7__c, Question_Number_8__c,
                   Question_Number_9__c, Question_Number_10__c,
                   Question_Number_11__c, Question_Number_12__c,
                   Question_Number_13__c, Question_Number_14__c,
                   Question_Number_15__c, Question_Number_16__c,
                   Question_Number_17__c, Question_Number_18__c,
                   Question_Number_19__c, Question_Number_20__c, Question_Number_21__c,
                   Question_Number_22__c, Question_Number_23__c, Question_Number_24__c,
                   Question_Number_25__c, Question_Number_26__c, Question_Number_27__c,
                   Question_Number_28__c
            FROM ApplicationReview
            WHERE ApplicationId = :applicationId
            AND RecordTypeId = :getWCFValidatorRecordTypeId()
            WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];
        
        wrapper.review = reviews.isEmpty() ? null : reviews[0];
        return wrapper;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. SAVE / SEAL
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled
    public static String saveValidatorRecord(String reviewJson) {
        try {
            Map<String, Object> data = (Map<String, Object>) JSON.deserializeUntyped(reviewJson);

            Id appId      = (Id)     data.get('applicationId');
            String status = (String) data.get('status');
            Id existingId = null;

            Id validatorRtId = getWCFValidatorRecordTypeId();
            if (data.containsKey('Id') && data.get('Id') != null) {
                Id passedId = (Id) data.get('Id');
                List<ApplicationReview> verify = [
                    SELECT Id FROM ApplicationReview
                    WHERE Id = :passedId AND ApplicationId = :appId
                    WITH SYSTEM_MODE
                    LIMIT 1
                ];
                if (!verify.isEmpty()) existingId = passedId;
            }

            if (existingId == null) {
                List<ApplicationReview> existing = [
                    SELECT Id FROM ApplicationReview
                    WHERE ApplicationId = :appId
                    AND RecordTypeId = :validatorRtId
                    WITH SYSTEM_MODE
                    ORDER BY LastModifiedDate DESC LIMIT 1
                ];
                if (!existing.isEmpty()) existingId = existing[0].Id;
            }

            ApplicationReview review = new ApplicationReview();
            if (existingId != null) review.Id = existingId;
            
            review.ApplicationId = appId;
            review.RecordTypeId  = validatorRtId;
            review.Status        = status;

            review.Mandatory_fields__c        = (String) data.get('s1_1_confirm');
            review.Verification_reports__c    = (String) data.get('s1_2_confirm');
            review.Attestation__c             = (String) data.get('s1_3_confirm');
            review.Substantive_content_gap__c = (String) data.get('s1_4_text');

            review.Geography_Within_WCF_Operating_Cluster__c = (String) data.get('s2_1');
            review.Mandate_fitFits_Job_CreationFulfilment__c  = (String) data.get('s2_2');
            review.Blocking_concern_Blocking_Identified__c    = (String) data.get('s2_3');

            String s2_3_text = (String) data.get('s2_3_text') != null ? (String) data.get('s2_3_text') : '';
            String s3_5       = (String) data.get('s3_5')      != null ? (String) data.get('s3_5')      : '';
            review.Field_level_checklist_for_the_Partner__c = s3_5 + '|||BLOCKING|||' + s2_3_text;

            String decision = (String) data.get('s3_1');
            review.Decision_Final_Decision_from_Sec_1_2__c  = decision;
            review.Decision_rationale__c                    = (String) data.get('s3_2');
            review.Flag_rationale_Flagging_Criteria__c      = (String) data.get('s3_3');
            review.Other_describe_the_concern__c            = (String) data.get('s3_4');

            review.Source_Channel_Source_of_Application__c  = (String) data.get('s4_1');
            review.Budget_Range_Annual_Budget_Range__c       = (String) data.get('s4_2');
            review.Notes_for_Reviewers__c                   = (String) data.get('s5_1');

            String selectedQsRaw = data.get('selectedQuestions') != null
                ? (String) data.get('selectedQuestions') : '';

            List<String> selectedNums = new List<String>();
            Set<String> seenNums = new Set<String>();
            if (String.isNotBlank(selectedQsRaw)) {
                for (String s : selectedQsRaw.split(';')) {
                    String n = s == null ? '' : s.trim();
                    if (String.isNotBlank(n) && !seenNums.contains(n)) {
                        seenNums.add(n);
                        selectedNums.add(n);
                    }
                }
            }

            List<Integer> sortedNums = new List<Integer>();
            for (String n : selectedNums) {
                try { sortedNums.add(Integer.valueOf(n)); } catch (Exception e) { }
            }
            sortedNums.sort();

            review.Question_Number__c = sortedNums.isEmpty()
                ? null
                : String.valueOf(sortedNums[0]);

            String qTextsJson = data.get('questionTexts') != null
                ? (String) data.get('questionTexts') : '{}';
            Map<String, Object> qTexts = (Map<String, Object>) JSON.deserializeUntyped(qTextsJson);

            Map<String, Schema.SObjectField> arFields =
                Schema.SObjectType.ApplicationReview.fields.getMap();
            for (Integer i = 1; i <= 28; i++) {
                String fName = 'Question_Number_' + i + '__c';
                if (arFields.containsKey(fName)) review.put(fName, null);
            }

            for (String num : selectedNums) {
                if (!qTexts.containsKey(num)) continue;
                String txt = (String) qTexts.get(num);
                if (String.isBlank(txt)) continue;
                String fName = 'Question_Number_' + num + '__c';
                if (arFields.containsKey(fName)) review.put(fName, txt);
            }

            upsert as system review;

            if (status == 'Validated' && appId != null) {
                IndividualApplication app = new IndividualApplication(Id = appId);

                if (decision == 'Pass' || decision == 'Flag') {
                    app.Status = 'Under Review';
                } else if (decision == 'Return') {
                    app.Status = 'Revision Requested';
                }

                update as system app;
            } else if (status == 'Draft' && appId != null) {
                IndividualApplication currentApp = [
                    SELECT Status FROM IndividualApplication WHERE Id = :appId WITH SYSTEM_MODE LIMIT 1
                ];
                Set<String> entryStatuses = new Set<String>{
                    'Submitted', 'Application Resubmitted'
                };
                if (entryStatuses.contains(currentApp.Status)) {
                    update as system new IndividualApplication(
                        Id = appId, Status = 'Under Validation'
                    );
                }
            }

            return review.Id;

        } catch (DmlException dml) {
            String msg = '';
            for (Integer i = 0; i < dml.getNumDml(); i++) {
                msg += dml.getDmlMessage(i) + ' | Fields: ' 
                     + String.join(dml.getDmlFieldNames(i), ', ') + '\n';
            }
            throw new AuraHandledException('DML error: ' + msg);
        } catch (AuraHandledException ahe) {
            throw ahe;
        } catch (Exception e) {
            throw new AuraHandledException('Save failed: ' + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. GET OBJECT FIELDS DYNAMICALLY
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static List<FieldInfo> getApplicationFields() {
        List<FieldInfo> fields = new List<FieldInfo>();
        Schema.DescribeSObjectResult objDesc =
            Schema.getGlobalDescribe().get('IndividualApplication').getDescribe();
        Map<String, Schema.SObjectField> fieldMap = objDesc.fields.getMap();

        for (String apiName : fieldMap.keySet()) {
            Schema.DescribeFieldResult f = fieldMap.get(apiName).getDescribe();
            if (!f.isAccessible()) continue;
            FieldInfo fi = new FieldInfo();
            fi.apiName   = apiName;
            fi.label     = f.getLabel();
            fi.fieldType = String.valueOf(f.getType());
            fi.section   = deriveSection(apiName);
            fields.add(fi);
        }
        return fields;
    }

    private static String deriveSection(String apiName) {
        String n = apiName.toLowerCase();
        if (n.startsWith('pi_') || n.startsWith('co_pi') || n.contains('coe_name')
            || n.contains('coe_email') || n.contains('coe_location'))
            return 'PI & Co-PI Details';
        if (n.contains('project_') || n.contains('objective') || n.contains('summary')
            || n.contains('approach') || n.contains('solution') || n.contains('novelty')
            || n.contains('trl') || n.contains('skilling') || n.contains('customer')
            || n.contains('competitive') || n.contains('market') || n.contains('risk')
            || n.contains('startup') || n.contains('incubator') || n.contains('ipr')
            || n.contains('ethical') || n.contains('citation') || n.contains('partnership'))
            return 'Project Details';
        if (n.contains('funder') || n.contains('budget') || n.contains('funding')
            || n.contains('start_date') || n.contains('end_date') || n.contains('win_support'))
            return 'Funding & Resources';
        if (n.contains('deliverable') || n.contains('impact') || n.contains('future_plan')
            || n.contains('proposed_outcomes') || n.contains('envisioned'))
            return 'Expected Outcomes';
        if (n.contains('approver') || n.contains('approval') || n.contains('approved')
            || n.contains('rejected') || n.contains('resubmit') || n.contains('coe_approval'))
            return 'Approval Section';
        return 'General Information';
    }

    public class FieldInfo {
        @AuraEnabled public String apiName;
        @AuraEnabled public String label;
        @AuraEnabled public String fieldType;
        @AuraEnabled public String section;
    }

    private static Id getWCFValidatorRecordTypeId() {
        return RecordTypeHelper.applicationReviewValidatorId();
    }

    @AuraEnabled(cacheable=true)
    public static IndividualApplication getWCFFormPreviewData(Id applicationId) {
        return [
            SELECT
                Id, Name, Status, AppliedDate, Funding_Year__c, RecordType.Name,
                Organizational_Area_s_for_Funding_Inves__c, Organization_Name__c,
                Headquarters_City_and_Country__c, Primary_Service_Regions__c,
                Leader_Name__c, Leader_Title__c, Leader_Tenure__c, Submitter_Name__c, Job_Title__c,
                Work_Email_ID__c, Phone__c, Legal_Structure__c,
                Current_fiscal_year_s_end_date__c,
                Funder_1_Name__c, Funder_1_Amount__c, Funder_1_Period_Start__c,
                Funder_1_Period_End__c, Funder_1_Type__c,
                Funder_2_Name__c, Funder_2_Amount__c, Funder_2_Period_Start__c,
                Funder_2_Period_End__c, Funder_2_Type__c,
                Funder_3_Name__c, Funder_3_Amount__c, Funder_3_Period_Start__c,
                Funder_3_Period_End__c, Funder_3_Type__c,
                Skilling_Approach__c, Job_Creation_Approach__c, Business_Sectors_JSON__c,
                Organizational_Sustainability__c, Use_of_Additional_Funding__c,
                Operational_Synergies_with_WOF__c, Operational_Synergies_with_WOF_JC__c,
                Operational_Synergies_with_WOF_Both__c
            FROM IndividualApplication
            WHERE Id = :applicationId
            WITH SYSTEM_MODE
            LIMIT 1
        ];
    }

    public class WCFPreviewWrapper {
        @AuraEnabled public IndividualApplication application;
        @AuraEnabled public Historical_Data__c historical;
        @AuraEnabled public Current_fiscal_year_data__c fiscal;
        @AuraEnabled public Outcomes_Data__c outcome;
        @AuraEnabled public List<WCF_Skilling_Domain__c> skillingDomains;
        @AuraEnabled public List<WCF_Business_Sector__c> businessSectors;
        @AuraEnabled public Map<String, Object> applicationData;
        @AuraEnabled public Map<String, Object> historicalData;
        @AuraEnabled public Map<String, Object> fiscalData;
        @AuraEnabled public Map<String, Object> outcomeData;
    }

    @AuraEnabled
    public static WCFPreviewWrapper getWCFFullPreviewData(Id applicationId) {
        WCFPreviewWrapper wrapper = new WCFPreviewWrapper();

        Set<String> fieldNames = new Set<String>{
            'Id', 'Name', 'Status', 'AppliedDate', 'Funding_Year__c', 'RecordType.Name',
            'Organizational_Area_s_for_Funding_Inves__c', 'Organization_Name__c',
            'Headquarters_City_and_Country__c', 'Primary_Service_Regions__c',
            'Leader_Name__c', 'Leader_Title__c', 'Leader_Tenure__c', 'Submitter_Name__c', 'Job_Title__c',
            'WG_Phone_Country_Code__c', 'Phone_Country_Code__c',
            'Work_Email_ID__c', 'Phone__c', 'Legal_Structure__c',
            'Legal_Type__c', 'Legal_Type_Other__c',
            'Registration_Jurisdiction__c', 'Registration_Jurisdiction_Other__c',
            'Incorporation_Date__c', 'Has_501c3_Status__c', 'Has_Equivalency_Determination__c',
            'Is_FCRA_Registered__c', 'Willing_to_Pursue_ED__c',
            'Fiscal_Day__c', 'Fiscal_Month__c', 'Current_fiscal_year_s_end_date__c',
            'Funder_1_Name__c', 'Funder_1_Amount__c', 'Funder_1_Period_Start__c', 'Funder_1_Period_End__c', 'Funder_1_Type__c',
            'Funder_2_Name__c', 'Funder_2_Amount__c', 'Funder_2_Period_Start__c', 'Funder_2_Period_End__c', 'Funder_2_Type__c',
            'Funder_3_Name__c', 'Funder_3_Amount__c', 'Funder_3_Period_Start__c', 'Funder_3_Period_End__c', 'Funder_3_Type__c',
            'Reference_1_Name__c', 'Reference_1_Role__c', 'Reference_1_Email__c',
            'Reference_2_Name__c', 'Reference_2_Role__c', 'Reference_2_Email__c',
            'Skilling_Approach__c', 'Job_Creation_Approach__c', 'Livelihood_Approach__c', 'Business_Sectors_JSON__c',
            'Q24_VERIFIED__c', 'Q24_REPORT_URL__c', 'Details_of_Ethical_Received__c',
            'Organizational_Sustainability__c',
            'Use_of_Additional_Funding__c', 'Use_of_Additional_Funding_JC__c',
            'GenieAI_Interest_Level__c',
            'Operational_Synergies_with_WOF__c', 'Operational_Synergies_with_WOF_JC__c', 'Operational_Synergies_with_WOF_Both__c',
            'Attesting_User_Name__c', 'Attesting_User_Title__c', 'Initial_Submission_Date__c', 'Attestation_Date__c',
            'CreatedDate', 'LastModifiedDate', 'CreatedBy.Name', 'CreatedBy.Title'
        };

        Map<String, Schema.SObjectField> appFieldMap = Schema.SObjectType.IndividualApplication.fields.getMap();
        try {
            for (RFI_Question__mdt q : [SELECT Field_API_Name__c, Target_Object__c FROM RFI_Question__mdt]) {
                if (String.isNotBlank(q.Field_API_Name__c) && (String.isBlank(q.Target_Object__c) || q.Target_Object__c.equalsIgnoreCase('IndividualApplication'))) {
                    String cleanFld = q.Field_API_Name__c.trim();
                    if (appFieldMap.containsKey(cleanFld.toLowerCase())) {
                        fieldNames.add(appFieldMap.get(cleanFld.toLowerCase()).getDescribe().getName());
                    }
                }
            }
        } catch (Exception qEx) {
            System.debug(LoggingLevel.WARN, 'Could not query RFI_Question__mdt in getWCFFullPreviewData: ' + qEx.getMessage());
        }

        String soql = 'SELECT ' + String.join(new List<String>(fieldNames), ', ') + ' FROM IndividualApplication WHERE Id = :applicationId WITH SYSTEM_MODE LIMIT 1';
        wrapper.application = Database.query(soql);
        if (wrapper.application != null) {
            wrapper.applicationData = wrapper.application.getPopulatedFieldsAsMap();
        }

        List<Historical_Data__c> hists = [
            SELECT Id, CY1_Balance_Start_CFY_1__c, CY2_Balance_Start_CFY_2__c,
                   CY3_Balance_Start_CFY_3__c, CY1_Revenue__c, CY2_Revenue__c, CY3_Revenue__c,
                   CY1_Capital_Expenditure__c, CY2_Capital_Expenditure__c, CY3_Capital_Expenditure__c,
                   CY1_Operating_Expenditure__c, CY2_Operating_Expenditure__c, CY3_Operating_Expenditure__c,
                   CY1_Balance_End__c, CY2_Balance_End__c, CY3_Balance_End__c
            FROM Historical_Data__c WHERE Proposal__c = :applicationId WITH SYSTEM_MODE LIMIT 1
        ];
        wrapper.historical = hists.isEmpty() ? null : hists[0];
        if (wrapper.historical != null) {
            wrapper.historicalData = wrapper.historical.getPopulatedFieldsAsMap();
        }

        List<Current_fiscal_year_data__c> fiscals = [
            SELECT Id, Revenue_Budget__c, Revenue_Projection__c, Revenue_Variance__c,
                   Capital_Expenditure_Budget__c, Capital_Expenditure_Projection__c, Capital_Expenditure_Variance__c,
                   Operating_Expenditure_Budget__c, Operating_Expenditure_Projection__c, Operating_Expenditure_Variance__c,
                   Net_Budget__c, Net_Projection__c, Net_Variance__c,
                   Revenue_Explanation__c
            FROM Current_fiscal_year_data__c WHERE Proposal__c = :applicationId WITH SYSTEM_MODE LIMIT 1
        ];
        wrapper.fiscal = fiscals.isEmpty() ? null : fiscals[0];
        if (wrapper.fiscal != null) {
            wrapper.fiscalData = wrapper.fiscal.getPopulatedFieldsAsMap();
        }

        List<Outcomes_Data__c> outcomes = [
            SELECT Id,
                   Projected_Learner_Enrollments_CFY__c, Projected_Learner_Enrollments_FY_1__c,
                   Projected_Learner_Enrollments_FY_2__c, Projected_Learner_Enrollments_FY_3__c,
                   Projected_Learner_Placements_CFY__c, Projected_Learner_Placements_FY_1__c,
                   Projected_Learner_Placements_FY_2__c, Projected_Learner_Placements_FY_3__c,
                   Projected_Learner_placement_CFY__c, Projected_Learner_placement_FY_1__c,
                   Projected_Learner_placement_FY_2__c, Projected_Learner_placement_FY_3__c,
                   Avg_Cost_per_Placement_CFY__c, Avg_Cost_per_Placement_FY_1__c,
                   Avg_Cost_per_Placement_FY_2__c, Avg_Cost_per_Placement_FY_3__c,
                   Projected_New_Businesses_CFY__c, Projected_New_Businesses_FY_1__c,
                   Projected_New_Businesses_FY_2__c, Projected_New_Businesses_FY_3__c,
                   Projected_Jobs_from_New_Businesses_CFY__c, Projected_Jobs_from_New_Businesses_FY1__c,
                   Projected_Jobs_from_New_Businesses_FY2__c, Projected_Jobs_from_New_Businesses_FY3__c,
                   Growing_Businesses_Supported_CFY__c, Growing_Businesses_Supported_FY_1__c,
                   Growing_Businesses_Supported_FY_2__c, Growing_Businesses_Supported_FY_3__c,
                   Jobs_from_Growing_Businesses_CFY__c, Jobs_from_Growing_Businesses_FY_1__c,
                   Jobs_from_Growing_Businesses_FY_2__c, Jobs_from_Growing_Businesses_FY_3__c,
                   Avg_Cost_per_Job_CFY__c, Avg_Cost_per_Job_FY_1__c,
                   Avg_Cost_per_Job_FY_2__c, Avg_Cost_per_Job_FY_3__c,
                   X3rd_Party_Placement_Verification_FY_1__c, X3rd_Party_Verification_Description_CFY__c, X3rd_Party_Verification_Description_FY_1__c, X3rd_Party_Verification_Description_FY_2__c, X3rd_Party_Verification_Description_FY_3__c,
                   X3rd_party_verification_details_CFY__c, X3rd_party_verification_details_FY1__c, X3rd_party_verification_details_FY2__c, X3rd_party_verification_details_FY3__c,
                   Job_Verification_3rd_Party_CFY__c, Job_Verification_3rd_Party_FY1__c, Manual_Avg_Cost_per_Placement_CFY__c,
                   Manual_Avg_Cost_per_Placement_FY_1__c,
                   Manual_Avg_Cost_per_Placement_FY_2__c,
                   Manual_Avg_Cost_per_Placement_FY_3__c,
                   Manual_Avg_Cost_per_Job_CFY__c,
                   Manual_Avg_Cost_per_Job_FY_1__c,
                   Manual_Avg_Cost_per_Job_FY_2__c,
                   Manual_Avg_Cost_per_Job_FY_3__c,
                   LIV_SERVED_FY3__c, LIV_SERVED_FY2__c, LIV_SERVED_FY1__c, LIV_SERVED_PROJ__c,
                   LIV_ENROLL_FY3__c, LIV_ENROLL_FY2__c, LIV_ENROLL_FY1__c, LIV_ENROLL_PROJ__c,
                   LIV_OUTCOME_FY3__c, LIV_OUTCOME_FY2__c, LIV_OUTCOME_FY1__c, LIV_OUTCOME_PROJ__c,
                   LIV_COST_FY3__c, LIV_COST_FY2__c, LIV_COST_FY1__c, LIV_COST_PROJ__c
            FROM Outcomes_Data__c WHERE Proposal__c = :applicationId WITH SYSTEM_MODE LIMIT 1
        ];
        wrapper.outcome = outcomes.isEmpty() ? null : outcomes[0];
        if (wrapper.outcome != null) {
            wrapper.outcomeData = wrapper.outcome.getPopulatedFieldsAsMap();
        }

        try {
            wrapper.skillingDomains = [
                SELECT Id, Domain_Programme_Name__c, Hours_of_Training__c,
                       Duration_Months__c, Programme_Start_Date__c, Yearly_Enrolment__c
                FROM WCF_Skilling_Domain__c
                WHERE Proposal__c = :applicationId
                WITH SYSTEM_MODE
                ORDER BY Programme_Start_Date__c ASC
            ];
        } catch (Exception e) {
            wrapper.skillingDomains = new List<WCF_Skilling_Domain__c>();
            System.debug('skillingDomains query failed: ' + e.getMessage());
        }

        try {
            wrapper.businessSectors = [
                SELECT Id, Sector_c__c, Business_Sector_Other__c, Support_Begin_Date__c,
                       Support_Types__c, Support_Type_Other__c, Yearly_Enrolment__c
                FROM WCF_Business_Sector__c
                WHERE Proposal__c = :applicationId
                WITH SYSTEM_MODE
                ORDER BY Support_Begin_Date__c ASC
            ];
        } catch (Exception e) {
            wrapper.businessSectors = new List<WCF_Business_Sector__c>();
            System.debug('businessSectors query failed: ' + e.getMessage());
        }

        return wrapper;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getActionCounts() {
        Set<Id> allowedTypeIds = RecordTypeHelper.individualApplicationAllowedIds();

        List<IndividualApplication> apps = [
            SELECT Id, Status
            FROM IndividualApplication
            WHERE RecordTypeId IN :allowedTypeIds
            AND Status IN (
                'Submitted',
                'Revision Requested',
                'Under Review',
                'Under External Review',
                'Application Resubmitted',
                'Reviewer Rejected',
                'Under Validation',
                'Validated',
                'Returned to Validator',
                'Awaiting Applicant'
            )
            WITH SYSTEM_MODE
            LIMIT 500
        ];

        Id validatorRecordTypeId = getWCFValidatorRecordTypeId();
        Set<Id> appIds = new Map<Id, IndividualApplication>(apps).keySet();

        Set<Id> sealedAppIds = new Set<Id>();
        for (ApplicationReview ar : [
            SELECT ApplicationId FROM ApplicationReview
            WHERE ApplicationId IN :appIds
            AND Status IN ('Validated', 'Flagged') 
            AND RecordTypeId = :validatorRecordTypeId
            WITH SYSTEM_MODE
        ]) {
            sealedAppIds.add(ar.ApplicationId);
        }

        Set<Id> draftAppIds = new Set<Id>();
        for (ApplicationReview ar : [
            SELECT ApplicationId FROM ApplicationReview
            WHERE ApplicationId IN :appIds
            AND Status = 'Draft'
            AND RecordTypeId = :validatorRecordTypeId
            WITH SYSTEM_MODE
        ]) {
            draftAppIds.add(ar.ApplicationId);
        }

        Integer validatedCount          = 0;
        Integer resumeCount             = 0;
        Integer validateCount           = 0;
        Integer resubmitCount           = 0;
        Integer awaitingApplicantCount  = 0;
        Integer returnedByReviewerCount = 0;

        for (IndividualApplication app : apps) {
            Boolean isUnderValidation   = (app.Status == 'Under Validation');
            Boolean isAwaitingApplicant = (app.Status == 'Revision Requested');

            if (app.Status == 'Returned to Validator') {
                returnedByReviewerCount++;
            } else if (app.Status == 'Application Resubmitted') {
                resubmitCount++;
            } else if (isAwaitingApplicant) {
                awaitingApplicantCount++;
            } else if (sealedAppIds.contains(app.Id)) {
                validatedCount++;
            } else if (draftAppIds.contains(app.Id) || isUnderValidation) {
                resumeCount++;
            } else {
                validateCount++;
            }
        }

        return new Map<String, Integer>{
            'validated'          => validatedCount,
            'resume'             => resumeCount,
            'validate'           => validateCount,
            'resubmit'           => resubmitCount,
            'awaitingApplicant'  => awaitingApplicantCount,
            'returnedByReviewer' => returnedByReviewerCount
        };
    }

    @AuraEnabled(cacheable=true)
    public static List<ApplicationWrapper> getValidatorPreview(Integer maxRows) {
        Set<Id> allowedTypeIds = RecordTypeHelper.individualApplicationAllowedIds();
        Id validatorRtId = getWCFValidatorRecordTypeId();

        List<IndividualApplication> apps = [
            SELECT Id, Name, Account.Name, Status, AppliedDate, RecordType.Name, Due_Date__c
            FROM IndividualApplication
            WHERE RecordTypeId IN :allowedTypeIds
            AND Status IN (
                'Submitted',
                'Revision Requested',
                'Under Review',
                'Under External Review',
                'Application Resubmitted',
                'Reviewer Rejected'
            ) WITH SYSTEM_MODE
            ORDER BY Due_Date__c ASC NULLS LAST, AppliedDate ASC NULLS LAST 
            LIMIT 500
        ];

        Set<Id> appIds = new Map<Id, IndividualApplication>(apps).keySet();
        Set<Id> sealedIds   = new Set<Id>();
        Set<Id> draftIds    = new Set<Id>();
        Set<Id> resubmitIds = new Set<Id>();

        for (ApplicationReview ar : [
            SELECT ApplicationId, Status
            FROM ApplicationReview
            WHERE ApplicationId IN :appIds
            AND RecordTypeId = :validatorRtId
            AND Status IN ('Validated', 'Flagged', 'Draft')
            WITH SYSTEM_MODE
        ]) {
           if (ar.Status == 'Validated' || ar.Status == 'Flagged')  sealedIds.add(ar.ApplicationId);
           else draftIds.add(ar.ApplicationId);
        }

        for (IndividualApplication app : apps) {
            if (app.Status == 'Application Resubmitted') {
                resubmitIds.add(app.Id);
            }
        }

        List<ApplicationWrapper> result = new List<ApplicationWrapper>();
        for (IndividualApplication app : apps) {
            Boolean isResubmission = resubmitIds.contains(app.Id);

            if (sealedIds.contains(app.Id) && !isResubmission) continue;

            Boolean isAwaitingApplicant = (app.Status == 'Revision Requested');

            ApplicationWrapper w  = new ApplicationWrapper();
            w.application         = app;
            w.isValidated         = false;
            w.hasDraft            = draftIds.contains(app.Id) && !isResubmission && !isAwaitingApplicant;
            w.isResubmission      = isResubmission;
            w.isAwaitingApplicant = isAwaitingApplicant;
            result.add(w);

            if (result.size() >= maxRows) break;
        }
        return result;
    }

    public class SourceChannelWrapper {
        @AuraEnabled public Integer wsnWen     { get; set; }
        @AuraEnabled public Integer wcfDirect  { get; set; }
        @AuraEnabled public Integer selfSignup { get; set; }
        @AuraEnabled public Integer unknown    { get; set; }
        @AuraEnabled public Integer total      { get; set; }
        @AuraEnabled public List<SourceChannelRow> rows { get; set; }
    }

    public class SourceChannelRow {
        @AuraEnabled public String appName       { get; set; }
        @AuraEnabled public String orgName       { get; set; }
        @AuraEnabled public String sourceChannel { get; set; }
        @AuraEnabled public String budgetRange   { get; set; }
        @AuraEnabled public String stage         { get; set; }
        @AuraEnabled public String decision      { get; set; }
        @AuraEnabled public String recordId      { get; set; }
    }

    @AuraEnabled(cacheable=true)
    public static SourceChannelWrapper getSourceChannelReport() {
        SourceChannelWrapper result = new SourceChannelWrapper();
        result.wsnWen     = 0;
        result.wcfDirect  = 0;
        result.selfSignup = 0;
        result.unknown    = 0;
        result.rows       = new List<SourceChannelRow>();

        Id validatorRtId = getWCFValidatorRecordTypeId();
        List<ApplicationReview> reviews = [
            SELECT Id,
                   Source_Channel_Source_of_Application__c,
                   Budget_Range_Annual_Budget_Range__c,
                   Status,
                   Decision_Final_Decision_from_Sec_1_2__c,
                   ApplicationId
            FROM ApplicationReview
            WHERE Source_Channel_Source_of_Application__c != null
            AND RecordTypeId = :validatorRtId
            WITH SYSTEM_MODE
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];

        if (reviews.isEmpty()) return result;

        Set<Id> appIds = new Set<Id>();
        for (ApplicationReview r : reviews) {
            if (r.ApplicationId != null) appIds.add(r.ApplicationId);
        }

        Map<Id, String> appIdToAppName = new Map<Id, String>();
        Map<Id, String> appIdToOrgName = new Map<Id, String>();
        for (IndividualApplication app : [
            SELECT Id, Name, Account.Name
            FROM IndividualApplication
            WHERE Id IN :appIds 
            WITH SYSTEM_MODE
        ]) {
            appIdToAppName.put(app.Id, app.Name);
            appIdToOrgName.put(app.Id, app.Account != null ? app.Account.Name : '—');
        }

        for (ApplicationReview r : reviews) {
            String ch = r.Source_Channel_Source_of_Application__c;
            if (ch == 'WSN/WEN Nomination')       result.wsnWen++;
            else if (ch == 'WCF Direct Research') result.wcfDirect++;
            else if (ch == 'Self-Signup')         result.selfSignup++;
            else                                  result.unknown++;

            SourceChannelRow row = new SourceChannelRow();
            row.recordId      = r.Id;
            row.appName       = appIdToAppName.containsKey(r.ApplicationId)
                                ? appIdToAppName.get(r.ApplicationId) : '—';
            row.orgName       = appIdToOrgName.containsKey(r.ApplicationId)
                                ? appIdToOrgName.get(r.ApplicationId) : '—';
            row.sourceChannel = ch;
            row.budgetRange   = r.Budget_Range_Annual_Budget_Range__c != null
                                ? r.Budget_Range_Annual_Budget_Range__c : '—';
            row.stage         = r.Status != null ? r.Status : '—';
            row.decision      = r.Decision_Final_Decision_from_Sec_1_2__c != null
                                ? r.Decision_Final_Decision_from_Sec_1_2__c : '—';
            result.rows.add(row);
        }

        result.total = result.wsnWen + result.wcfDirect + result.selfSignup + result.unknown;
        return result;
    }

    @AuraEnabled(cacheable=false)
    public static List<Integer> getPopulatedQuestionNumbers(Id applicationId) {
        List<Integer> populated = new List<Integer>();

        IndividualApplication app = [
            SELECT
                Organizational_Area_s_for_Funding_Inves__c,
                Organizational_Area_s_for_Funding_Inves1__c,
                Organization_Name__c,
                Submitter_Name__c,
                Legal_Type__c,
                Current_fiscal_year_s_end_date__c,
                Funder_1_Name__c,
                Reference_1_Name__c,
                Skilling_Approach__c,
                Job_Creation_Approach__c,
                Livelihood_Approach__c,
                Business_Sectors_JSON__c,
                Organizational_Sustainability__c,
                Use_of_Additional_Funding__c,
                Operational_Synergies_with_WOF__c,
                Operational_Synergies_with_WOF_JC__c,
                Operational_Synergies_with_WOF_Both__c
            FROM IndividualApplication
            WHERE Id = :applicationId
            WITH SYSTEM_MODE
            LIMIT 1
        ];

        String orgArea = app.Organizational_Area_s_for_Funding_Inves1__c != null
                         ? app.Organizational_Area_s_for_Funding_Inves1__c.toLowerCase()
                         : (app.Organizational_Area_s_for_Funding_Inves__c != null
                            ? app.Organizational_Area_s_for_Funding_Inves__c.toLowerCase()
                            : '');

        Boolean isBoth = orgArea.contains('both');
        Boolean hasJF  = isBoth || orgArea.contains('fulfil');
        Boolean hasJC  = isBoth || orgArea.contains('creation');

        // Q1
        if (String.isNotBlank(orgArea)) populated.add(1);
        // Q2
        if (String.isNotBlank(app.Organization_Name__c)) populated.add(2);
        // Q3
        if (String.isNotBlank(app.Submitter_Name__c)) populated.add(3);
        // Q4
        if (String.isNotBlank(app.Legal_Type__c)) populated.add(4);
        // Q5
        if (app.Current_fiscal_year_s_end_date__c != null) populated.add(5);
        // Q6
        if (String.isNotBlank(app.Funder_1_Name__c)) populated.add(6);
        // Q7
        if (String.isNotBlank(app.Reference_1_Name__c)) populated.add(7);

        // Q8 — JF only
        if (hasJF && String.isNotBlank(app.Skilling_Approach__c)) populated.add(8);

        // Q9 — JF only, check WCF_Skilling_Domain__c child records
        if (hasJF) {
            List<WCF_Skilling_Domain__c> sds = [
                SELECT Id FROM WCF_Skilling_Domain__c
                WHERE Proposal__c = :applicationId
                WITH SYSTEM_MODE
                LIMIT 1
            ];
            if (!sds.isEmpty()) populated.add(9);
        }

        // Q10 — JC only
        if (hasJC && String.isNotBlank(app.Job_Creation_Approach__c)) populated.add(10);

        // Q11 — JC only, check WCF_Business_Sector__c child records
        if (hasJC) {
            List<WCF_Business_Sector__c> bss = [
                SELECT Id FROM WCF_Business_Sector__c
                WHERE Proposal__c = :applicationId
                WITH SYSTEM_MODE
                LIMIT 1
            ];
            if (!bss.isEmpty()) populated.add(11);
        }

        // Q12 — historical financial data
        List<Historical_Data__c> hists = [
            SELECT Id FROM Historical_Data__c
            WHERE Proposal__c = :applicationId WITH SYSTEM_MODE LIMIT 1
        ];
        if (!hists.isEmpty()) populated.add(12);

        // Q13 — current fiscal year data
        List<Current_fiscal_year_data__c> fiscals = [
            SELECT Id FROM Current_fiscal_year_data__c
            WHERE Proposal__c = :applicationId WITH SYSTEM_MODE LIMIT 1
        ];
        if (!fiscals.isEmpty()) populated.add(13);

        // Q14
        if (String.isNotBlank(app.Organizational_Sustainability__c)) populated.add(14);

        // Q15 / Q16 — JF only
        if (hasJF) {
            List<Outcomes_Data__c> outcomes = [
                SELECT Projected_Learner_Enrollments_FY_1__c,
                       Projected_Learner_Enrollments_CFY__c
                FROM Outcomes_Data__c
                WHERE Proposal__c = :applicationId WITH SYSTEM_MODE LIMIT 1
            ];
            if (!outcomes.isEmpty()) {
                if (outcomes[0].Projected_Learner_Enrollments_FY_1__c != null) populated.add(15);
                if (outcomes[0].Projected_Learner_Enrollments_CFY__c  != null) populated.add(16);
            }
        }

        // Q17 / Q18 — JC only
        if (hasJC) {
            List<Outcomes_Data__c> outcomes = [
                SELECT Projected_New_Businesses_FY_1__c,
                       Projected_New_Businesses_CFY__c
                FROM Outcomes_Data__c
                WHERE Proposal__c = :applicationId WITH SYSTEM_MODE LIMIT 1
            ];
            if (!outcomes.isEmpty()) {
                if (outcomes[0].Projected_New_Businesses_FY_1__c != null) populated.add(17);
                if (outcomes[0].Projected_New_Businesses_CFY__c  != null) populated.add(18);
            }
        }

        // Q19
        if (String.isNotBlank(app.Use_of_Additional_Funding__c)) populated.add(19);

        // Q20
        Boolean hasQ20 = false;
        if (isBoth  && String.isNotBlank(app.Operational_Synergies_with_WOF_Both__c)) hasQ20 = true;
        if (hasJF && !hasJC && String.isNotBlank(app.Operational_Synergies_with_WOF__c))    hasQ20 = true;
        if (hasJC && !hasJF && String.isNotBlank(app.Operational_Synergies_with_WOF_JC__c)) hasQ20 = true;
        if (hasQ20) populated.add(20);

        return populated;
    }

    @AuraEnabled(cacheable=false)
    public static ReviewerReturnInfo getReviewerReturnInfo(Id applicationId) {
        Set<Id> reviewRecordTypeIds = RecordTypeHelper.applicationReviewReviewerAllowedIds();

        List<ApplicationReview> reviews = [
            SELECT Id, Reviewer_Return_Comment__c, LastModifiedDate
            FROM ApplicationReview
            WHERE ApplicationId = :applicationId
            AND RecordTypeId IN :reviewRecordTypeIds
            WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 10
        ];

        for (ApplicationReview ar : reviews) {
            if (String.isNotBlank(ar.Reviewer_Return_Comment__c)) {
                ReviewerReturnInfo info = new ReviewerReturnInfo();
                info.comment      = ar.Reviewer_Return_Comment__c;
                info.lastModified = ar.LastModifiedDate;
                return info;
            }
        }
        return null;
    }

    public class ReviewerReturnInfo {
        @AuraEnabled public String   comment;
        @AuraEnabled public DateTime lastModified;
    }
}