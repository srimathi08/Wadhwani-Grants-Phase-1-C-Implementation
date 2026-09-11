import { LightningElement, wire, track, api } from 'lwc';
        import upsertAIFeedback from '@salesforce/apex/WCFFormController.upsertAIFeedback';
        import getAIFeedbackRecord from '@salesforce/apex/WCFFormController.getAIFeedbackRecord';
        import getPicklistValuesForField from '@salesforce/apex/WCFFormController.getPicklistValuesForField';
        import saveWCFDraftApplication from '@salesforce/apex/WCFFormController.saveWCFDraftApplication';
        import submitWCFApplication from '@salesforce/apex/WCFFormController.submitWCFApplication';
        import getActiveFundingOpportunityId from '@salesforce/apex/WCFFormController.getActiveFundingOpportunityId';
        import setFileCellKey from '@salesforce/apex/WCFFormController.setFileCellKey';
        import getDraftWCFApplication from '@salesforce/apex/WCFFormController.getDraftWCFApplication';
        import searchHQLocation from '@salesforce/apex/OpenStreetMapService.searchLocation';
        import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
        import flagTelpicker from '@salesforce/resourceUrl/flagTelpicker';
        import JSPDF from '@salesforce/resourceUrl/downloadjs';
        import AUTO_TABLE from '@salesforce/resourceUrl/autotable';
        import CL_Technical_Assistance_Tooltip from '@salesforce/label/c.CL_Technical_Assistance_Tooltip';
        import CL_Operating_across_both_skilling_and_entrepreneurship from '@salesforce/label/c.CL_Operating_across_both_skilling_and_entrepreneurship';
        import getApplicationAttachments from '@salesforce/apex/WCFFormController.getApplicationAttachments';
        //new custom labels
        import CL_Your_Latest_Changes from '@salesforce/label/c.CL_Your_Latest_Changes';
        import CL_Learner_Enrollment_help_text from '@salesforce/label/c.CL_Learner_Enrollment_help_text';
        import CL_draft_save from '@salesforce/label/c.CL_draft_save';
        import CL_Please_Save from '@salesforce/label/c.CL_Please_Save';
        import CL_Language_Lock from '@salesforce/label/c.CL_Language_Lock';
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
        import CL_Non_Profit from '@salesforce/label/c.CL_Non_Profit';
        import CL_For_Profit from '@salesforce/label/c.CL_For_Profit';
        import CL_Government_Affiliated from '@salesforce/label/c.CL_Government_Affiliated';
        import CL_Other_1 from '@salesforce/label/c.CL_Other_1';
        // IMPORTS
        import CL_Display_Box1 from '@salesforce/label/c.CL_Display_Box1';
        import CL_Display_Box2 from '@salesforce/label/c.CL_Display_Box2';
        import CL_Agriculture from '@salesforce/label/c.CL_Agriculture';
        import CL_Technology from '@salesforce/label/c.CL_Technology';
        import CL_Retail from '@salesforce/label/c.CL_Retail';
        import CL_Services from '@salesforce/label/c.CL_Services';
        import CL_Manufacturing from '@salesforce/label/c.CL_Manufacturing';
        // IMPORTS
        import CL_Capital from '@salesforce/label/c.CL_Capital';
        import CL_Mentorship1 from '@salesforce/label/c.CL_Mentorship1';
        import CL_Business_Advisory1 from '@salesforce/label/c.CL_Business_Advisory1';
        import CL_Market_Linkages1 from '@salesforce/label/c.CL_Market_Linkages1';
        import CL_Sector_TA1 from '@salesforce/label/c.CL_Sector_TA1';
        // IMPORTS
        import CL_Yes_interested from '@salesforce/label/c.CL_Yes_interested';
        import CL_Maybe_want_to_learn_more from '@salesforce/label/c.CL_Maybe_want_to_learn_more';
        import CL_Not_at_this_time from '@salesforce/label/c.CL_Not_at_this_time';

        import { NavigationMixin } from 'lightning/navigation';
        import { ShowToastEvent } from 'lightning/platformShowToastEvent';
        import { FlowNavigationBackEvent } from 'lightning/flowSupport';
        // Custom Labels
        import CL_WCF_Form_Title from '@salesforce/label/c.CL_WCF_Form_Title';
        import WCF_Paragraph_1 from '@salesforce/label/c.WCF_Paragraph_1';
        import WCF_Paragraph_2 from '@salesforce/label/c.WCF_Paragraph_2';
        import WCF_Paragraph_3 from '@salesforce/label/c.WCF_Paragraph_3';
        import CL_Organizational_Area_s_for_Funding_Investment from '@salesforce/label/c.CL_Organizational_Area_s_for_Funding_Investment';
        import CL_Leader_Tenure from '@salesforce/label/c.CL_Leader_Tenure';
        
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
        import CL_Tell_us_about_your_work_in_both_skilling_Job_Fulfilment_and_entrepreneurshi from '@salesforce/label/c.CL_Tell_us_about_your_work_in_both_skilling_Job_Fulfilment_and_entrepreneurshi';
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

        import CL_Next from '@salesforce/label/c.CL_Next';
        import CL_Previous from '@salesforce/label/c.CL_Previous';
        import CL_Save_Draft from '@salesforce/label/c.CL_Save_Draft';
        import CL_Submit from '@salesforce/label/c.CL_Submit';
        import CLH_AI_Feedback from '@salesforce/label/c.CLH_AI_Feedback';
        import CLH_Preview from '@salesforce/label/c.CLH_Preview';
        import CL_Close from '@salesforce/label/c.CL_Close';
        import CL_Click_To_Add_Explanation from '@salesforce/label/c.CL_Click_To_Add_Explanation';
        import CL_Explanation_Note from '@salesforce/label/c.CL_Explanation_Note';
        import CL_Attestation_Label from '@salesforce/label/c.CL_Attestation_Label';
        import CL_File_Required_Message from '@salesforce/label/c.CL_File_Required_Message';
        import setLanguage from '@salesforce/apex/WCFFormController.setLanguage';

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
        import CL_Tell_us_about_your_job_creation_work from '@salesforce/label/c.CL_Tell_us_about_your_job_creation_work';
        import CL_Response_time_Within_2_business_days from '@salesforce/label/c.CL_Response_time_Within_2_business_days';
        import CL_Languages_English_Spanish_Portuguese from '@salesforce/label/c.CL_Languages_English_Spanish_Portuguese';
        import CL_What_You_ve_Delivered_financials_and_outcomes from '@salesforce/label/c.CL_What_You_ve_Delivered_financials_and_outcomes';
        import CL_Why_Wadhwani_Charitable_Foundation_your_direction from '@salesforce/label/c.CL_Why_Wadhwani_Charitable_Foundation_your_direction';

        // ── Page 1: About Your Organisation (new fields) ───────────────────────
        import CL_Section_1_of_5 from '@salesforce/label/c.CL_Section_1_of_5';
        import CL_Tell_us_who_you_are_We_use_this_section_to_understand_your_organisation_s_st from '@salesforce/label/c.CL_Tell_us_who_you_are_We_use_this_section_to_understand_your_organisation_s_st';
        import CL_Select_the_option_that_best_describes_your_organisation_focus from '@salesforce/label/c.CL_Select_the_option_that_best_describes_your_organisation_focus';
        import CL_Where_do_you_operate_List_all_states_provinces_regions from '@salesforce/label/c.CL_Where_do_you_operate_List_all_states_provinces_regions';
        import CL_Who_is_filling_out_this_form_You_ll_be_the_initial_point_of_contact_for_your from '@salesforce/label/c.CL_Who_is_filling_out_this_form_You_ll_be_the_initial_point_of_contact_for_your';
        import CL_Tell_us_how_your_organisation_is_legally_constituted_and_where_it_s_registere from '@salesforce/label/c.CL_Tell_us_how_your_organisation_is_legally_constituted_and_where_it_s_registere';
        import CL_Type from '@salesforce/label/c.CL_Type';
        import CL_Registration_Jurisdiction from '@salesforce/label/c.CL_Registration_Jurisdiction';
        import CL_Number_of_years_your_current_named_leader_has_held_their_role_Round_to_the_n from '@salesforce/label/c.CL_Number_of_years_your_current_named_leader_has_held_their_role_Round_to_the_n';
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
        import deleteUploadedFile from '@salesforce/apex/WCFFormController.deleteUploadedFile';

        import CL_Application_Submitted_Successfully from '@salesforce/label/c.CL_Application_Submitted_Successfully';
        import CL_Thank_you_for_submitting_your_application_to_the_Wadhwani_Grants from '@salesforce/label/c.CL_Thank_you_for_submitting_your_application_to_the_Wadhwani_Grants';
        import CL_What_Happens_Next from '@salesforce/label/c.CL_What_Happens_Next';
        import CL_Your_application_has_been_received from '@salesforce/label/c.CL_Your_application_has_been_received';
        import CL_Our_team_will_review_the_submitted_information from '@salesforce/label/c.CL_Our_team_will_review_the_submitted_information';
        import CL_You_will_receive_email_communication_regarding_further_actions from '@salesforce/label/c.CL_You_will_receive_email_communication_regarding_further_actions';
        import CL_Go_to_Dashboard from '@salesforce/label/c.CL_Go_to_Dashboard';


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
        import CL_Avg_Cost_Placement_Formula from '@salesforce/label/c.CL_Avg_Cost_Placement_Formula';
        import CL_Avg_Cost_Job_Formula from '@salesforce/label/c.CL_Avg_Cost_Job_Formula';
        import CL_Job_Fulfillment_Only from '@salesforce/label/c.CL_Job_Fulfillment_Only';
    import CL_Job_Creation_Only from '@salesforce/label/c.CL_Job_Creation_Only';
    import CL_Both_Job_Fulfillment_and_Job_Creation from '@salesforce/label/c.CL_Both_Job_Fulfillment_and_Job_Creation';

    import CL_Capital_Expenditure from '@salesforce/label/c.CL_Capital_Expenditure';
    import CL_Capital_Expenditure_Help from '@salesforce/label/c.CL_Capital_Expenditure_Help';
    import CL_Operating_Expenditure from '@salesforce/label/c.CL_Operating_Expenditure';
    import CL_Operating_Expenditure_Help from '@salesforce/label/c.CL_Operating_Expenditure_Help';

        // add near your other Page 7 imports
    import CL_Download_as_PDF from '@salesforce/label/c.CL_Download_as_PDF';

    //usermail
    import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';
import IS_GUEST from '@salesforce/user/isGuest';
import USER_EMAIL_FIELD from '@salesforce/schema/User.Email';
import USER_NAME_FIELD from '@salesforce/schema/User.Name';
import USER_PHONE_FIELD from '@salesforce/schema/User.Phone';
import USER_MOBILE_FIELD from '@salesforce/schema/User.MobilePhone';

        export default class WcfForm extends NavigationMixin(LightningElement) {
            @track useDynamicEngine = true;
            @api recordId;
            selectedLanguage = 'en_US';

            acceptedFormats = ['.pdf'];
            officeDocFormats = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];  
            legalStructureWordCount = 0;
            additionalFundingWordCount = 0;
        synergiesWordCount = 0;
        sustainabilityWordCount = 0;
        revenueExplanationWordCount = 0;
        expenseExplanationWordCount = 0;
        // Word counter for Skilling Approach
        skillingApproachWordCount = 0;
        @track showFunder2 = false;
        @track fiscalMonthValue = '';
        @track fiscalDayValue = '';

        @track showFunder3 = false;
        @track showReference2 = false;
        @track isLoading = false;
        @track errorStepActive = false;

        // ── Headquarters City/Country search (OpenStreetMap) ──
        @track hqSearchKey = '';
        @track hqResults = [];
        @track hqIsLoading = false;
        @track hqShowNoResults = false;
        hqDelayTimeout;
        @track isPhoneCodeDropdownOpen = false;
        @track phoneCodeSearchTerm = '';
        @track phoneNumberError = '';
        jcApproachWordCount = 0;

        // ── intl-tel-input (flagTelpicker) phone picker ──
        _phoneIti = null;
        _phoneItiInitialized = false;
        _phoneScriptsLoaded = false;
        _onPhoneCountryChange = null;

        _scriptsInitiated = false;  // guards against re-running loadScript
        @track isJsLoaded = false;  // true only when Promise resolves
        @track additionalInfoFiles = [];
        logoBase64 = null;

        _verifiedEmail = null;
        _verifiedName  = null;
        _verifiedPhone = null;



@wire(getRecord, { recordId: USER_ID, fields: [USER_EMAIL_FIELD, USER_NAME_FIELD, USER_PHONE_FIELD, USER_MOBILE_FIELD] })
wiredVerifiedUser({ data, error }) {
    if (IS_GUEST) return;                   // never stamp the site Guest User email
    if (data) {
        this._verifiedEmail = getFieldValue(data, USER_EMAIL_FIELD) || null;
         this._verifiedName  = getFieldValue(data, USER_NAME_FIELD)  || null;
        this._verifiedPhone = getFieldValue(data, USER_MOBILE_FIELD)
                    || getFieldValue(data, USER_PHONE_FIELD)
                    || null;
        this._applyVerifiedEmail();
        this._applyVerifiedName();
        this._applyVerifiedPhone();
    } else if (error) {
        console.warn('Verified user email unavailable:', JSON.stringify(error));
    }
}

    handleDynamicSubmitted(event) {
        if (event.detail && event.detail.recordId) {
            this.recordId = event.detail.recordId;
        }
        this.isSubmitted = true;
    }

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

// Prefill only — never overwrites a saved draft value or anything the user typed.
_applyVerifiedName() {
    if (!this._verifiedName) return;
    const current = this.organizationData.Submitter_Name__c;
    if (current && String(current).trim() !== '') return;

    this.organizationData = {
        ...this.organizationData,
        Submitter_Name__c: this._verifiedName
    };
    this._clearLightningError('Submitter_Name__c');
}

