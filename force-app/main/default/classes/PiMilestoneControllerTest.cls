@IsTest
public class PiMilestoneControllerTest {

    @TestSetup
    static void setupData() {

        // Create Account
        Account acc = new Account(Name = 'PI Milestone Test Account');
        insert acc;

        // Resolve a valid Contact RecordTypeId.
        // If you know the exact DeveloperName your org uses for PI/standard
        // Contacts, replace 'YOUR_RECORD_TYPE_DEVELOPER_NAME' below with it,
        // e.g. .get('PI_Contact') or .get('Master'). Keeping this consistent
        // with PiPortalControllerTest avoids the two test classes resolving
        // to different record types.
        Map<String, Schema.RecordTypeInfo> contactRTs =
            Schema.SObjectType.Contact.getRecordTypeInfosByDeveloperName();

        Id contactRecordTypeId;
        if (contactRTs.containsKey('YOUR_RECORD_TYPE_DEVELOPER_NAME')) {
            contactRecordTypeId = contactRTs.get('YOUR_RECORD_TYPE_DEVELOPER_NAME').getRecordTypeId();
        } else {
            // Fallback: grab the first available active, non-master record type
            for (Schema.RecordTypeInfo rti : contactRTs.values()) {
                if (rti.isAvailable() && !rti.isMaster()) {
                    contactRecordTypeId = rti.getRecordTypeId();
                    break;
                }
            }
        }

        // Create Contact
        Contact pi = new Contact(
            LastName = 'Pi',
            Email = 'pi@test.com',
            AccountId = acc.Id,
            RecordTypeId = contactRecordTypeId
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
        // NOTE: Project_Start_Date__c / Project_End_Date__c are String
        // fields on this object, so plain string literals are used here.
        Milestone__c ms = new Milestone__c(
            Individual_Application__c = app.Id,
            Status__c = 'Submitted',
            Project_Start_Date__c = '03-01-2025',
            Project_End_Date__c = '06-01-2025',
            Milestone_Description__c = 'Test Description',
            Disbursed_Amount__c = 20000,
            Budget_Required_INR__c = 50000,
            Total_Utilized__c = 10000,
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
    // saveMilestoneReport - valid submission
    // ==========================================
    @IsTest
    static void testSaveMilestoneReport() {

        User u = [SELECT Id FROM User WHERE Email = 'pimilestoneuser@test.com' LIMIT 1];
        Id milestoneId = [SELECT Id FROM Milestone__c LIMIT 1].Id;

        System.runAs(u) {
            Test.startTest();

            try {
                PiMilestoneController.saveMilestoneReport(
                    milestoneId,
                    25000,
                    null,
                    true
                );
            } catch (AuraHandledException e) {
                // With the controller's setMessage() fix, this now
                // prints the REAL underlying error (query/DML/FLS/
                // validation rule) instead of "Script-thrown exception".
                System.debug('saveMilestoneReport failed: ' + e.getMessage());
                throw e;
            }

            Test.stopTest();

            Milestone__c updated =
                [SELECT Status__c FROM Milestone__c WHERE Id = :milestoneId];

            System.assertEquals('Report Submitted', updated.Status__c);
        }
    }

    // ==========================================
    // saveMilestoneReport - null milestoneId
    // ==========================================
    @IsTest
    static void testSaveMilestoneReport_Null() {

        User u = [SELECT Id FROM User WHERE Email = 'pimilestoneuser@test.com' LIMIT 1];

        System.runAs(u) {
            try {
                PiMilestoneController.saveMilestoneReport(null, 25000, null, true);
                System.assert(false);
            } catch (AuraHandledException e) {
                System.assert(true);
            }
        }
    }
}