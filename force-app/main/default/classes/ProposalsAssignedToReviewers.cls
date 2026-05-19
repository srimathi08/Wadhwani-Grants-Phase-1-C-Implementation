public with sharing class ProposalsAssignedToReviewers {
    @AuraEnabled(cacheable=true)
    public static List<ProposalWrapper> getSharedApplications(Id accountId) {
        Account acc = [
            SELECT Id, PersonContactId
            FROM Account
            WHERE Id = :accountId AND IsPersonAccount = true AND Reviewer__pc = true
            LIMIT 1
        ];

        if (acc.PersonContactId == null) {
            return new List<ProposalWrapper>();
        }

        Id contactId = acc.PersonContactId;

        List<User> users = [SELECT Id FROM User WHERE ContactId = :contactId LIMIT 1];
        if (users.isEmpty()) {
            return new List<ProposalWrapper>();
        }

        Id userId = users[0].Id;

        Map<Id, Datetime> appIdToAssignedDate = new Map<Id, Datetime>();
        for (IndividualApplicationShare share : [
            SELECT ParentId, LastModifiedDate FROM IndividualApplicationShare
            WHERE UserOrGroupId = :userId
        ]) {
            appIdToAssignedDate.put(share.ParentId, share.LastModifiedDate);
        }

        List<Id> sharedAppIds = new List<Id>(appIdToAssignedDate.keySet());

        List<IndividualApplication> apps = [
            SELECT Id, Name, Project_Title__c, Account.Name
            FROM IndividualApplication
            WHERE Id IN :sharedAppIds
        ];

        Map<Id, ApplicationReview> reviewMap = new Map<Id, ApplicationReview>();
        for (ApplicationReview r : [
            SELECT Id, ApplicationId, Status
            FROM ApplicationReview
            WHERE ReviewedById = :userId AND ApplicationId IN :sharedAppIds
        ]) {
            reviewMap.put(r.ApplicationId, r);
        }

        List<ProposalWrapper> output = new List<ProposalWrapper>();
        for (IndividualApplication app : apps) {
            ProposalWrapper p = new ProposalWrapper();
            p.ApplicationId = app.Id;
            p.ApplicationName = app.Name;
            p.ProjectTitle = app.Project_Title__c;
            
            p.ReviewStatus = reviewMap.containsKey(app.Id) ? reviewMap.get(app.Id).Status : 'Yet to Start';
            p.AssignedDate = appIdToAssignedDate.get(app.Id);
            p.COEName = app.AccountId != null ? app.Account.Name : '';
            output.add(p);
        }

        return output;
    }

    public class ProposalWrapper {
        @AuraEnabled public Id ApplicationId;
        @AuraEnabled public String ApplicationName;
        @AuraEnabled public String ProjectTitle;
        @AuraEnabled public String ApplicationStatus;
        @AuraEnabled public String ReviewStatus;
        @AuraEnabled public Datetime AssignedDate;
        @AuraEnabled public String COEName;
    }
}