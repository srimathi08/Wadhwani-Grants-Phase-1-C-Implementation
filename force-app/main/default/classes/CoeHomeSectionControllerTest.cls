@IsTest
public class CoeHomeSectionControllerTest {

    @TestSetup
    static void setupData() {

        Account acc = new Account(Name = 'Test COE Account');
        insert acc;

        // PI Contacts
        insert new List<Contact>{
            new Contact(
                LastName = 'PI One',
                AccountId = acc.Id,
                COE_PI__c = true
            ),
            new Contact(
                LastName = 'PI Two',
                AccountId = acc.Id,
                COE_PI__c = true
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

    @IsTest
    static void testGetPiProjectCounts_AsAdmin() {

        Account acc = [SELECT Id FROM Account LIMIT 1];

        // Create Contact for Portal User
        Contact portalContact = new Contact(
            LastName = 'Admin Contact',
            AccountId = acc.Id,
            COE_Admin__c = true,
            Email = 'portaladmin@test.com'
        );
        insert portalContact;

        // 🔥 IMPORTANT: Use a Portal Profile (Experience Cloud)
        Profile portalProfile = [
            SELECT Id
            FROM Profile
            WHERE UserType = 'PowerPartner' OR UserType = 'CSPLitePortal'
            LIMIT 1
        ];

        User portalUser = new User(
            Username = 'portaladmin' + System.currentTimeMillis() + '@test.com',
            Alias = 'prtadm',
            Email = 'portaladmin@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'PortalAdmin',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            TimeZoneSidKey = 'Asia/Kolkata',
            ProfileId = portalProfile.Id,
            ContactId = portalContact.Id
        );

        insert portalUser;

        Test.startTest();
        System.runAs(portalUser) {

            Map<String, Integer> result =
                CoeHomeSectionController.getPiProjectCounts();

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
            Email = 'portalnormal@test.com'
        );
        insert portalContact;

        Profile portalProfile = [
            SELECT Id
            FROM Profile
            WHERE UserType = 'PowerPartner' OR UserType = 'CSPLitePortal'
            LIMIT 1
        ];

        User portalUser = new User(
            Username = 'portalnormal' + System.currentTimeMillis() + '@test.com',
            Alias = 'prtnrm',
            Email = 'portalnormal@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'PortalNormal',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            TimeZoneSidKey = 'Asia/Kolkata',
            ProfileId = portalProfile.Id,
            ContactId = portalContact.Id
        );

        insert portalUser;

        Test.startTest();
        System.runAs(portalUser) {

            Map<String, Integer> result =
                CoeHomeSectionController.getPiProjectCounts();

            System.assertEquals(0, result.get('piCount'));
            System.assertEquals(0, result.get('projectCount'));
        }
        Test.stopTest();
    }
}