public with sharing class ProposalPathController {

    // Every Status value that represents a final decision has been reached.
    // Once a record's Status is in this set, the tracker must reflect that
    // decision exactly — the "Under Review" reviewer-flag check below must
    // never override it, and syncUnderReviewStatus must never touch
    // Review_Status__c on these records again.
    private static final Set<String> TERMINAL_STATUSES = new Set<String>{
        'Recommended',
        'Not Recommended',
        'Recommended for Resubmission',
        'Approved for Funding',
        'Not Recommended for Funding',
        'Approved with Resubmission',
        'Submitted Back - Approved for Funding Resubmission',
        'Approved - Level 1',
        'Rejected - Level 1',
        'Approved - Level 2',
        'Rejected - Level 2',
        'Funded'
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

        if (s == null || s == 'Draft' || s == 'Revision Requested') {
            return 'Draft';
        }

        // --- Terminal/decision statuses ALWAYS win, before the reviewer
        // flag is even considered. This is the fix: previously the
        // Review_Status__c == 'Externally Under Review' check ran first
        // and unconditionally, so a record could reach "Approved for
        // Funding" (or any later status) and still be reported as
        // "Under Review" forever, because nothing ever reset that flag.
        if (TERMINAL_STATUSES.contains(s)) {
            return s;
        }

        // --- The Review_Status__c flag is only ever meaningful for ONE
        // transition: right after WIN Admin approves, before the record
        // is formally moved to Status = 'Under Review'. It must NOT be
        // allowed to override earlier stages or "sent back" statuses —
        // in practice the flag is never cleared when a proposal is later
        // asked for resubmission, so treating it as authoritative for
        // every non-terminal status caused statuses like "Asked for
        // Resubmission by WIN Admin" to incorrectly show as "Under
        // Review" too.
        Set<String> WIN_APPROVED_AWAITING_REVIEW = new Set<String>{
            'Proposal Approved by WIN Admin',
            'Proposal Approved by Win Admin'
        };

        if (
            WIN_APPROVED_AWAITING_REVIEW.contains(s)
            && app.Review_Status__c == 'Externally Under Review'
        ) {
            return 'Under Review';
        }

        // --- Otherwise pass the raw workflow status straight through
        // (e.g. 'Proposal Submitted to COE Admin', 'Proposal Approved by
        // COE Admin', 'Asked for Resubmission by WIN Admin', 'In Review',
        // 'Submitted', etc.) — the LWC's STATUS_CONFIG map already knows
        // how to render every one of these exactly.
        return s;
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