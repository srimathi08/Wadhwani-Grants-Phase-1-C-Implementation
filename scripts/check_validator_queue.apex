Map<String, Integer> counts = WCFValidatorController.getActionCounts();
System.debug('COUNTS: ' + JSON.serialize(counts));

List<IndividualApplication> apps = [SELECT Id, Name, Status, RecordType.DeveloperName FROM IndividualApplication WHERE Status = 'Application Resubmitted'];
for (IndividualApplication a : apps) {
    System.debug('RESUBMITTED APP: ' + a.Name + ' | ' + a.Status + ' | ' + a.RecordType.DeveloperName);
}

List<WCFValidatorController.ApplicationWrapper> appList = WCFValidatorController.getApplicationList();
System.debug('TOTAL IN VALIDATOR QUEUE: ' + appList.size());
for (WCFValidatorController.ApplicationWrapper s : appList) {
    if (s.isResubmission == true || s.application.Status == 'Application Resubmitted') {
        System.debug('FOUND RESUBMISSION IN QUEUE: ' + s.application.Name + ' | ' + s.application.Account.Name + ' | status=' + s.application.Status + ' | isResubmit=' + s.isResubmission);
    }
}
