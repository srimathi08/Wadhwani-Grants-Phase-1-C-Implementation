public without sharing class ProposalReviewSubmissionController {

    /* =====================================================
       WRAPPERS
    ===================================================== */

    public class ProposalWrapper {
        @AuraEnabled public Id      proposalId;
        @AuraEnabled public String  proposalName;
        @AuraEnabled public String  projectTitle;
        @AuraEnabled public String  primaryFocusArea;
        @AuraEnabled public String  coeName;
        @AuraEnabled public Boolean isSharedWithCOE;
        @AuraEnabled public List<ReviewWrapper> reviews;
    }

    public class ReviewWrapper {
        @AuraEnabled public String reviewerName;
        @AuraEnabled public String reviewStatus;
        @AuraEnabled public String reviewStatusClass;
    }

    /* =====================================================
       FETCH PROPOSALS WITH AT LEAST ONE SUBMITTED REVIEW
    ===================================================== */

    @AuraEnabled(cacheable=true)
    public static List<ProposalWrapper> getSubmittedReviews() {

        Id rtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        List<IndividualApplicationShare> shares = [
            SELECT ParentId, UserOrGroupId
            FROM   IndividualApplicationShare
            WHERE  Parent.RecordTypeId = :rtId
        ];

        if (shares.isEmpty()) return new List<ProposalWrapper>();

        Set<Id> proposalIds     = new Set<Id>();
        Set<Id> reviewerUserIds = new Set<Id>();

        for (IndividualApplicationShare s : shares) {
            if (String.valueOf(s.UserOrGroupId).startsWith('005')) {
                proposalIds.add(s.ParentId);
                reviewerUserIds.add(s.UserOrGroupId);
            }
        }

        if (proposalIds.isEmpty()) return new List<ProposalWrapper>();

        Map<Id, User>   reviewerUserMap  = new Map<Id, User>();
        Map<Id, Id>     userToAccountMap = new Map<Id, Id>();
        Map<Id, String> accountToNameMap = new Map<Id, String>();

        for (User u : [
            SELECT Id,
                   Name,
                   ContactId,
                   Contact.Name,
                   Contact.AccountId,
                   Contact.Account.Name,
                   Contact.Account.Reviewer__c
            FROM   User
            WHERE  Id IN :reviewerUserIds
            AND    IsActive = true
        ]) {
            if (u.Contact != null &&
                u.Contact.Account != null &&
                u.Contact.Account.Reviewer__c == true) {

                reviewerUserMap.put(u.Id, u);
                userToAccountMap.put(u.Id, u.Contact.AccountId);
                accountToNameMap.put(
                    u.Contact.AccountId,
                    u.ContactId != null ? u.Contact.Name : u.Name
                );
            }
        }

        if (reviewerUserMap.isEmpty()) return new List<ProposalWrapper>();

        Map<Id, IndividualApplication> proposalMap =
            new Map<Id, IndividualApplication>([
                SELECT Id,
                       Name,
                       Project_Title__c,
                       Primary_Focus_Area__c,
                       Account.Name,
                       AccountId
                FROM   IndividualApplication
                WHERE  Id IN :proposalIds
                AND    RecordTypeId = :rtId
            ]);

        if (proposalMap.isEmpty()) return new List<ProposalWrapper>();

        Set<Id> reviewerAccountIds = new Set<Id>(userToAccountMap.values());

        Map<String, ApplicationReview> reviewMap =
            new Map<String, ApplicationReview>();
        Set<Id> proposalsWithReviews = new Set<Id>();

        for (ApplicationReview ar : [
            SELECT ApplicationId,
                   Reviewer__c,
                   Final_recommendation_ExternalReviewer__c,
                   CreatedDate
            FROM   ApplicationReview
            WHERE  ApplicationId IN :proposalMap.keySet()
            AND    Reviewer__c IN :reviewerAccountIds
            AND    RecordType.DeveloperName = 'Project_Proposal_Review'
            ORDER BY CreatedDate DESC
        ]) {
            String key = ar.Reviewer__c + '-' + ar.ApplicationId;
            if (!reviewMap.containsKey(key)) {
                reviewMap.put(key, ar);
            }
            proposalsWithReviews.add(ar.ApplicationId);
        }

        if (proposalsWithReviews.isEmpty()) return new List<ProposalWrapper>();

        /*
         * FIX — determine isSharedWithCOE from WIN_COE_Share_Log__c
         * instead of querying IndividualApplicationShare with
         * RowCause = Manual.
         *
         * The old approach was unreliable because:
         * 1. Manual shares can exist for reasons unrelated to the
         *    WIN Admin "Share with COE" action.
         * 2. It required a complex double-join through accountToCoeUserMap
         *    which could miss or misattribute shares.
         *
         * WIN_COE_Share_Log__c is only ever written by shareReview(),
         * so a record here unambiguously means WIN Admin shared it.
         */
        Set<Id> alreadySharedProposalIds = new Set<Id>();

        for (WIN_COE_Share_Log__c log : [
            SELECT Proposal__c
            FROM   WIN_COE_Share_Log__c
            WHERE  Proposal__c IN :proposalsWithReviews
        ]) {
            alreadySharedProposalIds.add(log.Proposal__c);
        }

        Map<Id, ProposalWrapper> resultMap = new Map<Id, ProposalWrapper>();

        for (IndividualApplicationShare s : shares) {

            Id proposalId     = s.ParentId;
            Id reviewerUserId = s.UserOrGroupId;

            if (!proposalsWithReviews.contains(proposalId))   continue;
            if (!proposalMap.containsKey(proposalId))         continue;
            if (!reviewerUserMap.containsKey(reviewerUserId)) continue;

            Id reviewerAccountId = userToAccountMap.get(reviewerUserId);
            if (reviewerAccountId == null) continue;

            IndividualApplication app = proposalMap.get(proposalId);

            if (!resultMap.containsKey(proposalId)) {

                ProposalWrapper pw = new ProposalWrapper();

                pw.proposalId       = app.Id;
                pw.proposalName     = app.Name;
                pw.projectTitle     = app.Project_Title__c;
                pw.primaryFocusArea = app.Primary_Focus_Area__c;
                pw.coeName          = app.Account != null
                                      ? app.Account.Name : '';
                pw.isSharedWithCOE  = alreadySharedProposalIds
                                      .contains(proposalId);
                pw.reviews          = new List<ReviewWrapper>();

                resultMap.put(proposalId, pw);
            }

            ProposalWrapper pw = resultMap.get(proposalId);

            Boolean alreadyAdded = false;

            for (ReviewWrapper existing : pw.reviews) {
                if (existing.reviewerName ==
                    accountToNameMap.get(reviewerAccountId)) {
                    alreadyAdded = true;
                    break;
                }
            }

            if (alreadyAdded) continue;

            ReviewWrapper rw = new ReviewWrapper();

            rw.reviewerName = accountToNameMap.get(reviewerAccountId);

            String key = reviewerAccountId + '-' + proposalId;

            String recommendation =
                reviewMap.containsKey(key)
                ? reviewMap.get(key).Final_recommendation_ExternalReviewer__c
                : null;

            rw.reviewStatus = String.isNotBlank(recommendation)
                ? recommendation
                : 'Pending';

            if (recommendation == 'Recommended for Funding') {
                rw.reviewStatusClass = 'status-recommended';
            }
            else if (recommendation == 'Not Recommended for Funding') {
                rw.reviewStatusClass = 'status-not-recommended';
            }
            else {
                rw.reviewStatusClass = 'status-neutral';
            }

            pw.reviews.add(rw);
        }

        return resultMap.values();
    }

    /* =====================================================
       SHARE REVIEW WITH COE ADMIN
    ===================================================== */

    @AuraEnabled
    public static void shareReview(Id proposalId) {

        IndividualApplication app = [
            SELECT Id, Name, AccountId
            FROM   IndividualApplication
            WHERE  Id = :proposalId
            LIMIT  1
        ];

        List<User> admins = [
            SELECT Id, Email, Name
            FROM   User
            WHERE  Contact.AccountId   = :app.AccountId
            AND    Contact.COE_Admin__c = true
            AND    IsActive = true
        ];

        if (admins.isEmpty()) {
            throw new AuraHandledException(
                'No active COE Admin portal user found for this Account.'
            );
        }

        User coeAdmin = admins[0];

        /*
         * FIX — duplicate check via WIN_COE_Share_Log__c.
         * Previously this checked IndividualApplicationShare
         * with RowCause = Manual, which could match shares
         * created by other processes and falsely prevent
         * the COE share from being created, or incorrectly
         * mark a proposal as already shared in the dashboard.
         */
        List<WIN_COE_Share_Log__c> existingLog = [
            SELECT Id
            FROM   WIN_COE_Share_Log__c
            WHERE  Proposal__c = :proposalId
            AND    COE_User__c = :coeAdmin.Id
            LIMIT  1
        ];

        if (!existingLog.isEmpty()) {
            return; // Already shared via WIN Admin action
        }

        // Insert the actual share for record-level access
        IndividualApplicationShare shareRec =
            new IndividualApplicationShare();

        shareRec.ParentId      = proposalId;
        shareRec.UserOrGroupId = coeAdmin.Id;
        shareRec.AccessLevel   = 'Read';
        shareRec.RowCause      =
            Schema.IndividualApplicationShare.RowCause.Manual;

        insert shareRec;

        // Insert log to track this was a WIN Admin action
        WIN_COE_Share_Log__c log = new WIN_COE_Share_Log__c();
        log.Proposal__c    = proposalId;
        log.COE_User__c    = coeAdmin.Id;
        log.Shared_Date__c = System.now();

        insert log;

        // Send email notification to COE Admin
        Messaging.SingleEmailMessage mail =
            new Messaging.SingleEmailMessage();

        mail.setToAddresses(new String[]{ coeAdmin.Email });

        mail.setSubject('Proposal Reviews Shared With You');

        mail.setPlainTextBody(
            'Dear ' + coeAdmin.Name + ',\n\n' +
            'The external reviews for proposal "' + app.Name +
            '" have been shared with you.\n\n' +
            'Please login to the COE portal to view the ' +
            'reviewer recommendations.\n\n' +
            'Thank you,\nWIN Grant Management Team'
        );

        Messaging.sendEmail(
            new Messaging.SingleEmailMessage[]{ mail }
        );
    }
}