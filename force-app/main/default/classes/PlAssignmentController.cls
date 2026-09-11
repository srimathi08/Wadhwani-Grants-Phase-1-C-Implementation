/**
 * PlAssignmentController
 * ─────────────────────────────────────────────────────────────────────────────
 * Backs the wcfPlAssignmentQueue LWC.
 *
 *   Account (org)
 *     PL__c        → Lookup(Account)  — assigned WG Program Lead
 *     Co_Pl_rec__c → Lookup(Account)  — assigned Co-PL
 *
 *   Account (person — PL/Co-PL eligible)
 *     WG_PL__c     → Boolean — marks person account as WG-PL eligible
 *     WG_Co_PL__c  → Boolean — marks person account as WG-Co-PL eligible
 *
 *   IndividualApplication
 *     Name                                       → IA-XXXXXXXXX
 *     Organization_Name__c                       → org display name
 *     Headquarters_City_and_Country__c           → city + country
 *     Submitter_Name__c                          → submitter display name
 *     Organizational_Area_s_for_Funding_Inves__c → track picklist
 *     Status                                     → workflow status
 *     AccountId                                  → standard Lookup to org Account
 * ─────────────────────────────────────────────────────────────────────────────
 */
public without sharing class PlAssignmentController {

    // ── Wrappers ──────────────────────────────────────────────────────────────

    public class ApplicationRow {
        @AuraEnabled public String  applicationId;
        @AuraEnabled public Id      applicationSfId;
        @AuraEnabled public String  organizationName;
        @AuraEnabled public Id      organizationAccountId;
        @AuraEnabled public String  headquarters;
        @AuraEnabled public String  submitterName;
        @AuraEnabled public String  track;
        @AuraEnabled public String  validationStatus;
        @AuraEnabled public String  submittedDate;
        @AuraEnabled public Id      currentPlId;        // PL__c on org Account
        @AuraEnabled public String  currentPlName;      // PL__r.Name
        @AuraEnabled public Id      currentCoplId;      // Co_Pl_rec__c on org Account
        @AuraEnabled public String  currentCoplName;    // Co_Pl_rec__r.Name
    }

    public class PLRow {
        @AuraEnabled public Id      plAccountId;
        @AuraEnabled public String  plName;
        @AuraEnabled public String  plEmail;
        @AuraEnabled public Integer assignedOrgCount;
        @AuraEnabled public String  assignedOrgNames;
        @AuraEnabled public Boolean isWgPl;
        @AuraEnabled public Boolean isWgCoPl;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Queue rows
    // ─────────────────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=false)
    public static List<ApplicationRow> getValidatedApplications(
            String searchTerm,
            String trackFilter,
            String statusFilter) {

        List<ApplicationReview> validatedReviews = [
            SELECT ApplicationId
            FROM ApplicationReview
            WHERE RecordType.Name = 'WCF Validator'
            AND   Status = 'Validated'
        ];

        Set<Id> validatedIAIds = new Set<Id>();
        for (ApplicationReview ar : validatedReviews) {
            if (ar.ApplicationId != null) validatedIAIds.add(ar.ApplicationId);
        }

        if (validatedIAIds.isEmpty()) return new List<ApplicationRow>();

        String baseWhere = ' WHERE Id IN :validatedIAIds ';

        if (String.isNotBlank(trackFilter) && trackFilter != 'All Tracks') {
            String safe = '%' + String.escapeSingleQuotes(trackFilter) + '%';
            baseWhere += ' AND Organizational_Area_s_for_Funding_Inves__c LIKE \'' + safe + '\' ';
        }
        if (String.isNotBlank(statusFilter) && statusFilter != 'All Statuses') {
            String safe = String.escapeSingleQuotes(statusFilter);
            baseWhere += ' AND Status = \'' + safe + '\' ';
        }
        if (String.isNotBlank(searchTerm)) {
            String t = '%' + String.escapeSingleQuotes(searchTerm) + '%';
            baseWhere += ' AND (Name LIKE \'' + t + '\''
                       + ' OR Organization_Name__c LIKE \'' + t + '\''
                       + ' OR Submitter_Name__c LIKE \'' + t + '\') ';
        }

        List<IndividualApplication> apps = Database.query(
            'SELECT Id, Name, Organization_Name__c, Headquarters_City_and_Country__c,'
            + ' Submitter_Name__c, Organizational_Area_s_for_Funding_Inves__c,'
            + ' Status, CreatedDate,'
            + ' AccountId, Account.Name,'
            + ' Account.PL__c,        Account.PL__r.Name,'
            + ' Account.Co_Pl_rec__c, Account.Co_Pl_rec__r.Name'
            + ' FROM IndividualApplication'
            + baseWhere
            + ' ORDER BY CreatedDate DESC LIMIT 200'
        );

        List<ApplicationRow> rows = new List<ApplicationRow>();
        for (IndividualApplication app : apps) {
            ApplicationRow r        = new ApplicationRow();
            r.applicationSfId       = app.Id;
            r.applicationId         = app.Name;
            r.organizationAccountId = app.AccountId;
            r.organizationName      = app.Organization_Name__c != null
                                      ? app.Organization_Name__c
                                      : (app.Account != null ? app.Account.Name : '—');
            r.headquarters          = app.Headquarters_City_and_Country__c != null
                                      ? app.Headquarters_City_and_Country__c : '—';
            r.submitterName         = app.Submitter_Name__c != null ? app.Submitter_Name__c : '—';
            r.track                 = app.Organizational_Area_s_for_Funding_Inves__c;
            r.validationStatus      = app.Status;
            r.submittedDate         = app.CreatedDate != null
                                      ? app.CreatedDate.format('dd MMM yyyy') : '—';
            r.currentPlId           = (app.Account != null) ? app.Account.PL__c           : null;
            r.currentPlName         = (app.Account != null && app.Account.PL__r != null)
                                      ? app.Account.PL__r.Name : null;
            r.currentCoplId         = (app.Account != null) ? app.Account.Co_Pl_rec__c    : null;
            r.currentCoplName       = (app.Account != null && app.Account.Co_Pl_rec__r != null)
                                      ? app.Account.Co_Pl_rec__r.Name : null;
            rows.add(r);
        }
        return rows;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. PL accounts for the modal
    // ─────────────────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=false)
    public static List<PLRow> getPLAccounts() {

        List<Account> plPersonAccounts = [
            SELECT Id, Name, PersonEmail, WG_PL__c, WG_Co_PL__c
            FROM Account
            WHERE WG_PL__c = true OR WG_Co_PL__c = true
            ORDER BY Name ASC
            LIMIT 200
        ];
        if (plPersonAccounts.isEmpty()) return new List<PLRow>();

        Set<Id> plIdSet = new Set<Id>();
        for (Account a : plPersonAccounts) plIdSet.add(a.Id);

        Map<Id, List<String>> plToOrgNames = new Map<Id, List<String>>();
        for (Id pid : plIdSet) plToOrgNames.put(pid, new List<String>());

        for (Account org : [
            SELECT Id, Name, PL__c FROM Account
            WHERE PL__c IN :plIdSet ORDER BY Name ASC
        ]) {
            if (plToOrgNames.containsKey(org.PL__c))
                plToOrgNames.get(org.PL__c).add(org.Name + ' (PL)');
        }

        for (Account org : [
            SELECT Id, Name, Co_Pl_rec__c FROM Account
            WHERE Co_Pl_rec__c IN :plIdSet ORDER BY Name ASC
        ]) {
            if (plToOrgNames.containsKey(org.Co_Pl_rec__c))
                plToOrgNames.get(org.Co_Pl_rec__c).add(org.Name + ' (Co-PL)');
        }

        List<PLRow> rows = new List<PLRow>();
        for (Account pl : plPersonAccounts) {
            PLRow r            = new PLRow();
            r.plAccountId      = pl.Id;
            r.plName           = pl.Name;
            r.plEmail          = pl.PersonEmail;
            r.isWgPl           = pl.WG_PL__c;
            r.isWgCoPl         = pl.WG_Co_PL__c;
            List<String> orgs  = plToOrgNames.get(pl.Id);
            r.assignedOrgCount = orgs.size();
            r.assignedOrgNames = orgs.isEmpty() ? null : String.join(orgs, ', ');
            rows.add(r);
        }
        return rows;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Assign / unassign — role param routes to PL__c or Co_Pl_rec__c
    // ─────────────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void assignPL(Id orgAccountId, Id plAccountId, String role) {
        if (orgAccountId == null) {
            throw new AuraHandledException('Organisation Account Id is required.');
        }
        try {
            Account orgAcct = new Account(Id = orgAccountId);
            if (role == 'Co-PL') {
                orgAcct.Co_Pl_rec__c = plAccountId;
            } else {
                orgAcct.PL__c = plAccountId;
            }
            update as system orgAcct;
        } catch (DmlException e) {
            throw new AuraHandledException('Assignment failed: ' + e.getDmlMessage(0));
        }
    }

// ── Fetch current PL/Co-PL assignment for a single org Account ──
@AuraEnabled(cacheable=false)
public static Account getOrgPLInfo(Id orgAccountId) {
    List<Account> accts = [
        SELECT Id, PL__c, PL__r.Name, Co_Pl_rec__c, Co_Pl_rec__r.Name
        FROM Account
        WHERE Id = :orgAccountId
        LIMIT 1
    ];
    return accts.isEmpty() ? null : accts[0];
}
}