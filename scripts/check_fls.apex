for (FieldPermissions fp : [SELECT Parent.Profile.Name, Parent.Name, SObjectType, Field, PermissionsRead, PermissionsEdit 
                               FROM FieldPermissions 
                               WHERE SObjectType = 'IndividualApplication' AND Field = 'IndividualApplication.Submitted_notes__c']) {
    System.debug(LoggingLevel.ERROR, 'FLS: Parent=' + fp.Parent.Name + ' | Profile=' + fp.Parent.Profile.Name + ' | Read=' + fp.PermissionsRead + ' | Edit=' + fp.PermissionsEdit);
}
