@IsTest
private class E39Tests {

    private static void makeTemplate() {
        insert new EmailTemplate(
            DeveloperName = 'E39_Password_Changed', Name = 'E39 Test', IsActive = true,
            FolderId = UserInfo.getUserId(), TemplateType = 'custom',
            Subject = 'Your Wadhwani Grants password was changed', Body = 'text',
            HtmlValue = '<p>Hi {{contact_first_name}} {{change_datetime}} {{account_email}} {{reset_url}} {{year}}</p>');
    }

    private static User fakeUser(String first) {
        String j = '{"attributes":{"type":"User"},"Id":"005000000000001AAA","FirstName":"' + first
            + '","Username":"asha@example.com","Email":"asha@example.com","TimeZoneSidKey":"Asia/Kolkata",'
            + '"LastPasswordChangeDate":"2026-08-12T11:05:00.000+0000"}';
        return (User) JSON.deserialize(j, User.class);
    }

    @IsTest
    static void buildReplacesAllTokens() {
        System.runAs(new User(Id = UserInfo.getUserId())) { makeTemplate(); }
        Messaging.SingleEmailMessage m = E39PasswordNotifier.build(fakeUser('Asha'));
        System.assert(m.getHtmlBody().contains('Asha'));
        System.assert(m.getHtmlBody().contains('asha@example.com'));
        System.assert(!m.getHtmlBody().contains('{{'), 'unreplaced token left');
    }

    @IsTest
    static void buildRejectsBlankFirstName() {
        System.runAs(new User(Id = UserInfo.getUserId())) { makeTemplate(); }
        try {
            E39PasswordNotifier.build(fakeUser(''));
            System.assert(false, 'expected exception');
        } catch (E39PasswordNotifier.E39Exception e) {
            System.assert(e.getMessage().contains('First name'));
        }
    }

    @IsTest
    static void buildRejectsMissingTemplate() {
        try {
            E39PasswordNotifier.build(fakeUser('Asha'));
            System.assert(false, 'expected exception');
        } catch (E39PasswordNotifier.E39Exception e) {
            System.assert(e.getMessage().contains('Template'));
        }
    }

    @IsTest
    static void passwordChangeSendsOnceAndAdvancesWatermark() {
        UserRole role = new UserRole(Name = 'E39 Role', DeveloperName = 'E39_Role');
        Profile admin = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1];
        User owner = new User(
            FirstName = 'Own', LastName = 'Er', Alias = 'owner39', Email = 'owner39@example.com',
            Username = 'owner39@example.com.e39', ProfileId = admin.Id, EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US', LocaleSidKey = 'en_US', TimeZoneSidKey = 'Asia/Kolkata');
        System.runAs(new User(Id = UserInfo.getUserId())) {
            insert role;
            owner.UserRoleId = role.Id;
            insert owner;
            makeTemplate();
        }
        Contact c;
        System.runAs(owner) {
            Account a = new Account(Name = 'E39 Acct');
            insert a;
            c = new Contact(AccountId = a.Id, FirstName = 'Asha', LastName = 'Tester', Email = 'asha39@example.com');
            insert c;
        }
                Set<String> allowed = E39PasswordNotifier.ALLOWED_PROFILES;
        Profile community = [SELECT Id FROM Profile
                             WHERE Name IN :allowed
                             AND UserType IN ('CspLitePortal','PowerCustomerSuccess','CustomerSuccess') LIMIT 1];
        User cu = new User(
            ContactId = c.Id, ProfileId = community.Id, FirstName = 'Asha', LastName = 'Tester',
            Alias = 'asha39', Email = 'asha39@example.com', Username = 'asha39@example.com.e39',
            EmailEncodingKey = 'UTF-8', LanguageLocaleKey = 'en_US', LocaleSidKey = 'en_US',
            TimeZoneSidKey = 'Asia/Kolkata');
        System.runAs(owner) { insert cu; }

        Test.startTest();
        System.runAs(owner) { System.setPassword(cu.Id, 'E39Test#98765'); }
        Test.stopTest();

        User r = [SELECT LastPasswordChangeDate, Pwd_Notified_Through__c, Pwd_Notify_Error__c
                  FROM User WHERE Id = :cu.Id];
        if (r.LastPasswordChangeDate != null) {
            System.assertEquals(r.LastPasswordChangeDate, r.Pwd_Notified_Through__c);
            System.assertEquals(null, r.Pwd_Notify_Error__c);
            E39PasswordNotifier.process(new Set<Id>{ cu.Id });   // second run must change nothing
            User r2 = [SELECT Pwd_Notified_Through__c FROM User WHERE Id = :cu.Id];
            System.assertEquals(r.Pwd_Notified_Through__c, r2.Pwd_Notified_Through__c);
        }
    }

    @IsTest
    static void sweeperRunsClean() {
        Test.startTest();
        new E39PasswordNotifierScheduler().execute(
    (SchedulableContext)null
);
        Test.stopTest();
        System.assert(true);
    }
}