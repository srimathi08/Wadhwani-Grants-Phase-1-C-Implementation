import { LightningElement, wire, track, api } from 'lwc';
import upsertAIFeedback from '@salesforce/apex/WCFFormController.upsertAIFeedback';
import getAIFeedbackRecord from '@salesforce/apex/WCFFormController.getAIFeedbackRecord';
import getPicklistValuesForField from '@salesforce/apex/WCFFormController.getPicklistValuesForField';
import saveWCFDraftApplication from '@salesforce/apex/WCFFormController.saveWCFDraftApplication';
import submitWCFApplication from '@salesforce/apex/WCFFormController.submitWCFApplication';
import getActiveFundingOpportunityId from '@salesforce/apex/WCFFormController.getActiveFundingOpportunityId';

import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { FlowNavigationBackEvent } from 'lightning/flowSupport';
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

export default class WcfForm extends NavigationMixin(LightningElement) {
    selectedLanguage = 'en_US';
    legalStructureWordCount = 0;
    showFunder2 = false;
showFunder3 = false;
// Word counter for Skilling Approach
skillingApproachWordCount = 0;

showReference2 = false;
jcApproachWordCount = 0;

@track businessSectors = [
    { sector: '', supportBegin: '', supportTypes: [], yearlyEnrolment: '' }
];
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

get portugueseClass() {
    return this.selectedLanguage === 'pt_BR'
        ? 'lang-option active-lang'
        : 'lang-option';
}
get progressSteps() {
    // Define step labels and which pages belong to each step
    // Step page ranges vary by funding area
    let stepDefs;

    if (this.selectedFundingArea === 'Job Creation Only') {
        stepDefs = [
            { label: 'About Your Organisation', pages: [1] },
            { label: 'What You Do',             pages: [2] },          // hidden/skipped
            { label: "What You've Delivered",   pages: [5] },
            { label: 'Why WCF',                 pages: [6] },
            { label: 'Review & Submit',         pages: [] }
        ];
    } else if (this.selectedFundingArea === 'Job Fulfillment Only') {
        stepDefs = [
            { label: 'About Your Organisation', pages: [1] },
            { label: 'What You Do',             pages: [2] },
            { label: "What You've Delivered",   pages: [3,4] },
            { label: 'Why WCF',                 pages: [6] },
            { label: 'Review & Submit',         pages: [] }
        ];
    } else if (this.selectedFundingArea === 'Both Job Fulfillment and Job Creation') {
        stepDefs = [
            { label: 'About Your Organisation', pages: [1] },
            { label: 'What You Do',             pages: [2] },
            { label: "What You've Delivered",   pages: [3,4, 5] },
            { label: 'Why WCF',                 pages: [6] },
            { label: 'Review & Submit',         pages: [] }
        ];
    } else {
        // Default / no selection yet
        stepDefs = [
            { label: 'About Your Organisation', pages: [1, 2] },
            { label: 'What You Do',             pages: [3] },
            { label: "What You've Delivered",   pages: [4, 5] },
            { label: 'Why WCF',                 pages: [6] },
            { label: 'Review & Submit',         pages: [] }
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
            ? 'tracker-bubble tracker-bubble--active'
            : 'tracker-bubble',
        labelClass: i === effectiveActive
            ? 'tracker-label tracker-label--active'
            : 'tracker-label'
    }));
}
    @track recordId = null; // to store existing draft ID
    @track organizationData = {};     // IndividualApplication__c fields
    @track historicalRecord = {};     // Historical_Data__c
    @track fiscalRecord = {};         // Current_fiscal_year_data__c
    @track outcomeRecord = {};        // Outcomes_Data__c
     winLogoUrl = WIN_LOGO;  
    @track isSavingDraft = false;
     @api languageCode;

     @track activeField = null;
     @track uploadedFiles = [];
    @track uploadedFilesByCell = {};
    @track invalidFileCells = {};
    @track isPreviewVisible = false;
   @track previewPage = 1;
   @track isAttested = false;
