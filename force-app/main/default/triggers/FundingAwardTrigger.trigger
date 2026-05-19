trigger FundingAwardTrigger on FundingAward (after insert) {
    FundingAwardTriggerHandler.afterInsert(Trigger.new);
}