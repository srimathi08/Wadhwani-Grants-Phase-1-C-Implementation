for (String fName : new List<String>{'Attestation__c', 'Mandatory_fields__c', 'Verification_reports__c', 'Blocking_concern_Blocking_Identified__c', 'Geography_Within_WCF_Operating_Cluster__c', 'Mandate_fitFits_Job_CreationFulfilment__c', 'Decision_Final_Decision_from_Sec_1_2__c', 'Flag_rationale_Flagging_Criteria__c', 'Source_Channel_Source_of_Application__c', 'Budget_Range_Annual_Budget_Range__c'}) {
    Schema.DescribeFieldResult d = Schema.SObjectType.ApplicationReview.fields.getMap().get(fName).getDescribe();
    List<String> vals = new List<String>();
    for (Schema.PicklistEntry pe : d.getPicklistValues()) {
        vals.add(pe.getValue() + ' (' + pe.getLabel() + ')');
    }
    System.debug('Picklist ' + fName + ': ' + String.join(vals, ', '));
}
