public without sharing class WCFDashboardAccessController {

    public class DashboardAccess {
        @AuraEnabled public Boolean isValidator;
        @AuraEnabled public Boolean isReviewer;
        @AuraEnabled public Boolean isApprover;
    }

    @AuraEnabled(cacheable=true)
    public static DashboardAccess getDashboardAccess() {

        DashboardAccess access = new DashboardAccess();
        access.isValidator = false;
        access.isReviewer  = false;
        access.isApprover  = false;

        User usr = [
            SELECT Id, ContactId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        System.debug('User ContactId: ' + usr.ContactId);

        if (usr.ContactId == null) {
            return access;
        }

        Contact con = [
            SELECT Id, AccountId
            FROM Contact
            WHERE Id = :usr.ContactId
            LIMIT 1
        ];

        System.debug('Contact AccountId: ' + con.AccountId);

        if (con.AccountId == null) {
            return access;
        }

        Account acc = [
            SELECT Id,
                   Name,
                   IsPersonAccount,
                   WCFs_Validator__c,
                   WCF_Reviewer__c,
                   WCF_Approver__c
            FROM Account
            WHERE Id = :con.AccountId
            LIMIT 1
        ];

        System.debug('Account: ' + acc.Name);
        System.debug('Validator: ' + acc.WCFs_Validator__c);
        System.debug('Reviewer : ' + acc.WCF_Reviewer__c);
        System.debug('Approver : ' + acc.WCF_Approver__c);

        access.isValidator = acc.WCFs_Validator__c;
        access.isReviewer  = acc.WCF_Reviewer__c;
        access.isApprover  = acc.WCF_Approver__c;

        System.debug('Dashboard Access => ' + JSON.serialize(access));

        return access;
    }
}