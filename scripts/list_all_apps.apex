for (IndividualApplication a : [SELECT Id, Name, Status, CreatedDate FROM IndividualApplication ORDER BY CreatedDate DESC LIMIT 10]) {
    System.debug(LoggingLevel.ERROR, 'APP_RECORD: ' + a.Id + ' | Name: ' + a.Name + ' | Status: ' + a.Status + ' | Created: ' + a.CreatedDate);
}
