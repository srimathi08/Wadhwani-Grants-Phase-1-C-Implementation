public with sharing class WinProposalApprovalController {

    @AuraEnabled(cacheable=true)
    public static String getProposalStatus(Id recordId) {
        if (recordId == null) {
            throw new AuraHandledException('Record Id cannot be null.');
        }
        return [
            SELECT Status
            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ].Status;
    }

    @AuraEnabled
    public static void updateProposal(Id recordId, String actionType, String comments, Date dueDate) {
        if (recordId == null || String.isBlank(actionType)) {
            throw new AuraHandledException('Invalid input parameters.');
        }

        System.enqueueJob(new ProposalActionProcessor(recordId, actionType, comments, dueDate));
    }

    public class ProposalActionProcessor implements Queueable {

        Id recordId;
        String actionType;
        String comments;
        Date dueDate;

        public ProposalActionProcessor(Id recId, String act, String comm, Date due) {
            this.recordId = recId;
            this.actionType = act;
            this.comments = comm;
            this.dueDate = due;
        }

        public void execute(QueueableContext qc) {
            doUpdate(recordId, actionType, comments, dueDate);
        }

        private void doUpdate(Id recordId, String actionType, String comments, Date dueDate) {

            // ✅ FINAL: Added WIN_Approval_Comments__c back
            IndividualApplication proposal = [
                SELECT Id, Status, Coe_Approver__c,
                       WIN_Approval_Comments__c,
                       WIN_Approved_Comments__c,
                       Asked_for_Resubmission_by_WIN_Admin__c,
                       Due_Date_for_Resubmission_WIN__c
                FROM IndividualApplication
                WHERE Id = :recordId
                LIMIT 1
            ];

            String statusToSet;
            String historyStatus;
            String historyNamePrefix;
            Boolean unlockRecord = false;
            Boolean lockRecord = false;

            // ----------------------------------------
            // WIN Admin decision logic
            // ----------------------------------------
            if (actionType == 'Approve') {
                statusToSet = 'Proposal Approved by WIN Admin';
                historyStatus = 'Approved';
                historyNamePrefix = 'Approved by ';
                lockRecord = true;

                proposal.WIN_Approved_Comments__c = comments;

            } else if (actionType == 'Reject') {
                statusToSet = 'Proposal Rejected by WIN Admin';
                historyStatus = 'Rejected';
                historyNamePrefix = 'Rejected by ';
                lockRecord = true;

                // ✅ FINAL: Added back
                proposal.WIN_Approval_Comments__c = comments;

            } else if (actionType == 'Resubmit') {
                statusToSet = 'Asked for Resubmission by WIN Admin';
                historyStatus = 'Resubmit';
                historyNamePrefix = 'Asked for Revision by ';
                unlockRecord = true;

                // ✅ FINAL: Added back
                proposal.WIN_Approval_Comments__c = comments;
                proposal.Asked_for_Resubmission_by_WIN_Admin__c = true;
                proposal.Due_Date_for_Resubmission_WIN__c = dueDate;

            } else {
                throw new AuraHandledException('Invalid action type.');
            }

            if (unlockRecord) {
                try { Approval.unlock(recordId); } catch (Exception e) {}
            }

            // ----------------------------------------
            // UPDATE PROPOSAL RECORD
            // ----------------------------------------
            proposal.Status = statusToSet;
            update proposal;

            // ----------------------------------------
            // INSERT APPROVAL HISTORY RECORD
            // ----------------------------------------
            Approval_History__c history = new Approval_History__c(
                Name = historyNamePrefix + UserInfo.getName(),
                Status__c = historyStatus,
                Assigned_To__c = UserInfo.getUserId(),
                Proposal__c = proposal.Id,
                Comments__c = comments
            );
            insert history;

            // ----------------------------------------
            // SHARE Approval_History__c WITH COE USER
            // ----------------------------------------
            if (proposal.Coe_Approver__c != null) {
                try {
                    Approval_History__Share sh = new Approval_History__Share();
                    sh.ParentId = history.Id;
                    sh.UserOrGroupId = proposal.Coe_Approver__c; // COE USER
                    sh.AccessLevel = 'Read';
                    sh.RowCause = Schema.Approval_History__Share.RowCause.Manual;
                    insert sh;
                } catch (Exception e) {
                    System.debug('Error creating share: ' + e.getMessage());
                }
            }

            if (lockRecord) {
                try { Approval.lock(recordId); } catch (Exception e) {}
            }
        }
    }
}