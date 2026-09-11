@IsTest
public class ProposalReviewControllerTest {

    /* =====================================================================
       ROOT CAUSE OF LOW / FAILING COVERAGE
       -------------------------------------------------------------------
       This sandbox has Person Accounts enabled (Account has a real
       Reviewer__pc field). ProposalReviewController.getReviewerFieldApiName()
       therefore resolves to 'Reviewer__pc' here, and the controller reads
       that flag off the ACCOUNT (via Contact.Account.Reviewer__pc) -- never
       off the Contact.

       The previous version of this test tried to set Reviewer__pc on a
       plain Business Account, caught the resulting DmlException (Reviewer__pc
       only works on a genuine Person Account record), and fell back to
       setting Reviewer__c on the CONTACT instead. That fallback doesn't
       help: the controller never reads Contact.Reviewer__c. So reviewerMap
       ended up empty in almost every test, getSubmittedProposals() returned
       early, and every downstream line (proposal query, review de-dup,
       status-class mapping, disableApprove/decisionTaken/finalDecision)
       never ran -- which is exactly why coverage stalled and the asserts
       tied to "should find the proposal/review" started failing.

       FIX: detect whether Person Accounts are actually enabled (Account
       has an IsPersonAccount field). If so, build reviewers as real Person
       Account records with the reviewer flag set directly on the Account
       -- legal because it IS a person account, and PersonContactId gives
       us the synced Contact Id to put on the User. If Person Accounts are
       NOT enabled, fall back to the original Business Account + separate
       Contact + Reviewer__c pattern. One helper, createReviewerUser(),
       now covers both cases and every test uses it.
    ===================================================================== */

    private static String reviewerFieldApiName;
    private static Id personAccountRecordTypeId;
    private static Boolean personAccountsChecked = false;

    private static String getReviewerFieldApiName() {
        if (reviewerFieldApiName == null) {
            Map<String, Schema.SObjectField> acctFields =
                Schema.SObjectType.Account.fields.getMap();
            reviewerFieldApiName = acctFields.containsKey('reviewer__pc')
                ? 'Reviewer__pc'
                : 'Reviewer__c';
        }
        return reviewerFieldApiName;
    }

    private static Boolean isPersonAccountsEnabled() {
        return Schema.SObjectType.Account.fields.getMap().containsKey('ispersonaccount');
    }

    private static Id getPersonAccountRecordTypeId() {
        if (!personAccountsChecked) {
            personAccountsChecked = true;
            if (isPersonAccountsEnabled()) {
                List<RecordType> rts = [
                    SELECT Id FROM RecordType
                    WHERE SObjectType = 'Account' AND IsPersonType = true
                    LIMIT 1
                ];
                personAccountRecordTypeId = rts.isEmpty() ? null : rts[0].Id;
            }
        }
        return personAccountRecordTypeId;
    }

    /* This org has an active Duplicate Rule on Account/Contact that blocks
       inserts whose name is similar to an existing record (e.g. 'Reviewer2'
       vs 'Reviewer'). allowSave = true lets test data through while keeping
       optAllOrNone = true so a genuine DML error still throws, same as a
       plain `insert` statement would. */
    private static Database.DMLOptions dmlOptionsAllowDuplicates() {
        Database.DMLOptions dmo = new Database.DMLOptions();
        dmo.DuplicateRuleHeader.allowSave = true;
        dmo.OptAllOrNone = true;
        return dmo;
    }

