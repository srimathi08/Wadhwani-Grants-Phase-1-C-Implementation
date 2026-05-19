public with sharing class ReviewSummaryController {

    @TestVisible private static Boolean forceError = false;

    @AuraEnabled(cacheable = true)
    public static Map<String, Integer> getReviewSummary() {

        Id currentUserId = UserInfo.getUserId();
        Map<String, Integer> summary = new Map<String, Integer>();

        try {

            // Force exception in test
            if (forceError) {
                throw new AuraHandledException('Forced test exception');
            }

            Integer totalAssigned = [
                SELECT COUNT()
                FROM IndividualApplicationShare
                WHERE UserOrGroupId = :currentUserId
            ];

            Integer submittedReviews = [
                SELECT COUNT()
                FROM ApplicationReview
                WHERE ReviewedById = :currentUserId
                AND Status = 'Review Submitted'
            ];

            Integer draftReviews = [
                SELECT COUNT()
                FROM ApplicationReview
                WHERE ReviewedById = :currentUserId
                AND Status = 'Draft'
            ];

            Integer rejectedReviews = [
                SELECT COUNT()
                FROM ApplicationReview
                WHERE ReviewedById = :currentUserId
                AND Status = 'Reviewer Rejected'
            ];

            Integer yetToStart = totalAssigned
                - submittedReviews
                - draftReviews
                - rejectedReviews;

            summary.put('totalAssigned', totalAssigned);
            summary.put('submitted', submittedReviews);
            summary.put('draft', draftReviews);
            summary.put('rejected', rejectedReviews);
            summary.put('yetToStart', yetToStart);

        } catch (Exception e) {
            System.debug('Error in getReviewSummary: ' + e.getMessage());
            // EMPTY CATCH BLOCK — as requested
        }

        return summary;
    }
}