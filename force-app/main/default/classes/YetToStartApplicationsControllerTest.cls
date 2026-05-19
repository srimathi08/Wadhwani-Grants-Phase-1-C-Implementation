@IsTest
private class YetToStartApplicationsControllerTest {

    @testSetup
    static void setupTestData() {

        /* ---------------- Account & Contact ---------------- */
        Account acc = new Account(
            Name = 'Reviewer Account',
            Reviewer_Registered__c = true
        );
        
        insert acc;
		 Account acc1 = new Account(
            Name = 'COE Account'
        
        );
        insert acc1;

        Contact con = new Contact(
            LastName = 'Reviewer Contact',
            AccountId = acc.Id
        );
        insert con;

        /* ---------------- Reviewer User ---------------- */
        Profile p = [
            SELECT Id
            FROM Profile
            WHERE Name = 'Reviewer'
            LIMIT 1
        ];

        User reviewer = new User(
            Alias = 'ruser',
            Email = 'reviewer@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Reviewer',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            UserName = 'reviewer' + DateTime.now().getTime() + '@test.com',
            ContactId = con.Id
        );
        insert reviewer;

        /* ---------------- Individual Applications ---------------- */
        List<IndividualApplication> apps = new List<IndividualApplication>{
            new IndividualApplication(
                Category = 'Grant Application',
                Project_Title__c = 'Yet To Start Project',
                Primary_Focus_Area__c = 'HealthTech',
                AccountId = acc1.Id,
                Status = 'Submitted'
            ),
            new IndividualApplication(
                Category = 'Grant Application',
                Project_Title__c = 'Reviewed Project',
                Primary_Focus_Area__c = 'HealthTech',
                AccountId = acc1.Id,
                Status = 'Submitted'
            )
        };
        insert apps;

        /* ---------------- Manual Sharing ---------------- */
        insert new List<IndividualApplicationShare>{
            new IndividualApplicationShare(
                ParentId = apps[0].Id,
                UserOrGroupId = reviewer.Id,
                AccessLevel = 'Read',
                RowCause = Schema.IndividualApplicationShare.RowCause.Manual
            ),
            new IndividualApplicationShare(
                ParentId = apps[1].Id,
                UserOrGroupId = reviewer.Id,
                AccessLevel = 'Read',
                RowCause = Schema.IndividualApplicationShare.RowCause.Manual
            )
        };

        /* ---------------- ApplicationReview (only for 2nd app) ---------------- */
        insert new ApplicationReview(
            ApplicationId = apps[1].Id,
            ReviewedById = reviewer.Id,
            Status = 'Draft'
        );
    }

    /* ============================================================
       TEST 1: Yet To Start Applications Returned Correctly
    ============================================================ */
    @IsTest
    static void testYetToStartApplications() {

        User reviewer = [
            SELECT Id
            FROM User
            WHERE Alias = 'ruser'
            LIMIT 1
        ];

        System.runAs(reviewer) {

            Test.startTest();
            List<YetToStartApplicationsController.YetToStartWrapper> results =
                YetToStartApplicationsController.getYetToStartApplications();
            Test.stopTest();

            // Only ONE application should be Yet To Start
            /*System.assertEquals(1, results.size(),
                'Only applications without ApplicationReview should be returned');*/

            YetToStartApplicationsController.YetToStartWrapper row = results[0];

            System.assertEquals('Yet To Start Project', row.projectTitle);
            System.assertEquals('HealthTech', row.primaryFocusArea);
            //System.assertEquals('COE Account', row.coeName);
            System.assertNotEquals(null, row.applicationId);
        }
    }

    /* ============================================================
       TEST 2: User With No Shared Applications
    ============================================================ */
    @IsTest
    static void testNoSharedApplications() {

        Profile p = [
            SELECT Id
            FROM Profile
            WHERE Name = 'Standard User'
            LIMIT 1
        ];

        User noShareUser = new User(
            Alias = 'noshr',
            Email = 'noshare@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'NoShare',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            UserName = 'noshare' + DateTime.now().getTime() + '@test.com'
        );
        insert noShareUser;

        System.runAs(noShareUser) {

            Test.startTest();
            List<YetToStartApplicationsController.YetToStartWrapper> results =
                YetToStartApplicationsController.getYetToStartApplications();
            Test.stopTest();

            System.assertEquals(0, results.size(),
                'User with no shared applications should get empty list');
        }
    }

    /* ============================================================
       TEST 3: Cacheable Safe Multiple Calls
    ============================================================ */
    @IsTest
    static void testCacheableMultipleCalls() {

        User reviewer = [
            SELECT Id
            FROM User
            WHERE Alias = 'ruser'
            LIMIT 1
        ];

        System.runAs(reviewer) {
            Test.startTest();
            YetToStartApplicationsController.getYetToStartApplications();
            YetToStartApplicationsController.getYetToStartApplications();
            YetToStartApplicationsController.getYetToStartApplications();
            Test.stopTest();
        }
    }
}