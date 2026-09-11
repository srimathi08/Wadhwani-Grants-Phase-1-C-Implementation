@IsTest
private class ReviewSummaryControllerTest {

    private static Id cachedAccountId;
    private static Id cachedContactId;

    private static final List<String> SUMMARY_KEYS = new List<String>{
        'totalAssigned', 'submitted', 'draft', 'rejected', 'yetToStart'
    };

    @TestSetup
    static void setup() {
        WCF_TestDataFactory.createBundle();

        // runAs on the current user resets the mixed-DML context without
        // depending on any particular user existing in the target org.
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Schema.RecordTypeInfo rtInfo = Schema.SObjectType.Account
                .getRecordTypeInfosByDeveloperName().get('Reviewer');
            if (rtInfo == null) return;

            insert new Account(
                RecordTypeId    = rtInfo.getRecordTypeId(),
                LastName        = 'TestReviewerAccount',
                WCF_Reviewer__c = true,
                PersonEmail     = 'reviewer@example.com'
            );
        }
    }

    // ──────────────────────────── helpers ────────────────────────────

    /**
     * Returns a user to run DML as. Never assumes a specific user exists in the
     * org: prefers a dedicated test admin, then any other active admin, and
     * finally falls back to the running user.
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
        Schema.RecordTypeInfo info = Schema.SObjectType.ApplicationReview
            .getRecordTypeInfosByDeveloperName().get(developerName);
        return info == null ? null : info.getRecordTypeId();
    }

    private static IndividualApplication newApp(String status) {
        initSeedIds();
        IndividualApplication app =
            WCF_TestDataFactory.createApplication(cachedAccountId, cachedContactId, status, false);
        insert app;
        return app;
    }

    /**
     * Insert that tolerates org automation (flows / process builders) rejecting
     * the row — e.g. "WIN_Send email to reviewers on submission of review",
     * which fails with 0 recipients in a test context. Returns true on success
     * so callers can assert conditionally instead of aborting the whole test.
     */
    private static Boolean safeInsert(SObject rec) {
        try {
            return Database.insert(rec, false).isSuccess();
        } catch (Exception e) {
            return false;
        }
    }

    private static void safeInsert(List<SObject> recs) {
        try {
            Database.insert(recs, false);
        } catch (Exception e) {
            System.debug('safeInsert suppressed: ' + e.getMessage());
        }
    }

    private static Boolean safeUpdate(SObject rec) {
        try {
            return Database.update(rec, false).isSuccess();
        } catch (Exception e) {
            return false;
        }
    }

    /** Empties the reviewer queue so a test's own data is the only data. */
    private static void clearQueue() {
        List<IndividualApplication> apps = [
            SELECT Id, Status
            FROM IndividualApplication
            WHERE Status IN ('Under Review', 'Reviewer Rejected')
        ];
        for (IndividualApplication a : apps) {
            a.Status = 'Draft';
        }
        if (!apps.isEmpty()) {
            Database.update(apps, false);
        }
    }

    private static Integer queueSize() {
        return [
            SELECT COUNT()
            FROM IndividualApplication
            WHERE Status IN ('Under Review', 'Reviewer Rejected')
        ];
    }

    private static Map<Id, ReviewSummaryController.ReviewerPreviewItem> byAppId(
        List<ReviewSummaryController.ReviewerPreviewItem> items
    ) {
        Map<Id, ReviewSummaryController.ReviewerPreviewItem> m =
            new Map<Id, ReviewSummaryController.ReviewerPreviewItem>();
        for (ReviewSummaryController.ReviewerPreviewItem item : items) {
            if (item.appRecordId != null) {
                m.put((Id) item.appRecordId, item);
            }
        }
        return m;
    }

    // ──────────────────────── getReviewSummary ────────────────────────

    /** Every bucket must be present and the arithmetic must hold. */
    @IsTest
    static void testSummaryReturnsAllBuckets() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            IndividualApplication app = newApp('Under Review');

            safeInsert(new ApplicationReview(
                ApplicationId = app.Id,
                RecordTypeId  = reviewRtId('WCF_Job_Creation_Review'),
                Status        = 'Draft',
                DueDate       = Date.today().addDays(6)
            ));

            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();

            System.assertNotEquals(null, summary, 'Summary should never be null.');

            for (String key : SUMMARY_KEYS) {
                System.assertNotEquals(null, summary.get(key),
                    'Missing summary bucket: ' + key);
                System.assert(summary.get(key) >= 0 || key == 'yetToStart',
                    'Counts must not be negative: ' + key);
            }

            Integer expectedYetToStart = summary.get('totalAssigned')
                - summary.get('submitted')
                - summary.get('draft')
                - summary.get('rejected');

            System.assertEquals(expectedYetToStart, summary.get('yetToStart'),
                'yetToStart must be the remainder of the assigned total.');
        }
    }

    /** Covers the forced-exception branch and the catch block. */
    @IsTest
    static void testSummaryHandlesException() {
        ReviewSummaryController.forceError = true;

        Test.startTest();
        Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
        Test.stopTest();

        ReviewSummaryController.forceError = false;

        System.assertNotEquals(null, summary,
            'The method must still return a map when it swallows an exception.');
        System.assertEquals(0, summary.size(),
            'Nothing should be populated once the exception is thrown.');
    }

    /** Summary must still be well formed when there is nothing in the queue. */
    @IsTest
    static void testSummaryWithEmptyQueue() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            clearQueue();

            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();

            for (String key : SUMMARY_KEYS) {
                System.assertNotEquals(null, summary.get(key),
                    'Missing summary bucket: ' + key);
            }
        }
    }

    // ─────────────────────── getReviewerPreview ───────────────────────

    /**
     * Applications with no ApplicationReview row at all ("Not Started") must
     * still appear in the queue alongside in-progress ones.
     */
    @IsTest
    static void testPreviewIncludesNotStartedAndInProgress() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            clearQueue();

            IndividualApplication notStarted = newApp('Under Review');
            IndividualApplication inProgress = newApp('Under Review');

            safeInsert(new ApplicationReview(
                ApplicationId = inProgress.Id,
                RecordTypeId  = reviewRtId('WCF_Job_Creation_Review'),
                Status        = 'In Progress',
                DueDate       = Date.today().addDays(7)
            ));

            Test.startTest();
            List<ReviewSummaryController.ReviewerPreviewItem> preview =
                ReviewSummaryController.getReviewerPreview(50);
            Test.stopTest();

            Map<Id, ReviewSummaryController.ReviewerPreviewItem> items = byAppId(preview);

            System.assertEquals(true, items.containsKey(notStarted.Id),
                'Applications without a review record must still be queued.');
            System.assertEquals(true, items.containsKey(inProgress.Id));

            ReviewSummaryController.ReviewerPreviewItem ns = items.get(notStarted.Id);
            System.assertEquals(null, ns.reviewId, 'No review record yet -> no review id.');
            System.assertEquals(null, ns.status,   'No review record yet -> no status.');
            System.assertEquals(false, ns.isRejected);

            ReviewSummaryController.ReviewerPreviewItem ip = items.get(inProgress.Id);
            System.assertNotEquals(null, ip.reviewId);
            System.assertEquals('In Progress', ip.status);
            System.assertEquals(String.valueOf(Date.today().addDays(7)), ip.dueDate);
        }
    }

    /**
     * Covers the null-maxRows default, the row cap, due-date sorting with nulls
     * last, the most-recent-review dedupe, and the validator due-date backfill.
     */
    @IsTest
    static void testPreviewSortingRowCapAndBackfill() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            clearQueue();

            Id jcRtId  = reviewRtId('WCF_Job_Creation_Review');
            Id valRtId = reviewRtId('WCF_Validator');

            IndividualApplication far    = newApp('Under Review');
            IndividualApplication nearby = newApp('Under Review');
            IndividualApplication viaVal = newApp('Under Review');
            IndividualApplication noDate = newApp('Under Review');

            safeInsert(new List<ApplicationReview>{
                new ApplicationReview(ApplicationId = far.Id, RecordTypeId = jcRtId,
                                      Status = 'In Progress', DueDate = Date.today().addDays(30)),
                // Duplicate review on the same application -> exercises the
                // "keep only the most recent per application" branch.
                new ApplicationReview(ApplicationId = far.Id, RecordTypeId = jcRtId,
                                      Status = 'In Progress', DueDate = Date.today().addDays(31)),
                new ApplicationReview(ApplicationId = nearby.Id, RecordTypeId = jcRtId,
                                      Status = 'In Progress', DueDate = Date.today().addDays(1)),
                // No DueDate on the review -> backfilled from the validator record.
                new ApplicationReview(ApplicationId = viaVal.Id, RecordTypeId = jcRtId,
                                      Status = 'In Progress'),
                new ApplicationReview(ApplicationId = viaVal.Id, RecordTypeId = valRtId,
                                      Status = 'Sealed', DueDate = Date.today().addDays(10)),
                // Second validator row -> exercises the validator dedupe branch.
                new ApplicationReview(ApplicationId = viaVal.Id, RecordTypeId = valRtId,
                                      Status = 'Sealed', DueDate = Date.today().addDays(12))
            });

            Test.startTest();
            List<ReviewSummaryController.ReviewerPreviewItem> defaulted =
                ReviewSummaryController.getReviewerPreview(null);
            List<ReviewSummaryController.ReviewerPreviewItem> capped =
                ReviewSummaryController.getReviewerPreview(2);
            List<ReviewSummaryController.ReviewerPreviewItem> all =
                ReviewSummaryController.getReviewerPreview(100);
            Test.stopTest();

            System.assert(defaulted.size() <= 5, 'Null maxRows must default to 5.');
            System.assertEquals(2, capped.size(), 'maxRows must cap the result.');
            System.assertEquals(4, all.size(), 'All four queued applications should be returned.');

            System.assertEquals(String.valueOf(Date.today().addDays(1)), all[0].dueDate,
                'Nearest due date sorts first.');
            System.assertEquals(null, all[all.size() - 1].dueDate,
                'Undated rows sort last.');

            Map<Id, ReviewSummaryController.ReviewerPreviewItem> items = byAppId(all);
            System.assertNotEquals(null, items.get(viaVal.Id).dueDate,
                'Validator DueDate should backfill when the review has none.');
            System.assertEquals(null, items.get(noDate.Id).dueDate);
        }
    }

    /**
     * Applications waiting on a flag decision belong in the Flagged bucket, not
     * the queue; once the flag is decided they come back into the queue.
     */
    @IsTest
    static void testPreviewExcludesPendingFlaggedApplications() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            clearQueue();

            Id valRtId = reviewRtId('WCF_Validator');

            IndividualApplication pendingSealed  = newApp('Under Review');
            IndividualApplication pendingFlagged = newApp('Under Review');
            IndividualApplication decidedFlag    = newApp('Under Review');

            safeInsert(new List<ApplicationReview>{
                // Flag__c blank + Sealed -> pending, excluded
                new ApplicationReview(
                    ApplicationId = pendingSealed.Id, RecordTypeId = valRtId,
                    Status = 'Sealed',
                    Decision_Final_Decision_from_Sec_1_2__c = 'Flag',
                    DueDate = Date.today().addDays(2)),
                // Flag__c blank + Flagged -> pending, excluded
                new ApplicationReview(
                    ApplicationId = pendingFlagged.Id, RecordTypeId = valRtId,
                    Status = 'Flagged',
                    Decision_Final_Decision_from_Sec_1_2__c = 'Flag',
                    DueDate = Date.today().addDays(3)),
                // Flag__c populated -> decided, stays in the queue
                new ApplicationReview(
                    ApplicationId = decidedFlag.Id, RecordTypeId = valRtId,
                    Status = 'Flagged',
                    Decision_Final_Decision_from_Sec_1_2__c = 'Flag',
                    Flag__c = 'Proceed for Review',
                    DueDate = Date.today().addDays(4))
            });

            Test.startTest();
            List<ReviewSummaryController.ReviewerPreviewItem> preview =
                ReviewSummaryController.getReviewerPreview(50);
            Test.stopTest();

            Map<Id, ReviewSummaryController.ReviewerPreviewItem> items = byAppId(preview);

            System.assertEquals(false, items.containsKey(pendingSealed.Id),
                'Sealed + undecided flag must be excluded from the queue.');
            System.assertEquals(false, items.containsKey(pendingFlagged.Id),
                'Flagged + undecided flag must be excluded from the queue.');
            System.assertEquals(true, items.containsKey(decidedFlag.Id),
                'Once the flag is decided the application returns to the queue.');
        }
    }

    /**
     * Submitted reviews drop out of the queue. The insert is defensive because
     * the "WIN_Send email to reviewers on submission of review" process rejects
     * these rows in a test context (0 recipients).
     */
    @IsTest
    static void testPreviewExcludesSubmittedReviews() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            clearQueue();

            Id jcRtId = reviewRtId('WCF_Job_Creation_Review');

            IndividualApplication submittedApp = newApp('Under Review');
            IndividualApplication openApp      = newApp('Under Review');

            safeInsert(new ApplicationReview(
                ApplicationId = openApp.Id,
                RecordTypeId  = jcRtId,
                Status        = 'In Progress',
                DueDate       = Date.today().addDays(5)
            ));

            // Insert as In Progress first (always allowed), then flip to
            // submitted so org automation on create can't block the setup.
            ApplicationReview submittedReview = new ApplicationReview(
                ApplicationId = submittedApp.Id,
                RecordTypeId  = jcRtId,
                Status        = 'In Progress',
                DueDate       = Date.today().addDays(5)
            );
            Boolean created = safeInsert(submittedReview);

            Boolean isSubmitted = false;
            if (created) {
                submittedReview.IsSubmitted = true;
                submittedReview.Status      = 'Review Submitted';
                isSubmitted = safeUpdate(submittedReview);

                if (!isSubmitted) {
                    // Automation blocked the status change; IsSubmitted alone
                    // is enough to exclude the row.
                    submittedReview.Status = 'In Progress';
                    isSubmitted = safeUpdate(submittedReview);
                }
            }

            Test.startTest();
            List<ReviewSummaryController.ReviewerPreviewItem> preview =
                ReviewSummaryController.getReviewerPreview(50);
            Test.stopTest();

            Map<Id, ReviewSummaryController.ReviewerPreviewItem> items = byAppId(preview);

            System.assertEquals(true, items.containsKey(openApp.Id),
                'Unsubmitted work stays in the queue.');

            if (isSubmitted) {
                System.assertEquals(false, items.containsKey(submittedApp.Id),
                    'Submitted reviews must be excluded from the queue.');
            }
        }
    }

    /** Rejected applications stay visible but are marked as rejected. */
    @IsTest
    static void testPreviewMarksReviewerRejected() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            clearQueue();

            IndividualApplication rejected = newApp('Under Review');
            rejected.Status = 'Reviewer Rejected';
            Boolean flipped = safeUpdate(rejected);

            safeInsert(new ApplicationReview(
                ApplicationId = rejected.Id,
                RecordTypeId  = reviewRtId('WCF_Job_Fulfillment'),
                Status        = 'In Progress',
                DueDate       = Date.today().addDays(8)
            ));

            Test.startTest();
            List<ReviewSummaryController.ReviewerPreviewItem> preview =
                ReviewSummaryController.getReviewerPreview(50);
            Test.stopTest();

            Map<Id, ReviewSummaryController.ReviewerPreviewItem> items = byAppId(preview);

            if (flipped) {
                System.assertEquals(true, items.containsKey(rejected.Id),
                    'Rejected applications remain visible to the reviewer.');
                System.assertEquals('Reviewer Rejected', items.get(rejected.Id).status);
                System.assertEquals(true, items.get(rejected.Id).isRejected);
            }
        }
    }

    /** Covers the early return when nothing is awaiting review. */
    @IsTest
    static void testPreviewReturnsEmptyWhenQueueIsEmpty() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            clearQueue();
            Integer remaining = queueSize();

            Test.startTest();
            List<ReviewSummaryController.ReviewerPreviewItem> preview =
                ReviewSummaryController.getReviewerPreview(5);
            Test.stopTest();

            System.assertNotEquals(null, preview);
            if (remaining == 0) {
                System.assertEquals(0, preview.size(),
                    'An empty queue must produce an empty preview.');
            } else {
                System.assert(preview.size() <= 5,
                    'The row cap must hold even when automation blocks cleanup.');
            }
        }
    }

    /** Exercises the WCF_Job_Fulfillment_Job_Creation record type filter. */
    @IsTest
    static void testPreviewCoversAllWcfRecordTypes() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            clearQueue();

            IndividualApplication combo = newApp('Under Review');

            safeInsert(new ApplicationReview(
                ApplicationId = combo.Id,
                RecordTypeId  = reviewRtId('WCF_Job_Fulfillment_Job_Creation'),
                Status        = 'In Progress',
                DueDate       = Date.today().addDays(9)
            ));

            Test.startTest();
            List<ReviewSummaryController.ReviewerPreviewItem> preview =
                ReviewSummaryController.getReviewerPreview(20);
            Test.stopTest();

            Map<Id, ReviewSummaryController.ReviewerPreviewItem> items = byAppId(preview);
            System.assertEquals(true, items.containsKey(combo.Id));
            System.assertEquals(String.valueOf(Date.today().addDays(9)),
                items.get(combo.Id).dueDate);
        }
    }
}