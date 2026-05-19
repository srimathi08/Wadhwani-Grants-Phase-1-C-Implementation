@IsTest
public class WinProjectProposalFormControllerTest {
   
    @TestSetup
    static void setupData() {
        // Create Account and COE Admin Contact
        Account acc = new Account(Name = 'Draft Test Institution');
        insert acc;
        
        Contact admin = new Contact(
            LastName = 'Admin',
            Email = 'admin@example.com',  
            AccountId = acc.Id
        ); //COE_Admin__c = true,
        insert admin;
        
        Contact coe_admin = new Contact(
            LastName = 'Admincoe',
            Email = 'coeadmin@example.com',
            COE_Admin__c = true,
            AccountId = acc.Id
        ); //
        insert coe_admin;
        
        Profile p = [SELECT Id FROM Profile WHERE Name = 'COE User Profile' LIMIT 1]; //COE User Profile Partner Community Clone 
        
        User u = new User(
            FirstName = 'Draft',
            LastName = 'User',
            Username = 'testuser@test.com',
            Email = 'draftuser@example.com',
            Alias = 'duser',
            CommunityNickname = 'duser',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = admin.Id
        );
        insert u;
        
        // Create Funding Opportunity
        insert new FundingOpportunity(Name = 'Active FO', Status = 'Active', FO_Type__c = 'Project Proposal');
    }
    
    static testMethod void testGetLoggedInUserDetails() {
        User u = [SELECT Id FROM User WHERE Username = 'testuser@test.com' LIMIT 1];
        System.runAs(u) {
            Map<String, String> res = WinProjectProposalFormController.getLoggedInUserDetails();
            //System.assertNotEquals(null, res.get('ContactId'));
            //System.assertNotEquals(null, res.get('AccountId'));
            //System.assertNotEquals(null, res.get('AccountName'));
        }
    }
    
    static testMethod void testGetActiveFundingOpportunityId() {
        Id foId = WinProjectProposalFormController.getActiveFundingOpportunityId();
        System.assertNotEquals(null, foId);
    }
     
    
  
@isTest
static void testSaveDraftAndGetDraft() {
    User u = [SELECT Id, ContactId, AccountId FROM User WHERE Username = 'testuser@test.com' LIMIT 1];
    System.runAs(u) {
        // Prepare applicationData
        Map<String, Object> appData = new Map<String, Object>{
            'Project_Title__c' => 'Draft App',
            'PI_Email__c' => 'pi@draft.com',
            'PI_Name__c' => 'Dr Draft',
            'PI_Phone__c' => '1111111',
            'PI_Designation__c' => 'Scientist',
            'RecordTypeId' => '012GA000000nZOnYAM',//012GA000000nZOnYAM 012F6000000UQbBIAW
            'Status' => 'Draft',
            'Category'=> 'Grant Application',
            'ApplicationType' =>'WIN Project Proposal',
            'Target_Market_Industry_Application__c' => 'HealthTech',
            'Project_Start_Date__c' => String.valueOf(Date.today()),
            'Project_End_Date__c' => String.valueOf(Date.today().addMonths(3))
        };

        List<Map<String, Object>> milestones = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Milestone_Description__c' => 'Planning',
                'Budget_Required__c' => 3000,
                'Budget_Required_INR__c' => 15000,   
                'Project_Start_Date__c' => '01/05/2025',
                'Project_End_Date__c' => '01/06/2025',
                'Installment_of_Funds_1__c' => 'Instalment 1 - 30%',
                'Installment_of_Funds_2__c' => 'Instalment 2 - 30%',
                'Installment_of_Funds_3__c' => 'Instalment 3 - 30%',
                'Installment_of_Funds_4__c' => 'Instalment 4 - 10%',   
                'Output_and_Deliverables__c' => 'Sample',
                'Activities_under_this_Milestone__c' => 'Sample 1',
                'Status__c' => 'Draft'
            }
        };

