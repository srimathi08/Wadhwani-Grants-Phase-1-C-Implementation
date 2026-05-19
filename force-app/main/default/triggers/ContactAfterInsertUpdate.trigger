trigger ContactAfterInsertUpdate on Contact (after insert, after update) {
    List<Id> contactsToProcess = new List<Id>();

    for (Contact c : Trigger.new) {
        system.debug(c.PI_Convert__c);

        if (c.PI_Convert__c == true) {
            contactsToProcess.add(c.Id);
        }
    }

    if (!contactsToProcess.isEmpty()) {
        system.debug('Calling Queueable Job'+ contactsToProcess);
        System.enqueueJob(new PartnerUserCreationQueueable(contactsToProcess));
    }
}