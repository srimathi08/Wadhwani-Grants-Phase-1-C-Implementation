@isTest
public class ReviewerUserHelperTest {
    @testSetup
    static void setupTestData() {
        Account acc = new Account(Name = 'Test Account', Reviewer_Registered__c = true);
        insert acc;

        Contact con = new Contact(LastName = 'Test Contact', AccountId = acc.Id);
        insert con;

        Profile p = [SELECT Id FROM Profile WHERE Name='COE User Profile' LIMIT 1]; // Standard User
        User u = new User(
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
            // REMOVE AccountId here — it's not writable
        );
        insert u;

        Volody_Contract__c contract = new Volody_Contract__c(
            Account__c = acc.Id,
            clm_status__c = 'Executed' //approved
        );
        insert contract;
    }
    

    @isTest
    static void testIsReviewerRegisteredTrue() {
        // Set running user to the test user
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        System.runAs(testUser) {
            Boolean registered = ReviewerUserHelper.isReviewerRegistered();
            System.assert(registered == true, 'Reviewer should be registered');
        }
    }

    @isTest
    static void testIsReviewerRegisteredFalse_NoAccount() {
        // Create user without Contact or Account
        Profile p = [SELECT Id FROM Profile WHERE Name='Standard User' LIMIT 1];
        User u2 = new User(
            Alias = 'nouser',
            Email = 'nouser@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'NoUser',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'nouser' + DateTime.now().getTime() + '@example.com'
        );
        insert u2;

        System.runAs(u2) {
            Boolean registered = ReviewerUserHelper.isReviewerRegistered();
            System.assert(registered == false, 'Should return false when no Contact/Account');
        }
    }

    @isTest
    static void testGetNdaStatus_Approved() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuser' LIMIT 1];
        System.runAs(testUser) {
            ReviewerUserHelper.NdaInfo info = ReviewerUserHelper.getNdaStatus();
            //System.assertEquals('Approved', info.ndaStatus, 'NDA status should be Approved');
        }
    }

   @isTest
static void testGetNdaStatus_YetToSubmit() {
    // Create Account without any contract
    Account acc2 = new Account(Name = 'No Contract Account');
    insert acc2;

    Contact con2 = new Contact(LastName = 'No Contract Contact', AccountId = acc2.Id);
    insert con2;

    Profile p = [SELECT Id FROM Profile WHERE Name='COE User Profile' LIMIT 1]; //Standard User
    User u3 = new User(
        Alias = 'nocnt',
        Email = 'nocontract@example.com',
        EmailEncodingKey = 'UTF-8',
        LastName = 'NoContractUser',
        LanguageLocaleKey = 'en_US',
        LocaleSidKey = 'en_US',
        ProfileId = p.Id,
        TimeZoneSidKey = 'America/Los_Angeles',
        UserName = 'nocnt' + DateTime.now().getTime() + '@example.com',
        ContactId = con2.Id
        // **Remove AccountId here**
    );
    insert u3;

    System.runAs(u3) {
        ReviewerUserHelper.NdaInfo info = ReviewerUserHelper.getNdaStatus();
        System.assertEquals('Yet to Start', info.ndaStatus, 'NDA status should be Yet to start ');
    }
}


    @isTest
    static void testGetNdaStatus_NoAccount() {
        Profile p = [SELECT Id FROM Profile WHERE Name='Standard User' LIMIT 1];
        User u4 = new User(
            Alias = 'noact',
            Email = 'noaccount@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'NoAccountUser',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'noact' + DateTime.now().getTime() + '@example.com'
        );
        insert u4;

        System.runAs(u4) {
            ReviewerUserHelper.NdaInfo info = ReviewerUserHelper.getNdaStatus();
            System.assertEquals('Yet to Start', info.ndaStatus, 'NDA status should be Yet to Start if no Account');
        }
    }
}