List<RecordType> rts = [SELECT Id, Name, DeveloperName FROM RecordType WHERE SObjectType = 'ApplicationReview'];
for (RecordType rt : rts) {
    System.debug('APPLICATION_REVIEW_RT: ' + rt.DeveloperName + ' (' + rt.Name + ') Id=' + rt.Id);
}