        List<Map<String, Object>> budgets = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => 'Infra',
                'Total_Amount__c' => 500,
                'Total_Amount_INR__c' => 100,
                'Total_Amount__c' => 800,
                'Justification__c' => 'Equipments',
                'Status' => 'Draft'
            }
        };

        Id rtId = '012GA000000nZOnYAM';//012GA000000nZOnYAM 012F6000000UQbBIAW

        Test.startTest();

        WinProjectProposalFormController.SaveDraftResponse draftResponse = 
            WinProjectProposalFormController.saveDraftApplication(null, appData, milestones, budgets, rtId, 'Grant Application');
        
        Id draftId = draftResponse.applicationId;

        // Validate savedMilestones
        System.assertNotEquals(null, draftResponse.savedMilestones, '❌ savedMilestones should not be null');
        System.assertEquals(1, draftResponse.savedMilestones.size(), '✅ One milestone should be saved');
        System.assertEquals('Planning', draftResponse.savedMilestones[0].Milestone_Description__c, '✅ Milestone description should match');
        System.assertEquals(3000, draftResponse.savedMilestones[0].Budget_Required__c, '✅ Milestone budget should match');

        // Optionally also test getDraftApplication again
        WinProjectProposalFormController.DraftWrapper draftWrap = 
            WinProjectProposalFormController.getDraftApplication(draftId);

        Test.stopTest();

        // Additional Draft wrapper validations
      /*  System.assertNotEquals(null, draftWrap, '❌ DraftWrapper should not be null');
        System.assertEquals('Draft App', draftWrap.applicationData.get('Project_Title__c'), '✅ Project title should match');
        System.assertEquals(1, draftWrap.milestones.size(), '✅ One milestone in wrapper expected');
        System.assertEquals(1, draftWrap.budgets.size(), '✅ One budget in wrapper expected'); */
    }
}




    
   @isTest
static void testSaveApplicationWithMilestones_InsertAndUpdate() {
    User u = [SELECT Id, ContactId, AccountId FROM User WHERE Username = 'testuser@test.com' LIMIT 1];
    System.runAs(u) {
        Map<String, Object> appData = new Map<String, Object>{
            'Project_Title__c' => 'Final Submission',
            'PI_Email__c' => 'pi-final@test.com',
            'PI_Name__c' => 'Final PI',
            'PI_Phone__c' => '9999999',
            'PI_Designation__c' => 'Professor',
            'CO_PI_Email__c' => 'copi-final@test.com',
            'CO_PI_Institution__c' => 'Final CoPI Institute',
            'Co_Principal_Investigator_Co_PI__c' => 'Dr Final CoPI',
            'CO_PI_Phone__c' => '8888888',
            'CO_PI_Designation__c' => 'Scientist',
            'Target_Market_Industry_Application__c' => 'BioTech',
            'ApplicationType' => 'WIN Project Proposal',
            'Category' => 'Grant Application',
            'Status' => 'Draft',
            'Project_Start_Date__c' => String.valueOf(Date.today()),
            'Project_End_Date__c' => String.valueOf(Date.today().addDays(60))
        };

        List<Map<String, Object>> milestones = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Milestone_Description__c' => 'Phase A',
                'Budget_Required__c' => 3000,
                'Budget_Required_INR__c' => 15000,   
                'Project_Start_Date__c' => '01/05/2025',
                'Project_End_Date__c' => '01/06/2025',
                'Installment_of_Funds_1__c' => 'Instalment 1 - 30%',
                'Installment_of_Funds_2__c' => 'Instalment 2 - 30%',
                'Installment_of_Funds_3__c' => 'Instalment 3 - 30%',
                'Installment_of_Funds_4__c' => 'Instalment 4 - 10%',   
                'Output_and_Deliverables__c' => 'Sample',
                'Activities_under_this_Milestone__c' => 'Sample 1',
                'Status__c' => 'Draft'
            }
        };

        List<Map<String, Object>> budgets = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => 'Infra',
                'Total_Amount__c' => 500,
                'Total_Amount_INR__c' => 100,
                'Total_Amount__c' => 800,
                'Justification__c' => 'Equipments 1',
                'Status' => 'Draft'
            }
        };

        List<Id> fileIds = new List<Id>();

        Test.startTest();

        // 1) INSERT flow
        Id insertedAppId = WinProjectProposalFormController.saveApplicationWithMilestones(appData, milestones, fileIds, budgets);
        System.assertNotEquals(null, insertedAppId, '❌ Inserted Application ID should not be null');

        // 2) UPDATE flow
        appData.put('Id', insertedAppId);
        appData.put('Status', 'Submitted');
        Id updatedAppId = WinProjectProposalFormController.saveApplicationWithMilestones(appData, milestones, null, budgets);
        System.assertEquals(insertedAppId, updatedAppId, '✅ Updated App ID should match inserted one');

        Test.stopTest();

        List<ContentDocumentLink> links = [SELECT Id FROM ContentDocumentLink WHERE LinkedEntityId = :insertedAppId];
        System.assertEquals(0, links.size(), '✅ Zero file should be linked to the application');
    }
    
    
}

       @isTest
