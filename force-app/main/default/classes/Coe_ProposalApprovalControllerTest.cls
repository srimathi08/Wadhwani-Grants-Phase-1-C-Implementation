@IsTest
public class Coe_ProposalApprovalControllerTest {

    private static IndividualApplication createProposal() {
        IndividualApplication app = new IndividualApplication(
            Status = 'Draft',
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Project_Title__c = 'Test Proposal',
            // Populated so the "WIN Proposal Submission - Sent email Flow"
            // (fired on Reject / Resubmit status transitions) can resolve
            // recipientIds instead of failing with an empty list.
            // Note: PI_User_Email__c is not directly writeable (formula/derived
            // field) — only PI_Email__c can be set here.
            PI_Email__c = UserInfo.getUserEmail()
        );
        insert app;
        return app;
    }

    @IsTest
    static void testGetProposalStatus() {
        IndividualApplication app = createProposal();

        Test.startTest();
        IndividualApplication result = Coe_ProposalApprovalController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('Draft', result.Status);
    }

    // ------------------------------------------------------------
    // TEST: Approve (Production automation changes status to WIN)
    // ------------------------------------------------------------
    @IsTest
    static void testUpdateProposal_Approve() {
        IndividualApplication app = createProposal();

        // Ensure approve goes through normal branch in Apex
        app.Application_Asked_for_Rsubmission__c = false;
        app.Asked_for_Resubmission_by_WIN_Admin__c = false;
        update app;

        Test.startTest();
        Coe_ProposalApprovalController.updateProposal(app.Id, 'Approve', 'Approved Comment', null);
        Test.stopTest();

        IndividualApplication refreshed = [
            SELECT Status,
                   COE_Approval_Comments__c,
                   Approved_by_COE_on__c,
                   Rejected_by_COE_on__c,
                   Asked_for_Resubmission_by_COE_on__c
            FROM IndividualApplication
            WHERE Id = :app.Id
        ];

        // ✅ Final status in Production ends up as WIN submission due to automation
        System.assertEquals('Proposal Submitted to WIN Admin', refreshed.Status);

        System.assertNotEquals(null, refreshed.Approved_by_COE_on__c);
        System.assertEquals(null, refreshed.Rejected_by_COE_on__c);
        System.assertEquals(null, refreshed.Asked_for_Resubmission_by_COE_on__c);
        System.assertEquals('Approved Comment', refreshed.COE_Approval_Comments__c);

        Approval_History__c hist = [
            SELECT Status__c, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :app.Id
            LIMIT 1
        ];

        // ✅ Apex inserts Approved history
        System.assertEquals('Approved', hist.Status__c);
        System.assertEquals('Approved Comment', hist.Comments__c);
    }

    @IsTest
    static void testGetProposalStatus_WithResubmissionFlag() {
        IndividualApplication app = new IndividualApplication(
            Status = 'Draft',
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Project_Title__c = 'Test Proposal',
            Asked_for_Resubmission_by_WIN_Admin__c = true,
            PI_Email__c = UserInfo.getUserEmail()
        );
        insert app;

        Test.startTest();
        IndividualApplication result = Coe_ProposalApprovalController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('Draft', result.Status);
    }

    @IsTest
    static void testUpdateProposal_Reject() {
        IndividualApplication app = createProposal();

        Test.startTest();
        Coe_ProposalApprovalController.updateProposal(app.Id, 'Reject', 'Reject Comment', null);
        Test.stopTest();

        IndividualApplication refreshed = [
            SELECT Status,
                   COE_Approval_Comments__c,
                   Approved_by_COE_on__c,
                   Rejected_by_COE_on__c,
                   Asked_for_Resubmission_by_COE_on__c
            FROM IndividualApplication
            WHERE Id = :app.Id
        ];

        System.assertEquals('Proposal Rejected by COE Admin', refreshed.Status);
        System.assertEquals('Reject Comment', refreshed.COE_Approval_Comments__c);
        System.assertNotEquals(null, refreshed.Rejected_by_COE_on__c);
        System.assertEquals(null, refreshed.Approved_by_COE_on__c);
        System.assertEquals(null, refreshed.Asked_for_Resubmission_by_COE_on__c);

        Approval_History__c hist = [
            SELECT Status__c, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :app.Id
            LIMIT 1
        ];

        System.assertEquals('Rejected', hist.Status__c);
        System.assertEquals('Reject Comment', hist.Comments__c);
    }

    @IsTest
    static void testUpdateProposal_Resubmit() {
        IndividualApplication app = createProposal();

        Test.startTest();
        Coe_ProposalApprovalController.updateProposal(
            app.Id, 'Resubmit', 'Resubmit Comment', Date.today().addDays(5)
        );
        Test.stopTest();

        IndividualApplication refreshed = [
            SELECT Status,
                   COE_Approval_Comments__c,
                   Application_Asked_for_Rsubmission__c,
                   Approved_by_COE_on__c,
                   Rejected_by_COE_on__c,
                   Asked_for_Resubmission_by_COE_on__c
            FROM IndividualApplication
            WHERE Id = :app.Id
        ];

        System.assertEquals('Asked for Resubmission by COE Admin', refreshed.Status);
        System.assertEquals('Resubmit Comment', refreshed.COE_Approval_Comments__c);
        System.assertEquals(true, refreshed.Application_Asked_for_Rsubmission__c);
        System.assertNotEquals(null, refreshed.Asked_for_Resubmission_by_COE_on__c);
        System.assertEquals(null, refreshed.Approved_by_COE_on__c);
        System.assertEquals(null, refreshed.Rejected_by_COE_on__c);

        Approval_History__c hist = [
            SELECT Status__c, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :app.Id
            LIMIT 1
        ];

        System.assertEquals('Resubmit', hist.Status__c);
        System.assertEquals('Resubmit Comment', hist.Comments__c);
    }

    @IsTest
    static void testUpdateProposal_Approve_AfterWinResubmission() {
        IndividualApplication app = new IndividualApplication(
            Status = 'Proposal Submitted to COE Admin',
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Project_Title__c = 'Test Proposal',
            Asked_for_Resubmission_by_WIN_Admin__c = true,
            PI_Email__c = UserInfo.getUserEmail()
        );
        insert app;

        Test.startTest();
        Coe_ProposalApprovalController.updateProposal(
            app.Id,
            'Approve',
            'Resubmit back to WIN',
            null
        );
        Test.stopTest();

        IndividualApplication refreshed = [
            SELECT Status,
                   COE_Approval_Comments__c,
                   Approved_by_COE_on__c,
                   Rejected_by_COE_on__c,
                   Asked_for_Resubmission_by_COE_on__c,
                   Application_Asked_for_Rsubmission__c
            FROM IndividualApplication
            WHERE Id = :app.Id
        ];

        System.assertEquals('Proposal Resubmitted to WIN Admin', refreshed.Status);
        System.assertEquals('Resubmit back to WIN', refreshed.COE_Approval_Comments__c);
        System.assertEquals(null, refreshed.Approved_by_COE_on__c);
        System.assertEquals(null, refreshed.Rejected_by_COE_on__c);
        System.assertEquals(false, refreshed.Application_Asked_for_Rsubmission__c);

        Approval_History__c hist = [
            SELECT Status__c, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :app.Id
            LIMIT 1
        ];

        System.assertEquals('Resubmit', hist.Status__c);
        System.assertEquals('Resubmit back to WIN', hist.Comments__c);
    }
}