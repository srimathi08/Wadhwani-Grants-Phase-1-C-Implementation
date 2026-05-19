import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import PRIMARY_FOCUS_AREA from '@salesforce/schema/IndividualApplication.Primary_Focus_Area__c';
import SUB_FOCUS_AREA from '@salesforce/schema/IndividualApplication.Sub_Focus_Area__c';
import PRIOR_RESEARCH_FUNDING from '@salesforce/schema/IndividualApplication.Prio_Research_Funding_Yes_No__c';
import COLLABORATION_INCUBATOR from '@salesforce/schema/IndividualApplication.Collaboration_with_Institute_Incubator__c';
import INSTITUTION from '@salesforce/schema/IndividualApplication.Institution__c';
import INDIVIDUALAPPLICATION_OBJECT from '@salesforce/schema/IndividualApplication';
import getLoggedInUserDetails from '@salesforce/apex/WinApplicationFormController.getLoggedInUserDetails';
import saveApplicationWithMilestones from '@salesforce/apex/WinApplicationFormController.saveApplicationWithMilestones';


export default class Win_ApplicationForm extends LightningElement {
    @api recordId;   // Funding Opportunity ID
    @track applicationRecordId; // Stores Application_Form__c ID after creation
   
    @track showForm = false; // Initially hide form
    @track isButtonDisabled = false; // Apply Now button is enabled initially

    @track primaryFocusAreaOptions = [];
    @track subFocusAreaOptions = [];
    @track applicationData = {
        Project_Title__c: '',
        Institution__c: '',
        Principal_Investigator__c: '',
        Co_Principal_Investigator_Co_PI__c: '',
        Project_Team_Members__c: '',
        Primary_Focus_Area__c: '',
        Sub_Focus_Area__c: '',
        Project_Duration__c: '',
        Project_Website_if_any__c: '',
        Project_Summary_Max_500_words__c: '',
        Current_Technology_Readiness_Level_TRL__c: '',
        Key_Problem_Being_Solved__c: '',
        Proposed_Solution__c: '',
        Interdisciplinary_Nature__c: '',
        Potential_for_Commercialization__c: '',
        Target_Market_Industry_Application__c: '',
        Competitive_Landscape__c: '',
        Exit_Strategy_of_project__c: '',
        Proposed_WIN_Grant_Utilization__c: '',
        Prio_Research_Funding_Yes_No__c: '',
        List_of_Existing_Funding_Sources_and_Fun__c: '',
        Additional_Funding_Plans__c: '',
        Institute_Support_Facilities__c: '',
        Collaboration_with_Institute_Incubator__c: '',
        WIN_Support__c: '',
        Expected_Impact_Socio_economic_Scientif__c: '',
        Potential_for_Startup_Formation__c: '',
        IP_Patent_Potential__c: '',
        Expected_Revenue_Model_if_applicable__c: '',
        FundingOpportunityId: '',
        Category: '',
        Status: '',
        Institution_Name__c : '',
        Principal_Investigator_PI__c: ''

    }; 

    @track currentPage = 1; //Pagination

    @track validateTRL; // Validation TRL field declaration
    
    //Picklist Values declaration
    @track primaryFocusAreaOptions = [];
    @track subFocusAreaOptions = [];
    @track priorResearchFundingOptions = [];
    @track collaborationOptions = [];
    @track InstitutionOptions = [];

    //File upload declarations
    @track fileUploadFields = [
        { name: 'Project_Dossier', label: 'Project Dossier', helpText: 'Detailed project proposal, research data, technical specifications, etc.', uploadedFileName: '' },
        { name: 'Previous_Funding_Approvals', label: 'Previous Funding Approvals', helpText: 'Grant letters, funding agreements, etc.', uploadedFileName: '' },
        { name: 'Patent_Filings', label: 'Patent Filings (if applicable)', helpText: '' , uploadedFileName: '' },
        { name: 'Letters_of_Support', label: 'Letters of Support', helpText: 'From industry partners, incubators, or other stakeholders', uploadedFileName: '' },
        { name: 'Other_Documents', label: 'Any Other Relevant Documents', helpText: '' ,uploadedFileName: '' }
    ];
    
    
    @track uploadedFiles = []; // To store uploaded file details
    @track milestones = Array.from({ length: 5 }, (_, index) => ({
        uniqueId: index + 1,
        Milestone_Description__c: '',
        Budget_Required__c: '',
        Milestone_Target_Date__c: '',
        Justification__c: ''
    }));

