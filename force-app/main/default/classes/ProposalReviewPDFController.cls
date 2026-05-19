public with sharing class ProposalReviewPDFController {
    public ApplicationReview review { get; set; }
    public String recordTypeName { get; set; }

    public ProposalReviewPDFController(ApexPages.StandardController controller) {
        Id recordId = controller.getId();

        review = [
            SELECT Id,
                   Name,
                   Title,
                   Focus_Area__c,
                   Sub_Focus_Area__c,
                   Technology_Readiness_Level__c,
                   Milestones__c,
                   Budgets__c,
                   Project_proposal__c,
                   Prior_Research_Funding_raised__c,
                   Does_the_Focus_and_Sub_Focus_area_fall_w__c,
                   Project_s_TRL_with_a_brief_justification__c,
                   Reviewer__c,
                   ReviewedById,
                   ReviewedBy.Name,
                   Status,
                   SubmissionDate,
                   Comment,
                   Innovation_Novelty__c,
                   Rationale_for_Scoring__c,
                   Commercial_Viability__c,
                   Commercial_viability_Rationale__c,
                   Market_Potential__c,
                   Market_Potential_Rationale__c,
                   Social_Impact__c,
                   Social_Impact_Rationale__c,
                   External_Funding_Potential__c,
                   External_Funding_Potential_Rationale__c,
                   Team_Strength_and_Expertise__c,
                   Team_Strength_and_Expertise_Rationale__c,
                   Milestone_Planning__c,
                   Milestone_Planning_Justification__c,
                   Milestone_Planning_Justification_NWP__c,
                   Budget_Requisite__c,
                   Budget_Requisite_Justification__c,
                   Budget_Requisite_Justification_UB__c,
                   Total_Score__c,
                   Final_recommendation_ExternalReviewer__c,
                   Final_recommendation_Not_recommended__c,
                   Final_recommendation__c,
                   ForWINTeam__c,
                   CommunicateToPI__c,
                   Institution_Name__c,
                   Institution_Name__r.Name,
                   PI_NAME__c,
                   Co_Principal_Investigators_PI__c,
                   RecordTypeId,
                   RecordType.DeveloperName
            FROM ApplicationReview
            WHERE Id = :recordId
        ];

        try {
            recordTypeName = review.RecordType.DeveloperName;
        } catch (Exception e) {
            recordTypeName = '';
        }

        if (String.isBlank(recordTypeName) && review.RecordTypeId != null) {
            List<RecordType> rtList = [
                SELECT DeveloperName
                FROM RecordType
                WHERE Id = :review.RecordTypeId
                LIMIT 1
            ];
            if (!rtList.isEmpty()) {
                recordTypeName = rtList[0].DeveloperName;
            }
        }

        if (String.isBlank(recordTypeName)) {
            recordTypeName = 'Project_Proposal_Review';
        }
    }
}