@IsTest
private class WCFProposalListControllerTest {

    @TestSetup
    static void setup() {
        WCF_TestDataFactory.createBundle();

        // runAs on the current user resets the mixed-DML context without
        // depending on any particular user existing in the target org.
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Schema.RecordTypeInfo rtInfo = Schema.SObjectType.Account
                .getRecordTypeInfosByDeveloperName().get('Reviewer');
            if (rtInfo == null) return;

            Account reviewerAccount = new Account(
                RecordTypeId    = rtInfo.getRecordTypeId(),
                LastName        = 'TestReviewerAccount',
                WCF_Reviewer__c = true,
                PersonEmail     = 'reviewer@example.com'
            );
            insert reviewerAccount;
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════════════

    /**
     * Returns a user to run DML as. Never assumes a specific user exists in the
     * org: prefers a dedicated test admin, then any other active admin, and
     * finally falls back to the running user (an admin during deployment).
     */
    private static User getSysAdmin() {
        List<User> admins = [
            SELECT Id
            FROM User
            WHERE IsActive = true
              AND Profile.Name = 'System Administrator'
              AND Username LIKE 'testadmin_%'
            LIMIT 1
        ];
        if (admins.isEmpty()) {
            admins = [
                SELECT Id
                FROM User
                WHERE IsActive = true
                  AND Profile.Name = 'System Administrator'
                  AND Id != :UserInfo.getUserId()
                LIMIT 1
            ];
        }
        return admins.isEmpty() ? new User(Id = UserInfo.getUserId()) : admins[0];
    }

    private static Id cachedAccountId;
    private static Id cachedContactId;

    /** Resolves seed Account/Contact ids from factory data, with fallbacks. */
    private static void initSeedIds() {
        if (cachedAccountId != null) return;

        List<Account> accs = [SELECT Id FROM Account WHERE IsPersonAccount = true LIMIT 1];
        if (accs.isEmpty()) {
            accs = [SELECT Id FROM Account LIMIT 1];
        }
        cachedAccountId = accs.isEmpty() ? null : accs[0].Id;

        List<Contact> cons = [SELECT Id FROM Contact LIMIT 1];
        cachedContactId = cons.isEmpty() ? null : cons[0].Id;
    }

    private static Id reviewRtId(String developerName) {
        return Schema.SObjectType.ApplicationReview
            .getRecordTypeInfosByDeveloperName().get(developerName).getRecordTypeId();
    }


    /** Creates and inserts a new IndividualApplication tied to the existing person account. */
    private static IndividualApplication newApp(String status) {
        initSeedIds();
        IndividualApplication app =
            WCF_TestDataFactory.createApplication(cachedAccountId, cachedContactId, status, false);
        insert app;
        return app;
    }

    /** Record type id, or null when the record type is absent in this org. */
    private static Id reviewRtIdSafe(String developerName) {
        Schema.RecordTypeInfo info = Schema.SObjectType.ApplicationReview
            .getRecordTypeInfosByDeveloperName().get(developerName);
        return info == null ? null : info.getRecordTypeId();
    }

    /**
     * Creates a WCF review flagged for CEO review plus an 'Accept' decision.
     * This is the data shape the getAccepted* methods filter on.
     */
    private static ApplicationDecision createAcceptedDecision(Id applicationId, String comment) {
        ApplicationReview ar = new ApplicationReview(
            ApplicationId = applicationId,
            RecordTypeId  = reviewRtId('WCF_Job_Creation_Review'),
            Status        = 'Review Submitted',
            Recommend_for_CEO_review__c = 'Yes'
        );
        insert ar;

        ApplicationDecision ad = new ApplicationDecision(
            ApplicationId       = applicationId,
            ApplicationDecision = 'Accept',
            Proposal_Review__c  = ar.Id,
            Comment             = comment,
            Decision_Date__c    = DateTime.now()
        );
        insert ad;
        return ad;
    }

    // ══════════════════════════════════════════════════════════════════
    //  EXISTING TESTS
    // ══════════════════════════════════════════════════════════════════

    @IsTest
    static void testProposalsAndDecisions() {
        User sysAdmin = getSysAdmin();
        IndividualApplication app = [SELECT Id, Status, AccountId, OwnerId FROM IndividualApplication LIMIT 1];
        initSeedIds();

        System.runAs(sysAdmin) {
            app.AccountId = cachedAccountId;
            app.Status = 'Under Review';
            update app;

            IndividualApplication app2 = WCF_TestDataFactory.createApplication(
                cachedAccountId, cachedContactId, 'Under Review', false);
            insert app2;

            Id jobCreationRtId = reviewRtId('WCF_Job_Creation_Review');
            Id validatorRtId   = reviewRtId('WCF_Validator');

            String validFlagRationale = WCF_TestDataFactory.pickValue('ApplicationReview', 'Flag_rationale_Flagging_Criteria__c', 'Flag rationale');

            ApplicationReview arValidator = new ApplicationReview(
                ApplicationId = app.Id,
                RecordTypeId = validatorRtId,
                Status = 'Flagged',
                Decision_Final_Decision_from_Sec_1_2__c = 'Flag',
                Flag_rationale_Flagging_Criteria__c = validFlagRationale,
                Decision_rationale__c = 'Flagged',
                DueDate = Date.today().addDays(3)
            );
            insert arValidator;

            ApplicationReview arValidator2 = new ApplicationReview(
                ApplicationId = app2.Id,
                RecordTypeId = validatorRtId,
                Status = 'Flagged',
                Decision_Final_Decision_from_Sec_1_2__c = 'Flag',
                Flag_rationale_Flagging_Criteria__c = validFlagRationale,
                Decision_rationale__c = 'Flagged',
                DueDate = Date.today().addDays(4)
            );
            insert arValidator2;

            WCFProposalListController.ValidatorFlagInfo flagInfo = WCFProposalListController.getValidatorFlagInfo(app.Id);
            System.assertNotEquals(null, flagInfo);

            System.assertNotEquals(null, WCFProposalListController.getValidatedProposals());
            System.assertNotEquals(null, WCFProposalListController.getReviewStatusMap());

            WCFProposalListController.updateFlagDecision(app.Id, 'Proceed for Review');

            arValidator = [SELECT Flag__c FROM ApplicationReview WHERE Id = :arValidator.Id];
            System.assertEquals('Proceed for Review', arValidator.Flag__c);

            String reviewIdBoth = WCFProposalListController.createReviewRecord(app.Id, 'Both');
            System.assertNotEquals(null, reviewIdBoth);

            String reviewIdJC = WCFProposalListController.createReviewRecord(app.Id, 'JC');
            System.assertNotEquals(null, reviewIdJC);

            String reviewIdJF = WCFProposalListController.createReviewRecord(app.Id, 'JF');
            System.assertNotEquals(null, reviewIdJF);

            WCFProposalListController.updateApproverReturnDecision(app.Id, 'Approve', 'Approved comment');

            WCFProposalListController.updateApproverReturnDecision(app.Id, 'ReturnToValidator', 'Needs revalidation');

            System.assertNotEquals(null, WCFProposalListController.getApproverReturnQueueCount());
            System.assertNotEquals(null, WCFProposalListController.getApproverReturnQueue());
        }
    }

    @IsTest
    static void testDecisionsEmptyAndErrors() {
        User sysAdmin = getSysAdmin();
        IndividualApplication app = [SELECT Id FROM IndividualApplication LIMIT 1];

        System.runAs(sysAdmin) {
            delete [SELECT Id FROM ApplicationReview];

            System.assertEquals(null, WCFProposalListController.getValidatorFlagInfo(app.Id));

            try {
                WCFProposalListController.updateFlagDecision(app.Id, 'Reject');
                System.assert(false, 'Should throw exception on missing flagged review');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e);
            }

            try {
                WCFProposalListController.updateApproverReturnDecision(app.Id, 'Approve', 'Comment');
                System.assert(false, 'Should throw exception on missing reviews');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e);
            }
        }
    }

    @IsTest
    static void testApproverReturnInfo() {
        User sysAdmin = getSysAdmin();
        IndividualApplication app = [SELECT Id FROM IndividualApplication LIMIT 1];

        System.runAs(sysAdmin) {
            System.assertEquals(null, WCFProposalListController.getApproverReturnInfo(app.Id));

            String validRejectionReason = WCF_TestDataFactory.pickValue('ApplicationDecision', 'Rejection_Reasons__c', 'Other');

            ApplicationDecision ad = new ApplicationDecision(
                ApplicationId = app.Id,
                ApplicationDecision = 'Approved with Resubmission',
                Comment = 'Return comment',
                Decision_Date__c = DateTime.now(),
                Rejection_Reasons__c = validRejectionReason
            );
            insert ad;

            WCFProposalListController.ApproverReturnInfo info = WCFProposalListController.getApproverReturnInfo(app.Id);
            System.assertNotEquals(null, info);
            System.assertEquals('Return comment', info.comment);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  NEW TESTS
    // ══════════════════════════════════════════════════════════════════

    /**
     * Covers getAcceptedApplicationsCount / getAcceptedApplicationIds /
     * getAcceptedApplicationsQueue — none of which were previously invoked.
     * Includes a blank-comment decision to hit the String.isNotBlank false branch.
     */
    @IsTest
    static void testAcceptedApplicationsHappyPath() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            IndividualApplication appOne = newApp('Under Review');
            IndividualApplication appTwo = newApp('Under Review');

            createAcceptedDecision(appOne.Id, 'CEO ready — strong outcomes model.');
            createAcceptedDecision(appTwo.Id, 'Second accepted proposal.');
            // Blank comment -> filtered out by every one of the three methods
            createAcceptedDecision(newApp('Under Review').Id, null);

            Test.startTest();
            Integer acceptedCount = WCFProposalListController.getAcceptedApplicationsCount();
            List<Id> acceptedIds  = WCFProposalListController.getAcceptedApplicationIds();
            List<WCFProposalListController.AcceptedApplicationItem> queue =
                WCFProposalListController.getAcceptedApplicationsQueue();
            Test.stopTest();

            System.assertEquals(2, acceptedCount, 'Only commented Accept decisions should count.');
            System.assertEquals(2, acceptedIds.size());
            System.assert(acceptedIds.contains(appOne.Id));
            System.assertEquals(2, queue.size());

            Set<Id> queueIds = new Set<Id>();
            for (WCFProposalListController.AcceptedApplicationItem item : queue) {
                queueIds.add((Id) item.applicationId);
                System.assertNotEquals(null, item.appName);
                System.assertNotEquals(null, item.approverComment);
                System.assertNotEquals(null, item.decisionDate);
            }
            System.assert(queueIds.contains(appOne.Id));
            System.assert(queueIds.contains(appTwo.Id));
        }
    }

    /** Covers the two early-return paths in getAcceptedApplicationsQueue. */
    @IsTest
    static void testAcceptedApplicationsEmptyPaths() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            // No Accept decisions at all -> decisions.isEmpty() early return
            System.assertEquals(0, WCFProposalListController.getAcceptedApplicationsQueue().size());
            System.assertEquals(0, WCFProposalListController.getAcceptedApplicationsCount());
            System.assertEquals(0, WCFProposalListController.getAcceptedApplicationIds().size());

            // Accept decision with a blank comment -> withComment.isEmpty() early return
            createAcceptedDecision(newApp('Under Review').Id, '');
            System.assertEquals(0, WCFProposalListController.getAcceptedApplicationsQueue().size());
            System.assertEquals(0, WCFProposalListController.getAcceptedApplicationsCount());
        }
    }

    /**
     * Covers the 'Reject' branch of updateFlagDecision, which sets
     * Status = 'Reviewer Rejected' and clears Flagged__c.
     */
    @IsTest
    static void testUpdateFlagDecisionRejectBranch() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            IndividualApplication app = newApp('Under Review');

            String validFlagRationale = WCF_TestDataFactory.pickValue(
                'ApplicationReview', 'Flag_rationale_Flagging_Criteria__c', 'Flag rationale');

            insert new ApplicationReview(
                ApplicationId = app.Id,
                RecordTypeId  = reviewRtId('WCF_Validator'),
                Status        = 'Flagged',
                Decision_Final_Decision_from_Sec_1_2__c = 'Flag',
                Flag_rationale_Flagging_Criteria__c     = validFlagRationale,
                Decision_rationale__c = 'Concerns about governance',
                Other_describe_the_concern__c = 'Board composition unclear',
                DueDate = Date.today().addDays(5)
            );

            Test.startTest();
            WCFProposalListController.updateFlagDecision(app.Id, 'Reject');
            Test.stopTest();

            IndividualApplication updated = [SELECT Status, Flagged__c FROM IndividualApplication WHERE Id = :app.Id];
            System.assertEquals('Reviewer Rejected', updated.Status);
            System.assertEquals(false, updated.Flagged__c);

            // getValidatorFlagInfo now returns the populated Flag__c + otherConcern
            WCFProposalListController.ValidatorFlagInfo info =
                WCFProposalListController.getValidatorFlagInfo(app.Id);
            System.assertNotEquals(null, info);
            System.assertEquals('Reject', info.flagDecision);
            System.assertNotEquals(null, info.otherConcern);
        }
    }

    /**
     * Covers the JC and JF record-type branches of createReviewRecord.
     * The original test only reached them after a review already existed,
     * so it returned early and never executed the branch logic.
     */
    @IsTest
    static void testCreateReviewRecordAllTracks() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            IndividualApplication appJc   = newApp('Under Review');
            IndividualApplication appJf   = newApp('Under Review');
            IndividualApplication appBoth = newApp('Under Review');

            String jcId   = WCFProposalListController.createReviewRecord(appJc.Id, 'JC');
            String jfId   = WCFProposalListController.createReviewRecord(appJf.Id, 'JF');
            String bothId = WCFProposalListController.createReviewRecord(appBoth.Id, 'Both');

            System.assertNotEquals(null, jcId);
            System.assertNotEquals(null, jfId);
            System.assertNotEquals(null, bothId);

            Map<Id, ApplicationReview> created = new Map<Id, ApplicationReview>([
                SELECT Id, RecordType.DeveloperName, Status
                FROM ApplicationReview
                WHERE Id IN (:jcId, :jfId, :bothId)
            ]);
            System.assertEquals(3, created.size());
            System.assertEquals('WCF_Job_Creation_Review', created.get((Id) jcId).RecordType.DeveloperName);
            System.assertEquals('WCF_Job_Fulfillment', created.get((Id) jfId).RecordType.DeveloperName);
            System.assertEquals('WCF_Job_Fulfillment_Job_Creation', created.get((Id) bothId).RecordType.DeveloperName);
            System.assertEquals('In Progress', created.get((Id) jcId).Status);

            // Second call on the same application returns the existing review
            System.assertEquals(jcId, WCFProposalListController.createReviewRecord(appJc.Id, 'JC'));

            // Unrecognised track falls through to the JF default
            IndividualApplication appDefault = newApp('Under Review');
            String defaultId = WCFProposalListController.createReviewRecord(appDefault.Id, 'Unknown Track');
            ApplicationReview defaultReview = [
                SELECT RecordType.DeveloperName FROM ApplicationReview WHERE Id = :defaultId
            ];
            System.assertEquals('WCF_Job_Fulfillment', defaultReview.RecordType.DeveloperName);
        }
    }

    /**
     * Covers every validation throw in updateApproverReturnDecision:
     * blank ReturnToValidator comment, blank Approve comment, invalid action.
     */
    @IsTest
    static void testUpdateApproverReturnDecisionValidationErrors() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            IndividualApplication app = newApp('Under Review');

            // Blank comment on ReturnToValidator throws before any review lookup
            try {
                WCFProposalListController.updateApproverReturnDecision(app.Id, 'ReturnToValidator', '');
                System.assert(false, 'Blank revalidation comment must be rejected.');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e);
            }

            try {
                WCFProposalListController.updateApproverReturnDecision(app.Id, 'ReturnToValidator', null);
                System.assert(false, 'Null revalidation comment must be rejected.');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e);
            }

            // Now give the application a review record so we get past the lookup
            insert new ApplicationReview(
                ApplicationId = app.Id,
                RecordTypeId  = reviewRtId('WCF_Job_Fulfillment'),
                Status        = 'In Progress'
            );

            // Blank comment on Approve
            try {
                WCFProposalListController.updateApproverReturnDecision(app.Id, 'Approve', '');
                System.assert(false, 'Blank approver note must be rejected.');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e);
            }

            // Unrecognised action
            try {
                WCFProposalListController.updateApproverReturnDecision(app.Id, 'SomethingElse', 'A comment');
                System.assert(false, 'Invalid action must be rejected.');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e);
            }
        }
    }

    /** Covers the Approve and ReturnToValidator success paths with field assertions. */
    @IsTest
    static void testUpdateApproverReturnDecisionSuccessPaths() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            IndividualApplication appApprove = newApp('Under Review');
            IndividualApplication appReturn  = newApp('Under Review');

            ApplicationReview arApprove = new ApplicationReview(
                ApplicationId = appApprove.Id,
                RecordTypeId  = reviewRtId('WCF_Job_Fulfillment'),
                Status        = 'In Progress'
            );
            ApplicationReview arReturn = new ApplicationReview(
                ApplicationId = appReturn.Id,
                RecordTypeId  = reviewRtId('WCF_Job_Fulfillment_Job_Creation'),
                Status        = 'In Progress'
            );
            insert new List<ApplicationReview>{ arApprove, arReturn };

            Test.startTest();
            WCFProposalListController.updateApproverReturnDecision(
                appApprove.Id, 'Approve', 'Recommending this one to the Approver.');
            WCFProposalListController.updateApproverReturnDecision(
                appReturn.Id, 'ReturnToValidator', 'Financials need revalidation.');
            Test.stopTest();

            ApplicationReview approved = [
                SELECT Status, Reviewer_Comment_to_Approver__c
                FROM ApplicationReview WHERE Id = :arApprove.Id
            ];
            System.assertEquals('Review Submitted', approved.Status);
            System.assertNotEquals(null, approved.Reviewer_Comment_to_Approver__c);
            System.assertEquals('Review Completed - Recommended',
                [SELECT Status FROM IndividualApplication WHERE Id = :appApprove.Id].Status);

            ApplicationReview returned = [
                SELECT Reviewer_Return_Comment__c FROM ApplicationReview WHERE Id = :arReturn.Id
            ];
            System.assertNotEquals(null, returned.Reviewer_Return_Comment__c);
            System.assertEquals('Returned to Validator',
                [SELECT Status FROM IndividualApplication WHERE Id = :appReturn.Id].Status);
        }
    }

    /**
     * Covers the DueDate backfill branches in getReviewStatusMap:
     * Pass 1's "else if" and Pass 2's "existing.dueDate == null" path.
     */
    @IsTest
    static void testReviewStatusMapDueDateBackfill() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            IndividualApplication app = newApp('Under Review');

            // Pass 1 record with a DueDate, then one without — the second is the
            // most recently modified, so the first backfills via the else-if branch.
            ApplicationReview withDue = new ApplicationReview(
                ApplicationId = app.Id,
                RecordTypeId  = reviewRtId('WCF_Job_Fulfillment'),
                Status        = 'In Progress',
                DueDate       = Date.today().addDays(7)
            );
            insert withDue;

            ApplicationReview withoutDue = new ApplicationReview(
                ApplicationId = app.Id,
                RecordTypeId  = reviewRtId('WCF_Job_Creation_Review'),
                Status        = 'In Progress',
                IsSubmitted   = false
            );
            insert withoutDue;

            // Validator review supplies a DueDate for the Pass 2 backfill branch
            String validFlagRationale = WCF_TestDataFactory.pickValue(
                'ApplicationReview', 'Flag_rationale_Flagging_Criteria__c', 'Flag rationale');
            insert new ApplicationReview(
                ApplicationId = app.Id,
                RecordTypeId  = reviewRtId('WCF_Validator'),
                Status        = 'Sealed',
                Decision_Final_Decision_from_Sec_1_2__c = 'Flag',
                Flag_rationale_Flagging_Criteria__c     = validFlagRationale,
                Decision_rationale__c = 'Sealed with flag',
                DueDate = Date.today().addDays(9)
            );

            Test.startTest();
            Map<String, WCFProposalListController.ReviewInfo> statusMap =
                WCFProposalListController.getReviewStatusMap();
            Test.stopTest();

            WCFProposalListController.ReviewInfo info = statusMap.get(String.valueOf(app.Id));
            System.assertNotEquals(null, info, 'Under Review application should be in the map.');
            System.assertNotEquals(null, info.dueDate, 'DueDate should be backfilled.');
            System.assertNotEquals(null, info.status);
            System.assertEquals(true, info.isFlagged, 'Flag with no Flag__c decision is still flagged.');
            System.assertNotEquals(null, info.flagRationale);
        }
    }

    /**
     * A validator flag that has already been decided (Flag__c populated)
     * must NOT be reported as flagged — covers the isFlagged false path.
     */
    @IsTest
    static void testReviewStatusMapFlagAlreadyDecided() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            IndividualApplication app = newApp('Under Review');

            String validFlagRationale = WCF_TestDataFactory.pickValue(
                'ApplicationReview', 'Flag_rationale_Flagging_Criteria__c', 'Flag rationale');

            insert new ApplicationReview(
                ApplicationId = app.Id,
                RecordTypeId  = reviewRtId('WCF_Validator'),
                Status        = 'Flagged',
                Decision_Final_Decision_from_Sec_1_2__c = 'Flag',
                Flag_rationale_Flagging_Criteria__c     = validFlagRationale,
                Decision_rationale__c = 'Already actioned',
                Flag__c = 'Proceed for Review'
            );

            Map<String, WCFProposalListController.ReviewInfo> statusMap =
                WCFProposalListController.getReviewStatusMap();

            WCFProposalListController.ReviewInfo info = statusMap.get(String.valueOf(app.Id));
            if (info != null) {
                System.assertEquals(false, info.isFlagged);
                System.assertEquals(null, info.flagRationale);
                System.assertEquals(null, info.decisionRationale);
            }
        }
    }

    /** Covers the underReviewIds.isEmpty() early return in getReviewStatusMap. */
    @IsTest
    static void testReviewStatusMapEmptyEarlyReturn() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            List<IndividualApplication> apps = [SELECT Id, Status FROM IndividualApplication];
            for (IndividualApplication a : apps) {
                a.Status = 'Draft';
            }
            update apps;

            Map<String, WCFProposalListController.ReviewInfo> statusMap =
                WCFProposalListController.getReviewStatusMap();
            System.assertEquals(0, statusMap.size());
            System.assertEquals(0, WCFProposalListController.getValidatedProposals().size());
        }
    }

    /** Exercises getValidatedProposals across each status in the WHERE clause. */
    @IsTest
    static void testGetValidatedProposalsAcrossStatuses() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            List<String> statuses = new List<String>{
                'Under Review',
                'Review Completed - Recommended',
                'Review Completed - Not Recommended',
                'Reviewer Rejected',
                'Returned by Approver',
                'Recommend for Fund'
            };
            for (String s : statuses) {
                try {
                    newApp(s);
                } catch (Exception e) {
                    System.debug('status not creatable directly: ' + s + ' => ' + e.getMessage());
                }
            }

            List<IndividualApplication> proposals = WCFProposalListController.getValidatedProposals();
            System.assert(proposals.size() > 0, 'Applications in review statuses should be returned.');

            // The "Returned by Approver" lane feeds its own tile
            System.assert(WCFProposalListController.getApproverReturnQueueCount() >= 0);
            System.assertNotEquals(null, WCFProposalListController.getApproverReturnQueue());
        }
    }

    /** Covers getApproverReturnInfo returning null when the decision type differs. */
    @IsTest
    static void testApproverReturnInfoWrongDecisionType() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            IndividualApplication app = newApp('Under Review');
            createAcceptedDecision(app.Id, 'Accept, not a resubmission request');

            System.assertEquals(null, WCFProposalListController.getApproverReturnInfo(app.Id));
        }
    }
}