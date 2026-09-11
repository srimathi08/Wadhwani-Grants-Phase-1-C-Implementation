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

            ApplicationReview existing = findExistingReview(
                review.ApplicationId, userId, review.RecordTypeId
            );

            if (existing != null) {
                review.Id = existing.Id;
                update review;
            } else {
                insert review;
            }

            // ── Update IndividualApplication status based on recommendation ──
           // ── Route to Approver regardless of recommendation — Yes/No is
// informational only; only the Approver's decision is terminal ──
// ── Update IndividualApplication status based on recommendation ──
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
        if (orgArea == null) return OUTCOME_BOTH;
        if (orgArea == 'Job Fulfillment Only')                  return OUTCOME_JF;
        if (orgArea == 'Job Creation Only')                     return OUTCOME_JC;
        if (orgArea == 'Both — Job Fulfilment + Job Creation')  return OUTCOME_BOTH;
        if (orgArea == 'Job Fulfillment and Job Creation')      return OUTCOME_BOTH;
        Boolean hasJF = orgArea.containsIgnoreCase('fulfillment')
                     || orgArea.containsIgnoreCase('fulfilment');
        Boolean hasJC = orgArea.containsIgnoreCase('creation');
        if (hasJF && !hasJC) return OUTCOME_JF;
        if (hasJC && !hasJF) return OUTCOME_JC;
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
                  AND  DeveloperName = :OUTCOME_BOTH
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