public without sharing class WCFProposalListController {
    
        // Recommend_for_CEO_review__c values that mean "recommended" (single source of truth)
        private static final Set<String> POSITIVE_RECS =
            WCF_ReviewFormJFController.POSITIVE_RECOMMENDATION_VALUES;

        private static final Set<String> WCF_REVIEW_RECORD_TYPES = new Set<String>{
            'WCF_Job_Creation_Review',
            'WCF_Job_Fulfillment',
            'WCF_Job_Fulfillment_Job_Creation'
        };
    
        @AuraEnabled
        public static List<IndividualApplication> getValidatedProposals() {
            Set<Id> acceptedAppIds = getAllAcceptedAppIds();

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
                    Validated__c,
                    Submission_Round__c,
                    Last_Resubmission_Date__c
                FROM IndividualApplication
                WHERE Status IN (
                    'Under Review',
                    'Review Completed - Recommended',
                    'Review Completed - Not Recommended',
                    'Reviewer Rejected',
                    'Returned by Approver',
                    'Recommend for Fund',
                    'Not Recommend for Fund'
                )
                OR Id IN :acceptedAppIds
                WITH SYSTEM_MODE
                ORDER BY CreatedDate DESC
            ];
        }
        

        // Every application the Approver accepted (unfiltered). Used to keep these
// proposals visible in the reviewer list even after compliance is done.
private static Set<Id> getAllAcceptedAppIds() {
    Set<Id> ids = new Set<Id>();
    for (ApplicationDecision ad : [
        SELECT ApplicationId
        FROM ApplicationDecision
        WHERE ApplicationDecision = 'Accept'
        AND Proposal_Review__r.Recommend_for_CEO_review__c IN :POSITIVE_RECS
        WITH SYSTEM_MODE
    ]) {
        if (ad.ApplicationId != null) ids.add(ad.ApplicationId);
    }
    return ids;
}