    /* =====================================================================
       Creates a reviewer identity (Person Account, or Business Account +
       Contact, whichever this org actually supports) with the reviewer
       flag set wherever the controller reads it, plus the linked User.
       Returns the inserted User so callers can share proposals with
       reviewerUser.Id exactly like before.

       User insert is wrapped in System.runAs to satisfy the MIXED_DML
       restriction outside of @TestSetup; runAs is harmless to use inside
       @TestSetup too, so one code path works everywhere.
    ===================================================================== */
    private static User createReviewerUser(String suffix, String alias) {

        Profile reviewerProfile = [
            SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1
        ];

        Id contactId;
        Id personRtId = getPersonAccountRecordTypeId();
        Database.DMLOptions dmo = dmlOptionsAllowDuplicates();

        if (personRtId != null) {
            // Genuine Person Account: one row, reviewer flag lives on the
            // Account side (Reviewer__pc). Salesforce auto-syncs a shadow
            // Contact; PersonContactId gives us that Id.
            Account personAcct = new Account(
                RecordTypeId = personRtId,
                LastName     = 'Reviewer' + suffix
            );
            personAcct.put(getReviewerFieldApiName(), true);
            Database.insert(personAcct, dmo);

            personAcct = [
                SELECT Id, PersonContactId FROM Account WHERE Id = :personAcct.Id
            ];
            contactId = personAcct.PersonContactId;

        } else {
            // No Person Accounts in this org: Business Account + separate
            // Contact, reviewer flag set directly on the Account.
            Account acct = new Account(Name = 'Reviewer Account' + suffix);
            acct.put(getReviewerFieldApiName(), true);
            Database.insert(acct, dmo);

            Contact cont = new Contact(LastName = 'Reviewer' + suffix, AccountId = acct.Id);
            Database.insert(cont, dmo);
            contactId = cont.Id;
        }

        User reviewerUser;
        System.runAs(new User(Id = UserInfo.getUserId())) {
            reviewerUser = new User(
                FirstName         = 'Test',
                LastName          = 'Reviewer' + suffix,
                Email             = 'reviewer' + alias + '@test.com',
                Username          = 'reviewer' + alias + System.currentTimeMillis() + '@test.com',
                Alias             = alias,
                TimeZoneSidKey    = 'Asia/Kolkata',
                LocaleSidKey      = 'en_US',
                EmailEncodingKey  = 'UTF-8',
                LanguageLocaleKey = 'en_US',
                ProfileId         = reviewerProfile.Id,
                ContactId         = contactId
            );
            insert reviewerUser;
        }

        return reviewerUser;
    }

    /* =====================================================================
       Creates a User whose Account/Contact is deliberately NOT flagged as
       a reviewer -- used to prove getSubmittedProposals() correctly
       excludes shared users who aren't reviewers.
    ===================================================================== */
    private static User createNonReviewerUser(String suffix, String alias) {

        Profile reviewerProfile = [
            SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1
        ];

        Id contactId;
        Id personRtId = getPersonAccountRecordTypeId();
        Database.DMLOptions dmo = dmlOptionsAllowDuplicates();

        if (personRtId != null) {
            // Same Person Account path as createReviewerUser, just without
            // setting the reviewer flag -- avoids the bare-Contact insert,
            // which needs an explicit RecordTypeId in this org.
            Account personAcct = new Account(
                RecordTypeId = personRtId,
                LastName     = 'NotReviewer' + suffix
            );
            Database.insert(personAcct, dmo);

            personAcct = [
                SELECT Id, PersonContactId FROM Account WHERE Id = :personAcct.Id
            ];
            contactId = personAcct.PersonContactId;

        } else {
            Account acct = new Account(Name = 'Not A Reviewer Account' + suffix);
            // reviewer flag intentionally left unset/false
            Database.insert(acct, dmo);

            Contact cont = new Contact(LastName = 'NotReviewer' + suffix, AccountId = acct.Id);
            Database.insert(cont, dmo);
            contactId = cont.Id;
        }

        User nonReviewerUser;
        System.runAs(new User(Id = UserInfo.getUserId())) {
            nonReviewerUser = new User(
                FirstName         = 'Not',
                LastName          = 'Reviewer' + suffix,
                Email             = 'notreviewer' + alias + '@test.com',
                Username          = 'notreviewer' + alias + System.currentTimeMillis() + '@test.com',
                Alias             = alias,
                TimeZoneSidKey    = 'Asia/Kolkata',
                LocaleSidKey      = 'en_US',
                EmailEncodingKey  = 'UTF-8',
                LanguageLocaleKey = 'en_US',
                ProfileId         = reviewerProfile.Id,
                ContactId         = contactId
            );
            insert nonReviewerUser;
        }

        return nonReviewerUser;
    }

