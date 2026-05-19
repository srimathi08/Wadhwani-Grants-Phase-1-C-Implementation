@isTest
private class WINReviewerUserManagerTest {

    // Get the Person Account "Reviewer" Record Type by LABEL
    private static Id getReviewerPAccountRT() {
        for (Schema.RecordTypeInfo rt : Schema.SObjectType.Account.getRecordTypeInfos()) {
            if (rt.getName() == 'Reviewer') {   // Label match
                return rt.getRecordTypeId();
            }
        }
        System.assert(false, 'Reviewer Record Type not found on Account');
        return null;
    }

    // Utility: safely get a Profile (fallback to ANY profile)
    private static Profile getReviewerProfile() {
        List<Profile> p = [
            SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1
        ];
        if (p.isEmpty()) {
            return [SELECT Id FROM Profile LIMIT 1]; // fallback
        }
        return p[0];
    }

    // Utility: safely get PermissionSet (fallback to ANY PS)
    private static PermissionSet getReviewerPermissionSet() {
        List<PermissionSet> ps = [
            SELECT Id FROM PermissionSet WHERE Name = 'GrantmakingExternalReviewer' LIMIT 1
        ];
        if (ps.isEmpty()) {
            return [SELECT Id FROM PermissionSet LIMIT 1];
        }
        return ps[0];
    }



    @isTest
    static void testCreateReviewerUser_Success() {

        Id reviewerRT = getReviewerPAccountRT();
        Profile reviewerProfile = getReviewerProfile();

        Account testAccount = new Account(
            RecordTypeId = reviewerRT,
            FirstName = 'John',
            LastName = 'Doe',
            PersonEmail = 'john.doe.reviewer@test.com'
        );
        insert testAccount;

        testAccount = [
            SELECT Id, FirstName, LastName, PersonEmail, PersonContactId 
            FROM Account WHERE Id = :testAccount.Id
        ];

        WINReviewerUserInput input = new WINReviewerUserInput();
        input.accountId = testAccount.Id;

        Test.startTest();
        List<WINReviewerUserResult> results =
            WINReviewerUserManager.createReviewerUsers(new List<WINReviewerUserInput>{ input });
        Test.stopTest();

        System.assertEquals(1, results.size());
        WINReviewerUserResult result = results[0];
        System.assertEquals('SUCCESS', result.status);

        User createdUser = [
            SELECT Id, Email, FirstName, LastName, ProfileId, ContactId, IsActive
            FROM User WHERE Id = :result.userId
        ];

        System.assertEquals('john.doe.reviewer@test.com', createdUser.Email);
        System.assertEquals(testAccount.PersonContactId, createdUser.ContactId);
    }



    @isTest
    static void testCreateReviewerUser_MultipleAccounts() {

        Id reviewerRT = getReviewerPAccountRT();

        List<Account> accounts = new List<Account>();
        for (Integer i = 1; i <= 3; i++) {
            accounts.add(new Account(
                RecordTypeId = reviewerRT,
                FirstName = 'User',
                LastName = 'Test' + i,
                PersonEmail = 'usertest' + i + '@test.com'
            ));
        }
        insert accounts;

        List<WINReviewerUserInput> inputs = new List<WINReviewerUserInput>();
        for (Account acc : accounts) {
            WINReviewerUserInput i = new WINReviewerUserInput();
            i.accountId = acc.Id;
            inputs.add(i);
        }

        Test.startTest();
        List<WINReviewerUserResult> results = WINReviewerUserManager.createReviewerUsers(inputs);
        Test.stopTest();

        System.assertEquals(3, results.size());
        for (WINReviewerUserResult r : results) {
            System.assertEquals('SUCCESS', r.status);
        }
    }



    @isTest
    static void testCreateReviewerUser_ExistingUser() {

        Id reviewerRT = getReviewerPAccountRT();
        Profile reviewerProfile = getReviewerProfile();

        Account testAccount = new Account(
            RecordTypeId = reviewerRT,
            FirstName = 'Existing',
            LastName = 'User',
            PersonEmail = 'existing.user@test.com'
        );
        insert testAccount;

        testAccount = [
            SELECT Id, PersonContactId, PersonEmail
            FROM Account WHERE Id = :testAccount.Id
        ];

        User existingUser = new User(
            Username = testAccount.PersonEmail,
            Email = testAccount.PersonEmail,
            FirstName = 'Existing',
            LastName = 'User',
            Alias = 'exuser',
            CommunityNickname = 'existinguser' + String.valueOf(Datetime.now().getTime()),
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = reviewerProfile.Id,
            ContactId = testAccount.PersonContactId,
            IsActive = true
        );
        insert existingUser;

        WINReviewerUserInput input = new WINReviewerUserInput();
        input.accountId = testAccount.Id;

        Test.startTest();
        List<WINReviewerUserResult> results =
            WINReviewerUserManager.createReviewerUsers(new List<WINReviewerUserInput>{ input });
        Test.stopTest();
    }



