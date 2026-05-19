@IsTest
public class ReviewerReportServiceTest {

    /* =====================================================
       TEST DATA SETUP
    ===================================================== */
    @TestSetup
    static void setupData() {

        /* ---------------- Record Type ---------------- */
        Id projectProposalRtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        /* ---------------- Account (COE) ---------------- */
        Account acc = new Account(
            Name = 'Test COE'
        );
        insert acc;

        /* ---------------- Contact ---------------- */
        Contact c = new Contact(
            LastName = 'Reviewer Contact',
            AccountId = acc.Id
        );
        insert c;

        /* ---------------- Reviewer Profile ---------------- */
        Profile reviewerProfile = [
            SELECT Id
            FROM Profile
            WHERE Name = 'Reviewer'
            LIMIT 1
        ];

        /* ---------------- Reviewer User ---------------- */
        User reviewer = new User(
            Alias = 'rtest',
            Email = 'reviewer@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Reviewer User',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            TimeZoneSidKey = 'Asia/Kolkata',
            ProfileId = reviewerProfile.Id,
            UserName = 'reviewer' + System.currentTimeMillis() + '@test.com',
            ContactId = c.Id,
            IsActive = true
        );
        insert reviewer;

        /* ---------------- Assigned Proposal ---------------- */
        IndividualApplication assignedApp = new IndividualApplication(
            RecordTypeId = projectProposalRtId,
            Category = 'Grant Application',
            Project_Title__c = 'Assigned Project',
            AccountId = acc.Id
        );
        insert assignedApp;

        /* ---------------- Unassigned Proposal ---------------- */
        IndividualApplication unassignedApp = new IndividualApplication(
            RecordTypeId = projectProposalRtId,
            Category = 'Grant Application',
            Project_Title__c = 'Unassigned Project',
            AccountId = acc.Id
        );
        insert unassignedApp;

        /* ---------------- Assignment Share ---------------- */
        IndividualApplicationShare share = new IndividualApplicationShare(
            ParentId = assignedApp.Id,
            UserOrGroupId = reviewer.Id,
            AccessLevel = 'Edit'
        );
        insert share;

        /* ---------------- Review Status ---------------- */
        ApplicationReview ar = new ApplicationReview(
            ApplicationId = assignedApp.Id,
            ReviewedById = reviewer.Id,
            Status = 'Draft'
        );
        insert ar;
    }

    /* =====================================================
       TEST: Assigned Proposals Report
    ===================================================== */
    @IsTest
    static void test_getReport() {

        Date fromDate = Date.today().addDays(-30);
        Date toDate   = Date.today().addDays(30);

        Test.startTest();

        List<ReviewerReportService.Row> rows =
            ReviewerReportService.getReport(fromDate, toDate);

        Test.stopTest();

        System.assertNotEquals(null, rows, 'Rows should not be null');
        System.assert(rows.size() > 0, 'Assigned proposal should be returned');

        ReviewerReportService.Row r = rows[0];

        System.assertNotEquals(null, r.reviewerId, 'Reviewer Id should exist');
        System.assertNotEquals(null, r.reviewerName, 'Reviewer Name should exist');
        System.assertNotEquals(null, r.proposalId, 'Proposal Id should exist');
        System.assertEquals('Assigned Project', r.projectTitle);
        System.assertEquals('Test COE', r.coeName);
        System.assertEquals('Draft', r.reviewStatus);
    }

    /* =====================================================
       TEST: Unassigned Proposals Report
    ===================================================== */
    @IsTest
    static void test_getUnassignedProposals() {

        Date fromDate = Date.today().addDays(-30);
        Date toDate   = Date.today().addDays(30);

        Test.startTest();

        List<ReviewerReportService.Row> rows =
            ReviewerReportService.getUnassignedProposals(fromDate, toDate);

        Test.stopTest();

        System.assertNotEquals(null, rows, 'Rows should not be null');
        System.assert(rows.size() > 0, 'Unassigned proposals should be returned');

        Boolean found = false;
        for (ReviewerReportService.Row r : rows) {
            if (r.projectTitle == 'Unassigned Project') {
                found = true;
                System.assertNotEquals(null, r.proposalId);
                System.assertEquals('Test COE', r.coeName);
            }
        }

        System.assert(found, 'Unassigned project should be present');
    }

    /* =====================================================
       TEST: Proposal Review Report
    ===================================================== */
    @IsTest
    static void test_getProposalReviewReport() {

        Date fromDate = Date.today().addDays(-30);
        Date toDate   = Date.today().addDays(30);

        Test.startTest();

        List<ReviewerReportService.Row> rows =
            ReviewerReportService.getProposalReviewReport(fromDate, toDate);

        Test.stopTest();

        System.assertNotEquals(null, rows, 'Rows should not be null');
        System.assert(rows.size() > 0, 'Proposal review rows should be returned');

        ReviewerReportService.Row r = rows[0];

        System.assertEquals('Assigned Project', r.projectTitle);
        System.assertEquals('Test COE', r.coeName);
        System.assertEquals('Draft', r.reviewStatus);
        System.assertNotEquals(null, r.reviewerName);
    }
}