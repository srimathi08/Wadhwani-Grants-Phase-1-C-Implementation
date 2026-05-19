public without sharing class YetToStartApplicationsController {

    @AuraEnabled(cacheable=true)
    public static List<YetToStartWrapper> getYetToStartApplications() {

        Id currentUserId = UserInfo.getUserId();

        /* -----------------------------------------
           Step 1: Get Applications shared to reviewer
        ------------------------------------------ */
        Set<Id> applicationIds = new Set<Id>();

        for (IndividualApplicationShare sh : [
            SELECT ParentId
            FROM IndividualApplicationShare
            WHERE UserOrGroupId = :currentUserId
        ]) {
            applicationIds.add(sh.ParentId);
        }

        if (applicationIds.isEmpty()) {
            return new List<YetToStartWrapper>();
        }

        /* -----------------------------------------
           Step 2: Find applications ALREADY reviewed
        ------------------------------------------ */
        Set<Id> reviewedApplicationIds = new Set<Id>();

        for (ApplicationReview ar : [
            SELECT ApplicationId
            FROM ApplicationReview
            WHERE ReviewedById = :currentUserId
              AND ApplicationId IN :applicationIds
        ]) {
            reviewedApplicationIds.add(ar.ApplicationId);
        }

        /* -----------------------------------------
           Step 3: Fetch ONLY "Yet To Start" applications
        ------------------------------------------ */
        List<IndividualApplication> apps = [
            SELECT
                Id,
                Name,
                Project_Title__c,
                Primary_Focus_Area__c,
                Account.Name
            FROM IndividualApplication
            WHERE Id IN :applicationIds
              AND Id NOT IN :reviewedApplicationIds
            ORDER BY CreatedDate DESC
        ];

        /* -----------------------------------------
           Step 4: Wrap response
        ------------------------------------------ */
        List<YetToStartWrapper> result = new List<YetToStartWrapper>();

        for (IndividualApplication app : apps) {
            result.add(new YetToStartWrapper(
                app.Id,
                app.Name,
                app.Project_Title__c,
                app.Primary_Focus_Area__c,
                app.Account.Name != null ? app.Account.Name : ''
            ));
        }

        return result;
    }

    /* ============ Wrapper ============ */
    public class YetToStartWrapper {
        @AuraEnabled public Id applicationId;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String projectTitle;
        @AuraEnabled public String primaryFocusArea;
        @AuraEnabled public String coeName;

        public YetToStartWrapper(
            Id applicationId,
            String applicationName,
            String projectTitle,
            String primaryFocusArea,
            String coeName
        ) {
            this.applicationId = applicationId;
            this.applicationName = applicationName;
            this.projectTitle = projectTitle;
            this.primaryFocusArea = primaryFocusArea;
            this.coeName = coeName;
        }
    }
}