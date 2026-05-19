public with sharing class ReviewerStatusController {
    @AuraEnabled(cacheable=true)
    public static List<ReviewerInfo> getReviewersWithStatus(Id applicationId) {
        // Step 1: Fetch manually shared users
        List<IndividualApplicationShare> shares = [
            SELECT UserOrGroupId, AccessLevel, RowCause
            FROM IndividualApplicationShare
            WHERE ParentId = :applicationId AND RowCause = 'Manual'
        ];

        Set<Id> sharedUserIds = new Set<Id>();
        for (IndividualApplicationShare s : shares) {
            sharedUserIds.add(s.UserOrGroupId);
        }

        // Step 2: Fetch user details
        Map<Id, User> users = new Map<Id, User>([
            SELECT Id, Name, Email FROM User WHERE Id IN :sharedUserIds
        ]);

        // Step 3: Fetch ApplicationReview records for those users
        Map<Id, ApplicationReview> reviewMap = new Map<Id, ApplicationReview>();
        for (ApplicationReview ar : [
            SELECT Id, ReviewedById, Status, Total_Score__c
            FROM ApplicationReview
            WHERE ApplicationId = :applicationId AND ReviewedById IN :sharedUserIds
        ]) {        
            reviewMap.put(ar.ReviewedById, ar);
        }

        // Step 4: Combine into wrapper
        List<ReviewerInfo> output = new List<ReviewerInfo>();
        for (Id userId : sharedUserIds) {
            User u = users.get(userId);
            ApplicationReview review = reviewMap.get(userId);
            String status = review != null ? review.Status : 'Yet to Start';
            Decimal totalScore = review != null ? review.Total_Score__c : 0;

            output.add(new ReviewerInfo(u.Name, status, totalScore));
        }

        return output;
    }

    public class ReviewerInfo {
        @AuraEnabled public String name;
        @AuraEnabled public String status;
        @AuraEnabled public Decimal totalScore;

        public ReviewerInfo(String name, String status, Decimal totalScore) {
            this.name = name;
            this.status = status;
            this.totalScore = totalScore;
        }
    }
}