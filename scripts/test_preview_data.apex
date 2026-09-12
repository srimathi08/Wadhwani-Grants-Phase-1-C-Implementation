Id appId = [SELECT Id FROM IndividualApplication WHERE Name = 'IA-0000001056' LIMIT 1].Id;
WCFValidatorController.WCFPreviewWrapper res = WCFValidatorController.getWCFFullPreviewData(appId);
System.debug(LoggingLevel.ERROR, 'RES_APP: ' + res.application);
System.debug(LoggingLevel.ERROR, 'RES_APPDATA: ' + JSON.serialize(res.applicationData));
System.debug(LoggingLevel.ERROR, 'SUBMITTED_NOTES in applicationData: ' + res.applicationData.get('Submitted_notes__c'));
