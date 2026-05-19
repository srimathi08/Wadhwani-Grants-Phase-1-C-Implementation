import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import PRIMARY_FIELD from '@salesforce/schema/IndividualApplication.Primary_Focus_Area__c';
import SUB_FIELD from '@salesforce/schema/IndividualApplication.Sub_Focus_Area__c';
import PRIOR_RESEARCH_FUNDING from '@salesforce/schema/IndividualApplication.Prio_Research_Funding_Yes_No__c';
import COLLABORATION_INCUBATOR from '@salesforce/schema/IndividualApplication.Collaboration_with_Institute_Incubator__c';
import TRL_FIELD from '@salesforce/schema/IndividualApplication.Current_Technology_Readiness_Level_TRL__c'; 
import INDIVIDUALAPPLICATION_OBJECT from '@salesforce/schema/IndividualApplication';
import getLoggedInUserDetails from '@salesforce/apex/WinApplicationFormController.getLoggedInUserDetails';
import saveApplicationWithMilestones from '@salesforce/apex/WinApplicationFormController.saveApplicationWithMilestones';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import getActiveFundingOpportunityId from '@salesforce/apex/WinApplicationFormController.getActiveFundingOpportunityId';



export default class Win_ApplicationForm extends LightningElement {
    //@api recordId;   // Funding Opportunity ID
    @track applicationRecordId; // Stores Application_Form__c ID after creation
    winLogoUrl = WIN_LOGO; // Set logo URL
   
    @track showForm = true; // Initially hide form
    //@track isButtonDisabled = false; // Apply Now button is enabled initially
    showFundingSources = false;

    
    @track activeField = null; 

    @track isModalOpen = false;
    @track modalValue = '';
    @track modalField = '';
    @track modalRowId = null;
    @track modalTitle = '';

    @track primaryFocusAreaOptions = [];
    @track subFocusAreaOptions = [];
    @track selectedPrimaryFocusArea;
    @track selectedSubFocusAreas = [];
  

    @track applicationData = {
        Project_Title__c: '',
        COE_Admin__c: '',
        PI_Name__c: '',
        PI_Phone__c:'',
        PI_Email__c:'',
        Co_Principal_Investigator_Co_PI__c: '',
        Co_PI_Phone__c:'',
        Co_PI_Email__c:'',
        Project_Team_Members__c: '',
        Primary_Focus_Area__c: '',
        Sub_Focus_Area__c: '',
        Project_Start_Date__c: '',
        Project_End_Date__c: '',
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
        ApplicationType: '',
        Category: '',
        Status: '',
        Institution_Name__c : '',
        Principal_Investigator_PI__c: '',
        recordTypeId: '',
        Uploaded_Files__c: ''

    }; 

    @track currentPage = 1; //Pagination

    @track validateTRL; // Validation TRL field declaration
    
