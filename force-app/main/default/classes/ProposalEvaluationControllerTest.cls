@IsTest
private class ProposalEvaluationControllerTest {
    
    @TestSetup
    static void createTestData() {
        // 1) Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;
        
        // 2) Create Contact under that Account
        Contact con = new Contact(
            LastName  = 'Test Contact',
            AccountId = acc.Id
        );
        insert con;
        
        // 3) COE User Profile / Partner Community Clone Reviewer profile
        Profile p = [SELECT Id FROM Profile WHERE Name = 'WG Partners' LIMIT 1];//   External Reviewer Reviewer profile
        
        // 4) Create a User associated to that Contact
        User u = new User(
            FirstName         = 'Test',
            LastName          = 'User',
            Username          = 'testuser@example.com',
            Email              = 'testuser@example.com',
            Alias              = 'tuser',
            CommunityNickName  = 'tuser',
            ProfileId          = p.Id,
            TimeZoneSidKey     = 'Asia/Kolkata',
            LocaleSidKey       = 'en_US',
            EmailEncodingKey   = 'UTF-8',
            LanguageLocaleKey  = 'en_US',
            ContactId          = con.Id
        );
        insert u;
        
        // 5) Create a  application record
        IndividualApplication app = new IndividualApplication(
            //Name = 'Test Application',
            ApplicationType = 'WIN Project Proposal',
            Category = 'Grant Application',
            Status = 'Submitted',
            Total_Budget__c = 230
        );
        insert app;
    }
    
    // helper to fetch our test user
    private static User getTestUser() {
        return [
            SELECT Id, ContactId
            FROM User
            WHERE Email = 'testuser@example.com'
            LIMIT 1
        ];
    }
    
    @IsTest
    static void testGetUserDetails() {
        User u = getTestUser();
        // runAs to make UserInfo.getUserId() return our test user
        System.runAs(u) {
            Test.startTest();
                ProposalEvaluationController.UserInfoWrapper info = ProposalEvaluationController.getUserDetails();
            Test.stopTest();
            
            // verify wrapper fields
            Contact con = [SELECT AccountId, Name, Account.Name 
                           FROM Contact 
                           WHERE Id = :u.ContactId];
            
            System.assertEquals(u.ContactId,        info.contactId,  'contactId');
            System.assertEquals(con.AccountId,      info.accountId,  'accountId');
            System.assertEquals(con.Name,           info.contactName,'contactName');
            System.assertEquals(con.Account.Name,   info.accountName,'accountName');
        }
    }
    
