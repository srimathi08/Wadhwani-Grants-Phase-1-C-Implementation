System.debug('=== CURRENT USER LICENSES & PERMISSION SETS ===');
User u = [SELECT Id, Name, Profile.Name, UserType FROM User WHERE Id = :UserInfo.getUserId()];
System.debug('User: ' + u.Name + ' | Profile: ' + u.Profile.Name + ' | UserType: ' + u.UserType);

List<PermissionSetAssignment> psaList = [SELECT PermissionSet.Name, PermissionSet.Label FROM PermissionSetAssignment WHERE AssigneeId = :UserInfo.getUserId()];
for (PermissionSetAssignment psa : psaList) {
    System.debug('PermissionSet: ' + psa.PermissionSet.Name + ' (' + psa.PermissionSet.Label + ')');
}

List<PermissionSetLicenseAssign> pslaList = [SELECT PermissionSetLicense.DeveloperName, PermissionSetLicense.MasterLabel FROM PermissionSetLicenseAssign WHERE AssigneeId = :UserInfo.getUserId()];
for (PermissionSetLicenseAssign psla : pslaList) {
    System.debug('PermissionSetLicense: ' + psla.PermissionSetLicense.DeveloperName + ' (' + psla.PermissionSetLicense.MasterLabel + ')');
}
