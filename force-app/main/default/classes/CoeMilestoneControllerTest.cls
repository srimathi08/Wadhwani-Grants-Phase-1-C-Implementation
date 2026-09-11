@IsTest
public class CoeMilestoneControllerTest {

    @TestSetup
    static void setupData() {

        // Resolve an available, non-master Contact Record Type dynamically,
        // since this org requires an explicit Record Type on Contact.
        Id contactRecordTypeId = null;
        Map<String, Schema.RecordTypeInfo> contactRts =
            Schema.SObjectType.Contact.getRecordTypeInfosByName();
        for (Schema.RecordTypeInfo rti : contactRts.values()) {
            if (rti.isAvailable() && !rti.isMaster()) {
                contactRecordTypeId = rti.getRecordTypeId();
                break;
            }
        }

        // ===== Primary Account / Contact / Portal User (has Funding Award) =====
        Account acc = new Account(Name = 'COE Test Account');
        insert acc;

        Contact con = new Contact(
            LastName = 'PortalUser',
            Email = 'portal@test.com',
            AccountId = acc.Id,
            RecordTypeId = contactRecordTypeId
        );
        insert con;

        Profile portalProfile = [
            SELECT Id
            FROM Profile
            WHERE Name = 'COE User Profile'
            LIMIT 1
        ];

        User u = new User(
            FirstName = 'Test',
            LastName = 'User',
            Username = 'milestoneuser@test.com',
            Email = 'milestone@test.com',
            Alias = 'mile',
            CommunityNickname = 'mile',
            ProfileId = portalProfile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = con.Id
        );
        insert u;

        // Individual Application (used by testGetMilestones - must have exactly 1 milestone)
        IndividualApplication app = new IndividualApplication(
            Status = 'Approved for Funding',
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Project_Title__c = 'Milestone Proposal',
            AccountId = acc.Id
        );
        insert app;

        // Separate Individual Application to host the 'Report Submitted' milestone,
        // so it doesn't get counted by testGetMilestones against `app`.
        IndividualApplication appForReport = new IndividualApplication(
            Status = 'Approved for Funding',
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Project_Title__c = 'Milestone Report Proposal',
            AccountId = acc.Id
        );
        insert appForReport;

        // Funding Award (status = 'New Fund' so happy path works)
        FundingAward fa = new FundingAward(
            Name = 'COE Wallet',
            AwardeeId = acc.Id,
            Status = 'New Fund',
            Amount = 100000,
            Type_of_Fund__c = 'COE Project Grant'
        );
        insert fa;

        // Milestone in 'Submitted' status (Date fields are TEXT in this org)
        Milestone__c ms = new Milestone__c(
            Individual_Application__c = app.Id,
            Status__c = 'Submitted',
            Budget_Required_INR__c = 50000,
            Amount__c = 40000,
            Project_Start_Date__c = '03-01-2025',
            Project_End_Date__c = '06-01-2025'
        );
        insert ms;

        // Milestone in 'Report Submitted' status, for approveMilestoneReport happy path
        // (parented to appForReport so it does not affect testGetMilestones)
        Milestone__c msReportSubmitted = new Milestone__c(
            Individual_Application__c = appForReport.Id,
            Status__c = 'Report Submitted',
            Budget_Required_INR__c = 60000,
            Amount__c = 45000,
            Project_Start_Date__c = '04-01-2025',
            Project_End_Date__c = '07-01-2025'
        );
        insert msReportSubmitted;

        // ===== Second Account / Contact / Portal User with NO Funding Award =====
        Account accNoFa = new Account(Name = 'COE Test Account No FA');
        insert accNoFa;

        Contact conNoFa = new Contact(
            LastName = 'PortalUserNoFA',
            Email = 'portalnofa@test.com',
            AccountId = accNoFa.Id,
            RecordTypeId = contactRecordTypeId
        );
        insert conNoFa;

        User uNoFa = new User(
            FirstName = 'Test',
            LastName = 'NoFundingAward',
            Username = 'milestoneusernofa@test.com',
            Email = 'milestonenofa@test.com',
            Alias = 'milenf',
            CommunityNickname = 'milenf',
            ProfileId = portalProfile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = conNoFa.Id
        );
        insert uNoFa;

        IndividualApplication appNoFa = new IndividualApplication(
            Status = 'Approved for Funding',
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Project_Title__c = 'Milestone Proposal No FA',
            AccountId = accNoFa.Id
        );
        insert appNoFa;

        Milestone__c msNoFa = new Milestone__c(
            Individual_Application__c = appNoFa.Id,
            Status__c = 'Submitted',
            Budget_Required_INR__c = 50000,
            Amount__c = 40000,
            Project_Start_Date__c = '03-01-2025',
            Project_End_Date__c = '06-01-2025'
        );
        insert msNoFa;

        // ===== Internal user with no associated Contact (System Administrator) =====
        Profile adminProfile = [
            SELECT Id
            FROM Profile
            WHERE Name = 'System Administrator'
            LIMIT 1
        ];

        User uNoContact = new User(
            FirstName = 'Test',
            LastName = 'NoContact',
            Username = 'milestoneusernocontact@test.com',
            Email = 'milestonenocontact@test.com',
            Alias = 'milenc',
            ProfileId = adminProfile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );
        insert uNoContact;
    }

