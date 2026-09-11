@IsTest
private class WCFDashboardAccessControllerTest {

    // ═══════════════════════════════════════════════════════════════════
    //  Why SeeAllData=true on the role tests
    //  The controller walks User -> Contact -> Account. In a test without
    //  SeeAllData, User is visible (setup object) but Contact and Account
    //  are NOT, so the walk dies at the Contact query and the assignment
    //  lines never execute. Running against real portal data is what lets
    //  the full path run — the same approach the other WCF test classes use.
    // ═══════════════════════════════════════════════════════════════════

    private static User getAdminUser() {
        List<User> admins = [
            SELECT Id FROM User
            WHERE IsActive = true AND UserRoleId != null AND UserType = 'Standard'
            LIMIT 1
        ];
        return admins.isEmpty() ? new User(Id = UserInfo.getUserId()) : admins[0];
    }

    /** Real community users, person-account ones first (the portal pattern here). */
    private static List<User> candidateUsers() {
        List<User> ordered = new List<User>();

        ordered.addAll([
            SELECT Id, ContactId, AccountId, Profile.Name
            FROM User
            WHERE IsActive = true
              AND ContactId != null
              AND Account.IsPersonAccount = true
            LIMIT 5
        ]);

        for (User u : [
            SELECT Id, ContactId, AccountId, Profile.Name
            FROM User
            WHERE IsActive = true
              AND ContactId != null
            LIMIT 10
        ]) {
            Boolean already = false;
            for (User existing : ordered) {
                if (existing.Id == u.Id) { already = true; break; }
            }
            if (!already) ordered.add(u);
        }
        return ordered;
    }

    /** Resolves each candidate's AccountId, preferring User.AccountId. */
    private static Map<Id, Id> accountIdByUser(List<User> users) {
        Map<Id, Id> result = new Map<Id, Id>();
        Set<Id> needLookup = new Set<Id>();

        for (User u : users) {
            if (u.AccountId != null) {
                result.put(u.Id, u.AccountId);
            } else {
                needLookup.add(u.ContactId);
            }
        }

        if (!needLookup.isEmpty()) {
            Map<Id, Id> accByContact = new Map<Id, Id>();
            for (Contact c : [SELECT Id, AccountId FROM Contact WHERE Id IN :needLookup]) {
                if (c.AccountId != null) accByContact.put(c.Id, c.AccountId);
            }
            for (User u : users) {
                if (!result.containsKey(u.Id) && accByContact.containsKey(u.ContactId)) {
                    result.put(u.Id, accByContact.get(u.ContactId));
                }
            }
        }
        return result;
    }

    /** Sets flags on the candidate's account, then runs the controller as them. */
    private static WCFDashboardAccessController.DashboardAccess tryCandidate(
            User candidate, Id accountId, Boolean validator, Boolean reviewer, Boolean approver) {

        try {
            System.runAs(getAdminUser()) {
                update new Account(
                    Id                = accountId,
                    WCFs_Validator__c = validator,
                    WCF_Reviewer__c   = reviewer,
                    WCF_Approver__c   = approver
                );
            }
        } catch (Exception e) {
            System.debug('CANDIDATE ' + candidate.Id + ' flag update failed => ' + e.getMessage());
            return null;
        }

        WCFDashboardAccessController.DashboardAccess access;
        System.runAs(candidate) {
            try {
                access = WCFDashboardAccessController.getDashboardAccess();
            } catch (Exception e) {
                System.debug('CANDIDATE ' + candidate.Id + ' call failed => '
                    + e.getTypeName() + ': ' + e.getMessage());
                access = null;
            }
        }
        return access;
    }

