import label_formTitle from '@salesforce/label/c.CL_WCF_Form_Title';
import label_introParagraph from '@salesforce/label/c.WCF_Paragraph_1';
import label_preferredLanguage from '@salesforce/label/c.CL_Language';
import label_orgAreaFunding from '@salesforce/label/c.CL_Organizational_Area_s_for_Funding_Investment';
import label_sectionGeneral from '@salesforce/label/c.CLS_General';
import label_sectionOrgInfo from '@salesforce/label/c.CLS_Organizational_Identifying';
import label_sectionContactInfo from '@salesforce/label/c.CLS_Submitter_Contact_Info';
import label_orgName from '@salesforce/label/c.CL_Organizational_Name';
import label_hqCityCountry from '@salesforce/label/c.CL_Headquarters_City_and_Country';
import label_primaryRegions from '@salesforce/label/c.CL_Primary_Service_Regions';
import label_leaderName from '@salesforce/label/c.CL_Leader_Name';
import label_leaderTitle from '@salesforce/label/c.CL_Leader_Title';
import label_submitterName from '@salesforce/label/c.CL_Submitter_Name';
import label_jobTitle from '@salesforce/label/c.CL_Title';
import label_email from '@salesforce/label/c.CL_Email_Address';
import label_phone from '@salesforce/label/c.CL_Phone_number';
import label_legalStructure from '@salesforce/label/c.CL_Legal_Structure';
import label_aiFeedbackTitle from '@salesforce/label/c.CL_AI_Feedback';
import label_next from '@salesforce/label/c.CL_Next';
import label_previous from '@salesforce/label/c.CL_Previous';
import label_saveDraft from '@salesforce/label/c.CL_Save_Draft';
import label_clickToAddExplanation from '@salesforce/label/c.CL_Click_To_Add_Explanation';

// NOTE: You need to translate these labels using Translation Workbench

const sharedLabels = {
    formTitle: label_formTitle,
    introParagraph: label_introParagraph,
    preferredLanguage: label_preferredLanguage,
    sectionGeneral: label_sectionGeneral,
    orgAreaFunding: label_orgAreaFunding,
    sectionOrgInfo: label_sectionOrgInfo,
    orgName: label_orgName,
    hqCityCountry: label_hqCityCountry,
    primaryRegions: label_primaryRegions,
    leaderName: label_leaderName,
    leaderTitle: label_leaderTitle,
    sectionContactInfo: label_sectionContactInfo,
    submitterName: label_submitterName,
    jobTitle: label_jobTitle,
    email: label_email,
    phone: label_phone,
    legalStructure: label_legalStructure,
    aiFeedbackTitle: label_aiFeedbackTitle,
    next: label_next,
    previous: label_previous,
    saveDraft: label_saveDraft,
    clickToAddExplanation: label_clickToAddExplanation
};

export function getLabels(langCode) {
    return sharedLabels; // Translation Workbench handles language rendering
}