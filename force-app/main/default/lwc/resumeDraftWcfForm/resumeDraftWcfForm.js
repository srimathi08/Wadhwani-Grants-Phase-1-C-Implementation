import { LightningElement, wire, track } from 'lwc';
import upsertAIFeedback from '@salesforce/apex/WCFFormController.upsertAIFeedback';
import getAIFeedbackRecord from '@salesforce/apex/WCFFormController.getAIFeedbackRecord';
import getPicklistValuesForField from '@salesforce/apex/WCFFormController.getPicklistValuesForField';
import saveWCFDraftApplication from '@salesforce/apex/WCFFormController.saveWCFDraftApplication';
import submitWCFApplication from '@salesforce/apex/WCFFormController.submitWCFApplication';
import getDraftWCFApplication from '@salesforce/apex/WCFFormController.getDraftWCFApplication';
import getActiveFundingOpportunityId from '@salesforce/apex/WCFFormController.getActiveFundingOpportunityId';
import setFileCellKey from '@salesforce/apex/WCFFormController.setFileCellKey';


import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';

// Custom Labels
import CL_WCF_Form_Title from '@salesforce/label/c.CL_WCF_Form_Title';
import WCF_Paragraph_1 from '@salesforce/label/c.WCF_Paragraph_1';
import WCF_Paragraph_2 from '@salesforce/label/c.WCF_Paragraph_2';
import WCF_Paragraph_3 from '@salesforce/label/c.WCF_Paragraph_3';
import CL_Organizational_Area_s_for_Funding_Investment from '@salesforce/label/c.CL_Organizational_Area_s_for_Funding_Investment';


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

import CL_Next from '@salesforce/label/c.CL_Next';
import CL_Previous from '@salesforce/label/c.CL_Previous';
import CL_Save_Draft from '@salesforce/label/c.CL_Save_Draft';
import CL_Submit from '@salesforce/label/c.CL_Submit';
import CLH_AI_Feedback from '@salesforce/label/c.CLH_AI_Feedback';
import CLH_Preview from '@salesforce/label/c.CLH_Preview';
import CL_Close from '@salesforce/label/c.CL_Close';

export default class ResumeDraftWcfForm extends NavigationMixin(LightningElement) {
    @track recordId;
         // IndividualApplication__c fields
    @track languageCode = 'en'; // ✅ ADD THIS LINE
    @track historicalRecord = {};     // Historical_Data__c
    @track fiscalRecord = {};         // Current_fiscal_year_data__c
    @track outcomeRecord = {};        // Outcomes_Data__c
    winLogoUrl = WIN_LOGO; 

    @track activeField = null;
    @track uploadedFiles = [];
    @track uploadedFilesByCell = {};
   @track isPreviewVisible = false;
   @track previewPage = 1;

    labels = {  
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
        CL_Operational_Synergies_Question_Both,
        clickToAddExplanation: CL_Click_To_Add_Explanation,
    };
       

    @track organizationData = {
        FundingOpportunityId: '',
        Organizational_Area_s_for_Funding_Inves__c: '', 
        Organization_Name__c: '',
        Headquarters_City_and_Country__c: '',
        Primary_Service_Regions__c: '',
        Leader_Name__c: '',
        Leader_Title__c: '',
        Submitter_Name__c: '',
        Job_Title__c: '',
        Work_Email_ID__c: '',
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
    };

