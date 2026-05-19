public with sharing class PiMilestoneController {
    
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
    
            // ✅ NEW
            @AuraEnabled public Decimal disbursedAmount;
            @AuraEnabled public Decimal budgetRequiredINR;
    
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
            }
    
            if (resolvedAppId == null) return new List<MilestoneDTO>();
    
            List<Milestone__c> msList = [
                SELECT Id, Name, Status__c,
                       Project_Start_Date__c,
                       Project_End_Date__c,
                       Milestone_Description__c,
                       Disbursed_Amount__c,
                       Budget_Required_INR__c,
                       Individual_Application__c,
                       Individual_Application__r.Name
                FROM Milestone__c
                WHERE Individual_Application__c = :resolvedAppId
                ORDER BY CreatedDate ASC
            ];
    
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
        public static void markMilestoneAsReportSubmitted(Id milestoneId) {
    
            if (milestoneId == null) {
                throw new AuraHandledException('Milestone Id is null');
            }
    
            try {
                Milestone__c ms = [
                    SELECT Id, Status__c
                    FROM Milestone__c
                    WHERE Id = :milestoneId
                    LIMIT 1
                ];
    
                ms.Status__c = 'Report Submitted';
                update ms;
    
            } catch (Exception e) {
                throw new AuraHandledException(e.getMessage());
            }
        }
    }