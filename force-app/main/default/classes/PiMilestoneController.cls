public without sharing class PiMilestoneController {

    // =========================
    // DTO
    // =========================
    public class MilestoneDTO {
        @AuraEnabled public Id milestoneId;
        @AuraEnabled public String milestoneName;
        @AuraEnabled public String status;

        @AuraEnabled public String projectStartDate;
        @AuraEnabled public String projectEndDate;

        @AuraEnabled public String milestoneDescription;

        @AuraEnabled public Decimal disbursedAmount;
        @AuraEnabled public Decimal budgetRequiredINR;
        @AuraEnabled public Decimal totalUtilized;
        @AuraEnabled public String currentTRL;

        // ✅ NEW — the real, status-independent signal for whether
        // this milestone's report has already been submitted.
        @AuraEnabled public Boolean hasUploadedFiles;

        @AuraEnabled public Id applicationId;
        @AuraEnabled public String applicationName;
    }

    // =========================
    // GET MILESTONES
    // =========================
    @AuraEnabled(cacheable=true)
    public static List<MilestoneDTO> getMilestones(Id appId) {

        User u = [
            SELECT Id, ContactId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        if (u.ContactId == null) return new List<MilestoneDTO>();

        Id resolvedAppId = appId;

        if (resolvedAppId == null) {
            List<IndividualApplication> apps = [
                SELECT Id, Name, AppliedDate
                FROM IndividualApplication
                WHERE ContactId = :u.ContactId
                ORDER BY AppliedDate DESC NULLS LAST
                LIMIT 1
            ];
            if (!apps.isEmpty()) resolvedAppId = apps[0].Id;
        } else {
            // The class runs "without sharing" (needed so a PI can
            // submit their own milestone report — see
            // saveMilestoneReport). That means we've lost the implicit
            // protection "with sharing" used to give this query, so
            // explicitly confirm the caller owns the application they
            // asked for before returning anything.
            List<IndividualApplication> owned = [
                SELECT Id
                FROM IndividualApplication
                WHERE Id = :resolvedAppId AND ContactId = :u.ContactId
                LIMIT 1
            ];
            if (owned.isEmpty()) return new List<MilestoneDTO>();
        }

        if (resolvedAppId == null) return new List<MilestoneDTO>();

        List<Milestone__c> msList = [
            SELECT Id, Name, Status__c,
                   Project_Start_Date__c,
                   Project_End_Date__c,
                   Milestone_Description__c,
                   Disbursed_Amount__c,
                   Budget_Required_INR__c,
                   Total_Utilized__c,
                   Current_Technology_Readiness_Level_TRL__c,
                   Individual_Application__c,
                   Individual_Application__r.Name
            FROM Milestone__c
            WHERE Individual_Application__c = :resolvedAppId
            ORDER BY CreatedDate ASC
        ];

        // Determine which of these milestones actually have files
        // uploaded against them. This is the authoritative signal
        // for "report already submitted" — unlike Status__c, it
        // never drifts when staff later approve or disburse funds.
        Set<Id> milestoneIds = new Set<Id>();
        for (Milestone__c ms : msList) {
            milestoneIds.add(ms.Id);
        }

        Set<Id> idsWithFiles = new Set<Id>();
        if (!milestoneIds.isEmpty()) {
            for (ContentDocumentLink cdl : [
                SELECT LinkedEntityId
                FROM ContentDocumentLink
                WHERE LinkedEntityId IN :milestoneIds
            ]) {
                idsWithFiles.add(cdl.LinkedEntityId);
            }
        }

        List<MilestoneDTO> result = new List<MilestoneDTO>();

        for (Milestone__c ms : msList) {

            MilestoneDTO dto = new MilestoneDTO();

            dto.milestoneId = ms.Id;
            dto.milestoneName = ms.Name;
            dto.status = ms.Status__c;

            dto.projectStartDate = String.valueOf(ms.Project_Start_Date__c);
            dto.projectEndDate   = String.valueOf(ms.Project_End_Date__c);

            dto.milestoneDescription = ms.Milestone_Description__c;

            dto.disbursedAmount = ms.Disbursed_Amount__c;
            dto.budgetRequiredINR = ms.Budget_Required_INR__c;
            dto.totalUtilized = ms.Total_Utilized__c;
            dto.currentTRL = ms.Current_Technology_Readiness_Level_TRL__c;

            dto.hasUploadedFiles = idsWithFiles.contains(ms.Id);

            dto.applicationId = ms.Individual_Application__c;
            dto.applicationName =
                ms.Individual_Application__r != null
                ? ms.Individual_Application__r.Name
                : null;

            result.add(dto);
        }

        return result;
    }

    // ===========================================================
    // REQUESTED SUPPORT DOCUMENTS
    // ===========================================================
    @AuraEnabled(cacheable=true)
    public static String getRequestedSupportDocs(Id milestoneId) {
        if (milestoneId == null) return '';

        Milestone__c ms = [
            SELECT Requested_Support_Documents_Portal__c
            FROM Milestone__c
            WHERE Id = :milestoneId
            LIMIT 1
        ];

        return ms.Requested_Support_Documents_Portal__c == null
            ? ''
            : String.valueOf(ms.Requested_Support_Documents_Portal__c);
    }

    // ===========================================================
    // UPDATE STATUS (SAFE)
    // ===========================================================
    @AuraEnabled
    public static void saveMilestoneReport(Id milestoneId, Decimal totalUtilized, String currentTRL, Boolean markSubmitted) {

        if (milestoneId == null) {
            throw new AuraHandledException('Milestone Id is null');
        }

        try {
            User u = [
                SELECT Id, ContactId
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];

            Milestone__c ms = [
                SELECT Id, Status__c, Total_Utilized__c, Current_Technology_Readiness_Level_TRL__c,
                       Individual_Application__r.ContactId
                FROM Milestone__c
                WHERE Id = :milestoneId
                LIMIT 1
            ];

            // The class runs "without sharing" so a PI can save their
            // own report even without an org-wide Edit sharing rule on
            // Milestone__c. Since that removes the implicit protection
            // "with sharing" used to give us, confirm ownership here
            // instead — refuse to touch a milestone that isn't tied to
            // the calling user's own application.
            if (u.ContactId == null || ms.Individual_Application__r.ContactId != u.ContactId) {
                throw new AuraHandledException('You do not have access to this milestone.');
            }

            // Defense in depth: block overwriting Total Utilized / Current TRL
            // only if the report was ALREADY submitted in a PRIOR save (i.e.
            // Status__c was already at or past "Report Submitted" before this
            // call). We deliberately do NOT use file existence here — the
            // Upload Files component attaches files immediately on selection,
            // before this save even runs, so "a file exists" is true on the
            // very first legitimate submission too and would incorrectly
            // block it.
            String priorStatus = (ms.Status__c == null) ? '' : ms.Status__c.toLowerCase().trim();
            Set<String> postSubmissionStatuses = new Set<String>{
                'report submitted',
                'report approved'
                // add further downstream statuses here if your process
                // introduces more stages after report submission
            };
            Boolean alreadySubmitted = postSubmissionStatuses.contains(priorStatus);

            if (!alreadySubmitted) {
                if (totalUtilized != null) {
                    ms.Total_Utilized__c = totalUtilized;
                }
                if (currentTRL != null) {
                    ms.Current_Technology_Readiness_Level_TRL__c = currentTRL;
                }
            }

            if (markSubmitted) {
                ms.Status__c = 'Report Submitted';
            }

            update ms;

        } catch (Exception e) {
            AuraHandledException ahe = new AuraHandledException(e.getMessage());
            ahe.setMessage(e.getMessage());
            throw ahe;
        }
    }

    // ===========================================================
    // TRL PICKLIST VALUES
    // ===========================================================
    @AuraEnabled(cacheable=true)
    public static List<String> getTRLPicklistValues() {
        List<String> values = new List<String>();

        Schema.DescribeFieldResult fieldResult =
            Milestone__c.Current_Technology_Readiness_Level_TRL__c.getDescribe();

        for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            if (entry.isActive()) {
                values.add(entry.getValue());
            }
        }

        return values;
    }
}