/**
 * wcfHomeDashboardController
 * Pipeline stage counts for WCF Home Dashboard strip.
 *
 * IMPORTANT: This class no longer computes its own counts for
 * Validated / Flagged / Review. Instead it calls the SAME Apex
 * methods that already power the Validator Dashboard and Reviewer
 * Dashboard tiles, so the Home strip can never drift out of sync
 * with those pages again.
 *
 * Approval / Approved are still placeholders — see TODO below.
 * We need the Approver Dashboard's own summary controller (the one
 * producing Pending Decisions / Recommended / Approved / Declined)
 * before these two can be wired up the same way.
 */



/*
public without sharing class wcfHomeDashboardController {

    public class PipelineCounts {
        @AuraEnabled public Integer submitted  { get; set; }
        @AuraEnabled public Integer validation { get; set; }
        @AuraEnabled public Integer flagged    { get; set; }
        @AuraEnabled public Integer review     { get; set; }
        @AuraEnabled public Integer approval   { get; set; }
        @AuraEnabled public Integer approved   { get; set; }

        public PipelineCounts() {
            this.submitted  = 0;
            this.validation = 0;
            this.flagged    = 0;
            this.review     = 0;
            this.approval   = 0;
            this.approved   = 0;
        }
    }

    @AuraEnabled
    public static PipelineCounts getPipelineCounts() {
        PipelineCounts result = new PipelineCounts();

        // ── 1. Submitted — same allowed record types used by the Validator Portal list ──
        Set<String> allowedTypes = new Set<String>{
            'WCF Job Creation Proposals',
            'WCF Job Fulfillment & Job Creation Proposals',
            'WCF Job Fulfillment Proposals'
        };
        result.submitted = [
            SELECT COUNT()
            FROM IndividualApplication
            WHERE RecordType.Name IN :allowedTypes
            AND Status = 'Submitted'
            WITH SYSTEM_MODE
        ];

        // ── 2. Validated — reuse EXACT logic from the Validator Dashboard tile ──
        // WCFValidatorController.getActionCounts() already excludes resubmissions
        // and "awaiting applicant" (Return decisions) the same way the Validator
        // Dashboard does, so this will always equal that page's VALIDATED number.
        Map<String, Integer> validatorCounts = WCFValidatorController.getActionCounts();
        result.validation = validatorCounts.containsKey('validated')
            ? validatorCounts.get('validated') : 0;

        // ── 3. Flagged + Review(Total Assigned) — reuse EXACT logic from the
        //      Reviewer Dashboard tile. ReviewSummaryController already applies
        //      the "pending, unactioned flag" rule (Flag__c blank) that the
        //      Reviewer Dashboard's FLAGGED tile uses.
        Map<String, Integer> reviewSummary = ReviewSummaryController.getReviewSummary();
        result.flagged = reviewSummary.containsKey('flagged')
            ? reviewSummary.get('flagged') : 0;
        result.review  = reviewSummary.containsKey('total')
            ? reviewSummary.get('total') : 0;   // = Reviewer Dashboard's "Total Assigned"

        // ── 4. Approval / Approved ─────────────────────────────────────────
        // TODO: Replace once we have the Approver Dashboard's own summary
        // controller (the source of Pending Decisions=7 / Recommended=15 /
        // Approved=2 / Declined=3). getApproverQueueCount() is the closest
        // thing available today but is NOT confirmed to equal "Pending
        // Decisions" — it doesn't exclude apps that already have a decision.
        WCFApproverListController.ApproverSummary approverSummary = WCFApproverListController.getApproverSummary();
result.approval = approverSummary.pending;   // matches "15 Pending Decisions"
result.approved = approverSummary.approved;  // matches "2 Approved"

        return result;
    }
}   */




