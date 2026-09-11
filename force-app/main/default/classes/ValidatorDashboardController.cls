public without sharing class ValidatorDashboardController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getValidatorCounts() {
        Map<String, Integer> counts = new Map<String, Integer>{
            'NotApproved'      => 0,
            'YetToStart'       => 0,
            'InProgress'       => 0,
            'ReviewSubmitted'  => 0,
            'Draft'            => 0,
            'ReviewerRejected' => 0,
            'Sealed'           => 0
        };

        for (AggregateResult ar : [
            SELECT Status, COUNT(Id) cnt
            FROM ApplicationReview
            WHERE Status IN (
                'Not Approved',
                'Yet to start',
                'In Progress',
                'Review Submitted',
                'Draft',
                'Reviewer Rejected',
                'Sealed'
            )
            GROUP BY Status
        ]) {
            String status = (String) ar.get('Status');
            Integer cnt   = (Integer) ar.get('cnt');

            if      (status == 'Not Approved')      counts.put('NotApproved',      cnt);
            else if (status == 'Yet to start')       counts.put('YetToStart',       cnt);
            else if (status == 'In Progress')        counts.put('InProgress',       cnt);
            else if (status == 'Review Submitted')   counts.put('ReviewSubmitted',  cnt);
            else if (status == 'Draft')              counts.put('Draft',            cnt);
            else if (status == 'Reviewer Rejected')  counts.put('ReviewerRejected', cnt);
            else if (status == 'Sealed')             counts.put('Sealed',           cnt);
        }

        return counts;
    }
}