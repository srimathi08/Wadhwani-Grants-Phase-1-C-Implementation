List<User> users = [SELECT Id, Name, ProfileId, Profile.Name, UserType FROM User WHERE UserType IN ('PowerPartner', 'CspLitePortal', 'CustomerSuccess', 'PowerCustomerSuccess', 'Standard') AND IsActive = true ORDER BY LastLoginDate DESC NULLS LAST LIMIT 10];
for (User u : users) {
    System.debug('User: ' + u.Name + ' (Profile=' + u.Profile.Name + ', ProfileId=' + u.ProfileId + ', UserType=' + u.UserType + ')');
}

// Find all permission sets
List<PermissionSet> psets = [SELECT Id, Name, Label FROM PermissionSet WHERE Name LIKE '%Review%' OR Name LIKE '%WCF%' OR Name LIKE '%Grant%' OR Name LIKE '%Approver%' OR Name LIKE '%Validator%'];
for (PermissionSet ps : psets) {
    System.debug('PermissionSet: ' + ps.Name + ' (' + ps.Label + ') Id=' + ps.Id);
}

// Check which profiles have access to WCFReviewerMetadataController
ApexClass metaClass = [SELECT Id, Name FROM ApexClass WHERE Name = 'WCFReviewerMetadataController' LIMIT 1];
List<SetupEntityAccess> seaList = [SELECT Id, ParentId, Parent.Profile.Name, Parent.Label FROM SetupEntityAccess WHERE SetupEntityId = :metaClass.Id];
System.debug('SetupEntityAccess count for WCFReviewerMetadataController: ' + seaList.size());
for (SetupEntityAccess sea : seaList) {
    System.debug('Access granted to Parent: ' + sea.Parent.Profile.Name + ' / ' + sea.Parent.Label);
}
