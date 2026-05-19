public without sharing class PIDashboardController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getPICounts() {

        Map<String, Integer> counts = new Map<String, Integer>{
            // Draft & COE
            'Draft' => 0,
            'SubmittedToCOE' => 0,
            'ApprovedByCOE' => 0,
            'RejectedByCOE' => 0,
            'RevisionByCOE' => 0,
            'ResubmittedToCOE' => 0,

            // WIN Admin
            'SubmittedToWIN' => 0,
            'ApprovedByWIN' => 0,
            'RejectedByWIN' => 0,
            'RevisionByWIN' => 0,
            'ResubmittedToWIN' => 0      // ✅ ADDED (NEW TILE)
        };

        try {
            User currentUser = [
                SELECT ContactId, Contact.AccountId
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];

            if (currentUser.ContactId != null) {

                List<AggregateResult> results = [
                    SELECT Status, COUNT(Id) total
                    FROM IndividualApplication
                    WHERE CreatedById = :UserInfo.getUserId()
                    AND ApplicationType = 'WIN Project Proposal'
                    AND Status IN (
                        'Draft',
                        'Proposal Submitted to COE Admin',
                        'Proposal Approved by COE Admin',
                        'Proposal Rejected by COE Admin',
                        'Asked for Resubmission by COE Admin',
                        'Proposal Resubmitted to COE Admin',

                        /* WIN Admin statuses */
                        'Proposal Submitted to WIN Admin',
                        'Proposal Approved by WIN Admin',
                        'Proposal Rejected by WIN Admin',
                        'Asked for Resubmission by WIN Admin',
                        'Proposal Resubmitted to WIN Admin'   // ✅ ADDED
                    )
                    GROUP BY Status
                ];

                for (AggregateResult ar : results) {
                    String status = (String) ar.get('Status');
                    Integer total = (Integer) ar.get('total');

                    if (status == 'Draft')
                        counts.put('Draft', total);
                    else if (status == 'Proposal Submitted to COE Admin')
                        counts.put('SubmittedToCOE', total);
                    else if (status == 'Proposal Approved by COE Admin')
                        counts.put('ApprovedByCOE', total);
                    else if (status == 'Proposal Rejected by COE Admin')
                        counts.put('RejectedByCOE', total);
                    else if (status == 'Asked for Resubmission by COE Admin')
                        counts.put('RevisionByCOE', total);
                    else if (status == 'Proposal Resubmitted to COE Admin')
                        counts.put('ResubmittedToCOE', total);
                    else if (status == 'Proposal Submitted to WIN Admin')
                        counts.put('SubmittedToWIN', total);
                    else if (status == 'Proposal Approved by WIN Admin')
                        counts.put('ApprovedByWIN', total);
                    else if (status == 'Proposal Rejected by WIN Admin')
                        counts.put('RejectedByWIN', total);
                    else if (status == 'Asked for Resubmission by WIN Admin')
                        counts.put('RevisionByWIN', total);
                    else if (status == 'Proposal Resubmitted to WIN Admin')
                        counts.put('ResubmittedToWIN', total); // ✅ ADDED
                }
            }

        } catch (Exception e) {
            System.debug('⚠️ Error in getPICounts: ' + e.getMessage());
        }

        return counts;
    }
}