@isTest
private class CoeProjectControllerTest {

    private static Account createAccount() {
        Account acc = new Account(Name = 'Test Account');
        insert acc;
        return acc;
    }

    private static Contact createContact(Id accountId, Boolean isCoeAdmin) {
        Contact c = new Contact(
            FirstName    = 'Test',
            LastName     = 'User',
            AccountId    = accountId,
            COE_Admin__c = isCoeAdmin
        );
        insert c;
        return c;
    }

    private static User createPortalUser(Id contactId, Boolean isCoeAdmin) {
        Profile p = [
            SELECT Id FROM Profile
            WHERE Name IN ('Customer Community User', 'Customer Community Plus User',
                           'Customer Community Login User', 'Communities User')
            LIMIT 1
        ];

        User u = new User(
            FirstName         = 'Test',
            LastName          = isCoeAdmin ? 'AdminUser' : 'NonAdminUser',
            Email             = 'testportal' + isCoeAdmin + DateTime.now().getTime() + '@test.com',
            Username          = 'testportal' + isCoeAdmin + DateTime.now().getTime() + '@test.com',
            Alias             = 'tprt',
            ProfileId         = p.Id,
            ContactId         = contactId,
            TimeZoneSidKey    = 'America/New_York',
            LocaleSidKey      = 'en_US',
            LanguageLocaleKey = 'en_US',
            EmailEncodingKey  = 'UTF-8'
        );
        insert u;
        return u;
    }

    // -------------------------------------------------------
    // Test 1: COE Admin portal user → returns their account's records
    // -------------------------------------------------------
    @isTest
    static void testGetProjects_CoeAdmin_ReturnsRecords() {
        Account acc    = createAccount();
        Contact c      = createContact(acc.Id, true);
        User adminUser = createPortalUser(c.Id, true);

        List<IndividualApplication> apps = new List<IndividualApplication>();
        for (Integer i = 0; i < 3; i++) {
            apps.add(new IndividualApplication(
                AccountId = acc.Id,
                Status    = 'Draft',
                Category  = 'Grant Application'
            ));
        }
        insert apps;

        List<IndividualApplication> result;
        System.runAs(adminUser) {
            Test.startTest();
            result = CoeProjectController.getProjects();
            Test.stopTest();
        }

        System.assertEquals(3, result.size(), 'COE Admin should see all 3 applications');
    }

    // -------------------------------------------------------
    // Test 2: Non-COE Admin portal user → returns empty list
    // -------------------------------------------------------
    @isTest
    static void testGetProjects_NonCoeAdmin_ReturnsEmpty() {
        Account acc       = createAccount();
        Contact c         = createContact(acc.Id, false);
        User nonAdminUser = createPortalUser(c.Id, false);

        insert new IndividualApplication(
            AccountId = acc.Id,
            Status    = 'Draft',
            Category  = 'Grant Application'
        );

        List<IndividualApplication> result;
        System.runAs(nonAdminUser) {
            Test.startTest();
            result = CoeProjectController.getProjects();
            Test.stopTest();
        }

        System.assertEquals(0, result.size(), 'Non-COE Admin should see no applications');
    }

    // -------------------------------------------------------
    // Test 3: User with no Contact (internal user) → returns empty list
    // -------------------------------------------------------
    @isTest
    static void testGetProjects_NoContact_ReturnsEmpty() {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];

        User internalUser = new User(
            FirstName         = 'Internal',
            LastName          = 'NoContact',
            Email             = 'internalnocontact' + DateTime.now().getTime() + '@test.com',
            Username          = 'internalnocontact' + DateTime.now().getTime() + '@test.com',
            Alias             = 'inc',
            ProfileId         = p.Id,
            TimeZoneSidKey    = 'America/New_York',
            LocaleSidKey      = 'en_US',
            LanguageLocaleKey = 'en_US',
            EmailEncodingKey  = 'UTF-8'
        );
        insert internalUser;

        List<IndividualApplication> result;
        System.runAs(internalUser) {
            Test.startTest();
            result = CoeProjectController.getProjects();
            Test.stopTest();
        }

        System.assertEquals(0, result.size(), 'User without Contact should see no applications');
    }

    // -------------------------------------------------------
    // Test 4: COE Admin with no IndividualApplications → returns empty list
    // -------------------------------------------------------
    @isTest
    static void testGetProjects_CoeAdmin_NoApps_ReturnsEmpty() {
        Account acc    = createAccount();
        Contact c      = createContact(acc.Id, true);
        User adminUser = createPortalUser(c.Id, true);

        List<IndividualApplication> result;
        System.runAs(adminUser) {
            Test.startTest();
            result = CoeProjectController.getProjects();
            Test.stopTest();
        }

        System.assertEquals(0, result.size(), 'COE Admin with no apps should get empty list');
    }

    // -------------------------------------------------------
    // Test 5: Results ordered by LastModifiedDate DESC
    // -------------------------------------------------------
    @isTest
    static void testGetProjects_OrderedByLastModifiedDateDesc() {
        Account acc    = createAccount();
        Contact c      = createContact(acc.Id, true);
        User adminUser = createPortalUser(c.Id, true);

        insert new IndividualApplication(
            AccountId = acc.Id,
            Status    = 'Draft',
            Category  = 'Grant Application'
        );
        insert new IndividualApplication(
            AccountId = acc.Id,
            Status    = 'Draft',
            Category  = 'Grant Application'
        );

        List<IndividualApplication> result;
        System.runAs(adminUser) {
            Test.startTest();
            result = CoeProjectController.getProjects();
            Test.stopTest();
        }

        System.assertEquals(2, result.size());
        System.assert(
            result[0].LastModifiedDate >= result[1].LastModifiedDate,
            'Results should be ordered by LastModifiedDate DESC'
        );
    }

    // -------------------------------------------------------
    // Test 6: COE Admin does NOT see other account's applications
    // -------------------------------------------------------
    @isTest
    static void testGetProjects_CoeAdmin_DoesNotSeeOtherAccountApps() {
        Account acc    = createAccount();
        Contact c      = createContact(acc.Id, true);
        User adminUser = createPortalUser(c.Id, true);

        Account otherAcc = new Account(Name = 'Other Account');
        insert otherAcc;

        IndividualApplication otherApp = new IndividualApplication(
            AccountId = otherAcc.Id,
            Status    = 'Draft',
            Category  = 'Grant Application'
        );
        insert otherApp;

        List<IndividualApplication> result;
        System.runAs(adminUser) {
            Test.startTest();
            result = CoeProjectController.getProjects();
            Test.stopTest();
        }

        for (IndividualApplication app : result) {
            System.assertNotEquals(otherApp.Id, app.Id, 'Should not see apps from other accounts');
        }
    }
}