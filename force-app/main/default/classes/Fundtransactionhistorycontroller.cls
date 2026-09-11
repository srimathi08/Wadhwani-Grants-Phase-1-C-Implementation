/**
 * Fund Transaction History — unified ledger across FundingAward, Fund_Request__c,
 * FundingDisbursement and Milestone__c events for the logged-in COE account.
 *
 * Financial columns exposed per row:
 *   totalProjectBudget  - proposal level budget (declared, else sum of milestone budgets)
 *   milestoneBudget     - Milestone__c.Budget_Required__c for milestone-scoped rows,
 *                          else the SUM across all milestones of the proposal
 *   disbursedAmount     - Milestone__c.Disbursed_Amount__c for milestone-scoped rows
 *                          (award rows use Total_amount_disbursed__c), else the SUM
 *                          across all milestones of the proposal
 *   utilizedAmount      - Milestone__c.Total_Utilized__c for milestone-scoped rows,
 *                          else the SUM across all milestones of the proposal
 *   milestoneBalance    - milestoneBudget - utilizedAmount
 *   unutilizedAmount    - disbursedAmount - utilizedAmount
 *
 * Rows that are not tied to a single Milestone__c (Funding Award, Fund Request, and
 * any Fund Disbursement not linked to a milestone) show the PROPOSAL-WIDE aggregate
 * for these five columns rather than leaving them blank, and the milestoneName is
 * stamped as "All Milestones (Aggregate)" so it is clear the figure is a roll-up and
 * not a single milestone's number.
 */
