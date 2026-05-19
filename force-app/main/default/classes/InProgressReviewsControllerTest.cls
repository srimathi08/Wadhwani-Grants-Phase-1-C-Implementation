@IsTest
private class InProgressReviewsControllerTest {

    @IsTest
    static void testInProgressReviews_FallbackPath() {

        /* -----------------------------
           1. Create Account (COE)
        ----------------------------- */
        Account acc = new Account(Name = 'Test COE');
        insert acc;

        /* -----------------------------
           2. Use running user
        ----------------------------- */
        Id reviewerId = UserInfo.getUserId();

        /* -----------------------------
           3. Create Individual Application
        ----------------------------- */
        IndividualApplication app = new IndividualApplication(
            Category = 'Grant Application',
            Project_Title__c = 'Test Project',
            Primary_Focus_Area__c = 'Advance Computing and AI',
            Status = 'Submitted',
            AccountId = acc.Id
        );
        insert app;

        /* -----------------------------
           4. Create Draft Review
           (this triggers fallback logic
            because no share exists)
        ----------------------------- */
        ApplicationReview ar = new ApplicationReview(
            ApplicationId = app.Id,
            ReviewedById = reviewerId,
            Status = 'Draft'
        );
        insert ar;

        /* -----------------------------
           5. Execute Apex
        ----------------------------- */
        Test.startTest();
        List<InProgressReviewsController.InProgressWrapper> results =
            InProgressReviewsController.getInProgressReviews();
        Test.stopTest();

        /* -----------------------------
           6. Assertions
        ----------------------------- */
        System.assertEquals(
            1,
            results.size(),
            'One in-progress review should be returned'
        );

        InProgressReviewsController.InProgressWrapper row = results[0];

        System.assertEquals(
            app.Id,
            row.applicationId,
            'Application Id should match'
        );

        System.assertEquals(
            'Draft',
            row.status,
            'Status should be Draft'
        );

        System.assertEquals(
            'Test COE',
            row.coeName,
            'COE Name should come from Account'
        );
    }
}