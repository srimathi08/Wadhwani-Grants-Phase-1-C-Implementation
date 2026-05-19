public class PartnerUserCreationQueueable implements Queueable {

    private List<Id> contactIds;

    public PartnerUserCreationQueueable(List<Id> contactIds) {
        this.contactIds = contactIds;
    }

    public void execute(QueueableContext context) {
        System.debug('🚀 PartnerUserCreationQueueable started for contactIds: ' + contactIds);

        List<Contact> contacts = [
            SELECT Id, FirstName, LastName, Email, AccountId, Account.Name, PI_Convert__c
            FROM Contact
            WHERE Id IN :contactIds
        ];

        System.debug('📋 Retrieved Contacts: ' + contacts);

        for (Contact ct : contacts) {
            if (ct.PI_Convert__c) {
                System.debug('▶️ Processing Contact: ' + ct.Id + ', PI_Convert__c=' + ct.PI_Convert__c);
                try {
                    createPartnerUser(ct);
                } catch (Exception e) {
                    System.debug('❌ ERROR creating Partner User for Contact ' + ct.Id + ': ' + e.getMessage());
                }
            }
        }

        System.debug('✅ PartnerUserCreationQueueable completed.');
    }

    private void createPartnerUser(Contact ct) {
        // 1️⃣ Get Partner Community Profile
        Profile partnerProfile = [
            SELECT Id, Name, UserLicense.Name 
            FROM Profile 
            WHERE Name =  'PI User Partner Profile'
            LIMIT 1
        ]; //'Partner Community Clone'

        if (partnerProfile == null) {
            throw new AuraHandledException('Partner Community Clone profile not found!');
        }
        System.debug('👤 Using Partner Profile Id: ' + partnerProfile.Id);

        // 2️⃣ Check for existing user
        Integer existingUserCount = [SELECT COUNT() FROM User WHERE ContactId = :ct.Id];
        if (existingUserCount > 0) {
            System.debug('ℹ️ User already exists for contact ' + ct.Id + '. Skipping.');
            return;
        }

        // 3️⃣ Get Partner Role for Account
        UserRole partnerRole;
        try {
            partnerRole = [
                SELECT Id, Name 
                FROM UserRole 
                WHERE PortalType = 'Partner'
                AND Name LIKE :('%' + ct.Account.Name + '%') 
                LIMIT 1
            ]; // Name = :ct.Account.Name + ' Partner User'
            System.debug('🏷️ Using Partner Role: ' + partnerRole.Name + ' (' + partnerRole.Id + ')');
        } catch (Exception e) {
            System.debug('⚠️ No Partner Role found for account ' + ct.Account.Name + ', continuing without role.');
        }

        // 4️⃣ Generate Unique Username
        String userName = ct.Email + '.partner';
        if (userName.length() > 80) userName = userName.substring(0, 79);

        // 5️⃣ Create User Record
        User newUser = new User(
            Username = userName,
            FirstName = ct.FirstName,
            LastName = ct.LastName,
            Alias = (ct.LastName != null) ? ct.LastName.left(8) : 'partner',
            Email = ct.Email,
            EmailEncodingKey = 'UTF-8',
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            LanguageLocaleKey = 'en_US',
            ProfileId = partnerProfile.Id,
            ContactId = ct.Id,
            UserRoleId = (partnerRole != null) ? partnerRole.Id : null,
            CommunityNickname = ((ct.FirstName != null) ? ct.FirstName : 'user') + '_' + DateTime.now().getTime()
        );

        insert newUser;
        System.debug('✅ Partner User created: ' + newUser.Id);

    }
}