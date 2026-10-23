public without sharing class WCFSuspensionService {

    public static final String SUSPENDED_STATUS = 'Onboarding Suspended';

    /** Called from the after-update trigger on IndividualApplication. */
    public static void handleStatusChanges(List<IndividualApplication> newList,
                                           Map<Id, IndividualApplication> oldMap) {
        Set<Id> toFreeze  = new Set<Id>();
        Set<Id> toRelease = new Set<Id>();

        for (IndividualApplication app : newList) {
            IndividualApplication oldApp = oldMap.get(app.Id);
            if (app.AccountId == null || app.Status == oldApp.Status) {
                continue;
            }
            if (app.Status == SUSPENDED_STATUS) {
                toFreeze.add(app.AccountId);
            } else if (oldApp.Status == SUSPENDED_STATUS) {
                toRelease.add(app.AccountId);
            }
        }

        toRelease.removeAll(toFreeze);

        if (!toFreeze.isEmpty() || !toRelease.isEmpty()) {
            System.enqueueJob(new SuspensionJob(toFreeze, toRelease));
        }
    }

    /** One-time helper for applications already suspended before this code existed.
     *  Run from Anonymous Apex: WCFSuspensionService.backfill(); */
    public static void backfill() {
        Set<Id> accountIds = new Set<Id>();
        for (IndividualApplication app : [
            SELECT AccountId
            FROM IndividualApplication
            WHERE Status = :SUSPENDED_STATUS AND AccountId != null
        ]) {
            accountIds.add(app.AccountId);
        }
        if (!accountIds.isEmpty()) {
            System.enqueueJob(new SuspensionJob(accountIds, new Set<Id>()));
        }
    }

    public class SuspensionJob implements Queueable {
        private Set<Id> freezeAccounts;
        private Set<Id> releaseAccounts;

        public SuspensionJob(Set<Id> freezeAccounts, Set<Id> releaseAccounts) {
            this.freezeAccounts  = freezeAccounts;
            this.releaseAccounts = releaseAccounts;
        }

        public void execute(QueueableContext ctx) {
            if (!freezeAccounts.isEmpty()) {
                setFrozen(freezeAccounts, true);
            }

            if (!releaseAccounts.isEmpty()) {
                // Only release accounts that have no other suspended application left
                Set<Id> stillSuspended = new Set<Id>();
                for (IndividualApplication app : [
                    SELECT AccountId
                    FROM IndividualApplication
                    WHERE AccountId IN :releaseAccounts
                      AND Status = :SUSPENDED_STATUS
                ]) {
                    stillSuspended.add(app.AccountId);
                }
                Set<Id> safeToRelease = new Set<Id>(releaseAccounts);
                safeToRelease.removeAll(stillSuspended);
                if (!safeToRelease.isEmpty()) {
                    setFrozen(safeToRelease, false);
                }
            }
        }

        private void setFrozen(Set<Id> accountIds, Boolean freeze) {
            Map<Id, User> partnerUsers = new Map<Id, User>([
                SELECT Id
                FROM User
                WHERE IsPortalEnabled = true
                  AND Contact.AccountId IN :accountIds
            ]);
            if (partnerUsers.isEmpty()) {
                return;
            }

            List<UserLogin> logins = [
                SELECT Id, IsFrozen
                FROM UserLogin
                WHERE UserId IN :partnerUsers.keySet()
                  AND IsFrozen != :freeze
            ];
            for (UserLogin ul : logins) {
                ul.IsFrozen = freeze;
            }
            if (!logins.isEmpty()) {
                update logins;
            }

            if (freeze) {
                // End sessions that are already open
                List<AuthSession> sessions = [
                    SELECT Id FROM AuthSession WHERE UsersId IN :partnerUsers.keySet()
                ];
                if (!sessions.isEmpty()) {
                    try {
                        delete sessions;
                    } catch (Exception e) {
                        System.debug(LoggingLevel.ERROR, 'AuthSession revoke failed: ' + e.getMessage());
                    }
                }
            }
        }
    }
}