    @IsTest
    static void testSaveEvaluation_HappyPath() {
        // fetch test records
        User u   = getTestUser();
        Contact con = [SELECT Id, AccountId FROM Contact WHERE Id = :u.ContactId];
        Account acc = [SELECT Id FROM Account WHERE Id = :con.AccountId];
        IndividualApplication app = [SELECT Id FROM IndividualApplication LIMIT 1];
        
        //System.runAs(u) {
            Test.startTest();
                // call with all required non‑empty IDs and sample ratings/remarks
                ProposalEvaluationController.saveEvaluation(
                    app.Id,
                    acc.Id,
                    con.Id,
                    /* researchRating */        '5 - Excellent',
                    /* researchRemarks */       'Excellent research',
                    /* subAreaRating */         '4 - Good',
                    /* subAreaRemarks */        'Good sub-area',
                    /* ecosystemRating */       '3 - Average',
                    /* ecosystemRemarks */      'Average infra',
                    /* projectRating */         '2 - Below Average',
                    /* projectRemarks */        'Needs work',
                    /* facilitiesRating */      '4 - Good',
                    /* facilitiesRemarks */     'Facilities strong',
                    /* otherWeakness */         'Minor gaps',
                    /* overallRemarks */        'Solid proposal'
                );
            Test.stopTest();
        //}
        
        // validate the inserted ApplicationReview record
        List<ApplicationReview> reviews = [
            SELECT 
                ApplicationId,
                Institution_Name__c,
                ReviewedById,
                RecordTypeId,
                Demonstration_of_overall_research_trans__c,
                Research_Commercialization_Remarks__c,
                Sub_Area_Rating__c,
                Sub_Area_Remarks__c,
                Ecosystem_Infra_Rating__c,
                Ecosystem_and_Infra_Remarks__c,
                Project_List_Quality_rating__c,
                Project_List_Quality_remarks__c,
                Facilities_Faculty_Rating__c,
                Facilities_Faculty_Remarks__c,
                Any_other_weaknesses_in_the_proposal__c,
                Overall_Remarks__c
            FROM ApplicationReview
            
        ]; //WHERE ReviewedById = :u.Id
        System.assertEquals(1, reviews.size(), 'One review should be created');
        
        ApplicationReview rev = reviews[0];
        System.assertEquals(app.Id,    rev.ApplicationId,    'ApplicationId');
        System.assertEquals(acc.Id,    rev.Institution_Name__c,  'Institution');
        //System.assertEquals(u.Id,    rev.ReviewedById,     'ReviewedById');
        RecordType rt = [SELECT Id FROM RecordType WHERE DeveloperName = 'COE_Proposal_Review' AND SObjectType = 'ApplicationReview' LIMIT 1];//COE_Proposal_Review Project_Proposal_Review
          System.assertEquals(rt.Id, rev.RecordTypeId, 'RecordTypeId');

       // System.assertEquals('012GA000000nZOxYAM', rev.RecordTypeId, 'RecordTypeId'); // 012F6000000UQi2IAG 012F6000000UQhxIAG
        
        // check each rating & remark
        System.assertEquals('5 - Excellent', rev.Demonstration_of_overall_research_trans__c);
        System.assertEquals('Excellent research', rev.Research_Commercialization_Remarks__c);
        System.assertEquals('4 - Good', rev.Sub_Area_Rating__c);
        System.assertEquals('Good sub-area', rev.Sub_Area_Remarks__c);
        System.assertEquals('3 - Average', rev.Ecosystem_Infra_Rating__c);
        System.assertEquals('Average infra', rev.Ecosystem_and_Infra_Remarks__c);
        System.assertEquals('2 - Below Average', rev.Project_List_Quality_rating__c);
        System.assertEquals('Needs work', rev.Project_List_Quality_remarks__c);
        System.assertEquals('4 - Good', rev.Facilities_Faculty_Rating__c);
        System.assertEquals('Facilities strong', rev.Facilities_Faculty_Remarks__c);
        System.assertEquals('Minor gaps', rev.Any_other_weaknesses_in_the_proposal__c);
        System.assertEquals('Solid proposal', rev.Overall_Remarks__c);
    }
    
 @IsTest
static void testHasAlreadyReviewed() {
    // Fetch test data
    User u = getTestUser();
    Contact con = [SELECT Id, AccountId FROM Contact WHERE Id = :u.ContactId];
    Account acc = [SELECT Id FROM Account WHERE Id = :con.AccountId];
    
    IndividualApplication app;
    System.runAs(u) {
        // Insert application as the same user who will later submit review
        app = new IndividualApplication(
            ApplicationType = 'WIN Project Proposal',
            Category = 'Grant Application',
            Status = 'Submitted',
            Total_Budget__c = 230
        );
        insert app;
    }

    System.runAs(u) {
        Test.startTest();

        // Case 1: Should be false before submitting review
        Boolean beforeSubmit = ProposalEvaluationController.hasAlreadyReviewed(app.Id);
        System.assertEquals(false, beforeSubmit, 'Should be false before review is submitted');

        // Submit a review
        ProposalEvaluationController.saveEvaluation(
            app.Id,
            acc.Id,
            con.Id,
            '5 - Excellent',
            'Excellent research',
            '4 - Good',
            'Good sub-area',
            '3 - Average',
            'Average infra',
            '2 - Below Average',
            'Needs work',
            '4 - Good',
            'Facilities strong',
            'Minor gaps',
            'Solid proposal'
        );

        // Case 2: Should be true after submitting review
        Boolean afterSubmit = ProposalEvaluationController.hasAlreadyReviewed(app.Id);
        System.assertEquals(true, afterSubmit, 'Should be true after review is submitted');

        Test.stopTest();
    }
}

}