// Prefill only — never overwrites a saved draft value or anything the user typed.
// The phone widget (intl-tel-input) normalizes/parses the number itself once it
// initializes, so we just hand it a digits-only string and let it pick the
// country/trunk-prefix formatting.
_applyVerifiedPhone() {
    if (!this._verifiedPhone) return;
    const current = this.organizationData.Phone__c;
    if (current && String(current).trim() !== '') return;

    const digitsOnly = String(this._verifiedPhone).replace(/\D/g, '');
    if (!digitsOnly) return;

    this.organizationData = {
        ...this.organizationData,
        Phone__c: digitsOnly
    };
    this.phoneNumberError = '';

    // If the phone widget is already initialised by the time this resolves
    // (e.g. wire adapter settles after first render), push the value in live
    // instead of waiting for a re-init that won't happen again.
    if (this._phoneItiInitialized) {
        const input = this.template.querySelector('input[data-id="phone"]');
        if (input) {
            input.value = digitsOnly;
            this._syncPhoneFromIti(input, false, true);
        }
    }
}

        // Add this helper method to your class:
        sanitizeOrgData(data) {
            const clean = {};
            Object.keys(data).forEach(key => {
                if (key && key !== 'undefined') {
                    clean[key] = data[key];
                }
            });
            return clean;
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
        @track businessSectors = [];
        get englishClass() {
            return this.selectedLanguage === 'en_US'
                ? 'lang-option active-lang'
                : 'lang-option';
        }

        get spanishClass() {
            return this.selectedLanguage === 'es'
                ? 'lang-option active-lang'
                : 'lang-option';
        }
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
        get portugueseClass() {
            return this.selectedLanguage === 'pt_BR'
                ? 'lang-option active-lang'
                : 'lang-option';
        }
        get submitButtonLabel() {
    return this.isLoading ? 'Submitting…' : this.labels.CL_Submit;
}
        get progressSteps() {
            // Define step labels and which pages belong to each step
            let stepDefs;

            if (this.selectedFundingArea === 'Job Creation Only') {
                stepDefs = [
                    { label: this.labels.CL_About_Your_Organisation, pages: [1] },
                    { label: this.labels.CL_What_You_Do, pages: [2] },
                    { label: this.labels.CL_What_You_ve_Delivered, pages: [4] },
                    { label: this.labels.CL_WCF1, pages: [6] },
                    { label: this.labels.CL_Review_Submit, pages: [7] }
                ];

            } else if (this.selectedFundingArea === 'Job Fulfillment Only') {

                stepDefs = [
                    { label: this.labels.CL_About_Your_Organisation, pages: [1] },
                    { label: this.labels.CL_What_You_Do, pages: [2] },
                    { label: this.labels.CL_What_You_ve_Delivered, pages: [4] },
                    { label: this.labels.CL_WCF1, pages: [6] },
                    { label: this.labels.CL_Review_Submit, pages: [7] }
                ];

            } else if (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation') {

                stepDefs = [
                    { label: this.labels.CL_About_Your_Organisation, pages: [1] },
                    { label: this.labels.CL_What_You_Do, pages: [2] },
                    { label: this.labels.CL_What_You_ve_Delivered, pages: [4] },
                    { label: this.labels.CL_WCF1, pages: [6] },
                    { label: this.labels.CL_Review_Submit, pages: [7] }
                ];

            } else {

                // Default / no selection yet
                stepDefs = [
                    { label: this.labels.CL_About_Your_Organisation, pages: [1, 2] },
                    { label: this.labels.CL_What_You_Do, pages: [3] },
                    { label: this.labels.CL_What_You_ve_Delivered, pages: [4, 5] },
                    { label: this.labels.CL_WCF1, pages: [6] },
                    { label: this.labels.CL_Review_Submit, pages: [] }
                ];
            }

            const activeIdx = stepDefs.findIndex(s => s.pages.includes(this.currentPage));
            const effectiveActive = activeIdx === -1 ? stepDefs.length - 1 : activeIdx;

            return stepDefs.map((s, i) => ({
                label:         s.label,
                number:        i + 1,
                isActive:      i === effectiveActive,
                isCompleted:   i < effectiveActive,
                isPending:     i > effectiveActive,
                connectorClass: i < stepDefs.length - 1
                    ? (i < effectiveActive
                        ? 'tracker-connector tracker-connector--done'
                        : 'tracker-connector')
                    : '',
        bubbleClass: i < effectiveActive
                    ? 'tracker-bubble tracker-bubble--done'
                    : i === effectiveActive
                    ? (this.errorStepActive
                        ? 'tracker-bubble tracker-bubble--active tracker-bubble--error'
                        : 'tracker-bubble tracker-bubble--active')
                    : 'tracker-bubble',
                labelClass: i === effectiveActive
                    ? 'tracker-label tracker-label--active'
                    : 'tracker-label'
            }));
        }
            @track hasUnsavedChanges = false;
            @track recordId = null; // to store existing draft ID

            //@track organizationData = {};     // IndividualApplication__c fields
            @track historicalRecord = {};     // Historical_Data__c
            @track fiscalRecord = {};         // Current_fiscal_year_data__c
            @track outcomeRecord = {};        // Outcomes_Data__c
            winLogoUrl = WIN_LOGO;  
            @track isSavingDraft = false;
            @api languageCode;
        @track isSaving = false;
            @track activeField = null;
            @track uploadedFiles = [];
            @track uploadedFilesByCell = {};
            @track invalidFileCells = {};
            _fileOpQueue = Promise.resolve();           // ← ADD
            @track fileUploadRenderKeys = {};           // ← ADD
            @track isPreviewVisible = false;
        @track previewPage = 1;
        @track isAttested = false;
        @track isSubmitPreviewOpen = false;
        @track isOrientationComplete = false;
        @track aiModalContent = '';
        @track aiModalTitle = 'AI Feedback';
        // (skillDomainsCFY / FY1 / FY2 / FY3 arrays removed — dead pre-refactor state,
        // superseded by the single `unifiedSkillDomains` array used throughout the template.)


            labels = {
                CL_Select_your_preferred_language,
            CL_Start_Form_Button,
            CL_Please_select_an_Organizational_Area,
            CL_Job_Fulfillment_Only,
    CL_Job_Creation_Only,
    CL_Both_Job_Fulfillment_and_Job_Creation,
            CL_Optional_1,
            CL_Remove_1,
            CL_This_is_a_required_fields,
            CL_Please_complete_all_required_fields_before_proceeding,
            CL_Missing_Required_Fields,
            CL_Select_Type,
            CL_Hybrid,
            CL_Non_Profit,
            CL_For_Profit,
            CL_Government_Affiliated,
            CL_Other_1,
            CL_Technical_Assistance_Tooltip,
            CL_Display_Box1,
            CL_Display_Box2,
            CL_Agriculture,
            CL_Retail,
            CL_Services,
            CL_Manufacturing,
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
            CL_Auto_save_Failed,
        CL_Business_Sectors_Missing_Fields,
        CL_Could_not_save_your_progress_Please_use_Save_Draft_manually,
        CL_Error,
        CL_Fiscal_year_end_date_seems_too_far_in_the_future,
        CL_Funding_end_date_must_be_after_start_date,
        CL_Headquarters_City_and_Country_cannot_be_blank_or_contain_only_spaces,
        CL_Headquarters_City_and_Country_must_contain_letters,
        CL_Incorporation_date_cannot_be_in_the_future,
        CL_Invalid_Input,
        CL_Learner_Enrollment_help_text,
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
        CL_Avg_Cost_per_Placement,
            CL_Total_Avg_Cost_per_Job_Created,
            CL_Avg_Cost_Placement_Formula,
            CL_Avg_Cost_Job_Formula,
                CL_WCF_Form_Title,
                CL_Language_Lock,
                CL_Your_Latest_Changes,
                CL_draft_save,
                CL_Please_Save,
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
                CL_Tell_us_about_your_job_creation_work,
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
                CL_Technology,
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
                CL_Leader_Tenure,
                CL_Describe_Briefly,
                CL_File_Attachments,
                CL_Desired_Use_of_Additional_Funding_Investment,
                CL_Number_of_years_your_current_named_leader_has_held_their_role_Round_to_the_n,
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
                CL_Tell_us_about_your_work_in_both_skilling_Job_Fulfilment_and_entrepreneurshi,
                CLH_Job_Creation_Questions,
                CLH_Job_Fulfilment_Questions,
                CLH_Outcome_Data,
                CLH_Current_Fiscal_Year_Data,
                CLH_AI_Feedback,
                // Add these to your labels = { ... } block:
                CL_Two_Years_Prior,   // already imported at top
                CL_Three_Years_Prior, // already imported at top
                // Then fix validateFileUploads references:
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
            CL_Mentorship1,
            CL_Business_Advisory1,
            CL_Market_Linkages1,
            CL_Sector_TA1,
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
            CL_Download_as_PDF,

            // ── Page 1: About Your Organisation ──────────────────────────────────
            CL_Section_1_of_5,
            CL_Tell_us_who_you_are_We_use_this_section_to_understand_your_organisation_s_st,
            CL_Select_the_option_that_best_describes_your_organisation_focus,
            CL_Operating_across_both_skilling_and_entrepreneurship,
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
            CL_Yes_interested,
            CL_Maybe_want_to_learn_more,
            CL_Not_at_this_time,

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
            CL_Capital_Expenditure,
    CL_Capital_Expenditure_Help,
    CL_Operating_Expenditure,
    CL_Operating_Expenditure_Help,

            // ── Special alias fixes ───────────────────────────────────────────────
            yes_no: CL_Yes_No,                          // HTML uses {labels.yes_no}
            CL_Balance_at_End_of_Year: CL_Balance_at_End_of_Year,  // fixes the lowercase cl_ collision
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
                Legal_Type__c: '',
                Legal_Type_Other__c: '',
                Registration_Jurisdiction__c: '',
                Registration_Jurisdiction_Other__c: '',
                Current_fiscal_year_s_end_date__c: '',
                Organizational_Sustainability__c: '',
                Use_of_Additional_Funding__c: '',
                Operational_Synergies_with_WOF__c: '',
                Job_Creation_Approach__c: '',
                Business_Sectors_JSON__c: '',
                Use_of_Additional_Funding_JC__c: '',
                Operational_Synergies_with_WOF_JC__c: '',
                Language__c: '',
                GenieAI_Interest_Level__c: '',
                Last_Page__c: null,
                Reference_1_Name__c: '',
                Reference_1_Role__c: '',
                Reference_1_Email__c: '',
                Reference_2_Name__c: '',
                Reference_2_Role__c: '',
                Reference_2_Email__c: '',
                Skilling_Approach__c: '',
                CL_Download_as_PDF,
                Incorporation_Date__c: '',
Funder_1_Period_Start__c: '',
Funder_1_Period_End__c: '',
Funder_2_Period_Start__c: '',
Funder_2_Period_End__c: '',
Funder_3_Period_Start__c: '',
Funder_3_Period_End__c: '',
Funder_1_Name__c: '', Funder_1_Amount__c: '', Funder_1_Type__c: '',
Funder_2_Name__c: '', Funder_2_Amount__c: '', Funder_2_Type__c: '',
Funder_3_Name__c: '', Funder_3_Amount__c: '', Funder_3_Type__c: '',
Attesting_User_Name__c: '',
Attesting_User_Title__c: '',

                CL_Application_Submitted_Successfully,
                CL_Thank_you_for_submitting_your_application_to_the_Wadhwani_Grants,
                CL_What_Happens_Next,
                CL_Your_application_has_been_received,
                CL_Our_team_will_review_the_submitted_information,
                CL_You_will_receive_email_communication_regarding_further_actions,
                CL_Go_to_Dashboard
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
            Projected_Learner_Enrollments_CFY_NA__c: false,
            Projected_Learner_Enrollments_FY_1_NA__c: false,
            Projected_Learner_Enrollments_FY_2_NA__c: false,
            Projected_Learner_Enrollments_FY_3_NA__c: false,   
            Projected_Learner_Enrollments_CFY__c: '',
            Projected_Learner_Enrollments_FY_1__c: '',    
            Projected_Learner_Enrollments_FY_2__c: '',    
            Projected_Learner_Enrollments_FY_3__c: '', 
            Projected_Learner_Placements_CFY_NA__c: false,
            Projected_Learner_Placements_FY_1_NA__c: false,
            Projected_Learner_Placements_FY_2_NA__c: false,
            Projected_Learner_Placements_FY_3_NA__c: false,  
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
        Jobs_Supporting_Family_of_4_CFY__c: '',
        Jobs_Supporting_Family_of_4_FY_1__c: '',
        Jobs_Supporting_Family_of_4_FY_2__c: '',
        Jobs_Supporting_Family_of_4_FY_4__c: '',
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
        @track isSubmitted = false;
        @track submittedRecordId = '';
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
            @track isFeedbackPanelOpen = false;
            @track isFeedbackMinimized = true;
            @track isAiLoading = false;
            @track showAiFeedback = false;
            currentField = '';

        // Tour state
            @track isTourModalOpen = false;


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
        @track unifiedSkillDomains = [];

        supportedAiFields = ['Legal_Structure__c', 'Organizational_Sustainability__c', 'Use_of_Additional_Funding__c',
        'Operational_Synergies_with_WOF__c', 'Use_of_Additional_Funding_JC__c', 'Operational_Synergies_with_WOF_JC__c',
        'Operational_Synergies_with_WOF_Both__c','Skilling_Approach__c','Job_Creation_Approach__c'];

        get isEmailLocked() {
    return !!this._verifiedEmail
        && this.organizationData.Work_Email_ID__c === this._verifiedEmail;
}
        get fiscalYearOptions() {
            return [
                { label: 'Current Fiscal Year (CFY)', value: 'CFY' },
                { label: 'Prior Fiscal Year (FY-1)',   value: 'FY1' },
                { label: 'Two Years Prior (FY-2)',      value: 'FY2' },
                { label: 'Three Years Prior (FY-3)',    value: 'FY3' }
            ];
        }
        get skillDomainsCFYIndexed() {
            return this.skillDomainsCFY.map((row, i) => ({ ...row, idx: i }));
        }
        get skillDomainsFY1Indexed() {
            return this.skillDomainsFY1.map((row, i) => ({ ...row, idx: i }));
        }
        get skillDomainsFY2Indexed() {
            return this.skillDomainsFY2.map((row, i) => ({ ...row, idx: i }));
        }
        get skillDomainsFY3Indexed() {
            return this.skillDomainsFY3.map((row, i) => ({ ...row, idx: i }));
        }
        get showJCOrBothWhatYouDo() {
            return this.selectedFundingArea === 'Job Creation Only' ||
                this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
        }
        // Page 4 — show JF outcome questions
        get showJFOutcomes() {
            return this.selectedFundingArea === 'Job Fulfillment Only' ||
                this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
        }

        // Page 4 — show JC outcome questions
        get showJCOutcomes() {
            return this.selectedFundingArea === 'Job Creation Only' ||
                this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
        }

        // Page 4 — show CFY deviation explanation only when deviation is non-zero
        // AFTER
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
        get isFunderLimitReached() {
            return this.showFunder3 === true; // all 3 shown
        }

        get isReferenceLimitReached() {
            return this.showReference2 === true; // both shown
        }
        get funderAddBtnClass() {
            return this.showFunder3 
                ? 'mockup-add-btn mockup-add-btn--disabled' 
                : 'mockup-add-btn';
        }
        get isSubmitDisabled() {
            return !this.isAttested || this.isLoading;
        }
        get referenceAddBtnClass() {
            return this.showReference2 
                ? 'mockup-add-btn mockup-add-btn--disabled' 
                : 'mockup-add-btn';
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

        get todayDateString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
    get incorporationDateMin() {
    return this.organizationData.Incorporation_Date__c || '1900-01-01';
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
        const existing = String(this.organizationData.Current_fiscal_year_s_end_date__c || '');
        const existingYear = existing.match(/^(\d{4})-/)?.[1];
        const year = existingYear || new Date().getFullYear();
        this.organizationData.Current_fiscal_year_s_end_date__c =
            `${year}-${this.fiscalMonthValue}-${this.fiscalDayValue}`;
        this.hasUnsavedChanges = true;
    }
}
        // Rehydrate the Month/Day pickers from the saved fiscal-year-end date.
// Handles "2026-02-02" and "2026-02-02T00:00:00.000Z".
_initFiscalPickersFromData() {
    const raw = this.organizationData.Current_fiscal_year_s_end_date__c;
    if (!raw) return;
    const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return;
    this.fiscalMonthValue = m[2];
    this.fiscalDayValue   = m[3];
}
        // Page 4 — sustainability word count (add to class properties at top)
        // @track sustainabilityWordCount = 0;
        // Add this inside handleInput, alongside the Skilling Approach block:
        // if (event.target.dataset.field === 'Organizational_Sustainability__c') {
        //     const text = event.target.innerText.trim().split(/\s+/).filter(w => w.length > 0);
        //     this.sustainabilityWordCount = text.length;
        // }
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
        get showJCOnlyWhatYouDo() {
            return this.selectedFundingArea === 'Job Creation Only';
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
        getFiscalPreview(field) {
            console.log('Inside get Fiscal preview function');
            const html = this.fiscalData[field] || '';
            const txt = html.replace(/<[^>]+>/g, '');
            return txt.length > 35 ? `${txt.substring(0, 35)}…` : txt;
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
        get jobSupport4CFYPreview() {
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
            return this.getOutcomePreview('Placements_Supporting_Family_of_4_FY_1__c');
        }
        get placementSupportFY2Preview(){
            return this.getOutcomePreview('Placements_Supporting_Family_of_4_FY_2__c');
        }
        get placementSupportFY3Preview(){
            return this.getOutcomePreview('Placements_Supporting_Family_of_4_FY_3__c');
        }
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

        get showProjectedLearnerEnrollmentsCFY() {
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
        }
        minimizeFeedbackPanel(event) {
                event.stopPropagation();
                this.isFeedbackMinimized = !this.isFeedbackMinimized;
            }
        get panelClasses() {
                return `panel ${this.isFeedbackPanelOpen && !this.isFeedbackMinimized ? 'panel-open' : 'panel-minimized'}`;
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
                    label: LABEL_OVERRIDE_MAP[option.value] || option.label,
                    description,
                    isSelected: this.selectedFundingArea === option.value,
                    className: this.selectedFundingArea === option.value
                        ? 'option-card selected'
                        : 'option-card'
                };
            });
        }

        get modalTitle() {
            if (!this.modalField) return 'Edit Content';
            return this.modalField.replace(/__c$/i, '').replace(/_/g, ' ');
        }
        // Add these getters for file lists — one per cell key used in your form

        get filesP4FY1PV() { return this.uploadedFilesByCell['P4_FY1_PV'] || []; }
        get hasFilesP4FY1PV() { return this.filesP4FY1PV.length > 0; }

        get filesP5CFYJV() { return this.uploadedFilesByCell['P5_CFY_JV'] || []; }
        get hasFilesP5CFYJV() { return this.filesP5CFYJV.length > 0; }

        get filesP5FY1JV() { return this.uploadedFilesByCell['P5_FY1_JV'] || []; }
        get hasFilesP5FY1JV() { return this.filesP5FY1JV.length > 0; }

        get filesP5FY2JV() { return this.uploadedFilesByCell['P5_FY2_JV'] || []; }
        get hasFilesP5FY2JV() { return this.filesP5FY2JV.length > 0; }

        get filesP5FY3JV() { return this.uploadedFilesByCell['P5_FY3_JV'] || []; }
        get hasFilesP5FY3JV() { return this.filesP5FY3JV.length > 0; }
        /*renderedCallback() {
            if (this.isJsLoaded) return;
            this.isJsLoaded = true;

            Promise.all([
                loadScript(this, JSPDF),
                loadScript(this, AUTO_TABLE)
            ])
            .then(() => {
                console.log('✅ jsPDF loaded');
                // Load logo as base64
                fetch(WIN_LOGO)
                    .then(res => res.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            this.logoBase64 = reader.result;
                        };
                        reader.readAsDataURL(blob);
                    });
            })
            .catch(err => console.error('❌ jsPDF load error:', err));
        } */
        get hasSkillDomains() {
            return this.unifiedSkillDomains.some(r => r.domain && r.domain.trim() !== '');
        }

        get hasBusinessSectors() {
            return this.businessSectors.some(r => r.sector && r.sector.trim() !== '');
        }
        get p4FY1PVWrapperClass() {
    return this.isP4FY1PVInvalid ? 'modern-file-upload-wrapper file-upload-error' : 'modern-file-upload-wrapper';
}
get p5FY1JVWrapperClass() {
    return this.isP5FY1JVInvalid ? 'modern-file-upload-wrapper file-upload-error' : 'modern-file-upload-wrapper';
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

        saveModalData() {
            // Get value from modal rich text editor
            const editor = this.template.querySelector('.custom-modal .text-area');
            if (!editor) return;

            const value = this._sanitizeHtml(editor.innerHTML);

            // Save to correct object
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
        // REPLACE recalculateAvgCostPerPlacement() with this:
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
        recalculateAvgCostPerJob() {
            const periods = [
                {
                    expense:    () => Number(this.fiscalData.Expense_Projection__c) || 0,
                    newBiz:     'Projected_Jobs_from_New_Businesses_CFY__c',
                    existBiz:   'Jobs_from_Growing_Businesses_CFY__c',
                    avgCost:    'Avg_Cost_per_Job_CFY__c'
                },
                {
                    expense:    () => Number(this.historicalData.CY1_Expense__c) || 0,
                    newBiz:     'Projected_Jobs_from_New_Businesses_FY1__c',
                    existBiz:   'Jobs_from_Growing_Businesses_FY_1__c',
                    avgCost:    'Avg_Cost_per_Job_FY_1__c'
                },
                {
                    expense:    () => Number(this.historicalData.CY2_Expense__c) || 0,
                    newBiz:     'Projected_Jobs_from_New_Businesses_FY2__c',
                    existBiz:   'Jobs_from_Growing_Businesses_FY_2__c',
                    avgCost:    'Avg_Cost_per_Job_FY_2__c'
                },
                {
                    expense:    () => Number(this.historicalData.CY3_Expense__c) || 0,
                    newBiz:     'Projected_Jobs_from_New_Businesses_FY3__c',
                    existBiz:   'Jobs_from_Growing_Businesses_FY_3__c',
                    avgCost:    'Avg_Cost_per_Job_FY_3__c'
                }
            ];

            periods.forEach(p => {
                const expense   = p.expense();
                const totalJobs = (Number(this.outcomeData[p.newBiz]) || 0) +
                                (Number(this.outcomeData[p.existBiz]) || 0);

                if (totalJobs > 0) {
                    this.outcomeData[p.avgCost] = Math.round((expense / totalJobs) * 100) / 100;
                } else {
                    this.outcomeData[p.avgCost] = 0;
                }
            });

            this.outcomeData = { ...this.outcomeData };
        }// REPLACE recalculatePlacementPercentages() with this:
        recalculatePlacementPercentages() {
            const periods = [
                { enrollment: 'Projected_Learner_Enrollments_CFY__c',   placement: 'Projected_Learner_Placements_CFY__c',   percentage: 'Projected_Learner_placement_CFY__c'   },
                { enrollment: 'Projected_Learner_Enrollments_FY_1__c',  placement: 'Projected_Learner_Placements_FY_1__c',  percentage: 'Projected_Learner_placement_FY_1__c'  },
                { enrollment: 'Projected_Learner_Enrollments_FY_2__c',  placement: 'Projected_Learner_Placements_FY_2__c',  percentage: 'Projected_Learner_placement_FY_2__c'  },
                { enrollment: 'Projected_Learner_Enrollments_FY_3__c',  placement: 'Projected_Learner_Placements_FY_3__c',  percentage: 'Projected_Learner_placement_FY_3__c'  }
            ];

            periods.forEach(p => {
                const enrollments = Number(this.outcomeData[p.enrollment]) || 0;
                const placements  = Number(this.outcomeData[p.placement])  || 0;

                if (enrollments > 0) {
                    const pct = Math.round((placements / enrollments) * 100 * 100) / 100;
                    this.outcomeData[p.percentage] = `${pct}%`;
                } else {
                    this.outcomeData[p.percentage] = '0%';
                }
            });

            this.outcomeData = { ...this.outcomeData };
        }
            
        closeModal() {
            this.isModalOpen = false;
            this.modalField = '';
            this.modalValue = '';
            this.modalTarget = '';
        }
        isValidSalesforceId(id) {
            if (!id) return false;
            if (typeof id !== 'string') return false;
            if (id === 'null' || id === 'undefined') return false;
            return /^[a-zA-Z0-9]{15,18}$/.test(id);
        }
        handleOutcomeCheckbox(event) {
            const field = event.target.dataset.id;
            this.outcomeData[field] = event.target.checked;
            // If N/A unchecked, clear the value field too
            if (!event.target.checked) {
                const mainField = field.replace('_NA__c', '__c');
                this.outcomeData[mainField] = '';
            }
        }

        handleNumberWheel(event) {
            // Stop mouse-wheel scrolling from silently changing a focused number input
            event.target.blur();
        }
        //pICKLIST VALUES OF OUTCOME TABLE
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
        handleFundingSelection(event) {
            const selectedValue = event.currentTarget.dataset.value;
            this.selectedFundingArea = selectedValue;
            this.organizationData.Organizational_Area_s_for_Funding_Inves__c = selectedValue;

            // Clear the Q1 error as soon as a valid choice is made
            const cardError = this.template.querySelector('.q1-error-msg');
            if (cardError) cardError.style.display = 'none';

            this.handlePicklistChange({ detail: { value: selectedValue } });
        }
        // AFTER
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
        handleLanguageChange(event) {

            const selectedLang = event.currentTarget.dataset.lang;

            // SAVE LANGUAGE
            localStorage.setItem('selectedLanguage', selectedLang);

            this.selectedLanguage = selectedLang;

            setLanguage({
                languageCode: selectedLang
            })
            .then(() => {
                window.location.reload();
            })
            .catch(error => {
                console.error('Language update error', error);
            });
        }
        // Add this helper method
        async autoSaveDraft() {
            if (this.isSaving) {
                console.log('⚠️ Save in progress, skipping');
                return;
            }
        
            if (!this.isValidSalesforceId(this.recordId)) {
                const stored = localStorage.getItem('wcf_draft_recordId');
                this.recordId = this.isValidSalesforceId(stored) ? stored : null;
            }
        
            this.isSaving = true;
            try {
                this.syncCustomRichTextFields();
                this.updateRichTextFieldsForCurrentPage();
        
                if (this.organizationData.Current_fiscal_year_s_end_date__c) {
                    this.organizationData.Current_fiscal_year_s_end_date__c =
                        this.organizationData.Current_fiscal_year_s_end_date__c.split('T')[0];
                }
        
                const params = new URLSearchParams(window.location.search);
                const langParam = params.get('lang') || 'English';
                this.organizationData.Language__c =
                    langParam === 'Portuguese' ? 'Portuguese' :
                    langParam === 'Spanish'    ? 'Spanish'    : 'English';
        
                this.organizationData.Last_Page__c = this.currentPage;
        
                // ✅ Correct: define AND use these variables
                const shouldSendHistorical = !!(this.historicalData?.Id || this.isDataFilled(this.historicalData));
                const shouldSendFiscal     = !!(this.fiscalData?.Id     || this.isDataFilled(this.fiscalData));
                const shouldSendOutcome    = !!(this.outcomeData?.Id    || this.isDataFilled(this.outcomeData));
        
                const result = await saveWCFDraftApplication({
                    applicationId:       this.recordId,
                    orgDataJson:         JSON.stringify(this.sanitizeOrgData(this.organizationData)),
                    historicalData:      shouldSendHistorical ? this.historicalData : null,
                    fiscalData:          shouldSendFiscal     ? this.fiscalData     : null,
                    outcomeData:         shouldSendOutcome    ? this.outcomeData    : null,
                    selectedFundingArea: this.selectedFundingArea,
                    uploadedFileIds:     this.uploadedFiles || [],
                    skillingDomainsJson: JSON.stringify(this.unifiedSkillDomains),  // ← CHANGED
            businessSectorsJson: JSON.stringify(this.businessSectors)        // ← CHANGED
                });
        
                this.recordId = result.applicationId;
                localStorage.setItem('wcf_draft_recordId', this.recordId);
                this.hasUnsavedChanges = false;
        
                if (result.historicId) this.historicalData = { ...this.historicalData, Id: result.historicId };
                if (result.fiscalId)   this.fiscalData     = { ...this.fiscalData,     Id: result.fiscalId   };
                if (result.outcomeId)  this.outcomeData    = { ...this.outcomeData,    Id: result.outcomeId  };
        
                console.log('✅ Auto-saved. recordId =', this.recordId);
        
                /*this.dispatchEvent(new ShowToastEvent({
                    title: 'Draft Saved', message: 'Your progress has been saved.',
                    variant: 'success', mode: 'dismissible'
                }));*/
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
                    variant: 'error', mode: 'sticky'
                }));
                return false;
            } finally {
                this.isSaving = false;
            }
        }
        handleOutcomeCurrencyInput(event) {
            const field = event.target.dataset.id;
            const value = Number(event.target.value || 0);
            this.outcomeData[field] = value;
        }

        handleUnifiedSkillInput(event) {
            if (event.target.dataset.section === 'sector') return; // block sector inputs
            const index = parseInt(event.target.dataset.index);
            let field = event.target.dataset.field;
            if (field === 'skillEnrolment') field = 'yearlyEnrolment'; // map back to array property
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

            // ── Real-time validation for numeric domain fields ───────────────────
            const numericFields = ['hours', 'duration', 'yearlyEnrolment'];
            if (numericFields.includes(field)) {
                const label = field === 'hours' ? 'Hours of Training' : field === 'duration' ? 'Duration (Months)' : 'Learner Enrollment';
                if (value === '' || value === null || value === undefined) {
                    this._showNativeError(event.target, `${label} is required.`);
                } else if (isNaN(Number(value))) {
                    this._showNativeError(event.target, `${label} must be a number.`);
                } else if (Number(value) < 0) {
                    this._showNativeError(event.target, `${label} cannot be negative.`);
                } else {
                    this._clearNativeError(event.target);
                }
            }

            const arr = JSON.parse(JSON.stringify(this.unifiedSkillDomains));
            arr[index][field] = value;
            if (field === 'startDate') {
                const incorpDate = this.organizationData.Incorporation_Date__c;
                const todayStr = this.todayDateString;
                if (value && incorpDate && value < incorpDate) {
                    event.target.classList.add('input-error');
                    this._showInlineDateError(event.target, 'This date cannot be earlier than your Incorporation Date.');
                } else if (value && value > todayStr) {
                    event.target.classList.add('input-error');
                    this._showInlineDateError(event.target, 'This date cannot be in the future.');
                } else {
                    event.target.classList.remove('input-error');
                    this._clearInlineDateError(event.target);
                }
            }
            this.unifiedSkillDomains = arr;
        }

        addUnifiedSkillRow() {
            this.unifiedSkillDomains = [...this.unifiedSkillDomains, this._newSkillRow()];
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
        handleBusinessSectorInput(event) {
            if (event.target.dataset.field === 'skillEnrolment') return; // block skill inputs
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
            // ── Real-time validation for yearlyEnrolment ───────────────────
            if (field === 'yearlyEnrolment') {
                if (value === '' || value === null || value === undefined) {
                    this._showNativeError(event.target, 'Yearly Enrolment is required.');
                } else if (isNaN(Number(value))) {
                    this._showNativeError(event.target, 'Yearly Enrolment must be a number.');
                } else if (Number(value) < 0) {
                    this._showNativeError(event.target, 'Yearly Enrolment cannot be negative.');
                } else {
                    this._clearNativeError(event.target);
                }
            }

            const arr = JSON.parse(JSON.stringify(this.businessSectors));
            arr[index][field] = value;
            if (field === 'sector' && value !== 'Other') {
                arr[index].sectorOther = '';
            }
            this.businessSectors = arr;
            this._clearChipError(event.target.closest('.domain-card'));
            
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
        // ── Inline error helpers ───────────────────────────────────────────────
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
        _showFieldError(fieldName, message) {
            // For contenteditable rich text fields
            const el = this.template.querySelector(`[data-field="${fieldName}"]`);
            if (el) {
                el.classList.add('richtext-invalid');
                this._registerInvalid(el);
            }
            // For the error <p> tag (data-error attribute)
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


        // For lightning-input / lightning-combobox
        _showLightningError(dataId, message) {
            const el = this.template.querySelector(`[data-id="${dataId}"]`);
            if (el?.setCustomValidity) {
                el.setCustomValidity(message);
                el.reportValidity();
                this._registerInvalid(el);
            }
        }

        _clearLightningError(dataId) {
            const el = this.template.querySelector(`[data-id="${dataId}"]`);
            if (el?.setCustomValidity) {
                el.setCustomValidity('');
                el.reportValidity();
                this._invalidElements = this._invalidElements.filter(x => x !== el);
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

        restoreBusinessSectors() {
            const raw = this.organizationData.Business_Sectors_JSON__c;
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.businessSectors = parsed.map(r => ({
                        key: this._rowKey(),
                        sector: r.sector || '',
                        sectorOther: r.sectorOther || '',
                        supportBegin: r.supportBegin || '',
                        supportTypeOther: r.supportTypeOther || '',
                        supportTypes: Array.isArray(r.supportTypes) ? r.supportTypes : [],
                        yearlyEnrolment: r.yearlyEnrolment || ''
                    }));
                }
            } catch(e) { console.warn('restoreBusinessSectors error', e); }
        }
        // (restoreUnifiedSkillDomains, handleSkillDomainInput, addSkillDomainRow,
        // deleteSkillDomainRow, and restoreSkillDomainRows removed — dead code from
        // before the "unified" skill-domain refactor. None were called anywhere, and
        // their backing skillDomainsCFY/FY1/FY2/FY3 properties weren't referenced in
        // the template. Skilling domain data now flows entirely through
        // `unifiedSkillDomains` <-> `skillingDomainsJson` <-> WCF_Skilling_Domain__c.)
        /*get showSubmitOnPage4() {
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
        }*/
        funderTypeOptions = [
            { label: '— Select —', value: '' },   // ← ADD THIS
            { label: 'Grant', value: 'Grant' },
            { label: 'Loan', value: 'Loan' },
            { label: 'Equity', value: 'Equity' },
            { label: 'In-Kind', value: 'In-Kind' }
        ];

        openExplanationModal(event) {
            const row = event.target.dataset.row;
            if (row === 'Revenue') {
                this.activeExplanationField = 'Revenue_Explanation__c';
            } else if (row === 'Expense') {
                this.activeExplanationField = 'Expense_Explanation__c';
            } else if (row === 'Net') {
                this.activeExplanationField = 'Net_Position_Explanation__c';
            }

            this.activeExplanationValue = this.fiscalData[this.activeExplanationField] || '';
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
            this.fiscalData[this.activeExplanationField] = this.activeExplanationValue;
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
            console.log('inside picklist CFY get method');
            const yes = this.yesLabelMap['X3rd_Party_Placement_Verification_CFY__c'];
            return this.outcomeData.X3rd_Party_Placement_Verification_CFY__c === yes;
        }
        get isPlacementVerifiedFY1() {
            const yes = this.yesLabelMap['X3rd_Party_Placement_Verification_FY_1__c'];
            return this.outcomeData.X3rd_Party_Placement_Verification_FY_1__c === yes;
        }
        get isPlacementVerifiedFY2() {
            const yes = this.yesLabelMap['X3rd_Party_Placement_Verification_FY_2__c'];
            return this.outcomeData.X3rd_Party_Placement_Verification_FY_2__c === yes;
        }
        get isPlacementVerifiedFY3() {
            const yes = this.yesLabelMap['X3rd_Party_Placement_Verification_FY_3__c'];
            return this.outcomeData.X3rd_Party_Placement_Verification_FY_3__c === yes;
        }

        // --- Long-Term Outcomes ---
        get isLongTermYesCFY() {
            const yes = this.yesLabelMap['Long_Term_Outcomes_CFY__c'];
            return this.outcomeData.Long_Term_Outcomes_CFY__c === yes;
        }
        get isLongTermYesFY1() {
            const yes = this.yesLabelMap['Long_Term_Outcomes_FY_1__c'];
            return this.outcomeData.Long_Term_Outcomes_FY_1__c === yes;
        }
        get isLongTermYesFY2() {
            const yes = this.yesLabelMap['Long_Term_Outcomes_FY_2__c'];
            return this.outcomeData.Long_Term_Outcomes_FY_2__c === yes;
        }
        get isLongTermYesFY3() {
            const yes = this.yesLabelMap['Long_Term_Outcomes_FY_3__c'];
            return this.outcomeData.Long_Term_Outcomes_FY_3__c === yes;
        }
        // ----- Job creation verification ---
        get isJobCreationVerifiedCFY() {
            const yes = this.yesLabelMap['Job_Verification_3rd_Party_CFY__c'];
            return this.outcomeData.Job_Verification_3rd_Party_CFY__c === yes;
        }
        get isJobCreationVerifiedFY1() {
            const yes = this.yesLabelMap['Job_Verification_3rd_Party_FY1__c'];
            return this.outcomeData.Job_Verification_3rd_Party_FY1__c === yes;
        }
        get isJobCreationVerifiedFY2() {
            const yes = this.yesLabelMap['Job_Verification_3rd_Party_FY2__c'];
            return this.outcomeData.Job_Verification_3rd_Party_FY2__c === yes;
        }
        get isJobCreationVerifiedFY3() {
            const yes = this.yesLabelMap['Job_Verification_3rd_Party_FY3__c'];
            return this.outcomeData.Job_Verification_3rd_Party_FY3__c === yes;
        }
        get operationalSynergiesPreviewValue() {
            if (this.operationalSynergiesFieldApi) {
                return this.organizationData[this.operationalSynergiesFieldApi] || '';
            }
            return '';
        }
        // Page 4 - Placement Verification
        get isP4CFYPVInvalid() { return !!this.invalidFileCells['P4_CFY_PV']; }
        get isP4FY1PVInvalid() { return !!this.invalidFileCells['P4_FY1_PV']; }
        get isP4FY2PVInvalid() { return !!this.invalidFileCells['P4_FY2_PV']; }
        get isP4FY3PVInvalid() { return !!this.invalidFileCells['P4_FY3_PV']; }
        // Page 4 - Long Term
        get isP4CFYLTInvalid() { return !!this.invalidFileCells['P4_CFY_LT']; }
        get isP4FY1LTInvalid() { return !!this.invalidFileCells['P4_FY1_LT']; }
        get isP4FY2LTInvalid() { return !!this.invalidFileCells['P4_FY2_LT']; }
        get isP4FY3LTInvalid() { return !!this.invalidFileCells['P4_FY3_LT']; }
        // Page 5 - Job Verification
        get isP5CFYJVInvalid() { return !!this.invalidFileCells['P5_CFY_JV']; }
        get isP5FY1JVInvalid() { return !!this.invalidFileCells['P5_FY1_JV']; }
        get isP5FY2JVInvalid() { return !!this.invalidFileCells['P5_FY2_JV']; }
        get isP5FY3JVInvalid() { return !!this.invalidFileCells['P5_FY3_JV']; }

        // Placement Verification
        get p4CFYPVClass() { return this.isP4CFYPVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
        get p4FY1PVClass() { return this.isP4FY1PVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
        get p4FY2PVClass() { return this.isP4FY2PVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
        get p4FY3PVClass() { return this.isP4FY3PVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }

        // Long Term
        get p4CFYLTClass() { return this.isP4CFYLTInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
        get p4FY1LTClass() { return this.isP4FY1LTInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
        get p4FY2LTClass() { return this.isP4FY2LTInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
        get p4FY3LTClass() { return this.isP4FY3LTInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }

        // Job Verification
        get p5CFYJVClass() { return this.isP5CFYJVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
        get p5FY1JVClass() { return this.isP5FY1JVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
        get p5FY2JVClass() { return this.isP5FY2JVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }
        get p5FY3JVClass() { return this.isP5FY3JVInvalid ? 'file-upload-wrapper file-upload-error' : 'file-upload-wrapper'; }

        @track pageSequence      = [1, 2, 3, 4, 5, 6];
        @track currentPageIndex  = 0;
        @track currentPage       = 0;

        /*@track pageSequence = [1]; // default page
        @track currentPageIndex = 0;
        @track currentPage = 1; */
            get isPage0() {
            return this.currentPage === 0;
        }
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
        get isPage7() {
            return this.currentPage === 7;
        }
        get isLastPage() {
            return this.currentPageIndex === this.pageSequence.length - 1;
        }
            get isFirstPage() {
                return this.currentPage === 1;
            }


        get showPreviewButtonOnPage4() {
            return this.isPage4 && this.selectedFundingArea === 'Job Fulfillment Only';
        }
        get showPreviewButtonOnPage5() {
            return this.isPage5 && (this.selectedFundingArea === 'Job Creation Only' || this.selectedFundingArea === 'Both Job Fulfillment and Job Creation');
        }
        /*get showPreviewButton() {
            if (this.selectedFundingArea === 'Job Fulfillment Only') return this.isPage4;
            if (this.selectedFundingArea === 'Job Creation Only') return this.isPage5;
            if (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation') return this.isPage5;
            return false;
        }*/
        get showSkillingApproach() {
            return this.selectedFundingArea === 'Job Fulfillment Only' ||
                this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
        }
        get showJFWhatYouDo() {
            return this.selectedFundingArea === 'Job Fulfillment Only' ||
                this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
        }

        get showJCWhatYouDo() {
            return this.selectedFundingArea === 'Job Creation Only';
        }

        get showBothJCQuestions() {
            return this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
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
        get showSkillingDomains() {
            return this.selectedFundingArea === 'Job Fulfillment Only' ||
                this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
        }
        get showPreviewButton() {
            return false; // removed — preview is now a page
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
            
        }
        handlePreviewNext() {
            if (!this.isLastPreviewPage) this.previewPage += 1;
        }
        handlePreviewPrevious() {
            if (!this.isFirstPreviewPage) this.previewPage -= 1;
        }
        handleClosePreview() {
            this.isPreviewVisible = false;
            this.isAttested = false;
        }
        handleAttestationChange(event) {
            this.isAttested = event.target.checked;
        }
        get showExpenseExplanation() {
            const expenseVariance = Number(this.fiscalData.Expense_Variance__c) || 0;
            return expenseVariance !== 0;
        }

        get additionalFundingReviewValue() {
            return this.selectedFundingArea === 'Job Creation Only'
                ? this.organizationData.Use_of_Additional_Funding_JC__c
                : this.organizationData.Use_of_Additional_Funding__c;
        }

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
        get showSynergiesTextBox() {
            const v = this.organizationData.GenieAI_Interest_Level__c;
            return v === 'Yes, interested' || v === 'Maybe, want to learn more';
        }
        get showAIFeedbackPanel() {
            return false;
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

        _counterClass(field, count) {
            const limit = this.WORD_LIMITS[field]
                ?? (field === this.operationalSynergiesFieldApi ? 200 : null);
            if (!limit) return 'word-counter';
            if (count > limit)            return 'word-counter over';
            if (count >= limit * 0.9)     return 'word-counter warn';
            return 'word-counter';
        }

        // ── Properties to add at class level (near top with other properties) ──
        handleBeforeUnload = (event) => {
            if (!this.hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
            return '';
        };
        // ── CONNECTED CALLBACK ──────────────────────────────────────────────────
        connectedCallback() {
            console.log('🔄 connectedCallback fired');
            const _freshParams = new URLSearchParams(window.location.search);
            if (_freshParams.get('fresh') === 'true') {
                localStorage.removeItem('wcf_draft_recordId');
                this.recordId = null;
                console.log('🧹 fresh=true — cleared stale draft ID for a blank form');
            }
            window.addEventListener('beforeunload', this.handleBeforeUnload);
            this.unifiedSkillDomains = [this._newSkillRow()];
            this.businessSectors = [this._newSectorRow()];

            const params = new URLSearchParams(window.location.search);

            // GET ACTIVE LANGUAGE FROM LOCAL STORAGE
            this.selectedLanguage =
                localStorage.getItem('selectedLanguage') || 'en_US';

            console.log('🌐 Selected Language:', this.selectedLanguage);

            if (params.get('langReload') === 'true') {
                window.history.replaceState({}, '', window.location.pathname);
                window.location.reload();
            }

            // 1) Funding Opp
            console.log('📥 Fetching Funding Opportunity ID…');
            getActiveFundingOpportunityId()
                .then(id => {
                    console.log('✅ Funding Opportunity ID:', id);
                    this.organizationData.FundingOpportunityId = id;
                })
                .catch(err => console.error('❌ Funding Opp error:', err));

            this.showAiFeedback = true;
            this.isFeedbackMinimized = true;

            // 2) Picklists
            this.loadPicklist('IndividualApplication', 'Organizational_Area_s_for_Funding_Inves__c', 'organizationalAreaValues');
            this.loadPicklist('IndividualApplication', 'WG_Phone_Country_Code__c', 'phoneCountryCodeOptions');
            this.loadPicklist('Outcomes_Data__c', 'X3rd_Party_Placement_Verification_CFY__c', 'picklist3rdPartyCFY');
            this.loadPicklist('Outcomes_Data__c', 'X3rd_Party_Placement_Verification_FY_1__c', 'picklist3rdPartyFY1');
            this.loadPicklist('Outcomes_Data__c', 'X3rd_Party_Placement_Verification_FY_2__c', 'picklist3rdPartyFY2');
            this.loadPicklist('Outcomes_Data__c', 'X3rd_Party_Placement_Verification_FY_3__c', 'picklist3rdPartyFY3');
            this.loadPicklist('Outcomes_Data__c', 'Long_Term_Outcomes_CFY__c', 'picklistLongTermCFY');
            this.loadPicklist('Outcomes_Data__c', 'Long_Term_Outcomes_FY_1__c', 'picklistLongTermFY1');
            this.loadPicklist('Outcomes_Data__c', 'Long_Term_Outcomes_FY_2__c', 'picklistLongTermFY2');
            this.loadPicklist('Outcomes_Data__c', 'Long_Term_Outcomes_FY_3__c', 'picklistLongTermFY3');
            this.loadPicklist('Outcomes_Data__c', 'Job_Verification_3rd_Party_CFY__c', 'picklistJob3rdPartyCFY');
            this.loadPicklist('Outcomes_Data__c', 'Job_Verification_3rd_Party_FY1__c', 'picklistJob3rdPartyFY1');
            this.loadPicklist('Outcomes_Data__c', 'Job_Verification_3rd_Party_FY2__c', 'picklistJob3rdPartyFY2');
            this.loadPicklist('Outcomes_Data__c', 'Job_Verification_3rd_Party_FY3__c', 'picklistJob3rdPartyFY3');

                // 3) Load PDF libraries early so they are ready by page 7
            this._loadPdfLibraries();

            // 4) Hydrate draft from server so auto-save never wipes server data
            const storedDraftId = localStorage.getItem('wcf_draft_recordId');
            if (this.isValidSalesforceId(storedDraftId)) {
                this.recordId = storedDraftId;
                this.loadDraftFromServer(storedDraftId);
            }
        }

        async loadDraftFromServer(draftId) {
            try {
                const wrapper = await getDraftWCFApplication({ recordId: draftId });
                if (!wrapper) return;

                if (wrapper.application) {
                    this.organizationData = { ...this.organizationData, ...wrapper.application };
                    this._initHQFromData();
                     this._initFiscalPickersFromData();
                    const area = wrapper.application.Organizational_Area_s_for_Funding_Inves__c;
                    if (area) {
                        this.selectedFundingArea = area;
                        this.handlePicklistChange({ detail: { value: area } });
                    }
                }
                this.showFunder2    = !!this.organizationData.Funder_2_Name__c;
                this.showFunder3    = !!this.organizationData.Funder_3_Name__c;
                this.showReference2 = !!this.organizationData.Reference_2_Name__c;
                this._applyVerifiedEmail();
                this._applyVerifiedName();
this._applyVerifiedPhone();
                if (wrapper.historical) this.historicalData = { ...this.historicalData, ...wrapper.historical };
                if (wrapper.fiscal)     this.fiscalData     = { ...this.fiscalData,     ...wrapper.fiscal };
                if (wrapper.outcome)    this.outcomeData    = { ...this.outcomeData,    ...wrapper.outcome };

                if (wrapper.skillingDomains && wrapper.skillingDomains.length > 0) {
                    this.unifiedSkillDomains = wrapper.skillingDomains.map(r => ({
                        key:             this._rowKey(),
                        period:          'CFY',
                        domain:          r.Domain_Programme_Name__c ?? '',
                        hours:           r.Hours_of_Training__c     ?? '',
                        duration:        r.Duration_Months__c       ?? '',
                        startDate:       r.Programme_Start_Date__c  ?? '',
                        yearlyEnrolment: r.Yearly_Enrolment__c      ?? ''
                    }));
                }

                

                if (wrapper.businessSectors && wrapper.businessSectors.length > 0) {
                    this.businessSectors = wrapper.businessSectors.map(r => ({
                        key:              this._rowKey(),
                        sector:           r.Sector_c__c              ?? '',
                        sectorOther:      r.Business_Sector_Other__c ?? '',
                        supportBegin:     r.Support_Begin_Date__c    ?? '',
                        supportTypeOther: r.Support_Type_Other__c    ?? '',
                        supportTypes:     r.Support_Types__c ? r.Support_Types__c.split(';') : [],
                        yearlyEnrolment:  r.Yearly_Enrolment__c      ?? ''
                    }));
                }

                if (wrapper.uploadedFilesByCell) {
                    this.uploadedFilesByCell = { ...wrapper.uploadedFilesByCell };
                    const allIds = [];
                    Object.values(wrapper.uploadedFilesByCell).forEach(list =>
                        (list || []).forEach(f => allIds.push(f.documentId))
                    );
                    this.uploadedFiles = allIds;
                }
                try {
        const q21Files = await getApplicationAttachments({ applicationId: draftId });
        this.additionalInfoFiles = q21Files || [];
    } catch (e) {
        console.warn('Q21 attachments load error:', e);
    }

                this.hasUnsavedChanges = false;
                setTimeout(() => this.restoreEditorContent(), 100);
            } catch (e) {
                console.error('❌ loadDraftFromServer error:', JSON.stringify(e));
                // Stale/inaccessible id — clear it so we don't keep saving against it blind
                localStorage.removeItem('wcf_draft_recordId');
                this.recordId = null;
            }
        }
        disconnectedCallback() {
            window.removeEventListener('beforeunload', this.handleBeforeUnload);
            document.removeEventListener('click', this._closePhoneCodeDropdown);
            this._destroyPhoneIti();
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

    // AUTO_TABLE patches window.jspdf.jsPDF.API — it MUST run after JSPDF
    // has finished executing, or `jspdf` doesn't exist yet and this throws
    // before it can register, breaking doc.autoTable() later.
    loadScript(this, JSPDF)
    .then(() => loadScript(this, AUTO_TABLE))
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


        loadPicklist(objectApi, fieldApi, targetVar) {
            getPicklistValuesForField({ objectApiName: objectApi, fieldApiName: fieldApi,  languageCode: this.languageCode  })
                .then(result => {
                    console.log('Language',this.languageCode);
                    console.log(`🌍 [${fieldApi}] Picklist loaded:`, result);
                    this[targetVar] = result; // result is array of { label, value }

                    // For yesLabelMap use only the actual API value
                const YES_VALUES = ['Yes','yes', 'Sí', 'Sim'];
                    //const yesOption = result.find(opt => YES_VALUES.includes(opt.value));
                    const yesOption = result.find(opt => YES_VALUES.includes(opt.value) || YES_VALUES.includes(opt.label));
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
            
        /* Custom RIch Text Functions */
        setActiveField(event) {
                this.activeField = event.target;
            }


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
            insertPlainTextAtCursor(text) {
                const selection = window.getSelection();
                if (!selection.rangeCount) return;
            
                const range = selection.getRangeAt(0);
                range.deleteContents();
            
                const lines = text.split('\n');


                // 🔁 Loop in reverse to maintain proper order
            for (let i = lines.length - 1; i >= 0; i--) {
                if (i < lines.length - 1) {
                    const br = document.createElement('br');
                    range.insertNode(br);
                }
                range.insertNode(document.createTextNode(lines[i]));
            }
            
                // Move cursor to the end
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
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

        /* handleInput(event) {
                const field = event.target.dataset.field;
                this.organizationData[field] = event.target.innerHTML;
            }*/

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
        
        get previewTotalBudget() {
            return this.filledBudgets
            .reduce((sum, row) => sum + (Number(row.Amount) || 0), 0);
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

_bumpFileUploadKey(cellKey) {
    const keys = { ...this.fileUploadRenderKeys };
    keys[cellKey] = (keys[cellKey] || 0) + 1;
    this.fileUploadRenderKeys = keys;
}
get p4FY1PVUploadSlots() { return [{ key: `P4_FY1_PV-${this.fileUploadRenderKeys['P4_FY1_PV'] || 0}` }]; }
get p5FY1JVUploadSlots() { return [{ key: `P5_FY1_JV-${this.fileUploadRenderKeys['P5_FY1_JV'] || 0}` }]; }
get q21UploadSlots()     { return [{ key: `Q21-${this.fileUploadRenderKeys['Q21'] || 0}` }]; }
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
        // ── Phone: intl-tel-input (flagTelpicker) ──────────────────────────
        // Loads the library once, then initialises the picker whenever the phone
        // input is on screen and tears it down when the page changes. The picker
        // writes back into the existing Phone__c / Phone_Country_Code__c fields
        // so all downstream validation / save / submit / review stays unchanged.
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
        // ── Word limit config ──────────────────────────────────────────────────
        WORD_LIMITS = {
            Legal_Structure__c:               100,
            Skilling_Approach__c:             500,
            Job_Creation_Approach__c:         500,
            Organizational_Sustainability__c: 100,
            Use_of_Additional_Funding__c:     500,
            Use_of_Additional_Funding_JC__c:  500,  // ← ADD THIS
            Revenue_Explanation__c:           200,
            Expense_Explanation__c:           200,
            Net_Position_Explanation__c:      200,
        };

        // ── Required rich text fields per page ────────────────────────────────
        _getRequiredRichTextFields() {
            switch (this.currentPage) {
                case 1:
                    return [
                        { name: 'Legal_Structure__c', label: 'Legal Structure', limit: 100 }
                    ];

                case 2: {
                    const fields = [];
                    if (this.showJFWhatYouDo) {
                        fields.push({ name: 'Skilling_Approach__c', label: 'Your Skilling Approach', limit: 500 });
                    }
                    if (this.showJCWhatYouDo || this.showBothWhatYouDo) {
                        fields.push({ name: 'Job_Creation_Approach__c', label: 'Your Job Creation Approach', limit: 500 });
                    }
                    return fields;
                }

                case 4: {
                    const fields = [
                        { name: 'Organizational_Sustainability__c', label: 'Organizational Sustainability', limit: 100 }
                    ];
                    if (this.showCFYExplanation) {
                        fields.push({ name: 'Revenue_Explanation__c', label: 'CFY Deviation Explanation', limit: 200 });
                    }
                    return fields;
                }

            // REPLACE WITH:
        case 6: {
            const fields = [
                { 
                    name: this.additionalFundingFieldApi,  // ← CHANGE THIS
                    label: 'Direction for Additional Funding', 
                    limit: 500 
                }
            ];
                    if (this.operationalSynergiesFieldApi && this.showSynergiesTextBox) {
                        fields.push({
                            name:  this.operationalSynergiesFieldApi,
                            label: this.operationalSynergiesLabel || 'Operational Synergies',
                            limit: 200
                        });
                    }
                    return fields;
                }

                default:
                    return [];
            }
        }

        // ── Main validation method ─────────────────────────────────────────────
        validateRichTextFields() {
            let isValid = true;

            const requiredFields = this._getRequiredRichTextFields();

            requiredFields.forEach(fieldObj => {
                const field    = this.template.querySelector(`[data-field="${fieldObj.name}"]`);
                const errorMsg = this.template.querySelector(`[data-error="${fieldObj.name}"]`);

                // ── Get plain text word count ──────────────────────────────────
                const rawText  = field?.innerText?.trim() || '';
                const rawHtml  = field?.innerHTML?.trim() || '';
                const words    = rawText.split(/\s+/).filter(w => w.length > 0);
                const count    = words.length;

                console.log(`🧪 Validating "${fieldObj.name}" → words: ${count}, html: "${rawHtml.substring(0, 60)}"`);

                // ── Determine error state ──────────────────────────────────────
                let errorText = '';

                if (!field || rawHtml === '' || rawHtml === '<br>' || count === 0) {
                    errorText = `${fieldObj.label} is required.`;

            // Inside validateRichTextFields() — replace the error text for over-limit:
        } else if (fieldObj.limit && count > fieldObj.limit) {
            errorText = `${fieldObj.label} exceeds the ${fieldObj.limit}-word limit (currently ${count} words). Please shorten before proceeding.`;
        }

                // ── Apply or clear error ───────────────────────────────────────
                if (errorText) {
                    console.warn(`❌ Field failed: ${fieldObj.name} — ${errorText}`);
                    field?.classList.add('invalid-field');
                    this._registerInvalid(field); 
                    if (errorMsg) {
                        errorMsg.textContent = errorText;
                        errorMsg.style.display = 'block';
                    }
                    isValid = false;

                } else {
                    console.log(`✅ Field passed: ${fieldObj.name}`);
                    field?.classList.remove('invalid-field');
                    this._invalidElements = this._invalidElements.filter(x => x !== field);
                    if (errorMsg) {
                        errorMsg.textContent = '';
                        errorMsg.style.display = 'none';
                    }
                }
            });

            return isValid;
        }
        updateRichTextFieldsForCurrentPage() {
            // All contenteditable fields on the current page, regardless of CSS class name
            this.template.querySelectorAll('[contenteditable="true"][data-field]').forEach(el => {
                const field = el.dataset.field;
                if (!field || field === 'undefined') return;
                const clean = this._sanitizeHtml(el.innerHTML);
                if (field === 'Revenue_Explanation__c' || field === 'Expense_Explanation__c') {
                    this.fiscalData[field] = clean;
                } else {
                    this.organizationData[field] = clean;
                }
            });
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
        get formattedSkillingApproach() {
            return this.cleanRichText(this.organizationData.Skilling_Approach__c);
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
        get unifiedSkillDomainsIndexed() {
            return this.unifiedSkillDomains.map((row, i) => ({ 
                ...row, 
                idx: i,
                displayIdx: i + 1,
                displayStartDate: this._fmtDateDisplay(row.startDate)  // ← add this
            }));
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
        scrollToTop() {
            const formEl = this.template.querySelector('.centered-form-container');
            if (formEl) {
                formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        restoreEditorContent() {
                // List of all rich text fields
                const richTextFields = [
                    "Legal_Structure__c",
                    "Organizational_Sustainability__c",
                    "Use_of_Additional_Funding__c", 
                    "Operational_Synergies_with_WOF__c",
                    "Use_of_Additional_Funding_JC__c",
                    "Operational_Synergies_with_WOF_JC__c",
                    "Operational_Synergies_with_WOF_Both__c",
                    "Job_Creation_Approach__c",
                    "Skilling_Approach__c",
                ];
            
                richTextFields.forEach(field => {
                    if (this.organizationData[field]) {//applicationData
                        let richTextElement = this.template.querySelector(`[data-field="${field}"]`);
                        if (richTextElement) {
                            richTextElement.innerHTML = this._sanitizeHtml(this.organizationData[field]); // Restore HTML content (sanitized)
                        }
                    }
                });
            } 
        // ── RENDERED CALLBACK ───────────────────────────────────────────────────
        /*renderedCallback() {
            // ✅ ONLY restore rich text fields here — no script loading
            this.template.querySelectorAll('.text-area[contenteditable="true"]').forEach(el => {
                const field = el.dataset.field;
                if (
                    field &&
                    this.organizationData[field] !== undefined &&
                    el.innerHTML !== this.organizationData[field]
                ) {
                    el.innerHTML = this.organizationData[field];
                }
            });
        } */    


        renderedCallback() {
            this.template.querySelectorAll('[contenteditable="true"][data-field]').forEach(el => {
                const field = el.dataset.field;
                if (!field || field === 'undefined') return;

                const source = (field === 'Revenue_Explanation__c' || field === 'Expense_Explanation__c')
                    ? this.fiscalData
                    : this.organizationData;

                const storedValue = source[field];
                if (storedValue !== undefined && storedValue !== null && el.innerHTML !== storedValue) {
                    el.innerHTML = this._sanitizeHtml(storedValue);
                }
            });

            // Bind real-time input event listeners to all number/text inputs on render
            if (!this._inputListenersBound) {
                this._inputListenersBound = true;
                this.template.addEventListener('input', this.handleLiveInput.bind(this));
            }

            // Initialise / tear down the phone picker as pages render
            this._managePhoneIti();

            // Load PDF libraries once only
            if (this._scriptsInitiated) return;
            this._scriptsInitiated = true;
            this._loadPdfLibraries();
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
                } else if (fieldName) {
                    if (target.dataset.section === 'sector' || fieldName === 'yearlyEnrolment') {
                        this.handleBusinessSectorInput(event);
                    } else if (fieldName === 'hours' || fieldName === 'duration' || fieldName === 'skillEnrolment' || fieldName === 'yearlyEnrolment') {
                        this.handleUnifiedSkillInput(event);
                    }
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

        handleAddFunder() {

            if (!this.showFunder2) {

                this.showFunder2 = true;

            } else if (!this.showFunder3) {

                this.showFunder3 = true;
            }
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
    y += 4;   // ← breathing room above the sub-heading, fixes badge overlapping the row above
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
        const labelValue = (label, value, qNum = null) => {
            if (value === null || value === undefined || value === '') return;
            checkPage(16);

            let labelX = 15;
            if (qNum) {
                doc.setFillColor(...BRAND_SOFT);
                const bw = doc.getTextWidth(qNum) + 5;
                doc.roundedRect(15, y - 3.5, bw, 5, 1, 1, 'F');
                doc.setFontSize(7.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...BRAND);
                doc.text(qNum, 17.5, y);
                labelX = 15 + bw + 3;
            }

            doc.setFontSize(8.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...TEXT_GRAY);
            doc.text(label.toUpperCase(), labelX, y);
            y += 5;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...TEXT_DARK);
            printLines(parseHtml(String(value)), 15);

            checkPage(4);
            doc.setDrawColor(...LINE_GRAY);
            doc.setLineWidth(0.2);
            doc.line(15, y + 1, pageWidth - 15, y + 1);
            y += 6;
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
    if (orgData.Leader_Tenure__c) {
        labelValue(this.labels.CL_Leader_Tenure, `${orgData.Leader_Tenure__c} years`, 'Q2');
    }
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
section(this.labels.CL_What_You_Do);

if (showJF) {
    labelValue(this.labels.CL_Your_Skilling_Approach, orgData.Skilling_Approach__c, 'Q8');

    const domainRows = this.unifiedSkillDomains
        .filter(r => r.domain)
        .map(r => [r.domain, val(r.hours), val(r.duration), fmtDate(r.startDate), val(r.yearlyEnrolment)]);
    if (domainRows.length > 0) {
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
        handleAddReference() {

            if (!this.showReference2) {

                this.showReference2 = true;
            }
        }

        handleRemoveFunder2() {

            this.showFunder2 = false;
        }

        handleRemoveFunder3() {

            this.showFunder3 = false;
        }

        handleRemoveReference2() {

            this.showReference2 = false;
        }
        handleStartForm() {

            localStorage.removeItem('wcf_draft_recordId');
            this.recordId = null;
             this.fiscalMonthValue = '';
            this.historicalData = { ...this.historicalData, Id: undefined };
            this.fiscalData     = { ...this.fiscalData,     Id: undefined };
            this.outcomeData    = { ...this.outcomeData,    Id: undefined };
            this.isOrientationComplete = true;
            this.currentPage = 1;
            this._applyVerifiedEmail();
            this.currentPageIndex = 0;
            const formEl = this.template.querySelector('.centered-form-container');
            if (formEl) {
                formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        openTourModal() {
                this.isTourModalOpen = true;
            }

            closeTourModal() {
                this.isTourModalOpen = false;
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
        // ── Text-quality checks (TC_WF_02–30) ───────────────────────────────
            const textFieldChecks = [
                { id: 'Organization_Name__c',                 run: v => this._validateNameLikeField(v, 'Organization Name') },
                { id: 'Headquarters_City_and_Country__c',     run: v => this._validateHQCityCountry(v) },
                 { id: 'Primary_Service_Regions__c',           run: v => this._validateRegionsField(v) },
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
            const q = f => this.template.querySelector(`[data-field="${f}"][data-index="${i}"]`);
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
            if (!checkNumber(q('skillEnrolment'), row.yearlyEnrolment, 'Learner Enrollment')) isValid = false;
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
            const sectorEl = this.template.querySelector(`select[data-field="sector"][data-index="${i}"]`);
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
            let isValid = true;
            const inputs = this.template.querySelectorAll(
                'lightning-input, lightning-combobox, lightning-textarea'
            );
            
        

        inputs.forEach(input => {
            if (input.required && input.offsetParent !== null) {
                // A field containing only spaces passes native HTML5 "required" validity
                // (the value isn't technically empty) but is not real data — catch it here.
                const isWhitespaceOnly = typeof input.value === 'string'
                    && input.value.length > 0
                    && input.value.trim() === '';

                if (isWhitespaceOnly) {
                    input.setCustomValidity('This field cannot contain only spaces.');
                } else {
                    input.setCustomValidity('');
                }

                if (!input.checkValidity()) {
                    input.reportValidity();
                    isValid = false;
                    this._registerInvalid(input);  
                    if (!this._firstInvalidField) this._firstInvalidField = input;
                }
            }
        });

            // ✅ ADD: Validate Q1 card selection (Page 1 only)
            if (this.currentPage === 1) {
                if (!this.selectedFundingArea) {
                    isValid = false;
                    // Show inline error under the card grid
                    const cardError = this.template.querySelector('.q1-error-msg');
                    if (cardError) {
                        cardError.style.display = 'block';
                         this._registerInvalid(cardError);
                    }
                } else {
                    const cardError = this.template.querySelector('.q1-error-msg');
                    if (cardError) {
                        cardError.style.display = 'none';
                    }
                }
            }
            this._firstInvalidLabel = this._firstInvalidField
            ? (this._firstInvalidField.label
                || this.labels.CL_Organizational_Area_s_for_Funding_Investment)
            : '';
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

        /*  handleNext() {
                if (this.currentPageIndex < this.pageSequence.length - 1) {
                this.currentPageIndex++;
                this.currentPage = this.pageSequence[this.currentPageIndex];
            }
            }
        */
        /*handleNext() {
            console.log('click Next Button');
            console.log('pageSequence:', this.pageSequence);
            console.log('currentPageIndex:', this.currentPageIndex);
            console.log('currentPage:', this.currentPage);
            
            this.syncCustomRichTextFields();
            this.updateRichTextFieldsForCurrentPage();
            let isValid = true;

            
            // Scope validation to current page only
            const currentPageClass = `.page${this.currentPage}`;
            const currentFields = this.template.querySelectorAll(
                `${currentPageClass} lightning-input, ${currentPageClass} lightning-combobox, ${currentPageClass} lightning-textarea`
            );

            currentFields.forEach((input) => {
                const value = input.value;
                const isRequired = input.required;

                if (isRequired && (!value || value.trim() === '')) {
                    input.setCustomValidity('This field is required');
                    input.reportValidity();
                    isValid = false;
                } else {
                    input.setCustomValidity('');
                    input.reportValidity();
                }
            });
        


        const isRichTextValid = this.currentPage === 1 ? true : this.validateRichTextFields();

            if (!isValid || !isRichTextValid) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: 'Please fill all required fields before proceeding.',
                    variant: 'error'
                }));
                return;
            }


            // Navigation using pageSequence and currentPageIndex
            if (this.currentPageIndex < this.pageSequence.length - 1) {
                this.currentPageIndex++;
                this.currentPage = this.pageSequence[this.currentPageIndex];
                setTimeout(() => this.restoreEditorContent(), 100);
                console.log('Moved to page:', this.currentPage);
            } else {
                console.log('Already on last page, not moving');
            }
        }*/
   async handleNext() { 
    if (this.isSaving) return;
    await this._fileOpQueue;
    this._resetInvalidTracking();
    this._clearAllInlineErrors();
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
    const isRichTextValid = (this.currentPage === 7) ? true : this.validateRichTextFields();
    if (!isRichTextValid) {
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

    // …attestation prefill (nextIndex/nextPage), autoSaveDraft, navigation — unchanged…

            // Auto-populate attestation fields when navigating TO page 7
        const nextIndex = this.currentPageIndex + 1;
        const nextPage  = this.pageSequence[nextIndex];
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
        const saveSucceeded = await this.autoSaveDraft();
        if (!saveSucceeded) {
            // Do NOT advance — the user would silently lose this page's changes
            // (e.g. a picklist value like "Other" rejected server-side) if we did.
            return;
        }
        // 🔑 Main Navigation Block
        if (this.currentPageIndex < this.pageSequence.length - 1) {
            this.currentPageIndex++;
            this.currentPage = this.pageSequence[this.currentPageIndex];
            console.log('Moved to page:', this.currentPage, 'pageIndex:', this.currentPageIndex);
            setTimeout(() => {
                this.restoreEditorContent();
                this.scrollToTop();
            }, 100);
        } else {
            console.log('Already on last page, not moving forward');
        }
            }


        /*  handlePrevious() {
            if (this.currentPageIndex > 0) {
                this.currentPageIndex--;
                this.currentPage = this.pageSequence[this.currentPageIndex];
            }
            }*/
        async handlePrevious() {
            if (this.isSaving) return; // ✅ Block if save in progress

            if (this.currentPage === 1) {
            this.currentPage = 0;
            this.currentPageIndex = -1; 
            return;
        }
        if (this.currentPage === 0) {
            this.dispatchEvent(new FlowNavigationBackEvent());
            return;

        }

            this.syncCustomRichTextFields();
                    this.updateRichTextFieldsForCurrentPage();
                    // ✅ AUTO-SAVE before navigating back
            await this.autoSaveDraft();
                if (this.currentPageIndex > 0) {
            const prevIndex = this.currentPageIndex - 1;
            const prevPage = this.pageSequence[prevIndex];
            setTimeout(() => {
                this.currentPageIndex = prevIndex;
                this.currentPage = prevPage;
                console.log('Moved to page:', this.currentPage);
                setTimeout(() => {
                    this.restoreEditorContent();
                    this.scrollToTop();
                }, 100);
            }, 0);
        }
                }
            get isFirstPage() {
            return this.currentPage === 0 || this.currentPage === 1;
        }

        get isLastPage() {
            return this.currentPageIndex === this.pageSequence.length - 1;
        }
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
                    Leader_Name__c:                   v => this._validateNameLikeField(v, 'Leader Name'),
                     Primary_Service_Regions__c:       v => this._validateRegionsField(v),
                    Leader_Title__c:                  v => this._validateNameLikeField(v, 'Leader Title'),
                    Submitter_Name__c:                v => this._validateNameLikeField(v, 'Submitter Name'),
                    Job_Title__c:                      v => this._validateNameLikeField(v, 'Submitter Title'),
                    Phone__c: v => this._validatePhoneField(v, this.organizationData.WG_Phone_Country_Code__c),
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

        handleRichTextChange(event) {
                const field = event.target.dataset.id;
                this.organizationData[field] = this._sanitizeHtml(event.target.innerHTML);
        }
            
        
        // CORRECT — also handle Expense_Explanation__c and Net_Position_Explanation__c
        syncCustomRichTextFields() {
            const fiscalFields = [
                'Revenue_Explanation__c',
                'Expense_Explanation__c',
                'Net_Position_Explanation__c'
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
        get additionalFundingFieldApi() {
            if (this.selectedFundingArea === 'Job Creation Only') {
                return 'Use_of_Additional_Funding_JC__c';
            }
            // Job Fulfillment Only AND Both use same field
            return 'Use_of_Additional_Funding__c';
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

        /* =========================================================
        AI FEEDBACK — MODAL VERSION
        ========================================================= */

        @track isAIModalOpen = false;
        @track aiModalTitle = 'AI Feedback';
        @track aiResponse = '';
        @track isAiLoading = false;


        /* =========================================================
        OPEN AI FEEDBACK MODAL
        ========================================================= */

        handleAIClick(event) {
            this.syncCustomRichTextFields();
            const fieldApiName = event.currentTarget.dataset.id;

            // ✅ Always read the submitter name fresh from the input field
            const submitterInput = this.template.querySelector('[data-id="Submitter_Name__c"]');
            const submitterName = submitterInput?.value 
                || this.organizationData.Submitter_Name__c 
                || '';

            if (!submitterName) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Missing Info',
                    message: 'Please fill in the Submitter Name on Page 1 before using AI Feedback.',
                    variant: 'warning'
                }));
                return;
            }
            let fieldValue = this.organizationData[fieldApiName] || '';
            // read the live DOM value, not just the last-synced one
const rtEl = this.template.querySelector(`[contenteditable="true"][data-field="${fieldApiName}"]`);
if (rtEl) {
    fieldValue = this._sanitizeHtml(rtEl.innerHTML);
    this.organizationData[fieldApiName] = fieldValue;
}

const plain = this.stripHtml(fieldValue).replace(/\u00A0/g, ' ').trim();
if (plain === '') {
    this._showFieldError(fieldApiName, 'Please write your answer before requesting AI feedback.');
    this._scrollToFirstError();
    this.dispatchEvent(new ShowToastEvent({
        title:   'Empty Field',
        message: 'Please write something in this field before requesting AI feedback.',
        variant: 'warning'
    }));
    return;
}
            // ... rest of the method unchanged

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


            /* =====================================================
            DEBUG LOGS
            ===================================================== */

            console.log('AI Feedback Click - Params:');

            console.log('fieldApiName:', fieldApiName);

            console.log('fieldValue:', fieldValue);

            console.log('submitterName:', submitterName);

            /* =====================================================
            OPEN MODAL
            ===================================================== */

            this.isAIModalOpen = true;

            this.aiModalTitle = 'AI Feedback';

            this.isAiLoading = true;

            this.aiResponse = '';

            /* =====================================================
            CALL APEX
            ===================================================== 

            upsertAIFeedback({

                fieldApiName,
                fieldValue,
                submitterName

                

            })*/
        

        upsertAIFeedback({

            fieldApiName,
            fieldValue,
            submitterName

        })

            .then(() => {

                console.log(
                    'Apex upsertAIFeedback call succeeded.'
                );

                /* ================================================
                WAIT + LOAD AI RESPONSE
                ================================================ */

                setTimeout(() => {

                    this.loadAIFeedback(
                        fieldApiName,
                        submitterName
                    );

                }, 10000);

            })

            .catch((err) => {

                console.error(
                    'Apex upsertAIFeedback call failed:',
                    err
                );

                if (err && err.body) {

                    console.error(
                        'Apex Error Body:',
                        JSON.stringify(err.body)
                    );
                }

                this.aiResponse =
                    'Error generating AI feedback.';

                this.isAiLoading = false;
            });
        }


        /* =========================================================
        LOAD AI FEEDBACK RESPONSE
        ========================================================= */

        loadAIFeedback(fieldApiName, submitterName) {

            getAIFeedbackRecord({ submitterName })

                .then(result => {

                    /* =============================================
                    FIELD MAPPING
                    ============================================= */

                    const flexFieldMap = {

                        'Legal_Structure__c':
                            'Legal_Structure_FR__c',

                        'Organizational_Sustainability__c':
                            'Organizational_Sustainability_FR__c',

                        'Use_of_Additional_Funding__c':
                            'Use_of_Additional_Funding_FR__c',

                        'Operational_Synergies_with_WOF__c':
                            'Operational_Synergies_with_WOF_FR__c',

                        'Operational_Synergies_with_WOF_JC__c':
                            'Operational_Synergies_with_WOF_JC_FR__c',

                        'Operational_Synergies_with_WOF_Both__c':
                            'Operational_Synergies_with_WOF_Both_FR__c',
                        'Skilling_Approach__c':
                            'Skilling_Approach_FR__c',
                        'Job_Creation_Approach__c':               'Job_Creation_Approach_FR__c', 
                        'Use_of_Additional_Funding_JC__c':
                            'Use_of_Additional_Funding_JC_FR__c'

                    };

                    const flexField =
                        flexFieldMap[fieldApiName];

                    /* =============================================
                    ASSIGN RESPONSE
                    ============================================= */

                    this.aiResponse =
                        result[flexField] ||
                        'No feedback available.';

                    this.isAiLoading = false;

                    console.log(
                        'AI Feedback Loaded:',
                        this.aiResponse
                    );

                })

                .catch(err => {

                    console.error(
                        'Failed to load AI feedback:',
                        err
                    );

                    this.aiResponse =
                        'Error loading AI feedback.';

                    this.isAiLoading = false;
                });
        }


        /* =========================================================
        CLOSE AI MODAL
        ========================================================= */

        closeAIModal() {

            this.isAIModalOpen = false;

            this.aiResponse = '';

            this.isAiLoading = false;
        }
        handlePicklistChange(event) {
            this.selectedFundingArea = event.detail.value;
            console.log('Selected Funding Area:', this.selectedFundingArea);
            this.organizationData.Organizational_Area_s_for_Funding_Inves__c = this.selectedFundingArea; // ✅ Sync to object

            const JOB_FULFILLMENT = [
                'Job Fulfillment Only'            // English
                //'Solo cumplimiento de empleo',     // Spanish
                //'Apenas cumprimento de emprego'    // Portuguese
            ];
            const JOB_CREATION = [
                'Job Creation Only'
                //'Solo creación de empleo',
                //'Apenas criação de emprego'
            ];
            const BOTH = [
                'Both Job Fulfillment and Job Creation'
            // 'Cumplimiento y creación de empleo',
            // 'cumprimento e criação de emprego'
            ];

            if (JOB_FULFILLMENT.includes(this.selectedFundingArea)) {
                this.pageSequence = [1, 2, 4, 6,7];
            } else if (JOB_CREATION.includes(this.selectedFundingArea)) {
                this.pageSequence = [1, 2, 4, 6,7];
            } else if (BOTH.includes(this.selectedFundingArea)) {
                this.pageSequence = [1, 2, 4, 6,7];
            } else {
                this.pageSequence = [1]; // fallback
            }

            this.currentPageIndex = 0;
            this.currentPage = this.pageSequence[0];
        }
        legalTypeOptions = [
            { label: this.labels.CL_Select_Type, value: '' },

            { label: this.labels.CL_Non_Profit, value: 'Non-profit' },

            { label: this.labels.CL_For_Profit, value: 'For-profit' },

            { label: this.labels.CL_Hybrid, value: 'Hybrid' },

            { label: this.labels.CL_Government_Affiliated, value: 'Government-affiliated' },

            { label: this.labels.CL_Other_1, value: 'Other' }
        ];
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

        // Show the free-text "please specify" input when the applicant picks "Other"
        get showLegalTypeOther() {
            return this.organizationData.Legal_Type__c === 'Other';
        }
        get showRegistrationJurisdictionOther() {
            return this.organizationData.Registration_Jurisdiction__c === 'Other';
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
/*handleIncorporationDateValueOnly(event) {
    const value = event.target.value;
    this.hasUnsavedChanges = true;
    this.organizationData = { ...this.organizationData, Incorporation_Date__c: value };
}*/
handleIncorporationDateChange(event) {
    const value = event.target.value;
    this.hasUnsavedChanges = true;

    const safe = this._isGarbageTypedDate(value) ? '' : value;
    this.organizationData = { ...this.organizationData, Incorporation_Date__c: safe };

    if (!safe) return;
    this._clearNativeError(event.target);
    this._clearLightningError('Incorporation_Date__c');
    this._clearFieldError('Incorporation_Date__c');
    if (value > this.todayDateString) {
        this._showLightningError('Incorporation_Date__c', 'Incorporation date cannot be in the future.');
    }
}

_DATE_ALLOWED_KEYS = new Set(['Tab', 'Escape', 'Enter', 'Backspace', 'Delete']);
_dateHintTimer = null;

blockDateTyping(event) {
    // Navigation / clearing keys pass through silently — no warning for these.
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
    this._clearNativeError(el);          // opening the calendar resolves the hint
    if (typeof el.showPicker !== 'function') return;
    try { el.showPicker(); } catch (e) { /* no user gesture / unsupported */ }
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
            key:   'P5_FY1_JV',
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
        async handleDeleteFile(event) {
            const docId = event.target.dataset.docId;
            const cellKey = event.target.dataset.cellKey;

            try {
                await deleteUploadedFile({ contentDocumentId: docId });

                // Only update UI state after the server confirms deletion
                const updated = { ...this.uploadedFilesByCell };
                updated[cellKey] = (updated[cellKey] || []).filter(f => f.documentId !== docId);
                this.uploadedFilesByCell = updated;

                this.uploadedFiles = this.uploadedFiles.filter(id => id !== docId);
                this.hasUnsavedChanges = true;

                this.dispatchEvent(new ShowToastEvent({
                    title: 'File Removed',
                    message: 'The file was deleted successfully.',
                    variant: 'success'
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
    await this._fileOpQueue;
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
    this.additionalInfoFiles = updated;   // ← this now actually runs

    this.dispatchEvent(new ShowToastEvent({
    title:   'File Uploaded',
    message: `${validFiles.length} file(s) uploaded.`,
    variant: 'success'
}));
}
    async handleQ21DeleteFile(event) {
        const docId = event.target.dataset.docId;
        try {
            await deleteUploadedFile({ contentDocumentId: docId });
            this.additionalInfoFiles = this.additionalInfoFiles.filter(f => f.documentId !== docId);
            this.hasUnsavedChanges = true;
            this.dispatchEvent(new ShowToastEvent({
                title: 'File Removed',
                message: 'The file was deleted successfully.',
                variant: 'success'
            }));
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Delete Failed',
                message: error?.body?.message || 'Could not delete the file. Please try again.',
                variant: 'error'
            }));
        }
    }
        // PREVIEW FUNCTIONS:
        get previewPage2Rows() {
            return [
                { label: this.labels.CL_Organizational_Name, value: this.organizationData.Organization_Name__c },
                { label: this.labels.CL_Headquarters_City_and_Country, value: this.organizationData.Headquarters_City_and_Country__c },
                { label: this.labels.CL_Primary_Service_Regions, value: this.organizationData.Primary_Service_Regions__c },
                { label: this.labels.CL_Leader_Name, value: this.organizationData.Leader_Name__c },
                { label: this.labels.CL_Leader_Title, value: this.organizationData.Leader_Title__c }
            ].filter(row => row.value);
        }
        get previewSubmitterRows() {
            return [
                { label: this.labels.CL_Submitter_Name, value: this.organizationData.Submitter_Name__c },
                { label: this.labels.CL_Title, value: this.organizationData.Job_Title__c },
                { label: this.labels.CL_Email_Address, value: this.organizationData.Work_Email_ID__c },
                { label: this.labels.CL_Phone_number, value: this.organizationData.Phone__c }
            ].filter(row => row.value);
        }

        getSectorOptions(selectedValue) {
            const sectors = [
                '', 'Agriculture', 'Retail', 'Manufacturing', 
                'Services', 'Technology', 'Other'
            ];
            return sectors.map(s => ({
                label: s === '' ? '— Select —' : s,
                value: s,
                isSelected: s === (selectedValue || '')
            }));
        }

        // Helper to check if any value is filled (non-empty, non-null, not just whitespace)
        isDataFilled(dataObj) {
            if (!dataObj) return false;
            // Exclude the Id field itself from consideration
            return Object.entries(dataObj).some(([key, val]) => {
                if (key === 'Id') return false;           // never count Id
                if (val === null) return false;
                if (val === '') return false;
                if (val === undefined) return false;
                if (val === false) return false;           // boolean false = empty checkbox
                if (val === 0) return false;               // 0 = unset numeric
                if (typeof val === 'number' && isNaN(val)) return false;
                return true;
            });
        }
_DATE_FLOOR_YEAR = 1900;
_isGarbageTypedDate(value) {
    if (!value) return false;
    const m = String(value).match(/^(\d{4})-\d{2}-\d{2}$/);
    if (!m) return true; // malformed/partial
    return parseInt(m[1], 10) < this._DATE_FLOOR_YEAR; // year < 1900
}

// A typed year like 0006 / 0206 is never a real entry — treat it as garbage.

_dateGuardTimers = {};



// Called from onchange. Waits ~900ms after the last keystroke so a
// half-typed year (0002 on the way to 2026) is never wiped.
_scheduleDateGuard(selector, key) {
    clearTimeout(this._dateGuardTimers[key]);
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    this._dateGuardTimers[key] = setTimeout(() => {
        const el = this.template.querySelector(selector);
        if (el && el !== this.template.activeElement) this._clearGarbageDate(el);
        else if (el) this._clearGarbageDate(el, true);   // still focused: flag only
    }, 900);
}

_clearGarbageDate(el, flagOnly) {
    if (!this._isGarbageTypedDate(el.value)) { this._clearNativeError(el); return; }
    this._showNativeError(el, 'Please enter a complete date (year 1900 or later).');
    if (flagOnly) return;
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
    const el = event.target;
    if (el.type === 'date') this._clearGarbageDate(el);
}

        async handleSaveDraft() {
            this._resetInvalidTracking();
            this._clearAllInlineErrors();
            // ── Block garbage input from being persisted via Save Draft (TC_WF_02–30) ──
            const draftTextChecks = [
                { id: 'Organization_Name__c',             run: v => this._validateNameLikeField(v, 'Organization Name') },
                { id: 'Headquarters_City_and_Country__c', run: v => this._validateHQCityCountry(v) },
                 { id: 'Primary_Service_Regions__c',       run: v => this._validateRegionsField(v) },
                { id: 'Leader_Name__c',                   run: v => this._validateNameLikeField(v, 'Leader Name') },
                { id: 'Leader_Title__c',                  run: v => this._validateNameLikeField(v, 'Leader Title') },
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

            if (!this.isValidSalesforceId(this.recordId)) {
                const stored = localStorage.getItem('wcf_draft_recordId');
                this.recordId = this.isValidSalesforceId(stored) ? stored : null;
            }
        
            try {
                console.log('✅ Starting Save Draft');
        
                this.syncCustomRichTextFields();
                this.updateRichTextFieldsForCurrentPage();
        
                if (this.organizationData.Current_fiscal_year_s_end_date__c) {
                    this.organizationData.Current_fiscal_year_s_end_date__c =
                        this.organizationData.Current_fiscal_year_s_end_date__c.split('T')[0];
                }
        
                const params = new URLSearchParams(window.location.search);
                let langParam = params.get('lang') || 'English';
                if (langParam === 'Portuguese') {
                    this.organizationData.Language__c = 'Portuguese';
                    this.languageCode = 'pt';
                } else if (langParam === 'Spanish') {
                    this.organizationData.Language__c = 'Spanish';
                    this.languageCode = 'es';
                } else {
                    this.organizationData.Language__c = 'English';
                    this.languageCode = 'en';
                }
        
                this.organizationData.Last_Page__c = this.currentPage;
        
                // ✅ Correct: define AND use these variables (no stale console.logs)
                const shouldSendHistorical = !!(this.historicalData?.Id || this.isDataFilled(this.historicalData));
                const shouldSendFiscal     = !!(this.fiscalData?.Id     || this.isDataFilled(this.fiscalData));
                const shouldSendOutcome    = !!(this.outcomeData?.Id    || this.isDataFilled(this.outcomeData));
        
                console.log('shouldSendHistorical:', shouldSendHistorical);
                console.log('shouldSendFiscal:', shouldSendFiscal);
                console.log('shouldSendOutcome:', shouldSendOutcome);
        
                const result = await saveWCFDraftApplication({
                    applicationId:       this.recordId,
                    orgDataJson:         JSON.stringify(this.sanitizeOrgData(this.organizationData)),
                    historicalData:      shouldSendHistorical ? this.historicalData : null,
                    fiscalData:          shouldSendFiscal     ? this.fiscalData     : null,
                    outcomeData:         shouldSendOutcome    ? this.outcomeData    : null,
                    selectedFundingArea: this.selectedFundingArea,
                    uploadedFileIds:     this.uploadedFiles || [],
                    skillingDomainsJson: JSON.stringify(this.unifiedSkillDomains),  // ← CHANGED
            businessSectorsJson: JSON.stringify(this.businessSectors)        // ← CHANGED
                });
        
                this.recordId = result.applicationId;
                localStorage.setItem('wcf_draft_recordId', this.recordId);
                this.hasUnsavedChanges = false;
        
                if (result.historicId) this.historicalData = { ...this.historicalData, Id: result.historicId };
                if (result.fiscalId)   this.fiscalData     = { ...this.fiscalData,     Id: result.fiscalId   };
                if (result.outcomeId)  this.outcomeData    = { ...this.outcomeData,    Id: result.outcomeId  };
        
            if (result.skillingDomains?.length > 0) {
                    this.unifiedSkillDomains = result.skillingDomains.map(r => ({
                        key:             this._rowKey(),
                        period:          'CFY',
                        domain:          r.Domain_Programme_Name__c ?? '',
                        hours:           r.Hours_of_Training__c     ?? '',
                        duration:        r.Duration_Months__c       ?? '',
                        startDate:       r.Programme_Start_Date__c  ?? '',
                        yearlyEnrolment: r.Yearly_Enrolment__c      ?? ''
                    }));
                }

                if (result.businessSectors?.length > 0) {
                    this.businessSectors = result.businessSectors.map(r => ({
                        key:              this._rowKey(),
                        sector:           r.Sector_c__c              ?? '',
                        sectorOther:      r.Business_Sector_Other__c ?? '',
                        supportBegin:     r.Support_Begin_Date__c    ?? '',
                        supportTypeOther: r.Support_Type_Other__c    ?? '',
                        supportTypes:     r.Support_Types__c
                                            ? r.Support_Types__c.split(';')
                                            : [],
                        yearlyEnrolment:  r.Yearly_Enrolment__c      ?? ''
                    }));
                }
        
                this.dispatchEvent(new ShowToastEvent({
                    title:   'Success',
                    message: 'Draft saved successfully! You can resume from the Drafts page.',
                    variant: 'success'
                }));
        
            } catch (error) {
                console.error('❌ Save Draft Error:', JSON.stringify(error, null, 2));
                const message = error?.body?.message
                    || error?.body?.pageErrors?.[0]?.message
                    || error?.message
                    || 'Something went wrong while saving the draft.';
                this.dispatchEvent(new ShowToastEvent({ title: 'Error', message, variant: 'error' }));
            }
        }

        get applicationNumber() {
            // Salesforce record names are often IA-XXXXXXXXX format
            return this.submittedRecordId || 'your application';
        }
        validatePage7Fields() {
    let isValid = true;
    [
        { id: 'Attesting_User_Name__c',  label: 'Attesting User Name'  },
        { id: 'Attesting_User_Title__c', label: 'Attesting User Title' }
    ].forEach(({ id, label }) => {
        const v = this.organizationData[id];
        if (!v || String(v).trim() === '') {
            this._showLightningError(id, `${label} is required.`);
            isValid = false;
            return;
        }
        const err = this._validateNameLikeField(v, label);
        if (err) { this._showLightningError(id, err); isValid = false; }
        else     { this._clearLightningError(id); }
    });
    return isValid;
}
       async handleSubmit() {
    if (this.isLoading) return;
     await this._fileOpQueue;
    this._resetInvalidTracking();
    this._clearAllInlineErrors();
    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();

    if (!this.isAttested) {
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.CL_Validation_Error,
            message: this.labels.CL_Attestation_Checkbox
                     || 'Please confirm the accuracy of your application before submitting.',
            variant: 'error'
        }));
        const box = this.template.querySelector('.wcf-attest-checkbox-row lightning-input');
        if (box) { this._registerInvalid(box); this._scrollToFirstError(); }
        return;
    }

    if (!this.validatePage7Fields()) {
        const uniqueLabels = Array.from(new Set(
            this._invalidElements.filter(el => el && el.isConnected).map(el => this._getFieldLabel(el)).filter(Boolean)
        ));
        const labelsStr = uniqueLabels.map(l => `"${l}"`).join(', ');
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.CL_Validation_Error,
            message: labelsStr
                ? `${this.labels.CL_This_is_a_required_fields}: ${labelsStr}`
                : this.labels.CL_Please_fix_the_highlighted_fields_before_proceeding,
            variant: 'error'
        }));
        this._scrollToFirstError();
        return;
    }

    if (!this.validateFileUploads()) return;

    this.isLoading = true;
    this.isPreviewVisible = false;
    // ← delete `this.isAttested = false;` — it clears the box the user just ticked
    //   and re-disables the button mid-submit

    // …FundingOpportunityId check + submitWCFApplication unchanged…

            
            // 2) Validate presence of Funding Opportunity
            if (!this.organizationData.FundingOpportunityId) {
                this.isLoading = false;
                return this.dispatchEvent(new ShowToastEvent({
                    title:   'Error',
                    message: 'Funding Opportunity ID is missing!',
                    variant: 'error'
                }));

            }
            // ✅ Auto-populate attestation fields from submitter info
            if (!this.organizationData.Attesting_User_Name__c) {
                this.organizationData.Attesting_User_Name__c = 
                    this.organizationData.Submitter_Name__c || '';
            }
            if (!this.organizationData.Attesting_User_Title__c) {
                this.organizationData.Attesting_User_Title__c = 
                    this.organizationData.Job_Title__c || '';
            }
            this.organizationData = { ...this.organizationData };

            submitWCFApplication({
            orgDataJson:    JSON.stringify(this.sanitizeOrgData(this.organizationData)),
            historicalData: this.historicalData,
            fiscalData: this.fiscalData,
            outcomeData: this.outcomeData,
            uploadedFileIds: this.uploadedFiles || [],
            selectedFundingArea: this.selectedFundingArea,
            recordId: this.recordId,
        skillingDomainsJson: JSON.stringify(this.unifiedSkillDomains),
        businessSectorsJson: JSON.stringify(this.businessSectors)
        })
        .then(appName => {
            this.recordId = appName;        // store it (even if it's the Name now)
            this.submittedRecordId = appName;  // ← directly shows IA-00000005
            this.isLoading = false;
            this.isSubmitted = true;
            localStorage.removeItem('wcf_draft_recordId');

            this.dispatchEvent(new ShowToastEvent({
                title:   'Success',
                message: 'Application submitted successfully.',
                variant: 'success'
            }));

            setTimeout(() => {
                this[NavigationMixin.Navigate]({
                    type: 'standard__webPage',
                   // attributes: { url: 'https://wadhwanifoundation--wfdev.sandbox.my.site.com/wcf/s/applicant-portal' }
                    attributes: {  url: 'https://grants.wadhwanifoundation.org/partner/s/?language=en_US' }
                });
            }, 8000);
        })
        .catch(error => {
            this.isLoading = false;

            // 🔍 Full debug output
            console.error('❌ Submit Error:', JSON.stringify(error, null, 2));

            // 🌐 Helpful message fallback
            const message =
                error?.body?.message ||
                (error?.body?.pageErrors && error.body.pageErrors[0]?.message) ||
                error?.message ||
                'Unknown error occurred during submission';

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: message,
                    variant: 'error'
                })
            );
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

    get disclaimerPoints() {
            return this.labels.CL_Your_Latest_Changes.split('|');
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

get leaderTenureDisplay() {
    const v = this.organizationData.Leader_Tenure__c;
    return (v !== null && v !== undefined && v !== '') ? `${v} years` : '—';
}
        }


        //new