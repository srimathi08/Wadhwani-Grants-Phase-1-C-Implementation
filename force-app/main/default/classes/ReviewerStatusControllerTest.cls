@isTest
public class ReviewerStatusControllerTest {
    @isTest
    static void testGetReviewersWithStatus() {
         // 1. Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2. Create Contact
        Contact con = new Contact(LastName = 'Test Contact', AccountId = acc.Id);
        insert con;
        

        // Step 1: Create test user
        Profile p = [SELECT Id FROM Profile WHERE Name='Reviewer' LIMIT 1]; //Reviewer profile
        User testUser = new User(
             FirstName = 'Test',
            LastName = 'Reviewer',
            Email = 'reviewer1@example.com',
            Alias = 'trev',
            CommunityNickName = 'nick' + DateTime.now().getTime(),
            ProfileId = p.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id,
            UserName='reviewer1@example.com'
        );
        insert testUser;

        // Step 2: Create test IndividualApplication__c record
        IndividualApplication app = new IndividualApplication(
        Project_Title__c = 'Test Project',
            AccountId = acc.Id,
            Co_Principal_Investigator_Co_PI__c = 'Co-PI',
            Primary_Focus_Area__c = 'Quantum',
            Status = 'Submitted',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            //RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'IndividualApplication' LIMIT 1].Id,
            Category = 'Grant Application'
        );
        insert app;

        // Step 3: Manually share the application with test user
        IndividualApplicationShare share = new IndividualApplicationShare();
        share.ParentId = app.Id;
        share.UserOrGroupId = testUser.Id;
        share.AccessLevel = 'Read';
        share.RowCause = Schema.IndividualApplicationShare.RowCause.Manual;
        insert share;

        // Step 4: Create related ApplicationReview__c record
         ApplicationReview review = new ApplicationReview(
            ApplicationId = app.Id,
            ReviewedById = testUser.Id,
            Status = 'Review Submitted'
        );
        insert review;

        // Step 5: Call the Apex method
        Test.startTest();
        List<ReviewerStatusController.ReviewerInfo> results = ReviewerStatusController.getReviewersWithStatus(app.Id);
        Test.stopTest();

        // Step 6: Assertions
        System.assertEquals(1, results.size());
        System.assertEquals('Test Reviewer', results[0].name);
        System.assertEquals('Review Submitted', results[0].status);
        
    }
}