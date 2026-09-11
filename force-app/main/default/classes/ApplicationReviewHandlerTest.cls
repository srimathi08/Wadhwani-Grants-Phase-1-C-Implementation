@IsTest
private class ApplicationReviewHandlerTest {

    // ---------------------------------------------------------------
    // Helper: build a valid-looking fake Id without inserting a row.
    // Lets us test populateConsolidatedComments (which only reads/writes
    // in-memory field values and needs Ids purely as map keys) without
    // depending on Account/Application/RecordType setup at all.
    // ---------------------------------------------------------------
    private static Integer fakeIdCounter = 0;

    private static Id fakeId(Schema.SObjectType objType) {
        fakeIdCounter++;
        String prefix = objType.getDescribe().getKeyPrefix();
        String seq = String.valueOf(fakeIdCounter);
        String padded = '000000000000'.substring(0, 12 - seq.length()) + seq;
        return (Id) (prefix + padded);
    }

    // =================================================================
    // addWorkingDays
    // =================================================================

    @IsTest
    static void testAddWorkingDays_singleDayNoWeekend() {
        // Thursday -> Friday (no weekend involved)
        Date start = Date.newInstance(2026, 7, 30); // Thursday
        Date result = ApplicationReviewHandler.addWorkingDays(start, 1);
        System.assertEquals(Date.newInstance(2026, 7, 31), result,
            'Adding 1 working day to a Thursday should land on Friday');
    }

    @IsTest
    static void testAddWorkingDays_skipsWeekend() {
        // Friday + 1 working day should skip Sat/Sun and land on Monday
        Date start = Date.newInstance(2026, 7, 31); // Friday
        Date result = ApplicationReviewHandler.addWorkingDays(start, 1);
        System.assertEquals(Date.newInstance(2026, 8, 3), result,
            'Adding 1 working day to a Friday should skip the weekend and land on Monday');
    }

    @IsTest
    static void testAddWorkingDays_startingOnSaturday() {
        // Saturday + 1 working day should skip Sun and land on Monday
        Date start = Date.newInstance(2026, 8, 1); // Saturday
        Date result = ApplicationReviewHandler.addWorkingDays(start, 1);
        System.assertEquals(Date.newInstance(2026, 8, 3), result,
            'Adding 1 working day starting from a Saturday should land on Monday');
    }

    @IsTest
    static void testAddWorkingDays_multipleDaysAcrossWeekend() {
        // Thursday + 5 working days spans one weekend, should land on the following Thursday
        Date start = Date.newInstance(2026, 7, 30); // Thursday
        Date result = ApplicationReviewHandler.addWorkingDays(start, 5);
        System.assertEquals(Date.newInstance(2026, 8, 6), result,
            'Adding 5 working days should skip both weekend days and land on the following Thursday');
    }

    @IsTest
    static void testAddWorkingDays_zeroDaysReturnsSameDate() {
        Date start = Date.newInstance(2026, 7, 30);
        Date result = ApplicationReviewHandler.addWorkingDays(start, 0);
        System.assertEquals(start, result,
            'Adding 0 working days should return the original date unchanged');
    }

    // =================================================================
    // populateConsolidatedComments - insert scenario (oldMap == null)
    // =================================================================

    @IsTest
    static void testPopulateConsolidatedComments_insertWithSomeAnswers() {
        ApplicationReview review = new ApplicationReview();
        review.put('Question_Number_1__c', 'Yes');
        review.put('Question_Number_3__c', 'No');
        review.put('Question_Number_10__c', '   '); // blank/whitespace, should be ignored

        List<ApplicationReview> newList = new List<ApplicationReview>{ review };

        Test.startTest();
        ApplicationReviewHandler.populateConsolidatedComments(newList, null);
        Test.stopTest();

        String expected = 'Question 1: Yes\n\nQuestion 3: No';
        System.assertEquals(expected, review.Consolidated_Return_Comments__c,
            'Only non-blank question answers should be included, in order, on insert');
    }

    @IsTest
    static void testPopulateConsolidatedComments_insertWithNoAnswers() {
        ApplicationReview review = new ApplicationReview();
        // No question fields populated at all

        List<ApplicationReview> newList = new List<ApplicationReview>{ review };

        Test.startTest();
        ApplicationReviewHandler.populateConsolidatedComments(newList, null);
        Test.stopTest();

        System.assertEquals(null, review.Consolidated_Return_Comments__c,
            'Consolidated_Return_Comments__c should be null when no questions are answered');
    }

    // =================================================================
    // populateConsolidatedComments - update scenario, no question change
    // =================================================================

