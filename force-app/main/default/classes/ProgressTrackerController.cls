public with sharing class ProgressTrackerController {
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getProgressData() {
        // Fetch the current user
        User currentUser = [SELECT ContactId FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
        System.debug('Current User Id: ' + UserInfo.getUserId());
        System.debug('Current User ContactId: ' + currentUser.ContactId);

        if (currentUser.ContactId == null) {
            System.debug('No Contact associated with current user.');
            return new Map<String, Object>{ 'error' => 'No Contact found for current user.' };
        }

        // Get the related Contact and Account
        Contact con = [SELECT AccountId FROM Contact WHERE Id = :currentUser.ContactId LIMIT 1];
        Id accountId = con.AccountId;
        System.debug('Contact AccountId: ' + accountId);

        Account acc = [
            SELECT Sub_Stage__c, Institution_Registered__c
            FROM Account
            WHERE Id = :accountId
            LIMIT 1
        ];
        System.debug('Account Sub_Stage__c: ' + acc.Sub_Stage__c);
        System.debug('Account Institution_Registered__c: ' + acc.Institution_Registered__c);

        // Fetch COE Application
        List<IndividualApplication> coeApps = [
            SELECT Status
            FROM IndividualApplication
            WHERE AccountId = :accountId
            AND ApplicationType = 'COE Proposal'
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        System.debug('COE Application count: ' + coeApps.size());

        String coeStatus = coeApps.isEmpty() ? null : coeApps[0].Status;
        System.debug('COE Status: ' + coeStatus);

        // Return progress data
        return new Map<String, Object>{
            'subStage' => acc.Sub_Stage__c,
            'coeStatus' => coeStatus
        };
    }
}