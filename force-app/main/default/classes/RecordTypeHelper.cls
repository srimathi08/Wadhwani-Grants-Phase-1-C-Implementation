/**
 * Centralized RecordType filtering helper.
 *
 * Maps each object to its allowed RecordType DeveloperNames (per the
 * Object -> Allowed Record Types table), resolves them to RecordTypeIds
 * once, and caches the result so repeated calls don't re-describe.
 *
 * IMPORTANT: The DeveloperName values below are inferred from the labels
 * in your table (spaces -> underscores, punctuation stripped). Please
 * verify the actual DeveloperName for each RecordType in
 * Setup > Object Manager > [Object] > Record Types before deploying —
 * Apex DeveloperNames don't always match the label exactly.
 */
public with sharing class RecordTypeHelper {

    // Cache key: "ObjectApiName.DeveloperName" -> RecordTypeId
    private static Map<String, Id> recordTypeIdCache = new Map<String, Id>();

    // ── IndividualApplication ──
    public static final Set<String> INDIVIDUAL_APPLICATION_TYPES = new Set<String>{
        'Wadhwani_Grants',
        'WCF_Job_Fulfillment_Proposals',
        'WCF_Job_Creation_Proposals',
        'WCF_Job_Fulfillment_Job_Creation_Proposals'
    };

    // ── ApplicationReview ──
    public static final Set<String> APPLICATION_REVIEW_TYPES = new Set<String>{
        'WCF_Job_Creation_Review',
        'WCF_Job_Fulfillment',
        'WCF_Job_Fulfillment_Job_Creation',
        'WCF_Validator'
    };

    // Subset used by the reviewer-side (non-validator) flows
    public static final Set<String> APPLICATION_REVIEW_REVIEWER_TYPES = new Set<String>{
        'WCF_Job_Creation_Review',
        'WCF_Job_Fulfillment',
        'WCF_Job_Fulfillment_Job_Creation'
    };

    // ── ApplicationDecision ──
    public static final Set<String> APPLICATION_DECISION_TYPES = new Set<String>{
        'Approver'   //WF_Approver
    };

    /**
     * Resolve a single object + DeveloperName to its RecordTypeId (cached).
     */
    public static Id getRecordTypeId(String objectApiName, String developerName) {
        String key = objectApiName + '.' + developerName;
        if (!recordTypeIdCache.containsKey(key)) {
            Schema.DescribeSObjectResult describe =
                Schema.getGlobalDescribe().get(objectApiName).getDescribe();
            Map<String, Schema.RecordTypeInfo> rtInfos =
                describe.getRecordTypeInfosByDeveloperName();

            if (!rtInfos.containsKey(developerName)) {
                throw new RecordTypeHelperException(
                    'No RecordType with DeveloperName "' + developerName +
                    '" found on ' + objectApiName
                );
            }
            recordTypeIdCache.put(key, rtInfos.get(developerName).getRecordTypeId());
        }
        return recordTypeIdCache.get(key);
    }

    /**
     * Resolve a set of DeveloperNames on one object into a Set<Id>,
     * ready to drop into "WHERE RecordTypeId IN :set".
     */
    public static Set<Id> getRecordTypeIds(String objectApiName, Set<String> developerNames) {
        Set<Id> ids = new Set<Id>();
        for (String devName : developerNames) {
            ids.add(getRecordTypeId(objectApiName, devName));
        }
        return ids;
    }

    // ── Convenience wrappers for this app's objects ──
    public static Set<Id> individualApplicationAllowedIds() {
        return getRecordTypeIds('IndividualApplication', INDIVIDUAL_APPLICATION_TYPES);
    }

    public static Id wadhwaniGrantsId() {
        return getRecordTypeId('IndividualApplication', 'Wadhwani_Grants');
    }

    public static Set<Id> applicationReviewAllowedIds() {
        return getRecordTypeIds('ApplicationReview', APPLICATION_REVIEW_TYPES);
    }

    public static Set<Id> applicationReviewReviewerAllowedIds() {
        return getRecordTypeIds('ApplicationReview', APPLICATION_REVIEW_REVIEWER_TYPES);
    }

    public static Id applicationReviewValidatorId() {
        return getRecordTypeId('ApplicationReview', 'WCF_Validator');
    }

    public static Set<Id> applicationDecisionAllowedIds() {
        return getRecordTypeIds('ApplicationDecision', APPLICATION_DECISION_TYPES);
    }

    public class RecordTypeHelperException extends Exception {}
}