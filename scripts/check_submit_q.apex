for (RFI_Question__mdt q : [SELECT Id, DeveloperName, MasterLabel, Label__c, Question_Code__c, Section_Code__c, Display_Type__c, Field_API_Name__c, Target_Object__c FROM RFI_Question__mdt]) {
    String dev = q.DeveloperName != null ? q.DeveloperName : '';
    String lbl = q.Label__c != null ? q.Label__c : '';
    String fld = q.Field_API_Name__c != null ? q.Field_API_Name__c : '';
    if (dev.containsIgnoreCase('submit') || lbl.containsIgnoreCase('submit') || fld.containsIgnoreCase('submit') || dev.containsIgnoreCase('check') || lbl.containsIgnoreCase('check')) {
        System.debug(LoggingLevel.ERROR, 'MATCH_Q: Dev=' + dev + ' | Code=' + q.Question_Code__c + ' | Label=' + lbl + ' | Fld=' + fld + ' | Sec=' + q.Section_Code__c + ' | Type=' + q.Display_Type__c);
    }
}
