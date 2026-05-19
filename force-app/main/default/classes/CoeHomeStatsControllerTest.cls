@isTest
private class CoeHomeStatsControllerTest {

    // ── helpers ──────────────────────────────────────────────────────────────

    private static Account createAccount(String name) {
        Account acc = new Account(Name = name);
        insert acc;
        return acc;
    }

    private static Contact createContact(Id accountId, Boolean isCoeAdmin, Boolean isCoePI) {
        Contact c = new Contact(
            LastName     = 'TestContact',
            AccountId    = accountId,
            COE_Admin__c = isCoeAdmin,
            COE_PI__c    = isCoePI
        );
        insert c;
        return c;
    }

    private static User createPortalUser(Contact c, String alias) {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'COE User Profile' LIMIT 1];
        User u = new User(
            FirstName        = 'Test',
            LastName         = c.LastName,
            Alias            = alias,
            Email            = alias + '@test.example.com',
            Username         = alias + '@test.example.com.coetest',
            ProfileId        = p.Id,
            ContactId        = c.Id,
            TimeZoneSidKey   = 'America/New_York',
            LocaleSidKey     = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey= 'en_US'
        );
        insert u;
        return u;
    }

    // ── test: user has no ContactId ───────────────────────────────────────────

    @isTest
    static void testNoContact_returnsEmptyWrapper() {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User u = new User(
            FirstName        = 'No',
            LastName         = 'Contact',
            Alias            = 'ncusr',
            Email            = 'nocontact@test.example.com',
            Username         = 'nocontact@test.example.com.coetest',
            ProfileId        = p.Id,
            TimeZoneSidKey   = 'America/New_York',
            LocaleSidKey     = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey= 'en_US'
        );
        insert u;

        Test.startTest();
        CoeHomeStatsController.HomeStatsWrapper result;
        System.runAs(u) {
            result = CoeHomeStatsController.getHomeStats();
        }
        Test.stopTest();

        System.assertEquals(0, result.registeredPIs,  'registeredPIs should be 0');
        System.assertEquals(0, result.pendingReviews, 'pendingReviews should be 0');
        System.assertEquals(0, result.submittedToWIN, 'submittedToWIN should be 0');
        System.assertEquals(0, result.availableFunds, 'availableFunds should be 0');
    }

    // ── test: user is NOT a COE Admin ─────────────────────────────────────────

    @isTest
    static void testNonAdmin_returnsEmptyWrapper() {
        Account acc      = createAccount('Non-Admin Account');
        Contact c        = createContact(acc.Id, false, false);
        User    nonAdmin = createPortalUser(c, 'nadm');

        Test.startTest();
        CoeHomeStatsController.HomeStatsWrapper result;
        System.runAs(nonAdmin) {
            result = CoeHomeStatsController.getHomeStats();
        }
        Test.stopTest();

        System.assertEquals(0, result.registeredPIs,  'Non-admin: registeredPIs should be 0');
        System.assertEquals(0, result.pendingReviews, 'Non-admin: pendingReviews should be 0');
        System.assertEquals(0, result.submittedToWIN, 'Non-admin: submittedToWIN should be 0');
        System.assertEquals(0, result.availableFunds, 'Non-admin: availableFunds should be 0');
    }

    // ── test: COE Admin – counts & amounts populated ──────────────────────────

    @isTest
    static void testCoeAdmin_returnsCorrectStats() {
        Account acc   = createAccount('COE Test Account');
        Contact admin = createContact(acc.Id, true, false);

        // 2 registered PIs under same account
        createContact(acc.Id, false, true);
        createContact(acc.Id, false, true);

        // PI on a different account – should NOT be counted
        Account otherAcc = createAccount('Other Account');
        createContact(otherAcc.Id, false, true);

        User adminUser = createPortalUser(admin, 'cadm');

        // IndividualApplication records
        List<IndividualApplication> apps = new List<IndividualApplication>();
        for (Integer i = 0; i < 3; i++) {
            apps.add(new IndividualApplication(
                Status    = 'Proposal Submitted to COE Admin',
                AccountId = acc.Id,
                Category  = 'Grant Application'
            ));
        }
        for (Integer i = 0; i < 2; i++) {
            apps.add(new IndividualApplication(
                Status    = 'Proposal Submitted to WIN Admin',
                AccountId = acc.Id,
                Category  = 'Grant Application'
            ));
        }
        apps.add(new IndividualApplication(
            Status    = 'Proposal Submitted to COE Admin',
            AccountId = otherAcc.Id,
            Category  = 'Grant Application'
        ));
        insert apps;

        // FundingAwards – all 3 required fields included
        FundingAward fa1 = new FundingAward(
            Name                        = 'Test Award 1',
            AwardeeId                   = acc.Id,
            Amount                      = 3000,
            OwnerId                     = UserInfo.getUserId(),
            Initial_Tranche_Released__c = false
        );
        FundingAward fa2 = new FundingAward(
            Name                        = 'Test Award 2',
            AwardeeId                   = acc.Id,
            Amount                      = 2000,
            OwnerId                     = UserInfo.getUserId(),
            Initial_Tranche_Released__c = false
        );
        insert new List<FundingAward>{ fa1, fa2 };

        // FundingDisbursements – linked via FundingAwardId
        // Awardee__c is a formula field derived from FundingAward.AwardeeId
        insert new List<FundingDisbursement>{
            new FundingDisbursement(
                FundingAwardId   = fa1.Id,
                Amount           = 1000,
                DisbursementName = 'Test Disbursement 1'
            ),
            new FundingDisbursement(
                FundingAwardId   = fa2.Id,
                Amount           = 500,
                DisbursementName = 'Test Disbursement 2'
            )
        };

        // Capture totals AFTER insert to handle any pre-existing org data
        AggregateResult baseAward = [
            SELECT SUM(Amount) total FROM FundingAward WHERE AwardeeId = :acc.Id
        ];
        Decimal totalAward = baseAward.get('total') != null ? (Decimal) baseAward.get('total') : 0;

        AggregateResult baseDisbursed = [
            SELECT SUM(Amount) total FROM FundingDisbursement WHERE Awardee__c = :acc.Id
        ];
        Decimal totalDisbursed = baseDisbursed.get('total') != null ? (Decimal) baseDisbursed.get('total') : 0;

        Decimal expectedFunds = totalAward - totalDisbursed;

        Test.startTest();
        CoeHomeStatsController.HomeStatsWrapper result;
        System.runAs(adminUser) {
            result = CoeHomeStatsController.getHomeStats();
        }
        Test.stopTest();

        System.assertEquals(2,             result.registeredPIs,  'Should count 2 PIs');
        System.assertEquals(3,             result.pendingReviews, 'Should count 3 pending reviews');
        System.assertEquals(2,             result.submittedToWIN, 'Should count 2 submitted to WIN');
        System.assertEquals(expectedFunds, result.availableFunds, 'availableFunds mismatch');
    }

    // ── test: COE Admin – no funding data (zero sums) ─────────────────────────

    @isTest
    static void testCoeAdmin_noFundingData() {
        Account acc   = createAccount('Zero Funds Account');
        Contact admin = createContact(acc.Id, true, false);
        User    u     = createPortalUser(admin, 'zfnd');

        Test.startTest();
        CoeHomeStatsController.HomeStatsWrapper result;
        System.runAs(u) {
            result = CoeHomeStatsController.getHomeStats();
        }
        Test.stopTest();

        System.assertEquals(0, result.availableFunds, 'availableFunds should be 0 when no funding records');
    }
}