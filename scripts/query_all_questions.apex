RFI_Question__mdt q = [SELECT DeveloperName, MasterLabel, Label__c, Question_Code__c, Section_Code__c, Display_Type__c, Field_API_Name__c, Target_Object__c FROM RFI_Question__mdt WHERE DeveloperName = 'Q3_Submitted_notes'];
System.debug(LoggingLevel.ERROR, 'Q3_Submitted_notes: ' + JSON.serialize(q));
