Map<String, Schema.SObjectField> fields = Schema.SObjectType.ApplicationReview.fields.getMap();
for (String fName : new List<String>{'Attestation__c', 'Blocking_concern_Blocking_Identified__c', 'Mandatory_fields__c', 'Verification_reports__c', 'Geography_Within_WCF_Operating_Cluster__c', 'Mandate_fitFits_Job_CreationFulfilment__c', 'Decision_Final_Decision_from_Sec_1_2__c', 'Flag_rationale_Flagging_Criteria__c', 'Source_Channel_Source_of_Application__c', 'Budget_Range_Annual_Budget_Range__c', 'Question_Number__c'}) {
    if (fields.containsKey(fName)) {
        Schema.DescribeFieldResult d = fields.get(fName).getDescribe();
        System.debug('Field: ' + fName + ' | Type: ' + d.getType() + ' | isAccessible: ' + d.isAccessible());
    } else {
        System.debug('Field: ' + fName + ' NOT FOUND in schema!');
    }
}
