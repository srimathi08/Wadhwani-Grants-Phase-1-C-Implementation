public without sharing class WCFApproverListController {

    public class ApproverQueueItem {
        @AuraEnabled public String  applicationId;
        @AuraEnabled public String  applicationName;
        @AuraEnabled public String  organizationName;
        @AuraEnabled public String  headquarters;
        @AuraEnabled public String  submitterName;
        @AuraEnabled public String  applicationStatus;
        @AuraEnabled public String  track;
        @AuraEnabled public String  reviewId;
        @AuraEnabled public String  reviewName;
        @AuraEnabled public String  reviewStatus;
        @AuraEnabled public Boolean isSubmitted;
        @AuraEnabled public String  recommendation;
        @AuraEnabled public String  existingDecision;
        @AuraEnabled public String  existingDecisionId;
    }

    // ── NEW: wrapper returned by getExistingDecision ──
    public class DecisionWrapper {
        @AuraEnabled public String   decision;
        @AuraEnabled public String   decisionId;
        @AuraEnabled public DateTime decisionDate;
        @AuraEnabled public Boolean  isRevokable;
        @AuraEnabled public String   comment;
        @AuraEnabled public Boolean  isReturned;
        // ── NEW: context for the "Back from Reviewer" case ──
    @AuraEnabled public Boolean  isBackFromReviewer;
    @AuraEnabled public String   priorReturnComment;
    @AuraEnabled public DateTime priorReturnDate;
        @AuraEnabled public String   priorRejectionReasons;   // ← NEW

    }

    private static final Set<String> ALLOWED_RT_NAMES = new Set<String>{
        'Wadhwani_Grants',
        'WCF_Job_Creation_Proposals',
        'WCF_Job_Fulfillment_Job_Creation_Proposals',
        'WCF_Job_Fulfillment_Proposals'
    };

    @AuraEnabled(cacheable=false)
    public static List<ApproverQueueItem> getApproverQueue() {
        Map<Id, RecordType> rtMap = new Map<Id, RecordType>([
            SELECT Id, DeveloperName
            FROM RecordType
            WHERE SObjectType = 'IndividualApplication'
            AND DeveloperName IN :ALLOWED_RT_NAMES
            WITH SYSTEM_MODE
        ]);
        Set<Id> allowedRtIds = rtMap.keySet();
        if (allowedRtIds.isEmpty()) return new List<ApproverQueueItem>();

     List<ApplicationReview> submittedReviews = [
    SELECT Id, Name, ApplicationId, Status, IsSubmitted,
           Recommend_for_CEO_review__c
    FROM ApplicationReview
    WHERE Status = 'Review Submitted'
    WITH SYSTEM_MODE
    ORDER BY LastModifiedDate DESC
];
        if (submittedReviews.isEmpty()) return new List<ApproverQueueItem>();

        Map<Id, ApplicationReview> reviewByAppId = new Map<Id, ApplicationReview>();
        Set<Id> appIds = new Set<Id>();
        for (ApplicationReview ar : submittedReviews) {
            appIds.add(ar.ApplicationId);
            if (!reviewByAppId.containsKey(ar.ApplicationId)) {
                reviewByAppId.put(ar.ApplicationId, ar);
            }
        }

        Map<Id, IndividualApplication> appMap = new Map<Id, IndividualApplication>([
            SELECT Id, Name, Organization_Name__c,
                   Headquarters_City_and_Country__c,
                   Submitter_Name__c,
                   Organizational_Area_s_for_Funding_Inves__c,
                   Status,
                   RecordTypeId
            FROM IndividualApplication
            WHERE Id IN :appIds
            AND RecordTypeId IN :allowedRtIds
            WITH SYSTEM_MODE
            ORDER BY CreatedDate DESC
        ]);

        Map<Id, ApplicationDecision> decisionMap = new Map<Id, ApplicationDecision>();
        for (ApplicationDecision ad : [
            SELECT Id, ApplicationId, ApplicationDecision,
                   Proposal_Review__c, Decision_Date__c
            FROM ApplicationDecision
            WHERE ApplicationId IN :appMap.keySet()
            WITH SYSTEM_MODE
            ORDER BY CreatedDate DESC
        ]) {
            if (!decisionMap.containsKey(ad.ApplicationId)) {
                decisionMap.put(ad.ApplicationId, ad);
            }
        }

        List<ApproverQueueItem> result = new List<ApproverQueueItem>();
        Set<Id> seen = new Set<Id>();
        for (ApplicationReview ar : submittedReviews) {
            Id appId = ar.ApplicationId;
            if (seen.contains(appId)) continue;
            seen.add(appId);

            IndividualApplication app = appMap.get(appId);
            if (app == null) continue;

            ApproverQueueItem item = new ApproverQueueItem();
            item.applicationId     = app.Id;
            item.applicationName   = app.Name;
            item.organizationName  = app.Organization_Name__c;
            item.headquarters      = app.Headquarters_City_and_Country__c;
            item.submitterName     = app.Submitter_Name__c;
            item.applicationStatus = app.Status;

            String trackRaw = app.Organizational_Area_s_for_Funding_Inves__c != null
                  ? app.Organizational_Area_s_for_Funding_Inves__c : '';
            if      (trackRaw.toLowerCase().contains('both'))        item.track = 'Both';
            else if (trackRaw.toLowerCase().contains('fulfillment')) item.track = 'JF';
            else if (trackRaw.toLowerCase().contains('creation'))    item.track = 'JC';
            else                                                     item.track = trackRaw;

            item.reviewId       = ar.Id;
            item.reviewName     = ar.Name;
            item.reviewStatus   = ar.Status;
            item.isSubmitted    = ar.IsSubmitted;
            item.recommendation = ar.Recommend_for_CEO_review__c;

            ApplicationDecision ad = decisionMap.get(appId);
            if (ad != null) {
                item.existingDecision   = ad.ApplicationDecision;
                item.existingDecisionId = ad.Id;
            }

            result.add(item);
        }
        return result;
    }

   @AuraEnabled(cacheable=false)
public static Integer getApproverQueueCount() {
    Map<Id, RecordType> rtMap = new Map<Id, RecordType>([
        SELECT Id FROM RecordType
        WHERE SObjectType = 'IndividualApplication'
        AND DeveloperName IN :ALLOWED_RT_NAMES
        WITH SYSTEM_MODE
    ]);
    if (rtMap.isEmpty()) return 0;

    Set<Id> appIds = new Set<Id>();
    for (ApplicationReview ar : [
        SELECT ApplicationId
        FROM ApplicationReview
        WHERE Status = 'Review Submitted'
        AND ApplicationId IN (
            SELECT Id FROM IndividualApplication
            WHERE RecordTypeId IN :rtMap.keySet()
        )
        WITH SYSTEM_MODE
    ]) {
        appIds.add(ar.ApplicationId);
    }
    return appIds.size();
}

@AuraEnabled
public static String saveDecision(
    Id applicationId,
    Id reviewId,
    String decision,
    String comment,
    String rejectionReasons
) {
    // decision arrives from the LWC as 'Accept', 'Return', 'Conditionally Approve', or 'Decline'

    if ((decision == 'Accept' || decision == 'Conditionally Approve' || decision == 'Return')
        && String.isBlank(comment)) {
        throw new AuraHandledException('A comment is required for this decision.');
    }

    if (decision == 'Return' && String.isBlank(rejectionReasons)) {
        throw new AuraHandledException('Please select at least one rejection reason.');
    }

    List<ApplicationDecision> existing = [
        SELECT Id FROM ApplicationDecision
        WHERE ApplicationId = :applicationId
        WITH SYSTEM_MODE
        LIMIT 1
    ];

    ApplicationDecision ad;
    if (!existing.isEmpty()) {
        ad = existing[0];
    } else {
        ad = new ApplicationDecision();
        ad.ApplicationId = applicationId;
    }

    // ── Pull the Reviewer's recommendation — only needed for the Accept branch ──
    String recommendForCEO = null;
    if (decision == 'Accept' && reviewId != null) {
        List<ApplicationReview> reviews = [
            SELECT Recommend_for_CEO_review__c
            FROM ApplicationReview
            WHERE Id = :reviewId
            WITH SYSTEM_MODE
            LIMIT 1
        ];
        if (!reviews.isEmpty()) {
            recommendForCEO = reviews[0].Recommend_for_CEO_review__c;
        }
    }

    if (decision == 'Accept') {
        ad.ApplicationDecision = 'Accept';          // ← was 'Approve'
    } else if (decision == 'Conditionally Approve') {
        ad.ApplicationDecision = 'Conditionally Approve';
    } else if (decision == 'Return') {
        ad.ApplicationDecision = 'Approved with Resubmission';
        ad.Rejection_Reasons__c = rejectionReasons;
    } else {
        ad.ApplicationDecision = 'Decline';
    }

    ad.Proposal_Review__c  = reviewId;
    ad.DecisionAuthorityId = UserInfo.getUserId();
    ad.Decision_Date__c    = DateTime.now();
    if (String.isNotBlank(comment)) {
        ad.Comment = comment;
    }

    upsert as system ad;

    IndividualApplication app = new IndividualApplication(Id = applicationId);

    if (decision == 'Accept') {
        // Condition 1: Recommend=Yes  -> Recommend for Fund
        // Condition 4: Recommend=No   -> Not Recommend for Fund
        app.Status = (recommendForCEO == 'Yes') ? 'Recommend for Fund' : 'Not Recommend for Fund';
    } else if (decision == 'Conditionally Approve') {
        app.Status = 'Recommend for Fund';
    } else if (decision == 'Decline') {
        app.Status = 'Not Recommend for Fund';
    } else if (decision == 'Return') {
        // Conditions 2 & 3: same outcome regardless of Recommend_for_CEO_review__c
        app.Status = 'Returned by Approver';
    }

    try {
        update as system app;
    } catch (DmlException e) {
        throw new AuraHandledException('Status update failed: ' + e.getDmlMessage(0));
    }

    return app.Status;
}
    // ── NEW: revokeDecision ──
    @AuraEnabled
public static void revokeDecision(Id applicationId) {
    List<ApplicationDecision> existing = [
        SELECT Id, Decision_Date__c
        FROM ApplicationDecision
        WHERE ApplicationId = :applicationId
        WITH SYSTEM_MODE
        LIMIT 1
    ];

    if (existing.isEmpty()) {
        throw new AuraHandledException('No decision found to revoke.');
    }

    ApplicationDecision ad = existing[0];

    // Server-side 7-day guard — never trust the client
    if (ad.Decision_Date__c == null ||
        ad.Decision_Date__c.addDays(7) < DateTime.now()) {
        throw new AuraHandledException('Revoke period has expired.');
    }

    //  Instead of nulling out the decision, stamp it as Revoke for audit history
    ad.ApplicationDecision = 'Revoke';
    update as system ad;

    // Reset application status back to Review Completed - Recommended
    IndividualApplication app = new IndividualApplication(Id = applicationId);
    app.Status = 'Review Completed - Recommended';
    try {
        update as system app;
    } catch (DmlException e) {
        throw new AuraHandledException('Status reset failed: ' + e.getDmlMessage(0));
    }
}
@AuraEnabled(cacheable=false)
public static DecisionWrapper getExistingDecision(Id applicationId) {
    List<ApplicationDecision> ads = [
        SELECT Id, ApplicationDecision, Decision_Date__c, Comment, Rejection_Reasons__c
        FROM ApplicationDecision
        WHERE ApplicationId = :applicationId
        WITH SYSTEM_MODE
        ORDER BY CreatedDate DESC
        LIMIT 1
    ];

    if (ads.isEmpty()
        || ads[0].ApplicationDecision == null
        || ads[0].ApplicationDecision == 'Revoke') {
        return null;
    }

    ApplicationDecision ad = ads[0];

    DecisionWrapper w      = new DecisionWrapper();
     if (ad.ApplicationDecision == 'Approved with Resubmission') {
        IndividualApplication app = [
            SELECT Status FROM IndividualApplication
            WHERE Id = :applicationId
            WITH SYSTEM_MODE
            LIMIT 1
        ];
        Boolean stillWithReviewer = (app.Status == 'Returned by Approver');

        // Always carry the Approver's original comment forward as context,
        // regardless of which branch below fires.
        w.priorReturnComment = ad.Comment;
        w.priorReturnDate    = ad.Decision_Date__c;
         w.priorRejectionReasons   = ad.Rejection_Reasons__c;   // ← NEW
         
         
  if (stillWithReviewer) {
            // ── Still out with Reviewer — lock the screen exactly as before ──
            w.decision     = ad.ApplicationDecision;
            w.decisionId   = ad.Id;
            w.decisionDate = ad.Decision_Date__c;
            w.comment      = ad.Comment;
            w.isReturned   = true;
            w.isRevokable  = false;
        } else {
            // ── NEW: Reviewer closed the loop — unlock buttons for a fresh
            // decision, but flag isBackFromReviewer so the UI can still show
            // the Approver's own prior comment for context. ──
            w.decision            = null;
            w.isReturned          = false;
            w.isBackFromReviewer  = true;
            w.isRevokable         = false;
        }
        return w;
    }
        // ── Normal finalized decision path (unchanged) ──
    w.decision     = ad.ApplicationDecision;
    w.decisionId   = ad.Id;
    w.decisionDate = ad.Decision_Date__c;
    w.comment      = ad.Comment;
    w.isReturned   = false;
    w.isRevokable  = (ad.Decision_Date__c != null && ad.Decision_Date__c.addDays(7) >= DateTime.now());
    return w;
}

    @AuraEnabled(cacheable=false)
    public static ApplicationReview getReviewData(Id reviewId) {
        List<ApplicationReview> reviews = [
            SELECT Id, Name, Status, IsSubmitted,
                   Recommend_for_CEO_review__c,
                   Strength_of_recommendation__c,
                   Strength_of_non_recommendation__c,
                   Recommendation_Strength_Comments__c,
                   Non_Recommendation_Strength_Comments__c,
                   Top_3_proposal_strengths_ranked__c,
                   Top_3_proposal_weaknesses_ranked__c,
                   D1_Governance_Rating__c,          D1_Governance_Comment__c,
                   D1_Leadership_Rating__c,           D1_Leadership_Comment__c,
                   D1_FinancialRecords_Rating__c,     D1_FinancialRecords_Comment__c,
                   D1_SustainabilityVision_Rating__c, D1_SustainabilityVision_Comment__c,
                   D2_ProgramAlignment_Rating__c,     D2_ProgramAlignment_Comment__c,
                   D2_JC_SupportModel_Rating__c,      D2_JC_SupportModel_Comment__c,
                   D2_JF_Distinctiveness_Rating__c,   D2_JF_Distinctiveness_Comment__c,
                   D2_JC_Distinctiveness_Rating__c,   D2_JC_Distinctiveness_Comment__c,
                   D2_OperationalDepth_Rating__c,     D2_OperationalDepth_Comment__c,
                   D3_JF_ScaleRecord_Rating__c,       D3_JF_ScaleRecord_Comment__c,
                   D3_JC_ScaleRecord_Rating__c,       D3_JC_ScaleRecord_Comment__c,
                   D3_JF_ConversionRate_Rating__c,    D3_JF_ConversionRate_Comment__c,
                   D3_JC_ConversionRate_Rating__c,    D3_JC_ConversionRate_Comment__c,
                   D3_JF_CostPerPlacement_Rating__c,  D3_JF_CostPerPlacement_Comment__c,
                   D3_JC_CostPerJob_Rating__c,        D3_JC_CostPerJob_Comment__c,
                   D3_ValidationEvidence_Rating__c,   D3_ValidationEvidence_Comment__c,
                   D4_MandateFit_Rating__c,            D4_MandateFit_Comment__c,
                   D4_Geography_Rating__c,             D4_Geography_Comment__c,
                   D4_GenieAI_Rating__c,               D4_GenieAI_Comment__c,
                   D5_FinancialStability_Rating__c,    D5_FinancialStability_Comment__c,
                   D5_IncrementEstimate_Rating__c,     D5_IncrementEstimate_Comment__c,
                   D5_OperatingInfra_Rating__c,        D5_OperatingInfra_Comment__c,
                   D6_MEFunction_Rating__c,             D6_MEFunction_Comment__c,
                   D6_ExternalVerification_Rating__c,  D6_ExternalVerification_Comment__c,
                   D6_LongitudinalTracking_Rating__c,  D6_LongitudinalTracking_Comment__c,
                   ReviewedById
            FROM ApplicationReview
            WHERE Id = :reviewId
            WITH SYSTEM_MODE
            LIMIT 1
        ];
        return reviews.isEmpty() ? null : reviews[0];
    }
// ── NEW: summary counts matching the Approver List View tiles exactly ──
public class ApproverSummary {
    @AuraEnabled public Integer pending;
    @AuraEnabled public Integer approved;
    @AuraEnabled public Integer declined;
     @AuraEnabled public Integer returned;
     @AuraEnabled public Integer backFromReviewer; // NEW
}

@AuraEnabled(cacheable=false)
public static ApproverSummary getApproverSummary() {
    ApproverSummary summary = new ApproverSummary();

    Map<Id, RecordType> rtMap = new Map<Id, RecordType>([
        SELECT Id FROM RecordType
        WHERE SObjectType = 'IndividualApplication'
        AND DeveloperName IN :ALLOWED_RT_NAMES
        WITH SYSTEM_MODE
    ]);
    if (rtMap.isEmpty()) {
        summary.pending = 0; summary.approved = 0; summary.declined = 0; summary.returned = 0; summary.backFromReviewer = 0;
        return summary;
    }

    Set<Id> appIds = new Set<Id>();
    for (ApplicationReview ar : [
        SELECT ApplicationId
        FROM ApplicationReview
        WHERE Status = 'Review Submitted'
        AND ApplicationId IN (
            SELECT Id FROM IndividualApplication
            WHERE RecordTypeId IN :rtMap.keySet()
        )
        WITH SYSTEM_MODE
    ]) {
        appIds.add(ar.ApplicationId);
    }

    // latest decision per application (mirrors the LIMIT 1 ORDER BY CreatedDate DESC pattern used elsewhere)
    Map<Id, String> latestDecisionByApp = new Map<Id, String>();
    for (ApplicationDecision ad : [
        SELECT ApplicationId, ApplicationDecision
        FROM ApplicationDecision
        WHERE ApplicationId IN :appIds
        WITH SYSTEM_MODE
        ORDER BY CreatedDate DESC
    ]) {
        if (!latestDecisionByApp.containsKey(ad.ApplicationId)) {
            latestDecisionByApp.put(ad.ApplicationId, ad.ApplicationDecision);
        }
    }
    // ── NEW: fetch current status for every app, so 'Returned' vs
    // 'Back from Reviewer' can be told apart ──
    Map<Id, String> appStatusById = new Map<Id, String>();
    for (IndividualApplication a : [
        SELECT Id, Status FROM IndividualApplication
        WHERE Id IN :appIds
        WITH SYSTEM_MODE
    ]) {
        appStatusById.put(a.Id, a.Status);
    }
    Integer pending = 0, approved = 0, declined = 0, returned = 0,backFromReviewer = 0;
    for (Id appId : appIds) {
        String dec = latestDecisionByApp.get(appId);
         String st  = appStatusById.get(appId);
        if (dec == null || dec == 'Revoke') {
            pending++;
        } else if (dec == 'Approve' || dec == 'Conditionally Approve') {
            approved++;
        } else if (dec == 'Decline') {
            declined++;
        }else if (dec == 'Approved with Resubmission') {
            if (st == 'Returned by Approver') {
            returned++;   // NEW
                } else {
                backFromReviewer++;      // Reviewer sent it back — ready for fresh decision
                pending++;               // also needs Approver action, so counts toward Pending too
            }
        }
    }
        

    summary.pending  = pending;
    summary.approved = approved;
    summary.declined = declined;
     summary.returned = returned;
    summary.backFromReviewer = backFromReviewer;
    return summary;
}
        private static final Set<String> REVIEW_RT_NAMES = new Set<String>{
    'WCF_Job_Creation_Review',
    'WCF_Job_Fulfillment',
    'WCF_Job_Fulfillment_Job_Creation'
};

    @AuraEnabled(cacheable=false)
public static String getReviewerCommentForApprover(Id applicationId) {
    List<ApplicationReview> reviews = [
        SELECT Id, Reviewer_Comment_to_Approver__c
        FROM ApplicationReview
        WHERE ApplicationId = :applicationId
        AND RecordType.DeveloperName IN :REVIEW_RT_NAMES
        WITH SYSTEM_MODE
        ORDER BY LastModifiedDate DESC
        LIMIT 1
    ];
    if (reviews.isEmpty()) return null;
    return reviews[0].Reviewer_Comment_to_Approver__c;
}
    
    @AuraEnabled(cacheable=true)
public static List<Map<String,String>> getApproverRejectionReasonOptions() {
    List<Map<String,String>> options = new List<Map<String,String>>();
    Schema.DescribeFieldResult fieldResult =
        ApplicationDecision.Rejection_Reasons__c.getDescribe();

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
}