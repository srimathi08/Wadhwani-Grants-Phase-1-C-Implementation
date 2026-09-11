Account acc = [
    SELECT Id, Name, IsPersonAccount
    FROM Account 
    WHERE Id = '001e1000007m7PqAAI'
    LIMIT 1
];

System.debug('Account Name: ' + acc.Name);
System.debug('IsPersonAccount: ' + acc.IsPersonAccount);

// Describe Account fields to find the API name for 'WCF Organizational Name' or similar
Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.Account.fields.getMap();
for (String fName : fieldMap.keySet()) {
    Schema.DescribeFieldResult dfr = fieldMap.get(fName).getDescribe();
    if (dfr.getLabel().toLowerCase().contains('organ') || dfr.getName().toLowerCase().contains('organ')) {
        System.debug('Field Name: ' + dfr.getName() + ' | Label: ' + dfr.getLabel());
    }
}
