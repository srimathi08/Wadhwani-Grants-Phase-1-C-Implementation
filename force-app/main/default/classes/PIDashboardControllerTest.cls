@IsTest
public class PIDashboardControllerTest {

    @TestSetup
    static void setupData() {

        Account acc = new Account(Name = 'Draft Test Institution');
        insert acc;

        Contact admin = new Contact(
            LastName = 'Admin',
            Email = 'admin@example.com',
            COE_Admin__c = true,
            AccountId = acc.Id
        );
        insert admin;
        
        Contact pi = new Contact(
            LastName = 'Pi',
            Email = 'pi@example.com',
            COE_PI__c = true,
            AccountId = acc.Id
        );
        insert pi;

        Profile p = [SELECT Id FROM Profile WHERE Name = 'COE User Profile' LIMIT 1];

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
        
        Profile piProfile = [SELECT Id FROM Profile WHERE Name = 'PI User Profile' LIMIT 1];

        User upi = new User(
            FirstName = 'Draft a',
            LastName = 'Userpi',
            Username = 'testuserpi@test.com',
            Email = 'draftpiuser@example.com',
            Alias = 'dpuser',
            CommunityNickname = 'dpiuser',
            ProfileId = piProfile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = pi.Id
        );
        insert upi;
    }

    @IsTest
    static void testGetPICounts() {

        User u_pi = [
            SELECT Id FROM User WHERE Username = 'testuserpi@test.com' LIMIT 1
        ];

        System.runAs(u_pi) {

            List<IndividualApplication> apps = new List<IndividualApplication>{

                new IndividualApplication(
                    Status='Draft',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                ),

                new IndividualApplication(
                    Status='Proposal Submitted to COE Admin',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                ),

                new IndividualApplication(
                    Status='Proposal Approved by COE Admin',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                ),

                new IndividualApplication(
                    Status='Proposal Rejected by COE Admin',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                ),

                // 🔥 MATCHES FINAL APEX
                new IndividualApplication(
                    Status='Asked for Resubmission by COE Admin',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                ),

                new IndividualApplication(
                    Status='Proposal Resubmitted to COE Admin',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                ),

                new IndividualApplication(
                    Status='Proposal Submitted to WIN Admin',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                ),

                new IndividualApplication(
                    Status='Proposal Approved by WIN Admin',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                ),

                new IndividualApplication(
                    Status='Proposal Rejected by WIN Admin',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                ),

                // 🔥 MATCHES FINAL APEX
                new IndividualApplication(
                    Status='Asked for Resubmission by WIN Admin',
                    ApplicationType='WIN Project Proposal',
                    Category='Grant Application'
                )
            };

            insert apps;

            Test.startTest();
            Map<String, Integer> result =
                PIDashboardController.getPICounts();
            Test.stopTest();

            System.assertEquals(1, result.get('Draft'));
            System.assertEquals(1, result.get('SubmittedToCOE'));
            System.assertEquals(1, result.get('ApprovedByCOE'));
            System.assertEquals(1, result.get('RejectedByCOE'));
            System.assertEquals(1, result.get('RevisionByCOE'));
            System.assertEquals(1, result.get('ResubmittedToCOE'));

            System.assertEquals(1, result.get('SubmittedToWIN'));
            System.assertEquals(1, result.get('ApprovedByWIN'));
            System.assertEquals(1, result.get('RejectedByWIN'));
            System.assertEquals(1, result.get('RevisionByWIN'));
        }
    }
}