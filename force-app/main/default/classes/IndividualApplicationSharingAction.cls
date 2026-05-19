public class IndividualApplicationSharingAction {

    // Define input structure for Flow
    public class ShareRequest {
        @InvocableVariable(label='Application Id' required=true)
        public Id applicationId;

        @InvocableVariable(label='Reviewer User Id' required=true)
        public Id reviewerUserId;

        @InvocableVariable(label='Access Level' required=false)
        public String accessLevel = 'Read'; // Default to Read
    }

    @InvocableMethod(
        label='Share IndividualApplication with Reviewer'
        description='Shares IndividualApplication record with a reviewer (user) at specified access level'
    )
    public static void shareApplicationsWithReviewers(List<ShareRequest> requests) {
        List<IndividualApplicationShare> sharesToInsert = new List<IndividualApplicationShare>();
        for (ShareRequest req : requests) {
            IndividualApplicationShare shareRec = new IndividualApplicationShare();
            shareRec.ParentId = req.applicationId;
            shareRec.UserOrGroupId = req.reviewerUserId;
            shareRec.AccessLevel = req.accessLevel != null ? req.accessLevel : 'Read';
            shareRec.RowCause = Schema.IndividualApplicationShare.RowCause.Manual;
            sharesToInsert.add(shareRec);
        }
        if (!sharesToInsert.isEmpty()) {
            Database.insert(sharesToInsert, false);
        }
    }
}