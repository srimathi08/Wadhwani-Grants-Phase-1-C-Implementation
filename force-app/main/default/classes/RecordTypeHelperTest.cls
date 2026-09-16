@isTest
private class RecordTypeHelperTest {

    @isTest
    static void testIndividualApplicationAllowedIds() {
        Set<Id> ids = RecordTypeHelper.individualApplicationAllowedIds();
        System.assertEquals(
            RecordTypeHelper.INDIVIDUAL_APPLICATION_TYPES.size(), ids.size(),
            'Should resolve one RecordTypeId per allowed IndividualApplication type'
        );
        for (Id rtId : ids) {
            System.assertNotEquals(null, rtId, 'RecordTypeId should not be null');
        }
    }

    @isTest
    static void testApplicationReviewAllowedIds() {
        Set<Id> ids = RecordTypeHelper.applicationReviewAllowedIds();
        System.assertEquals(
            RecordTypeHelper.APPLICATION_REVIEW_TYPES.size(), ids.size(),
            'Should resolve one RecordTypeId per allowed ApplicationReview type'
        );
    }

    @isTest
    static void testApplicationReviewReviewerAllowedIds() {
        Set<Id> reviewerIds = RecordTypeHelper.applicationReviewReviewerAllowedIds();
        System.assertEquals(
            RecordTypeHelper.APPLICATION_REVIEW_REVIEWER_TYPES.size(), reviewerIds.size(),
            'Should resolve one RecordTypeId per reviewer-only ApplicationReview type'
        );

        Id validatorId = RecordTypeHelper.applicationReviewValidatorId();
        System.assert(
            !reviewerIds.contains(validatorId),
            'Reviewer-only set should not include the WCF Validator RecordTypeId'
        );
    }

    @isTest
    static void testApplicationReviewValidatorId() {
        Id validatorId = RecordTypeHelper.applicationReviewValidatorId();
        System.assertNotEquals(null, validatorId, 'Validator RecordTypeId should resolve');
    }

    @isTest
    static void testApplicationDecisionAllowedIds() {
        Set<Id> ids = RecordTypeHelper.applicationDecisionAllowedIds();
        System.assertEquals(
            RecordTypeHelper.APPLICATION_DECISION_TYPES.size(), ids.size(),
            'Should resolve one RecordTypeId per allowed ApplicationDecision type'
        );

        Id wgApproverId = RecordTypeHelper.applicationDecisionWgApproverId();
        System.assertNotEquals(null, wgApproverId, 'WG Approver RecordTypeId should resolve');
    }

    @isTest
    static void testCachedLookupReturnsSameId() {
        // Second call for the same object+DeveloperName should hit the
        // cache and return the identical Id.
        Id first  = RecordTypeHelper.getRecordTypeId('ApplicationReview', 'WCF_Validator');
        Id second = RecordTypeHelper.getRecordTypeId('ApplicationReview', 'WCF_Validator');
        System.assertEquals(first, second, 'Cached lookup should return the same RecordTypeId');
    }

    @isTest
    static void testUnknownDeveloperNameThrows() {
        Boolean threw = false;
        try {
            RecordTypeHelper.getRecordTypeId('ApplicationReview', 'Not_A_Real_RecordType_XYZ');
        } catch (RecordTypeHelper.RecordTypeHelperException e) {
            threw = true;
            System.assert(
                e.getMessage().contains('Not_A_Real_RecordType_XYZ'),
                'Exception message should name the missing DeveloperName'
            );
        }
        System.assert(threw, 'Expected RecordTypeHelperException for an unknown DeveloperName');
    }
}