    @track historicalData = {
        CY1_Balance_Start_CFY_1__c: '',
        CY2_Balance_Start_CFY_2__c: '',
        CY3_Balance_Start_CFY_3__c: '',
        CY1_Revenue__c: '',
        CY2_Revenue__c: '',
        CY3_Revenue__c: '',
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
        Expense_Budget__c: '',
        Expense_Projection__c: '',
        Expense_Variance__c: '',
        Expense_Explanation__c: '',
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
    @track isAiLoading = false;

    @track showAiFeedback = false;
    @track aiResponse = '';
    currentField = '';

@track isExplanationModalOpen = false;
@track activeExplanationField = '';
@track activeExplanationValue = '';

@track organizationalAreaValues = [];
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

supportedAiFields = ['Legal_Structure__c', 'Organizational_Sustainability__c', 'Use_of_Additional_Funding__c',
'Operational_Synergies_with_WOF__c', 'Use_of_Additional_Funding_JC__c', 'Operational_Synergies_with_WOF_JC__c',
'Operational_Synergies_with_WOF_Both__c'];



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

// Preview Getters for Rich Text Shortened
get skillDomainsCFYPreview() {
    return this.getOutcomePreview('Skills_Duration_CFY__c');
}
get skillDomainsFY1Preview() {
    return this.getOutcomePreview('Skills_Duration_FY_1__c');
}
get skillDomainsFY2Preview() {
    return this.getOutcomePreview('Skills_Duration_FY_2__c');
}
get skillDomainsFY3Preview() {
    return this.getOutcomePreview('Skills_Duration_FY_3__c');
}
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

minimizeFeedbackPanel(event) {
        event.stopPropagation();
        this.isFeedbackMinimized = !this.isFeedbackMinimized;
    }

get panelClasses() {
        return `panel ${this.isFeedbackPanelOpen && !this.isFeedbackMinimized ? 'panel-open' : 'panel-minimized'}`;
    }

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
        if (editor) editor.innerHTML = this.modalValue;
    }, 0);
}
recalculateAvgCostPerPlacement() {
    const periods = [
        {
            expense:    () => Number(this.fiscalData.Expense_Projection__c) || 0,
            placements: 'Projected_Learner_Placements_CFY__c',
            avgCost:    'Avg_Cost_per_Placement_CFY__c'
        },
        {
            expense:    () => Number(this.historicalData.CY1_Expense__c) || 0,
            placements: 'Projected_Learner_Placements_FY_1__c',
            avgCost:    'Avg_Cost_per_Placement_FY_1__c'
        },
        {
            expense:    () => Number(this.historicalData.CY2_Expense__c) || 0,
            placements: 'Projected_Learner_Placements_FY_2__c',
            avgCost:    'Avg_Cost_per_Placement_FY_2__c'
        },
        {
            expense:    () => Number(this.historicalData.CY3_Expense__c) || 0,
            placements: 'Projected_Learner_Placements_FY_3__c',
            avgCost:    'Avg_Cost_per_Placement_FY_3__c'
        }
    ];

    periods.forEach(p => {
        const expense    = p.expense();
        const placements = Number(this.outcomeData[p.placements]) || 0;

        if (placements > 0) {
            // Round to 2 decimal places
            this.outcomeData[p.avgCost] = Math.round((expense / placements) * 100) / 100;
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
    // Get value from modal rich text editor
    const editor = this.template.querySelector('.custom-modal .text-area');
    if (!editor) return;

    const value = editor.innerHTML;

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
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
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
    const field = event.target.dataset.id;
    this.outcomeData[field] = event.target.checked;
     // If N/A unchecked, clear the value field too
    if (!event.target.checked) {
        const mainField = field.replace('_NA__c', '__c');
        this.outcomeData[mainField] = '';
    }
}

handleOutcomeInput(event) {
   /* const field = event.target.dataset.id;
    //this.outcomeData[field] = event.target.value;
    this.outcomeData[field] = event.detail.value; // value, not label */

     const field = event.target.dataset.id;
    let value = event.detail.value;

    // If it's a numeric input, convert to number (avoid passing as string)
    if (event.target.type === 'number') {
        value = value ? Number(value) : null;
    }

    this.outcomeData[field] = value;    
    this.recalculatePlacementPercentages(); 
    this.recalculateAvgCostPerPlacement();
}
handleHistoricalInput(event) {
    const field = event.target.dataset.id;
    const value = Number(event.target.value || 0);

    this.historicalData[field] = value;

    // Recalculate CY1 Balance End
    const cy1Start = Number(this.historicalData.CY1_Balance_Start_CFY_1__c) || 0;
    const cy1Revenue = Number(this.historicalData.CY1_Revenue__c) || 0;
    const cy1Expense = Number(this.historicalData.CY1_Expense__c) || 0;
    this.historicalData.CY1_Balance_End__c = cy1Start + cy1Revenue - cy1Expense;

    // Recalculate CY2 Balance End
    const cy2Start = Number(this.historicalData.CY2_Balance_Start_CFY_2__c) || 0;
    const cy2Revenue = Number(this.historicalData.CY2_Revenue__c) || 0;
    const cy2Expense = Number(this.historicalData.CY2_Expense__c) || 0;
    this.historicalData.CY2_Balance_End__c = cy2Start + cy2Revenue - cy2Expense;

    // Recalculate CY3 Balance End
    const cy3Start = Number(this.historicalData.CY3_Balance_Start_CFY_3__c) || 0;
    const cy3Revenue = Number(this.historicalData.CY3_Revenue__c) || 0;
    const cy3Expense = Number(this.historicalData.CY3_Expense__c) || 0;
    this.historicalData.CY3_Balance_End__c = cy3Start + cy3Revenue - cy3Expense;
    this.recalculateAvgCostPerPlacement();
}

handleOutcomeCurrencyInput(event) {
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


   @track pageSequence = [1]; // default page
@track currentPageIndex = 0;
@track currentPage = 1;

    get isPage1() {
        return this.currentPage === 1;
    }

    get isPage2() {
        return this.currentPage === 2;
    }

    get isPage3() {
        return this.currentPage === 3;
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
        return this.currentPage === 6;
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
    if (currentPageReference?.state?.recordId) {
        this.recordId = currentPageReference.state.recordId;
        // ✅ Load draft only after recordId is confirmed available
        this.loadDraft();
    }
}

connectedCallback() {
    console.log('🔄 connectedCallback fired');

    // ✅ STEP 1: Read lang from URL
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('language') || 'en';
this.languageCode = langParam;

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
}
// ✅ NEW separate method - called from @wire once recordId is ready
loadDraft() {
    const urlParams = new URLSearchParams(window.location.search);

    getDraftWCFApplication({ recordId: this.recordId })
        .then((data) => {
            if (data) {
                console.log('Inside getDraftWCFApplication');

                this.organizationData = data.application || {};
                

                // ✅ FIX: Restore Funding Opportunity ID if missing
if (!this.organizationData.FundingOpportunityId) {
    getActiveFundingOpportunityId()
        .then(id => {
            console.log('🔁 Restoring FundingOpportunityId:', id);
            this.organizationData.FundingOpportunityId = id;
        })
        .catch(err => {
            console.error('❌ Error restoring Funding ID:', err);
        });
}

                this.historicalData = data.historical || {};
                this.fiscalData = data.fiscal || {};
                this.outcomeData = data.outcome || {};
                this.uploadedFilesByCell = data.uploadedFilesByCell || {};
                this.selectedFundingArea = this.organizationData.Organizational_Area_s_for_Funding_Inves__c || '';

                

                // ✅ STEP 2: Read saved language from draft
                const lang = this.organizationData.Language__c || 'English';

                

                console.log('🌐 Resume draft in language:', lang, '| code:', this.languageCode);

                const urlParams = new URLSearchParams(window.location.search);
const currentLang = urlParams.get('language') || 'en';

const langMap = {
    'english': 'en',
    'spanish': 'es',
    'portuguese': 'pt'
};

let langCode = langMap[lang.toLowerCase()] || 'en';
this.languageCode = langCode;

// ✅ Only redirect if language is different
if (currentLang !== langCode) {
    const currentUrl = window.location.href.split('?')[0];
    window.location.href = `${currentUrl}?recordId=${this.recordId}&language=${langCode}`;
    return;
}

                // ✅ Load picklists AFTER language confirmed correct
                this.loadPicklist('IndividualApplication', 'Organizational_Area_s_for_Funding_Inves__c', 'organizationalAreaValues');
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

                // ✅ Reinitialize page sequence
                this.initializePageSequence(this.selectedFundingArea);
                const savedPage = this.organizationData.Last_Page__c;
                console.log('📄 Saved page from DB:', savedPage);
                console.log('📋 Page sequence:', this.pageSequence);

                if (savedPage) {
                    const savedIndex = this.pageSequence.indexOf(Number(savedPage));
                    console.log('📌 Found savedIndex:', savedIndex);

                    if (savedIndex !== -1) {
                        this.currentPageIndex = savedIndex;
                        this.currentPage = Number(savedPage);
                        setTimeout(() => this.restoreEditorContent(), 200);
                    }
                }
            }
        })
        
        .catch((error) => {
            console.error('⚠️ Error loading draft:', error);
        });
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
  

    
 loadPicklist(objectApi, fieldApi, targetVar) {
    getPicklistValuesForField({ objectApiName: objectApi, fieldApiName: fieldApi, languageCode: this.languageCode })
        .then(result => {
            this[targetVar] = result; // result is array of { label, value }

          const savedValue = this.organizationData[fieldApi] || this.outcomeData[fieldApi];
        if (savedValue) {
            // ✅ Keep API value (English) for "value"
            if (fieldApi === 'Organizational_Area_s_for_Funding_Inves__c') {
                this.selectedFundingArea = savedValue;
            }
        }

        // ✅ Maintain yesLabelMap for Yes/No fields
        const yesOption = result.find(opt => 
            ['Yes','Sí','Sim'].includes(opt.label) || ['Yes'].includes(opt.value)
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
    const JOB_FULFILLMENT = [
        'Job Fulfillment Only',
        'Solo cumplimiento de empleo',
        'Apenas cumprimento de emprego'
    ];
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

    if (JOB_FULFILLMENT.includes(value)) {
        this.pageSequence = [1, 2, 3, 4, 6];
    } else if (JOB_CREATION.includes(value)) {
        this.pageSequence = [1, 2, 3, 5, 6];
    } else if (BOTH.includes(value)) {
        this.pageSequence = [1, 2, 3, 4, 5, 6];
    } else {
        this.pageSequence = [1];
    }

    this.currentPageIndex = 0;
    this.currentPage = this.pageSequence[0];
}
/* Custom RIch Text Functions */
 setActiveField(event) {
        this.activeField = event.target;
    }
handlePaste(event) {
        event.preventDefault(); // Stop the default paste behavior
    
        const plainText = event.clipboardData.getData('text/plain');
    
        // Optional: Clean up special characters or trim spaces
        const sanitizedText = plainText.trim();
    
        // Insert plain text at caret position
        this.insertPlainTextAtCursor(sanitizedText);
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
    if (event.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const container = range.startContainer;

        // Get the full text of the current line
        const lineText = container.textContent || container.parentNode?.textContent || '';

        // 🔸 Handle bullet continuation first
        const bulletMatch = lineText.trim().match(/^•\s/);
        if (bulletMatch) {
            event.preventDefault();
            const br = document.createElement('br');
            const bullet = document.createTextNode('• ');
            range.insertNode(br);
            range.collapse(false);
            range.insertNode(bullet);

            const newRange = document.createRange();
            newRange.setStartAfter(bullet);
            newRange.collapse(true);

            selection.removeAllRanges();
            selection.addRange(newRange);
            return; // ✅ STOP here if bullet was handled
        }

        // 🔸 Handle numbered continuation
        const match = lineText.trim().match(/^(\d+)\.\s/); // matches "1. ", "2. ", etc.
        if (match) {
            event.preventDefault();
            const nextNum = parseInt(match[1]) + 1;

            const br = document.createElement('br');
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

 validateRichTextFields() {
            let isValid = true;
            const requiredFields = [];
        
            // Only validate from Page 2 to Page 7
            switch (this.currentPage) {

                case 2:
                    requiredFields.push(
                        { name: 'Legal_Structure__c', label: 'Legal Structure' }
                    );
                    break;     

                case 3:
                    requiredFields.push(
                        { name: 'Organizational_Sustainability__c', label: 'Organixational Sustainability' }
                    );
                    break;
        
                case 6:
                    requiredFields.push(
                       { name: 'Use_of_Additional_Funding__c', label: 'Desired Use of Additional Funding/Investment' },
                        //{ name: 'Operational_Synergies_with_WOF__c', label: 'Operational Synergies with the Wadhwani Foundation' },
                    );
                     if (this.operationalSynergiesFieldApi) {
                     requiredFields.push(
                      { name: this.operationalSynergiesFieldApi, label: this.operationalSynergiesLabel }
               );
    }
                    break; 
         
                      
                default:
                    break;
            }
               requiredFields.forEach(fieldObj => {
                const field = this.template.querySelector(`[data-field="${fieldObj.name}"]`);
                const errorMsg = this.template.querySelector(`[data-error="${fieldObj.name}"]`);
                console.log(`🧪 Validating ${fieldObj.name} →`, field?.innerHTML);
        
                if (!field || field.innerHTML.trim() === '') {
                    console.warn(`❌ Field failed: ${fieldObj.name}`);
                    field?.classList.add('invalid-field');
                    if (errorMsg) {
                        errorMsg.textContent = `${fieldObj.label} is required.`;
                        errorMsg.style.display = 'block';
                    }
                    isValid = false;
                } else {
                    field?.classList.remove('invalid-field');
                    if (errorMsg) {
                        errorMsg.textContent = '';
                        errorMsg.style.display = 'none';
                    }
                }
            });
        
            return isValid;
        } 
updateRichTextFieldsForCurrentPage() {
           // const pageToUse = this.isPreviewVisible ? this.previewPage : this.currentPage;
            const pageFields = {

                2:[
                    "Legal_Structure__c"
                ],
                3: [
                    "Organizational_Sustainability__c"
                ],
                6: [
                    "Use_of_Additional_Funding__c",
                    //"Operational_Synergies_with_WOF__c"
                      this.operationalSynergiesFieldApi
                ]
            };
            
           // const fields = pageFields[pageToUse] || [];
            const fields = pageFields[this.currentPage] || [];
        
            fields.forEach(field => {
                const el = this.template.querySelector(`[data-field="${field}"]`);
                if (el) {
                    this.organizationData[field] = el.innerHTML.trim();
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
            this.organizationData[fieldName] = element.innerHTML;
        }
    });
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
            "Operational_Synergies_with_WOF_Both__c"
        ];
    
        richTextFields.forEach(field => {
            if (this.organizationData[field]) { //applicationData
                let richTextElement = this.template.querySelector(`[data-field="${field}"]`);
                if (richTextElement) {
                    richTextElement.innerHTML = this.organizationData[field] || ""; // Restore HTML content
                }
            }
        });
    } 
renderedCallback() {

    // Restore each rich text field from organizationData
    this.template.querySelectorAll('.text-area[contenteditable="true"]').forEach(el => {
        const field = el.dataset.field;
        if (field && this.organizationData[field] !== undefined && el.innerHTML !== this.organizationData[field]) {
            el.innerHTML = this.organizationData[field];
        }
    });
}

validateCurrentPageFields() {
    const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.checkValidity()) {
            input.reportValidity();
            isValid = false;
        }
    });

    return isValid;
}


   handleNext() {
    
     if (!this.validateCurrentPageFields()) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Missing Required Fields',
                message: 'Please complete all required fields before proceeding.',
                variant: 'error'
            })
        );
        return;
    }

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
}

    handlePrevious() {
     this.syncCustomRichTextFields();
            this.updateRichTextFieldsForCurrentPage();
           if (this.currentPageIndex > 0) {
        this.currentPageIndex--;
        this.currentPage = this.pageSequence[this.currentPageIndex];
        setTimeout(() => this.restoreEditorContent(), 100);
        console.log('Moved to page:', this.currentPage);
    }
        }
   

    get isFirstPage() {
    return this.currentPageIndex === 0;
}

get isLastPage() {
    return this.currentPageIndex === this.pageSequence.length - 1;
}


  handleInput(event) {
    // Standard input (for lightning-input, lightning-textarea, etc.)
    if (event.target && event.target.dataset && event.target.dataset.id) {
        const field = event.target.dataset.id;
        this.organizationData[field] = event.target.value;
    }
    // Custom contenteditable rich text field
    if (event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.field) {
        const field = event.currentTarget.dataset.field;
        this.organizationData[field] = event.currentTarget.innerHTML;
    }
}

  /*  handleHistoricalInput(event) {
    const field = event.target.dataset.id;
    this.historicalData[field] = event.target.value;
}*/


    handleRichTextChange(event) {
        const field = event.target.dataset.id;
        this.organizationData[field] = event.target.innerHTML;
    }
    
syncCustomRichTextFields() {
    this.template.querySelectorAll('.text-area[contenteditable="true"]').forEach(el => {
        const field = el.dataset.field;
        if (field) {
            this.organizationData[field] = el.innerHTML;
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

handleAIClick(event) {
    this.syncCustomRichTextFields();
    const fieldApiName = event.currentTarget.dataset.id; // E.g. 'Legal_Structure__c'
    const submitterName = this.organizationData['Submitter_Name__c'] || '';
    let fieldValue = '';
    const customRichText = this.template.querySelector(`.text-area[data-field="${fieldApiName}"]`);
    if (customRichText) {
        fieldValue = customRichText.innerHTML;
        this.organizationData[fieldApiName] = fieldValue;
    } else {
        fieldValue = this.organizationData[fieldApiName] || '';
    }

    // Debug: log what is about to be sent to Apex
    console.log('AI Feedback Click - Params:');
    console.log('fieldApiName:', fieldApiName);
    console.log('fieldValue:', fieldValue);
    console.log('submitterName:', submitterName);

    this.isFeedbackPanelOpen = true;
    this.isFeedbackMinimized = false;
    this.isAiLoading = true;
    this.showAiFeedback = true;
    this.aiResponse = '';

    upsertAIFeedback({ fieldApiName, fieldValue, submitterName })
        .then(() => {
            // Debug: success
            console.log('Apex upsertAIFeedback call succeeded.');
            setTimeout(() => this.loadAIFeedback(fieldApiName, submitterName), 10000); // Adjust as needed
        })
        .catch((err) => {
            console.error('Apex upsertAIFeedback call failed:', err);
            this.aiResponse = 'Error updating AI feedback.';
            this.isAiLoading = false;
        });
}

loadAIFeedback(fieldApiName, submitterName) {
    getAIFeedbackRecord({ submitterName })
        .then(result => {
            // Map your field API name to flex field name
            const flexFieldMap = {
                'Legal_Structure__c': 'Legal_Structure_FR__c',
                'Organizational_Sustainability__c': 'Organizational_Sustainability_FR__c',
                'Use_of_Additional_Funding__c': 'Use_of_Additional_Funding_FR__c',
                'Operational_Synergies_with_WOF__c': 'Operational_Synergies_with_WOF_FR__c',
                'Operational_Synergies_with_WOF_JC__c': 'Operational_Synergies_with_WOF_JC_FR__c',
                'Operational_Synergies_with_WOF_Both__c': 'Operational_Synergies_with_WOF_Both_FR__c'
            };
            const flexField = flexFieldMap[fieldApiName];
            this.aiResponse = result[flexField] || 'No feedback available.';
            this.isAiLoading = false;
        })
        .catch(err => {
            this.aiResponse = 'Error loading AI feedback.';
            this.isAiLoading = false;
            console.error('Failed to load AI feedback:', err);
        });
}
closeFeedbackPanel(event) {
        event.stopPropagation();
        this.isFeedbackPanelOpen = false;
        this.isFeedbackMinimized = true;
        this.showAiFeedback = false;
        this.aiResponse = '';
    }

   handlePicklistChange(event) {
    this.selectedFundingArea = event.detail.value;
    console.log('Selected Funding Area:', this.selectedFundingArea);
    this.organizationData.Organizational_Area_s_for_Funding_Inves__c = this.selectedFundingArea;
    
     // find matching label so you can still show translated in UI
  /*  const match = this.organizationalAreaValues.find(opt => opt.value === selectedValue);
    this.selectedFundingArea = match ? match.label : selectedValue;// ✅ Sync to object */

    const JOB_FULFILLMENT = [
        'Job Fulfillment Only'           // English
        //'Solo cumplimiento de empleo',     // Spanish
      // 'Apenas cumprimento de emprego'    // Portuguese
    ];
    const JOB_CREATION = [
        'Job Creation Only'
       // 'Solo creación de empleo',
      //  'Apenas criação de emprego'
    ];
    const BOTH = [
        'Both Job Fulfillment and Job Creation',
       //'Cumplimiento y creación de empleo',
       // 'cumprimento e criação de emprego'
    ];

    if (JOB_FULFILLMENT.includes(this.selectedFundingArea)) {
        this.pageSequence = [1, 2, 3, 4, 6];
    } else if (JOB_CREATION.includes(this.selectedFundingArea)) {
        this.pageSequence = [1, 2, 3, 5, 6];
    } else if (BOTH.includes(this.selectedFundingArea)) {
        this.pageSequence = [1, 2, 3, 4, 5, 6];
    } else {
        this.pageSequence = [1]; // fallback
    }

    this.currentPageIndex = 0;
    this.currentPage = this.pageSequence[0];
}


    handleCurrencyInput(event) {
    const field = event.target.dataset.id;
    const value = Number(event.target.value || 0);
    this.fiscalData[field] = value;

    // Calculate Net fields on every input
    const rBudget = Number(this.fiscalData.Revenue_Budget__c) || 0;
    const eBudget = Number(this.fiscalData.Expense_Budget__c) || 0;
    const rProj = Number(this.fiscalData.Revenue_Projection__c) || 0;
    const eProj = Number(this.fiscalData.Expense_Projection__c) || 0;
    const rVar = Number(this.fiscalData.Revenue_Variance__c) || 0;
    const eVar = Number(this.fiscalData.Expense_Variance__c) || 0;

   /* this.fiscalData.Net_Budget__c = rBudget - eBudget;
    this.fiscalData.Net_Projection__c = rProj - eProj;
    this.fiscalData.Net_Variance__c = rVar - eVar;*/

     this.fiscalData.Revenue_Variance__c = rProj - rBudget;
    this.fiscalData.Expense_Variance__c = eProj - eBudget;

    this.fiscalData.Net_Budget__c = rBudget - eBudget;
    this.fiscalData.Net_Projection__c = rProj - eProj;

    this.fiscalData.Net_Variance__c = this.fiscalData.Net_Projection__c - this.fiscalData.Net_Budget__c;
    this.recalculateAvgCostPerPlacement();
}

async handleUploadFinished(event) {
    const uploadedFiles = event.detail.files;
    const cellKey = event.target.dataset.cellKey;

    // 1. Set cellKey on every uploaded file (await so it's completed)
    const setKeyPromises = uploadedFiles.map(file =>
        setFileCellKey({ contentDocumentId: file.documentId, cellKey })
    );
    await Promise.all(setKeyPromises);

    // 2. Reload your draft (pull in fresh uploadedFilesByCell from Apex)
    if (this.recordId) {
        const data = await getDraftWCFApplication({ recordId: this.recordId });
        this.uploadedFilesByCell = data.uploadedFilesByCell || {};
        // Optionally update other draft fields here if needed
    }
    // Optionally: show a toast
    this.showSuccessToast('File(s) uploaded and mapped successfully!');
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







handleDeleteFile(event) {
    const docId = event.target.dataset.docId;
    const cellKey = event.target.dataset.cellKey;
    this.uploadedFilesByCell[cellKey] = this.uploadedFilesByCell[cellKey].filter(f => f.documentId !== docId);
    this.uploadedFilesByCell = { ...this.uploadedFilesByCell };
    // Optionally: call Apex to delete the ContentDocumentLink/ContentVersion here
}

/*get showPreviewButton() {
    if (this.selectedFundingArea === 'Job Fulfillment Only') return this.isPage4;
    if (this.selectedFundingArea === 'Job Creation Only') return this.isPage5;
    if (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation') return this.isPage5;
    return false;
} */

handleSaveDraft() {
    // Always sync before saving!
    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();
     // ✅ Add current page to orgData before saving
    this.organizationData.Last_Page__c = this.currentPage;
    this.organizationData.Last_Page_Index__c = this.currentPageIndex; // optional but helpful

    // ✅ Set Language__c from URL before saving
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang') || 'English';

    if (langParam === 'Portuguese') {
        this.organizationData.Language__c = 'Portuguese';
    } else if (langParam === 'Spanish') {
        this.organizationData.Language__c = 'Spanish';
    } else {
        this.organizationData.Language__c = 'English';
    }

    console.log('💾 Saving with Language__c:', this.organizationData.Language__c);

    const orgData = {};
    const histData = {};
    const fiscalData = {};
    const outcomeData = {};

    // Merge objects safely
    Object.assign(orgData, this.organizationData);
    Object.assign(histData, this.historicalData);
    Object.assign(fiscalData, this.fiscalData);
    Object.assign(outcomeData, this.outcomeData);

    saveWCFDraftApplication({
        orgData: orgData,
        historicalData: histData,
        fiscalData: fiscalData,
        outcomeData: outcomeData,
        selectedFundingArea: this.selectedFundingArea,
        recordId: this.recordId,
        uploadedFileIds: this.uploadedFiles || []
    })
        .then((result) => {
            this.recordId = result.applicationId;
            if (result.historicId) this.historicalData.Id = result.historicId;
            if (result.fiscalId) this.fiscalData.Id = result.fiscalId;
            if (result.outcomeId) this.outcomeData.Id = result.outcomeId;

            this.showSuccessToast('Draft Saved Successfully!');
        })
        .catch((error) => {
            console.error('⚠️ Error saving draft:', error);

            let message = 'An unexpected error occurred while saving draft.';

            if (error && error.body) {
                if (error.body.message) {
                    message = error.body.message;
                } else if (error.body.pageErrors && error.body.pageErrors.length > 0) {
                    message = error.body.pageErrors[0].message;
                } else if (error.message) {
                    message = error.message;
                }
            }

            this.showErrorToast(message);
        });
}
showSuccessToast(msg) {
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




handleSubmit() {
    this.isLoading = true;
      // 2) Validate presence of Funding Opportunity
        if (!this.organizationData.FundingOpportunityId) {
            return this.dispatchEvent(new ShowToastEvent({
                title:   'Error',
                message: 'Funding Opportunity ID is missing!',
                variant: 'error'
            }));
        }
    
   submitWCFApplication({
       orgData: this.organizationData,
       historicalData: this.historicalData,
       fiscalData: this.fiscalData,
       outcomeData: this.outcomeData,
       uploadedFileIds: this.uploadedFiles || [],
       selectedFundingArea: this.selectedFundingArea,
       recordId: this.recordId
   })
    .then(result => {
        this.recordId = result;
        this.isLoading = false;

        this.dispatchEvent(
            new ShowToastEvent({
                title: this.labels.CL_Submit_Success_Title || 'Success',
                message: this.labels.CL_Submit_Success_Message || 'Application submitted successfully.',
                variant: 'success'
            })
        );

        // Optional: redirect to home or detail page
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: 'https://wadhwanifoundation--wfdev.sandbox.my.site.com/wcf/s/' // replace with your target path
            }
        });

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
}