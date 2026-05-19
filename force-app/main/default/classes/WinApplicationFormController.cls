public with sharing class WinApplicationFormController {
    
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getLoggedInUserDetails() {
        User u = [SELECT Id, ContactId, AccountId, Name FROM User WHERE Id = :UserInfo.getUserId()  LIMIT 1];
        Map<String, String> userDetails = new Map<String, String>();
        
        if (u.ContactId != null) {
            Contact c = [SELECT Id, Name, AccountId, COE_Admin__c, Email, Phone FROM Contact WHERE Id = :u.ContactId AND COE_Admin__c = TRUE  LIMIT 1];
            userDetails.put('ContactId', c.Id);
            userDetails.put('ContactName', c.Name);
            userDetails.put('AccountId', c.AccountId);
            userDetails.put('Email',c.Email);
            
            if (c.AccountId != null) {
                Account a = [SELECT Id, Name FROM Account WHERE Id = :c.AccountId LIMIT 1];
                userDetails.put('AccountName', a.Name);
            }
        }
        
        return userDetails;
    }
    
    
    @AuraEnabled(cacheable=true)
    public static Id getActiveFundingOpportunityId() {
        try {
            FundingOpportunity fo = [SELECT Id, Name, Status, FO_Type__c FROM FundingOpportunity Where Status = 'Active'
                                     AND FO_Type__c = 'Project Proposal' LIMIT 1];
            system.debug('Fo Id'+ fo.Id);
            return fo.Id;
        } catch (Exception e) {
            throw new AuraHandledException('No active funding opportunity found.');
        }
    }
      
    
   @AuraEnabled
public static Id saveApplicationWithMilestones(
    Map<String, Object> applicationData,
    List<Map<String, Object>> milestones,
    List<Id> fileIds
) {
    Id userId = UserInfo.getUserId();
    User u = [SELECT Id, ContactId, AccountId FROM User WHERE Id = :userId LIMIT 1];

    // Check if an existing draft exists
    Id existingDraftId;
    List<IndividualApplication> existingDrafts = [
        SELECT Id
        FROM IndividualApplication
        WHERE COE_Admin__c = :userId AND Status = 'Draft'
        ORDER BY CreatedDate DESC
        LIMIT 1
    ];
    if (!existingDrafts.isEmpty()) {
        existingDraftId = existingDrafts[0].Id;
    }

    // Build the Individual Application record
    IndividualApplication appRecord = new IndividualApplication();
    appRecord.Category = 'Grant Application';
    appRecord.Status = (String)applicationData.get('Status__c');
    appRecord.Institution_Name__c = u.AccountId;

    for (String key : applicationData.keySet()) {
        Object fieldValue = applicationData.get(key);

        if (key == 'Id' && String.isNotBlank((String)fieldValue)) {
            appRecord.Id = (Id)fieldValue;
        } else if (key.endsWith('__c') && fieldValue != null) {
            if (fieldValue instanceof String && key.endsWith('_Date__c')) {
                appRecord.put(key, Date.valueOf((String) fieldValue));
            } else if (fieldValue instanceof List<Object>) {
                List<String> strList = new List<String>();
                for (Object o : (List<Object>) fieldValue) {
                    strList.add(String.valueOf(o));
                }
                appRecord.put(key, String.join(strList, ';'));
            } else {
                appRecord.put(key, fieldValue);
            }
        }
    }

    // Set user-related fields for new records
    if (appRecord.Id == null) {
        appRecord.COE_Admin__c = u.ContactId;
        appRecord.Institution_Name__c = u.AccountId;
    }

    // Insert/Update the application
    try {
        upsert appRecord;
    } catch (Exception e) {
        throw new AuraHandledException('Application Save Failed: ' + e.getMessage());
    }

    // Safely insert milestones if any
    if (milestones != null && !milestones.isEmpty()) {
        List<Milestone__c> milestoneRecords = new List<Milestone__c>();

        for (Map<String, Object> m : milestones) {
            if (m == null || m.isEmpty()) continue;

            Boolean isBlank = true;
            for (Object v : m.values()) {
                if (v != null && String.valueOf(v).trim() != '') {
                    isBlank = false;
                    break;
                }
            }
            if (isBlank) continue;

            Milestone__c ms = new Milestone__c();
            ms.Individual_Application__c = appRecord.Id;

            for (String key : m.keySet()) {
                Object val = m.get(key);
                if (val != null && key.endsWith('__c')) {
                    try {
                        // Handle decimals safely
                        if (key.contains('Amount') || key.contains('Cost') || key.contains('Budget') || key.contains('Value') || key.contains('Year')) {
                            ms.put(key, Decimal.valueOf(String.valueOf(val)));
                        } else if (val instanceof List<Object>) {
                            List<String> strList = new List<String>();
                            for (Object o : (List<Object>) val) {
                                strList.add(String.valueOf(o));
                            }
                            ms.put(key, String.join(strList, ';'));
                        } else if (val instanceof String && key.endsWith('_Date__c')) {
                            ms.put(key, Date.valueOf((String)val));
                        } else {
                            ms.put(key, val);
                        }
                    } catch (Exception ex) {
                        System.debug('⚠️ Skipped invalid value for field ' + key + ': ' + val);
                    }
                }
            }

            ms.Status__c = (String)applicationData.get('Status__c');
            milestoneRecords.add(ms);
        }

        try {
            if (!milestoneRecords.isEmpty()) {
                upsert milestoneRecords;
            }
        } catch (Exception e) {
            throw new AuraHandledException('Milestone Save Failed: ' + e.getMessage());
        }
    }

    // Link uploaded files
    if (fileIds != null && !fileIds.isEmpty()) {
        List<ContentDocumentLink> links = new List<ContentDocumentLink>();
        for (Id fileId : fileIds) {
            links.add(new ContentDocumentLink(
                ContentDocumentId = fileId,
                LinkedEntityId = appRecord.Id,
                ShareType = 'V'
            ));
        }
        insert links;
    }

    return appRecord.Id;
}

}