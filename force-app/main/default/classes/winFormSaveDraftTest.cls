@isTest
public class winFormSaveDraftTest {
    
    @TestSetup
    static void setupData() {
        // Create Account and COE Admin Contact
        Account acc = new Account(Name = 'Draft Test Institution');
        insert acc;
        
        Contact admin = new Contact(
            LastName = 'Admin',
            Email = 'admin@example.com',
            COE_Admin__c = true,
            AccountId = acc.Id
        );
        insert admin;
        
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
            Map<String, String> res = winFormSaveDraft.getLoggedInUserDetails();
            System.assertNotEquals(null, res.get('ContactId'));
            System.assertNotEquals(null, res.get('AccountId'));
            System.assertNotEquals(null, res.get('AccountName'));
        }
    }
    
    static testMethod void testGetActiveFundingOpportunityId() {
        Id foId = winFormSaveDraft.getActiveFundingOpportunityId();
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
                    'CO_PI_Email__c' => 'copi@draft.com',
                    'CO_PI_Institution__c' => 'Draft Institute',
                    'Co_Principal_Investigator_Co_PI__c' => 'Dr CoDraft',
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
                                    'Milestone_Target_Date__c' => String.valueOf(Date.today().addDays(10)),
                                    'Justification__c' => 'Phase 1',
                                    'Status__c' => 'Draft'
                                    },
                                        new Map<String, Object>() // skipped empty row
                                        };
                                            
                                            List<Map<String, Object>> budgets = new List<Map<String, Object>>{
                                                new Map<String, Object>{
                                                    'Name' => 'Infra',
                                                        'Amount' => 5000,
                                                        'Justification__c' => 'Equipments'
                                                        },
                                                            new Map<String, Object>() // skipped empty
                                                            };
                                                                
                                                                // Get RecordTypeId
              //Map<String, Schema.RecordTypeInfo> rtMap = Schema.SObjectType.IndividualApplication.getRecordTypeInfosByName();
            Id rtId = '012F6000000UQbBIAW';
            
            Test.startTest();
            
            Id draftId = winFormSaveDraft.saveDraftApplication(
                null, appData, milestones, budgets, rtId, 'Grant Application'
            );
            
            // Create additional Milestone and Budget
            Milestone__c addMs = new Milestone__c(
                Individual_Application__c = draftId,
                Milestone_Description__c = 'Execution',
                Budget_Required__c = 1000,
                Status__c = 'Draft'
            );
            insert addMs;
            
            Budget addBd = new Budget(
                Proposal__c = draftId,
                Name = 'Ops',
                Amount = 2000,
                Justification__c = 'Logistics',
                Status = 'Draft'
            );
            insert addBd;
            
            winFormSaveDraft.DraftWrapper draftWrap = winFormSaveDraft.getDraftApplication(draftId);
            
            Test.stopTest();
            
            
            System.assertNotEquals(null, draftWrap, '❌ DraftWrapper should not be null');
            System.assertEquals(draftId, draftWrap.Id, '✅ Should match saved draft ID');
            //System.assert(draftWrap.applicationData.containsKey('Project_Title__c'));
           // System.assertEquals('Draft App', draftWrap.applicationData.get('Project_Title__c'));
            System.assertEquals(true, draftWrap.milestones.size() >= 1);
            System.assertEquals(true, draftWrap.budgets.size() >= 1);
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
                'Budget_Required__c' => 1200,
                'Milestone_Target_Date__c' => String.valueOf(Date.today().addDays(15)),
                'Justification__c' => 'Plan & Procure',
                'Status__c' => 'Draft'
            }
        };

        List<Map<String, Object>> budgets = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => 'Infra',
                'Amount' => 8000,
                'Justification__c' => 'Hardware',
                'Status' => 'Draft'
            }
        };

        List<Id> fileIds = new List<Id>();

        Test.startTest();

        // 1) INSERT flow
        Id insertedAppId = winFormSaveDraft.saveApplicationWithMilestones(appData, milestones, fileIds, budgets);
        System.assertNotEquals(null, insertedAppId, '❌ Inserted Application ID should not be null');

        // 2) UPDATE flow
        appData.put('Id', insertedAppId);
        appData.put('Status', 'Submitted');
        Id updatedAppId = winFormSaveDraft.saveApplicationWithMilestones(appData, milestones, null, budgets);
        System.assertEquals(insertedAppId, updatedAppId, '✅ Updated App ID should match inserted one');

        Test.stopTest();

        List<ContentDocumentLink> links = [SELECT Id FROM ContentDocumentLink WHERE LinkedEntityId = :insertedAppId];
        System.assertEquals(0, links.size(), '✅ Zero file should be linked to the application');
    }
}



}