    @wire(getObjectInfo, { objectApiName: INDIVIDUALAPPLICATION_OBJECT })
    objectInfo;

    //Get the Picklist value for the Primary Focus Area from Individual Application Object
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: PRIMARY_FOCUS_AREA })
    wiredPrimaryFocusPicklistValues({ error, data }) {
        if (data) {
            this.primaryFocusAreaOptions = data.values;
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }

    //Get the Picklist value for the Sub Focus Area from Individual Application Object
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SUB_FOCUS_AREA })
    wiredSubFocusPicklistValues({ error, data }) {
        if (data) {
            this.subFocusAreaOptions = data.values;
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }

    //Get the Picklist value for the Prior Research Funding from Individual Application Object
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: PRIOR_RESEARCH_FUNDING })
    wiredPriorResearchPicklistValues({ error, data }) {
        if (data) {
            this.priorResearchFundingOptions = data.values;
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }

    //Get the Picklist value for the Collaboration Incubator from Individual Application Object
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: COLLABORATION_INCUBATOR })
    wiredCollaborationPicklistValues({ error, data }) {
        if (data) {
            this.collaborationOptions = data.values;
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }

    //Get the Picklist value for the Institution Name from Individual Application Object
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: INSTITUTION })
    wiredInstitutionPicklistValues({ error, data }) {
        if (data) {
            this.InstitutionOptions = data.values;
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }


    // Function to show the application form
    handleApplyNow() {
        this.showForm = true;
        this.isButtonDisabled = true; // Disable button after clicking
    }

    // Fetch Account and Contact Name
   /* @wire(getLoggedInUserDetails)
    wiredUserDetails({ error, data }) {
        if (data) {
            this.applicationData.Account__c = data.AccountId;
            this.applicationData.Principal_Investigator_PI__c = data.ContactId;
        } else if (error) {
            console.error('Error fetching user details:', error);
        }
    } */

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
                
        
        handleNext() {        
        if (this.currentPage < 6) {        
        this.currentPage += 1;       
        }        
        }
                
        handlePrevious() {       
        if (this.currentPage > 1) {       
        this.currentPage -= 1;   
        }  
        }

      
        
       
        

    //Validate the TRL field function
    handleValidateTRL(event) {
        const value = event.target.value;
        if (value <= 3) {
            event.target.setCustomValidity('TRL level must be greater than 3');
        } else {
            event.target.setCustomValidity(''); // Clear error if valid
        }
        event.target.reportValidity();
        //this.validateTRL = value;
        this.applicationData.Current_Technology_Readiness_Level_TRL__c = value; 
    }

    handleInputChange(event) {
        const fieldName = event.target.name;
        const fieldValue = event.target.value;

          // Convert numeric fields properly
         const numericFields = [
        'Project_Duration__c',
        'Current_Technology_Readiness_Level_TRL__c'
    ];

    if (numericFields.includes(fieldName)) {
        fieldValue = fieldValue ? parseFloat(fieldValue) : null; // Convert to number, set null if empty
    }
    
        // Store the value in applicationData persistently
        this.applicationData = { ...this.applicationData, [fieldName]: fieldValue };
    }
    

    handleMilestoneChange(event) {
        const field = event.target.dataset.field;
        const uniqueId = parseInt(event.target.dataset.id, 10);
        this.milestones = this.milestones.map(milestone =>
            milestone.uniqueId === uniqueId ? { ...milestone, [field]: event.target.value } : milestone
        );
    }
    
    addRow() {
        let newId = this.milestones.length + 1;
        this.milestones = [...this.milestones, {
            uniqueId: newId,
            Milestone_Description__c: '',
            Budget_Required__c: '',
            Milestone_Target_Date__c: '',
            Justification__c: ''
        }];
    }

    handleFileUpload(event) {
        const uploadedFiles = event.detail.files;
        if (uploadedFiles.length > 0) {
            const uploadedFile = uploadedFiles[0];
            let fieldName = event.target.name;
    
            // Update file name display in UI
            this.fileUploadFields = this.fileUploadFields.map(file => {
                if (file.name === fieldName) {
                    return { ...file, uploadedFileName: uploadedFile.name };
                }
                return file;
            });
    
            // Just add the new file without checking for duplicates
            this.uploadedFiles.push({ documentId: uploadedFile.documentId, name: uploadedFile.name });
        }
    }
    
    connectedCallback() {
        console.log('Record ID received:', this.recordId); // Check if recordId is available
       
            getLoggedInUserDetails()
                .then(result => {
                    if (result) {
                        this.applicationData.Institution__c = result.AccountName; // Display Account Name
                        this.applicationData.Principal_Investigator__c = result.ContactName; // Display Contact Name
        
                        // Store Ids for lookup fields when saving
                        this.applicationData.AccountId = result.AccountId;
                        this.applicationData.ContactId = result.ContactId;
                    }
                })
                .catch(error => {
                    console.error('Error fetching user details:', error);
                });
        }
         
    

   // PREVIEW MODE LOGIC
   @track isPreviewVisible = false;
   @track previewPage = 1;

   get isPreviewPage1() { return this.previewPage === 1; }
   get isPreviewPage2() { return this.previewPage === 2; }
   get isPreviewPage3() { return this.previewPage === 3; }
   get isPreviewPage4() {return this.previewPage ===  4; }
   get isPreviewPage5() { return this.previewPage === 5; }
   get isPreviewPage6() { return this.previewPage === 6; }
   get isFirstPreviewPage() { return this.previewPage === 1; }
   get isLastPreviewPage() { return this.previewPage === 6; }

   handlePreview() {
       this.previewPage = 1;
       this.isPreviewVisible = true;
   }

   handlePreviewNext() {
       if (this.previewPage < 6) this.previewPage += 1;
   }

   handlePreviewPrevious() {
       if (this.previewPage > 1) this.previewPage -= 1;
   }

   handleClosePreview() {
       this.isPreviewVisible = false;
   }

   get filledMilestones() {
       return this.milestones.filter(m =>
           m.Milestone_Description__c.trim() !== '' ||
           m.Budget_Required__c.trim() !== '' ||
           m.Milestone_Target_Date__c.trim() !== '' ||
           m.Justification__c.trim() !== ''
       );
   }

    
    handleSubmit() {

        console.log('Submitting with Record ID:', this.recordId);


        this.applicationData.FundingOpportunityId = this.recordId;
        console.log('Application Data fo ', this.applicationData.FundingOpportunityId);

  // Assign the recordId properly before submission
  //const applicationData = { ...this.applicationData, FundingOpportunityId: this.recordId };

  //console.log('Final Application Data:', JSON.stringify(applicationData));

        if (!this.recordId) {
            console.log('Funding Opportunity ID:', this.recordId); 
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Funding Opportunity Id is missing!',
                variant: 'error'
            }));
            return;
        }

        

  // Hardcode additional field values
    this.applicationData.Category = 'Grant Application';
    this.applicationData.Status = 'Submitted';

    //AccountId and ContactId of the User
    this.applicationData.Institution_Name__c = this.applicationData.AccountId; // Save as AccountId
    this.applicationData.Principal_Investigator_PI__c = this.applicationData.ContactId; // Save as ContactId


    console.log('category ', this.applicationData.Category);

        const filledMilestones = this.milestones.filter(milestone =>
            milestone.Milestone_Description__c.trim() !== '' ||
            milestone.Budget_Required__c.trim() !== '' ||
            milestone.Milestone_Target_Date__c.trim() !== '' ||
            milestone.Justification__c.trim() !== ''
        );

        console.log( this.applicationData);

        saveApplicationWithMilestones({
            applicationData: this.applicationData,  
            milestones: filledMilestones,
            fileIds: this.uploadedFiles.map(file => file.documentId) // file upload
           
        })
      
        .then((applicationId) => {
            this.applicationRecordId = applicationId;
            console.log('Application ID:', applicationId);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Application, Milestones and Files Submitted!',
                variant: 'success'
            }));
            this.isPreviewVisible = false; // Close the preview modal
        })
        .catch(error => {
            let errorMessage = 'An unknown error occurred';
        
            if (error.body) {
                if (Array.isArray(error.body)) {
                    errorMessage = error.body.map(e => e.message).join(', ');
                } else if (typeof error.body.message === 'string') {
                    errorMessage = error.body.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
        
            console.error('❌ Submission Error:', JSON.stringify(error, null, 2)); // Detailed error in console
        
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: errorMessage,
                    variant: 'error'
                })
            );
        });
        
    }

}