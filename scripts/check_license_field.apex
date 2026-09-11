Map<String, Schema.SObjectField> iaFields = Schema.SObjectType.IndividualApplication.fields.getMap();
System.debug('=== INDIVIDUAL APPLICATION FIELDS CONTAINING LICENSE ===');
for (String f : iaFields.keySet()) {
    if (f.contains('license')) {
        Schema.DescribeFieldResult d = iaFields.get(f).getDescribe();
        System.debug('IA Field: ' + d.getName() + ' | Label: ' + d.getLabel() + ' | Required: ' + d.isNillable());
    }
}

Map<String, Schema.SObjectField> foFields = Schema.SObjectType.FundingOpportunity.fields.getMap();
System.debug('=== FUNDING OPPORTUNITY FIELDS CONTAINING LICENSE ===');
for (String f : foFields.keySet()) {
    if (f.contains('license')) {
        Schema.DescribeFieldResult d = foFields.get(f).getDescribe();
        System.debug('FO Field: ' + d.getName() + ' | Label: ' + d.getLabel() + ' | Required: ' + d.isNillable());
    }
}