// Compliance state per application. Key present = a request already exists.
// A parent request (no Document_Type__c) wins over per-document child records.
private static Map<Id, String> getComplianceStatusByApp(Set<Id> appIds) {
    Map<Id, String> result = new Map<Id, String>();
    if (appIds == null || appIds.isEmpty()) return result;
    for (WCF_Compliance_Document__c c : [
        SELECT IndividualApplication__c, Status__c, Document_Type__c
        FROM WCF_Compliance_Document__c
        WHERE IndividualApplication__c IN :appIds
        WITH SYSTEM_MODE
        ORDER BY CreatedDate ASC
    ]) {
        Boolean isParent = String.isBlank(c.Document_Type__c);
        if (isParent || !result.containsKey(c.IndividualApplication__c)) {
            result.put(c.IndividualApplication__c,
                String.isNotBlank(c.Status__c) ? c.Status__c : 'Pending Submission');
        }
    }
    return result;
}


        @AuraEnabled
        public static Map<String, ReviewInfo> getReviewStatusMap() {
            Map<String, ReviewInfo> resultMap = new Map<String, ReviewInfo>();
    
            Set<Id> underReviewIds = new Set<Id>();
            for (IndividualApplication ia : getValidatedProposals()) {
                underReviewIds.add(ia.Id);
            }
            if (underReviewIds.isEmpty()) return resultMap;
    
            Set<Id> reviewerRtIds = RecordTypeHelper.applicationReviewReviewerAllowedIds();
            Id validatorRtId = RecordTypeHelper.applicationReviewValidatorId();

            // ── Pass 1: WCF review record types → status, reviewId, DueDate if present ──
            for (ApplicationReview ar : [
                SELECT Id, ApplicationId, Status, IsSubmitted, DueDate,
                       Recommend_for_CEO_review__c, Reviewer_Return_Comment__c
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
                    info.recommendation = ar.Recommend_for_CEO_review__c;   // NEW
                    info.isBackFromValidator = String.isNotBlank(ar.Reviewer_Return_Comment__c);
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
                       Other_describe_the_concern__c,
                       Flag__c,
                       Status
                FROM ApplicationReview
                WHERE ApplicationId IN :underReviewIds
                AND RecordTypeId = :validatorRtId
               AND Status IN ('Validated', 'Sealed', 'Flagged')
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
                        existing.otherConcern       = ar.Other_describe_the_concern__c;
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
                    info.otherConcern         = isFlagged ? ar.Other_describe_the_concern__c : null;
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
            @AuraEnabled public String  otherConcern;
            @AuraEnabled public String  recommendation;   // NEW: Recommend_for_CEO_review__c
            @AuraEnabled public Boolean isBackFromValidator;
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
            ar.Reviewer_Return_Comment__c = null;
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
        // Only return if the application is currently in 'Returned by Approver' status
        List<IndividualApplication> apps = [
            SELECT Id, Status FROM IndividualApplication
            WHERE Id = :applicationId
            AND Status = 'Returned by Approver'
            WITH SYSTEM_MODE
            LIMIT 1
        ];
        if (apps.isEmpty()) return null;

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
        info.rejectionReasons   = decisions[0].Rejection_Reasons__c;
        return info;
    }
    
    public class AcceptedApplicationItem {
    @AuraEnabled public String   applicationId;
    @AuraEnabled public String   appName;
    @AuraEnabled public String   organizationName;
    @AuraEnabled public String   approverComment;
    @AuraEnabled public DateTime decisionDate;
    @AuraEnabled public Boolean  complianceRequested;   // NEW
    @AuraEnabled public String   complianceStatus;      // NEW
}

@AuraEnabled(cacheable=false)
public static Integer getAcceptedApplicationsCount() {
    Set<Id> ids = getAllAcceptedAppIds();
    ids.removeAll(getComplianceStatusByApp(ids).keySet());
    return ids.size();
}

@AuraEnabled(cacheable=false)
public static List<Id> getAcceptedApplicationIds() {
    Set<Id> ids = getAllAcceptedAppIds();
    ids.removeAll(getComplianceStatusByApp(ids).keySet());
    return new List<Id>(ids);
}

@AuraEnabled(cacheable=false)
public static List<AcceptedApplicationItem> getAcceptedApplicationsQueue() {
    List<ApplicationDecision> decisions = [
        SELECT Id, ApplicationId, Comment, Decision_Date__c
        FROM ApplicationDecision
        WHERE ApplicationDecision = 'Accept'
        AND Proposal_Review__r.Recommend_for_CEO_review__c IN :POSITIVE_RECS
        WITH SYSTEM_MODE
        ORDER BY Decision_Date__c DESC
        //LIMIT 200
    ];
    if (decisions.isEmpty()) return new List<AcceptedApplicationItem>();

    // ── Keep only the latest decision per application ──
    List<ApplicationDecision> uniqueDecisions = new List<ApplicationDecision>();
    Set<Id> seenAppIds = new Set<Id>();
    for (ApplicationDecision ad : decisions) {
        if (ad.ApplicationId != null && !seenAppIds.contains(ad.ApplicationId)) {
            seenAppIds.add(ad.ApplicationId);
            uniqueDecisions.add(ad);
        }
    }
    if (uniqueDecisions.isEmpty()) return new List<AcceptedApplicationItem>();

    Map<Id, IndividualApplication> appMap = new Map<Id, IndividualApplication>([
        SELECT Id, Name, Organization_Name__c, Submitter_Name__c
        FROM IndividualApplication
        WHERE Id IN :seenAppIds
        WITH SYSTEM_MODE
    ]);
    Map<Id, String> complianceMap = getComplianceStatusByApp(seenAppIds);

    List<AcceptedApplicationItem> result = new List<AcceptedApplicationItem>();
    for (ApplicationDecision ad : uniqueDecisions) {
        IndividualApplication app = appMap.get(ad.ApplicationId);
        if (app == null) continue;
        AcceptedApplicationItem item = new AcceptedApplicationItem();
        item.applicationId    = ad.ApplicationId;
        item.appName          = app.Name;
        item.organizationName = app.Organization_Name__c;
        item.approverComment  = String.isNotBlank(ad.Comment) ? ad.Comment : '—';
        item.complianceRequested = complianceMap.containsKey(ad.ApplicationId);
        item.complianceStatus    = complianceMap.get(ad.ApplicationId);
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

@AuraEnabled
    public static List<ReviewerPreviewItem> getReviewerPreview(Integer maxRows) {
        if (maxRows == null) maxRows = 5;

        // ── Step 1: Start from ALL "Under Review" applications (not from ApplicationReview) ──
        // This is the key fix — it ensures apps with NO review record yet
        // ("Not Started") are still included, not just ones that already
        // have an ApplicationReview row.
        List<IndividualApplication> apps = [
            SELECT Id, Name, Account.Name, Account.WCF_Organizational_Name__c,
                   RecordType.Name, Headquarters_City_and_Country__c, Status,
                   Submission_Round__c, Last_Resubmission_Date__c,
                   Organizational_Area_s_for_Funding_Inves__c, Organizational_Area_s_for_Funding_Inves1__c
            FROM IndividualApplication
           WHERE Status IN (
        'Under Review',
        'Reviewer Rejected'
    )
        ];
        if (apps.isEmpty()) return new List<ReviewerPreviewItem>();

        Set<Id> underReviewIds = new Map<Id, IndividualApplication>(apps).keySet();

        // ── Step 2: Pull WCF review records (if they exist) for these apps ──
        Map<Id, ApplicationReview> reviewByAppId = new Map<Id, ApplicationReview>();
        for (ApplicationReview ar : [
            SELECT Id, ApplicationId, Status, IsSubmitted, DueDate, LastModifiedDate
            FROM ApplicationReview
            WHERE ApplicationId IN :underReviewIds
            AND RecordType.DeveloperName IN :WCF_REVIEW_RECORD_TYPES
            ORDER BY LastModifiedDate DESC
        ]) {
            // Keep only the most recent review per application
            if (!reviewByAppId.containsKey(ar.ApplicationId)) {
                reviewByAppId.put(ar.ApplicationId, ar);
            }
        }

        // ── Step 3: Backfill DueDate from WCF_Validator review where missing ──
        Map<Id, Date> validatorDueDateMap = new Map<Id, Date>();
        for (ApplicationReview ar : [
            SELECT ApplicationId, DueDate
            FROM ApplicationReview
            WHERE ApplicationId IN :underReviewIds
            AND RecordType.DeveloperName = 'WCF_Validator'
            AND DueDate != null
            ORDER BY DueDate ASC
        ]) {
            if (!validatorDueDateMap.containsKey(ar.ApplicationId)) {
                validatorDueDateMap.put(ar.ApplicationId, ar.DueDate);
            }
        }
	
		// ── Step 3b: Find app IDs that are PENDING flagged (reviewer hasn't acted yet) ──
Set<Id> pendingFlaggedAppIds = new Set<Id>();
for (ApplicationReview ar : [
    SELECT ApplicationId, Flag__c
    FROM ApplicationReview
    WHERE ApplicationId IN :underReviewIds
    AND RecordType.DeveloperName = 'WCF_Validator'
    AND Decision_Final_Decision_from_Sec_1_2__c = 'Flag'
    AND Status IN ('Sealed', 'Flagged')
]) {
    if (String.isBlank(ar.Flag__c)) {
        pendingFlaggedAppIds.add(ar.ApplicationId);
    }
}

        // ── Step 4: Build unreviewed list (Not Started + In Progress), compute effective due date ──
        List<Id> withDate = new List<Id>();
        List<Id> noDate   = new List<Id>();
        Map<Id, Date> effectiveDueDate = new Map<Id, Date>();
        // Track whether each app actually has a review record, and its status
        Map<Id, ApplicationReview> includedReview = new Map<Id, ApplicationReview>();

        for (IndividualApplication ia : apps) {
            ApplicationReview ar = reviewByAppId.get(ia.Id);

            // Exclude anything already reviewed/submitted
            if (ar != null && (ar.IsSubmitted || ar.Status == 'Review Submitted')) {
                continue;
            }
			
			  // ← ADD: Exclude apps pending flag decision — they sit in Flagged bucket, not queue
    if (pendingFlaggedAppIds.contains(ia.Id)) {
        continue;
    }

            includedReview.put(ia.Id, ar); // ar may be null → "Not Started", no review record yet

            Date d = (ar != null && ar.DueDate != null)
                        ? ar.DueDate
                        : validatorDueDateMap.get(ia.Id);

            if (d != null) {
                effectiveDueDate.put(ia.Id, d);
                withDate.add(ia.Id);
            } else {
                noDate.add(ia.Id);
            }
        }

        // ── Step 5: Sort by due date ascending (overdue/nearest first), nulls last ──
        for (Integer i = 0; i < withDate.size() - 1; i++) {
            for (Integer j = i + 1; j < withDate.size(); j++) {
                if (effectiveDueDate.get(withDate[i]) > effectiveDueDate.get(withDate[j])) {
                    Id tmp      = withDate[i];
                    withDate[i] = withDate[j];
                    withDate[j] = tmp;
                }
            }
        }

        List<Id> sortedIds = new List<Id>();
        sortedIds.addAll(withDate);
        sortedIds.addAll(noDate);

        // ── Step 6: Build result rows ──
        Map<Id, IndividualApplication> appById = new Map<Id, IndividualApplication>(apps);

        List<ReviewerPreviewItem> result = new List<ReviewerPreviewItem>();
        Integer count = 0;
        for (Id appId : sortedIds) {
            if (count >= maxRows) break;
            IndividualApplication ia = appById.get(appId);
            if (ia == null) continue;

            ApplicationReview ar = includedReview.get(appId); // may be null
            Date dueDate = (ar != null && ar.DueDate != null)
                                ? ar.DueDate
                                : validatorDueDateMap.get(appId);

ReviewerPreviewItem item = new ReviewerPreviewItem();

item.reviewId       = (ar != null) ? ar.Id : null;
item.appRecordId    = ia.Id;
item.appName        = ia.Name;
item.accountName    = ia.Account != null ? ia.Account.Name : null;
item.organizationName = (ia.Account != null && String.isNotBlank(ia.Account.WCF_Organizational_Name__c))
                            ? ia.Account.WCF_Organizational_Name__c
                            : (ia.Account != null ? ia.Account.Name : null);
item.recordTypeName = ia.RecordType != null ? ia.RecordType.Name : null;

if (ia.Status == 'Reviewer Rejected') {
    item.status = 'Reviewer Rejected';
    item.isRejected = true;
} else {
    item.status = (ar != null) ? ar.Status : null;
    item.isRejected = false;
}

item.dueDate      = dueDate != null ? String.valueOf(dueDate) : null;
item.headquarters = ia.Headquarters_City_and_Country__c;
String rawTrack   = String.isNotBlank(ia.Organizational_Area_s_for_Funding_Inves1__c)
    ? ia.Organizational_Area_s_for_Funding_Inves1__c
    : ia.Organizational_Area_s_for_Funding_Inves__c;
item.track        = WCF_ReviewFormJFController.resolveTrackCodes(rawTrack);

Decimal round = ia.Submission_Round__c;
if (round == null || round < 1) {
    round = (ia.Status == 'Application Resubmitted' || ia.Last_Resubmission_Date__c != null) ? 2 : 1;
}
item.submissionRound = round.intValue();
item.revisionCount   = Math.max(0, round.intValue() - 1);

            result.add(item);
            count++;
        }
        return result;
    }   

       public class ReviewerPreviewItem {
        @AuraEnabled public String reviewId;
        @AuraEnabled public String appRecordId;
        @AuraEnabled public String appName;
        @AuraEnabled public String accountName;
        @AuraEnabled public String organizationName;
        @AuraEnabled public String recordTypeName;
        @AuraEnabled public String status;
        @AuraEnabled public String dueDate;
        @AuraEnabled public String headquarters; // ADD THIS
        @AuraEnabled public Boolean isRejected;
        @AuraEnabled public String track;
        @AuraEnabled public Integer submissionRound;
        @AuraEnabled public Integer revisionCount;
    }
    }