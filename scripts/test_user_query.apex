List<User> users = [
    SELECT Id, Name, FirstName, LastName, Email, Phone, MobilePhone, Title, AccountId, ContactId,
           Contact.FirstName, Contact.LastName, Contact.Name, Contact.Email, Contact.Phone, Contact.Title,
           Account.Name, Profile.Name
    FROM User 
    WHERE IsActive = true 
    AND (Profile.Name LIKE '%Community%' OR Profile.Name LIKE '%WCF%' OR ContactId != null)
    LIMIT 10
];

for (User u : users) {
    System.debug('User: ' + u.Name + ' | Email: ' + u.Email + ' | Phone: ' + u.Phone + ' | Title: ' + u.Title + ' | Profile: ' + u.Profile.Name);
    if (u.ContactId != null) {
        System.debug('  -> Contact: ' + u.Contact.Name + ' | Email: ' + u.Contact.Email + ' | Phone: ' + u.Contact.Phone + ' | Title: ' + u.Contact.Title);
    }
    if (u.AccountId != null) {
        System.debug('  -> Account: ' + u.Account.Name);
    }
}
