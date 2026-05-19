public without sharing class UpdatePortalContact {
    
    @InvocableMethod
    public static void updateContact(List<ContactInput> requestList) {

        // Collect Contact Ids
        Set<Id> contactIds = new Set<Id>();
        for (ContactInput req : requestList) {
            if (req.ContactId != null) {
                contactIds.add(req.ContactId);
            }
        }

        // Query existing Contact records to ensure we only update
        Map<Id, Contact> existingContacts = new Map<Id, Contact>(
            [SELECT Id FROM Contact WHERE Id IN :contactIds]
        );

        List<Contact> contactsToUpdate = new List<Contact>();

        for (ContactInput req : requestList) {
            if (existingContacts.containsKey(req.ContactId)) {

                Contact c = new Contact(
                    Id = req.ContactId,
                   
                    Phone = req.Phone,
                    Category_of_Applicant__c = req.CategoryOfApplicant,
                    Designation__c = req.Designation,
                  
                    Department__c = req.Department
                );

                contactsToUpdate.add(c);
            }
        }

        if (!contactsToUpdate.isEmpty()) {
            update contactsToUpdate;
        }
    }

    public class ContactInput {
        @InvocableVariable public Id ContactId;
        
        @InvocableVariable public String Phone;
        @InvocableVariable public String CategoryOfApplicant;
        @InvocableVariable public String Designation;
       
        @InvocableVariable public String Department;
    }
}