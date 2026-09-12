for (RecordType rt : [SELECT Id, Name, DeveloperName, SObjectType, IsActive FROM RecordType WHERE SObjectType = 'IndividualApplication']) {
    System.debug(LoggingLevel.ERROR, 'RECORD_TYPE: ' + rt.Id + ' | Name: "' + rt.Name + '" | DevName: "' + rt.DeveloperName + '" | Active: ' + rt.IsActive);
}
