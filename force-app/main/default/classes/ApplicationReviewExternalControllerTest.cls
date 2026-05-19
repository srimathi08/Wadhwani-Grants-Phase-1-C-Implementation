@isTest
public class ApplicationReviewExternalControllerTest {
    
    static Id testContactId;
    //static Id testApplicationId;
    //static Id reviewRecordTypeId;

    @testSetup
    static void setupData() {
        // 1. Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2. Create Contact
        Contact con = new Contact(LastName = 'Test Contact', AccountId = acc.Id);
        insert con;
        testContactId = con.Id;

        // 3. Fetch Reviewer Profile
        Profile reviewerProfile = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1]; //Reviewer Reviewer profile

        // 4. Create User
        User reviewer = new User(
            FirstName = 'Test',
            LastName = 'Reviewer',
            Username = 'testrev' + DateTime.now().getTime() + '@example.com',
            Email = 'testrev@example.com',
            Alias = 'trev',
            CommunityNickName = 'nick' + DateTime.now().getTime(),
            ProfileId = reviewerProfile.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert reviewer;

        // 5. Create Individual Application
        IndividualApplication app = new IndividualApplication(
            Project_Title__c = 'Test Project',
            AccountId = acc.Id,
            Co_Principal_Investigator_Co_PI__c = 'Co-PI',
            Primary_Focus_Area__c = 'Quantum',
            Status = 'Submitted',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'IndividualApplication' LIMIT 1].Id,
            Category = 'Grant Application'
        );
        insert app;
    }

    @isTest
    static void testSaveApplicationReview() {
        
           // 1. Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2. Create Contact
        Contact con = new Contact(LastName = 'Test Contact', AccountId = acc.Id);
        insert con;
        testContactId = con.Id;

        // 3. Fetch Reviewer Profile
        Profile reviewerProfile = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1];

        // 4. Create User
        User reviewer = new User(
            FirstName = 'Test',
            LastName = 'Reviewer',
            Username = 'testrev' + DateTime.now().getTime() + '@example.com',
            Email = 'testrev@example.com',
            Alias = 'trev',
            CommunityNickName = 'nick' + DateTime.now().getTime(),
            ProfileId = reviewerProfile.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert reviewer;

        // 5. Create Individual Application
        IndividualApplication app = new IndividualApplication(
            Project_Title__c = 'Test Project',
            AccountId = acc.Id,
            Co_Principal_Investigator_Co_PI__c = 'Co-PI',
            Primary_Focus_Area__c = 'Quantum',
            Status = 'Submitted',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'IndividualApplication' LIMIT 1].Id,
            Category = 'Grant Application'
        );
        insert app;

        ApplicationReview review = new ApplicationReview(
            ApplicationId = app.Id,
            Title = 'Final Review',
            Focus_Area__c = 'Quantum',
            Sub_Focus_Area__c = 'Quantum Technology for Security'
        );
        String jsonBody = JSON.serialize(review);

        Test.startTest();
        ApplicationReviewExternalController.saveApplicationReview(jsonBody);
        Test.stopTest();

        List<ApplicationReview> reviews = [SELECT Id, Title, IsSubmitted FROM ApplicationReview WHERE Title = 'Final Review'];
        System.assertEquals(1, reviews.size(), 'Review should be inserted');
        System.assertEquals(true, reviews[0].IsSubmitted);
    }

  /*  @isTest
    static void testSaveApplicationReviewWithEmptyJson() {
        Test.startTest();
        try {
            ApplicationReviewExternalController.saveApplicationReview('');
            System.assert(false, 'Should have thrown AuraHandledException');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('No data received'), 'Expected no data message');
        }
        Test.stopTest();
    } */

    @isTest
    static void testSaveDraftReview() {
        
          // 1. Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2. Create Contact
        Contact con = new Contact(LastName = 'Test Contact', AccountId = acc.Id);
        insert con;
        testContactId = con.Id;

        // 3. Fetch Reviewer Profile
        Profile reviewerProfile = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1];//  Reviewer profile External Reviewer


        // 4. Create User
        User reviewer = new User(
            FirstName = 'Test',
            LastName = 'Reviewer',
            Username = 'testrev' + DateTime.now().getTime() + '@example.com',
            Email = 'testrev@example.com',
            Alias = 'trev',
            CommunityNickName = 'nick' + DateTime.now().getTime(),
            ProfileId = reviewerProfile.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert reviewer;

        // 5. Create Individual Application
        IndividualApplication app = new IndividualApplication(
            Project_Title__c = 'Test Project',
            AccountId = acc.Id,
            Co_Principal_Investigator_Co_PI__c = 'Co-PI',
            Primary_Focus_Area__c = 'Quantum',
            Status = 'Submitted',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'IndividualApplication' LIMIT 1].Id,
            Category = 'Grant Application'
        );
        insert app;
          //system.debug('testApplicationId'+ testApplicationId);
        ApplicationReview review = new ApplicationReview(
            ApplicationId = app.Id,
            Title = 'Draft Review',
            Focus_Area__c = 'Quantum',
            Sub_Focus_Area__c = 'Quantum Technology for Security'
        );
        String jsonBody = JSON.serialize(review);

        Test.startTest();
        ApplicationReview result = ApplicationReviewExternalController.saveDraftReview(jsonBody);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Draft review should be saved');
        System.assertEquals('Draft', result.Status);
    }

    @isTest
    static void testGetDraftReviewRecord() {
          // 1. Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2. Create Contact
        Contact con = new Contact(LastName = 'Test Contact', AccountId = acc.Id);
        insert con;
        testContactId = con.Id;

        // 3. Fetch Reviewer Profile
        Profile reviewerProfile = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1]; //  Reviewer profile External Reviewer


        // 4. Create User
        User reviewer = new User(
            FirstName = 'Test',
            LastName = 'Reviewer',
            Username = 'testrev' + DateTime.now().getTime() + '@example.com',
            Email = 'testrev@example.com',
            Alias = 'trev',
            CommunityNickName = 'nick' + DateTime.now().getTime(),
            ProfileId = reviewerProfile.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert reviewer;

        // 5. Create Individual Application
        IndividualApplication app = new IndividualApplication(
            Project_Title__c = 'Test Project',
            AccountId = acc.Id,
            Co_Principal_Investigator_Co_PI__c = 'Co-PI',
            Primary_Focus_Area__c = 'Quantum',
            Status = 'Submitted',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'IndividualApplication' LIMIT 1].Id,
            Category = 'Grant Application'
        );
        insert app;
          //system.debug('testApplicationId'+ testApplicationId);
        ApplicationReview draft = new ApplicationReview(
            ApplicationId = app.Id,
            Title = 'My Draft',
            Focus_Area__c = 'Quantum',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            ReviewedById = UserInfo.getUserId(),
            RecordTypeId = '012GA000000nZP2YAM',// 012F6000000UQi2IAG 012GA000000nZP2YAM
            Status = 'Draft'
        );
        insert draft;

        Test.startTest();
        ApplicationReview fetched = ApplicationReviewExternalController.getDraftReviewRecord(app.Id);
        Test.stopTest();

        //System.assertNotEquals(null, fetched);
        //System.assertEquals('Draft', fetched.Status);
    }

    @isTest
    static void testGetIndividualApplicationSuccess() {
          // 1. Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2. Create Contact
        Contact con = new Contact(LastName = 'Test Contact', AccountId = acc.Id);
        insert con;
        testContactId = con.Id;

        // 3. Fetch Reviewer Profile
        Profile reviewerProfile = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1]; //  Reviewer profile External Reviewer


        // 4. Create User
        User reviewer = new User(
            FirstName = 'Test',
            LastName = 'Reviewer',
            Username = 'testrev' + DateTime.now().getTime() + '@example.com',
            Email = 'testrev@example.com',
            Alias = 'trev',
            CommunityNickName = 'nick' + DateTime.now().getTime(),
            ProfileId = reviewerProfile.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert reviewer;

        // 5. Create Individual Application
        IndividualApplication app = new IndividualApplication(
            Project_Title__c = 'Test Project',
            AccountId = acc.Id,
            Co_Principal_Investigator_Co_PI__c = 'Co-PI',
            Primary_Focus_Area__c = 'Quantum',
            Status = 'Submitted',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'IndividualApplication' LIMIT 1].Id,
            Category = 'Grant Application'
        );
        insert app;
        Test.startTest();
        ApplicationReviewExternalController.IndividualApplicationWrapper result =
            ApplicationReviewExternalController.getIndividualApplication(app.Id);
        Test.stopTest();

        System.assertEquals(app.Id, result.recordId);
        System.assertEquals('Test Project', result.projectTitle);
    }

    @isTest
    static void testHasAlreadyReviewed() {
          // 1. Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2. Create Contact
        Contact con = new Contact(LastName = 'Test Contact', AccountId = acc.Id);
        insert con;
        testContactId = con.Id;

        // 3. Fetch Reviewer Profile
        Profile reviewerProfile = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1]; //  Reviewer profile External Reviewer

        // 4. Create User
        User reviewer = new User(
            FirstName = 'Test',
            LastName = 'Reviewer',
            Username = 'testrev' + DateTime.now().getTime() + '@example.com',
            Email = 'testrev@example.com',
            Alias = 'trev',
            CommunityNickName = 'nick' + DateTime.now().getTime(),
            ProfileId = reviewerProfile.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert reviewer;

        // 5. Create Individual Application
        IndividualApplication app = new IndividualApplication(
            Project_Title__c = 'Test Project',
            AccountId = acc.Id,
            Co_Principal_Investigator_Co_PI__c = 'Co-PI',
            Primary_Focus_Area__c = 'Quantum',
            Status = 'Submitted',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'IndividualApplication' LIMIT 1].Id,
            Category = 'Grant Application'
        );
        insert app;
        // Insert a submitted review
        ApplicationReview submitted = new ApplicationReview(
            ApplicationId = app.Id,
            Title = 'Submitted Review',
            Focus_Area__c = 'Quantum',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            ReviewedById = UserInfo.getUserId(),
            RecordTypeId = '012GA000000nZP2YAM', // 012F6000000UQi2IAG 012GA000000nZP2YAM
            Status = 'Review Submitted',
            IsSubmitted = true
        );
        insert submitted;

        Test.startTest();
        Boolean result = ApplicationReviewExternalController.hasAlreadyReviewed(app.Id);
        Test.stopTest();

        System.assertEquals(true, result, 'Should return true since review is submitted');
    }
}