@track isSubmitPreviewOpen = false;
@track isOrientationComplete = false;
@track isAIModalOpen = false;
@track aiModalContent = '';
@track aiModalTitle = 'AI Feedback';
@track skillDomainsCFY = [{ domain: '', hours: '', duration: '', startDate: '', yearlyEnrolment: '' }];
@track skillDomainsFY1 = [{ domain: '', hours: '', duration: '', startDate: '', yearlyEnrolment: '' }];
@track skillDomainsFY2 = [{ domain: '', hours: '', duration: '', startDate: '', yearlyEnrolment: '' }];
@track skillDomainsFY3 = [{ domain: '', hours: '', duration: '', startDate: '', yearlyEnrolment: '' }];


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
        clickToAddExplanation: CL_Click_To_Add_Explanation,
        CL_Explanation_Note,
        CL_Attestation_Label,
        CL_File_Required_Message,   
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
        Job_Creation_Approach__c: '',
        Business_Sectors_JSON__c: '',
        Use_of_Additional_Funding_JC__c: '',
        Operational_Synergies_with_WOF_JC__c: '',
        Language__c: '',
        Last_Page__c: null
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
    @track isFeedbackPanelOpen = false;
    @track isFeedbackMinimized = true;
    @track isAiLoading = false;
    @track aiResponse = '';
    @track showAiFeedback = false;
    currentField = '';

// Tour state
    @track isTourModalOpen = false;

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
@track unifiedSkillDomains = [
    { period: 'CFY', domain: '', hours: '', duration: '', startDate: '', yearlyEnrolment: '' },

];

supportedAiFields = ['Legal_Structure__c', 'Organizational_Sustainability__c', 'Use_of_Additional_Funding__c',
'Operational_Synergies_with_WOF__c', 'Use_of_Additional_Funding_JC__c', 'Operational_Synergies_with_WOF_JC__c',
'Operational_Synergies_with_WOF_Both__c','Skilling_Approach__c','Job_Creation_Approach__c'];

get unifiedSkillDomainsIndexed() {
    return this.unifiedSkillDomains.map((row, i) => ({ ...row, idx: i }));
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
    return this.getOutcomePreview('Placements_Supporting_Family_of_4_FY1__c');
}
get placementSupportFY2Preview(){
    return this.getOutcomePreview('Placements_Supporting_Family_of_4_FY2__c');
}
get placementSupportFY3Preview(){
    return this.getOutcomePreview('Placements_Supporting_Family_of_4_FY3__c');
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
get isSubmitDisabled() {
    return !this.isAttested;
}
get formattedFundingOptions() {

    return (this.organizationalAreaValues || []).map(option => {

        let description = '';

        if (option.label.includes('Fulfillment')) {
            description =
                'Skilling, training, and placement into existing roles.';
        }
        else if (option.label.includes('Creation')) {
            description =
                'Entrepreneurship and MSME support that creates new employment.';
        }
        else {
            description =
                'Operating across both skilling and entrepreneurship.';
        }

        return {
            ...option,
            description,
            isSelected: this.selectedFundingArea === option.value,
            className:
                this.selectedFundingArea === option.value
                    ? 'option-card selected'
                    : 'option-card'
        };
    });
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
        if (editor) editor.innerHTML = this.modalValue;
    }, 0);
}

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

