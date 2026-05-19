public without sharing class PiPortalController {
    
        // =========================
        // DTOs
        // =========================
        public class PortalContextDTO {
            @AuraEnabled public Id contactId;
            @AuraEnabled public String contactName;
            @AuraEnabled public String contactEmail;
            @AuraEnabled public String contactPhone;
    
            @AuraEnabled public Id accountId;
            @AuraEnabled public String accountName;
    
            @AuraEnabled public Boolean isRegistered;
    
            @AuraEnabled public Id applicationId;
            @AuraEnabled public String applicationName;
            @AuraEnabled public String applicationStatus;
            @AuraEnabled public Datetime appliedDate;
    
            @AuraEnabled public Boolean hasApplication;
            @AuraEnabled public Boolean isApprovedForFunding;
    
            @AuraEnabled public Integer milestoneCount;
    
            // ✅ NEW COUNTS
            @AuraEnabled public Integer draftProposalCount;
            @AuraEnabled public Integer totalProposalCount;
        }
    
        // =========================
        // Milestone DTO
        // =========================
        public class MilestoneDTO {
            @AuraEnabled public Id id;
            @AuraEnabled public String name;
            @AuraEnabled public String status;
    
            public MilestoneDTO() {}
    
            public MilestoneDTO(Milestone__c m) {
                id = m.Id;
                name = m.Name;
                status = String.valueOf(m.Status__c);
            }
        }
    
        // =========================
        // Proposal DTO
        // =========================
        public class ProposalDTO {
            @AuraEnabled public Id id;
            @AuraEnabled public String name;
            @AuraEnabled public String status;
            @AuraEnabled public Datetime appliedDate;
            @AuraEnabled public String projectTitle;
    
            @AuraEnabled public List<MilestoneDTO> milestones;
    
            public ProposalDTO() {
                milestones = new List<MilestoneDTO>();
            }
    
            public ProposalDTO(IndividualApplication ia) {
                id = ia.Id;
                name = ia.Name;
                status = ia.Status;
                appliedDate = ia.AppliedDate;
                projectTitle = (String) ia.get('Project_Title__c');
                milestones = new List<MilestoneDTO>();
            }
        }
    
        // =========================
        // Used by LWC Dashboard
        // =========================
        @AuraEnabled(cacheable=true)
        public static PortalContextDTO getPortalContext() {
    
            PortalContextDTO dto = new PortalContextDTO();
    
            User u = [
                SELECT Id, ContactId
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];
    
            // 🚫 No Contact mapped
            if (u.ContactId == null) {
                dto.isRegistered = false;
                dto.hasApplication = false;
                dto.isApprovedForFunding = false;
                dto.milestoneCount = 0;
                dto.draftProposalCount = 0;
                dto.totalProposalCount = 0;
                return dto;
            }
    
            // =========================
            // Contact Details
            // =========================
            Contact c = [
                SELECT Id, Name, Email, Phone, AccountId, Account.Name, New_PI__c
                FROM Contact
                WHERE Id = :u.ContactId
                LIMIT 1
            ];
    
            dto.contactId = c.Id;
            dto.contactName = c.Name;
            dto.contactEmail = c.Email;
            dto.contactPhone = c.Phone;
    
            dto.accountId = c.AccountId;
            dto.accountName = (c.AccountId != null) ? c.Account.Name : null;
    
            // =========================
            // Proposal COUNTS
            // =========================
            dto.draftProposalCount = [
                SELECT COUNT()
                FROM IndividualApplication
                WHERE ContactId = :c.Id
                AND Status = 'Draft'
            ];
    
            dto.totalProposalCount = [
                SELECT COUNT()
                FROM IndividualApplication
                WHERE ContactId = :c.Id
            ];
    
            // =========================
            // Latest Proposal
            // =========================
            List<IndividualApplication> apps = [
                SELECT Id, Name, Status, AppliedDate
                FROM IndividualApplication
                WHERE ContactId = :c.Id
                ORDER BY AppliedDate DESC NULLS LAST
                LIMIT 1
            ];
    
            Boolean hasApp = !apps.isEmpty();
            dto.hasApplication = hasApp;
    
            if (hasApp) {
                IndividualApplication ia = apps[0];
    
                dto.applicationId = ia.Id;
                dto.applicationName = ia.Name;
                dto.applicationStatus = ia.Status;
                dto.appliedDate = ia.AppliedDate;
    
                dto.isApprovedForFunding = isFundingApproved(ia.Status);
    
                dto.milestoneCount = [
                    SELECT COUNT()
                    FROM Milestone__c
                    WHERE Individual_Application__c = :ia.Id
                ];
            } else {
                dto.isApprovedForFunding = false;
                dto.milestoneCount = 0;
            }
    
            // =========================
            // Registration Rule
            // =========================
            dto.isRegistered = (c.New_PI__c == true) || hasApp;
    
            return dto;
        }
    
        // =========================
        // Register PI
        // =========================
        @AuraEnabled
        public static PortalContextDTO registerPI() {
    
            User u = [
                SELECT Id, ContactId
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];
    
            if (u.ContactId == null) {
                throw new AuraHandledException('Portal user is not mapped to a Contact.');
            }
    
            Contact c = [
                SELECT Id, New_PI__c
                FROM Contact
                WHERE Id = :u.ContactId
                LIMIT 1
            ];
    
            c.New_PI__c = true;
            update c;
    
            return getPortalContext();
        }
    
        // =========================
        // Proposal Pages
        // =========================
        @AuraEnabled(cacheable=true)
        public static List<ProposalDTO> getMyProposals() {
            return getProposalsInternal(false);
        }
    
        @AuraEnabled(cacheable=true)
        public static List<ProposalDTO> getMyApprovedForFundingProposals() {
            return getProposalsInternal(true);
        }
    
        // =========================
        // Internal Logic
        // =========================
        private static List<ProposalDTO> getProposalsInternal(Boolean onlyApprovedFunding) {
    
            Id contactId = getCurrentContactId();
            if (contactId == null) return new List<ProposalDTO>();
    
            Set<String> approvedStatuses = getFundingApprovedStatuses();
    
            List<IndividualApplication> ias;
    
            if (onlyApprovedFunding) {
                ias = [
                    SELECT Id, Name, Status, AppliedDate, Project_Title__c
                    FROM IndividualApplication
                    WHERE ContactId = :contactId
                    AND Status IN :approvedStatuses
                    ORDER BY AppliedDate DESC NULLS LAST, CreatedDate DESC
                ];
            } else {
                ias = [
                    SELECT Id, Name, Status, AppliedDate, Project_Title__c
                    FROM IndividualApplication
                    WHERE ContactId = :contactId
                    ORDER BY AppliedDate DESC NULLS LAST, CreatedDate DESC
                ];
            }
    
            if (ias.isEmpty()) return new List<ProposalDTO>();
    
            List<ProposalDTO> outList = new List<ProposalDTO>();
            Set<Id> iaIds = new Set<Id>();
            Map<Id, ProposalDTO> dtoByIaId = new Map<Id, ProposalDTO>();
    
            for (IndividualApplication ia : ias) {
                ProposalDTO dto = new ProposalDTO(ia);
                outList.add(dto);
                iaIds.add(ia.Id);
                dtoByIaId.put(ia.Id, dto);
            }
    
            List<Milestone__c> milestoneList = [
                SELECT Id, Name, Status__c, Individual_Application__c, CreatedDate
                FROM Milestone__c
                WHERE Individual_Application__c IN :iaIds
                ORDER BY Individual_Application__c, CreatedDate ASC
            ];
    
            for (Milestone__c m : milestoneList) {
                ProposalDTO dto = dtoByIaId.get(m.Individual_Application__c);
                if (dto != null) {
                    dto.milestones.add(new MilestoneDTO(m));
                }
            }
    
            return outList;
        }
    
        // =========================
        // Helpers
        // =========================
        private static Id getCurrentContactId() {
            User u = [
                SELECT Id, ContactId
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];
            return u.ContactId;
        }
    
        private static Set<String> getFundingApprovedStatuses() {
            return new Set<String>{
                'Approved for Funding',
                'Approved',
                'Submitted Back - Approved for Funding Resubmission',
                'Approved with Resubmission'
            };
        }
    
        private static Boolean isFundingApproved(String statusVal) {
            if (String.isBlank(statusVal)) return false;
            return getFundingApprovedStatuses().contains(statusVal);
        }
    }