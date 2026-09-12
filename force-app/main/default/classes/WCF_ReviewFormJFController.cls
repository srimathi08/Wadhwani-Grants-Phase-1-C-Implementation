public without sharing class WCF_ReviewFormJFController {

    private static final String OUTCOME_JF   = 'WCF_Job_Fulfillment';
    private static final String OUTCOME_JC   = 'WCF_Job_Creation_Review';
    private static final String OUTCOME_BOTH = 'WCF_Job_Fulfillment_Job_Creation';

    // ── Find existing review record for this reviewer+application ──
    private static ApplicationReview findExistingReview(
        Id applicationId, Id userId, String recordTypeId
    ) {
        List<ApplicationReview> existing = [
            SELECT Id, Status, ReviewedById, AssignedUserId
            FROM   ApplicationReview
            WHERE  ApplicationId  = :applicationId
              AND  RecordTypeId   = :recordTypeId
              AND  (
                      ReviewedById  = :userId
                   OR AssignedUserId = :userId
                  )
              AND  IsSubmitted = false
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

            if (review.RecordTypeId == null) {
                review.RecordTypeId = recordTypeIdFromApplication(review.ApplicationId);
            }

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
    public static void saveApplicationReview(String reviewDataJson) {
        if (String.isBlank(reviewDataJson)) {
            throw new AuraHandledException('No data received for saving.');
        }
        try {
            ApplicationReview review = (ApplicationReview) JSON.deserialize(
                reviewDataJson, ApplicationReview.class
            );

            if (review.ApplicationId == null) {
                throw new AuraHandledException('Application ID is missing. Cannot submit review.');
            }

            Id userId = UserInfo.getUserId();

            if (review.RecordTypeId == null) {
                review.RecordTypeId = recordTypeIdFromApplication(review.ApplicationId);
            }

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

            // Route to Approver regardless of recommendation
            String appStatus = (review.Recommend_for_CEO_review__c == 'Yes')
                ? 'Review Completed - Recommended'
                : 'Review Completed - Not Recommended';

            IndividualApplication app = new IndividualApplication(
                Id     = review.ApplicationId,
                Status = appStatus
            );
            update app;

        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Error submitting review: ' + e.getMessage());
        }
    }

    /**
     * @description Calculates Category Scores 1 to 7 and Overall Review Score
     */
    private static void calculateCategoryScores(ApplicationReview r) {
        // Cat 1: 1.1, 1.2, 1.3, 1.4
        List<Decimal> c1 = new List<Decimal>();
        if (r.D1_Governance_Rating__c != null) c1.add(Decimal.valueOf(r.D1_Governance_Rating__c));
        if (r.D1_Leadership_Rating__c != null) c1.add(Decimal.valueOf(r.D1_Leadership_Rating__c));
        if (r.D1_FinancialRecords_Rating__c != null) c1.add(Decimal.valueOf(r.D1_FinancialRecords_Rating__c));
        if (r.D1_SustainabilityVision_Rating__c != null) c1.add(Decimal.valueOf(r.D1_SustainabilityVision_Rating__c));
        if (!c1.isEmpty()) r.Cat_1_Score__c = average(c1);

        // Cat 2: 2.1, 2.2, 2.3
        List<Decimal> c2 = new List<Decimal>();
        if (r.D2_ProgramAlignment_Rating__c != null) c2.add(Decimal.valueOf(r.D2_ProgramAlignment_Rating__c));
        if (r.D2_JF_Distinctiveness_Rating__c != null) c2.add(Decimal.valueOf(r.D2_JF_Distinctiveness_Rating__c));
        else if (r.D2_JC_Distinctiveness_Rating__c != null) c2.add(Decimal.valueOf(r.D2_JC_Distinctiveness_Rating__c));
        if (r.D2_OperationalDepth_Rating__c != null) c2.add(Decimal.valueOf(r.D2_OperationalDepth_Rating__c));
        if (!c2.isEmpty()) r.Cat_2_Score__c = average(c2);

        // Cat 3: 3.1, 3.2, 3.3, 3.4
        List<Decimal> c3 = new List<Decimal>();
        if (r.D3_JF_ScaleRecord_Rating__c != null) c3.add(Decimal.valueOf(r.D3_JF_ScaleRecord_Rating__c));
        else if (r.D3_JC_ScaleRecord_Rating__c != null) c3.add(Decimal.valueOf(r.D3_JC_ScaleRecord_Rating__c));
        if (r.D3_JF_ConversionRate_Rating__c != null) c3.add(Decimal.valueOf(r.D3_JF_ConversionRate_Rating__c));
        else if (r.D3_JC_ConversionRate_Rating__c != null) c3.add(Decimal.valueOf(r.D3_JC_ConversionRate_Rating__c));
        if (r.D3_JF_CostPerPlacement_Rating__c != null) c3.add(Decimal.valueOf(r.D3_JF_CostPerPlacement_Rating__c));
        else if (r.D3_JC_CostPerJob_Rating__c != null) c3.add(Decimal.valueOf(r.D3_JC_CostPerJob_Rating__c));
        if (r.D3_ValidationEvidence_Rating__c != null) c3.add(Decimal.valueOf(r.D3_ValidationEvidence_Rating__c));
        if (!c3.isEmpty()) r.Cat_3_Score__c = average(c3);

        // Cat 4: 4.1, 4.2, 4.3
        List<Decimal> c4 = new List<Decimal>();
        if (r.D4_MandateFit_Rating__c != null) c4.add(Decimal.valueOf(r.D4_MandateFit_Rating__c));
        if (r.D4_Geography_Rating__c != null) c4.add(Decimal.valueOf(r.D4_Geography_Rating__c));
        if (r.D4_GenieAI_Rating__c != null) c4.add(Decimal.valueOf(r.D4_GenieAI_Rating__c));
        if (!c4.isEmpty()) r.Cat_4_Score__c = average(c4);

        // Cat 5: 5.1, 5.2, 5.3
        List<Decimal> c5 = new List<Decimal>();
        if (r.D5_FinancialStability_Rating__c != null) c5.add(Decimal.valueOf(r.D5_FinancialStability_Rating__c));
        if (r.D5_IncrementEstimate_Rating__c != null) c5.add(Decimal.valueOf(r.D5_IncrementEstimate_Rating__c));
        if (r.D5_OperatingInfra_Rating__c != null) c5.add(Decimal.valueOf(r.D5_OperatingInfra_Rating__c));
        if (!c5.isEmpty()) r.Cat_5_Score__c = average(c5);

        // Cat 6: 6.1, 6.2, 6.3
        List<Decimal> c6 = new List<Decimal>();
        if (r.D6_MEFunction_Rating__c != null) c6.add(Decimal.valueOf(r.D6_MEFunction_Rating__c));
        if (r.D6_ExternalVerification_Rating__c != null) c6.add(Decimal.valueOf(r.D6_ExternalVerification_Rating__c));
        if (r.D6_LongitudinalTracking_Rating__c != null) c6.add(Decimal.valueOf(r.D6_LongitudinalTracking_Rating__c));
        if (!c6.isEmpty()) r.Cat_6_Score__c = average(c6);

        // Cat 7: 7.1, 7.2 (stored in D5_RATIONALE_CREDIBILITY / D2_JC_SUPPORTMODEL if legacy)
        List<Decimal> c7 = new List<Decimal>();
        if (r.D5_RationaleCredibility_Rating__c != null) c7.add(Decimal.valueOf(r.D5_RationaleCredibility_Rating__c));
        if (r.D2_JC_SupportModel_Rating__c != null) c7.add(Decimal.valueOf(r.D2_JC_SupportModel_Rating__c));
        if (!c7.isEmpty()) r.Cat_7_Score__c = average(c7);

        // Compute overall score as average of active category scores
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
                       RecordType.DeveloperName
                FROM IndividualApplication
                WHERE Id = :recordId
                LIMIT 1
            ];

            IndividualApplicationWrapper wrap = new IndividualApplicationWrapper();
            wrap.recordId        = app.Id;
            wrap.applicationName = app.Name;
            wrap.institutionName = app.Submitter_Name__c;
            wrap.orgArea         = app.Organizational_Area_s_for_Funding_Inves__c;
            wrap.recordTypeId    = recordTypeIdFromApplication(app.Id);
            wrap.track           = resolveOutcomeDevName(
                                       app.Organizational_Area_s_for_Funding_Inves__c
                                   );
            wrap.trackLabel      = app.Organizational_Area_s_for_Funding_Inves__c;
            return wrap;

        } catch (Exception e) {
            throw new AuraHandledException('Error fetching record: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static ApplicationReview getDraftReviewRecord(Id applicationId) {
        Id     userId = UserInfo.getUserId();
        String rtId   = recordTypeIdFromApplication(applicationId);

        List<ApplicationReview> reviews = [
            SELECT Id,
                   ApplicationId,
                   ReviewedById,
                   AssignedUserId,
                   Status,
                   Form_Template_Version__c,
                   Cat_1_Score__c,
                   Cat_2_Score__c,
                   Cat_3_Score__c,
                   Cat_4_Score__c,
                   Cat_5_Score__c,
                   Cat_6_Score__c,
                   Cat_7_Score__c,
                   Overall_Review_Score__c,
                   Overall_Rating_Score__c,
                   Decision_Rationale__c,
                   Notes_for_Reviewers__c,
                   Rationale_for_Scoring__c,
                   Overall_Remarks__c,

                   Recommend_for_CEO_review__c,
                   Strength_of_recommendation__c,
                   Strength_of_non_recommendation__c,
                   Recommendation_Strength_Comments__c,
                   Non_Recommendation_Strength_Comments__c,
                   Rejection_Reasons__c,
                   Rejection_Reason_Other__c,
                   Rejection_Comment__c,
                   Top_3_proposal_strengths_ranked__c,
                   Top_3_proposal_weaknesses_ranked__c,

                   /* D1 */
                   D1_Governance_Rating__c,
                   D1_Governance_Comment__c,
                   D1_Leadership_Rating__c,
                   D1_Leadership_Comment__c,
                   D1_FinancialRecords_Rating__c,
                   D1_FinancialRecords_Comment__c,
                   D1_SustainabilityVision_Rating__c,
                   D1_SustainabilityVision_Comment__c,

                   /* D2 */
                   D2_ProgramAlignment_Rating__c,
                   D2_ProgramAlignment_Comment__c,
                   D2_JC_SupportModel_Rating__c,
                   D2_JC_SupportModel_Comment__c,
                   D2_JF_Distinctiveness_Rating__c,
                   D2_JF_Distinctiveness_Comment__c,
                   D2_JC_Distinctiveness_Rating__c,
                   D2_JC_Distinctiveness_Comment__c,
                   D2_OperationalDepth_Rating__c,
                   D2_OperationalDepth_Comment__c,

                   /* D3 – JF */
                   D3_JF_ScaleRecord_Rating__c,
                   D3_JF_ScaleRecord_Comment__c,
                   D3_JF_ConversionRate_Rating__c,
                   D3_JF_ConversionRate_Comment__c,
                   D3_JF_CostPerPlacement_Rating__c,
                   D3_JF_CostPerPlacement_Comment__c,

                   /* D3 – JC */
                   D3_JC_ScaleRecord_Rating__c,
                   D3_JC_ScaleRecord_Comment__c,
                   D3_JC_ConversionRate_Rating__c,
                   D3_JC_ConversionRate_Comment__c,
                   D3_JC_CostPerJob_Rating__c,
                   D3_JC_CostPerJob_Comment__c,

                   /* D3 shared */
                   D3_ValidationEvidence_Rating__c,
                   D3_ValidationEvidence_Comment__c,

                   /* D4 */
                   D4_MandateFit_Rating__c,
                   D4_MandateFit_Comment__c,
                   D4_Geography_Rating__c,
                   D4_Geography_Comment__c,
                   D4_GenieAI_Rating__c,
                   D4_GenieAI_Comment__c,

                   /* D5 */
                   D5_FinancialStability_Rating__c,
                   D5_FinancialStability_Comment__c,
                   D5_IncrementEstimate_Rating__c,
                   D5_IncrementEstimate_Comment__c,
                   D5_OperatingInfra_Rating__c,
                   D5_OperatingInfra_Comment__c,
                   D5_RationaleCredibility_Rating__c,
                   D5_Rationale_Credibility_Comment__c,

                   /* D6 */
                   D6_MEFunction_Rating__c,
                   D6_MEFunction_Comment__c,
                   D6_ExternalVerification_Rating__c,
                   D6_ExternalVerification_Comment__c,
                   D6_LongitudinalTracking_Rating__c,
                   D6_LongitudinalTracking_Comment__c
            FROM ApplicationReview
            WHERE ApplicationId = :applicationId
              AND RecordTypeId  = :rtId
              AND IsSubmitted   = false
              AND (
                     ReviewedById  = :userId
                  OR AssignedUserId = :userId
                 )
            LIMIT 1
        ];

        return reviews.isEmpty() ? null : reviews[0];
    }

    @AuraEnabled
    public static Boolean hasAlreadyReviewed(String applicationId) {
        Id     userId = UserInfo.getUserId();
        String rtId   = recordTypeIdFromApplication(applicationId);

        List<ApplicationReview> existing = [
            SELECT Id FROM ApplicationReview
            WHERE ApplicationId = :applicationId
              AND RecordTypeId  = :rtId
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

    private static String resolveOutcomeDevName(String orgArea) {
        if (orgArea == null) return OUTCOME_JF;
        if (orgArea == 'Job Fulfillment Only' || orgArea == 'Job Fulfillment') return OUTCOME_JF;
        if (orgArea == 'Job Creation Only' || orgArea == 'Job Creation') return OUTCOME_JC;
        if (orgArea.containsIgnoreCase('fulfillment') || orgArea.containsIgnoreCase('fulfilment')) return OUTCOME_JF;
        if (orgArea.containsIgnoreCase('creation')) return OUTCOME_JC;
        return OUTCOME_BOTH;
    }

    private static String recordTypeIdFromApplication(String applicationId) {
        try {
            IndividualApplication app = [
                SELECT Organizational_Area_s_for_Funding_Inves__c
                FROM   IndividualApplication
                WHERE  Id = :applicationId
                LIMIT  1
            ];
            String devName = resolveOutcomeDevName(
                app.Organizational_Area_s_for_Funding_Inves__c
            );
            RecordType rt = [
                SELECT Id FROM RecordType
                WHERE  SObjectType   = 'ApplicationReview'
                  AND  DeveloperName = :devName
                LIMIT  1
            ];
            return rt.Id;
        } catch (Exception e) {
            RecordType rt = [
                SELECT Id FROM RecordType
                WHERE  SObjectType   = 'ApplicationReview'
                  AND  DeveloperName = :OUTCOME_JF
                LIMIT  1
            ];
            return rt.Id;
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
}