/*  commented for adding recordtypes 

public without sharing class wcfHomeDashboardController {

    public class PipelineCounts {
        @AuraEnabled public Integer submitted { get; set; }
        @AuraEnabled public Integer validation { get; set; }
        @AuraEnabled public Integer flagged { get; set; }
        @AuraEnabled public Integer review { get; set; }
        @AuraEnabled public Integer approval { get; set; }
        @AuraEnabled public Integer approved { get; set; }

        public PipelineCounts() {
            submitted = 0;
            validation = 0;
            flagged = 0;
            review = 0;
            approval = 0;
            approved = 0;
        }
    }

    @AuraEnabled(cacheable=true)
    public static PipelineCounts getPipelineCounts() {

        PipelineCounts result = new PipelineCounts();

        // Submitted
        result.submitted = [
            SELECT COUNT()
            FROM IndividualApplication
            WHERE Status = 'Submitted'
            WITH SYSTEM_MODE
        ];

        // Validated
        result.validation = [
            SELECT COUNT()
            FROM ApplicationReview
            WHERE Status = 'Validated'
            AND RecordType.Name = 'WCF Validator'
            WITH SYSTEM_MODE
        ];

        // Flagged
        result.flagged = [
            SELECT COUNT()
            FROM ApplicationReview
            WHERE Status = 'Flagged'
            AND RecordType.Name = 'WCF Validator'
            WITH SYSTEM_MODE
        ];

        // Review
        result.review = [
            SELECT COUNT()
            FROM ApplicationReview
            WHERE Status = 'Review Submitted'
            AND RecordType.Name IN (
                'WCF Job Fulfillment',
                'WCF Job Creation Review',
                'WCF Job Fulfillment & Job Creation'
            )
            WITH SYSTEM_MODE
        ];

        // Approval
       result.approved = [
    SELECT COUNT()
    FROM ApplicationDecision
    WHERE ApplicationDecision = 'Approve'
    AND RecordType.Name = 'WF Approver'
    WITH SYSTEM_MODE
];

// Approval tile is no longer used
result.approval = 0;

        return result;
    }
}    */


public without sharing class wcfHomeDashboardController {

    public class PipelineCounts {
        @AuraEnabled public Integer submitted { get; set; }
        @AuraEnabled public Integer validation { get; set; }
        @AuraEnabled public Integer flagged { get; set; }
        @AuraEnabled public Integer review { get; set; }
        @AuraEnabled public Integer approval { get; set; }
        @AuraEnabled public Integer approved { get; set; }

        public PipelineCounts() {
            submitted = 0;
            validation = 0;
            flagged = 0;
            review = 0;
            approval = 0;
            approved = 0;
        }
    }

    @AuraEnabled(cacheable=true)
    public static PipelineCounts getPipelineCounts() {

        PipelineCounts result = new PipelineCounts();

        // Resolve RecordTypeIds once
        Set<Id> applicationRTIds = RecordTypeHelper.individualApplicationAllowedIds();
        Set<Id> reviewRTIds = RecordTypeHelper.applicationReviewAllowedIds();
        Set<Id> reviewerRTIds = RecordTypeHelper.applicationReviewReviewerAllowedIds();
        Set<Id> decisionRTIds = RecordTypeHelper.applicationDecisionAllowedIds();

        // Submitted
        result.submitted = [
            SELECT COUNT()
            FROM IndividualApplication
            WHERE Status = 'Submitted'
            AND RecordTypeId IN :applicationRTIds
            WITH SYSTEM_MODE
        ];

        // Validated
       Map<String, Integer> validatorCounts = WCFValidatorController.getActionCounts();
        result.validation = validatorCounts.containsKey('validated')
            ? validatorCounts.get('validated') : 0;

// Flagged & Reviewed — same source the Reviewer Queue counts from,
// so the Home strip and the queue can't drift apart.
Map<String, Integer> queue = WCFProposalListController.getQueueSummary();
result.flagged = queue.get('flagged');
result.review  = queue.get('reviewed');

        // Approved
        result.approved = [
            SELECT COUNT()
            FROM ApplicationDecision
            WHERE ApplicationDecision = 'Approve'
            AND RecordTypeId IN :decisionRTIds
            WITH SYSTEM_MODE
        ];

        // Approval tile not used
        result.approval = 0;

        return result;
    }
}