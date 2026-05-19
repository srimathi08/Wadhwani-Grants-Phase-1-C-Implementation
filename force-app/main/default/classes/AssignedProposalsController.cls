public with sharing class AssignedProposalsController {

    /* =====================================================
       WRAPPER CLASS (FOR LWC TABLE)
       ===================================================== */
    public class AssignedApplicationRow {
        @AuraEnabled public Id applicationId;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String projectTitle;
        @AuraEnabled public String primaryFocusArea;
        @AuraEnabled public String coeName;

        @AuraEnabled public String reviewerAction;   // Pending | Accepted | Rejected
        @AuraEnabled public Boolean isActionDisabled;
    }

    /* =====================================================
       FETCH ASSIGNED APPLICATIONS (YET TO START)
       - Used by LWC table
       ===================================================== */
    @AuraEnabled(cacheable=true)
    public static List<AssignedApplicationRow> getTotalAssignedApplications() {

        Id currentUserId = UserInfo.getUserId();
        Set<Id> assignedAppIds = new Set<Id>();

        // 1️⃣ Applications owned by logged-in user
        for (IndividualApplication ia : [
            SELECT Id
            FROM IndividualApplication
            WHERE OwnerId = :currentUserId
        ]) {
            assignedAppIds.add(ia.Id);
        }

        // 2️⃣ Applications shared with logged-in user
        for (IndividualApplicationShare shareRec : [
            SELECT ParentId
            FROM IndividualApplicationShare
            WHERE UserOrGroupId = :currentUserId
        ]) {
            assignedAppIds.add(shareRec.ParentId);
        }

        // 3️⃣ No records
        if (assignedAppIds.isEmpty()) {
            return new List<AssignedApplicationRow>();
        }

        // 4️⃣ Fetch applications
        Map<Id, IndividualApplication> appMap =
            new Map<Id, IndividualApplication>([
                SELECT
                    Id,
                    Name,
                    Project_Title__c,
                    Primary_Focus_Area__c,
                    Account.Name
                FROM IndividualApplication
                WHERE Id IN :assignedAppIds
                ORDER BY CreatedDate DESC
            ]);

        // 5️⃣ Fetch ApplicationReview records for current reviewer
        Map<Id, ApplicationReview> reviewMap = new Map<Id, ApplicationReview>();
        for (ApplicationReview ar : [
            SELECT ApplicationId, Status
            FROM ApplicationReview
            WHERE ApplicationId IN :assignedAppIds
            AND ReviewedById = :currentUserId
        ]) {
            reviewMap.put(ar.ApplicationId, ar);
        }

        // 6️⃣ Build wrapper response
        List<AssignedApplicationRow> result = new List<AssignedApplicationRow>();

        for (IndividualApplication ia : appMap.values()) {

            AssignedApplicationRow row = new AssignedApplicationRow();
            row.applicationId = ia.Id;
            row.applicationName = ia.Name;
            row.projectTitle = ia.Project_Title__c;
            row.primaryFocusArea = ia.Primary_Focus_Area__c;
            row.coeName = ia.Account != null ? ia.Account.Name : '';

            if (reviewMap.containsKey(ia.Id)) {
                ApplicationReview review = reviewMap.get(ia.Id);

                if (review.Status == 'Reviewer Rejected') {
                    row.reviewerAction = 'Rejected';
                } else {
                    row.reviewerAction = 'Accepted';
                }

                row.isActionDisabled = true;
            } else {
                row.reviewerAction = 'Pending';
                row.isActionDisabled = false;
            }

            result.add(row);
        }

        return result;
    }

    /* =====================================================
       REJECT PROPOSAL
       - Creates ApplicationReview record
       - Sets correct Record Type
       ===================================================== */
    @AuraEnabled
    public static void rejectProposal(
        Id applicationId,
        String reviewerComment
    ) {
        if (applicationId == null || String.isBlank(reviewerComment)) {
            throw new AuraHandledException('Application and comment are required.');
        }

        // 🔥 Get Record Type: Project Proposal Review
        Id reviewRtId = Schema.SObjectType.ApplicationReview
            .getRecordTypeInfosByName()
            .get('Project Proposal Review')
            .getRecordTypeId();

        ApplicationReview review = new ApplicationReview();
        review.RecordTypeId = reviewRtId;     // ✅ REQUIRED
        review.ApplicationId = applicationId;
        review.Status = 'Reviewer Rejected';
        review.Comment = reviewerComment;
        review.ReviewedById = UserInfo.getUserId();
        review.EndDate = Date.today();

        insert review;
    }
}