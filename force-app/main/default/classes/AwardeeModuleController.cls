public without sharing class AwardeeModuleController {

    /* --------------------------------------------
       KPI 1: Total Proposal Cost (Approved for Funding)
       (Year-wise enabled)
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static Decimal getTotalApprovedProjectBudget(String fundingYear) {

        AggregateResult ar;

        if (String.isNotBlank(fundingYear)) {
            ar = [
                SELECT SUM(Total_Project_Budget_INR__c) totalBudget
                FROM IndividualApplication
                WHERE Status = 'Approved for Funding'
                AND Funding_Year__c = :fundingYear
            ];
        } else {
            ar = [
                SELECT SUM(Total_Project_Budget_INR__c) totalBudget
                FROM IndividualApplication
                WHERE Status = 'Approved for Funding'
            ];
        }

        return ar.get('totalBudget') == null
            ? 0
            : (Decimal) ar.get('totalBudget');
    }

    @AuraEnabled(cacheable=true)
public static Decimal getTotalFundingAwardedSafe(
    String fundingYear,
    String fundingType
) {

    String q =
        'SELECT SUM(Amount) totalAwarded ' +
        'FROM FundingAward ' +
        'WHERE AwardeeId != null';

    if (String.isNotBlank(fundingYear)) {
        q += ' AND Awarded_Date__c = THIS_YEAR';
        // replace with year logic if needed
    }

    if (String.isNotBlank(fundingType)) {
        q += ' AND Type_of_Fund__c = :fundingType';
    }

    AggregateResult ar = Database.query(q);

    return ar.get('totalAwarded') == null
        ? 0
        : (Decimal) ar.get('totalAwarded');
}

    /* --------------------------------------------
   KPI (COE): Total COE Funding Awarded
-------------------------------------------- */
@AuraEnabled(cacheable=true)
public static Decimal getTotalCoeFundingAwardAmount(
    String fundingYear,
    String fundingType
) {

    String q =
        'SELECT SUM(Amount) totalAward ' +
        'FROM FundingAward ' +
        'WHERE AwardeeId != null';

    if (String.isNotBlank(fundingType)) {
        q += ' AND Type_of_Fund__c = :fundingType';
    }

    if (String.isNotBlank(fundingYear)) {
        q += ' AND IndividualApplication.Funding_Year__c = :fundingYear';
    }

    AggregateResult ar = Database.query(q);

    return ar.get('totalAward') == null
        ? 0
        : (Decimal) ar.get('totalAward');
}


    /* --------------------------------------------
       KPI 2: Total Funds Released (OLD METHOD)
       (KEPT – NOT USED)
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static Decimal getTotalFundsReleased() {

        AggregateResult ar = [
            SELECT SUM(Amount) totalFunds
            FROM FundingAward
            WHERE AwardeeId != null
        ];

        return ar.get('totalFunds') == null
            ? 0
            : (Decimal) ar.get('totalFunds');
    }

    /* --------------------------------------------
       KPI 2 (CORRECT):
       Total Funds Released
       SOURCE OF TRUTH → Milestone
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static Decimal getTotalFundsReleasedSafe(
        String fundingYear,
        String fundingType,
        Boolean isCoeMode
    ) {

        String q =
    'SELECT SUM(Disbursed_Amount__c) totalReleased ' +
    'FROM Milestone__c ' +
    'WHERE Disbursed_Amount__c != null ' +
    'AND Individual_Application__r.Status = \'Approved for Funding\'';


        if (String.isNotBlank(fundingYear)) {
            q += ' AND Individual_Application__r.Funding_Year__c = :fundingYear';
        }

        if (String.isNotBlank(fundingType)) {
            q += ' AND Funding_Type__c = :fundingType';
        }

        AggregateResult ar = Database.query(q);

        return ar.get('totalReleased') == null
            ? 0
            : (Decimal) ar.get('totalReleased');
    }

    /* --------------------------------------------
       KPI 3: Total Funds Available (SAFE)
    -------------------------------------------- */
    @AuraEnabled
public static Decimal getTotalFundsAvailableSafe(
    String fundingYear,
    String fundingType,
    Boolean isCoeMode
) {

    Decimal released = getTotalFundsReleasedSafe(
        fundingYear,
        fundingType,
        isCoeMode
    );

    Decimal totalBudget = getTotalApprovedProjectBudget(fundingYear);
    return totalBudget - released;
}


    /* --------------------------------------------
       LEGACY METHOD (KEPT FOR SAFETY)
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static Decimal getTotalFundsAvailable(String fundingYear) {

        Decimal totalBudget = getTotalApprovedProjectBudget(fundingYear);
        Decimal released = 0;

 String q =
    'SELECT SUM(Disbursed_Amount__c) totalReleased ' +
    'FROM Milestone__c ' +
    'WHERE Disbursed_Amount__c != null ' +
    'AND Individual_Application__r.Status = \'Approved for Funding\'';

        if (String.isNotBlank(fundingYear)) {
            q += ' AND Individual_Application__r.Funding_Year__c = :fundingYear';
        }

        AggregateResult ar = Database.query(q);

        if (ar.get('totalReleased') != null) {
            released = (Decimal) ar.get('totalReleased');
        }

        return totalBudget - released;
    }


    /* --------------------------------------------
       OLD PROPOSAL TABLE WITH PAGINATION
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static List<IndividualApplication> getProposals(
        Integer offsetValue,
        Integer pageSize
    ) {

        if (offsetValue == null) offsetValue = 0;
        if (pageSize == null || pageSize <= 0) pageSize = 10;

        return [
            SELECT Id, Name, Status, Total_Project_Budget_INR__c,
                   Account.Name, AccountId
            FROM IndividualApplication
            WHERE Status = 'Approved for Funding'
            ORDER BY CreatedDate DESC
            LIMIT :pageSize OFFSET :offsetValue
        ];
    }

    /* =========================================================
       Proposal list + Report Submitted status summary
       (Year-wise enabled)
    ========================================================= */
    @AuraEnabled(cacheable=true)
    public static List<ProposalMilestoneStatusWrapper>
        getProposalsWithMilestoneStatus(
            Integer offsetValue,
            Integer pageSize,
            Id accountId,
            String fundingYear
        ) {

        if (offsetValue == null) offsetValue = 0;
        if (pageSize == null || pageSize <= 0) pageSize = 10;

        List<IndividualApplication> apps;

        if (accountId != null) {

            if (fundingYear != null && fundingYear != '') {
                apps = [
                    SELECT Id, Name, Status, Total_Project_Budget_INR__c,
                           AccountId, Account.Name
                    FROM IndividualApplication
                    WHERE Status = 'Approved for Funding'
                    AND AccountId = :accountId
                    AND Funding_Year__c = :fundingYear
                    ORDER BY CreatedDate DESC
                    LIMIT :pageSize OFFSET :offsetValue
                ];
            } else {
                apps = [
                    SELECT Id, Name, Status, Total_Project_Budget_INR__c,
                           AccountId, Account.Name
                    FROM IndividualApplication
                    WHERE Status = 'Approved for Funding'
                    AND AccountId = :accountId
                    ORDER BY CreatedDate DESC
                    LIMIT :pageSize OFFSET :offsetValue
                ];
            }

        } else {

            if (fundingYear != null && fundingYear != '') {
                apps = [
                    SELECT Id, Name, Status, Total_Project_Budget_INR__c,
                           AccountId, Account.Name
                    FROM IndividualApplication
                    WHERE Status = 'Approved for Funding'
                    AND Funding_Year__c = :fundingYear
                    ORDER BY CreatedDate DESC
                    LIMIT :pageSize OFFSET :offsetValue
                ];
            } else {
                apps = [
                    SELECT Id, Name, Status, Total_Project_Budget_INR__c,
                           AccountId, Account.Name
                    FROM IndividualApplication
                    WHERE Status = 'Approved for Funding'
                    ORDER BY CreatedDate DESC
                    LIMIT :pageSize OFFSET :offsetValue
                ];
            }
        }

        if (apps.isEmpty())
            return new List<ProposalMilestoneStatusWrapper>();

        Set<Id> proposalIds = new Set<Id>();
        for (IndividualApplication ia : apps)
            proposalIds.add(ia.Id);

        Map<Id,Integer> totalMilestoneMap = new Map<Id,Integer>();
        for (AggregateResult ar : [
            SELECT Individual_Application__c appId, COUNT(Id) totalCnt
            FROM Milestone__c
            WHERE Individual_Application__c IN :proposalIds
            GROUP BY Individual_Application__c
        ]) {
            totalMilestoneMap.put(
                (Id)ar.get('appId'),
                (Integer)ar.get('totalCnt')
            );
        }

        Map<Id,Integer> reportSubmittedMap = new Map<Id,Integer>();
        for (AggregateResult ar : [
            SELECT Individual_Application__c appId, COUNT(Id) submittedCnt
            FROM Milestone__c
            WHERE Individual_Application__c IN :proposalIds
            AND Status__c = 'Report Submitted'
            GROUP BY Individual_Application__c
        ]) {
            reportSubmittedMap.put(
                (Id)ar.get('appId'),
                (Integer)ar.get('submittedCnt')
            );
        }

        List<ProposalMilestoneStatusWrapper> result =
            new List<ProposalMilestoneStatusWrapper>();

        for (IndividualApplication ia : apps) {

            Integer totalM =
                totalMilestoneMap.containsKey(ia.Id)
                ? totalMilestoneMap.get(ia.Id)
                : 0;

            Integer submittedReports =
                reportSubmittedMap.containsKey(ia.Id)
                ? reportSubmittedMap.get(ia.Id)
                : 0;

            ProposalMilestoneStatusWrapper w =
                new ProposalMilestoneStatusWrapper();

            w.proposalId = ia.Id;
            w.proposalName = ia.Name;
            w.status = ia.Status;
            w.totalBudget = ia.Total_Project_Budget_INR__c;
            w.accountId = ia.AccountId;
            w.accountName =
                ia.Account != null ? ia.Account.Name : '-';
            w.totalMilestones = totalM;
            w.reportSubmitted = submittedReports;

            if (totalM == 0) w.chipType = 'none';
            else if (submittedReports == 0) w.chipType = 'pending';
            else if (submittedReports < totalM) w.chipType = 'progress';
            else w.chipType = 'completed';

            result.add(w);
        }

        return result;
    }

    /* =========================================================
       WRAPPER
    ========================================================= */

    public class ProposalMilestoneStatusWrapper {
        @AuraEnabled public Id proposalId;
        @AuraEnabled public String proposalName;
        @AuraEnabled public String status;
        @AuraEnabled public Decimal totalBudget;
        @AuraEnabled public Id accountId;
        @AuraEnabled public String accountName;
        @AuraEnabled public Integer totalMilestones;
        @AuraEnabled public Integer reportSubmitted;
        @AuraEnabled public String chipType;
    }

    /* --------------------------------------------
       TRANCHE HISTORY FOR MODAL (APPLICATION-WISE)
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static List<FundingAward> getTrancheHistory(Id applicationId) {
        return [
            SELECT Id, Name, Amount, Status, Comments__c,
                   Funding_for__c, Awarded_Date__c
            FROM FundingAward
            WHERE IndividualApplicationId = :applicationId
            ORDER BY CreatedDate DESC
        ];
    }

    /* --------------------------------------------
       TRANCHE HISTORY FOR MODAL (ACCOUNT-WISE)
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static List<FundingAward> getTrancheHistoryByAccount(Id accountId) {

        if (accountId == null)
            return new List<FundingAward>();

        return [
            SELECT Id, Name, Amount, Status, Comments__c,
                   Funding_for__c, Awarded_Date__c
            FROM FundingAward
            WHERE AwardeeId = :accountId
            ORDER BY CreatedDate DESC
        ];
    }

    /* --------------------------------------------
       CREATE FUNDING AWARD RECORD (ACCOUNT-WISE ONLY)
    -------------------------------------------- */
   @AuraEnabled
public static FundingAward createFundingAward(
    FundingAward fa,
    Id accountId
) {
    if (accountId == null)
        throw new AuraHandledException('AccountId is required.');

    // Account-wise disbursement (COE tab)
    fa.AwardeeId = accountId;

    // Proposal NOT mandatory
    fa.IndividualApplicationId = null;

    insert fa;
    return fa;
}



    /* --------------------------------------------
       APPROVED COE LIST  (REQUEST ONLY)
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static List<CoeWrapper> getApprovedCoes() {

        List<IndividualApplication> apps = [
            SELECT AccountId, Account.Name
            FROM IndividualApplication
            WHERE Status = 'Approved for Funding'
            AND AccountId != NULL
        ];

        Set<Id> accountIds = new Set<Id>();
        for (IndividualApplication ia : apps)
            accountIds.add(ia.AccountId);

        if (accountIds.isEmpty())
            return new List<CoeWrapper>();

        Map<Id, Contact> coeAdminMap = new Map<Id, Contact>();
        for (Contact c : [
            SELECT Id, Name, AccountId
            FROM Contact
            WHERE AccountId IN :accountIds
            AND COE_Admin__c = true
            ORDER BY CreatedDate ASC
        ]) {
            if (!coeAdminMap.containsKey(c.AccountId))
                coeAdminMap.put(c.AccountId, c);
        }

        Map<Id, String> accountNameMap = new Map<Id, String>();
        for (IndividualApplication ia : apps)
            accountNameMap.put(ia.AccountId, ia.Account.Name);

        Map<Id, Fund_Request__c> latestRequestMap =
            new Map<Id, Fund_Request__c>();

        for (Fund_Request__c fr : [
            SELECT Account__c, Amount__c, Status__c, Date_of_Request__c
            FROM Fund_Request__c
            WHERE Account__c IN :accountIds
            ORDER BY CreatedDate DESC
        ]) {
            if (!latestRequestMap.containsKey(fr.Account__c))
                latestRequestMap.put(fr.Account__c, fr);
        }

        List<CoeWrapper> result = new List<CoeWrapper>();

        for (Id accId : accountIds) {

            CoeWrapper w = new CoeWrapper();
            w.accountId = accId;
            w.accountName = accountNameMap.get(accId);
            w.coeName =
                coeAdminMap.containsKey(accId)
                ? coeAdminMap.get(accId).Name
                : '-';

            if (latestRequestMap.containsKey(accId)) {
                Fund_Request__c fr = latestRequestMap.get(accId);
                w.requestedAmount = fr.Amount__c;
                w.requestStatus = fr.Status__c;
                w.requestDate = DateTime.newInstance(
                    fr.Date_of_Request__c,
                    Time.newInstance(0,0,0,0)
                );
            }

            result.add(w);
        }

        return result;
    }

    public class CoeWrapper {
        @AuraEnabled public Id accountId;
        @AuraEnabled public String accountName;
        @AuraEnabled public String coeName;
        @AuraEnabled public Decimal requestedAmount;
        @AuraEnabled public String requestStatus;
        @AuraEnabled public Datetime requestDate;
    }

    /* --------------------------------------------
       Proposal Header Info
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static IndividualApplication getProposalHeader(Id proposalId) {

        if (proposalId == null) return null;

        return [
            SELECT Id, Name, Project_Title__c,
                   Primary_Focus_Area__c
            FROM IndividualApplication
            WHERE Id = :proposalId
            LIMIT 1
        ];
    }

    /* --------------------------------------------
       Mark Milestone Completed
    -------------------------------------------- */
    @AuraEnabled
    public static void markMilestoneCompleted(Id milestoneId) {

        if (milestoneId == null)
            throw new AuraHandledException(
                'Milestone Id is missing.'
            );

        Milestone__c ms = [
            SELECT Id, Status__c
            FROM Milestone__c
            WHERE Id = :milestoneId
            LIMIT 1
        ];

        ms.Status__c = 'Completed';
        update ms;
    }

    /* --------------------------------------------
       Get Milestones By Proposal
    -------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static List<Milestone__c> getMilestonesByProposal(Id proposalId) {

        if (proposalId == null)
            return new List<Milestone__c>();

        return [
            SELECT Id,
                   Name,
                   Status__c,
                   Disbursed_Amount__c,
                   Budget_Required_INR__c,
                   Project_Start_Date__c,
                   Project_End_Date__c
            FROM Milestone__c
            WHERE Individual_Application__c = :proposalId
            ORDER BY CreatedDate ASC
        ];
    }
}