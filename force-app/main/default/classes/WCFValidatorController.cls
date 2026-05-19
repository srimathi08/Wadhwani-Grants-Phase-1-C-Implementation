public with sharing class WCFValidatorController {

    // ─────────────────────────────────────────────────────────────
    // 1. LIST VIEW
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static List<IndividualApplication> getApplicationList() {
        return [
            SELECT
                Id,
                Name,
                AccountId,
                Account.Name,
                Status,
                AppliedDate,
                Funding_Year__c,
                Category,
                ApplicationType
            FROM IndividualApplication
            ORDER BY AppliedDate DESC NULLS LAST
            LIMIT 500
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // 2. FORM PREVIEW
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static IndividualApplication getApplicationDetail(Id recordId) {
        return [
            SELECT
                Id,
                Name,
                AccountId,
                Account.Name,
                Status,
                AppliedDate,
                Funding_Year__c,
                Category,
                ApplicationType,
                Review_Status__c,
                COE_Name__c,
                PI_Name__c,

                /* General Information */
                Project_Title__c,
                Primary_Focus_Area__c,
                Sub_Focus_Area__c,
                Project_Duration__c,
                Keywords__c,
                Average_score__c,
                Coe_Email_Address__c,
                PI_Comments__c,
                COE_Comments__c,
                WIN_Approval_Comments__c,
                WIN_Approved_Comments__c,
                Resubmitted_Approved_for_Funding__c,
                Funding_Approval_Resubmission__c,
                Approved_by_COE_on__c,
                Rejected_by_COE_on__c,
                Asked_for_Resubmission_by_COE_on__c,
                Due_Date_for_Resubmission__c,
                Application_Asked_for_Rsubmission__c,
                Application_Resubmitted_to_COE__c,
                Asked_for_Resubmission_by_WIN_Admin__c,
                Application_Resubmitted_to_WIN_Admin__c,
                Due_Date_for_Resubmission_WIN__c,
                COE_Location__c,
                Primary_Focus_Area_Other__c,
                Sub_Focus_Area_Other__c,
                Total_Project_Budget_INR__c,
                Target_Completion_Month_c__c,
                PI_Institution_Organization_Name__c,
                Requested_Support_Documents_Portal_c__c,
                Skilling_Approach__c,

                /* PI & Co-PI */
                PI_Designation__c,
                PI_Institution__c,
                PI_Phone__c,
                PI_Email__c,
                Co_Principal_Investigator_Co_PI__c,
                CO_PI_Designation__c,
                CO_PI_Institution__c,
                CO_PI_Phone__c,
                CO_PI_Email__c,

                /* Project Details */
                Project_Summary__c,
                Objectives_of_the_Project__c,
                Project_Approach_and_Work_Plan__c,
                Key_Problem_Being_Solved__c,
                Proposed_Solution__c,
                Current_status_of_the_Project_Work_und__c,
                Current_Technology_Readiness_Level_TRL__c,
                Expected_TRL_at_the_end_of_the_Project__c,
                Novelty_of_the_Project__c,
                Competitive_Advantage__c,
                Details_of_IPR_Filed_Granted__c,
                Details_of_Ethical_Received__c,
                Full_Proposal_Citations__c,
                Target_Market_Industry_Application__c,
                Customer_and_Beneficiaries__c,
                Business_Model_for_Commercialization__c,
                Main_Risks_and_Barriers__c,
                Relevant_Partnerships__c,
                Potential_for_Startup_Formation__c,
                Incubator_Association_Details__c,
                Total_Project_Budget_in_USD__c,
                Assigned_reviewers__c,
                Describe_Objective_Relevance_of_Project__c,
                Work_undertaken_supporting_current_TRL__c,
                Strategy_for_transfer_of_technology__c,
                Strategy_for_raising_funds_from_Investor__c,

                /* Funding & Resources */
                Additional_Funding_Plans__c,
                WIN_Support__c,
                Project_Start_Date__c,
                Project_End_Date__c,

                /* Expected Outcomes */
                Proposed_Outcomes_Deliverables_under_t__c,
                Envisioned_Project_Impact__c,
                Future_Plan_for_next_3_5_on_comple__c,

                /* Approval */
                COE_Approver__c,
                COE_Approval_Comments__c,
                PI_User_Email__c,

                /* Funder Details */
                Funder_1_Name__c,
                Funder_1_Amount__c,
                Funder_1_Period_Start__c,
                Funder_1_Period_End__c,
                Funder_1_Type__c,
                Funder_2_Name__c,
                Funder_2_Amount__c,
                Funder_2_Period_Start__c,
                Funder_2_Period_End__c,
                Funder_2_Type__c,
                Funder_3_Name__c,
                Funder_3_Amount__c,
                Funder_3_Period_Start__c,
                Funder_3_Period_End__c,
                Funder_3_Type__c

            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CHECK EXISTING REVIEW
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=false)
    public static ApplicationReview getExistingReview(Id applicationId) {
        List<ApplicationReview> reviews = [
            SELECT
                Id,
                ApplicationId,
                Status,
                /* Section 1 - Completeness Check */
                Verification_reports__c,
                Mandatory_fields__c,
                Attestation__c,
                Substantive_content_gap__c,
                /* Section 2 - First-pass Eligibility */
                Geography_Within_WCF_Operating_Cluster__c,
                Mandate_fitFits_Job_CreationFulfilment__c,
                Does_the_Focus_and_Sub_Focus_area_fall_w__c,
                Field_level_checklist_for_the_Partner__c,
                /* Section 3 - Decision */
                Decision_Final_Decision_from_Sec_1_2__c,
                Decision_rationale__c,
                Flag_rationale_Flagging_Criteria__c,
                Other_describe_the_concern__c,
                Eligibility_Check__c,
                /* Section 4 - Application Tags */
                Source_Channel_Source_of_Application__c,
                Budget_Range_Annual_Budget_Range__c,
                /* Section 5 - Notes */
                Notes_for_Reviewers__c
            FROM ApplicationReview
            WHERE ApplicationId = :applicationId
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];
        return reviews.isEmpty() ? null : reviews[0];
    }

    // ─────────────────────────────────────────────────────────────
    // 4. SAVE / SEAL
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled
    public static String saveValidatorRecord(String reviewJson) {
        try {
            Map<String, Object> data = (Map<String, Object>) JSON.deserializeUntyped(reviewJson);

            ApplicationReview review = new ApplicationReview();

            if (data.containsKey('Id') && data.get('Id') != null) {
                review.Id = (Id) data.get('Id');
            }

            review.ApplicationId                              = (Id)     data.get('applicationId');
            review.Status                                     = (String) data.get('status');

            // Section 1 - Completeness Check
            review.Verification_reports__c                   = (String) data.get('s1_1_confirm');
            review.Mandatory_fields__c                       = (String) data.get('s1_2_confirm');
            review.Attestation__c                            = (String) data.get('s1_3_confirm');
            review.Substantive_content_gap__c                = (String) data.get('s1_4_text');

            // Section 2 - First-pass Eligibility
            review.Geography_Within_WCF_Operating_Cluster__c = (String) data.get('s2_1');
            review.Mandate_fitFits_Job_CreationFulfilment__c  = (String) data.get('s2_2');
            review.Does_the_Focus_and_Sub_Focus_area_fall_w__c = (String) data.get('s2_3');
            review.Field_level_checklist_for_the_Partner__c  = (String) data.get('s2_3_text');

            // Section 3 - Decision
            review.Decision_Final_Decision_from_Sec_1_2__c   = (String) data.get('s3_1');
            review.Decision_rationale__c                     = (String) data.get('s3_2');
            review.Flag_rationale_Flagging_Criteria__c       = (String) data.get('s3_3');
            review.Other_describe_the_concern__c             = (String) data.get('s3_4');
            review.Eligibility_Check__c                      = (String) data.get('s3_5');

            // Section 4 - Application Tags
            review.Source_Channel_Source_of_Application__c   = (String) data.get('s4_1');
            review.Budget_Range_Annual_Budget_Range__c       = (String) data.get('s4_2');

            // Section 5 - Notes
            review.Notes_for_Reviewers__c                    = (String) data.get('s5_1');

            upsert review;
            return review.Id;

        } catch (Exception e) {
            throw new AuraHandledException('Save failed: ' + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 5. GET OBJECT FIELDS DYNAMICALLY
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static List<FieldInfo> getApplicationFields() {
        List<FieldInfo> fields = new List<FieldInfo>();
        Schema.DescribeSObjectResult objDesc =
            Schema.getGlobalDescribe().get('IndividualApplication').getDescribe();
        Map<String, Schema.SObjectField> fieldMap = objDesc.fields.getMap();

        for (String apiName : fieldMap.keySet()) {
            Schema.DescribeFieldResult f = fieldMap.get(apiName).getDescribe();
            if (!f.isAccessible()) continue;

            FieldInfo fi = new FieldInfo();
            fi.apiName   = apiName;
            fi.label     = f.getLabel();
            fi.fieldType = String.valueOf(f.getType());
            fi.section   = deriveSection(apiName);
            fields.add(fi);
        }
        return fields;
    }

    private static String deriveSection(String apiName) {
        String n = apiName.toLowerCase();
        if (n.startsWith('pi_') || n.startsWith('co_pi') || n.contains('coe_name')
            || n.contains('coe_email') || n.contains('coe_location'))
            return 'PI & Co-PI Details';
        if (n.contains('project_') || n.contains('objective') || n.contains('summary')
            || n.contains('approach') || n.contains('solution') || n.contains('novelty')
            || n.contains('trl') || n.contains('skilling') || n.contains('customer')
            || n.contains('competitive') || n.contains('market') || n.contains('risk')
            || n.contains('startup') || n.contains('incubator') || n.contains('ipr')
            || n.contains('ethical') || n.contains('citation') || n.contains('partnership'))
            return 'Project Details';
        if (n.contains('funder') || n.contains('budget') || n.contains('funding')
            || n.contains('start_date') || n.contains('end_date') || n.contains('win_support'))
            return 'Funding & Resources';
        if (n.contains('deliverable') || n.contains('impact') || n.contains('future_plan')
            || n.contains('proposed_outcomes') || n.contains('envisioned'))
            return 'Expected Outcomes';
        if (n.contains('approver') || n.contains('approval') || n.contains('approved')
            || n.contains('rejected') || n.contains('resubmit') || n.contains('coe_approval'))
            return 'Approval Section';
        return 'General Information';
    }

    public class FieldInfo {
        @AuraEnabled public String apiName;
        @AuraEnabled public String label;
        @AuraEnabled public String fieldType;
        @AuraEnabled public String section;
    }
}