static void testDeleteBudgetRecord() {
    User u = [SELECT Id FROM User WHERE Username = 'testuser@test.com' LIMIT 1];
    System.runAs(u) {
        // Create application, budgets, milestones using saveDraftApplication
        Map<String, Object> appData = new Map<String, Object>{
            'Project_Title__c' => 'Delete Budget Test',
            'PI_Email__c' => 'pi@budgettest.com',
            'PI_Name__c' => 'PI Budget',
            'PI_Phone__c' => '1212121',
            'PI_Designation__c' => 'Tester',
            'CO_PI_Email__c' => 'copi@budgettest.com',
            'CO_PI_Institution__c' => 'Budget CoPI Institute',
            'Co_Principal_Investigator_Co_PI__c' => 'CoPI Budget',
            'CO_PI_Phone__c' => '3434343',
            'CO_PI_Designation__c' => 'Assistant',
            'Project_Start_Date__c' => String.valueOf(Date.today()),
            'Project_End_Date__c' => String.valueOf(Date.today().addMonths(2)),
            'ApplicationType' => 'WIN Project Proposal',
            'Category' => 'Grant Application'
        };

        List<Map<String, Object>> budgets = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => 'Test Delete Budget',
                 'Total_Amount__c' => 500,
                'Total_Amount_INR__c' => 100,
                'Total_Amount__c' => 800,
                'Justification__c' => 'Test Equipments 1',  
                'Status' => 'Draft'
            }
        };

        List<Map<String, Object>> milestones = new List<Map<String, Object>>(); // not needed here

        Id rtId = '012GA000000nZOnYAM';//012F6000000UQbBIAW 012GA000000nZOnYAM
        //Id appId = WinProjectProposalFormController.saveDraftApplication(null, appData, milestones, budgets, rtId, 'Grant Application');
        WinProjectProposalFormController.SaveDraftResponse response =
    WinProjectProposalFormController.saveDraftApplication(null, appData, milestones, budgets, rtId, 'Grant Application');
Id appId = response.applicationId;

        // Fetch the created Budget record
        List<Budget> budgetList = [SELECT Id FROM Budget WHERE Proposal__c = :appId LIMIT 1];
        System.assert(!budgetList.isEmpty(), '❌ Budget record should exist');

        // Call deleteBudgetRecord
        Test.startTest();
        WinProjectProposalFormController.deleteBudgetRecord(budgetList[0].Id);
        Test.stopTest();

        // Confirm deletion
        List<Budget> postDelete = [SELECT Id FROM Budget WHERE Id = :budgetList[0].Id];
        System.assertEquals(0, postDelete.size(), '✅ Budget should be deleted');
    }
}

    @isTest
