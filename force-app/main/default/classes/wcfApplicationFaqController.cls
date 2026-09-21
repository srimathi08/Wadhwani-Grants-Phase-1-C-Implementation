public without sharing class wcfApplicationFaqController {
    @AuraEnabled(cacheable=true)
    public static List<Application_FAQ__c> getApplicationFaqs() {
        return fetchFaqs();
    }

    @AuraEnabled
    public static List<Application_FAQ__c> getLatestApplicationFaqs() {
        return fetchFaqs();
    }

    @AuraEnabled(cacheable=true)
    public static List<Application_FAQ__c> getApplicationFaqsByCategory(String Category) {
        if (String.isBlank(Category)) {
            return fetchFaqs();
        }
        
        return [
            SELECT Id, Question__c, Description__c, Sort_Order__c, Category__c
            FROM Application_FAQ__c 
            WHERE Category__c = :Category
            ORDER BY Sort_Order__c ASC NULLS LAST, CreatedDate ASC
        ];
    }

    private static List<Application_FAQ__c> fetchFaqs() {
        return [
            SELECT Id, Question__c, Description__c, Sort_Order__c 
            FROM Application_FAQ__c 
            ORDER BY Sort_Order__c ASC NULLS LAST, CreatedDate ASC
        ];
    }
}