//pICKLIST VALUES OF OUTCOME TABLE
handleOutcomeInput(event) {
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
handleFundingSelection(event) {

    const selectedValue = event.currentTarget.dataset.value;

    this.selectedFundingArea = selectedValue;

    this.organizationData
        .Organizational_Area_s_for_Funding_Inves__c = selectedValue;

    // preserve existing logic
    this.handlePicklistChange({
        detail: { value: selectedValue }
    });
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


handleOutcomeCurrencyInput(event) {
    const field = event.target.dataset.id;
    const value = Number(event.target.value || 0);
    this.outcomeData[field] = value;
}

handleUnifiedSkillInput(event) {
    const index = parseInt(event.target.dataset.index);
    const field = event.target.dataset.field;
    const value = event.detail.value !== undefined ? event.detail.value : event.target.value;

    const arr = JSON.parse(JSON.stringify(this.unifiedSkillDomains));
    arr[index][field] = value;
    this.unifiedSkillDomains = arr;

    // Keep outcomeData in sync as JSON string
    this.outcomeData.Skills_Duration_CFY__c = JSON.stringify(
        this.unifiedSkillDomains.filter(r => r.period === 'CFY')
    );
    this.outcomeData.Skills_Duration_FY_1__c = JSON.stringify(
        this.unifiedSkillDomains.filter(r => r.period === 'FY1')
    );
    this.outcomeData.Skills_Duration_FY_2__c = JSON.stringify(
        this.unifiedSkillDomains.filter(r => r.period === 'FY2')
    );
    this.outcomeData.Skills_Duration_FY_3__c = JSON.stringify(
        this.unifiedSkillDomains.filter(r => r.period === 'FY3')
    );
}

// Add a new blank row
addUnifiedSkillRow() {
    this.unifiedSkillDomains = [
        ...this.unifiedSkillDomains,
        { period: 'CFY', domain: '', hours: '', duration: '', startDate: '', yearlyEnrolment: '' }
    ];
}

// Delete a row by index
deleteUnifiedSkillRow(event) {
    const index = parseInt(event.target.dataset.index);
    let arr = JSON.parse(JSON.stringify(this.unifiedSkillDomains));
    arr.splice(index, 1);
    if (arr.length === 0) {
        arr = [{ period: 'CFY', domain: '', hours: '', duration: '', startDate: '', yearlyEnrolment: '' }];
    }
    this.unifiedSkillDomains = arr;
}
handleBusinessSectorInput(event) {
    const index = parseInt(event.target.dataset.index, 10);
    const field = event.target.dataset.field;
    const value = event.target.value;
    const arr = JSON.parse(JSON.stringify(this.businessSectors));
    arr[index][field] = value;
    this.businessSectors = arr;
    this.organizationData.Business_Sectors_JSON__c = JSON.stringify(this.businessSectors);
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
    this.businessSectors = arr;
    this.organizationData.Business_Sectors_JSON__c = JSON.stringify(this.businessSectors);
}

addBusinessSector() {
    this.businessSectors = [
        ...this.businessSectors,
        { sector: '', supportBegin: '', supportTypes: [], yearlyEnrolment: '' }
    ];
}

deleteBusinessSector(event) {
    const index = parseInt(event.target.dataset.index, 10);
    let arr = JSON.parse(JSON.stringify(this.businessSectors));
    arr.splice(index, 1);
    if (arr.length === 0) {
        arr = [{ sector: '', supportBegin: '', supportTypes: [], yearlyEnrolment: '' }];
    }
    this.businessSectors = arr;
    this.organizationData.Business_Sectors_JSON__c = JSON.stringify(this.businessSectors);
}

restoreBusinessSectors() {
    const raw = this.organizationData.Business_Sectors_JSON__c;
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            this.businessSectors = parsed.map(r => ({
                sector: r.sector || '',
                supportBegin: r.supportBegin || '',
                supportTypes: Array.isArray(r.supportTypes) ? r.supportTypes : [],
                yearlyEnrolment: r.yearlyEnrolment || ''
            }));
        }
    } catch(e) { console.warn('restoreBusinessSectors error', e); }
}
// Restore unified rows from saved outcomeData (call this after loading a draft)
restoreUnifiedSkillDomains() {
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
            } catch(e) { /* not JSON */ }
        }
    });
    if (combined.length > 0) {
        this.unifiedSkillDomains = combined;
    }
}

handleSkillDomainInput(event) {
    const period = event.target.dataset.period;
    const index = parseInt(event.target.dataset.index);
    const field = event.target.dataset.field;
    const value = event.target.value;

    const propMap = {
        'CFY': 'skillDomainsCFY',
        'FY1': 'skillDomainsFY1',
        'FY2': 'skillDomainsFY2',
        'FY3': 'skillDomainsFY3'
    };
    const fieldMap = {
        'CFY': 'Skills_Duration_CFY__c',
        'FY1': 'Skills_Duration_FY_1__c',
        'FY2': 'Skills_Duration_FY_2__c',
        'FY3': 'Skills_Duration_FY_3__c'
    };

    const arr = JSON.parse(JSON.stringify(this[propMap[period]]));
    arr[index][field] = value;
    this[propMap[period]] = arr;
    this.outcomeData[fieldMap[period]] = JSON.stringify(arr);
}

addSkillDomainRow(event) {
    const period = event.target.dataset.period;
    const propMap = {
        'CFY': 'skillDomainsCFY',
        'FY1': 'skillDomainsFY1',
        'FY2': 'skillDomainsFY2',
        'FY3': 'skillDomainsFY3'
    };
    this[propMap[period]] = [
        ...this[propMap[period]],
        { domain: '', hours: '', duration: '', startDate: '', yearlyEnrolment: '' }
    ];
}

deleteSkillDomainRow(event) {
    const period = event.target.dataset.period;
    const index = parseInt(event.target.dataset.index);
    const propMap = {
        'CFY': 'skillDomainsCFY',
        'FY1': 'skillDomainsFY1',
        'FY2': 'skillDomainsFY2',
        'FY3': 'skillDomainsFY3'
    };
    const fieldMap = {
        'CFY': 'Skills_Duration_CFY__c',
        'FY1': 'Skills_Duration_FY_1__c',
        'FY2': 'Skills_Duration_FY_2__c',
        'FY3': 'Skills_Duration_FY_3__c'
    };
    let arr = JSON.parse(JSON.stringify(this[propMap[period]]));
    arr.splice(index, 1);
    if (arr.length === 0) {
        arr = [{ domain: '', hours: '', duration: '', startDate: '', yearlyEnrolment: '' }];
    }
    this[propMap[period]] = arr;
    this.outcomeData[fieldMap[period]] = JSON.stringify(arr);
}

