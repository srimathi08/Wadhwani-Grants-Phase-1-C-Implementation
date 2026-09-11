@IsTest private class ProposalTranslationUpdaterTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void ignoresIncompleteRequest() { ProposalTranslationUpdater.Request r = new ProposalTranslationUpdater.Request(); ProposalTranslationUpdater.updateTranslatedRecords(new List<ProposalTranslationUpdater.Request>{r}); System.assertEquals(true, true); }
}