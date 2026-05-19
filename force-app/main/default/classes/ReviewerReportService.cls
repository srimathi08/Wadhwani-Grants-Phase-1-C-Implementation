public without sharing class ReviewerReportService {

    /* =====================================================
       ROW WRAPPER
    ===================================================== */
    public class Row {
        @AuraEnabled public Id reviewerId;
        @AuraEnabled public String reviewerName;

        @AuraEnabled public Id proposalId;
        @AuraEnabled public String proposalName;

        @AuraEnabled public Date assignedDate;
        @AuraEnabled public String reviewStatus;
        @AuraEnabled public String coeName;
        @AuraEnabled public String projectTitle;
        @AuraEnabled public Date createdDate;

        /* 🔹 NEW FIELDS (TAB 3 ONLY – SAFE ADDITION) */
        @AuraEnabled public Decimal totalScore;
        @AuraEnabled public String finalRecommendation;
    }

    /* =====================================================
       TAB 1 & TAB 3 : ASSIGNED / PROPOSAL REVIEW
    ===================================================== */
    @AuraEnabled(cacheable=true)
    public static List<Row> getReport(Date fromDate, Date toDate) {

        Id projectProposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        List<IndividualApplicationShare> shares = [
            SELECT ParentId, UserOrGroupId, LastModifiedDate
            FROM IndividualApplicationShare
        ];
        if (shares.isEmpty()) return new List<Row>();

        Set<Id> proposalIds = new Set<Id>();
        Set<Id> userIds = new Set<Id>();
        Set<Id> groupIds = new Set<Id>();

        for (IndividualApplicationShare s : shares) {
            proposalIds.add(s.ParentId);
            String prefix = String.valueOf(s.UserOrGroupId).substring(0, 3);
            if (prefix == '005') userIds.add(s.UserOrGroupId);
            if (prefix == '00G') groupIds.add(s.UserOrGroupId);
        }

        Map<Id, Set<Id>> groupToUsers = new Map<Id, Set<Id>>();
        if (!groupIds.isEmpty()) {
            for (GroupMember gm : [
                SELECT GroupId, UserOrGroupId
                FROM GroupMember
                WHERE GroupId IN :groupIds
            ]) {
                if (gm.UserOrGroupId.getSObjectType() == User.SObjectType) {
                    userIds.add(gm.UserOrGroupId);
                    if (!groupToUsers.containsKey(gm.GroupId)) {
                        groupToUsers.put(gm.GroupId, new Set<Id>());
                    }
                    groupToUsers.get(gm.GroupId).add(gm.UserOrGroupId);
                }
            }
        }

        Map<Id, User> reviewers = new Map<Id, User>([
            SELECT Id, Name, ContactId, Contact.Name
            FROM User
            WHERE Id IN :userIds
            AND Profile.Name = 'Reviewer'
            AND IsActive = true
        ]);

        if (reviewers.isEmpty()) return new List<Row>();

        Map<Id, IndividualApplication> proposals =
            new Map<Id, IndividualApplication>([
                SELECT Id, Name, Project_Title__c, Account.Name
                FROM IndividualApplication
                WHERE Id IN :proposalIds
                AND RecordTypeId = :projectProposalRtId
            ]);

        if (proposals.isEmpty()) return new List<Row>();

        /* =====================================================
           APPLICATION REVIEW DATA (EXTENDED – NO LOGIC CHANGE)
        ===================================================== */
        Map<String, String> statusMap = new Map<String, String>();
        Map<String, Decimal> scoreMap = new Map<String, Decimal>();
        Map<String, String> recommendationMap = new Map<String, String>();

        for (ApplicationReview ar : [
            SELECT ApplicationId,
                   ReviewedById,
                   Status,
                   Total_Score__c,
                   Final_recommendation_ExternalReviewer__c
            FROM ApplicationReview
            WHERE ApplicationId IN :proposals.keySet()
        ]) {
            String key = ar.ReviewedById + '-' + ar.ApplicationId;
            statusMap.put(key, ar.Status);
            scoreMap.put(key, ar.Total_Score__c);
            recommendationMap.put(key, ar.Final_recommendation_ExternalReviewer__c);
        }

        List<Row> result = new List<Row>();
        Set<String> uniqueKeys = new Set<String>();

        for (IndividualApplicationShare s : shares) {

            IndividualApplication app = proposals.get(s.ParentId);
            if (app == null) continue;

            Date assignedDate = s.LastModifiedDate.date();
            if (fromDate != null && assignedDate < fromDate) continue;
            if (toDate != null && assignedDate > toDate) continue;

            List<Id> reviewerIds = new List<Id>();
            if (reviewers.containsKey(s.UserOrGroupId)) {
                reviewerIds.add(s.UserOrGroupId);
            } else if (groupToUsers.containsKey(s.UserOrGroupId)) {
                reviewerIds.addAll(groupToUsers.get(s.UserOrGroupId));
            }

            for (Id reviewerId : reviewerIds) {
                if (!reviewers.containsKey(reviewerId)) continue;

                String key = reviewerId + '-' + app.Id;
                if (!uniqueKeys.add(key)) continue;

                User u = reviewers.get(reviewerId);

                Row r = new Row();
                r.reviewerId = reviewerId;
                r.reviewerName = u.ContactId != null ? u.Contact.Name : u.Name;
                r.proposalId = app.Id;
                r.proposalName = app.Name;
                r.projectTitle = app.Project_Title__c;
                r.coeName = app.Account != null ? app.Account.Name : null;
                r.assignedDate = assignedDate;
                r.reviewStatus = statusMap.containsKey(key)
                    ? statusMap.get(key)
                    : 'Yet to Start';

                /* 🔹 NEW FIELD MAPPING */
                r.totalScore = scoreMap.get(key);
                r.finalRecommendation = recommendationMap.get(key);

                result.add(r);
            }
        }

        result.sort(new ReviewerRowComparator());
        return result;
    }

    /* =====================================================
       TAB 3 : PROPOSAL REVIEW REPORT
    ===================================================== */
    @AuraEnabled(cacheable=true)
    public static List<Row> getProposalReviewReport(Date fromDate, Date toDate) {
        List<Row> rows = getReport(fromDate, toDate);
        rows.sort(new ProposalRowComparator());
        return rows;
    }

    /* =====================================================
       TAB 2 : UNASSIGNED PROPOSALS (FIXED)
    ===================================================== */
    @AuraEnabled(cacheable=true)
    public static List<Row> getUnassignedProposals(Date fromDate, Date toDate) {

        Id projectProposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        Set<Id> reviewerUserIds = new Set<Id>();
        for (User u : [
            SELECT Id
            FROM User
            WHERE Profile.Name = 'Reviewer'
            AND IsActive = true
        ]) {
            reviewerUserIds.add(u.Id);
        }

        Set<Id> reviewerGroupIds = new Set<Id>();
        for (GroupMember gm : [
            SELECT GroupId
            FROM GroupMember
            WHERE UserOrGroupId IN :reviewerUserIds
        ]) {
            reviewerGroupIds.add(gm.GroupId);
        }

        Set<Id> assignedProposalIds = new Set<Id>();
        for (IndividualApplicationShare s : [
            SELECT ParentId
            FROM IndividualApplicationShare
            WHERE UserOrGroupId IN :reviewerUserIds
               OR UserOrGroupId IN :reviewerGroupIds
        ]) {
            assignedProposalIds.add(s.ParentId);
        }

        List<Row> result = new List<Row>();

        for (IndividualApplication app : [
            SELECT Id, Name, Project_Title__c, Account.Name, CreatedDate
            FROM IndividualApplication
            WHERE RecordTypeId = :projectProposalRtId
            AND Id NOT IN :assignedProposalIds
        ]) {

            Date created = app.CreatedDate.date();
            if (fromDate != null && created < fromDate) continue;
            if (toDate != null && created > toDate) continue;

            Row r = new Row();
            r.proposalId = app.Id;
            r.proposalName = app.Name;
            r.projectTitle = app.Project_Title__c;
            r.coeName = app.Account != null ? app.Account.Name : null;
            r.createdDate = created;

            result.add(r);
        }

        return result;
    }

    /* =====================================================
       COMPARATORS
    ===================================================== */
    public class ReviewerRowComparator implements Comparator<Row> {
        public Integer compare(Row a, Row b) {
            Integer c = a.reviewerName.toLowerCase()
                .compareTo(b.reviewerName.toLowerCase());
            return c != 0 ? c :
                a.proposalName.toLowerCase()
                .compareTo(b.proposalName.toLowerCase());
        }
    }

    public class ProposalRowComparator implements Comparator<Row> {
        public Integer compare(Row a, Row b) {
            Integer c = a.proposalName.toLowerCase()
                .compareTo(b.proposalName.toLowerCase());
            return c != 0 ? c :
                a.reviewerName.toLowerCase()
                .compareTo(b.reviewerName.toLowerCase());
        }
    }
}