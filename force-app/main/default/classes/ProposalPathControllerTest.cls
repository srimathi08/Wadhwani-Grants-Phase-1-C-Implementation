@IsTest private class ProposalPathControllerTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void readsAndSyncsPath() { Id id = [SELECT Id FROM IndividualApplication LIMIT 1].Id; System.assertNotEquals(null, ProposalPathController.getProposalStatus(id)); ProposalPathController.syncUnderReviewStatus(id); }
}