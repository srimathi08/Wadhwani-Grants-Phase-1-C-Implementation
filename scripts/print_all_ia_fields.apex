Map<String, Schema.SObjectField> iaFields = Schema.SObjectType.IndividualApplication.fields.getMap();
System.debug('=== ALL FIELDS ON IndividualApplication ===');
for (String fName : iaFields.keySet()) {
    Schema.DescribeFieldResult d = iaFields.get(fName).getDescribe();
    System.debug(d.getName() + ' => Label: ' + d.getLabel() + ' | Type: ' + d.getType());
}
