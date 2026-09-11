public without sharing class CoeMilestoneController {

    public class MilestoneWrap {
        @AuraEnabled public Id milestoneId;
        @AuraEnabled public String name;
        @AuraEnabled public String status;

        @AuraEnabled public Date targetDate;

        @AuraEnabled public String projectStartDate;
        @AuraEnabled public String projectEndDate;

        @AuraEnabled public Decimal budgetRequired;
        @AuraEnabled public Decimal amount;
        @AuraEnabled public Decimal disbursedAmount;
        @AuraEnabled public Id fundingDisbursementId;

        // ✅ NEW
        @AuraEnabled public Decimal totalUtilized;
        @AuraEnabled public String currentTRL;
    }

    @AuraEnabled(cacheable=true)
    public static List<MilestoneWrap> getMilestones(Id appId) {
        if (appId == null) return new List<MilestoneWrap>();

        List<Milestone__c> ms = [
            SELECT Id, Name, Status__c, Milestone_Target_Date__c,
                   Budget_Required_INR__c, Amount__c, Disbursed_Amount__c,
                   Funding_Disbursement__c,
                   Project_Start_Date__c,
                   Project_End_Date__c,
                   Total_Utilized__c,
                   Current_Technology_Readiness_Level_TRL__c
            FROM Milestone__c
            WHERE Individual_Application__c = :appId
            ORDER BY CreatedDate ASC
        ];

        List<MilestoneWrap> wraps = new List<MilestoneWrap>();

        for (Milestone__c m : ms) {
            MilestoneWrap w = new MilestoneWrap();
            w.milestoneId = m.Id;
            w.name = m.Name;
            w.status = m.Status__c;

            w.targetDate = m.Milestone_Target_Date__c;

            w.projectStartDate =
                (m.Project_Start_Date__c == null)
                ? null
                : String.valueOf(m.Project_Start_Date__c);

            w.projectEndDate =
                (m.Project_End_Date__c == null)
                ? null
                : String.valueOf(m.Project_End_Date__c);

            w.budgetRequired = m.Budget_Required_INR__c;
            w.amount = m.Amount__c;
            w.disbursedAmount = m.Disbursed_Amount__c;
            w.fundingDisbursementId = m.Funding_Disbursement__c;

            w.totalUtilized = m.Total_Utilized__c;
            w.currentTRL = m.Current_Technology_Readiness_Level_TRL__c;

            wraps.add(w);
        }

        return wraps;
    }

    @AuraEnabled
    public static Id createFundingDisbursement(
        Id appId,
        Id milestoneId,
        String requestedDocs,
        String comments,
        Datetime disbursementDate,
        Decimal approvedAmount
    ) {
        if (appId == null || milestoneId == null) {
            throw new AuraHandledException('Missing Proposal or Milestone Id.');
        }
        if (approvedAmount == null || approvedAmount <= 0) {
            throw new AuraHandledException('Approved Amount is required and must be greater than 0.');
        }
        if (disbursementDate == null) {
            throw new AuraHandledException('Date of Funds Disbursed is required.');
        }

        Decimal finalApprovedAmount =
            approvedAmount.setScale(0, System.RoundingMode.HALF_UP);

        User u = [
            SELECT Contact.AccountId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        Id loggedInAccountId =
            (u.Contact != null) ? u.Contact.AccountId : null;

        if (loggedInAccountId == null) {
            throw new AuraHandledException(
                'Logged in user is not mapped to Contact/Account.'
            );
        }

        List<FundingAward> faList = [
            SELECT Id, Status, Type_of_Fund__c
            FROM FundingAward
            WHERE AwardeeId = :loggedInAccountId
            AND Status = 'New Fund'
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];

        if (faList.isEmpty()) {
            throw new AuraHandledException(
                'No Funding Award found with status "New Fund" for your COE Account.'
            );
        }

        FundingAward fa = faList[0];

        FundingDisbursement fd = new FundingDisbursement();
        fd.FundingAwardId = fa.Id;
        fd.Proposal__c = appId;
        fd.Milestone__c = milestoneId;
        fd.Requested_Support_Documents__c = requestedDocs;
        fd.Comments__c = comments;
        fd.DisbursementDate = disbursementDate;
        fd.Amount = finalApprovedAmount;

        insert fd;

        update new Milestone__c(
            Id = milestoneId,
            Funding_Disbursement__c = fd.Id,
            Status__c = 'Fund Disbursed',
            Disbursed_Amount__c = finalApprovedAmount,
            Funding_Type__c = fa.Type_of_Fund__c
        );

        return fd.Id;
    }

    @AuraEnabled
    public static void approveMilestoneReport(Id milestoneId) {
        if (milestoneId == null) {
            throw new AuraHandledException('Missing Milestone Id.');
        }

        Milestone__c m = [
            SELECT Id, Status__c
            FROM Milestone__c
            WHERE Id = :milestoneId
            LIMIT 1
        ];

        if (m.Status__c != 'Report Submitted') {
            throw new AuraHandledException('Only milestones with a submitted report can be approved.');
        }

        update new Milestone__c(
            Id = milestoneId,
            Status__c = 'Report Approved'
        );
    }
}