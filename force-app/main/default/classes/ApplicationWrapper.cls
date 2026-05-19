public class ApplicationWrapper {
    @AuraEnabled public IndividualApplication application;
    @AuraEnabled public List<Milestone__c> milestones;
    @AuraEnabled public List<Budget> budgets;
    @AuraEnabled public List<String> fileUrls;
}