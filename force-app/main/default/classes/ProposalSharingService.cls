public with sharing class ProposalSharingService {

    // THIS is the method your trigger will call
    public static void shareProposalWithUser(Id proposalId, Id userId) {

        if (proposalId == null || userId == null) return;

        IndividualApplicationShare shareRecord = new IndividualApplicationShare();
        shareRecord.ParentId = proposalId;
        shareRecord.UserOrGroupId = userId;
        shareRecord.AccessLevel = 'Read';
        shareRecord.RowCause = Schema.IndividualApplicationShare.RowCause.Manual;

        insert shareRecord;
    }
}