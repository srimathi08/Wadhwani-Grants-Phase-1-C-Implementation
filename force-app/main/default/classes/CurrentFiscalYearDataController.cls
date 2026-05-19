public with sharing class CurrentFiscalYearDataController {
    @AuraEnabled(cacheable=true)
    public static Current_fiscal_year_data__c getCurrentFiscalYearData(Id individualApplicationId) {
        return [
            SELECT Revenue_Budget__c, Revenue_Projection__c, Revenue_Variance__c, Revenue_Explanation__c,
                   Expense_Budget__c, Expense_Projection__c, Expense_Variance__c, Expense_Explanation__c,
                   Net_Budget__c, Net_Projection__c, Net_Variance__c, Net_Position_Explanation__c
            FROM Current_fiscal_year_data__c
            WHERE Proposal__c = :individualApplicationId
            LIMIT 1
        ];
    }
}