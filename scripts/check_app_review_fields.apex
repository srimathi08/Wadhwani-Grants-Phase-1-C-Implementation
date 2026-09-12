Map<String, Schema.SObjectField> fMap = Schema.SObjectType.ApplicationReview.fields.getMap();
List<String> fieldNames = new List<String>();
for (String f : fMap.keySet()) {
    if (f.endsWith('__c')) {
        fieldNames.add(f);
    }
}
fieldNames.sort();
System.debug('APPLICATION_REVIEW_CUSTOM_FIELDS: ' + String.join(fieldNames, ', '));