    // =====================================================
    // TEST getMilestones - happy path
    // =====================================================
    @IsTest
    static void testGetMilestones() {

        IndividualApplication app = [
            SELECT Id
            FROM IndividualApplication
            WHERE Project_Title__c = 'Milestone Proposal'
            LIMIT 1
        ];

        Test.startTest();
        List<CoeMilestoneController.MilestoneWrap> result =
            CoeMilestoneController.getMilestones(app.Id);
        Test.stopTest();

        System.assertEquals(1, result.size(), 'Expected exactly one milestone for this application.');
        System.assertEquals('Submitted', result[0].status);
        System.assertNotEquals(null, result[0].milestoneId);
    }

    // =====================================================
    // TEST getMilestones - null appId returns empty list
    // =====================================================
    @IsTest
    static void testGetMilestonesNullAppId() {

        Test.startTest();
        List<CoeMilestoneController.MilestoneWrap> result =
            CoeMilestoneController.getMilestones(null);
        Test.stopTest();

        System.assertEquals(0, result.size(), 'Expected an empty list when appId is null.');
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

        IndividualApplication app = [
            SELECT Id
            FROM IndividualApplication
            WHERE Project_Title__c = 'Milestone Proposal'
            LIMIT 1
        ];

        Milestone__c ms = [
            SELECT Id
            FROM Milestone__c
            WHERE Individual_Application__c = :app.Id
            AND Status__c = 'Submitted'
            LIMIT 1
        ];

        Id fdId;

        // Perform the DML-triggering call as the portal user.
        System.runAs(u) {

            Test.startTest();

            fdId = CoeMilestoneController.createFundingDisbursement(
                app.Id,
                ms.Id,
                'Invoice Attached',
                'Approved',
                System.now(),
                25000.75
            );

            Test.stopTest();
        }

        // Verify OUTSIDE runAs — the portal user's restricted record visibility
        // means it can't reliably re-query the Milestone/FundingDisbursement records.
        System.assertNotEquals(null, fdId);

        Milestone__c updatedMs = [
            SELECT Status__c, Disbursed_Amount__c, Funding_Disbursement__c, Funding_Type__c
            FROM Milestone__c
            WHERE Id = :ms.Id
        ];
        System.assertEquals('Fund Disbursed', updatedMs.Status__c);
        System.assertEquals(25001, updatedMs.Disbursed_Amount__c);
        System.assertEquals(fdId, updatedMs.Funding_Disbursement__c);
        System.assertEquals('COE Project Grant', updatedMs.Funding_Type__c);
    }

