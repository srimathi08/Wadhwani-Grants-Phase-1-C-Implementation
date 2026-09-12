Map<String, Schema.SObjectField> fMap = Schema.SObjectType.ApplicationReview.fields.getMap();
for (String fName : new List<String>{'notes_for_reviewers__c', 'rationale_for_scoring__c', 'overall_remarks__c', 'decision_rationale__c', 'mandatory_fields__c'}) {
    if (fMap.containsKey(fName)) {
        Schema.DescribeFieldResult d = fMap.get(fName).getDescribe();
        System.debug('FIELD ' + fName + ': Type=' + d.getType() + ', Length=' + d.getLength());
    }
}
