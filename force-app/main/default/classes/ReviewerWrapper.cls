public class ReviewerWrapper {
    @AuraEnabled public Id reviewerId;
    @AuraEnabled public String name;
    @AuraEnabled public String email;
    @AuraEnabled public String sharedProposals;
    @AuraEnabled public Integer proposalCount;
}