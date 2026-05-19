public without sharing class InProgressReviewsController {

    @AuraEnabled(cacheable=true)
    public static List<InProgressWrapper> getInProgressReviews() {
        return getInProgressReviewsInternal(UserInfo.getUserId());
    }

    @TestVisible
    static List<InProgressWrapper> getInProgressReviewsInternal(Id reviewerId) {

        /* ------------------------------------
           1. Applications assigned to reviewer
           (same root logic as Yet-To-Start)
        ------------------------------------ */
        Set<Id> assignedAppIds = new Set<Id>();

        List<IndividualApplicationShare> shares = [
            SELECT ParentId
            FROM IndividualApplicationShare
            WHERE UserOrGroupId = :reviewerId
        ];

        for (IndividualApplicationShare sh : shares) {
            assignedAppIds.add(sh.ParentId);
        }

        /* ------------------------------------
           2. Draft reviews by reviewer
           (filter only)
        ------------------------------------ */
        Map<Id, ApplicationReview> reviewByApp = new Map<Id, ApplicationReview>();
        Set<Id> draftReviewAppIds = new Set<Id>();

        for (ApplicationReview ar : [
            SELECT Id, ApplicationId, Status
            FROM ApplicationReview
            WHERE ReviewedById = :reviewerId
              AND Status = 'Draft'
        ]) {
            draftReviewAppIds.add(ar.ApplicationId);
            reviewByApp.put(ar.ApplicationId, ar);
        }

        if (draftReviewAppIds.isEmpty()) {
            return new List<InProgressWrapper>();
        }

        /* ------------------------------------
           3. Resolve final applications
           (share-aware + test-safe)
        ------------------------------------ */
        if (assignedAppIds.isEmpty()) {
            // OWD = Edit / Test fallback
            assignedAppIds.addAll(draftReviewAppIds);
        } else {
            assignedAppIds.retainAll(draftReviewAppIds);
        }

        if (assignedAppIds.isEmpty()) {
            return new List<InProgressWrapper>();
        }

        /* ------------------------------------
           4. Fetch applications (COE restored)
        ------------------------------------ */
        List<IndividualApplication> apps = [
            SELECT Id,
                   Name,
                   Project_Title__c,
                   Primary_Focus_Area__c,
                   Account.Name
            FROM IndividualApplication
            WHERE Id IN :assignedAppIds
        ];

        /* ------------------------------------
           5. Build response
        ------------------------------------ */
        List<InProgressWrapper> result = new List<InProgressWrapper>();

        for (IndividualApplication app : apps) {
            ApplicationReview ar = reviewByApp.get(app.Id);
            if (ar == null) continue;

            result.add(new InProgressWrapper(
                ar.Id,
                app.Id,
                app.Name,
                app.Project_Title__c,
                app.Primary_Focus_Area__c,
                app.Account != null ? app.Account.Name : '',
                ar.Status
            ));
        }

        return result;
    }

    /* ========== Wrapper ========== */
    public class InProgressWrapper {
        @AuraEnabled public Id reviewId;
        @AuraEnabled public Id applicationId;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String projectTitle;
        @AuraEnabled public String primaryFocusArea;
        @AuraEnabled public String coeName;
        @AuraEnabled public String status;

        public InProgressWrapper(
            Id reviewId,
            Id applicationId,
            String applicationName,
            String projectTitle,
            String primaryFocusArea,
            String coeName,
            String status
        ) {
            this.reviewId = reviewId;
            this.applicationId = applicationId;
            this.applicationName = applicationName;
            this.projectTitle = projectTitle;
            this.primaryFocusArea = primaryFocusArea;
            this.coeName = coeName;
            this.status = status;
        }
    }
}