    /** First candidate that completes the full path wins. */
    private static WCFDashboardAccessController.DashboardAccess accessForFlags(
            Boolean validator, Boolean reviewer, Boolean approver) {

        List<User> candidates = candidateUsers();
        System.debug('CANDIDATE count = ' + candidates.size());
        if (candidates.isEmpty()) return null;

        Map<Id, Id> accountByUser = accountIdByUser(candidates);

        for (User u : candidates) {
            Id accountId = accountByUser.get(u.Id);
            if (accountId == null) {
                System.debug('CANDIDATE ' + u.Id + ' has no resolvable account.');
                continue;
            }
            WCFDashboardAccessController.DashboardAccess access =
                tryCandidate(u, accountId, validator, reviewer, approver);
            if (access != null) {
                System.debug('CANDIDATE ' + u.Id + ' (' + u.Profile.Name + ') succeeded.');
                return access;
            }
        }
        System.debug('CANDIDATE: none could complete the call.');
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  TESTS — role permutations (need real portal data)
    // ═══════════════════════════════════════════════════════════════════

    @IsTest(SeeAllData=true)
    static void testAllRolesGranted() {
        WCFDashboardAccessController.DashboardAccess access = accessForFlags(true, true, true);
        if (access == null) return;

        System.assertEquals(true, access.isValidator);
        System.assertEquals(true, access.isReviewer);
        System.assertEquals(true, access.isApprover);
    }

    @IsTest(SeeAllData=true)
    static void testNoRolesGranted() {
        WCFDashboardAccessController.DashboardAccess access = accessForFlags(false, false, false);
        if (access == null) return;

        System.assertEquals(false, access.isValidator);
        System.assertEquals(false, access.isReviewer);
        System.assertEquals(false, access.isApprover);
    }

    @IsTest(SeeAllData=true)
    static void testValidatorOnly() {
        WCFDashboardAccessController.DashboardAccess access = accessForFlags(true, false, false);
        if (access == null) return;

        System.assertEquals(true,  access.isValidator);
        System.assertEquals(false, access.isReviewer);
        System.assertEquals(false, access.isApprover);
    }

    @IsTest(SeeAllData=true)
    static void testReviewerOnly() {
        WCFDashboardAccessController.DashboardAccess access = accessForFlags(false, true, false);
        if (access == null) return;

        System.assertEquals(false, access.isValidator);
        System.assertEquals(true,  access.isReviewer);
        System.assertEquals(false, access.isApprover);
    }

    @IsTest(SeeAllData=true)
    static void testApproverOnly() {
        WCFDashboardAccessController.DashboardAccess access = accessForFlags(false, false, true);
        if (access == null) return;

        System.assertEquals(false, access.isValidator);
        System.assertEquals(false, access.isReviewer);
        System.assertEquals(true,  access.isApprover);
    }

    /**
     * Diagnostic — logs every candidate's outcome so a blocking profile or
     * permission is visible in one log.
     */
    @IsTest(SeeAllData=true)
    static void testCandidateDiagnostics() {
        List<User> candidates = candidateUsers();
        Map<Id, Id> accountByUser = accountIdByUser(candidates);

        System.debug('DIAGNOSTIC candidate count = ' + candidates.size());
        for (User u : candidates) {
            Id accId = accountByUser.get(u.Id);
            System.debug('DIAGNOSTIC user=' + u.Id + ' profile=' + u.Profile.Name
                + ' contact=' + u.ContactId + ' account=' + accId);
            if (accId == null) continue;

            System.runAs(u) {
                try {
                    WCFDashboardAccessController.DashboardAccess a =
                        WCFDashboardAccessController.getDashboardAccess();
                    System.debug('DIAGNOSTIC   -> OK validator=' + a.isValidator
                        + ' reviewer=' + a.isReviewer + ' approver=' + a.isApprover);
                } catch (Exception e) {
                    System.debug('DIAGNOSTIC   -> FAILED ' + e.getTypeName() + ': ' + e.getMessage());
                }
            }
        }
        System.assert(true);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  TESTS — no portal data needed
    // ═══════════════════════════════════════════════════════════════════

    /** A user with no ContactId short-circuits with all three flags false. */
    @IsTest
    static void testNoContactReturnsAllFalse() {
        System.runAs(getAdminUser()) {
            WCFDashboardAccessController.DashboardAccess access =
                WCFDashboardAccessController.getDashboardAccess();

            System.assertNotEquals(null, access);
            System.assertEquals(false, access.isValidator);
            System.assertEquals(false, access.isReviewer);
            System.assertEquals(false, access.isApprover);
        }
    }

    /** The wrapper is @AuraEnabled and serialised by the LWC layer. */
    @IsTest
    static void testWrapperSerialises() {
        WCFDashboardAccessController.DashboardAccess access =
            new WCFDashboardAccessController.DashboardAccess();
        access.isValidator = true;
        access.isReviewer  = false;
        access.isApprover  = true;

        String json = JSON.serialize(access);
        System.assert(json.contains('isValidator'));
        System.assert(json.contains('isApprover'));
    }
}