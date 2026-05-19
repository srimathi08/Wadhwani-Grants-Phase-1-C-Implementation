@IsTest
public class CoeHomeFundControllerTest {

    @TestSetup
    static void setupData() {

        // Create Account
        Account acc = new Account(Name = 'Draft Test Institution');
        insert acc;

        // Create Contacts
        Contact admin = new Contact(
            LastName = 'Admin',
            Email = 'admin@example.com',
            AccountId = acc.Id
        );
        insert admin;

        Contact coe_admin = new Contact(
            LastName = 'Admincoe',
            Email = 'coeadmin@example.com',
            COE_Admin__c = true,
            AccountId = acc.Id
        );
        insert coe_admin;

        // Get Profile
        Profile p = [
            SELECT Id 
            FROM Profile 
            WHERE Name = 'COE User Profile' 
            LIMIT 1
        ];

        // Create User
        User u = new User(
            FirstName = 'Draft',
            LastName = 'User',
            Username = 'testuser' + System.currentTimeMillis() + '@test.com',
            Email = 'draftuser@example.com',
            Alias = 'duser',
            CommunityNickname = 'duser',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = admin.Id
        );
        insert u;

        // Create Funding Opportunity
        insert new FundingOpportunity(
            Name = 'Active FO',
            Status = 'Active',
            FO_Type__c = 'Project Proposal'
        );

        // ================================
        // Funding Awards (Received)
        // ================================
        FundingAward projectAward = new FundingAward(
            Name = 'Test fund PG',
            AwardeeId = acc.Id,
            Amount = 100000,
            Type_of_Fund__c = 'COE Project Grant'
        );
        insert projectAward;
        
        FundingAward operationalAward = new FundingAward(
            Name = 'test fund OG',
            AwardeeId = acc.Id,
            Amount = 50000,
            Type_of_Fund__c = 'COE Operational Grant'
        );
        insert operationalAward;

        // ================================
        // Approved Individual Application
        // ================================
        IndividualApplication app = new IndividualApplication(
             Category = 'Grant Application',
            ApplicationType ='WIN Project Proposal',
            Status = 'Approved for Funding',
            AccountId = acc.Id
        );
        insert app;

        // ================================
        // Funding Disbursement (Project Only)
        // ================================
        insert new FundingDisbursement(
            FundingAwardId = projectAward.Id,
            Proposal__c = app.Id,
            Amount = 30000
        );
    }

    // =====================================================
    // ✅ MAIN TEST
    // =====================================================
    @IsTest
    static void testGetFundSummary() {

        User testUser = [SELECT Id FROM User WHERE Alias = 'duser' LIMIT 1];

        System.runAs(testUser) {

            Test.startTest();
            Map<String, Decimal> result = CoeHomeFundController.getFundSummary();
            Test.stopTest();

            System.assertNotEquals(null, result);

            // Total = 100000 + 50000
            System.assertEquals(150000, result.get('total'));

            // Disbursed = 30000
            System.assertEquals(30000, result.get('disbursed'));

            // Available = 150000 - 30000
            System.assertEquals(120000, result.get('available'));

            // Project Grant Received
            System.assertEquals(100000, result.get('projectGrantReceived'));

            // Operational Grant Received
            System.assertEquals(50000, result.get('operationalGrantReceived'));

            // Total Received (project + operational)
            System.assertEquals(150000, result.get('totalReceived'));

            // Available Project Grant = 100000 - 30000
            System.assertEquals(70000, result.get('availableProjectGrant'));

            // Available Operational Grant (full)
            System.assertEquals(50000, result.get('availableOperationalGrant'));
        }
    }

    // =====================================================
    // ✅ EDGE CASE - No Contact User
    // =====================================================
    @IsTest
    static void testUserWithoutContact() {

        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];

        User u = new User(
            FirstName = 'No',
            LastName = 'Contact',
            Username = 'nocontact' + System.currentTimeMillis() + '@test.com',
            Email = 'nocontact@test.com',
            Alias = 'ncont',
            CommunityNickname = 'ncont',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );
        insert u;

        System.runAs(u) {

            Test.startTest();
            Map<String, Decimal> result = CoeHomeFundController.getFundSummary();
            Test.stopTest();

            System.assertEquals(0, result.get('total'));
            System.assertEquals(0, result.get('disbursed'));
            System.assertEquals(0, result.get('available'));
            System.assertEquals(0, result.get('projectGrantReceived'));
            System.assertEquals(0, result.get('operationalGrantReceived'));
            System.assertEquals(0, result.get('totalReceived'));
            System.assertEquals(0, result.get('availableProjectGrant'));
            System.assertEquals(0, result.get('availableOperationalGrant'));
        }
    }
}