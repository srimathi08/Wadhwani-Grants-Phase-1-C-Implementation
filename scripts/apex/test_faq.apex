List<Application_FAQ__c> faqs = wcfApplicationFaqController.getApplicationFaqs();
System.debug('TEST_FAQ_COUNT: ' + faqs.size());
for (Application_FAQ__c f : faqs) {
    System.debug('FAQ: ' + f.Sort_Order__c + ' - ' + f.Question__c);
}
