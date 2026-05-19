public class TranslatedCurrentFiscalDataController {
 @AuraEnabled(cacheable=true)
    public static Translated_Current_Fiscal_Year_Data__c getCurrentFiscalYearData(Id translatedProposalId) {
        return [
            SELECT Revenue_Budget__c, Revenue_Projection__c, Revenue_Explanation__c, Expense_Variance__c,
            Expense_Budget__c, Expense_Projection__c, Expense_Explanation__c,Revenue_Variance__c,
            Net_Budget__c, Net_Projection__c, Net_Variance__c, Net_Position_Explanation__c
            FROM Translated_Current_Fiscal_Year_Data__c WHERE Translated_Proposal__c = :translatedProposalId
            LIMIT 1
        ];
    }
}