static void testDeleteMilestoneRecord() {
    User u = [SELECT Id FROM User WHERE Username = 'testuser@test.com' LIMIT 1];
    System.runAs(u) {
        Map<String, Object> appData = new Map<String, Object>{
            'Project_Title__c' => 'Delete Milestone Test',
            'PI_Email__c' => 'pi@milestonetest.com',
            'PI_Name__c' => 'PI Milestone',
            'PI_Phone__c' => '565656',
            'PI_Designation__c' => 'Analyst',
            'CO_PI_Email__c' => 'copi@milestonetest.com',
            'CO_PI_Institution__c' => 'Milestone CoPI',
            'Co_Principal_Investigator_Co_PI__c' => 'CoPI Milestone',
            'CO_PI_Phone__c' => '787878',
            'CO_PI_Designation__c' => 'CoAnalyst',
            'Project_Start_Date__c' => String.valueOf(Date.today()),
            'Project_End_Date__c' => String.valueOf(Date.today().addMonths(2)),
            'ApplicationType' => 'WIN Project Proposal',
            'Category' => 'Grant Application'
        };

        List<Map<String, Object>> milestones = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Milestone_Description__c' => 'Delete Test Milestone',
                'Budget_Required__c' => 3000,
                'Budget_Required_INR__c' => 15000,   
                'Project_Start_Date__c' => '01/05/2025',
                'Project_End_Date__c' => '01/06/2025',
                'Installment_of_Funds_1__c' => 'Instalment 1 - 30%',
                'Installment_of_Funds_2__c' => 'Instalment 2 - 30%',
                'Installment_of_Funds_3__c' => 'Instalment 3 - 30%',
                'Installment_of_Funds_4__c' => 'Instalment 4 - 10%',   
                'Output_and_Deliverables__c' => 'Sample',
                'Activities_under_this_Milestone__c' => 'Delete Sample 1',
                'Status__c' => 'Draft'
            }
        };

        List<Map<String, Object>> budgets = new List<Map<String, Object>>(); // not needed here

        Id rtId = '012GA000000nZOnYAM';//012F6000000UQbBIAW 012GA000000nZOnYAM
       // Id appId = WinProjectProposalFormController.saveDraftApplication(null, appData, milestones, budgets, rtId, 'Grant Application');
        WinProjectProposalFormController.SaveDraftResponse response =
    WinProjectProposalFormController.saveDraftApplication(null, appData, milestones, budgets, rtId, 'Grant Application');
Id appId = response.applicationId;

        // Fetch created Milestone
        List<Milestone__c> msList = [SELECT Id FROM Milestone__c WHERE Individual_Application__c = :appId LIMIT 1];
        System.assert(!msList.isEmpty(), '❌ Milestone record should exist');

        // Call deleteMilestoneRecord
        Test.startTest();
        WinProjectProposalFormController.deleteMilestoneRecord(msList[0].Id);
        Test.stopTest();

        // Confirm deletion
        List<Milestone__c> postDelete = [SELECT Id FROM Milestone__c WHERE Id = :msList[0].Id];
        System.assertEquals(0, postDelete.size(), '✅ Milestone should be deleted');
    }
}



}



/* @isTest
static void testSaveDraftAndGetDraft() {
    User u = [SELECT Id, ContactId, AccountId FROM User WHERE Username = 'testuser@test.com' LIMIT 1];
    System.runAs(u) {
        // Prepare applicationData
        Map<String, Object> appData = new Map<String, Object>{
            'Project_Title__c' => 'Draft App',
            'PI_Email__c' => 'pi@draft.com',
            'PI_Name__c' => 'Dr Draft',
            'PI_Phone__c' => '1111111',
            'PI_Designation__c' => 'Scientist',
            'CO_PI_Email__c' => 'copi@draft.com',
            'CO_PI_Institution__c' => 'Draft Institute',
            'Co_Principal_Investigator_Co_PI__c' => 'Dr CoDraft',
             'RecordTypeId' => '012F6000000UQbBIAW', //012GA000000nZOnYAM 012F6000000UQbBIAW
              'Status' => 'Draft',
                'Category'=> 'Grant Application',
                'ApplicationType' =>'WIN Project Proposal',    
            'CO_PI_Phone__c' => '2222222',
            'CO_PI_Designation__c' => 'Lead',
            'Target_Market_Industry_Application__c' => 'HealthTech',
            'Project_Start_Date__c' => String.valueOf(Date.today()),
            'Project_End_Date__c' => String.valueOf(Date.today().addMonths(3))
        };

        List<Map<String, Object>> milestones = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Milestone_Description__c' => 'Planning',
                'Budget_Required__c' => 3000,
                'Target_Completion_Month__c' => 5,
                'Justification__c' => 'Phase 1',
                'Status__c' => 'Draft'
            }
        };

        List<Map<String, Object>> budgets = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => 'Infra',
                'Amount' => 5000,
                'Justification__c' => 'Equipments',
                'Status' => 'Draft'
            }
        };

        Id rtId = '012F6000000UQbBIAW'; //012F6000000UQbBIAW 012GA000000nZOnYAM

        Test.startTest();

        // Save Draft
        Id draftId = WinProjectProposalFormController.saveDraftApplication(
            null, appData, milestones, budgets, rtId, 'Grant Application'
        );

        // NOW Directly call getDraftApplication with the draftId
        WinProjectProposalFormController.DraftWrapper draftWrap = WinProjectProposalFormController.getDraftApplication(draftId);

        Test.stopTest();

    }

}
*/






