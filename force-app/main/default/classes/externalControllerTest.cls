@isTest
private class externalControllerTest {

    @isTest
    static void testGetPersonAccountAndContactId() {
        // Create Account
        Account acc = new Account(Name = 'Test Account');
        insert acc;

        // Create Contact linked to Account
        Contact con = new Contact(FirstName = 'External', LastName = 'User', AccountId = acc.Id);
        insert con;

        // Create User linked to the Contact
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1];
        User u = new User(
             FirstName = 'External',
            LastName = 'User',
            Username = 'ExternalTest@test.com',
            Email = 'External@example.com',
            Alias = 'duser',
            CommunityNickname = 'Euser',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert u;

        // Run as this user and call method
        System.runAs(u) {
            Map<String, Id> result = externalController.getPersonAccountAndContactId();
            System.assertNotEquals(null, result);
            System.assertEquals(acc.Id, result.get('accountId'));
            System.assertEquals(con.Id, result.get('contactId'));
        }
    }

    @isTest
    static void testMarkReviewerRegistered() {
        // Create Account with custom field
        Account acc = new Account(Name = 'Test Account', Reviewer_registered__c = false);
        insert acc;

        Test.startTest();
        externalController.markReviewerRegistered(acc.Id);
        Test.stopTest();

        Account updatedAcc = [SELECT Reviewer_registered__c FROM Account WHERE Id = :acc.Id];
        System.assertEquals(true, updatedAcc.Reviewer_registered__c);
    }

//Newly Added
@isTest
static void testUpdatePersonAccount() {
    // Create Account with partial data
   Account acc = new Account(
    FirstName = 'John',
    LastName = 'Doe',
    RecordTypeId = [SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND Name = 'Reviewer' LIMIT 1].Id
);
insert acc;

    Test.startTest();
    externalController.updatePersonAccount(
        acc.Id,
        'Mr.',
        'John',
        'Doe',
        '1234567890',
        'john.doe@example.com',
        'alt@example.com',
        'My Organization',
        'Developer',
        'Health tech;Critical Minerals and Mining',
        'Profile summary',
        '123 Main St',
        'Mumbai',
        'IN',
        'MH',
        '400001',
        'ABCDE1234F',
        'John Doe',
        '123456789',
        'My Bank',
        'Main Branch',
        'IFSC1234'
    );
    Test.stopTest();

    // ✅ Verify
    Account updated = [SELECT FirstName, LastName, Phone, PersonEmail,
        EmailCustom__c, Current_Organization__pc, Current_Role__pc, Field_of_specialization__pc,
        Profile_Executive_Summary__pc, BillingStreet, BillingCity, BillingCountryCode,
        BillingStateCode, BillingPostalCode, PAN_Number__pc, Bank_Account_Name__pc,
        Account_Number__pc, Bank_Name__pc, Branch_Name__pc, IFSC_Code__pc
        FROM Account WHERE Id = :acc.Id];

    
    System.assertEquals('1234567890', updated.Phone);
    System.assertEquals('john.doe@example.com', updated.PersonEmail);
    System.assertEquals('alt@example.com', updated.EmailCustom__c);
    System.assertEquals('Health tech;Critical Minerals and Mining', updated.Field_of_specialization__pc);
    System.assertEquals('IN', updated.BillingCountryCode);
    System.assertEquals('MH', updated.BillingStateCode);
    System.assertEquals('ABCDE1234F', updated.PAN_Number__pc);
    System.assertEquals('John Doe', updated.Bank_Account_Name__pc);
    System.assertEquals('IFSC1234', updated.IFSC_Code__pc);
}



}