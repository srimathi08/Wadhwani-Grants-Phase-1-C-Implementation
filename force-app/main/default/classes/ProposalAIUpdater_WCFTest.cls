@IsTest private class ProposalAIUpdater_WCFTest {
    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }
    @IsTest static void updatesAiFields() {
        Id appId = [SELECT Id FROM IndividualApplication LIMIT 1].Id;
        ProposalAIUpdater_WCF.Request r = new ProposalAIUpdater_WCF.Request(); r.proposalId = appId;
        r.aiJson = '{"legalStructure":{"rating":"Strong","strengths":"Good","weaknesses":"None","summary":"Summary"},"jobCreationApproach":{"rating":"Strong","strengths":"Good","weaknesses":"None","summary":"Summary"}}';
        ProposalAIUpdater_WCF.updateProposal(new List<ProposalAIUpdater_WCF.Request>{r});
        System.assertEquals('Strong', [SELECT Legal_Rating__c FROM IndividualApplication WHERE Id = :appId].Legal_Rating__c);
    }

    @IsTest static void updatesEveryAiAssessmentSection() {
        Id appId = [SELECT Id FROM IndividualApplication LIMIT 1].Id;
        ProposalAIUpdater_WCF.Request request = new ProposalAIUpdater_WCF.Request();
        request.proposalId = appId;
        request.aiJson = '{"organizationalSustainability":{"rating":"High","strengths":"Stable","weaknesses":"None","summary":"Organisation summary"},"useOfFunds":{"rating":"High","strengths":"Focused","weaknesses":"None","summary":"Funds summary"},"operationalSynergies":{"rating":"High","strengths":"Aligned","weaknesses":"None","summary":"Synergy summary"}}';
        request.aiJson2 = '{"SkillingApproach":{"rating":"High","strengths":"Practical","weaknesses":"None","summary":"Skills summary"},"jobCreationApproach":{"rating":"High","strengths":"Scalable","weaknesses":"None","summary":"Jobs summary"}}';

        Test.startTest();
        ProposalAIUpdater_WCF.updateProposal(new List<ProposalAIUpdater_WCF.Request>{ request });
        ProposalAIUpdater_WCF.Request blank = new ProposalAIUpdater_WCF.Request();
        blank.proposalId = appId;
        blank.aiJson = ' '; // Covers the intentionally ignored request path.
        ProposalAIUpdater_WCF.updateProposal(new List<ProposalAIUpdater_WCF.Request>{ blank });
        Test.stopTest();

        IndividualApplication actual = [
            SELECT Organizational_Stability_Rating__c, Use_of_Funds_Rating__c,
                   Operational_Synergies_Rating__c, Skilling_Approach_Rating__c,
                   Job_Creation_Rating__c
            FROM IndividualApplication WHERE Id = :appId
        ];
        System.assertEquals('High', actual.Organizational_Stability_Rating__c);
        System.assertEquals('High', actual.Use_of_Funds_Rating__c);
        System.assertEquals('High', actual.Operational_Synergies_Rating__c);
        System.assertEquals('High', actual.Skilling_Approach_Rating__c);
        System.assertEquals('High', actual.Job_Creation_Rating__c);
    }
}