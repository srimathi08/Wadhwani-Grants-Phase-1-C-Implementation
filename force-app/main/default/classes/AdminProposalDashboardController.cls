public without sharing class AdminProposalDashboardController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getAllProposalCounts() {
        System.debug('--- getAllProposalCounts START ---');

        Map<String, Integer> counts = new Map<String, Integer>{
            // COE
            'SubmittedToCOE' => 0,
            'ApprovedByCOE' => 0,
            'RejectedByCOE' => 0,
            'ResubmissionByCOE' => 0,
            'ResubmittedToCOE' => 0,

            // WIN
            'SubmittedToWIN' => 0,
            'ApprovedByWIN' => 0,
            'RejectedByWIN' => 0,
            'ResubmissionByWIN' => 0,
            'ResubmittedToWIN' => 0,
            'ApprovedForFunding' => 0,
            'NotRecommendedForFunding' => 0
        };

        try {
            List<AggregateResult> results = [
                SELECT Status, COUNT(Id) total
                FROM IndividualApplication
                WHERE ApplicationType = 'WIN Project Proposal'
                AND Status IN (
                    'Proposal Submitted to COE Admin',
                    'Proposal Approved by COE Admin',
                    'Proposal Rejected by COE Admin',
                    'Asked for Resubmission by COE Admin',
                    'Proposal Resubmitted to COE Admin',
                    'Proposal Submitted to WIN Admin',
                    'Proposal Approved by WIN Admin',
                    'Proposal Rejected by WIN Admin',
                    'Asked for Resubmission by WIN Admin',
                    'Proposal Resubmitted to WIN Admin',
                    'Approved for Funding',
                    'Not Recommended for Funding'
                )
                GROUP BY Status
            ];

            for (AggregateResult ar : results) {
                String status = (String) ar.get('Status');
                Integer total = (Integer) ar.get('total');
                System.debug('Status: ' + status + ' => ' + total);

                // COE
                if (status == 'Proposal Submitted to COE Admin')
                    counts.put('SubmittedToCOE', total);
                else if (status == 'Proposal Approved by COE Admin')
                    counts.put('ApprovedByCOE', total);
                else if (status == 'Proposal Rejected by COE Admin')
                    counts.put('RejectedByCOE', total);
                else if (status == 'Asked for Resubmission by COE Admin')
                    counts.put('ResubmissionByCOE', total);
                else if (status == 'Proposal Resubmitted to COE Admin')
                    counts.put('ResubmittedToCOE', total);

                // WIN
                else if (status == 'Proposal Submitted to WIN Admin')
                    counts.put('SubmittedToWIN', total);
                else if (status == 'Proposal Approved by WIN Admin')
                    counts.put('ApprovedByWIN', total);
                else if (status == 'Proposal Rejected by WIN Admin')
                    counts.put('RejectedByWIN', total);
                else if (status == 'Asked for Resubmission by WIN Admin')
                    counts.put('ResubmissionByWIN', total);
                else if (status == 'Proposal Resubmitted to WIN Admin')
                    counts.put('ResubmittedToWIN', total);
                else if (status == 'Approved for Funding')
                    counts.put('ApprovedForFunding', total);
                else if (status == 'Not Recommended for Funding')
                    counts.put('NotRecommendedForFunding', total);
            }
        } catch (Exception e) {
            System.debug('⚠️ Error in getAllProposalCounts: ' + e.getMessage());
        }

        System.debug('✅ Final Counts Map: ' + counts);
        return counts;
    }
}