public with sharing class ReviewSummaryController {

    @TestVisible private static Boolean forceError = false;

    private static final Set<String> WCF_REVIEW_RECORD_TYPES = new Set<String>{
        'WCF_Job_Creation_Review',
        'WCF_Job_Fulfillment',
        'WCF_Job_Fulfillment_Job_Creation'
    };

    private static Set<Id> getUnderReviewAppIds() {
        Set<Id> appIds = new Set<Id>();
        for (IndividualApplication ia : [
            SELECT Id FROM IndividualApplication
            WHERE Status = 'Under Review'
        ]) {
            appIds.add(ia.Id);
        }
        return appIds;
    }
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

   @AuraEnabled
    public static List<ReviewerPreviewItem> getReviewerPreview(Integer maxRows) {
        if (maxRows == null) maxRows = 5;

        // ── Step 1: Start from ALL "Under Review" applications (not from ApplicationReview) ──
        // This is the key fix — it ensures apps with NO review record yet
        // ("Not Started") are still included, not just ones that already
        // have an ApplicationReview row.
        List<IndividualApplication> apps = [
            SELECT Id, Name, Account.Name, RecordType.Name, Headquarters_City_and_Country__c,Status
            FROM IndividualApplication
           WHERE Status IN (
        'Under Review',
        'Reviewer Rejected'
    )
        ];
        if (apps.isEmpty()) return new List<ReviewerPreviewItem>();

        Set<Id> underReviewIds = new Map<Id, IndividualApplication>(apps).keySet();

        // ── Step 2: Pull WCF review records (if they exist) for these apps ──
        Map<Id, ApplicationReview> reviewByAppId = new Map<Id, ApplicationReview>();
        for (ApplicationReview ar : [
            SELECT Id, ApplicationId, Status, IsSubmitted, DueDate, LastModifiedDate
            FROM ApplicationReview
            WHERE ApplicationId IN :underReviewIds
            AND RecordType.DeveloperName IN :WCF_REVIEW_RECORD_TYPES
            ORDER BY LastModifiedDate DESC
        ]) {
            // Keep only the most recent review per application
            if (!reviewByAppId.containsKey(ar.ApplicationId)) {
                reviewByAppId.put(ar.ApplicationId, ar);
            }
        }

        // ── Step 3: Backfill DueDate from WCF_Validator review where missing ──
        Map<Id, Date> validatorDueDateMap = new Map<Id, Date>();
        for (ApplicationReview ar : [
            SELECT ApplicationId, DueDate
            FROM ApplicationReview
            WHERE ApplicationId IN :underReviewIds
            AND RecordType.DeveloperName = 'WCF_Validator'
            AND DueDate != null
            ORDER BY DueDate ASC
        ]) {
            if (!validatorDueDateMap.containsKey(ar.ApplicationId)) {
                validatorDueDateMap.put(ar.ApplicationId, ar.DueDate);
            }
        }
	
		// ── Step 3b: Find app IDs that are PENDING flagged (reviewer hasn't acted yet) ──
Set<Id> pendingFlaggedAppIds = new Set<Id>();
for (ApplicationReview ar : [
    SELECT ApplicationId, Flag__c
    FROM ApplicationReview
    WHERE ApplicationId IN :underReviewIds
    AND RecordType.DeveloperName = 'WCF_Validator'
    AND Decision_Final_Decision_from_Sec_1_2__c = 'Flag'
    AND Status IN ('Sealed', 'Flagged')
]) {
    if (String.isBlank(ar.Flag__c)) {
        pendingFlaggedAppIds.add(ar.ApplicationId);
    }
}

        // ── Step 4: Build unreviewed list (Not Started + In Progress), compute effective due date ──
        List<Id> withDate = new List<Id>();
        List<Id> noDate   = new List<Id>();
        Map<Id, Date> effectiveDueDate = new Map<Id, Date>();
        // Track whether each app actually has a review record, and its status
        Map<Id, ApplicationReview> includedReview = new Map<Id, ApplicationReview>();

        for (IndividualApplication ia : apps) {
            ApplicationReview ar = reviewByAppId.get(ia.Id);

            // Exclude anything already reviewed/submitted
            if (ar != null && (ar.IsSubmitted || ar.Status == 'Review Submitted')) {
                continue;
            }
			
			  // ← ADD: Exclude apps pending flag decision — they sit in Flagged bucket, not queue
    if (pendingFlaggedAppIds.contains(ia.Id)) {
        continue;
    }

            includedReview.put(ia.Id, ar); // ar may be null → "Not Started", no review record yet

            Date d = (ar != null && ar.DueDate != null)
                        ? ar.DueDate
                        : validatorDueDateMap.get(ia.Id);

            if (d != null) {
                effectiveDueDate.put(ia.Id, d);
                withDate.add(ia.Id);
            } else {
                noDate.add(ia.Id);
            }
        }

        // ── Step 5: Sort by due date ascending (overdue/nearest first), nulls last ──
        for (Integer i = 0; i < withDate.size() - 1; i++) {
            for (Integer j = i + 1; j < withDate.size(); j++) {
                if (effectiveDueDate.get(withDate[i]) > effectiveDueDate.get(withDate[j])) {
                    Id tmp      = withDate[i];
                    withDate[i] = withDate[j];
                    withDate[j] = tmp;
                }
            }
        }

        List<Id> sortedIds = new List<Id>();
        sortedIds.addAll(withDate);
        sortedIds.addAll(noDate);

        // ── Step 6: Build result rows ──
        Map<Id, IndividualApplication> appById = new Map<Id, IndividualApplication>(apps);

        List<ReviewerPreviewItem> result = new List<ReviewerPreviewItem>();
        Integer count = 0;
        for (Id appId : sortedIds) {
            if (count >= maxRows) break;
            IndividualApplication ia = appById.get(appId);
            if (ia == null) continue;

            ApplicationReview ar = includedReview.get(appId); // may be null
            Date dueDate = (ar != null && ar.DueDate != null)
                                ? ar.DueDate
                                : validatorDueDateMap.get(appId);

ReviewerPreviewItem item = new ReviewerPreviewItem();

item.reviewId       = (ar != null) ? ar.Id : null;
item.appRecordId    = ia.Id;
item.appName        = ia.Name;
item.accountName    = ia.Account != null ? ia.Account.Name : null;
item.recordTypeName = ia.RecordType != null ? ia.RecordType.Name : null;

if (ia.Status == 'Reviewer Rejected') {
    item.status = 'Reviewer Rejected';
    item.isRejected = true;
} else {
    item.status = (ar != null) ? ar.Status : null;
    item.isRejected = false;
}

item.dueDate      = dueDate != null ? String.valueOf(dueDate) : null;
item.headquarters = ia.Headquarters_City_and_Country__c;
            result.add(item);
            count++;
        }
        return result;
    }   

    public class ReviewerPreviewItem {
        @AuraEnabled public String reviewId;
        @AuraEnabled public String appRecordId;
        @AuraEnabled public String appName;
        @AuraEnabled public String accountName;
        @AuraEnabled public String recordTypeName;
        @AuraEnabled public String status;
        @AuraEnabled public String dueDate;
        @AuraEnabled public String headquarters; // ADD THIS
         @AuraEnabled public Boolean isRejected;
    }
}