restoreSkillDomainRows() {
    const map = {
        'CFY': { prop: 'skillDomainsCFY', field: 'Skills_Duration_CFY__c' },
        'FY1': { prop: 'skillDomainsFY1', field: 'Skills_Duration_FY_1__c' },
        'FY2': { prop: 'skillDomainsFY2', field: 'Skills_Duration_FY_2__c' },
        'FY3': { prop: 'skillDomainsFY3', field: 'Skills_Duration_FY_3__c' }
    };
    Object.keys(map).forEach(period => {
        const raw = this.outcomeData[map[period].field];
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this[map[period].prop] = parsed;
                }
            } catch(e) {
                console.log('Not JSON format, skipping restore for', period);
            }
        }
    });
}
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
get funderTypeOptions() {
    return [
        { label: 'Grant', value: 'Grant' },
        { label: 'Loan', value: 'Loan' },
        { label: 'Equity', value: 'Equity' },
        { label: 'In-Kind', value: 'In-Kind' }
    ];
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
get operationalSynergiesPreviewValue() {
    if (this.operationalSynergiesFieldApi) {
        return this.organizationData[this.operationalSynergiesFieldApi] || '';
    }
    return '';
}
get isSubmitDisabled() {
    return !this.isAttested;
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
    const SUPPORT_TYPES = ['Capital', 'Mentorship', 'Business Advisory', 'Market Linkages', 'Sector TA', 'Other'];
    return this.businessSectors.map((row, i) => ({
        ...row,
        idx: i,
        displayIdx: i + 1,
        supportTypeChips: SUPPORT_TYPES.map(label => ({
            label,
            chipClass: (row.supportTypes || []).includes(label) ? 'sector-chip selected' : 'sector-chip'
        }))
    }));
}
get showSkillingDomains() {
    return this.selectedFundingArea === 'Job Fulfillment Only' ||
           this.selectedFundingArea === 'Both Job Fulfillment and Job Creation';
}
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
    this.isAttested = false;
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
    this.isAttested = false;
}
handleAttestationChange(event) {
    this.isAttested = event.target.checked;
}
get showAIFeedbackPanel() {
    // Only show on Page 2 or Page 3
    return this.isPage2 || this.isPage3 || this.isPage6;
}


    connectedCallback() {

    console.log('🔄 connectedCallback fired');

    const params = new URLSearchParams(window.location.search);

    // GET ACTIVE LANGUAGE FROM LOCAL STORAGE
    this.selectedLanguage =
        localStorage.getItem('selectedLanguage') || 'en_US';

    console.log('🌐 Selected Language:', this.selectedLanguage);

    if (params.get('langReload') === 'true') {
        window.history.replaceState({}, '', window.location.pathname);
        window.location.reload();
    }

    // remaining code...

        // 1) Funding Opp
        console.log('📥 Fetching Funding Opportunity ID…');
        getActiveFundingOpportunityId()
          .then(id => {
            console.log('✅ Funding Opportunity ID:', id);
            this.organizationData.FundingOpportunityId = id;
          })
          .catch(err => console.error('❌ Funding Opp error:', err));
          
          
    this.showAiFeedback = true; // Ensures panel is visible from the beginning
    this.isFeedbackMinimized = true; // Starts minimized
    this.loadPicklist('IndividualApplication','Organizational_Area_s_for_Funding_Inves__c' ,'organizationalAreaValues')
     this.loadPicklist('Outcomes_Data__c','X3rd_Party_Placement_Verification_CFY__c', 'picklist3rdPartyCFY');
    this.loadPicklist('Outcomes_Data__c', 'X3rd_Party_Placement_Verification_FY_1__c', 'picklist3rdPartyFY1');
    this.loadPicklist('Outcomes_Data__c', 'X3rd_Party_Placement_Verification_FY_2__c', 'picklist3rdPartyFY2');
    this.loadPicklist('Outcomes_Data__c', 'X3rd_Party_Placement_Verification_FY_3__c', 'picklist3rdPartyFY3');

    this.loadPicklist('Outcomes_Data__c', 'Long_Term_Outcomes_CFY__c', 'picklistLongTermCFY');
    this.loadPicklist('Outcomes_Data__c', 'Long_Term_Outcomes_FY_1__c', 'picklistLongTermFY1');
    this.loadPicklist('Outcomes_Data__c', 'Long_Term_Outcomes_FY_2__c', 'picklistLongTermFY2');
    this.loadPicklist('Outcomes_Data__c', 'Long_Term_Outcomes_FY_3__c', 'picklistLongTermFY3');

    this.loadPicklist('Outcomes_Data__c', 'Job_Verification_3rd_Party_CFY__c','picklistJob3rdPartyCFY');
    this.loadPicklist('Outcomes_Data__c', 'Job_Verification_3rd_Party_FY1__c', 'picklistJob3rdPartyFY1');
    this.loadPicklist('Outcomes_Data__c', 'Job_Verification_3rd_Party_FY2__c', 'picklistJob3rdPartyFY2');
    this.loadPicklist('Outcomes_Data__c', 'Job_Verification_3rd_Party_FY3__c', 'picklistJob3rdPartyFY3');
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

 validateRichTextFields() {
            let isValid = true;
            const requiredFields = [];
        
            // Only validate from Page 2 to Page 7
            switch (this.currentPage) {
                case 1:
                 requiredFields.push(
                        { name: 'Legal_Structure__c', label: 'Legal Structure' }
            );
                    break;

                case 2:
                    if (this.showJFWhatYouDo) {
                    requiredFields.push({ name: 'Skilling_Approach__c', label: 'Your Skilling Approach' });
                    }
                    if (this.showJCWhatYouDo) {
                        requiredFields.push({ name: 'Job_Creation_Approach__c', label: 'Your Job Creation Approach' });
                    }
                    break;   

                case 3:
                    requiredFields.push({ name: 'Organizational_Sustainability__c', label: 'Organizational Sustainability' });
                        if (this.showBothJCQuestions) {
                        requiredFields.push({ name: 'Job_Creation_Approach__c', label: 'Your Job Creation Approach' });
                        }
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

                1:[
                    "Legal_Structure__c"
                ],
                2: [
                    "Skilling_Approach__c",
                    "Job_Creation_Approach__c"
                ],
                3: [
                    "Organizational_Sustainability__c",
                    "Job_Creation_Approach__c"

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
            console.log("Updated rich text fields for preview:", JSON.stringify(this.organizationData, null, 2));// applicationData
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
get unifiedSkillDomainsIndexed() {
    return this.unifiedSkillDomains.map((row, i) => ({ 
        ...row, 
        idx: i,
        displayIdx: i + 1   // ← add this
    }));
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
            "Operational_Synergies_with_WOF_Both__c",
            "Job_Creation_Approach__c"
        ];
    
        richTextFields.forEach(field => {
            if (this.organizationData[field]) {//applicationData
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
handleAddFunder() {

    if (!this.showFunder2) {

        this.showFunder2 = true;

    } else if (!this.showFunder3) {

        this.showFunder3 = true;
    }
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
    this.isOrientationComplete = true;
    this.currentPage = 1;
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

validateCurrentPageFields() {
    const inputs = this.template.querySelectorAll(
        'lightning-input, lightning-combobox, lightning-textarea'
    );
    let isValid = true;

    inputs.forEach(input => {
        if (input.required && input.offsetParent !== null) {
            if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
            }
        }
    });

    return isValid;
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

    // ✅ Add this block:
    if (!this.validateFileUploads()) {
        return; // toast already shown inside validateFileUploads()
    }

    this.syncCustomRichTextFields();
    this.updateRichTextFieldsForCurrentPage();

    let isValid = true;

    // Validate all required lightning fields on visible page
    const currentFields = this.template.querySelectorAll(
        'lightning-input[required], lightning-combobox[required], lightning-textarea[required]'
    );

    currentFields.forEach(input => {
        if (input.offsetParent !== null && !input.reportValidity()) {
            isValid = false;
        }
    });

    // Validate custom rich text
   // Validate custom rich text
    const isRichTextValid = this.currentPage === 1 ? true : this.validateRichTextFields();

    if (!isRichTextValid) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error',
            message: 'Please fill all required fields before proceeding.',
            variant: 'error'
        }));
        return;
    }

    // 🔑 Main Navigation Block
    if (this.currentPageIndex < this.pageSequence.length - 1) {
        this.currentPageIndex++;
        this.currentPage = this.pageSequence[this.currentPageIndex];
        setTimeout(() => this.restoreEditorContent(), 100);
        console.log('Moved to page:', this.currentPage, 'pageIndex:', this.currentPageIndex, 'pageSequence:', this.pageSequence);
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
 handlePrevious() {

      if (this.currentPage === 1) {
    this.currentPage = 0;
    return;
}
if (this.currentPage === 0) {
    this.dispatchEvent(new FlowNavigationBackEvent());
    return;

  }

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
    return this.currentPage === 0 || this.currentPage === 1;
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
    if (event.target.dataset.field === 'Skilling_Approach__c') {
    const text = event.target.innerText.trim().split(/\s+/).filter(w => w.length > 0);
    this.skillingApproachWordCount = text.length;
}
if (event.target.dataset.field === 'Job_Creation_Approach__c') {
    const text = event.target.innerText.trim().split(/\s+/).filter(w => w.length > 0);
    this.jcApproachWordCount = text.length;
}
const field = event.target.dataset.field;

    if (event.target.contentEditable === 'true') {
        this.organizationData[field] = event.target.innerHTML;
    } else {
        this.organizationData[field] = event.target.value;
    }

    console.log(field, this.organizationData[field]);
    if (event.target.dataset.field === 'Legal_Structure__c') {

    const text = event.target.innerText
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0);

    if (text.length > 100) {

        event.preventDefault();

        const trimmed = text.slice(0, 100).join(' ');

        event.target.innerText = trimmed;

        this.legalStructureWordCount = 100;

    } else {

        this.legalStructureWordCount = text.length;
    }

}
}

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
get formattedAiSections() {

    if (!this.aiResponse) {
        return [];
    }

    const sections = [];

    const labels = ['Rating', 'Strengths', 'Weaknesses', 'Summary'];

    labels.forEach((label, index) => {

        const nextLabel = labels[index + 1];

        const regex = nextLabel
            ? new RegExp(`${label}\\s*:?([\\s\\S]*?)(?=${nextLabel}\\s*:?)`, 'i')
            : new RegExp(`${label}\\s*:?([\\s\\S]*)`, 'i');

        const match = this.aiResponse.match(regex);

        if (match && match[1]) {

            const content = match[1]
                .replace(/-/g, '\n-')
                .split('\n')
                .map(item => item.replace(/^-/, '').trim())
                .filter(item => item);

            sections.push({
                title: label,
                points: content
            });
        }
    });

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

    const fieldApiName =
        event.currentTarget.dataset.id;

    const submitterName =
        this.organizationData['Submitter_Name__c'] || '';

    let fieldValue = '';

    /* =====================================================
       GET RICH TEXT VALUE
    ===================================================== */

    const customRichText = this.template.querySelector(
        `.modern-richtext-area[data-field="${fieldApiName}"]`
    );

    if (customRichText) {

        fieldValue = customRichText.innerHTML;

        this.organizationData[fieldApiName] =
            fieldValue;

    } else {

        fieldValue =
            this.organizationData[fieldApiName] || '';
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
    ===================================================== */

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

                'Job_Creation_Approach__c': 'Job_Creation_Approach_FR__c'
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
        this.pageSequence = [1, 2, 3, 4, 6];
    } else if (JOB_CREATION.includes(this.selectedFundingArea)) {
        this.pageSequence = [1, 2, 5, 6];
    } else if (BOTH.includes(this.selectedFundingArea)) {
        this.pageSequence = [1, 2, 3, 4, 5, 6];
    } else {
        this.pageSequence = [1]; // fallback
    }

    this.currentPageIndex = 0;
    this.currentPage = this.pageSequence[0];
}
legalTypeOptions = [
    { label: '— Select type —', value: '' },

    { label: 'Non-profit', value: 'Non-profit' },

    { label: 'For-profit', value: 'For-profit' },

    { label: 'Hybrid', value: 'Hybrid' },

    { label: 'Government-affiliated', value: 'Government-affiliated' },

    { label: 'Other', value: 'Other' }
];
countryOptions = [
    { label: '— Select country —', value: '' },

    { label: 'Brazil', value: 'Brazil' },

    { label: 'India', value: 'India' },

    { label: 'Indonesia', value: 'Indonesia' },

    { label: 'Mexico', value: 'Mexico' },

    { label: 'Philippines', value: 'Philippines' },

    { label: 'United States', value: 'United States' },

    { label: 'Other', value: 'Other' }
];

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


handleUploadFinished(event) {
    const cellKey = event.target.dataset.cellKey;
    const files = event.detail.files;
    if (!this.uploadedFilesByCell[cellKey]) this.uploadedFilesByCell[cellKey] = [];
    files.forEach(file => {
        this.uploadedFilesByCell[cellKey].push({ documentId: file.documentId, name: file.name });
    });
    this.uploadedFilesByCell = { ...this.uploadedFilesByCell };
    event.detail.files.forEach(file => {
        this.uploadedFiles.push(file.documentId);
    });
}

validateFileUploads() {
    const area = this.selectedFundingArea;

    const isJobFulfillment =
        area === 'Job Fulfillment Only' ||
        area === 'Both Job Fulfillment and Job Creation';

    const isJobCreation =
        area === 'Job Creation Only' ||
        area === 'Both Job Fulfillment and Job Creation';

    let missingFiles = [];

    // Reset highlights
    this.invalidFileCells = {};

    // ===== PAGE 4 =====
    if (this.currentPage === 4 && isJobFulfillment) {

        const pvCells = [
            { key: 'P4_CFY_PV', field: 'X3rd_Party_Placement_Verification_CFY__c', label: `${this.labels.CL_Placement_Verification} - ${this.labels.CL_Current_Fiscal_Year}` },
            { key: 'P4_FY1_PV', field: 'X3rd_Party_Placement_Verification_FY_1__c', label: `${this.labels.CL_Placement_Verification} - ${this.labels.CL_Prior_Fiscal_Year}` },
            { key: 'P4_FY2_PV', field: 'X3rd_Party_Placement_Verification_FY_2__c', label: `${this.labels.CL_Placement_Verification} - ${this.labels.CL_2_Years_Prior}` },
            { key: 'P4_FY3_PV', field: 'X3rd_Party_Placement_Verification_FY_3__c', label: `${this.labels.CL_Placement_Verification} - ${this.labels.CL_3_Years_Prior}` }
        ];

        const ltCells = [
            { key: 'P4_CFY_LT', field: 'Long_Term_Outcomes_CFY__c', label: `${this.labels.CL_Long_Term_Outcomes} - ${this.labels.CL_Current_Fiscal_Year}` },
            { key: 'P4_FY1_LT', field: 'Long_Term_Outcomes_FY_1__c', label: `${this.labels.CL_Long_Term_Outcomes} - ${this.labels.CL_Prior_Fiscal_Year}` },
            { key: 'P4_FY2_LT', field: 'Long_Term_Outcomes_FY_2__c', label: `${this.labels.CL_Long_Term_Outcomes} - ${this.labels.CL_2_Years_Prior}` },
            { key: 'P4_FY3_LT', field: 'Long_Term_Outcomes_FY_3__c', label: `${this.labels.CL_Long_Term_Outcomes} - ${this.labels.CL_3_Years_Prior}` }
        ];

        [...pvCells, ...ltCells].forEach(({ key, field, label }) => {
            const isYes = this.outcomeData[field] === this.yesLabelMap[field];

            const hasFiles =
                this.uploadedFilesByCell[key] &&
                this.uploadedFilesByCell[key].length > 0;

            if (isYes && !hasFiles) {
                missingFiles.push(label);
                this.invalidFileCells[key] = true;
            }
        });
    }

    // ===== PAGE 5 =====
    if (this.currentPage === 5 && isJobCreation) {

        const jvCells = [
            { key: 'P5_CFY_JV', field: 'Job_Verification_3rd_Party_CFY__c',  label: `${this.labels.CL_Job_Creation_Verification} - ${this.labels.CL_Current_Fiscal_Year}` },
            { key: 'P5_FY1_JV', field: 'Job_Verification_3rd_Party_FY1__c', label: `${this.labels.CL_Job_Creation_Verification} - ${this.labels.CL_Prior_Fiscal_Year}` },
            { key: 'P5_FY2_JV', field: 'Job_Verification_3rd_Party_FY2__c', label: `${this.labels.CL_Job_Creation_Verification} - ${this.labels.CL_2_Years_Prior}` },
            { key: 'P5_FY3_JV', field: 'Job_Verification_3rd_Party_FY3__c', label: `${this.labels.CL_Job_Creation_Verification} - ${this.labels.CL_3_Years_Prior}` }
        ];

        jvCells.forEach(({ key, field, label }) => {
            const isYes = this.outcomeData[field] === this.yesLabelMap[field];

            const hasFiles =
                this.uploadedFilesByCell[key] &&
                this.uploadedFilesByCell[key].length > 0;

            if (isYes && !hasFiles) {
                missingFiles.push(label);
                this.invalidFileCells[key] = true;
            }
        });
    }

    // Force reactivity
    this.invalidFileCells = { ...this.invalidFileCells };

    if (missingFiles.length > 0) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'File Attachment Required',
            message: `${this.labels.CL_File_Required_Message}: ${missingFiles.join(', ')}`,
            variant: 'error',
            mode: 'sticky'
        }));
        return false;
    }

    return true;
}

