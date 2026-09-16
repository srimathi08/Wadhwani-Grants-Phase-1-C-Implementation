public without sharing class WCF_ReviewFormJFController {

    private static final String OUTCOME_JF   = 'WCF_Job_Fulfillment';
    private static final String OUTCOME_JC   = 'WCF_Job_Creation_Review';
    private static final String OUTCOME_LU   = 'WCF_Livelihood_Upliftment';
    private static final String OUTCOME_BOTH = 'WCF_Job_Fulfillment_Job_Creation';

    public class ReviewSubmitResult {
        @AuraEnabled public Boolean isSuccess { get; set; }
        @AuraEnabled public String  reviewId { get; set; }
        @AuraEnabled public String  applicationStatus { get; set; }
        @AuraEnabled public String  errorMessage { get; set; }
    }

    // ── Find existing review record for this reviewer+application ──
    private static ApplicationReview findExistingReview(
        Id applicationId, Id userId, String recordTypeId
    ) {
        List<ApplicationReview> existing = [
            SELECT Id, Status, ReviewedById, AssignedUserId, RecordTypeId
            FROM   ApplicationReview
            WHERE  ApplicationId  = :applicationId
              AND  (
                      ReviewedById  = :userId
                   OR AssignedUserId = :userId
                  )
              AND  IsSubmitted = false
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];
        return existing.isEmpty() ? null : existing[0];
    }

    @AuraEnabled
    public static ApplicationReview saveDraftReview(String reviewDataJson) {
        if (String.isBlank(reviewDataJson)) {
            throw new AuraHandledException('No data received for saving.');
        }
        try {
            ApplicationReview review = (ApplicationReview) JSON.deserialize(
                reviewDataJson, ApplicationReview.class
            );

            if (review.ApplicationId == null) {
                throw new AuraHandledException('Application ID is missing. Cannot save draft.');
            }

            Id userId = UserInfo.getUserId();

            // Strictly enforce WG_Reviewer Record Type
            review.RecordTypeId = recordTypeIdFromApplication(review.ApplicationId);

            review.ReviewedById = userId;
            review.IsSubmitted  = false;
            review.Status       = 'In Progress';
            review.Form_Template_Version__c = 'v5';

            calculateCategoryScores(review);

            ApplicationReview existing = findExistingReview(
                review.ApplicationId, userId, review.RecordTypeId
            );

            if (existing != null) {
                review.Id = existing.Id;
                update review;
            } else {
                insert review;
            }

            return review;

        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Error saving draft: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static ReviewSubmitResult saveApplicationReview(String reviewDataJson) {
        ReviewSubmitResult result = new ReviewSubmitResult();
        if (String.isBlank(reviewDataJson)) {
            result.isSuccess = false;
            result.errorMessage = 'No data received for saving.';
            return result;
        }

        Savepoint sp = Database.setSavepoint();
        try {
            ApplicationReview review = (ApplicationReview) JSON.deserialize(
                reviewDataJson, ApplicationReview.class
            );

            if (review.ApplicationId == null) {
                result.isSuccess = false;
                result.errorMessage = 'Application ID is missing. Cannot submit review.';
                return result;
            }

            Id userId = UserInfo.getUserId();

            // Strictly enforce WG_Reviewer Record Type
            review.RecordTypeId = recordTypeIdFromApplication(review.ApplicationId);

            review.ReviewedById = userId;
            review.IsSubmitted  = true;
            review.Status       = 'Review Submitted';
            review.EndDate      = Date.today();
            review.Form_Template_Version__c = 'v5';

            calculateCategoryScores(review);

            ApplicationReview existing = findExistingReview(
                review.ApplicationId, userId, review.RecordTypeId
            );

            if (existing != null) {
                review.Id = existing.Id;
                update review;
            } else {
                insert review;
            }

            // Route to Approver based on recommendation
            String appStatus = (review.Recommend_for_CEO_review__c == 'Yes')
                ? 'Review Completed - Recommended'
                : 'Review Completed - Not Recommended';

            IndividualApplication app = new IndividualApplication(
                Id     = review.ApplicationId,
                Status = appStatus
            );
            update app;

            result.isSuccess = true;
            result.reviewId = review.Id;
            result.applicationStatus = appStatus;
            return result;

        } catch (Exception e) {
            Database.rollback(sp);
            result.isSuccess = false;
            result.errorMessage = 'Error submitting review: ' + e.getMessage();
            return result;
        }
    }

    /**
     * @description Calculates Category Scores 1 to 7 and Overall Review Score dynamically
     * Supports both dynamic JSON-based responses and physical fields.
     */
    private static void calculateCategoryScores(ApplicationReview r) {
        Map<Integer, List<Decimal>> scoresByCat = new Map<Integer, List<Decimal>>();
        for (Integer i = 1; i <= 7; i++) {
            scoresByCat.put(i, new List<Decimal>());
        }

        // 1. Dynamic calculation from Decision_Rationale__c JSON if present
        if (String.isNotBlank(r.Decision_Rationale__c)) {
            try {
                List<Object> parsed = (List<Object>) JSON.deserializeUntyped(r.Decision_Rationale__c);
                for (Object itemObj : parsed) {
                    Map<String, Object> item = (Map<String, Object>) itemObj;
                    Integer catNum = item.get('categoryNumber') != null ? Integer.valueOf(item.get('categoryNumber')) : null;
                    Object rateVal = item.get('rating');
                    if (catNum != null && rateVal != null) {
                        Decimal dVal = Decimal.valueOf(String.valueOf(rateVal));
                        if (scoresByCat.containsKey(catNum)) {
                            scoresByCat.get(catNum).add(dVal);
                        }
                    }
                }
            } catch (Exception ex) {
                // If not JSON or parse failure, fall back to physical fields below
            }
        }

        // 2. Physical fields fallback / augmentation if JSON was empty
        // Cat 1: 1.1, 1.2, 1.3, 1.4
        if (scoresByCat.get(1).isEmpty()) {
            if (r.D1_Governance_Rating__c != null) scoresByCat.get(1).add(Decimal.valueOf(r.D1_Governance_Rating__c));
            if (r.D1_Leadership_Rating__c != null) scoresByCat.get(1).add(Decimal.valueOf(r.D1_Leadership_Rating__c));
            if (r.D1_FinancialRecords_Rating__c != null) scoresByCat.get(1).add(Decimal.valueOf(r.D1_FinancialRecords_Rating__c));
            if (r.D1_SustainabilityVision_Rating__c != null) scoresByCat.get(1).add(Decimal.valueOf(r.D1_SustainabilityVision_Rating__c));
        }

        // Cat 2: 2.1, 2.2, 2.3
        if (scoresByCat.get(2).isEmpty()) {
            if (r.D2_ProgramAlignment_Rating__c != null) scoresByCat.get(2).add(Decimal.valueOf(r.D2_ProgramAlignment_Rating__c));
            if (r.D2_JF_Distinctiveness_Rating__c != null) scoresByCat.get(2).add(Decimal.valueOf(r.D2_JF_Distinctiveness_Rating__c));
            else if (r.D2_JC_Distinctiveness_Rating__c != null) scoresByCat.get(2).add(Decimal.valueOf(r.D2_JC_Distinctiveness_Rating__c));
            else if (r.D2_LU_Distinctiveness_Rating__c != null) scoresByCat.get(2).add(Decimal.valueOf(r.D2_LU_Distinctiveness_Rating__c));
            if (r.D2_OperationalDepth_Rating__c != null) scoresByCat.get(2).add(Decimal.valueOf(r.D2_OperationalDepth_Rating__c));
        }

        // Cat 3: 3.1, 3.2, 3.3, 3.4
        if (scoresByCat.get(3).isEmpty()) {
            if (r.D3_JF_ScaleRecord_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_JF_ScaleRecord_Rating__c));
            else if (r.D3_JC_ScaleRecord_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_JC_ScaleRecord_Rating__c));
            else if (r.D3_LU_ScaleRecord_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_LU_ScaleRecord_Rating__c));

            if (r.D3_JF_ConversionRate_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_JF_ConversionRate_Rating__c));
            else if (r.D3_JC_ConversionRate_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_JC_ConversionRate_Rating__c));
            else if (r.D3_LU_ConversionRate_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_LU_ConversionRate_Rating__c));

            if (r.D3_JF_CostPerPlacement_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_JF_CostPerPlacement_Rating__c));
            else if (r.D3_JC_CostPerJob_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_JC_CostPerJob_Rating__c));
            else if (r.D3_LU_CostPerOutcome_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_LU_CostPerOutcome_Rating__c));

            if (r.D3_ValidationEvidence_Rating__c != null) scoresByCat.get(3).add(Decimal.valueOf(r.D3_ValidationEvidence_Rating__c));
        }

        // Cat 4: 4.1, 4.2, 4.3
        if (scoresByCat.get(4).isEmpty()) {
            if (r.D4_MandateFit_Rating__c != null) scoresByCat.get(4).add(Decimal.valueOf(r.D4_MandateFit_Rating__c));
            if (r.D4_Geography_Rating__c != null) scoresByCat.get(4).add(Decimal.valueOf(r.D4_Geography_Rating__c));
            if (r.D4_GenieAI_Rating__c != null) scoresByCat.get(4).add(Decimal.valueOf(r.D4_GenieAI_Rating__c));
        }

        // Cat 5: 5.1, 5.2, 5.3
        if (scoresByCat.get(5).isEmpty()) {
            if (r.D5_FinancialStability_Rating__c != null) scoresByCat.get(5).add(Decimal.valueOf(r.D5_FinancialStability_Rating__c));
            if (r.D5_IncrementEstimate_Rating__c != null) scoresByCat.get(5).add(Decimal.valueOf(r.D5_IncrementEstimate_Rating__c));
            if (r.D5_OperatingInfra_Rating__c != null) scoresByCat.get(5).add(Decimal.valueOf(r.D5_OperatingInfra_Rating__c));
        }

        // Cat 6: 6.1, 6.2, 6.3
        if (scoresByCat.get(6).isEmpty()) {
            if (r.D6_MEFunction_Rating__c != null) scoresByCat.get(6).add(Decimal.valueOf(r.D6_MEFunction_Rating__c));
            if (r.D6_ExternalVerification_Rating__c != null) scoresByCat.get(6).add(Decimal.valueOf(r.D6_ExternalVerification_Rating__c));
            if (r.D6_LongitudinalTracking_Rating__c != null) scoresByCat.get(6).add(Decimal.valueOf(r.D6_LongitudinalTracking_Rating__c));
        }

        // Cat 7: 7.1, 7.2
        if (scoresByCat.get(7).isEmpty()) {
            if (r.D5_RationaleCredibility_Rating__c != null) scoresByCat.get(7).add(Decimal.valueOf(r.D5_RationaleCredibility_Rating__c));
            if (r.D2_JC_SupportModel_Rating__c != null) scoresByCat.get(7).add(Decimal.valueOf(r.D2_JC_SupportModel_Rating__c));
        }

        // Assign Category Scores
        if (!scoresByCat.get(1).isEmpty()) r.Cat_1_Score__c = average(scoresByCat.get(1));
        if (!scoresByCat.get(2).isEmpty()) r.Cat_2_Score__c = average(scoresByCat.get(2));
        if (!scoresByCat.get(3).isEmpty()) r.Cat_3_Score__c = average(scoresByCat.get(3));
        if (!scoresByCat.get(4).isEmpty()) r.Cat_4_Score__c = average(scoresByCat.get(4));
        if (!scoresByCat.get(5).isEmpty()) r.Cat_5_Score__c = average(scoresByCat.get(5));
        if (!scoresByCat.get(6).isEmpty()) r.Cat_6_Score__c = average(scoresByCat.get(6));
        if (!scoresByCat.get(7).isEmpty()) r.Cat_7_Score__c = average(scoresByCat.get(7));

        // Compute overall score as average of all active category scores
        List<Decimal> allCats = new List<Decimal>();
        if (r.Cat_1_Score__c != null) allCats.add(r.Cat_1_Score__c);
        if (r.Cat_2_Score__c != null) allCats.add(r.Cat_2_Score__c);
        if (r.Cat_3_Score__c != null) allCats.add(r.Cat_3_Score__c);
        if (r.Cat_4_Score__c != null) allCats.add(r.Cat_4_Score__c);
        if (r.Cat_5_Score__c != null) allCats.add(r.Cat_5_Score__c);
        if (r.Cat_6_Score__c != null) allCats.add(r.Cat_6_Score__c);
        if (r.Cat_7_Score__c != null) allCats.add(r.Cat_7_Score__c);

        if (!allCats.isEmpty()) {
            Decimal overall = average(allCats);
            r.Overall_Review_Score__c = overall;
        }
    }

    private static Decimal average(List<Decimal> nums) {
        if (nums == null || nums.isEmpty()) return null;
        Decimal sum = 0;
        for (Decimal n : nums) sum += n;
        return (sum / nums.size()).setScale(2, System.RoundingMode.HALF_UP);
    }

    @AuraEnabled(cacheable=true)
    public static IndividualApplicationWrapper getIndividualApplication(Id recordId) {
        try {
            if (recordId == null) {
                throw new AuraHandledException('Record ID is required.');
            }

            IndividualApplication app = [
                SELECT Id,
                       Name,
                       Submitter_Name__c,
                       Organizational_Area_s_for_Funding_Inves__c,
                       Organizational_Area_s_for_Funding_Inves1__c,
                       RecordType.DeveloperName
                FROM IndividualApplication
                WHERE Id = :recordId
                LIMIT 1
            ];

            String rawTrack = String.isNotBlank(app.Organizational_Area_s_for_Funding_Inves1__c)
                ? app.Organizational_Area_s_for_Funding_Inves1__c
                : app.Organizational_Area_s_for_Funding_Inves__c;

            IndividualApplicationWrapper wrap = new IndividualApplicationWrapper();
            wrap.recordId        = app.Id;
            wrap.applicationName = app.Name;
            wrap.institutionName = app.Submitter_Name__c;
            wrap.orgArea         = rawTrack;
            wrap.recordTypeId    = recordTypeIdFromApplication(app.Id);
            wrap.track           = resolveTrackCodes(rawTrack);
            wrap.trackLabel      = formatTrackLabel(rawTrack);
            return wrap;

        } catch (Exception e) {
            throw new AuraHandledException('Error fetching record: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static ApplicationReview getDraftReviewRecord(Id applicationId) {
        Id userId = UserInfo.getUserId();

        Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.ApplicationReview.fields.getMap();
        List<String> selectFields = new List<String>();
        for (String fieldName : fieldMap.keySet()) {
            Schema.DescribeFieldResult dfr = fieldMap.get(fieldName).getDescribe();
            if (dfr.isAccessible()) {
                selectFields.add(dfr.getName());
            }
        }

        String query = 'SELECT ' + String.join(selectFields, ', ') + 
                       ' FROM ApplicationReview' +
                       ' WHERE ApplicationId = :applicationId' +
                       '   AND IsSubmitted   = false' +
                       '   AND (ReviewedById = :userId OR AssignedUserId = :userId)' +
                       ' ORDER BY LastModifiedDate DESC' +
                       ' LIMIT 1';

        List<ApplicationReview> reviews = Database.query(query);
        return reviews.isEmpty() ? null : reviews[0];
    }

    @AuraEnabled
    public static Boolean hasAlreadyReviewed(String applicationId) {
        Id userId = UserInfo.getUserId();

        List<ApplicationReview> existing = [
            SELECT Id FROM ApplicationReview
            WHERE ApplicationId = :applicationId
              AND IsSubmitted   = true
              AND (
                     ReviewedById  = :userId
                  OR AssignedUserId = :userId
                 )
            LIMIT 1
        ];

        return !existing.isEmpty();
    }

    @AuraEnabled(cacheable=true)
    public static String getRecordTypeIdForApplication(Id applicationId) {
        return recordTypeIdFromApplication(applicationId);
    }

    // ── Dynamically fetch active Rejection Reasons picklist values ──
    @AuraEnabled(cacheable=true)
    public static List<Map<String,String>> getRejectionReasonOptions() {
        List<Map<String,String>> options = new List<Map<String,String>>();
        Schema.DescribeFieldResult fieldResult =
            ApplicationReview.Rejection_Reasons__c.getDescribe();

        for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            if (entry.isActive()) {
                Map<String,String> opt = new Map<String,String>();
                opt.put('value', entry.getValue());
                opt.put('label', entry.getLabel());
                options.add(opt);
            }
        }
        return options;
    }

    // ── Private helpers ──────────────────────────────────────────

    public static String resolveTrackCodes(String trackStr) {
        if (String.isBlank(trackStr)) return 'JF';
        String lower = trackStr.toLowerCase();
        Boolean hasJF = lower.contains('fulfillment') || lower.contains('fulfilment') || lower.contains('jf');
        Boolean hasJC = lower.contains('creation') || lower.contains('jc');
        Boolean hasLU = lower.contains('livelihood') || lower.contains('upliftment') || lower.contains('lu');
        if (lower.contains('both')) {
            hasJF = true;
            hasJC = true;
        }

        List<String> codes = new List<String>();
        if (hasJF) codes.add('JF');
        if (hasJC) codes.add('JC');
        if (hasLU) codes.add('LU');

        return codes.isEmpty() ? 'JF' : String.join(codes, ',');
    }

    public static String formatTrackLabel(String trackStr) {
        if (String.isBlank(trackStr)) return 'Job Fulfillment';
        String lower = trackStr.toLowerCase();
        Boolean hasJF = lower.contains('fulfillment') || lower.contains('fulfilment') || lower.contains('jf');
        Boolean hasJC = lower.contains('creation') || lower.contains('jc');
        Boolean hasLU = lower.contains('livelihood') || lower.contains('upliftment') || lower.contains('lu');
        if (lower.contains('both')) {
            hasJF = true;
            hasJC = true;
        }

        List<String> labels = new List<String>();
        if (hasJF) labels.add('Job Fulfillment');
        if (hasJC) labels.add('Job Creation');
        if (hasLU) labels.add('Livelihood Upliftment');

        return labels.isEmpty() ? trackStr : String.join(labels, ', ');
    }

    private static String resolveOutcomeDevName(String orgArea) {
        return resolveTrackCodes(orgArea);
    }

    /**
     * @description Exclusively assigns and returns the WG Reviewer RecordTypeId
     */
    private static String recordTypeIdFromApplication(String applicationId) {
        try {
            return RecordTypeHelper.applicationReviewWgReviewerId();
        } catch (Exception e) {
            try {
                RecordType rt = [
                    SELECT Id FROM RecordType
                    WHERE  SObjectType   = 'ApplicationReview'
                      AND  DeveloperName = 'WG_Reviewer'
                    LIMIT  1
                ];
                return rt.Id;
            } catch (Exception ex) {
                // Fallback to existing WCF_Job_Fulfillment if WG_Reviewer is not yet deployed
                RecordType rt = [
                    SELECT Id FROM RecordType
                    WHERE  SObjectType   = 'ApplicationReview'
                      AND  DeveloperName = :OUTCOME_JF
                    LIMIT  1
                ];
                return rt.Id;
            }
        }
    }

    public class IndividualApplicationWrapper {
        @AuraEnabled public String recordId;
        @AuraEnabled public String applicationName;
        @AuraEnabled public String institutionName;
        @AuraEnabled public String orgArea;
        @AuraEnabled public String recordTypeId;
        @AuraEnabled public String track;
        @AuraEnabled public String trackLabel;
    }

    @AuraEnabled
    public static void deleteUploadedFile(String contentDocumentId) {
        if (String.isBlank(contentDocumentId)) {
            throw new AuraHandledException('Content Document ID is required.');
        }
        try {
            ContentDocument doc = [
                SELECT Id
                FROM   ContentDocument
                WHERE  Id = :contentDocumentId
                LIMIT  1
            ];
            delete doc;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting file: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static List<Map<String,String>> getAttachedFiles(String reviewRecordId) {
        if (String.isBlank(reviewRecordId)) return new List<Map<String,String>>();
        List<Map<String,String>> result = new List<Map<String,String>>();
        for (ContentDocumentLink cdl : [
            SELECT ContentDocumentId, ContentDocument.Title
            FROM   ContentDocumentLink
            WHERE  LinkedEntityId = :reviewRecordId
            LIMIT  50
        ]) {
            Map<String,String> f = new Map<String,String>();
            f.put('documentId', cdl.ContentDocumentId);
            f.put('name',       cdl.ContentDocument.Title);
            result.add(f);
        }
        return result;
    }

    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getReviewerFormV5Metadata(String trackName) {
        return WCFReviewerMetadataController.getReviewerFormV5Metadata(trackName);
    }
}