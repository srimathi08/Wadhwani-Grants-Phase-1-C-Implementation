@IsTest
public class CoeFundControllerTest {

    /* =====================================================
       CONTACT RECORD TYPE HELPER
       Some orgs enforce Record Types on Contact with no
       default assigned to the running user's profile, which
       causes:
       "CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY, record type
        missing for: Contact"
       This helper finds a usable RecordTypeId (if any exist)
       and applies it so inserts succeed regardless of the
       running user's default assignment.
    ===================================================== */
    private static Id contactRecordTypeId;
    private static Boolean contactRecordTypeChecked = false;

    private static Id getContactRecordTypeId() {
        if (!contactRecordTypeChecked) {
            contactRecordTypeChecked = true;
            List<RecordType> rts = [
                SELECT Id
                FROM RecordType
                WHERE SObjectType = 'Contact'
                AND IsActive = true
                ORDER BY IsPersonType ASC
                LIMIT 1
            ];
            if (!rts.isEmpty()) {
                contactRecordTypeId = rts[0].Id;
            }
        }
        return contactRecordTypeId;
    }

    private static Contact buildContact(String lastName, Id accountId) {
        Contact con = new Contact(
            LastName = lastName,
            AccountId = accountId
        );
        Id rtId = getContactRecordTypeId();
        if (rtId != null) {
            con.RecordTypeId = rtId;
        }
        return con;
    }

    /* =====================================================
       SAFE USER CREATION (PORTAL-AWARE, ORG-SAFE)
       ✔ Portal user ONLY when Contact exists
       ✔ Standard user when Contact is null
    ===================================================== */
    private static User createUser(Contact con) {

        Profile p;

        // If NO contact → must be Standard User
        if (con == null) {
            p = [
                SELECT Id
                FROM Profile
                WHERE Name = 'Standard User'
                LIMIT 1
            ];
        } 
        // Contact exists → try portal profile
        else {
            List<Profile> portalProfiles = [
                SELECT Id
                FROM Profile
                WHERE UserType IN ('CustomerPortal', 'PowerCustomerSuccess', 'CsnOnly')
                LIMIT 1
            ];

            if (!portalProfiles.isEmpty()) {
                p = portalProfiles[0]; // portal user WITH contact
            } else {
                // fallback to standard user
                p = [
                    SELECT Id
                    FROM Profile
                    WHERE Name = 'Standard User'
                    LIMIT 1
                ];
                con = null; // safety
            }
        }

        User u = new User(
            Alias = 'tusr',
            Email = 'user@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'User',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_IN',
            TimeZoneSidKey = 'Asia/Kolkata',
            Username = 'user' + System.currentTimeMillis() + '@test.com',
            ProfileId = p.Id,
            ContactId = con != null ? con.Id : null
        );
        insert u;

        return u;
    }

    /* =====================================================
       TEST: getFundProjects – FULL DATA PATH
    ===================================================== */
    @IsTest
    static void testGetFundProjectsFullCoverage() {

        Account acc = new Account(Name = 'COE Account');
        insert acc;

        Contact con = buildContact('PI User', acc.Id);
        insert con;

        User u = createUser(con);

        IndividualApplication app = new IndividualApplication(
            Status = 'Approved for Funding',
            AccountId = acc.Id,
            Project_Title__c = 'AI Research',
            Total_Project_Budget_INR__c = 1000000,
            Category = 'Grant Application'
        );
        insert app;

        FundingAward projectGrant = new FundingAward(
            Name = 'Project Grant',
            AwardeeId = acc.Id,
            Amount = 800000,
            Status = 'New Fund',
            Type_of_Fund__c = 'COE Project Grant'
        );

        FundingAward operationalGrant = new FundingAward(
            Name = 'Operational Grant',
            AwardeeId = acc.Id,
            Amount = 200000,
            Status = 'New Fund',
            Type_of_Fund__c = 'COE Operational Grant'
        );

        insert new List<FundingAward>{ projectGrant, operationalGrant };

        FundingDisbursement fd = new FundingDisbursement(
            Proposal__c = app.Id,
            FundingAwardId = projectGrant.Id,
            Amount = 150000
        );
        insert fd;

        insert new List<Milestone__c>{
            new Milestone__c(
                Individual_Application__c = app.Id,
                Status__c = 'Report Submitted'
            ),
            new Milestone__c(
                Individual_Application__c = app.Id,
                Status__c = 'Report Submitted'
            )
        };

        System.runAs(u) {
            Test.startTest();
            CoeFundController.FundResponse resp =
                CoeFundController.getFundProjects();
            Test.stopTest();

            System.assertNotEquals(null, resp);
            System.assertEquals(1, resp.projects.size());
            System.assert(resp.summary.projectGrantReceived > 0);
            System.assert(resp.summary.operationalGrantReceived > 0);
            System.assert(resp.summary.totalReceived > 0);
            System.assert(resp.summary.disbursed > 0);
            System.assert(resp.summary.availableProjectGrant >= 0);
            System.assert(resp.summary.availableOperationalGrant >= 0);
        }
    }

    /* =====================================================
       TEST: getFundProjects – NO APPLICATIONS
    ===================================================== */
    @IsTest
    static void testGetFundProjectsNoApplications() {

        Account acc = new Account(Name = 'Empty Account');
        insert acc;

        Contact con = buildContact('User', acc.Id);
        insert con;

        User u = createUser(con);

        System.runAs(u) {
            Test.startTest();
            CoeFundController.FundResponse resp =
                CoeFundController.getFundProjects();
            Test.stopTest();

            System.assertEquals(0, resp.projects.size());
            System.assertEquals(0, resp.summary.total);
        }
    }

    /* =====================================================
       TEST: getFundProjects – USER WITHOUT CONTACT
    ===================================================== */
    @IsTest
    static void testGetFundProjectsNoContact() {

        User u = createUser(null);

        System.runAs(u) {
            Test.startTest();
            CoeFundController.FundResponse resp =
                CoeFundController.getFundProjects();
            Test.stopTest();

            System.assertEquals(0, resp.projects.size());
        }
    }

    /* =====================================================
       TEST: createFundRequest – SUCCESS
    ===================================================== */
    @IsTest
    static void testCreateFundRequestSuccess() {

        Account acc = new Account(Name = 'FR Account');
        insert acc;

        Contact con = buildContact('FR User', acc.Id);
        insert con;

        User u = createUser(con);

        System.runAs(u) {
            Test.startTest();
            Id frId = CoeFundController.createFundRequest(
                50000,
                Date.today(),
                'Need funds'
            );
            Test.stopTest();

            System.assertNotEquals(null, frId);
        }
    }

    /* =====================================================
       TEST: createFundRequest – EXCEPTION PATHS
    ===================================================== */
    @IsTest
    static void testCreateFundRequestExceptions() {

        Account acc = new Account(Name = 'Bad FR Account');
        insert acc;

        Contact con = buildContact('Bad User', acc.Id);
        insert con;

        User u = createUser(con);

        System.runAs(u) {

            try {
                CoeFundController.createFundRequest(
                    0,
                    Date.today(),
                    'Invalid'
                );
                System.assert(false);
            } catch (AuraHandledException e) {}

            try {
                CoeFundController.createFundRequest(
                    1000,
                    null,
                    'Invalid'
                );
                System.assert(false);
            } catch (AuraHandledException e) {}
        }
    }
}