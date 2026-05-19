public with sharing class CoeWelcomeController {

    @AuraEnabled(cacheable=true)
    public static String getCoeName() {
        try {
            User u = [
                SELECT Contact.Account.Name, Contact.AccountId, Name
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];

            if (u.Contact != null && u.Contact.Account != null 
                && String.isNotBlank(u.Contact.Account.Name)) {
                return u.Contact.Account.Name;
            }

            // Fallback: try Account directly via AccountId on Contact
            if (u.Contact != null && u.Contact.AccountId != null) {
                Account acc = [SELECT Name FROM Account 
                               WHERE Id = :u.Contact.AccountId LIMIT 1];
                return acc.Name;
            }

            return 'Your COE Portal';

        } catch (Exception e) {
            System.debug('CoeWelcomeController error: ' + e.getMessage());
            return 'Your COE Portal';
        }
    }
}