public with sharing class Fundtransactionhistorycontroller {

    private static final String PROPOSAL_ACCOUNT_FIELD = 'AccountId';
    private static final String AGGREGATE_MILESTONE_LABEL = 'All Milestones (Aggregate)';

    // Optional milestone date fields. None of these exist in the current org schema,
    // so every milestone event falls back to LastModifiedDate. Kept dynamic so the
    // class keeps working if they are added later.
    private static final String MILESTONE_UTILIZATION_DATE_FIELD      = 'Utilization_Updated_Date__c';
    private static final String MILESTONE_REPORT_SUBMITTED_DATE_FIELD = 'Report_Submitted_Date__c';
    private static final String MILESTONE_REPORT_APPROVED_DATE_FIELD  = 'Report_Approved_Date__c';

    private static final Integer DEFAULT_PAGE_SIZE = 50;
    private static final Integer MAX_PAGE_SIZE     = 200;
    private static final Integer QUERY_LIMIT       = 2000;

    public class ServiceException extends Exception {}

    // ---------------------------------------------------------------- context caches
    private static Map<Id, Milestone__c> milestoneById;
    private static Map<Id, Decimal>      projectBudgetByProposal;
    private static Map<Id, Id>           proposalByAward;

    // Proposal-wide roll-ups, used as the fallback for rows not scoped to one milestone.
    private static Map<Id, Decimal> milestoneBudgetTotalByProposal;
    private static Map<Id, Decimal> utilizedTotalByProposal;
    private static Map<Id, Decimal> disbursedTotalByProposal;

    // ---------------------------------------------------------------- entry points

    @AuraEnabled(cacheable=false)
    public static ResultPage getTransactionHistory(String filterJson) {
        try {
            return getTransactionHistoryInternal(parseFilter(filterJson), false);
        } catch (Exception e) {
            throw new AuraHandledException('Unable to load fund transaction history: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static ResultPage getTransactionHistoryForExport(String filterJson) {
        try {
            return getTransactionHistoryInternal(parseFilter(filterJson), true);
        } catch (Exception e) {
            throw new AuraHandledException('Unable to prepare export: ' + e.getMessage());
        }
    }

    private static Filter parseFilter(String filterJson) {
        if (String.isBlank(filterJson)) return null;
        return (Filter) JSON.deserialize(filterJson, Filter.class);
    }

    // ---------------------------------------------------------------- DTOs

    public class Filter {
        @AuraEnabled public Date    dateFrom;
        @AuraEnabled public Date    dateTo;
        @AuraEnabled public String  proposalId;
        @AuraEnabled public String  milestoneId;
        @AuraEnabled public String  proposalNameSearch;
        @AuraEnabled public String  milestoneNameSearch;
        @AuraEnabled public String  transactionType;
        @AuraEnabled public Integer pageNumber;
        @AuraEnabled public Integer pageSize;
        @AuraEnabled public String  sortField;
        @AuraEnabled public String  sortDirection;
    }

    public class ResultPage {
        @AuraEnabled public List<Row> records;
        @AuraEnabled public Integer totalRecords;
        @AuraEnabled public Integer pageNumber;
        @AuraEnabled public Integer pageSize;
        @AuraEnabled public Integer totalPages;

        @AuraEnabled public Decimal totalGrantReceived;
        @AuraEnabled public Decimal totalFundRequested;
        @AuraEnabled public Decimal totalDisbursed;
        @AuraEnabled public Decimal totalUtilized;
        @AuraEnabled public Decimal remainingGrant;

        public ResultPage() {
            this.records            = new List<Row>();
            this.totalGrantReceived = 0;
            this.totalFundRequested = 0;
            this.totalDisbursed     = 0;
            this.totalUtilized      = 0;
            this.remainingGrant     = 0;
        }
    }

    public class Row implements Comparable {
        @AuraEnabled public String  transactionType;
        @AuraEnabled public Date    transactionDate;
        @AuraEnabled public String  proposalId;
        @AuraEnabled public String  proposalName;
        @AuraEnabled public String  projectTitle;
        @AuraEnabled public String  milestoneId;
        @AuraEnabled public String  milestoneName;
        @AuraEnabled public String  referenceNumber;
        @AuraEnabled public Decimal amount;
        @AuraEnabled public String  fundingType;
        @AuraEnabled public String  status;
        @AuraEnabled public String  comments;

        // financial columns
        @AuraEnabled public Decimal totalProjectBudget;
        @AuraEnabled public Decimal milestoneBudget;
        @AuraEnabled public Decimal disbursedAmount;
        @AuraEnabled public Decimal utilizedAmount;
        @AuraEnabled public Decimal milestoneBalance;
        @AuraEnabled public Decimal unutilizedAmount;

        // true when milestoneBudget/disbursedAmount/utilizedAmount/milestoneBalance/
        // unutilizedAmount are a proposal-wide roll-up rather than one milestone's figures
        @AuraEnabled public Boolean isAggregateFinancials;

        // retained for backwards compatibility; mirrors milestoneBalance
        @AuraEnabled public Decimal remainingAmount;

        public Integer compareTo(Object compareTo) {
            Row other = (Row) compareTo;
            Date d1 = this.transactionDate;
            Date d2 = other.transactionDate;
            if (d1 == d2)   return 0;
            if (d1 == null) return 1;
            if (d2 == null) return -1;
            return d1 > d2 ? -1 : 1;
        }
    }

    // ---------------------------------------------------------------- account resolution

    public static Id getCOEAccountId() {
        List<User> users = [
            SELECT Id, ContactId, Contact.AccountId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];
        if (users.isEmpty() || users[0].ContactId == null || users[0].Contact.AccountId == null) {
            throw new ServiceException('Unable to resolve the logged-in COE account for the current user.');
        }
        return users[0].Contact.AccountId;
    }

    // ---------------------------------------------------------------- orchestration

    private static ResultPage getTransactionHistoryInternal(Filter filter, Boolean unpaginated) {
        filter = normalizeFilter(filter);
        Id coeAccountId = getCOEAccountId();

        primeContext(coeAccountId);

        List<Row> allRows = new List<Row>();
        allRows.addAll(buildFundingAwardRows(coeAccountId, filter));
        allRows.addAll(buildFundRequestRows(coeAccountId, filter));
        allRows.addAll(buildFundDisbursementRows(coeAccountId, filter));
        allRows.addAll(buildMilestoneEventRows(filter));

        // stamp every row with the six financial columns in one pass
        for (Row w : allRows) {
            applyFinancials(w);
        }

        allRows = applyRowFilters(allRows, filter);

        allRows.sort();
        if (filter.sortField == 'amount') {
            sortByAmount(allRows, filter.sortDirection);
        }

        ResultPage page = new ResultPage();
        page.totalRecords = allRows.size();
        page.pageSize     = filter.pageSize;
        page.pageNumber   = filter.pageNumber;

        if (unpaginated) {
            page.records    = allRows;
            page.totalPages = 1;
        } else {
            page.totalPages = (Integer) Math.ceil((Decimal) Math.max(page.totalRecords, 1) / filter.pageSize);
            Integer startIdx = (filter.pageNumber - 1) * filter.pageSize;
            Integer endIdx   = Math.min(startIdx + filter.pageSize, allRows.size());
            if (startIdx >= 0 && startIdx < allRows.size()) {
                List<Row> pageSlice = new List<Row>();
                for (Integer i = startIdx; i < endIdx; i++) {
                    pageSlice.add(allRows[i]);
                }
                page.records = pageSlice;
            }
        }

        applyKpiTotals(page, allRows);
        return page;
    }

    private static List<Row> applyRowFilters(List<Row> rows, Filter filter) {
        List<Row> result = rows;

        if (String.isNotBlank(filter.transactionType) && filter.transactionType != 'All') {
            List<Row> filtered = new List<Row>();
            for (Row w : result) {
                if (w.transactionType == filter.transactionType) filtered.add(w);
            }
            result = filtered;
        }

        if (String.isNotBlank(filter.proposalNameSearch)) {
            String needle = filter.proposalNameSearch.toLowerCase();
            List<Row> filtered = new List<Row>();
            for (Row w : result) {
                Boolean nameHit  = w.proposalName != null && w.proposalName.toLowerCase().contains(needle);
                Boolean titleHit = w.projectTitle != null && w.projectTitle.toLowerCase().contains(needle);
                if (nameHit || titleHit) filtered.add(w);
            }
            result = filtered;
        }

        if (String.isNotBlank(filter.milestoneNameSearch)) {
            String needle = filter.milestoneNameSearch.toLowerCase();
            List<Row> filtered = new List<Row>();
            for (Row w : result) {
                if (w.milestoneName != null && w.milestoneName.toLowerCase().contains(needle)) {
                    filtered.add(w);
                }
            }
            result = filtered;
        }

        return result;
    }

    // ---------------------------------------------------------------- context primer

    /**
     * Loads every milestone for the COE account once, plus the award -> proposal map,
     * plus three proposal-wide roll-ups (milestone budget / disbursed / utilized totals)
     * used as the fallback for rows that aren't scoped to a single milestone.
     */
    private static void primeContext(Id coeAccountId) {
        milestoneById                  = new Map<Id, Milestone__c>();
        projectBudgetByProposal        = new Map<Id, Decimal>();
        proposalByAward                = new Map<Id, Id>();
        milestoneBudgetTotalByProposal = new Map<Id, Decimal>();
        utilizedTotalByProposal        = new Map<Id, Decimal>();
        disbursedTotalByProposal       = new Map<Id, Decimal>();

        Set<String> fields = new Set<String>{
            'Id', 'Name', 'Status__c', 'Budget_Required__c', 'Budget_Required_INR__c',
            'Disbursed_Amount__c', 'Total_Utilized__c', 'Funding_Type__c',
            'Current_Technology_Readiness_Level_TRL__c', 'LastModifiedDate',
            'Individual_Application__c',
            'Individual_Application__r.Name',
            'Individual_Application__r.Project_Title__c',
            'Individual_Application__r.Total_Project_Budget_in_USD__c'
        };
        for (String optionalField : new List<String>{
            MILESTONE_UTILIZATION_DATE_FIELD,
            MILESTONE_REPORT_SUBMITTED_DATE_FIELD,
            MILESTONE_REPORT_APPROVED_DATE_FIELD
        }) {
            if (fieldExists('Milestone__c', optionalField)) fields.add(optionalField);
        }

        String query =
            'SELECT ' + String.join(new List<String>(fields), ', ') +
            ' FROM Milestone__c' +
            ' WHERE Individual_Application__r.' + String.escapeSingleQuotes(PROPOSAL_ACCOUNT_FIELD) +
            ' = :coeAccountId' +
            ' LIMIT ' + QUERY_LIMIT;

        for (SObject sObj : Database.query(query)) {
            Milestone__c m = (Milestone__c) sObj;
            milestoneById.put(m.Id, m);

            Id propId = m.Individual_Application__c;
            if (propId == null) continue;

            addToMapTotal(milestoneBudgetTotalByProposal, propId, m.Budget_Required__c);
            addToMapTotal(disbursedTotalByProposal, propId, m.Disbursed_Amount__c);
            addToMapTotal(utilizedTotalByProposal, propId, m.Total_Utilized__c);

            if (m.Individual_Application__r != null) {
                Decimal declared = m.Individual_Application__r.Total_Project_Budget_in_USD__c;
                if (declared != null && declared != 0) {
                    projectBudgetByProposal.put(propId, declared);
                }
            }
        }

        // where the proposal carries no declared budget, fall back to the milestone sum
        for (Id propId : milestoneBudgetTotalByProposal.keySet()) {
            if (!projectBudgetByProposal.containsKey(propId)) {
                projectBudgetByProposal.put(propId, milestoneBudgetTotalByProposal.get(propId));
            }
        }

        for (FundingAward fa : [
            SELECT Id, IndividualApplicationId
            FROM FundingAward
            WHERE AwardeeId = :coeAccountId
            LIMIT :QUERY_LIMIT
        ]) {
            if (fa.IndividualApplicationId != null) {
                proposalByAward.put(fa.Id, fa.IndividualApplicationId);
            }
        }
    }

    private static void addToMapTotal(Map<Id, Decimal> totals, Id key, Decimal amount) {
        Decimal delta   = amount == null ? 0 : amount;
        Decimal running = totals.get(key);
        totals.put(key, (running == null ? 0 : running) + delta);
    }

    /**
     * Fills the six financial columns. Never clobbers a value the builder already set,
     * so award-level disbursement totals survive.
     *
     * - Rows tied to one Milestone__c get that milestone's own figures.
     * - Rows NOT tied to a single milestone (Funding Award, Fund Request, and any
     *   Fund Disbursement without a milestone) fall back to the proposal-wide roll-up
     *   across all of that proposal's milestones, and are flagged isAggregateFinancials
     *   so the UI can label them clearly instead of showing a blank/misleading figure.
     */
    private static void applyFinancials(Row w) {
        Milestone__c m = (w.milestoneId != null) ? milestoneById.get(w.milestoneId) : null;

        if (m != null) {
            if (w.milestoneBudget == null) w.milestoneBudget = m.Budget_Required__c;
            if (w.disbursedAmount == null) w.disbursedAmount = m.Disbursed_Amount__c;
            if (w.utilizedAmount  == null) w.utilizedAmount  = m.Total_Utilized__c;
            if (String.isBlank(w.milestoneName)) w.milestoneName = m.Name;
            if (String.isBlank(w.fundingType))   w.fundingType   = m.Funding_Type__c;
            if (w.proposalId == null)            w.proposalId    = m.Individual_Application__c;
            if (String.isBlank(w.proposalName) && m.Individual_Application__r != null) {
                w.proposalName = m.Individual_Application__r.Name;
                w.projectTitle = m.Individual_Application__r.Project_Title__c;
            }
        } else if (w.proposalId != null) {
            // Not scoped to a single milestone (Funding Award / Fund Request / an
            // unlinked Fund Disbursement) — show the proposal-wide roll-up instead
            // of leaving these columns blank.
            if (w.milestoneBudget == null) w.milestoneBudget = milestoneBudgetTotalByProposal.get(w.proposalId);
            if (w.disbursedAmount == null) w.disbursedAmount = disbursedTotalByProposal.get(w.proposalId);
            if (w.utilizedAmount  == null) w.utilizedAmount  = utilizedTotalByProposal.get(w.proposalId);
            if (String.isBlank(w.milestoneName)) w.milestoneName = AGGREGATE_MILESTONE_LABEL;
            w.isAggregateFinancials = true;
        }

        if (w.isAggregateFinancials == null) w.isAggregateFinancials = false;

        Decimal budget = w.milestoneBudget == null ? 0 : w.milestoneBudget;
        Decimal util   = w.utilizedAmount  == null ? 0 : w.utilizedAmount;
        Decimal disb   = w.disbursedAmount == null ? 0 : w.disbursedAmount;

        // balances only make sense once at least one component is present
        if (w.milestoneBudget != null || w.utilizedAmount != null) {
            if (w.milestoneBudget == null || w.milestoneBudget == 0) {
    w.milestoneBalance = null;
} else {
    w.milestoneBalance = w.milestoneBudget - 
        (w.utilizedAmount == null ? 0 : w.utilizedAmount);
}
            w.remainingAmount  = w.milestoneBalance;
        }
        if (w.disbursedAmount != null || w.utilizedAmount != null) {
            w.unutilizedAmount = disb - util;
        }

        if (w.totalProjectBudget == null && w.proposalId != null) {
            w.totalProjectBudget = projectBudgetByProposal.get(w.proposalId);
        }
    }

    // ---------------------------------------------------------------- row builders

    private static List<Row> buildFundingAwardRows(Id coeAccountId, Filter filter) {
        List<Row> rows = new List<Row>();
        if (String.isNotBlank(filter.milestoneId)) return rows;

        for (FundingAward fa : [
            SELECT Id, AwardNumber, Amount, Status, Type_of_Fund__c, Awarded_Date__c,
                   Total_amount_disbursed__c, IndividualApplicationId, Comments__c, CreatedDate,
                   IndividualApplication.Name, IndividualApplication.Project_Title__c
            FROM FundingAward
            WHERE AwardeeId = :coeAccountId
            ORDER BY CreatedDate DESC
            LIMIT :QUERY_LIMIT
        ]) {
            Id propId = fa.IndividualApplicationId;
            if (String.isNotBlank(filter.proposalId) && propId != (Id) filter.proposalId) continue;

            Date effective = fa.Awarded_Date__c != null ? fa.Awarded_Date__c : fa.CreatedDate.date();
            if (effective < filter.dateFrom || effective > filter.dateTo) continue;

            Row w = new Row();
            w.transactionType = 'Funding Award';
            w.transactionDate = effective;
            w.referenceNumber = String.isNotBlank(fa.AwardNumber) ? fa.AwardNumber : fa.Id;
            w.amount          = fa.Amount;
            w.fundingType     = fa.Type_of_Fund__c;
            w.status          = fa.Status;
            w.comments        = stripHtml(fa.Comments__c);
            // Award-level disbursed total, when the org tracks it, wins over the
            // proposal roll-up (it is the source system's own figure for this award).
            w.disbursedAmount = fa.Total_amount_disbursed__c;
            w.proposalId      = propId;
            if (fa.IndividualApplication != null) {
                w.proposalName = fa.IndividualApplication.Name;
                w.projectTitle = fa.IndividualApplication.Project_Title__c;
            }
            rows.add(w);
        }
        return rows;
    }

    private static List<Row> buildFundRequestRows(Id coeAccountId, Filter filter) {
        List<Row> rows = new List<Row>();
        if (String.isNotBlank(filter.milestoneId)) return rows;

        for (Fund_Request__c fr : [
            SELECT Id, Name, Amount__c, Date_of_Request__c, Comments__c, Status__c,
                   Funding_Award__c,
                   Funding_Award__r.IndividualApplicationId,
                   Funding_Award__r.Type_of_Fund__c
            FROM Fund_Request__c
            WHERE Account__c = :coeAccountId
              AND Date_of_Request__c >= :filter.dateFrom
              AND Date_of_Request__c <= :filter.dateTo
            ORDER BY Date_of_Request__c DESC
            LIMIT :QUERY_LIMIT
        ]) {
            // proposal resolves through the linked funding award
            Id propId = null;
            if (fr.Funding_Award__c != null) {
                propId = proposalByAward.get(fr.Funding_Award__c);
                if (propId == null && fr.Funding_Award__r != null) {
                    propId = fr.Funding_Award__r.IndividualApplicationId;
                }
            }
            if (String.isNotBlank(filter.proposalId) && propId != (Id) filter.proposalId) continue;

            Row w = new Row();
            w.transactionType = 'Fund Request';
            w.transactionDate = fr.Date_of_Request__c;
            w.referenceNumber = fr.Name;
            w.amount          = fr.Amount__c;
            w.status          = fr.Status__c;
            w.comments        = stripHtml(fr.Comments__c);
            w.proposalId      = propId;
            if (fr.Funding_Award__r != null) {
                w.fundingType = fr.Funding_Award__r.Type_of_Fund__c;
            }
            rows.add(w);
        }
        return rows;
    }

    private static List<Row> buildFundDisbursementRows(Id coeAccountId, Filter filter) {
        List<Row> rows = new List<Row>();

        Datetime startDateTime = dtToDatetime(filter.dateFrom);
        Datetime endDateTime   = dtToDatetimeEnd(filter.dateTo);
        Id propId = String.isNotBlank(filter.proposalId)  ? (Id) filter.proposalId  : null;
        Id mId    = String.isNotBlank(filter.milestoneId) ? (Id) filter.milestoneId : null;

        String query =
            'SELECT Id, DisbursementName, Amount, DisbursementDate, Status, Comments__c, ' +
            'Requested_Support_Documents__c, FundingAwardId, Awardee__c, ' +
            'Proposal__c, Proposal__r.Name, Proposal__r.Project_Title__c, ' +
            'Proposal__r.Total_Project_Budget_in_USD__c, ' +
            'Milestone__c, Milestone__r.Name ' +
            'FROM FundingDisbursement ' +
            'WHERE (Awardee__c = :coeAccountId OR Proposal__r.' +
                String.escapeSingleQuotes(PROPOSAL_ACCOUNT_FIELD) + ' = :coeAccountId) ' +
            'AND DisbursementDate >= :startDateTime AND DisbursementDate <= :endDateTime ';
        if (propId != null) query += 'AND Proposal__c = :propId ';
        if (mId    != null) query += 'AND Milestone__c = :mId ';
        query += 'ORDER BY DisbursementDate DESC LIMIT ' + QUERY_LIMIT;

        for (FundingDisbursement fd : (List<FundingDisbursement>) Database.query(query)) {
            Row w = new Row();
            w.transactionType = 'Fund Disbursement';
            w.transactionDate = fd.DisbursementDate != null ? fd.DisbursementDate.date() : null;
            w.referenceNumber = String.isNotBlank(fd.DisbursementName) ? fd.DisbursementName : fd.Id;
            w.proposalId      = fd.Proposal__c;
            w.milestoneId     = fd.Milestone__c;
            w.amount          = fd.Amount;
            w.comments        = stripHtml(fd.Comments__c);
            w.status          = String.isNotBlank(fd.Status) ? fd.Status : 'Completed';

            if (fd.Proposal__r != null) {
                w.proposalName       = fd.Proposal__r.Name;
                w.projectTitle       = fd.Proposal__r.Project_Title__c;
                w.totalProjectBudget = fd.Proposal__r.Total_Project_Budget_in_USD__c;
            }
            if (fd.Milestone__r != null) {
                w.milestoneName = fd.Milestone__r.Name;
            }
            rows.add(w);
        }
        return rows;
    }

    /** Built entirely from the primed milestone cache — no extra SOQL. */
    private static List<Row> buildMilestoneEventRows(Filter filter) {
        List<Row> rows = new List<Row>();

        for (Milestone__c m : milestoneById.values()) {
            if (String.isNotBlank(filter.proposalId)  && m.Individual_Application__c != (Id) filter.proposalId) continue;
            if (String.isNotBlank(filter.milestoneId) && m.Id != (Id) filter.milestoneId) continue;

            Date utilDate      = getOptionalDate(m, MILESTONE_UTILIZATION_DATE_FIELD);
            Date submittedDate = getOptionalDate(m, MILESTONE_REPORT_SUBMITTED_DATE_FIELD);
            Date approvedDate  = getOptionalDate(m, MILESTONE_REPORT_APPROVED_DATE_FIELD);
            Date fallback      = m.LastModifiedDate.date();

            if (m.Total_Utilized__c != null && m.Total_Utilized__c > 0) {
                Date d = utilDate != null ? utilDate : fallback;
                if (d >= filter.dateFrom && d <= filter.dateTo) {
                    rows.add(milestoneRow('Utilization Update', d, m, m.Total_Utilized__c, 'In Progress'));
                }
            }
            if (m.Status__c == 'Report Submitted' || m.Status__c == 'Report Approved') {
                Date d = submittedDate != null ? submittedDate : fallback;
                if (d >= filter.dateFrom && d <= filter.dateTo) {
                    rows.add(milestoneRow('Report Submitted', d, m, null, 'Report Submitted'));
                }
            }
            if (m.Status__c == 'Report Approved') {
                Date d = approvedDate != null ? approvedDate : fallback;
                if (d >= filter.dateFrom && d <= filter.dateTo) {
                    rows.add(milestoneRow('Report Approved', d, m, null, 'Approved'));
                }
            }
        }
        return rows;
    }

    private static Row milestoneRow(String type, Date d, Milestone__c m, Decimal amount, String status) {
        Row w = new Row();
        w.transactionType = type;
        w.transactionDate = d;
        w.referenceNumber = m.Name + ' - ' + type;
        w.milestoneId     = m.Id;
        w.amount          = amount;
        w.status          = status;
        // proposal, names, budget, disbursed and utilized are filled by applyFinancials
        return w;
    }

    // ---------------------------------------------------------------- KPI totals

    private static void applyKpiTotals(ResultPage page, List<Row> allRows) {
        for (Row w : allRows) {
            Decimal amt = w.amount == null ? 0 : w.amount;
            if (w.transactionType == 'Funding Award') {
                page.totalGrantReceived += amt;
            } else if (w.transactionType == 'Fund Request') {
                page.totalFundRequested += amt;
            } else if (w.transactionType == 'Fund Disbursement') {
                page.totalDisbursed += amt;
            } else if (w.transactionType == 'Utilization Update') {
                page.totalUtilized += (w.utilizedAmount == null ? 0 : w.utilizedAmount);
            }
        }
        page.remainingGrant = page.totalGrantReceived - page.totalDisbursed;
    }

    // ---------------------------------------------------------------- helpers

    private static Filter normalizeFilter(Filter filter) {
        if (filter == null) filter = new Filter();
        if (filter.dateTo == null)   filter.dateTo   = Date.today();
        if (filter.dateFrom == null) filter.dateFrom = Date.today().addMonths(-12);
        if (filter.pageNumber == null || filter.pageNumber < 1) filter.pageNumber = 1;
        if (filter.pageSize == null   || filter.pageSize < 1)   filter.pageSize   = DEFAULT_PAGE_SIZE;
        if (filter.pageSize > MAX_PAGE_SIZE) filter.pageSize = MAX_PAGE_SIZE;
        if (String.isBlank(filter.sortDirection)) filter.sortDirection = 'DESC';
        return filter;
    }

    private static void sortByAmount(List<Row> rows, String direction) {
        Boolean ascending = direction == 'ASC';
        for (Integer i = 1; i < rows.size(); i++) {
            Row key = rows[i];
            Decimal keyAmt = key.amount == null ? 0 : key.amount;
            Integer j = i - 1;
            while (j >= 0 && compareAmt(rows[j].amount, keyAmt, ascending)) {
                rows[j + 1] = rows[j];
                j--;
            }
            rows[j + 1] = key;
        }
    }

    private static Boolean compareAmt(Decimal a, Decimal keyAmt, Boolean ascending) {
        Decimal aVal = a == null ? 0 : a;
        return ascending ? aVal > keyAmt : aVal < keyAmt;
    }

    private static String stripHtml(String richText) {
        if (String.isBlank(richText)) return richText;
        String plain = richText.replaceAll('<[^>]*>', ' ');
        plain = plain.replace('&nbsp;', ' ')
                     .replace('&amp;', '&')
                     .replace('&lt;', '<')
                     .replace('&gt;', '>')
                     .replace('&quot;', '"')
                     .replace('&#39;', '\'');
        return plain.trim().replaceAll('\\s+', ' ');
    }

    private static Date getOptionalDate(SObject obj, String fieldApiName) {
        try {
            Object val = obj.get(fieldApiName);
            if (val == null) return null;
            if (val instanceof Date)     return (Date) val;
            if (val instanceof Datetime) return ((Datetime) val).date();
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private static Boolean fieldExists(String objectApiName, String fieldApiName) {
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        if (!gd.containsKey(objectApiName)) return false;
        return gd.get(objectApiName).getDescribe().fields.getMap()
                 .containsKey(fieldApiName.toLowerCase());
    }

    private static Datetime dtToDatetime(Date d) {
        return d == null ? null : Datetime.newInstance(d, Time.newInstance(0, 0, 0, 0));
    }

    private static Datetime dtToDatetimeEnd(Date d) {
        return d == null ? null : Datetime.newInstance(d, Time.newInstance(23, 59, 59, 999));
    }
}