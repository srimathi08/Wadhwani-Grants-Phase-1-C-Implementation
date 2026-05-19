@isTest
private class ReviewerStatsHelperTest {

    @TestSetup
    static void makeData() {
        Account reviewerAccount = new Account(
            Name = 'Test Reviewer',
            Reviewer__c = true,
            Reviewer_Registered__c = true
        );
        insert reviewerAccount;

        IndividualApplication app = new IndividualApplication(
            Category = 'Grant Application'
        );
        insert app;
    }

    @isTest
    static void testRecalculateOnReviewInsert() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Reviewer' LIMIT 1];
        IndividualApplication app = [SELECT Id FROM IndividualApplication LIMIT 1];

        ApplicationReview review = new ApplicationReview(
            Reviewer__c = acc.Id,
            ApplicationId = app.Id,
            Status = 'Review Submitted'
        );

        Test.startTest();
        insert review;
        Test.stopTest();

        Account updatedAcc = [
            SELECT Proposals_Reviewed__c
            FROM Account WHERE Id = :acc.Id
        ];
        System.assertEquals(1, (Integer) updatedAcc.Proposals_Reviewed__c,
            'Proposals_Reviewed__c should be 1');
    }

    @isTest
    static void testRecalculateOnReviewDelete() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Reviewer' LIMIT 1];
        IndividualApplication app = [SELECT Id FROM IndividualApplication LIMIT 1];

        ApplicationReview review = new ApplicationReview(
            Reviewer__c = acc.Id,
            ApplicationId = app.Id,
            Status = 'Review Submitted'
        );
        insert review;

        Test.startTest();
        delete review;
        Test.stopTest();

        Account updatedAcc = [
            SELECT Proposals_Reviewed__c
            FROM Account WHERE Id = :acc.Id
        ];
        System.assertEquals(0, (Integer) updatedAcc.Proposals_Reviewed__c,
            'Proposals_Reviewed__c should be 0 after delete');
    }

    @isTest
    static void testSchedulable() {
        Test.startTest();
        System.schedule('TestProposalShareSync', '0 0 * * * ?',
            new ProposalShareSyncSchedulable());
        Test.stopTest();
        System.assert(true, 'Schedulable ran without error');
    }

    @isTest
    static void testEmptyAccountIds() {
        Test.startTest();
        ReviewerStatsHelper.recalculateStats(new Set<Id>());
        Test.stopTest();
        System.assert(true, 'No exception on empty set');
    }
}