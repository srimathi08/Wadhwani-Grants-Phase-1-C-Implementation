public class ContactUserUpdateJob implements Queueable {
    private Map<String, Id> contactEmailToId;
    private Set<String> emailDomains;

    public ContactUserUpdateJob(Map<String, Id> contactEmailToId, Set<String> emailDomains) {
        this.contactEmailToId = contactEmailToId;
        this.emailDomains = emailDomains;
    }

    public void execute(QueueableContext context) {
        System.debug('=== Inside processMatchingContacts Method ===');
        System.debug('Received Contacts: ' + contactEmailToId);
        System.debug('Received Email Domains: ' + emailDomains);

        Map<String, Id> domainToAccountId = new Map<String, Id>();
        for (Account acc : [SELECT Id, Website FROM Account WHERE Website != null]) {
            String accountDomain = acc.Website.replace('www.', '').toLowerCase();
            domainToAccountId.put(accountDomain, acc.Id);
        }
        System.debug('Domain to Account Mapping: ' + domainToAccountId);

        List<Contact> contactsToUpdate = new List<Contact>();
        for (String email : contactEmailToId.keySet()) {
            String domain = email.substringAfter('@').toLowerCase();
            System.debug('Checking Email: ' + email + ' | Extracted Domain: ' + domain);

            if (domainToAccountId.containsKey(domain)) {
                Id contactId = contactEmailToId.get(email);
                Id newAccountId = domainToAccountId.get(domain);

                System.debug('Matching Account Found! Updating ContactId: ' + contactId + ' | AccountId: ' + newAccountId);

                Contact con = [SELECT Id, AccountId FROM Contact WHERE Id = :contactId LIMIT 1];
                if (con.AccountId != newAccountId) {
                    con.AccountId = newAccountId;
                    contactsToUpdate.add(con);
                } else {
                    System.debug('Contact already linked to the correct Account.');
                }
            }
        }

        if (!contactsToUpdate.isEmpty()) {
            try {
                update contactsToUpdate;
                System.debug('=== Contacts Updated Successfully ===');
            } catch (DmlException e) {
                System.debug('Update failed: ' + e.getMessage());
            }
        } else {
            System.debug('No Contacts found to update.');
        }
    }
}