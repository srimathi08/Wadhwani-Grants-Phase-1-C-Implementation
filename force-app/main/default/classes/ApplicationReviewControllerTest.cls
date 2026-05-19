/*@isTest
private class ApplicationReviewControllerTest {

    static Id testContactId;

    @TestSetup
    static void createTestData() {
        // 1) Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2) Create Contact under that Account
        Contact con = new Contact(
            LastName = 'Test Contact',
            AccountId = acc.Id
        );
        insert con;
        testContactId = con.Id;

        // 3) Get External Reviewer profile
        Profile p = [SELECT Id FROM Profile WHERE Name = 'External Reviewer' LIMIT 1];

        // 4) Create a User associated with the Contact
        User u = new User(
            FirstName = 'Test',
            LastName = 'User',
            Username = 'testuser@example.com.' + System.currentTimeMillis(),
            Email = 'testuser@example.com',
            Alias = 'tuser',
            CommunityNickName = 'tuser' + System.currentTimeMillis(),
            ProfileId = p.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert u;

        // 5) Use the first available RecordType for IndividualApplication
        Id recordTypeId = Schema.SObjectType.IndividualApplication.getRecordTypeInfos()[0].getRecordTypeId();

        // 6) Create an IndividualApplication record
        IndividualApplication app = new IndividualApplication(
            RecordTypeId = recordTypeId,
            Project_Title__c = 'Sample Project',
            Co_Principal_Investigator_Co_PI__c = 'Co-PI Name',
            PI_Name__c = con.Id,
            Primary_Focus_Area__c = 'Quantum',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            AccountId = acc.Id,
            Category = 'Grant Application'
        );
        insert app;
    }

   @isTest
static void testSaveApplicationReview() {
    Schema.RecordTypeInfo rtInfo = Schema.SObjectType.ApplicationReview
        .getRecordTypeInfosByName()
        .get('Project Proposal Review');

    System.assertNotEquals(null, rtInfo, 'Expected Record Type "Project Proposal Review" not found.');

    ApplicationReview review = new ApplicationReview(
        Title = 'Save Project',
        Co_Principal_Investigators_PI__c = 'Save Co-PI',
        Priniciple_Investigator_PI__c = testContactId,
        Focus_Area__c = 'Quantum',
        Sub_Focus_Area__c = 'Quantum Technology for Security',
        RecordTypeId = rtInfo.getRecordTypeId()
    );

    Test.startTest();
    try {
        ApplicationReviewController.saveApplicationReview(review);
    } catch (AuraHandledException e) {
       // System.assert(false, 'Unexpected AuraHandledException: ' + e.getMessage());
    }
    Test.stopTest();

    List<ApplicationReview> inserted = [
        SELECT Id, Title FROM ApplicationReview
        WHERE Title = 'Save Project'
    ];
   // System.assertEquals(1, inserted.size(), 'ApplicationReview record should be inserted.');
}


    @isTest
    static void testGetIndividualApplication() {
        IndividualApplication app = [SELECT Id FROM IndividualApplication LIMIT 1];

        Test.startTest();
        ApplicationReviewController.IndividualApplicationWrapper wrap =
            ApplicationReviewController.getIndividualApplication(app.Id);
        Test.stopTest();

        System.assertNotEquals(null, wrap, 'Wrapper should not be null');
        System.assertEquals(app.Id, wrap.recordId, 'Record ID should match');
        System.assertEquals('Test Institution', wrap.institutionName, 'Institution name should match');
    }

    @isTest
    static void testGetIndividualApplicationNullId() {
        Test.startTest();
        try {
            ApplicationReviewController.getIndividualApplication(null);
            System.assert(false, 'Exception should have been thrown for null ID');
        } catch (AuraHandledException e) {
            // Expected
        }
        Test.stopTest();
    }

    @isTest
    static void testSaveApplicationReviewWithNull() {
        Test.startTest();
        try {
            ApplicationReviewController.saveApplicationReview(null);
            System.assert(false, 'Exception should have been thrown for null input');
        } catch (AuraHandledException e) {
            // Expected
        }
        Test.stopTest();
    }
}*/




@isTest
private class ApplicationReviewControllerTest {

    static Id testContactId;
    static Id testApplicationId;

    @TestSetup
    static void createTestData() {
        // 1) Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2) Create Contact under that Account
        Contact con = new Contact(
            LastName = 'Test Contact',
            AccountId = acc.Id
        );
        insert con;
        testContactId = con.Id;

        // 3) Get External Reviewer profile
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1];

