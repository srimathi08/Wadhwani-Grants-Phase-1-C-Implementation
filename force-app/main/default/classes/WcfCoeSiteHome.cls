public without sharing class WcfCoeSiteHome {

    /* =========================
       STEP 1 – REGISTRATION
       ========================= */
    @AuraEnabled(cacheable=true)
    public static Boolean getAccountRegistrationStatus() {

        User u = [
            SELECT Contact.AccountId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        if (u.Contact != null && u.Contact.AccountId != null) {
            Account acc = [
                SELECT Institution_Registered__c
                FROM Account
                WHERE Id = :u.Contact.AccountId
                LIMIT 1
            ];
            return acc.Institution_Registered__c;
        }

        return false;
    }

    /* =========================
       STEP 2 – COE PROPOSAL STATUS
       NORMALIZED STATUS (SOURCE OF TRUTH)
       ========================= */
    @AuraEnabled(cacheable=true)
    public static String getCOEProposalStatus() {

        List<IndividualApplication> apps = [
            SELECT Status
            FROM IndividualApplication
            WHERE CreatedById = :UserInfo.getUserId()
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];

        // No proposal created yet
        if (apps.isEmpty()) {
            return 'YET_TO_START';
        }

        String status = apps[0].Status;

        // ✅ COE APPROVAL → ONLY THIS unlocks STEP 3
        if (
            status == 'Approved by COE Admin' ||
            status == 'Approved'
        ) {
            return 'APPROVED';
        }

        // ⏳ Submitted states
        if (
            status == 'Submitted' ||
            status == 'Resubmitted'
        ) {
            return 'SUBMITTED';
        }

        // Default fallback
        return 'IN_PROGRESS';
    }

    /* =========================
       STEP 3 – PROJECT PROPOSAL DASHBOARD
       (KEEP FOR EXISTING FEATURES)
       ========================= */
    @AuraEnabled(cacheable=true)
    public static ProjectProposalSummary getProjectProposalSummary() {

        ProjectProposalSummary summary = new ProjectProposalSummary();

        List<AggregateResult> results = [
            SELECT Status, COUNT(Id) countVal
            FROM IndividualApplication
            WHERE CreatedById = :UserInfo.getUserId()
            GROUP BY Status
        ];

        summary.statusCounts = new Map<String, Integer>();
        for (AggregateResult ar : results) {
            summary.statusCounts.put(
                String.valueOf(ar.get('Status')),
                (Integer) ar.get('countVal')
            );
        }

        summary.totalCount = [
            SELECT COUNT()
            FROM IndividualApplication
            WHERE CreatedById = :UserInfo.getUserId()
        ];

        return summary;
    }

    /* =========================
       WRAPPER CLASS
       ========================= */
    public class ProjectProposalSummary {
        @AuraEnabled public Integer totalCount;
        @AuraEnabled public Map<String, Integer> statusCounts;
    }
}