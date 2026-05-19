@IsTest
public class ApprovalHistoryServiceTest {

    @TestSetup
    static void setup() {
         // 1) Create Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // 2) Create Contact under that Account
        Contact con = new Contact(
            LastName = 'Test Contact',
            AccountId = acc.Id
        );
        insert con;
        
        
        // Create PI user
        Profile p = [SELECT Id FROM Profile WHERE Name='PI User Profile' LIMIT 1]; //  PI User Profile PI User Partner Profile
        User pi = new User(
            FirstName='PI', LastName='User',
            Email='piuser@test.com',
            Username='piuser' + System.currentTimeMillis() + '@test.com',
            Alias='piu',
            TimeZoneSidKey='Asia/Kolkata',
            LocaleSidKey='en_US',
            EmailEncodingKey='UTF-8',
            contactId = con.Id,
            LanguageLocaleKey='en_US',
            ProfileId=p.Id
        );
        insert pi;
        
        //Admin User
         Profile adminp = [SELECT Id FROM Profile WHERE Name='WIN Profile' LIMIT 1];
        User admin = new User(
            FirstName='win', LastName='User',
            Email='winuser@test.com',
            Username='winuser' + System.currentTimeMillis() + '@test.com',
            Alias='piu',
            TimeZoneSidKey='Asia/Kolkata',
            LocaleSidKey='en_US',
            EmailEncodingKey='UTF-8',
            LanguageLocaleKey='en_US',
            ProfileId=adminp.Id
        );
        insert admin;

        // Create Proposal
        IndividualApplication proposal = new IndividualApplication(
            Category = 'Grant Application',
            Project_Title__c = 'Sample Project',
            PI__c = pi.Id
        );
        insert proposal;

        // Create Approval History
        Approval_History__c hist = new Approval_History__c(
            Name = 'PI Submitted',
            Proposal__c = proposal.Id,
            Status__c='Submitted',
            Assigned_To__c=admin.Id,
            Comments__c='Initial'
        );
        insert hist;

        // Create share
        Approval_History__Share shr = new Approval_History__Share(
            ParentId=hist.Id,
            UserOrGroupId=pi.Id,
            AccessLevel='Read',
            RowCause=Schema.Approval_History__Share.RowCause.Manual
        );
        insert shr;
    }

    @IsTest
    static void testGetRecords() {
        IndividualApplication proposal = [
            SELECT Id FROM IndividualApplication LIMIT 1
        ];

        Test.startTest();
        List<ApprovalHistoryService.WrapperHistory> result =
            ApprovalHistoryService.getRecords(proposal.Id);
        Test.stopTest();

        System.assert(result.size() > 0, 'History list should not be empty');
        System.assertNotEquals(null, result[0].record, 'Wrapper record must not be null');
    }
}