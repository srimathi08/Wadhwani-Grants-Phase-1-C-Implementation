User u = [
    SELECT Id, Name, FirstName, LastName, Email, Phone, MobilePhone, Title, AccountId, ContactId,
           Contact.FirstName, Contact.LastName, Contact.Name, Contact.Email, Contact.Phone, Contact.Title,
           Contact.Current_Organization__c,
           Account.Name, Account.IsPersonAccount, Account.WCF_Organizational_Name__c
    FROM User 
    WHERE Account.Name LIKE '%Thanmi%' OR Name LIKE '%Thanmi%'
    LIMIT 1
];

String defaultOrgName = '';
if (u.Account != null) {
    if (String.isNotBlank(u.Account.WCF_Organizational_Name__c)) {
        defaultOrgName = u.Account.WCF_Organizational_Name__c;
    } else if (u.Contact != null && String.isNotBlank(u.Contact.Current_Organization__c)) {
        defaultOrgName = u.Contact.Current_Organization__c;
    } else if (!u.Account.IsPersonAccount && String.isNotBlank(u.Account.Name)) {
        defaultOrgName = u.Account.Name;
    }
}

String subName = (u.Contact != null && String.isNotBlank(u.Contact.Name))
                 ? u.Contact.Name : u.Name;

System.debug('Submitter Name: ' + subName);
System.debug('Organization Name: ' + defaultOrgName);
