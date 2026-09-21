public with sharing class ProposalReviewExportController {

    @AuraEnabled(cacheable=false)
    public static String getCsvExport(Id recordId) {
        ApplicationReview review = [
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
                   If_yes_how_much_in_USD__c,
                   Does_the_Focus_and_Sub_Focus_area_fall_w__c,
                   Project_s_TRL_with_a_brief_justification__c,
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
                   Milestone_Planning_Remarks__c,
                   Milestone_Planning_Justification__c,
                   Milestone_Planning_Justification_NWP__c,
                   Budget_Requisite__c,
                   Budget_Adequacy_Remarks__c,
                   Budget_Requisite_Justification__c,
                   Budget_Requisite_Justification_UB__c,
                   Total_Score__c,
                   Final_recommendation_ExternalReviewer__c,
                   Final_recommendation_Not_recommended__c,
                   Final_recommendation__c,
                   ForWINTeam__c,
                   CommunicateToPI__c,
                   Institution_Name__r.Name,
                   PI_NAME__c,
                   Co_Principal_Investigators_PI__c,
                   RecordType.DeveloperName
            FROM ApplicationReview
            WHERE Id = :recordId
        ];

        String recordTypeName = review.RecordType != null ? review.RecordType.DeveloperName : '';

        List<String> rows = new List<String>();

        // Header row
        rows.add(csvRow(new List<String>{ 'Field', 'Value' }));

        // Common fields
        rows.add(csvRow(new List<String>{ 'Institution Name', review.Institution_Name__r != null ? review.Institution_Name__r.Name : '' }));
        rows.add(csvRow(new List<String>{ 'Project Title', review.Title }));
        rows.add(csvRow(new List<String>{ 'Principal Investigator', review.PI_NAME__c }));
        rows.add(csvRow(new List<String>{ 'Co-Principal Investigator', review.Co_Principal_Investigators_PI__c }));
        rows.add(csvRow(new List<String>{ 'Focus Area', review.Focus_Area__c }));
        rows.add(csvRow(new List<String>{ 'Sub Focus Area', review.Sub_Focus_Area__c }));
        rows.add(csvRow(new List<String>{ 'Reviewed By', review.ReviewedBy != null ? review.ReviewedBy.Name : '' }));
        rows.add(csvRow(new List<String>{ 'Submission Date', review.SubmissionDate != null ? String.valueOf(review.SubmissionDate) : '' }));
        rows.add(csvRow(new List<String>{ 'Status', review.Status }));
        rows.add(csvRow(new List<String>{ 'Comment', review.Comment }));

        if (recordTypeName == 'Project_Proposal_Review') {
            // Reviewer form fields
            rows.add(csvRow(new List<String>{ 'Innovation/Novelty Score', numToStr(review.Innovation_Novelty__c) }));
            rows.add(csvRow(new List<String>{ 'Innovation/Novelty Rationale', review.Rationale_for_Scoring__c }));
            rows.add(csvRow(new List<String>{ 'Commercial Viability Score', numToStr(review.Commercial_Viability__c) }));
            rows.add(csvRow(new List<String>{ 'Commercial Viability Rationale', review.Commercial_viability_Rationale__c }));
            rows.add(csvRow(new List<String>{ 'Market Potential Score', numToStr(review.Market_Potential__c) }));
            rows.add(csvRow(new List<String>{ 'Market Potential Rationale', review.Market_Potential_Rationale__c }));
            rows.add(csvRow(new List<String>{ 'Social Impact Score', numToStr(review.Social_Impact__c) }));
            rows.add(csvRow(new List<String>{ 'Social Impact Rationale', review.Social_Impact_Rationale__c }));
            rows.add(csvRow(new List<String>{ 'External Funding Potential Score', numToStr(review.External_Funding_Potential__c) }));
            rows.add(csvRow(new List<String>{ 'External Funding Potential Rationale', review.External_Funding_Potential_Rationale__c }));
            rows.add(csvRow(new List<String>{ 'Team Strength & Expertise Score', numToStr(review.Team_Strength_and_Expertise__c) }));
            rows.add(csvRow(new List<String>{ 'Team Strength & Expertise Rationale', review.Team_Strength_and_Expertise_Rationale__c }));
            rows.add(csvRow(new List<String>{ 'Milestone Planning', review.Milestone_Planning__c }));
            rows.add(csvRow(new List<String>{ 'Milestone Planning Remarks', review.Milestone_Planning_Remarks__c }));
            rows.add(csvRow(new List<String>{ 'Milestone Planning Justification', review.Milestone_Planning_Justification__c }));
            rows.add(csvRow(new List<String>{ 'Milestone Planning Justification (NWP)', review.Milestone_Planning_Justification_NWP__c }));
            rows.add(csvRow(new List<String>{ 'Budget Adequacy', review.Budget_Requisite__c }));
            rows.add(csvRow(new List<String>{ 'Budget Adequacy Remarks', review.Budget_Adequacy_Remarks__c }));
            rows.add(csvRow(new List<String>{ 'Budget Requisite Justification', review.Budget_Requisite_Justification__c }));
            rows.add(csvRow(new List<String>{ 'Budget Requisite Justification (UB)', review.Budget_Requisite_Justification_UB__c }));
            rows.add(csvRow(new List<String>{ 'Total Score', numToStr(review.Total_Score__c) }));
            rows.add(csvRow(new List<String>{ 'Funding Recommendation', review.Final_recommendation_ExternalReviewer__c }));
            rows.add(csvRow(new List<String>{ 'Reason if Not Recommended', review.Final_recommendation_Not_recommended__c }));
            rows.add(csvRow(new List<String>{ 'Notes for WIN Team', review.ForWINTeam__c }));
            rows.add(csvRow(new List<String>{ 'Message to Communicate to PI', review.CommunicateToPI__c }));

        } else {
            // COE / CEO Admin form fields
            rows.add(csvRow(new List<String>{ 'Does Focus & Sub-Focus Fall within WIN?', review.Does_the_Focus_and_Sub_Focus_area_fall_w__c }));
            rows.add(csvRow(new List<String>{ 'Technology Readiness Level', review.Technology_Readiness_Level__c }));
            rows.add(csvRow(new List<String>{ 'Project\'s TRL Justification', review.Project_s_TRL_with_a_brief_justification__c }));
            rows.add(csvRow(new List<String>{ 'Milestones', review.Milestones__c }));
            rows.add(csvRow(new List<String>{ 'Budgets', review.Budgets__c }));
            rows.add(csvRow(new List<String>{ 'Project Proposal', review.Project_proposal__c }));
            rows.add(csvRow(new List<String>{ 'Prior Research Funding Raised', review.Prior_Research_Funding_raised__c }));
            rows.add(csvRow(new List<String>{ 'Funding Amount (INR)', numToStr(review.If_yes_how_much_in_USD__c) }));
            rows.add(csvRow(new List<String>{ 'Final Recommendation', review.Final_recommendation__c }));
        }

        String csvContent = String.join(rows, '\n');
        return EncodingUtil.base64Encode(Blob.valueOf(csvContent));
    }

    // Wraps a field value in quotes and escapes internal quotes, joins with commas
    private static String csvRow(List<String> fields) {
        List<String> escaped = new List<String>();
        for (String f : fields) {
            String val = f == null ? '' : f;
            val = val.replace('"', '""');
            escaped.add('"' + val + '"');
        }
        return String.join(escaped, ',');
    }

    private static String numToStr(Decimal d) {
        return d == null ? '' : String.valueOf(d);
    }

    // Overload for score fields that are actually picklists (String) rather than numbers
    private static String numToStr(String s) {
        return s == null ? '' : s;
    }
}