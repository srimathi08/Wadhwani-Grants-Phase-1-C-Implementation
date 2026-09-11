System.debug('=== CHECKING LICENSE TYPE FIELDS ACROSS OBJECTS ===');
for (String objName : new List<String>{'IndividualApplication', 'FundingOpportunity', 'Account', 'Contact', 'User'}) {
    Map<String, Schema.SObjectField> fMap = Schema.getGlobalDescribe().get(objName).getDescribe().fields.getMap();
    for (String fName : fMap.keySet()) {
        if (fName.contains('license')) {
            System.debug(objName + '.' + fMap.get(fName).getDescribe().getName() + ' (' + fMap.get(fName).getDescribe().getLabel() + ')');
        }
    }
}
