public without sharing class CoeHomeStatsController {

    @AuraEnabled(cacheable=true)
    public static HomeStatsWrapper getHomeStats() {

        HomeStatsWrapper w = new HomeStatsWrapper();

        // 1️⃣ Resolve logged-in user contact + account
        User u = [
            SELECT ContactId,
                   Contact.AccountId,
                   Contact.COE_Admin__c
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        // Safety check
        if (u.ContactId == null || u.Contact.AccountId == null) {
            return w;
        }

        // 2️⃣ Allow ONLY COE Admins to see stats
        if (u.Contact.COE_Admin__c != true) {
            return w;
        }

        Id accId = u.Contact.AccountId;

        // 3️⃣ Registered PIs (SYSTEM CONTEXT – required for Partner users)
        w.registeredPIs = Database.countQuery(
            'SELECT COUNT() ' +
            'FROM Contact ' +
            'WHERE AccountId = \'' + accId + '\' ' +
            'AND COE_PI__c = true'
        );

        // 4️⃣ Pending Reviews (account-scoped)
        w.pendingReviews = [
            SELECT COUNT()
            FROM IndividualApplication
            WHERE Status = 'Proposal Submitted to COE Admin'
            AND AccountId = :accId
        ];

        // 5️⃣ Submitted to WIN
        w.submittedToWIN = [
            SELECT COUNT()
            FROM IndividualApplication
            WHERE Status = 'Proposal Submitted to WIN Admin'
            AND AccountId = :accId
        ];

        // 6️⃣ Total Awarded
        Decimal totalAward = 0;
        AggregateResult arAward = [
            SELECT SUM(Amount) total
            FROM FundingAward
            WHERE AwardeeId = :accId
        ];
        if (arAward.get('total') != null) {
            totalAward = (Decimal) arAward.get('total');
        }

        // 7️⃣ Total Disbursed
        Decimal totalDisbursed = 0;
        AggregateResult arDisbursed = [
            SELECT SUM(Amount) total
            FROM FundingDisbursement
            WHERE Awardee__c = :accId
        ];
        if (arDisbursed.get('total') != null) {
            totalDisbursed = (Decimal) arDisbursed.get('total');
        }

        w.availableFunds = totalAward - totalDisbursed;

        return w;
    }

    public class HomeStatsWrapper {
        @AuraEnabled public Integer registeredPIs = 0;
        @AuraEnabled public Integer pendingReviews = 0;
        @AuraEnabled public Integer submittedToWIN = 0;
        @AuraEnabled public Decimal availableFunds = 0;
    }
}