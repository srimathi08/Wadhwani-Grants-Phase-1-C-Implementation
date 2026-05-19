public with sharing class CoeApplicationListController {

    @AuraEnabled(cacheable=true)
    public static List<IndividualApplication> getApplications(
        String  statusKey,
        Integer selectedYear,
        Integer selectedMonth   // ✅ NEW: optional month filter (null = all months)
    ) {
        Id accountId = [
            SELECT Contact.AccountId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ].Contact.AccountId;

        if (accountId == null) return new List<IndividualApplication>();

        List<String> statusList = new List<String>();

        // ── Map statusKey → actual Status values ────────────────────────────
        if (statusKey == 'Draft') {
            statusList.add('Draft');
        }
        else if (statusKey == 'Submitted') {
            statusList.addAll(new List<String>{
                'Proposal Submitted to COE Admin',
                'Proposal Submitted to WIN Admin',
                'Under External Review'
            });
        }
        else if (statusKey == 'ResubmissionByCOE') {
            statusList.addAll(new List<String>{
                'Asked for Resubmission by COE Admin',
                'Asked for Resubmission by WIN Admin',
                'Proposal Resubmitted to COE Admin',
                'Proposal Resubmitted to WIN Admin'
            });
        }
        else if (statusKey == 'ApprovedByCOE') {
            statusList.addAll(new List<String>{
                'Proposal Approved by COE Admin',
                'Proposal Approved by WIN Admin',
                'Approved - Level 1',
                'Approved - Level 2'
            });
        }
        else if (statusKey == 'ApprovedForFunding') {
            statusList.addAll(new List<String>{
                'Approved for Funding',
                'Recommended for Funding'
            });
        }
        //else if (statusKey == 'RejectedByWIN') {
          //  statusList.add('Proposal Rejected by WIN Admin');
        //}

        else if (statusKey == 'RejectedByWIN') {
    statusList.addAll(new List<String>{
        'Proposal Rejected by WIN Admin',
        'Rejected - Level 1',
        'Rejected - Level 2'
    });
}
        else if (statusKey == 'RejectedByCOE') {
            statusList.add('Proposal Rejected by COE Admin');
        }
        else if (statusKey == 'NotRecommendedFunding') {
            statusList.add('Not Recommended for Funding');
        }

        if (statusList.isEmpty()) return new List<IndividualApplication>();

        // ── Build dynamic SOQL to support optional month filter ─────────────
        String baseQuery =
            'SELECT Id, Name, Status, CreatedDate ' +
            'FROM IndividualApplication ' +
            'WHERE AccountId = :accountId ' +
            '  AND ApplicationType = \'WIN Project Proposal\' ' +
            '  AND CALENDAR_YEAR(CreatedDate) = :selectedYear ' +
            '  AND Status IN :statusList';

        if (selectedMonth != null && selectedMonth >= 1 && selectedMonth <= 12) {
            baseQuery += ' AND CALENDAR_MONTH(CreatedDate) = :selectedMonth';
        }

        baseQuery += ' ORDER BY CreatedDate DESC';

        return Database.query(baseQuery);
    }
}