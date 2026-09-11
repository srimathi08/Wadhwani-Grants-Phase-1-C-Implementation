public with sharing class externalController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Id> getPersonAccountAndContactId() {
        User u = [SELECT Contact.AccountId, ContactId FROM User WHERE Id = :UserInfo.getUserId()];
        Map<String, Id> result = new Map<String, Id>();
        if (u.ContactId != null) {
            result.put('accountId', u.Contact.AccountId);
            result.put('contactId', u.ContactId);
        }
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static Account getPersonAccountDetails(Id accountId) {
        return [
            SELECT Salutation, FirstName, LastName, Phone, PersonEmail, EmailCustom__c,
                   Current_Organization__pc, Current_Role__pc, Field_of_specialization__pc, Profile_Executive_Summary__pc,
                   BillingStreet, BillingCity, BillingCountryCode, BillingStateCode, BillingPostalCode,
                   PAN_Number__pc, Bank_Account_Name__pc, Account_Number__pc, Bank_Name__pc, Branch_Name__pc, IFSC_Code__pc,
                   LinkedIn_Profile_URL__c
            FROM Account
            WHERE Id = :accountId
            LIMIT 1
        ];
    }

    @AuraEnabled
    public static void updatePersonAccount(
        Id accountId,
        String salutation,
        String firstName,
        String lastName,
        String phone,
        String personEmail,
        String emailCustom,
        String currentOrganization,
        String currentRole,
        String fieldOfSpecialization,
        String profileExecutiveSummary,
        String billingStreet,
        String billingCity,
        String billingCountry,
        String billingState,
        String billingPostalCode,
        String panNumber,
        String bankAccountName,
        String accountNumber,
        String bankName,
        String branchName,
        String ifscCode,
        String linkedInUrl
    ) {
        if (accountId == null) {
            throw new AuraHandledException('No Account ID provided.');
        }

        Account acc = [SELECT Id FROM Account WHERE Id = :accountId LIMIT 1];

        acc.Salutation = salutation;
        acc.FirstName = firstName;
        acc.LastName = lastName;
        acc.Phone = phone;
        acc.PersonEmail = personEmail;
        acc.EmailCustom__c = emailCustom;
        acc.Current_Organization__pc = currentOrganization;
        acc.Current_Role__pc = currentRole;
        acc.Field_of_specialization__pc = fieldOfSpecialization;
        acc.Profile_Executive_Summary__pc = profileExecutiveSummary;
        acc.BillingStreet = billingStreet;
        acc.BillingCity = billingCity;
        acc.BillingCountryCode = billingCountry;
        acc.BillingStateCode = billingState;
        acc.BillingPostalCode = billingPostalCode;
        acc.PAN_Number__pc = panNumber;
        acc.Bank_Account_Name__pc = bankAccountName;
        acc.Account_Number__pc = accountNumber;
        acc.Bank_Name__pc = bankName;
        acc.Branch_Name__pc = branchName;
        acc.IFSC_Code__pc = ifscCode;
        acc.LinkedIn_Profile_URL__c = linkedInUrl;

        update acc;
    }

    @AuraEnabled
    public static void markReviewerRegistered(Id accountId) {
        if (accountId != null) {
            Account acc = [SELECT Id, Reviewer_registered__c FROM Account WHERE Id = :accountId LIMIT 1];
            acc.Reviewer_registered__c = true;
            acc.Reviewer_Registration_Date__c = System.now();
            update acc;
        }
    }
}