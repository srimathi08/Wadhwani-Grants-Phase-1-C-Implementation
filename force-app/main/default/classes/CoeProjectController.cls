public without sharing class CoeProjectController {

    @AuraEnabled(cacheable=true)
    public static List<IndividualApplication> getProjects() {

        User u = [
            SELECT Contact.AccountId, Contact.COE_Admin__c
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        // Only COE Admins
        if (u.Contact == null || u.Contact.AccountId == null || !u.Contact.COE_Admin__c) {
            return new List<IndividualApplication>();
        }

        return [
            SELECT Id,
                   Name,
                   Status,
                   LastModifiedDate
            FROM IndividualApplication
            WHERE AccountId = :u.Contact.AccountId
            ORDER BY LastModifiedDate DESC
        ];
    }
}