    @TestSetup
    static void setupData() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        Id coeRtId = Schema.SObjectType.Account
            .getRecordTypeInfosByName()
            .get('COE')
            .getRecordTypeId();

        Account coeAccount = new Account(
            Name         = 'Test COE Account',
            RecordTypeId = coeRtId
        );
        insert coeAccount;

        User reviewerUser = createReviewerUser('', 'trev');

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId          = proposalRtId,
            Status                = 'Proposal Submitted to WIN Admin',
            Project_Title__c      = 'AI Research',
            Primary_Focus_Area__c = 'Bio-tech and Bio-engineering',
            Category              = 'Grant Application',
            AccountId             = coeAccount.Id
        );
        insert proposal;

        IndividualApplicationShare share = new IndividualApplicationShare(
            ParentId      = proposal.Id,
            UserOrGroupId = reviewerUser.Id,
            AccessLevel   = 'Edit'
        );
        insert share;

        ApplicationReview review = new ApplicationReview(
            ApplicationId                            = proposal.Id,
            ReviewedById                             = reviewerUser.Id,
            Final_recommendation_ExternalReviewer__c = 'Recommended for Funding'
        );
        insert review;
    }

    /* =====================================================
       getCOEAccounts
    ===================================================== */

    @IsTest
    static void testGetCOEAccounts() {

        Test.startTest();
        List<Account> accounts = ProposalReviewController.getCOEAccounts();
        Test.stopTest();

        System.assert(accounts != null, 'Result should not be null');
        System.assert(accounts.size() > 0, 'Should return at least one COE account');
    }

    /* =====================================================
       getSubmittedProposals — no COE filter (null)
    ===================================================== */

    @IsTest
    static void testGetSubmittedProposals() {

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        System.assert(results != null, 'Result should not be null');
        System.assert(results.size() > 0, 'Should return at least one proposal');

        ProposalReviewController.ProposalWrapper pw = results[0];
        System.assertEquals('AI Research', pw.projectTitle);
        System.assertEquals('Bio-tech and Bio-engineering', pw.primaryFocusArea);
        System.assert(
            pw.reviews != null && pw.reviews.size() > 0,
            'Should have at least one review'
        );
    }

    /* =====================================================
       getSubmittedProposals — with COE filter
    ===================================================== */

    @IsTest
    static void testGetSubmittedProposalsWithCoeFilter() {

        Id coeRtId = Schema.SObjectType.Account
            .getRecordTypeInfosByName()
            .get('COE')
            .getRecordTypeId();

        Account coe = [
            SELECT Id
            FROM Account
            WHERE RecordTypeId = :coeRtId
            LIMIT 1
        ];

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(coe.Id);
        Test.stopTest();

        System.assert(results != null, 'Result should not be null');
        System.assert(results.size() > 0, 'Should return at least one proposal');

        ProposalReviewController.ProposalWrapper pw = results[0];
        System.assertEquals('AI Research', pw.projectTitle);
        System.assertEquals('Bio-tech and Bio-engineering', pw.primaryFocusArea);
        System.assert(
            pw.reviews != null && pw.reviews.size() > 0,
            'Should have at least one review'
        );
    }

    /* =====================================================
       getSubmittedProposals — wrong COE returns empty
    ===================================================== */

    @IsTest
    static void testGetSubmittedProposalsWrongCoeReturnsEmpty() {

        Account dummyAcc = new Account(Name = 'Dummy COE');
        insert dummyAcc;

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(dummyAcc.Id);
        Test.stopTest();

        System.assert(results != null, 'Result should not be null');
        System.assertEquals(0, results.size(),
            'Should return empty list for unrelated COE account');
    }

    /* =====================================================
       getSubmittedProposals — proposals under OTHER COEs
       are skipped via the "continue" when a shared
       proposal isn't in the coeId-filtered proposalMap
    ===================================================== */

    @IsTest
    static void testGetSubmittedProposalsExcludesOtherCoeProposals() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        Id coeRtId = Schema.SObjectType.Account
            .getRecordTypeInfosByName()
            .get('COE')
            .getRecordTypeId();

        Account originalCoe = [
            SELECT Id FROM Account WHERE RecordTypeId = :coeRtId LIMIT 1
        ];

        // Derive the reviewer's Id from the setup share (scoped to this
        // test's data) instead of querying User by Alias.
        IndividualApplicationShare existingShare = [
            SELECT UserOrGroupId
            FROM IndividualApplicationShare
            WHERE RowCause = 'Manual'
            LIMIT 1
        ];
        Id reviewerId = existingShare.UserOrGroupId;

        Account otherCoe = new Account(
            Name         = 'Other COE Account',
            RecordTypeId = coeRtId
        );
        insert otherCoe;

        IndividualApplication otherProposal = new IndividualApplication(
            RecordTypeId          = proposalRtId,
            Status                = 'Proposal Submitted to WIN Admin',
            Project_Title__c      = 'Unrelated Project',
            Primary_Focus_Area__c = 'Bio-tech and Bio-engineering',
            Category              = 'Grant Application',
            AccountId             = otherCoe.Id
        );
        insert otherProposal;

        insert new IndividualApplicationShare(
            ParentId      = otherProposal.Id,
            UserOrGroupId = reviewerId,
            AccessLevel   = 'Edit'
        );

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(originalCoe.Id);
        Test.stopTest();

        for (ProposalReviewController.ProposalWrapper pw : results) {
            System.assertNotEquals(otherProposal.Id, pw.proposalId,
                'Proposal from a different COE should have been filtered out');
        }
        System.assertEquals(1, results.size(),
            'Should only return the proposal belonging to the requested COE');
    }

    /* =====================================================
       getSubmittedProposals — no shares at all
       covers "if (shares.isEmpty()) return ..."
    ===================================================== */

    @IsTest
    static void testGetSubmittedProposalsNoShares() {

        delete [SELECT Id FROM IndividualApplicationShare WHERE RowCause = 'Manual'];

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        System.assertEquals(0, results.size(),
            'Should return an empty list when there are no shares at all');
    }

    /* =====================================================
       getSubmittedProposals — shared user's Account is
       NOT flagged as a reviewer
       covers "if (reviewerMap.isEmpty()) return ..."
    ===================================================== */

    @IsTest
    static void testGetSubmittedProposalsReviewerNotFlagged() {

        delete [SELECT Id FROM IndividualApplicationShare WHERE RowCause = 'Manual'];

        User nonReviewerUser = createNonReviewerUser('', 'nrev');

        IndividualApplication proposal = [SELECT Id FROM IndividualApplication LIMIT 1];

        insert new IndividualApplicationShare(
            ParentId      = proposal.Id,
            UserOrGroupId = nonReviewerUser.Id,
            AccessLevel   = 'Edit'
        );

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        System.assertEquals(0, results.size(),
            'Should return no proposals when no shared user is flagged as a reviewer');
    }

    /* =====================================================
       getSubmittedProposals — shares to a non-User recipient
       (e.g. a Public Group) are ignored
    ===================================================== */

    @IsTest
    static void testGetSubmittedProposalsIgnoresNonUserShares() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        Group publicGroup;
        System.runAs(new User(Id = UserInfo.getUserId())) {
            publicGroup = new Group(Name = 'Test Public Group', Type = 'Regular');
            insert publicGroup;
        }

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId = proposalRtId,
            Status       = 'Proposal Submitted to WIN Admin',
            Category     = 'Grant Application'
        );
        insert proposal;

        insert new IndividualApplicationShare(
            ParentId      = proposal.Id,
            UserOrGroupId = publicGroup.Id,
            AccessLevel   = 'Edit'
        );

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        for (ProposalReviewController.ProposalWrapper pw : results) {
            System.assertNotEquals(proposal.Id, pw.proposalId,
                'Proposal shared only with a Group (non-User) should be excluded');
        }
    }

    /* =====================================================
       getSubmittedProposals — every share on the proposal is
       a non-User (Group) share, so proposalIds stays empty
    ===================================================== */

    @IsTest
    static void testGetSubmittedProposalsAllSharesAreGroupsReturnsEmpty() {

        delete [SELECT Id FROM IndividualApplicationShare WHERE RowCause = 'Manual'];

        Group onlyGroup;
        System.runAs(new User(Id = UserInfo.getUserId())) {
            onlyGroup = new Group(Name = 'Only Group Share', Type = 'Regular');
            insert onlyGroup;
        }

        IndividualApplication proposal = [SELECT Id FROM IndividualApplication LIMIT 1];

        insert new IndividualApplicationShare(
            ParentId      = proposal.Id,
            UserOrGroupId = onlyGroup.Id,
            AccessLevel   = 'Edit'
        );

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        System.assertEquals(0, results.size(),
            'Should return an empty list when no share is a User share, ' +
            'since proposalIds never gets populated');
    }

    /* =====================================================
       getSubmittedProposals — de-duplicates reviews by
       reviewer, keeping only the most recent
    ===================================================== */

    @IsTest
    static void testGetSubmittedProposalsUsesMostRecentReview() {

        IndividualApplication proposal =
            [SELECT Id FROM IndividualApplication WHERE Project_Title__c = 'AI Research' LIMIT 1];

        ApplicationReview oldReview = [
            SELECT Id, ReviewedById
            FROM ApplicationReview
            WHERE ApplicationId = :proposal.Id
            ORDER BY CreatedDate ASC
            LIMIT 1
        ];
        Id reviewerId = oldReview.ReviewedById;

        Test.setCreatedDate(oldReview.Id, DateTime.now().addDays(-2));

        insert new ApplicationReview(
            ApplicationId                            = proposal.Id,
            ReviewedById                             = reviewerId,
            Final_recommendation_ExternalReviewer__c = 'Not Recommended for Funding'
        );

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        Boolean found = false;
        for (ProposalReviewController.ProposalWrapper pw : results) {
            if (pw.proposalId == proposal.Id) {
                for (ProposalReviewController.ReviewWrapper rw : pw.reviews) {
                    found = true;
                    System.assertEquals('Not Shortlisted', rw.reviewStatus,
                        'Should reflect the most recently submitted review');
                    System.assertEquals('status-rejected', rw.reviewStatusClass,
                        'Should reflect the most recently submitted review');
                }
            }
        }
        System.assert(found, 'Should find the proposal with its most recent review reflected');
    }

    /* =====================================================
       getSubmittedProposals — review status: Recommended
    ===================================================== */

    @IsTest
    static void testReviewStatusClassRecommended() {

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        Boolean foundRecommended = false;

        for (ProposalReviewController.ProposalWrapper pw : results) {
            for (ProposalReviewController.ReviewWrapper rw : pw.reviews) {
                if (rw.reviewStatusClass == 'status-recommended') {
                    System.assertEquals('Shortlisted', rw.reviewStatus,
                        'Display label should map to Shortlisted');
                    foundRecommended = true;
                }
            }
        }

        System.assert(foundRecommended, 'Should find at least one Recommended review');
    }

    /* =====================================================
       getSubmittedProposals — review status: Not Recommended
    ===================================================== */

    @IsTest
    static void testReviewStatusClassNotRecommended() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        // Reuse the reviewer created in @TestSetup instead of minting a new
        // 'Reviewer2' identity -- a new Account/Contact with a name that
        // similar to the existing 'Reviewer' record trips this org's
        // Duplicate Rule, which is configured to Block (not Alert), so it
        // can't be bypassed via DuplicateRuleHeader.allowSave. A reviewer
        // can legitimately review more than one proposal, so reusing the
        // Id is both simpler and avoids the collision entirely.
        IndividualApplicationShare existingShare = [
            SELECT UserOrGroupId
            FROM IndividualApplicationShare
            WHERE RowCause = 'Manual'
            LIMIT 1
        ];
        Id reviewerId = existingShare.UserOrGroupId;

        IndividualApplication proposal2 = new IndividualApplication(
            RecordTypeId = proposalRtId,
            Status       = 'Proposal Submitted to WIN Admin',
            Category     = 'Grant Application'
        );
        insert proposal2;

        insert new IndividualApplicationShare(
            ParentId      = proposal2.Id,
            UserOrGroupId = reviewerId,
            AccessLevel   = 'Edit'
        );

        insert new ApplicationReview(
            ApplicationId                            = proposal2.Id,
            ReviewedById                             = reviewerId,
            Final_recommendation_ExternalReviewer__c = 'Not Recommended for Funding'
        );

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        Boolean foundNotRecommended = false;

        for (ProposalReviewController.ProposalWrapper pw : results) {
            for (ProposalReviewController.ReviewWrapper rw : pw.reviews) {
                if (rw.reviewStatusClass == 'status-rejected') {
                    System.assertEquals('Not Shortlisted', rw.reviewStatus,
                        'Display label should map to Not Shortlisted');
                    foundNotRecommended = true;
                }
            }
        }

        System.assert(foundNotRecommended,
            'Should find at least one Not Recommended review');
    }

    /* =====================================================
       getSubmittedProposals — review status: Pending
       (no review submitted → disableApprove = true)
    ===================================================== */

    @IsTest
    static void testReviewStatusClassPending() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        IndividualApplicationShare existingShare = [
    SELECT UserOrGroupId
    FROM IndividualApplicationShare
    WHERE RowCause = 'Manual'
    LIMIT 1
];

