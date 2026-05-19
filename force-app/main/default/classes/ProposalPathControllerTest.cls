@IsTest
public class ProposalPathControllerTest {

    /* =====================================================
       TEST SETUP
    ===================================================== */
    @TestSetup
    static void setupData() {

        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        IndividualApplication app = new IndividualApplication(
            Status = 'Draft',
            AccountId = acc.Id,
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Project_Title__c = 'Test Proposal'
        );
        insert app;
    }

    /* =====================================================
       BASELINE: Draft
    ===================================================== */
    @IsTest
    static void testDraftStatus() {

        IndividualApplication app = [
            SELECT Id FROM IndividualApplication LIMIT 1
        ];

        Test.startTest();
        String result = ProposalPathController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('Draft', result);
    }

    /* =====================================================
       SUBMITTED → COE
    ===================================================== */
    @IsTest
    static void testSubmittedToCOE() {

        IndividualApplication app = [
            SELECT Id, Status FROM IndividualApplication LIMIT 1
        ];

        app.Status = 'Submitted';
        update app;

        Test.startTest();
        String result = ProposalPathController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('Submitted to COE Admin', result);
    }

    /* =====================================================
       RESUBMITTED TO COE
    ===================================================== */
    @IsTest
    static void testResubmittedToCOE() {

        IndividualApplication app = [
            SELECT Id, Status FROM IndividualApplication LIMIT 1
        ];

        app.Status = 'Proposal Resubmitted to COE Admin';
        update app;

        Test.startTest();
        String result = ProposalPathController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('Submitted to COE Admin', result);
    }

    /* =====================================================
       SUBMITTED TO WIN
    ===================================================== */
    @IsTest
    static void testSubmittedToWIN() {

        IndividualApplication app = [
            SELECT Id, Status FROM IndividualApplication LIMIT 1
        ];

        app.Status = 'Proposal Submitted to WIN Admin';
        update app;

        Test.startTest();
        String result = ProposalPathController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('Submitted to WIN Admin', result);
    }

    /* =====================================================
       WIN ADMIN ACTIONS
    ===================================================== */
    @IsTest
    static void testWINAdminActions() {

        IndividualApplication app = [
            SELECT Id, Status FROM IndividualApplication LIMIT 1
        ];

        app.Status = 'Proposal Approved by WIN Admin';
        update app;

        Test.startTest();
        String result = ProposalPathController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('WIN Admin Actions', result);
    }

    /* =====================================================
       DECISION STATES
    ===================================================== */
    @IsTest
    static void testDecisionStates() {

        IndividualApplication app = [
            SELECT Id, Status FROM IndividualApplication LIMIT 1
        ];

        app.Status = 'Recommended';
        update app;

        Test.startTest();
        String result = ProposalPathController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('Decision', result);
    }

    /* =====================================================
       NULL ID (DEFENSIVE PATH)
    ===================================================== */
    @IsTest
    static void testNullId() {

        Test.startTest();
        String result = ProposalPathController.getProposalStatus(null);
        Test.stopTest();

        System.assertEquals('Draft', result);
    }

    /* =====================================================
       FALLBACK STATUS (DEFENSIVE)
    ===================================================== */
    @IsTest
    static void testFallbackStatus() {

        IndividualApplication app = [
            SELECT Id, Status FROM IndividualApplication LIMIT 1
        ];

        app.Status = 'Some Random Status';
        update app;

        Test.startTest();
        String result = ProposalPathController.getProposalStatus(app.Id);
        Test.stopTest();

        System.assertEquals('Draft', result);
    }
}