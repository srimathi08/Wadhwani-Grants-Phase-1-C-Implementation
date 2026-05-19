public without sharing class ApprovalHistoryService {

    @AuraEnabled(cacheable=true)
    public static List<WrapperHistory> getRecords(Id proposalId) {

        List<WrapperHistory> results = new List<WrapperHistory>();

        // Query all Approval History records
        List<Approval_History__c> histories = [
            SELECT Id, Name, CreatedDate, Status__c, Assigned_To_Name__c,
                   Comments__c, Proposal__c
            FROM Approval_History__c
            WHERE Proposal__c = :proposalId
            ORDER BY CreatedDate DESC
        ];

        // Get PI user
        Id piId = [SELECT PI__c FROM IndividualApplication WHERE Id = :proposalId].PI__c;

        // Get all shared history records for PI
        Map<Id, Boolean> sharedMap = new Map<Id, Boolean>();
        for (Approval_History__Share sh : [
            SELECT ParentId
            FROM Approval_History__Share
            WHERE UserOrGroupId = :piId
            AND RowCause = 'Manual'
        ]) {
            sharedMap.put(sh.ParentId, true);
        }

        // Build wrapper list
        for (Approval_History__c h : histories) {
            Boolean alreadyShared = sharedMap.containsKey(h.Id);
            results.add(new WrapperHistory(h, alreadyShared));
        }

        return results;
    }

    public class WrapperHistory {
        @AuraEnabled public Approval_History__c record { get; set; }
        @AuraEnabled public Boolean alreadyShared { get; set; }

        public WrapperHistory(Approval_History__c rec, Boolean shared) {
            record = rec;
            alreadyShared = shared;
        }
    }
}