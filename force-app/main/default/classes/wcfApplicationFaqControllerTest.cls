@isTest
private class wcfApplicationFaqControllerTest {
    @isTest
    static void testGetApplicationFaqs() {
        Application_FAQ__c faq1 = new Application_FAQ__c(
            Question__c = 'Test Question 1',
            Description__c = '<p>Test Answer 1</p>',
            Sort_Order__c = 1
        );
        Application_FAQ__c faq2 = new Application_FAQ__c(
            Question__c = 'Test Question 2',
            Description__c = '<p>Test Answer 2</p>',
            Sort_Order__c = 2
        );
        insert new List<Application_FAQ__c>{ faq2, faq1 };

        Test.startTest();
        List<Application_FAQ__c> results = wcfApplicationFaqController.getApplicationFaqs();
        Test.stopTest();

        System.assertNotEquals(0, results.size(), 'Should return FAQ records');
        System.assertEquals('Test Question 1', results[0].Question__c, 'First record should be ordered by Sort_Order__c 1');
    }
}