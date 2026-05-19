public without sharing class CoeHomeSectionController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getPiProjectCounts() {

        Map<String, Integer> result = new Map<String, Integer>();

        Id accId = getCoeAccountId();

        if (accId == null) {
            result.put('piCount', 0);
            result.put('projectCount', 0);
            return result;
        }

        result.put(
            'piCount',
            [SELECT COUNT() FROM Contact 
             WHERE AccountId = :accId 
             AND COE_PI__c = true]
        );

        result.put(
            'projectCount',
            [SELECT COUNT() FROM IndividualApplication 
             WHERE AccountId = :accId]
        );

        return result;
    }


    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getPiCounts() {

        Map<String, Integer> result = new Map<String, Integer>();

        Id coeAccountId = getCoeAccountId();

        if (coeAccountId == null) {
            result.put('addedPiCount', 0);
            result.put('registeredPiCount', 0);
            return result;
        }

        // ✅ Total PI Contacts
        Integer added = [
            SELECT COUNT() FROM Contact
            WHERE AccountId = :coeAccountId
            AND COE_PI__c = true
        ];

        // ✅ Registered PIs (have active User)
        Integer registered = [
            SELECT COUNT() FROM User
            WHERE ContactId IN (
                SELECT Id FROM Contact
                WHERE AccountId = :coeAccountId
                AND COE_PI__c = true
            )
            AND IsActive = true
        ];

        result.put('addedPiCount', added);
        result.put('registeredPiCount', registered);

        return result;
    }


    // 🔒 SAFE ACCOUNT FETCH (NO ERRORS)
    private static Id getCoeAccountId() {

        User u = [
            SELECT ContactId 
            FROM User 
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        if (u.ContactId == null) {
            return null;
        }

        Contact c = [
            SELECT AccountId 
            FROM Contact 
            WHERE Id = :u.ContactId 
            LIMIT 1
        ];

        return c.AccountId;
    }
}