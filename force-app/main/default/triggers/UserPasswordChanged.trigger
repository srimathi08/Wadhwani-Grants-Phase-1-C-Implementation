trigger UserPasswordChanged on User (after update) {

    Set<Id> candidateIds = new Set<Id>();

    for (User u : Trigger.new) {
        User oldUser = Trigger.oldMap.get(u.Id);

        if (u.ContactId != null
            && u.LastPasswordChangeDate != null
            && u.LastPasswordChangeDate != oldUser.LastPasswordChangeDate) {
            candidateIds.add(u.Id);
        }
    }

    if (candidateIds.isEmpty()) {
        return;
    }

       Set<String> allowedProfiles = E39PasswordNotifier.ALLOWED_PROFILES;

    Set<Id> eligibleIds = new Set<Id>();

    for (User u : [
        SELECT Id
        FROM User
        WHERE Id IN :candidateIds
          AND IsActive = true
          AND Profile.Name IN :allowedProfiles
    ]) {
        eligibleIds.add(u.Id);
    }

    if (!eligibleIds.isEmpty()
        && Limits.getQueueableJobs() < Limits.getLimitQueueableJobs()) {
        System.enqueueJob(
            new E39PasswordNotifier(eligibleIds)
        );
    }
}