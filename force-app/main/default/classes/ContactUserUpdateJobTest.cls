@isTest
private class ContactUserUpdateJobTest {

    @testSetup
    static void setup() {
        // Account whose Website has a "www." prefix, to test the replace('www.', '') logic
        Account acc1 = new Account(Name = 'Acme Corp', Website = 'www.acme.com');
        // Account whose Website has no "www." prefix
        Account acc2 = new Account(Name = 'Beta Inc', Website = 'beta.com');
        insert new List<Account>{ acc1, acc2 };

        // Contact whose email domain matches acc1, but has no Account yet
        Contact con1 = new Contact(
            FirstName = 'John',
            LastName  = 'Doe',
            Email     = 'john.doe@acme.com',
            AccountId = null
        );

        // Contact whose email domain matches acc2, and is ALREADY linked correctly
        Contact con2 = new Contact(
            FirstName = 'Jane',
            LastName  = 'Smith',
            Email     = 'jane.smith@beta.com',
            AccountId = acc2.Id
        );

        // Contact whose email domain has no matching Account
        Contact con3 = new Contact(
            FirstName = 'No',
            LastName  = 'Match',
            Email     = 'nomatch@unknown.com'
        );

        insert new List<Contact>{ con1, con2, con3 };
    }

    @isTest
    static void testContactAccountGetsUpdated() {
        Contact con = [SELECT Id, Email FROM Contact WHERE Email = 'john.doe@acme.com' LIMIT 1];
        Map<String, Id> contactEmailToId = new Map<String, Id>{ con.Email => con.Id };
        Set<String> emailDomains = new Set<String>{ 'acme.com' };

        Test.startTest();
        System.enqueueJob(new ContactUserUpdateJob(contactEmailToId, emailDomains));
        Test.stopTest();

        Account acc = [SELECT Id FROM Account WHERE Website = 'www.acme.com' LIMIT 1];
        Contact updatedCon = [SELECT Id, AccountId FROM Contact WHERE Id = :con.Id];

        System.assertEquals(
            acc.Id,
            updatedCon.AccountId,
            'Contact should be linked to the Account whose domain matches the email domain'
        );
    }

    @isTest
    static void testContactAlreadyLinkedIsUnchanged() {
        Contact con = [SELECT Id, Email, AccountId FROM Contact WHERE Email = 'jane.smith@beta.com' LIMIT 1];
        Map<String, Id> contactEmailToId = new Map<String, Id>{ con.Email => con.Id };
        Set<String> emailDomains = new Set<String>{ 'beta.com' };

        Test.startTest();
        System.enqueueJob(new ContactUserUpdateJob(contactEmailToId, emailDomains));
        Test.stopTest();

        Contact afterCon = [SELECT Id, AccountId FROM Contact WHERE Id = :con.Id];

        System.assertEquals(
            con.AccountId,
            afterCon.AccountId,
            'Contact already linked to the correct Account should remain unchanged (covers the else branch)'
        );
    }

    @isTest
    static void testNoMatchingDomainLeavesContactUntouched() {
        Contact con = [SELECT Id, Email FROM Contact WHERE Email = 'nomatch@unknown.com' LIMIT 1];
        Map<String, Id> contactEmailToId = new Map<String, Id>{ con.Email => con.Id };
        Set<String> emailDomains = new Set<String>{ 'unknown.com' };

        Test.startTest();
        System.enqueueJob(new ContactUserUpdateJob(contactEmailToId, emailDomains));
        Test.stopTest();

        Contact afterCon = [SELECT Id, AccountId FROM Contact WHERE Id = :con.Id];

        System.assertEquals(
            null,
            afterCon.AccountId,
            'Contact should remain without an Account since no domain match exists'
        );
    }

    @isTest
    static void testEmptyContactMapDoesNotThrow() {
        Map<String, Id> contactEmailToId = new Map<String, Id>();
        Set<String> emailDomains = new Set<String>();

        Test.startTest();
        System.enqueueJob(new ContactUserUpdateJob(contactEmailToId, emailDomains));
        Test.stopTest();

        // Job should complete without throwing, covering the "No Contacts found to update" path
        System.assert(true, 'Job executed successfully with an empty contact map');
    }

    @isTest
    static void testMultipleContactsMixedResults() {
        List<Contact> cons = [
            SELECT Id, Email FROM Contact
            WHERE Email IN ('john.doe@acme.com', 'jane.smith@beta.com', 'nomatch@unknown.com')
        ];

        Map<String, Id> contactEmailToId = new Map<String, Id>();
        for (Contact c : cons) {
            contactEmailToId.put(c.Email, c.Id);
        }
        Set<String> emailDomains = new Set<String>{ 'acme.com', 'beta.com', 'unknown.com' };

        Test.startTest();
        System.enqueueJob(new ContactUserUpdateJob(contactEmailToId, emailDomains));
        Test.stopTest();

        Account acmeAcc = [SELECT Id FROM Account WHERE Website = 'www.acme.com' LIMIT 1];
        Map<Id, Contact> updatedCons = new Map<Id, Contact>(
            [SELECT Id, AccountId, Email FROM Contact WHERE Id IN :contactEmailToId.values()]
        );

        for (Contact c : updatedCons.values()) {
            if (c.Email == 'john.doe@acme.com') {
                System.assertEquals(acmeAcc.Id, c.AccountId, 'Acme contact should now be linked');
            } else if (c.Email == 'nomatch@unknown.com') {
                System.assertEquals(null, c.AccountId, 'Unmatched contact should stay unlinked');
            }
        }
    }
}