    // =====================================================
    // TEST createFundingDisbursement - missing appId / milestoneId
    // =====================================================
    @IsTest
    static void testCreateFundingDisbursementMissingIds() {

        User u = [
            SELECT Id
            FROM User
            WHERE Username = 'milestoneuser@test.com'
            LIMIT 1
        ];

        Milestone__c ms = [SELECT Id FROM Milestone__c LIMIT 1];

        System.runAs(u) {
            Test.startTest();

            Boolean exceptionThrown = false;
            try {
                CoeMilestoneController.createFundingDisbursement(
                    null,
                    ms.Id,
                    'docs',
                    'comments',
                    System.now(),
                    1000
                );
            } catch (AuraHandledException e) {
                exceptionThrown = true;
            }
            System.assert(exceptionThrown, 'Expected exception when appId is null.');

            Test.stopTest();
        }
    }

    // =====================================================
    // TEST createFundingDisbursement - invalid approved amount
    // =====================================================
    @IsTest
    static void testCreateFundingDisbursementInvalidAmount() {

        User u = [
            SELECT Id
            FROM User
            WHERE Username = 'milestoneuser@test.com'
            LIMIT 1
        ];

        IndividualApplication app = [
            SELECT Id
            FROM IndividualApplication
            WHERE Project_Title__c = 'Milestone Proposal'
            LIMIT 1
        ];

        Milestone__c ms = [
            SELECT Id
            FROM Milestone__c
            WHERE Individual_Application__c = :app.Id
            AND Status__c = 'Submitted'
            LIMIT 1
        ];

        System.runAs(u) {
            Test.startTest();

            Boolean nullAmountThrown = false;
            try {
                CoeMilestoneController.createFundingDisbursement(
                    app.Id, ms.Id, 'docs', 'comments', System.now(), null
                );
            } catch (AuraHandledException e) {
                nullAmountThrown = true;
            }
            System.assert(nullAmountThrown, 'Expected exception when approvedAmount is null.');

            Boolean zeroAmountThrown = false;
            try {
                CoeMilestoneController.createFundingDisbursement(
                    app.Id, ms.Id, 'docs', 'comments', System.now(), 0
                );
            } catch (AuraHandledException e) {
                zeroAmountThrown = true;
            }
            System.assert(zeroAmountThrown, 'Expected exception when approvedAmount is 0.');

            Boolean negativeAmountThrown = false;
            try {
                CoeMilestoneController.createFundingDisbursement(
                    app.Id, ms.Id, 'docs', 'comments', System.now(), -500
                );
            } catch (AuraHandledException e) {
                negativeAmountThrown = true;
            }
            System.assert(negativeAmountThrown, 'Expected exception when approvedAmount is negative.');

            Test.stopTest();
        }
    }

    // =====================================================
    // TEST createFundingDisbursement - missing disbursement date
    // =====================================================
    @IsTest
    static void testCreateFundingDisbursementMissingDate() {

        User u = [
            SELECT Id
            FROM User
            WHERE Username = 'milestoneuser@test.com'
            LIMIT 1
        ];

        IndividualApplication app = [
            SELECT Id
            FROM IndividualApplication
            WHERE Project_Title__c = 'Milestone Proposal'
            LIMIT 1
        ];

        Milestone__c ms = [
            SELECT Id
            FROM Milestone__c
            WHERE Individual_Application__c = :app.Id
            AND Status__c = 'Submitted'
            LIMIT 1
        ];

        System.runAs(u) {
            Test.startTest();

            Boolean exceptionThrown = false;
            try {
                CoeMilestoneController.createFundingDisbursement(
                    app.Id, ms.Id, 'docs', 'comments', null, 1000
                );
            } catch (AuraHandledException e) {
                exceptionThrown = true;
            }
            System.assert(exceptionThrown, 'Expected exception when disbursementDate is null.');

            Test.stopTest();
        }
    }

