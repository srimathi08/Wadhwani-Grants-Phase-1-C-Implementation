Map<String, Schema.SObjectField> iaFields = Schema.SObjectType.IndividualApplication.fields.getMap();
System.debug('=== REQUIRED FIELDS ON IndividualApplication ===');
for (String fName : iaFields.keySet()) {
    Schema.DescribeFieldResult d = iaFields.get(fName).getDescribe();
    if (!d.isNillable() && !d.isDefaultedOnCreate()) {
        System.debug('REQUIRED FIELD: ' + d.getName() + ' (' + d.getLabel() + ') Type=' + d.getType());
    }
}
