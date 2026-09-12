Id appId = '0iTe10000000wC5EAI';
WCFValidatorController.WCFPreviewWrapper preview = WCFValidatorController.getWCFFullPreviewData(appId);
System.debug(LoggingLevel.ERROR, 'APP_OBJECT: ' + JSON.serialize(preview.application));
