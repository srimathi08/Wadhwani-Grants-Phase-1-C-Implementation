public with sharing class PiContactController {

    /**
     * Returns PI contacts belonging to the same Account as the logged-in portal user.
     * Designed for Experience Cloud (portal/community users).
     */
    @AuraEnabled(cacheable=true)
    public static List<Contact> getPIContacts() {

        // Step 1: Get the Contact linked to the running user
        List<User> users = [
            SELECT Id, ContactId, Contact.AccountId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            AND ContactId != null
            LIMIT 1
        ];

        if (users.isEmpty() || users[0].Contact.AccountId == null) {
            // Not a portal user, or Contact/Account not set up
            return new List<Contact>();
        }

        Id accountId = users[0].Contact.AccountId;

        // Step 2: Query PI contacts under the same Account
        return [
            SELECT Id, Name, Account.Name, Phone, Email, COE_PI__c
            FROM Contact
            WHERE COE_PI__c = true
            AND AccountId = :accountId
            ORDER BY CreatedDate DESC
        ];
    }

    @AuraEnabled
    public static void deleteContact(Id contactId) {
        if (contactId == null) {
            throw new AuraHandledException('Contact ID is required.');
        }

        List<Contact> contacts = [
            SELECT Id FROM Contact WHERE Id = :contactId LIMIT 1
        ];

        if (contacts.isEmpty()) {
            throw new AuraHandledException('Contact not found or access denied.');
        }

        delete contacts[0];
    }
}