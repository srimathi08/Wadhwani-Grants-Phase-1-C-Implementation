trigger IndividualApplicationSuspensionTrigger on IndividualApplication (after update) {
    WCFSuspensionService.handleStatusChanges(Trigger.new, Trigger.oldMap);
}