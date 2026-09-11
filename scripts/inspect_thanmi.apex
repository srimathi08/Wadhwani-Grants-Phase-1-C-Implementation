Account acc = [
    SELECT Id, Name, IsPersonAccount, WCF_Organizational_Name__c, Current_Organization__pc
    FROM Account 
    WHERE Id = '001e1000007m7PqAAI'
    LIMIT 1
];

System.debug('Account Name: ' + acc.Name);
System.debug('IsPersonAccount: ' + acc.IsPersonAccount);
System.debug('WCF_Organizational_Name__c: ' + acc.WCF_Organizational_Name__c);
System.debug('Current_Organization__pc: ' + acc.Current_Organization__pc);

// Also check User associated with Thanmi G
List<User> uList = [
    SELECT Id, Name, Email, AccountId, ContactId,
           Account.Name, Account.IsPersonAccount, Account.WCF_Organizational_Name__c,
           Contact.Name, Contact.Current_Organization__c
    FROM User 
    WHERE AccountId = '001e1000007m7PqAAI' OR Name LIKE '%Thanmi%'
];
for (User u : uList) {
    System.debug('User: ' + u.Name + ' | AccName: ' + u.Account.Name + ' | WCF_Org_Name: ' + u.Account.WCF_Organizational_Name__c);
}
