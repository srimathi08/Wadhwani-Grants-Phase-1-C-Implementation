public with sharing class PartnerUserCreation {

    @InvocableMethod(label='Create Partner User')
    public static void createPartnerUser(List<Id> contactIds) {
        // Enqueue as separate transaction to avoid Mixed DML
        System.enqueueJob(new CreatePartnerUserJob(contactIds));
    }

    public class CreatePartnerUserJob implements Queueable {
        private List<Id> contactIds;
        public CreatePartnerUserJob(List<Id> ids) {
            this.contactIds = ids;
        }

        public void execute(QueueableContext context) {
            for (Id contactId : contactIds) {
                createUser(contactId);
            }
        }
    }

    private static void createUser(Id contactId) {
        Contact ct = [
            SELECT Id, FirstName, LastName, Email, AccountId, Account.Name, PI_Convert__c
            FROM Contact WHERE Id = :contactId LIMIT 1
        ];

        // Ensure PI_Convert__c is TRUE
        if (ct.PI_Convert__c != true) {
            ct.PI_Convert__c = true;
            update ct;
        }

        // Use fixed Partner Profile Id (Partner Community Clone)
        Id partnerProfileId = '00eF6000000JF3TIAW';

        // Build unique Username
        String userName = ct.Email + '.partneruser';
        if (userName.length() > 80) userName = userName.substring(0, 79);

        // Pick Partner User Role (lowest)
        UserRole partnerRole = [
            SELECT Id FROM UserRole
            WHERE PortalType = 'Partner'
            AND Name = :ct.Account.Name + ' Partner User'
            LIMIT 1
        ];

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
            ProfileId = partnerProfileId,
            ContactId = ct.Id,
            UserRoleId = partnerRole.Id,
            CommunityNickname = (ct.FirstName != null ? ct.FirstName : 'user') + '_' + DateTime.now().getTime()
        );

        insert newUser;

        // Auto-generate password and send welcome email
        System.resetPassword(newUser.Id, true);
    }
}