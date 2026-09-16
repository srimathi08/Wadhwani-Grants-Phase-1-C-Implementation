public without sharing class WCFProposalListController {
    
        private static final Set<String> WCF_REVIEW_RECORD_TYPES = new Set<String>{
            'WCF_Job_Creation_Review',
            'WCF_Job_Fulfillment',
            'WCF_Job_Fulfillment_Job_Creation'
        };
    
        @AuraEnabled
        public static List<IndividualApplication> getValidatedProposals() {
            return [
                SELECT
                    Id,
                    Name,
                    Organization_Name__c,
                    Headquarters_City_and_Country__c,
                    Submitter_Name__c,
                    Organizational_Area_s_for_Funding_Inves__c,
                    Organizational_Area_s_for_Funding_Inves1__c,
                    Status,
                    Assigned_reviewers__c,
                    CreatedDate,
                    Validated__c
                FROM IndividualApplication
               WHERE Status IN (
        'Under Review',
        'Review Completed - Recommended',
        'Review Completed - Not Recommended',
                   'Reviewer Rejected',
                   'Returned by Approver',
                   'Recommend for Fund'  
    )
                WITH SYSTEM_MODE
                ORDER BY CreatedDate DESC
            ];
        }
    
        @AuraEnabled
        public static Map<String, ReviewInfo> getReviewStatusMap() {
            Map<String, ReviewInfo> resultMap = new Map<String, ReviewInfo>();
    
            Set<Id> underReviewIds = new Set<Id>();
            for (IndividualApplication ia : [
                SELECT Id FROM IndividualApplication WHERE Status IN (
                    'Under Review',
                    'Review Completed - Recommended',
                    'Review Completed - Not Recommended',
                    'Reviewer Rejected',
                    'Returned by Approver',
                    'Recommend for Fund'   
                )
                WITH SYSTEM_MODE
            ]) {
                underReviewIds.add(ia.Id);
            }
            if (underReviewIds.isEmpty()) return resultMap;
    
            Set<Id> reviewerRtIds = RecordTypeHelper.applicationReviewReviewerAllowedIds();
            Id validatorRtId = RecordTypeHelper.applicationReviewValidatorId();

            // ── Pass 1: WCF review record types → status, reviewId, DueDate if present ──
            for (ApplicationReview ar : [
                SELECT Id, ApplicationId, Status, IsSubmitted, DueDate
                FROM ApplicationReview
                WHERE ApplicationId IN :underReviewIds
                AND RecordTypeId IN :reviewerRtIds
                WITH SYSTEM_MODE
                ORDER BY LastModifiedDate DESC
            ]) {
                String appId = String.valueOf(ar.ApplicationId);
                if (!resultMap.containsKey(appId)) {
                    ReviewInfo info  = new ReviewInfo();
                    info.reviewId    = ar.Id;
                    info.status      = ar.Status;
                    info.isSubmitted = ar.IsSubmitted;
                    info.dueDate     = ar.DueDate != null ? String.valueOf(ar.DueDate) : null;
                    info.isFlagged   = false;
                    resultMap.put(appId, info);
                } else if (ar.DueDate != null && resultMap.get(appId).dueDate == null) {
                    resultMap.get(appId).dueDate = String.valueOf(ar.DueDate);
                }
            }
    
            // ── Pass 2: WCF_Validator → backfill DueDate, OR create a "Not Started" entry ──
            for (ApplicationReview ar : [
                SELECT ApplicationId, DueDate,
                       Decision_Final_Decision_from_Sec_1_2__c,
                       Decision_rationale__c,
                       Flag_rationale_Flagging_Criteria__c,
                       Flag__c,
                       Status
                FROM ApplicationReview
                WHERE ApplicationId IN :underReviewIds
                AND RecordTypeId = :validatorRtId
                AND Status IN ('Sealed', 'Flagged')
                WITH SYSTEM_MODE
                ORDER BY LastModifiedDate DESC
            ]) {
                String appId = String.valueOf(ar.ApplicationId);
                  Boolean isFlagged = ar.Decision_Final_Decision_from_Sec_1_2__c == 'Flag'
                            && String.isBlank(ar.Flag__c);   // ← KEY CHANGE
    
                if (resultMap.containsKey(appId)) {
                    ReviewInfo existing = resultMap.get(appId);
                    if (existing.dueDate == null && ar.DueDate != null) {
                        existing.dueDate = String.valueOf(ar.DueDate);
                    }
                    if (isFlagged) {
                        existing.isFlagged          = true;
                        existing.flagRationale      = ar.Flag_rationale_Flagging_Criteria__c;
                        existing.decisionRationale  = ar.Decision_rationale__c;
                    }
                } else {
                    ReviewInfo info          = new ReviewInfo();
                    info.reviewId            = null;
                    info.status              = null;
                    info.isSubmitted         = false;
                    info.dueDate             = ar.DueDate != null ? String.valueOf(ar.DueDate) : null;
                    info.isFlagged           = isFlagged;
                    info.flagRationale       = isFlagged ? ar.Flag_rationale_Flagging_Criteria__c : null;
                    info.decisionRationale   = isFlagged ? ar.Decision_rationale__c : null;
                    resultMap.put(appId, info);
                }
            }
    
            return resultMap;
        }
    
        public class ReviewInfo {
            @AuraEnabled public String reviewId;
            @AuraEnabled public String status;
            @AuraEnabled public Boolean isSubmitted;
            @AuraEnabled public String dueDate;
     @AuraEnabled public Boolean isFlagged;
            @AuraEnabled public String  flagRationale;
            @AuraEnabled public String  decisionRationale;
        }
    
    // ── NEW: Update Flag__c on the validator's ApplicationReview ──
    @AuraEnabled
    public static void updateFlagDecision(Id applicationId, String flagDecision) {
        // flagDecision = 'Proceed for Review' or 'Reject'
    
        Id validatorRtId = RecordTypeHelper.applicationReviewValidatorId();
        List<ApplicationReview> reviews = [
            SELECT Id, Flag__c
            FROM ApplicationReview
            WHERE ApplicationId = :applicationId
            AND RecordTypeId = :validatorRtId
            AND Decision_Final_Decision_from_Sec_1_2__c = 'Flag'
            WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];
    
        if (reviews.isEmpty()) {
            throw new AuraHandledException(
                'No flagged validator review found for this application.'
            );
        }
    
        ApplicationReview ar = reviews[0];
        ar.Flag__c = flagDecision;
    
        try {
            update as system ar;
        } catch (DmlException e) {
            throw new AuraHandledException('Update failed: ' + e.getDmlMessage(0));
        }
    
        // ── Update IndividualApplication based on decision ──
        IndividualApplication app = new IndividualApplication(Id = applicationId);
    
        if (flagDecision == 'Proceed for Review') {
            // Clear the flagged checkbox so dashboard moves it OUT of Flagged bucket
            // and INTO the normal review queue (Total Assigned / Not Started)
            app.Flagged__c = false;
            // Status stays 'Under Review' — already set by trigger when validator flagged
        } else if (flagDecision == 'Reject') {
            app.Status     = 'Reviewer Rejected';
            app.Flagged__c = false;   // no longer flagged — it's rejected
        }
            try {
                update as system app;
            } catch (DmlException e) {
                throw new AuraHandledException(
                    'Application status update failed: ' + e.getDmlMessage(0)
                );
            }
        }
    
    
    @AuraEnabled(cacheable=false)
    public static ValidatorFlagInfo getValidatorFlagInfo(Id applicationId) {
        Id validatorRtId = RecordTypeHelper.applicationReviewValidatorId();
        List<ApplicationReview> reviews = [
            SELECT Id,
                   Decision_rationale__c,
                   Flag_rationale_Flagging_Criteria__c,
                   Other_describe_the_concern__c,  
                   Decision_Final_Decision_from_Sec_1_2__c,
                   Flag__c
            FROM ApplicationReview
            WHERE ApplicationId = :applicationId
            AND RecordTypeId = :validatorRtId
            AND Decision_Final_Decision_from_Sec_1_2__c = 'Flag'
            WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];
    
        if (reviews.isEmpty()) return null;
    
        ValidatorFlagInfo info      = new ValidatorFlagInfo();
        info.reviewId               = reviews[0].Id;
        info.decisionRationale      = reviews[0].Decision_rationale__c;
        info.flagRationale          = reviews[0].Flag_rationale_Flagging_Criteria__c;
          info.otherConcern           = reviews[0].Other_describe_the_concern__c;  // ← ADD
        info.flagDecision           = reviews[0].Flag__c; // null / 'Proceed for Review' / 'Reject'
        return info;
    }
    
    public class ValidatorFlagInfo {
        @AuraEnabled public String reviewId;
        @AuraEnabled public String decisionRationale;
        @AuraEnabled public String flagRationale;
        @AuraEnabled public String otherConcern; 
        @AuraEnabled public String flagDecision; // current Flag__c value
    }
    @AuraEnabled
    public static String createReviewRecord(Id applicationId, String track) {
        Set<Id> reviewerRtIds = RecordTypeHelper.applicationReviewReviewerAllowedIds();
        // Check if one already exists (safety net — avoids duplicates)
        List<ApplicationReview> existing = [
            SELECT Id FROM ApplicationReview
            WHERE ApplicationId = :applicationId
            AND RecordTypeId IN :reviewerRtIds
            WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];
        if (!existing.isEmpty()) return existing[0].Id;
    
        // Determine RecordType based on track
        String rtDeveloperName;
        if (track == 'Both') {
            rtDeveloperName = 'WCF_Job_Fulfillment_Job_Creation';
        } else if (track == 'JC') {
            rtDeveloperName = 'WCF_Job_Creation_Review';
        } else {
            rtDeveloperName = 'WCF_Job_Fulfillment'; // JF default
        }
    
        Id rtId = RecordTypeHelper.getRecordTypeId('ApplicationReview', rtDeveloperName);
    
        ApplicationReview ar = new ApplicationReview();
        ar.ApplicationId  = applicationId;
        ar.RecordTypeId   = rtId;
        ar.Status         = 'In Progress';
        insert ar;
    
        return ar.Id;
    }
        // ── Finalized: field name confirmed ──
// ── Updated: Reviewer can no longer return straight to the Applicant —
    // this now routes back to the Validator instead ──
    @AuraEnabled
    public static void updateApproverReturnDecision(
        Id applicationId,
        String action,
        String reviewerComment
    ) {
        if (action == 'ReturnToValidator' && String.isBlank(reviewerComment)) {
            throw new AuraHandledException(
                'A comment is required explaining what needs to be revalidated.'
            );
        }

        Set<Id> reviewerRtIds = RecordTypeHelper.applicationReviewReviewerAllowedIds();
        List<ApplicationReview> reviews = [
            SELECT Id
            FROM ApplicationReview
            WHERE ApplicationId = :applicationId
            AND RecordTypeId IN :reviewerRtIds
            WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];

        if (reviews.isEmpty()) {
            throw new AuraHandledException('No review record found for this application.');
        }

        ApplicationReview ar = reviews[0];
        IndividualApplication app = new IndividualApplication(Id = applicationId);

        if (action == 'Approve') {
            if (String.isBlank(reviewerComment)) {
                throw new AuraHandledException(
                    'A comment is required explaining your note to the Approver.'
                );
            }
            ar.Reviewer_Comment_to_Approver__c = reviewerComment;
            ar.Status  = 'Review Submitted';
            app.Status = 'Review Completed - Recommended';
        } else if (action == 'ReturnToValidator') {
            ar.Reviewer_Return_Comment__c = reviewerComment;   // reused — Validator reads this same field
            app.Status = 'Returned to Validator';               // ← new picklist value you just added
        } else {
            throw new AuraHandledException('Invalid action: ' + action);
        }

        try {
            update as system ar;
            update as system app;
        } catch (DmlException e) {
            throw new AuraHandledException('Update failed: ' + e.getDmlMessage(0));
        }
    }
    
    // ── NEW: separate lane for the "Returned by Approver" tile, mirrors Flag pattern ──
    @AuraEnabled(cacheable=false)
    public static Integer getApproverReturnQueueCount() {
        return [
            SELECT COUNT()
            FROM IndividualApplication
            WHERE Status = 'Returned by Approver'
             WITH SYSTEM_MODE
        ];
    }
    
    @AuraEnabled(cacheable=false)
    public static List<IndividualApplication> getApproverReturnQueue() {
        return [
            SELECT Id, Name, Organization_Name__c, Submitter_Name__c, Status
            FROM IndividualApplication
            WHERE Status = 'Returned by Approver'
             WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 200
        ];
    }
        
        // ── NEW: wrapper for the Approver's Return comment, shown to the Reviewer ──
    public class ApproverReturnInfo {
        @AuraEnabled public String   decisionId;
        @AuraEnabled public String   comment;        // ApplicationDecision.Comment
        @AuraEnabled public DateTime decisionDate;
        @AuraEnabled public String   rejectionReasons;   // ← NEW
    }
    
    @AuraEnabled(cacheable=false)
    public static ApproverReturnInfo getApproverReturnInfo(Id applicationId) {
        List<ApplicationDecision> decisions = [
            SELECT Id, Comment, Decision_Date__c, ApplicationDecision, Rejection_Reasons__c
            FROM ApplicationDecision
            WHERE ApplicationId = :applicationId
            AND ApplicationDecision = 'Approved with Resubmission'
            WITH SYSTEM_MODE
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
    
        if (decisions.isEmpty()) return null;
    
        ApproverReturnInfo info = new ApproverReturnInfo();
        info.decisionId    = decisions[0].Id;
        info.comment        = decisions[0].Comment;
        info.decisionDate   = decisions[0].Decision_Date__c;
            info.rejectionReasons   = decisions[0].Rejection_Reasons__c;   // ← NEW
        return info;
    }
    
    public class AcceptedApplicationItem {
    @AuraEnabled public String   applicationId;
    @AuraEnabled public String   appName;
    @AuraEnabled public String   organizationName;
    @AuraEnabled public String   approverComment;
    @AuraEnabled public DateTime decisionDate;
}

@AuraEnabled(cacheable=false)
public static Integer getAcceptedApplicationsCount() {
    Integer count = 0;
    for (ApplicationDecision ad : [
        SELECT Comment
        FROM ApplicationDecision
        WHERE ApplicationDecision = 'Accept'
        AND Proposal_Review__r.Recommend_for_CEO_review__c = 'Yes'
        WITH SYSTEM_MODE
    ]) {
        if (String.isNotBlank(ad.Comment)) {
            count++;
        }
    }
    return count;
}
    
    @AuraEnabled(cacheable=false)
public static List<Id> getAcceptedApplicationIds() {
    Set<Id> ids = new Set<Id>();
    for (ApplicationDecision ad : [
        SELECT ApplicationId, Comment
        FROM ApplicationDecision
        WHERE ApplicationDecision = 'Accept'
        AND Proposal_Review__r.Recommend_for_CEO_review__c = 'Yes'
        WITH SYSTEM_MODE
    ]) {
        if (String.isNotBlank(ad.Comment)) {
            ids.add(ad.ApplicationId);
        }
    }
    return new List<Id>(ids);
}

@AuraEnabled(cacheable=false)
public static List<AcceptedApplicationItem> getAcceptedApplicationsQueue() {
    List<ApplicationDecision> decisions = [
        SELECT Id, ApplicationId, Comment, Decision_Date__c
        FROM ApplicationDecision
        WHERE ApplicationDecision = 'Accept'
        AND Proposal_Review__r.Recommend_for_CEO_review__c = 'Yes'
        WITH SYSTEM_MODE
        ORDER BY Decision_Date__c DESC
        LIMIT 200
    ];
    if (decisions.isEmpty()) return new List<AcceptedApplicationItem>();

    // ── Filter out blank comments in Apex, since Comment can't be filtered in SOQL ──
    List<ApplicationDecision> withComment = new List<ApplicationDecision>();
    Set<Id> appIds = new Set<Id>();
    for (ApplicationDecision ad : decisions) {
        if (String.isNotBlank(ad.Comment)) {
            withComment.add(ad);
            appIds.add(ad.ApplicationId);
        }
    }
    if (withComment.isEmpty()) return new List<AcceptedApplicationItem>();

    Map<Id, IndividualApplication> appMap = new Map<Id, IndividualApplication>([
        SELECT Id, Name, Organization_Name__c, Submitter_Name__c
        FROM IndividualApplication
        WHERE Id IN :appIds
        WITH SYSTEM_MODE
    ]);

    List<AcceptedApplicationItem> result = new List<AcceptedApplicationItem>();
    for (ApplicationDecision ad : withComment) {
        IndividualApplication app = appMap.get(ad.ApplicationId);
        if (app == null) continue;
        AcceptedApplicationItem item = new AcceptedApplicationItem();
        item.applicationId    = ad.ApplicationId;
        item.appName          = app.Name;
        item.organizationName = app.Organization_Name__c;
        item.approverComment  = ad.Comment;
        item.decisionDate     = ad.Decision_Date__c;
        result.add(item);
    }
    return result;
}
    
    @AuraEnabled(cacheable=true)
public static Map<String, Integer> getQueueSummary() {
    List<IndividualApplication> apps  = getValidatedProposals();
    Map<String, ReviewInfo> statusMap = getReviewStatusMap();

    Integer reviewed = 0, flagged = 0, total = 0;

    for (IndividualApplication a : apps) {
        ReviewInfo info   = statusMap.get(String.valueOf(a.Id));
        Boolean isFlagged = (info != null && info.isFlagged == true);

        if (isFlagged)                          { flagged++; continue; }
        if (a.Status == 'Reviewer Rejected')    { continue; }
        if (a.Status == 'Returned by Approver') { continue; }

        total++;
        if (info != null && (info.isSubmitted == true || info.status == 'Review Submitted')) {
            reviewed++;
        }
    }
    return new Map<String, Integer>{ 'reviewed' => reviewed, 'flagged' => flagged, 'total' => total };
}

    }