import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import PRIMARY_FIELD from '@salesforce/schema/IndividualApplication.Primary_Focus_Area__c';
import SUB_FIELD from '@salesforce/schema/IndividualApplication.Sub_Focus_Area__c';
import TRL_FIELD from '@salesforce/schema/IndividualApplication.Current_Technology_Readiness_Level_TRL__c'; 
import EXP_TRL from '@salesforce/schema/IndividualApplication.Expected_TRL_at_the_end_of_the_Project__c';
import INDIVIDUALAPPLICATION_OBJECT from '@salesforce/schema/IndividualApplication';
import getLoggedInUserDetails from '@salesforce/apex/WinProjectProposalFormController.getLoggedInUserDetails';
import saveApplicationWithMilestones from '@salesforce/apex/WinProjectProposalFormController.saveApplicationWithMilestones';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import getActiveFundingOpportunityId from '@salesforce/apex/WinProjectProposalFormController.getActiveFundingOpportunityId';
import { NavigationMixin } from 'lightning/navigation';
//import getDraftApplication  from '@salesforce/apex/winFormSaveDraft.getDraftApplication';
import saveDraftApplication from '@salesforce/apex/WinProjectProposalFormController.saveDraftApplication';
//import deleteContentDocument from '@salesforce/apex/WinProjectProposalFormController.deleteFileFromSalesforce'; 
import deleteCoFounderRecord from '@salesforce/apex/WinProjectProposalFormController.deleteCoFounderRecord';

export default class WinFormWithSaveDraft extends NavigationMixin(LightningElement) {
    @track recordId = null; // IA draft Id

    @track applicationRecordId; // Stores Application_Form__c ID after creation
    winLogoUrl = WIN_LOGO; // Set logo URL
   
    @track showForm = true; // Initially hide form
    //@track isButtonDisabled = false; // Apply Now button is enabled initially
    showFundingSources = false;
 
    @track applicationData = {}; 
    
    @track activeField = null; 
   
    @track milestones =[];
    @track isModalOpen = false;
    @track modalValue = '';
    @track modalField = '';
    @track modalRowId = null;
    @track modalTitle = '';

    @track budgetRows = [];
   @track isBudgetModalOpen = false;
   @track budgetModalValue = '';
   @track budgetModalField = '';
   @track budgetModalRowId = null;
   @track budgetModalTitle = '';

    @track primaryFocusAreaOptions = [];
    @track subFocusAreaOptions = [];
    @track selectedPrimaryFocusArea;
    @track selectedSubFocusAreas = [];
  

    @track applicationData = {
        Project_Title__c: '',
        COE_Admin__c: '',
        PI_Name__c: '',
        PI_Designation__c: '',
        PI_Phone__c:'',
        PI_Email__c:'',
        Co_Principal_Investigator_Co_PI__c: '',
        CO_PI_Designation__c: '',
        CO_PI_Institution__c: '',
        Co_PI_Phone__c:'',
        Co_PI_Email__c:'',
        Project_Team_Members__c: '',
        Project_Duration__c: '',
        Expertise_and_Experience_of_Team_in_Spec__c: '',
        Keywords__c: '',
        Primary_Focus_Area__c: '',
        Sub_Focus_Area__c: '',
        //Project_Start_Date__c: '',
        //Project_End_Date__c: '',
        Project_Website_if_any__c: '',
        Project_Summary__c: '', // Project_Summary_Max_500_words__c
        Objectives_of_the_Project__c: '',
        Project_Approach_and_Work_Plan__c: '',
        Key_Problem_Being_Solved__c: '',
        Proposed_Solution__c: '',
        Current_status_of_the_Project_Work_und__c: '',
        Novelty_of_the_Project__c: '',
        Competitive_Landscape__c: '', //changed
        Details_of_IPR_Filed_Granted__c: '',
        Details_of_Ethical_Received__c: '',
        Full_Proposal_Citations__c: '',
        Target_Market_Industry_Application__c: '',
        Customer_and_Beneficiaries__c: '',
        Potential_for_Commercialization__c: '',
        Business_Model_for_Commercialization__c: '',
        Potential_Revenue_Generation_Strategy_fo__c: '', 
        List_of_Existing_Funding_Sources_and_Fun__c: '', // Previous_Funding_Details__c
        Additional_Funding_Plans__c: '',
        WIN_Support__c: '',
        Proposed_Outcomes_Deliverables_under_t__c: '',
        Envisioned_Project_Impact__c: '',
        Future_Plan_for_next_3_5_Years_on_comple__c: '',
        Potential_for_Startup_Formation__c: '',
        Main_Risks_and_Barriers__c: '',
        Relevant_Partnerships__c: '',
        Potential_for_Startup_Formation__c: '',
        Incubator_Association_Details__c: '',
        Total_Project_Budget_in_USD__c: '',
        FundingOpportunityId: '',
        ApplicationType: '',
        Category: '',
        Status: '',
        Institution_Name__c : '',
        Principal_Investigator_PI__c: '',
        recordTypeId: '',
        Uploaded_Files__c: '',
        Total_Budget__c:'',
        PI_Institution__c:'',
       // AppliedDate:'',
        IsSubmitted:'',
        Startup_Name__c: '',
Founder_Name__c: '',
Founder_Designation__c: '',
Founder_Institution__c: '',
Founder_Mobile__c: '',
Founder_Email__c: '',
Is_Startup_Registered__c: '',
Startup_Registration_Date__c: '',
Startup_Registration_No__c: '',
Is_Startup_DPIIT_Registered__c: '',
DPIIT_Registration_No__c: '',

    }; 

    @track coFounders = [{
    uniqueId: 1,
    Name: '',
    Designation__c: '',
    Institution__c: '',
    Mobile__c: '',
    Email__c: ''
}];

handleCoFounderChange(event) {
    const field = event.target.dataset.field;
    const uniqueId = parseInt(event.target.dataset.id, 10);
    const value = event.target.value;

    this.coFounders = this.coFounders.map(cf =>
        cf.uniqueId === uniqueId ? { ...cf, [field]: value } : cf
    );
}

addCoFounder() {
    const newId = this.coFounders.length
        ? Math.max(...this.coFounders.map(c => c.uniqueId)) + 1
        : 1;
    this.coFounders = [...this.coFounders, {
        uniqueId: newId,
        Name: '',
        Designation__c: '',
        Institution__c: '',
        Mobile__c: '',
        Email__c: ''
    }];
}

deleteCoFounderRow(event) {
    const uniqueId = parseInt(event.currentTarget.dataset.id, 10);
    const rowToDelete = this.coFounders.find(c => c.uniqueId === uniqueId);

    if (rowToDelete?.Id) {
        deleteCoFounderRecord({ coFounderId: rowToDelete.Id })
            .then(() => {
                this.coFounders = this.coFounders.filter(c => c.uniqueId !== uniqueId);
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.body?.message || 'Failed to delete co-founder row.',
                    variant: 'error'
                }));
            });
    } else {
        this.coFounders = this.coFounders.filter(c => c.uniqueId !== uniqueId);
    }
}
   @track projectDuration = '';
   @track projectStartDate = '';
   @track projectEndDate = '';

    @track currentPage = 1; //Pagination
    
    totalPages = 8;