    //Picklist Values declaration
    @track primaryFocusAreaOptions = [];
    @track subFocusAreaOptions = [];
    @track priorResearchFundingOptions = [];
    @track collaborationOptions = [];
    @track trlOptions = [];

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
        Deliverables__c: '',
        Budget_Required__c: '',
        Milestone_Target_Date__c: '',
        Justification__c: ''
    }));

    @wire(getObjectInfo, { objectApiName: INDIVIDUALAPPLICATION_OBJECT })
    objectInfo;

    //Get the Picklist value for the Primary Focus Area from Individual Application Object
  /*  @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: PRIMARY_FOCUS_AREA })
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
    } */

     // Fetch controlling picklist values
    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId', 
        fieldApiName: PRIMARY_FIELD
    })
    wiredPrimaryPicklist({data, error}) {
        if (data) {
            this.primaryFocusAreaOptions = data.values;
        } else if (error) {
            console.error('Error fetching primary picklist values:', error);
        }
    }

    
    // Fetch dependent picklist values
    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId', 
        fieldApiName: SUB_FIELD
    })
    subPicklistValues;

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

 

    //Get the Picklist value for the Collaboration Incubator from Individual Application Object
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: TRL_FIELD })
    wiredTrlPicklistValues({ error, data }) {
        if (data) {
            this.trlOptions = data.values;
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }

    handlePrimaryFocusChange(event) {
        this.applicationData.Primary_Focus_Area__c = event.detail.value;
    
        const controllerValueIndex = this.subPicklistValues.data.controllerValues[event.detail.value];
    
        this.subFocusAreaOptions = this.subPicklistValues.data.values.filter(option =>
            option.validFor.includes(controllerValueIndex)
        );
    
        // Reset dependent picklist array correctly
        this.applicationData.Sub_Focus_Area__c = [];
    }
    handleSubFocusChange(event) {
        // Assign directly as array
        this.applicationData.Sub_Focus_Area__c = event.detail.value;
    }
        
    
    // Function to show the application form
 /*   handleApplyNow() {
        //this.showForm = true;
        this.isButtonDisabled = true; // Disable button after clicking
        this.isThankYouScreen = false;
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
                
        
      /*  handleNext() {        
        if (this.currentPage < 6) {        
        this.currentPage += 1; 

          // Restore cleaned rich text content when moving to previous page
          setTimeout(() => {
            this.restoreEditorContent();
        }, 100);
         // Reset scroll position to top
         this.template.querySelector('.scrollable-content').scrollTop = 0;
        }        
        }
                
        handlePrevious() {       
        if (this.currentPage > 1) {       
        this.currentPage -= 1; 

                // Restore cleaned rich text content when moving to another page
                setTimeout(() => {
                    this.restoreEditorContent();
                }, 100);
        
        // Reset scroll position to top
        this.template.querySelector('.scrollable-content').scrollTop = 0;
        }  
        } */

      /*  handleNext() {
            this.updateRichTextFields(); // Save before navigating
            if (this.currentPage < 6) {
                this.currentPage += 1;
                setTimeout(() => this.restoreEditorContent(), 100); // Restore new page’s fields
            }
        } */
        
            handleNext() {
                this.updateRichTextFields();
            
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
            
                // All good — move to next page
                if (this.currentPage < 6) {
                    this.currentPage += 1;
                    setTimeout(() => this.restoreEditorContent(), 100);
                }
            }
            
                      
        
        handlePrevious() {
            this.updateRichTextFields(); // Save before navigating
            if (this.currentPage > 1) {
                this.currentPage -= 1;
                setTimeout(() => this.restoreEditorContent(), 100); // Restore new page’s fields
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
        this.applicationData.trl__c = value; 
    }

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

        /*lines.forEach((line, index) => {
            range.insertNode(document.createTextNode(line));
            if (index < lines.length - 1) {
                const br = document.createElement('br');
                range.insertNode(br);
            }
        }); */

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
        // Prevent Enter or Backspace from duplicating the selection
        if ((event.key === 'Enter' || event.key === 'Backspace') && window.getSelection) {
            const selection = window.getSelection();
            if (!selection.isCollapsed) {
                // collapse selection to avoid duplication
                selection.deleteFromDocument();
            }
        }
    }
            

  /* handleInput(event) {
        const fieldName = event.target.dataset.field;
    let cleanedHtml = this.cleanRichText(event.target.innerHTML);
    this.applicationData[fieldName] = cleanedHtml;
    console.log(`Updated ${fieldName}:`, this.applicationData[fieldName]);
    } */

    handleInput(event) {
        const field = event.target.dataset.field;
        this.applicationData[field] = event.target.innerHTML;
    }
    

    
    handleInputChange(event) {
        const fieldName = event.target.name;
        const fieldValue = event.target.value;
        // Convert numeric fields properly
       /* const numericFields = ['trl__c'];
        if (numericFields.includes(fieldName)) {
            fieldValue = fieldValue ? parseFloat(fieldValue) : null;
        } */

         // Validation: Ensure TRL (picklist) is greater than 3
    if (fieldName === 'Current_Technology_Readiness_Level_TRL__c') {
        const trlValue = parseInt(fieldValue, 10);
        if (trlValue <= 3) {
            this.showToast('TRL level must be greater than 3', 'error');
            this.applicationData[fieldName] = '';
            return;
        }
    }     

        if (fieldName === 'Prio_Research_Funding_Yes_No__c') {
            this.showFundingSources = fieldValue?.toLowerCase() === 'yes';
        }

        // Store both rich text and plain text versions
        this.applicationData = { 
            ...this.applicationData, 
            [fieldName]: fieldValue 
        };

    }

    handleSaveDraft() {
        console.log('💾 Save Draft button clicked');


          // ✅ Set constant values before sending to Apex
    this.applicationData = {
        ...this.applicationData,
        Status__c: 'Draft',
        Category__c: 'Grant Application',
        ApplicationType__c: 'WIN Project Proposal'
    };
        this.applicationData.Status = 'Draft';
        console.log(this.applicationData.Status);
        this.saveDraftToServer('Draft');
    }
    
    saveDraftToServer(status) {
        console.log('⏳ Saving draft with status:', status);
        console.log('📦 Data being saved:', JSON.stringify(this.applicationData));
    
        saveApplicationWithMilestones({
            applicationData: this.applicationData,
            milestones: this.milestones || [],
            fileIds: this.uploadedFileIds || []
        })
        .then(result => {
            console.log('✅ Draft saved, returned Id:', result);
            this.applicationData.Id = result;
            this.showToast('Success', 'Draft saved successfully.', 'success');
        })
        .catch(error => {
            console.error('❌ Save Draft Error:', JSON.stringify(error));
            this.showToast('Error', error.body.message || 'Unknown error while saving draft', 'error');
        });
    }
    

    
         // Open modal and set selected field
    openModal(event) {
        this.modalRowId = event.target.dataset.id;
        this.modalField = event.target.dataset.field;
        this.modalValue = this.milestones.find(m => m.uniqueId == this.modalRowId)[this.modalField];
        //this.modalTitle = this.modalField === "Milestone_Description__c" ? "Edit Milestone Description" : "Edit Justification";
        
        // Add a friendly title for Deliverables
    if (this.modalField === "Milestone_Description__c") {
        this.modalTitle = "Edit Milestone Description";
    } else if (this.modalField === "Justification__c") {
        this.modalTitle = "Edit Justification";
    } else if (this.modalField === "Deliverables__c") {
        this.modalTitle = "Edit Deliverables";
    } else {
        this.modalTitle = "Edit Field";
    }
        this.isModalOpen = true;
        // Delay setting innerHTML to ensure modal is rendered
    setTimeout(() => {
        let editableDiv = this.template.querySelector(".text-area");
        if (editableDiv) {
            editableDiv.innerHTML = this.modalValue || ""; // Populate rich text content
        }
    }, 0);
    }

    // Close modal
    closeModal() {
        this.isModalOpen = false;
    }

    // Update modal value on input
    handleModalChange(event) {
        //this.modalValue = event.detail.value;
        let editableDiv = this.template.querySelector(".text-area");
    if (editableDiv) {
        this.modalValue = editableDiv.innerHTML; // Store rich text content
    }
    }

    // Save updated value to the milestone table
    saveModalData() {
        let editableDiv = this.template.querySelector(".text-area");
        if (editableDiv) {
            this.modalValue = editableDiv.innerHTML; // Get the final rich text content
        }
        this.milestones = this.milestones.map(milestone => {
            if (milestone.uniqueId == this.modalRowId) {
                return { ...milestone, [this.modalField]: this.modalValue };
            }
            return milestone;
        });
        this.closeModal();
    }

    handleMilestoneChange(event) {
        const field = event.target.dataset.field;
        const uniqueId = parseInt(event.target.dataset.id, 10);
        let value = event.target.value;
    
        if (field === 'Budget_Required__c') {
            // Numeric field: remove decimals
            value = Math.floor(Number(value));
        }
    
        // For all other fields (e.g., dates, text), value remains as-is
        this.milestones = this.milestones.map(milestone =>
            milestone.uniqueId === uniqueId ? { ...milestone, [field]: value } : milestone
        );
    }
    
    
    addRow() {
        let newId = this.milestones.length + 1;
        this.milestones = [...this.milestones, {
            uniqueId: newId,
            Milestone_Description__c: '',
            Deliverables__c: '',
            Budget_Required__c: '',
            Milestone_Target_Date__c: '',
            Justification__c: ''
        }];
    }

    preventDecimal(event) {
        if (event.key === '.') {
            event.preventDefault();
        }
    }

    handleFileUpload(event) {
        const uploadedFiles = event.detail.files;
        if (uploadedFiles.length > 0) {
            const uploadedFile = uploadedFiles[0];
            let fieldName = event.target.name;

            // Find the corresponding file label
            let fileLabel = this.fileUploadFields.find(file => file.name === fieldName)?.label || fieldName;
        
            // Update file name display in UI
            this.fileUploadFields = this.fileUploadFields.map(file => {
                if (file.name === fieldName) {
                    return { ...file, uploadedFileName: uploadedFile.name };
                }
                return file;
            });
    
            // Just add the new file without checking for duplicates
            this.uploadedFiles.push({ documentId: uploadedFile.documentId, name: uploadedFile.name });
             
            // Format File Details as a string (for saving in File_Details__c field)
        this.applicationData.Uploaded_Files__c = this.uploadedFiles
        .map(file => `${fileLabel}: ${file.name}`)
        .join('\n'); // Each file entry on a new line
        }
    }
    connectedCallback() {
        //console.log('Record ID received:', this.recordId); // Check if recordId is available
        this.fetchFundingOpportunityId();
    
        // Fetch logged-in user details
        getLoggedInUserDetails()
            .then(result => {
                if (result) {
                    this.applicationData.Institution_Name__c = result.AccountName; // Display Account Name
                    this.applicationData.COE_Admin__c = result.ContactName; // Display Contact Name
    
                    // Store Ids for lookup fields when saving
                    this.applicationData.AccountId = result.AccountId;
                    this.applicationData.ContactId = result.ContactId;
                }
            })
            .catch(error => {
                console.error('Error fetching user details:', error);
            });
    
        // Restore rich text field values when component loads
        setTimeout(() => {
            this.restoreEditorContent();
        }, 100);
    }

    async fetchFundingOpportunityId() {
        try {
            const id = await getActiveFundingOpportunityId();
            this.applicationData.FundingOpportunityId = id;
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
    
    restoreEditorContent() {
        // List of all rich text fields
        const richTextFields = [
            "Project_Summary_Max_500_words__c",
            "Key_Problem_Being_Solved__c",
            "Proposed_Solution__c",
            "Interdisciplinary_Nature__c",
            "Potential_for_Commercialization__c",
            "Target_Market_Industry_Application__c",
            "Competitive_Landscape__c",
            "Exit_Strategy_of_project__c",
            "Proposed_WIN_Grant_Utilization__c",
        "List_of_Existing_Funding_Sources_and_Fun__c",
        "Additional_Funding_Plans__c",
        "Institute_Support_Facilities__c",
        "WIN_Support__c",
        "Expected_Impact_Socio_economic_Scientif__c",
        "Potential_for_Startup_Formation__c",
        "IP_Patent_Potential__c",
        "Expected_Revenue_Model_if_applicable__c"
        ];
    
        richTextFields.forEach(field => {
            if (this.applicationData[field]) {
                let richTextElement = this.template.querySelector(`[data-field="${field}"]`);
                if (richTextElement) {
                    richTextElement.innerHTML = this.applicationData[field] || ""; // Restore HTML content
                }
            }
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
    this.updateRichTextFields(); // Capture latest rich text values
    console.log("Previewing Application Data:", JSON.stringify(this.applicationData, null, 2));
    this.previewPage = 1;
    this.isPreviewVisible = true;
}

handlePreviewNext() {
    if (this.previewPage < 6) {
        this.updateRichTextFields();
        this.previewPage += 1;
    }
}

handlePreviewPrevious() {
    if (this.previewPage > 1) {
        this.updateRichTextFields();
        this.previewPage -= 1;
    }
}

   handleClosePreview() {
       this.isPreviewVisible = false;
   }
   
   /*get filledMilestones() {
       return this.milestones.filter(m =>
           m.Milestone_Description__c.trim() !== '' ||
           m.Budget_Required__c.trim() !== '' ||
           m.Milestone_Target_Date__c.trim() !== '' ||
           m.Justification__c.trim() !== ''
       );
   } */
    
        
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
        
      /*  insertBulletPoints() {
            document.execCommand('insertUnorderedList', false, null);
        } */
        

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

    
    

       get filledMilestones() {
        return this.milestones
            .filter(m =>
                (m.Milestone_Description__c && m.Milestone_Description__c.trim() !== '') ||
                (m.Deliverables__c && m.Deliverables__c.trim() !== '') ||
                (m.Budget_Required__c && m.Budget_Required__c.trim() !== '') ||
                (m.Milestone_Target_Date__c && m.Milestone_Target_Date__c.trim() !== '') ||
                (m.Justification__c && m.Justification__c.trim() !== '')
            )
            .map(milestone => ({
                ...milestone,
                Milestone_Description__c: this.sanitizeRichText(milestone.Milestone_Description__c),
                Deliverables__c: this.sanitizeRichText(milestone.Deliverables__c),
                Justification__c: this.sanitizeRichText(milestone.Justification__c)
            }));
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

get sanitizedMilestones() {
    return this.filledMilestones.map(milestone => ({
        ...milestone,
        Milestone_Description__c: this.sanitizeRichText(milestone.Milestone_Description__c),
        Deliverables__c: this.sanitizeRichText(milestone.Deliverables__c),
        Justification__c: this.sanitizeRichText(milestone.Justification__c)
    }));
}

/*renderedCallback() {
    // Populate preview sections with formatted text
    Object.keys(this.richTextValues).forEach(field => {
        let previewElement = this.template.querySelector(`[data-id="preview${this.capitalize(field)}"]`);
        let editorElement = this.template.querySelector(`[data-id="${field}"]`);
        if (previewElement && editorElement) {
            previewElement.innerHTML = editorElement.innerHTML;
        }
    });
}*/

/*renderedCallback() {
    if (this._richTextInitialized) return;

    const allEditors = this.template.querySelectorAll('.text-area');
    allEditors.forEach(editor => {
        const field = editor.dataset.field;
        if (field && this.applicationData[field]) {
            editor.innerHTML = this.applicationData[field];
        }
    });

    this._richTextInitialized = true;
} */

  /*  renderedCallback() {
        if (this._richTextInitialized) return;
    
        const editors = this.template.querySelectorAll('.text-area');
        editors.forEach(editor => {
            const field = editor.dataset.field;
            if (field && this.applicationData[field]) {
                editor.innerHTML = this.applicationData[field];
            }
        });
    
        this._richTextInitialized = true;
    } */
    
      /*  validateRichTextFields() {
            let isValid = true;
            const requiredFields = [
                { name: 'Key_Problem_Being_Solved__c', label: 'Key Problem Being Solved' },
                { name: 'Project_Summary_Max_500_words__c', label: 'Project Summary' },
                { name: 'Proposed_Solution__c', label: 'Proposed Solution' },
                {name: 'Interdisciplinary_Nature__c', label: 'Interdisciplinary Nature' },
                {name: 'Potential_for_Commercialization__c', label: 'Potential for Commercialization' },
                {name: 'Target_Market_Industry_Application__c', label: 'Target Market and Industry Application' },
                {name: 'Competitive_Landscape__c', label: 'Competitive Landscape' },
                {name: 'Exit_Strategy_of_project__c', label: 'Exit Strategy of project' },
                {name: 'Proposed_WIN_Grant_Utilization__c', label: 'Proposed WIN Grant Utilization' },
                {name: 'List_of_Existing_Funding_Sources_and_Fun__c', label: 'List of Existing Funding Sources and Funds raised' },
                {name: 'Additional_Funding_Plans__c', label: 'Additional Funding Plans' },
                {name: 'Institute_Support_Facilities__c', label: 'Institute Support and Facilities' },
                {name: 'WIN_Support__c', label: 'WIN Support' },
                {name: 'Expected_Impact_Socio_economic_Scientif__c', label: 'Expected Impact (Socio-economic/Scientific/Commercial)' },
                {name: 'Potential_for_Startup_Formation__c', label: 'Potential for Startup Formation' },
                {name: 'IP_Patent_Potential__c', label: 'IP and Patent Potential' },
                {name: 'Expected_Revenue_Model_if_applicable__c', label: 'Expected Revenue Model (if applicable)' },
                
                // add more required rich text fields here
            ];
        
            requiredFields.forEach(fieldObj => {
                const field = this.template.querySelector(`[data-field="${fieldObj.name}"]`);
                const errorMsg = this.template.querySelector(`[data-error="${fieldObj.name}"]`);
        
                if (!field || field.innerHTML.trim() === '') {
                    field.classList.add('invalid-field');
                    if (errorMsg) {
                        errorMsg.textContent = `${fieldObj.label} is required.`;
                        errorMsg.style.display = 'block';
                    }
                    isValid = false;
                } else {
                    field.classList.remove('invalid-field');
                    if (errorMsg) {
                        errorMsg.textContent = '';
                        errorMsg.style.display = 'none';
                    }
                }
            });
        
            return isValid;
        } */
         
        validateRichTextFields() {
            let isValid = true;
            const requiredFields = [];
        
            // Only validate from Page 2 to Page 6
            switch (this.currentPage) {
                case 2:
                    requiredFields.push(
                        { name: 'Project_Summary_Max_500_words__c', label: 'Project Summary' },
                        { name: 'Key_Problem_Being_Solved__c', label: 'Key Problem Being Solved' },
                        { name: 'Proposed_Solution__c', label: 'Proposed Solution' },
                        { name: 'Interdisciplinary_Nature__c', label: 'Interdisciplinary Nature' },
                        { name: 'Potential_for_Commercialization__c', label: 'Commercialization' },
                        { name: 'Target_Market_Industry_Application__c', label: 'Target Market' },
                        { name: 'Competitive_Landscape__c', label: 'Competitive Landscape' },
                        { name: 'Exit_Strategy_of_project__c', label: 'Exit Strategy' },
                        { name: 'Proposed_WIN_Grant_Utilization__c', label: 'WIN Grant Utilization' }
                    );
                    break;
        
                case 3:
                    requiredFields.push(
                       // { name: 'List_of_Existing_Funding_Sources_and_Fun__c', label: 'Existing Funding Sources' },
                        { name: 'Additional_Funding_Plans__c', label: 'Additional Funding Plans' },
                        { name: 'Institute_Support_Facilities__c', label: 'Institute Support' },
                        { name: 'WIN_Support__c', label: 'WIN Support' }
                    );
                    break;
        
                case 4:
                    requiredFields.push(
                        { name: 'Expected_Impact_Socio_economic_Scientif__c', label: 'Expected Impact' },
                        { name: 'Potential_for_Startup_Formation__c', label: 'Startup Formation' },
                        { name: 'IP_Patent_Potential__c', label: 'IP/Patent Potential' },
                        { name: 'Expected_Revenue_Model_if_applicable__c', label: 'Revenue Model' }
                    );
                    break;
        
              /*  case 5:
                    requiredFields.push(
                        { name: 'Milestone_Description__c', label: 'Milestone Description' },
                        { name: 'Justification__c', label: 'Justification' }
                    );
                    break; */
        
                // Page 6 usually has file upload — skip
                default:
                    break;
            }
        
            requiredFields.forEach(fieldObj => {
                const field = this.template.querySelector(`[data-field="${fieldObj.name}"]`);
                const errorMsg = this.template.querySelector(`[data-error="${fieldObj.name}"]`);
        
                if (!field || field.innerHTML.trim() === '') {
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
        

updateRichTextFields() {
    const richTextFields = [
        "Project_Summary_Max_500_words__c",
        "Key_Problem_Being_Solved__c",
        "Proposed_Solution__c",
        "Interdisciplinary_Nature__c",
        "Potential_for_Commercialization__c",
        "Target_Market_Industry_Application__c",
        "Competitive_Landscape__c",
        "Exit_Strategy_of_project__c",
        "Proposed_WIN_Grant_Utilization__c",
        "List_of_Existing_Funding_Sources_and_Fun__c",
        "Additional_Funding_Plans__c",
        "Institute_Support_Facilities__c",
        "WIN_Support__c",
        "Expected_Impact_Socio_economic_Scientif__c",
        "Potential_for_Startup_Formation__c",
        "IP_Patent_Potential__c",
        "Expected_Revenue_Model_if_applicable__c"
    ];

    richTextFields.forEach(field => {
        let richTextElement = this.template.querySelector(`[data-field="${field}"]`);
        if (richTextElement) {
            this.applicationData[field] = richTextElement.innerHTML.trim(); // Save latest content
        }
    });

    console.log("Updated rich text fields for preview:", JSON.stringify(this.applicationData, null, 2));
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

get formattedProjectSummary() {
    return this.cleanRichText(this.applicationData.Project_Summary_Max_500_words__c);
}
 
 /*get cleanedProjectSummary() {
    return this.sanitizeRichText(this.applicationData.Project_Summary_Max_500_words__c);
} */

get formattedKeyProblem() {
    return this.cleanRichText(this.applicationData.Key_Problem_Being_Solved__c);
}

get formattedProposedSolution() {
    return this.cleanRichText(this.applicationData.Proposed_Solution__c);
}

get formattedInterdisciplinaryNature() {
    return this.cleanRichText(this.applicationData.Interdisciplinary_Nature__c);
}

get formattedPotentialCommercialization() {
    return this.cleanRichText(this.applicationData.Potential_for_Commercialization__c);
}

get formattedTargetMarketIndustryApplication() {
    return this.cleanRichText(this.applicationData.Target_Market_Industry_Application__c);
}

get formattedCompetitiveLandscape() {
    return this.cleanRichText(this.applicationData.Competitive_Landscape__c);
}

get formattedExitStrategyofproject() {
    return this.cleanRichText(this.applicationData.Exit_Strategy_of_project__c);
}

get formattedProposedWINGrantUtilization() {
    return this.cleanRichText(this.applicationData.Proposed_WIN_Grant_Utilization__c);
}

get formattedExistingFundingSources() {
    return this.cleanRichText(this.applicationData.List_of_Existing_Funding_Sources_and_Fun__c);
}

get formattedAdditionalFundingPlans() {
    return this.cleanRichText(this.applicationData.Institute_Support_Facilities__c);
}

get formattedWINSupport() {
    return this.cleanRichText(this.applicationData.WIN_Support__c);
}

get formattedExpectedImpact() {
    return this.cleanRichText(this.applicationData.Expected_Impact_Socio_economic_Scientif__c);
}

get formattedPotentialforStartupFormation() {
    return this.cleanRichText(this.applicationData.Potential_for_Startup_Formation__c);
}

get formattedIPandPatentPotential() {
    return this.cleanRichText(this.applicationData.IP_Patent_Potential__c);
}

get formattedExpectedRevenueModel() {
    return this.cleanRichText(this.applicationData.Expected_Revenue_Model_if_applicable__c);
}

get formattedSubFocusAreas() {
    const sub = this.applicationData.Sub_Focus_Area__c;
    return Array.isArray(sub) ? sub.join(', ') : sub?.split(';').join(', ');
}

    
    handleSubmit() {
        this.showForm = false;
       

       // console.log('Submitting with Record ID:', this.recordId);

       // this.applicationData.FundingOpportunityId = this.recordId;
       // Already set by fetchFundingOpportunityId()

        console.log('FundingOpportunityId', this.applicationData.FundingOpportunityId);
         // Hardcode additional field values
     this.applicationData.ApplicationType = 'WIN Project Proposal';
    this.applicationData.Category = 'Grant Application';
    this.applicationData.Status = 'Submitted';
    this.applicationData.recordTypeId = '012F6000000UQbBIAW';

    //AccountId and ContactId of the User
    this.applicationData.Institution_Name__c = this.applicationData.AccountId; // Save as AccountId
    this.applicationData.COE_Admin__c = this.applicationData.ContactId; // Save as ContactId

    console.log('category ', this.applicationData.Category);

    function formatToDateOnly(dateStr) {
        if (!dateStr) return null;
        return dateStr.split('T')[0]; // ensures only "YYYY-MM-DD"
    }
    
    this.applicationData.Project_Start_Date__c = formatToDateOnly(this.applicationData.Project_Start_Date__c);
    this.applicationData.Project_End_Date__c = formatToDateOnly(this.applicationData.Project_End_Date__c);
    
    

        let payloadToSave = {
            ...this.applicationData,
            Sub_Focus_Area__c: Array.isArray(this.applicationData.Sub_Focus_Area__c)
                ? this.applicationData.Sub_Focus_Area__c.join(';')
                : this.applicationData.Sub_Focus_Area__c
        };
        console.log(payloadToSave); // prevents "never read" warning

  // Assign the recordId properly before submission
  //const applicationData = { ...this.applicationData, FundingOpportunityId: this.recordId };

  //console.log('Final Application Data:', JSON.stringify(applicationData));

       /* if (!this.recordId) {
            console.log('Funding Opportunity ID:', this.recordId); 
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Funding Opportunity Id is missing!',
                variant: 'error'
            }));
            return;
        } */

        if (!this.applicationData.FundingOpportunityId) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Funding Opportunity ID is missing!',
                variant: 'error'
            }));
            return;
        }

    
        const filledMilestones = this.milestones.filter(milestone =>
            milestone.Milestone_Description__c.trim() !== '' ||
            milestone.Deliverables__c.trim() !== '' ||
            milestone.Budget_Required__c.trim() !== '' ||
            milestone.Milestone_Target_Date__c.trim() !== '' ||
            milestone.Justification__c.trim() !== ''
        );

        console.log( this.applicationData);

        saveApplicationWithMilestones({
            applicationData: payloadToSave,
            //applicationData: this.applicationData,  
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