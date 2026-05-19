public with sharing class ProposalPathController {

    private static final Set<String> TERMINAL_STATUSES = new Set<String>{
        'Recommended',
        'Not Recommended',
        'Recommended for Resubmission',
        'Approved for Funding',
        'Not Recommended for Funding',
        'Approved with Resubmission',
        'Approved - Level 1',
        'Submitted Back - Approved for Funding Resubmission'
    };

    private without sharing class SystemUpdater {
        void updateApp(IndividualApplication app) {
            update app;
        }
    }

    @AuraEnabled(cacheable=true)
    public static String getProposalStatus(Id recordId) {

        if (recordId == null) return 'Draft';

        IndividualApplication app = [
            SELECT Status, Review_Status__c
            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ];

        String s = app.Status;

        if (app.Review_Status__c == 'Externally Under Review') {
            return 'Under Review';
        }

        if (s == 'Draft' || s == 'Revision Requested') {
            return 'Draft';
        }

        if (
            s == 'Submitted'
            || s == 'Proposal Submitted to COE Admin'
            || s == 'Proposal Resubmitted to COE Admin'
        ) {
            return 'Submitted to COE Admin';
        }

        if (s != null && s.contains('COE Admin')) {
            return 'COE Admin Actions';
        }

        if (
            s == 'Proposal Submitted to WIN Admin'
            || s == 'Proposal Resubmitted to WIN Admin'
        ) {
            return 'Submitted to WIN Admin';
        }

        if (s != null && s.contains('WIN Admin')) {
            return 'WIN Admin Actions';
        }

        if (
            s == 'Recommended'
            || s == 'Not Recommended'
            || s == 'Recommended for Resubmission'
            || s == 'Approved for Funding'
            || s == 'Not Recommended for Funding'
            || s == 'Approved with Resubmission'
            || s == 'Submitted Back - Approved for Funding Resubmission'
        ) {
            return 'Decision';
        }

        return 'Draft';
    }

    @AuraEnabled
    public static void syncUnderReviewStatus(Id recordId) {

        if (recordId == null) return;

        IndividualApplication app = [
            SELECT Id, Status, Review_Status__c
            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ];

        if (TERMINAL_STATUSES.contains(app.Status)) {
            return;
        }

        Integer reviewerCount = [
            SELECT COUNT()
            FROM ApplicationReview
            WHERE ApplicationId = :recordId
            AND Reviewer__c != null
        ];

        Boolean hasReviewer = reviewerCount > 0;

        try {
            if (hasReviewer) {
                if (app.Review_Status__c != 'Externally Under Review') {
                    app.Review_Status__c = 'Externally Under Review';
                    new SystemUpdater().updateApp(app);
                }
            } else {
                if (app.Review_Status__c == 'Externally Under Review') {
                    app.Review_Status__c = 'Not Assigned';
                    new SystemUpdater().updateApp(app);
                }
            }
        } catch (DmlException e) {
            // Validation rule on IndividualApplication blocks edits on submitted
            // records. Log and swallow — this must not block ApplicationReview saves.
            System.debug('syncUnderReviewStatus skipped due to validation rule: ' + e.getMessage());
        }
    }

    @future
    public static void syncUnderReviewStatusAsync(Set<Id> recordIds) {
        for (Id pid : recordIds) {
            syncUnderReviewStatus(pid);
        }
    }
}