public without sharing class PLOfRecordController {

    @AuraEnabled(cacheable=true)
    public static List<PLOrgWrapper> getMyPLOrganizations() {
        Id currentUserId = UserInfo.getUserId();
        User currentUser = [SELECT AccountId FROM User WHERE Id = :currentUserId LIMIT 1];
        Id currentAccountId = currentUser.AccountId;
        List<Account> orgs = [
            SELECT Id, Name, PL__c, Co_PL__c, WCF_Organizational_Name__c
            FROM Account
            WHERE PL__c = :currentAccountId OR Co_PL__c = :currentAccountId
            ORDER BY Name ASC
        ];
        List<PLOrgWrapper> result = new List<PLOrgWrapper>();
        for (Account a : orgs) result.add(new PLOrgWrapper(a, currentAccountId));
        return result;
    }

    // ── NEW: flagged applications sitting in this PL's queue, awaiting Approve/Reject ──
    @AuraEnabled(cacheable=false)
    public static List<FlaggedAppWrapper> getFlaggedApplicationsForPL() {
        Id currentUserId = UserInfo.getUserId();
        User currentUser = [SELECT AccountId FROM User WHERE Id = :currentUserId LIMIT 1];
        Id currentAccountId = currentUser.AccountId;

        Set<Id> myOrgIds = new Set<Id>();
        // NOTE: uses PL__c / Co_Pl_rec__c (the fields used by PlAssignmentController)
        for (Account a : [
            SELECT Id FROM Account
            WHERE PL__c = :currentAccountId OR Co_Pl_rec__c = :currentAccountId
        ]) {
            myOrgIds.add(a.Id);
        }
        if (myOrgIds.isEmpty()) return new List<FlaggedAppWrapper>();

        Map<Id, IndividualApplication> appMap = new Map<Id, IndividualApplication>([
            SELECT Id, Name, Organization_Name__c, AccountId, Account.Name
            FROM IndividualApplication
            WHERE AccountId IN :myOrgIds
            AND Flagged__c = true
        ]);
        if (appMap.isEmpty()) return new List<FlaggedAppWrapper>();

        List<FlaggedAppWrapper> result = new List<FlaggedAppWrapper>();
        for (ApplicationReview ar : [
            SELECT Id, ApplicationId,
                   Decision_rationale__c,
                   Flag_rationale_Flagging_Criteria__c,
                   Other_describe_the_concern__c,
                   Flag__c
            FROM ApplicationReview
            WHERE ApplicationId IN :appMap.keySet()
            AND RecordType.DeveloperName = 'WCF_Validator'
            AND Decision_Final_Decision_from_Sec_1_2__c = 'Flag'
            AND Flag__c = null
            ORDER BY LastModifiedDate DESC
        ]) {
            IndividualApplication app = appMap.get(ar.ApplicationId);
            if (app == null) continue;
            FlaggedAppWrapper w = new FlaggedAppWrapper();
            w.applicationId     = app.Id;
            w.applicationName   = app.Name;
            w.organizationName  = String.isNotBlank(app.Organization_Name__c) ? app.Organization_Name__c : app.Account.Name;
            w.reviewId          = ar.Id;
            w.decisionRationale = ar.Decision_rationale__c;
            w.flagRationale     = ar.Flag_rationale_Flagging_Criteria__c;
            w.otherConcern      = ar.Other_describe_the_concern__c;
            result.add(w);
        }
        return result;
    }

    public class FlaggedAppWrapper {
        @AuraEnabled public Id     applicationId;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String organizationName;
        @AuraEnabled public Id     reviewId;
        @AuraEnabled public String decisionRationale;
        @AuraEnabled public String flagRationale;
        @AuraEnabled public String otherConcern;
    }

    public class PLOrgWrapper {
        @AuraEnabled public Id orgId;
        @AuraEnabled public String orgName;
        @AuraEnabled public Boolean isCoPl;
        public PLOrgWrapper(Account a, Id currentAccountId) {
            this.orgId   = a.Id;
            this.orgName = String.isNotBlank(a.WCF_Organizational_Name__c) ? a.WCF_Organizational_Name__c : a.Name;
            this.isCoPl  = (a.Co_PL__c == currentAccountId);
        }
    }
}