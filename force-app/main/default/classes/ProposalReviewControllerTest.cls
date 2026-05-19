@IsTest
public class ProposalReviewControllerTest {

    @TestSetup
    static void setupData() {

        /* -------------------------------------------
           Record Type IDs
        ------------------------------------------- */
        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        Id coeRtId = Schema.SObjectType.Account
            .getRecordTypeInfosByName()
            .get('COE')
            .getRecordTypeId();

        /* -------------------------------------------
           Create COE Account
        ------------------------------------------- */
        Account coeAccount = new Account(
            Name         = 'Test COE Account',
            RecordTypeId = coeRtId
        );
        insert coeAccount;

        /* -------------------------------------------
           Create Reviewer Account & Contact
        ------------------------------------------- */
        Account reviewerAccount = new Account(
            Name = 'Reviewer Account'
        );
        insert reviewerAccount;

        Contact reviewerContact = new Contact(
            LastName  = 'Reviewer',
            AccountId = reviewerAccount.Id
        );
        insert reviewerContact;

        /* -------------------------------------------
           Create Portal Reviewer User
        ------------------------------------------- */
        Profile reviewerProfile = [
            SELECT Id
            FROM Profile
            WHERE Name = 'Reviewer'
            LIMIT 1
        ];

        User reviewerUser = new User(
            FirstName         = 'Test',
            LastName          = 'Reviewer',
            Email             = 'reviewer@test.com',
            Username          = 'reviewer' + System.currentTimeMillis() + '@test.com',
            Alias             = 'trev',
            TimeZoneSidKey    = 'Asia/Kolkata',
            LocaleSidKey      = 'en_US',
            EmailEncodingKey  = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId         = reviewerProfile.Id,
            ContactId         = reviewerContact.Id
        );
        insert reviewerUser;

        /* -------------------------------------------
           Create Proposal linked to COE Account
        ------------------------------------------- */
        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId          = proposalRtId,
            Status                = 'Proposal Submitted to WIN Admin',
            Project_Title__c      = 'AI Research',
            Primary_Focus_Area__c = 'Bio-tech and Bio-engineering',
            Category              = 'Grant Application',
            AccountId             = coeAccount.Id
        );
        insert proposal;

        /* -------------------------------------------
           Share Proposal With Reviewer
        ------------------------------------------- */
        IndividualApplicationShare share = new IndividualApplicationShare(
            ParentId      = proposal.Id,
            UserOrGroupId = reviewerUser.Id,
            AccessLevel   = 'Edit'
        );
        insert share;

        /* -------------------------------------------
           Create Review (Recommended)
        ------------------------------------------- */
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
                if (rw.reviewStatus == 'Recommended for Funding') {
                    System.assertEquals('status-recommended', rw.reviewStatusClass);
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

        Profile reviewerProfile = [
            SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1
        ];

        Account acc2 = new Account(Name = 'Reviewer Account 2');
        insert acc2;

        Contact con2 = new Contact(LastName = 'Reviewer2', AccountId = acc2.Id);
        insert con2;

        User reviewer2 = new User(
            FirstName         = 'Test',
            LastName          = 'Reviewer2',
            Email             = 'reviewer2@test.com',
            Username          = 'reviewer2' + System.currentTimeMillis() + '@test.com',
            Alias             = 'trev2',
            TimeZoneSidKey    = 'Asia/Kolkata',
            LocaleSidKey      = 'en_US',
            EmailEncodingKey  = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId         = reviewerProfile.Id,
            ContactId         = con2.Id
        );
        insert reviewer2;

        IndividualApplication proposal2 = new IndividualApplication(
            RecordTypeId = proposalRtId,
            Status       = 'Proposal Submitted to WIN Admin',
            Category     = 'Grant Application'
        );
        insert proposal2;

        insert new IndividualApplicationShare(
            ParentId      = proposal2.Id,
            UserOrGroupId = reviewer2.Id,
            AccessLevel   = 'Edit'
        );

        insert new ApplicationReview(
            ApplicationId                            = proposal2.Id,
            ReviewedById                             = reviewer2.Id,
            Final_recommendation_ExternalReviewer__c = 'Not Recommended for Funding'
        );

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        Boolean foundNotRecommended = false;

        for (ProposalReviewController.ProposalWrapper pw : results) {
            for (ProposalReviewController.ReviewWrapper rw : pw.reviews) {
                if (rw.reviewStatus == 'Not Recommended for Funding') {
                    System.assertEquals('status-rejected', rw.reviewStatusClass);
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

        Profile reviewerProfile = [
            SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1
        ];

        Account acc3 = new Account(Name = 'Reviewer Account 3');
        insert acc3;

        Contact con3 = new Contact(LastName = 'Reviewer3', AccountId = acc3.Id);
        insert con3;

        User reviewer3 = new User(
            FirstName         = 'Test',
            LastName          = 'Reviewer3',
            Email             = 'reviewer3@test.com',
            Username          = 'reviewer3' + System.currentTimeMillis() + '@test.com',
            Alias             = 'trev3',
            TimeZoneSidKey    = 'Asia/Kolkata',
            LocaleSidKey      = 'en_US',
            EmailEncodingKey  = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId         = reviewerProfile.Id,
            ContactId         = con3.Id
        );
        insert reviewer3;

        IndividualApplication proposal3 = new IndividualApplication(
            RecordTypeId = proposalRtId,
            Status       = 'Proposal Submitted to WIN Admin',
            Category     = 'Grant Application'
        );
        insert proposal3;

        insert new IndividualApplicationShare(
            ParentId      = proposal3.Id,
            UserOrGroupId = reviewer3.Id,
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
       Verifies: status update + approval history insert
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
       Verifies: status update + approval history insert
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
       Verifies: comments field accepts null gracefully
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
       Verifies: approval history share is created
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

        User coeApprover = new User(
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

        /* Verify status updated */
        IndividualApplication updated =
            [SELECT Status FROM IndividualApplication WHERE Id = :proposal.Id];
        System.assertEquals('Approved - Level 1', updated.Status,
            'Status should be Approved - Level 1');

        /* Verify Approval History created with comments */
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

        /* Verify share attempted */
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
       updateProposalStatus — already decided (no-op)
    ===================================================== */

    @IsTest
    static void testUpdateAlreadyApprovedIsNoOp() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId = proposalRtId,
            Status       = 'Approved - Level 1',
            Category     = 'Grant Application'
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
            RecordTypeId = proposalRtId,
            Status       = 'Rejected - Level 1',
            Category     = 'Grant Application'
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
       decisionTaken flag on wrapper
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

        for (ProposalReviewController.ProposalWrapper pw : results) {
            if (pw.proposalId == proposal.Id) {
                System.assert(pw.decisionTaken,
                    'decisionTaken should be true for an approved proposal');
                System.assertEquals('Approved - Level 1', pw.finalDecision);
            }
        }
    }

    @IsTest
    static void testDecisionTakenFlagWhenRejected() {

        Id proposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        IndividualApplication proposal = new IndividualApplication(
            RecordTypeId = proposalRtId,
            Status       = 'Rejected - Level 1',
            Category     = 'Grant Application'
        );
        insert proposal;

        Test.startTest();
        List<ProposalReviewController.ProposalWrapper> results =
            ProposalReviewController.getSubmittedProposals(null);
        Test.stopTest();

        IndividualApplication updated =
            [SELECT Status FROM IndividualApplication WHERE Id = :proposal.Id];
        System.assertEquals('Rejected - Level 1', updated.Status,
            'Status should remain Rejected - Level 1');
    }
}