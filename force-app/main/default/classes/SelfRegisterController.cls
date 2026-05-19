public with sharing class SelfRegisterController {
    @AuraEnabled
    public static String registerUser(String firstName, String lastName, String email, String password) {
        try {
            System.debug('### Registering user with email: ' + email);

            // Check if a User with this email already exists
            List<User> existingUsers = [SELECT Id FROM User WHERE Email = :email LIMIT 1];
            if (!existingUsers.isEmpty()) {
                return 'Error: A user with this email already exists.';
            }

            // Check if a Contact with this email already exists
            Contact existingContact;
            List<Contact> contacts = [SELECT Id, AccountId FROM Contact WHERE Email = :email LIMIT 1];
            if (!contacts.isEmpty()) {
                existingContact = contacts[0];
            }

            Account matchedAccount;
            if (existingContact == null) {
                // Find Account using email domain
                String emailDomain = email.substringAfter('@');
                List<Account> accounts = [SELECT Id FROM Account WHERE Website LIKE :('%' + emailDomain) LIMIT 1];

                if (!accounts.isEmpty()) {
                    matchedAccount = accounts[0];
                } else {
                    return 'Error: No matching account found for this email.';
                }

                // Create new Contact under the matched Account
                existingContact = new Contact(
                    FirstName = firstName,
                    LastName = lastName,
                    Email = email,
                    AccountId = matchedAccount.Id
                );
                insert existingContact;
                System.debug('### Contact created with Id: ' + existingContact.Id);
            }

            // Call Future Method to create the User
            createCommunityUser(existingContact.Id, firstName, lastName, email);
            
            return 'Success: Contact Created! User will be created shortly.';
        } catch (Exception e) {
            System.debug('### ERROR: ' + e.getMessage());
            return 'Error: ' + e.getMessage();
        }
    }

    @future
    public static void createCommunityUser(Id contactId, String firstName, String lastName, String email) {
        try {
            System.debug('### Creating Community User for Contact: ' + contactId);

            Profile communityProfile = [SELECT Id FROM Profile WHERE Name = 'Partner Community clone' LIMIT 1]; // Change profile if needed

            User newUser = new User(
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Username = email, // Community Users must have a unique username
                Alias = email.substring(0, 5),
                CommunityNickname = firstName + lastName,
                ProfileId = communityProfile.Id,
                ContactId = contactId, // Link the User to the Contact
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                TimeZoneSidKey = 'America/New_York',
                LanguageLocaleKey = 'en_US'
            );

            insert newUser;
            System.debug('### User created with Id: ' + newUser.Id);
        } catch (Exception e) {
            System.debug('### ERROR in User Creation: ' + e.getMessage());
        }
    }
}