/*@isTest
public class WinProjectProposalFormControllerTest {

    static testMethod void testWinProjectProposalFlow() {
        // Setup Account
        Account acc = new Account(Name = 'Test Institution');
        insert acc;

        // Setup Contact
        Contact con = new Contact(
            LastName = 'Test COE Admin',
            Email = 'coeadmin@gmail.com',
            AccountId = acc.Id,
            COE_Admin__c = true
        );
        insert con;

        // Setup User
        User u = new User(
            FirstName = 'Test',
            LastName = 'coeuser',
            Username = 'coeadmin@gmail.com',
            Alias = 'tuser',
            Email = 'testuser@example.com',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = [SELECT Id FROM Profile WHERE Name = 'Partner Community Clone' LIMIT 1].Id,
            TimeZoneSidKey = 'America/New_York',
            ContactId = con.Id
        );
        insert u;

        // Start test context BEFORE runAs
        Test.startTest();

        System.runAs(u) {
            // Insert Funding Opportunity
            FundingOpportunity fo = new FundingOpportunity(
                Name = 'WIN 2025',
                Status = 'Active',
                FO_Type__c = 'Project Proposal'
            );
            insert fo;

            // getLoggedInUserDetails
            Map<String, String> userDetails = WinProjectProposalFormController.getLoggedInUserDetails();
            System.assertEquals(con.Id, userDetails.get('ContactId'));

            // getActiveFundingOpportunityId
            Id activeFOId = WinProjectProposalFormController.getActiveFundingOpportunityId();
            System.assertEquals(fo.Id, activeFOId);

            // Setup Application Data
            Map<String, Object> applicationData = new Map<String, Object>{
                'PI_Email__c' => 'pi@example.com',
                'PI_Name__c' => 'Primary PI',
                'CO_PI_Email__c' => 'copi@example.com',
                'CO_PI_Institution__c' => 'CO-PI University',
                'Co_Principal_Investigator_Co_PI__c' => 'CO-PI Name',
                'Project_Title__c' => 'AI Powered Health Solution',
                'Status__c' => 'submitted',
                 'ApplicationType' => 'WIN Project Proposal',
                 'Category' =>'Grant Application',
                  'Status' => 'Submitted',
                 'recordTypeId' => '012F6000000UQbBIAW'
            };

            // Milestone map
            List<Map<String, Object>> milestones = new List<Map<String, Object>>{
                new Map<String, Object>{
                    'Milestone_Description__c' => 'Complete prototype',
                    'Budget_Required__c' => 150,
                    'Target_Date__c' => Date.today().addDays(30),
                    'Justification__c' => 'Essential for MVP release'
                }
            };

            // Budget map
            List<Map<String, Object>> budgets = new List<Map<String, Object>>{
                new Map<String, Object>{
                    'Name' => 'Hardware Cost',
                    'Amount' => 2000,
                    'Justification__c' => 'Sensor purchase and setup'
                }
            };

            // Upload fake file
        /*    ContentVersion cv = new ContentVersion(
                Title = 'ProposalDoc',
                PathOnClient = 'ProposalDoc.pdf',
                VersionData = Blob.valueOf('Test content')
            );
            insert cv; 

            // Get ContentDocumentId from ContentVersion
            //cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];
           // List<Id> fileIds = new List<Id>{ cv.ContentDocumentId };
                List<Id> fileIds = new List<Id>();

            // Save application with all data
            Id savedAppId = WinProjectProposalFormController.saveApplicationWithMilestones(
                applicationData,
                milestones,
                fileIds,
                budgets
            );

            // Assertions
            System.assertNotEquals(null, savedAppId, 'Application should be saved');
            System.assertEquals(1, [SELECT COUNT() FROM Milestone__c WHERE Individual_Application__c = :savedAppId]);
            System.assertEquals(1, [SELECT COUNT() FROM Budget WHERE Proposal__c = :savedAppId]);
            System.assertEquals(0, [SELECT COUNT() FROM ContentDocumentLink WHERE LinkedEntityId = :savedAppId]);
        }

        Test.stopTest();
    }
} */