public with sharing class FundingAwardTriggerHandler {

    public static void afterInsert(List<FundingAward> newList) {

        System.debug('=== FundingAwardTriggerHandler.afterInsert START ===');
        System.debug('Incoming Funding Award Records: ' + JSON.serialize(newList));

        // Collect Proposal IDs
        Set<Id> proposalIds = new Set<Id>();
        for (FundingAward fa : newList) {
            System.debug('Processing Funding Award ID: ' + fa.Id + 
                         ', Related Proposal (IndividualApplicationId): ' + fa.IndividualApplicationId);

            if (fa.IndividualApplicationId != null) {
                proposalIds.add(fa.IndividualApplicationId);
            } else {
                System.debug('No Proposal ID found on Funding Award: ' + fa.Id);
            }
        }

        System.debug('Collected Proposal IDs: ' + proposalIds);

        if (proposalIds.isEmpty()) {
            System.debug('No proposals found. Exiting trigger.');
            return;
        }

        // Retrieve related Proposal + COE user field
        Map<Id, IndividualApplication> relatedProposals =
            new Map<Id, IndividualApplication>(
                [SELECT Id, COE_Approver__c  
                 FROM IndividualApplication
                 WHERE Id IN :proposalIds]
            );

        System.debug('Fetched Proposal Records: ' + JSON.serialize(relatedProposals));

        // Run sharing logic
        for (FundingAward fa : newList) {
            IndividualApplication proposal = relatedProposals.get(fa.IndividualApplicationId);

            System.debug('Processing sharing for Funding Award: ' + fa.Id);
            System.debug('Proposal found: ' + proposal);

            if (proposal != null) {
                System.debug('Proposal ID: ' + proposal.Id +
                             ', COE User: ' + proposal.COE_Approver__c);
            }

            if (proposal != null && proposal.COE_Approver__c != null) {

                System.debug('Calling ProposalSharingService.shareProposalWithUser for Proposal: ' +
                             proposal.Id + ' and COE User: ' + proposal.COE_Approver__c);

                ProposalSharingService.shareProposalWithUser(
                    proposal.Id,
                    proposal.COE_Approver__c
                );

                System.debug('Sharing Completed for Proposal: ' + proposal.Id);
            } 
            else {
                System.debug('Skipping Sharing. Either proposal is null or COE_Approver__c is null for Funding Award: '
                             + fa.Id);
            }
        }

        System.debug('=== FundingAwardTriggerHandler.afterInsert END ===');
    }
}