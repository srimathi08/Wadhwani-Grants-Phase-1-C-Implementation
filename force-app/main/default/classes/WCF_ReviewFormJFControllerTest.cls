@isTest
public class WCF_ReviewFormJFControllerTest {
 private static final String REVIEW_RT_ID = '012F6000000USNWIA4';

    // --- helpers to create WCF-style data ---
    private static IndividualApplication createWcfApplicationWithRelated() {
        Account acc = new Account(Name = 'Test Account');
        insert acc;

        IndividualApplication ia = new IndividualApplication();
        ia.AccountId = acc.Id;
        ia.Category = 'Grant Application';
        ia.Status = 'Submitted';
        ia.Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only';
        insert ia;

        Historical_Data__c hd = new Historical_Data__c(
            Proposal__c = ia.Id,
            CY1_Balance_Start_CFY_1__c = 24,
            CY1_Expense__c = 10,
            CY1_Revenue__c = 100,
            CY2_Balance_Start_CFY_2__c = 10,
            CY2_Expense__c = 30,
            CY2_Revenue__c = 120,
            CY3_Balance_Start_CFY_3__c = 20,
            CY3_Expense__c = 20,
            CY3_Revenue__c = 200
        );
        insert hd;

        Current_fiscal_year_data__c cy = new Current_fiscal_year_data__c(
            Revenue_Budget__c = 140,
            Revenue_Projection__c = 40,
            Revenue_Explanation__c = 'sample explanation',
            Expense_Budget__c = 120,
            Expense_Projection__c = 20,
            Expense_Explanation__c = 'Sample Expense Explanation',
            Net_Position_Explanation__c = 'Net Sample Explanation'
        );
        insert cy;

        Outcomes_Data__c od = new Outcomes_Data__c(
            Proposal__c = ia.Id,
            Skills_Duration_CFY__c = 'abc',
            Skills_Duration_FY_1__c = 'test',
            Skills_Duration_FY_2__c = 'test2',
            Skills_Duration_FY_3__c = 'test 3',
            Projected_Learner_Enrollments_CFY__c = '23',
            Projected_Learner_Enrollments_FY_1__c = '40'
        );
        insert od;

        return ia;
    }

    // ===== saveApplicationReview =====
    @IsTest
    static void testSaveApplicationReview() {
        IndividualApplication app = createWcfApplicationWithRelated();

        ApplicationReview review = new ApplicationReview(
            ApplicationId = app.Id
        );
        String jsonBody = JSON.serialize(review);

        Test.startTest();
        WCF_ReviewFormJFController.saveApplicationReview(jsonBody);
        Test.stopTest();

        ApplicationReview saved = [
            SELECT Id, IsSubmitted, Status, EndDate, RecordTypeId, ReviewedById
            FROM ApplicationReview
            WHERE ApplicationId = :app.Id AND ReviewedById = :UserInfo.getUserId()
            LIMIT 1
        ];
        System.assertEquals(true, saved.IsSubmitted, 'Expected submitted review');
        System.assertEquals('Review Submitted', saved.Status);
        System.assertEquals(Date.today(), saved.EndDate);
        System.assertEquals(REVIEW_RT_ID, saved.RecordTypeId);
    }

    // ===== saveDraftReview =====
    @IsTest
    static void testSaveDraftReview() {
        IndividualApplication app = createWcfApplicationWithRelated();

        ApplicationReview draft = new ApplicationReview(
            ApplicationId = app.Id,
            Financial_Stability_Comments_3Y__c = 'Draft notes'
        );
        String jsonBody = JSON.serialize(draft);

        Test.startTest();
        ApplicationReview result = WCF_ReviewFormJFController.saveDraftReview(jsonBody);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Draft review should be returned');
        System.assertEquals('Draft', result.Status);
        System.assertEquals(false, result.IsSubmitted);
        System.assertEquals(REVIEW_RT_ID, result.RecordTypeId);
    }

    // ===== getDraftReviewRecord =====
    @IsTest
    static void testGetDraftReviewRecord() {
        IndividualApplication app = createWcfApplicationWithRelated();

        // seed a draft directly (must match controller’s filter)
        ApplicationReview seeded = new ApplicationReview(
            ApplicationId = app.Id,
            ReviewedById = UserInfo.getUserId(),
            RecordTypeId = REVIEW_RT_ID,
            Status = 'Draft',
            Financial_Records_Comments__c = 'Seeded draft'
        );
        insert seeded;

        Test.startTest();
        ApplicationReview fetched = WCF_ReviewFormJFController.getDraftReviewRecord(app.Id);
        Test.stopTest();

        System.assertNotEquals(null, fetched, 'Expected draft record');
        System.assertEquals('Draft', fetched.Status);
        System.assertEquals(seeded.Id, fetched.Id);
    }

    // ===== getIndividualApplication (success) =====
    @IsTest
    static void testGetIndividualApplicationSuccess() {
        IndividualApplication app = createWcfApplicationWithRelated();

        Test.startTest();
        WCF_ReviewFormJFController.IndividualApplicationWrapper wrap =
            WCF_ReviewFormJFController.getIndividualApplication(app.Id);
        Test.stopTest();

        System.assertEquals(app.Id, wrap.recordId);
        System.assertEquals(app.Organizational_Area_s_for_Funding_Inves__c, wrap.OrgAreaArea);
        System.assertNotEquals(null, wrap.recordTypeId);
    }

    // ===== hasAlreadyReviewed =====
    @IsTest
    static void testHasAlreadyReviewed() {
        IndividualApplication app = createWcfApplicationWithRelated();

        // initially false
        Test.startTest();
        Boolean before = WCF_ReviewFormJFController.hasAlreadyReviewed(app.Id);
       // System.assertEquals(false, before, 'Should be false with no submitted review');

        // add a submitted review that matches controller criteria
        ApplicationReview submitted = new ApplicationReview(
            ApplicationId = app.Id,
            ReviewedById = UserInfo.getUserId(),
            IsSubmitted = true,
            Status = 'Review Submitted',
            RecordTypeId = REVIEW_RT_ID,
            EndDate = Date.today()
        );
        insert submitted;

        Boolean after = WCF_ReviewFormJFController.hasAlreadyReviewed(app.Id);
        Test.stopTest();

        System.assertEquals(true, after, 'Should be true once submitted review exists');
    }
}