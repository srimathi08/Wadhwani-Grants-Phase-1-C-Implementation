User portalUser = [SELECT Id FROM User WHERE Profile.Name LIKE '%Community%' AND IsActive = true LIMIT 1];
System.runAs(portalUser) {
    Map<String, Schema.SObjectField> fields = Schema.SObjectType.ApplicationReview.fields.getMap();
    for (String fName : new List<String>{'Attestation__c', 'Blocking_concern_Blocking_Identified__c', 'Mandatory_fields__c', 'Verification_reports__c', 'Geography_Within_WCF_Operating_Cluster__c', 'Mandate_fitFits_Job_CreationFulfilment__c', 'Decision_Final_Decision_from_Sec_1_2__c', 'Flag_rationale_Flagging_Criteria__c', 'Source_Channel_Source_of_Application__c', 'Budget_Range_Annual_Budget_Range__c', 'Question_Number__c'}) {
        if (fields.containsKey(fName)) {
            Schema.DescribeFieldResult d = fields.get(fName).getDescribe();
            System.debug('Portal User Field: ' + fName + ' | Type: ' + d.getType() + ' | isAccessible: ' + d.isAccessible());
        }
    }

    Map<String, Schema.SObjectField> iaFields = Schema.SObjectType.IndividualApplication.fields.getMap();
    for (String fName : new List<String>{'Name', 'AppliedDate', 'Primary_Focus_Area__c', 'Sub_Focus_Area__c', 'Status', 'Category', 'Due_Date__c', 'Organizational_Area_s_for_Funding_Inves__c'}) {
        if (iaFields.containsKey(fName)) {
            Schema.DescribeFieldResult d = iaFields.get(fName).getDescribe();
            System.debug('Portal User IA Field: ' + fName + ' | isAccessible: ' + d.isAccessible());
        }
    }
}