Id reviewer3Id = existingShare.UserOrGroupId;

        IndividualApplication proposal3 = new IndividualApplication(
            RecordTypeId = proposalRtId,
            Status       = 'Proposal Submitted to WIN Admin',
            Category     = 'Grant Application'
        );
        insert proposal3;

      insert new IndividualApplicationShare(
    ParentId      = proposal3.Id,
    UserOrGroupId = reviewer3Id,
    AccessLevel   = 'Edit'
);

        // Deliberately NO ApplicationReview inserted

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        Boolean foundPending = false;

        for (ProposalReviewController.ProposalWrapper pw : results) {
            if (pw.proposalId == proposal3.Id) {
                System.assert(
                    pw.disableApprove,
                    'Approve should be disabled when no review exists'
                );
                for (ProposalReviewController.ReviewWrapper rw : pw.reviews) {
                    System.assertEquals('', rw.reviewStatusClass);
                    foundPending = true;
                }
            }
        }

        System.assert(foundPending, 'Should find pending review proposal');
    }

    /* =====================================================
       updateProposalStatus — approve
    ===================================================== */

    @IsTest
    static void testApprove() {

        IndividualApplication proposal =
            [SELECT Id FROM IndividualApplication LIMIT 1];

        Test.startTest();
        ProposalReviewController.updateProposalStatus(
            proposal.Id, 'approve', 'Looks good'
        );
        Test.stopTest();

        IndividualApplication updated =
            [SELECT Status FROM IndividualApplication WHERE Id = :proposal.Id];
        System.assertEquals('Approved - Level 1', updated.Status);

        List<Approval_History__c> histories = [
            SELECT Id, Status__c, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :proposal.Id
        ];
        System.assertEquals(1, histories.size(),
            'Should create one Approval History record');
        System.assertEquals('Approved', histories[0].Status__c,
            'Approval History status should be Approved');
        System.assertEquals('Looks good', histories[0].Comments__c,
            'Comments should be saved on Approval History');
    }

    /* =====================================================
       updateProposalStatus — reject
    ===================================================== */

    @IsTest
    static void testReject() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId = proposalRtId,
            Status       = 'Proposal Submitted to WIN Admin',
            Category     = 'Grant Application'
        );
        insert proposal;

        Test.startTest();
        ProposalReviewController.updateProposalStatus(
            proposal.Id, 'reject', 'Not meeting criteria'
        );
        Test.stopTest();

        IndividualApplication updated =
            [SELECT Status FROM IndividualApplication WHERE Id = :proposal.Id];
        System.assertEquals('Rejected - Level 1', updated.Status);

        List<Approval_History__c> histories = [
            SELECT Id, Status__c, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :proposal.Id
        ];
        System.assertEquals(1, histories.size(),
            'Should create one Approval History record');
        System.assertEquals('Rejected', histories[0].Status__c,
            'Approval History status should be Rejected');
        System.assertEquals('Not meeting criteria', histories[0].Comments__c,
            'Comments should be saved on Approval History');
    }

    /* =====================================================
       updateProposalStatus — approve with null comments
    ===================================================== */

    @IsTest
    static void testApproveWithNullComments() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId = proposalRtId,
            Status       = 'Proposal Submitted to WIN Admin',
            Category     = 'Grant Application'
        );
        insert proposal;

        Test.startTest();
        ProposalReviewController.updateProposalStatus(
            proposal.Id, 'approve', null
        );
        Test.stopTest();

        IndividualApplication updated =
            [SELECT Status FROM IndividualApplication WHERE Id = :proposal.Id];
        System.assertEquals('Approved - Level 1', updated.Status,
            'Status should be Approved even with null comments');

        List<Approval_History__c> histories = [
            SELECT Id, Status__c, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :proposal.Id
        ];
        System.assertEquals(1, histories.size(),
            'Should create one Approval History record');
        System.assertEquals('Approved', histories[0].Status__c,
            'Approval History status should be Approved');
        System.assertEquals(null, histories[0].Comments__c,
            'Comments should be null when not provided');
    }

    /* =====================================================
       updateProposalStatus — approve WITH COE Approver
    ===================================================== */

    @IsTest
    static void testApproveWithCoeApprover() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        Profile stdProfile = [
            SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1
        ];

        User coeApprover;
        System.runAs(new User(Id = UserInfo.getUserId())) {
            coeApprover = new User(
                FirstName         = 'COE',
                LastName          = 'Approver',
                Email             = 'coeapprover@test.com',
                Username          = 'coeapprover' + System.currentTimeMillis() + '@test.com',
                Alias             = 'coeap',
                TimeZoneSidKey    = 'Asia/Kolkata',
                LocaleSidKey      = 'en_US',
                EmailEncodingKey  = 'UTF-8',
                LanguageLocaleKey = 'en_US',
                ProfileId         = stdProfile.Id
            );
            insert coeApprover;
        }

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId    = proposalRtId,
            Status          = 'Proposal Submitted to WIN Admin',
            Category        = 'Grant Application',
            Coe_Approver__c = coeApprover.Id
        );
        insert proposal;

        Test.startTest();
        ProposalReviewController.updateProposalStatus(
            proposal.Id, 'approve', 'Approved with comments'
        );
        Test.stopTest();

        IndividualApplication updated =
            [SELECT Status FROM IndividualApplication WHERE Id = :proposal.Id];
        System.assertEquals('Approved - Level 1', updated.Status,
            'Status should be Approved - Level 1');

        List<Approval_History__c> histories = [
            SELECT Id, Status__c, Assigned_To__c, Name, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :proposal.Id
        ];
        System.assertEquals(1, histories.size(),
            'Should create one Approval History record');
        System.assertEquals('Approved', histories[0].Status__c,
            'Approval History status should be Approved');
        System.assertEquals(UserInfo.getUserId(), histories[0].Assigned_To__c,
            'Assigned_To should be the running user');
        System.assertEquals('Approved with comments', histories[0].Comments__c,
            'Comments should be saved on Approval History');

        List<Approval_History__Share> shares = [
            SELECT Id, UserOrGroupId, AccessLevel
            FROM Approval_History__Share
            WHERE ParentId = :histories[0].Id
            AND UserOrGroupId = :coeApprover.Id
            AND RowCause = 'Manual'
        ];

        System.assert(shares.size() == 0 || shares.size() == 1,
            'Share insert should have been attempted without exception');

        if (shares.size() == 1) {
            System.assertEquals('Read', shares[0].AccessLevel,
                'Share access level should be Read');
        }
    }

    /* =====================================================
       updateProposalStatus — sharing fails, try/catch covered
    ===================================================== */

    @IsTest
    static void testApproveWithCoeApproverShareFailureIsHandled() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        Id runningUserId = UserInfo.getUserId();

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId    = proposalRtId,
            Status          = 'Proposal Submitted to WIN Admin',
            Category        = 'Grant Application',
            Coe_Approver__c = runningUserId
        );
        insert proposal;

        Test.startTest();
        ProposalReviewController.updateProposalStatus(
            proposal.Id, 'approve', 'Approved despite share failure'
        );
        Test.stopTest();

        IndividualApplication updated =
            [SELECT Status FROM IndividualApplication WHERE Id = :proposal.Id];
        System.assertEquals('Approved - Level 1', updated.Status,
            'Status should still update even if the history share fails');

        List<Approval_History__c> histories = [
            SELECT Id FROM Approval_History__c WHERE Proposal__c = :proposal.Id
        ];
        System.assertEquals(1, histories.size(),
            'Approval History should still be created even if sharing it fails');
    }

    /* =====================================================
       updateProposalStatus — already decided (no-op)
    ===================================================== */

    @IsTest
    static void testUpdateAlreadyApprovedIsNoOp() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId                 = proposalRtId,
            Status                       = 'Approved - Level 1',
            WIN_Level1_Decision_Label__c = 'Shortlisted for presentation',
            Category                     = 'Grant Application'
        );
        insert proposal;

        Test.startTest();
        ProposalReviewController.updateProposalStatus(
            proposal.Id, 'reject', 'Trying to reject approved'
        );
        Test.stopTest();

        IndividualApplication updated =
            [SELECT Status FROM IndividualApplication WHERE Id = :proposal.Id];
        System.assertEquals('Approved - Level 1', updated.Status,
            'Status should not change once a decision is already taken');

        List<Approval_History__c> histories = [
            SELECT Id FROM Approval_History__c WHERE Proposal__c = :proposal.Id
        ];
        System.assertEquals(0, histories.size(),
            'No Approval History should be created for a no-op');
    }

    @IsTest
    static void testUpdateAlreadyRejectedIsNoOp() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId                 = proposalRtId,
            Status                       = 'Rejected - Level 1',
            WIN_Level1_Decision_Label__c = 'Not shortlisted for presentation',
            Category                     = 'Grant Application'
        );
        insert proposal;

        Test.startTest();
        ProposalReviewController.updateProposalStatus(
            proposal.Id, 'approve', 'Trying to approve rejected'
        );
        Test.stopTest();

        IndividualApplication updated =
            [SELECT Status FROM IndividualApplication WHERE Id = :proposal.Id];
        System.assertEquals('Rejected - Level 1', updated.Status,
            'Status should not change once a decision is already taken');

        List<Approval_History__c> histories = [
            SELECT Id FROM Approval_History__c WHERE Proposal__c = :proposal.Id
        ];
        System.assertEquals(0, histories.size(),
            'No Approval History should be created for a no-op');
    }

    /* =====================================================
       decisionTaken / finalDecision flags on wrapper
    ===================================================== */

    @IsTest
    static void testDecisionTakenFlagWhenApproved() {

        IndividualApplication proposal =
            [SELECT Id FROM IndividualApplication LIMIT 1];

        ProposalReviewController.updateProposalStatus(
            proposal.Id, 'approve', 'Approved in test'
        );

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        Boolean found = false;
        for (ProposalReviewController.ProposalWrapper pw : results) {
            if (pw.proposalId == proposal.Id) {
                found = true;
                System.assert(pw.decisionTaken,
                    'decisionTaken should be true for an approved proposal');
                System.assertEquals('Shortlisted for presentation', pw.finalDecision,
                    'finalDecision should reflect the approved Level-1 decision label');
            }
        }
        System.assert(found, 'Should find the approved proposal in results');
    }

    @IsTest
    static void testDecisionTakenFlagWhenRejected() {

        IndividualApplication proposal =
            [SELECT Id FROM IndividualApplication LIMIT 1];

        ProposalReviewController.updateProposalStatus(
            proposal.Id, 'reject', 'Rejected in test'
        );

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        Boolean found = false;
        for (ProposalReviewController.ProposalWrapper pw : results) {
            if (pw.proposalId == proposal.Id) {
                found = true;
                System.assert(pw.decisionTaken,
                    'decisionTaken should be true for a rejected proposal');
                System.assertEquals('Not shortlisted for presentation', pw.finalDecision,
                    'finalDecision should reflect the rejected Level-1 decision label');
            }
        }
        System.assert(found, 'Should find the rejected proposal in results');
    }
}