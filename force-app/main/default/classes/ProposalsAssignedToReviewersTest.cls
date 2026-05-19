@isTest
public class ProposalsAssignedToReviewersTest {
    @isTest
    static void testGetSharedApplications() {
        // Get the Person Account RecordType
        RecordType reviewerRt = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND Name = 'Reviewer' LIMIT 1];

        // Step 1: Create COE Account (for the application)
        Account coeAcc = new Account(Name = 'COE Institute');
        insert coeAcc;

        // Step 2: Create Reviewer Account (Person Account)
        Account reviewerAcc = new Account(
            FirstName = 'John',
            LastName = 'Doe',
            RecordTypeId = reviewerRt.Id,
            Reviewer__pc = true
        );
        insert reviewerAcc;

        // Step 3: Get PersonContact from reviewer account
        reviewerAcc = [SELECT Id, PersonContactId FROM Account WHERE Id = :reviewerAcc.Id];
        Contact reviewerContact = [SELECT Id FROM Contact WHERE Id = :reviewerAcc.PersonContactId];

        // Step 4: Create User linked to the Contact
        Profile reviewerProfile = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1];
        User reviewerUser = new User(
            FirstName = 'Reviewer',
            LastName = 'User',
            Email = 'revieweruser@example.com',
            Alias = 'revusr',
            Username = 'revieweruser' + DateTime.now().getTime() + '@example.com',
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = reviewerProfile.Id,
            ContactId = reviewerContact.Id,
            CommunityNickName = 'nick' + DateTime.now().getTime()
        );
        insert reviewerUser;

        // Step 5: Create Individual Application
        IndividualApplication app = new IndividualApplication(
            Category = 'Grant application',
            Status = 'Submitted',
            Project_Title__c = 'AI for Education',
            AccountId = coeAcc.Id
        );
        insert app;

        // Step 6: Share application with the user
        IndividualApplicationShare appShare = new IndividualApplicationShare(
            ParentId = app.Id,
            UserOrGroupId = reviewerUser.Id,
            AccessLevel = 'Read',
            RowCause = Schema.IndividualApplicationShare.RowCause.Manual
        );
        insert appShare;

        // Step 7: Add Application Review by reviewer
        ApplicationReview review = new ApplicationReview(
            ApplicationId = app.Id,
            ReviewedById = reviewerUser.Id,
            Status = 'Review Submitted'
        );
        insert review;

        // Step 8: Call the method correctly with reviewer account ID
        Test.startTest();
        List<ProposalsAssignedToReviewers.ProposalWrapper> results =
            ProposalsAssignedToReviewers.getSharedApplications(reviewerAcc.Id);
        Test.stopTest();

        // Step 9: Assertions
        System.assertEquals(1, results.size(), 'One shared application should be returned');
        ProposalsAssignedToReviewers.ProposalWrapper wrapper = results[0];
        System.assertEquals(app.Id, wrapper.ApplicationId);
        System.assertEquals('AI for Education', wrapper.ProjectTitle);
        System.assertEquals('Review Submitted', wrapper.ReviewStatus);
        System.assertEquals('COE Institute', wrapper.COEName);
        System.assertNotEquals(null, wrapper.AssignedDate, 'Assigned date should be populated');
    }
}