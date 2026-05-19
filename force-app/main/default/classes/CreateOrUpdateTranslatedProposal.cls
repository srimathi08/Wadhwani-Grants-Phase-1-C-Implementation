public without sharing class CreateOrUpdateTranslatedProposal {

    public class Input {
        @InvocableVariable(required=true)
        public Id proposalId;

        @InvocableVariable(required=true)
        public String targetLanguage;

        // Optional: pass System Admin UserId as input, or hardcode below
        @InvocableVariable
        public Id systemAdminUserId;
    }

    public class Output {
        @InvocableVariable
        public Id translatedProposalId;
        @InvocableVariable
        public Boolean wasUpdated;
    }

    @InvocableMethod(label='Create or Update Translated Proposal')
    public static List<Output> createOrUpdate(List<Input> requests) {
        List<Output> results = new List<Output>();
        for (Input req : requests) {
            Output result = new Output();

            // Try to find existing record for Proposal + Language
            List<Translated_Proposal__c> existingList = [
                SELECT Id, Status__c, isTrigger__c FROM Translated_Proposal__c
                WHERE Proposal__c = :req.proposalId
                  AND Translated_Language__c = :req.targetLanguage
                LIMIT 1
            ];

            if (!existingList.isEmpty()) {
                // UPDATE: Set isTrigger__c = true
                Translated_Proposal__c existing = existingList[0];
                existing.isTrigger__c = true;
                update existing;
                result.translatedProposalId = existing.Id;
                result.wasUpdated = true;
            } else {
                // CREATE: New Translated Proposal, owner = System Admin
                Translated_Proposal__c tProposal = new Translated_Proposal__c();
                tProposal.Proposal__c = req.proposalId;
                tProposal.Translated_Language__c = req.targetLanguage;
                tProposal.Status__c = 'Not Translated';
                tProposal.isTrigger__c = true;
                tProposal.OwnerId = req.systemAdminUserId;
                insert tProposal;
                result.translatedProposalId = tProposal.Id;
                result.wasUpdated = false;
            }
            results.add(result);
        }
        return results;
    }
}