@IsTest
private class WCFTestScratch {
    @IsTest
    static void testPortalCreation() {
        UserRole ur = new UserRole(DeveloperName = 'Test_Owner_Role', Name = 'Test Owner Role');
        insert ur;

        Profile adminProfile = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1];
        User sysAdmin = new User(
            FirstName = 'Test',
            LastName = 'Admin',
            Username = 'testadmin_' + DateTime.now().getTime() + '@example.com',
            Email = 'testadmin@example.com',
            Alias = 'tadm',
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = adminProfile.Id,
            UserRoleId = ur.Id
        );
        insert sysAdmin;

        Account portalAccount;
        Contact portalContact;
        System.runAs(sysAdmin) {
            portalAccount = new Account(Name = 'Dynamic Portal Account');
            insert portalAccount;

            portalContact = new Contact(
                LastName = 'DynamicPortalContact',
                Email = 'dynportal@example.com',
                AccountId = portalAccount.Id
            );
            insert portalContact;
        }

        Profile p = [SELECT Id FROM Profile WHERE Name = 'COE User Profile' LIMIT 1];
        User portalUser = new User(
            FirstName = 'Dyn',
            LastName = 'PortalUser',
            Username = 'dynportaluser_' + DateTime.now().getTime() + '@example.com',
            Email = 'dynportal@example.com',
            Alias = 'dypu',
            CommunityNickname = 'dypu_' + DateTime.now().getTime(),
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = portalContact.Id
        );
        System.runAs(sysAdmin) {
            insert portalUser;
        }

        portalUser = [SELECT Id, AccountId, ContactId FROM User WHERE Id = :portalUser.Id];

        IndividualApplication app;
        System.runAs(sysAdmin) {
            app = WCF_TestDataFactory.createApplication(portalUser.AccountId, portalUser.ContactId, 'Draft', false);
            app.Category = 'WCF Grant Application';
            app.OwnerId = portalUser.Id;
            app.PI__c = portalUser.Id;
            app.Principal_Investigator_PI__c = portalUser.ContactId;
            app.COE_Admin__c = portalUser.ContactId;
            app.CO_PI_Contact__c = portalUser.ContactId;
            insert app;
        }

        System.runAs(portalUser) {
            WCFFormController.ApplicationStatusWrapper s = WCFFormController.getApplicationStatusForUser();
            System.debug('WRAPPER STATUS RETRIEVED: ' + s.status);
            System.assertEquals('Draft', s.status);
        }
    }
}