    // =====================================================
    // TEST createFundingDisbursement - user has no Contact/Account mapping
    // =====================================================
    @IsTest
    static void testCreateFundingDisbursementNoContactMapping() {

        User uNoContact = [
            SELECT Id
            FROM User
            WHERE Username = 'milestoneusernocontact@test.com'
            LIMIT 1
        ];

        IndividualApplication app = [
            SELECT Id
            FROM IndividualApplication
            WHERE Project_Title__c = 'Milestone Proposal'
            LIMIT 1
        ];

        Milestone__c ms = [
            SELECT Id
            FROM Milestone__c
            WHERE Individual_Application__c = :app.Id
            AND Status__c = 'Submitted'
            LIMIT 1
        ];

        System.runAs(uNoContact) {
            Test.startTest();

            Boolean exceptionThrown = false;
            try {
                CoeMilestoneController.createFundingDisbursement(
                    app.Id, ms.Id, 'docs', 'comments', System.now(), 1000
                );
            } catch (AuraHandledException e) {
                exceptionThrown = true;
            }
            System.assert(exceptionThrown, 'Expected exception when running user is not mapped to a Contact/Account.');

            Test.stopTest();
        }
    }

    // =====================================================
    // TEST createFundingDisbursement - no 'New Fund' FundingAward found
    // =====================================================
    @IsTest
    static void testCreateFundingDisbursementNoFundingAward() {

        User uNoFa = [
            SELECT Id
            FROM User
            WHERE Username = 'milestoneusernofa@test.com'
            LIMIT 1
        ];

        IndividualApplication appNoFa = [
            SELECT Id
            FROM IndividualApplication
            WHERE Project_Title__c = 'Milestone Proposal No FA'
            LIMIT 1
        ];

        Milestone__c msNoFa = [
            SELECT Id
            FROM Milestone__c
            WHERE Individual_Application__c = :appNoFa.Id
            LIMIT 1
        ];

        System.runAs(uNoFa) {
            Test.startTest();

            Boolean exceptionThrown = false;
            try {
                CoeMilestoneController.createFundingDisbursement(
                    appNoFa.Id, msNoFa.Id, 'docs', 'comments', System.now(), 1000
                );
            } catch (AuraHandledException e) {
                exceptionThrown = true;
            }
            System.assert(exceptionThrown, 'Expected exception when no "New Fund" FundingAward exists for the account.');

            Test.stopTest();
        }
    }

    // =====================================================
    // TEST approveMilestoneReport - missing milestoneId
    // =====================================================
    @IsTest
    static void testApproveMilestoneReportMissingId() {

        Test.startTest();

        Boolean exceptionThrown = false;
        try {
            CoeMilestoneController.approveMilestoneReport(null);
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        System.assert(exceptionThrown, 'Expected exception when milestoneId is null.');

        Test.stopTest();
    }

    // =====================================================
    // TEST approveMilestoneReport - wrong status
    // =====================================================
    @IsTest
    static void testApproveMilestoneReportWrongStatus() {

        Milestone__c ms = [
            SELECT Id
            FROM Milestone__c
            WHERE Status__c = 'Submitted'
            LIMIT 1
        ];

        Test.startTest();

        Boolean exceptionThrown = false;
        try {
            CoeMilestoneController.approveMilestoneReport(ms.Id);
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        System.assert(exceptionThrown, 'Expected exception when milestone status is not "Report Submitted".');

        Test.stopTest();
    }

    // =====================================================
    // TEST approveMilestoneReport - happy path
    // =====================================================
    @IsTest
    static void testApproveMilestoneReportHappyPath() {

        Milestone__c ms = [
            SELECT Id
            FROM Milestone__c
            WHERE Status__c = 'Report Submitted'
            LIMIT 1
        ];

        Test.startTest();
        CoeMilestoneController.approveMilestoneReport(ms.Id);
        Test.stopTest();

        Milestone__c updated = [
            SELECT Status__c
            FROM Milestone__c
            WHERE Id = :ms.Id
        ];
        System.assertEquals('Report Approved', updated.Status__c);
    }
}