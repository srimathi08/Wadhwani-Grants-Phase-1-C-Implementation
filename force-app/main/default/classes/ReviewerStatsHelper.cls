public class ReviewerStatsHelper {

    public static void recalculateStats(Set<Id> accountIds) {
        if (accountIds == null || accountIds.isEmpty()) return;

        List<Account> reviewerAccounts = [
            SELECT Id
            FROM Account
            WHERE Id IN :accountIds
              AND Reviewer__c = TRUE
              AND Reviewer_Registered__c = TRUE
        ];

        if (reviewerAccounts.isEmpty()) return;

        Set<Id> validAccountIds = new Set<Id>();
        for (Account acc : reviewerAccounts) {
            validAccountIds.add(acc.Id);
        }

        // Step 1: Get Contacts linked to these Accounts
        Map<Id, Id> accountToContactMap = new Map<Id, Id>();
        for (Contact c : [
            SELECT Id, AccountId
            FROM Contact
            WHERE AccountId IN :validAccountIds
        ]) {
            if (!accountToContactMap.containsKey(c.AccountId)) {
                accountToContactMap.put(c.AccountId, c.Id);
            }
        }

        // Step 2: Get Users linked to those Contacts
        Map<Id, Id> contactToUserMap = new Map<Id, Id>();
        if (!accountToContactMap.values().isEmpty()) {
            for (User u : [
                SELECT Id, ContactId
                FROM User
                WHERE ContactId IN :accountToContactMap.values()
                  AND IsActive = TRUE
            ]) {
                contactToUserMap.put(u.ContactId, u.Id);
            }
        }

        // Build AccountId -> UserId map
        Map<Id, Id> accountToUserMap = new Map<Id, Id>();
        for (Id accId : accountToContactMap.keySet()) {
            Id contactId = accountToContactMap.get(accId);
            if (contactToUserMap.containsKey(contactId)) {
                accountToUserMap.put(accId, contactToUserMap.get(contactId));
            }
        }

        // Step 3: Count ApplicationShare records per User
        Map<Id, Integer> userToShareCount = new Map<Id, Integer>();
        if (!accountToUserMap.values().isEmpty()) {
            for (AggregateResult ar : [
                SELECT UserOrGroupId, COUNT(Id) cnt
                FROM IndividualApplicationShare
                WHERE UserOrGroupId IN :accountToUserMap.values()
                GROUP BY UserOrGroupId
            ]) {
                Id userId = (Id) ar.get('UserOrGroupId');
                Integer cnt = (Integer) ar.get('cnt');
                userToShareCount.put(userId, cnt);
            }
        }

        // Step 4: Count ApplicationReview records per Account where Status = 'Review Submitted'
        Map<Id, Integer> accountToReviewCount = new Map<Id, Integer>();
        for (AggregateResult ar : [
            SELECT Reviewer__c, COUNT(Id) cnt
            FROM ApplicationReview
            WHERE Reviewer__c IN :validAccountIds
              AND Status = 'Review Submitted'
            GROUP BY Reviewer__c
        ]) {
            Id accId = (Id) ar.get('Reviewer__c');
            Integer cnt = (Integer) ar.get('cnt');
            accountToReviewCount.put(accId, cnt);
        }

        // Step 5: Build Account update list
        List<Account> accountsToUpdate = new List<Account>();
        for (Id accId : validAccountIds) {
            Integer assignedCount = 0;
            Integer reviewedCount = accountToReviewCount.containsKey(accId)
                ? accountToReviewCount.get(accId) : 0;

            if (accountToUserMap.containsKey(accId)) {
                Id userId = accountToUserMap.get(accId);
                if (userToShareCount.containsKey(userId)) {
                    assignedCount = userToShareCount.get(userId);
                }
            }

            Integer yetToReview = assignedCount - reviewedCount;
            if (yetToReview < 0) yetToReview = 0;

            accountsToUpdate.add(new Account(
                Id = accId,
                Proposals_Assigned__c = assignedCount,
                Proposals_Reviewed__c = reviewedCount,
                Proposals_Yet_to_Review__c = yetToReview
            ));
        }

        if (!accountsToUpdate.isEmpty()) {
            update accountsToUpdate;
        }
    }
}