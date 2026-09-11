public without sharing class ValidatorApplicationController {
    @AuraEnabled(cacheable=true)
    public static List<ApplicationReview> getApplicationsByStatus(String status) {
        return [
            SELECT Id, Name, ApplicationId,Status
            FROM ApplicationReview
            WHERE Status = :status
            WITH SYSTEM_MODE
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }
}