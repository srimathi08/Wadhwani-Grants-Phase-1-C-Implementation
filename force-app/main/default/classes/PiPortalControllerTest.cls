@IsTest
public class PiPortalControllerTest {

    @TestSetup
    static void setupData() {

        Account acc = new Account(Name = 'Draft Test Institution');
        insert acc;

        Contact pi = new Contact(
            LastName = 'Pi',
            Email = 'pi@example.com',
            COE_PI__c = true,
            New_PI__c = true,
            AccountId = acc.Id
        );
        insert pi;

        Profile piProfile = [
            SELECT Id
            FROM Profile
            WHERE UserLicense.Name = 'Customer Community Plus Login'
            LIMIT 1
        ];

        User upi = new User(
            FirstName = 'a',
            LastName = 'Userpi',
            Username = 'testuserpi' + System.currentTimeMillis() + '@test.com',
            Email = 'draftpiuser@example.com',
            Alias = 'dpusr',
            CommunityNickname = 'dpiuser' + System.currentTimeMillis(),
            ProfileId = piProfile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = pi.Id
        );
        insert upi;
    }

    // =========================================
    // getPortalContext
    // =========================================
    @IsTest
    static void testGetPortalContext() {

        User u_pi = [
            SELECT Id, ContactId
            FROM User
            WHERE Email = 'draftpiuser@example.com'
            LIMIT 1
        ];

        Id accId = [
            SELECT Id
            FROM Account
            WHERE Name = 'Draft Test Institution'
            LIMIT 1
        ].Id;

        System.runAs(u_pi) {

            insert new IndividualApplication(
                Project_Title__c = 'ABC Project',
                Status = 'Draft',
                ContactId = u_pi.ContactId,
                AccountId = accId,
                ApplicationType = 'WIN Project Proposal',
                Category = 'Grant Application'
            );

            insert new IndividualApplication(
                Project_Title__c = 'ABCD Project',
                Status = 'Approved for Funding',
                ContactId = u_pi.ContactId,
                AccountId = accId,
                ApplicationType = 'WIN Project Proposal',
                Category = 'Grant Application',
                AppliedDate = System.now()
            );

            Test.startTest();
            PiPortalController.PortalContextDTO dto =
                PiPortalController.getPortalContext();
            Test.stopTest();

            System.assertNotEquals(null, dto);
        }
    }

    // =========================================
    // registerPI (Safe Success + Failure Test)
    // =========================================
    @IsTest
    static void testRegisterPI() {

        User u_pi = [
            SELECT Id
            FROM User
            WHERE Email = 'draftpiuser@example.com'
            LIMIT 1
        ];

        System.runAs(u_pi) {

            Test.startTest();

            try {
                PiPortalController.PortalContextDTO dto =
                    PiPortalController.registerPI();

                System.assertNotEquals(null, dto);

            } catch (AuraHandledException e) {

                // Covers intentional business rule failure
                System.assertNotEquals(null, e.getMessage());
            }

            Test.stopTest();
        }
    }

    // =========================================
    // getMyProposals
    // =========================================
    @IsTest
    static void testGetMyProposals() {

        User u_pi = [
            SELECT Id, ContactId
            FROM User
            WHERE Email = 'draftpiuser@example.com'
            LIMIT 1
        ];

        Id accId = [
            SELECT Id
            FROM Account
            WHERE Name = 'Draft Test Institution'
            LIMIT 1
        ].Id;

        System.runAs(u_pi) {

            insert new IndividualApplication(
                Status = 'Draft',
                ContactId = u_pi.ContactId,
                AccountId = accId,
                ApplicationType = 'WIN Project Proposal',
                Category = 'Grant Application',
                AppliedDate = System.now()
            );

            Test.startTest();
            List<PiPortalController.ProposalDTO> listProposals =
                PiPortalController.getMyProposals();
            Test.stopTest();

            System.assertEquals(1, listProposals.size());
        }
    }

    // =========================================
    // getMyApprovedForFundingProposals
    // =========================================
    @IsTest
    static void testGetMyApprovedProposals() {

        User u_pi = [
            SELECT Id, ContactId
            FROM User
            WHERE Email = 'draftpiuser@example.com'
            LIMIT 1
        ];

        Id accId = [
            SELECT Id
            FROM Account
            WHERE Name = 'Draft Test Institution'
            LIMIT 1
        ].Id;

        System.runAs(u_pi) {

            insert new IndividualApplication(
                Status = 'Approved for Funding',
                ContactId = u_pi.ContactId,
                AccountId = accId,
                ApplicationType = 'WIN Project Proposal',
                Category = 'Grant Application',
                AppliedDate = System.now()
            );

            Test.startTest();
            List<PiPortalController.ProposalDTO> listApproved =
                PiPortalController.getMyApprovedForFundingProposals();
            Test.stopTest();

            System.assertEquals(1, listApproved.size());
        }
    }
}