    @isTest
    static void testCreateReviewerUser_MissingEmail() {

        Id reviewerRT = getReviewerPAccountRT();

        Account testAccount = new Account(
            RecordTypeId = reviewerRT,
            FirstName = 'No',
            LastName = 'Email'
        );
        insert testAccount;

        WINReviewerUserInput input = new WINReviewerUserInput();
        input.accountId = testAccount.Id;

        Test.startTest();
        List<WINReviewerUserResult> results =
            WINReviewerUserManager.createReviewerUsers(new List<WINReviewerUserInput>{ input });
        Test.stopTest();

        System.assertEquals('PersonEmail is missing.', results[0].message);
    }



    @isTest
    static void testCreateReviewerUser_InvalidAccountId() {
        WINReviewerUserInput input = new WINReviewerUserInput();
        input.accountId = '001000000000000AAA';

        Test.startTest();
        List<WINReviewerUserResult> results =
            WINReviewerUserManager.createReviewerUsers(new List<WINReviewerUserInput>{ input });
        Test.stopTest();

        System.assertEquals('ERROR', results[0].status);
        System.assertEquals('Account not found.', results[0].message);
    }



    @isTest
    static void testCreateReviewerUser_NullInputs() {
        Test.startTest();
        List<WINReviewerUserResult> results = WINReviewerUserManager.createReviewerUsers(null);
        Test.stopTest();

        System.assertEquals(0, results.size());
    }


    @isTest
    static void testCreateReviewerUser_EmptyInputs() {
        Test.startTest();
        List<WINReviewerUserResult> results =
            WINReviewerUserManager.createReviewerUsers(new List<WINReviewerUserInput>());
        Test.stopTest();

        System.assertEquals(0, results.size());
    }


    @isTest
    static void testCreateReviewerUser_NullAccountIdInInput() {
        WINReviewerUserInput input = new WINReviewerUserInput();

        Test.startTest();
        List<WINReviewerUserResult> results =
            WINReviewerUserManager.createReviewerUsers(new List<WINReviewerUserInput>{ input });
        Test.stopTest();

        System.assertEquals(0, results.size());
    }


    @isTest
    static void testCreateReviewerUser_MissingNames() {

        Id reviewerRT = getReviewerPAccountRT();

        Account testAccount = new Account(
            RecordTypeId = reviewerRT,
            LastName = 'OnlyLastName',
            PersonEmail = 'onlylast@test.com'
        );
        insert testAccount;

        WINReviewerUserInput input = new WINReviewerUserInput();
        input.accountId = testAccount.Id;

        Test.startTest();
        List<WINReviewerUserResult> results =
            WINReviewerUserManager.createReviewerUsers(new List<WINReviewerUserInput>{ input });
        Test.stopTest();

        User created = [
            SELECT FirstName, LastName
            FROM User WHERE Id = :results[0].userId
        ];

        System.assertEquals('Reviewer', created.FirstName);
        System.assertEquals('OnlyLastName', created.LastName);
    }



    @isTest
    static void testCreateReviewerUser_MixedResults() {

        Id reviewerRT = getReviewerPAccountRT();

        Account validAccount = new Account(
            RecordTypeId = reviewerRT,
            FirstName = 'Valid',
            LastName = 'User',
            PersonEmail = 'valid.user@test.com'
        );
        insert validAccount;

        Account invalidAccount = new Account(
            RecordTypeId = reviewerRT,
            FirstName = 'Invalid',
            LastName = 'User'
        );
        insert invalidAccount;

        WINReviewerUserInput i1 = new WINReviewerUserInput();
        i1.accountId = validAccount.Id;

        WINReviewerUserInput i2 = new WINReviewerUserInput();
        i2.accountId = invalidAccount.Id;

        Test.startTest();
        List<WINReviewerUserResult> results =
            WINReviewerUserManager.createReviewerUsers(new List<WINReviewerUserInput>{ i1, i2 });
        Test.stopTest();

        System.assertEquals('SUCCESS', results[0].status);
        System.assertEquals('ERROR', results[1].status);
    }
}