public without sharing class E39PasswordNotifierScheduler
    implements Schedulable {

        private static final Set<String> ALLOWED_PROFILES =
        E39PasswordNotifier.ALLOWED_PROFILES;

    public void execute(SchedulableContext sc) {
        Datetime since = Datetime.now().addDays(-1);
        Set<Id> userIds = new Set<Id>();

        for (User u : [
            SELECT Id, LastPasswordChangeDate,
                   Pwd_Notified_Through__c
            FROM User
            WHERE ContactId != null
              AND IsActive = true
              AND Profile.Name IN :ALLOWED_PROFILES
              AND LastPasswordChangeDate >= :since
            ORDER BY LastPasswordChangeDate DESC
            LIMIT 100
        ]) {
            if (u.Pwd_Notified_Through__c == null ||
                u.LastPasswordChangeDate >
                    u.Pwd_Notified_Through__c) {
                userIds.add(u.Id);
            }
        }

        if (!userIds.isEmpty()) {
            System.enqueueJob(
                new E39PasswordNotifier(userIds)
            );
        }
    }
}