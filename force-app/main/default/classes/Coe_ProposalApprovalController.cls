public with sharing class Coe_ProposalApprovalController {

    /* ============================================================
       GET STATUS
    ============================================================ */
    @AuraEnabled(cacheable=true)
    public static IndividualApplication getProposalStatus(Id recordId) {
        if (recordId == null) {
            throw new AuraHandledException('Record Id cannot be null.');
        }

        try {
            return [
                SELECT Status, Asked_for_Resubmission_by_WIN_Admin__c
                FROM IndividualApplication
                WHERE Id = :recordId
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching status: ' + e.getMessage());
        }
    }

    /* ============================================================
       MAIN ENTRY METHOD → QUEUEABLE
    ============================================================ */
    @AuraEnabled
    public static void updateProposal(
        Id recordId,
        String actionType,
        String comments,
        Date dueDate
    ) {
        if (recordId == null || String.isBlank(actionType)) {
            throw new AuraHandledException('Invalid input parameters.');
        }
        System.enqueueJob(
            new ProposalActionProcessor(recordId, actionType, comments, dueDate)
        );
    }

    /* ============================================================
       QUEUEABLE CLASS
    ============================================================ */
    public class ProposalActionProcessor implements Queueable {

        private Id recordId;
        private String actionType;
        private String comments;
        private Date dueDate;

        public ProposalActionProcessor(Id recId, String act, String comm, Date due) {
            this.recordId = recId;
            this.actionType = act;
            this.comments = comm;
            this.dueDate = due;
        }

        public void execute(QueueableContext qc) {
            doUpdate(recordId, actionType, comments, dueDate);
        }

        /* ============================================================
           MAIN UPDATE LOGIC
        ============================================================ */
        private void doUpdate(
            Id recordId,
            String actionType,
            String comments,
            Date dueDate
        ) {

            IndividualApplication proposal = [
                SELECT Id, Name, Status,
                       PI_Email__c, PI_User_Email__c,
                       COE_Approval_Comments__c, WIN_Approval_Comments__c,
                       Approved_by_COE_on__c, Rejected_by_COE_on__c,
                       Asked_for_Resubmission_by_COE_on__c,
                       Asked_for_Resubmission_by_WIN_Admin__c,
                       Application_Asked_for_Rsubmission__c
                FROM IndividualApplication
                WHERE Id = :recordId
                LIMIT 1
            ];

            String newStatus;
            String historyStatus;
            String historyNamePrefix;
            Boolean unlockRecord = false;
            Boolean lockRecord = false;
            Date todayDate = Date.today();

            /* ============================================================
               APPROVE
            ============================================================ */
            if (actionType == 'Approve') {

                /*
                 * RULE:
                 * - Only WIN resubmission → "Resubmitted to WIN"
                 * - COE resubmission (after PI submit) → "Submitted to WIN"
                 */

                if (proposal.Asked_for_Resubmission_by_WIN_Admin__c == true) {

                    // WIN Admin asked → send back as resubmission
                    newStatus = 'Proposal Resubmitted to WIN Admin';
                    historyStatus = 'Resubmit';
                    historyNamePrefix = 'Resubmitted to WIN Admin by ';
                    unlockRecord = true;

                    proposal.Approved_by_COE_on__c = null;
                    proposal.Rejected_by_COE_on__c = null;

                } else {

                    // COE approval after PI correction OR normal approval
                    newStatus = 'Proposal submitted to WIN Admin';
                    historyStatus = 'Approved';
                    historyNamePrefix = 'Submitted to WIN Admin by ';
                    lockRecord = true;

                    proposal.Approved_by_COE_on__c = todayDate;
                    proposal.Rejected_by_COE_on__c = null;
                }

                // Clear all resubmission flags
                proposal.Application_Asked_for_Rsubmission__c = false;
                proposal.Asked_for_Resubmission_by_COE_on__c = null;
            }

            /* ============================================================
               REJECT
            ============================================================ */
            else if (actionType == 'Reject') {

                newStatus = 'Proposal Rejected by COE Admin';
                historyStatus = 'Rejected';
                historyNamePrefix = 'Rejected by ';
                lockRecord = true;

                proposal.Rejected_by_COE_on__c = todayDate;
                proposal.Approved_by_COE_on__c = null;
                proposal.Application_Asked_for_Rsubmission__c = false;
                proposal.Asked_for_Resubmission_by_COE_on__c = null;
            }

            /* ============================================================
               RESUBMIT (COE → PI)
            ============================================================ */
            else if (actionType == 'Resubmit') {

                newStatus = 'Asked for Resubmission by COE Admin';
                historyStatus = 'Resubmit';
                historyNamePrefix = 'Asked for Revision by ';
                unlockRecord = true;

                proposal.Asked_for_Resubmission_by_COE_on__c = todayDate;
                proposal.Application_Asked_for_Rsubmission__c = true;
                proposal.Approved_by_COE_on__c = null;
                proposal.Rejected_by_COE_on__c = null;
            }

            else {
                throw new AuraHandledException('Invalid action type.');
            }

            /* ============================================================
               UNLOCK BEFORE UPDATE
            ============================================================ */
            if (unlockRecord) {
                try {
                    Approval.unlock(recordId);
                } catch (Exception e) {
                    System.debug('Initial unlock error: ' + e.getMessage());
                }
            }

            /* ============================================================
               UPDATE PROPOSAL
            ============================================================ */
            proposal.Status = newStatus;
            proposal.COE_Approval_Comments__c = comments;
            update proposal;

            /* ============================================================
               INSERT APPROVAL HISTORY
            ============================================================ */
            insert new Approval_History__c(
                Name = historyNamePrefix + UserInfo.getName(),
                Status__c = historyStatus,
                Assigned_To__c = UserInfo.getUserId(),
                Proposal__c = proposal.Id,
                Comments__c = comments
            );

            /* ============================================================
               UNLOCK AFTER DML (SAFETY)
            ============================================================ */
            if (unlockRecord) {
                try {
                    Approval.unlock(recordId);
                } catch (Exception e) {
                    System.debug('Post-DML unlock error: ' + e.getMessage());
                }
            }

            /* ============================================================
               FINAL LOCK (APPROVE / REJECT ONLY)
            ============================================================ */
            if (lockRecord) {
                try {
                    Approval.lock(recordId);
                } catch (Exception e) {
                    System.debug('Lock error: ' + e.getMessage());
                }
            }
        }
    }
}