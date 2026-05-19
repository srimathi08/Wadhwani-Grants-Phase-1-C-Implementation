//Used to create PI User from Screen Flow

trigger contactUserUpdateTrigger on Contact (after insert, after update) {
    Set<String> emailDomains = new Set<String>();
    Map<String, Id> contactEmailToId = new Map<String, Id>();

    for (Contact con : Trigger.new) {
        if (con.Email != null && con.AccountId != null) {  
            String emailDomain = con.Email.substringAfter('@').toLowerCase();
            emailDomains.add(emailDomain);
            contactEmailToId.put(con.Email.toLowerCase(), con.Id);
        }
    }

    if (!emailDomains.isEmpty()) {
        // Enqueue the Queueable Job instead of calling a missing method
        System.enqueueJob(new ContactUserUpdateJob(contactEmailToId, emailDomains));
    }
}