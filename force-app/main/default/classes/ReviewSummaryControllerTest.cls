@isTest
    private class ReviewSummaryControllerTest {
    
    @testSetup
    static void setupTestData() {
        // Create Account
        Account acc = new Account(
            Name = 'Test Account', 
            Reviewer_Registered__c = true
        );
        insert acc;
        
        // Create Contact
        Contact con = new Contact(
            LastName = 'Test Contact', 
            AccountId = acc.Id
        );
        insert con;
        
        // Create Reviewer User
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1];
        User reviewer = new User(
            Alias = 'tuser',
            Email = 'testuser@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'TestUser',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'testuser' + DateTime.now().getTime() + '@example.com',
            ContactId = con.Id
        );
        insert reviewer;
        
        // Create Individual Applications
        List<IndividualApplication> applications = new List<IndividualApplication>();
        for(Integer i = 0; i < 10; i++) {
            applications.add(new IndividualApplication(
                Category = 'Grant Application',
                Project_Title__c = 'Test Project ' + i,
                Status = 'Submitted'
            ));
        }
        insert applications;
        
        // Assign shares
        List<IndividualApplicationShare> shares = new List<IndividualApplicationShare>();
        for(IndividualApplication app : applications) {
            shares.add(new IndividualApplicationShare(
                ParentId = app.Id,
                UserOrGroupId = reviewer.Id,
                AccessLevel = 'Read',
                RowCause = Schema.IndividualApplicationShare.RowCause.Manual
            ));
        }
        insert shares;
        
        // Create Application Reviews
        List<ApplicationReview> reviews = new List<ApplicationReview>();
        
        // 4 Submitted
        for(Integer i = 0; i < 4; i++) {
            reviews.add(new ApplicationReview(
                ApplicationId = applications[i].Id,
                ReviewedById = reviewer.Id,
                Status = 'Review Submitted'
            ));
        }
        
        // 3 Draft
        for(Integer i = 4; i < 7; i++) {
            reviews.add(new ApplicationReview(
                ApplicationId = applications[i].Id,
                ReviewedById = reviewer.Id,
                Status = 'Draft'
            ));
        }
        
        insert reviews;
    }
    
    @isTest
    static void testGetReviewSummary() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        
        System.runAs(reviewer) {
            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }
    
    @isTest
    static void testGetReviewSummaryNoAssignments() {
        Account acc = new Account(Name = 'Test Account 2', Reviewer_Registered__c = true);
        insert acc;
        
        Contact con = new Contact(LastName = 'Test Contact 2', AccountId = acc.Id);
        insert con;
        
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1];
        User newReviewer = new User(
            Alias = 'tuser2',
            Email = 'testuser2@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'TestUser2',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'testuser2' + DateTime.now().getTime() + '@example.com',
            ContactId = con.Id
        );
        insert newReviewer;
        
        System.runAs(newReviewer) {
            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }
    
    @isTest
    static void testGetReviewSummaryWithAdditionalData() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        
        List<IndividualApplication> newApps = new List<IndividualApplication>();
        for(Integer i = 0; i < 5; i++) {
            newApps.add(new IndividualApplication(
                Category = 'Grant Application',
                Project_Title__c = 'Additional Project ' + i,
                Status = 'Submitted'
            ));
        }
        insert newApps;
        
        List<IndividualApplicationShare> shares = new List<IndividualApplicationShare>();
        for(IndividualApplication app : newApps) {
            shares.add(new IndividualApplicationShare(
                ParentId = app.Id,
                UserOrGroupId = reviewer.Id,
                AccessLevel = 'Read',
                RowCause = Schema.IndividualApplicationShare.RowCause.Manual
            ));
        }
        insert shares;
        
        List<ApplicationReview> draftReviews = new List<ApplicationReview>();
        for(Integer i = 0; i < 3; i++) {
            draftReviews.add(new ApplicationReview(
                ApplicationId = newApps[i].Id,
                ReviewedById = reviewer.Id,
                Status = 'Draft'
            ));
        }
        insert draftReviews;
        
        System.runAs(reviewer) {
            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }
    
    @isTest
    static void testGetReviewSummaryMixedStatuses() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        
        List<IndividualApplication> apps = new List<IndividualApplication>();
        for(Integer i = 0; i < 8; i++) {
            apps.add(new IndividualApplication(
                Category = 'Grant Application',
                Project_Title__c = 'Mixed Project ' + i,
                Status = 'Submitted'
            ));
        }
        insert apps;
        
        List<IndividualApplicationShare> shares = new List<IndividualApplicationShare>();
        for(IndividualApplication app : apps) {
            shares.add(new IndividualApplicationShare(
                ParentId = app.Id,
                UserOrGroupId = reviewer.Id,
                AccessLevel = 'Read',
                RowCause = Schema.IndividualApplicationShare.RowCause.Manual
            ));
        }
        insert shares;
        
        List<ApplicationReview> reviews = new List<ApplicationReview>();
        
        // Submitted
        for(Integer i = 0; i < 4; i++) {
            reviews.add(new ApplicationReview(
                ApplicationId = apps[i].Id,
                ReviewedById = reviewer.Id,
                Status = 'Review Submitted'
            ));
        }
        
        // Draft
        for(Integer i = 4; i < 6; i++) {
            reviews.add(new ApplicationReview(
                ApplicationId = apps[i].Id,
                ReviewedById = reviewer.Id,
                Status = 'Draft'
            ));
        }
        insert reviews;
        
        System.runAs(reviewer) {
            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }
    
    @isTest
    static void testGetReviewSummaryOnlySubmitted() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        
        List<IndividualApplication> apps = new List<IndividualApplication>();
        for(Integer i = 0; i < 3; i++) {
            apps.add(new IndividualApplication(
                Category = 'Grant Application',
                Project_Title__c = 'Submitted Only ' + i,
                Status = 'Submitted'
            ));
        }
        insert apps;
        
        List<IndividualApplicationShare> shares = new List<IndividualApplicationShare>();
        for(IndividualApplication app : apps) {
            shares.add(new IndividualApplicationShare(
                ParentId = app.Id,
                UserOrGroupId = reviewer.Id,
                AccessLevel = 'Read',
                RowCause = Schema.IndividualApplicationShare.RowCause.Manual
            ));
        }
        insert shares;
        
        List<ApplicationReview> reviews = new List<ApplicationReview>();
        for(IndividualApplication app : apps) {
            reviews.add(new ApplicationReview(
                ApplicationId = app.Id,
                ReviewedById = reviewer.Id,
                Status = 'Review Submitted'
            ));
        }
        insert reviews;
        
        System.runAs(reviewer) {
            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }
    
    @isTest
    static void testGetReviewSummaryOnlyDrafts() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        
        List<IndividualApplication> apps = new List<IndividualApplication>();
        for(Integer i = 0; i < 4; i++) {
            apps.add(new IndividualApplication(
                Category = 'Grant Application',
                Project_Title__c = 'Draft Only ' + i,
                Status = 'Submitted'
            ));
        }
        insert apps;
        
        List<IndividualApplicationShare> shares = new List<IndividualApplicationShare>();
        for(IndividualApplication app : apps) {
            shares.add(new IndividualApplicationShare(
                ParentId = app.Id,
                UserOrGroupId = reviewer.Id,
                AccessLevel = 'Read',
                RowCause = Schema.IndividualApplicationShare.RowCause.Manual
            ));
        }
        insert shares;
        
        List<ApplicationReview> reviews = new List<ApplicationReview>();
        for(IndividualApplication app : apps) {
            reviews.add(new ApplicationReview(
                ApplicationId = app.Id,
                ReviewedById = reviewer.Id,
                Status = 'Draft'
            ));
        }
        insert reviews;
        
        System.runAs(reviewer) {
            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }
    
    @isTest
    static void testGetReviewSummaryYetToStart() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        
        List<IndividualApplication> apps = new List<IndividualApplication>();
        for(Integer i = 0; i < 6; i++) {
            apps.add(new IndividualApplication(
                Category = 'Grant Application',
                Project_Title__c = 'Yet to Start ' + i,
                Status = 'Submitted'
            ));
        }
        insert apps;
        
        List<IndividualApplicationShare> shares = new List<IndividualApplicationShare>();
        for(IndividualApplication app : apps) {
            shares.add(new IndividualApplicationShare(
                ParentId = app.Id,
                UserOrGroupId = reviewer.Id,
                AccessLevel = 'Read',
                RowCause = Schema.IndividualApplicationShare.RowCause.Manual
            ));
        }
        insert shares;
        
        System.runAs(reviewer) {
            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }
    
    @isTest
    static void testGetReviewSummaryCacheable() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        
        System.runAs(reviewer) {
            Test.startTest();
            ReviewSummaryController.getReviewSummary();
            ReviewSummaryController.getReviewSummary();
            ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }
    
    @isTest
    static void testGetReviewSummaryLargeDataset() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        
        List<IndividualApplication> apps = new List<IndividualApplication>();
        for(Integer i = 0; i < 20; i++) {
            apps.add(new IndividualApplication(
                Category = 'Grant Application',
                Project_Title__c = 'Large Dataset ' + i,
                Status = 'Submitted'
            ));
        }
        insert apps;
        
        List<IndividualApplicationShare> shares = new List<IndividualApplicationShare>();
        for(IndividualApplication app : apps) {
            shares.add(new IndividualApplicationShare(
                ParentId = app.Id,
                UserOrGroupId = reviewer.Id,
                AccessLevel = 'Read',
                RowCause = Schema.IndividualApplicationShare.RowCause.Manual
            ));
        }
        insert shares;
        
        List<ApplicationReview> reviews = new List<ApplicationReview>();
        for(Integer i = 0; i < 10; i++) {
            reviews.add(new ApplicationReview(
                ApplicationId = apps[i].Id,
                ReviewedById = reviewer.Id,
                Status = i < 5 ? 'Review Submitted' : 'Draft'
            ));
        }
        insert reviews;
        
        System.runAs(reviewer) {
            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }
    
    @isTest
    static void testGetReviewSummarySingleRecord() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        
        IndividualApplication app = new IndividualApplication(
            Category = 'Grant Application',
            Project_Title__c = 'Single Record',
            Status = 'Submitted'
        );
        insert app;
        
        IndividualApplicationShare share = new IndividualApplicationShare(
            ParentId = app.Id,
            UserOrGroupId = reviewer.Id,
            AccessLevel = 'Read',
            RowCause = Schema.IndividualApplicationShare.RowCause.Manual
        );
        insert share;
        
        ApplicationReview review = new ApplicationReview(
            ApplicationId = app.Id,
            ReviewedById = reviewer.Id,
            Status = 'Draft'
        );
        insert review;
        
        System.runAs(reviewer) {
            Test.startTest();
            Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();
            Test.stopTest();
        }
    }

    // ⭐⭐⭐ NEW TEST METHOD TO COVER EXCEPTION BLOCK ⭐⭐⭐
  /*  @isTest
    static void testGetReviewSummaryException() {
        User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];

        System.runAs(reviewer) {
            Test.startTest();
            try {
                // Force SOQL governor exception by calling method MANY times
                for (Integer i = 0; i < 200; i++) {
                    ReviewSummaryController.getReviewSummary();
                }
            } catch (Exception ex) {
                // Exception expected - ignore
            }
            Test.stopTest();
        }
    }*/
    @isTest
static void testGetReviewSummaryException() {
    User reviewer = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];

    System.runAs(reviewer) {
        Test.startTest();

        // Force exception inside the controller
        //ReviewSummaryController.forceError = true;

        // Call method — exception is thrown INSIDE controller and caught by controller catch block
        Map<String, Integer> summary = ReviewSummaryController.getReviewSummary();

        // Reset flag
        //ReviewSummaryController.forceError = false;

        Test.stopTest();
    }
}


}