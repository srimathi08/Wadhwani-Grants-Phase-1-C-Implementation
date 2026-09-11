public without sharing class CoeHomeSectionController {

    // Resolved context for the running user: their COE Account and
    // whether their Contact is flagged as a COE Admin.
    private class CoeContext {
        Id accountId;
        Boolean isAdmin;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getPiProjectCounts() {
        Map<String, Integer> result = new Map<String, Integer>();
        CoeContext ctx = getCoeContext();

        if (ctx.accountId == null || !ctx.isAdmin) {
            result.put('piCount', 0);
            result.put('projectCount', 0);
            return result;
        }

        result.put(
            'piCount',
            [SELECT COUNT() FROM Contact
             WHERE AccountId = :ctx.accountId
             AND COE_PI__c = true]
        );
        result.put(
            'projectCount',
            [SELECT COUNT() FROM IndividualApplication
             WHERE AccountId = :ctx.accountId]
        );
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getPiCounts() {
        Map<String, Integer> result = new Map<String, Integer>();
        CoeContext ctx = getCoeContext();

        if (ctx.accountId == null || !ctx.isAdmin) {
            result.put('addedPiCount', 0);
            result.put('registeredPiCount', 0);
            return result;
        }

        // ✅ Total PI Contacts
        Integer added = [
            SELECT COUNT() FROM Contact
            WHERE AccountId = :ctx.accountId
            AND COE_PI__c = true
        ];
        // ✅ Registered PIs (have active User)
        Integer registered = [
            SELECT COUNT() FROM User
            WHERE ContactId IN (
                SELECT Id FROM Contact
                WHERE AccountId = :ctx.accountId
                AND COE_PI__c = true
            )
            AND IsActive = true
        ];
        result.put('addedPiCount', added);
        result.put('registeredPiCount', registered);
        return result;
    }

    // 🔒 SAFE CONTEXT FETCH (NO ERRORS)
    // Resolves the running user's COE Account and admin flag in a single
    // Contact query, defaulting to "no account / not admin" on any gap.
    private static CoeContext getCoeContext() {
        CoeContext ctx = new CoeContext();
        ctx.accountId = null;
        ctx.isAdmin = false;

        User u = [
            SELECT ContactId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];
        if (u.ContactId == null) {
            return ctx;
        }

        Contact c = [
            SELECT AccountId, COE_Admin__c
            FROM Contact
            WHERE Id = :u.ContactId
            LIMIT 1
        ];
        ctx.accountId = c.AccountId;
        ctx.isAdmin = (c.COE_Admin__c == true);
        return ctx;
    }
}