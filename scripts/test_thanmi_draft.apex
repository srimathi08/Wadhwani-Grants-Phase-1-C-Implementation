User currentUser = [
    SELECT Id, Name, FirstName, LastName, Email, Phone, MobilePhone, Title, AccountId, ContactId,
           Contact.FirstName, Contact.LastName, Contact.Name, Contact.Email, Contact.Phone, Contact.Title,
           Contact.Current_Organization__c,
           Account.Name, Account.IsPersonAccount, Account.WCF_Organizational_Name__c
    FROM User 
    WHERE Account.Name LIKE '%Thanmi%' OR Name LIKE '%Thanmi%'
    LIMIT 1
];

String defaultOrgName = '';
if (currentUser.Account != null) {
    if (String.isNotBlank(currentUser.Account.WCF_Organizational_Name__c)) {
        defaultOrgName = currentUser.Account.WCF_Organizational_Name__c;
    } else if (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Current_Organization__c)) {
        defaultOrgName = currentUser.Contact.Current_Organization__c;
    } else if (!currentUser.Account.IsPersonAccount && String.isNotBlank(currentUser.Account.Name)) {
        defaultOrgName = currentUser.Account.Name;
    }
}

String subName = (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Name))
                 ? currentUser.Contact.Name : currentUser.Name;

System.debug('Submitter Name: ' + subName);
System.debug('Organization Name: ' + defaultOrgName);