    @IsTest
    static void testPopulateConsolidatedComments_updateNoQuestionChange() {
        Id reviewId = fakeId(ApplicationReview.SObjectType);

        ApplicationReview oldReview = new ApplicationReview(Id = reviewId);
        oldReview.put('Question_Number_1__c', 'Yes');
        oldReview.put('Question_Number_2__c', 'No');
        oldReview.Consolidated_Return_Comments__c = 'Pre-existing comments';

        ApplicationReview newReview = new ApplicationReview(Id = reviewId);
        newReview.put('Question_Number_1__c', 'Yes');
        newReview.put('Question_Number_2__c', 'No');
        newReview.Consolidated_Return_Comments__c = 'Pre-existing comments';
        // Simulate some unrelated field changing on the record
        newReview.Status = 'Review Submitted';

        Map<Id, ApplicationReview> oldMap = new Map<Id, ApplicationReview>{ reviewId => oldReview };
        List<ApplicationReview> newList = new List<ApplicationReview>{ newReview };

        Test.startTest();
        ApplicationReviewHandler.populateConsolidatedComments(newList, oldMap);
        Test.stopTest();

        System.assertEquals('Pre-existing comments', newReview.Consolidated_Return_Comments__c,
            'When no Question_Number_X__c field changes, Consolidated_Return_Comments__c should be left untouched');
    }

    // =================================================================
    // populateConsolidatedComments - update scenario, question changed
    // =================================================================

    @IsTest
    static void testPopulateConsolidatedComments_updateWithQuestionChange() {
        Id reviewId = fakeId(ApplicationReview.SObjectType);

        ApplicationReview oldReview = new ApplicationReview(Id = reviewId);
        oldReview.put('Question_Number_1__c', 'Yes');
        oldReview.put('Question_Number_2__c', 'No');
        oldReview.Consolidated_Return_Comments__c = 'Old comments';

        ApplicationReview newReview = new ApplicationReview(Id = reviewId);
        newReview.put('Question_Number_1__c', 'Yes');
        newReview.put('Question_Number_2__c', 'Changed answer'); // this changed
        newReview.Consolidated_Return_Comments__c = 'Old comments';

        Map<Id, ApplicationReview> oldMap = new Map<Id, ApplicationReview>{ reviewId => oldReview };
        List<ApplicationReview> newList = new List<ApplicationReview>{ newReview };

        Test.startTest();
        ApplicationReviewHandler.populateConsolidatedComments(newList, oldMap);
        Test.stopTest();

        String expected = 'Question 1: Yes\n\nQuestion 2: Changed answer';
        System.assertEquals(expected, newReview.Consolidated_Return_Comments__c,
            'When a Question_Number_X__c field changes, Consolidated_Return_Comments__c should be recalculated');
    }

    @IsTest
    static void testPopulateConsolidatedComments_updateClearsAllAnswers() {
        Id reviewId = fakeId(ApplicationReview.SObjectType);

        ApplicationReview oldReview = new ApplicationReview(Id = reviewId);
        oldReview.put('Question_Number_1__c', 'Yes');
        oldReview.Consolidated_Return_Comments__c = 'Question 1: Yes';

        ApplicationReview newReview = new ApplicationReview(Id = reviewId);
        newReview.put('Question_Number_1__c', null); // answer removed
        newReview.Consolidated_Return_Comments__c = 'Question 1: Yes';

        Map<Id, ApplicationReview> oldMap = new Map<Id, ApplicationReview>{ reviewId => oldReview };
        List<ApplicationReview> newList = new List<ApplicationReview>{ newReview };

        Test.startTest();
        ApplicationReviewHandler.populateConsolidatedComments(newList, oldMap);
        Test.stopTest();

        System.assertEquals(null, newReview.Consolidated_Return_Comments__c,
            'When the only answered question is cleared, Consolidated_Return_Comments__c should become null');
    }

    // =================================================================
    // Bulk scenario
    // =================================================================

    @IsTest
    static void testPopulateConsolidatedComments_bulk() {
        List<ApplicationReview> newList = new List<ApplicationReview>();
        Map<Id, ApplicationReview> oldMap = new Map<Id, ApplicationReview>();

        for (Integer i = 0; i < 200; i++) {
            Id reviewId = fakeId(ApplicationReview.SObjectType);

            ApplicationReview oldReview = new ApplicationReview(Id = reviewId);
            oldReview.put('Question_Number_1__c', 'Yes');

            ApplicationReview newReview = new ApplicationReview(Id = reviewId);
            // Every other record gets a changed answer; the rest stay the same
            newReview.put('Question_Number_1__c', Math.mod(i, 2) == 0 ? 'Yes' : 'No');

            oldMap.put(reviewId, oldReview);
            newList.add(newReview);
        }

        Test.startTest();
        ApplicationReviewHandler.populateConsolidatedComments(newList, oldMap);
        Test.stopTest();

        for (Integer i = 0; i < 200; i++) {
            ApplicationReview review = newList[i];
            if (Math.mod(i, 2) == 0) {
                // Unchanged from old value -> method should skip recalculation,
                // leaving Consolidated_Return_Comments__c null (it was never set)
                System.assertEquals(null, review.Consolidated_Return_Comments__c);
            } else {
                System.assertEquals('Question 1: No', review.Consolidated_Return_Comments__c);
            }
        }
    }
}