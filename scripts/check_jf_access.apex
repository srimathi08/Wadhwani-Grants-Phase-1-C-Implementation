ApexClass jfClass = [SELECT Id, Name FROM ApexClass WHERE Name = 'WCF_ReviewFormJFController' LIMIT 1];
List<SetupEntityAccess> seaList = [SELECT Id, ParentId, Parent.Profile.Name, Parent.Label FROM SetupEntityAccess WHERE SetupEntityId = :jfClass.Id];
System.debug('SetupEntityAccess count for WCF_ReviewFormJFController: ' + seaList.size());
for (SetupEntityAccess sea : seaList) {
    System.debug('JF Access granted to Parent: ' + sea.Parent.Profile.Name + ' / ' + sea.Parent.Label);
}
