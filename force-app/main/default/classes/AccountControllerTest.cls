@isTest
private class AccountControllerTest {

    @testSetup
    static void createTestData() {
        // Create test Account
        Account acc = new Account(Name = 'COE Test Account', Institution_Registered__c = true);
        insert acc;

        // Create test Contact linked to the Account
        Contact c = new Contact(LastName = 'COE Test', AccountId = acc.Id);
        insert c;

        // Get a profile (adjust name if needed)
        Profile p = [SELECT Id FROM Profile WHERE Name = 'COE User Profile' LIMIT 1];

        // Create test User linked to the Contact
        User u = new User(
            UserName = 'testuser@test.com',
            FirstName = 'Test-First',
            LastName = 'Test-Last',
            Alias = 'test',
            Email = 'test2wcf@test.com',
            CommunityNickName = String.valueOf(Math.random()).substring(0, 6),
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/New_York',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = c.Id
        );
        insert u;
    }

    @isTest
    static void testGetUserDetails() {
        // Query the user created in @testSetup by email
        User u = [SELECT Id FROM User WHERE Email = 'test2wcf@test.com' LIMIT 1];

        System.runAs(u) {
            Test.startTest();
            AccountController.UserDetailsWrapper result = AccountController.getUserDetails();
            Test.stopTest();

            
        }
    }

    @isTest
    static void testUpdateUserRecords() {
        Account acc = [SELECT Id, Name, Institution_Registered__c FROM Account LIMIT 1];
        Contact con = [SELECT Id, Name FROM Contact LIMIT 1];

       

        Test.startTest();
        AccountController.updateUserRecords(acc, con);
        Test.stopTest();

        Account updatedAcc = [SELECT Phone, Institution_Registered__c FROM Account WHERE Id = :acc.Id];
        Contact updatedCon = [SELECT FirstName FROM Contact WHERE Id = :con.Id];

            }

    @isTest
    static void testUpdateUserRecords_Invalid() {
        Test.startTest();
        try {
            AccountController.updateUserRecords(null, null);
            
        } catch (AuraHandledException e) {
           
        }
        Test.stopTest();
    }

    @isTest
    static void testLinkFilesToAccount() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        // Create a dummy file
        ContentVersion contentVersion = new ContentVersion(
            Title = 'Test File',
            PathOnClient = 'TestFile.txt',
            VersionData = Blob.valueOf('This is a test file.')
        );
        insert contentVersion;

        // Retrieve ContentDocumentId from inserted ContentVersion
        ContentVersion insertedVersion = [
            SELECT Id, ContentDocumentId 
            FROM ContentVersion 
            WHERE Id = :contentVersion.Id 
            LIMIT 1
        ];

        List<String> fileIds = new List<String>{insertedVersion.ContentDocumentId};

        Test.startTest();
        AccountController.linkFilesToAccount(fileIds, acc.Id);
        Test.stopTest();

        List<ContentDocumentLink> links = [
            SELECT Id FROM ContentDocumentLink 
            WHERE LinkedEntityId = :acc.Id 
            AND ContentDocumentId = :insertedVersion.ContentDocumentId
        ];

        System.assertEquals(1, links.size());
    }

    @isTest
    static void testLinkFilesToAccount_Invalid() {
        Test.startTest();
        try {
            AccountController.linkFilesToAccount(null, null);
          
        } catch (AuraHandledException e) {
           
        }
        Test.stopTest();
    }
}