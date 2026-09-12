List<RFI_Question__mdt> listQ = [SELECT Id, DeveloperName, MasterLabel, Label__c, Question_Code__c, Section_Code__c, Display_Type__c, Field_API_Name__c FROM RFI_Question__mdt WHERE DeveloperName LIKE '%VOLUNTEER%'];
System.debug(LoggingLevel.ERROR, 'VOLUNTEER_MATCH_COUNT: ' + listQ.size());
for (RFI_Question__mdt r : listQ) {
    System.debug(LoggingLevel.ERROR, 'VOLUNTEER_ITEM: ' + JSON.serialize(r));
}
