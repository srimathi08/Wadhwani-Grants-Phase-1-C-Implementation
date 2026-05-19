@IsTest
public class ApprovalHistorySharingControllerTest {

    @TestSetup
    static void setup() {

        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        Contact coeContact = new Contact(
            LastName = 'COE Contact',
            AccountId = acc.Id,
            COE_Admin__c = true
        );
        insert coeContact;

        Contact piContact = new Contact(
            LastName = 'PI Contact',
            AccountId = acc.Id,
            COE_PI__c = true,
            Email = 'pi@test.com'
        );
        insert piContact;

        Profile piProfile =
            [SELECT Id FROM Profile WHERE Name='PI User Profile' LIMIT 1];

        Profile coeProfile =
            [SELECT Id FROM Profile WHERE Name='COE User Profile' LIMIT 1];

        User piUser = new User(
            FirstName='PI',
            LastName='User',
            Email='pi@test.com',
            Username='pi' + System.currentTimeMillis() + '@test.com',
            Alias='piu',
            TimeZoneSidKey='Asia/Kolkata',
            LocaleSidKey='en_US',
            EmailEncodingKey='UTF-8',
            LanguageLocaleKey='en_US',
            ContactId = piContact.Id,
            ProfileId = piProfile.Id
        );
        insert piUser;

        User coeUser = new User(
            FirstName='COE',
            LastName='User',
            Email='coe@test.com',
            Username='coe' + System.currentTimeMillis() + '@test.com',
            Alias='coe',
            TimeZoneSidKey='Asia/Kolkata',
            LocaleSidKey='en_US',
            EmailEncodingKey='UTF-8',
            LanguageLocaleKey='en_US',
            ContactId = coeContact.Id,
            ProfileId = coeProfile.Id
        );
        insert coeUser;

        IndividualApplication app = new IndividualApplication(
            Category = 'Grant Application',
            Project_Title__c = 'AI Research',
            PI__c = piUser.Id,
            COE_Approver__c = coeUser.Id
        );
        insert app;

        List<Approval_History__c> histories = new List<Approval_History__c>{
            new Approval_History__c(
                Name = 'Approved Step',
                Proposal__c = app.Id,
                Assigned_To__c = coeUser.Id,
                Status__c = 'Approved',
                Comments__c = 'Approved successfully'
            ),
            new Approval_History__c(
                Name = 'Rejected Step',
                Proposal__c = app.Id,
                Assigned_To__c = coeUser.Id,
                Status__c = 'Rejected',
                Comments__c = 'Rejected due to issues'
            ),
            new Approval_History__c(
                Name = 'Resubmit Step',
                Proposal__c = app.Id,
                Assigned_To__c = coeUser.Id,
                Status__c = 'Resubmit',
                Comments__c = 'Please resubmit with corrections'
            )
        };

        insert histories;
    }

    // ----------------------------------
    // TEST SHARE WITH PI (ALL STATUSES)
    // ----------------------------------
    @IsTest
    static void testShareWithPI_AllStatuses() {

        List<Approval_History__c> records =
            [SELECT Id FROM Approval_History__c];

        Test.startTest();

        for (Approval_History__c rec : records) {
            String result =
                ApprovalHistorySharingController.shareWithPI(rec.Id);
            System.assertEquals('SUCCESS', result);
        }

        Test.stopTest();

        Integer countShares =
            [SELECT COUNT()
             FROM Approval_History__Share];

        System.assert(countShares > 0);
    }

    // ----------------------------------
    // TEST ASK TO WIN
    // ----------------------------------
    @IsTest
    static void testAskToWIN() {

        Approval_History__c hist =
            [SELECT Id FROM Approval_History__c LIMIT 1];

        Test.startTest();
        String result =
            ApprovalHistorySharingController.askToWIN(
                hist.Id,
                'Need more info'
            );
        Test.stopTest();

        System.assertEquals('SUCCESS', result);

        Approval_History__c updated =
            [SELECT Status__c, Question_from_Coe__c
             FROM Approval_History__c
             WHERE Id = :hist.Id];

        System.assertEquals('Question from Coe', updated.Status__c);
        System.assertEquals('Need more info', updated.Question_from_Coe__c);
    }

    // ----------------------------------
    // NEGATIVE TEST (FIXED)
    // ----------------------------------
    @IsTest
    static void testShareWithPI_NoEmail() {

        // Create Proposal WITHOUT PI
        IndividualApplication app = new IndividualApplication(
            Category = 'Grant Application',
            Project_Title__c = 'No PI Project'
            // No PI__c assigned
        );
        insert app;

        Approval_History__c hist = new Approval_History__c(
            Name = 'No PI Email',
            Proposal__c = app.Id,
            Status__c = 'Submitted'
        );
        insert hist;

        Test.startTest();

        Boolean exceptionThrown = false;

        try {
            ApprovalHistorySharingController.shareWithPI(hist.Id);
        } catch (Exception e) {
            exceptionThrown = true;
        }

        Test.stopTest();

        System.assertEquals(true, exceptionThrown,
            'Expected exception was not thrown');
    }
}