global without sharing class WINReviewerUserResult {
      @AuraEnabled
    @InvocableVariable
    public Id accountId;
 @AuraEnabled
    @InvocableVariable
    public Id userId;
 @AuraEnabled
    @InvocableVariable
    public String status;
 @AuraEnabled
    @InvocableVariable
    public String message;

    public WINReviewerUserResult() {}
}