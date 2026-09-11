trigger WCFComplianceDocumentTrigger on WCF_Compliance_Document__c (after update, after insert) {
    Set<Id> applicationIds = new Set<Id>();

    for (WCF_Compliance_Document__c doc : Trigger.new) {
        if (doc.IndividualApplication__c == null) continue;

        if (Trigger.isInsert) {
            applicationIds.add(doc.IndividualApplication__c);
        } else {
            WCF_Compliance_Document__c oldDoc = Trigger.oldMap.get(doc.Id);
            if (oldDoc.Status__c != doc.Status__c) {
                applicationIds.add(doc.IndividualApplication__c);
            }
        }
    }

    if (!applicationIds.isEmpty()) {
        WCFComplianceDocumentTriggerHandler.syncOnboardedStatus(applicationIds);
    }
}