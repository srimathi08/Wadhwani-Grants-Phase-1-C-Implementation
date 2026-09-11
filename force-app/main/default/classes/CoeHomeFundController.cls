public without sharing class CoeHomeFundController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Decimal> getFundSummary() {

        Map<String, Decimal> result = new Map<String, Decimal>{
            'totalReceived'            => 0,
            'disbursed'                => 0,
            'available'                => 0,
            'projectGrantReceived'     => 0,
            'operationalGrantReceived' => 0,
            'availableProjectGrant'    => 0,
            'availableOperationalGrant'=> 0,
            'totalProjectsFunded'      => 0,
            'grantAvailable'           => 0,
            'avgTRL'                   => 0,
            'expectedTRL'              => 0,
            'duration'                 => 0
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

        AggregateResult arTotal = [
            SELECT SUM(Amount) total
            FROM FundingAward
            WHERE AwardeeId = :accId
        ];
        Decimal total = (Decimal) arTotal.get('total');
        if (total == null) total = 0;

        Decimal projectGrantReceived     = 0;
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
            if (fundType == 'COE Project Grant')          projectGrantReceived     += amt;
            else if (fundType == 'COE Operational Grant') operationalGrantReceived += amt;
        }

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

        Decimal disbursed = 0;
        Set<Id> allAppIds = new Set<Id>();
        if (!apps.isEmpty()) {
            for (IndividualApplication ia : apps) allAppIds.add(ia.Id);

            AggregateResult arDisb = [
                SELECT SUM(Amount) total
                FROM FundingDisbursement
                WHERE Proposal__c IN :allAppIds
            ];
            disbursed = (Decimal) arDisb.get('total');
            if (disbursed == null) disbursed = 0;
        }

        // ── Latest submitted milestone "Current" TRL per proposal (for avgTRL KPI) ──
        Map<Id, Integer> latestCurrentTRLByProposal = getLatestMilestoneTRLMap(allAppIds);

        Decimal totalTRL = 0, totalExpectedTRL = 0, totalDuration = 0;
        Integer count = 0;
        Integer trlCount = 0;

        for (IndividualApplication ia : apps) {
            count++;

            // Current = latest submitted milestone TRL ONLY — no fallback to base.
            // Proposals with no milestone TRL yet are excluded from the avgTRL calculation.
            if (latestCurrentTRLByProposal.containsKey(ia.Id)) {
                totalTRL += latestCurrentTRLByProposal.get(ia.Id);
                trlCount++;
            }

            try {
                if (ia.Expected_TRL_at_the_end_of_the_Project__c != null)
                    totalExpectedTRL += Decimal.valueOf(ia.Expected_TRL_at_the_end_of_the_Project__c);
            } catch (Exception e) {}
            if (ia.Project_Duration__c != null) totalDuration += ia.Project_Duration__c;
        }

        if (trlCount > 0) {
            result.put('avgTRL', totalTRL / trlCount);
        }
        if (count > 0) {
            result.put('expectedTRL', totalExpectedTRL / count);
            result.put('duration',    totalDuration    / count);
        }

        Decimal available             = total - disbursed;
        Decimal availableProjectGrant = projectGrantReceived - disbursed;
        if (availableProjectGrant < 0) availableProjectGrant = 0;

        result.put('totalReceived',             total);
        result.put('disbursed',                 disbursed);
        result.put('available',                 available);
        result.put('projectGrantReceived',      projectGrantReceived);
        result.put('operationalGrantReceived',  operationalGrantReceived);
        result.put('availableProjectGrant',     availableProjectGrant);
        result.put('availableOperationalGrant', operationalGrantReceived);
        result.put('grantAvailable',            availableProjectGrant + operationalGrantReceived);

        return result;
    }

    /* =============================================
       GET TRL PROJECTS — with fromDate / toDate filter
       Base TRL      -> IndividualApplication.Current_Technology_Readiness_Level_TRL__c
       Current TRL   -> latest submitted Milestone__c.Current_Technology_Readiness_Level_TRL__c ONLY
                         (null if no milestone TRL exists — no fallback)
       Expected TRL  -> IndividualApplication.Expected_TRL_at_the_end_of_the_Project__c
    ============================================= */
    @AuraEnabled(cacheable=true)
    public static List<TRLProjectWrapper> getTRLProjects(
        String fromDate,
        String toDate
    ) {
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

        DateTime rangeStart = null;
        DateTime rangeEnd   = null;

        if (String.isNotBlank(fromDate)) {
            try {
                Date d = Date.valueOf(fromDate);
                rangeStart = DateTime.newInstance(d, Time.newInstance(0, 0, 0, 0));
            } catch (Exception ex) {
                System.debug('getTRLProjects: invalid fromDate: ' + fromDate);
            }
        }

        if (String.isNotBlank(toDate)) {
            try {
                Date d = Date.valueOf(toDate);
                rangeEnd = DateTime.newInstance(d, Time.newInstance(23, 59, 59, 999));
            } catch (Exception ex) {
                System.debug('getTRLProjects: invalid toDate: ' + toDate);
            }
        }

        String q =
            'SELECT Id, Name, Project_Title__c, ' +
            '       Current_Technology_Readiness_Level_TRL__c, ' +
            '       Expected_TRL_at_the_end_of_the_Project__c, ' +
            '       Work_undertaken_supporting_current_TRL__c, ' +
            '       Funding_Year__c, CreatedDate, AppliedDate ' +
            'FROM IndividualApplication ' +
            'WHERE Status = \'Approved for Funding\' ' +
            'AND AccountId = :accId';

        if (rangeStart != null) {
            q += ' AND AppliedDate >= :rangeStart';
        }
        if (rangeEnd != null) {
            q += ' AND AppliedDate <= :rangeEnd';
        }

        q += ' ORDER BY Funding_Year__c ASC NULLS LAST';

        List<IndividualApplication> apps = Database.query(q);

        Set<Id> appIds = new Set<Id>();
        for (IndividualApplication ia : apps) appIds.add(ia.Id);

        Map<Id, Integer> latestCurrentTRLByProposal = getLatestMilestoneTRLMap(appIds);

        System.debug('=== TRL DEBUG START ===');
        System.debug('Proposal IDs queried: ' + appIds);
        System.debug('Latest milestone TRL map: ' + latestCurrentTRLByProposal);

        for (IndividualApplication ia : apps) {
            TRLProjectWrapper w = new TRLProjectWrapper();
            w.proposalId   = ia.Id;
            w.name         = ia.Name;
            w.projectTitle = ia.Project_Title__c;
            w.workDone     = ia.Work_undertaken_supporting_current_TRL__c;
            w.fundingYear  = ia.Funding_Year__c;
            w.createdDate  = ia.CreatedDate != null
                ? ia.CreatedDate.format('dd MMM yyyy')
                : '';

            try {
                w.baseTRL = ia.Current_Technology_Readiness_Level_TRL__c != null
                    ? Integer.valueOf(ia.Current_Technology_Readiness_Level_TRL__c)
                    : 0;
            } catch (Exception e) {
                w.baseTRL = 0;
                System.debug('baseTRL parse failed for ' + ia.Id + ': ' + e.getMessage());
            }

            try {
                w.expectedTRL = ia.Expected_TRL_at_the_end_of_the_Project__c != null
                    ? Integer.valueOf(ia.Expected_TRL_at_the_end_of_the_Project__c)
                    : 0;
            } catch (Exception e) { w.expectedTRL = 0; }

            // Current = latest submitted milestone TRL ONLY.
            // If no milestone has a TRL value, leave currentTRL as null — do NOT fall back to baseTRL.
            w.currentTRL = latestCurrentTRLByProposal.containsKey(ia.Id)
                ? latestCurrentTRLByProposal.get(ia.Id)
                : null;
            w.hasCurrentTRL = latestCurrentTRLByProposal.containsKey(ia.Id);

            System.debug('Proposal ' + ia.Id + ' -> base=' + w.baseTRL + ' current=' + w.currentTRL + ' expected=' + w.expectedTRL);

            result.add(w);
        }

        System.debug('=== TRL DEBUG END ===');

        return result;
    }

    /* =============================================
       HELPER — latest submitted Milestone__c TRL per proposal
       Uses Individual_Application__c and CreatedDate.
    ============================================= */
    private static Map<Id, Integer> getLatestMilestoneTRLMap(Set<Id> proposalIds) {
        Map<Id, Integer> latestByProposal = new Map<Id, Integer>();

        if (proposalIds == null || proposalIds.isEmpty()) {
            return latestByProposal;
        }

        List<Milestone__c> milestones = [
            SELECT Id, Individual_Application__c, Current_Technology_Readiness_Level_TRL__c,
                   CreatedDate
            FROM Milestone__c
            WHERE Individual_Application__c IN :proposalIds
            AND Current_Technology_Readiness_Level_TRL__c != null
            ORDER BY Individual_Application__c, CreatedDate DESC
        ];

        for (Milestone__c m : milestones) {
            if (!latestByProposal.containsKey(m.Individual_Application__c)) {
                try {
                    latestByProposal.put(
                        m.Individual_Application__c,
                        Integer.valueOf(m.Current_Technology_Readiness_Level_TRL__c)
                    );
                } catch (Exception e) {}
            }
        }

        return latestByProposal;
    }

    public class TRLProjectWrapper {
        @AuraEnabled public Id      proposalId;
        @AuraEnabled public String  name;
        @AuraEnabled public String  projectTitle;
        @AuraEnabled public Integer baseTRL;
        @AuraEnabled public Integer currentTRL;
        @AuraEnabled public Boolean hasCurrentTRL;
        @AuraEnabled public Integer expectedTRL;
        @AuraEnabled public String  workDone;
        @AuraEnabled public String  fundingYear;
        @AuraEnabled public String  createdDate;
    }
}