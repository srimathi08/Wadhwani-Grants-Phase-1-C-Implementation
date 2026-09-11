List<User> users = [SELECT Id, Name, Email, Profile.Name, UserRole.Name, IsActive FROM User WHERE IsActive = true AND (Profile.Name LIKE '%Community%' OR Profile.Name LIKE '%Portal%' OR Profile.Name LIKE '%Customer%' OR Profile.Name LIKE '%Partner%' OR Profile.Name LIKE '%WCF%') LIMIT 10];
for (User u : users) {
    System.debug('User: ' + u.Id + ' | Name: ' + u.Name + ' | Profile: ' + u.Profile.Name);
}
