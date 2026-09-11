@IsTest private class ProposalDataCollectorTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void buildsProposalPayload() {
        ProposalDataCollector.Request r = new ProposalDataCollector.Request(); r.proposalId = [SELECT Id FROM IndividualApplication LIMIT 1].Id;
        List<ProposalDataCollector.Response> result = ProposalDataCollector.buildProposalJson(new List<ProposalDataCollector.Request>{r});
        System.assertEquals(1, result.size()); System.assert(String.isNotBlank(result[0].jsonPayload));
    }
}