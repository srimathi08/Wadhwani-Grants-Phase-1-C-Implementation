public with sharing class winAppTestController {
    
    //To get the user details when logged-in
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getLoggedInUserDetails() {
        Id userId = UserInfo.getUserId();
        User userRecord = [SELECT ContactId, AccountId FROM User WHERE Id = :userId LIMIT 1];
        
        if (userRecord == null || userRecord.ContactId == null) {
            throw new AuraHandledException('User details are incomplete.');
        }
        
        Contact contactRecord = [SELECT Id, AccountId FROM Contact WHERE Id = :userRecord.ContactId LIMIT 1];
        
        return new Map<String, String>{
            'AccountId' => contactRecord.AccountId,
                'ContactId' => contactRecord.Id
                };
                    }
    
        @AuraEnabled
    public static Id saveApplicationWithMilestones(Map<String, Object> applicationData, List<Milestone__c> milestones, List<Id> fileIds) {
        if (applicationData == null || applicationData.isEmpty()) {
            throw new AuraHandledException('Application data is required.');
        }

        IndividualApplication application = new IndividualApplication();
        for (String key : applicationData.keySet()) {
            application.put(key, applicationData.get(key));
        }

        if (!applicationData.containsKey('FundingOpportunityId') || String.isEmpty((String)applicationData.get('FundingOpportunityId'))) {
            throw new AuraHandledException('Funding Opportunity Id is required.');
        }

        insert application;

        if (milestones != null && !milestones.isEmpty()) {
            List<Milestone__c> milestonesToInsert = new List<Milestone__c>();
            for (Milestone__c m : milestones) {
                m.Individual_Application__c = application.Id;
                milestonesToInsert.add(m);
            }
            if (!milestonesToInsert.isEmpty()) {
                insert milestonesToInsert;
            }
        }
      return application.Id;
    } 
}