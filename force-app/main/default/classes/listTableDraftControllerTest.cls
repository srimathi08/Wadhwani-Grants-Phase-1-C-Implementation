@isTest
public class listTableDraftControllerTest {

    @TestSetup
    static void setupData() {

        // Create Account (optional but safe)
        Account acc = new Account(Name = 'Draft Test Institution');
        insert acc;

        // Get System Admin profile
        Profile p = [
            SELECT Id 
            FROM Profile 
            WHERE Name = 'System Administrator'
            LIMIT 1
        ];

        // Create Internal User (NO ContactId)
        User u = new User(
            FirstName = 'Draft',
            LastName = 'User',
            Username = 'testuser' + System.currentTimeMillis() + '@test.com',
            Email = 'draftuser@example.com',
            Alias = 'duser',
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = p.Id
        );
        insert u;

        // Create Funding Opportunity
        FundingOpportunity fo = new FundingOpportunity(
            Name = 'Active FO',
            Status = 'Active',
            FO_Type__c = 'Project Proposal'
        );
        insert fo;

        // Get RecordType dynamically
        Id recordTypeId;
        Map<String, Schema.RecordTypeInfo> rtMap =
            Schema.SObjectType.IndividualApplication
                .getRecordTypeInfosByDeveloperName();

        if (!rtMap.isEmpty()) {
            recordTypeId = rtMap.values().iterator().next().getRecordTypeId();
        }

        // Create Draft Application as that user
        System.runAs(u) {

            IndividualApplication appData = new IndividualApplication(
                Project_Title__c = 'Draft App',
                FundingOpportunityId = fo.Id,
                PI_Email__c = 'pi@draft.com',
                PI_Name__c = 'Dr Draft',
                PI_Phone__c = '1111111',
                PI_Designation__c = 'Scientist',
                Status = 'Draft',
                Category = 'Grant Application',
                ApplicationType = 'WIN Project Proposal',
                Target_Market_Industry_Application__c = 'HealthTech',
                RecordTypeId = recordTypeId
            );

            insert appData;
        }
    }

    @isTest
    static void testGetDraftApplications() {

        User u = [SELECT Id FROM User WHERE Alias = 'duser' LIMIT 1];

        System.runAs(u) {

            Test.startTest();
            List<IndividualApplication> drafts =
                listTableDraftController.getUserDraftApplications();
            Test.stopTest();

            System.assertEquals(1, drafts.size());
            System.assertEquals('Draft', drafts[0].Status);
        }
    }
}