public without sharing class ProposalDashboardController {

    @AuraEnabled(cacheable=true)
   public static Map<String, Integer> getDashboardStages(
    Integer selectedYear,
    Integer selectedMonth,
    String  fromDate,
    String  toDate     // ✅ NEW: "YYYY-MM-DD" or null
    ) {

        Map<String, Integer> counts = new Map<String, Integer>{
            'Total'          => 0,
            'Draft'          => 0,
            'Submitted'      => 0,
            'Resubmission'   => 0,
            'Shortlisted'    => 0,
            'Funded'         => 0,
            'Rejected'       => 0,
            'RejectedByWIN'  => 0,
            'RejectedByCOE'  => 0,
            'NotRecommended' => 0
        };

        try {
            User currentUser = [
                SELECT Contact.AccountId
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];

            Id accountId = currentUser?.Contact?.AccountId;
            if (accountId == null) return counts;

           // ── Parse date range (based on AppliedDate) ─────────────────────────────────
DateTime rangeStart = null;
DateTime rangeEnd   = null;

if (String.isNotBlank(fromDate)) {
    try {
        Date d = Date.valueOf(fromDate);
        rangeStart = DateTime.newInstance(d, Time.newInstance(0, 0, 0, 0));
    } catch (Exception ex) {
        System.debug('ProposalDashboardController: invalid fromDate: ' + fromDate);
    }
}

if (String.isNotBlank(toDate)) {
    try {
        Date d = Date.valueOf(toDate);
        rangeEnd = DateTime.newInstance(d, Time.newInstance(23, 59, 59, 999));
    } catch (Exception ex) {
        System.debug('ProposalDashboardController: invalid toDate: ' + toDate);
    }
}

            // ── Build query dynamically ───────────────────────────────────────
            String baseQuery =
                'SELECT Status ' +
                'FROM IndividualApplication ' +
                'WHERE AccountId = :accountId ' +
                '  AND ApplicationType = \'WIN Project Proposal\' ' +
                '  AND CALENDAR_YEAR(AppliedDate) = :selectedYear';

           // Month filter — skipped when a date range is active
if (rangeStart == null && rangeEnd == null
        && selectedMonth != null
        && selectedMonth >= 1 && selectedMonth <= 12) {
    baseQuery += ' AND CALENDAR_MONTH(AppliedDate) = :selectedMonth';
}

// From date
if (rangeStart != null) {
    baseQuery += ' AND AppliedDate >= :rangeStart';
}

// To date
if (rangeEnd != null) {
    baseQuery += ' AND AppliedDate <= :rangeEnd';
}

            List<IndividualApplication> apps = Database.query(baseQuery);

            // Total = ALL records including Draft
            counts.put('Total', apps.size());

            for (IndividualApplication app : apps) {
                String s = app.Status;

                // ✅ DRAFT
                if (s == 'Draft') {
                    counts.put('Draft', counts.get('Draft') + 1);
                }

                // ✅ SUBMITTED
                else if (s == 'Proposal Submitted to COE Admin' ||
                         s == 'Proposal Submitted to WIN Admin' ||
                         s == 'Under External Review') {

                    counts.put('Submitted', counts.get('Submitted') + 1);
                }

                // ✅ RESUBMISSION
                else if (s == 'Asked for Resubmission by COE Admin' ||
                         s == 'Asked for Resubmission by WIN Admin' ||
                         s == 'Proposal Resubmitted to COE Admin'   ||
                         s == 'Proposal Resubmitted to WIN Admin') {

                    counts.put('Resubmission', counts.get('Resubmission') + 1);
                }

                // ✅ SHORTLISTED
                else if (s == 'Proposal Approved by COE Admin' ||
                         s == 'Proposal Approved by WIN Admin' ||
                         s == 'Approved - Level 1'             ||
                         s == 'Approved - Level 2') {

                    counts.put('Shortlisted', counts.get('Shortlisted') + 1);
                }

                // ✅ FUNDED
                else if (s == 'Approved for Funding' ||
                         s == 'Recommended for Funding') {

                    counts.put('Funded', counts.get('Funded') + 1);
                }

                // ✅ REJECTED - WIN
                else if (s == 'Proposal Rejected by WIN Admin' ||
                         s == 'Rejected - Level 1'             ||
                         s == 'Rejected - Level 2') {

                    counts.put('Rejected',      counts.get('Rejected')      + 1);
                    counts.put('RejectedByWIN', counts.get('RejectedByWIN') + 1);
                }

                // ✅ REJECTED - COE
                else if (s == 'Proposal Rejected by COE Admin') {
                    counts.put('Rejected',      counts.get('Rejected')      + 1);
                    counts.put('RejectedByCOE', counts.get('RejectedByCOE') + 1);
                }

                // ✅ NOT RECOMMENDED
                else if (s == 'Not Recommended for Funding') {
                    counts.put('Rejected',       counts.get('Rejected')       + 1);
                    counts.put('NotRecommended', counts.get('NotRecommended') + 1);
                }
            }

        } catch (Exception e) {
            System.debug('ProposalDashboardController error: ' + e.getMessage());
        }

        return counts;
    }
}