trigger ApplicationReviewTrigger on ApplicationReview (after insert, after update, after delete) {

    Set<Id> proposalIds = new Set<Id>();

    List<ApplicationReview> records = Trigger.isDelete ? Trigger.old : Trigger.new;

    for (ApplicationReview ar : records) {
        if (ar.ApplicationId != null) {
            proposalIds.add(ar.ApplicationId);
        }
    }

    for (Id pid : proposalIds) {
        ProposalPathController.syncUnderReviewStatus(pid);
    }
}