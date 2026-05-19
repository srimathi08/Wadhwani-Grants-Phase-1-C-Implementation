@IsTest
public class WinProposalApprovalControllerTest {

    private static IndividualApplication createProposal() {
        IndividualApplication app = new IndividualApplication(
            Status = 'Draft',
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Project_Title__c = 'Test Proposal'
        );
        insert app;
        return app;
    }

    @IsTest
    static void testGetProposalStatus() {
        IndividualApplication app = createProposal();

        Test.startTest();
        String status = WinProposalApprovalController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('Draft', status, 'Status must match inserted value');
    }

    @IsTest
    static void testUpdateProposal_Approve() {
        IndividualApplication app = createProposal();

        Test.startTest();
        WinProposalApprovalController.updateProposal(app.Id, 'Approve', 'Approved Comment', null);
        Test.stopTest();

        IndividualApplication refreshed = [
            SELECT Status, WIN_Approved_Comments__c
            FROM IndividualApplication
            WHERE Id = :app.Id
        ];

        System.assertEquals('Proposal Approved by WIN Admin', refreshed.Status);
        System.assertEquals('Approved Comment', refreshed.WIN_Approved_Comments__c);

        Approval_History__c hist = [
            SELECT Status__c, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :app.Id
            LIMIT 1
        ];

        System.assertEquals('Approved', hist.Status__c);
        System.assertEquals('Approved Comment', hist.Comments__c);
    }

    @IsTest
    static void testUpdateProposal_Reject() {
        IndividualApplication app = createProposal();

        Test.startTest();
        WinProposalApprovalController.updateProposal(app.Id, 'Reject', 'Reject Comment', null);
        Test.stopTest();

        IndividualApplication refreshed = [
            SELECT Status, WIN_Approval_Comments__c
            FROM IndividualApplication
            WHERE Id = :app.Id
        ];

        System.assertEquals('Proposal Rejected by WIN Admin', refreshed.Status);
        System.assertEquals('Reject Comment', refreshed.WIN_Approval_Comments__c);

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
        Date dueDate = Date.today().addDays(7);

        Test.startTest();
        WinProposalApprovalController.updateProposal(
            app.Id, 'Resubmit', 'Resubmit Comment', dueDate
        );
        Test.stopTest();

        IndividualApplication refreshed = [
            SELECT Status,
                   WIN_Approval_Comments__c,
                   Asked_for_Resubmission_by_WIN_Admin__c,
                   Due_Date_for_Resubmission_WIN__c
            FROM IndividualApplication
            WHERE Id = :app.Id
        ];

        System.assertEquals('Asked for Resubmission by WIN Admin', refreshed.Status);
        System.assertEquals('Resubmit Comment', refreshed.WIN_Approval_Comments__c);
        System.assertEquals(true, refreshed.Asked_for_Resubmission_by_WIN_Admin__c);
        System.assertEquals(dueDate, refreshed.Due_Date_for_Resubmission_WIN__c);

        Approval_History__c hist = [
            SELECT Status__c, Comments__c
            FROM Approval_History__c
            WHERE Proposal__c = :app.Id
            LIMIT 1
        ];

        System.assertEquals('Resubmit', hist.Status__c);
        System.assertEquals('Resubmit Comment', hist.Comments__c);
    }
}