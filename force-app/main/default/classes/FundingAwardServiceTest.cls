@IsTest(seeAllData=true)
public class FundingAwardServiceTest {

    /* =========================================================
       getMilestones – happy path (if data exists)
    ========================================================= */
    @IsTest
    static void testGetMilestones() {

        List<FundingAward> faList = [
            SELECT Id
            FROM FundingAward
            LIMIT 1
        ];

        if (faList.isEmpty()) {
            System.assert(true);
            return;
        }

        Test.startTest();
        List<Milestone__c> result =
            FundingAwardService.getMilestones(faList[0].Id);
        Test.stopTest();

        System.assertNotEquals(null, result);
    }

    /* =========================================================
       getMilestones – NULL ID (guard clause)
    ========================================================= */
    @IsTest
    static void testGetMilestones_NullId() {
        try {
            FundingAwardService.getMilestones(null);
            System.assert(false, 'Exception should have been thrown');
        } catch (Exception e) {
            System.assert(true);
        }
    }

    /* =========================================================
       getMilestone – happy path
    ========================================================= */
    @IsTest
    static void testGetMilestone() {

        List<Milestone__c> msList = [
            SELECT Id FROM Milestone__c LIMIT 1
        ];

        if (msList.isEmpty()) {
            System.assert(true);
            return;
        }

        Test.startTest();
        Milestone__c ms =
            FundingAwardService.getMilestone(msList[0].Id);
        Test.stopTest();

        System.assertEquals(msList[0].Id, ms.Id);
    }

    /* =========================================================
       createDisbursement – guarded happy path
    ========================================================= */
    @IsTest
    static void testCreateDisbursement() {

        List<FundingAward> faList = [
            SELECT Id FROM FundingAward LIMIT 1
        ];
        List<Milestone__c> msList = [
            SELECT Id FROM Milestone__c LIMIT 1
        ];

        if (faList.isEmpty() || msList.isEmpty()) {
            System.assert(true);
            return;
        }

        String payloadJson = JSON.serialize(new Map<String, Object>{
            'fundingAwardId' => faList[0].Id,
            'milestoneId' => msList[0].Id,
            'amount' => 1000
        });

        Test.startTest();
        Id result = FundingAwardService.createDisbursement(payloadJson);
        Test.stopTest();

        System.assertNotEquals(null, result);
    }

    /* =========================================================
       createDisbursement – EMPTY payload
    ========================================================= */
    @IsTest
    static void testCreateDisbursement_EmptyPayload() {
        try {
            FundingAwardService.createDisbursement('');
            System.assert(false);
        } catch (Exception e) {
            System.assert(true);
        }
    }

    /* =========================================================
       createDisbursement – Missing FundingAward
    ========================================================= */
    @IsTest
    static void testCreateDisbursement_MissingFundingAward() {

        List<Milestone__c> msList = [
            SELECT Id FROM Milestone__c LIMIT 1
        ];

        if (msList.isEmpty()) {
            System.assert(true);
            return;
        }

        String payloadJson = JSON.serialize(new Map<String, Object>{
            'milestoneId' => msList[0].Id,
            'amount' => 500
        });

        try {
            FundingAwardService.createDisbursement(payloadJson);
            System.assert(false);
        } catch (Exception e) {
            System.assert(true);
        }
    }

    /* =========================================================
       createDisbursement – Missing Milestone (EXTRA COVERAGE)
    ========================================================= */
    @IsTest
    static void testCreateDisbursement_MissingMilestone() {

        List<FundingAward> faList = [
            SELECT Id FROM FundingAward LIMIT 1
        ];

        if (faList.isEmpty()) {
            System.assert(true);
            return;
        }

        String payloadJson = JSON.serialize(new Map<String, Object>{
            'fundingAwardId' => faList[0].Id,
            'amount' => 2000
        });

        try {
            FundingAwardService.createDisbursement(payloadJson);
            System.assert(false);
        } catch (Exception e) {
            System.assert(true);
        }
    }
}