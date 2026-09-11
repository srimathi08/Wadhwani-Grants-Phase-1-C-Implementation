public with sharing class WCFPortalUserController {

    @AuraEnabled(cacheable=true)
    public static Id getCurrentAccountId() {

        List<User> users = [
            SELECT ContactId, Contact.AccountId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        if (users.isEmpty() || users[0].Contact == null) {
            return null;
        }

        return users[0].Contact.AccountId;
    }

    /* ============================================================
     * SERVER-SIDE ROLE GUARD
     *
     * The ?role= URL param is a view filter, never a grant. Anyone can
     * type ?role=approver into the address bar. Call assertRole() at the
     * top of every Apex method backing a role-specific page:
     *
     *     WCFPortalUserController.assertRole('approver');
     *
     * Runs without sharing on purpose — the three checkboxes are an
     * administrative property of the Account, not data the portal user is
     * meant to read. Resolving them in system mode means you don't have to
     * grant FLS on those fields to every portal profile.
     * ============================================================ */

    public class RoleFlags {
        public Boolean isValidator = false;
        public Boolean isReviewer  = false;
        public Boolean isApprover  = false;

        public Boolean has(String role) {
            if (String.isBlank(role)) {
                return false;
            }
            switch on role.toLowerCase() {
                when 'validator' { return isValidator; }
                when 'reviewer'  { return isReviewer;  }
                when 'approver'  { return isApprover;  }
                when else        { return false;       }
            }
        }
    }

    private without sharing class RoleResolver {

        public RoleFlags resolveFor(Id userId) {

            RoleFlags flags = new RoleFlags();

            List<User> users = [
                SELECT Id,
                       ContactId,
                       Contact.AccountId,
                       Contact.Account.WCFs_Validator__c,
                       Contact.Account.WCF_Reviewer__c,
                       Contact.Account.WCF_Approver__c
                FROM User
                WHERE Id = :userId
                LIMIT 1
            ];

            if (users.isEmpty()
                || users[0].Contact == null
                || users[0].Contact.Account == null) {
                return flags;
            }

            Account acc = users[0].Contact.Account;
            flags.isValidator = (acc.WCFs_Validator__c == true);
            flags.isReviewer  = (acc.WCF_Reviewer__c  == true);
            flags.isApprover  = (acc.WCF_Approver__c  == true);

            return flags;
        }
    }

    public static Boolean currentUserHasRole(String role) {
        if (UserInfo.getUserType() == 'Guest') {
            return false;
        }
        return new RoleResolver().resolveFor(UserInfo.getUserId()).has(role);
    }

    public static void assertRole(String role) {
        if (!currentUserHasRole(role)) {
            throw new AuraHandledException('You do not have access to this area.');
        }
    }
}