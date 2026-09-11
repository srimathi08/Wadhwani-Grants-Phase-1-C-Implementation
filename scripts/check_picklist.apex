Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.IndividualApplication.fields.getMap();
System.debug('=== PICKLIST / MULTIPICKLIST FIELDS ON IndividualApplication ===');
for (String fName : fieldMap.keySet()) {
    Schema.DescribeFieldResult d = fieldMap.get(fName).getDescribe();
    if (d.getType() == Schema.DisplayType.PICKLIST || d.getType() == Schema.DisplayType.MULTIPICKLIST) {
        System.debug('FIELD: ' + d.getName() + ' | Label: ' + d.getLabel() + ' | Type: ' + d.getType());
        List<String> vals = new List<String>();
        for (Schema.PicklistEntry ple : d.getPicklistValues()) {
            if (ple.isActive()) {
                vals.add(ple.getValue() + ' (' + ple.getLabel() + ')');
            }
        }
        System.debug('   VALUES: ' + String.join(vals, ' | '));
    }
}
