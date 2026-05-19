public without sharing class AccountController {

    @AuraEnabled(cacheable=true)
    public static UserDetailsWrapper getUserDetails() {
        Id userId = UserInfo.getUserId();
        
        User userRecord = [SELECT ContactId, AccountId FROM User WHERE Id = :userId LIMIT 1];

        if (userRecord.ContactId == null || userRecord.AccountId == null) {
            throw new AuraHandledException('User does not have an associated Contact or Account.');
        }

        Account accountRecord = [
            SELECT Id, Name, Phone, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, Institution_Registered__c
            FROM Account
            WHERE Id = :userRecord.AccountId
            LIMIT 1
        ];

        Contact contactRecord = [
            SELECT Id, Name, Email
            FROM Contact
            WHERE Id = :userRecord.ContactId
            LIMIT 1
        ];

        return new UserDetailsWrapper(accountRecord, contactRecord);
    }

    @AuraEnabled
    public static void updateUserRecords(Account updatedAccount, Contact updatedContact) {
        List<SObject> recordsToUpdate = new List<SObject>();

        if (updatedAccount != null && updatedAccount.Id != null) {
            updatedAccount.Institution_Registered__c = true; // Update Checkbox
            recordsToUpdate.add(updatedAccount);
        }
        if (updatedContact != null && updatedContact.Id != null) {
            recordsToUpdate.add(updatedContact);
        }

        if (recordsToUpdate.isEmpty()) {
            throw new AuraHandledException('No valid records to update.');
        }

        try {
            update recordsToUpdate;
        } catch (Exception e) {
            throw new AuraHandledException('Error updating records: ' + e.getMessage());
        }
    }

     @AuraEnabled
public static void linkFilesToAccount(List<String> fileIds, Id accountId) {
    if (fileIds == null || fileIds.isEmpty() || accountId == null) {
        throw new AuraHandledException('File IDs or Account ID is missing.');
    }

    // Get existing links to prevent duplicate insertions
    Set<Id> existingFileLinks = new Set<Id>();
    for (ContentDocumentLink existingLink : [
        SELECT ContentDocumentId FROM ContentDocumentLink 
        WHERE LinkedEntityId = :accountId
    ]) {
        existingFileLinks.add(existingLink.ContentDocumentId);
    }

    List<ContentDocumentLink> newLinks = new List<ContentDocumentLink>();

    for (String fileId : fileIds) {
        if (!existingFileLinks.contains(fileId)) { // Only insert if not already linked
            newLinks.add(new ContentDocumentLink(
                ContentDocumentId = fileId,
                LinkedEntityId = accountId,
                ShareType = 'V', // Viewer access
                Visibility = 'AllUsers'
            ));
        }
    }

    if (!newLinks.isEmpty()) {
        insert newLinks;
    }
}


    public class UserDetailsWrapper {
        @AuraEnabled public Account account;
        @AuraEnabled public Contact contact;

        public UserDetailsWrapper(Account acc, Contact con) {
            this.account = acc;
            this.contact = con;
        }
    }
}