get currentPage() {
    if (this.isPage1) return 1;
    if (this.isPage2) return 2;
    if (this.isPage3) return 3;
    if (this.isPage4) return 4;
    if (this.isPage5) return 5;
    if (this.isPage6) return 6;
    if (this.isPage7) return 7;
    if (this.isPage8) return 8;
    return 0;
}

 // Dynamically assigns the appropriate SLDS width class
 get progressClass() {
    return `slds-progress-bar__value slds-size_${this.currentPage}-of-${this.totalPages}`;
}
    
    //Picklist Values declaration
    @track primaryFocusAreaOptions = [];
    @track subFocusAreaOptions = [];
    @track priorResearchFundingOptions = [];
    @track trlOptions = [];
    @track expectedTrlOptions = [];

    //File upload declarations
    @track fileUploadFields = [
        { name: 'Resume_PI', label: '8.1. Resume / Biodata of Principal Investigator', helpText: '', uploadedFileName: '', required: true },
        { name: 'Govt_ID_of_PI', label: '8.2. PAN Card / Aadhar / Passport Copy or any Govt ID of Principal Investigator', helpText: '', uploadedFileName: '', required: true },
        { name: 'Resume_Co_PI', label: '8.3. Resume / Biodata of Co-Principal Investigator', helpText: '' , uploadedFileName: '' },
        { name: 'Govt_ID_of_CO_PI', label: '8.4. PAN Card / Aadhar / Passport Copy or any Govt ID of Co-Principal Investigator', helpText: '', uploadedFileName: '' },
        { name: 'Letter_Support', label: '8.5. Letter of Support from Institution / Organization / Incubator', helpText: '', uploadedFileName: '', required: true  },
        { name: 'Letter_Endorsement', label: '8.6. Letter of Endorsement from Industry Collaborators / Partners', helpText: '', uploadedFileName: ''},
        { name: 'Letter_Endorsement_Incubator', label: '8.7. Letter of Endorsement from Incubator', helpText: '', uploadedFileName: '' },
        { name: 'Detailed_WorkPlan', label: '8.8. Detailed Work Plan and Methodology (figures, flow chart, diagrams)', helpText: '', uploadedFileName: '', required: true },
        { name: 'Document_TRL', label: '8.9. Document demonstrating current status of the project / current TRL', helpText: '', uploadedFileName: '', required: true },
        { name: 'Supporting_Documents', label: '8.10. Supporting documents of IPR filed / granted', helpText: '', uploadedFileName: '' },
        { name: 'Supporting_Documents_prior', label: '8.11. Supporting documents of prior funding received under the project', helpText: '' ,uploadedFileName: '' }
    ];
    
    //Budget Table
    @track budgets = Array.from({ length: 3 }, (_, index) => ({
        uniqueId: index + 1,
        Name: '',
        Year_1__c: '',
        Year_2__c: '',
        Year_3_USD__c: '',
        Justification__c: '',
        Total_Amount__c: ''
    }));

    
    @track uploadedFiles = []; // To store uploaded file details
    @track milestones = Array.from({ length: 5 }, (_, index) => ({
        uniqueId: index + 1,
        Milestone_Description__c: '',
        Deliverables__c: '',
        Budget_Required__c: '',
        Target_Completion_Months__c: '',
        //Target_Completion_Month__c: '',
        //Milestone_Target_Date__c: '',
        Justification__c: ''
    }));

    @wire(getObjectInfo, { objectApiName: INDIVIDUALAPPLICATION_OBJECT })
    objectInfo;


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

    //Get the Picklist value for the Current TRL from Individual Application Object
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: TRL_FIELD })
    wiredTrlPicklistValues({ error, data }) {
        if (data) {
            this.trlOptions = data.values;
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    } 

    //Get the Picklist value for the Expected TRL from Individual Application Object
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: EXP_TRL })
    wiredExpectedTrlPicklistValues({ error, data }) {
        if (data) {
            this.expectedTrlOptions = data.values;
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

        get isPage7() {        
            return this.currentPage === 7;        
            }

        get isPage8() {        
                return this.currentPage === 8;        
                }    
           
        
        get isFirstPage() {       
        return this.currentPage === 1;       
        }
               
        get isLastPage() {       
        return this.currentPage === 8;        
        }


  yesNoOptions = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' }
];

get showStartupRegDetails() {
    return this.applicationData.Is_Startup_Registered__c === 'Yes';
}

get showDpiitRegDetails() {
    return this.applicationData.Is_Startup_DPIIT_Registered__c === 'Yes';
}
                    
      // now using this - previous it was using above handleNext  
          handleNext() {
                this.updateRichTextFieldsForCurrentPage(); //updateRichTextFields
             
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
                if (this.currentPage < 8) {
                    this.currentPage += 1;
                    setTimeout(() => this.restoreEditorContent(), 100);
                }
            } 
                          
        
        handlePrevious() {
            //this.updateRichTextFields(); // Save before navigating
            this.updateRichTextFieldsForCurrentPage();
            if (this.currentPage > 1) {
                this.currentPage -= 1;
                setTimeout(() => this.restoreEditorContent(), 100); // Restore new page’s fields
            }
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

    deleteBudgetRow(event) {
    const idToDelete = parseInt(event.target.dataset.id, 10);
    this.budgets = this.budgets.filter(b => b.uniqueId !== idToDelete);

    // ✅ Re-assign uniqueId to maintain clean indexing (optional but useful)
    this.budgets = this.budgets.map((row, index) => ({
        ...row,
        uniqueId: index + 1
    }));
}

deleteMilestoneRow(event) {
    const idToDelete = parseInt(event.target.dataset.id, 10);
    this.milestones = this.milestones.filter(m => m.uniqueId !== idToDelete);

    // Optional: Reassign uniqueId to keep order clean
    this.milestones = this.milestones.map((milestone, index) => ({
        ...milestone,
        uniqueId: index + 1
    }));
}

        
   //old - without bullet
   /*handleKeyDown(event) {
        // Prevent Enter or Backspace from duplicating the selection
        if ((event.key === 'Enter' || event.key === 'Backspace') && window.getSelection) {
            const selection = window.getSelection();
            if (!selection.isCollapsed) {
                // collapse selection to avoid duplication
                selection.deleteFromDocument();
            }
        }
    } */
    
 /* handleKeyDown(event) {
    if (event.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const container = range.startContainer;

        // Get the full text of the current line (node or parent node)
        const lineText = container.textContent || container.parentNode?.textContent || '';
        const match = lineText.trim().match(/^(\d+)\.\s/); // matches "1. ", "2. ", etc.

        if (match) {
            event.preventDefault();
            const nextNum = parseInt(match[1]) + 1;

            // Insert line break and next number
            const br = document.createElement('br');
            const numberText = document.createTextNode(`${nextNum}. `);

            range.insertNode(br);
            range.collapse(false);
            range.insertNode(numberText);

            // Move cursor after the number
            const newRange = document.createRange();
            newRange.setStartAfter(numberText);
            newRange.collapse(true);

            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }
} */

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
        

    handleInput(event) {
        const field = event.target.dataset.field;
        this.applicationData[field] = event.target.innerHTML;
    }
    

    
    handleInputChange(event) {
        const fieldName = event.target.name;
        const fieldValue = event.target.value;
        
        // Store both rich text and plain text versions
        this.applicationData = { 
            ...this.applicationData, 
            [fieldName]: fieldValue 
        };

    }


    /* ================ BUDGET MODAL ================ */

        /** Sum up all budget.Amount values (coerced to Number) */
get totalBudget() {
    return this.budgets.reduce((sum, row) => {
      // Make sure Amount is treated as a number; treat empty or invalid as 0
      const amt = Number(row.Amount) || 0;
      return sum + amt;
    }, 0);
  }
  
        budgetOpenModal(event) {
            this.budgetModalRowId = event.target.dataset.id;
            this.budgetModalField = event.target.dataset.field;
            this.budgetModalValue = this.budgets.find(b => b.uniqueId == this.budgetModalRowId)[this.budgetModalField];
            this.budgetModalTitle = this.budgetModalField === "Justification__c" ? "Edit Justification" : "Edit Field";
            
            this.isBudgetModalOpen = true;
            // Delay setting innerHTML to ensure modal is rendered
        setTimeout(() => {
            let editableDiv = this.template.querySelector(".text-area1");
            if (editableDiv) {
                editableDiv.innerHTML = this.budgetModalValue || ""; // Populate rich text content
            }
        }, 0);
        }

    // Close modal
    budgetCloseModal() {
        this.isBudgetModalOpen = false;
    }


  /*  handleBudgetChange(event) {
        const field = event.target.dataset.field;
        const uniqueId = parseInt(event.target.dataset.id, 10);
        let value = event.target.value;
    
        this.budgets = this.budgets.map(budget =>
            budget.uniqueId === uniqueId ? { ...budget, [field]: value } : budget
        );
    } */
   handleBudgetChange(event) {
    const field = event.target.dataset.field;
    const uniqueId = parseInt(event.target.dataset.id, 10);
    let value = parseInt(event.target.value) || 0;

    this.budgets = this.budgets.map(budget => {
        if (budget.uniqueId === uniqueId) {
            let updatedBudget = { ...budget, [field]: value };

            const y1 = parseInt(updatedBudget.Year_1__c) || 0;
            const y2 = parseInt(updatedBudget.Year_2__c) || 0;
            const y3 = parseInt(updatedBudget.Year_3_USD__c) || 0;

            updatedBudget.Total_Amount__c = y1 + y2 + y3;

            return updatedBudget;
        }
        return budget;
    });
}

    

        saveBudgetModalData() {
            let editableDiv = this.template.querySelector(".text-area1");
            if (editableDiv) {
                this.budgetModalValue = editableDiv.innerHTML; // Get the final rich text content
            }
        
            this.budgets = this.budgets.map(budget => {
                if (budget.uniqueId == this.budgetModalRowId) {
                    return {
                        ...budget,
                        [this.budgetModalField]: this.budgetModalValue // ✅ Update Justification
                    };
                }
                return budget;
            });
        
            this.budgetCloseModal();
        }
    
       
        

   /* handleAmountChange(event) {
        const field = event.target.dataset.field;
        const uniqueId = parseInt(event.target.dataset.id, 10);
        let value = event.target.value;
    
        if (field === 'Amount') {
            // Numeric field: remove decimals
            value = Math.floor(Number(value));
        }
    
        // For all other fields (e.g., dates, text), value remains as-is
        this.budgets = this.budgets.map(budget =>
            budget.uniqueId === uniqueId ? { ...budget, [field]: value } : budget
        );
    } */
    
    
    addBudgetRow() {
        let newId = this.budgets.length + 1;
        this.budgets = [...this.budgets, {
            uniqueId: newId,
            Name: '', 
            Year_1__c: '',
            Year_2__c: '',
            Year_3_USD__c: '',  
            Justification__c: '',
            Total_Amount__c: ''
        }];
    }

     // ======== OPEN MODAL (Handles Milestone) ========
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
                return { ...milestone, [this.modalField]: this.modalValue
                    
                 }; 

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
            Target_Completion_Months__c: '',
            //Target_Completion_Month__c: '',
            //Milestone_Target_Date__c: '',
            Justification__c: ''
        }];
    }

    preventDecimal(event) {
        if (event.key === '.') {
            event.preventDefault();
        }
    }
    
    validateFileUploads() {
        let isValid = true;
        let missingFiles = [];
    
        this.fileUploadFields.forEach(file => {
            if (file.required && !file.uploadedFileName) {
                isValid = false;
                missingFiles.push(file.label);
            }
        });
    
        if (!isValid) {
            const missing = missingFiles.join(', ');
            this.fileUploadError = 'Please upload the following required files: ' + missing;
        } else {
            this.fileUploadError = ''; // Clear any previous errors
        }
    
        return isValid;
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

    initializeTables() {
        // 💰 Budget Table - Ensure at least 3 rows
    if (!this.budgetRows || this.budgetRows.length === 0) {
        this.budgetRows = [];
        for (let i = 0; i < 3; i++) {
            this.budgetRows.push({
                Name: '',
                Amount: '',
                Justification__c: '',
                Status: 'Draft'
            });
        }
    }
    
    if (!this.milestones || this.milestones.length === 0) {
        this.milestones = [];
        for (let i = 0; i < 5; i++) {
            this.milestones.push({
                uniqueId: i + 1, // 👈 VERY IMPORTANT!
                Milestone_Description__c: '',
                Deliverables__c: '',
                Budget_Required__c: '',
                Target_Completion_Months__c: '',
                //Target_Completion_Month__c: '',
                //Milestone_Target_Date__c: '',
                Justification__c: '',
                Status__c: 'Draft'
            });
        }
    }
    }
    
    

    connectedCallback() {
        console.log('🔄 connectedCallback fired');
      
        // 1) Funding Opp
        console.log('📥 Fetching Funding Opportunity ID…');
        getActiveFundingOpportunityId()
          .then(id => {
            console.log('✅ Funding Opportunity ID:', id);
            this.applicationData.FundingOpportunityId = id;
          })
          .catch(err => console.error('❌ Funding Opp error:', err));
      
        // 2) User details
        console.log('📥 Fetching logged‑in user details…');
        getLoggedInUserDetails()
          .then(result => {
            console.log('👤 User details:', result);
            this.applicationData.Institution_Name__c = result.AccountName;
            this.applicationData.COE_Admin__c        = result.ContactName;
            this.applicationData.AccountId          = result.AccountId;
            this.applicationData.ContactId          = result.ContactId;
          })
          .catch(error => console.error('❌ User details error:', error));
      
        // 3) Draft load
      /*  getDraftApplication()
        .then(result => {
            if (result && result.applicationData) {
                console.log('👤 IA details:', result.applicationData);
                const data = result.applicationData;
    
                // 🔁 Explicitly assign each form field value
                this.applicationData.Project_Title__c = data.project_title__c;
                this.applicationData.Project_Duration__c = data.project_duration__c;
                this.applicationData.Project_Website_if_any__c = data.project_website_if_any__c;
                this.applicationData.Keywords__c = data.keywords__c;
                this.applicationData.Primary_Focus_Area__c = data.primary_focus_area__c;
               // this.applicationData.Sub_Focus_Area__c = data.sub_focus_area__c;
                this.applicationData.Sub_Focus_Area__c = data.sub_focus_area__c ? data.sub_focus_area__c.split(';') : [];


                //Page 2
                this.applicationData.PI_Name__c = data.pi_name__c;
this.applicationData.PI_Designation__c = data.pi_designation__c;
this.applicationData.PI_Phone__c = data.pi_phone__c;
this.applicationData.PI_Email__c = data.pi_email__c;
this.applicationData.Institution_Name__c = data.AccountName;
this.applicationData.Co_Principal_Investigator_Co_PI__c = data.co_principal_investigator_co_pi__c;
this.applicationData.CO_PI_Designation__c = data.co_pi_designation__c;
this.applicationData.CO_PI_Institution__c = data.co_pi_institution__c;
this.applicationData.CO_PI_Phone__c = data.co_pi_phone__c;
this.applicationData.CO_PI_Email__c = data.co_pi_email__c;
this.applicationData.Project_Team_Members__c = data.project_team_members__c;
this.applicationData.Expertise_and_Experience_of_Team_in_Spec__c = data.expertise_and_experience_of_team_in_spec__c;
              
            //page 3
          
this.applicationData.Project_Summary__c = data.project_summary__c;
this.applicationData.Objectives_of_the_Project__c = data.objectives_of_the_project__c;
this.applicationData.Project_Approach_and_Work_Plan__c = data.project_approach_and_work_plan__c;
this.applicationData.Key_Problem_Being_Solved__c = data.key_problem_being_solved__c;
this.applicationData.Proposed_Solution__c = data.proposed_solution__c;
this.applicationData.Current_status_of_the_Project_Work_und__c = data.current_status_of_the_project_work_und__c;
this.applicationData.Current_Technology_Readiness_Level_TRL__c = data.current_technology_readiness_level_trl__c;
this.applicationData.Expected_TRL_at_the_end_of_the_Project__c = data.expected_trl_at_the_end_of_the_project__c;
this.applicationData.Novelty_of_the_Project__c = data.novelty_of_the_project__c;
this.applicationData.Competitive_Landscape__c = data.competitive_landscape__c;
this.applicationData.Details_of_IPR_Filed_Granted__c = data.details_of_ipr_filed_granted__c;
this.applicationData.Details_of_Ethical_Received__c = data.details_of_ethical_received__c;
this.applicationData.Full_Proposal_Citations__c = data.full_proposal_citations__c;

// PAGE 4 
this.applicationData.Target_Market_Industry_Application__c = data.target_market_industry_application__c;
this.applicationData.Customer_and_Beneficiaries__c = data.customer_and_beneficiaries__c;
this.applicationData.Potential_for_Commercialization__c = data.potential_for_commercialization__c;
this.applicationData.Business_Model_for_Commercialization__c = data.business_model_for_commercialization__c;
this.applicationData.Potential_Revenue_Generation_Strategy_fo__c = data.potential_revenue_generation_strategy_fo__c;
this.applicationData.Main_Risks_and_Barriers__c = data.main_risks_and_barriers__c;
this.applicationData.Relevant_Partnerships__c = data.relevant_partnerships__c;
this.applicationData.Potential_for_Startup_Formation__c = data.potential_for_startup_formation__c;
this.applicationData.Incubator_Association_Details__c = data.incubator_association_details__c;


//Page 5
this.applicationData.Total_Project_Budget_in_USD__c = data.total_project_budget_in_usd__c;
this.applicationData.Proposed_WIN_Grant_Utilization__c = data.proposed_win_grant_utilization__c;
this.applicationData.List_of_Existing_Funding_Sources_and_Fun__c = data.list_of_existing_funding_sources_and_fun__c;
this.applicationData.Additional_Funding_Plans__c = data.additional_funding_plans__c;
this.WIN_Support__c = data.win_support__c;

//Page 6
this.applicationData.Project_Start_Date__c = data.project_start_date__c;
this.applicationData.Project_End_Date__c = data.project_end_date__c;

//Page 7
this.applicationData.Proposed_Outcomes_Deliverables_under_t__c = data.proposed_outcomes_deliverables_under_t__c;
this.applicationData.Envisioned_Project_Impact__c = data.envisioned_project_impact__c;
this.applicationData.Future_Plan_for_next_3_5_on_comple__c = data.future_plan_for_next_3_5_on_comple__c;


    
                // 🔁 Assign other values if needed
                //this.draftId = result.Id;
                this.recordId = result.Id;
                //this.milestoneRows = result.milestones || [];
                this.milestones = result.milestones || [];
                this.milestones = this.milestones.map((m, index) => ({
                    ...m,
                    uniqueId: index + 1 // 👈 Ensure uniqueId exists for rendering
                }));
                //this.budgetRows = result.budgets || [];
                this.budgets = result.budgets || [];

                this.initializeTables(); 

    
                // Rich Text restore if needed
                setTimeout(() => {
                    this.restoreEditorContent();
                }, 300);
            }
        })
        .catch(error => {
            console.error('❌ Error fetching draft application:', error);
        }); */
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
    

  
    
    //old code
    restoreEditorContent() {
        // List of all rich text fields
        const richTextFields = [
            "Project_Team_Members__c",
            "Expertise_and_Experience_of_Team_in_Spec__c",
            "Project_Summary__c", // Project_Summary_Max_500_words__c
            "Objectives_of_the_Project__c",
            "Project_Approach_and_Work_Plan__c",
            "Key_Problem_Being_Solved__c",
            "Proposed_Solution__c",
            "Current_status_of_the_Project_Work_und__c",
           "Novelty_of_the_Project__c",
            "Competitive_Landscape__c",  // Competitive_Advantage__c
            "Details_of_IPR_Filed_Granted__c",
            "Details_of_Ethical_Received__c",
            "Full_Proposal_Citations__c",
            "Target_Market_Industry_Application__c",
            "Customer_and_Beneficiaries__c",
            "Potential_for_Commercialization__c", // Plan_for_Commercialization__c
            "Business_Model_for_Commercialization__c", 
            "Potential_Revenue_Generation_Strategy_fo__c", // Project_Revenue_Strategy__c
            "List_of_Existing_Funding_Sources_and_Fun__c", //
            "Additional_Funding_Plans__c",
            "WIN_Support__c",
            "Proposed_Outcomes_Deliverables_under_t__c",
            "Envisioned_Project_Impact__c",
            "Future_Plan_for_next_3_5_on_comple__c", // Future_Plan_for_next_3_5_on_comple__c
            "Potential_for_Startup_Formation__c",
            "Main_Risks_and_Barriers__c",
            "Relevant_Partnerships__c",
            "Potential_for_Startup_Formation__c",
            "Incubator_Association_Details__c",
        ];
    
      /*  richTextFields.forEach(field => {
            if (this.applicationData[field]) {
                let richTextElement = this.template.querySelector(`[data-field="${field}"]`);
                if (richTextElement) {
                    richTextElement.innerHTML = this.applicationData[field] || ""; // Restore HTML content
                }
            }
        }); */

        // Inside restoreEditorContent()
richTextFields.forEach(field => {
    if (this.applicationData[field]) {
        let richTextElement = this.template.querySelector(`[data-field="${field}"]`);
        if (richTextElement) {
            richTextElement.innerHTML = this.applicationData[field] || "";
            
            // NEW: Simulate click to reassign activeField
            richTextElement.click(); 
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
   get isPreviewPage4() { return this.previewPage === 4; }
   get isPreviewPage5() { return this.previewPage === 5; }
   get isPreviewPage6() { return this.previewPage === 6; }
   get isPreviewPage7() { return this.previewPage === 7; }
   get isPreviewPage8() { return this.previewPage === 8; }
   get isFirstPreviewPage() { return this.previewPage === 1; }
   get isLastPreviewPage() { return this.previewPage === 8; }

   handlePreview() {
    //this.updateRichTextFields(); 
    this.updateRichTextFieldsForCurrentPage();// Capture latest rich text values
    console.log("Previewing Application Data:", JSON.stringify(this.applicationData, null, 2));
    this.previewPage = 1;
    this.isPreviewVisible = true;
}

handlePreviewNext() {
    try {
    if (this.previewPage < 8) {
        console.log('Inside Preview Next');
        //this.updateRichTextFields();
        this.updateRichTextFieldsForCurrentPage();
        this.previewPage += 1;
        console.log('➡️ After Next: ', this.previewPage);
    }
}catch (error) {
    console.error('Error in handlePreviewNext:', error);
}

}

handlePreviewPrevious() {
  try{
    if (this.previewPage > 1) {
        console.log('➡️ Before Next: ', this.previewPage);
        //this.updateRichTextFields();
        this.updateRichTextFieldsForCurrentPage();
        this.previewPage -= 1;
    }
  }catch (error) {
    console.error('Error in handlePreviewPrevious:', error);
}
   

    
}

   handleClosePreview() {
       this.isPreviewVisible = false;
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

  //working super
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



   
 
get previewTotalBudget() {
    return this.filledBudgets
      .reduce((sum, row) => sum + (Number(row.Amount) || 0), 0);
  }
  

                /** 
 * Only include budget rows where at least one field is non‑empty,
 * and strip any HTML out of the Justification text.
 */
/*get filledBudgets() {
   
    const rows = Array.isArray(this.budgets) ? this.budgets : [];
    return rows
      .filter(b => {
        const hasName = b.Name?.trim() !== '';
        const hasAmt  = b.Amount != null && String(b.Amount).trim() !== '';
        const hasJust = b.Justification__c?.trim() !== '';
        return hasName || hasAmt || hasJust;
      })
      .map(budget => ({
        ...budget,
        Justification__c: this.sanitizeRichText(budget.Justification__c)
      }));
  }*/
  get filledBudgets() {
    const rows = Array.isArray(this.budgets) ? this.budgets : [];
    return rows
        .filter(b => {
            const hasName = b.Name?.trim() !== '';
            const hasAnyYear = b.Year_1__c || b.Year_2__c || b.Year_3_USD__c;
            const hasJust = b.Justification__c?.trim() !== '';
            return hasName || hasAnyYear || hasJust;
        })
        .map(budget => ({
            ...budget,
            Justification__c: this.sanitizeRichText(budget.Justification__c)
        }));
}


       get filledMilestones() {
        return this.milestones
            .filter(m =>
                (m.Milestone_Description__c && m.Milestone_Description__c.trim() !== '') ||
                (m.Deliverables__c && m.Deliverables__c.trim() !== '') ||
                (m.Budget_Required__c && m.Budget_Required__c.trim() !== '') || 
                (m.Target_Completion_Months__c && m.Target_Completion_Months__c.trim() !== '') ||
                //(m.Target_Completion_Month__c && m.Target_Completion_Month__c.trim() !== '') ||
                //(m.Milestone_Target_Date__c && m.Milestone_Target_Date__c.trim() !== '') ||
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

get sanitizedBudgets() {
    return this.filledBudgets.map(budget => ({
        ...budget,
        Justification__c: this.sanitizeRichText(budget.Justification__c)
    }));

}

 //Using this now        
     /*   validateRichTextFields() {
            let isValid = true;
            const requiredFields = [];
        
            // Only validate from Page 2 to Page 7
            switch (this.currentPage) {

                case 2:
                    requiredFields.push(
                        { name: 'Project_Team_Members__c', label: 'Details of Team Members / Mentors / Advisers involved in the Project' },
                        { name: 'Expertise_and_Experience_of_Team_in_Spec__c', label: 'Expertise and Experience of Team in Specific Focus Area of Project' }
                    );
                    break;     

                case 3:
                    requiredFields.push(
                        { name: 'Project_Summary__c', label: 'Project Summary' },
                        { name: 'Objectives_of_the_Project__c', label: 'Objectives of the Project' },
                        { name: 'Project_Approach_and_Work_Plan__c', label: 'Project Approach and Work Plan' },
                        { name: 'Key_Problem_Being_Solved__c', label: 'Key Problem being Solved' },
                        { name: 'Proposed_Solution__c', label: 'Proposed Solution' },
                        { name: 'Current_status_of_the_Project_Work_und__c', label: 'Current status of the Project / Work undertaken so far' },
                        { name: 'Novelty_of_the_Project__c', label: 'Novelty of the Project' },
                        { name: 'Competitive_Landscape__c', label: 'Competitive Advantage' },
                        { name: 'Details_of_IPR_Filed_Granted__c', label: 'Details of IPR Filed / Granted' }
                    );
                    break;
        
                case 4:
                    requiredFields.push(
                       { name: 'Target_Market_Industry_Application__c', label: 'Target Market, Market Demand and Plans to Expand it Further' },
                        { name: 'Customer_and_Beneficiaries__c', label: 'Details of Customers, End-users, and Beneficiaries' },
                        { name: 'Potential_for_Commercialization__c', label: 'Plan for Commercialization and Market Entry' },
                        { name: 'Business_Model_for_Commercialization__c', label: 'Business Model for Commercialization' },
                        { name: 'Potential_Revenue_Generation_Strategy_fo__c', label: 'Potential Revenue Generation Strategy for Project' }
                    );
                    break; 
        
                case 5:
                    requiredFields.push(
                        { name: 'List_of_Existing_Funding_Sources_and_Fun__c', label: 'Details of Prior Funding received / approved under this Project' }
                    );
                    break; 
        
                case 7:
                    requiredFields.push(
                        { name: 'Proposed_Outcomes_Deliverables_under_t__c', label: 'Proposed Outcomes / Deliverables under the Project' },
                        { name: 'Envisioned_Project_Impact__c', label: 'Envisaged Impact of the Project' },
                        { name: 'Future_Plan_for_next_3_5_on_comple__c', label: 'Future Plan for next 3-5 Years on completion of Project' }
                    );
                    break; 
        
                // Page 6 usually has file upload — skip
                default:
                    break;
            }
        
            requiredFields.forEach(fieldObj => {
               const field = this.template.querySelector(`[data-field="${fieldObj.name}"]`);
                const errorMsg = this.template.querySelector(`[data-error="${fieldObj.name}"]`);
                console.log(`🧪 Validating ${fieldObj.name} →`, field?.innerHTML);
               
                //newly added for bullet and numbering
                const content = field?.innerText?.trim(); // ✅ safer check using visible text

if (!content) {
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
        } */

            validateRichTextFields() {
                let isValid = true;
                const requiredFields = [];
            
                switch (this.currentPage) {
                    case 2:
                        requiredFields.push(
                            { name: 'Project_Team_Members__c', label: 'Details of Team Members / Mentors / Advisers involved in the Project' },
                            { name: 'Expertise_and_Experience_of_Team_in_Spec__c', label: 'Expertise and Experience of Team in Specific Focus Area of Project' }
                        );
                        break;
                    case 3:
                        requiredFields.push(
                            { name: 'Project_Summary__c', label: 'Project Summary' },
                            { name: 'Objectives_of_the_Project__c', label: 'Objectives of the Project' },
                            { name: 'Project_Approach_and_Work_Plan__c', label: 'Project Approach and Work Plan' },
                            { name: 'Key_Problem_Being_Solved__c', label: 'Key Problem being Solved' },
                            { name: 'Proposed_Solution__c', label: 'Proposed Solution' },
                            { name: 'Current_status_of_the_Project_Work_und__c', label: 'Current status of the Project / Work undertaken so far' },
                            { name: 'Novelty_of_the_Project__c', label: 'Novelty of the Project' },
                            { name: 'Competitive_Landscape__c', label: 'Competitive Advantage' },
                            { name: 'Details_of_IPR_Filed_Granted__c', label: 'Details of IPR Filed / Granted' }
                        );
                        break;
                    case 4:
                        requiredFields.push(
                            { name: 'Target_Market_Industry_Application__c', label: 'Target Market, Market Demand and Plans to Expand it Further' },
                            { name: 'Customer_and_Beneficiaries__c', label: 'Details of Customers, End-users, and Beneficiaries' },
                            { name: 'Potential_for_Commercialization__c', label: 'Plan for Commercialization and Market Entry' },
                            { name: 'Business_Model_for_Commercialization__c', label: 'Business Model for Commercialization' },
                            { name: 'Potential_Revenue_Generation_Strategy_fo__c', label: 'Potential Revenue Generation Strategy for Project' }
                        );
                        break;
                    case 5:
                        requiredFields.push(
                            { name: 'List_of_Existing_Funding_Sources_and_Fun__c', label: 'Details of Prior Funding received / approved under this Project' }
                        );
                        break;
                    case 7:
                        requiredFields.push(
                            { name: 'Proposed_Outcomes_Deliverables_under_t__c', label: 'Proposed Outcomes / Deliverables under the Project' },
                            { name: 'Envisioned_Project_Impact__c', label: 'Envisaged Impact of the Project' },
                            { name: 'Future_Plan_for_next_3_5_on_comple__c', label: 'Future Plan for next 3-5 Years on completion of Project' }
                        );
                        break;
                    default:
                        break;
                }
            
                requiredFields.forEach(fieldObj => {
                    const field = this.template.querySelector(`[data-field="${fieldObj.name}"]`);
                    const errorMsg = this.template.querySelector(`[data-error="${fieldObj.name}"]`);
            
                    if (!field) {
                        console.warn(`⚠️ Field not found: ${fieldObj.name}`);
                        return;
                    }
            
                    const plainText = field.textContent?.replace(/\u00A0/g, ' ').trim();
            
                    if (!plainText) {
                        console.warn(`❌ Field failed: ${fieldObj.name}`);
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
            }
            

        updateRichTextFieldsForCurrentPage() {
           // const pageToUse = this.isPreviewVisible ? this.previewPage : this.currentPage;
            const pageFields = {

                2:[
                    "Project_Team_Members__c",
                    "Expertise_and_Experience_of_Team_in_Spec__c"
                ],
                3: [
                    "Project_Summary__c", //Project_Summary_Max_500_words__c
                    "Objectives_of_the_Project__c",
                    "Project_Approach_and_Work_Plan__c",
                    "Key_Problem_Being_Solved__c",
                    "Proposed_Solution__c",
                    "Current_status_of_the_Project_Work_und__c",
                    "Novelty_of_the_Project__c",
                    "Competitive_Landscape__c",
                    "Details_of_IPR_Filed_Granted__c",
                    "Details_of_Ethical_Received__c",
                    "Full_Proposal_Citations__c"
                ],
                4: [
                    "Target_Market_Industry_Application__c",
                    "Customer_and_Beneficiaries__c",
                    "Potential_for_Commercialization__c",
                    "Business_Model_for_Commercialization__c",
                    "Potential_Revenue_Generation_Strategy_fo__c",
                     "Main_Risks_and_Barriers__c",
                     "Relevant_Partnerships__c",
                     "Potential_for_Startup_Formation__c",
                     "Incubator_Association_Details__c"
                ],
                5: [
                    "List_of_Existing_Funding_Sources_and_Fun__c",
                    "Additional_Funding_Plans__c",
                    "WIN_Support__c"
                ],
                7: [
                    "Proposed_Outcomes_Deliverables_under_t__c",
                    "Envisioned_Project_Impact__c",
                    "Future_Plan_for_next_3_5_on_comple__c"
                ]
            };
            
           // const fields = pageFields[pageToUse] || [];
         //  old working
          const fields = pageFields[this.currentPage] || [];
        
            fields.forEach(field => {
                const el = this.template.querySelector(`[data-field="${field}"]`);
                if (el) {
                    this.applicationData[field] = el.innerHTML.trim();
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

get formattedTeamMembers() {
    return this.cleanRichText(this.applicationData.Project_Team_Members__c);
}

get formattedExpertiseTeam() {
    return this.cleanRichText(this.applicationData.Expertise_and_Experience_of_Team_in_Spec__c);
}

get formattedProjectSummary() {
    return this.cleanRichText(this.applicationData.Project_Summary__c); //Project_Summary_Max_500_words__c
}
 
get cleanedObjectives() {
    return this.sanitizeRichText(this.applicationData.Objectives_of_the_Project__c);
}

get formattedProjectApproach() {
    return this.cleanRichText(this.applicationData.Project_Approach_and_Work_Plan__c);
}

get formattedKeyProblem() {
    return this.cleanRichText(this.applicationData.Key_Problem_Being_Solved__c);
}

get formattedProposedSolution() {
    return this.cleanRichText(this.applicationData.Proposed_Solution__c);
}

get formattedCurrentStatus() {
    return this.cleanRichText(this.applicationData.Current_status_of_the_Project_Work_und__c);
}

get formattedNovelty() {
    return this.cleanRichText(this.applicationData.Novelty_of_the_Project__c);
}

get formattedCompetitiveLandscape() {
    return this.cleanRichText(this.applicationData.Competitive_Landscape__c);
}

get formattedDetailIPR() {
    return this.cleanRichText(this.applicationData.Details_of_IPR_Filed_Granted__c);
}

get formattedDetailEthical() {
    return this.cleanRichText(this.applicationData.Details_of_Ethical_Received__c);
}

get formattedFullProposal() {
    return this.cleanRichText(this.applicationData.Full_Proposal_Citations__c);
}

get formattedTargetMarketIndustryApplication() {
    return this.cleanRichText(this.applicationData.Target_Market_Industry_Application__c);
}

get formattedCustomer() {
    return this.cleanRichText(this.applicationData.Customer_and_Beneficiaries__c);
}

get formattedPotentialCommercialization() {
    return this.cleanRichText(this.applicationData.Potential_for_Commercialization__c);
}

get formattedBusiness() {
    return this.cleanRichText(this.applicationData.Business_Model_for_Commercialization__c);
}

get formattedPotentialRevenue() {
    return this.cleanRichText(this.applicationData.Potential_Revenue_Generation_Strategy_fo__c);
}

get formattedMainRisk() {
    return this.cleanRichText(this.applicationData.Main_Risks_and_Barriers__c);
}

get formattedRelevantPartnership() {
    return this.cleanRichText(this.applicationData.Relevant_Partnerships__c);
}

get formattedPotentialforStartupFormation() {
    return this.cleanRichText(this.applicationData.Potential_for_Startup_Formation__c);
}

get formattedIncubator() {
    return this.cleanRichText(this.applicationData.Incubator_Association_Details__c);
}
get formattedExistingFundingSources() {
    return this.cleanRichText(this.applicationData.List_of_Existing_Funding_Sources_and_Fun__c);
}

get formattedAdditonalFunding() {
    return this.cleanRichText(this.applicationData.Additional_Funding_Plans__c);
}

get formattedWINSupport() {
    return this.cleanRichText(this.applicationData.WIN_Support__c);
}

get formattedProposedOutcomes() {
    return this.cleanRichText(this.applicationData.Proposed_Outcomes_Deliverables_under_t__c);
}

get formattedEnvisioned() {
    return this.cleanRichText(this.applicationData.Envisioned_Project_Impact__c);
}

get formattedFuturePlan() {
    return this.cleanRichText(this.applicationData.Future_Plan_for_next_3_5_on_comple__c);
}



get formattedSubFocusAreas() {
    const sub = this.applicationData.Sub_Focus_Area__c;
    return Array.isArray(sub) ? sub.join(', ') : sub?.split(';').join(', ');
}

updateCustomRichTextFields() {
    const richTextFields = this.template.querySelectorAll('.text-area');
    richTextFields.forEach(element => {
        const fieldName = element.dataset.field;
        if (fieldName) {
            this.applicationData[fieldName] = element.innerHTML;
        }
    });
}

removeUploadedFile(event) {
    const fieldName = event.currentTarget.dataset.filename;

    // Remove from uploadedFiles array (local only)
    this.uploadedFiles = this.uploadedFiles.filter(f => {
        const matchingField = this.fileUploadFields.find(file => file.name === fieldName);
        return f.name !== matchingField?.uploadedFileName;
    });

    // Clear the uploadedFileName for the removed field
    this.fileUploadFields = this.fileUploadFields.map(file => {
        if (file.name === fieldName) {
            return { ...file, uploadedFileName: '' };
        }
        return file;
    });

    // Recompute Uploaded_Files__c display string
    this.applicationData.Uploaded_Files__c = this.uploadedFiles
        .map(file => {
            const label = this.fileUploadFields.find(f => f.uploadedFileName === file.name)?.label || '';
            return `${label}: ${file.name}`;
        })
        .join('\n');
}






/*handleSaveDraft() {
    console.log('💾 Save Draft clicked');
    this.updateCustomRichTextFields(); 
    // 1) Metadata
    this.applicationData.ApplicationType = 'WIN Project Proposal';
    this.applicationData.Category       = 'Grant Application';
    this.applicationData.Status         = 'Draft';
    this.applicationData.recordTypeId   = '012F6000000UQbBIAW';
    // ensure we have the right lookups
    // (these were set by getLoggedInUserDetails on init)
    this.applicationData.AccountId       = this.applicationData.AccountId;
    this.applicationData.ContactId       = this.applicationData.ContactId;


    

    // 2) Convert multi‑picklist to semicolon string
    let payload = { ...this.applicationData };
    if (Array.isArray(payload.Sub_Focus_Area__c)) {
        payload.Sub_Focus_Area__c = payload.Sub_Focus_Area__c.join(';');
    }

    

    // 4) Filter out empty child rows

    const draftMilestones = this.milestones
  .filter(m =>
      m.Milestone_Description__c?.trim() ||
      m.Deliverables__c?.trim() ||
      m.Budget_Required__c?.toString().trim() ||
      m.Target_Completion_Month__c?.trim() ||
     // m.Milestone_Target_Date__c?.trim() ||
      m.Justification__c?.trim()
  )
  .map(m => {
      const { uniqueId, ...cleanMilestone } = m; // 🚨 Strip `uniqueId`
      return cleanMilestone;
  });

  

    const draftBudgets = this.budgets
    .filter(b =>
        b.Name?.trim() ||
        b.Amount?.toString().trim() ||
        b.Justification__c?.trim()
    )
    .map(b => {
        const { uniqueId, ...cleanBudget } = b; // 🧼 Remove frontend-only `uniqueId`
        return cleanBudget;
    });


    

    // 5) Call Apex
    saveDraftApplication({
        applicationId:   this.recordId,     // null for first draft
        applicationData: payload,
        milestones:      draftMilestones,
        budgets:         draftBudgets,
        recordTypeId:    payload.recordTypeId,
        category:        payload.Category
    })
    .then(newId => {
        this.recordId = newId;
        this.dispatchEvent(new ShowToastEvent({
            title:   'Draft Saved',
            message: 'Your progress has been saved.',
            variant: 'success'
        }));
    })
    .catch(error => {
        console.error('Draft save failed', error);
        // Salesforce formats AuraHandledException here:
        const msg = error?.body?.message 
                  || (error?.body?.pageErrors?.map(e => e.message).join(', '))
                  || 'Unknown error';
      
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Error Saving Draft',
            message: msg,
            variant: 'error'
          })
        );
      });
} */

handleSaveDraft() {
    console.log('💾 Save Draft clicked');
    this.updateCustomRichTextFields(); 

    // 1️⃣ Metadata
    this.applicationData.ApplicationType = 'WIN Project Proposal';
    this.applicationData.Category       = 'Grant Application';
    this.applicationData.Status         = 'Draft';
    this.applicationData.recordTypeId   = '012F6000000UQbBIAW';
    this.applicationData.AccountId      = this.applicationData.AccountId;
    this.applicationData.ContactId      = this.applicationData.ContactId;

    // 2️⃣ Convert multipicklist
    let payload = { ...this.applicationData };
    if (Array.isArray(payload.Sub_Focus_Area__c)) {
        payload.Sub_Focus_Area__c = payload.Sub_Focus_Area__c.join(';');
    }

    // 3️⃣ Prepare draftBudgets — filter, strip `uniqueId`, deduplicate
    const seenBudgets = new Set();
    const draftBudgets = this.budgets
        .filter(b =>
            b.Name?.trim() ||
            b.Year_1__c || b.Year_2__c || b.Year_3_USD__c ||
            //b.Amount?.toString().trim() ||
            b.Justification__c?.trim()
        )
        .map(b => {
            const clean = { ...b };
            delete clean.uniqueId;
            return clean;
        })
        .filter(b => {
            const key = (b.Name || '').trim().toLowerCase();
            if (!key || seenBudgets.has(key)) return false;
            seenBudgets.add(key);
            return true;
        });

    console.log('📤 Budgets going to Apex:', JSON.stringify(draftBudgets, null, 2));

    // 4️⃣ Prepare draftMilestones — filter, strip `uniqueId`, deduplicate
    const seenMilestones = new Set();
    const draftMilestones = this.milestones
        .filter(m =>
            m.Milestone_Description__c?.trim() ||
            m.Deliverables__c?.trim() ||
            m.Budget_Required__c?.toString().trim() ||
            m.Target_Completion_Months__c?.trim() ||
           //m.Target_Completion_Month__c?.trim() ||
            m.Justification__c?.trim()
        )
        .map(m => {
            const clean = { ...m };
            delete clean.uniqueId;
            clean.Milestone_Description__c = clean.Milestone_Description__c?.trim();
            return clean;
        })
        .filter(m => {
            const key = (m.Milestone_Description__c || '').trim().toLowerCase();
            if (!key || seenMilestones.has(key)) return false;
            seenMilestones.add(key);
            return true;
        });

    console.log('📤 Milestone going to Apex:', JSON.stringify(draftMilestones, null, 2));

    const seenCoFounders = new Set();
const draftCoFounders = this.coFounders
    .filter(c =>
        c.Name?.trim() || c.Designation__c?.trim() || c.Institution__c?.trim() ||
        c.Mobile__c?.trim() || c.Email__c?.trim()
    )
    .map(c => {
        const clean = { ...c };
        delete clean.uniqueId;
        return clean;
    })
    .filter(c => {
        const key = (c.Name || '').trim().toLowerCase();
        if (!key || seenCoFounders.has(key)) return false;
        seenCoFounders.add(key);
        return true;
    });
    // 5️⃣ Call Apex
    saveDraftApplication({
        applicationId:   this.recordId,
        applicationData: payload,
        milestones:      draftMilestones,
        budgets:         draftBudgets,
         coFounders:      draftCoFounders,
        recordTypeId:    payload.recordTypeId,
        category:        payload.Category,
    })
    .then((response) => {
        if (!response || !response.applicationId) {
            throw new Error('⚠️ Invalid server response: Missing applicationId');
        }

        console.log('🧾 Apex Response - savedBudgets:', JSON.stringify(response.savedBudgets, null, 2));

        // 6️⃣ Update local budget Ids
        this.budgets = this.budgets.map(local => {
            const match = response.savedBudgets.find(saved =>
                saved.Name === local.Name &&
                saved.Amount == local.Amount
            );
            return match ? { ...local, Id: match.Id } : local;
        });

        this.recordId = response.applicationId;

        this.dispatchEvent(new ShowToastEvent({
            title: 'Draft Saved',
            message: 'Your progress has been saved successfully.',
            variant: 'success'
        }));
    })
    .catch(error => {
        console.error('❌ Error saving draft:', error);
        const msg = error?.body?.message 
                  || (error?.body?.pageErrors?.map(e => e.message).join(', '))
                  || error?.message || 'Unknown error';
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error Saving Draft',
            message: msg,
            variant: 'error'
        }));
    });
}


handleSubmit() {
    console.log('🚀 Submit button clicked');

    const filesAreValid = this.validateFileUploads();
    if (!filesAreValid) {
        console.log('❌ Missing required files');

        this.dispatchEvent(new ShowToastEvent({
            title: 'Missing Files',
            message: this.fileUploadError || 'Please upload all required documents before submitting.',
            variant: 'error'
        }));

        return; // 💥 Prevent form from hiding
    }

    this.showForm = false;
  


    // 1) Metadata
    this.applicationData.ApplicationType       = 'WIN Project Proposal';
    this.applicationData.Category              = 'Grant Application';
    this.applicationData.Status                = 'Submitted';
    this.applicationData.recordTypeId          = '012F6000000UQbBIAW';
    //this.applicationData.AppliedDate = new Date();
    this.applicationData.IsSubmitted           = true;
    // ensure these were set by getLoggedInUserDetails earlier:
    this.applicationData.AccountId             = this.applicationData.AccountId;
    this.applicationData.ContactId             = this.applicationData.ContactId;

    // 2) Validate presence of Funding Opportunity
    if (!this.applicationData.FundingOpportunityId) {
        return this.dispatchEvent(new ShowToastEvent({
            title:   'Error',
            message: 'Funding Opportunity ID is missing!',
            variant: 'error'
        }));
    }

    // 3) Compute total budget
   /* const totalBudget = this.budgets
      .filter(b => b.Amount != null && String(b.Amount).trim() !== '')
      .reduce((sum, b) => sum + Number(b.Amount), 0);
    this.applicationData.Total_Budget__c = totalBudget;
    */
   const totalBudget = this.budgets
  .filter(b => b.Total_Amount__c != null)
  .reduce((sum, b) => sum + (Number(b.Total_Amount__c) || 0), 0);
   this.applicationData.Total_Budget__c = totalBudget;


    // Convert milestone target dates to "YYYY-MM-DD"
const cleanedMilestones = this.milestones.map(m => {
    let clone = { ...m };
  /*  if (clone.Milestone_Target_Date__c) {
        clone.Milestone_Target_Date__c = clone.Milestone_Target_Date__c.split('T')[0];
    } */
    return clone;
}).filter(m =>
    m.Milestone_Description__c?.trim() ||
    m.Deliverables__c?.trim() ||
    m.Budget_Required__c?.toString().trim() ||  
    m.Target_Completion_Months__c?.trim() ||
    //m.Target_Completion_Month__c?.trim() ||
    //m.Milestone_Target_Date__c?.trim() ||
    m.Justification__c?.trim()
);


    // 4) Normalize dates
   /* const fmt = ds => ds ? ds.split('T')[0] : null;
    this.applicationData.Project_Start_Date__c = fmt(this.applicationData.Project_Start_Date__c);
    this.applicationData.Project_End_Date__c   = fmt(this.applicationData.Project_End_Date__c); */

    // 5) Multi‑picklist → semicolon string
    let payload = { ...this.applicationData };
    if (Array.isArray(payload.Sub_Focus_Area__c)) {
        payload.Sub_Focus_Area__c = payload.Sub_Focus_Area__c.join(';');
    }
  
    payload.Id = this.recordId;
    // 6) Filter out blank Milestones & Budgets
    const filledMilestones = this.milestones.filter(m =>
        m.Milestone_Description__c?.trim() ||
        m.Deliverables__c?.trim() ||
        m.Budget_Required__c?.toString().trim() ||     
        m.Target_Completion_Months__c?.trim() ||
        //m.Target_Completion_Month__c?.trim() ||
        //m.Milestone_Target_Date__c?.trim() ||
        m.Justification__c?.trim()
    );
    const filledBudgets = this.budgets.filter(b =>
        b.Name?.trim() ||
        b.Year_1__c || b.Year_2__c || b.Year_3_USD__c ||
        //b.Amount?.toString().trim() ||
        b.Justification__c?.trim()
    );

    console.log('📦 Payload to save:', JSON.stringify(payload, null, 2));
    console.log('💰 Budgets:', JSON.stringify(filledBudgets, null, 2));
    console.log('📑 Milestones:', JSON.stringify(filledMilestones, null, 2));

    // 7) Apex call
  saveApplicationWithMilestones({
    applicationData: payload,
    milestones: cleanedMilestones,
    budgets: filledBudgets,
    fileIds: this.uploadedFiles.map(f => f.documentId),
    coFounders: this.coFounders
})
    .then(appId => {
        console.log('✅ Submitted. ID:', appId);
        this.recordId = appId;
        this.dispatchEvent(new ShowToastEvent({
            title:   'Success',
            message: 'Application submitted!',
            variant: 'success'
        }));

        this.showSubmitSuccessPrompt = true;

        // redirect after a brief pause
       /* setTimeout(() => {
            window.location.href = 'https://wadhwanifoundation.my.site.com/coe/s/';
        }, 1500); */
    })
    .catch(error => {
        console.error('❌ Submission error', error);
        let msg = error.body?.message || error.message || 'Unknown error';
        this.dispatchEvent(new ShowToastEvent({
            title:   'Error',
            message: msg,
            variant: 'error'
        }));
    });
}
  


}