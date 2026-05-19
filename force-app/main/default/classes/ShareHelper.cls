/**
 * ShareHelper
 * Runs without sharing so that share record inserts
 * succeed regardless of the calling user's record access.
 * This is intentional and safe — only called from
 * CoeProposalReviewController after all validation checks
 * have already passed.
 */
public without sharing class ShareHelper {

    public static void insertPIShare(Id proposalId, Id piUserId) {

        // Check for ANY existing share regardless of RowCause.
        // If PI already has access via Owner (they own the record)
        // or Manual (already shared), inserting again will throw
        // INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY.
        // In both cases the PI already has access so we skip insert.
        // The COE_PI_Share_Log__c record is still inserted by the
        // caller so the PI portal will display the proposal correctly.
        List<IndividualApplicationShare> existing = [
            SELECT Id, RowCause
            FROM   IndividualApplicationShare
            WHERE  ParentId      = :proposalId
            AND    UserOrGroupId = :piUserId
            LIMIT  1
        ];

        if (!existing.isEmpty()) {
            return;
        }

        IndividualApplicationShare shareRec =
            new IndividualApplicationShare();

        shareRec.ParentId      = proposalId;
        shareRec.UserOrGroupId = piUserId;
        shareRec.AccessLevel   = 'Read';
        shareRec.RowCause      =
            Schema.IndividualApplicationShare.RowCause.Manual;

        insert shareRec;
    }
}