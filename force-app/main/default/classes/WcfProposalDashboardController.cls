public without sharing class WcfProposalDashboardController {

    @AuraEnabled(cacheable=false)
    public static Map<String, Integer> getWcfProposalCounts() {

        Map<String, Integer> counts = new Map<String, Integer>{
            'Draft'             => 0,
            'Submitted'         => 0,
            'RevisionRequested' => 0,
            'InReview'          => 0,
            'Approved'          => 0,
            'Rejected'          => 0
        };

        try {
            Set<String> wcfRecordTypeNames = new Set<String>{
                'WCF_Job_Creation_Proposals',
                'WCF_Job_Fulfillment_Job_Creation_Proposals',
                'WCF_Job_Fulfillment_Proposals'
            };

            Set<Id> wcfRecordTypeIds = new Set<Id>();

            for (RecordType rt : [
                SELECT Id
                FROM RecordType
                WHERE SObjectType = 'IndividualApplication'
                AND DeveloperName IN :wcfRecordTypeNames
            ]) {
                wcfRecordTypeIds.add(rt.Id);
            }

            if (!wcfRecordTypeIds.isEmpty()) {

                List<AggregateResult> results = [
                    SELECT Status, COUNT(Id) total
                    FROM IndividualApplication
                    WHERE RecordTypeId IN :wcfRecordTypeIds
                    AND OwnerId = :UserInfo.getUserId()
                    AND Status IN (
                        'Draft',
                        'Submitted',
                        'Revision Requested',
                        'In Review',
                        'Approved',
                        'Rejected'
                    )
                    GROUP BY Status
                ];

                for (AggregateResult ar : results) {
                    String status = (String) ar.get('Status');
                    Integer total  = (Integer) ar.get('total');

                    if      (status == 'Draft')              counts.put('Draft', total);
                    else if (status == 'Submitted')          counts.put('Submitted', total);
                    else if (status == 'Revision Requested') counts.put('RevisionRequested', total);
                    else if (status == 'In Review')          counts.put('InReview', total);
                    else if (status == 'Approved')           counts.put('Approved', total);
                    else if (status == 'Rejected')           counts.put('Rejected', total);
                }
            }

        } catch (Exception e) {
            System.debug('❌ Error in getWcfProposalCounts: ' + e.getMessage());
        }

        return counts;
    }
}