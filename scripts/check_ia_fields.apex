for (Schema.PicklistEntry pe : Schema.SObjectType.IndividualApplication.fields.GenieAI_Interest_Level__c.getPicklistValues()) {
    System.debug('GenieAI Picklist: ' + pe.getValue() + ' (' + pe.getLabel() + ')');
}
