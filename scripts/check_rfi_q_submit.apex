for (RFI_Question__mdt q : [SELECT DeveloperName, MasterLabel, Label__c, Field_API_Name__c, Target_Object__c, Section_Code__c FROM RFI_Question__mdt]) {
    if (q.DeveloperName.contains('Submit') || (q.Field_API_Name__c != null && q.Field_API_Name__c.contains('Submit'))) {
        System.debug(LoggingLevel.ERROR, 'RFI_Q: DevName=' + q.DeveloperName + ' | Field=' + q.Field_API_Name__c + ' | TargetObj=' + q.Target_Object__c);
    }
}
