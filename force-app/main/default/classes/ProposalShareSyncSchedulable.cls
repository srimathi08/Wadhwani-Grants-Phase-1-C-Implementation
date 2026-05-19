/**
 * Schedulable class to sync Proposals__Share counts to Account.
 * Schedule this to run every 15-30 minutes as a replacement for
 * the daily scheduled flow — Share objects don't support triggers.
 *
 * To schedule every 15 minutes, run this in Anonymous Apex:
 *   ProposalShareSyncSchedulable.scheduleAll();
 */
public class ProposalShareSyncSchedulable implements Schedulable {

    public void execute(SchedulableContext sc) {
        // Get all active reviewer Account IDs
        Set<Id> accountIds = new Set<Id>();
        for (Account acc : [
            SELECT Id
            FROM Account
            WHERE Reviewer__c = TRUE
              AND Reviewer_Registered__c = TRUE
        ]) {
            accountIds.add(acc.Id);
        }

        if (!accountIds.isEmpty()) {
            ReviewerStatsHelper.recalculateStats(accountIds);
        }
    }

    /**
     * Call this once from Anonymous Apex to set up 15-minute polling.
     * Salesforce allows max 100 scheduled jobs.
     */
    public static void scheduleAll() {
        // Schedule 4 jobs at 0, 15, 30, 45 minutes past each hour
        String[] minutes = new String[]{'0', '15', '30', '45'};
        for (String min : minutes) {
            String jobName = 'ProposalShareSync_' + min;
            String cron = '0 ' + min + ' * * * ?';
            // Abort existing job with same name if re-running
            for (CronTrigger ct : [
                SELECT Id FROM CronTrigger WHERE CronJobDetail.Name = :jobName
            ]) {
                System.abortJob(ct.Id);
            }
            System.schedule(jobName, cron, new ProposalShareSyncSchedulable());
        }
    }
}