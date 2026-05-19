public without sharing class CoeHomeFundController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Decimal> getFundSummary() {

        Map<String, Decimal> result = new Map<String, Decimal>{
            'totalReceived' => 0,
            'disbursed' => 0,
            'available' => 0,
            'projectGrantReceived' => 0,
            'operationalGrantReceived' => 0,
            'availableProjectGrant' => 0,
            'availableOperationalGrant' => 0,
            'totalProjectsFunded' => 0,
            'grantAvailable' => 0,
            'avgTRL' => 0,
            'expectedTRL' => 0,
            'duration' => 0
        };

        User u = [
            SELECT Contact.AccountId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        if (u.Contact == null || u.Contact.AccountId == null) {
            return result;
        }

        Id accId = u.Contact.AccountId;

        // TOTAL RECEIVED
        AggregateResult arTotal = [
            SELECT SUM(Amount) total
            FROM FundingAward
            WHERE AwardeeId = :accId
        ];

        Decimal total = (Decimal) arTotal.get('total');
        if (total == null) total = 0;

        // FUND SPLIT
        Decimal projectGrantReceived = 0;
        Decimal operationalGrantReceived = 0;

        for (AggregateResult ar : [
            SELECT Type_of_Fund__c fundType, SUM(Amount) total
            FROM FundingAward
            WHERE AwardeeId = :accId
            GROUP BY Type_of_Fund__c
        ]) {
            Decimal amt = (Decimal) ar.get('total');
            if (amt == null) amt = 0;

            String fundType = (String) ar.get('fundType');

            if (fundType == 'COE Project Grant') {
                projectGrantReceived += amt;
            } else if (fundType == 'COE Operational Grant') {
                operationalGrantReceived += amt;
            }
        }

        // APPROVED PROJECTS
        List<IndividualApplication> apps = [
            SELECT 
                Id,
                Current_Technology_Readiness_Level_TRL__c,
                Expected_TRL_at_the_end_of_the_Project__c,
                Project_Duration__c
            FROM IndividualApplication
            WHERE Status = 'Approved for Funding'
            AND AccountId = :accId
        ];

        result.put('totalProjectsFunded', apps.size());

        // DISBURSED
        Decimal disbursed = 0;

        if (!apps.isEmpty()) {
            Set<Id> appIds = new Set<Id>();
            for (IndividualApplication ia : apps) {
                appIds.add(ia.Id);
            }

            AggregateResult arDisb = [
                SELECT SUM(Amount) total
                FROM FundingDisbursement
                WHERE Proposal__c IN :appIds
            ];

            disbursed = (Decimal) arDisb.get('total');
            if (disbursed == null) disbursed = 0;
        }

        // TRL + METRICS (FIXED FOR NUMERIC PICKLIST)
        Decimal totalTRL = 0;
        Decimal totalExpectedTRL = 0;
        Decimal totalDuration = 0;
        Integer count = 0;

        for (IndividualApplication ia : apps) {
            count++;

            try {
                if (ia.Current_Technology_Readiness_Level_TRL__c != null) {
                    totalTRL += Decimal.valueOf(ia.Current_Technology_Readiness_Level_TRL__c);
                }
            } catch (Exception e) {}

            try {
                if (ia.Expected_TRL_at_the_end_of_the_Project__c != null) {
                    totalExpectedTRL += Decimal.valueOf(ia.Expected_TRL_at_the_end_of_the_Project__c);
                }
            } catch (Exception e) {}

            if (ia.Project_Duration__c != null) {
                totalDuration += ia.Project_Duration__c;
            }
        }

        if (count > 0) {
            result.put('avgTRL', totalTRL / count);
            result.put('expectedTRL', totalExpectedTRL / count);
            result.put('duration', totalDuration / count);
        }

        // FINAL CALCULATIONS
        Decimal available = total - disbursed;
        Decimal availableProjectGrant = projectGrantReceived - disbursed;
        if (availableProjectGrant < 0) availableProjectGrant = 0;

        result.put('totalReceived', total);
        result.put('disbursed', disbursed);
        result.put('available', available);
        result.put('projectGrantReceived', projectGrantReceived);
        result.put('operationalGrantReceived', operationalGrantReceived);
        result.put('availableProjectGrant', availableProjectGrant);
        result.put('availableOperationalGrant', operationalGrantReceived);
        result.put('grantAvailable', availableProjectGrant + operationalGrantReceived);

        return result;
    }
    @AuraEnabled(cacheable=true)
public static List<TRLProjectWrapper> getTRLProjects() {

    User u = [
        SELECT Contact.AccountId
        FROM User
        WHERE Id = :UserInfo.getUserId()
        LIMIT 1
    ];

    List<TRLProjectWrapper> result = new List<TRLProjectWrapper>();

    if (u.Contact == null || u.Contact.AccountId == null) {
        return result;
    }

    Id accId = u.Contact.AccountId;

    List<IndividualApplication> apps = [
        SELECT
            Id,
            Name,
            Project_Title__c,
            Current_Technology_Readiness_Level_TRL__c,
            Expected_TRL_at_the_end_of_the_Project__c,
            Work_undertaken_supporting_current_TRL__c
        FROM IndividualApplication
        WHERE Status = 'Approved for Funding'
        AND AccountId = :accId
    ];

    for (IndividualApplication ia : apps) {

        TRLProjectWrapper w = new TRLProjectWrapper();
        w.proposalId   = ia.Id;
        w.name         = ia.Name;
        w.projectTitle = ia.Project_Title__c;
        w.workDone     = ia.Work_undertaken_supporting_current_TRL__c;

        try {
            w.currentTRL = ia.Current_Technology_Readiness_Level_TRL__c != null
                ? Integer.valueOf(ia.Current_Technology_Readiness_Level_TRL__c)
                : 0;
        } catch (Exception e) { w.currentTRL = 0; }

        try {
            w.expectedTRL = ia.Expected_TRL_at_the_end_of_the_Project__c != null
                ? Integer.valueOf(ia.Expected_TRL_at_the_end_of_the_Project__c)
                : 0;
        } catch (Exception e) { w.expectedTRL = 0; }

        result.add(w);
    }

    return result;
}

public class TRLProjectWrapper {
    @AuraEnabled public Id      proposalId;
    @AuraEnabled public String  name;
    @AuraEnabled public String  projectTitle;
    @AuraEnabled public Integer currentTRL;
    @AuraEnabled public Integer expectedTRL;
    @AuraEnabled public String  workDone;
}
}