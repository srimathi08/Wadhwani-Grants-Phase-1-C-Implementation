trigger ProposalReviewTrigger on ApplicationReview (
    after insert, after update, after delete, after undelete
) {
    Set<Id> accountIds = new Set<Id>();
    List<ApplicationReview> records = Trigger.isDelete ? Trigger.old : Trigger.new;

    for (ApplicationReview ar : records) {
        if (ar.Reviewer__c != null) {
            accountIds.add(ar.Reviewer__c);
        }
    }

    if (Trigger.isUpdate) {
        for (ApplicationReview ar : Trigger.old) {
            if (ar.Reviewer__c != null) {
                accountIds.add(ar.Reviewer__c);
            }
        }
    }

    if (!accountIds.isEmpty()) {
        ReviewerStatsHelper.recalculateStats(accountIds);
    }
}