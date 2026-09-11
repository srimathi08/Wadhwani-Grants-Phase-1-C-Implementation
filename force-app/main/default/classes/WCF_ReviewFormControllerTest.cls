@IsTest private class WCF_ReviewFormControllerTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void readsReviewForm() { Id id = [SELECT Id FROM IndividualApplication LIMIT 1].Id; System.assertEquals(String.valueOf(id), WCF_ReviewFormController.getIndividualApplication(id).recordId); System.assertNotEquals(null, WCF_ReviewFormController.getDraftReviewRecord(id)); System.assertNotEquals(null, WCF_ReviewFormController.hasAlreadyReviewed(String.valueOf(id))); }
}