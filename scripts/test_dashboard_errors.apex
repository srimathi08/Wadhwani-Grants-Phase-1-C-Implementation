try {
    System.debug('Testing WCFValidatorController.getActionCounts()...');
    Map<String, Integer> counts = WCFValidatorController.getActionCounts();
    System.debug('getActionCounts result: ' + counts);
} catch (Exception e) {
    System.debug('getActionCounts EXCEPTION: ' + e.getTypeName() + ': ' + e.getMessage() + '\n' + e.getStackTraceString());
}

try {
    System.debug('Testing WCFValidatorController.getApplicationList()...');
    Object apps = WCFValidatorController.getApplicationList();
    System.debug('getApplicationList success: ' + apps);
} catch (Exception e) {
    System.debug('getApplicationList EXCEPTION: ' + e.getTypeName() + ': ' + e.getMessage() + '\n' + e.getStackTraceString());
}

try {
    System.debug('Testing wcfHomeDashboardController.getPipelineCounts()...');
    Object pipeline = wcfHomeDashboardController.getPipelineCounts();
    System.debug('getPipelineCounts result: ' + pipeline);
} catch (Exception e) {
    System.debug('getPipelineCounts EXCEPTION: ' + e.getTypeName() + ': ' + e.getMessage() + '\n' + e.getStackTraceString());
}
