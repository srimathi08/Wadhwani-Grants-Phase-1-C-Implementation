@IsTest
public class PiMilestoneControllerTest {

    @TestSetup
    static void setupData() {

        // Create Account
        Account acc = new Account(Name = 'PI Milestone Test Account');
        insert acc;

        // Create Contact
        Contact pi = new Contact(
            LastName = 'Pi',
            Email = 'pi@test.com',
            AccountId = acc.Id
        );
        insert pi;

        // Get any Customer Community Plus Login profile
        Profile p = [
            SELECT Id
            FROM Profile
            WHERE UserLicense.Name = 'Customer Community Plus Login'
            LIMIT 1
        ];

        // Create Portal User
        User u = new User(
            FirstName = 'Test',
            LastName = 'User',
            Username = 'pimilestoneuser' + System.currentTimeMillis() + '@test.com',
            Email = 'pimilestoneuser@test.com',
            Alias = 'pmusr',
            CommunityNickname = 'pmusr' + System.currentTimeMillis(),
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = pi.Id
        );
        insert u;

        // Create Individual Application
        IndividualApplication app = new IndividualApplication(
            Status = 'Approved for Funding',
            ContactId = pi.Id,
            AccountId = acc.Id,
            ApplicationType = 'WIN Project Proposal',
            Category = 'Grant Application',
            AppliedDate = System.now()
        );
        insert app;

        // Create Milestone
       Milestone__c ms = new Milestone__c(
    Individual_Application__c = app.Id,
    Status__c = 'Submitted',
    Project_Start_Date__c = '03-01-2025',
    Project_End_Date__c = '06-01-2025',
    Milestone_Description__c = 'Test Description',
    Disbursed_Amount__c = 20000,
    Budget_Required_INR__c = 50000,
    Requested_Support_Documents_Portal__c = 'Invoice, Report'
);
insert ms;
    }

    // ==========================================
    // getMilestones (with appId)
    // ==========================================
    @IsTest
    static void testGetMilestones_WithAppId() {

        User u = [SELECT Id FROM User WHERE Email = 'pimilestoneuser@test.com' LIMIT 1];
        Id appId = [SELECT Id FROM IndividualApplication LIMIT 1].Id;

        System.runAs(u) {
            Test.startTest();
            List<PiMilestoneController.MilestoneDTO> result =
                PiMilestoneController.getMilestones(appId);
            Test.stopTest();

            System.assertEquals(1, result.size());
            System.assertEquals('Submitted', result[0].status);
        }
    }

    // ==========================================
    // getMilestones (null appId)
    // ==========================================
    @IsTest
    static void testGetMilestones_NullAppId() {

        User u = [SELECT Id FROM User WHERE Email = 'pimilestoneuser@test.com' LIMIT 1];

        System.runAs(u) {
            Test.startTest();
            List<PiMilestoneController.MilestoneDTO> result =
                PiMilestoneController.getMilestones(null);
            Test.stopTest();

            System.assertEquals(1, result.size());
        }
    }

    // ==========================================
    // getRequestedSupportDocs
    // ==========================================
    @IsTest
    static void testGetRequestedSupportDocs() {

        User u = [SELECT Id FROM User WHERE Email = 'pimilestoneuser@test.com' LIMIT 1];
        Id milestoneId = [SELECT Id FROM Milestone__c LIMIT 1].Id;

        System.runAs(u) {
            String docs =
                PiMilestoneController.getRequestedSupportDocs(milestoneId);

            System.assertEquals('Invoice, Report', docs);
        }
    }

    // ==========================================
    // markMilestoneAsReportSubmitted
    // ==========================================
    /*@IsTest
    static void testMarkMilestoneAsReportSubmitted() {

        User u = [SELECT Id FROM User WHERE Email = 'pimilestoneuser@test.com' LIMIT 1];
        Id milestoneId = [SELECT Id FROM Milestone__c LIMIT 1].Id;

        System.runAs(u) {

            PiMilestoneController.markMilestoneAsReportSubmitted(milestoneId);

            Milestone__c updated =
                [SELECT Status__c FROM Milestone__c WHERE Id = :milestoneId];

            System.assertEquals('Report Submitted', updated.Status__c);
        }
    }*/

    // ==========================================
    // Exception case
    // ==========================================
    @IsTest
    static void testMarkMilestoneAsReportSubmitted_Null() {

        User u = [SELECT Id FROM User WHERE Email = 'pimilestoneuser@test.com' LIMIT 1];

        System.runAs(u) {
            try {
                PiMilestoneController.markMilestoneAsReportSubmitted(null);
                System.assert(false);
            } catch (AuraHandledException e) {
                System.assert(true);
            }
        }
    }
}