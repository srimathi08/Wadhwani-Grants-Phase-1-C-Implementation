public without sharing class CoeProposalReviewController {

    /* =====================================================
       WRAPPERS
    ===================================================== */

    public class ProposalWrapper {
        @AuraEnabled public Id     proposalId;
        @AuraEnabled public String proposalName;
        @AuraEnabled public String projectTitle;
        @AuraEnabled public String primaryFocusArea;
        @AuraEnabled public List<ReviewWrapper> reviews;
    }

    public class ReviewWrapper {
        @AuraEnabled public String reviewerName;
        @AuraEnabled public String reviewStatus;
        @AuraEnabled public String reviewStatusClass;
    }

    /* =====================================================
       CHECK IF USER IS COE
    ===================================================== */

    @AuraEnabled(cacheable=true)
    public static Boolean isCoeUser() {

        User u = [
            SELECT Contact.COE_Admin__c
            FROM   User
            WHERE  Id = :UserInfo.getUserId()
            LIMIT  1
        ];

        return u.Contact != null && u.Contact.COE_Admin__c == true;
    }

    /* =====================================================
       FETCH PROPOSALS SHARED WITH COE BY WIN ADMIN
       Used by COE portal — queries WIN_COE_Share_Log__c
    ===================================================== */

    @AuraEnabled(cacheable=true)
    public static List<ProposalWrapper> getSharedProposals() {

        Id currentUserId = UserInfo.getUserId();
        Set<Id> proposalIds = new Set<Id>();

        for (WIN_COE_Share_Log__c log : [
            SELECT Proposal__c
            FROM   WIN_COE_Share_Log__c
            WHERE  COE_User__c = :currentUserId
        ]) {
            proposalIds.add(log.Proposal__c);
        }

        if (proposalIds.isEmpty()) {
            return new List<ProposalWrapper>();
        }

        return buildProposalWrappers(proposalIds);
    }

    /* =====================================================
       FETCH PROPOSALS SHARED WITH PI BY COE
       Used by PI portal — queries COE_PI_Share_Log__c
    ===================================================== */

    @AuraEnabled(cacheable=true)
    public static List<ProposalWrapper> getPIProposals() {

        Id currentUserId = UserInfo.getUserId();
        Set<Id> proposalIds = new Set<Id>();

        for (COE_PI_Share_Log__c log : [
            SELECT Proposal__c
            FROM   COE_PI_Share_Log__c
            WHERE  PI_User__c = :currentUserId
        ]) {
            proposalIds.add(log.Proposal__c);
        }

        if (proposalIds.isEmpty()) {
            return new List<ProposalWrapper>();
        }

        return buildProposalWrappers(proposalIds);
    }

    /* =====================================================
       SHARED HELPER — BUILD PROPOSAL WRAPPERS
       Used by both getSharedProposals() and getPIProposals()
       to avoid duplicating the proposal + review query logic
    ===================================================== */

    private static List<ProposalWrapper> buildProposalWrappers(
        Set<Id> proposalIds
    ) {

        Map<Id, IndividualApplication> proposalMap =
            new Map<Id, IndividualApplication>([
                SELECT Id,
                       Name,
                       Project_Title__c,
                       Primary_Focus_Area__c
                FROM   IndividualApplication
                WHERE  Id IN :proposalIds
            ]);

        Map<Id, List<ApplicationReview>> reviewMap =
            new Map<Id, List<ApplicationReview>>();

        Set<String> reviewerDedup = new Set<String>();

        for (ApplicationReview ar : [
            SELECT ApplicationId,
                   Reviewer__c,
                   Reviewer__r.Name,
                   Final_recommendation_ExternalReviewer__c,
                   CreatedDate
            FROM   ApplicationReview
            WHERE  ApplicationId IN :proposalMap.keySet()
            AND    RecordType.DeveloperName = 'Project_Proposal_Review'
            ORDER BY CreatedDate DESC
        ]) {

            String key = ar.ApplicationId + '-' + ar.Reviewer__c;

            if (reviewerDedup.contains(key)) continue;

            reviewerDedup.add(key);

            if (!reviewMap.containsKey(ar.ApplicationId)) {
                reviewMap.put(
                    ar.ApplicationId,
                    new List<ApplicationReview>()
                );
            }

            reviewMap.get(ar.ApplicationId).add(ar);
        }

        List<ProposalWrapper> result = new List<ProposalWrapper>();

        for (IndividualApplication app : proposalMap.values()) {

            ProposalWrapper pw = new ProposalWrapper();

            pw.proposalId       = app.Id;
            pw.proposalName     = app.Name;
            pw.projectTitle     = app.Project_Title__c;
            pw.primaryFocusArea = app.Primary_Focus_Area__c;
            pw.reviews          = new List<ReviewWrapper>();

            if (reviewMap.containsKey(app.Id)) {

                for (ApplicationReview ar : reviewMap.get(app.Id)) {

                    ReviewWrapper rw = new ReviewWrapper();

                    rw.reviewerName =
                        (ar.Reviewer__r != null)
                        ? ar.Reviewer__r.Name
                        : 'Unknown';

                    String recommendation =
                        ar.Final_recommendation_ExternalReviewer__c;

                    rw.reviewStatus =
                        String.isNotBlank(recommendation)
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
            }

            result.add(pw);
        }

        return result;
    }

    /* =====================================================
       SHARE WITH PI
    ===================================================== */

    @AuraEnabled
    public static void shareWithPI(Id proposalId) {

        if (proposalId == null) {
            throw new AuraHandledException('Invalid Proposal Id');
        }

        IndividualApplication app = [
            SELECT Id,
                   Name,
                   OwnerId,
                   PI__c,
                   PI__r.Email
            FROM   IndividualApplication
            WHERE  Id = :proposalId
            LIMIT  1
        ];

        if (app.PI__c == null) {
            throw new AuraHandledException(
                'No PI assigned to this proposal.'
            );
        }

        // Duplicate check using COE_PI_Share_Log__c
        List<COE_PI_Share_Log__c> existingLog = [
            SELECT Id
            FROM   COE_PI_Share_Log__c
            WHERE  Proposal__c = :proposalId
            AND    PI_User__c  = :app.PI__c
            LIMIT  1
        ];

        if (!existingLog.isEmpty()) {
            return;
        }

        // Delegate share insert to ShareHelper to avoid
        // INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY
        ShareHelper.insertPIShare(proposalId, app.PI__c);

        // Insert log to track this was a COE-initiated share
        COE_PI_Share_Log__c log = new COE_PI_Share_Log__c();
        log.Proposal__c    = proposalId;
        log.PI_User__c     = app.PI__c;
        log.Shared_Date__c = System.now();

        insert log;

        // Send email notification to PI
        if (String.isNotBlank(app.PI__r.Email)) {

            Messaging.SingleEmailMessage mail =
                new Messaging.SingleEmailMessage();

            mail.setToAddresses(
                new String[] { app.PI__r.Email }
            );

            mail.setSubject('Proposal Review Shared With You');

            mail.setPlainTextBody(
                'Hello,\n\n' +
                'A review has been shared for your proposal: ' +
                app.Name +
                '.\n\nPlease log in to the portal to view the details.'
            );

            Messaging.sendEmail(
                new Messaging.SingleEmailMessage[] { mail }
            );
        }
    }
}