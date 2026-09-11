import { LightningElement, wire, track, api } from 'lwc';
import upsertAIFeedback from '@salesforce/apex/WCFFormController.upsertAIFeedback';
import getAIFeedbackRecord from '@salesforce/apex/WCFFormController.getAIFeedbackRecord';
import getPicklistValuesForField from '@salesforce/apex/WCFFormController.getPicklistValuesForField';
import saveWCFDraftApplication from '@salesforce/apex/WCFFormController.saveWCFDraftApplication';
import submitWCFApplication from '@salesforce/apex/WCFFormController.submitWCFApplication';
import getDraftWCFApplication from '@salesforce/apex/WCFFormController.getDraftWCFApplication';
import searchHQLocation from '@salesforce/apex/OpenStreetMapService.searchLocation';
import getActiveFundingOpportunityId from '@salesforce/apex/WCFFormController.getActiveFundingOpportunityId';
import setFileCellKey from '@salesforce/apex/WCFFormController.setFileCellKey';
import deleteUploadedFile from '@salesforce/apex/WCFFormController.deleteUploadedFile';
import CL_Learner_Enrollment_help_text from '@salesforce/label/c.CL_Learner_Enrollment_help_text';
import CL_Technical_Assistance_Tooltip from '@salesforce/label/c.CL_Technical_Assistance_Tooltip';
import getApplicationAttachments from '@salesforce/apex/WCFFormController.getApplicationAttachments';
//new labels
import CL_Your_Latest_Changes from '@salesforce/label/c.CL_Your_Latest_Changes';
import CL_draft_save from '@salesforce/label/c.CL_draft_save';
import CL_Please_Save from '@salesforce/label/c.CL_Please_Save';
import CL_Tell_us_about_your_work_in_both_skilling_Job_Fulfilment_and_entrepreneurshi
    from '@salesforce/label/c.CL_Tell_us_about_your_work_in_both_skilling_Job_Fulfilment_and_entrepreneurshi';
import CL_Tell_us_about_your_job_creation_work
    from '@salesforce/label/c.CL_Tell_us_about_your_job_creation_work';
// IMPORTS
import CL_Yes_interested from '@salesforce/label/c.CL_Yes_interested';
import CL_Maybe_want_to_learn_more from '@salesforce/label/c.CL_Maybe_want_to_learn_more';
import CL_Not_at_this_time from '@salesforce/label/c.CL_Not_at_this_time';
// IMPORTS
import CL_Display_Box1 from '@salesforce/label/c.CL_Display_Box1';
import CL_Display_Box2 from '@salesforce/label/c.CL_Display_Box2';
import CL_Agriculture from '@salesforce/label/c.CL_Agriculture';
import CL_Technology from '@salesforce/label/c.CL_Technology';
import CL_Retail from '@salesforce/label/c.CL_Retail';
import CL_Services from '@salesforce/label/c.CL_Services';
import CL_Manufacturing from '@salesforce/label/c.CL_Manufacturing';

import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';

// MISSING in resumeDraftWcfForm:
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import flagTelpicker from '@salesforce/resourceUrl/flagTelpicker';
import JSPDF from '@salesforce/resourceUrl/downloadjs';
import AUTO_TABLE from '@salesforce/resourceUrl/autotable';

// Custom Labels
import CL_WCF_Form_Title from '@salesforce/label/c.CL_WCF_Form_Title';
import WCF_Paragraph_1 from '@salesforce/label/c.WCF_Paragraph_1';
import WCF_Paragraph_2 from '@salesforce/label/c.WCF_Paragraph_2';
import WCF_Paragraph_3 from '@salesforce/label/c.WCF_Paragraph_3';
import CL_Organizational_Area_s_for_Funding_Investment from '@salesforce/label/c.CL_Organizational_Area_s_for_Funding_Investment';
// IMPORTS
import CL_Mentorship1 from '@salesforce/label/c.CL_Mentorship1';
import CL_Business_Advisory1 from '@salesforce/label/c.CL_Business_Advisory1';
import CL_Market_Linkages1 from '@salesforce/label/c.CL_Market_Linkages1';
import CL_Sector_TA1 from '@salesforce/label/c.CL_Sector_TA1';


import CLS_Organizational_Identifying from '@salesforce/label/c.CLS_Organizational_Identifying';
import CLS_Submitter_Contact_Info from '@salesforce/label/c.CLS_Submitter_Contact_Info';
import CL_Organizational_Name from '@salesforce/label/c.CL_Organizational_Name';
import CL_Headquarters_City_and_Country from '@salesforce/label/c.CL_Headquarters_City_and_Country';
import CL_Primary_Service_Regions from '@salesforce/label/c.CL_Primary_Service_Regions';
import CL_Leader_Name from '@salesforce/label/c.CL_Leader_Name';
import CL_Leader_Title from '@salesforce/label/c.CL_Leader_Title';
import CL_Submitter_Name from '@salesforce/label/c.CL_Submitter_Name';
import CL_Title from '@salesforce/label/c.CL_Title';
import CL_Email_Address from '@salesforce/label/c.CL_Email_Address';
import CL_Phone_number from '@salesforce/label/c.CL_Phone_number';
import CL_Legal_Question from '@salesforce/label/c.CL_Legal_Question';
import CL_Legal_Structure from '@salesforce/label/c.CL_Legal_Structure';

import CLH_Financial_Data from '@salesforce/label/c.CLH_Financial_Data';
import CLH_Historical_Data from '@salesforce/label/c.CLH_Historical_Data';
import CLH_Job_Creation_Questions from '@salesforce/label/c.CLH_Job_Creation_Questions';
import CLH_Job_Fulfilment_Questions from '@salesforce/label/c.CLH_Job_Fulfilment_Questions';
import CLH_Outcome_Data from '@salesforce/label/c.CLH_Outcome_Data';
import CLH_Current_Fiscal_Year_Data from '@salesforce/label/c.CLH_Current_Fiscal_Year_Data';
import CL_Current_Fiscal_Year_End_Date from '@salesforce/label/c.CL_Current_Fiscal_Year_End_Date';
import CL_Prior_Fiscal_Year from '@salesforce/label/c.CL_Prior_Fiscal_Year';
import CL_Two_Years_Prior from '@salesforce/label/c.CL_Two_Years_Prior';
import CL_Three_Years_Prior from '@salesforce/label/c.CL_Three_Years_Prior';
import CL_Balance_At_Start_of_the_Year from '@salesforce/label/c.CL_Balance_At_Start_of_the_Year';
import CL_Revenue from '@salesforce/label/c.CL_Revenue';
import CL_Expense from '@salesforce/label/c.CL_Expense';
import CL_Balance_At_End_of_the_Year from '@salesforce/label/c.CL_Balance_At_End_of_the_Year';
import CL_Budget from '@salesforce/label/c.CL_Budget';
import CL_Current_Projection from '@salesforce/label/c.CL_Current_Projection';
import CL_Variance from '@salesforce/label/c.CL_Variance';
import CL_Explanation from '@salesforce/label/c.CL_Explanation';
import CL_Revenue_Expense from '@salesforce/label/c.CL_Revenue_Expense';
import CL_Organizational_Sustainability from '@salesforce/label/c.CL_Organizational_Sustainability';
import CL_Organizational_Sustainability_Question from '@salesforce/label/c.CL_Organizational_Sustainability_Question';

import CL_Current_Fiscal_Year from '@salesforce/label/c.CL_Current_Fiscal_Year';
import CL_List_of_Organization_Skilling_Domain from '@salesforce/label/c.CL_List_of_Organization_Skilling_Domain';
import CL_Learner_Enrollment from '@salesforce/label/c.CL_Learner_Enrollment';
import CL_Learner_Placements from '@salesforce/label/c.CL_Learner_Placements';
import CL_Learner_Placement_Percentage from '@salesforce/label/c.CL_Learner_Placement_Percentage';
import CL_Placement_Provided from '@salesforce/label/c.CL_Placement_Provided';
import CL_Projected_Cost_Per_Placement from '@salesforce/label/c.CL_Projected_Cost_Per_Placement';
import CL_Placement_Verification from '@salesforce/label/c.CL_Placement_Verification';
import CL_Long_term_Outcomes_Research from '@salesforce/label/c.CL_Long_term_Outcomes_Research';
import CL_Yes_No from '@salesforce/label/c.CL_Yes_No';
import CL_Describe_Briefly from '@salesforce/label/c.CL_Describe_Briefly';
import CL_File_Attachments from '@salesforce/label/c.CL_File_Attachments';
import CL_Desired_Use_of_Additional_Funding_Investment from '@salesforce/label/c.CL_Desired_Use_of_Additional_Funding_Investment';
import CL_Additonal_Funding_Job_Question from '@salesforce/label/c.CL_Additonal_Funding_Job_Question';
import CL_Additional_Funding_Question from '@salesforce/label/c.CL_Additional_Funding_Question';
import CL_Operational_Synergies from '@salesforce/label/c.CL_Operational_Synergies';
import CL_Operational_Synergies_Question from '@salesforce/label/c.CL_Operational_Synergies_Question';
import CL_Operational_Synergies_Job_Question from '@salesforce/label/c.CL_Operational_Synergies_Job_Question';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import CL_List_of_projected_target_business from '@salesforce/label/c.CL_List_of_projected_target_business';
import CL_Projected_Total_New_Businesses from '@salesforce/label/c.CL_Projected_Total_New_Businesses';
import CL_Projected_Total_Jobs from '@salesforce/label/c.CL_Projected_Total_Jobs';
import CL_Estimated_Jobs_Provide from '@salesforce/label/c.CL_Estimated_Jobs_Provide';
import CL_Projected_Existing_Businesses from '@salesforce/label/c.CL_Projected_Existing_Businesses';
import CL_Total_Jobs_Created from '@salesforce/label/c.CL_Total_Jobs_Created';
import CL_Estimated_Percentage_Total from '@salesforce/label/c.CL_Estimated_Percentage_Total';
import CL_Total_Projected_Average_Cost from '@salesforce/label/c.CL_Total_Projected_Average_Cost';
import CL_Job_Creation_Verification from '@salesforce/label/c.CL_Job_Creation_Verification';
import CL_Operational_Synergies_Question_Both from '@salesforce/label/c.CL_Operational_Synergies_Question_Both';
import CL_Click_To_Add_Explanation from '@salesforce/label/c.CL_Click_To_Add_Explanation';
import CL_Number_of_years_your_current_named_leader_has_held_their_role_Round_to_the_n from '@salesforce/label/c.CL_Number_of_years_your_current_named_leader_has_held_their_role_Round_to_the_n';

import CL_Next from '@salesforce/label/c.CL_Next';
import CL_Previous from '@salesforce/label/c.CL_Previous';
import CL_Save_Draft from '@salesforce/label/c.CL_Save_Draft';
import CL_Submit from '@salesforce/label/c.CL_Submit';
import CLH_AI_Feedback from '@salesforce/label/c.CLH_AI_Feedback';
import CLH_Preview from '@salesforce/label/c.CLH_Preview';
import CL_Close from '@salesforce/label/c.CL_Close';
import CL_Explanation_Note from '@salesforce/label/c.CL_Explanation_Note';
import CL_Attestation_Label from '@salesforce/label/c.CL_Attestation_Label';
import CL_File_Required_Message from '@salesforce/label/c.CL_File_Required_Message';
import setLanguage from '@salesforce/apex/WCFFormController.setLanguage';
// ADD THESE to wcfForm.js — after your existing import lines
import label_whatYouLlNeed from '@salesforce/label/c.CL_What_you_ll_need';
import label_legalRegDetails from '@salesforce/label/c.CL_Your_organization_s_legal_registration_details';
import label_3yrFinancials from '@salesforce/label/c.CL_3_years_of_historical_financials_revenue_and_expense';
import label_3yrOutcomes from '@salesforce/label/c.CL_3_years_of_programme_outcome_numbers_enrolment_placement_jobs';
import label_verificationReports from '@salesforce/label/c.CL_Verification_reports_if_you_have_them_PDF_optional';
import label_referenceContacts from '@salesforce/label/c.CL_1_2_reference_contacts_optional';
import label_sectionsInForm from '@salesforce/label/c.CL_Sections_in_this_form';
import label_aboutOrgWhoYouAre from '@salesforce/label/c.CL_About_Your_Organisation_who_you_are';
import label_whatYouDo from '@salesforce/label/c.CL_What_You_Do_your_programmes_and_approach';
import label_whatYouDelivered from '@salesforce/label/c.CL_What_You_ve_Delivered_financials_and_outcomes';
import label_whyWCF from '@salesforce/label/c.CL_Why_Wadhwani_Charitable_Foundation_your_direction';
import label_reviewSubmit from '@salesforce/label/c.CL_Review_Submit_final_attestation';
import label_quickTips from '@salesforce/label/c.CL_Quick_tips';
import label_amountsUSD from '@salesforce/label/c.CL_All_amounts_in_US_dollars_rounded_to_nearest_million_is_fine';
import label_requiredAsterisk from '@salesforce/label/c.CL_Required_fields_are_marked_with_a_red_asterisk';
import label_optionalLavender from '@salesforce/label/c.CL_Optional_fields_show_a_lavender_tint_with_an_Optional_label';
import label_aiFeedbackTip from '@salesforce/label/c.CL_Use_the_AI_Feedback_button_under_long_text_answers';
import label_switchLanguages from '@salesforce/label/c.CL_You_can_switch_between_English_Spanish_and_Portuguese_anytime';
import label_needHelp from '@salesforce/label/c.CL_Need_help';
import label_helpEmail from '@salesforce/label/c.CL_Email_grants_portal_wadhwani_charitable_org';
import label_responseTime from '@salesforce/label/c.CL_Response_time_Within_2_business_days';
import label_helpLanguages from '@salesforce/label/c.CL_Languages_English_Spanish_Portuguese';
import label_aboutYourOrg from '@salesforce/label/c.CL_About_Your_Organisation';
import label_orgSectionDesc from '@salesforce/label/c.CL_Tell_us_who_you_are_We_use_this_section_to_understand_your_organisation_s_st';
import label_selectOrgFocus from '@salesforce/label/c.CL_Select_the_option_that_best_describes_your_organisation_focus';
import label_bothPathways from '@salesforce/label/c.CL_Operating_across_both_skilling_and_entrepreneurship';
import label_fewDetails from '@salesforce/label/c.CL_A_few_details_so_we_know_who_we_re_talking_to';
import label_submitterDesc from '@salesforce/label/c.CL_Who_is_filling_out_this_form_You_ll_be_the_initial_point_of_contact_for_your';
import label_legalStructureDesc from '@salesforce/label/c.CL_Tell_us_how_your_organisation_is_legally_constituted_and_where_it_s_registere';
import label_type from '@salesforce/label/c.CL_Type';
import label_registrationJurisdiction from '@salesforce/label/c.CL_Registration_Jurisdiction';
import label_incorporationDate from '@salesforce/label/c.CL_Incorporation_Date';
import label_briefDescription from '@salesforce/label/c.CL_Brief_Description';
import label_briefDescHelper from '@salesforce/label/c.CL_Briefly_describe_your_governance_and_operational_structure_board_leadershi';
import label_fiscalYearEnd from '@salesforce/label/c.CL_Fiscal_Year_End_Date';
import label_fiscalYearDesc from '@salesforce/label/c.CL_When_does_your_fiscal_year_close_This_helps_us_align_all_financial_and_outco';
import label_top3Funders from '@salesforce/label/c.CL_Top_3_Most_Prominent_Funders';
import label_top3FundersDesc from '@salesforce/label/c.CL_Optionally_share_up_to_three_of_your_most_prominent_funders_the_backers_wh';
import label_funder1 from '@salesforce/label/c.CL_FUNDER_1';
import label_funderName from '@salesforce/label/c.CL_Funder_Name';
import label_funderAmount from '@salesforce/label/c.CL_Approx_Annual_Amount_USD';
import label_fundingPeriodStart from '@salesforce/label/c.CL_Funding_Period_Start';
import label_fundingPeriodEnd from '@salesforce/label/c.CL_Funding_Period_End';
import label_fundingType from '@salesforce/label/c.CL_Funding_Type';
import label_upTo3Funders from '@salesforce/label/c.CL_You_may_add_up_to_3_funders';
import label_addFunder from '@salesforce/label/c.CL_Add_funder';
import label_funder2 from '@salesforce/label/c.CL_FUNDER_2';
import label_funder3 from '@salesforce/label/c.CL_FUNDER_3';
import label_wheredoyouoperate from '@salesforce/label/c.CL_Where_do_you_operate_List_all_states_provinces_regions';
import label_referencesForOutreach from '@salesforce/label/c.CL_References_for_Outreach';
import label_referencesDesc from '@salesforce/label/c.CL_Optionally_share_1_2_contacts_who_can_speak_to_your_organisation_s_work';
import label_referencesNote from '@salesforce/label/c.CL_These_contacts_may_be_approached_by_Wadhwani_Charitable_Foundation_during_ev';
import label_reference1 from '@salesforce/label/c.CL_REFERENCE_1';
import label_reference2 from '@salesforce/label/c.CL_REFERENCE_2';
import label_name from '@salesforce/label/c.CL_Name';
import label_emailRef from '@salesforce/label/c.CL_Email';
import label_addReference from '@salesforce/label/c.CL_Add_reference';

import label_whatYouDoSection from '@salesforce/label/c.CL_What_You_Do';
import label_skillingTheoryDesc from '@salesforce/label/c.CL_Tell_us_about_your_skilling_work_your_top_programmes_your_theory_of_change';

import label_yourSkillingApproach from '@salesforce/label/c.CL_Your_Skilling_Approach';
import label_skillingApproachDesc from '@salesforce/label/c.CL_Tell_us_about_your_skilling_work_in_roughly_500_words_If_you_run_named_progr';

import label_skillingDomainsOffered from '@salesforce/label/c.CL_Skilling_Domains_Offered';
import label_skillingDomainsDesc from '@salesforce/label/c.CL_List_the_skilling_domains_your_organisation_offers_For_each_give_us_the_typ';

import label_domain1 from '@salesforce/label/c.CL_DOMAIN_1';
import label_domainProgrammeName from '@salesforce/label/c.CL_Domain_Programme_Name';
import label_hoursOfTraining from '@salesforce/label/c.CL_Hours_of_Training';
import label_durationMonths from '@salesforce/label/c.CL_Duration_Months';
import label_whenProgrammeStarted from '@salesforce/label/c.CL_When_Programme_Started';
import label_addDomain from '@salesforce/label/c.CL_Add_domain';
 
// ★ NEW — What You Do (Job Creation pathway)
import label_yourJobCreationApproach from '@salesforce/label/c.CL_Your_Job_Creation_Approach';
import label_jobCreationApproachDesc from '@salesforce/label/c.CL_Tell_us_about_your_job_creation_work_in_roughly_500_words_Cover_i_your_sup';
import label_businessSectorsServed from '@salesforce/label/c.CL_Business_Sectors_Served';
import label_businessSectorsDesc from '@salesforce/label/c.CL_List_the_business_sectors_in_which_you_support_entrepreneurs_MSMEs_For_eac';
import label_sector1 from '@salesforce/label/c.CL_SECTOR_1';
import label_businessSector from '@salesforce/label/c.CL_Business_Sector';
import label_whenDidSupportBegin from '@salesforce/label/c.CL_When_Did_Support_Begin';
import label_typeOfSupportProvided from '@salesforce/label/c.CL_Type_of_Support_Provided';
import label_selectAllThatApply from '@salesforce/label/c.CL_Select_all_that_apply';
import label_yearlyEnrolment from '@salesforce/label/c.CL_Yearly_Enrolment';
import label_addSector from '@salesforce/label/c.CL_Add_sector';
  
// ★ NEW — What You've Delivered (financial table labels)
import label_whatYouveDelivered from '@salesforce/label/c.CL_What_You_ve_Delivered';
import label_deliveredIntro from '@salesforce/label/c.CL_Your_three_year_financial_track_record_current_year_picture_sustainability';
import label_amountsNote from '@salesforce/label/c.CL_All_amounts_in_US_dollars_Rounded_to_the_nearest_million_is_acceptable_Comp';
import label_historicalFinancialData from '@salesforce/label/c.CL_Historical_Financial_Data';
import label_historicalDataDesc from '@salesforce/label/c.CLL_Enter_your_historical_figures_across_the_three_prior_fiscal_years_Starting';
import label_item from '@salesforce/label/c.CL_Item';
import label_balanceAtStartOfYear from '@salesforce/label/c.CL_Balance_at_Start_of_Year';
import label_autoComputedFormula from '@salesforce/label/c.CL_Auto_computed_Start_Revenue_Expense';
import label_7numbersNote from '@salesforce/label/c.CL_You_enter_7_numbers_1_start_balance_3_revenues_3_expenses_the_remainin';
import label_currentFiscalYearData from '@salesforce/label/c.CL_Current_Fiscal_Year_Data';
import label_currentFiscalYearDataDesc from '@salesforce/label/c.CL_Your_current_fiscal_year_budget_latest_projection_and_explanation_of_any_de';
import label_budget from '@salesforce/label/c.CL_Budget';
import label_projection from '@salesforce/label/c.CL_Projection';
import label_deviationAutoComputed from '@salesforce/label/c.CL_Deviation_auto_computed_Projection_Budget';
import label_jobCreationOutcomesActuals from '@salesforce/label/c.CL_Job_Creation_Outcomes_Last_3_Fiscal_Years_Actuals';


//new custom labels 
import CL_1_2_reference_contacts_optional from '@salesforce/label/c.CL_1_2_reference_contacts_optional';
import CL_3_years_of_historical_financials_revenue_and_expense from '@salesforce/label/c.CL_3_years_of_historical_financials_revenue_and_expense';
import CL_3_years_of_programme_outcome_numbers_enrolment_placement_jobs from '@salesforce/label/c.CL_3_years_of_programme_outcome_numbers_enrolment_placement_jobs';
import CL_A_few_details_so_we_know_who_we_re_talking_to from '@salesforce/label/c.CL_A_few_details_so_we_know_who_we_re_talking_to';
import CL_About_Your_Organisation from '@salesforce/label/c.CL_About_Your_Organisation';
import CL_About_Your_Organisation_who_you_are from '@salesforce/label/c.CL_About_Your_Organisation_who_you_are';
import CL_Add_domain from '@salesforce/label/c.CL_Add_domain';
import CL_Add_funder from '@salesforce/label/c.CL_Add_funder';
import CL_Add_reference from '@salesforce/label/c.CL_Add_reference';
import CL_Add_sector from '@salesforce/label/c.CL_Add_sector';
import CL_All_amounts_in_US_dollars_rounded_to_nearest_million_is_fine from '@salesforce/label/c.CL_All_amounts_in_US_dollars_rounded_to_nearest_million_is_fine';
import CL_All_amounts_in_US_dollars_Rounded_to_the_nearest_million_is_acceptable_Comp from '@salesforce/label/c.CL_All_amounts_in_US_dollars_Rounded_to_the_nearest_million_is_acceptable_Comp';
import CL_Approx_Annual_Amount_USD from '@salesforce/label/c.CL_Approx_Annual_Amount_USD';
import CL_Attestation_Checkbox from '@salesforce/label/c.CL_Attestation_Checkbox';
import CL_Auto_computed from '@salesforce/label/c.CL_Auto_computed';
import CL_Auto_computed_Expense_all_jobs from '@salesforce/label/c.CL_Auto_computed_Expense_all_jobs';
import CL_Auto_computed_Expense_Placements from '@salesforce/label/c.CL_Auto_computed_Expense_Placements';
import CL_Auto_computed_Start_Revenue_Expense from '@salesforce/label/c.CL_Auto_computed_Start_Revenue_Expense';
import CL_Auto_stamped_on_submission from '@salesforce/label/c.CL_Auto_stamped_on_submission';
import CL_Avg_Cost_per_Placement from '@salesforce/label/c.CL_Avg_Cost_per_Placement';
import cl_Balance_at_End_of_Year from '@salesforce/label/c.cl_Balance_at_End_of_Year';
import CL_Balance_at_Start_of_Year from '@salesforce/label/c.CL_Balance_at_Start_of_Year';
import CL_Brief_Description from '@salesforce/label/c.CL_Brief_Description';
import CL_Briefly_describe_your_governance_and_operational_structure_board_leadershi from '@salesforce/label/c.CL_Briefly_describe_your_governance_and_operational_structure_board_leadershi';
import CL_Business_Advisory from '@salesforce/label/c.CL_Business_Advisory';
import CL_Business_Sector from '@salesforce/label/c.CL_Business_Sector';
import CL_Business_Sectors_Served from '@salesforce/label/c.CL_Business_Sectors_Served';
import CL_Capital from '@salesforce/label/c.CL_Capital';
import CL_Conduct_Verification from '@salesforce/label/c.CL_Conduct_Verification';
import CL_Confirmation_of_Accuracy from '@salesforce/label/c.CL_Confirmation_of_Accuracy';
import CL_Current_Fiscal_Year_Data from '@salesforce/label/c.CL_Current_Fiscal_Year_Data';
import CL_Current_FY_Projection from '@salesforce/label/c.CL_Current_FY_Projection';
import CL_Date from '@salesforce/label/c.CL_Date';
// ── Orientation Page (Page 0) ──────────────────────────────────────────
import CL_What_you_ll_need from '@salesforce/label/c.CL_What_you_ll_need';
import CL_Your_organization_s_legal_registration_details from '@salesforce/label/c.CL_Your_organization_s_legal_registration_details';
import CL_Verification_reports_if_you_have_them_PDF_optional from '@salesforce/label/c.CL_Verification_reports_if_you_have_them_PDF_optional';
import CL_Sections_in_this_form from '@salesforce/label/c.CL_Sections_in_this_form';
import CL_Review_Submit_final_attestation from '@salesforce/label/c.CL_Review_Submit_final_attestation';
import CL_Quick_tips from '@salesforce/label/c.CL_Quick_tips';
import CL_Required_fields_are_marked_with_a_red_asterisk from '@salesforce/label/c.CL_Required_fields_are_marked_with_a_red_asterisk';
import CL_Optional_fields_show_a_lavender_tint_with_an_Optional_label from '@salesforce/label/c.CL_Optional_fields_show_a_lavender_tint_with_an_Optional_label';
import CL_Use_the_AI_Feedback_button_under_long_text_answers from '@salesforce/label/c.CL_Use_the_AI_Feedback_button_under_long_text_answers';
import CL_You_can_switch_between_English_Spanish_and_Portuguese_anytime from '@salesforce/label/c.CL_You_can_switch_between_English_Spanish_and_Portuguese_anytime';
import CL_Need_help from '@salesforce/label/c.CL_Need_help';
import CL_Email from '@salesforce/label/c.CL_Email';
import CL_Email_grants_portal_wadhwani_charitable_org from '@salesforce/label/c.CL_Email_grants_portal_wadhwani_charitable_org';
import CL_Response_time from '@salesforce/label/c.CL_Response_time';
import CL_Response_time_Within_2_business_days from '@salesforce/label/c.CL_Response_time_Within_2_business_days';
import CL_Languages_English_Spanish_Portuguese from '@salesforce/label/c.CL_Languages_English_Spanish_Portuguese';
import CL_What_You_ve_Delivered_financials_and_outcomes from '@salesforce/label/c.CL_What_You_ve_Delivered_financials_and_outcomes';
import CL_Why_Wadhwani_Charitable_Foundation_your_direction from '@salesforce/label/c.CL_Why_Wadhwani_Charitable_Foundation_your_direction';
// IMPORTS
import CL_Select_your_preferred_language from '@salesforce/label/c.CL_Select_your_preferred_language';
import CL_Start_Form_Button from '@salesforce/label/c.CL_Start_Form_Button';
import CL_Please_select_an_Organizational_Area from '@salesforce/label/c.CL_Please_select_an_Organizational_Area';
import CL_Optional_1 from '@salesforce/label/c.CL_Optional_1';
import CL_Remove_1 from '@salesforce/label/c.CL_Remove_1';
import CL_This_is_a_required_fields from '@salesforce/label/c.CL_This_is_a_required_fields';
import CL_Please_complete_all_required_fields_before_proceeding from '@salesforce/label/c.CL_Please_complete_all_required_fields_before_proceeding';
import CL_Missing_Required_Fields from '@salesforce/label/c.CL_Missing_Required_Fields';
import CL_Select_Type from '@salesforce/label/c.CL_Select_Type';
import CL_Hybrid from '@salesforce/label/c.CL_Hybrid';
// IMPORT STATEMENTS

import CL_Non_Profit from '@salesforce/label/c.CL_Non_Profit';
import CL_For_Profit from '@salesforce/label/c.CL_For_Profit';
import CL_Government_Affiliated from '@salesforce/label/c.CL_Government_Affiliated';
import CL_Other_1 from '@salesforce/label/c.CL_Other_1';
// ── Page 1: About Your Organisation (new fields) ───────────────────────
import CL_Section_1_of_5 from '@salesforce/label/c.CL_Section_1_of_5';
import CL_Tell_us_who_you_are_We_use_this_section_to_understand_your_organisation_s_st from '@salesforce/label/c.CL_Tell_us_who_you_are_We_use_this_section_to_understand_your_organisation_s_st';
import CL_Select_the_option_that_best_describes_your_organisation_focus from '@salesforce/label/c.CL_Select_the_option_that_best_describes_your_organisation_focus';
import CL_Where_do_you_operate_List_all_states_provinces_regions from '@salesforce/label/c.CL_Where_do_you_operate_List_all_states_provinces_regions';
import CL_Who_is_filling_out_this_form_You_ll_be_the_initial_point_of_contact_for_your from '@salesforce/label/c.CL_Who_is_filling_out_this_form_You_ll_be_the_initial_point_of_contact_for_your';
import CL_Tell_us_how_your_organisation_is_legally_constituted_and_where_it_s_registere from '@salesforce/label/c.CL_Tell_us_how_your_organisation_is_legally_constituted_and_where_it_s_registere';
import CL_Type from '@salesforce/label/c.CL_Type';
import CL_Registration_Jurisdiction from '@salesforce/label/c.CL_Registration_Jurisdiction';
import CL_Incorporation_Date from '@salesforce/label/c.CL_Incorporation_Date';
import CL_Explanation_Helper from '@salesforce/label/c.CL_Explanation_Helper';
import CL_Fiscal_Year_End_Date from '@salesforce/label/c.CL_Fiscal_Year_End_Date';
import CL_When_does_your_fiscal_year_close_This_helps_us_align_all_financial_and_outco from '@salesforce/label/c.CL_When_does_your_fiscal_year_close_This_helps_us_align_all_financial_and_outco';
import CL_Top_3_Most_Prominent_Funders from '@salesforce/label/c.CL_Top_3_Most_Prominent_Funders';
import CL_Optionally_share_up_to_three_of_your_most_prominent_funders_the_backers_wh from '@salesforce/label/c.CL_Optionally_share_up_to_three_of_your_most_prominent_funders_the_backers_wh';
import CL_FUNDER_1 from '@salesforce/label/c.CL_FUNDER_1';
import CL_FUNDER_2 from '@salesforce/label/c.CL_FUNDER_2';
import CL_FUNDER_3 from '@salesforce/label/c.CL_FUNDER_3';
import CL_Funder_Name from '@salesforce/label/c.CL_Funder_Name';
import CL_Funding_Period_Start from '@salesforce/label/c.CL_Funding_Period_Start';
import CL_Funding_Period_End from '@salesforce/label/c.CL_Funding_Period_End';
import CL_Funding_Type from '@salesforce/label/c.CL_Funding_Type';
import CL_You_may_add_up_to_3_funders from '@salesforce/label/c.CL_You_may_add_up_to_3_funders';
import CL_References_for_Outreach from '@salesforce/label/c.CL_References_for_Outreach';
import CL_Optionally_share_1_2_contacts_who_can_speak_to_your_organisation_s_work from '@salesforce/label/c.CL_Optionally_share_1_2_contacts_who_can_speak_to_your_organisation_s_work';
import CL_These_contacts_may_be_approached_by_Wadhwani_Charitable_Foundation_during_ev from '@salesforce/label/c.CL_These_contacts_may_be_approached_by_Wadhwani_Charitable_Foundation_during_ev';
import CL_REFERENCE_1 from '@salesforce/label/c.CL_REFERENCE_1';
import CL_REFERENCE_2 from '@salesforce/label/c.CL_REFERENCE_2';
import CL_Name from '@salesforce/label/c.CL_Name';
import CL_Organisation_Role from '@salesforce/label/c.CL_Organisation_Role';

// ── Page 2/3: What You Do ──────────────────────────────────────────────
import CL_Section_2_of_5 from '@salesforce/label/c.CL_Section_2_of_5';
import CL_What_You_Do from '@salesforce/label/c.CL_What_You_Do';
import CL_Tell_us_about_your_skilling_work_your_top_programmes_your_theory_of_change from '@salesforce/label/c.CL_Tell_us_about_your_skilling_work_your_top_programmes_your_theory_of_change';
import CL_Your_Skilling_Approach from '@salesforce/label/c.CL_Your_Skilling_Approach';
import CL_Leader_Tenure from '@salesforce/label/c.CL_Leader_Tenure';
import CL_Tell_us_about_your_skilling_work_in_roughly_500_words_If_you_run_named_progr from '@salesforce/label/c.CL_Tell_us_about_your_skilling_work_in_roughly_500_words_If_you_run_named_progr';
import CL_Skilling_Domains_Offered from '@salesforce/label/c.CL_Skilling_Domains_Offered';
import CL_List_the_skilling_domains_your_organisation_offers_For_each_give_us_the_typ from '@salesforce/label/c.CL_List_the_skilling_domains_your_organisation_offers_For_each_give_us_the_typ';
import CL_DOMAIN_1 from '@salesforce/label/c.CL_DOMAIN_1';
import CL_Domain_Programme_Name from '@salesforce/label/c.CL_Domain_Programme_Name';
import CL_Hours_of_Training from '@salesforce/label/c.CL_Hours_of_Training';
import CL_Duration_Months from '@salesforce/label/c.CL_Duration_Months';
import CL_When_Programme_Started from '@salesforce/label/c.CL_When_Programme_Started';
import CL_Yearly_Enrolment from '@salesforce/label/c.CL_Yearly_Enrolment';
import CL_What_You_Do_your_programmes_and_approach from '@salesforce/label/c.CL_What_You_Do_your_programmes_and_approach';
import CL_Tell_us_about_your_job_creation_work_in_roughly_500_words_Cover_i_your_sup from '@salesforce/label/c.CL_Tell_us_about_your_job_creation_work_in_roughly_500_words_Cover_i_your_sup';
import CL_Your_Job_Creation_Approach from '@salesforce/label/c.CL_Your_Job_Creation_Approach';
import CL_List_the_business_sectors_in_which_you_support_entrepreneurs_MSMEs_For_eac from '@salesforce/label/c.CL_List_the_business_sectors_in_which_you_support_entrepreneurs_MSMEs_For_eac';
import CL_SECTOR_1 from '@salesforce/label/c.CL_SECTOR_1';
import CL_When_Did_Support_Begin from '@salesforce/label/c.CL_When_Did_Support_Begin';
import CL_Type_of_Support_Provided from '@salesforce/label/c.CL_Type_of_Support_Provided';
import CL_Select_all_that_apply from '@salesforce/label/c.CL_Select_all_that_apply';

// ── Page 4: What You've Delivered ─────────────────────────────────────
import CL_Section_3_of_5 from '@salesforce/label/c.CL_Section_3_of_5';
import CL_Section_4_of_5 from '@salesforce/label/c.CL_Section_4_of_5';
import CL_WCF1 from '@salesforce/label/c.CL_WCF1';
import CL_Deploy_meaningful from '@salesforce/label/c.CL_Deploy_meaningful';
import CL_What_You_ve_Delivered from '@salesforce/label/c.CL_What_You_ve_Delivered';
import CL_Your_three_year_financial_track_record_current_year_picture_sustainability from '@salesforce/label/c.CL_Your_three_year_financial_track_record_current_year_picture_sustainability';
import CLL_Enter_your_historical_figures_across_the_three_prior_fiscal_years_Starting from '@salesforce/label/c.CLL_Enter_your_historical_figures_across_the_three_prior_fiscal_years_Starting';
import CL_Historical_Financial_Data from '@salesforce/label/c.CL_Historical_Financial_Data';
import CL_Item from '@salesforce/label/c.CL_Item';
import CL_FY_1 from '@salesforce/label/c.CL_FY_1';
import CL_FY_2 from '@salesforce/label/c.CL_FY_2';
import CL_FY_3 from '@salesforce/label/c.CL_FY_3';
import CL_Earliest_Year_Only from '@salesforce/label/c.CL_Earliest_Year_Only';
import CL_Balance_at_End_of_Year from '@salesforce/label/c.cl_Balance_at_End_of_Year';
import CL_You_enter_7_numbers_1_start_balance_3_revenues_3_expenses_the_remainin from '@salesforce/label/c.CL_You_enter_7_numbers_1_start_balance_3_revenues_3_expenses_the_remainin';
import CL_Your_current_fiscal_year_budget_latest_projection_and_explanation_of_any_de from '@salesforce/label/c.CL_Your_current_fiscal_year_budget_latest_projection_and_explanation_of_any_de';
import CL_Projection from '@salesforce/label/c.CL_Projection';
import CL_Deviation_auto_computed_Projection_Budget from '@salesforce/label/c.CL_Deviation_auto_computed_Projection_Budget';
import CL_Job_Fulfilment_Outcomes_Last_3_Fiscal_Years_Actuals from '@salesforce/label/c.CL_Job_Fulfilment_Outcomes_Last_3_Fiscal_Years_Actuals';
import CL_Enter_your_enrolment_and_placement_actuals_across_the_three_most_recent_fisca from '@salesforce/label/c.CL_Enter_your_enrolment_and_placement_actuals_across_the_three_most_recent_fisca';
import CL_Learner_Enrolments from '@salesforce/label/c.CL_Learner_Enrolments';
import CL_Do_you_have_third_party_verified_data_for_your_placement_outcomes from '@salesforce/label/c.CL_Do_you_have_third_party_verified_data_for_your_placement_outcomes';
import CL_Job_Fulfilment_Outcomes_Current_FY_Projections from '@salesforce/label/c.CL_Job_Fulfilment_Outcomes_Current_FY_Projections';
import CL_Enter_your_projected_enrolment_and_placement_numbers_for_the_current_fiscal_y from '@salesforce/label/c.CL_Enter_your_projected_enrolment_and_placement_numbers_for_the_current_fiscal_y';
import CL_Placement from '@salesforce/label/c.CL_Placement';
import CL_Job_Creation_Outcomes_Last_3_Fiscal_Years_Actuals from '@salesforce/label/c.CL_Job_Creation_Outcomes_Last_3_Fiscal_Years_Actuals';
import CL_Enter_your_business_creation_and_job_creation_actuals_across_the_three_most_r from '@salesforce/label/c.CL_Enter_your_business_creation_and_job_creation_actuals_across_the_three_most_r';
import CL_New_Businesses_Started from '@salesforce/label/c.CL_New_Businesses_Started';
import CL_Jobs_from_New_Businesses from '@salesforce/label/c.CL_Jobs_from_New_Businesses';
import CL_Jobs_from_Existing_Businesses from '@salesforce/label/c.CL_Jobs_from_Existing_Businesses';
import CL_Total_Avg_Cost_per_Job_Created from '@salesforce/label/c.CL_Total_Avg_Cost_per_Job_Created';
import CL_Do_you_have_third_party_verified_data_for_your_job_creation_outcomes from '@salesforce/label/c.CL_Do_you_have_third_party_verified_data_for_your_job_creation_outcomes';
import CL_Upload_verification_report from '@salesforce/label/c.CL_Upload_verification_report';
import CL_Job_Creation_Outcomes_Current_FY_Projections from '@salesforce/label/c.CL_Job_Creation_Outcomes_Current_FY_Projections';
import CL_Projected_business_and_job_creation_numbers_for_the_current_fiscal_year_Thes from '@salesforce/label/c.CL_Projected_business_and_job_creation_numbers_for_the_current_fiscal_year_Thes';
import CL_Existing_Businesses_Supported from '@salesforce/label/c.CL_Existing_Businesses_Supported';

// ── Page 6: Why WCF / GenieAI ─────────────────────────────────────────
import CL_GenieAI_for_Entrepreneurship_Overview_Video from '@salesforce/label/c.CL_GenieAI_for_Entrepreneurship_Overview_Video';
import CL_GenieAI_Skilling_Platform_Product_Demo from '@salesforce/label/c.CL_GenieAI_Skilling_Platform_Product_Demo';
import CL_GenieAI_is_Wadhwani_Foundation_s_AI_platform_for_skilling_entrepreneurship from '@salesforce/label/c.CL_GenieAI_is_Wadhwani_Foundation_s_AI_platform_for_skilling_entrepreneurship';
import CL_Operational_Synergies_GenieAI from '@salesforce/label/c.CL_Operational_Synergies_GenieAI';
import CL_Q20_a_Interest_level_Optional from '@salesforce/label/c.CL_Q20_a_Interest_level_Optional';
import CL_Interest_Level from '@salesforce/label/c.CL_Interest_Level';
import CL_How_could_GenieAI_contribute from '@salesforce/label/c.CL_How_could_GenieAI_contribute';


// ── Page 7: Review & Submit ────────────────────────────────────────────
import CL_Section_5_of_5 from '@salesforce/label/c.CL_Section_5_of_5';
import CL_Review_Submit from '@salesforce/label/c.CL_Review_Submit';
import CL_Take_a_final_look from '@salesforce/label/c.CL_Take_a_final_look';
import CL_Why_Wadhwani_Charitable_Foundation from '@salesforce/label/c.CL_Why_Wadhwani_Charitable_Foundation';
import CL_Jobs_from_Growing_Businesses from '@salesforce/label/c.CL_Jobs_from_Growing_Businesses';
import CL_Attesting_User_Name from '@salesforce/label/c.CL_Attesting_User_Name';
import CL_Attesting_User_Title from '@salesforce/label/c.CL_Attesting_User_Title';

import CL_Auto_save_Failed from '@salesforce/label/c.CL_Auto_save_Failed';
import CL_Business_Sectors_Missing_Fields from '@salesforce/label/c.CL_Business_Sectors_Missing_Fields';
import CL_Could_not_save_your_progress_Please_use_Save_Draft_manually from '@salesforce/label/c.CL_Could_not_save_your_progress_Please_use_Save_Draft_manually';
import CL_Error from '@salesforce/label/c.CL_Error';
import CL_Fiscal_year_end_date_seems_too_far_in_the_future from '@salesforce/label/c.CL_Fiscal_year_end_date_seems_too_far_in_the_future';
import CL_Funding_end_date_must_be_after_start_date from '@salesforce/label/c.CL_Funding_end_date_must_be_after_start_date';
import CL_Headquarters_City_and_Country_cannot_be_blank_or_contain_only_spaces from '@salesforce/label/c.CL_Headquarters_City_and_Country_cannot_be_blank_or_contain_only_spaces';
import CL_Headquarters_City_and_Country_must_contain_letters from '@salesforce/label/c.CL_Headquarters_City_and_Country_must_contain_letters';
import CL_Incorporation_date_cannot_be_in_the_future from '@salesforce/label/c.CL_Incorporation_date_cannot_be_in_the_future';
import CL_Invalid_Input from '@salesforce/label/c.CL_Invalid_Input';
import CL_Invalid_Programme_Date from '@salesforce/label/c.CL_Invalid_Programme_Date';
import CL_Invalid_Value from '@salesforce/label/c.CL_Invalid_Value';
import CL_Must_be_a_whole_number_between_0_and_99 from '@salesforce/label/c.CL_Must_be_a_whole_number_between_0_and_99';
import CL_One_or_more_Business_Sector_programme_dates_are_later_than_your_Incorporation from '@salesforce/label/c.CL_One_or_more_Business_Sector_programme_dates_are_later_than_your_Incorporation';
import CL_Phone_number_can_only_contain_digits_and_characters from '@salesforce/label/c.CL_Phone_number_can_only_contain_digits_and_characters';
import CL_Please_complete_all_required_fields_in_every_domain_row_before_proceeding from '@salesforce/label/c.CL_Please_complete_all_required_fields_in_every_domain_row_before_proceeding';
import CL_Please_describe_how_GenieAI_could_contribute_or_change_your_interest_level_t from '@salesforce/label/c.CL_Please_describe_how_GenieAI_could_contribute_or_change_your_interest_level_t';
import CL_Please_enter_a_valid_city_name from '@salesforce/label/c.CL_Please_enter_a_valid_city_name';
import CL_Please_enter_a_valid_country_name from '@salesforce/label/c.CL_Please_enter_a_valid_country_name';
import CL_Please_enter_a_valid_incorporation_date from '@salesforce/label/c.CL_Please_enter_a_valid_incorporation_date';
import CL_Please_enter_a_valid_phone_number_at_least_7_digits from '@salesforce/label/c.CL_Please_enter_a_valid_phone_number_at_least_7_digits';
import CL_Please_enter_a_valid_positive_amount from '@salesforce/label/c.CL_Please_enter_a_valid_positive_amount';
import CL_Please_enter_both_headquarters_city_and_country_separated_by_a_comma_e_g from '@salesforce/label/c.CL_Please_enter_both_headquarters_city_and_country_separated_by_a_comma_e_g';
import CL_Please_enter_exactly_one_city_and_one_country_separated_by_a_single_comma_e from '@salesforce/label/c.CL_Please_enter_exactly_one_city_and_one_country_separated_by_a_single_comma_e';
import CL_Please_fix_the_highlighted_fields_before_proceeding from '@salesforce/label/c.CL_Please_fix_the_highlighted_fields_before_proceeding';
import CL_Please_fix_the_highlighted_fields_before_saving_your_draft from '@salesforce/label/c.CL_Please_fix_the_highlighted_fields_before_saving_your_draft';
import CL_Progress_Auto_Saved from '@salesforce/label/c.CL_Progress_Auto_Saved';
import CL_Validation_Error from '@salesforce/label/c.CL_Validation_Error';
import CL_Your_answers_are_saved_To_save_and_exit_at_any_time_click_Save_Draft_in_t from '@salesforce/label/c.CL_Your_answers_are_saved_To_save_and_exit_at_any_time_click_Save_Draft_in_t';


import CL_Agriculture_and_allied from '@salesforce/label/c.CL_Agriculture_and_allied';
import CL_Textiles_and_apparel from '@salesforce/label/c.CL_Textiles_and_apparel';
import CL_Automotive from '@salesforce/label/c.CL_Automotive';
import CL_Construction_and_real_estate from '@salesforce/label/c.CL_Construction_and_real_estate';
import CL_Retail_and_trade from '@salesforce/label/c.CL_Retail_and_trade';
import CL_IT_and_technology_services from '@salesforce/label/c.CL_IT_and_technology_services';
import CL_Financial_services from '@salesforce/label/c.CL_Financial_services';
import CL_Healthcare from '@salesforce/label/c.CL_Healthcare';
import CL_Education_and_training from '@salesforce/label/c.CL_Education_and_training';
import CL_Hospitality_and_tourism from '@salesforce/label/c.CL_Hospitality_and_tourism';
import CL_Logistics_and_transport from '@salesforce/label/c.CL_Logistics_and_transport';
import CL_Energy_and_environment from '@salesforce/label/c.CL_Energy_and_environment';
import CL_Media_and_creative from '@salesforce/label/c.CL_Media_and_creative';
import CL_Other_services from '@salesforce/label/c.CL_Other_services';
import CL_Avg_Cost_Placement_Formula from '@salesforce/label/c.CL_Avg_Cost_Placement_Formula';
import CL_Avg_Cost_Job_Formula from '@salesforce/label/c.CL_Avg_Cost_Job_Formula';
// add near your other Page 7 imports
import CL_Download_as_PDF from '@salesforce/label/c.CL_Download_as_PDF';

import CL_Capital_Expenditure from '@salesforce/label/c.CL_Capital_Expenditure';
import CL_Capital_Expenditure_Help from '@salesforce/label/c.CL_Capital_Expenditure_Help';
import CL_Operating_Expenditure from '@salesforce/label/c.CL_Operating_Expenditure';
import CL_Operating_Expenditure_Help from '@salesforce/label/c.CL_Operating_Expenditure_Help';
import CL_Job_Fulfillment_Only from '@salesforce/label/c.CL_Job_Fulfillment_Only';
import CL_Job_Creation_Only from '@salesforce/label/c.CL_Job_Creation_Only';
import CL_Both_Job_Fulfillment_and_Job_Creation from '@salesforce/label/c.CL_Both_Job_Fulfillment_and_Job_Creation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';
import IS_GUEST from '@salesforce/user/isGuest';
import USER_EMAIL_FIELD from '@salesforce/schema/User.Email';
export default class ResumeDraftWcfForm extends NavigationMixin(LightningElement) {
    // CHANGE THESE (near the top of the class):
@track showFunder2 = false;
@track showFunder3 = false;
@track showReference2 = false;
@track isLoading = false;
@track additionalInfoFiles = [];

// ── Headquarters City/Country search (OpenStreetMap) ──
@track hqSearchKey = '';
@track hqResults = [];
@track hqIsLoading = false;
@track hqShowNoResults = false;
@track errorStepActive = false;
hqDelayTimeout;

    @api recordId;
         // IndividualApplication__c fields
    @track languageCode = 'en'; // ✅ ADD THIS LINE
    @track historicalRecord = {};     // Historical_Data__c
    @track fiscalRecord = {};         // Current_fiscal_year_data__c
    @track outcomeRecord = {};        // Outcomes_Data__c
    winLogoUrl = WIN_LOGO; 
    @track fiscalMonthValue = '';
    @track fiscalDayValue = '';
    @track activeField = null;
    @track uploadedFiles = [];
    @track uploadedFilesByCell = {};
   @track isPreviewVisible = false;
   @track previewPage = 1;
// Orientation / page 0
@track isOrientationComplete = false;
@track currentPage = 0;  // change from 1 to 0
@track isSubmitted = false;
@track submittedRecordId = '';
@track hasUnsavedChanges = false;
@track isSaving = false;    
// Word counters
// Word counters
acceptedFormats = ['.pdf'];
officeDocFormats = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
legalStructureWordCount = 0;
additionalFundingWordCount = 0;
synergiesWordCount = 0;
skillingApproachWordCount = 0;
jcApproachWordCount = 0;
sustainabilityWordCount = 0;
revenueExplanationWordCount = 0;
expenseExplanationWordCount = 0;
netPositionExplanationWordCount = 0;
// Funder/Reference toggles (tracked above; not redeclared here)

_verifiedEmail = null;

@wire(getRecord, { recordId: USER_ID, fields: [USER_EMAIL_FIELD] })
wiredVerifiedUser({ data, error }) {
    if (IS_GUEST) return;                   // never stamp the site Guest User email
    if (data) {
        this._verifiedEmail = getFieldValue(data, USER_EMAIL_FIELD) || null;
        this._applyVerifiedEmail();
    } else if (error) {
        console.warn('Verified user email unavailable:', JSON.stringify(error));
    }
}

// Prefill only — never overwrites a saved draft value or anything the user typed.
_applyVerifiedEmail() {
    if (!this._verifiedEmail) return;
    const current = this.organizationData.Work_Email_ID__c;
    if (current && String(current).trim() !== '') return;

    this.organizationData = {
        ...this.organizationData,
        Work_Email_ID__c: this._verifiedEmail
    };
    this._clearLightningError('Work_Email_ID__c');
    // deliberately NOT setting hasUnsavedChanges — a prefill shouldn't arm the
    // beforeunload prompt; it persists on the next Save Draft / Next anyway.
}

// Add to resumeDraftWcfForm.js class:
sanitizeOrgData(data) {
    const clean = {};
    Object.keys(data).forEach(key => {
        if (key && key !== 'undefined') {
            clean[key] = data[key];
        }
    });
    return clean;
}

// ─── ADD this @track property at the top of the class ───
@track isAIModalOpen = false;
@track aiModalTitle = 'AI Feedback';
@track aiResponse = '';
@track isAiLoading = false;
@track isFeedbackPanelOpen = false;  // ← was missing @track

// Attestation
@track isAttested = false;
@track isPhoneCodeDropdownOpen = false;
@track phoneCodeSearchTerm = '';
@track phoneNumberError = '';

// ── intl-tel-input (flagTelpicker) phone picker ──
_phoneIti = null;
_phoneItiInitialized = false;
_phoneScriptsLoaded = false;
_onPhoneCountryChange = null;

// Legal/country options
get legalTypeOptions() {
    return [
        { label: this.labels.CL_Select_Type, value: '' },
        { label: this.labels.CL_Non_Profit, value: 'Non-profit' },
        { label: this.labels.CL_For_Profit, value: 'For-profit' },
        { label: this.labels.CL_Hybrid, value: 'Hybrid' },
        { label: this.labels.CL_Government_Affiliated, value: 'Government-affiliated' },
        { label: this.labels.CL_Other_1, value: 'Other' }
    ];
}

countryOptions = [
    { label: '— Select country —', value: '' },
    { label: 'Brazil', value: 'Brazil' },
    { label: 'Egypt', value: 'Egypt' },
    { label: 'India', value: 'India' },
    { label: 'Indonesia', value: 'Indonesia' },
    { label: 'Mexico', value: 'Mexico' },
    { label: 'Philippines', value: 'Philippines' },
    { label: 'United States', value: 'United States' },
    { label: 'Other', value: 'Other' }
];
get selectedPhoneCodeDisplay() {
    const val = this.organizationData.WG_Phone_Country_Code__c;
    if (!val) return 'Code';
    const match = String(val).match(/^\+\d+/);
    return match ? match[0] : val;
}

get phoneFieldWrapperClass() {
    return this.phoneNumberError ? 'phone-input-group has-error' : 'phone-input-group';
}
get phoneCountryCodeDisplay() {
    const val = this.organizationData.WG_Phone_Country_Code__c;
    if (!val) return '';
    const match = String(val).match(/^\+\d+/);
    return match ? match[0] : val;
}
get filteredPhoneCountryCodeOptions() {
    const term = (this.phoneCodeSearchTerm || '').toLowerCase().trim();
    const selected = this.organizationData.WG_Phone_Country_Code__c;
    const source = this.phoneCountryCodeOptions || [];
    const filtered = term
        ? source.filter(o =>
            o.label.toLowerCase().includes(term) ||
            o.value.toLowerCase().includes(term))
        : source;
    return filtered.map(o => ({
        ...o,
        itemClass: o.value === selected ? 'is-selected' : ''
    }));
}
togglePhoneCodeDropdown(event) {
    event.stopPropagation();
    this.isPhoneCodeDropdownOpen = !this.isPhoneCodeDropdownOpen;
    this.phoneCodeSearchTerm = '';
    if (this.isPhoneCodeDropdownOpen) {
        window.requestAnimationFrame(() => {
            document.addEventListener('click', this._closePhoneCodeDropdown);
        });
    }
}

stopPropagationHandler(event) {
    event.stopPropagation();
}

handlePhoneCodeSearch(event) {
    this.phoneCodeSearchTerm = event.target.value;
}

handlePhoneCodeSelect(event) {
    const val = event.currentTarget.dataset.value;
    this.hasUnsavedChanges = true;
    this.organizationData.WG_Phone_Country_Code__c = val;
    this.isPhoneCodeDropdownOpen = false;
    document.removeEventListener('click', this._closePhoneCodeDropdown);

    const phoneVal = this.organizationData.Phone__c;
    if (phoneVal) {
        this.phoneNumberError = this._validatePhoneField(phoneVal, val) || '';
    }
}

handlePhoneNumberInput(event) {
    if (this._phoneIti) {
        // Picker active → derive dial code + national number from it
        this._syncPhoneFromIti(event.target);
        return;
    }
    this.hasUnsavedChanges = true;
    const val = event.target.value;
    this.organizationData.Phone__c = val;
    this.phoneNumberError = val
        ? (this._validatePhoneField(val, this.organizationData.WG_Phone_Country_Code__c) || '')
        : '';
    if (!this.phoneNumberError) {
        const phoneEl = this.template.querySelector('[data-id="phone"]');
        if (phoneEl) {
            this._invalidElements = this._invalidElements.filter(x => x !== phoneEl);
        }
    }
}

_closePhoneCodeDropdown = () => {
    this.isPhoneCodeDropdownOpen = false;
    document.removeEventListener('click', this._closePhoneCodeDropdown);
};
// Show the free-text "please specify" input when the applicant picks "Other"
get showLegalTypeOther() {
    return this.organizationData.Legal_Type__c === 'Other';
}
get showRegistrationJurisdictionOther() {
    return this.organizationData.Registration_Jurisdiction__c === 'Other';
}

funderTypeOptions = [
    { label: '— Select —', value: '' },   // ← ADD THIS
    { label: 'Grant', value: 'Grant' },
    { label: 'Loan', value: 'Loan' },
    { label: 'Equity', value: 'Equity' },
    { label: 'In-Kind', value: 'In-Kind' }
];
get genieAIInterestOptions() {

    return [

        { label: '— Select —', value: '' },
 
        { 

            label: this.labels.CL_Yes_interested, 

            value: 'Yes, interested'

        },
 
        { 

            label: this.labels.CL_Maybe_want_to_learn_more, 

            value: 'Maybe, want to learn more'

        },
 
        { 

            label: this.labels.CL_Not_at_this_time, 

            value: 'Not at this time'

        }

    ];

}
 
_rowKey() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

_newSkillRow() {
    return { key: this._rowKey(), period: 'CFY', domain: '', hours: '',
             duration: '', startDate: '', yearlyEnrolment: '' };
}

_newSectorRow() {
    return { key: this._rowKey(), sector: '', sectorOther: '', supportBegin: '',
             supportTypes: [], supportTypeOther: '', yearlyEnrolment: '' };
}
// Business sectors
@track businessSectors = [];
@track unifiedSkillDomains = [];

// File validation
@track invalidFileCells = {};
_fileOpQueue = Promise.resolve();           // ← ADD
@track fileUploadRenderKeys = {};           // ← ADD
    labels = {  

        CL_WCF_Form_Title,
        WCF_Paragraph_1,
        CL_Your_Latest_Changes,
        CL_draft_save,
        // ADD INSIDE labels = { }
CL_Job_Fulfillment_Only,
CL_Job_Creation_Only,
CL_Both_Job_Fulfillment_and_Job_Creation,
         CL_Non_Profit,
        CL_Technical_Assistance_Tooltip,
        CL_For_Profit,
        CL_Government_Affiliated,
        CL_Other_1,
        CL_Please_Save,
        WCF_Paragraph_2,
        WCF_Paragraph_3,
        CL_Organizational_Area_s_for_Funding_Investment,
        CLS_Organizational_Identifying,
        CLS_Submitter_Contact_Info,
        CL_Organizational_Name,
        CL_Headquarters_City_and_Country,
        CL_Primary_Service_Regions,
        CL_Leader_Name,
        CL_Leader_Title,
        CL_Submitter_Name,
        CL_Title,
        CL_Email_Address,
        CL_Phone_number,
        CL_Legal_Structure,
        CL_Technology,
        CL_Legal_Question,
        CL_Next,
        CL_Previous,
        CL_Display_Box1,
        CL_Avg_Cost_per_Placement,
    CL_Total_Avg_Cost_per_Job_Created,
       CL_Avg_Cost_Placement_Formula,
    CL_Avg_Cost_Job_Formula,
    CL_Display_Box2,
    CL_Agriculture,
    CL_Retail,
    CL_Services,
    CL_Manufacturing,
    CL_Mentorship1,
    CL_Business_Advisory1,
    CL_Market_Linkages1,
    CL_Sector_TA1,
    CL_Auto_save_Failed,
CL_Business_Sectors_Missing_Fields,
CL_Could_not_save_your_progress_Please_use_Save_Draft_manually,
CL_Tell_us_about_your_work_in_both_skilling_Job_Fulfilment_and_entrepreneurshi,
CL_Tell_us_about_your_job_creation_work,
CL_Error,
CL_Fiscal_year_end_date_seems_too_far_in_the_future,
CL_Funding_end_date_must_be_after_start_date,
CL_Headquarters_City_and_Country_cannot_be_blank_or_contain_only_spaces,
CL_Headquarters_City_and_Country_must_contain_letters,
CL_Incorporation_date_cannot_be_in_the_future,
CL_Invalid_Input,
CL_Invalid_Programme_Date,
CL_Invalid_Value,
CL_Must_be_a_whole_number_between_0_and_99,
CL_One_or_more_Business_Sector_programme_dates_are_later_than_your_Incorporation,
CL_Phone_number_can_only_contain_digits_and_characters,
CL_Please_complete_all_required_fields_in_every_domain_row_before_proceeding,
CL_Please_describe_how_GenieAI_could_contribute_or_change_your_interest_level_t,
CL_Please_enter_a_valid_city_name,
CL_Please_enter_a_valid_country_name,
CL_Please_enter_a_valid_incorporation_date,
CL_Please_enter_a_valid_phone_number_at_least_7_digits,
CL_Please_enter_a_valid_positive_amount,
CL_Please_enter_both_headquarters_city_and_country_separated_by_a_comma_e_g,
CL_Please_enter_exactly_one_city_and_one_country_separated_by_a_single_comma_e,
CL_Please_fix_the_highlighted_fields_before_proceeding,
CL_Please_fix_the_highlighted_fields_before_saving_your_draft,
CL_Progress_Auto_Saved,
CL_Validation_Error,
CL_Your_answers_are_saved_To_save_and_exit_at_any_time_click_Save_Draft_in_t,
        CL_Save_Draft,
        CL_Submit,
        CL_Current_Fiscal_Year_End_Date,
        CL_Prior_Fiscal_Year,
        CL_Two_Years_Prior,
        CL_Three_Years_Prior,
        CL_Balance_At_Start_of_the_Year,
        CL_Revenue,
        CL_Expense,
        CL_Leader_Tenure,
        CL_Balance_At_End_of_the_Year,
        CL_Budget,
        CL_Current_Projection,
        CL_Yes_interested,
        CL_Maybe_want_to_learn_more,
        CL_Not_at_this_time,
        CL_Variance,
        CL_Explanation,
        CL_Revenue_Expense,
        CL_Organizational_Sustainability,
        CL_Organizational_Sustainability_Question,
        CL_List_of_Organization_Skilling_Domain,
        CL_Learner_Enrollment,
        CL_Learner_Enrollment_help_text,
        CL_Learner_Placements,
        CL_Learner_Placement_Percentage,
        CL_Placement_Provided,
        CL_Projected_Cost_Per_Placement,
        CL_Placement_Verification,
        CL_Long_term_Outcomes_Research,
        CL_Current_Fiscal_Year,
        CL_Yes_No,
        CL_Describe_Briefly,
        CL_File_Attachments,
        CL_Desired_Use_of_Additional_Funding_Investment,
        CL_Additional_Funding_Question,
        CL_Operational_Synergies,
        CL_Operational_Synergies_Question,
        CL_List_of_projected_target_business,
        CL_Projected_Total_New_Businesses,
        CL_Projected_Total_Jobs,
        CL_Estimated_Jobs_Provide,
        CL_Projected_Existing_Businesses,
        CL_Total_Jobs_Created,
        CL_Estimated_Percentage_Total,
        CL_Total_Projected_Average_Cost,
        CL_Job_Creation_Verification,
        CL_Additonal_Funding_Job_Question,
        CL_Operational_Synergies_Job_Question,
        CLH_Financial_Data,
        CLH_Historical_Data,
        CLH_Job_Creation_Questions,
        CLH_Job_Fulfilment_Questions,
        CLH_Outcome_Data,
        CLH_Current_Fiscal_Year_Data,
        CLH_AI_Feedback,
        CLH_Preview,
        CL_Close,
        CL_Operational_Synergies_Question_Both,
        clickToAddExplanation: CL_Click_To_Add_Explanation,
         CL_Explanation_Note,
        CL_Attestation_Label,
        CL_File_Required_Message,
        CL_Agriculture_and_allied,
CL_Textiles_and_apparel,
CL_Automotive,
CL_Construction_and_real_estate,
CL_Retail_and_trade,
CL_IT_and_technology_services,
CL_Financial_services,
CL_Healthcare,
CL_Education_and_training,
CL_Hospitality_and_tourism,
CL_Logistics_and_transport,
CL_Energy_and_environment,
CL_Media_and_creative,
CL_Other_services,  
        CL_Number_of_years_your_current_named_leader_has_held_their_role_Round_to_the_n,
         CL_What_you_ll_need: label_whatYouLlNeed,
    CL_Your_organization_s_legal_registration_details: label_legalRegDetails,
    CL_3_years_of_historical_financials_revenue_and_expense: label_3yrFinancials,
    CL_3_years_of_programme_outcome_numbers_enrolment_placement_jobs: label_3yrOutcomes,
    CL_Verification_reports_if_you_have_them_PDF_optional: label_verificationReports,
    CL_1_2_reference_contacts_optional: label_referenceContacts,
    CL_Sections_in_this_form: label_sectionsInForm,
    CL_About_Your_Organisation_who_you_are: label_aboutOrgWhoYouAre,
    CL_What_You_Do_your_programmes_and_approach: label_whatYouDo,
    CL_What_You_ve_Delivered_financials_and_outcomes: label_whatYouDelivered,
    CL_Why_Wadhwani_Charitable_Foundation_your_direction: label_whyWCF,
    CL_Review_Submit_final_attestation: label_reviewSubmit,
    CL_Quick_tips: label_quickTips,
    CL_All_amounts_in_US_dollars_rounded_to_nearest_million_is_fine: label_amountsUSD,
    CL_Required_fields_are_marked_with_a_red_asterisk: label_requiredAsterisk,
    CL_Optional_fields_show_a_lavender_tint_with_an_Optional_label: label_optionalLavender,
    CL_Use_the_AI_Feedback_button_under_long_text_answers: label_aiFeedbackTip,
    CL_You_can_switch_between_English_Spanish_and_Portuguese_anytime: label_switchLanguages,
    CL_Need_help: label_needHelp,
    CL_Email_grants_portal_wadhwani_charitable_org: label_helpEmail,
    CL_Response_time_Within_2_business_days: label_responseTime,
    CL_Languages_English_Spanish_Portuguese: label_helpLanguages,
    CL_About_Your_Organisation: label_aboutYourOrg,
    CL_Tell_us_who_you_are_We_use_this_section_to_understand_your_organisation_s_st: label_orgSectionDesc,
    CL_Select_the_option_that_best_describes_your_organisation_focus: label_selectOrgFocus,
    CL_Operating_across_both_skilling_and_entrepreneurship: label_bothPathways,
    CL_A_few_details_so_we_know_who_we_re_talking_to: label_fewDetails,
    CL_Who_is_filling_out_this_form_You_ll_be_the_initial_point_of_contact_for_your: label_submitterDesc,
    CL_Tell_us_how_your_organisation_is_legally_constituted_and_where_it_s_registere: label_legalStructureDesc,
    CL_Type: label_type,
    CL_Registration_Jurisdiction: label_registrationJurisdiction,
    CL_Incorporation_Date: label_incorporationDate,
    CL_Brief_Description: label_briefDescription,
    CL_Briefly_describe_your_governance_and_operational_structure_board_leadershi: label_briefDescHelper,
    CL_Fiscal_Year_End_Date: label_fiscalYearEnd,
    CL_When_does_your_fiscal_year_close_This_helps_us_align_all_financial_and_outco: label_fiscalYearDesc,
    CL_Top_3_Most_Prominent_Funders: label_top3Funders,
    CL_Optionally_share_up_to_three_of_your_most_prominent_funders_the_backers_wh: label_top3FundersDesc,
    CL_FUNDER_1: label_funder1,
    CL_Funder_Name: label_funderName,
    CL_Approx_Annual_Amount_USD: label_funderAmount,
    CL_Funding_Period_Start: label_fundingPeriodStart,
    CL_Funding_Period_End: label_fundingPeriodEnd,
    CL_Funding_Type: label_fundingType,
    CL_You_may_add_up_to_3_funders: label_upTo3Funders,
    CL_Add_funder: label_addFunder,
    CL_FUNDER_2: label_funder2,
    CL_FUNDER_3: label_funder3,
    CL_Where_do_you_operate_List_all_states_provinces_regions: label_wheredoyouoperate,
     CL_References_for_Outreach: label_referencesForOutreach,
    CL_Optionally_share_1_2_contacts_who_can_speak_to_your_organisation_s_work: label_referencesDesc,
    CL_These_contacts_may_be_approached_by_Wadhwani_Charitable_Foundation_during_ev: label_referencesNote,
    CL_REFERENCE_1: label_reference1,
    CL_REFERENCE_2: label_reference2,
    CL_Name: label_name,
    CL_Email: label_emailRef,
    CL_Add_reference: label_addReference,
 
    // ★ NEW — What You Do (Job Creation pathway)
    CL_Your_Job_Creation_Approach: label_yourJobCreationApproach,
    CL_Tell_us_about_your_job_creation_work_in_roughly_500_words_Cover_i_your_sup: label_jobCreationApproachDesc,
    CL_Business_Sectors_Served: label_businessSectorsServed,
    CL_List_the_business_sectors_in_which_you_support_entrepreneurs_MSMEs_For_eac: label_businessSectorsDesc,
    CL_SECTOR_1: label_sector1,
    CL_Business_Sector: label_businessSector,
    CL_When_Did_Support_Begin: label_whenDidSupportBegin,
    CL_Type_of_Support_Provided: label_typeOfSupportProvided,
    CL_Select_all_that_apply: label_selectAllThatApply,
    CL_Yearly_Enrolment: label_yearlyEnrolment,
    CL_Add_sector: label_addSector,
 
    // ★ NEW — What You've Delivered (financial table labels)
    CL_What_You_ve_Delivered: label_whatYouveDelivered,
    CL_Your_three_year_financial_track_record_current_year_picture_sustainability: label_deliveredIntro,
    CL_All_amounts_in_US_dollars_Rounded_to_the_nearest_million_is_acceptable_Comp: label_amountsNote,
    CL_Historical_Financial_Data: label_historicalFinancialData,
    CLL_Enter_your_historical_figures_across_the_three_prior_fiscal_years_Starting: label_historicalDataDesc,
    CL_Item: label_item,
    CL_Balance_at_Start_of_Year: label_balanceAtStartOfYear,
    CL_Auto_computed_Start_Revenue_Expense: label_autoComputedFormula,
    CL_You_enter_7_numbers_1_start_balance_3_revenues_3_expenses_the_remainin: label_7numbersNote,
    CL_Current_Fiscal_Year_Data: label_currentFiscalYearData,
    CL_Your_current_fiscal_year_budget_latest_projection_and_explanation_of_any_de: label_currentFiscalYearDataDesc,
    CL_Budget: label_budget,
    CL_Projection: label_projection,
    CL_Deviation_auto_computed_Projection_Budget: label_deviationAutoComputed,
    CL_Job_Creation_Outcomes_Last_3_Fiscal_Years_Actuals: label_jobCreationOutcomesActuals,
        CL_What_You_Do: label_whatYouDoSection,
CL_Tell_us_about_your_skilling_work_your_top_programmes_your_theory_of_change: label_skillingTheoryDesc,

CL_Your_Skilling_Approach: label_yourSkillingApproach,
CL_Tell_us_about_your_skilling_work_in_roughly_500_words_If_you_run_named_progr: label_skillingApproachDesc,

CL_Skilling_Domains_Offered: label_skillingDomainsOffered,
CL_List_the_skilling_domains_your_organisation_offers_For_each_give_us_the_typ: label_skillingDomainsDesc,
CL_Select_your_preferred_language,
    CL_Start_Form_Button,
    CL_Please_select_an_Organizational_Area,
    CL_Optional_1,
    CL_Remove_1,
    CL_This_is_a_required_fields,
    CL_Please_complete_all_required_fields_before_proceeding,
    CL_Missing_Required_Fields,
    CL_Select_Type,
    CL_Hybrid,
CL_DOMAIN_1: label_domain1,
CL_Domain_Programme_Name: label_domainProgrammeName,
CL_Hours_of_Training: label_hoursOfTraining,
CL_Duration_Months: label_durationMonths,
CL_When_Programme_Started: label_whenProgrammeStarted,
CL_Add_domain: label_addDomain,
CL_WCF_Form_Title,
        WCF_Paragraph_1,
        WCF_Paragraph_2,
        WCF_Paragraph_3,
        CL_Organizational_Area_s_for_Funding_Investment,
        CLS_Organizational_Identifying,
        CLS_Submitter_Contact_Info,
        CL_Organizational_Name,
        CL_Headquarters_City_and_Country,
        CL_Primary_Service_Regions,
        CL_Leader_Name,
        CL_Leader_Title,
        CL_Submitter_Name,
        CL_Title,
        CL_Email_Address,
        CL_Phone_number,
        CL_Legal_Structure,
        CL_Legal_Question,
        CL_Next,
        CL_Previous,
        CL_Save_Draft,
        CL_Submit,
        CL_Current_Fiscal_Year_End_Date,
        CL_Prior_Fiscal_Year,
        CL_Two_Years_Prior,
        CL_Three_Years_Prior,
        CL_Balance_At_Start_of_the_Year,
        CL_Revenue,
        CL_Expense,
        CL_Balance_At_End_of_the_Year,
        CL_Budget,
        CL_Current_Projection,
        CL_Variance,
        CL_Explanation,
        CL_Revenue_Expense,
        CL_Organizational_Sustainability,
        CL_Organizational_Sustainability_Question,
        CL_List_of_Organization_Skilling_Domain,
        CL_Learner_Enrollment,
        CL_Learner_Placements,
        CL_Learner_Placement_Percentage,
        CL_Placement_Provided,
        CL_Projected_Cost_Per_Placement,
        CL_Placement_Verification,
        CL_Long_term_Outcomes_Research,
        CL_Current_Fiscal_Year,
        CL_Yes_No,
        CL_Describe_Briefly,
        CL_File_Attachments,
        CL_Desired_Use_of_Additional_Funding_Investment,
        CL_Additional_Funding_Question,
        CL_Operational_Synergies,
        CL_Operational_Synergies_Question,
        CL_List_of_projected_target_business,
        CL_Projected_Total_New_Businesses,
        CL_Projected_Total_Jobs,
        CL_Estimated_Jobs_Provide,
        CL_Projected_Existing_Businesses,
        CL_Total_Jobs_Created,
        CL_Estimated_Percentage_Total,
        CL_Total_Projected_Average_Cost,
        CL_Job_Creation_Verification,
        CL_Additonal_Funding_Job_Question,
        CL_Operational_Synergies_Job_Question,
        CLH_Financial_Data,
        CLH_Historical_Data,
        CLH_Job_Creation_Questions,
        CLH_Job_Fulfilment_Questions,
        CLH_Outcome_Data,
        CLH_Current_Fiscal_Year_Data,
        CLH_AI_Feedback,
        CLH_Preview,
        CL_Close,
        clickToAddExplanation: CL_Click_To_Add_Explanation,
        CL_Explanation_Note,
        CL_Attestation_Label,
        CL_File_Required_Message,  
        CL_1_2_reference_contacts_optional,
    CL_3_years_of_historical_financials_revenue_and_expense,
    CL_3_years_of_programme_outcome_numbers_enrolment_placement_jobs,
    CL_A_few_details_so_we_know_who_we_re_talking_to,
    CL_About_Your_Organisation,
    CL_About_Your_Organisation_who_you_are,
    CL_Add_domain,
    CL_Add_funder,
    CL_Add_reference,
    CL_Add_sector,
    CL_All_amounts_in_US_dollars_rounded_to_nearest_million_is_fine,
    CL_All_amounts_in_US_dollars_Rounded_to_the_nearest_million_is_acceptable_Comp,
    CL_Approx_Annual_Amount_USD,
    CL_Attestation_Checkbox,
    CL_Auto_computed,
    CL_Auto_computed_Expense_all_jobs,
    CL_Auto_computed_Expense_Placements,
    CL_Auto_computed_Start_Revenue_Expense,
    CL_Auto_stamped_on_submission,
    CL_Avg_Cost_per_Placement,
    cl_Balance_at_End_of_Year,
    CL_Balance_at_Start_of_Year,
    CL_Brief_Description,
    CL_Briefly_describe_your_governance_and_operational_structure_board_leadershi,
    CL_Business_Advisory,
    CL_Business_Sector,
    CL_Business_Sectors_Served,
    CL_Capital,
    CL_Conduct_Verification,
    CL_Confirmation_of_Accuracy,
    CL_Current_Fiscal_Year_Data,
    CL_Current_FY_Projection,
    CL_Date ,
    // ── Orientation Page ──────────────────────────────────────────────────
    CL_What_you_ll_need,
    CL_Your_organization_s_legal_registration_details,
    CL_Verification_reports_if_you_have_them_PDF_optional,
    CL_Sections_in_this_form,
    CL_Review_Submit_final_attestation,
    CL_Quick_tips,
    CL_Required_fields_are_marked_with_a_red_asterisk,
    CL_Optional_fields_show_a_lavender_tint_with_an_Optional_label,
    CL_Use_the_AI_Feedback_button_under_long_text_answers,
    CL_You_can_switch_between_English_Spanish_and_Portuguese_anytime,
    CL_Need_help,
    CL_Email,
    CL_Email_grants_portal_wadhwani_charitable_org,
    CL_Response_time,
    CL_Response_time_Within_2_business_days,
    CL_Languages_English_Spanish_Portuguese,
    CL_What_You_ve_Delivered_financials_and_outcomes,
    CL_Why_Wadhwani_Charitable_Foundation_your_direction,

    // ── Page 1: About Your Organisation ──────────────────────────────────
    CL_Section_1_of_5,
    CL_Tell_us_who_you_are_We_use_this_section_to_understand_your_organisation_s_st,
    CL_Select_the_option_that_best_describes_your_organisation_focus,
    CL_Where_do_you_operate_List_all_states_provinces_regions,
    CL_Who_is_filling_out_this_form_You_ll_be_the_initial_point_of_contact_for_your,
    CL_Tell_us_how_your_organisation_is_legally_constituted_and_where_it_s_registere,
    CL_Type,
    CL_Registration_Jurisdiction,
    CL_Incorporation_Date,
    CL_Explanation_Helper,
    CL_Fiscal_Year_End_Date,
    CL_When_does_your_fiscal_year_close_This_helps_us_align_all_financial_and_outco,
    CL_Top_3_Most_Prominent_Funders,
    CL_Optionally_share_up_to_three_of_your_most_prominent_funders_the_backers_wh,
    CL_FUNDER_1,
    CL_FUNDER_2,
    CL_FUNDER_3,
    CL_Funder_Name,
    CL_Funding_Period_Start,
    CL_Funding_Period_End,
    CL_Funding_Type,
    CL_You_may_add_up_to_3_funders,
    CL_References_for_Outreach,
    CL_Optionally_share_1_2_contacts_who_can_speak_to_your_organisation_s_work,
    CL_These_contacts_may_be_approached_by_Wadhwani_Charitable_Foundation_during_ev,
    CL_REFERENCE_1,
    CL_REFERENCE_2,
    CL_Name,
    CL_Organisation_Role,

    // ── Page 2/3: What You Do ─────────────────────────────────────────────
    CL_Section_2_of_5,
    CL_What_You_Do,
    CL_Tell_us_about_your_skilling_work_your_top_programmes_your_theory_of_change,
    CL_Your_Skilling_Approach,
    CL_Tell_us_about_your_skilling_work_in_roughly_500_words_If_you_run_named_progr,
    CL_Skilling_Domains_Offered,
    CL_List_the_skilling_domains_your_organisation_offers_For_each_give_us_the_typ,
    CL_DOMAIN_1,
    CL_Domain_Programme_Name,
    CL_Hours_of_Training,
    CL_Duration_Months,
    CL_When_Programme_Started,
    CL_Yearly_Enrolment,
    CL_What_You_Do_your_programmes_and_approach,
    CL_Tell_us_about_your_job_creation_work_in_roughly_500_words_Cover_i_your_sup,
    CL_Your_Job_Creation_Approach,
    CL_List_the_business_sectors_in_which_you_support_entrepreneurs_MSMEs_For_eac,
    CL_SECTOR_1,
    CL_When_Did_Support_Begin,
    CL_Type_of_Support_Provided,
    CL_Select_all_that_apply,

    // ── Page 4: What You've Delivered ────────────────────────────────────
    CL_Section_3_of_5,
    CL_What_You_ve_Delivered,
    CL_Your_three_year_financial_track_record_current_year_picture_sustainability,
    CLL_Enter_your_historical_figures_across_the_three_prior_fiscal_years_Starting,
    CL_Historical_Financial_Data,
    CL_Item,
    CL_FY_1,
    CL_FY_2,
    CL_FY_3,
    CL_Earliest_Year_Only,
    CL_Balance_at_End_of_Year,
    CL_You_enter_7_numbers_1_start_balance_3_revenues_3_expenses_the_remainin,
    CL_Your_current_fiscal_year_budget_latest_projection_and_explanation_of_any_de,
    CL_Projection,
    CL_Deviation_auto_computed_Projection_Budget,
    CL_Job_Fulfilment_Outcomes_Last_3_Fiscal_Years_Actuals,
    CL_Enter_your_enrolment_and_placement_actuals_across_the_three_most_recent_fisca,
    CL_Learner_Enrolments,
    CL_Do_you_have_third_party_verified_data_for_your_placement_outcomes,
    CL_Job_Fulfilment_Outcomes_Current_FY_Projections,
    CL_Enter_your_projected_enrolment_and_placement_numbers_for_the_current_fiscal_y,
    CL_Placement,
    CL_Job_Creation_Outcomes_Last_3_Fiscal_Years_Actuals,
    CL_Enter_your_business_creation_and_job_creation_actuals_across_the_three_most_r,
    CL_New_Businesses_Started,
    CL_Jobs_from_New_Businesses,
    CL_Jobs_from_Existing_Businesses,
    CL_Total_Avg_Cost_per_Job_Created,
    CL_Do_you_have_third_party_verified_data_for_your_job_creation_outcomes,
    CL_Upload_verification_report,
    CL_Job_Creation_Outcomes_Current_FY_Projections,
    CL_Projected_business_and_job_creation_numbers_for_the_current_fiscal_year_Thes,
    CL_Existing_Businesses_Supported,

    // ── Page 6: Why WCF / GenieAI ────────────────────────────────────────
    CL_Section_4_of_5,
    CL_WCF1,
    CL_Deploy_meaningful,
    CL_GenieAI_Skilling_Platform_Product_Demo,
    CL_GenieAI_for_Entrepreneurship_Overview_Video,
    CL_GenieAI_is_Wadhwani_Foundation_s_AI_platform_for_skilling_entrepreneurship,
    CL_Operational_Synergies_GenieAI,
    CL_Q20_a_Interest_level_Optional,
    CL_Interest_Level,
    CL_How_could_GenieAI_contribute,
    

    // ── Page 7: Review & Submit ───────────────────────────────────────────
    CL_Section_5_of_5,
    CL_Review_Submit,
    CL_Take_a_final_look,
    CL_Why_Wadhwani_Charitable_Foundation,
    CL_Jobs_from_Growing_Businesses,
    CL_Attesting_User_Name,
    CL_Attesting_User_Title,
    CL_Download_as_PDF,

    // ── Special alias fixes ───────────────────────────────────────────────
    yes_no: CL_Yes_No,                          // HTML uses {labels.yes_no}
    CL_Balance_at_End_of_Year: CL_Balance_at_End_of_Year,
    CL_Capital_Expenditure,
CL_Capital_Expenditure_Help,
CL_Operating_Expenditure,
CL_Operating_Expenditure_Help,
    };
       

    @track organizationData = {
        FundingOpportunityId: '',
        Leader_Tenure__c: '',
        Organizational_Area_s_for_Funding_Inves__c: '', 
        Organization_Name__c: '',
        Headquarters_City_and_Country__c: '',
        Primary_Service_Regions__c: '',
        Leader_Name__c: '',
        Leader_Title__c: '',
        Submitter_Name__c: '',
        Job_Title__c: '',
        Work_Email_ID__c: '',
        WG_Phone_Country_Code__c: '',
        Phone__c: '',
        Legal_Structure__c: '',
        Current_fiscal_year_s_end_date__c: '',
        Organizational_Sustainability__c: '',
        Use_of_Additional_Funding__c: '',
        Operational_Synergies_with_WOF__c: '',
        Use_of_Additional_Funding_JC__c: '',
        Operational_Synergies_with_WOF_JC__c: '',
        Operational_Synergies_with_WOF_Both__c: '',
        Language__c: '',
        GenieAI_Interest_Level__c: '',
Attesting_User_Name__c: '',
Attesting_User_Title__c: '',
Legal_Type__c: '',
Legal_Type_Other__c: '',
Registration_Jurisdiction__c: '',
Registration_Jurisdiction_Other__c: '',
Incorporation_Date__c: '',
Funder_1_Name__c: '',
Funder_1_Amount__c: '',
Funder_1_Period_Start__c: '',
Funder_1_Period_End__c: '',
Funder_1_Type__c: '',
Funder_2_Name__c: '',
Funder_2_Amount__c: '',
Funder_2_Period_Start__c: '',
Funder_2_Period_End__c: '',
Funder_2_Type__c: '',
Funder_3_Name__c: '',
Funder_3_Amount__c: '',
Funder_3_Period_Start__c: '',
Funder_3_Period_End__c: '',
Funder_3_Type__c: '',
Business_Sectors_JSON__c: '',
Skilling_Approach__c: '',
Job_Creation_Approach__c: '',
Last_Page__c: null
    };

@track historicalData = {
        CY1_Balance_Start_CFY_1__c: '',
        CY2_Balance_Start_CFY_2__c: '',
        CY3_Balance_Start_CFY_3__c: '',
        CY1_Revenue__c: '',
        CY2_Revenue__c: '',
        CY3_Revenue__c: '',
        CY1_Capital_Expenditure__c: '',
        CY2_Capital_Expenditure__c: '',
        CY3_Capital_Expenditure__c: '',
        CY1_Operating_Expenditure__c: '',
        CY2_Operating_Expenditure__c: '',
        CY3_Operating_Expenditure__c: '',
        CY1_Expense__c: '',
        CY2_Expense__c: '',
        CY3_Expense__c: '',
        CY1_Balance_End__c: '',
        CY2_Balance_End__c: '',
        CY3_Balance_End__c: '',

    }
    @track fiscalData ={
        Revenue_Budget__c: '',
        Revenue_Projection__c: '',
        Revenue_Variance__c: '',
        Revenue_Explanation__c: '',
       Capital_Expenditure_Budget__c: '',
Capital_Expenditure_Projection__c: '',
Capital_Expenditure_Variance__c: '',
Operating_Expenditure_Budget__c: '',
Operating_Expenditure_Projection__c: '',
Operating_Expenditure_Variance__c: '',
        Net_Budget__c: '', // Formula: Revenue - Expense (readonly)
        Net_Projection__c: '', // Formula: Revenue - Expense (readonly)
        Net_Variance__c: '', // Formula: Revenue - Expense (readonly)
        Net_Position_Explanation__c: '',
    }
   @track outcomeData = {
    Skills_Duration_CFY__c: '',
    Skills_Duration_FY_1__c: '',
    Skills_Duration_FY_2__c: '',
    Skills_Duration_FY_3__c: '',
  /*  Projected_Learner_Enrollments_CFY_NA__c: false,
    Projected_Learner_Enrollments_FY_1_NA__c: false,
    Projected_Learner_Enrollments_FY_2_NA__c: false,
    Projected_Learner_Enrollments_FY_3_NA__c: false, */
    Projected_Learner_Enrollments_CFY__c: '',
    Projected_Learner_Enrollments_FY_1__c: '',
    Projected_Learner_Enrollments_FY_2__c: '',
    Projected_Learner_Enrollments_FY_3__c: '',
  /*  Projected_Learner_Placements_CFY_NA__c: false,
    Projected_Learner_Placements_FY_1_NA__c: false,
    Projected_Learner_Placements_FY_2_NA__c: false,
    Projected_Learner_Placements_FY_3_NA__c: false, */
    Projected_Learner_Placements_CFY__c: '',
    Projected_Learner_Placements_FY_1__c: '',
    Projected_Learner_Placements_FY_2__c: '',
    Projected_Learner_Placements_FY_3__c: '',
    Projected_Learner_placement_CFY__c: '',
    Projected_Learner_placement_FY_1__c: '',
    Projected_Learner_placement_FY_2__c: '',
    Projected_Learner_placement_FY_3__c: '',
    Placements_Supporting_Family_of_4_CFY__c: '',
    Placements_Supporting_Family_of_4_FY_1__c: '',
    Placements_Supporting_Family_of_4_FY_2__c: '',
    Placements_Supporting_Family_of_4_FY_3__c: '',
    Avg_Cost_per_Placement_CFY__c: '',
    Avg_Cost_per_Placement_FY_1__c: '',
    Avg_Cost_per_Placement_FY_2__c: '',
    Avg_Cost_per_Placement_FY_3__c: '',
    X3rd_Party_Placement_Verification_CFY__c: '',
    X3rd_Party_Verification_Description_CFY__c: '',
    X3rd_Party_Placement_Verification_FY_1__c: '',
    X3rd_Party_Verification_Description_FY_1__c: '',
    X3rd_Party_Placement_Verification_FY_2__c: '',
    X3rd_Party_Verification_Description_FY_2__c: '',
    X3rd_Party_Placement_Verification_FY_3__c: '',
    X3rd_Party_Verification_Description_FY_3__c: '',
    Long_Term_Outcomes_CFY__c: '',
    Outcome_Tracking_Details_CFY__c: '',
    Long_Term_Outcomes_FY_1__c: '',
    Outcome_Tracking_Details_FY_1__c: '',
    Long_Term_Outcomes_FY_2__c: '',
    Outcome_Tracking_Details_FY_2__c: '',
    Long_Term_Outcomes_FY_3__c: '',
    Outcome_Tracking_Details_FY_3__c: '',
    // Page 5 - Job Creation Fields
Target_Business_Sectors_CFY__c: '',
Target_Business_Sectors_FY_1__c: '',
Target_Business_Sectors_FY_2__c: '',
Target_Business_Sectors_FY_3__c: '',
Projected_New_Businesses_CFY__c: '',
Projected_New_Businesses_FY_1__c: '',
Projected_New_Businesses_FY_2__c: '',
Projected_New_Businesses_FY_3__c: '',
Projected_Jobs_from_New_Businesses_CFY__c: '',
Projected_Jobs_from_New_Businesses_FY1__c: '',
Projected_Jobs_from_New_Businesses_FY2__c: '',
Projected_Jobs_from_New_Businesses_FY3__c: '',
//Jobs_Supporting_Family_of_4_CFY__c: '',
//Jobs_Supporting_Family_of_4_FY_1__c: '',
//Jobs_Supporting_Family_of_4_FY_2__c: '',
//Jobs_Supporting_Family_of_4_FY_4__c: '',
Growing_Businesses_Supported_CFY__c: '',
Growing_Businesses_Supported_FY_1__c: '',
Growing_Businesses_Supported_FY_2__c: '',
Growing_Businesses_Supported_FY_3__c: '',
Jobs_from_Growing_Businesses_CFY__c: '',
Jobs_from_Growing_Businesses_FY_1__c: '',
Jobs_from_Growing_Businesses_FY_2__c: '',
Jobs_from_Growing_Businesses_FY_3__c: '',
Jobs_Supporting_Family_CFY__c: '',
Jobs_Supporting_Family_FY_1__c: '',
Jobs_Supporting_Family_FY_2__c: '',
Jobs_Supporting_Family_FY_3__c: '',
Avg_Cost_per_Job_CFY__c: '',
Avg_Cost_per_Job_FY_1__c: '',
Avg_Cost_per_Job_FY_2__c: '',
Avg_Cost_per_Job_FY_3__c: '',
Job_Verification_3rd_Party_CFY__c: '',
Job_Verification_3rd_Party_FY1__c: '',
Job_Verification_3rd_Party_FY2__c: '',
Job_Verification_3rd_Party_FY3__c: '',
X3rd_party_verification_details_CFY__c: '',
X3rd_party_verification_details_FY1__c: '',
X3rd_party_verification_details_FY2__c: '',
X3rd_party_verification_details_FY3__c: '',
// Manual input fields (user types these)
    Manual_Avg_Cost_per_Placement_CFY__c: '',
    Manual_Avg_Cost_per_Placement_FY_1__c: '',
    Manual_Avg_Cost_per_Placement_FY_2__c: '',
    Manual_Avg_Cost_per_Placement_FY_3__c: '',
    Manual_Avg_Cost_per_Job_CFY__c: '',
    Manual_Avg_Cost_per_Job_FY_1__c: '',
    Manual_Avg_Cost_per_Job_FY_2__c: '',
    Manual_Avg_Cost_per_Job_FY_3__c: '',



};

@track isOutcomeModalOpen = false;
@track activeOutcomeField = '';
@track activeOutcomeValue = '';
@track isModalOpen = false;
@track modalTarget = '';
@track modalField = '';
@track modalValue = '';
yesLabelMap = {};

    @track fundingOptions = [];
    selectedFundingArea = '';
    @track isFeedbackMinimized = false;

    @track showAiFeedback = false;
    currentField = '';

@track isExplanationModalOpen = false;
@track activeExplanationField = '';
@track activeExplanationValue = '';

@track organizationalAreaValues = [];
@track phoneCountryCodeOptions = [];
@track picklist3rdPartyCFY = [];
@track picklist3rdPartyFY1 = [];
@track picklist3rdPartyFY2 = [];
@track picklist3rdPartyFY3 = [];

@track picklistLongTermCFY = [];
@track picklistLongTermFY1 = [];
@track picklistLongTermFY2 = [];
@track picklistLongTermFY3 = [];

@track picklistJob3rdPartyCFY = [];
@track picklistJob3rdPartyFY1 = [];
@track picklistJob3rdPartyFY2 = [];
@track picklistJob3rdPartyFY3 = [];

// MISSING in resumeDraftWcfForm:
_scriptsInitiated = false;
@track isJsLoaded = false;
logoBase64 = null;

supportedAiFields = ['Legal_Structure__c', 'Organizational_Sustainability__c', 'Use_of_Additional_Funding__c',
'Operational_Synergies_with_WOF__c', 'Use_of_Additional_Funding_JC__c', 'Operational_Synergies_with_WOF_JC__c',
'Operational_Synergies_with_WOF_Both__c'];
// Expected national significant number length per dial code.
// Values are approximate/common ranges — adjust to match your actual applicant base.
PHONE_LENGTH_BY_COUNTRY_CODE = {
    '+1':   { min: 10, max: 10, example: '2025551234' },   // US/Canada
    '+20':  { min: 9,  max: 10, example: '1001234567' },   // Egypt
    '+234': { min: 10, max: 10, example: '8031234567' },   // Nigeria
    '+27':  { min: 9,  max: 9,  example: '821234567' },    // South Africa
    '+31':  { min: 9,  max: 9,  example: '612345678' },    // Netherlands
    '+33':  { min: 9,  max: 9,  example: '612345678' },    // France
    '+34':  { min: 9,  max: 9,  example: '612345678' },    // Spain
    '+39':  { min: 9,  max: 10, example: '3123456789' },   // Italy
    '+41':  { min: 9,  max: 9,  example: '781234567' },    // Switzerland
    '+44':  { min: 10, max: 10, example: '7123456789' },   // UK
    '+49':  { min: 7,  max: 11, example: '15123456789' },  // Germany (variable)
    '+52':  { min: 10, max: 10, example: '5512345678' },   // Mexico
    '+54':  { min: 10, max: 11, example: '91123456789' },  // Argentina
    '+55':  { min: 10, max: 11, example: '11987654321' },  // Brazil
    '+60':  { min: 9,  max: 10, example: '123456789' },    // Malaysia
    '+61':  { min: 9,  max: 9,  example: '412345678' },    // Australia
    '+63':  { min: 10, max: 10, example: '9171234567' },   // Philippines
    '+64':  { min: 8,  max: 10, example: '211234567' },    // New Zealand
    '+65':  { min: 8,  max: 8,  example: '81234567' },     // Singapore
    '+7':   { min: 10, max: 10, example: '9123456789' },   // Russia/Kazakhstan
    '+81':  { min: 10, max: 10, example: '9012345678' },   // Japan
    '+82':  { min: 9,  max: 10, example: '1012345678' },   // South Korea
    '+86':  { min: 11, max: 11, example: '13123456789' },  // China
    '+91':  { min: 10, max: 10, example: '9812345678' },   // India
    '+966': { min: 9,  max: 9,  example: '512345678' },    // Saudi Arabia
    '+971': { min: 9,  max: 9,  example: '501234567' },    // UAE
};

_extractDialCode(countryCodeValue) {
    if (!countryCodeValue) return null;
    const match = String(countryCodeValue).match(/^\+\d+/);
    return match ? match[0] : null;
}
_currentDialCode() {
    if (!this._phoneIti) return '';
    const d = this._phoneIti.getSelectedCountryData();
    return (d && d.dialCode) ? '+' + d.dialCode : '';
}

// Returns the national significant number: digits only, trunk prefix removed.
// setNumber() re-renders in NATIONAL format, which re-introduces the leading "0"
// for IN/GB/AU/NL etc. Normalising here keeps display, storage and the length
// rule in PHONE_LENGTH_BY_COUNTRY_CODE in sync.
_normalizeNationalNumber(raw, dialCode) {
    if (raw === null || raw === undefined) return '';
    let digits = String(raw).replace(/\D/g, '');
    if (!digits) return '';

    // Defensive: drop a duplicated country code if one ever leaks into the field
    const dc = dialCode ? String(dialCode).replace('+', '') : '';
    if (dc && digits.length > dc.length && digits.startsWith(dc)) {
        const rule = this.PHONE_LENGTH_BY_COUNTRY_CODE[dialCode];
        const rest = digits.slice(dc.length);
        if (!rule || rest.length >= rule.min) digits = rest;
    }

    // A national significant number never legitimately starts with 0
    return digits.replace(/^0+/, '');
}
_bumpFileUploadKey(cellKey) {
    const keys = { ...this.fileUploadRenderKeys };
    keys[cellKey] = (keys[cellKey] || 0) + 1;
    this.fileUploadRenderKeys = keys;
}
get p4FY1PVUploadSlots() { return [{ key: `P4_FY1_PV-${this.fileUploadRenderKeys['P4_FY1_PV'] || 0}` }]; }
get p5FY1JVUploadSlots() { return [{ key: `P5_FY1_JV-${this.fileUploadRenderKeys['P5_FY1_JV'] || 0}` }]; }
get q21UploadSlots()     { return [{ key: `Q21-${this.fileUploadRenderKeys['Q21'] || 0}` }]; }
// ── Phone: intl-tel-input (flagTelpicker) ──────────────────────────
// Loads the library once, then initialises the picker whenever the phone
// input is on screen and tears it down when the page changes. The picker
// writes back into the existing Phone__c / Phone_Country_Code__c fields so
// all downstream validation / save / submit / review stays unchanged.
_managePhoneIti() {
    if (!this._phoneScriptsLoaded) {
        this._phoneScriptsLoaded = true;
        Promise.all([
            loadStyle(this,  flagTelpicker + '/css/intlTelInput.css'),
            loadScript(this, flagTelpicker + '/js/utils.js'),
            loadScript(this, flagTelpicker + '/js/intlTelInput.js')
        ])
        .then(() => this._managePhoneIti())
        .catch(err => console.error('flagTelpicker load error', err));
        return;
    }
    if (typeof window.intlTelInput !== 'function') return;

    const input = this.template.querySelector('input[data-id="phone"]');
    if (input && !this._phoneItiInitialized) {
        this._initPhoneIti(input);
    } else if (!input && this._phoneItiInitialized) {
        this._destroyPhoneIti();
    }
}

_initPhoneIti(input) {
    const storedDial = this._extractDialCode(this.organizationData.WG_Phone_Country_Code__c);

    this._phoneIti = window.intlTelInput(input, {
        separateDialCode:   true,
        showFlags:          false,
        excludeCountries:   ['il'],
        initialCountry:     'in',
        preferredCountries: ['in', 'us', 'gb', 'ae', 'sg', 'au'],
        utilsScript:        flagTelpicker + '/js/utils.js',
        customPlaceholder:  (ph) => (ph && ph.startsWith('0')) ? ph.slice(1).trim() : ph
    });

    const wrapper = input.closest('.iti');
    if (wrapper) wrapper.style.width = '100%';
    this._applyItiScopeToken(input);
// re-measure the dial-code width now that our scoped CSS is in effect
if (typeof this._phoneIti._updateInputPadding === 'function') {
    this._phoneIti._updateInputPadding();
}

    // Prefill from previously saved values (draft / navigation return).
    // Always populate the input when a number exists, so the sync below
    // never wipes a saved number.
   // ── REPLACE WITH ──
const national = this.organizationData.Phone__c;
if (national) {
    if (storedDial) {
        // setNumber also selects the right country from the dial code
        try { this._phoneIti.setNumber(storedDial + national); }
        catch (e) { /* fall through to the normalise step below */ }
    }
    // Undo the NATIONAL-format trunk prefix the library just inserted
    input.value = this._normalizeNationalNumber(
        input.value || national,
        storedDial || this._currentDialCode()
    );
}

this._onPhoneCountryChange = () => this._syncPhoneFromIti(input, false, true);
input.addEventListener('countrychange', this._onPhoneCountryChange);

this._phoneItiInitialized = true;
this._syncPhoneFromIti(input, true, true);
}

_destroyPhoneIti() {
    const input = this.template.querySelector('input[data-id="phone"]');
    if (input && this._onPhoneCountryChange) {
        input.removeEventListener('countrychange', this._onPhoneCountryChange);
    }
    if (this._phoneIti) {
        try { this._phoneIti.destroy(); } catch (e) { /* ignore */ }
    }
    this._phoneIti = null;
    this._phoneItiInitialized = false;
    this._onPhoneCountryChange = null;
}

_syncPhoneFromIti(input, skipUnsavedFlag, normalizeDisplay) {
    if (!this._phoneIti || !input) return;
    const data = this._phoneIti.getSelectedCountryData();
    const dial = (data && data.dialCode) ? '+' + data.dialCode : '';

    const national = this._normalizeNationalNumber(input.value, dial);

    // Only rewrite what the user sees on init / country change — never mid-typing,
    // which would fight the caret position.
    if (normalizeDisplay && input.value !== national) {
        input.value = national;
    }

    this.organizationData.WG_Phone_Country_Code__c = dial;
    this.organizationData.Phone__c = national;
    if (!skipUnsavedFlag) this.hasUnsavedChanges = true;

    this.phoneNumberError = national
        ? (this._validatePhoneField(national, dial) || '')
        : '';

    if (!this.phoneNumberError) {
        const phoneEl = this.template.querySelector('[data-id="phone"]');
        if (phoneEl) {
            this._invalidElements = this._invalidElements.filter(x => x !== phoneEl);
        }
    }
}

WORD_LIMITS = {
    Legal_Structure__c:               100,
    Skilling_Approach__c:             500,
    Job_Creation_Approach__c:         500,
    Organizational_Sustainability__c: 100,
    Use_of_Additional_Funding__c:     500,
     Use_of_Additional_Funding_JC__c: 500,  // ← ADD THIS
    Revenue_Explanation__c:           200,
    Expense_Explanation__c:           200,
    Net_Position_Explanation__c:      200,
};

_updateWordCounter(field, count) {
    const limit = this.WORD_LIMITS[field]
        ?? (field === this.operationalSynergiesFieldApi ? 200 : null);

    if (field === 'Legal_Structure__c')               this.legalStructureWordCount         = count;
    if (field === 'Skilling_Approach__c')             this.skillingApproachWordCount       = count;
    if (field === 'Job_Creation_Approach__c')         this.jcApproachWordCount             = count;
    if (field === 'Organizational_Sustainability__c') this.sustainabilityWordCount         = count;
    if (field === 'Use_of_Additional_Funding__c' ||
        field === 'Use_of_Additional_Funding_JC__c')  this.additionalFundingWordCount      = count;
    if (field === this.operationalSynergiesFieldApi)  this.synergiesWordCount              = count;
    if (field === 'Revenue_Explanation__c')           this.revenueExplanationWordCount     = count;
    if (field === 'Expense_Explanation__c')           this.expenseExplanationWordCount     = count;
    if (field === 'Net_Position_Explanation__c')      this.netPositionExplanationWordCount = count;
}
_showFieldError(fieldName, message) {
    const el = this.template.querySelector(`[data-field="${fieldName}"]`);
    if (el) el.classList.add('richtext-invalid');
    this._registerInvalid(el);
    const errEl = this.template.querySelector(`[data-error="${fieldName}"]`);
    if (errEl) {
        errEl.textContent = message;
        errEl.style.display = 'block';
    }
}
_invalidElements = [];

_registerInvalid(el) {
    if (el && !this._invalidElements.includes(el)) this._invalidElements.push(el);
}

_resetInvalidTracking() {
    this._invalidElements = [];
}

// Finds the visually highest error on the page and scrolls to it.
// Delayed so LWC has re-rendered any reactively-shown error nodes first.
_scrollToFirstError() {
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
        const marked = Array.from(this.template.querySelectorAll(
            '.richtext-invalid, .invalid-field, .richtext-overlimit, ' +
            '.input-error, .chips-error, .file-upload-error'
        ));
        
      const messages = Array.from(this.template.querySelectorAll(
    '.q1-error-msg, .error-msg, .file-error-msg, .phone-error-msg, .field-error-msg, ' +
    '.inline-date-error-msg, .sector-date-error-msg, .word-limit-warning--over'
        )).filter(el =>
            el.offsetParent !== null &&
            el.style.display !== 'none' &&
            (el.textContent || '').trim() !== ''
        );

        const all = [...this._invalidElements, ...marked, ...messages]
            .filter(el => el && el.isConnected && el.offsetParent !== null);

        if (all.length === 0) return;

        let target = all[0];
        let minTop = target.getBoundingClientRect().top;
        all.forEach(el => {
            const t = el.getBoundingClientRect().top;
            if (t < minTop) { minTop = t; target = el; }
        });
        
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (typeof target.focus === 'function') {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => { try { target.focus(); } catch (e) { /* noop */ } }, 400);
        }
    }, 60);
}
_clearFieldError(fieldName) {
    const el = this.template.querySelector(`[data-field="${fieldName}"]`);
    if (el) el.classList.remove('richtext-invalid', 'invalid-field', 'richtext-overlimit'); // ← ADD
    this._invalidElements = this._invalidElements.filter(x => x !== el);

    const errEl = this.template.querySelector(`[data-error="${fieldName}"]`);
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
}
_clearAllInlineErrors() {
    // dynamically injected messages
    this.template.querySelectorAll('.field-error-msg, .inline-date-error-msg')
        .forEach(el => { el.textContent = ''; el.style.display = 'none'; });

    // static <p class="error-msg" data-error="..."> nodes
    this.template.querySelectorAll('p.error-msg')
        .forEach(el => { el.textContent = ''; el.style.display = 'none'; });

    const q1 = this.template.querySelector('.q1-error-msg');
    if (q1) q1.style.display = 'none';

    this.template.querySelectorAll(
        '.input-error, .invalid-field, .richtext-invalid, .richtext-overlimit, .chips-error'
    ).forEach(el => el.classList.remove(
        'input-error', 'invalid-field', 'richtext-invalid', 'richtext-overlimit', 'chips-error'
    ));

    this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea')
        .forEach(el => { if (el.setCustomValidity) { el.setCustomValidity(''); } });

    this.phoneNumberError = '';
    this.invalidFileCells = {};
    this._invalidElements = [];
}

// ─── Headquarters City/Country search (OpenStreetMap) ──────────────
get hqHasResults() {
    return this.hqResults && this.hqResults.length > 0;
}

get hqNoResults() {
    return this.hqShowNoResults
        && !this.hqIsLoading
        && this.hqResults.length === 0
        && this.hqSearchKey.length > 1;
}

// Keep the search-query state in sync with a stored value (draft resume)
_initHQFromData() {
    this.hqSearchKey = this.organizationData.Headquarters_City_and_Country__c || '';
}

handleHQFocus() {
    if (this.hqSearchKey && this.hqSearchKey.length > 1 && this.hqResults.length > 0) {
        this.hqResults = [...this.hqResults];
    }
}

handleHQBlur() {
    // Small delay so a click on a dropdown item fires first
    setTimeout(() => {
        this.hqResults = [];
        this.hqShowNoResults = false;
    }, 200);
}

handleHQChange(event) {
    const val = event.target.value;
    this.hqSearchKey = val;
    this.hqShowNoResults = false;

    // Store the typed text straight into the single mapped field
    this._setHQValue(val);

    window.clearTimeout(this.hqDelayTimeout);

    if (!val || val.trim().length === 0) {
        this.hqResults = [];
        this.hqIsLoading = false;
        return;
    }

    if (val.trim().length > 1) {
        this.hqIsLoading = true;
        this.hqDelayTimeout = setTimeout(() => {
            this.fetchHQLocations();
        }, 300);
    } else {
        this.hqResults = [];
    }
}

async fetchHQLocations() {
    try {
        const response = await searchHQLocation({ query: this.hqSearchKey });
        const data = JSON.parse(response);

        const seen = new Set();
        const tempResults = [];

        // Match against the city portion (text before the first comma)
        const typed = this.hqSearchKey.split(',')[0].toLowerCase().trim();

        (data.features || []).forEach(feature => {
            const props = feature.properties || {};

            const cityName = props.name || props.city;
            const state    = props.state || '';
            const country  = props.country || '';

            if (!cityName) return;

            if (!cityName.toLowerCase().startsWith(typed) &&
                !cityName.toLowerCase().includes(typed)) {
                return;
            }

            const value      = [cityName, state, country].filter(Boolean).join(', ');
            const subDisplay = [state, country].filter(Boolean).join(', ');

            if (!seen.has(value)) {
                seen.add(value);
                tempResults.push({
                    label: cityName,
                    subDisplay: subDisplay,
                    display: value,
                    value: value,
                    country: country
                });
            }
        });

        this.hqResults = tempResults;
        this.hqShowNoResults = tempResults.length === 0;

    } catch (error) {
        console.error('Error fetching HQ locations:', error);
        this.hqResults = [];
        this.hqShowNoResults = true;
    } finally {
        this.hqIsLoading = false;
    }
}

handleHQSelect(event) {
    const label   = event.currentTarget.dataset.label;
    const country = event.currentTarget.dataset.country || '';

    // Store as "City, Country" in the single field
    const val = [label, country].filter(Boolean).join(', ');
    this.hqSearchKey     = val;
    this.hqResults       = [];
    this.hqShowNoResults = false;

    this._setHQValue(val);
}

// Map the value into the bound field and run the existing validation
_setHQValue(val) {
    this.hasUnsavedChanges = true;
    this.organizationData.Headquarters_City_and_Country__c = val;

    const err = val ? this._validateHQCityCountry(val) : null;
    if (err) {
        this._showLightningError('Headquarters_City_and_Country__c', err);
    } else {
        this._clearLightningError('Headquarters_City_and_Country__c');
        if (val) this._clearFieldError('Headquarters_City_and_Country__c');
    }
}
_validateNumericInput(field, value, label) {
    if (value === '' || value === null || value === undefined) return true;
    const n = Number(value);
    if (isNaN(n)) {
        this._showLightningError(field, `${label} must be a number.`);
        return false;
    }
    if (n < 0) {
        this._showLightningError(field, `${label} cannot be negative.`);
        return false;
    }
    this._clearLightningError(field);
    return true;
}
get isPage0() {
    return this.currentPage === 0;
}

get isPage7() {
    return this.currentPage === 7;
}

get isSubmitDisabled() {
    return !this.isAttested;
}

get showSynergiesTextBox() {
    const v = this.organizationData.GenieAI_Interest_Level__c;
    return v === 'Yes, interested' || v === 'Maybe, want to learn more';
}

get showJFWhatYouDo() {
    return this.selectedFundingArea === 'Job Fulfillment Only' ||
           this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
}

get isEmailLocked() {
    return !!this._verifiedEmail
        && this.organizationData.Work_Email_ID__c === this._verifiedEmail;
}
get showJCOrBothWhatYouDo() {
    return this.selectedFundingArea === 'Job Creation Only' ||
           this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
}
get showBothWhatYouDo() {
     return this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
 }
get whatYouDoIntro() {
    // Order matters: showJCOrBothWhatYouDo is also true for "Both"
    if (this.showBothWhatYouDo) {
        return this.labels
            .CL_Tell_us_about_your_work_in_both_skilling_Job_Fulfilment_and_entrepreneurshi;
    }
    if (this.showJCOrBothWhatYouDo) {
        return this.labels.CL_Tell_us_about_your_job_creation_work;
    }
    return this.labels
        .CL_Tell_us_about_your_skilling_work_your_top_programmes_your_theory_of_change;
}

get showBothJCQuestions() {
    return this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
}

get showJFOutcomes() {
    return this.selectedFundingArea === 'Job Fulfillment Only' ||
           this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
}

get showJCOutcomes() {
    return this.selectedFundingArea === 'Job Creation Only' ||
           this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
}

get showCFYExplanation() {
    const rBudget   = Number(this.fiscalData.Revenue_Budget__c) || 0;
    const capBudget = Number(this.fiscalData.Capital_Expenditure_Budget__c) || 0;
    const opBudget  = Number(this.fiscalData.Operating_Expenditure_Budget__c) || 0;

    const rPct   = rBudget   ? Math.abs((Number(this.fiscalData.Revenue_Variance__c)||0) / rBudget) * 100   : 0;
    const capPct = capBudget ? Math.abs((Number(this.fiscalData.Capital_Expenditure_Variance__c)||0) / capBudget) * 100 : 0;
    const opPct  = opBudget  ? Math.abs((Number(this.fiscalData.Operating_Expenditure_Variance__c)||0) / opBudget) * 100  : 0;

    const THRESHOLD = 10; // flip to 20 here if the team wants to loosen it
    return rPct > THRESHOLD || capPct > THRESHOLD || opPct > THRESHOLD;
}
get formattedFundingOptions() {
     const LABEL_OVERRIDE_MAP = {
        'Job Fulfillment Only': this.labels.CL_Job_Fulfillment_Only,
        'Job Creation Only': this.labels.CL_Job_Creation_Only,
        'Both Job Fulfillment and Job Creation': this.labels.CL_Both_Job_Fulfillment_and_Job_Creation
    };
    return (this.organizationalAreaValues || []).map(option => {
        let description = '';

        if (option.value.includes('Both')) {
            description = this.labels.CL_Operating_across_both_skilling_and_entrepreneurship;
        } else if (option.value.includes('Fulfillment')) {
            description = this.labels.CL_Display_Box1;
        } else if (option.value.includes('Creation')) {
            description = this.labels.CL_Display_Box2;
        }

        return {
            ...option,
             label: LABEL_OVERRIDE_MAP[option.value] || option.label, // ← swap display text only
            description,
            isSelected: this.selectedFundingArea === option.value,
            className: this.selectedFundingArea === option.value
                ? 'option-card selected'
                : 'option-card'
        };
    });
}
get isFunderLimitReached() {
        return this.showFunder3 === true;

}

get isReferenceLimitReached() {
        return this.showReference2 === true;

}
get funderAddBtnClass() {
    return this.showFunder3 
        ? 'mockup-add-btn mockup-add-btn--disabled' 
        : 'mockup-add-btn';
}

get referenceAddBtnClass() {
    return this.showReference2 
        ? 'mockup-add-btn mockup-add-btn--disabled' 
        : 'mockup-add-btn';
}
get unifiedSkillDomainsIndexed() {
    return this.unifiedSkillDomains.map((row, i) => ({
        ...row,
        idx: i,
        displayIdx: i + 1,
        displayStartDate: this._fmtDateDisplay(row.startDate)
    }));
}
get fiscalMonthOptions() {
    return [
        { label: 'January', value: '01' }, { label: 'February', value: '02' },
        { label: 'March', value: '03' },   { label: 'April', value: '04' },
        { label: 'May', value: '05' },     { label: 'June', value: '06' },
        { label: 'July', value: '07' },    { label: 'August', value: '08' },
        { label: 'September', value: '09' },{ label: 'October', value: '10' },
        { label: 'November', value: '11' },{ label: 'December', value: '12' }
    ];
}

get fiscalDayOptions() {
    const maxDay = this._getDaysInMonth(this.fiscalMonthValue);
    const options = [];
    for (let d = 1; d <= maxDay; d++) {
        const val = String(d).padStart(2, '0');
        options.push({ label: val, value: val });
    }
    return options;
}

_getDaysInMonth(monthStr) {
    if (!monthStr) return 31;
    const year  = new Date().getFullYear();
    const month = parseInt(monthStr, 10);
    return new Date(year, month, 0).getDate();
}

handleFiscalMonthChange(event) {
    this.hasUnsavedChanges = true;
    this.fiscalMonthValue = event.detail.value;

    const maxDay = this._getDaysInMonth(this.fiscalMonthValue);
    if (this.fiscalDayValue && parseInt(this.fiscalDayValue, 10) > maxDay) {
        this.fiscalDayValue = String(maxDay).padStart(2, '0');
    }
    this._updateFiscalYearEndDate();
}

handleFiscalDayChange(event) {
    this.hasUnsavedChanges = true;
    this.fiscalDayValue = event.detail.value;
    this._updateFiscalYearEndDate();
}

_updateFiscalYearEndDate() {
    if (this.fiscalMonthValue && this.fiscalDayValue) {
        const year = new Date().getFullYear();
        this.organizationData.Current_fiscal_year_s_end_date__c =
            `${year}-${this.fiscalMonthValue}-${this.fiscalDayValue}`;
        this.hasUnsavedChanges = true;
    }
}
// ── Computed FY year labels based on Fiscal Year End Date ──────────────
get fiscalEndYear() {
    const dateStr = this.organizationData.Current_fiscal_year_s_end_date__c;
    if (!dateStr) return null;
    const iso = String(dateStr).match(/^(\d{4})-\d{2}-\d{2}/);
    if (iso) return parseInt(iso[1], 10);
    const dt = new Date(dateStr);
    return isNaN(dt.getTime()) ? null : dt.getFullYear();
}
get fyLabel1() {
    return this.fiscalEndYear
        ? `FY-${this.fiscalEndYear - 1}`
        : this.labels.CL_FY_1;
}

get fyLabel2() {
    return this.fiscalEndYear
        ? `FY-${this.fiscalEndYear - 2}`
        : this.labels.CL_FY_2;
}

get fyLabel3() {
    return this.fiscalEndYear
        ? `FY-${this.fiscalEndYear - 3}`
        : this.labels.CL_FY_3;
}
get fyLabelCFY() {
    return this.fiscalEndYear ? `FY-${this.fiscalEndYear} (CFY)` : this.labels.CL_Current_Fiscal_Year;
}
get businessSectorsIndexed() {

   const SUPPORT_TYPE_OPTIONS = [
    { value: 'Capital',            label: this.labels.CL_Capital },
    { value: 'Mentorship',         label: this.labels.CL_Mentorship1 },
    { value: 'Business Advisory',  label: this.labels.CL_Business_Advisory1 },
    { value: 'Market Linkages',    label: this.labels.CL_Market_Linkages1 },
    { value: 'Sector Technical Assistance',          label: this.labels.CL_Sector_TA1 , tooltip: this.labels.CL_Technical_Assistance_Tooltip },
    { value: 'Other',              label: this.labels.CL_Other_1 }
];

 const SECTOR_OPTIONS = [
    { label: '— Select —', value: '' },
    { label: this.labels.CL_Agriculture_and_allied,       value: 'Agriculture and allied' },
    { label: this.labels.CL_Manufacturing,                value: 'Manufacturing' },
    { label: this.labels.CL_Textiles_and_apparel,         value: 'Textiles and apparel' },
    { label: this.labels.CL_Automotive,                   value: 'Automotive' },
    { label: this.labels.CL_Construction_and_real_estate, value: 'Construction and real estate' },
    { label: this.labels.CL_Retail_and_trade,             value: 'Retail and trade' },
    { label: this.labels.CL_IT_and_technology_services,   value: 'IT and technology services' },
    { label: this.labels.CL_Financial_services,           value: 'Financial services' },
    { label: this.labels.CL_Healthcare,                   value: 'Healthcare' },
    { label: this.labels.CL_Education_and_training,       value: 'Education and training' },
    { label: this.labels.CL_Hospitality_and_tourism,      value: 'Hospitality and tourism' },
    { label: this.labels.CL_Logistics_and_transport,      value: 'Logistics and transport' },
    { label: this.labels.CL_Energy_and_environment,       value: 'Energy and environment' },
    { label: this.labels.CL_Media_and_creative,           value: 'Media and creative' },
    { label: this.labels.CL_Other_1,                      value: 'Other' }
];


return this.businessSectors.map((row, i) => ({
    ...row,
    idx: i,
    displayIdx: i + 1,
       displaySupportBegin: this._fmtDateDisplay(row.supportBegin),
    isOtherSector: row.sector === 'Other',
    showSupportTypeOther: (row.supportTypes || []).includes('Other'),   // ← ADD
    sectorOptions: SECTOR_OPTIONS.map(opt => ({
        ...opt,
        isSelected: opt.value === (row.sector || '')
    })),
    supportTypeChips: SUPPORT_TYPE_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
        tooltip: opt.tooltip || '',
        hasTooltip: !!opt.tooltip,
        chipClass: (row.supportTypes || []).includes(opt.value) ? 'sector-chip selected' : 'sector-chip'
    }))
}));
}
// Add these getters to resumeDraftWcfForm.js
// Add these getters for Q17 JC verification
get filesP4JCFY1JVList() { return this.uploadedFilesByCell['P4_JC_FY1_JV'] || []; }
get hasFilesP4JCFY1JV() { return this.filesP4JCFY1JVList.length > 0; }
get isP4JCFY1JVInvalid() { return !!this.invalidFileCells['P4_JC_FY1_JV']; }
get filesForP5FY1JV() {
    return this.uploadedFilesByCell['P5_FY1_JV'] || [];
}

get hasFilesForP5FY1JV() {
    return this.filesForP5FY1JV.length > 0;
}
get progressSteps() {

    let stepDefs;

    if (this.selectedFundingArea === 'Job Creation Only') {

        stepDefs = [
            { label: this.labels.CL_About_Your_Organisation, pages: [1] },
            { label: this.labels.CL_What_You_Do, pages: [2] },
            { label: this.labels.CL_What_You_ve_Delivered, pages: [4] },
            { label: this.labels.CL_WCF1, pages: [6] },
            { label: this.labels.CL_Review_Submit, pages: [7] }
        ];

    } else {

        stepDefs = [
            { label: this.labels.CL_About_Your_Organisation, pages: [1] },
            { label: this.labels.CL_What_You_Do, pages: [2] },
            { label: this.labels.CL_What_You_ve_Delivered, pages: [4] },
            { label: this.labels.CL_WCF1, pages: [6] },
            { label: this.labels.CL_Review_Submit, pages: [7] }
        ];
    }

    const activeIdx = stepDefs.findIndex(
        s => s.pages.includes(this.currentPage)
    );

    const effectiveActive =
        activeIdx === -1
            ? stepDefs.length - 1
            : activeIdx;

    return stepDefs.map((s, i) => ({

        label: s.label,
        number: i + 1,

        isActive: i === effectiveActive,
        isCompleted: i < effectiveActive,

        connectorClass:
            i < stepDefs.length - 1
                ? (
                    i < effectiveActive
                        ? 'tracker-connector tracker-connector--done'
                        : 'tracker-connector'
                  )
                : '',

 bubbleClass:
            i < effectiveActive
                ? 'tracker-bubble tracker-bubble--done'
                : i === effectiveActive
                    ? (this.errorStepActive
                        ? 'tracker-bubble tracker-bubble--active tracker-bubble--error'
                        : 'tracker-bubble tracker-bubble--active')
                    : 'tracker-bubble',
        labelClass:
            i === effectiveActive
                ? 'tracker-label tracker-label--active'
                : 'tracker-label'

    }));
}
get revenueExplanationPreview() {
     console.log('Inside revenueExplanationPreview');
    return this.getFiscalPreview('Revenue_Explanation__c');
}
get expenseExplanationPreview() {
    return this.getFiscalPreview('Expense_Explanation__c');
}
get netExplanationPreview() {
    return this.getFiscalPreview('Net_Position_Explanation__c');
}
// Helper
/*getFiscalPreview(fieldName) {
    const html = this.fiscalData[fieldName] || '';
    const txt = html.replace(/<[^>]+>/g, '');
    if (!txt) return '';
    return txt.length > 35 ? `${txt.substring(0, 35)}…` : txt;
}*/

getFiscalPreview(field) {
    console.log('Inside get Fiscal preview function');
    const html = this.fiscalData[field] || '';
    const txt = html.replace(/<[^>]+>/g, '');
    return txt.length > 35 ? `${txt.substring(0, 35)}…` : txt;
}
get p4FY1PVWrapperClass() {
    return this.isP4FY1PVInvalid ? 'modern-file-upload-wrapper file-upload-error' : 'modern-file-upload-wrapper';
}
get p5FY1JVWrapperClass() {
    return this.isP5FY1JVInvalid ? 'modern-file-upload-wrapper file-upload-error' : 'modern-file-upload-wrapper';
}
// (skillDomainsCFYPreview / FY1 / FY2 / FY3 getters removed — they were unused
// in the template and read from the retired Skills_Duration_* JSON fields.)
get targetBusinessCFYPreview() {
    return this.getOutcomePreview('Target_Business_Sectors_CFY__c');
}
get targetBusinessFY1Preview() {
    return this.getOutcomePreview('Target_Business_Sectors_FY_1__c');
}
get targetBusinessFY2Preview() {
    return this.getOutcomePreview('Target_Business_Sectors_FY_2__c');
}
get targetBusinessFY3Preview() {
    return this.getOutcomePreview('Target_Business_Sectors_FY_3__c');
}
get jobSupportCFYPreview() {
    return this.getOutcomePreview('Jobs_Supporting_Family_CFY__c');
}
get jobSupportFY1Preview() {
    return this.getOutcomePreview('Jobs_Supporting_Family_FY_1__c');
}
get jobSupportFY2Preview() {
    return this.getOutcomePreview('Jobs_Supporting_Family_FY_2__c');
}
get jobSupportFY3Preview() {
    return this.getOutcomePreview('Jobs_Supporting_Family_FY_3__c');
}
get jobVerifyDescCFYPreview() {
    return this.getOutcomePreview('X3rd_party_verification_details_CFY__c');
}
get jobVerifyDescFY1Preview() {
    return this.getOutcomePreview('X3rd_party_verification_details_FY1__c');
}
get jobVerifyDescFY2Preview() {
    return this.getOutcomePreview('X3rd_party_verification_details_FY2__c');
}
get jobVerifyDescFY3Preview() {
    return this.getOutcomePreview('X3rd_party_verification_details_FY3__c');
}
/*get jobSupport4CFYPreview() {
    return this.getOutcomePreview('Jobs_Supporting_Family_of_4_CFY__c');
}
get jobSupport4FY1Preview() {
    return this.getOutcomePreview('Jobs_Supporting_Family_of_4_FY_1__c');
}
get jobSupport4FY2Preview() {
    return this.getOutcomePreview('Jobs_Supporting_Family_of_4_FY_2__c');
}
get jobSupport4FY3Preview() {
    return this.getOutcomePreview('Jobs_Supporting_Family_of_4_FY_4__c');
}
get placementSupportCFYPreview(){
    return this.getOutcomePreview('Placements_Supporting_Family_of_4_CFY__c');
}
get placementSupportFY1Preview(){
    return this.getOutcomePreview('Placements_Supporting_Family_of_4_FY1__c');
}
get placementSupportFY2Preview(){
    return this.getOutcomePreview('Placements_Supporting_Family_of_4_FY2__c');
}
get placementSupportFY3Preview(){
    return this.getOutcomePreview('Placements_Supporting_Family_of_4_FY3__c');
}*/
get placementVerifyCFYPreview(){
    return this.getOutcomePreview('X3rd_Party_Verification_Description_CFY__c');
}
get placementVerifyFY1Preview(){
    return this.getOutcomePreview('X3rd_Party_Verification_Description_FY_1__c');
}
get placementVerifyFY2Preview(){
    return this.getOutcomePreview('X3rd_Party_Verification_Description_FY_2__c');
}
get placementVerifyFY3Preview(){
    return this.getOutcomePreview('X3rd_Party_Verification_Description_FY_3__c');
}
get longTermDescCFYPreview(){
    return this.getOutcomePreview('Outcome_Tracking_Details_CFY__c');
}
get longTermDescFY1Preview(){
    return this.getOutcomePreview('Outcome_Tracking_Details_FY_1__c');
}
get longTermDescFY2Preview(){
    return this.getOutcomePreview('Outcome_Tracking_Details_FY_2__c');
}
get longTermDescFY3Preview(){
    return this.getOutcomePreview('Outcome_Tracking_Details_FY_3__c');
}

get operationalSynergiesPreviewValue() {
    if (this.operationalSynergiesFieldApi) {
        return this.organizationData[this.operationalSynergiesFieldApi] || '';
    }
    return '';
}

// ── File list getters (mirror wcfForm.js) ─────────────────────────────────

// Page 4 - Placement Verification
get filesP4CFYPVList() { return this.uploadedFilesByCell['P4_CFY_PV'] || []; }
get filesP4FY1PVList() { return this.uploadedFilesByCell['P4_FY1_PV'] || []; }
get filesP4FY2PVList() { return this.uploadedFilesByCell['P4_FY2_PV'] || []; }
get filesP4FY3PVList() { return this.uploadedFilesByCell['P4_FY3_PV'] || []; }

get hasFilesP4CFYPV() { return this.filesP4CFYPVList.length > 0; }
get hasFilesP4FY1PV() { return this.filesP4FY1PVList.length > 0; }
get hasFilesP4FY2PV() { return this.filesP4FY2PVList.length > 0; }
get hasFilesP4FY3PV() { return this.filesP4FY3PVList.length > 0; }

// Page 4 - Long Term Outcomes
get filesP4CFYLTList() { return this.uploadedFilesByCell['P4_CFY_LT'] || []; }
get filesP4FY1LTList() { return this.uploadedFilesByCell['P4_FY1_LT'] || []; }
get filesP4FY2LTList() { return this.uploadedFilesByCell['P4_FY2_LT'] || []; }
get filesP4FY3LTList() { return this.uploadedFilesByCell['P4_FY3_LT'] || []; }

get hasFilesP4CFYLT() { return this.filesP4CFYLTList.length > 0; }
get hasFilesP4FY1LT() { return this.filesP4FY1LTList.length > 0; }
get hasFilesP4FY2LT() { return this.filesP4FY2LTList.length > 0; }
get hasFilesP4FY3LT() { return this.filesP4FY3LTList.length > 0; }

// Page 5 - Job Verification
get filesP5CFYJVList() { return this.uploadedFilesByCell['P5_CFY_JV'] || []; }
get filesP5FY1JVList() { return this.uploadedFilesByCell['P5_FY1_JV'] || []; }
get filesP5FY2JVList() { return this.uploadedFilesByCell['P5_FY2_JV'] || []; }
get filesP5FY3JVList() { return this.uploadedFilesByCell['P5_FY3_JV'] || []; }

get hasFilesP5CFYJV() { return this.filesP5CFYJVList.length > 0; }
get hasFilesP5FY1JV() { return this.filesP5FY1JVList.length > 0; }
get hasFilesP5FY2JV() { return this.filesP5FY2JVList.length > 0; }
get hasFilesP5FY3JV() { return this.filesP5FY3JVList.length > 0; }

// Invalid cell CSS classes (add any missing ones)
get isP4CFYPVInvalid() { return !!this.invalidFileCells['P4_CFY_PV']; }
get isP4FY1PVInvalid() { return !!this.invalidFileCells['P4_FY1_PV']; }
get isP4FY2PVInvalid() { return !!this.invalidFileCells['P4_FY2_PV']; }
get isP4FY3PVInvalid() { return !!this.invalidFileCells['P4_FY3_PV']; }
get isP4CFYLTInvalid() { return !!this.invalidFileCells['P4_CFY_LT']; }
get isP4FY1LTInvalid() { return !!this.invalidFileCells['P4_FY1_LT']; }
get isP4FY2LTInvalid() { return !!this.invalidFileCells['P4_FY2_LT']; }
get isP4FY3LTInvalid() { return !!this.invalidFileCells['P4_FY3_LT']; }

get p4CFYPVClass() { return this.isP4CFYPVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p4FY1PVClass() { return this.isP4FY1PVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p4FY2PVClass() { return this.isP4FY2PVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p4FY3PVClass() { return this.isP4FY3PVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p4CFYLTClass() { return this.isP4CFYLTInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p4FY1LTClass() { return this.isP4FY1LTInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p4FY2LTClass() { return this.isP4FY2LTInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p4FY3LTClass() { return this.isP4FY3LTInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
/*get showProjectedLearnerEnrollmentsCFY() {
    return this.outcomeData.Projected_Learner_Enrollments_CFY_NA__c;
}
get showProjectedLearnerEnrollmentsFY1() {
    return this.outcomeData.Projected_Learner_Enrollments_FY_1_NA__c;
}
get showProjectedLearnerEnrollmentsFY2() {
    return this.outcomeData.Projected_Learner_Enrollments_FY_2_NA__c;
}
get showProjectedLearnerEnrollmentsFY3() {
    return this.outcomeData.Projected_Learner_Enrollments_FY_3_NA__c;
}
// For Placements
get showProjectedLearnerPlacementsCFY() {
    return this.outcomeData.Projected_Learner_Placements_CFY_NA__c;
}
get showProjectedLearnerPlacementsFY1() {
    return this.outcomeData.Projected_Learner_Placements_FY_1_NA__c;
}
get showProjectedLearnerPlacementsFY2() {
    return this.outcomeData.Projected_Learner_Placements_FY_2_NA__c;
}
get showProjectedLearnerPlacementsFY3() {
    return this.outcomeData.Projected_Learner_Placements_FY_3_NA__c	;
}*/

// Helper: display numeric value — shows 0 as "0", null/'' as "—"
displayNum(val) {
    if (val === null || val === undefined || val === '') return '—';
    const n = Number(val);
    return isNaN(n) ? '—' : n;
}

// In resumeDraftWcfForm.js — add this getter
get showExpenseExplanation() {
    const expenseVariance = Number(this.fiscalData.Expense_Variance__c) || 0;
    return expenseVariance !== 0;
}
get modalTitle() {
    if (!this.modalField) return 'Edit Content';
    return this.modalField.replace(/__c$/i, '').replace(/_/g, ' ');
}
get additionalFundingReviewValue() {
    if (this.selectedFundingArea === 'Job Creation Only') {
        return this.organizationData.Use_of_Additional_Funding_JC__c || '';
    }
    return this.organizationData.Use_of_Additional_Funding__c || '';
}
get reviewJCOutcomes() {
    const d = this.outcomeData;
    const fmt = v => (v === null || v === undefined || v === '') ? '—' : Number(v);
    return {
        newBiz: {
            fy3: fmt(d.Projected_New_Businesses_FY_3__c),
            fy2: fmt(d.Projected_New_Businesses_FY_2__c),
            fy1: fmt(d.Projected_New_Businesses_FY_1__c),
            cfy: fmt(d.Projected_New_Businesses_CFY__c)
        },
        jobsNewBiz: {
            fy3: fmt(d.Projected_Jobs_from_New_Businesses_FY3__c),
            fy2: fmt(d.Projected_Jobs_from_New_Businesses_FY2__c),
            fy1: fmt(d.Projected_Jobs_from_New_Businesses_FY1__c),
            cfy: fmt(d.Projected_Jobs_from_New_Businesses_CFY__c)
        },
        existBiz: {
            fy3: fmt(d.Growing_Businesses_Supported_FY_3__c),
            fy2: fmt(d.Growing_Businesses_Supported_FY_2__c),
            fy1: fmt(d.Growing_Businesses_Supported_FY_1__c),
            cfy: fmt(d.Growing_Businesses_Supported_CFY__c)
        },
        jobsExistBiz: {
            fy3: fmt(d.Jobs_from_Growing_Businesses_FY_3__c),
            fy2: fmt(d.Jobs_from_Growing_Businesses_FY_2__c),
            fy1: fmt(d.Jobs_from_Growing_Businesses_FY_1__c),
            cfy: fmt(d.Jobs_from_Growing_Businesses_CFY__c)
        },
        avgCost: {
            fy3: fmt(d.Avg_Cost_per_Job_FY_3__c),
            fy2: fmt(d.Avg_Cost_per_Job_FY_2__c),
            fy1: fmt(d.Avg_Cost_per_Job_FY_1__c),
            cfy: fmt(d.Avg_Cost_per_Job_CFY__c)
        }
    };
}
get hasSkillDomains() {
    return this.unifiedSkillDomains.some(r => r.domain && r.domain.trim() !== '');
}

get hasBusinessSectors() {
    return this.businessSectors.some(r => r.sector && r.sector.trim() !== '');
}

get businessSectorsForReview() {
    return this.businessSectors
        .filter(r => r.sector)
        .map(r => ({
            ...r,
            sector: (r.sector === 'Other' && r.sectorOther) ? `Other: ${r.sectorOther}` : r.sector,
            supportTypesDisplay: (r.supportTypes || [])
                .map(t => (t === 'Other' && r.supportTypeOther) ? `Other: ${r.supportTypeOther}` : t)
                .join(', ')
        }));
}
get reviewJFOutcomes() {
    const d = this.outcomeData;
    const fmt = v => (v === null || v === undefined || v === '') ? '—' : Number(v);
    return {
        enrolments: {
            fy3: fmt(d.Projected_Learner_Enrollments_FY_3__c),
            fy2: fmt(d.Projected_Learner_Enrollments_FY_2__c),
            fy1: fmt(d.Projected_Learner_Enrollments_FY_1__c),
            cfy: fmt(d.Projected_Learner_Enrollments_CFY__c)
        },
        placements: {
            fy3: fmt(d.Projected_Learner_Placements_FY_3__c),
            fy2: fmt(d.Projected_Learner_Placements_FY_2__c),
            fy1: fmt(d.Projected_Learner_Placements_FY_1__c),
            cfy: fmt(d.Projected_Learner_Placements_CFY__c)
        },
        placementPct: {
            fy3: fmt(d.Projected_Learner_placement_FY_3__c),
            fy2: fmt(d.Projected_Learner_placement_FY_2__c),
            fy1: fmt(d.Projected_Learner_placement_FY_1__c),
            cfy: fmt(d.Projected_Learner_placement_CFY__c)
        },
        avgCost: {
            fy3: fmt(d.Avg_Cost_per_Placement_FY_3__c),
            fy2: fmt(d.Avg_Cost_per_Placement_FY_2__c),
            fy1: fmt(d.Avg_Cost_per_Placement_FY_1__c),
            cfy: fmt(d.Avg_Cost_per_Placement_CFY__c)
        }
    };
}
minimizeFeedbackPanel(event) {
        event.stopPropagation();
        this.isFeedbackMinimized = !this.isFeedbackMinimized;
    }

get panelClasses() {
        return `panel ${this.isFeedbackPanelOpen && !this.isFeedbackMinimized ? 'panel-open' : 'panel-minimized'}`;
    }
// Add these getters to both JS files (used in template for counter colour)
get legalStructureCounterClass() {
    return this._counterClass('Legal_Structure__c', this.legalStructureWordCount);
}
get skillingApproachCounterClass() {
    return this._counterClass('Skilling_Approach__c', this.skillingApproachWordCount);
}
get jcApproachCounterClass() {
    return this._counterClass('Job_Creation_Approach__c', this.jcApproachWordCount);
}
get sustainabilityCounterClass() {
    return this._counterClass('Organizational_Sustainability__c', this.sustainabilityWordCount);
}
get additionalFundingCounterClass() {
    return this._counterClass(this.additionalFundingFieldApi, this.additionalFundingWordCount);
}
get synergiesCounterClass() {
    return this._counterClass(this.operationalSynergiesFieldApi, this.synergiesWordCount);
}
get revenueExplanationCounterClass() {
    return this._counterClass('Revenue_Explanation__c', this.revenueExplanationWordCount);
}
get submitButtonLabel() {
    return this.isLoading ? 'Submitting…' : this.labels.CL_Submit;
}

_counterClass(field, count) {
    const limit = this.WORD_LIMITS[field]
        ?? (field === this.operationalSynergiesFieldApi ? 200 : null);
    if (!limit) return 'word-counter';
    if (count > limit)            return 'word-counter over';
    if (count >= limit * 0.9)     return 'word-counter warn';
    return 'word-counter';
}
// File cell invalid flags
//get isP4FY1PVInvalid() { return !!this.invalidFileCells['P4_FY1_PV']; }
get isP5CFYJVInvalid() { return !!this.invalidFileCells['P5_CFY_JV']; }
get isP5FY1JVInvalid() { return !!this.invalidFileCells['P5_FY1_JV']; }
get isP5FY2JVInvalid() { return !!this.invalidFileCells['P5_FY2_JV']; }
get isP5FY3JVInvalid() { return !!this.invalidFileCells['P5_FY3_JV']; }
// FIND this existing block:
get p4CFYPVClass() { return this.isP4CFYPVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p4FY1PVClass() { return this.isP4FY1PVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }

// ADD this line right after:
get p4JCFY1JVClass() { return this.isP4JCFY1JVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }

// CSS classes for file wrappers
get p5CFYJVClass() { return this.isP5CFYJVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p5FY1JVClass() { return this.isP5FY1JVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p5FY2JVClass() { return this.isP5FY2JVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
get p5FY3JVClass() { return this.isP5FY3JVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
/*openModal(event) {
    this.isModalOpen = true;
    this.modalField = event.target.dataset.row;
    this.modalValue = this.outcomeData[this.modalField] || '';
    setTimeout(() => {
        const editor = this.template.querySelector('.custom-modal .text-area');
        if (editor) editor.innerHTML = this.modalValue;
    }, 0);
}*/
openModal(event) {
    this.isModalOpen = true;
    this.modalField = event.target.dataset.row;      // field API name
    this.modalTarget = event.target.dataset.target;   // 'fiscal', 'outcome', or 'organization'

    // Determine which object to read from
    if (this.modalTarget === 'fiscal') {
        this.modalValue = this.fiscalData[this.modalField] || '';
    } else if (this.modalTarget === 'outcome') {
        this.modalValue = this.outcomeData[this.modalField] || '';
    } else {
        this.modalValue = this.organizationData[this.modalField] || '';
    }

    // Restore modal editor value after render
    setTimeout(() => {
        const editor = this.template.querySelector('.custom-modal .text-area');
        if (editor) editor.innerHTML = this._sanitizeHtml(this.modalValue);
    }, 0);
}
recalculateAvgCostPerPlacement() {
    const periods = [
        { 
            expense: () => Number(this.fiscalData.Expense_Projection__c) || 0,
            placements: 'Projected_Learner_Placements_CFY__c',  
            avgCost: 'Avg_Cost_per_Placement_CFY__c',
            label: 'CFY'
        },
        { 
            expense: () => Number(this.historicalData.CY1_Expense__c) || 0,      
            placements: 'Projected_Learner_Placements_FY_1__c',  
            avgCost: 'Avg_Cost_per_Placement_FY_1__c',
            label: 'FY-1'
        },
        { 
            expense: () => Number(this.historicalData.CY2_Expense__c) || 0,
            placements: 'Projected_Learner_Placements_FY_2__c',  
            avgCost: 'Avg_Cost_per_Placement_FY_2__c',
            label: 'FY-2'
        },
        { 
            expense: () => Number(this.historicalData.CY3_Expense__c) || 0,
            placements: 'Projected_Learner_Placements_FY_3__c',  
            avgCost: 'Avg_Cost_per_Placement_FY_3__c',
            label: 'FY-3'
        }
    ];
 
    periods.forEach(p => {
        const expense    = p.expense();
        const placements = Number(this.outcomeData[p.placements]) || 0;
 
        if (placements > 0 && expense > 0) {
            // ✅ Store as plain number, NOT formatted string
            this.outcomeData[p.avgCost] = Math.round((expense / placements) * 100) / 100;
        } else if (placements === 0) {
            this.outcomeData[p.avgCost] = 0;
        } else {
            this.outcomeData[p.avgCost] = 0;
        }
    });
 
    this.outcomeData = { ...this.outcomeData };
}
recalculatePlacementPercentages() {
    const periods = [
        {
            enrollment: 'Projected_Learner_Enrollments_CFY__c',
            placement:  'Projected_Learner_Placements_CFY__c',
            percentage: 'Projected_Learner_placement_CFY__c'
        },
        {
            enrollment: 'Projected_Learner_Enrollments_FY_1__c',
            placement:  'Projected_Learner_Placements_FY_1__c',
            percentage: 'Projected_Learner_placement_FY_1__c'
        },
        {
            enrollment: 'Projected_Learner_Enrollments_FY_2__c',
            placement:  'Projected_Learner_Placements_FY_2__c',
            percentage: 'Projected_Learner_placement_FY_2__c'
        },
        {
            enrollment: 'Projected_Learner_Enrollments_FY_3__c',
            placement:  'Projected_Learner_Placements_FY_3__c',
            percentage: 'Projected_Learner_placement_FY_3__c'
        }
    ];

    
    periods.forEach(p => {
        const enrollments = Number(this.outcomeData[p.enrollment]) || 0;
        const placements  = Number(this.outcomeData[p.placement])  || 0;

        if (enrollments > 0) {
            // Round to 2 decimal places
            this.outcomeData[p.percentage] = Math.round((placements / enrollments) * 100 * 100) / 100;
        } else {
            this.outcomeData[p.percentage] = 0;
        }
    });

    // Force reactivity
    this.outcomeData = { ...this.outcomeData };
}
// ── PDF LIBRARY LOADER ──────────────────────────────────────────────────
/* ============================================================
   OPTIONAL companion patch — makes the logo aspect-ratio fix
   future-proof (in case the WIN_LOGO asset is ever swapped for
   a different-shaped image).

   Find your existing `_loadPdfLibraries()` method and replace
   just the inner `fetch(WIN_LOGO)...` block with the version
   below. Everything else in the method stays the same.
   ============================================================ */

_loadPdfLibraries() {
    if (this._scriptsInitiated) return;
    this._scriptsInitiated = true;

    Promise.all([
        loadScript(this, JSPDF),
        loadScript(this, AUTO_TABLE)
    ])
    .then(() => {
        this.isJsLoaded = true;
        console.log('✅ jsPDF and AutoTable loaded successfully');

        // Load WIN logo as base64 for PDF header
        fetch(WIN_LOGO)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    this.logoBase64 = reader.result;

                    // Measure the real image so the PDF header can preserve
                    // its aspect ratio instead of stretching it into a fixed
                    // box (this is what caused the squished logo).
                    const img = new Image();
                    img.onload = () => {
                        if (img.naturalWidth && img.naturalHeight) {
                            this._logoAspectRatio = img.naturalWidth / img.naturalHeight;
                        }
                    };
                    img.src = this.logoBase64;

                    console.log('✅ Logo loaded as base64');
                };
                reader.readAsDataURL(blob);
            })
            .catch(err => console.warn('⚠️ Logo load failed (non-critical):', err));
    })
    .catch(err => {
        console.error('❌ jsPDF/AutoTable load error:', err);
        this._scriptsInitiated = false;
        this.isJsLoaded = false;
    });
}
flushAllInputs() {
    // ── 1. Flush all lightning-input / combobox / textarea ────────────────
    this.template.querySelectorAll(
        'lightning-input[data-id], lightning-combobox[data-id], lightning-textarea[data-id]'
    ).forEach(el => {
        const field = el.dataset.id;
        if (!field || field === 'undefined') return;
        const val = el.value !== undefined ? el.value : '';

        const historicalFields = [
            'CY1_Balance_Start_CFY_1__c', 'CY2_Balance_Start_CFY_2__c',
            'CY3_Balance_Start_CFY_3__c', 'CY1_Revenue__c', 'CY2_Revenue__c',
            'CY3_Revenue__c', 'CY1_Expense__c', 'CY2_Expense__c', 'CY3_Expense__c'
        ];
        const fiscalInputFields = [
            'Revenue_Budget__c', 'Revenue_Projection__c',
            'Expense_Budget__c', 'Expense_Projection__c'
        ];
        const outcomeInputFields = [
            'Projected_Learner_Enrollments_CFY__c',
            'Projected_Learner_Enrollments_FY_1__c',
            'Projected_Learner_Enrollments_FY_2__c',
            'Projected_Learner_Enrollments_FY_3__c',
            'Projected_Learner_Placements_CFY__c',
            'Projected_Learner_Placements_FY_1__c',
            'Projected_Learner_Placements_FY_2__c',
            'Projected_Learner_Placements_FY_3__c',
            'Projected_New_Businesses_CFY__c',
            'Projected_New_Businesses_FY_1__c',
            'Projected_New_Businesses_FY_2__c',
            'Projected_New_Businesses_FY_3__c',
            'Projected_Jobs_from_New_Businesses_CFY__c',
            'Projected_Jobs_from_New_Businesses_FY1__c',
            'Projected_Jobs_from_New_Businesses_FY2__c',
            'Projected_Jobs_from_New_Businesses_FY3__c',
            'Growing_Businesses_Supported_CFY__c',
            'Growing_Businesses_Supported_FY_1__c',
            'Growing_Businesses_Supported_FY_2__c',
            'Growing_Businesses_Supported_FY_3__c',
            'Jobs_from_Growing_Businesses_CFY__c',
            'Jobs_from_Growing_Businesses_FY_1__c',
            'Jobs_from_Growing_Businesses_FY_2__c',
            'Jobs_from_Growing_Businesses_FY_3__c'
        ];

        if (historicalFields.includes(field)) {
            if (val !== '' && val !== null && val !== undefined) {
                this.historicalData[field] = Number(val) || 0;
            }
        } else if (fiscalInputFields.includes(field)) {
            if (val !== '' && val !== null && val !== undefined) {
                this.fiscalData[field] = Number(val) || 0;
            }
        } else if (outcomeInputFields.includes(field)) {
            if (val !== '' && val !== null && val !== undefined) {
                this.outcomeData[field] = Number(val) || 0;
            }
        } else {
            if (val !== '' && val !== null && val !== undefined) {
                this.organizationData[field] = val;
            }
        }
    });

    // ── 2. Flush ALL contenteditable fields (rich text) ───────────────────
    // This is the KEY fix — always sync fiscal explanation fields to fiscalData
    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();
     this.template.querySelectorAll('select[data-field][data-index]').forEach(el => {
        const index = parseInt(el.dataset.index, 10);
        const field = el.dataset.field;
        const value = el.value;
        if (!isNaN(index) && field && this.businessSectors[index] !== undefined) {
            const arr = JSON.parse(JSON.stringify(this.businessSectors));
            arr[index][field] = value;
            this.businessSectors = arr;
        }
    });

   // Business sectors
this.template.querySelectorAll('[data-section="sector"][data-field][data-index]')
    .forEach(el => {
        const index = parseInt(el.dataset.index, 10);
        const field = el.dataset.field;
        if (isNaN(index) || !this.businessSectors[index]) return;
        const arr = JSON.parse(JSON.stringify(this.businessSectors));
        arr[index][field] = el.value;
        this.businessSectors = arr;
    });

// Skill domains
this.template.querySelectorAll('[data-section="skill"][data-field][data-index]')
    .forEach(el => {
        const index = parseInt(el.dataset.index, 10);
        let field   = el.dataset.field;
        if (field === 'skillEnrolment') field = 'yearlyEnrolment';
        if (isNaN(index) || !this.unifiedSkillDomains[index]) return;
        const arr = JSON.parse(JSON.stringify(this.unifiedSkillDomains));
        arr[index][field] = el.value;
        this.unifiedSkillDomains = arr;
    });

    // ✅ Sync rich text and other fields
    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();

    
}
// ── Waits for jsPDF/autoTable to be ready, retrying the load if needed ──
_waitForPdfLibrary(timeoutMs = 8000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            if (this.isJsLoaded && window.jspdf?.jsPDF) {
                resolve(true);
            } else if (Date.now() - start >= timeoutMs) {
                resolve(false);
            } else {
                setTimeout(check, 300);
            }
        };
        check();
    });
}

/* ============================================================
   REPLACEMENT for the existing `async handleDownloadPDF() { ... }`
   method in wcfForm.js.

   Everything else in the class (imports, other methods, data
   objects) stays exactly as-is. Just swap out the old method body
   for this one. The data-gathering logic (orgData/histData/fiscData/
   outData, jsPDF loading/retry, filename/save) is unchanged from
   your original — only the drawing/formatting helpers and the
   Q-number tagging are new.
   ============================================================ */

async handleDownloadPDF() {
    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();
    if (typeof this.flushAllInputs === 'function') this.flushAllInputs();

    if (!this.isJsLoaded || !window.jspdf?.jsPDF) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Preparing PDF',
            message: 'Loading PDF library, please wait…',
            variant: 'info',
            mode: 'dismissible'
        }));
        this._scriptsInitiated = false; // allow a fresh attempt
        this._loadPdfLibraries();
        const ready = await this._waitForPdfLibrary(8000);
        if (!ready) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'PDF Library Not Ready',
                message: 'Could not load the PDF library. Please check your connection and try again.',
                variant: 'error',
                mode: 'sticky'
            }));
            return;
        }
    }

    const jsPDFLib = window.jspdf?.jsPDF;
    if (!jsPDFLib) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error',
            message: 'PDF library not available. Please refresh the page and try again.',
            variant: 'error'
        }));
        return;
    }

    const orgData  = this.organizationData;
    const histData = this.historicalData;
    const fiscData = this.fiscalData;
    const outData  = this.outcomeData;
    const val  = v => (v === null || v === undefined || v === '') ? '—' : v;

    // Currency: adds thousands separators — $1,200,000 instead of $1200000.
    // Keeps 2 decimal places only when the value actually has cents.
    const val$ = v => {
        if (v === null || v === undefined || v === '') return '—';
        const n = Number(v);
        if (isNaN(n)) return `$${v}`;
        const hasCents = Math.round(n * 100) % 100 !== 0;
        return `$${n.toLocaleString('en-US', {
            minimumFractionDigits: hasCents ? 2 : 0,
            maximumFractionDigits: 2
        })}`;
    };

    // Date: "YYYY-MM-DD" (or any parseable date) → "29 Jul 2026".
    // Parses the y/m/d pieces manually rather than `new Date(str)` so a
    // plain "YYYY-MM-DD" value isn't shifted a day by UTC/local parsing.
    const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtDate = v => {
        if (!v) return '—';
        const isoMatch = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const [, yr, mo, da] = isoMatch;
            const mIdx = parseInt(mo, 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
                return `${parseInt(da, 10)} ${MONTH_ABBR[mIdx]} ${yr}`;
            }
        }
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v); // not a date — leave as-is
        return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
    };

    const parseHtml = (html) => {
        if (!html) return '';
        const el = new DOMParser().parseFromString(html, 'text/html').body;
        let result = '';
        const process = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.nodeValue;
            } else if (node.nodeName === 'BR') {
                result += '\n';
            } else if (node.nodeName === 'LI') {
                result += `• ${node.textContent.trim()}\n`;
            } else {
                node.childNodes.forEach(process);
                if (['DIV', 'P'].includes(node.nodeName)) result += '\n';
            }
        };
        el.childNodes.forEach(process);
        return result.trim();
    };

    const doc = new jsPDFLib();
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;
    let pageCount = 1;

    // ── Brand palette — matches the Review & Submit page (Wadhwani red) ──
const BRAND      = [200, 57, 29];   // #C8391D — matches wcfFormPreview.css
const NAVY       = [27, 42, 74];    // #1B2A4A — matches .rv-section-head
const BRAND_SOFT = [253, 246, 244]; // #FDF6F4 — matches .rv-table even-row tint
const TEXT_DARK  = [27, 42, 74];    // navy body text, matches .rv-info-value
const TEXT_GRAY  = [112, 110, 107]; // matches .rv-info-label
const LINE_GRAY  = [232, 221, 217]; // #E8DDD9 — matches .rv-section border

    const addHeader = () => {
        if (this.logoBase64 && pageCount === 1) {
            // Preserve the logo's real aspect ratio instead of forcing a fixed box
            // (the source PNG is 242x120 ≈ 2.02:1 — a hard-coded 45x18 box, at 2.5:1,
            // was stretching it noticeably). Fix a target width, derive height from ratio.
            const logoW = 40;
            const ratio = this._logoAspectRatio || (242 / 120);
            const logoH = logoW / ratio;
            doc.addImage(this.logoBase64, 'PNG', (pageWidth - logoW) / 2, 12, logoW, logoH);
            y = 12 + logoH + 8;
        }
        doc.setFontSize(15);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...BRAND);
        doc.text('Wadhwani Grants Application', pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.setDrawColor(...BRAND);
        doc.setLineWidth(0.6);
        doc.line(15, y, pageWidth - 15, y);
        y += 10;
        doc.setTextColor(...TEXT_DARK);
    };

    const checkPage = (needed = 15) => {
        if (y + needed >= pageHeight - 20) {
            doc.addPage();
            pageCount++;
            y = 20;
        }
    };

    // Filled brand-red bar — matches the "WHAT YOU DO" style section header
    const section = (title) => {
    checkPage(24);
    rvRowIndex = 0;
    y += 6;
    // Navy bar + red bottom border — mirrors .rv-section-head
    doc.setFillColor(...NAVY);
    doc.rect(15, y, pageWidth - 30, 11, 'F');
    doc.setFillColor(...BRAND);
    doc.rect(15, y + 11, pageWidth - 30, 1, 'F');
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 19, y + 7.5);
    y += 18;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...TEXT_DARK);
};

    // Sub-heading with optional Q-badge, used right above a table
const subHead = (qNum, title) => {
    checkPage(16);
    y += 4;   // ← breathing room above every sub-heading, fixes the cramped look
    if (qNum) {
        doc.setFillColor(...BRAND_SOFT);
        const w = doc.getTextWidth(qNum) + 6;
        doc.roundedRect(15, y - 4, w, 6, 1, 1, 'F');
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...BRAND);
        doc.text(qNum, 18, y);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...TEXT_DARK);
        doc.text(title, 15 + w + 3, y);
    } else {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...TEXT_DARK);
        doc.text(title, 15, y);
        doc.setFont(undefined, 'normal');
    }
    y += 8;
};
 
    const printLines = (text, indent = 15) => {
        const lines = doc.splitTextToSize(text, pageWidth - indent - 15);
        lines.forEach(line => {
            checkPage(6);
            doc.text(line, indent, y);
            y += 5.5;
        });
    };

    // Label/value block with optional Q-badge + faint divider (mirrors .rv-row)
const BADGE_COL_W = 12;   // mm — fixed, so "Q1" and "Q17" badges never shift the label
    const LABEL_COL_W = 58;   // mm reserved for the label column (after the badge column)
    const ROW_PAD_Y   = 3.4;  // mm padding above/below text block inside the band
    const LINE_H       = 4.4; // mm per wrapped line
    let rvRowIndex = 0; // zebra toggle, reset per section

    const labelValue = (label, value, qNum = null) => {
        if (value === null || value === undefined || value === '') return;

        const badgeColX  = 15;
        const labelX     = 15 + BADGE_COL_W;          // fixed regardless of badge width
        const valueX     = labelX + LABEL_COL_W;
        const valueW     = pageWidth - valueX - 15;

        doc.setFontSize(8.3);
        doc.setFont(undefined, 'bold');
        const labelLines = doc.splitTextToSize(label.toUpperCase(), LABEL_COL_W - 4);

        doc.setFontSize(9.5);
        doc.setFont(undefined, 'normal');
        const valueLines = doc.splitTextToSize(parseHtml(String(value)), valueW);

        const textLines  = Math.max(labelLines.length, valueLines.length);
        const textHeight = textLines * LINE_H;
        const bandHeight = textHeight + ROW_PAD_Y * 2;

        checkPage(bandHeight + 2);

        // Zebra background band, full row width
        if (rvRowIndex % 2 === 1) {
            doc.setFillColor(...BRAND_SOFT);
            doc.rect(15, y, pageWidth - 30, bandHeight, 'F');
        }
        rvRowIndex++;

        const textTopY = y + ROW_PAD_Y + LINE_H * 0.72; // first-line baseline within the band

        if (qNum) {
            doc.setFontSize(7.3);
            doc.setFont(undefined, 'bold');
            const badgeW = Math.min(doc.getTextWidth(qNum) + 5, BADGE_COL_W - 2);
            doc.setFillColor(...BRAND);
            doc.roundedRect(badgeColX, textTopY - 3.6, badgeW, 5, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(qNum, badgeColX + badgeW / 2, textTopY - 0.2, { align: 'center' });
        }

        doc.setFontSize(8.3);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...TEXT_GRAY);
        doc.text(labelLines, labelX, textTopY, { lineHeightFactor: 1.35 });

        doc.setFontSize(9.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...TEXT_DARK);
        doc.text(valueLines, valueX, textTopY, { lineHeightFactor: 1.35 });

        y += bandHeight;
    };
    // Brand-styled table with zebra striping (mirrors .rv-table).
    // `aligns` is an optional per-column array, e.g. ['left','right','right'].
    // Defaults to: first column left (it's always a label), everything else
    // right (numbers/dates/percentages line up cleanly) — instead of every
    // column defaulting to left-aligned body text under a centered header,
    // which read as ragged and mismatched.
    const table = (head, body, aligns = null) => {
        checkPage(40);
        const columnStyles = {};
        const resolvedAligns = aligns || head.map((_, i) => (i === 0 ? 'left' : 'right'));
        resolvedAligns.forEach((a, i) => { columnStyles[i] = { halign: a }; });
        doc.autoTable({
            startY: y,
            head: [head],
            body,
            theme: 'grid',
            styles: {
                fontSize: 8.5,
                cellPadding: 4,
                lineColor: LINE_GRAY,
                lineWidth: 0.2,
                textColor: TEXT_DARK,
                halign: 'right',       // default: numeric/date columns right-aligned
                valign: 'middle'
            },
            headStyles: {
    fillColor: NAVY,       // matches .rv-table th background
    textColor: 255,
    fontStyle: 'bold',
    halign: 'center'
},
columnStyles,
alternateRowStyles: { fillColor: BRAND_SOFT }, // matches .rv-table even-row tint
            margin: { left: 15, right: 15 }
        });
        y = doc.lastAutoTable.finalY + 10;
    };

   addHeader();

const dialCode = this._extractDialCode(orgData.WG_Phone_Country_Code__c);
const showJF = this.showJFWhatYouDo;
const showJC = this.showJCOrBothWhatYouDo;
const synField = this.operationalSynergiesFieldApi;

// ══ SECTION 1 — About Your Organisation ══
section(this.labels.CL_About_Your_Organisation);
labelValue(this.labels.CL_Organizational_Area_s_for_Funding_Investment, orgData.Organizational_Area_s_for_Funding_Inves__c, 'Q1');
labelValue(this.labels.CL_Organizational_Name, orgData.Organization_Name__c, 'Q2');
labelValue(this.labels.CL_Headquarters_City_and_Country, orgData.Headquarters_City_and_Country__c, 'Q2');
labelValue(this.labels.CL_Primary_Service_Regions, orgData.Primary_Service_Regions__c, 'Q2');
labelValue(this.labels.CL_Leader_Name, orgData.Leader_Name__c, 'Q2');
labelValue(this.labels.CL_Leader_Title, orgData.Leader_Title__c, 'Q2');
labelValue(this.labels.CL_Leader_Title, orgData.Leader_Title__c, 'Q2');
const tenureVal = orgData.Leader_Tenure__c;
labelValue(
    this.labels.CL_Leader_Tenure,
    (tenureVal !== '' && tenureVal !== null && tenureVal !== undefined) ? `${tenureVal} years` : '—',
    'Q2'
);
labelValue(this.labels.CL_Submitter_Name, orgData.Submitter_Name__c, 'Q3');
labelValue(this.labels.CL_Submitter_Name, orgData.Submitter_Name__c, 'Q3');
labelValue(this.labels.CL_Title, orgData.Job_Title__c, 'Q3');
labelValue(this.labels.CL_Email_Address, orgData.Work_Email_ID__c, 'Q3');
labelValue(this.labels.CL_Phone_number, dialCode ? `${dialCode} ${orgData.Phone__c}` : orgData.Phone__c, 'Q3');
labelValue(this.labels.CL_Type, orgData.Legal_Type__c, 'Q4');
labelValue(this.labels.CL_Registration_Jurisdiction, orgData.Registration_Jurisdiction__c, 'Q4');
labelValue(this.labels.CL_Incorporation_Date, fmtDate(orgData.Incorporation_Date__c), 'Q4');
labelValue(this.labels.CL_Brief_Description, orgData.Legal_Structure__c, 'Q4');
labelValue(this.labels.CL_Fiscal_Year_End_Date, fmtDate(orgData.Current_fiscal_year_s_end_date__c), 'Q5');

// Q6 — Funders
const funderRows = [];
if (orgData.Funder_1_Name__c) funderRows.push([orgData.Funder_1_Name__c, val$(orgData.Funder_1_Amount__c), fmtDate(orgData.Funder_1_Period_Start__c), fmtDate(orgData.Funder_1_Period_End__c), orgData.Funder_1_Type__c || '—']);
if (this.showFunder2 && orgData.Funder_2_Name__c) funderRows.push([orgData.Funder_2_Name__c, val$(orgData.Funder_2_Amount__c), fmtDate(orgData.Funder_2_Period_Start__c), fmtDate(orgData.Funder_2_Period_End__c), orgData.Funder_2_Type__c || '—']);
if (this.showFunder3 && orgData.Funder_3_Name__c) funderRows.push([orgData.Funder_3_Name__c, val$(orgData.Funder_3_Amount__c), fmtDate(orgData.Funder_3_Period_Start__c), fmtDate(orgData.Funder_3_Period_End__c), orgData.Funder_3_Type__c || '—']);
if (funderRows.length > 0) {
    subHead('Q6', this.labels.CL_Top_3_Most_Prominent_Funders);
    table([this.labels.CL_Funder_Name, this.labels.CL_Approx_Annual_Amount_USD,
           this.labels.CL_Funding_Period_Start, this.labels.CL_Funding_Period_End,
           this.labels.CL_Funding_Type], funderRows, ['left','right','right','right','left']);
}

// Q7 — References
const refRows = [];
if (orgData.Reference_1_Name__c) refRows.push([orgData.Reference_1_Name__c, orgData.Reference_1_Role__c, orgData.Reference_1_Email__c]);
if (this.showReference2 && orgData.Reference_2_Name__c) refRows.push([orgData.Reference_2_Name__c, orgData.Reference_2_Role__c, orgData.Reference_2_Email__c]);
if (refRows.length > 0) {
    subHead('Q7', this.labels.CL_References_for_Outreach);
    table([this.labels.CL_Name, this.labels.CL_Organisation_Role, this.labels.CL_Email], refRows, ['left','left','left']);
}

// ══ SECTION 2 — What You Do ══
// ══ SECTION 2 — What You Do ══
section(this.labels.CL_What_You_Do);

if (showJF) {
    labelValue(this.labels.CL_Your_Skilling_Approach, orgData.Skilling_Approach__c, 'Q8');

    const domainRows = this.unifiedSkillDomains
        .filter(r => r.domain)
        .map(r => [r.domain, val(r.hours), val(r.duration), fmtDate(r.startDate), val(r.yearlyEnrolment)]);
    if (domainRows.length > 0) {
         y += 4;    
        subHead('Q9', this.labels.CL_Skilling_Domains_Offered);
        table([this.labels.CL_Domain_Programme_Name, this.labels.CL_Hours_of_Training,
               this.labels.CL_Duration_Months, this.labels.CL_When_Programme_Started,
               this.labels.CL_Yearly_Enrolment], domainRows);
    }
}

if (showJC) {
    labelValue(this.labels.CL_Your_Job_Creation_Approach, orgData.Job_Creation_Approach__c, 'Q10');

    const sectorRows = this.businessSectorsForReview
        .filter(r => r.sector)
        .map(r => [r.sector, fmtDate(r.supportBegin), r.supportTypesDisplay || '—', val(r.yearlyEnrolment)]);
    if (sectorRows.length > 0) {
             y += 4;     
        subHead('Q11', this.labels.CL_Business_Sectors_Served);
        table([this.labels.CL_Business_Sector, this.labels.CL_When_Did_Support_Begin,
               this.labels.CL_Type_of_Support_Provided, this.labels.CL_Yearly_Enrolment], sectorRows, ['left','right','left','right']);
    }
}
// ══ SECTION 3 — What You've Delivered ══
section(this.labels.CL_What_You_ve_Delivered);

subHead('Q12', this.labels.CL_Historical_Financial_Data);
table([this.labels.CL_Item, this.fyLabel3, this.fyLabel2, this.fyLabel1], [
    [this.labels.CL_Balance_At_Start_of_the_Year, val$(histData.CY3_Balance_Start_CFY_3__c), val$(histData.CY2_Balance_Start_CFY_2__c), val$(histData.CY1_Balance_Start_CFY_1__c)],
    [this.labels.CL_Revenue, val$(histData.CY3_Revenue__c), val$(histData.CY2_Revenue__c), val$(histData.CY1_Revenue__c)],
    [this.labels.CL_Capital_Expenditure, val$(histData.CY3_Capital_Expenditure__c), val$(histData.CY2_Capital_Expenditure__c), val$(histData.CY1_Capital_Expenditure__c)],
    [this.labels.CL_Operating_Expenditure, val$(histData.CY3_Operating_Expenditure__c), val$(histData.CY2_Operating_Expenditure__c), val$(histData.CY1_Operating_Expenditure__c)],
    [this.labels.CL_Balance_At_End_of_the_Year, val$(histData.CY3_Balance_End__c), val$(histData.CY2_Balance_End__c), val$(histData.CY1_Balance_End__c)]
]);

subHead('Q13', this.labels.CL_Current_Fiscal_Year_Data);
table([this.labels.CL_Item, this.labels.CL_Budget, this.labels.CL_Current_Projection, this.labels.CL_Variance], [
    [this.labels.CL_Revenue, val$(fiscData.Revenue_Budget__c), val$(fiscData.Revenue_Projection__c), val$(fiscData.Revenue_Variance__c)],
    [this.labels.CL_Capital_Expenditure, val$(fiscData.Capital_Expenditure_Budget__c), val$(fiscData.Capital_Expenditure_Projection__c), val$(fiscData.Capital_Expenditure_Variance__c)],
[this.labels.CL_Operating_Expenditure, val$(fiscData.Operating_Expenditure_Budget__c), val$(fiscData.Operating_Expenditure_Projection__c), val$(fiscData.Operating_Expenditure_Variance__c)],
    [this.labels.CL_Revenue_Expense, val$(fiscData.Net_Budget__c), val$(fiscData.Net_Projection__c), val$(fiscData.Net_Variance__c)]
]);

if (this.showCFYExplanation) {
    labelValue(this.labels.CL_Explanation, fiscData.Revenue_Explanation__c, 'Q13');
}

labelValue(this.labels.CL_Organizational_Sustainability, orgData.Organizational_Sustainability__c, 'Q14');

 if (showJF) {
        subHead('Q15 & Q16', this.labels.CL_Job_Fulfilment_Outcomes_Last_3_Fiscal_Years_Actuals);
        table([this.labels.CL_Item, this.fyLabel3, this.fyLabel2, this.fyLabel1, this.fyLabelCFY], [
            [this.labels.CL_Learner_Enrollment, val(outData.Projected_Learner_Enrollments_FY_3__c), val(outData.Projected_Learner_Enrollments_FY_2__c), val(outData.Projected_Learner_Enrollments_FY_1__c), val(outData.Projected_Learner_Enrollments_CFY__c)],
            [this.labels.CL_Learner_Placements, val(outData.Projected_Learner_Placements_FY_3__c), val(outData.Projected_Learner_Placements_FY_2__c), val(outData.Projected_Learner_Placements_FY_1__c), val(outData.Projected_Learner_Placements_CFY__c)],
            [this.labels.CL_Learner_Placement_Percentage, val(outData.Projected_Learner_placement_FY_3__c), val(outData.Projected_Learner_placement_FY_2__c), val(outData.Projected_Learner_placement_FY_1__c), val(outData.Projected_Learner_placement_CFY__c)],
            [this.labels.CL_Avg_Cost_per_Placement, val$(outData.Manual_Avg_Cost_per_Placement_FY_3__c), val$(outData.Manual_Avg_Cost_per_Placement_FY_2__c), val$(outData.Manual_Avg_Cost_per_Placement_FY_1__c), val$(outData.Manual_Avg_Cost_per_Placement_CFY__c)]
        ]);
    if (this.isPlacementVerifiedFY1) {
    labelValue(this.labels.CL_Conduct_Verification, outData.X3rd_Party_Verification_Description_FY_1__c, 'Q15');
    const pvFiles = (this.uploadedFilesByCell['P4_FY1_PV'] || []).map(f => f.name).join(', ');
    if (pvFiles) labelValue(this.labels.CL_Upload_verification_report, pvFiles, 'Q15');
}
}

if (showJC) {
    // Q17 — actuals only
    subHead('Q17', this.labels.CL_Job_Creation_Outcomes_Last_3_Fiscal_Years_Actuals);
    table([this.labels.CL_Item, this.fyLabel3, this.fyLabel2, this.fyLabel1], [
        [this.labels.CL_New_Businesses_Started, val(outData.Projected_New_Businesses_FY_3__c), val(outData.Projected_New_Businesses_FY_2__c), val(outData.Projected_New_Businesses_FY_1__c)],
        [this.labels.CL_Jobs_from_New_Businesses, val(outData.Projected_Jobs_from_New_Businesses_FY3__c), val(outData.Projected_Jobs_from_New_Businesses_FY2__c), val(outData.Projected_Jobs_from_New_Businesses_FY1__c)],
        [this.labels.CL_Existing_Businesses_Supported, val(outData.Growing_Businesses_Supported_FY_3__c), val(outData.Growing_Businesses_Supported_FY_2__c), val(outData.Growing_Businesses_Supported_FY_1__c)],
        [this.labels.CL_Jobs_from_Existing_Businesses, val(outData.Jobs_from_Growing_Businesses_FY_3__c), val(outData.Jobs_from_Growing_Businesses_FY_2__c), val(outData.Jobs_from_Growing_Businesses_FY_1__c)],
        [this.labels.CL_Total_Avg_Cost_per_Job_Created, val$(outData.Manual_Avg_Cost_per_Job_FY_3__c), val$(outData.Manual_Avg_Cost_per_Job_FY_2__c), val$(outData.Manual_Avg_Cost_per_Job_FY_1__c)]
    ]);
    if (this.isJobCreationVerifiedFY1) {
        labelValue(this.labels.CL_Conduct_Verification, outData.X3rd_party_verification_details_FY1__c, 'Q17');
        const jcFiles = (this.uploadedFilesByCell['P5_FY1_JV'] || []).map(f => f.name).join(', ');
        if (jcFiles) labelValue(this.labels.CL_Upload_verification_report, jcFiles, 'Q17');
    }

    // Q18 — CFY projections, now its own explicit section
    subHead('Q18', this.labels.CL_Job_Creation_Outcomes_Current_FY_Projections);
    table([this.labels.CL_Item, this.fyLabelCFY], [
        [this.labels.CL_New_Businesses_Started, val(outData.Projected_New_Businesses_CFY__c)],
        [this.labels.CL_Jobs_from_New_Businesses, val(outData.Projected_Jobs_from_New_Businesses_CFY__c)],
        [this.labels.CL_Existing_Businesses_Supported, val(outData.Growing_Businesses_Supported_CFY__c)],
        [this.labels.CL_Jobs_from_Existing_Businesses, val(outData.Jobs_from_Growing_Businesses_CFY__c)],
        [this.labels.CL_Total_Avg_Cost_per_Job_Created, val$(outData.Manual_Avg_Cost_per_Job_CFY__c)]
    ]);
}

const allUploadedFiles = [];
Object.values(this.uploadedFilesByCell || {}).forEach(files => {
    (files || []).forEach(f => { if (f?.name) allUploadedFiles.push(f.name); });
});
if (allUploadedFiles.length > 0) {
    subHead(null, 'Attached Verification Documents');
    printLines(allUploadedFiles.join(', '));
}

// ══ SECTION 4 — Why Wadhwani Charitable Foundation ══
section(this.labels.CL_Why_Wadhwani_Charitable_Foundation);
labelValue(this.labels.CL_Desired_Use_of_Additional_Funding_Investment, this.additionalFundingReviewValue, 'Q19');
if (orgData.GenieAI_Interest_Level__c) {
    labelValue(this.labels.CL_Q20_a_Interest_level_Optional, orgData.GenieAI_Interest_Level__c, 'Q20a');
}
if (synField && this.showSynergiesTextBox) {
    labelValue(this.labels.CL_Operational_Synergies_GenieAI, orgData[synField], 'Q20b');
}
if (this.additionalInfoFiles && this.additionalInfoFiles.length > 0) {
    const q21Names = this.additionalInfoFiles.map(f => f.name).filter(Boolean).join(', ');
    labelValue('Additional Supporting Documentation', q21Names, 'Q21');
}

section(this.labels.CL_Confirmation_of_Accuracy);
labelValue(this.labels.CL_Attesting_User_Name, orgData.Attesting_User_Name__c);
labelValue(this.labels.CL_Attesting_User_Title, orgData.Attesting_User_Title__c);

    checkPage(15);
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_GRAY);
    doc.text(
        `Submitted by: ${orgData.Submitter_Name__c || ''}  |  Generated: ${fmtDate(new Date().toISOString())}`,
        15, pageHeight - 10
    );

    const fileName = `Wadhwani Grants Application ${orgData.Organization_Name__c || 'Draft'}.pdf`;
    doc.save(fileName);

    this.dispatchEvent(new ShowToastEvent({
        title: 'PDF Downloaded',
        message: `${fileName} has been saved.`,
        variant: 'success'
    }));
}
// Orientation handler — skipped for draft, goes straight to saved page
handleStartForm() {
    // Draft skips orientation, this won't be called,
    // but define it to prevent errors if HTML references it
    this.currentPage = 1;
    this._applyVerifiedEmail();
}

// Funder handlers
handleAddFunder() {
    this.hasUnsavedChanges = true;
    if (!this.showFunder2) {
        this.showFunder2 = true;
    } else if (!this.showFunder3) {
        this.showFunder3 = true;
    }
}
handleRemoveFunder2() {
    this.hasUnsavedChanges = true;
     this.showFunder2 = false;
    
 }
handleRemoveFunder3() {
    this.hasUnsavedChanges = true;
     this.showFunder3 = false;
    
 }

// Reference handler
handleAddReference() {
    this.hasUnsavedChanges = true;
    if (!this.showReference2) this.showReference2 = true;
    this.hasUnsavedChanges = true;
}
handleRemoveReference2() {
    this.hasUnsavedChanges = true;
     this.showReference2 = false;
    
 }

// Funding selection (card click)
handleFundingSelection(event) {
    const selectedValue = event.currentTarget.dataset.value;
    this.selectedFundingArea = selectedValue;
    this.organizationData.Organizational_Area_s_for_Funding_Inves__c = selectedValue;

    // Clear the Q1 error as soon as a valid choice is made
    const cardError = this.template.querySelector('.q1-error-msg');
    if (cardError) cardError.style.display = 'none';

    this.handlePicklistChange({ detail: { value: selectedValue } });
}
// Unified skill domain handlers
handleUnifiedSkillInput(event) {
     if (event.target.dataset.section === 'sector') return;
    this.hasUnsavedChanges = true;
    const index = parseInt(event.target.dataset.index, 10);
    let field   = event.target.dataset.field;
    if (field === 'skillEnrolment') field = 'yearlyEnrolment';   // map alias to array prop
    const value = event.target.value;
    this._clearNativeError(event.target);

    if (field === 'domain') {
        const err = this._validateNameLikeField(value, 'Domain / Programme Name');
        if (err) {
            event.target.classList.add('input-error');
        } else {
            event.target.classList.remove('input-error');
        }
    }

    // ── Negative check for numeric domain fields ───────────────────
    const numericFields = ['hours', 'duration', 'yearlyEnrolment'];
    if (numericFields.includes(field) && value !== '' && Number(value) < 0) {
        this.dispatchEvent(new ShowToastEvent({
    title:   this.labels.CL_Invalid_Value,
    message: `${field === 'hours' ? 'Hours' : field === 'duration' ? 'Duration' : 'Yearly Enrolment'} cannot be negative.`,
    variant: 'error'
}));
// ...and the second occurrence in handleBusinessSectorInput() with 'Yearly Enrolment cannot be negative.'
        event.target.value = 0; // reset the native input
        return;
    }

    const arr = JSON.parse(JSON.stringify(this.unifiedSkillDomains));
    arr[index][field] = value;
    this.unifiedSkillDomains = arr;

    if (field === 'startDate') {
    const incorpDate = this.organizationData.Incorporation_Date__c;
    const todayStr = this.todayDateString;
    if (value && incorpDate && value < incorpDate) {
        event.target.classList.add('input-error');
        this._showNativeError(event.target, 'This date cannot be earlier than your Incorporation Date.');
    } else if (value && value > todayStr) {
        event.target.classList.add('input-error');
        this._showNativeError(event.target, 'This date cannot be in the future.');
    } else {
        event.target.classList.remove('input-error');
        this._clearNativeError(event.target);
    }
}
    // Note: skilling domain data is persisted via the dedicated `skillingDomainsJson`
    // parameter sent to saveWCFDraftApplication (which builds the real
    // WCF_Skilling_Domain__c child records). The legacy Skills_Duration_CFY__c /
    // FY_1__c / FY_2__c / FY_3__c JSON fields on Outcomes_Data__c are no longer
    // written to here — they were a pre-migration duplicate of this same data.
}
addUnifiedSkillRow() {
    this.unifiedSkillDomains = [...this.unifiedSkillDomains, this._newSkillRow()];

    
    if (field === 'startDate') {
    const incorpDate = this.organizationData.Incorporation_Date__c;
    if (value && incorpDate && value < incorpDate) {
        event.target.classList.add('input-error');
        this._showInlineDateError(event.target, 'This date cannot be earlier than your Incorporation Date.');
    } else {
        event.target.classList.remove('input-error');
        this._clearInlineDateError(event.target);
    }
}
}
deleteUnifiedSkillRow(event) {
    const index = parseInt(event.currentTarget.dataset.index, 10);
    if (isNaN(index)) return;
    let arr = [...this.unifiedSkillDomains];
    arr.splice(index, 1);
    if (arr.length === 0) {
        arr = [this._newSkillRow()];
    }
    this.unifiedSkillDomains = arr;
}
isDataFilled(dataObj) {
    if (!dataObj) return false;
    return Object.entries(dataObj).some(([key, val]) => {
        if (key === 'Id') return false;
        if (val === null || val === '' || val === undefined) return false;
        if (val === false || val === 0) return false;
        if (typeof val === 'number' && isNaN(val)) return false;
        return true;
    });
}
recalculateAvgCostPerJob() {
    const periods = [
        {
            expense:  () => Number(this.fiscalData.Expense_Projection__c) || 0,
            newBiz:   'Projected_Jobs_from_New_Businesses_CFY__c',
            existBiz: 'Jobs_from_Growing_Businesses_CFY__c',
            avgCost:  'Avg_Cost_per_Job_CFY__c'
        },
        {
            expense:  () => Number(this.historicalData.CY1_Expense__c) || 0,
            newBiz:   'Projected_Jobs_from_New_Businesses_FY1__c',
            existBiz: 'Jobs_from_Growing_Businesses_FY_1__c',
            avgCost:  'Avg_Cost_per_Job_FY_1__c'
        },
        {
            expense:  () => Number(this.historicalData.CY2_Expense__c) || 0,
            newBiz:   'Projected_Jobs_from_New_Businesses_FY2__c',
            existBiz: 'Jobs_from_Growing_Businesses_FY_2__c',
            avgCost:  'Avg_Cost_per_Job_FY_2__c'
        },
        {
            expense:  () => Number(this.historicalData.CY3_Expense__c) || 0,
            newBiz:   'Projected_Jobs_from_New_Businesses_FY3__c',
            existBiz: 'Jobs_from_Growing_Businesses_FY_3__c',
            avgCost:  'Avg_Cost_per_Job_FY_3__c'
        }
    ];

    periods.forEach(p => {
        const expense   = p.expense();
        const totalJobs = (Number(this.outcomeData[p.newBiz])   || 0) +
                          (Number(this.outcomeData[p.existBiz]) || 0);
        this.outcomeData[p.avgCost] = totalJobs > 0
            ? Math.round((expense / totalJobs) * 100) / 100
            : 0;
    });
    this.outcomeData = { ...this.outcomeData };
}
// Business sector handlers
handleBusinessSectorInput(event) {
     if (event.target.dataset.field === 'skillEnrolment') return;
    this.hasUnsavedChanges = true;
     this._clearNativeError(event.target);
    const index = parseInt(event.target.dataset.index, 10);
    const field = event.target.dataset.field;
    const value = event.target.value;

      // ← ADD: re-validate the two fields that validatePage2Fields flags
    if (field === 'sector' && (!value || value.trim() === '')) {
        this._showNativeError(event.target, 'Please select a Business Sector.');
    }
    if (field === 'sectorOther' && (!value || value.trim() === '')) {
        this._showNativeError(event.target, 'Please specify your business sector.');
    }

    // ── Negative check ─────────────────────────────────────────────
    if (field === 'yearlyEnrolment' && value !== '' && Number(value) < 0) {
        this.dispatchEvent(new ShowToastEvent({
            title:   'Invalid Value',
            message: 'Yearly Enrolment cannot be negative.',
            variant: 'error'
        }));
        event.target.value = 0;
        return;
    }

  const arr = JSON.parse(JSON.stringify(this.businessSectors));
    arr[index][field] = value;
    if (field === 'sector' && value !== 'Other') {
        arr[index].sectorOther = '';
    }
    this.businessSectors = arr;
    this._clearChipError(event.target.closest('.domain-card'));
    // ... rest unchanged
    this.organizationData.Business_Sectors_JSON__c = JSON.stringify(this.businessSectors);
        // ✅ NEW — immediate date validation (mirrors handleUnifiedSkillInput)
   if (field === 'supportBegin') {
        const incorpDate = this.organizationData.Incorporation_Date__c;
        const todayStr = this.todayDateString;
        if (value && incorpDate && value < incorpDate) {
            event.target.classList.add('input-error');
            this._showNativeError(event.target, 'This date cannot be earlier than your Incorporation Date.');
        } else if (value && value > todayStr) {
            event.target.classList.add('input-error');
            this._showNativeError(event.target, 'This date cannot be in the future.');
        } else {
            event.target.classList.remove('input-error');
            this._clearNativeError(event.target);
        }
    }
}
handleSupportTypeChip(event) {
    this.hasUnsavedChanges = true;
    event.preventDefault();
    const index = parseInt(event.target.dataset.index, 10);
    const chip = event.target.dataset.chip;
    const arr = JSON.parse(JSON.stringify(this.businessSectors));
    const types = arr[index].supportTypes || [];
    const pos = types.indexOf(chip);
    if (pos === -1) { types.push(chip); } else { types.splice(pos, 1); }
    arr[index].supportTypes = types;
    if (!types.includes('Other')) {          // ← ADD
    arr[index].supportTypeOther = '';
}
    this.businessSectors = arr;
     this._clearChipError(event.target.closest('.domain-card'));
    this.organizationData.Business_Sectors_JSON__c = JSON.stringify(this.businessSectors);
}
handleIncorporationDateChange(event) {
    const value = event.target.value;
    this.hasUnsavedChanges = true;

    const safe = this._isGarbageTypedDate(value) ? '' : value;
    this.organizationData = { ...this.organizationData, Incorporation_Date__c: safe };

    if (!safe) return;
    this._clearNativeError(event.target);
    this._clearLightningError('Incorporation_Date__c');
    if (value > this.todayDateString) {
        this._showLightningError('Incorporation_Date__c',
            this.labels.CL_Incorporation_date_cannot_be_in_the_future);
    }
}
addBusinessSector() {
    this.businessSectors = [...this.businessSectors, this._newSectorRow()];
}
deleteBusinessSector(event) {
    const index = parseInt(event.currentTarget.dataset.index, 10);
    if (isNaN(index)) return;
    let arr = JSON.parse(JSON.stringify(this.businessSectors));
    arr.splice(index, 1);
    if (arr.length === 0) {
        arr = [this._newSectorRow()];
    }
    this.businessSectors = arr;
}
// Attestation
handleAttestationChange(event) {
    this.hasUnsavedChanges = true;
    this.isAttested = event.target.checked;
}

// AI Modal (new version replaces panel)


loadAIFeedback(fieldApiName, submitterName) {
    getAIFeedbackRecord({ submitterName })
        .then(result => {
            const flexFieldMap = {
                'Legal_Structure__c': 'Legal_Structure_FR__c',
                'Organizational_Sustainability__c': 'Organizational_Sustainability_FR__c',
                'Use_of_Additional_Funding__c': 'Use_of_Additional_Funding_FR__c',
                'Operational_Synergies_with_WOF__c': 'Operational_Synergies_with_WOF_FR__c',
                'Operational_Synergies_with_WOF_JC__c': 'Operational_Synergies_with_WOF_JC_FR__c',
                'Operational_Synergies_with_WOF_Both__c': 'Operational_Synergies_with_WOF_Both_FR__c',
                'Skilling_Approach__c': 'Skilling_Approach_FR__c',
                'Job_Creation_Approach__c': 'Job_Creation_Approach_FR__c',
                'Use_of_Additional_Funding_JC__c': 'Use_of_Additional_Funding_JC_FR__c'
            };
            const flexField = flexFieldMap[fieldApiName];
            this.aiResponse = result[flexField] || 'No feedback available.';
            this.isAiLoading = false;
        })
        .catch(err => {
            this.aiResponse = 'Error loading AI feedback.';
            this.isAiLoading = false;
        });
}

closeAIModal() {
    this.isAIModalOpen = false;
    this.aiResponse = '';
    this.isAiLoading = false;
}

get formattedAiSections() {
    if (!this.aiResponse) return [];

    const labels = ['Rating', 'Strengths', 'Weaknesses', 'Summary'];
    // Split the response into chunks anchored at each label, in one pass
    const pattern = new RegExp(`(${labels.join('|')})\\s*:?`, 'gi');
    const parts = this.aiResponse.split(pattern).filter(p => p !== undefined && p.trim() !== '');

    const sections = [];
    for (let i = 0; i < parts.length; i++) {
        if (labels.includes(parts[i])) {
            const label = parts[i];
            const body = parts[i + 1] || '';
            const points = body
                .split(/\n|(?<=\.)\s+(?=[A-Z])/)   // split on newlines or sentence boundaries
                .map(s => s.replace(/^[-•*]\s*/, '').trim())
                .filter(s => s.length > 0);
            sections.push({ title: label, points });
            i++; // skip the body we just consumed
        }
    }

    if (sections.length === 0 && this.aiResponse.trim()) {
        sections.push({
            title: 'Feedback',
            points: this.aiResponse.split(/\n+/).map(l => l.trim()).filter(l => l)
        });
    }
    return sections;
}

handleOutcomeRichTextChange(event) {
    this.activeOutcomeValue = event.detail.value;
}

/*saveModalData() {
    const editor = this.template.querySelector('.custom-modal .text-area');
    if (editor) {
        const value = editor.innerHTML;
        this.outcomeData[this.modalField] = value;
    }
    this.isModalOpen = false;
    // Show success toast
    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Saved',
            message: 'Content saved successfully!',
            variant: 'success'
        })
    );
}*/
saveModalData() {
    this.hasUnsavedChanges = true;
    // Get value from modal rich text editor
    const editor = this.template.querySelector('.custom-modal .text-area');
    if (!editor) return;

    const value = this._sanitizeHtml(editor.innerHTML);
    if (this.modalTarget === 'fiscal') {
        this.fiscalData[this.modalField] = value;
    } else if (this.modalTarget === 'outcome') {
        this.outcomeData[this.modalField] = value;
    } else {
        this.organizationData[this.modalField] = value;
    }

     // ✅ Update the lightning-input value and force revalidation
    const input = this.template.querySelector(
        `lightning-input[data-row="${this.modalField}"]`
    );
    if (input) {
        input.value = this.stripHtml(value); // set plain text
        input.reportValidity();              // clears the error if now filled
    }


    this.isModalOpen = false;

    // Show success toast
    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Saved',
            message: 'Content saved successfully!',
            variant: 'success'
        })
    );
}


stripHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || '';
}

/*closeModal() {
        this.isModalOpen = false;
        this.outcomeModalField = '';
        this.outcomeModalValue = '';
    }*/
closeModal() {
    this.isModalOpen = false;
    this.modalField = '';
    this.modalValue = '';
    this.modalTarget = '';
}

handleOutcomeCheckbox(event) {
    this.hasUnsavedChanges = true;
    const field = event.target.dataset.id;
    this.outcomeData[field] = event.target.checked;
     // If N/A unchecked, clear the value field too
    if (!event.target.checked) {
        const mainField = field.replace('_NA__c', '__c');
        this.outcomeData[mainField] = '';
    }
}

handleOutcomeInput(event) {
    this.hasUnsavedChanges = true;
    const field = event.target.dataset.id;
    let value = event.detail?.value !== undefined ? event.detail.value : (event.target.value ?? '');

    if (event.target.type === 'number') {
        const n = value !== '' && value !== null && value !== undefined ? Number(value) : null;

        // ── Inline negative validation ─────────────────────────────
        if (value !== '' && value !== null && value !== undefined && n < 0) {
            this._showLightningError(field, 'Value cannot be negative.');
            return;
        } else {
            this._clearLightningError(field);
        }

        value = n;
    }
    const VERIFY_CELL_MAP = {
    X3rd_Party_Placement_Verification_FY_1__c: 'P4_FY1_PV',
    Job_Verification_3rd_Party_FY1__c: 'P5_FY1_JV'
};
if (VERIFY_CELL_MAP[field] && !this._isYesValue(field)) {
    const cleared = { ...this.invalidFileCells };
    delete cleared[VERIFY_CELL_MAP[field]];
    this.invalidFileCells = cleared;
}
    this.outcomeData[field] = value;
    this.recalculatePlacementPercentages();
    this.recalculateAvgCostPerPlacement();
    this.recalculateAvgCostPerJob();
}
handleHistoricalInput(event) {
        this.hasUnsavedChanges = true;
        const field = event.target.dataset.id;
        const raw   = event.target.value;
        const value = Number(raw || 0);

        // ── Inline negative validation ─────────────────────────────────
        const labelMap = {
            CY3_Balance_Start_CFY_3__c: 'Balance at Start',
            CY3_Revenue__c: 'FY-3 Revenue', CY2_Revenue__c: 'FY-2 Revenue', CY1_Revenue__c: 'FY-1 Revenue',
            CY3_Capital_Expenditure__c: 'FY-3 Capital Expenditure', CY2_Capital_Expenditure__c: 'FY-2 Capital Expenditure', CY1_Capital_Expenditure__c: 'FY-1 Capital Expenditure',
            CY3_Operating_Expenditure__c: 'FY-3 Operating Expenditure', CY2_Operating_Expenditure__c: 'FY-2 Operating Expenditure', CY1_Operating_Expenditure__c: 'FY-1 Operating Expenditure'
        };
        if (raw !== '' && value < 0) {
            this._showLightningError(field, `${labelMap[field] || field} cannot be negative.`);
            return; // don't cascade computation with bad value
        } else {
            this._clearLightningError(field);
        }

        this.historicalData[field] = value;

        // ── Recompute total Expense (Capex + Opex) whenever either changes ──
        const expenseTotalMap = {
            CY1_Capital_Expenditure__c: ['CY1_Capital_Expenditure__c', 'CY1_Operating_Expenditure__c', 'CY1_Expense__c'],
            CY1_Operating_Expenditure__c: ['CY1_Capital_Expenditure__c', 'CY1_Operating_Expenditure__c', 'CY1_Expense__c'],
            CY2_Capital_Expenditure__c: ['CY2_Capital_Expenditure__c', 'CY2_Operating_Expenditure__c', 'CY2_Expense__c'],
            CY2_Operating_Expenditure__c: ['CY2_Capital_Expenditure__c', 'CY2_Operating_Expenditure__c', 'CY2_Expense__c'],
            CY3_Capital_Expenditure__c: ['CY3_Capital_Expenditure__c', 'CY3_Operating_Expenditure__c', 'CY3_Expense__c'],
            CY3_Operating_Expenditure__c: ['CY3_Capital_Expenditure__c', 'CY3_Operating_Expenditure__c', 'CY3_Expense__c']
        };
        if (expenseTotalMap[field]) {
            const [capexField, opexField, totalField] = expenseTotalMap[field];
            this.historicalData[totalField] =
                (Number(this.historicalData[capexField]) || 0) + (Number(this.historicalData[opexField]) || 0);
        }

        // ── Step 1: Compute FY-3 Balance End ──────────────────────────────
        const cy3Start   = Number(this.historicalData.CY3_Balance_Start_CFY_3__c) || 0;
        const cy3Revenue = Number(this.historicalData.CY3_Revenue__c)              || 0;
        const cy3Expense = Number(this.historicalData.CY3_Expense__c)              || 0;
        const cy3End     = cy3Start + cy3Revenue - cy3Expense;
        this.historicalData.CY3_Balance_End__c = cy3End;

        // ── Step 2: FY-3 End cascades into FY-2 Start ─────────────────────
        this.historicalData.CY2_Balance_Start_CFY_2__c = cy3End;

        // ── Step 3: Compute FY-2 Balance End ──────────────────────────────
        const cy2Revenue = Number(this.historicalData.CY2_Revenue__c) || 0;
        const cy2Expense = Number(this.historicalData.CY2_Expense__c) || 0;
        const cy2End     = cy3End + cy2Revenue - cy2Expense;
        this.historicalData.CY2_Balance_End__c = cy2End;

        // ── Step 4: FY-2 End cascades into FY-1 Start ─────────────────────
        this.historicalData.CY1_Balance_Start_CFY_1__c = cy2End;

        // ── Step 5: Compute FY-1 Balance End ──────────────────────────────
        const cy1Revenue = Number(this.historicalData.CY1_Revenue__c) || 0;
        const cy1Expense = Number(this.historicalData.CY1_Expense__c) || 0;
        const cy1End     = cy2End + cy1Revenue - cy1Expense;
        this.historicalData.CY1_Balance_End__c = cy1End;

        // ── Force reactivity ──────────────────────────────────────────────
        this.historicalData = { ...this.historicalData };

        // ── Recalculate dependent outcome fields ──────────────────────────
        this.recalculateAvgCostPerPlacement();
        this.recalculateAvgCostPerJob();
    }

handleOutcomeCurrencyInput(event) {
    this.hasUnsavedChanges = true;
    const field = event.target.dataset.id;
    const value = Number(event.target.value || 0);
    this.outcomeData[field] = value;
}

get showSubmitOnPage4() {
    const JOB_FULFILLMENT = [
        'Job Fulfillment Only',
        'Solo cumplimiento de empleo',
        'Apenas cumprimento de emprego'
    ];
    return this.currentPage === 4 && JOB_FULFILLMENT.includes(this.selectedFundingArea);
}

get showSubmitOnPage5() {
    const JOB_CREATION = [
        'Job Creation Only',
        'Solo creación de empleo',
        'Apenas criação de emprego'
    ];
    const BOTH = [
        'Both Job Fulfillment and Job Creation',
        'Cumplimiento y creación de empleo',
        'cumprimento e criação de emprego'
    ];
    return this.currentPage === 5 && (JOB_CREATION.includes(this.selectedFundingArea) || BOTH.includes(this.selectedFundingArea));
}

openExplanationModal(event) {
    const row = event.target.dataset.row;
    if (row === 'Revenue') {
        this.activeExplanationField = 'Revenue_Explanation__c';
    } else if (row === 'Expense') {
        this.activeExplanationField = 'Expense_Explanation__c';
    } else if (row === 'Net') {
        this.activeExplanationField = 'Net_Position_Explanation__c';
    }

    this.activeExplanationValue = this.organizationData[this.activeExplanationField] || '';
    this.isExplanationModalOpen = true;
}

handleExplanationChange(event) {
    const field = event.target.dataset.id;

    // If used in modal (with rich-text modal), fall back to active explanation update
    if (field) {
        this.organizationData[field] = event.detail.value;
    } else {
        this.activeExplanationValue = event.detail.value;
    }
}


saveExplanation() {
    this.hasUnsavedChanges = true;
    this.organizationData[this.activeExplanationField] = this.activeExplanationValue;
    this.closeExplanationModal();
}

closeExplanationModal() {
    this.isExplanationModalOpen = false;
    this.activeExplanationField = '';
    this.activeExplanationValue = '';
}

getExplanationPreview(fieldName) {
    const html = this.organizationData[fieldName] || '';
    const txt = html.replace(/<[^>]+>/g, '');
    if (!txt) return '';
    return txt.length > 35 ? `${txt.substring(0, 35)}…` : txt;
}

getOutcomePreview(field) {
    const html = this.outcomeData[field] || '';
    const txt = html.replace(/<[^>]+>/g, '');
    return txt.length > 35 ? `${txt.substring(0, 35)}…` : txt;
}

// Conditions for file upload rendering --- Placement Verified --- 
get isPlacementVerifiedCFY() {
    const val = this.outcomeData.X3rd_Party_Placement_Verification_CFY__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['X3rd_Party_Placement_Verification_CFY__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
get isPlacementVerifiedFY1() {
    const val = this.outcomeData.X3rd_Party_Placement_Verification_FY_1__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['X3rd_Party_Placement_Verification_FY_1__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
get isPlacementVerifiedFY2() {
    const val = this.outcomeData.X3rd_Party_Placement_Verification_FY_2__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['X3rd_Party_Placement_Verification_FY_2__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
get isPlacementVerifiedFY3() {
    const val = this.outcomeData.X3rd_Party_Placement_Verification_FY_3__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['X3rd_Party_Placement_Verification_FY_3__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}

// --- Long-Term Outcomes ---
get isLongTermYesCFY() {
    const val = this.outcomeData.Long_Term_Outcomes_CFY__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['Long_Term_Outcomes_CFY__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
get isLongTermYesFY1() {
    const val = this.outcomeData.Long_Term_Outcomes_FY_1__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['Long_Term_Outcomes_FY_1__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
get isLongTermYesFY2() {
    const val = this.outcomeData.Long_Term_Outcomes_FY_2__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['Long_Term_Outcomes_FY_2__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
get isLongTermYesFY3() {
    const val = this.outcomeData.Long_Term_Outcomes_FY_3__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['Long_Term_Outcomes_FY_3__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
// ----- Job creation verification ---
get isJobCreationVerifiedCFY() {
    const val = this.outcomeData.Job_Verification_3rd_Party_CFY__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['Job_Verification_3rd_Party_CFY__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
get isJobCreationVerifiedFY1() {
    const val = this.outcomeData.Job_Verification_3rd_Party_FY1__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['Job_Verification_3rd_Party_FY1__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
get isJobCreationVerifiedFY2() {
    const val = this.outcomeData.Job_Verification_3rd_Party_FY2__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['Job_Verification_3rd_Party_FY2__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
get isJobCreationVerifiedFY3() {
    const val = this.outcomeData.Job_Verification_3rd_Party_FY3__c;
    if (!val) return false;
    const mapped = this.yesLabelMap['Job_Verification_3rd_Party_FY3__c'];
    return val === mapped || ['Yes','yes','Sí','Sim'].includes(val);
}
@track pageSequence = [1, 2, 4, 6, 7];
@track currentPageIndex = 0;
// currentPage is already declared at the top as 0

    get isPage1() {
        return this.currentPage === 1;
    }

    get isPage2() {
        return this.currentPage === 2;
    }


    get isPage4() {
        return this.currentPage === 4;
    }

    get isPage5() {
    return this.currentPage === 5;
}
   get isPage6() {
    return this.currentPage === 6;
   }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
         return this.currentPageIndex === this.pageSequence.length - 1;
    }

 /*get showPreviewButtonOnPage4() {
    return this.isPage4 && this.selectedFundingArea === 'Job Fulfillment Only';
}
get showPreviewButtonOnPage5() {
    return this.isPage5 && (this.selectedFundingArea === 'Job Creation Only' || this.selectedFundingArea === 'Both Job Fulfillment and Job Creation');
}*/


get showPreviewButton() {
    return this.isPage6;
}
get isPreviewPage1() { return this.previewPage === 1; }
get isPreviewPage2() { return this.previewPage === 2; }
get isPreviewPage3() {
    // Page 3 = Job Fulfillment Outcome Data
    return (
        (this.selectedFundingArea === 'Job Fulfillment Only' && this.previewPage === 3) ||
        (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation' && this.previewPage === 3)
    );
}
get isPreviewPage4() {
    // Page 4 = Job Creation Outcome Data
    return (
        (this.selectedFundingArea === 'Job Creation Only' && this.previewPage === 3) ||
        (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation' && this.previewPage === 4)
    );
}
get isPreviewPage5() {
    // Page 5 is always AI Common Fields
    if (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation')
        return this.previewPage === 5;
    // For single pathways, previewPage 4 is the AI page
    return (this.selectedFundingArea !== 'Both Job Fulfillment and Job Creation') && this.previewPage === 4;
}
get isFirstPreviewPage() { return this.previewPage === 1; }
get isLastPreviewPage() {
    if (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation')
        return this.previewPage === 5;
    return this.previewPage === 4;
}

openPreviewModal() {
     this.syncCustomRichTextFields();        // ⬅️ Ensures all DOM → JS object
    this.updateRichTextFieldsForCurrentPage(); // ⬅️ Ensures current page is updated too
    this.previewPage = 1;
    this.isPreviewVisible = true;
}
handlePreviewNext() {
    if (!this.isLastPreviewPage) this.previewPage += 1;
}
handlePreviewPrevious() {
    if (!this.isFirstPreviewPage) this.previewPage -= 1;
}
handleClosePreview() {
    this.isPreviewVisible = false;
}

get showAIFeedbackPanel() {
    // Only show on Page 2 or Page 3
    return this.isPage2 || this.isPage3 || this.isPage6;
}

@wire(CurrentPageReference)
getStateParameters(currentPageReference) {
    // Only use URL params if recordId not already passed via @api
    if (!this.recordId && currentPageReference?.state?.recordId) {
        this.recordId = currentPageReference.state.recordId;
    }
}
handleBeforeUnload = (event) => {
    if (!this.hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = '';
    return '';
};
connectedCallback() {
    console.log('🔄 connectedCallback fired');
       window.addEventListener('beforeunload', this.handleBeforeUnload);
       this.unifiedSkillDomains = [this._newSkillRow()];
        this.businessSectors = [this._newSectorRow()];

    // ✅ STEP 1: Read lang from URL
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('language') || 'en';
this.languageCode = langParam.split('_')[0].toLowerCase(); // 'en_US' → 'en'

    console.log('🌐 Language from URL param:', langParam, '| code:', this.languageCode);

    // ✅ STEP 1b: Hard reload if langReload=true (forces Salesforce to serve correct language labels)
    
    this.showAiFeedback = true;
    this.isFeedbackMinimized = true;

    // Funding Opp
    console.log('📥 Fetching Funding Opportunity ID…');
    getActiveFundingOpportunityId()
        .then(id => {
            console.log('✅ Funding Opportunity ID:', id);
            this.organizationData.FundingOpportunityId = id;
        })
        .catch(err => console.error('❌ Funding Opp error:', err));
          // ✅ ADD THIS — load PDF libraries early
    this._loadPdfLibraries();

           // ✅ KEY FIX: If recordId already available via @api (from dashboard),
    // load draft immediately — don't wait for @wire
    if (this.recordId) {
        console.log('📥 recordId available in connectedCallback, loading draft...');
        this.loadDraft();
    }
}
// ✅ NEW separate method - called from @wire once recordId is ready
loadDraft() {
    getDraftWCFApplication({ recordId: this.recordId })
        .then((data) => {
            if (!data) return;

            console.log('✅ Draft data received:', JSON.stringify(data));

            // ── 1. Organisation data ─────────────────────────────────────
            // Spread into existing object so default keys are never lost
            const rawApp = data.application || {};
            this.organizationData = { ...this.organizationData, ...rawApp };
            this._initHQFromData();
            console.log('📞 from server:', rawApp.WG_Phone_Country_Code__c);
            // ── 2. Historical data — coerce every field to Number ────────
            const rawHist = data.historical || {};
            const histNumericFields = [
                'CY1_Balance_Start_CFY_1__c', 'CY2_Balance_Start_CFY_2__c', 'CY3_Balance_Start_CFY_3__c',
                'CY1_Revenue__c', 'CY2_Revenue__c', 'CY3_Revenue__c',
                'CY1_Expense__c', 'CY2_Expense__c', 'CY3_Expense__c',
                'CY1_Balance_End__c', 'CY2_Balance_End__c', 'CY3_Balance_End__c'
            ];
            histNumericFields.forEach(f => {
                if (rawHist[f] !== undefined && rawHist[f] !== null && rawHist[f] !== '') {
                    rawHist[f] = Number(rawHist[f]) || 0;
                }
            });
            this.historicalData = { ...this.historicalData, ...rawHist };

            // ── 3. Fiscal data — coerce every field to Number ────────────
            const rawFiscal = data.fiscal || {};
            const fiscalNumericFields = [
                'Revenue_Budget__c', 'Revenue_Projection__c', 'Revenue_Variance__c',
                'Expense_Budget__c', 'Expense_Projection__c', 'Expense_Variance__c',
                'Net_Budget__c', 'Net_Projection__c', 'Net_Variance__c'
            ];
            fiscalNumericFields.forEach(f => {
                if (rawFiscal[f] !== undefined && rawFiscal[f] !== null && rawFiscal[f] !== '') {
                    rawFiscal[f] = Number(rawFiscal[f]) || 0;
                }
            });
            this.fiscalData = { ...this.fiscalData, ...rawFiscal };

           // ── 4. Outcome data — coerce all numeric fields ──────────────
const rawOutcome = data.outcome || {};
const outcomeNumericFields = [
    'Projected_Learner_Enrollments_CFY__c',
    'Projected_Learner_Enrollments_FY_1__c',
    'Projected_Learner_Enrollments_FY_2__c',
    'Projected_Learner_Enrollments_FY_3__c',
    'Projected_Learner_Placements_CFY__c',
    'Projected_Learner_Placements_FY_1__c',
    'Projected_Learner_Placements_FY_2__c',
    'Projected_Learner_Placements_FY_3__c',
    'Projected_Learner_placement_CFY__c',
    'Projected_Learner_placement_FY_1__c',
    'Projected_Learner_placement_FY_2__c',
    'Projected_Learner_placement_FY_3__c',
    'Avg_Cost_per_Placement_CFY__c',
    'Avg_Cost_per_Placement_FY_1__c',
    'Avg_Cost_per_Placement_FY_2__c',
    'Avg_Cost_per_Placement_FY_3__c',
    'Placements_Supporting_Family_of_4_CFY__c',
    'Placements_Supporting_Family_of_4_FY_1__c',
    'Placements_Supporting_Family_of_4_FY_2__c',
    'Placements_Supporting_Family_of_4_FY_3__c',
    'Projected_New_Businesses_CFY__c',
    'Projected_New_Businesses_FY_1__c',
    'Projected_New_Businesses_FY_2__c',
    'Projected_New_Businesses_FY_3__c',
    'Projected_Jobs_from_New_Businesses_CFY__c',
    'Projected_Jobs_from_New_Businesses_FY1__c',
    'Projected_Jobs_from_New_Businesses_FY2__c',
    'Projected_Jobs_from_New_Businesses_FY3__c',
    'Growing_Businesses_Supported_CFY__c',
    'Growing_Businesses_Supported_FY_1__c',
    'Growing_Businesses_Supported_FY_2__c',
    'Growing_Businesses_Supported_FY_3__c',
    'Jobs_from_Growing_Businesses_CFY__c',
    'Jobs_from_Growing_Businesses_FY_1__c',
    'Jobs_from_Growing_Businesses_FY_2__c',
    'Jobs_from_Growing_Businesses_FY_3__c',
    'Jobs_Supporting_Family_CFY__c',
    'Jobs_Supporting_Family_FY_1__c',
    'Jobs_Supporting_Family_FY_2__c',
    'Jobs_Supporting_Family_FY_3__c',
    'Avg_Cost_per_Job_CFY__c',
    'Avg_Cost_per_Job_FY_1__c',
    'Avg_Cost_per_Job_FY_2__c',
    'Avg_Cost_per_Job_FY_3__c'
];

outcomeNumericFields.forEach(f => {
    const val = rawOutcome[f];
    // ✅ KEY FIX: only coerce if value actually exists and is non-null
    // Do NOT default to 0 — keep null/undefined as '' so page 7 shows blank not invisible zero
    if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        rawOutcome[f] = isNaN(num) ? '' : num;
    }
    // if val is null/undefined/'', leave it as-is (empty string from default @track)
});

            // ── 5. Force LWC reactivity on all tracked objects ───────────
            this.organizationData = { ...this.organizationData };
            this.historicalData   = { ...this.historicalData };
            this.fiscalData       = { ...this.fiscalData };
            this.outcomeData      = { ...this.outcomeData, ...rawOutcome };
            // ── 5b. Recompute derived fields after restore ────────────────
            this.recalculatePlacementPercentages();
            this.recalculateAvgCostPerPlacement();
            this.recalculateAvgCostPerJob();

            console.log('✅ outcomeData after restore:', JSON.stringify(this.outcomeData));
            console.log('✅ historicalData after restore:', JSON.stringify(this.historicalData));
            console.log('✅ fiscalData after restore:', JSON.stringify(this.fiscalData));

            // ── 6. Restore Funding Opportunity ID if missing ─────────────
            if (!this.organizationData.FundingOpportunityId) {
                getActiveFundingOpportunityId()
                    .then(id => {
                        this.organizationData = { ...this.organizationData, FundingOpportunityId: id };
                        console.log('🔁 FundingOpportunityId restored:', id);
                    })
                    .catch(err => console.error('❌ FundingOpportunityId restore error:', err));
            }

           // ── 7. Restore business sectors — use child records first ────────────
if (data.businessSectors && Array.isArray(data.businessSectors) 
    && data.businessSectors.length > 0) {
    // ✅ PRIMARY: restore from WCF_Business_Sector__c child records
  this.businessSectors = data.businessSectors.map(r => ({
      key:              this._rowKey(), 
        sector:          r.Sector_c__c           || '',
        sectorOther:     r.Business_Sector_Other__c || '',
        supportBegin:    r.Support_Begin_Date__c  || '',
         supportTypeOther: r.Support_Type_Other__c    || '',
        supportTypes:    r.Support_Types__c
                           ? r.Support_Types__c.split(';')
                           : [],
        yearlyEnrolment: r.Yearly_Enrolment__c   || ''
    }));
} else {
    // ✅ FALLBACK: try Business_Sectors_JSON__c on the application record
    const rawSectors = this.organizationData.Business_Sectors_JSON__c;
    if (rawSectors) {
        try {
            const parsed = JSON.parse(rawSectors);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.businessSectors = parsed.map(r => ({
                    sector:          r.sector          || '',
                    sectorOther:     r.sectorOther      || '',
                    supportBegin:    r.supportBegin    || '',
                    supportTypes:    Array.isArray(r.supportTypes) 
                                       ? r.supportTypes : [],
                    yearlyEnrolment: r.yearlyEnrolment || ''
                }));
            }
        } catch(e) { 
            console.warn('⚠️ Could not parse Business_Sectors_JSON__c:', e); 
        }
    }
}

            // ── 8. Restore unified skill domains ─────────────────────────
            // Try from skillingDomains array returned by Apex first
            if (data.skillingDomains && Array.isArray(data.skillingDomains) && data.skillingDomains.length > 0) {
                this.unifiedSkillDomains = data.skillingDomains.map(r => ({
                    key:             this._rowKey(),
                    period:          r.Fiscal_Year__c        || 'CFY',
                    domain:          r.Domain_Programme_Name__c || '',
                    hours:           r.Hours_of_Training__c     || '',
                    duration:        r.Duration_Months__c        || '',
                    startDate:       r.Programme_Start_Date__c   || '',
                    yearlyEnrolment: r.Yearly_Enrolment__c       || ''
                }));
            } else {
                // Fallback: restore from outcomeData JSON fields
                const combined = [];
                const periodMap = {
                    'CFY': 'Skills_Duration_CFY__c',
                    'FY1': 'Skills_Duration_FY_1__c',
                    'FY2': 'Skills_Duration_FY_2__c',
                    'FY3': 'Skills_Duration_FY_3__c'
                };
                Object.entries(periodMap).forEach(([period, field]) => {
                    const raw = this.outcomeData[field];
                    if (raw) {
                        try {
                            const parsed = JSON.parse(raw);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                parsed.forEach(row => combined.push({ ...row, period }));
                            }
                        } catch(e) { /* not JSON, skip */ }
                    }
                });
                if (combined.length > 0) {
                    this.unifiedSkillDomains = combined;
                }
            }

            // ── 9. Restore funder panel visibility ───────────────────────
            this.showFunder2 = !!(
                this.organizationData.Funder_2_Name__c ||
                this.organizationData.Funder_2_Amount__c
            );
            this.showFunder3 = !!(
                this.organizationData.Funder_3_Name__c ||
                this.organizationData.Funder_3_Amount__c
            );

            // ── 10. Restore reference panel visibility ───────────────────
            this.showReference2 = !!(
                this.organizationData.Reference_2_Name__c ||
                this.organizationData.Reference_2_Email__c
            );
getApplicationAttachments({ applicationId: this.recordId })
    .then(q21Files => {
        this.additionalInfoFiles = q21Files || [];
    })
    .catch(e => {
        console.warn('Q21 attachments load error:', e);
        this.additionalInfoFiles = [];
    });
           // ── FIX 2: In loadDraft — replace the "Restore uploaded files" block ────
// Find the comment "── 11. Restore uploaded files ───" and replace that block:

// ── 11. Restore uploaded files ───────────────────────────────────────────
const serverFiles = data.uploadedFilesByCell || {};

// Deep-clone so mutations are tracked by LWC
const merged = JSON.parse(JSON.stringify(serverFiles));

// Merge any files that were already in local state (e.g. uploaded before draft loaded)
Object.keys(this.uploadedFilesByCell || {}).forEach(k => {
    const local  = this.uploadedFilesByCell[k] || [];
    const remote = merged[k] || [];

    // Combine, deduplicating by documentId
    const combined = [...remote];
    local.forEach(lf => {
        if (!combined.some(rf => rf.documentId === lf.documentId)) {
            combined.push(lf);
        }
    });
    merged[k] = combined;
});

this.uploadedFilesByCell = { ...merged };



// Rebuild the flat uploadedFiles array from the merged cell data
const allDocIds = new Set();
Object.values(this.uploadedFilesByCell).forEach(files => {
    (files || []).forEach(f => {
        if (f.documentId) allDocIds.add(f.documentId);
    });
});
this.uploadedFiles = [...allDocIds];

console.log('✅ uploadedFilesByCell restored:', JSON.stringify(this.uploadedFilesByCell));

            // ── 12. Restore selected funding area & page sequence ────────
            this.selectedFundingArea =
                this.organizationData.Organizational_Area_s_for_Funding_Inves__c || '';

            if (this.selectedFundingArea) {
                this.initializePageSequence(this.selectedFundingArea);
            }

            // ── 13. Handle language redirect ─────────────────────────────
                // ── 13. Handle language ──────────────────────────────────────
const savedLang = this.organizationData.Language__c || 'English';
const urlParams = new URLSearchParams(window.location.search);
const currentLang = (urlParams.get('language') || 'en').split('_')[0].toLowerCase();
const langMap   = { english: 'en', spanish: 'es', portuguese: 'pt' };
const langCode  = langMap[savedLang.toLowerCase()] || 'en';
this.languageCode = langCode;

// ✅ Only redirect when NOT embedded inside dashboard (i.e., standalone page)
// When embedded, recordId comes via @api NOT from URL params
// Check: if recordId is NOT in the URL, we're embedded in dashboard — skip redirect
const recordIdInUrl = urlParams.get('recordId');
if (currentLang !== langCode && recordIdInUrl) {
    // Standalone page — safe to redirect with language param
    const base = window.location.href.split('?')[0];
    window.location.href =
        `${base}?recordId=${this.recordId}&language=${langCode}`;
    return;
} else if (currentLang !== langCode && !recordIdInUrl) {
    // ✅ Embedded in dashboard — fire event to parent to handle redirect
    const base = window.location.href.split('?')[0];
    const redirectUrl = `${base}?recordId=${this.recordId}&language=${langCode}`;
    this.dispatchEvent(new CustomEvent('languageredirect', {
        detail: { redirectUrl, langCode },
        bubbles: true,
        composed: true
    }));
    return;
}
            // ── 14. Load all picklists now that language is confirmed ─────
            this.loadPicklist('IndividualApplication',
                'Organizational_Area_s_for_Funding_Inves__c', 'organizationalAreaValues');
            this.loadPicklist('IndividualApplication',
    'WG_Phone_Country_Code__c', 'phoneCountryCodeOptions');
            this.loadPicklist('Outcomes_Data__c',
                'X3rd_Party_Placement_Verification_CFY__c', 'picklist3rdPartyCFY');
            this.loadPicklist('Outcomes_Data__c',
                'X3rd_Party_Placement_Verification_FY_1__c', 'picklist3rdPartyFY1');
            this.loadPicklist('Outcomes_Data__c',
                'X3rd_Party_Placement_Verification_FY_2__c', 'picklist3rdPartyFY2');
            this.loadPicklist('Outcomes_Data__c',
                'X3rd_Party_Placement_Verification_FY_3__c', 'picklist3rdPartyFY3');
            this.loadPicklist('Outcomes_Data__c',
                'Long_Term_Outcomes_CFY__c', 'picklistLongTermCFY');
            this.loadPicklist('Outcomes_Data__c',
                'Long_Term_Outcomes_FY_1__c', 'picklistLongTermFY1');
            this.loadPicklist('Outcomes_Data__c',
                'Long_Term_Outcomes_FY_2__c', 'picklistLongTermFY2');
            this.loadPicklist('Outcomes_Data__c',
                'Long_Term_Outcomes_FY_3__c', 'picklistLongTermFY3');
            this.loadPicklist('Outcomes_Data__c',
                'Job_Verification_3rd_Party_CFY__c', 'picklistJob3rdPartyCFY');
            this.loadPicklist('Outcomes_Data__c',
                'Job_Verification_3rd_Party_FY1__c', 'picklistJob3rdPartyFY1');
            this.loadPicklist('Outcomes_Data__c',
                'Job_Verification_3rd_Party_FY2__c', 'picklistJob3rdPartyFY2');
            this.loadPicklist('Outcomes_Data__c',
                'Job_Verification_3rd_Party_FY3__c', 'picklistJob3rdPartyFY3');

            // ── 15. Restore page position ────────────────────────────────
            const savedPage = this.organizationData.Last_Page__c;
                // ADD THIS DEBUG
    console.log('🔴 outcomeData being sent to Apex:', JSON.stringify({
        enrol_fy3: this.outcomeData.Projected_Learner_Enrollments_FY_3__c,
        enrol_fy2: this.outcomeData.Projected_Learner_Enrollments_FY_2__c,
        enrol_fy1: this.outcomeData.Projected_Learner_Enrollments_FY_1__c,
        newbiz_fy3: this.outcomeData.Projected_New_Businesses_FY_3__c,
        newbiz_fy2: this.outcomeData.Projected_New_Businesses_FY_2__c,
        newbiz_fy1: this.outcomeData.Projected_New_Businesses_FY_1__c,
        isDataFilled: this.isDataFilled(this.outcomeData)
    }));
            console.log('📄 Saved page:', savedPage, '| Sequence:', this.pageSequence);

            if (savedPage) {
                const savedIndex = this.pageSequence.indexOf(Number(savedPage));
                if (savedIndex !== -1) {
                    this.currentPageIndex = savedIndex;
                    this.currentPage      = Number(savedPage);
                } else {
                    // Page not in sequence (e.g. saved on page 5 which is now removed)
                    this.currentPageIndex = 0;
                    this.currentPage      = this.pageSequence[0];
                }
            } else {
                // No saved page — start at page 1
                this.currentPage = 1;
                this.currentPageIndex = 0;
            }

            // Ensure we never land on page 0 (orientation) for a draft
            if (this.currentPage === 0) {
                this.currentPage = 1;
                this.currentPageIndex = 0;
            }
            // ── Restore fiscal month/day dropdowns from the stored date ──────────
if (this.organizationData.Current_fiscal_year_s_end_date__c) {
    const parts = this.organizationData.Current_fiscal_year_s_end_date__c.split('-');
    if (parts.length === 3) {
        this.fiscalMonthValue = parts[1];
        this.fiscalDayValue   = parts[2];
    }
}
            // ── 16. Restore rich text editor content after render ────────
            setTimeout(() => this.restoreEditorContent(), 300);

            console.log('✅ loadDraft complete. Page:', this.currentPage,
                        '| FundingArea:', this.selectedFundingArea);
        })
        .catch((error) => {
            console.error('❌ loadDraft error:', JSON.stringify(error));
            this.dispatchEvent(new ShowToastEvent({
                title:   'Error loading draft',
                message: error?.body?.message || error?.message || 'Unknown error',
                variant: 'error'
            }));
        });
        // In loadDraft(), at the very end (step 16), increase timeout:
setTimeout(() => this.restoreEditorContent(), 500); // was 300
}

get allOutcomeFilesList() {
    // Only show files for the currently filled cells (not all keys)
    const allFiles = new Set(); // Use a Set to avoid duplicates

    // Option 1: Only show files for filled fields
    // Example: outcome fields you care about, update as needed
    const relevantKeys = [
        'P4_CFY_PV','P4_FY1_PV','P4_FY2_PV','P4_FY3_PV',
        'P4_CFY_LT','P4_FY1_LT','P4_FY2_LT','P4_FY3_LT',
        'P5_CFY_JV','P5_FY1_JV','P5_FY2_JV','P5_FY3_JV'
    ];
    if (this.uploadedFilesByCell) {
        relevantKeys.forEach(key => {
            if(this.uploadedFilesByCell[key]) {
                this.uploadedFilesByCell[key].forEach(file => {
                    allFiles.add(file.name);
                });
            }
        });
    }
    return [...allFiles].join(', ');
}
  

    
 // ── 1. Fix loadPicklist — normalize yesLabelMap ────────────────────
loadPicklist(objectApi, fieldApi, targetVar) {
    getPicklistValuesForField({ 
        objectApiName: objectApi, 
        fieldApiName: fieldApi, 
        languageCode: this.languageCode 
    })
    .then(result => {
        this[targetVar] = result;

        const savedValue = this.organizationData[fieldApi] || this.outcomeData[fieldApi];
        if (savedValue && fieldApi === 'Organizational_Area_s_for_Funding_Inves__c') {
            this.selectedFundingArea = savedValue;
        }

        // ✅ FIX: broader yes detection covering all language variants
        const YES_VALUES = ['Yes', 'yes', 'Sí', 'sí', 'Sim', 'sim'];
        const yesOption = result.find(opt => 
            YES_VALUES.includes(opt.value) || YES_VALUES.includes(opt.label)
        );
        if (yesOption) {
            this.yesLabelMap[fieldApi] = yesOption.value;
        }
    })
    .catch(error => {
        console.error(`❌ Error loading ${fieldApi} picklist:`, error);
    });
}

      async fetchFundingOpportunityId() {
            try {
                const id = await getActiveFundingOpportunityId();
                this.organizationData.FundingOpportunityId = id;
                console.log('Fetched Funding Opportunity ID:', id);
            } catch (error) {
                console.error('Failed to fetch Funding Opportunity ID:', error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: 'Could not load Funding Opportunity.',
                        variant: 'error'
                    })
                );
            }
        }
   
initializePageSequence(value) {
    const JOB_FULFILLMENT = ['Job Fulfillment Only'];
    const JOB_CREATION    = ['Job Creation Only'];
    const BOTH            = ['Both Job Fulfillment and Job Creation'];

    if (JOB_FULFILLMENT.includes(value) || JOB_CREATION.includes(value) || BOTH.includes(value)) {
        this.pageSequence = [1, 2, 4, 6, 7];
    } else {
        this.pageSequence = [1];
    }

    // ✅ Only reset position if we're still on page 0 or 1
    if (this.currentPage <= 1) {
        this.currentPageIndex = 0;
        this.currentPage = this.pageSequence[0];
    }
}
/* Custom RIch Text Functions */
 setActiveField(event) {
        this.activeField = event.target;
    }

// ADD THIS — was accidentally removed when duplicate handlePaste was cleaned up
insertPlainTextAtCursor(text) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const lines = text.split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
        if (i < lines.length - 1) {
            const br = document.createElement('br');
            range.insertNode(br);
        }
        range.insertNode(document.createTextNode(lines[i]));
    }

    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

 /* handleInput(event) {
        const field = event.target.dataset.field;
        this.organizationData[field] = event.target.innerHTML;
    }*/
handleInput(event) {
    this.hasUnsavedChanges = true;
    const fieldRich = event.target?.dataset?.field
                   || event.currentTarget?.dataset?.field;
    const fieldId   = event.target?.dataset?.id;
    const field     = fieldRich || fieldId;

    if (!field || field === 'undefined') return;

    if (event.target.isContentEditable) {
        const el    = event.target;
        const text  = (el.innerText || '').trim();
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const count = words.length;

        const limit = this.WORD_LIMITS[field]
            ?? (field === this.operationalSynergiesFieldApi ? 200 : null);

        // Update counter with actual count
        this._updateWordCounter(field, count);

        // Show/clear over-limit warning
        if (limit !== null) {
            // Find or create the warning badge inside the richtext wrapper
            const wrapper = el.closest('.modern-richtext-wrapper');
            let badge = wrapper?.querySelector('.word-limit-warning');

            if (count > limit) {
                el.classList.add('richtext-overlimit');
                if (wrapper) {
                    if (!badge) {
                        badge = document.createElement('div');
                        badge.className = 'word-limit-warning word-limit-warning--over';
                        wrapper.appendChild(badge);
                    }
                    badge.className = 'word-limit-warning word-limit-warning--over';
                    badge.textContent = `⚠️ Over limit: ${count} / ${limit} words. Please shorten before proceeding.`;
                    badge.style.display = 'block';
                }
            } else if (count >= Math.floor(limit * 0.9)) {
                el.classList.remove('richtext-overlimit');
                if (wrapper) {
                    if (!badge) {
                        badge = document.createElement('div');
                        badge.className = 'word-limit-warning word-limit-warning--warn';
                        wrapper.appendChild(badge);
                    }
                    badge.className = 'word-limit-warning word-limit-warning--warn';
                    badge.textContent = `📝 Approaching limit: ${count} / ${limit} words.`;
                    badge.style.display = 'block';
                }
            } else {
                el.classList.remove('richtext-overlimit');
                if (badge) {
                    badge.style.display = 'none';
                }
            }
        }

        // Save to correct data object
        const html         = this._sanitizeHtml(el.innerHTML);
        const fiscalFields = [
            'Revenue_Explanation__c',
            'Expense_Explanation__c',
            'Net_Position_Explanation__c'
        ];
        if (fiscalFields.includes(field)) {
            this.fiscalData[field] = html;
        } else {
            this.organizationData[field] = html;
        }

        this._clearFieldError(field);

    } else {
        // Standard lightning-input / lightning-combobox
        const val = event.detail?.value !== undefined
            ? event.detail.value
            : (event.target.value ?? '');

        // Inline validation for numeric Amount fields
        const amountFields = [
            'Funder_1_Amount__c',
            'Funder_2_Amount__c',
            'Funder_3_Amount__c'
        ];
        if (amountFields.includes(field) && val !== '' && val !== null && val !== undefined) {
            const n = Number(val);
            if (isNaN(n) || n < 0) {
                this._showLightningError(field, 'Please enter a valid positive number.');
            } else {
                this._clearLightningError(field);
            }
        }

        // Basic email sanity check beyond native type="email" (catches things like
        // "a@@b.com" or "a@b@c.com" that some browsers' native validation can miss)
        if (field === 'Work_Email_ID__c' && val) {
            const atCount = (val.match(/@/g) || []).length;
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (atCount !== 1 || !emailPattern.test(val)) {
                this._showLightningError(field, 'Please enter a valid email address.');
            } else {
                this._clearLightningError(field);
            }
        }

        // ── Real-time text-quality validation (mirrors validatePage1Fields) ──
        const liveTextValidators = {
            Organization_Name__c:             v => this._validateNameLikeField(v, 'Organization Name'),
            Headquarters_City_and_Country__c: v => this._validateHQCityCountry(v),
            Phone__c: v => this._validatePhoneField(v, this.organizationData.WG_Phone_Country_Code__c),
            Leader_Name__c:                   v => this._validateNameLikeField(v, 'Leader Name'),
            Leader_Title__c:                  v => this._validateNameLikeField(v, 'Leader Title'),
             Primary_Service_Regions__c:       v => this._validateRegionsField(v),
            Submitter_Name__c:                v => this._validateNameLikeField(v, 'Submitter Name'),
            Job_Title__c:                      v => this._validateNameLikeField(v, 'Submitter Title'),
        };

        if (liveTextValidators[field]) {
            if (val) {
                const err = liveTextValidators[field](val);
                if (err) {
                    this._showLightningError(field, err);
                } else {
                    this._clearLightningError(field);
                }
            } else {
                // empty is handled by the `required` whitespace check below / on Next
                this._clearLightningError(field);
            }
        }

        // A required text field containing only spaces is not real data
        // (skip fields that already have their own dedicated validity handling above)
       // A required text field containing only spaces is not real data
        // (skip fields that already have their own dedicated validity handling above)
        const handledByFieldSpecificCheck =
            amountFields.includes(field) ||
            field === 'Work_Email_ID__c' ||
            !!liveTextValidators[field];   // ← add this
        if (!handledByFieldSpecificCheck && event.target.required && typeof val === 'string') {
            if (val.length > 0 && val.trim() === '') {
                this._showLightningError(field, 'This field cannot contain only spaces.');
            } else {
                this._clearLightningError(field);
            }
        }

        // "Other" picklists: clear the paired free-text field once the user
        // picks something other than "Other", so stale text never gets submitted.
        if (field === 'Legal_Type__c' && val !== 'Other') {
            this.organizationData.Legal_Type_Other__c = '';
        }
        if (field === 'Registration_Jurisdiction__c' && val !== 'Other') {
            this.organizationData.Registration_Jurisdiction_Other__c = '';
        }

        this.organizationData[field] = val;
        if (val) this._clearFieldError(field);
        if (field === 'WG_Phone_Country_Code__c') {
    const phoneVal = this.organizationData.Phone__c;
    if (phoneVal) {
        const err = this._validatePhoneField(phoneVal, val);
        if (err) this._showLightningError('Phone__c', err);
        else this._clearLightningError('Phone__c');
    }
}
    }
   
}

handlePaste(event) {
    this.hasUnsavedChanges = true;
    event.preventDefault();

    const plainText = event.clipboardData.getData('text/plain');
    const target    = event.target;
    const field     = target?.dataset?.field;

    // Insert at cursor without any truncation
    this.insertPlainTextAtCursor(plainText.trim());

    if (!field || field === 'undefined') return;

    const limit = this.WORD_LIMITS[field]
        ?? (field === this.operationalSynergiesFieldApi ? 200 : null);

    // Update counter — never strip content
    const allWords = (target.innerText || '')
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0);
    const count = allWords.length;

    this._updateWordCounter(field, count);

    // Show/clear warning badge (mirrors handleInput logic)
    if (limit !== null) {
        const wrapper = target.closest('.modern-richtext-wrapper');
        let badge = wrapper?.querySelector('.word-limit-warning');

        if (count > limit) {
            target.classList.add('richtext-overlimit');
            if (wrapper) {
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'word-limit-warning word-limit-warning--over';
                    wrapper.appendChild(badge);
                }
                badge.className = 'word-limit-warning word-limit-warning--over';
                badge.textContent = `⚠️ Over limit: ${count} / ${limit} words. Please shorten before proceeding.`;
                badge.style.display = 'block';
            }
        } else if (count >= Math.floor(limit * 0.9)) {
            target.classList.remove('richtext-overlimit');
            if (wrapper) {
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'word-limit-warning word-limit-warning--warn';
                    wrapper.appendChild(badge);
                }
                badge.className = 'word-limit-warning word-limit-warning--warn';
                badge.textContent = `📝 Approaching limit: ${count} / ${limit} words.`;
                badge.style.display = 'block';
            }
        } else {
            target.classList.remove('richtext-overlimit');
            if (badge) {
                badge.style.display = 'none';
            }
        }
    }

    // Save to correct data object
    const html         = this._sanitizeHtml(target.innerHTML);
    const fiscalFields = [
        'Revenue_Explanation__c',
        'Expense_Explanation__c',
        'Net_Position_Explanation__c'
    ];
    if (fiscalFields.includes(field)) {
        this.fiscalData[field] = html;
    } else {
        this.organizationData[field] = html;
    }

    this._clearFieldError(field);
}
 boldText() {
            if (this.activeField) {
                document.execCommand('bold', false, null);
            }
        }
               
        italicText() {
            if (this.activeField) {
            document.execCommand('italic', false, null);
            }
        }
        
        underlineText() {
            if (this.activeField) {
                document.execCommand('underline', false, null);
                }
        }
    // Align Left
alignLeft(event) {
    if (this.activeField) {
        document.execCommand('justifyLeft', false, null);
    }
}

// Align Center
alignCenter() {
    if (this.activeField) {
        document.execCommand('justifyCenter', false, null);
    }
}

// Align Right
alignRight() {
    if (this.activeField) {
        document.execCommand('justifyRight', false, null);
        }
}

// Change Font
changeFont(event) {
    if (this.activeField) {
        let font = event.target.value;  // Get selected font
        document.execCommand('fontName', false, font);
        }
}

// Change Font Size
changeFontSize(event) {
    if (this.activeField) {
        let size = event.target.value;  // Get selected font size
        document.execCommand('fontSize', false, size);
        }
}

insertNumberList() {
    const field = this.activeField;
    if (!field) return;

    field.focus();

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    // Insert `1. ` at the beginning
    const textNode = document.createTextNode('1. ');
    range.insertNode(textNode);

    // Move cursor after `1. `
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
} 
 

//Bullet
 insertBulletPoints() {
    const field = this.activeField;
    if (!field) return;

    field.focus();

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    // Insert • at beginning
    const textNode = document.createTextNode('• ');
    range.insertNode(textNode);

    // Move cursor after the bullet
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

sanitizeRichText(htmlContent) {
    if (!htmlContent) {
        return '';
    }

    // Remove HTML tags
    let doc = new DOMParser().parseFromString(htmlContent, "text/html");
    let textContent = doc.body.textContent || "";

    // Remove extra spaces and special characters like &nbsp;
    return textContent.replace(/\u00A0/g, ' ').trim();
}

// ── Security: allow-list HTML sanitizer ─────────────────────────────────
// Applied to every rich-text value before it is (a) persisted to
// organizationData/fiscalData and (b) written back into a contenteditable
// element via innerHTML. Prevents script/event-handler/iframe injection
// (e.g. <script>, onerror=, javascript: URLs) from a crafted paste, a
// direct API/devtools edit of a draft, or any future input path — while
// preserving the plain formatting (bold/italic/underline/bullets) the
// toolbar produces. Unknown tags are unwrapped (text kept, tag dropped)
// rather than deleted, so real user content is never silently lost.
_sanitizeHtml(html) {
    if (!html) return '';

    const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'SPAN']);

    let doc;
    try {
        doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
        return '';
    }

    const clean = (node) => {
        Array.from(node.childNodes).forEach(child => {
            if (child.nodeType === Node.COMMENT_NODE) {
                child.remove();
                return;
            }
            if (child.nodeType !== Node.ELEMENT_NODE) {
                return; // text nodes are always safe
            }
            // Sanitize descendants FIRST, before this tag can be unwrapped/promoted —
            // otherwise a dangerous nested tag (e.g. <svg><image onerror=...>) can
            // survive by riding along when its disallowed parent is unwrapped.
            clean(child);
            if (!ALLOWED_TAGS.has(child.tagName)) {
                // Unwrap: keep the text/content, drop the (potentially dangerous) tag itself
                const parent = child.parentNode;
                while (child.firstChild) parent.insertBefore(child.firstChild, child);
                parent.removeChild(child);
                return;
            }
            // Strip every attribute (kills onclick=, onerror=, style=, href="javascript:", src=, etc.)
            Array.from(child.attributes).forEach(attr => child.removeAttribute(attr.name));
        });
    };

    clean(doc.body);
    return doc.body.innerHTML;
}

validateRichTextFields() {
    let isValid = true;

   const page6RequiredFields = [
        { name: this.additionalFundingFieldApi, label: 'Direction for Additional Funding', limit: 500 }
    ];
    if (this.operationalSynergiesFieldApi && this.showSynergiesTextBox) {
        page6RequiredFields.push({
            name:  this.operationalSynergiesFieldApi,
            label: this.operationalSynergiesLabel || 'Operational Synergies',
            limit: 200
        });
    }

    const fieldsByPage = {
        1: [{ name: 'Legal_Structure__c', label: 'Legal Structure', limit: 100 }],
        2: [],
        4: [{ name: 'Organizational_Sustainability__c', label: 'Organizational Sustainability', limit: 100 }],
        6: page6RequiredFields
    };

    if (this.currentPage === 2) {
        if (this.showJFWhatYouDo)
            fieldsByPage[2].push({ name: 'Skilling_Approach__c', label: 'Your Skilling Approach', limit: 500 });
        if (this.showJCOrBothWhatYouDo)
            fieldsByPage[2].push({ name: 'Job_Creation_Approach__c', label: 'Your Job Creation Approach', limit: 500 });
    }
    if (this.currentPage === 4 && this.showCFYExplanation) {
        fieldsByPage[4].push({ name: 'Revenue_Explanation__c', label: 'Variance Explanation', limit: 200 });
    }

    const requiredFields = fieldsByPage[this.currentPage] || [];

    requiredFields.forEach(fieldObj => {
        const field    = this.template.querySelector(`[data-field="${fieldObj.name}"]`);
        if (!field) return;
        const errorMsg = this.template.querySelector(`[data-error="${fieldObj.name}"]`);
        const rawText  = field?.innerText?.trim() || '';
        const rawHtml  = field?.innerHTML?.trim() || '';
        const words    = rawText.split(/\s+/).filter(w => w.length > 0);
        const count    = words.length;

        let errorText = '';
        if (!field || rawHtml === '' || rawHtml === '<br>' || count === 0) {
            errorText = `${fieldObj.label} is required.`;
       // Inside validateRichTextFields() — replace the error text for over-limit:
        } else if (fieldObj.limit && count > fieldObj.limit) {
        errorText = `${fieldObj.label} exceeds the ${fieldObj.limit}-word limit (currently ${count} words). Please shorten before proceeding.`;
            }

        if (errorText) {
            field?.classList.add('invalid-field');
            this._registerInvalid(field);
            if (errorMsg) { errorMsg.textContent = errorText; errorMsg.style.display = 'block'; }
            isValid = false;
        } else {
            field?.classList.remove('invalid-field');
            this._invalidElements = this._invalidElements.filter(x => x !== field);
            if (errorMsg) { errorMsg.textContent = ''; errorMsg.style.display = 'none'; }
        }
    });

    return isValid;
}
updateRichTextFieldsForCurrentPage() {
  const pageFields = {
        1: ['Legal_Structure__c', 'Skilling_Approach__c', 'Job_Creation_Approach__c'],
        2: ['Skilling_Approach__c', 'Job_Creation_Approach__c'],
        4: [
            'Organizational_Sustainability__c',
            'Revenue_Explanation__c'
        ],
        6: [
            this.additionalFundingFieldApi,
            this.operationalSynergiesFieldApi
        ]
    };

    const fiscalRichFields = ['Revenue_Explanation__c', 'Expense_Explanation__c'];

    const fields = (pageFields[this.currentPage] || []).filter(Boolean);
    fields.forEach(field => {
        const el = this.template.querySelector(`[data-field="${field}"]`);
        if (el) {
            const clean = this._sanitizeHtml(el.innerHTML.trim());
            if (fiscalRichFields.includes(field)) {
                // ✅ Route fiscal fields to fiscalData, not organizationData
                this.fiscalData[field] = clean;
            } else {
                this.organizationData[field] = clean;
            }
        }
    });
            console.log("Updated rich text fields for preview:", JSON.stringify(this.organizationData, null, 2)); //applicationData
        } 

cleanRichText(htmlContent) {
    if (!htmlContent) return '';

    let doc = new DOMParser().parseFromString(htmlContent, "text/html");

    // Remove inline styles and unnecessary span/div tags
    doc.querySelectorAll("span, div").forEach(el => {
        el.removeAttribute("style"); 
        el.replaceWith(...el.childNodes);
    });

    // Replace non-breaking spaces with regular spaces
    return doc.body.innerHTML.replace(/\u00A0/g, ' ').trim();
}

get formattedLegalStructure() {
    return this.cleanRichText(this.organizationData.Legal_Structure__c);
}

get formattedOrganizationSustainability() {
    return this.cleanRichText(this.organizationData.Organizational_Sustainability__c);
}

get formattedUseAdditionalFunds() {
    return this.cleanRichText(this.organizationData.Use_of_Additional_Funding__c);
}
 
get formattedOperationalSynergies() {
    return this.cleanRichText(this.organizationData.Operational_Synergies_with_WOF__c);
}

get formattedUseAdditionalFundsJob() {
    return this.cleanRichText(this.organizationData.Use_of_Additional_Funding_JC__c);
}

get formattedOperationalSynergiesJob() {
    return this.cleanRichText(this.organizationData.Operational_Synergies_with_WOF_JC__c);
}

get formattedOperationalSynergiesBoth() {
    return this.cleanRichText(this.organizationData.Operational_Synergies_with_WOF_Both__c);
}

updateCustomRichTextFields() {
    const richTextFields = this.template.querySelectorAll('.text-area');
    richTextFields.forEach(element => {
        const fieldName = element.dataset.field;
        if (fieldName) {
            this.organizationData[fieldName] = this._sanitizeHtml(element.innerHTML);
        }
    });
}
_showLightningError(dataId, message) {
    try {
        const el = this.template.querySelector(`[data-id="${dataId}"]`);
        if (el?.setCustomValidity) {
            el.setCustomValidity(message);
            el.reportValidity();
             this._registerInvalid(el); 
        }
    } catch(e) {
        console.warn('_showLightningError failed for:', dataId, e.message);
    }
}

_clearLightningError(dataId) {
    try {
        const el = this.template.querySelector(`[data-id="${dataId}"]`);
        if (el?.setCustomValidity) {
            el.setCustomValidity('');
            el.reportValidity();
            this._invalidElements = this._invalidElements.filter(x => x !== el);   // ← add
        }
    } catch(e) {
        console.warn('_clearLightningError failed for:', dataId, e.message);
    }
}

_showInlineDateError(inputEl, message) {
    let errEl = inputEl.parentElement.querySelector('.inline-date-error-msg');
    if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'inline-date-error-msg';
        errEl.style.color = '#C23934';
        errEl.style.fontSize = '12px';
        errEl.style.marginTop = '4px';
        inputEl.parentElement.appendChild(errEl);
    }
    errEl.textContent = message;
    errEl.style.display = 'block';
}
// ── Native <input>/<select> inline error helpers ───────────────────────
_fieldErrorHost(el) {
    // NOTE: .date-field-wrapper is deliberately excluded — it's position:relative
    // and holds the overlay <span>; appending a <p> inside it breaks the layout.
    return el.closest('.domain-field-item, .domain-name-field, .modern-field, .verify-block')
        || el.parentElement;
}

_showNativeError(el, message) {
    if (!el) return;
    el.classList.add('input-error');
    const host = this._fieldErrorHost(el);
    if (!host) return;
    let errEl = host.querySelector('.field-error-msg');
    if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'field-error-msg';
        errEl.style.color      = '#C23934';
        errEl.style.fontSize   = '12px';
        errEl.style.lineHeight = '1.4';
        errEl.style.marginTop  = '4px';
        host.appendChild(errEl);
    }
    errEl.textContent = message;
    errEl.style.display = 'block';
    this._registerInvalid(el);
}

_clearNativeError(el) {
    if (!el) return;
    el.classList.remove('input-error');
    const host = this._fieldErrorHost(el);
    const errEl = host && host.querySelector('.field-error-msg');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    this._invalidElements = this._invalidElements.filter(x => x !== el);
}

// Chip groups have no single input to attach to — target the row container
_showChipError(card, message) {
    const row = card?.querySelector('.sector-chips-row');
    if (!row) return;
    row.classList.add('chips-error');
    let errEl = row.parentElement.querySelector('.field-error-msg');
    if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'field-error-msg';
        errEl.style.color = '#C23934';
        errEl.style.fontSize = '12px';
        errEl.style.marginTop = '4px';
        row.parentElement.appendChild(errEl);
    }
    errEl.textContent = message;
    errEl.style.display = 'block';
    this._registerInvalid(row);
}

_clearChipError(card) {
    const row = card?.querySelector('.sector-chips-row');
    if (!row) return;
    row.classList.remove('chips-error');
    const errEl = row.parentElement.querySelector('.field-error-msg');
    if (errEl) { errEl.style.display = 'none'; }
    this._invalidElements = this._invalidElements.filter(x => x !== row);
}
_clearInlineDateError(inputEl) {
    const errEl = inputEl.parentElement.querySelector('.inline-date-error-msg');
    if (errEl) errEl.style.display = 'none';
}
// ── Picker-only date entry ────────────────────────────────────────────
// Typing into the segments of a native <input type="date"> lets the browser
// commit a complete-but-absurd value (0006-06-06, 7676-05-06). min/max only
// mark it :invalid — they never block it. Blocking keydown stops the bad
// value from ever existing.
_DATE_FLOOR = '1900-01-01';
_DATE_ALLOWED_KEYS = new Set(['Tab', 'Escape', 'Enter', 'Backspace', 'Delete']);
_dateHintTimer = null;

_isGarbageTypedDate(v) {
    if (!v) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return true;
    return v < this._DATE_FLOOR;
}

blockDateTyping(event) {
    if (this._DATE_ALLOWED_KEYS.has(event.key)) return;
    if ((event.ctrlKey || event.metaKey) && ['c', 'a'].includes(event.key.toLowerCase())) return;
    event.preventDefault();
    this._showDatePickerHint(event.target);
}

blockDatePaste(event) {
    event.preventDefault();
    this._showDatePickerHint(event.target);
}

// Shown the moment a keystroke is blocked, so the field never just "does
// nothing". Auto-hides so a stale warning doesn't sit under a valid date.
_showDatePickerHint(el) {
    if (!el) return;
    this._showNativeError(el, 'Please pick a date using the calendar icon — typing is not allowed here.');
    clearTimeout(this._dateHintTimer);
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    this._dateHintTimer = setTimeout(() => {
        if (el.isConnected) this._clearNativeError(el);
    }, 4000);
}

openDatePicker(event) {
    const el = event.currentTarget;
    clearTimeout(this._dateHintTimer);
    this._clearNativeError(el);
    if (typeof el.showPicker !== 'function') return;
    try { el.showPicker(); } catch (e) { /* no user gesture / unsupported */ }
}

// Backstop for values arriving from a stale draft, autofill, or a browser
// that ignores the keydown block.
_clearGarbageDate(el) {
    if (!this._isGarbageTypedDate(el.value)) { this._clearNativeError(el); return; }
    this._showNativeError(el, 'Please pick a date using the calendar (year 1900 or later).');
    el.value = '';
    this.hasUnsavedChanges = true;

    const id = el.dataset.id, field = el.dataset.field;
    const idx = parseInt(el.dataset.index, 10);
    if (id === 'Incorporation_Date__c') {
        this.organizationData = { ...this.organizationData, Incorporation_Date__c: '' };
    } else if (field === 'startDate' && !isNaN(idx)) {
        const a = [...this.unifiedSkillDomains]; a[idx] = { ...a[idx], startDate: '' };
        this.unifiedSkillDomains = a;
    } else if (field === 'supportBegin' && !isNaN(idx)) {
        const a = [...this.businessSectors]; a[idx] = { ...a[idx], supportBegin: '' };
        this.businessSectors = a;
    }
}

handleDateFocusOut(event) {
    if (event.target.type === 'date') this._clearGarbageDate(event.target);
}
scrollToTop() {
    const formEl = this.template.querySelector('.centered-form-container');
    if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
restoreEditorContent() {
    // Org rich text fields
 const orgRichTextFields = [
        'Legal_Structure__c',
        'Organizational_Sustainability__c',
        'Use_of_Additional_Funding__c',
        'Use_of_Additional_Funding_JC__c',
        'Operational_Synergies_with_WOF__c',
        'Operational_Synergies_with_WOF_JC__c',
        'Operational_Synergies_with_WOF_Both__c',
        'Skilling_Approach__c',
        'Job_Creation_Approach__c'
    ];
    orgRichTextFields.forEach(field => {
        const el = this.template.querySelector(`[data-field="${field}"]`);
        if (el && this.organizationData[field] && el.innerHTML !== this.organizationData[field]) {
            el.innerHTML = this._sanitizeHtml(this.organizationData[field]);
            this._recalcWordCount(field, el); // ✅ ADD THIS
        }
    });

    const fiscalRichTextFields = [
        'Revenue_Explanation__c',
        'Expense_Explanation__c',
        'Net_Position_Explanation__c'
    ];
    fiscalRichTextFields.forEach(field => {
        const el = this.template.querySelector(`[data-field="${field}"]`);
        if (el && this.fiscalData[field] && el.innerHTML !== this.fiscalData[field]) {
            el.innerHTML = this._sanitizeHtml(this.fiscalData[field]);
            this._recalcWordCount(field, el); // ✅ ADD THIS
        }
    });
}

// ✅ NEW helper — recalculates and sets the word counter for a given field
_recalcWordCount(field, el) {
    const limit = this.WORD_LIMITS[field]
        ?? (field === this.operationalSynergiesFieldApi ? 200 : null);
    if (limit === null) return;

    const text  = (el.innerText || '').trim();
    const count = text.split(/\s+/).filter(w => w.length > 0).length;
    this._updateWordCounter(field, Math.min(count, limit));
}
renderedCallback() {
    this.template.querySelectorAll(
        '[contenteditable="true"][data-field]'
    ).forEach(el => {
        const field = el.dataset.field;
        if (!field || field === 'undefined') return;

        const fiscalFields = [
            'Revenue_Explanation__c',
            'Expense_Explanation__c',
            'Net_Position_Explanation__c'
        ];

        const source = fiscalFields.includes(field)
            ? this.fiscalData
            : this.organizationData;

        const storedValue = source[field];
        if (
            storedValue !== undefined &&
            storedValue !== null &&
            storedValue !== '' &&
            el.innerHTML !== storedValue
        ) {
            el.innerHTML = this._sanitizeHtml(storedValue);
            this._recalcWordCount(field, el); // ✅ ADD THIS
        }
    });

    // Bind real-time input event listeners to all number/text inputs on render
    if (!this._inputListenersBound) {
        this._inputListenersBound = true;
        this.template.addEventListener('input', this.handleLiveInput.bind(this));
    }

    // Initialise / tear down the phone picker as pages render
    this._managePhoneIti();
}

handleLiveInput(event) {
    const target = event.target;
    const isNumberField = (target.tagName === 'LIGHTNING-INPUT' && target.type === 'number') 
                       || (target.tagName === 'INPUT' && (target.type === 'number' || target.inputmode === 'numeric'));
                       
    if (isNumberField) {
        const fieldId = target.dataset.id;
        const fieldName = target.dataset.field;
        
        if (fieldId) {
            if (fieldId.startsWith('CY1_') || fieldId.startsWith('CY2_') || fieldId.startsWith('CY3_')) {
                this.handleHistoricalInput(event);
            } else if (fieldId.startsWith('Projected_') || fieldId.startsWith('Growing_') || fieldId.startsWith('Jobs_') || fieldId.startsWith('Manual_')) {
                this.handleOutcomeInput(event);
            } else if (fieldId.endsWith('_Budget__c') || fieldId.endsWith('_Projection__c') || fieldId.endsWith('_Variance__c')) {
                this.handleCurrencyInput(event);
            } else if (fieldId === 'Leader_Tenure__c') {
                const val = target.value;
                if (val !== '' && val !== null && val !== undefined) {
                    const n = Number(val);
                    if (!Number.isInteger(n) || n < 0 || n > 99) {
                        this._showLightningError('Leader_Tenure__c', this.labels.CL_Must_be_a_whole_number_between_0_and_99);
                    } else {
                        this._clearLightningError('Leader_Tenure__c');
                    }
                } else {
                    this._clearLightningError('Leader_Tenure__c');
                }
            }
        }} else if (fieldName) {
    if (target.dataset.section === 'skill') {
        this.handleUnifiedSkillInput(event);
    } else if (target.dataset.section === 'sector') {
        this.handleBusinessSectorInput(event);
    }
 else if (fieldName === 'hours' || fieldName === 'duration' || fieldName === 'skillEnrolment' || fieldName === 'yearlyEnrolment') {
                this.handleUnifiedSkillInput(event);
            }
        }
    
}

_getFieldLabel(el) {
    if (!el) return '';
    
    // 1. Check if inside a table row
    const tr = el.closest('tr');
    if (tr) {
        const td = el.closest('td');
        const rowLabelEl = tr.querySelector('.row-label-cell, td:first-child');
        let rowLabel = rowLabelEl ? rowLabelEl.textContent.replace(/[*]/g, '').trim() : '';
        // Clean up helper texts if any from row label
        if (rowLabel.includes('\n')) {
            rowLabel = rowLabel.split('\n')[0].trim();
        }
        const colIndex = td ? Array.from(tr.children).indexOf(td) : -1;
        if (colIndex !== -1) {
            const table = el.closest('table');
            const th = table?.querySelector(`thead tr th:nth-child(${colIndex + 1})`);
            const colLabel = th ? th.textContent.replace(/[*]/g, '').trim() : '';
            if (colLabel && rowLabel) {
                return `${colLabel} - ${rowLabel}`;
            }
        }
        if (rowLabel) return rowLabel;
    }

    // 2. Specific field maps
    const fieldId = el.dataset?.id;
    const fieldName = el.dataset?.field;
    const targetId = fieldId || fieldName;
    
    if (targetId) {
        const specMap = {
            Manual_Avg_Cost_per_Placement_CFY__c: 'Manual Average Cost per Placement (CFY)',
            Manual_Avg_Cost_per_Placement_FY_1__c: 'Manual Average Cost per Placement (FY-1)',
            Manual_Avg_Cost_per_Placement_FY_2__c: 'Manual Average Cost per Placement (FY-2)',
            Manual_Avg_Cost_per_Placement_FY_3__c: 'Manual Average Cost per Placement (FY-3)',
            Manual_Avg_Cost_per_Job_CFY__c: 'Manual Average Cost per Job (CFY)',
            Manual_Avg_Cost_per_Job_FY_1__c: 'Manual Average Cost per Job (FY-1)',
            Manual_Avg_Cost_per_Job_FY_2__c: 'Manual Average Cost per Job (FY-2)',
            Manual_Avg_Cost_per_Job_FY_3__c: 'Manual Average Cost per Job (FY-3)'
        };
        if (specMap[targetId]) return specMap[targetId];
    }

    // 3. Fallbacks
    if (el.label) return el.label;
    if (el.dataset?.id === 'phone') {
        return 'Phone number';
    }
    
    // To prevent ascending to global container and grabbing first label:
    // Check if closest slds-form-element/modern-field has the input element inside
    const wrap = el.closest('.slds-form-element, .modern-field, .domain-field-item');
    if (wrap && wrap.contains(el)) {
        const lbl = wrap.querySelector('.slds-form-element__label, .date-field-label, .domain-field-label');
        if (lbl) {
            return lbl.textContent.replace(/[*]/g, '').trim();
        }
    }

    const nativeLabel = this._nativeFieldLabel(el);
    if (nativeLabel && nativeLabel !== 'This field') {
        return nativeLabel;
    }

    if (fieldName) {
        if (fieldName === 'Skilling_Approach__c') return 'Your Skilling Approach';
        if (fieldName === 'Job_Creation_Approach__c') return 'Your Job Creation Approach';
        if (fieldName === 'Organizational_Sustainability__c') return 'Organizational Sustainability';
        if (fieldName === 'Revenue_Explanation__c') return 'CFY Deviation Explanation';
        if (fieldName === 'Expense_Explanation__c') return 'CFY Deviation Explanation';
        if (fieldName === 'Net_Position_Explanation__c') return 'CFY Deviation Explanation';
        if (fieldName === 'Use_of_Additional_Funding__c' || fieldName === 'Direction_for_Additional_Funding__c') return 'Direction for Additional Funding';
        if (fieldName === 'Operational_Synergies_with_WOF__c') return 'Operational Synergies';
        return fieldName.replace('__c', '').replace(/_/g, ' ');
    }
    return '';
}

disconnectedCallback() {
    this._destroyPhoneIti();
}

// ── Generic text-quality validators (TC_WF_02–30) ───────────────────────
// Rejects: whitespace-only, numeric-only, symbol-only, emoji, and basic
// script/SQL-injection patterns. Returns null when valid, else an error string.
_validateNameLikeField(value, fieldLabel) {
    if (value === null || value === undefined) return null; // required-ness handled elsewhere
    const trimmed = String(value).trim();
    if (trimmed === '') return `${fieldLabel} cannot be blank or contain only spaces.`;

    // Emoji / pictographic characters
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
    if (emojiPattern.test(trimmed)) {
        return `${fieldLabel} cannot contain emoji characters.`;
    }

    // HTML / script tag injection
    if (/<\s*\/?\s*[a-zA-Z][^>]*>/.test(trimmed)) {
        return `${fieldLabel} cannot contain HTML or script tags.`;
    }

    // Common SQL-injection patterns
    if (/(--|;|\bor\b\s+\d+\s*=\s*\d+|\bunion\b\s+\bselect\b|'\s*or\s*')/i.test(trimmed)) {
        return `${fieldLabel} contains characters that are not allowed.`;
    }

    // Must contain at least one letter (rejects numeric-only / symbol-only)
    if (!/[a-zA-Z\u00C0-\u024F\u0400-\u04FF]/.test(trimmed)) {
        return `${fieldLabel} must contain at least one letter — numbers or symbols alone are not allowed.`;
    }

    return null;
}

// Nodes created by intl-tel-input are injected outside the LWC template, so under
// synthetic shadow they never get the c-* scope token and our component CSS
// silently misses them. Copy the token across, then let iti re-measure.
_applyItiScopeToken(input) {
    const token = Array.from(input.attributes)
        .map(a => a.name)
        .find(n => n.startsWith('c-') && n.includes('_'));
    if (!token) return;                       // native shadow — nothing to do
    const wrapper = input.closest('.iti');
    if (!wrapper) return;
    wrapper.setAttribute(token, '');
    wrapper.querySelectorAll('*').forEach(el => el.setAttribute(token, ''));
}
_validatePhoneField(value, countryCodeValue) {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (trimmed === '') return 'Phone number cannot be blank or contain only spaces.';
    if (!/^[0-9+\-()\s]+$/.test(trimmed)) {
    return this.labels.CL_Phone_number_can_only_contain_digits_and_characters;
}

    const dialCode   = this._extractDialCode(countryCodeValue);
    const digitsOnly = this._normalizeNationalNumber(trimmed, dialCode);
    if (!digitsOnly) return 'Phone number cannot be blank or contain only spaces.';
    const rule = dialCode ? this.PHONE_LENGTH_BY_COUNTRY_CODE[dialCode] : null;

    if (rule) {
        if (digitsOnly.length < rule.min || digitsOnly.length > rule.max) {
            const expected = rule.min === rule.max
                ? `${rule.min} digits`
                : `${rule.min}–${rule.max} digits`;
            return `Enter a valid phone number for the selected country (expected ${expected}, e.g. ${dialCode} ${rule.example}).`;
        }
        return null;
    }

    // Fallback when no country code selected yet, or code isn't in the map
    if (digitsOnly.length < 7) {
    return this.labels.CL_Please_enter_a_valid_phone_number_at_least_7_digits;
}
    return null;
}
_validateHQCityCountry(value) {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (trimmed === '') return this.labels.CL_Headquarters_City_and_Country_cannot_be_blank_or_contain_only_spaces;
    if (!/[a-zA-Z]/.test(trimmed)) return this.labels.CL_Headquarters_City_and_Country_must_contain_letters;

    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length < 2) {
        return this.labels.CL_Please_enter_both_headquarters_city_and_country_separated_by_a_comma_e_g;
    }
    if (parts.length > 2 || parts.some(p => p === '')) {
        return this.labels.CL_Please_enter_exactly_one_city_and_one_country_separated_by_a_single_comma_e;
    }
    const [city, country] = parts;
    if (!/[a-zA-Z]/.test(city))    return this.labels.CL_Please_enter_a_valid_city_name;
    if (!/[a-zA-Z]/.test(country)) return this.labels.CL_Please_enter_a_valid_country_name;
    return null;
}
_validateRegionsField(value) {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (trimmed === '') return 'Primary Service Regions cannot be blank or contain only spaces.';

    // Reuse the shared quality checks (emoji, HTML/script tags, SQL patterns, letter-presence)
    const baseErr = this._validateNameLikeField(trimmed, 'Primary Service Regions');
    if (baseErr) return baseErr;

    const LETTER = /[a-zA-Z\u00C0-\u024F\u0400-\u04FF]/;
    // Applicants list multiple regions — validate each entry separately
    const parts = trimmed.split(/[,;/|]/).map(p => p.trim()).filter(p => p !== '');
    if (parts.length === 0) return 'Please enter at least one state, province or region.';

    for (const part of parts) {
        const letterCount = (part.match(new RegExp(LETTER, 'g')) || []).length;
        if (letterCount < 2) {
            return `"${part}" is not a valid region name — each entry must contain letters.`;
        }
        // Allow letters, digits (e.g. "Region 4"), spaces, and normal name punctuation only
        if (!/^[a-zA-Z\u00C0-\u024F\u0400-\u04FF0-9 .'()&-]+$/.test(part)) {
            return `"${part}" contains characters that are not allowed in a region name.`;
        }
    }
    return null;
}

validatePage1Fields() {
    let isValid = true;
    const org = this.organizationData;
 
    // ── Funding area card (Q1) ──────────────────────────────────────────
    if (!this.selectedFundingArea) {
        isValid = false;
        const cardError = this.template.querySelector('.q1-error-msg');
        if (cardError) cardError.style.display = 'block';
    } else {
        const cardError = this.template.querySelector('.q1-error-msg');
        if (cardError) cardError.style.display = 'none';
    }
 
    // ── Leader Tenure (optional but must be valid if entered) ───────────
    const tenure = org.Leader_Tenure__c;
    if (tenure !== '' && tenure !== null && tenure !== undefined) {
        const n = Number(tenure);
        if (!Number.isInteger(n) || n < 0 || n > 99) {
            this._showLightningError('Leader_Tenure__c', this.labels.CL_Must_be_a_whole_number_between_0_and_99);
            isValid = false;
        } else {
            this._clearLightningError('Leader_Tenure__c');
        }
    }
 
    // ── Incorporation Date — must not be in the future ──────────────────
   const incDate = org.Incorporation_Date__c;
if (incDate) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (incDate > todayStr) {
        this._showLightningError('Incorporation_Date__c', this.labels.CL_Incorporation_date_cannot_be_in_the_future);
        isValid = false;
    } else if (incDate < '1900-01-01') {
        this._showLightningError('Incorporation_Date__c', this.labels.CL_Please_enter_a_valid_incorporation_date);
        isValid = false;
    } else {
        this._clearLightningError('Incorporation_Date__c');
    }
}
 // ── Text-quality checks (TC_WF_02–30) ───────────────────────────────
    const textFieldChecks = [
        { id: 'Organization_Name__c',                 run: v => this._validateNameLikeField(v, 'Organization Name') },
        { id: 'Headquarters_City_and_Country__c',     run: v => this._validateHQCityCountry(v) },
        { id: 'Primary_Service_Regions__c',       run: v => this._validateRegionsField(v) },
        { id: 'Leader_Name__c',                       run: v => this._validateNameLikeField(v, 'Leader Name') },
        { id: 'Leader_Title__c',                      run: v => this._validateNameLikeField(v, 'Leader Title') },
        { id: 'Submitter_Name__c',                    run: v => this._validateNameLikeField(v, 'Submitter Name') },
        { id: 'Job_Title__c',                         run: v => this._validateNameLikeField(v, 'Submitter Title') },
    ];
    const countryCode = org.WG_Phone_Country_Code__c;
    const phoneVal = org.Phone__c;
    const phoneEl = this.template.querySelector('[data-id="phone"]');

    if (!countryCode || String(countryCode).trim() === '') {
        this.phoneNumberError = 'Please select a country code.';
        isValid = false;
        if (phoneEl) this._registerInvalid(phoneEl);
    } else if (!phoneVal || String(phoneVal).trim() === '') {
        this.phoneNumberError = 'Phone number cannot be blank or contain only spaces.';
        isValid = false;
        if (phoneEl) this._registerInvalid(phoneEl);
    } else {
        const phoneErr = this._validatePhoneField(phoneVal, countryCode);
        this.phoneNumberError = phoneErr || '';
        if (phoneErr) {
            isValid = false;
            if (phoneEl) this._registerInvalid(phoneEl);
        } else {
            if (phoneEl) this._invalidElements = this._invalidElements.filter(x => x !== phoneEl);
        }
    }
    textFieldChecks.forEach(({ id, run }) => {
        const err = run(org[id]);
        if (err) {
            this._showLightningError(id, err);
            isValid = false;
        } else {
            this._clearLightningError(id);
        }
    });

    // ── Fiscal Year End — must not be more than 2 years ahead ──────────
    const fyEnd = org.Current_fiscal_year_s_end_date__c;
    if (fyEnd) {
        try {
            const parts = fyEnd.split('-');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                const maxDate = new Date();
                maxDate.setFullYear(maxDate.getFullYear() + 2);
                if (d > maxDate) {
                    this._showLightningError('Current_fiscal_year_s_end_date__c', this.labels.CL_Fiscal_year_end_date_seems_too_far_in_the_future);
                    isValid = false;
                } else {
                    this._clearLightningError('Current_fiscal_year_s_end_date__c');
                }
            }
        } catch (e) {
            this._clearLightningError('Current_fiscal_year_s_end_date__c');
        }
    }
 
    // ── FUNDERS (Q6) ── partial-fill rule ──────────────────────────────
    // Rule: if any field in a funder row is filled, ALL required fields
    //       in that same row become required.
    const funderSets = [
        {
            label: 'Funder 1',
            fields: {
                name:   'Funder_1_Name__c',
                amount: 'Funder_1_Amount__c',
                start:  'Funder_1_Period_Start__c',
                end:    'Funder_1_Period_End__c',
                type:   'Funder_1_Type__c',
            },
            show: true,
        },
        {
            label: 'Funder 2',
            fields: {
                name:   'Funder_2_Name__c',
                amount: 'Funder_2_Amount__c',
                start:  'Funder_2_Period_Start__c',
                end:    'Funder_2_Period_End__c',
                type:   'Funder_2_Type__c',
            },
            show: this.showFunder2,
        },
        {
            label: 'Funder 3',
            fields: {
                name:   'Funder_3_Name__c',
                amount: 'Funder_3_Amount__c',
                start:  'Funder_3_Period_Start__c',
                end:    'Funder_3_Period_End__c',
                type:   'Funder_3_Type__c',
            },
            show: this.showFunder3,
        },
    ];
 
    funderSets.forEach(({ label, fields, show }) => {
        if (!show) return;
 
        const f = fields;
        const values = Object.values(f).map(key => org[key]);
        const anyFilled = values.some(v => v !== '' && v !== null && v !== undefined);
 
        if (!anyFilled) {
            // Completely empty row — optional, clear any stale errors
            Object.values(f).forEach(key => this._clearLightningError(key));
            return;
        }
 
        // At least one field filled → enforce all required fields
        const requiredKeys = [f.name, f.amount, f.start, f.end, f.type];
        requiredKeys.forEach(key => {
            if (!org[key] && org[key] !== 0) {
                this._showLightningError(key, `${label}: complete all fields or clear this row.`);
                isValid = false;
            } else {
                this._clearLightningError(key);
            }
        });
 
        // Funder amount must be a positive number
        if (org[f.amount] !== '' && org[f.amount] !== null && org[f.amount] !== undefined) {
            const n = Number(org[f.amount]);
            if (isNaN(n) || n < 0) {
                this._showLightningError(f.amount, this.labels.CL_Please_enter_a_valid_positive_amount);
                isValid = false;
            }
        }
 
        // Start date must be before end date
        if (org[f.start] && org[f.end]) {
            try {
                const s = new Date(org[f.start]);
                const e = new Date(org[f.end]);
                if (!isNaN(s) && !isNaN(e) && s >= e) {
                    this._showLightningError(f.end, this.labels.CL_Funding_end_date_must_be_after_start_date);
                    isValid = false;
                }
            } catch (_) { /* ignore parse errors */ }
        }
    });
 
    // ── REFERENCES (Q7) ── partial-fill rule ───────────────────────────
    // Rule: if any field in a reference row is filled, ALL fields
    //       in that same row become required.
    const referenceSets = [
        {
            label: 'Reference 1',
            fields: {
                name:  'Reference_1_Name__c',
                role:  'Reference_1_Role__c',
                email: 'Reference_1_Email__c',
            },
            show: true,
        },
        {
            label: 'Reference 2',
            fields: {
                name:  'Reference_2_Name__c',
                role:  'Reference_2_Role__c',
                email: 'Reference_2_Email__c',
            },
            show: this.showReference2,
        },
    ];
 
    referenceSets.forEach(({ label, fields, show }) => {
        if (!show) return;
 
        const f = fields;
        const values = Object.values(f).map(key => org[key]);
        const anyFilled = values.some(v => v !== '' && v !== null && v !== undefined);
 
        if (!anyFilled) {
            Object.values(f).forEach(key => this._clearLightningError(key));
            return;
        }
 
        // At least one field filled → enforce all required fields
        Object.entries(f).forEach(([role, key]) => {
            if (!org[key]) {
                this._showLightningError(key, `${label}: complete all fields or clear this row.`);
                isValid = false;
            } else {
                this._clearLightningError(key);
            }
        });
 
        // Validate email format if provided
        const emailVal = org[f.email];
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            this._showLightningError(f.email, 'Please enter a valid email address.');
            isValid = false;
        }
    });
 
    return isValid;
}
validatePage2Fields() {
    let isValid = true;
    const today   = this.todayDateString;
    const incorp  = this.organizationData.Incorporation_Date__c;
    const L       = this.labels;

    // Shared: required + non-negative numeric check on a native input
    const checkNumber = (el, value, label) => {
        if (value === '' || value === null || value === undefined) {
            this._showNativeError(el, `${label} is required.`);
            return false;
        }
        if (isNaN(Number(value))) {
            this._showNativeError(el, `${label} must be a number.`);
            return false;
        }
        if (Number(value) < 0) {
            this._showNativeError(el, `${label} cannot be negative.`);
            return false;
        }
        this._clearNativeError(el);
        return true;
    };

    // Shared: programme-date window (incorporation date … today)
    const checkProgrammeDate = (el, value, label) => {
        if (!value || value.trim() === '') {
            this._showNativeError(el, `${label} is required.`);
            return false;
        }
        if (incorp && value < incorp) {
            this._showNativeError(el, `${label} cannot be earlier than your Incorporation Date (${this._fmtDateDisplay(incorp)}).`);
            return false;
        }
        if (value > today) {
            this._showNativeError(el, `${label} cannot be a future date.`);
            return false;
        }
        this._clearNativeError(el);
        return true;
    };

    // Shared: required rich-text with word limit
    const checkRichText = (field, label, limit) => {
        const el = this.template.querySelector(`[data-field="${field}"]`);
        if (!el) return true;
        const words = (el.innerText || '').trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) {
            this._showFieldError(field, `${label} is required.`);
            return false;
        }
        if (words.length > limit) {
            this._showFieldError(field, `${label} exceeds the ${limit}-word limit (currently ${words.length} words). Please shorten it before proceeding.`);
            return false;
        }
        this._clearFieldError(field);
        return true;
    };

    // ── Q8 — Skilling Approach (JF / Both) ────────────────────────────
    if (this.showJFWhatYouDo) {
        if (!checkRichText('Skilling_Approach__c', 'Your Skilling Approach', 500)) isValid = false;
    }

    // ── Q9 — Skilling Domains (JF / Both) ─────────────────────────────
    if (this.showJFWhatYouDo) {
        this.unifiedSkillDomains.forEach((row, i) => {
           const q = f => this.template.querySelector(
    `[data-field="${f}"][data-index="${i}"]`
);

            const rowLabel = `Domain ${i + 1}`;

            // Domain / Programme Name
            const nameEl = q('domain');
            if (!row.domain || row.domain.trim() === '') {
                this._showNativeError(nameEl, 'Domain / Programme Name is required.');
                isValid = false;
            } else {
                const nameErr = this._validateNameLikeField(row.domain, 'Domain / Programme Name');
                if (nameErr) { this._showNativeError(nameEl, nameErr); isValid = false; }
                else         { this._clearNativeError(nameEl); }
            }

            if (!checkNumber(q('hours'),          row.hours,           'Hours of Training'))  isValid = false;
            if (!checkNumber(q('duration'),       row.duration,        'Duration (Months)'))  isValid = false;
            const enrolEl9 = this.template.querySelector(
    `input[data-section="skill"][data-field="skillEnrolment"][data-index="${i}"]`
);

if (!checkNumber(enrolEl9, row.yearlyEnrolment, 'Learner Enrollment')) isValid = false;
            if (!checkProgrammeDate(q('startDate'), row.startDate, 'When Programme Started')) isValid = false;
        });
    }

    // ── Q10 — Job Creation Approach (JC / Both) ───────────────────────
    if (this.showJCOrBothWhatYouDo) {
        if (!checkRichText('Job_Creation_Approach__c', 'Your Job Creation Approach', 500)) isValid = false;
    }

    // ── Q11 — Business Sectors (JC / Both) ────────────────────────────
    if (this.showJCOrBothWhatYouDo) {
        this.businessSectors.forEach((row, i) => {
          const sectorEl = this.template.querySelector(
    `select[data-field="sector"][data-index="${i}"]`
);
            const card     = sectorEl?.closest('.domain-card');

            // Business Sector
            if (!row.sector || row.sector.trim() === '') {
                this._showNativeError(sectorEl, 'Please select a Business Sector.');
                isValid = false;
            } else {
                this._clearNativeError(sectorEl);
            }

            // "Other" sector free text
            if (row.sector === 'Other') {
                const otherEl = this.template.querySelector(`input[data-field="sectorOther"][data-index="${i}"]`);
                if (!row.sectorOther || row.sectorOther.trim() === '') {
                    this._showNativeError(otherEl, 'Please specify your business sector.');
                    isValid = false;
                } else {
                    const err = this._validateNameLikeField(row.sectorOther, 'Business sector');
                    if (err) { this._showNativeError(otherEl, err); isValid = false; }
                    else     { this._clearNativeError(otherEl); }
                }
            }

            // Support begin date
            const beginEl = this.template.querySelector(`input[data-field="supportBegin"][data-index="${i}"]`);
            if (!checkProgrammeDate(beginEl, row.supportBegin, 'When Programme Started')) isValid = false;

            // Type of Support chips
            if (!row.supportTypes || row.supportTypes.length === 0) {
                this._showChipError(card, 'Select at least one type of support provided.');
                isValid = false;
            } else {
                this._clearChipError(card);
                if (row.supportTypes.includes('Other')) {
                    const otherSupportEl = this.template.querySelector(`input[data-field="supportTypeOther"][data-index="${i}"]`);
                    if (!row.supportTypeOther || row.supportTypeOther.trim() === '') {
                        this._showNativeError(otherSupportEl, 'Please specify the type of support.');
                        isValid = false;
                    } else {
                        this._clearNativeError(otherSupportEl);
                    }
                }
            }

            // Yearly enrolment
const enrolEl = this.template.querySelector(
    `input[data-section="sector"][data-field="yearlyEnrolment"][data-index="${i}"]`
);
            if (!checkNumber(enrolEl, row.yearlyEnrolment, 'Yearly Enrolment')) isValid = false;
        });
    }

    return isValid;
}
validatePage4Fields() {
    let isValid = true;
 
    // Historical data: required entered numbers must be >= 0
const histNumFields = [
            'CY3_Balance_Start_CFY_3__c',
            'CY3_Revenue__c', 'CY2_Revenue__c', 'CY1_Revenue__c',
            'CY3_Capital_Expenditure__c', 'CY2_Capital_Expenditure__c', 'CY1_Capital_Expenditure__c',
            'CY3_Operating_Expenditure__c', 'CY2_Operating_Expenditure__c', 'CY1_Operating_Expenditure__c',
        ];
    histNumFields.forEach(f => {
        const v = this.historicalData[f];
        if (v !== '' && v !== null && v !== undefined) {
            if (Number(v) < 0) {
                this._showLightningError(f, 'Amount cannot be negative.');
                isValid = false;
            } else {
                this._clearLightningError(f);
            }
        }
    });
 
    // Fiscal data: budget/projection must be >= 0
 const fiscalNumFields = [
    'Revenue_Budget__c', 'Revenue_Projection__c',
    'Capital_Expenditure_Budget__c', 'Capital_Expenditure_Projection__c',
    'Operating_Expenditure_Budget__c', 'Operating_Expenditure_Projection__c',
];
    fiscalNumFields.forEach(f => {
        const v = this.fiscalData[f];
        if (v !== '' && v !== null && v !== undefined) {
            if (Number(v) < 0) {
                this._showLightningError(f, 'Amount cannot be negative.');
                isValid = false;
            } else {
                this._clearLightningError(f);
            }
        }
    });
 
    // Outcome numeric fields: must be >= 0
    const outcomeNumFields = [
        'Projected_Learner_Enrollments_FY_3__c',
        'Projected_Learner_Enrollments_FY_2__c',
        'Projected_Learner_Enrollments_FY_1__c',
        'Projected_Learner_Placements_FY_3__c',
        'Projected_Learner_Placements_FY_2__c',
        'Projected_Learner_Placements_FY_1__c',
        'Projected_Learner_Enrollments_CFY__c',
        'Projected_Learner_Placements_CFY__c',
        'Projected_New_Businesses_FY_3__c',
        'Projected_New_Businesses_FY_2__c',
        'Projected_New_Businesses_FY_1__c',
        'Projected_New_Businesses_CFY__c',
        'Projected_Jobs_from_New_Businesses_FY3__c',
        'Projected_Jobs_from_New_Businesses_FY2__c',
        'Projected_Jobs_from_New_Businesses_FY1__c',
        'Projected_Jobs_from_New_Businesses_CFY__c',
        'Growing_Businesses_Supported_FY_3__c',
        'Growing_Businesses_Supported_FY_2__c',
        'Growing_Businesses_Supported_FY_1__c',
        'Growing_Businesses_Supported_CFY__c',
        'Jobs_from_Growing_Businesses_FY_3__c',
        'Jobs_from_Growing_Businesses_FY_2__c',
        'Jobs_from_Growing_Businesses_FY_1__c',
        'Jobs_from_Growing_Businesses_CFY__c',
    ];
    outcomeNumFields.forEach(f => {
        const v = this.outcomeData[f];
        if (v !== '' && v !== null && v !== undefined) {
            if (Number(v) < 0) {
                this._showLightningError(f, 'Value cannot be negative.');
                isValid = false;
            } else {
                this._clearLightningError(f);
            }
        }
    });
 
    // Skilling domain rows: numeric fields must be >= 0
    this.unifiedSkillDomains.forEach((row, i) => {
        const numFields = [
            { field: 'hours', label: 'Hours of Training' },
            { field: 'duration', label: 'Duration' },
            { field: 'yearlyEnrolment', label: 'Yearly Enrolment' },
        ];
        numFields.forEach(({ field, label }) => {
            if (row[field] !== '' && row[field] !== null && row[field] !== undefined) {
                if (Number(row[field]) < 0) {
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Validation Error',
                        message: `Domain ${i + 1}: ${label} cannot be negative.`,
                        variant: 'error',
                    }));
                    isValid = false;
                }
            }
        });
    });
 
    // Business sector rows: yearlyEnrolment must be >= 0
    this.businessSectors.forEach((row, i) => {
        if (row.yearlyEnrolment !== '' && row.yearlyEnrolment !== null && row.yearlyEnrolment !== undefined) {
            if (Number(row.yearlyEnrolment) < 0) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Validation Error',
                    message: `Sector ${i + 1}: Yearly Enrolment cannot be negative.`,
                    variant: 'error',
                }));
                isValid = false;
            }
        }
    });
 // Manual avg cost fields must be filled and >= 0
if (this.showJFOutcomes) {
    const manualPVFields = [
        'Manual_Avg_Cost_per_Placement_CFY__c',
        'Manual_Avg_Cost_per_Placement_FY_1__c',
        'Manual_Avg_Cost_per_Placement_FY_2__c',
        'Manual_Avg_Cost_per_Placement_FY_3__c',
    ];
    manualPVFields.forEach(f => {
        const v = this.outcomeData[f];
        if (v === '' || v === null || v === undefined) {
            this._showLightningError(f, 'This field is required.');
            isValid = false;
        } else if (Number(v) < 0) {
            this._showLightningError(f, 'Value cannot be negative.');
            isValid = false;
        } else {
            this._clearLightningError(f);
        }
    });
}

if (this.showJCOutcomes) {
    const manualJCFields = [
        'Manual_Avg_Cost_per_Job_CFY__c',
        'Manual_Avg_Cost_per_Job_FY_1__c',
        'Manual_Avg_Cost_per_Job_FY_2__c',
        'Manual_Avg_Cost_per_Job_FY_3__c',
    ];
    manualJCFields.forEach(f => {
        const v = this.outcomeData[f];
        if (v === '' || v === null || v === undefined) {
            this._showLightningError(f, 'This field is required.');
            isValid = false;
        } else if (Number(v) < 0) {
            this._showLightningError(f, 'Value cannot be negative.');
            isValid = false;
        } else {
            this._clearLightningError(f);
        }
    });
}
    return isValid;
}
validatePage6Fields() {
    let isValid = true;
 
    // Q19 — Desired use of additional funding (always required)
    const fundingField = this.additionalFundingFieldApi;
    const fundingEl = this.template.querySelector(`[data-field="${fundingField}"]`);
    if (fundingEl) {
        const text = (fundingEl.innerText || '').trim();
        const words = text.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) {
            this._showFieldError(fundingField, 'This field is required.');
            isValid = false;
        } else if (words.length > 500) {
            this._showFieldError(fundingField, `Exceeds 500-word limit (currently ${words.length} words). Please shorten before proceeding.`);
            isValid = false;
        } else {
            this._clearFieldError(fundingField);
        }
    }
 
    // Q20b — Operational synergies text: required when interest level is Yes or Maybe
    if (this.showSynergiesTextBox) {
        const synField = this.operationalSynergiesFieldApi;
        if (synField) {
            const synEl = this.template.querySelector(`[data-field="${synField}"]`);
            if (synEl) {
                const text = (synEl.innerText || '').trim();
                const words = text.split(/\s+/).filter(w => w.length > 0);
                if (words.length === 0) {
                    this._showFieldError(synField, 'Please describe how GenieAI could contribute, or change your interest level to "Not at this time".');
                    isValid = false;
                } else if (words.length > 200) {
                    this._showFieldError(synField, `Exceeds 200-word limit (currently ${words.length} words). Please shorten before proceeding.`);
                    isValid = false;
                } else {
                    this._clearFieldError(synField);
                }
            }
        }
    }
 
    return isValid;
}
validateCurrentPageFields() {
    this._firstInvalidField = null;
    const inputs = this.template.querySelectorAll(
        'lightning-input, lightning-combobox, lightning-textarea'
    );
    let isValid = true;
    
    inputs.forEach(input => {
        if (input.required && input.offsetParent !== null) {
            const isWhitespaceOnly = typeof input.value === 'string'
                && input.value.length > 0
                && input.value.trim() === '';

            input.setCustomValidity(isWhitespaceOnly ? 'This field cannot contain only spaces.' : '');

            const valid = input.checkValidity();
            if (!valid) {
                console.log('❌ Invalid input:', input.dataset.id, '| label:', input.label, '| value:', input.value);
                input.reportValidity();
                isValid = false;
                this._registerInvalid(input);if (!this._firstInvalidField) this._firstInvalidField = input;
            }
        }
    });

    if (this.currentPage === 1) {
        console.log('🔵 selectedFundingArea:', this.selectedFundingArea);
        if (!this.selectedFundingArea) {
            isValid = false;
            const cardError = this.template.querySelector('.q1-error-msg');
            console.log('❌ No funding area selected. cardError el:', cardError);
            if (cardError) {
                cardError.style.display = 'block';
                this._registerInvalid(cardError);
            }
        } else {
            const cardError = this.template.querySelector('.q1-error-msg');
            if (cardError) cardError.style.display = 'none';
        }
    }
this._firstInvalidLabel = this._firstInvalidField
        ? (this._firstInvalidField.label
            || this.labels.CL_Organizational_Area_s_for_Funding_Investment)
        : '';

    console.log('🔵 validateCurrentPageFields result:', isValid);
    return isValid;

    
}
_nativeFieldLabel(el) {
    const wrap = el.closest('.slds-form-element, .modern-field, .domain-field-item');
    const lbl  = wrap?.querySelector('.slds-form-element__label, .date-field-label, .domain-field-label');
    return lbl ? lbl.textContent.replace(/[*]/g, '').trim() : 'This field';
}

validateNativeRequiredFields() {
    let ok = true;
    this.template.querySelectorAll('input[required]').forEach(el => {
        if (el.offsetParent === null) return;   // not rendered on this page
        if (el.dataset.id === 'phone') return;  // has its own validator
        const v = el.value || '';
        if (v.trim() === '') {
            this._showNativeError(el, `${this._nativeFieldLabel(el)} is required.`);
            ok = false;
        } else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
            this._showNativeError(el, 'Please enter a valid email address.');
            ok = false;
        } else {
            this._clearNativeError(el);
        }
    });
    return ok;
}

async handleNext() {
    if (this.isSaving) return;
    await this._fileOpQueue;
    this._resetInvalidTracking();
    this._clearAllInlineErrors(); 
    this.flushAllInputs();
    this.errorStepActive = false;

    let isCurrentPageValid = true;

    // Standard fields (lightning inputs and native inputs)
    const baseValid = this.validateCurrentPageFields() & this.validateNativeRequiredFields();
    if (!baseValid) {
        isCurrentPageValid = false;
    }

    // Page-specific validations
    if (this.currentPage === 1) {
        if (!this.validatePage1Fields()) {
            isCurrentPageValid = false;
        } else {
            this.restoreEditorContent();
        }
    } else if (this.currentPage === 2) {
        if (!this.validatePage2Fields()) {
            isCurrentPageValid = false;
        }
    } else if (this.currentPage === 4) {
        if (!this.validatePage4Fields()) {
            isCurrentPageValid = false;
        }
    } else if (this.currentPage === 6) {
        if (!this.validatePage6Fields()) {
            isCurrentPageValid = false;
        }
    } else if (this.currentPage === 7) {
        if (!this.validatePage7Fields()) {
            isCurrentPageValid = false;
        }
    }

    // File uploads
    if (!this.validateFileUploads()) {
        isCurrentPageValid = false;
    }

    // Rich text fields validation
    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();
    if (this.currentPage !== 1 && !this.validateRichTextFields()) {
        isCurrentPageValid = false;
    }

    // If not valid, show the unified toast and return
    if (!isCurrentPageValid) {
        this.errorStepActive = true;

        // Get unique labels from currently visible invalid elements
        const currentInvalidElements = this._invalidElements.filter(el => {
            return el && el.isConnected && (el.offsetParent !== null || el.closest('.modern-richtext-wrapper') !== null);
        });
        const uniqueLabels = Array.from(new Set(
            currentInvalidElements.map(el => this._getFieldLabel(el)).filter(Boolean)
        ));
        const labelsStr = uniqueLabels.map(l => `"${l}"`).join(', ');
        
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.CL_Missing_Required_Fields,
            message: labelsStr
                ? `${this.labels.CL_This_is_a_required_fields}: ${labelsStr}`
                : this.labels.CL_Please_complete_all_required_fields_before_proceeding,
            variant: 'error'
        }));

        this._scrollToFirstError();
        return;
    }

   // ── Work out the next page before advancing ──────────────────────
    const nextIndex = this.currentPageIndex + 1;
    const nextPage  = this.pageSequence[nextIndex];

    // Prefill attestation fields when moving onto page 7
    if (nextPage === 7) {
        if (!this.organizationData.Attesting_User_Name__c) {
            this.organizationData.Attesting_User_Name__c =
                this.organizationData.Submitter_Name__c || '';
        }
        if (!this.organizationData.Attesting_User_Title__c) {
            this.organizationData.Attesting_User_Title__c =
                this.organizationData.Job_Title__c || '';
        }
        this.organizationData = { ...this.organizationData };
    }

    // Save before advancing; don't move forward if it failed
    const saveSucceeded = await this.autoSaveDraft();
    if (!saveSucceeded) return;

    if (this.currentPageIndex < this.pageSequence.length - 1) {
        this.currentPageIndex++;
        this.currentPage = this.pageSequence[this.currentPageIndex];
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.restoreEditorContent();
            this.scrollToTop();
        }, 100);
    }

}
async handlePrevious() {
    if (this.isSaving) return;

    this.flushAllInputs();
    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();

    await this.autoSaveDraft();

    if (this.currentPageIndex > 0) {
        this.currentPageIndex--;
        this.currentPage = this.pageSequence[this.currentPageIndex];
        setTimeout(() => {
            this.restoreEditorContent();
            this.scrollToTop();
        }, 100);
        console.log('Moved to page:', this.currentPage);
    }
}
   

    get isFirstPage() {
    return this.currentPageIndex === 0;
}

get isLastPage() {
    return this.currentPageIndex === this.pageSequence.length - 1;
}

handleKeyDown(event) {
    const el = event.target;

    if (el?.isContentEditable) {
        const field = el.dataset?.field;
        if (field && field !== 'undefined') {
            const limit = this.WORD_LIMITS[field]
                ?? (field === this.operationalSynergiesFieldApi ? 200 : null);

            if (limit !== null) {
                const text  = (el.innerText || '').trim();
                const words = text.split(/\s+/).filter(w => w.length > 0);
                const count = words.length;

                const hardLimit = Math.floor(limit * 1.1); // block at 110%

                const isPrintable = event.key.length === 1
                    && !event.ctrlKey
                    && !event.metaKey
                    && !event.altKey;

                const isAllowedControl =
                    ['Backspace','Delete','ArrowLeft','ArrowRight',
                     'ArrowUp','ArrowDown','Home','End','Tab','Escape'
                    ].includes(event.key) ||
                    ((event.ctrlKey || event.metaKey) &&
                     ['a','c','x','z','y'].includes(event.key.toLowerCase()));

                if (count >= hardLimit && isPrintable && !isAllowedControl) {
                    event.preventDefault();
                    return;
                }
            }
        }
    }

    // Bullet / numbered list continuation (unchanged)
    if (event.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range     = selection.getRangeAt(0);
        const container = range.startContainer;
        const lineText  = container.textContent
                       || container.parentNode?.textContent || '';
        const bulletMatch = lineText.trim().match(/^•\s/);
        if (bulletMatch) {
            event.preventDefault();
            const br     = document.createElement('br');
            const bullet = document.createTextNode('• ');
            range.insertNode(br);
            range.collapse(false);
            range.insertNode(bullet);
            const newRange = document.createRange();
            newRange.setStartAfter(bullet);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            return;
        }
        const numMatch = lineText.trim().match(/^(\d+)\.\s/);
        if (numMatch) {
            event.preventDefault();
            const nextNum    = parseInt(numMatch[1]) + 1;
            const br         = document.createElement('br');
            const numberText = document.createTextNode(`${nextNum}. `);
            range.insertNode(br);
            range.collapse(false);
            range.insertNode(numberText);
            const newRange = document.createRange();
            newRange.setStartAfter(numberText);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            return;
        }
    }
}
/*  handleHistoricalInput(event) {
    const field = event.target.dataset.id;
    this.historicalData[field] = event.target.value;
}*/


    handleRichTextChange(event) {
        const field = event.target.dataset.id;
        this.organizationData[field] = this._sanitizeHtml(event.target.innerHTML);
    }
 syncCustomRichTextFields() {
    const fiscalFields = [
        'Revenue_Explanation__c',
        'Expense_Explanation__c',
        'Net_Position_Explanation__c'   // ← was missing in draft form
    ];
    this.template.querySelectorAll(
        '[contenteditable="true"][data-field]'
    ).forEach(el => {
        const field = el.dataset.field;
        if (!field || field === 'undefined') return;
        const clean = this._sanitizeHtml(el.innerHTML);
        if (fiscalFields.includes(field)) {
            this.fiscalData[field] = clean;
        } else {
            this.organizationData[field] = clean;
        }
    });
}
get additionalFundingFieldApi() {
    if (this.selectedFundingArea === 'Job Creation Only') {
        return 'Use_of_Additional_Funding_JC__c';
    }
    return 'Use_of_Additional_Funding__c';
}
get operationalSynergiesFieldApi() {
    // Show and save to the correct API name
    if (this.selectedFundingArea === 'Job Fulfillment Only') {
        return 'Operational_Synergies_with_WOF__c';
    }
    if (this.selectedFundingArea === 'Job Creation Only') {
        return 'Operational_Synergies_with_WOF_JC__c';
    }
    if (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation') {
        return 'Operational_Synergies_with_WOF_Both__c';
    }
    return null;
}

get operationalSynergiesLabel() {
    // Show correct label
    if (this.selectedFundingArea === 'Job Fulfillment Only') {
        return this.labels.CL_Operational_Synergies_Question;
    }
    if (this.selectedFundingArea === 'Job Creation Only') {
        return this.labels.CL_Operational_Synergies_Job_Question;
    }
    if (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation') {
        return this.labels.CL_Operational_Synergies_Question_Both;
    }
    return '';
}
handleNumberWheel(event) {
    // Stop mouse-wheel scrolling from silently changing a focused number input
    event.target.blur();
}
handleAIClick(event) {
    // Step 1: Sync all rich text fields first
    this.syncCustomRichTextFields();

    const fieldApiName = event.currentTarget.dataset.id;

    // Step 2: Read submitter name — check input DOM first, then fallback to data
    const submitterInput = this.template.querySelector(
        '[data-id="Submitter_Name__c"]'
    );
    const submitterName = submitterInput?.value
        || this.organizationData.Submitter_Name__c
        || '';

    // Step 3: Guard — must have submitter name
    if (!submitterName) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Missing Info',
                message: 'Please fill in the Submitter Name before using AI Feedback.',
                variant: 'warning'
            })
        );
        return;
    }

   // Step 4: Read field value — check DOM first (rich text), then data object
    let fieldValue = '';
    const richTextEl = this.template.querySelector(
        `[contenteditable="true"][data-field="${fieldApiName}"]`
    );
    if (richTextEl) {
        fieldValue = this._sanitizeHtml(richTextEl.innerHTML);
        this.organizationData[fieldApiName] = fieldValue;
    } else {
        fieldValue = this.organizationData[fieldApiName] || '';
    }
    // Step 5: Guard — must have field content
    const plainForAI = this.stripHtml(fieldValue).replace(/\u00A0/g, ' ').trim();
    if (plainForAI === '') {
        this._showFieldError(fieldApiName, 'Please write your answer before requesting AI feedback.');
        this._scrollToFirstError();
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Empty Field',
                message: 'Please write something in the field before requesting AI feedback.',
                variant: 'warning'
            })
        );
        return;
    }
    if(fieldApiName === 'Legal_Structure__c') {
       const legaltypeInput = this.template.querySelector('[data-id="Legal_Type__c"]');
           let LegalType = legaltypeInput?.value || this.organizationData.Legal_Type__c || '';
        if(LegalType ==='Other'){
            const LegaltypeOtherInput = this.template.querySelector('[data-id="Legal_Type_Other__c"]');
            const LegalOtherType = LegaltypeOtherInput?.value || this.organizationData.Legal_Type_Other__c || '';
            LegalType = LegalType + ' ' +LegalOtherType;
            console.log('LegaltypeOtherInput'+LegalType);
        }
        console.log('LegalType'+LegalType);
        const registrationJurisdictionInput = this.template.querySelector('[data-id="Registration_Jurisdiction__c"]');
    let RegistrationJurisdiction = registrationJurisdictionInput?.value || this.organizationData.Registration_Jurisdiction__c || '';     
    if(RegistrationJurisdiction ==='Other'){
            const RegistrationJurisdictionOtherInput = this.template.querySelector('[data-id="Registration_Jurisdiction_Other__c"]');
            const RegistrationJurisdictionOther = RegistrationJurisdictionOtherInput?.value || this.organizationData.Registration_Jurisdiction_Other__c || '';
            RegistrationJurisdiction = 'Registration Jurisdiction'+ RegistrationJurisdiction + 'Country' + ' ' + RegistrationJurisdictionOther;
            console.log('RegistrationJurisdictionOtherInput'+RegistrationJurisdiction);
        }
    
    fieldValue = ' Legal Type: ' + LegalType + ' Registration Jurisdiction: ' + RegistrationJurisdiction + ' ' + fieldValue;
        }
    // Step 6: Debug logs (after all values are ready)
    console.log('AI Feedback Click - fieldApiName:', fieldApiName);
    console.log('AI Feedback Click - submitterName:', submitterName);
    console.log('AI Feedback Click - fieldValue length:', fieldValue.length);

    // Step 7: Open modal and show loading state
    this.isAIModalOpen = true;
    this.aiModalTitle = 'AI Feedback — ' + fieldApiName.replace(/__c/g, '').replace(/_/g, ' ');
    this.isAiLoading = true;
    this.aiResponse = '';

    // Step 8: Call Apex
    upsertAIFeedback({ fieldApiName, fieldValue, submitterName })
        .then(() => {
            console.log('upsertAIFeedback succeeded, waiting 10s...');
            setTimeout(() => {
                this.loadAIFeedback(fieldApiName, submitterName);
            }, 10000);
        })
        .catch((err) => {
            console.error('upsertAIFeedback failed:', JSON.stringify(err));
            this.aiResponse = 'Error generating AI feedback. Please try again.';
            this.isAiLoading = false;
        });
}

loadAIFeedback(fieldApiName, submitterName) {
    console.log('loadAIFeedback called for:', fieldApiName, submitterName);

    const flexFieldMap = {
        'Legal_Structure__c':                    'Legal_Structure_FR__c',
        'Organizational_Sustainability__c':       'Organizational_Sustainability_FR__c',
        'Use_of_Additional_Funding__c':           'Use_of_Additional_Funding_FR__c',
        'Operational_Synergies_with_WOF__c':      'Operational_Synergies_with_WOF_FR__c',
        'Operational_Synergies_with_WOF_JC__c':   'Operational_Synergies_with_WOF_JC_FR__c',
        'Operational_Synergies_with_WOF_Both__c': 'Operational_Synergies_with_WOF_Both_FR__c',
        'Skilling_Approach__c':                   'Skilling_Approach_FR__c',
        'Job_Creation_Approach__c':               'Job_Creation_Approach_FR__c',
        'Revenue_Explanation__c':                 'Revenue_Explanation_FR__c',
        'Use_of_Additional_Funding_JC__c':        'Use_of_Additional_Funding_JC_FR__c'
    };

    getAIFeedbackRecord({ submitterName })
        .then(result => {
            console.log('getAIFeedbackRecord result:', JSON.stringify(result));

            if (!result) {
                this.aiResponse = 'No feedback record found. Please try again.';
                this.isAiLoading = false;
                return;
            }

            const flexField = flexFieldMap[fieldApiName];
            console.log('Looking for flex field:', flexField);

            if (!flexField) {
                this.aiResponse = 'AI feedback is not supported for this field.';
                this.isAiLoading = false;
                return;
            }

            const feedback = result[flexField];
            console.log('Feedback value:', feedback);

            this.aiResponse = feedback || 'No feedback available yet. Please try again in a moment.';
            this.isAiLoading = false;
        })
        .catch(err => {
            console.error('getAIFeedbackRecord failed:', JSON.stringify(err));
            this.aiResponse = 'Error loading AI feedback. Please try again.';
            this.isAiLoading = false;
        });
}

closeAIModal() {
    this.isAIModalOpen = false;
    this.aiResponse = '';
    this.isAiLoading = false;
}

// Required by the modal HTML to format sections
get formattedAiSections() {
    if (!this.aiResponse) return [];

    const sections = [];
    const labels = ['Rating', 'Strengths', 'Weaknesses', 'Summary'];

    labels.forEach((label, index) => {
        const nextLabel = labels[index + 1];
        const regex = nextLabel
            ? new RegExp(
                `${label}\\s*:?([\\s\\S]*?)(?=${nextLabel}\\s*:?)`, 'i'
              )
            : new RegExp(`${label}\\s*:?([\\s\\S]*)`, 'i');

        const match = this.aiResponse.match(regex);
        if (match && match[1]) {
            const content = match[1]
                .replace(/-/g, '\n-')
                .split('\n')
                .map(item => item.replace(/^-/, '').trim())
                .filter(item => item);

            sections.push({ title: label, points: content });
        }
    });

    // If no sections parsed, show raw response as single block
    if (sections.length === 0 && this.aiResponse) {
        sections.push({
            title: 'Feedback',
            points: [this.aiResponse]
        });
    }

    return sections;
}
  handlePicklistChange(event) {
    this.hasUnsavedChanges = true;
    const value = event.detail.value;
    
    // ✅ Only reset page sequence if funding area actually changed
    if (this.selectedFundingArea === value) return;
    
    this.selectedFundingArea = value;
    this.organizationData.Organizational_Area_s_for_Funding_Inves__c = value;

    const JOB_FULFILLMENT = ['Job Fulfillment Only'];
    const JOB_CREATION    = ['Job Creation Only'];
    const BOTH            = ['Both Job Fulfillment and Job Creation'];

    if (JOB_FULFILLMENT.includes(value)) {
        this.pageSequence = [1, 2, 4, 6, 7];
    } else if (JOB_CREATION.includes(value)) {
        this.pageSequence = [1, 2, 4, 6, 7];
    } else if (BOTH.includes(value)) {
        this.pageSequence = [1, 2, 4, 6, 7];
    } else {
        this.pageSequence = [1];
    }

    // ✅ DO NOT reset currentPageIndex or currentPage here
    // Only set them if we're on page 0 (orientation)
    if (this.currentPage === 0 || this.currentPage === 1) {
        this.currentPageIndex = 0;
        this.currentPage = this.pageSequence[0];
    }
}

handleCurrencyInput(event) {
    this.hasUnsavedChanges = true;
    const field = event.target.dataset.id;
    const raw   = event.target.value;
    const value = Number(raw || 0);

    if (raw !== '' && value < 0) {
        this._showLightningError(field, 'Amount cannot be negative.');
        return;
    } else {
        this._clearLightningError(field);
    }

    this.fiscalData[field] = value;

    const rBudget   = Number(this.fiscalData.Revenue_Budget__c) || 0;
    const rProj     = Number(this.fiscalData.Revenue_Projection__c) || 0;
    const capBudget = Number(this.fiscalData.Capital_Expenditure_Budget__c) || 0;
    const capProj   = Number(this.fiscalData.Capital_Expenditure_Projection__c) || 0;
    const opBudget  = Number(this.fiscalData.Operating_Expenditure_Budget__c) || 0;
    const opProj    = Number(this.fiscalData.Operating_Expenditure_Projection__c) || 0;

    this.fiscalData.Revenue_Variance__c            = rProj - rBudget;
    this.fiscalData.Capital_Expenditure_Variance__c  = capProj - capBudget;
    this.fiscalData.Operating_Expenditure_Variance__c = opProj - opBudget;

    const eBudget = capBudget + opBudget;
    const eProj   = capProj + opProj;

    this.fiscalData.Net_Budget__c     = rBudget - eBudget;
    this.fiscalData.Net_Projection__c = rProj   - eProj;
    this.fiscalData.Net_Variance__c   = this.fiscalData.Net_Projection__c - this.fiscalData.Net_Budget__c;

    this.fiscalData = { ...this.fiscalData };
    this.recalculateAvgCostPerPlacement();
}
async handleUploadFinished(event) {
    const uploadedFiles = event.detail.files;
    const cellKey = event.target.dataset.cellKey;
    if (!cellKey) {
        console.warn('⚠️ No cellKey on upload target');
        return;
    }
    this._fileOpQueue = this._fileOpQueue.then(() =>
        this._processUploadFinished(uploadedFiles, cellKey)
    );
    await this._fileOpQueue;
}

async _processUploadFinished(uploadedFiles, cellKey) {
    this.hasUnsavedChanges = true;
    const MAX_BYTES = 10 * 1024 * 1024;
    const existingForCell = this.uploadedFilesByCell[cellKey] || [];

    const invalidFiles = uploadedFiles.filter(f => {
        const isPdf  = f.name.toLowerCase().endsWith('.pdf');
        const tooBig = f.size && f.size > MAX_BYTES;
        return !isPdf || tooBig;
    });
    const duplicateFiles = uploadedFiles.filter(f =>
        !invalidFiles.includes(f) && existingForCell.some(ex => ex.name === f.name)
    );
    const rejected = [...invalidFiles, ...duplicateFiles];

    if (invalidFiles.length > 0) {
        const names = invalidFiles.map(f => f.name).join(', ');
        this._toast('Invalid File', `Only PDF files up to 10 MB are allowed: ${names}`);
    }
    if (duplicateFiles.length > 0) {
        const names = duplicateFiles.map(f => f.name).join(', ');
        this._toast('Duplicate File',
            `${duplicateFiles.length} file(s) were already uploaded for this question: ${names}`);
    }

    // Await each delete in-line — this is what stops the earlier "phantom
    // upload" race, since nothing else touches uploadedFilesByCell until
    // this settles.
    for (const f of rejected) {
        try { await deleteUploadedFile({ contentDocumentId: f.documentId }); }
        catch (e) { /* best effort */ }
    }

    // Force the widget to remount so it drops its own stale "selected file"
    // chip for anything we just rejected/deleted.
    this._bumpFileUploadKey(cellKey);

    const validFiles = uploadedFiles.filter(f => !rejected.includes(f));
    if (validFiles.length === 0) return;

    try {
        await Promise.all(validFiles.map(file =>
            setFileCellKey({ contentDocumentId: file.documentId, cellKey })
        ));

        // Safe to read fresh state here — this function only runs after any
        // prior queued upload/delete has fully finished.
        const updated = JSON.parse(JSON.stringify(this.uploadedFilesByCell || {}));
        if (!updated[cellKey]) updated[cellKey] = [];
        validFiles.forEach(file => {
            if (!updated[cellKey].some(f => f.documentId === file.documentId)) {
                updated[cellKey].push({ documentId: file.documentId, name: file.name });
            }
            if (!this.uploadedFiles.includes(file.documentId)) {
                this.uploadedFiles = [...this.uploadedFiles, file.documentId];
            }
        });
        this.uploadedFilesByCell = { ...updated };
        this._bumpFileUploadKey(cellKey);   // reset the widget's own chip list

        if (this.invalidFileCells[cellKey]) {
            const cleared = { ...this.invalidFileCells };
            delete cleared[cellKey];
            this.invalidFileCells = cleared;
        }

        this.dispatchEvent(new ShowToastEvent({
            title: 'File Uploaded',
            message: `${validFiles.length} PDF file(s) uploaded.`,
            variant: 'success'
        }));
    } catch (error) {
        console.error('❌ File upload error:', JSON.stringify(error));
        this.dispatchEvent(new ShowToastEvent({
            title: 'Upload Error',
            message: error?.body?.message || 'File uploaded but could not be mapped.',
            variant: 'error',
            mode: 'sticky'
        }));
    }
}
/*handleUploadFinished(event) {
    const uploadedFiles = event.detail.files;
    const cellKey = event.target.dataset.cellKey;
    uploadedFiles.forEach(file => {
        setFileCellKey({ contentDocumentId: file.documentId, cellKey }); // call Apex
    });

    //const cellKey = event.target.dataset.cellKey;
    const files = event.detail.files;
    if (!this.uploadedFilesByCell[cellKey]) this.uploadedFilesByCell[cellKey] = [];
    files.forEach(file => {
        this.uploadedFilesByCell[cellKey].push({ documentId: file.documentId, name: file.name });
    });
    this.uploadedFilesByCell = { ...this.uploadedFilesByCell };
    event.detail.files.forEach(file => {
        this.uploadedFiles.push(file.documentId);
    });
}*/







// ── FIX 3: handleDeleteFile — also force reactivity ──────────────────────
async handleDeleteFile(event) {
    const docId   = event.target.dataset.docId;
    const cellKey = event.target.dataset.cellKey;
    this._fileOpQueue = this._fileOpQueue.then(() =>
        this._processDeleteFile(docId, cellKey)
    );
    await this._fileOpQueue;
    
}

async _processDeleteFile(docId, cellKey) {
    try {
        await deleteUploadedFile({ contentDocumentId: docId });

        const updated = { ...this.uploadedFilesByCell };
        updated[cellKey] = (updated[cellKey] || []).filter(f => f.documentId !== docId);
        this.uploadedFilesByCell = updated;
        this.uploadedFiles = this.uploadedFiles.filter(id => id !== docId);
        this.hasUnsavedChanges = true;

        this._bumpFileUploadKey(cellKey);

        this.dispatchEvent(new ShowToastEvent({
            title: 'File Removed', message: 'The file was deleted successfully.', variant: 'success'
        }));
    } catch (error) {
        console.error('❌ Delete file error:', JSON.stringify(error));
        this.dispatchEvent(new ShowToastEvent({
            title: 'Delete Failed',
            message: error?.body?.message || 'Could not delete the file. Please try again.',
            variant: 'error'
        }));
    }
}
async handleQ21UploadFinished(event) {
    const uploadedFiles = event.detail.files;
    this._fileOpQueue = this._fileOpQueue.then(() =>
        this._processQ21UploadFinished(uploadedFiles)
    );
}

async _processQ21UploadFinished(uploadedFiles) {
    this.hasUnsavedChanges = true;
    const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
    const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
    const invalidFiles = uploadedFiles.filter(f => {
        const name = f.name.toLowerCase();
        const isAllowed = ALLOWED_EXT.some(ext => name.endsWith(ext));
        const tooBig = f.size && f.size > MAX_BYTES;
        return !isAllowed || tooBig;
    });
    const duplicateFiles = uploadedFiles.filter(f =>
        !invalidFiles.includes(f) &&
        this.additionalInfoFiles.some(ex => ex.name === f.name)
    );
    const rejected = [...invalidFiles, ...duplicateFiles];

    if (invalidFiles.length > 0) {
        const msgs = invalidFiles.map(f => {
            const name = f.name.toLowerCase();
            const isAllowed = ALLOWED_EXT.some(ext => name.endsWith(ext));
            return !isAllowed
                ? `"${f.name}" is not an accepted file type (PDF, Word, PowerPoint, or Excel only).`
                : `"${f.name}" exceeds the 50 MB limit.`;
        });
        this.dispatchEvent(new ShowToastEvent({
            title: 'Invalid File', message: msgs.join(' '), variant: 'error', mode: 'sticky'
        }));
    }
    if (duplicateFiles.length > 0) {
        const msgs = duplicateFiles.map(f => `"${f.name}" has already been uploaded.`);
        this.dispatchEvent(new ShowToastEvent({
            title: 'Duplicate File', message: msgs.join(' '), variant: 'error', mode: 'sticky'
        }));
    }

    for (const f of rejected) {
        try { await deleteUploadedFile({ contentDocumentId: f.documentId }); }
        catch (e) { /* best effort */ }
    }
    this._bumpFileUploadKey('Q21');   // remount the widget so its stale chip clears

    const validFiles = uploadedFiles.filter(f => !rejected.includes(f));
    if (validFiles.length === 0) return;

    try {
        await Promise.all(validFiles.map(file =>
            setFileCellKey({ contentDocumentId: file.documentId, cellKey: 'Q21' })
        ));
    } catch (e) {
        console.error('Q21 setFileCellKey error:', e);
    }

    const updated = [...this.additionalInfoFiles];
    validFiles.forEach(file => {
        if (!updated.some(f => f.documentId === file.documentId)) {
            updated.push({ documentId: file.documentId, name: file.name });
        }
    });
    this.additionalInfoFiles = updated;

    this.dispatchEvent(new ShowToastEvent({
        title:   'File Uploaded',
        message: `${validFiles.length} file(s) uploaded.`,
        variant: 'success'
    }));
}

async handleQ21DeleteFile(event) {
    const docId = event.target.dataset.docId;
    this._fileOpQueue = this._fileOpQueue.then(() => this._processQ21DeleteFile(docId));
    await this._fileOpQueue;
}

async _processQ21DeleteFile(docId) {
    try {
        await deleteUploadedFile({ contentDocumentId: docId });
        this.additionalInfoFiles = this.additionalInfoFiles.filter(f => f.documentId !== docId);
        this.hasUnsavedChanges = true;
        this._bumpFileUploadKey('Q21');
        this.dispatchEvent(new ShowToastEvent({ title: 'File Removed', message: 'The file was deleted successfully.', variant: 'success' }));
    } catch (error) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Delete Failed', message: error?.body?.message || 'Could not delete the file. Please try again.', variant: 'error'
        }));
    }
}

/*get showPreviewButton() {
    if (this.selectedFundingArea === 'Job Fulfillment Only') return this.isPage4;
    if (this.selectedFundingArea === 'Job Creation Only') return this.isPage5;
    if (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation') return this.isPage5;
    return false;
} */
async autoSaveDraft() {
    if (this.isSaving) {
        console.log('⚠️ Save in progress, skipping');
        return false;
    }

    this.isSaving = true;
    try {
        this.flushAllInputs();
        this.syncCustomRichTextFields();
        this.updateRichTextFieldsForCurrentPage();

        if (this.organizationData.Current_fiscal_year_s_end_date__c) {
            this.organizationData.Current_fiscal_year_s_end_date__c =
                this.organizationData.Current_fiscal_year_s_end_date__c.split('T')[0];
        }

        // Keep language logic consistent with handleSaveDraft()
        const params = new URLSearchParams(window.location.search);
        const langCode = params.get('language') || 'en';
        const codeToLabel = { en: 'English', es: 'Spanish', pt: 'Portuguese' };
        this.organizationData.Language__c = codeToLabel[langCode] || 'English';

        this.organizationData.Last_Page__c = this.currentPage;

        const shouldSendHistorical = !!(this.historicalData?.Id || this.isDataFilled(this.historicalData));
        const shouldSendFiscal     = !!(this.fiscalData?.Id     || this.isDataFilled(this.fiscalData));
        const shouldSendOutcome    = !!(this.outcomeData?.Id    || this.isDataFilled(this.outcomeData));

        const cleanOrg = this.sanitizeOrgData(this.organizationData);

        const result = await saveWCFDraftApplication({
            applicationId:       this.recordId,
            orgDataJson:         JSON.stringify(cleanOrg),
            historicalData:      shouldSendHistorical ? this.historicalData : null,
            fiscalData:          shouldSendFiscal     ? this.fiscalData     : null,
            outcomeData:         shouldSendOutcome    ? this.outcomeData    : null,
            selectedFundingArea: this.selectedFundingArea,
            uploadedFileIds:     this.uploadedFiles || [],
            skillingDomainsJson: JSON.stringify(this.unifiedSkillDomains),
            businessSectorsJson: JSON.stringify(this.businessSectors)
        });

        this.recordId = result.applicationId;
        this.hasUnsavedChanges = false;

        if (result.historicId) this.historicalData = { ...this.historicalData, Id: result.historicId };
        if (result.fiscalId)   this.fiscalData     = { ...this.fiscalData,     Id: result.fiscalId   };
        if (result.outcomeId)  this.outcomeData    = { ...this.outcomeData,    Id: result.outcomeId  };

        if (result.skillingDomains?.length > 0) {
            this.unifiedSkillDomains = result.skillingDomains.map(r => ({
                domain:          r.Domain_Programme_Name__c || '',
                hours:           r.Hours_of_Training__c     || '',
                duration:        r.Duration_Months__c       || '',
                startDate:       r.Programme_Start_Date__c  || '',
                yearlyEnrolment: r.Yearly_Enrolment__c      || ''
            }));
        }
        if (result.businessSectors?.length > 0) {
            this.businessSectors = result.businessSectors.map(r => ({
                key:              this._rowKey(),
                sector:          r.Sector_c__c          || '',
                sectorOther:     r.Business_Sector_Other__c || '',
                supportBegin:    r.Support_Begin_Date__c || '',
                 supportTypeOther: r.Support_Type_Other__c     || '',
                supportTypes:    r.Support_Types__c ? r.Support_Types__c.split(';') : [],
                yearlyEnrolment: r.Yearly_Enrolment__c  || ''
            }));
        }
        console.log('✅ Auto-saved. recordId =', this.recordId);

       this.dispatchEvent(new ShowToastEvent({
    title: this.labels.CL_Progress_Auto_Saved,
    message: this.labels.CL_Your_answers_are_saved_To_save_and_exit_at_any_time_click_Save_Draft_in_t,
    variant: 'success', mode: 'dismissible'
}));
        return true;

    } catch (error) {
        console.error('⚠️ Auto-save error:', JSON.stringify(error));
        const serverMessage = error?.body?.message || error?.message || '';
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.CL_Auto_save_Failed,
message: serverMessage
    ? `Could not save your progress: ${serverMessage}`
    : this.labels.CL_Could_not_save_your_progress_Please_use_Save_Draft_manually,
            variant: 'error',
            mode: 'sticky'
        }));
        return false;
    } finally {
        this.isSaving = false;
    }
}
handleSaveDraft() {
    this._resetInvalidTracking()
    this._clearAllInlineErrors();
    // ── Block garbage input from being persisted via Save Draft (TC_WF_02–30) ──
    const draftTextChecks = [
        { id: 'Organization_Name__c',             run: v => this._validateNameLikeField(v, 'Organization Name') },
        { id: 'Headquarters_City_and_Country__c', run: v => this._validateHQCityCountry(v) },
        { id: 'Leader_Name__c',                   run: v => this._validateNameLikeField(v, 'Leader Name') },
        { id: 'Leader_Title__c',                  run: v => this._validateNameLikeField(v, 'Leader Title') },
        { id: 'Primary_Service_Regions__c', run: v => this._validateRegionsField(v) },
        { id: 'Submitter_Name__c',                run: v => this._validateNameLikeField(v, 'Submitter Name') },
        { id: 'Job_Title__c',                     run: v => this._validateNameLikeField(v, 'Submitter Title') },
        { id: 'Phone__c', run: v => this._validatePhoneField(v, this.organizationData.WG_Phone_Country_Code__c) },
    ];
    let draftHasBadText = false;
    draftTextChecks.forEach(({ id, run }) => {
        const val = this.organizationData[id];
        if (val === '' || val === null || val === undefined) return; // not filled in yet — fine for a draft
        const err = run(val);
        if (err) {
            this._showLightningError(id, err);
            draftHasBadText = true;
        } else {
            this._clearLightningError(id);
        }
    });
    if (draftHasBadText) {
        this.dispatchEvent(new ShowToastEvent({
    title: this.labels.CL_Invalid_Input,
    message: this.labels.CL_Please_fix_the_highlighted_fields_before_saving_your_draft,
    variant: 'error'
}));
this._scrollToFirstError();
        return;
    }

    this.flushAllInputs();
    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();
    this.organizationData.Last_Page__c = this.currentPage;

    // ✅ CORRECT — read 'language' param and map to label
    const params = new URLSearchParams(window.location.search);
    const langCode = params.get('language') || 'en';
    const codeToLabel = { en: 'English', es: 'Spanish', pt: 'Portuguese' };
    this.organizationData.Language__c = codeToLabel[langCode] || 'English';

    // Sanitize org data (remove undefined keys)
    const cleanOrg = {};
    Object.keys(this.organizationData).forEach(key => {
        if (key && key !== 'undefined') cleanOrg[key] = this.organizationData[key];
    });

    saveWCFDraftApplication({
        applicationId: this.recordId,
        orgDataJson: JSON.stringify(cleanOrg),
        historicalData: this.isDataFilled(this.historicalData) ? this.historicalData : null,
        fiscalData: this.isDataFilled(this.fiscalData) ? this.fiscalData : null,
        outcomeData: this.isDataFilled(this.outcomeData) ? this.outcomeData : null,
        selectedFundingArea: this.selectedFundingArea,
        uploadedFileIds: this.uploadedFiles || [],
      skillingDomainsJson: JSON.stringify(this.unifiedSkillDomains),  // ✅ string
        businessSectorsJson: JSON.stringify(this.businessSectors)        // ✅ string 
    })
    .then((result) => {
        this.recordId = result.applicationId;
        this.hasUnsavedChanges = false;
        if (result.historicId) this.historicalData = { ...this.historicalData, Id: result.historicId };
        if (result.fiscalId)   this.fiscalData     = { ...this.fiscalData,     Id: result.fiscalId };
        if (result.outcomeId)  this.outcomeData    = { ...this.outcomeData,    Id: result.outcomeId };
       if (result.skillingDomains?.length > 0) {
            this.unifiedSkillDomains = result.skillingDomains.map(r => ({
                key:             this._rowKey(),
                domain:          r.Domain_Programme_Name__c || '',
                hours:           r.Hours_of_Training__c     || '',
                duration:        r.Duration_Months__c       || '',
                startDate:       r.Programme_Start_Date__c  || '',
                yearlyEnrolment: r.Yearly_Enrolment__c      || ''
            }));
        }

        if (result.businessSectors?.length > 0) {
            this.businessSectors = result.businessSectors.map(r => ({
                key:              this._rowKey(),
                sector:           r.Sector_c__c              || '',
                sectorOther:      r.Business_Sector_Other__c || '',
                supportBegin:     r.Support_Begin_Date__c    || '',
                supportTypeOther: r.Support_Type_Other__c    || '',
                supportTypes:     r.Support_Types__c
                                    ? r.Support_Types__c.split(';')
                                    : [],
                yearlyEnrolment:  r.Yearly_Enrolment__c      || ''
            }));
        }
        this.showSuccessToast('Draft Saved Successfully!');
    })
    .catch((error) => {
        console.error('⚠️ Error saving draft:', error);
        let message = 'An unexpected error occurred while saving draft.';
        if (error?.body?.message) message = error.body.message;
        else if (error?.body?.pageErrors?.[0]?.message) message = error.body.pageErrors[0].message;
        else if (error?.message) message = error.message;
        this.showErrorToast(message);
    });
}showSuccessToast(msg) {
    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Success',
            message: msg,
            variant: 'success'
        })
    );
}

showErrorToast(msg) {
    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Error',
            message: msg,
            variant: 'error'
        })
    );
}

// ✅ ADD THIS METHOD
getSectorOptions(selectedValue) {
    const sectors = [
        '', 'Agriculture', 'Retail', 'Manufacturing', 'Services','Technology',  'Other'
    ];
    return sectors.map(s => ({
        label: s === '' ? '— Select —' : s,
        value: s,
        isSelected: s === (selectedValue || '')
    }));
}
// Robust "Yes" check — falls back to literal values if the picklist map didn't load
_isYesValue(field) {
    const v = this.outcomeData[field];
    if (!v) return false;
    const mapped = this.yesLabelMap[field];
    if (mapped && v === mapped) return true;
    return ['Yes', 'yes', 'Sí', 'Si', 'Sim'].includes(String(v).trim());
}

validateFileUploads() {
    const missingFiles = [];
    this.invalidFileCells = {};

    const cellsToCheck = [];

    // Page 4 now hosts BOTH outcome blocks (JF Q15 and JC Q17)
    if (this.currentPage === 4 && this.showJFOutcomes) {
        cellsToCheck.push({
            key:   'P4_FY1_PV',
            field: 'X3rd_Party_Placement_Verification_FY_1__c',
            label: this.labels.CL_Job_Fulfilment_Outcomes_Last_3_Fiscal_Years_Actuals
                   || 'Job Fulfilment Outcomes'
        });
    }
   if (this.currentPage === 4 && this.showJCOutcomes) {
    cellsToCheck.push({
        key:   'P5_FY1_JV',              // ← was 'P4_JC_FY1_JV'
        field: 'Job_Verification_3rd_Party_FY1__c',
        label: this.labels.CL_Job_Creation_Outcomes_Last_3_Fiscal_Years_Actuals
               || 'Job Creation Outcomes'
    });
}
    // Legacy standalone page 5, kept in case that route is re-enabled
    if (this.currentPage === 5 && this.showJCOutcomes) {
        cellsToCheck.push({
            key:   'P5_FY1_JV',
            field: 'Job_Verification_3rd_Party_FY1__c',
            label: this.labels.CL_Job_Creation_Verification
        });
    }

    cellsToCheck.forEach(({ key, field, label }) => {
        const hasFiles = (this.uploadedFilesByCell[key] || []).length > 0;
        if (this._isYesValue(field) && !hasFiles) {
            missingFiles.push(label);
            this.invalidFileCells[key] = true;
        }
    });

    this.invalidFileCells = { ...this.invalidFileCells };

    if (missingFiles.length > 0) {
        this.dispatchEvent(new ShowToastEvent({
            title:   'File Attachment Required',
            message: `${this.labels.CL_File_Required_Message}: ${missingFiles.join(', ')}`,
            variant: 'error',
             mode:    'dismissible'
        }));
        this._scrollToFirstError();
        return false;
    }
    return true;
}
get applicationNumber() {
    // Salesforce record names are often IA-XXXXXXXXX format
    return this.submittedRecordId || 'your application';
}
// ── Page 7 attestation validation ──────────────────────────────────────
validatePage7Fields() {
    let isValid = true;

    const attestFields = [
        { id: 'Attesting_User_Name__c',  label: 'Attesting User Name'  },
        { id: 'Attesting_User_Title__c', label: 'Attesting User Title' }
    ];

    attestFields.forEach(({ id, label }) => {
        const v = this.organizationData[id];
        if (!v || String(v).trim() === '') {
            this._showLightningError(id, `${label} is required.`);
            isValid = false;
            return;
        }
        // Reuse the same text-quality rules as page 1 (no emoji / tags / numbers-only)
        const err = this._validateNameLikeField(v, label);
        if (err) {
            this._showLightningError(id, err);
            isValid = false;
        } else {
            this._clearLightningError(id);
        }
    });

    return isValid;
}

async handleSubmit() {
    if (this.isLoading) return;
    await this._fileOpQueue;

    // Reset error tracking so the scroll targets only this attempt's errors
    this._resetInvalidTracking();
    this._clearAllInlineErrors(); 

    // Pull every on-screen value into the data objects before validating
    this.flushAllInputs();
    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();

    // ── 1. Attestation checkbox ────────────────────────────────────────
    if (!this.isAttested) {
        this.dispatchEvent(new ShowToastEvent({
            title:   this.labels.CL_Validation_Error,
            message: this.labels.CL_Attestation_Checkbox
                     || 'Please confirm the accuracy of your application before submitting.',
            variant: 'error'
        }));
        const box = this.template.querySelector('.wcf-attest-checkbox-row lightning-input');
        if (box) {
            this._registerInvalid(box);
            this._scrollToFirstError();
        }
        return;
    }

    // ── 2. Attesting name / title ──────────────────────────────────────
    if (!this.validatePage7Fields()) {
        const uniqueLabels = Array.from(new Set(
            this._invalidElements.filter(el => el && el.isConnected).map(el => this._getFieldLabel(el)).filter(Boolean)
        ));
        const labelsStr = uniqueLabels.map(l => `"${l}"`).join(', ');
        this.dispatchEvent(new ShowToastEvent({
            title:   this.labels.CL_Validation_Error,
            message: labelsStr
                ? `${this.labels.CL_This_is_a_required_fields}: ${labelsStr}`
                : this.labels.CL_Please_fix_the_highlighted_fields_before_proceeding,
            variant: 'error'
        }));
        this._scrollToFirstError();
        return;
    }

    // ── 3. Any file uploads still outstanding ──────────────────────────
    if (!this.validateFileUploads()) {
        return; // toast + scroll handled inside validateFileUploads()
    }

    // ── 4. Funding Opportunity must be resolved ────────────────────────
    if (!this.organizationData.FundingOpportunityId) {
        this.dispatchEvent(new ShowToastEvent({
            title:   this.labels.CL_Error,
            message: 'Funding Opportunity ID is missing. Please refresh the page and try again.',
            variant: 'error',
            mode:    'sticky'
        }));
        return;
    }

    // ── 5. Submit ──────────────────────────────────────────────────────
    this.isLoading = true;

    if (this.organizationData.Current_fiscal_year_s_end_date__c) {
        this.organizationData.Current_fiscal_year_s_end_date__c =
            this.organizationData.Current_fiscal_year_s_end_date__c.split('T')[0];
    }

    submitWCFApplication({
        orgDataJson:         JSON.stringify(this.sanitizeOrgData(this.organizationData)),
        historicalData:      this.historicalData,
        fiscalData:          this.fiscalData,
        outcomeData:         this.outcomeData,
        uploadedFileIds:     this.uploadedFiles || [],
        selectedFundingArea: this.selectedFundingArea,
        recordId:            this.recordId,
        skillingDomainsJson: JSON.stringify(this.unifiedSkillDomains),
        businessSectorsJson: JSON.stringify(this.businessSectors)
    })
    .then(result => {
        // Apex returns the application Name, e.g. "IA-0000000001"
        this.recordId          = result;
        this.submittedRecordId = result;
        this.isLoading         = false;
        this.isSubmitted       = true;
        this.hasUnsavedChanges = false;
        localStorage.removeItem('wcf_draft_recordId');

        this.dispatchEvent(new ShowToastEvent({
            title:   'Success',
            message: 'Application submitted successfully.',
            variant: 'success'
        }));

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                   // url: 'https://wadhwanifoundation--wfdev.sandbox.my.site.com/wcf/s/applicant-portal'
                    url: 'https://grants.wadhwanifoundation.org/partner/s/?language=en_US'
                }
            });
        }, 8000);
    })
    .catch(error => {
        this.isLoading = false;
        console.error('❌ Submit Error:', JSON.stringify(error, null, 2));

        const message =
            error?.body?.message ||
            error?.body?.pageErrors?.[0]?.message ||
            error?.message ||
            'Unknown error occurred during submission';

        this.dispatchEvent(new ShowToastEvent({
            title:   this.labels.CL_Error,
            message,
            variant: 'error',
            mode:    'sticky'
        }));
    });
}
   navigateHome() {
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
               // attributes: {
                //    url: 'https://wadhwanifoundation--wfdev.sandbox.my.site.com/wcf/s/applicant-portal'
               // }
                attributes: {
                    url: 'https://grants.wadhwanifoundation.org/partner/s/?language=en_US'
                }
            });
        }

get isFirstOrLoadingDisabled() {
    return this.isFirstPage || this.isLoading;
}

get isNextOrLoadingDisabled() {
    return this.isLastPage || this.isLoading;
}
get leaderTenure() {
    const v = this._app?.Leader_Tenure__c;
    return (v != null && v !== '') ? `${v} years` : '—';
}
/* ============================================================
   ADD these getters to wcfForm.js (anywhere inside the class body,
   e.g. right after your other `get fiscalData()`-style getters).
   They do NOT replace your existing historicalData/fiscalData/
   outcomeData track properties — those stay exactly as-is and keep
   feeding the editable Page 4 inputs (lightning-input needs raw
   numbers, not comma-formatted strings, or typing breaks).

   These new getters are ONLY for the read-only Review page (Page 7)
   tables, which currently bind directly to the raw numbers and
   therefore show "$2232635" instead of "$2,232,635".
   ============================================================ */

// Shared formatter: adds US-style thousands separators.
// Keeps 2 decimals only when the value actually has cents.
_fmtMoney(v) {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    const hasCents = Math.round(n * 100) % 100 !== 0;
    return n.toLocaleString('en-US', {
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: 2
    });
}
_fmtDateDisplay(v) {
    if (!v) return '';
    const s = (v instanceof Date) ? v.toISOString() : String(v);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(m[3], 10)} ${MONTH_ABBR[parseInt(m[2], 10) - 1]} ${m[1]}`;
}
get formattedIncorporationDate() {
    return this._fmtDateDisplay(this.organizationData.Incorporation_Date__c);
}
get formattedFunder1PeriodStart() {
    return this._fmtDateDisplay(this.organizationData.Funder_1_Period_Start__c);
}
get formattedFunder1PeriodEnd() {
    return this._fmtDateDisplay(this.organizationData.Funder_1_Period_End__c);
}
get formattedFiscalYearEndDateReview() {
    return this._fmtDateDisplay(this.organizationData.Current_fiscal_year_s_end_date__c);
}
get formattedFundersReview() {
    const org = this.organizationData;
    const f = v => this._fmtMoney(v);
    const d = v => this._fmtDateDisplay(v);
    return {
        Funder_1_Amount__c: f(org.Funder_1_Amount__c),
        Funder_2_Amount__c: f(org.Funder_2_Amount__c),
        Funder_3_Amount__c: f(org.Funder_3_Amount__c),
        Funder_1_Period_Start__c: d(org.Funder_1_Period_Start__c),
        Funder_1_Period_End__c:   d(org.Funder_1_Period_End__c),
        Funder_2_Period_Start__c: d(org.Funder_2_Period_Start__c),
        Funder_2_Period_End__c:   d(org.Funder_2_Period_End__c),
        Funder_3_Period_Start__c: d(org.Funder_3_Period_Start__c),
        Funder_3_Period_End__c:   d(org.Funder_3_Period_End__c)
    };
}
get businessSectorsForReview() {
    return this.businessSectors
        .filter(r => r.sector)
        .map(r => ({
            ...r,
            displaySupportBegin: this._fmtDateDisplay(r.supportBegin),
            sector: (r.sector === 'Other' && r.sectorOther) ? `Other: ${r.sectorOther}` : r.sector,
            supportTypesDisplay: (r.supportTypes || [])
                .map(t => (t === 'Other' && r.supportTypeOther) ? `Other: ${r.supportTypeOther}` : t)
                .join(', ')
        }));
}

// ── Q12 — Historical Financial Data (Review page) ──────────────────────
get formattedHistoricalReview() {
    const h = this.historicalData;
    const f = v => this._fmtMoney(v);
return {
        CY3_Balance_Start_CFY_3__c: f(h.CY3_Balance_Start_CFY_3__c),
        CY2_Balance_Start_CFY_2__c: f(h.CY2_Balance_Start_CFY_2__c),
        CY1_Balance_Start_CFY_1__c: f(h.CY1_Balance_Start_CFY_1__c),
        CY3_Revenue__c: f(h.CY3_Revenue__c),
        CY2_Revenue__c: f(h.CY2_Revenue__c),
        CY1_Revenue__c: f(h.CY1_Revenue__c),
        CY3_Capital_Expenditure__c: f(h.CY3_Capital_Expenditure__c),
        CY2_Capital_Expenditure__c: f(h.CY2_Capital_Expenditure__c),
        CY1_Capital_Expenditure__c: f(h.CY1_Capital_Expenditure__c),
        CY3_Operating_Expenditure__c: f(h.CY3_Operating_Expenditure__c),
        CY2_Operating_Expenditure__c: f(h.CY2_Operating_Expenditure__c),
        CY1_Operating_Expenditure__c: f(h.CY1_Operating_Expenditure__c),
        CY3_Expense__c: f(h.CY3_Expense__c),
        CY2_Expense__c: f(h.CY2_Expense__c),
        CY1_Expense__c: f(h.CY1_Expense__c),
        CY3_Balance_End__c: f(h.CY3_Balance_End__c),
        CY2_Balance_End__c: f(h.CY2_Balance_End__c),
        CY1_Balance_End__c: f(h.CY1_Balance_End__c)
    };
}

// ── Q13 — Current Fiscal Year Data (Review page) ───────────────────────
get formattedFiscalReview() {
    const fc = this.fiscalData;
    const f = v => this._fmtMoney(v);
    return {
        Revenue_Budget__c: f(fc.Revenue_Budget__c),
        Revenue_Projection__c: f(fc.Revenue_Projection__c),
        Revenue_Variance__c: f(fc.Revenue_Variance__c),
       Capital_Expenditure_Budget__c: f(fc.Capital_Expenditure_Budget__c),
Capital_Expenditure_Projection__c: f(fc.Capital_Expenditure_Projection__c),
Capital_Expenditure_Variance__c: f(fc.Capital_Expenditure_Variance__c),
Operating_Expenditure_Budget__c: f(fc.Operating_Expenditure_Budget__c),
Operating_Expenditure_Projection__c: f(fc.Operating_Expenditure_Projection__c),
Operating_Expenditure_Variance__c: f(fc.Operating_Expenditure_Variance__c),
        Net_Budget__c: f(fc.Net_Budget__c),
        Net_Projection__c: f(fc.Net_Projection__c),
        Net_Variance__c: f(fc.Net_Variance__c)
    };
}

// ── Q15/16 & Q17/18 — Avg Cost per Placement / Job rows (Review page) ──
get formattedOutcomeReview() {
    const o = this.outcomeData;
    const f = v => this._fmtMoney(v);
    return {
        Manual_Avg_Cost_per_Placement_FY_3__c: f(o.Manual_Avg_Cost_per_Placement_FY_3__c),
        Manual_Avg_Cost_per_Placement_FY_2__c: f(o.Manual_Avg_Cost_per_Placement_FY_2__c),
        Manual_Avg_Cost_per_Placement_FY_1__c: f(o.Manual_Avg_Cost_per_Placement_FY_1__c),
        Manual_Avg_Cost_per_Placement_CFY__c: f(o.Manual_Avg_Cost_per_Placement_CFY__c),
        Manual_Avg_Cost_per_Job_FY_3__c: f(o.Manual_Avg_Cost_per_Job_FY_3__c),
        Manual_Avg_Cost_per_Job_FY_2__c: f(o.Manual_Avg_Cost_per_Job_FY_2__c),
        Manual_Avg_Cost_per_Job_FY_1__c: f(o.Manual_Avg_Cost_per_Job_FY_1__c),
        Manual_Avg_Cost_per_Job_CFY__c: f(o.Manual_Avg_Cost_per_Job_CFY__c)
    };
}


get hasQ21Files() {
    return this.additionalInfoFiles && this.additionalInfoFiles.length > 0;
}

get isRecordIdMissing() {
    return !this.isValidSalesforceId(this.recordId);
}
isValidSalesforceId(id) {
    return typeof id === 'string' && /^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$/.test(id);
}

get todayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

get incorporationDateMin() {
    return this.organizationData.Incorporation_Date__c || '1900-01-01';
}
 get disclaimerPoints() {
        return this.labels.CL_Your_Latest_Changes.split('|');
    }
    get leaderTenureDisplay() {
    const v = this.organizationData.Leader_Tenure__c;
    return (v !== null && v !== undefined && v !== '') ? `${v} years` : '—';
}
}


//draft