@IsTest
public class WcfCoeSiteHomeTest {

    private static Id getIndividualAppRecordType() {
        return [
            SELECT Id
            FROM RecordType
            WHERE SObjectType = 'IndividualApplication'
            LIMIT 1
        ].Id;
    }

    @IsTest
    static void testGetAccountRegistrationStatus() {

        Account acc = new Account(
            Name = 'Test Account',
            Institution_Registered__c = true
        );
        insert acc;

        Contact c = new Contact(
            LastName = 'Test Contact',
            AccountId = acc.Id
        );
        insert c;

        Profile p = [
            SELECT Id FROM Profile
            WHERE Name = 'Standard User'
            LIMIT 1
        ];

        User u = new User(
            Username = 'testuser' + System.currentTimeMillis() + '@test.com',
            Email = 'test@test.com',
            LastName = 'User',
            Alias = 'tusr',
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = p.Id,
            ContactId = c.Id
        );
        insert u;

        System.runAs(u) {
            Boolean result = WcfCoeSiteHome.getAccountRegistrationStatus();
            System.assertEquals(true, result);
        }
    }

    @IsTest
    static void testGetCOEProposalStatus_Approved() {

        Profile p = [
            SELECT Id FROM Profile
            WHERE Name = 'Standard User'
            LIMIT 1
        ];

        User u = new User(
            Username = 'coeuser' + System.currentTimeMillis() + '@test.com',
            Email = 'coe@test.com',
            LastName = 'COE',
            Alias = 'coe',
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = p.Id
        );
        insert u;

        System.runAs(u) {

            IndividualApplication app = new IndividualApplication(
                Status = 'Approved by COE Admin',
                RecordTypeId = getIndividualAppRecordType()
            );
            insert app;

            String status = WcfCoeSiteHome.getCOEProposalStatus();
            System.assertEquals('APPROVED', status);
        }
    }

    @IsTest
    static void testGetCOEProposalStatus_Submitted() {

        Profile p = [
            SELECT Id FROM Profile
            WHERE Name = 'Standard User'
            LIMIT 1
        ];

        User u = new User(
            Username = 'submituser' + System.currentTimeMillis() + '@test.com',
            Email = 'submit@test.com',
            LastName = 'Submit',
            Alias = 'sub',
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = p.Id
        );
        insert u;

        System.runAs(u) {

            IndividualApplication app = new IndividualApplication(
                Status = 'Submitted',
                RecordTypeId = getIndividualAppRecordType()
            );
            insert app;

            String status = WcfCoeSiteHome.getCOEProposalStatus();
            System.assertEquals('SUBMITTED', status);
        }
    }
}