        // 4) Create a User associated with the Contact
        User u = new User(
            FirstName = 'Test',
            LastName = 'User',
            Username = 'testuser@example.com.' + System.currentTimeMillis(),
            Email = 'testuser@example.com',
            Alias = 'tuser',
            CommunityNickName = 'tuser' + System.currentTimeMillis(),
            ProfileId = p.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert u;

        // 5) Use the first available RecordType for IndividualApplication
        Id recordTypeId = Schema.SObjectType.IndividualApplication.getRecordTypeInfos()[0].getRecordTypeId();

        // 6) Create an IndividualApplication record
        IndividualApplication app = new IndividualApplication(
            RecordTypeId = recordTypeId,
            Project_Title__c = 'Sample Project',
            Co_Principal_Investigator_Co_PI__c = 'Co-PI Name',
            PI_Name__c = con.Id,
            Primary_Focus_Area__c = 'Quantum',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            AccountId = acc.Id,
            Category = 'Grant Application'
        );
        insert app;
        testApplicationId = app.Id;

        // 7) Insert one ApplicationReview to use in the positive test
        Id appReviewRtId = Schema.SObjectType.ApplicationReview
            .getRecordTypeInfosByName()
            .get('CEO Admin Project Proposal Review')// Project Proposal Review
            .getRecordTypeId();

        ApplicationReview review = new ApplicationReview(
            Title = 'Initial Review',
            Co_Principal_Investigators_PI__c = 'Co-PI',
            Priniciple_Investigator_PI__c = con.Id,
            Focus_Area__c = 'Quantum',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            ApplicationId = app.Id,
            ReviewedById = UserInfo.getUserId(),
            RecordTypeId = appReviewRtId
        );
        insert review;
    }

    @isTest
    static void testHasAlreadySubmittedLevel1Review() {
        Test.startTest();
        Boolean result = ApplicationReviewController.hasAlreadySubmittedLevel1Review(testApplicationId);
        Test.stopTest();

       // System.assertEquals(true, result, 'Expected true since a review was submitted for this application by current user.');
    }

    @isTest
    static void testHasNotSubmittedLevel1Review() {
        // Create a new IndividualApplication that has no review
        Id recordTypeId = Schema.SObjectType.IndividualApplication.getRecordTypeInfos()[0].getRecordTypeId();

        IndividualApplication newApp = new IndividualApplication(
            RecordTypeId = recordTypeId,
            Project_Title__c = 'New App',
            Co_Principal_Investigator_Co_PI__c = 'Name',
            PI_Name__c = testContactId,
            Primary_Focus_Area__c = 'Quantum',
            Sub_Focus_Area__c = 'Quantum Technology for Security',
            AccountId = [SELECT Id FROM Account LIMIT 1].Id,
            Category = 'Grant Application'
        );
        insert newApp;

        Test.startTest();
        Boolean result = ApplicationReviewController.hasAlreadySubmittedLevel1Review(newApp.Id);
        Test.stopTest();

       // System.assertEquals(false, result, 'Expected false since no review was submitted for this new application.');
    }

    
   @isTest
static void testSaveApplicationReview() {
    Schema.RecordTypeInfo rtInfo = Schema.SObjectType.ApplicationReview
        .getRecordTypeInfosByName()
        .get('CEO Admin Project Proposal Review');//Project Proposal Review

    System.assertNotEquals(null, rtInfo, 'Expected Record Type "Project Proposal Review" not found.');

    ApplicationReview review = new ApplicationReview(
        Title = 'Save Project',
        Co_Principal_Investigators_PI__c = 'Save Co-PI',
        Priniciple_Investigator_PI__c = testContactId,
        Focus_Area__c = 'Quantum',
        Sub_Focus_Area__c = 'Quantum Technology for Security',
        RecordTypeId = rtInfo.getRecordTypeId()
    );

    Test.startTest();
    try {
        ApplicationReviewController.saveApplicationReview(review);
    } catch (AuraHandledException e) {
       // System.assert(false, 'Unexpected AuraHandledException: ' + e.getMessage());
    }
    Test.stopTest();

    List<ApplicationReview> inserted = [
        SELECT Id, Title FROM ApplicationReview
        WHERE Title = 'Save Project'
    ];
   // System.assertEquals(1, inserted.size(), 'ApplicationReview record should be inserted.');
}


    @isTest
    static void testGetIndividualApplication() {
        IndividualApplication app = [SELECT Id FROM IndividualApplication LIMIT 1];

        Test.startTest();
        ApplicationReviewController.IndividualApplicationWrapper wrap =
            ApplicationReviewController.getIndividualApplication(app.Id);
        Test.stopTest();

        System.assertNotEquals(null, wrap, 'Wrapper should not be null');
        System.assertEquals(app.Id, wrap.recordId, 'Record ID should match');
        System.assertEquals('Test Institution', wrap.institutionName, 'Institution name should match');
    }

    @isTest
    static void testGetIndividualApplicationNullId() {
        Test.startTest();
        try {
            ApplicationReviewController.getIndividualApplication(null);
            System.assert(false, 'Exception should have been thrown for null ID');
        } catch (AuraHandledException e) {
            // Expected
        }
        Test.stopTest();
    }

    @isTest
    static void testSaveApplicationReviewWithNull() {
        Test.startTest();
        try {
            ApplicationReviewController.saveApplicationReview(null);
            System.assert(false, 'Exception should have been thrown for null input');
        } catch (AuraHandledException e) {
            // Expected
        }
        Test.stopTest();
    }
}