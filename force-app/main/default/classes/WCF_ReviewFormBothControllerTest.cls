@IsTest private class WCF_ReviewFormBothControllerTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void readsReviewForm() { Id id = [SELECT Id FROM IndividualApplication LIMIT 1].Id; System.assertEquals(String.valueOf(id), WCF_ReviewFormBothController.getIndividualApplication(id).recordId); System.assertNotEquals(null, WCF_ReviewFormBothController.getDraftReviewRecord(id)); System.assertNotEquals(null, WCF_ReviewFormBothController.hasAlreadyReviewed(String.valueOf(id))); }
}