public class ReviewerWrapperGenerator {

    public class ReviewerWrapper {
        @InvocableVariable public Id reviewerId;
        @InvocableVariable public String name;
        @InvocableVariable public String email;
        @InvocableVariable public String sharedProposals;
        @InvocableVariable public Integer proposalCount;
    }

    public class WrapperResponse {
        @InvocableVariable
        public List<ReviewerWrapper> reviewerList;
    }

    @InvocableMethod(label='Get Reviewer Wrappers')
    public static List<WrapperResponse> getReviewerWrappers(List<Id> reviewerIds) {
        Map<Id, Account> accMap = new Map<Id, Account>([
            SELECT Id, Name, PersonEmail FROM Account WHERE Id IN :reviewerIds
        ]);

        Map<Id, List<String>> sharesMap = new Map<Id, List<String>>();
        Map<Id, Integer> countMap = new Map<Id, Integer>();

        List<User> users = [SELECT Id, ContactId FROM User WHERE ContactId IN :reviewerIds];
        Map<Id, Id> contactToUser = new Map<Id, Id>();
        for (User u : users) {
            contactToUser.put(u.ContactId, u.Id);
        }

        Set<Id> userIds = new Set<Id>(contactToUser.values());

        for (AggregateResult result : [
            SELECT UserOrGroupId userId, COUNT(Id) total
            FROM IndividualApplicationShare
            WHERE UserOrGroupId IN :userIds
            GROUP BY UserOrGroupId
        ]) {
            Id uid = (Id) result.get('userId');
            for (Id cid : contactToUser.keySet()) {
                if (contactToUser.get(cid) == uid) {
                    countMap.put(cid, (Integer) result.get('total'));
                    break;
                }
            }
        }

        for (IndividualApplicationShare share : [
            SELECT UserOrGroupId, Parent.Name
            FROM IndividualApplicationShare
            WHERE UserOrGroupId IN :userIds
        ]) {
            for (Id cid : contactToUser.keySet()) {
                if (contactToUser.get(cid) == share.UserOrGroupId) {
                    if (!sharesMap.containsKey(cid)) {
                        sharesMap.put(cid, new List<String>());
                    }
                    sharesMap.get(cid).add(share.Parent.Name);
                    break;
                }
            }
        }

        List<ReviewerWrapper> rwList = new List<ReviewerWrapper>();
        for (Id rid : reviewerIds) {
            Account a = accMap.get(rid);
            ReviewerWrapper rw = new ReviewerWrapper();
            rw.reviewerId = a.Id;
            rw.name = a.Name;
            rw.email = a.PersonEmail;
            rw.sharedProposals = sharesMap.containsKey(rid) ? String.join(sharesMap.get(rid), ', ') : 'None';
            rw.proposalCount = countMap.containsKey(rid) ? countMap.get(rid) : 0;
            rwList.add(rw);
        }

        WrapperResponse response = new WrapperResponse();
        response.reviewerList = rwList;

        return new List<WrapperResponse>{ response };
    }
}