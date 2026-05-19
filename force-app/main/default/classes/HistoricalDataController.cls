public with sharing class HistoricalDataController {
    @AuraEnabled(cacheable=true)
    public static Historical_Data__c getHistoricalData(Id individualApplicationId) {
        return [
            SELECT CY1_Balance_Start_CFY_1__c, CY1_Revenue__c, CY1_Expense__c, CY1_Balance_End__c,
                   CY2_Balance_Start_CFY_2__c, CY2_Revenue__c, CY2_Expense__c, CY2_Balance_End__c,
                   CY3_Balance_Start_CFY_3__c, CY3_Revenue__c, CY3_Expense__c, CY3_Balance_End__c
            FROM Historical_Data__c
            WHERE Proposal__c = :individualApplicationId
            LIMIT 1
        ];
    }
}