handleDeleteFile(event) {
    const docId = event.target.dataset.docId;
    const cellKey = event.target.dataset.cellKey;
    this.uploadedFilesByCell[cellKey] = this.uploadedFilesByCell[cellKey].filter(f => f.documentId !== docId);
    this.uploadedFilesByCell = { ...this.uploadedFilesByCell };
    // Optionally: call Apex to delete the ContentDocumentLink/ContentVersion here
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


// Helper to check if any value is filled (non-empty, non-null, not just whitespace)
isDataFilled(dataObj) {
    if (!dataObj) return false;
    return Object.values(dataObj).some(val =>
        val !== null && val !== '' && val !== undefined && !(typeof val === 'number' && isNaN(val))
    );
}


async handleSaveDraft() {
    try {
        console.log('✅ Starting Save Draft');

        // 🧼 Normalize date
        if (this.organizationData.Current_fiscal_year_s_end_date__c) {
            this.organizationData.Current_fiscal_year_s_end_date__c =
                this.organizationData.Current_fiscal_year_s_end_date__c.split('T')[0];
        }

        // 🌐 Set Language__c from URL
        const params = new URLSearchParams(window.location.search);
        let langParam = params.get('lang') || 'English';

        if (langParam == 'Portuguese') {
            this.organizationData.Language__c = 'Portuguese';
            this.languageCode = 'pt';
        } else if (langParam == 'Spanish') {
            this.organizationData.Language__c = 'Spanish';
            this.languageCode = 'es';
        } else {
            this.organizationData.Language__c = 'English';
            this.languageCode = 'en';
        }
        console.log('🌐 Language__c set to:', this.organizationData.Language__c);


     // Use filtering before sending
        const historicalToSend = this.isDataFilled(this.historicalData) ? this.historicalData : null;
        const fiscalToSend     = this.isDataFilled(this.fiscalData)     ? this.fiscalData     : null;
        const outcomeToSend    = this.isDataFilled(this.outcomeData)    ? this.outcomeData    : null;
        
       console.log('historicalToSend', historicalToSend);
        console.log('fiscalToSend'+fiscalToSend);
        console.log('outcomeToSend', outcomeToSend);
        const isCreateAttempt = !this.recordId;
        this.organizationData.Last_Page__c = this.currentPage;

        const result = await saveWCFDraftApplication({
            applicationId: this.recordId,
            orgData: this.organizationData,
            historicalData: historicalToSend, //this.historicalData
            fiscalData: fiscalToSend, //this.fiscalData
            outcomeData: outcomeToSend, //this.outcomeData
            selectedFundingArea: this.selectedFundingArea,
            uploadedFileIds: this.uploadedFiles || []
        });

        // ✅ Store all returned IDs
        this.recordId = result.applicationId;
        if (result.historicId) this.historicalData.Id = result.historicId;
        if (result.fiscalId) this.fiscalData.Id = result.fiscalId;
        if (result.outcomeId) this.outcomeData.Id = result.outcomeId;

          /*    const filesByCell = {};
              for (const key in this.uploadedFilesByCell) {
            filesByCell[key] = this.uploadedFilesByCell[key].map(file => file.documentId);
              }
             upsertOutcomeFileMappings({ outcomeId: this.outcomeData.Id, filesByCell: filesByCell });*/

        // ✅ Success message
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
               // message: isCreateAttempt ? 'Draft created successfully.' : 'Draft updated successfully.',
                message: 'Draft saved successfully! You can resume from the Drafts page.',
                variant: 'success'
            })
        );
         /*setTimeout(() => {
            window.location.href = 'https://wadhwanifoundation--wfdev.sandbox.my.site.com/wcf/s/draft-wcf-proposal';
            }, 2000); */ // 2 seconds delay for toast visibility
        
    } catch (error) {
        console.error('❌ Save Draft Error:', JSON.stringify(error, null, 2));

        let message = 'Something went wrong while saving the draft.';
        if (error?.body?.message) {
            message = error.body.message;
        } else if (error?.body?.pageErrors?.length > 0) {
            message = error.body.pageErrors[0].message;
        } else if (error?.message) {
            message = error.message;
        }

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: message,
                variant: 'error'
            })
        );
    }
}


handleSubmit() {
    this.isLoading = true;
    this.isPreviewVisible = false;  // ← close preview modal
    this.isAttested = false;        // ← reset attestation
    
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