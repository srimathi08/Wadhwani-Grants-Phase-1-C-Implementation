@IsTest
public class ApprovedProposalsControllerTest {

    @testSetup
    static void setupData() {

        Account acc = new Account(Name = 'Test Account');
        insert acc;

        Profile p = [
            SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1
        ];

        User approver = new User(
            FirstName = 'COE',
            LastName = 'Approver',
            Email = 'coe@test.com',
            Username = 'coe.approver' + System.currentTimeMillis() + '@test.com',
            Alias = 'coeapp',
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_IN',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = p.Id
        );
        insert approver;

        // 🔹 Approved Application
        IndividualApplication app1 = new IndividualApplication(
            Project_Title__c = 'AI Research',
            Status = 'Proposal Approved by WIN Admin',
            Category = 'Grant Application',          // ✅ REQUIRED FIELD
            AccountId = acc.Id,
            COE_Approver__c = approver.Id
        );

        // 🔹 Resubmission Application
        IndividualApplication app2 = new IndividualApplication(
            Project_Title__c = 'ML Research',
            Status = 'Submitted Back - Approved for Funding Resubmission',
            Category = 'Grant Application',          // ✅ REQUIRED FIELD
            AccountId = acc.Id,
            COE_Approver__c = approver.Id
        );

        insert new List<IndividualApplication>{ app1, app2 };
    }

    @IsTest
    static void testGetApprovedProposals() {

        Test.startTest();
        Map<String, Object> result =
            ApprovedProposalsController.getApprovedProposals(1, 10);
        Test.stopTest();

        System.assertNotEquals(null, result);

        List<Map<String, Object>> records =
            (List<Map<String, Object>>) result.get('records');

        System.assert(records.size() > 0);
        System.assert(result.containsKey('totalPages'));
        System.assert(result.containsKey('approvedCount'));
    }

    @IsTest
    static void testHandleProposalActionApproved() {

        IndividualApplication app = [
            SELECT Id
            FROM IndividualApplication
            WHERE Status = 'Proposal Approved by WIN Admin'
            LIMIT 1
        ];

        Test.startTest();
        ApprovedProposalsController.handleProposalAction(
            app.Id,
            'Approved for Funding',
            'Approved successfully'
        );
        Test.stopTest();

        IndividualApplication updated = [
            SELECT Status, Funding_Year__c
            FROM IndividualApplication
            WHERE Id = :app.Id
        ];

        System.assertEquals('Approved for Funding', updated.Status);
        System.assertNotEquals(null, updated.Funding_Year__c);
    }

    @IsTest
    static void testHandleProposalActionResubmission() {

        IndividualApplication app = [
            SELECT Id
            FROM IndividualApplication
            WHERE Status LIKE '%Resubmission%'
            LIMIT 1
        ];

        Test.startTest();
        ApprovedProposalsController.handleProposalAction(
            app.Id,
            'Approved with Resubmission',
            'Revise and resubmit'
        );
        Test.stopTest();

        IndividualApplication updated = [
            SELECT Status, Funding_Approval_Resubmission__c
            FROM IndividualApplication
            WHERE Id = :app.Id
        ];

        System.assertEquals('Approved with Resubmission', updated.Status);
        System.assertEquals(true, updated.Funding_Approval_Resubmission__c);
    }
}