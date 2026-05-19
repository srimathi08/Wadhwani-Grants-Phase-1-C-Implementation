public without sharing class ProposalLockController {
    @InvocableMethod(label='Lock or Unlock Individual Application')
    public static void lockOrUnlock(List<Request> requests) {
        for (Request req : requests) {
            if (req.recordId == null || String.isBlank(req.action)) continue;

            try {
                if (req.action.equalsIgnoreCase('Unlock')) {
                    Approval.unlock(req.recordId);
                    System.debug('Record unlocked successfully: ' + req.recordId);
                } else if (req.action.equalsIgnoreCase('Lock')) {
                    Approval.lock(req.recordId);
                    System.debug('Record locked successfully: ' + req.recordId);
                }
            } catch (Exception e) {
                System.debug('Error while locking/unlocking: ' + e.getMessage());
            }
        }
    }

    public class Request {
        @InvocableVariable(label='Record Id')
        public Id recordId;
        @InvocableVariable(label='Action (Lock/Unlock)')
        public String action;
    }
}