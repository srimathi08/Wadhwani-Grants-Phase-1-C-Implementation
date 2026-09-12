Map<String, Schema.SObjectField> flds = Schema.SObjectType.IndividualApplication.fields.getMap();
for (String f : flds.keySet()) {
    if (f.contains('submit') || f.contains('check')) {
        Schema.DescribeFieldResult dfr = flds.get(f).getDescribe();
        System.debug(LoggingLevel.ERROR, 'FIELD: API=' + dfr.getName() + ' | Type=' + dfr.getType() + ' | Label=' + dfr.getLabel());
    }
}
