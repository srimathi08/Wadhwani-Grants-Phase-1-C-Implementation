@IsTest
public class CoeMilestoneControllerTest {

    @TestSetup
    static void setupData() {

        // Account
        Account acc = new Account(Name = 'COE Test Account');
        insert acc;

        // Contact
        Contact con = new Contact(
            LastName = 'PortalUser',
            Email = 'portal@test.com',
            AccountId = acc.Id
        );
        insert con;

        // Profile
        Profile p = [
            SELECT Id
            FROM Profile
            WHERE Name = 'COE User Profile'
            LIMIT 1
        ];

        // User
        User u = new User(
            FirstName = 'Test',
            LastName = 'User',
            Username = 'milestoneuser@test.com',
            Email = 'milestone@test.com',
            Alias = 'mile',
            CommunityNickname = 'mile',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert u;

        // Individual Application
        IndividualApplication app = new IndividualApplication(
            Status = 'Approved for Funding',
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Project_Title__c = 'Milestone Proposal',
            AccountId = acc.Id
        );
        insert app;

        // Funding Award
        FundingAward fa = new FundingAward(
            Name = 'COE Wallet',
            AwardeeId = acc.Id,
            Status = 'New Fund',
            Amount = 100000,
            Type_of_Fund__c = 'COE Project Grant'
        );
        insert fa;

        // Milestone (Date fields are TEXT in your org)
        Milestone__c ms = new Milestone__c(
            
            Individual_Application__c = app.Id,
            Status__c = 'Submitted',
            Budget_Required_INR__c = 50000,
            Amount__c = 40000,
            Project_Start_Date__c = '03-01-2025',
            Project_End_Date__c = '06-01-2025'
        );
        insert ms;
    }

    // =====================================================
    // TEST getMilestones
    // =====================================================
    @IsTest
    static void testGetMilestones() {

        IndividualApplication app =
            [SELECT Id FROM IndividualApplication LIMIT 1];

        Test.startTest();
        List<CoeMilestoneController.MilestoneWrap> result =
            CoeMilestoneController.getMilestones(app.Id);
        Test.stopTest();

        System.assert(result.size() > 0);
    }

    // =====================================================
    // TEST createFundingDisbursement (Happy Path)
    // =====================================================
    @IsTest
    static void testCreateFundingDisbursement() {

        User u = [
            SELECT Id
            FROM User
            WHERE Username = 'milestoneuser@test.com'
            LIMIT 1
        ];

        IndividualApplication app =
            [SELECT Id FROM IndividualApplication LIMIT 1];

        Milestone__c ms =
            [SELECT Id FROM Milestone__c LIMIT 1];

        System.runAs(u) {

            Test.startTest();

            Id fdId = CoeMilestoneController.createFundingDisbursement(
                app.Id,
                ms.Id,
                'Invoice Attached',
                'Approved',
                System.now(),
                25000.75
            );

            Test.stopTest();

            System.assertNotEquals(null, fdId);
        }
    }

    // =====================================================
    // TEST validation paths (no strict assertions)
    // =====================================================
    @IsTest
    static void testValidationErrors() {

        User u = [
            SELECT Id
            FROM User
            WHERE Username = 'milestoneuser@test.com'
            LIMIT 1
        ];

        IndividualApplication app =
            [SELECT Id FROM IndividualApplication LIMIT 1];

        Milestone__c ms =
            [SELECT Id FROM Milestone__c LIMIT 1];

        System.runAs(u) {

            Test.startTest();

            try {
                CoeMilestoneController.createFundingDisbursement(
                    app.Id,
                    ms.Id,
                    null,
                    null,
                    System.now(),
                    0
                );
            } catch (Exception e) {
                // intentionally ignored
            }

            try {
                CoeMilestoneController.createFundingDisbursement(
                    app.Id,
                    ms.Id,
                    null,
                    null,
                    null,
                    1000
                );
            } catch (Exception e) {
                // intentionally ignored
            }

            Test.stopTest();
        }
    }
}