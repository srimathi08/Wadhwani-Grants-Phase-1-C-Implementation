public without sharing class ProfileController {

    /**
     * Get current logged-in user's Person Account data
     * SAFE for Experience Cloud @wire usage
     */
    @AuraEnabled(cacheable=true)
    public static Account getUserProfile() {

        System.debug('🟢 ===== getUserProfile START =====');
        System.debug('🟢 Current UserId = ' + UserInfo.getUserId());

        // 1️⃣ Get current user
        User currentUser = [
            SELECT Id, ContactId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        System.debug('🟡 User.ContactId = ' + currentUser.ContactId);

        if (currentUser.ContactId == null) {
            System.debug('🔴 No ContactId linked to this User');
            return null;
        }

        // 2️⃣ Get contact
        Contact userContact = [
            SELECT Id, AccountId
            FROM Contact
            WHERE Id = :currentUser.ContactId
            LIMIT 1
        ];

        System.debug('🟡 Contact.AccountId = ' + userContact.AccountId);

        if (userContact.AccountId == null) {
            System.debug('🔴 No AccountId linked to this Contact');
            return null;
        }

        // 3️⃣ Fetch Person Account
        List<Account> accList = [
            SELECT Id,
                   Name,
                   Phone,
                   PersonEmail,
                   EmailCustom__c,
                   Current_Organization__pc,
                   Current_Role__pc,
                   Field_of_specialization__pc,
                   Profile_Executive_Summary__pc,
                   BillingStreet,
                   BillingCity,
                   BillingState,
                   BillingPostalCode,
                   BillingCountry,
                   IsPersonAccount
            FROM Account
            WHERE Id = :userContact.AccountId
            AND IsPersonAccount = true
            LIMIT 1
        ];

        System.debug('🟢 Account query result size = ' + accList.size());

        if (!accList.isEmpty()) {
            System.debug('🟢 Person Account Id = ' + accList[0].Id);
            System.debug('🟢 IsPersonAccount = ' + accList[0].IsPersonAccount);
        } else {
            System.debug('🔴 No Person Account found for this AccountId');
        }

        System.debug('🟢 ===== getUserProfile END =====');

        return accList.isEmpty() ? null : accList[0];
    }

    /**
     * Update Person Account + sync User record
     * Imperative call (exceptions allowed)
     */
    @AuraEnabled
    public static String updateUserProfile(Account accountData) {

        System.debug('🟢 ===== updateUserProfile START =====');
        System.debug('🟢 Incoming Account Id = ' + accountData.Id);

        try {
            // 1️⃣ Current user
            User currentUser = [
                SELECT Id, ContactId
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];

            System.debug('🟡 User.ContactId = ' + currentUser.ContactId);

            if (currentUser.ContactId == null) {
                throw new AuraHandledException('No contact record found for current user.');
            }

            // 2️⃣ Contact → Account validation
            Contact userContact = [
                SELECT Id, AccountId
                FROM Contact
                WHERE Id = :currentUser.ContactId
                LIMIT 1
            ];

            System.debug('🟡 Contact.AccountId = ' + userContact.AccountId);

            if (accountData.Id != userContact.AccountId) {
                throw new AuraHandledException('Unauthorized profile update attempt.');
            }

            // 3️⃣ Update Person Account
            update accountData;
            System.debug('🟢 Person Account updated successfully');

            // 4️⃣ Sync User name + email
            String fullName = accountData.Name != null
                ? accountData.Name.trim()
                : 'User';

            String firstName = fullName.contains(' ')
                ? fullName.substringBefore(' ')
                : fullName;

            String lastName = fullName.contains(' ')
                ? fullName.substringAfter(' ')
                : 'User';

            User userToUpdate = new User(
                Id = UserInfo.getUserId(),
                FirstName = firstName,
                LastName = lastName,
                Email = accountData.PersonEmail
            );

            update userToUpdate;
            System.debug('🟢 User record synced successfully');

            System.debug('🟢 ===== updateUserProfile END =====');
            return 'Success';

        } catch (Exception e) {
            System.debug('🔴 ERROR in updateUserProfile: ' + e.getMessage());
            throw new AuraHandledException('Error updating profile: ' + e.getMessage());
        }
    }
}