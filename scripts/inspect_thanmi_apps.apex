List<IndividualApplication> apps = [
    SELECT Id, Name, Status, Organization_Name__c, Submitter_Name__c, AccountId, Account.Name, Account.IsPersonAccount, Account.WCF_Organizational_Name__c
    FROM IndividualApplication 
    WHERE Account.Name LIKE '%Thanmi%' OR Submitter_Name__c LIKE '%Thanmi%' OR Owner.Name LIKE '%Thanmi%'
];

for (IndividualApplication app : apps) {
    System.debug('App ID: ' + app.Id + ' | Status: ' + app.Status + ' | Org: ' + app.Organization_Name__c + ' | Submitter: ' + app.Submitter_Name__c + ' | Acc WCF Org: ' + app.Account.WCF_Organizational_Name__c);
}
