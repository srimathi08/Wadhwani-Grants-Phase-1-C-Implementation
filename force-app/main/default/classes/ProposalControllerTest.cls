@isTest
public class ProposalControllerTest {

    @testSetup
    static void setupData() {
        createTestData(true);
    }

    private static void createTestData(Boolean includeApps) {
        Account acc = new Account(Name = 'Test Account', Institution_Registered__c = true);
        insert acc;

        Contact c = new Contact(LastName = 'Test', AccountId = acc.Id);
        insert c;

        Profile p = [SELECT Id FROM Profile WHERE Name = 'COE User Profile' LIMIT 1];  
        User u = new User(
            UserName = 'test_' + Math.random() + '@test.com',
            FirstName = 'Test-First',
            LastName = 'Test-Last',
            Alias = 'test',
            Email = 'test1wcf@test.com',
            CommunityNickName = String.valueOf(Math.random()).substring(0, 6),
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/New_York',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = c.Id
        );
        insert u;

        FundingOpportunity fo = new FundingOpportunity(
            Name = 'Test COE Opportunity',
            FO_Type__c = 'COE'
           // Status = 'Active'
        );
        insert fo;

        ContentVersion cv = new ContentVersion(
            Title = 'Test File',
            PathOnClient = 'testfile.pdf',
            VersionData = Blob.valueOf('Test content')
        );
        insert cv;
    }

    @isTest
    static void testGetLoggedInUserDetailsBasic() {
        Test.startTest();
        proposalController.UserInstitutionWrapper result = proposalController.getLoggedInUserDetails();
        Test.stopTest();

        System.assertNotEquals(null, result, 'Wrapper result should not be null');
    }

    @isTest
    static void testCreateProposalWithMinimalData() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Map<String, Object> data = new Map<String, Object>{
            'AccountId' => acc.Id
        };

        Test.startTest();
        Id proposalId = proposalController.createProposal(data);
        Test.stopTest();

        System.assertNotEquals(null, proposalId, 'Proposal ID should not be null');
    }

    @isTest
    static void testCreateProposalWithAllFields() {
        Account acc = new Account(Name = 'Full Test Account');
        insert acc;

        FundingOpportunity fo = new FundingOpportunity(
            Name = 'Active COE',
            FO_Type__c = 'COE',
            Status = 'Active'
        );
        insert fo;

        ContentVersion cv = new ContentVersion(
            Title = 'AllFieldsFile',
            PathOnClient = 'file.pdf',
            VersionData = Blob.valueOf('Sample Content')
        );
        insert cv;

        // Query to get ContentDocumentId
        ContentVersion insertedCV = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];

        Map<String, Object> data = new Map<String, Object>{
            'AccountId' => acc.Id,
            'Primary_Focus_Area__c' => 'HealthTech',
            'Sub_Focus_Area__c' => 'Personalized/ Precision medicine',
            'Focus_Area_2__c' => 'HealthTech',
            'Sub_Focus_Area_Focus_area_2__c' => 'Personalized/ Precision medicine',
            'Focus_Area_3__c' => 'HealthTech',
            'Sub_Focus_Area_Focus_area_3__c' => 'Personalized/ Precision medicine',
            'documentIds' => new List<Object>{ insertedCV.ContentDocumentId }
        };

        Test.startTest();
        Id proposalId = proposalController.createProposal(data);
        Test.stopTest();

        System.assertNotEquals(null, proposalId, 'Proposal ID should not be null for all fields');
    }

    @isTest
    static void testCreateProposalWithFiles() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        ContentVersion cv = [SELECT Id, ContentDocumentId FROM ContentVersion LIMIT 1];

        Map<String, Object> data = new Map<String, Object>{
            'AccountId' => acc.Id,
            'documentIds' => new List<Object>{ cv.ContentDocumentId }
        };

        Test.startTest();
        Id proposalId = proposalController.createProposal(data);
        Test.stopTest();

        System.assertNotEquals(null, proposalId);
        List<ContentDocumentLink> links = [SELECT Id FROM ContentDocumentLink WHERE LinkedEntityId = :proposalId];
        System.assertEquals(1, links.size(), 'File should be linked to proposal');
    }

   @isTest
static void testCreateProposalMissingAccountId() {
    Test.startTest();
    //Boolean thrown = false; 
        proposalController.createProposal(new Map<String, Object>());
    
    Test.stopTest();
 
}
   
}