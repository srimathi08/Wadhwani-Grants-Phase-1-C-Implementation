@IsTest
public class CoeHomeSectionControllerTest {

    @TestSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test COE Account');
        insert acc;

        Id contactRtId = getContactRecordTypeId();

        // PI Contacts
        insert new List<Contact>{
            new Contact(
                LastName = 'PI One',
                AccountId = acc.Id,
                COE_PI__c = true,
                RecordTypeId = contactRtId
            ),
            new Contact(
                LastName = 'PI Two',
                AccountId = acc.Id,
                COE_PI__c = true,
                RecordTypeId = contactRtId
            )
        };

        // Individual Applications
        insert new List<IndividualApplication>{
            new IndividualApplication(
                AccountId = acc.Id,
                Category = 'Grant Application'
            ),
            new IndividualApplication(
                AccountId = acc.Id,
                Category = 'Grant Application'
            )
        };
    }

    // ---------- helpers ----------

    private static Id cachedContactRecordTypeId;

    // Resolves a valid Contact RecordTypeId dynamically (this org requires
    // one on every Contact insert). Queries the RecordType object directly
    // rather than Schema describe metadata, since describe can surface the
    // pseudo "Master" record type (Id 012000000000000AAA), which is not a
    // real, insertable record type and fails DML with INVALID_CROSS_REFERENCE_KEY.
    // If your org needs a SPECIFIC record type for these test contacts
    // (e.g. an "Applicant" vs "Reviewer" RT with its own validation rules),
    // add "AND DeveloperName = 'YourDevName'" to the query below instead.
    private static Id getContactRecordTypeId() {
        if (cachedContactRecordTypeId != null) {
            return cachedContactRecordTypeId;
        }

        List<RecordType> rts = [
            SELECT Id
            FROM RecordType
            WHERE SObjectType = 'Contact' AND IsActive = true
            ORDER BY CreatedDate ASC
            LIMIT 1
        ];
        if (!rts.isEmpty()) {
            cachedContactRecordTypeId = rts[0].Id;
        }
        return cachedContactRecordTypeId;
    }

    private static Profile getPortalProfile() {
        return [
            SELECT Id
            FROM Profile
            WHERE UserType = 'PowerPartner' OR UserType = 'CSPLitePortal'
            LIMIT 1
        ];
    }

    private static User createPortalUser(String uniqueKey, Id contactId, Id profileId) {
        User u = new User(
            Username = uniqueKey + System.currentTimeMillis() + '@test.com',
            Alias = uniqueKey.left(8),
            Email = uniqueKey + '@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = uniqueKey,
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            TimeZoneSidKey = 'Asia/Kolkata',
            ProfileId = profileId,
            ContactId = contactId
        );
        insert u;
        return u;
    }

    // ---------- getPiProjectCounts ----------

    @IsTest
    static void testGetPiProjectCounts_AsAdmin() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Contact portalContact = new Contact(
            LastName = 'Admin Contact',
            AccountId = acc.Id,
            COE_Admin__c = true,
            Email = 'portaladmin@test.com',
            RecordTypeId = getContactRecordTypeId()
        );
        insert portalContact;

        User portalUser = createPortalUser('prtadm', portalContact.Id, getPortalProfile().Id);

        Test.startTest();
        System.runAs(portalUser) {
            Map<String, Integer> result = CoeHomeSectionController.getPiProjectCounts();
            System.assertEquals(2, result.get('piCount'));
            System.assertEquals(2, result.get('projectCount'));
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetPiProjectCounts_NotAdmin() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Contact portalContact = new Contact(
            LastName = 'Normal Contact',
            AccountId = acc.Id,
            COE_Admin__c = false,
            Email = 'portalnormal@test.com',
            RecordTypeId = getContactRecordTypeId()
        );
        insert portalContact;

        User portalUser = createPortalUser('prtnrm', portalContact.Id, getPortalProfile().Id);

        Test.startTest();
        System.runAs(portalUser) {
            Map<String, Integer> result = CoeHomeSectionController.getPiProjectCounts();
            // Controller now explicitly gates on COE_Admin__c, so a non-admin
            // portal user gets zeros even though they share the same Account.
            System.assertEquals(0, result.get('piCount'));
            System.assertEquals(0, result.get('projectCount'));
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetPiProjectCounts_NoAccount() {
        // The default test-running user has no linked Contact, so
        // getCoeContext() returns a null accountId -> covers that branch.
        Test.startTest();
        Map<String, Integer> result = CoeHomeSectionController.getPiProjectCounts();
        Test.stopTest();

        System.assertEquals(0, result.get('piCount'));
        System.assertEquals(0, result.get('projectCount'));
    }

    // ---------- getPiCounts ----------

    @IsTest
    static void testGetPiCounts_AsAdmin() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        List<Contact> piContacts = [
            SELECT Id FROM Contact
            WHERE AccountId = :acc.Id AND COE_PI__c = true
        ];
        System.assertEquals(2, piContacts.size(), 'Setup should have created 2 PI contacts');

        Profile portalProfile = getPortalProfile();

        // Register one of the PI contacts as an active User -> registeredPiCount
        User piUser = createPortalUser('piusr', piContacts[0].Id, portalProfile.Id);

        // Admin contact/user to actually run the method as
        Contact adminContact = new Contact(
            LastName = 'Admin Contact 2',
            AccountId = acc.Id,
            COE_Admin__c = true,
            Email = 'portaladmin2@test.com',
            RecordTypeId = getContactRecordTypeId()
        );
        insert adminContact;
        User adminUser = createPortalUser('prtad2', adminContact.Id, portalProfile.Id);

        Test.startTest();
        System.runAs(adminUser) {
            Map<String, Integer> result = CoeHomeSectionController.getPiCounts();
            System.assertEquals(2, result.get('addedPiCount'));      // PI One + PI Two
            System.assertEquals(1, result.get('registeredPiCount')); // only piUser is registered
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetPiCounts_NotAdmin() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Contact portalContact = new Contact(
            LastName = 'Normal Contact 2',
            AccountId = acc.Id,
            COE_Admin__c = false,
            Email = 'portalnormal2@test.com',
            RecordTypeId = getContactRecordTypeId()
        );
        insert portalContact;

        User portalUser = createPortalUser('prtnr2', portalContact.Id, getPortalProfile().Id);

        Test.startTest();
        System.runAs(portalUser) {
            Map<String, Integer> result = CoeHomeSectionController.getPiCounts();
            System.assertEquals(0, result.get('addedPiCount'));
            System.assertEquals(0, result.get('registeredPiCount'));
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetPiCounts_NoAccount() {
        Test.startTest();
        Map<String, Integer> result = CoeHomeSectionController.getPiCounts();
        Test.stopTest();

        System.assertEquals(0, result.get('addedPiCount'));
        System.assertEquals(0, result.get('registeredPiCount'));
    }
}