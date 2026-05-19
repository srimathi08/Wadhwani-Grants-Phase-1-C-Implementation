public class FundProjectWrapper {
    @AuraEnabled public Id applicationId;
    @AuraEnabled public String applicationName;
    @AuraEnabled public Decimal approvedAmount;
    @AuraEnabled public Decimal disbursedAmount;
    @AuraEnabled public Decimal availableAmount;
}