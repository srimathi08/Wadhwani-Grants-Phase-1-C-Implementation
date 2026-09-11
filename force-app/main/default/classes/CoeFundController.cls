public without sharing class CoeFundController {

    /* =========================================================
       GET FUND PROJECTS
    ========================================================= */
    @AuraEnabled(cacheable=true)
    public static FundResponse getFundProjects() {

        FundResponse response = new FundResponse();
        response.summary = new FundSummary();
        response.projects = new List<FundProjectWrapper>();

        response.summary.total = 0;
        response.summary.disbursed = 0;
        response.summary.available = 0;

        response.summary.projectGrantReceived = 0;
        response.summary.operationalGrantReceived = 0;
        response.summary.totalReceived = 0;

        response.summary.availableProjectGrant = 0;
        response.summary.availableOperationalGrant = 0;

        /* ---------------- Logged-in User ---------------- */
        User u = [
            SELECT Id, ContactId, Contact.AccountId, Contact.Name
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        if (u.ContactId == null || u.Contact == null || u.Contact.AccountId == null) {
            return response;
        }

        Id accId = u.Contact.AccountId;

        /* ---------------- Approved Proposals ---------------- */
        List<IndividualApplication> apps = [
            SELECT Id, Name, Project_Title__c, Total_Project_Budget_INR__c
            FROM IndividualApplication
            WHERE Status = 'Approved for Funding'
            AND AccountId = :accId
        ];

        if (apps.isEmpty()) {
            return response;
        }

        Set<Id> appIds = new Set<Id>();
        for (IndividualApplication ia : apps) {
            appIds.add(ia.Id);
        }

        /* ---------------- TOTAL UTILIZED PER PROPOSAL ----------------
           Rolled up from each proposal's milestones (Total_Utilized__c) */
        Map<Id, Decimal> utilizedByApp = new Map<Id, Decimal>();

        for (AggregateResult ar : [
            SELECT Individual_Application__c app, SUM(Total_Utilized__c) total
            FROM Milestone__c
            WHERE Individual_Application__c IN :appIds
            GROUP BY Individual_Application__c
        ]) {
            Decimal total = (Decimal) ar.get('total');
            if (total == null) total = 0;
            utilizedByApp.put((Id) ar.get('app'), total);
        }

        /* ---------------- TOTAL FUNDS RECEIVED ---------------- */
        Decimal totalApproved = 0;
        AggregateResult arTotal = [
            SELECT SUM(Amount) total
            FROM FundingAward
            WHERE AwardeeId = :accId
        ];
        totalApproved = (Decimal) arTotal.get('total');
        if (totalApproved == null) totalApproved = 0;

        /* ---------------- FUND TYPE WISE TOTALS ---------------- */
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

        /* ---------------- DISBURSEMENTS (PROJECT GRANT ONLY) ---------------- */
        Map<Id, Decimal> disbursedByApp = new Map<Id, Decimal>();
        Decimal totalDisbursed = 0;

        for (AggregateResult ar : [
            SELECT Proposal__c appId, SUM(Amount) total
            FROM FundingDisbursement
            WHERE Proposal__c IN :appIds
            GROUP BY Proposal__c
        ]) {
            Decimal total = (Decimal) ar.get('total');
            if (total == null) total = 0;

            disbursedByApp.put((Id) ar.get('appId'), total);
            totalDisbursed += total;
        }

        /* ---------------- Milestones ---------------- */
        Map<Id, Integer> totalMilestonesByApp = new Map<Id, Integer>();
        for (AggregateResult ar : [
            SELECT Individual_Application__c appId, COUNT(Id) cnt
            FROM Milestone__c
            WHERE Individual_Application__c IN :appIds
            GROUP BY Individual_Application__c
        ]) {
            totalMilestonesByApp.put((Id) ar.get('appId'), (Integer) ar.get('cnt'));
        }

        Map<Id, Integer> submittedMilestonesByApp = new Map<Id, Integer>();
        for (AggregateResult ar : [
            SELECT Individual_Application__c appId, COUNT(Id) cnt
            FROM Milestone__c
            WHERE Individual_Application__c IN :appIds
            AND Status__c = 'Report Submitted'
            GROUP BY Individual_Application__c
        ]) {
            submittedMilestonesByApp.put((Id) ar.get('appId'), (Integer) ar.get('cnt'));
        }

        /* ---------------- Build Project Wrappers ---------------- */
        for (IndividualApplication ia : apps) {

            Decimal totalBudget =
                ia.Total_Project_Budget_INR__c != null
                ? ia.Total_Project_Budget_INR__c
                : 0;

            Decimal disbursed =
                disbursedByApp.containsKey(ia.Id)
                ? disbursedByApp.get(ia.Id)
                : 0;

            Decimal totalUtilized =
                utilizedByApp.containsKey(ia.Id)
                ? utilizedByApp.get(ia.Id)
                : 0;

            FundProjectWrapper w = new FundProjectWrapper();
            w.proposalId = ia.Id;
            w.name = ia.Name;
            w.piName = u.Contact.Name;
            w.projectTitle = ia.Project_Title__c;

            w.totalBudget    = totalBudget;
            w.disbursed      = disbursed;
            w.totalUtilized  = totalUtilized;
            w.remaining      = totalBudget - disbursed;   // ← see note below

            w.totalMilestones =
                totalMilestonesByApp.containsKey(ia.Id)
                ? totalMilestonesByApp.get(ia.Id)
                : 0;

            w.submittedMilestones =
                submittedMilestonesByApp.containsKey(ia.Id)
                ? submittedMilestonesByApp.get(ia.Id)
                : 0;

            response.projects.add(w);
        }

        /* ---------------- EXISTING SUMMARY ---------------- */
        response.summary.total = totalApproved;
        response.summary.disbursed = totalDisbursed;
        response.summary.available = totalApproved - totalDisbursed;

        /* ---------------- NEW SUMMARY VALUES ---------------- */
        response.summary.projectGrantReceived = projectGrantReceived;
        response.summary.operationalGrantReceived = operationalGrantReceived;
        response.summary.totalReceived =
            projectGrantReceived + operationalGrantReceived;

        /* ---------------- CORRECT AVAILABLE SPLIT ---------------- */
        response.summary.availableProjectGrant =
            projectGrantReceived - totalDisbursed;

        if (response.summary.availableProjectGrant < 0) {
            response.summary.availableProjectGrant = 0;
        }

        response.summary.availableOperationalGrant =
            operationalGrantReceived;

        return response;
    }

    /* =========================================================
       CREATE FUND REQUEST
    ========================================================= */
    @AuraEnabled
    public static Id createFundRequest(
        Decimal amount,
        Date requestDate,
        String comment
    ) {

        if (amount == null || amount <= 0) {
            throw new AuraHandledException('Amount must be greater than 0');
        }

        if (requestDate == null) {
            throw new AuraHandledException('Date of Request is required');
        }

        User u = [
            SELECT Id, ContactId, Contact.AccountId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        if (u.ContactId == null || u.Contact == null || u.Contact.AccountId == null) {
            throw new AuraHandledException('Logged-in user is not linked to Account');
        }

        Fund_Request__c fr = new Fund_Request__c();
        fr.Account__c = u.Contact.AccountId;
        fr.Amount__c = amount;
        fr.Date_of_Request__c = requestDate;
        fr.Comments__c = comment;
        fr.Status__c = 'New Fund Request';

        insert fr;
        return fr.Id;
    }

    /* =========================================================
       RESPONSE WRAPPERS
    ========================================================= */

    public class FundResponse {
        @AuraEnabled public FundSummary summary;
        @AuraEnabled public List<FundProjectWrapper> projects;
    }

    public class FundSummary {
        @AuraEnabled public Decimal total;
        @AuraEnabled public Decimal disbursed;
        @AuraEnabled public Decimal available;

        @AuraEnabled public Decimal projectGrantReceived;
        @AuraEnabled public Decimal operationalGrantReceived;
        @AuraEnabled public Decimal totalReceived;

        @AuraEnabled public Decimal availableProjectGrant;
        @AuraEnabled public Decimal availableOperationalGrant;
    }

    public class FundProjectWrapper {
        @AuraEnabled public Id proposalId;
        @AuraEnabled public String name;
        @AuraEnabled public String piName;
        @AuraEnabled public String projectTitle;

        @AuraEnabled public Decimal totalBudget;
        @AuraEnabled public Decimal disbursed;
        @AuraEnabled public Decimal totalUtilized;   // ← NEW
        @AuraEnabled public Decimal remaining;

        @AuraEnabled public Integer totalMilestones;
        @AuraEnabled public Integer submittedMilestones;
    }
}