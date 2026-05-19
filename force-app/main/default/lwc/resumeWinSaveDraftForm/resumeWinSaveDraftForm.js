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
    import getDraftApplication  from '@salesforce/apex/WinProjectProposalFormController.getDraftApplication';
    import saveDraftApplication from '@salesforce/apex/WinProjectProposalFormController.saveDraftApplication';
    import { CurrentPageReference } from 'lightning/navigation';
    import deleteBudgetRecord from '@salesforce/apex/WinProjectProposalFormController.deleteBudgetRecord';
    import deleteMilestoneRecord from '@salesforce/apex/WinProjectProposalFormController.deleteMilestoneRecord';


export default class ResumeWinSaveDraftForm extends NavigationMixin(LightningElement) {
       // @track recordId = null; // IA draft Id
        @track recordId;
        
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
    
        @track budgets = [];
       //@track budgets =[];
       @track isBudgetModalOpen = false;
       @track budgetModalValue = '';
       @track budgetModalField = '';
       @track budgetModalRowId = null;
       @track budgetModalTitle = '';
    
        @track primaryFocusAreaOptions = [];
        @track subFocusAreaOptions = [];
        @track selectedPrimaryFocusArea;
        @track selectedSubFocusAreas = [];

        //new lines
          @track showPrimaryOther = false;
            @track showSubOther = false;
          
    
        @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference?.state?.recordId) {
            this.recordId = currentPageReference.state.recordId;
        }
    }
    
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
           // Project_Start_Date__c: '',
           // Project_End_Date__c: '',
            Project_Website_if_any__c: '',
            Project_Summary__c: '', // Project_Summary_Max_500_words__c
            Objectives_of_the_Project__c: '',
            Project_Approach_and_Work_Plan__c: '',
            Key_Problem_Being_Solved__c: '',
            Proposed_Solution__c: '',
            Current_status_of_the_Project_Work_und__c: '',
            Novelty_of_the_Project__c: '',
            Competitive_Advantage__c: '', //changed Competitive_Landscape__c
            Details_of_IPR_Filed_Granted__c: '',
            Details_of_Ethical_Received__c: '',
            Full_Proposal_Citations__c: '',
            Target_Market_Industry_Application__c: '',
            Customer_and_Beneficiaries__c: '',
            Plan_for_Commercialization__c: '', //Potential_for_Commercialization__c
            Business_Model_for_Commercialization__c: '',
            Project_Revenue_Strategy__c: '', //Potential_Revenue_Generation_Strategy_fo__c
            Previous_Funding_Details__c: '', // Previous_Funding_Details__c
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
            IsSubmitted:'',
            Primary_Focus_Area_Other__c: '',
        Sub_Focus_Area_Other__c: '',
         Primary_Focus_Area_Other__c: '',
        Sub_Focus_Area_Other__c: ''
        }; 
    
       @track projectDuration = '';
       @track projectStartDate = '';
       @track projectEndDate = '';
       @track showPrimaryOther = false;
       @track showSubOther = false;
    
    
        @track currentPage = 1; //Pagination
         //For progress bar  
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
      /*  @track fileUploadFields = [
            { name: 'Resume_PI', label: '8.1. Resume / Biodata of Principal Investigator:', helpText: '', uploadedFileName: '', required: true },
            { name: 'Govt_ID_of_PI', label: '8.2. PAN Card / Aadhar / Passport Copy or any Govt ID of Principal Investigator:', helpText: '', uploadedFileName: '', required: true },
            { name: 'Resume_Co_PI', label: '8.3. Resume / Biodata of Co-Principal Investigator:', helpText: '' , uploadedFileName: '' },
            { name: 'Govt_ID_of_CO_PI', label: '8.4. PAN Card / Aadhar / Passport Copy or any Govt ID of Co-Principal Investigator:', helpText: '', uploadedFileName: '' },
            { name: 'Letter_Support', label: '8.5. Letter of Support from Institution/Organization:', helpText: '', uploadedFileName: '', required: true},
            { name: 'Letter_Endorsement', label: '8.6. Letter of Endorsement from Industry Collaborators / Partners', helpText: '', uploadedFileName: '' },
            { name: 'Letter_Endorsement_Incubator', label: '8.7. Letter of Endorsement from Incubator:', helpText: '', uploadedFileName: '' },
            { name: 'Detailed_WorkPlan', label: '8.8. Detailed Work Plan and Methodology (figures, flow chart, diagrams)', helpText: '', uploadedFileName: '', required: true },
            { name: 'Document_TRL', label: '8.9. Document demonstrating current status of the project / current TRL:', helpText: '', uploadedFileName: '', required: true },
            { name: 'Supporting_Documents', label: '8.10. Supporting documents of IPR filed / granted:', helpText: '', uploadedFileName: '' },
            { name: 'Supporting_Documents_prior', label: '8.11. Supporting documents of prior funding received under the project:', helpText: '' ,uploadedFileName: '' }
        ];*/

        //new lines
             //File upload declarations
            @track fileUploadFields = [
                { name: 'Document_TRL', label: '8.1. Document demonstrating current status of the project / current TRL', helpText: '', uploadedFileName: '', required: true },
                { name: 'Resume_PI', label: '8.2. Resume / Biodata of Principal Investigator', helpText: '', uploadedFileName: '', required: true },
                { name: 'Resume_Co_PI', label: '8.3. Resume / Biodata of Co-Principal Investigator', helpText: '' , uploadedFileName: '' },
                { name: 'Letter_Support', label: '8.4. Letter of Support from Institution', helpText: '', uploadedFileName: '' },
                { name: 'Letter_Endorsement', label: '8.5. Letter of Endorsement from Industry Collaborators / Partners', helpText: '', uploadedFileName: '', required: true },  
                { name: 'Detailed_WorkPlan', label: '8.6 Detailed Work Plan and Methodology (figures, flow chart, diagrams)', helpText: '', uploadedFileName: '', required: true },
                { name: 'Supporting_Documents', label: '8.7. Supporting documents of IPR filed / granted', helpText: '', uploadedFileName: '' },
                { name: 'Supporting_Documents_prior', label: '8.8. Supporting documents of prior funding received under the project', helpText: '' ,uploadedFileName: '' }
            ];
        
        //Budget Table
/*@track budgets = Array.from({ length: 3 }, (_, index) => ({
            uniqueId: index + 1,
            Name: '',
           Year_1__c: '',
            Year_2__c: '',
            Year_3_USD__c: '',
            Justification__c: '',
            Total_Amount__c: ''
        }));*/
    //new lines
    @track budgets = Array.from({ length: 3 }, (_, index) => ({
    uniqueId: index + 1,
    displayIndex: index + 1,
    Name: '',
    Total_Amount__c: '',
    Total_Amount_INR__c: '',
    Justification__c: ''
}));    
    
        
        @track uploadedFiles = []; // To store uploaded file details
      /*  @track milestones = Array.from({ length: 5 }, (_, index) => ({
            uniqueId: index + 1,
            Milestone_Description__c: '',
            Deliverables__c: '',
            Budget_Required__c: '',
            Target_Completion_Months__c: '', 
            Justification__c: ''
            // Target_Completion_Month__c: '',
            //Milestone_Target_Date__c: '',
        }));*/
  get indexPlusOne() {
    return (index) => index + 1;
}

get previewMilestones() {
    return this.filledMilestones.map((milestone, idx) => ({
        ...milestone,
        indexNumber: idx + 1,   // <-- This fixes S.No
        uniqueKey: milestone.uniqueId || idx
    }));
}


    @track milestones = [
    {
        uniqueId: 1,
        InstallmentLabel: "Instalment – 1 (30%)",
        StaticMilestoneLabel: "Signing of Grant Agreement with WIN COE - M1",
        Milestone_Description__c: "", //
        Activities_under_this_Milestone__c: "",
        Output_and_Deliverables__c: "",
        Project_Start_Date__c: "",
        Project_End_Date__c: "",
        Budget_Required__c: "",
        Budget_Required_INR__c: ""
    },
    {
        uniqueId: 2,
        InstallmentLabel: "Instalment – 2 (30%)",
        StaticMilestoneLabel: "M2",
        Milestone_Description__c: "", //
        Activities_under_this_Milestone__c: "",
        Output_and_Deliverables__c: "",
        Project_Start_Date__c: "",
        Project_End_Date__c: "",
        Budget_Required__c: "",
        Budget_Required_INR__c: ""
    },
    {
        uniqueId: 3,
        InstallmentLabel: "Instalment – 3 (30%)",
        StaticMilestoneLabel: "M3",
        Milestone_Description__c: "",//
        Activities_under_this_Milestone__c: "",
        Output_and_Deliverables__c: "",
        Project_Start_Date__c: "",
        Project_End_Date__c: "",
        Budget_Required__c: "",
        Budget_Required_INR__c: ""
    },
    {
        uniqueId: 4,
        InstallmentLabel: "Instalment – 4",
        StaticMilestoneLabel: "M4 – Completion Report",
        Milestone_Description__c: "", //
        Activities_under_this_Milestone__c: "",
        Output_and_Deliverables__c: "",
        Project_Start_Date__c: "",
        Project_End_Date__c: "",
        Budget_Required__c: "",
        Budget_Required_INR__c: ""
    }
];
           




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
    
      /*  handlePrimaryFocusChange(event) {
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
        }*/
    
handlePrimaryFocusChange(event) {
    const selectedVal = event.detail.value;
    console.log('>>> PRIMARY SELECTED:', selectedVal);

    this.applicationData.Primary_Focus_Area__c = selectedVal;

    // Show the primary "Other" textbox
    this.showPrimaryOther = (selectedVal === 'Other');
    console.log('>>> showPrimaryOther:', this.showPrimaryOther);

    // Dependent picklist logic
    const controllerIndex =
        this.subPicklistValues?.data?.controllerValues[selectedVal];
    console.log('>>> controllerIndex:', controllerIndex);

    this.subFocusAreaOptions =
        this.subPicklistValues.data.values.filter(opt =>
            opt.validFor.includes(controllerIndex)
        );

    console.log('>>> subFocusAreaOptions:', JSON.stringify(this.subFocusAreaOptions));

    // Reset sub focus selection
    this.applicationData.Sub_Focus_Area__c = [];

    // Auto-select "Other" in dependent list
    if (selectedVal === 'Other') {
        const otherOption = this.subFocusAreaOptions.find(o => o.value === 'Other');

        if (otherOption) {
            console.log('>>> Auto-selecting Sub-Focus = Other');

            setTimeout(() => {
                this.applicationData.Sub_Focus_Area__c = ['Other'];
                this.showSubOther = true;

                console.log('>>> Sub-Focus now:', this.applicationData.Sub_Focus_Area__c);
            }, 0);
        }
    } else {
        this.showSubOther = false;
    }
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
            
       /* 
       old working without - numbering list
      // handleKeyDown(event) {
            // Prevent Enter or Backspace from duplicating the selection
            if ((event.key === 'Enter' || event.key === 'Backspace') && window.getSelection) {
                const selection = window.getSelection();
                if (!selection.isCollapsed) {
                    // collapse selection to avoid duplication
                    selection.deleteFromDocument();
                }
            }
        } */
        /* numbering handlekeydown
          handleKeyDown(event) {
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
    }  */
    
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
  /*  get totalBudget() {
        return this.budgets.reduce((sum, row) => {
          // Make sure Amount is treated as a number; treat empty or invalid as 0
          const amt = Number(row.Amount) || 0;
          return sum + amt;
        }, 0);
      } */
       get totalBudget() {
    return this.budgets.reduce((sum, b) => sum + (Number(b.Total_Amount__c) || 0), 0);
}

  get totalUSD() {
    return this.budgets.reduce((sum, b) => sum + (Number(b.Total_Amount__c) || 0), 0);
}

get totalINR() {
    return this.budgets.reduce((sum, b) => sum + (Number(b.Total_Amount_INR__c) || 0), 0);
}

    budgetOpenModal(event) {
    const target = event.currentTarget;

    const rowId = target.dataset.id;
    const field = target.dataset.field;

    if (!rowId || !field) {
        console.error('❌ Invalid Row ID or Field:', rowId, field);
        return;
    }

    this.budgetModalRowId = Number(rowId);
    this.budgetModalField = field;

    const matchedBudget = this.budgets.find(b => b.uniqueId === this.budgetModalRowId);
    this.budgetModalValue = matchedBudget ? matchedBudget[this.budgetModalField] : '';

    this.budgetModalTitle = field === "Justification__c" ? "Edit Justification" : "Edit Field";
    this.isBudgetModalOpen = true;

    setTimeout(() => {
        let editableDiv = this.template.querySelector(".text-area1");
        if (editableDiv) {
            editableDiv.innerHTML = this.budgetModalValue || "";
            this.activeField = editableDiv;
        }
    }, 0);
}
  
        // Close modal
        budgetCloseModal() {
            this.isBudgetModalOpen = false;
        }
     handleBudgetChange(event) {
    const field = event.target.dataset.field;
    const uniqueId = parseInt(event.target.dataset.id, 10);
    let value = event.target.value;

    // Only parse as number for year fields
    if (['Year_1__c', 'Year_2__c', 'Year_3_USD__c'].includes(field)) {
        value = parseInt(value) || 0;
    }

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
    
      /*  handleBudgetChange(event) {
            const field = event.target.dataset.field;
            const uniqueId = parseInt(event.target.dataset.id, 10);
            let value = event.target.value;
        
            this.budgets = this.budgets.map(budget =>
                budget.uniqueId === uniqueId ? { ...budget, [field]: value } : budget
            );
        } */
    
    /*saveBudgetModalData() {
    let editableDiv = this.template.querySelector(".text-area1");
    if (editableDiv) {
        this.budgetModalValue = editableDiv.innerHTML;
    }

    console.log(`💾 Saving data for Row ID: ${this.budgetModalRowId}`);
    console.log(`📝 Field: ${this.budgetModalField}`);
    console.log(`✅ New Value: ${this.budgetModalValue}`);

    // Ensure budgetModalRowId is a number for strict comparison
    const updatedRowId = Number(this.budgetModalRowId);

    this.budgets = this.budgets.map(budget => {
        if (budget.uniqueId === updatedRowId) {
            return {
                ...budget,
                [this.budgetModalField]: this.budgetModalValue
            };
        }
        return budget;
    });

    this.budgetCloseModal();
}*/
saveBudgetModalData() {
    let editableDiv = this.template.querySelector(".text-area1");
    if (editableDiv) {
        this.budgetModalValue = editableDiv.innerHTML;
    }

    console.log(`💾 Saving data for Row ID: ${this.budgetModalRowId}`);
    console.log(`📝 Field: ${this.budgetModalField}`);
    console.log(`✅ New Value: ${this.budgetModalValue}`);

    this.budgets = this.budgets.map(budget => {
        const matchById = this.budgetModalRecordId && budget.Id === this.budgetModalRecordId;
        const matchByUniqueId = budget.uniqueId === this.budgetModalRowId;

        if (matchById || matchByUniqueId) {
            return {
                ...budget,
                [this.budgetModalField]: this.budgetModalValue
            };
        }

        return budget;
    });

    this.budgetCloseModal();
}

validateMonthYear(event) {
    const value = event.target.value.trim();
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/; // MM/YYYY format

    if (!regex.test(value)) {
        event.target.setCustomValidity('Enter a valid month/year in MM/YYYY format (e.g., 06/2025)');
    } else {
        event.target.setCustomValidity('');
    }
    event.target.reportValidity();
}


        handleAmountChange(event) {
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
        }
        
        
    /*    addBudgetRow() {
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
        }*/

    //new lines
       addBudgetRow() {
    let newId = this.budgets.length + 1;
    this.budgets = [...this.budgets, {
        uniqueId: newId,
        displayIndex: newId,
        Name: '',
        Total_Amount__c: '',
        Total_Amount_INR__c: '',
        Justification__c: ''
    }];
}        
    deleteBudgetRow(event) {
    const uniqueId = parseInt(event.currentTarget.dataset.id, 10);
    const budgetToDelete = this.budgets.find(b => b.uniqueId === uniqueId);

    if (budgetToDelete?.Id) {
        // Apex delete call for existing records
        deleteBudgetRecord({ budgetId: budgetToDelete.Id })
            .then(() => {
                this.budgets = this.budgets.filter(b => b.uniqueId !== uniqueId);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: 'Budget row deleted.',
                    variant: 'success'
                }));
            })
            .catch(error => {
                console.error('Error deleting budget:', error);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.body?.message || 'Failed to delete budget row.',
                    variant: 'error'
                }));
            });
    } else {
        // Just remove from local array if not saved yet
        this.budgets = this.budgets.filter(b => b.uniqueId !== uniqueId);
    }
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
                Justification__c: ''
            }];
        }      
                //Target_Completion_Month__c: '',
               // Milestone_Target_Date__c: '',

        deleteMilestoneRow(event) {
    const uniqueId = parseInt(event.currentTarget.dataset.id, 10);
    const milestoneToDelete = this.milestones.find(m => m.uniqueId === uniqueId);

    if (milestoneToDelete?.Id) {
        // Call Apex to delete if already saved
        deleteMilestoneRecord({ milestoneId: milestoneToDelete.Id })
            .then(() => {
                this.milestones = this.milestones.filter(m => m.uniqueId !== uniqueId);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: 'Milestone deleted successfully.',
                    variant: 'success'
                }));
            })
            .catch(error => {
                console.error('Error deleting milestone:', error);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.body?.message || 'Failed to delete milestone.',
                    variant: 'error'
                }));
            });
    } else {
        // If not saved, just remove from local list
        this.milestones = this.milestones.filter(m => m.uniqueId !== uniqueId);
    }
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

  /* mergeDraftAndDefaultBudgets(draftBudgets) {
    const existing = Array.isArray(draftBudgets) ? draftBudgets : [];

    let merged = existing.map((b, index) => ({
        Id: b.Id || null,
        Name: b.Name || '',
        Amount: b.Amount || '',
        Justification__c: b.Justification__c || '',
        Status: b.Status || 'Draft',
        uniqueId: index + 1 // Only used for rendering and modals
    }));

    while (merged.length < 3) {
        merged.push({
            uniqueId: merged.length + 1,
            Name: '',
            Amount: '',
            Justification__c: '',
            Status: 'Draft'
        });
    }

    this.budgets = merged;

    console.log('✅ Budgets after merge:', JSON.stringify(this.budgets, null, 2));
}*/
mergeDraftAndDefaultBudgets(draftBudgets) {
    const existing = Array.isArray(draftBudgets) ? draftBudgets : [];

    // ✅ Only use the existing saved budgets — no auto-padding
    const merged = existing.map((b, index) => ({
        Id: b.Id || null,
        Name: b.Name || '',
       //Year_1__c: b.Year_1__c || 0,
        //Year_2__c: b.Year_2__c || 0,
        //Year_3_USD__c: b.Year_3_USD__c || 0,
        Total_Amount__c: b.Total_Amount__c || 0,
        Total_Amount_INR__c: b.Total_Amount_INR__c || 0,
        Justification__c: b.Justification__c || '',        
        Status: b.Status || 'Draft',
        uniqueId: index + 1 // Important for UI rendering
    }));

    this.budgets = merged;

    console.log('✅ Budgets after merge:', JSON.stringify(this.budgets, null, 2));
}

/*mergeDraftAndDefaultMilestones(draftMilestones) {
    const existing = Array.isArray(draftMilestones) ? draftMilestones : [];

    const merged = existing.map((m, index) => ({
        Id: m.Id || null,
        Milestone_Description__c: m.Milestone_Description__c || '',
        Deliverables__c: m.Deliverables__c || '',
        Budget_Required__c: m.Budget_Required__c || '',
        Target_Completion_Months__c: m.Target_Completion_Months__c || '',
        Justification__c: m.Justification__c || '',
        Status__c: m.Status__c || 'Draft',
        uniqueId: index + 1
    }));

    this.milestones = merged;

    console.log('✅ Milestones after merge:', JSON.stringify(this.milestones, null, 2));
}*/
//new lines
mergeDraftAndDefaultMilestones(draftMilestones) {
    const saved = Array.isArray(draftMilestones) ? draftMilestones : [];

    // 🟢 Base 4 Milestones (static structure from new WIN form)
    const defaultMilestones = [
        {
            uniqueId: 1,
            InstallmentLabel: "Instalment – 1 (30%)",
            StaticMilestoneLabel: "Signing of Grant Agreement with WIN COE - M1",
            Milestone_Description__c: "",
            Activities_under_this_Milestone__c: "",
            Output_and_Deliverables__c: "",
            Project_Start_Date__c: "",
            Project_End_Date__c: "",
            Budget_Required__c: "",
            Budget_Required_INR__c: ""
        },
        {
            uniqueId: 2,
            InstallmentLabel: "Instalment – 2 (30%)",
            StaticMilestoneLabel: "M2",
            Milestone_Description__c: "",
            Activities_under_this_Milestone__c: "",
            Output_and_Deliverables__c: "",
            Project_Start_Date__c: "",
            Project_End_Date__c: "",
            Budget_Required__c: "",
            Budget_Required_INR__c: ""
        },
        {
            uniqueId: 3,
            InstallmentLabel: "Instalment – 3 (30%)",
            StaticMilestoneLabel: "M3",
            Milestone_Description__c: "",
            Activities_under_this_Milestone__c: "",
            Output_and_Deliverables__c: "",
            Project_Start_Date__c: "",
            Project_End_Date__c: "",
            Budget_Required__c: "",
            Budget_Required_INR__c: ""
        },
        {
            uniqueId: 4,
            InstallmentLabel: "Instalment – 4",
            StaticMilestoneLabel: "M4 – Completion Report",
            Milestone_Description__c: "",
            Activities_under_this_Milestone__c: "",
            Output_and_Deliverables__c: "",
            Project_Start_Date__c: "",
            Project_End_Date__c: "",
            Budget_Required__c: "",
            Budget_Required_INR__c: ""
        }
    ];

    // 🟣 Merge saved values row-by-row
    const merged = defaultMilestones.map((d, i) => {
        const existing = saved[i] || {};

        return {
            ...d,
            Id: existing.Id || null,
            Milestone_Description__c: existing.Milestone_Description__c || "",
            Activities_under_this_Milestone__c: existing.Activities_under_this_Milestone__c || "",
            Output_and_Deliverables__c: existing.Output_and_Deliverables__c || "",
            Project_Start_Date__c: existing.Project_Start_Date__c || "",
            Project_End_Date__c: existing.Project_End_Date__c || "",
            Budget_Required__c: existing.Budget_Required__c || "",
            Budget_Required_INR__c: existing.Budget_Required_INR__c || "",
            Status__c: existing.Status__c || "Draft"
        };
    });

    this.milestones = merged;

    console.log('✅ Merged Milestones:', JSON.stringify(this.milestones, null, 2));
}



    
     /*   initializeTables() {
            // 💰 Budget Table - Ensure at least 3 rows
          if (!this.budgets || this.budgets.length === 0) {
    this.budgets = [];
    for (let i = 0; i < 3; i++) {
        this.budgets.push({
            uniqueId: i + 1, // ✅ ADD THIS to make each row identifiable
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
        } */

restoreDependentPicklistOptions() {
    console.log('Inside restore dependent method!');
    const primaryValue = this.applicationData.Primary_Focus_Area__c;
    if (!primaryValue || !this.subPicklistValues?.data) return;

    const controllerValueIndex = this.subPicklistValues.data.controllerValues[primaryValue];

    this.subFocusAreaOptions = this.subPicklistValues.data.values.filter(option =>
        option.validFor.includes(controllerValueIndex)
    );
} 
/*restoreDependentPicklistOptions() {
    const primaryValue = this.applicationData.Primary_Focus_Area__c;
    if (!primaryValue || !this.subPicklistValues?.controllerValues) return;

    const controllerValueIndex = this.subPicklistValues.controllerValues[primaryValue];

    this.subFocusAreaOptions = this.subPicklistValues.values.filter(option =>
        option.validFor.includes(controllerValueIndex)
    );
} 
*/
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
               /* this.applicationData.Institution_Name__c = result.AccountName;
                this.applicationData.COE_Admin__c        = result.ContactName;
                this.applicationData.AccountId          = result.AccountId;
                this.applicationData.ContactId          = result.ContactId;*/
                this.applicationData.Institution_Name__c = result.AccountName || '';
                this.applicationData.PI_Name__c = `${result.FirstName || ''} ${result.LastName || ''}`.trim();
                this.applicationData.PI_Email__c = result.Email || '';
                this.applicationData.PI_Phone__c = result.Phone || '';
                this.applicationData.PI_Institution__c = result.AccountName || '';
                this.applicationData.PI__c = result.UserId || ''; // 🔥 user lookup, not contact
              })
              .catch(error => console.error('❌ User details error:', error));
          
            // 3) Draft load
           getDraftApplication({ recordId: this.recordId })
            .then(result => {
                if (result && result.applicationData) {
                    console.log('👤 IA details:', result.applicationData);
                    const data = result.applicationData;
        
                    // 🔁 Explicitly assign each form field value
                    this.applicationData.Project_Title__c = data.project_title__c;
                    this.applicationData.Project_Duration__c = data.project_duration__c;
                    this.applicationData.Project_Website_if_any__c = data.project_website_if_any__c;
                    this.applicationData.Keywords__c = data.keywords__c;
                    this.applicationData.Describe_Objective_Relevance_of_Project__c = data.describe_objective_relevance_of_project__c;

                     // 👇 Restore Primary & Sub Focus
                   this.applicationData.Primary_Focus_Area__c = data.primary_focus_area__c;
                   this.applicationData.Sub_Focus_Area__c = data.sub_focus_area__c ? data.sub_focus_area__c.split(';') : [];

                    // 👇 Restore Other text fields
                    console.log('Other value of Primary Focus Area:', data.primary_focus_area_other__c);
                  this.applicationData.Primary_Focus_Area_Other__c  = data.primary_focus_area_other__c;
                  console.log('Other value of Primary Focus Area:', data.Sub_Focus_Area_Other__c);
                  this.applicationData.Sub_Focus_Area_Other__c   = data.sub_focus_area_other__c;

                  console.log('🎯 Primary Focus:', this.applicationData.Primary_Focus_Area__c);
                  console.log('🎯 Sub-Focus:', this.applicationData.Sub_Focus_Area__c);


                   /* this.applicationData.Primary_Focus_Area__c = data.primary_focus_area__c;
                 
                    this.applicationData.Sub_Focus_Area__c = data.sub_focus_area__c ? data.sub_focus_area__c.split(';') : []; */
                  

            // -----------------------------
            // 3.2️⃣ Restore "Other" visibility BEFORE picklist is ready
            // -----------------------------
            this.showPrimaryOther = (data.primary_focus_area__c === 'Other');
            this.showSubOther =
                this.applicationData.Sub_Focus_Area__c.includes('Other');

            console.log('🟦 showPrimaryOther (resume):', this.showPrimaryOther);
            console.log('🟪 showSubOther (resume):', this.showSubOther);


                    const waitForPicklist = () => {
    if (this.subPicklistValues?.data) {
        this.restoreDependentPicklistOptions();
       
    // ⏳ Delay textbox display after UI loads
    setTimeout(() => {
        if (this.applicationData.Primary_Focus_Area__c === 'Other') {
            this.showPrimaryOther = true;
        }

        if (this.applicationData.Sub_Focus_Area__c.includes('Other')) {
            this.showSubOther = true;
        }

        console.log('✅ Final showPrimaryOther:', this.showPrimaryOther);
        console.log('✅ Final showSubOther:', this.showSubOther);

    }, 50);


    } else {
        // Try again in 100ms
        setTimeout(waitForPicklist, 100);
    }
};
waitForPicklist();
    
                    //Page 2
    this.applicationData.Institution_Name__c = data.AccountName;
    this.applicationData.PI_Name__c = data.pi_name__c;
    this.applicationData.PI_Designation__c = data.pi_designation__c;
    this.applicationData.PI_Institution__c = data.pi_institution__c;
    this.applicationData.PI_Phone__c = data.pi_phone__c;
    this.applicationData.PI_Email__c = data.pi_email__c;
    this.applicationData.Co_Principal_Investigator_Co_PI__c = data.co_principal_investigator_co_pi__c;
    this.applicationData.CO_PI_Designation__c = data.co_pi_designation__c;
    this.applicationData.CO_PI_Institution__c = data.co_pi_institution__c;
    this.applicationData.CO_PI_Phone__c = data.co_pi_phone__c;
    this.applicationData.CO_PI_Email__c = data.co_pi_email__c;
    this.applicationData.Project_Team_Members__c = data.project_team_members__c;
    this.applicationData.Expertise_and_Experience_of_Team_in_Spec__c = data.expertise_and_experience_of_team_in_spec__c;
                  
                //page 3
              
    this.applicationData.Project_Summary__c = data.project_summary__c;
    this.applicationData.Key_Problem_Being_Solved__c = data.key_problem_being_solved__c;
    this.applicationData.Proposed_Solution__c = data.proposed_solution__c;
    this.applicationData.Novelty_of_the_Project__c = data.novelty_of_the_project__c;
    this.applicationData.Objectives_of_the_Project__c = data.objectives_of_the_project__c;
    this.applicationData.Current_Technology_Readiness_Level_TRL__c = data.current_technology_readiness_level_trl__c;
    this.applicationData.Work_undertaken_supporting_current = data.work_undertaken_supporting_current;
    this.applicationData.Expected_TRL_at_the_end_of_the_Project__c = data.expected_trl_at_the_end_of_the_project__c;
    this.applicationData.Current_status_of_the_Project_Work_und__c = data.current_status_of_the_project_work_und__c; 
    this.applicationData.Project_Approach_and_Work_Plan__c = data.project_approach_and_work_plan__c;
    this.applicationData.Competitive_Advantage__c = data.competitive_advantage__c;
    this.applicationData.Details_of_IPR_Filed_Granted__c = data.details_of_ipr_filed_granted__c;
    this.applicationData.Details_of_Ethical_Received__c = data.details_of_ethical_received__c;
    this.applicationData.Full_Proposal_Citations__c = data.full_proposal_citations__c;
    
    // PAGE 4 
    this.applicationData.Target_Market_Industry_Application__c = data.target_market_industry_application__c;
    this.applicationData.Customer_and_Beneficiaries__c = data.customer_and_beneficiaries__c;
    this.applicationData.Plan_for_Commercialization__c = data.plan_for_commercialization__c;
    this.applicationData.Business_Model_for_Commercialization__c = data.business_model_for_commercialization__c;
    this.applicationData.Project_Revenue_Strategy__c = data.project_revenue_strategy__c;
    this.applicationData.Main_Risks_and_Barriers__c = data.main_risks_and_barriers__c;
    this.applicationData.Relevant_Partnerships__c = data.relevant_partnerships__c;
    this.applicationData.Potential_for_Startup_Formation__c = data.potential_for_startup_formation__c;
    this.applicationData.Incubator_Association_Details__c = data.incubator_association_details__c;
    this.applicationData.Strategy_for_transfer_of_technology__c = data.strategy_for_transfer_of_technology__c;
    this.applicationData.Strategy_for_raising_funds_from_Investor__c  = data.strategy_for_raising_funds_from_investor__c ;
    
    
    //Page 5
    this.applicationData.Total_Project_Budget_in_USD__c = data.total_project_budget_in_usd__c;
    this.applicationData.Total_Project_Budget_INR__c = data.total_project_budget_inr__c;
    //this.applicationData.Proposed_WIN_Grant_Utilization__c = data.proposed_win_grant_utilization__c;
    this.applicationData.Previous_Funding_Details__c = data.previous_funding_details__c;
    //this.applicationData.Additional_Funding_Plans__c = data.additional_funding_plans__c;
    this.applicationData.WIN_Support__c = data.win_support__c;
    
    //Page 6
    //this.applicationData.Project_Start_Date__c = data.project_start_date__c;
    //this.applicationData.Project_End_Date__c = data.project_end_date__c;
    
    //Page 7
    this.applicationData.Proposed_Outcomes_Deliverables_under_t__c = data.proposed_outcomes_deliverables_under_t__c;
    this.applicationData.Envisioned_Project_Impact__c = data.envisioned_project_impact__c;
    this.applicationData.Future_Plan_for_next_3_5_on_comple__c = data.future_plan_for_next_3_5_on_comple__c;
    
    
        
                 this.recordId = result.Id;
               
          /*       if (!result.budgets || result.budgets.length === 0) {
    this.budgets = Array.from({ length: 3 }, (_, i) => ({
        uniqueId: i + 1,
        Name: '',
        Amount: '',
        Justification__c: '',
        Status: 'Draft'
    }));
}

if (!result.milestones || result.milestones.length === 0) {
    this.milestones = Array.from({ length: 5 }, (_, i) => ({
        uniqueId: i + 1,
        Milestone_Description__c: '',
        Deliverables__c: '',
        Budget_Required__c: '',
        Target_Completion_Month__c: '',
        Justification__c: '',
        Status__c: 'Draft'
    }));
} */
 // Milestones
/*if (result.milestones && result.milestones.length > 0) {
    this.milestones = result.milestones.map((m, index) => ({
        Id: m.Id || null,
        Milestone_Description__c: m.Milestone_Description__c || '',
        Deliverables__c: m.Deliverables__c || '',
        Budget_Required__c: m.Budget_Required__c || '',
        Target_Completion_Month__c: m.Target_Completion_Month__c || '',
        Justification__c: m.Justification__c || '',
        Status__c: m.Status__c || 'Draft',
        uniqueId: index + 1
    }));
} else {
    this.milestones = Array.from({ length: 5 }, (_, i) => ({
        uniqueId: i + 1,
        Milestone_Description__c: '',
        Deliverables__c: '',
        Budget_Required__c: '',
        Target_Completion_Month__c: '',
        Justification__c: '',
        Status__c: 'Draft'
    }));
}

// Budgets
if (result.budgets && result.budgets.length > 0) {
    this.budgets = result.budgets.map((b, index) => ({
        Id: b.Id || null,
        Name: b.Name || '',
        Amount: b.Amount || '',
        Justification__c: b.Justification__c || '',
        Status: b.Status || 'Draft',
        uniqueId: index + 1
    }));
} else {
    this.budgets = Array.from({ length: 3 }, (_, i) => ({
        uniqueId: i + 1,
        Name: '',
        Amount: '',
        Justification__c: '',
        Status: 'Draft'
    }));
} */

    this.mergeDraftAndDefaultBudgets(result.budgets);
    this.mergeDraftAndDefaultMilestones(result.milestones);

console.log('🐞 Loaded draft milestones:', JSON.stringify(result.milestones, null, 2));
        
                    // Rich Text restore if needed
                    setTimeout(() => {
                        this.restoreEditorContent();
                    }, 300);
                }
            }) 
            .catch(error => {
                console.error('❌ Error fetching draft application:', error);
            }); 
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
                "Competitive_Advantage__c",  // Competitive_Advantage__c
                "Details_of_IPR_Filed_Granted__c",
                "Details_of_Ethical_Received__c",
                "Full_Proposal_Citations__c",
                "Target_Market_Industry_Application__c",
                "Customer_and_Beneficiaries__c",
                "Plan_for_Commercialization__c", // Plan_for_Commercialization__c
                "Business_Model_for_Commercialization__c", 
                "Project_Revenue_Strategy__c", // Project_Revenue_Strategy__c
                "Previous_Funding_Details__c", //
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
                "Strategy_for_transfer_of_technology__c",
                "Strategy_for_raising_funds_from_Investor__c",
                "Work_undertaken_supporting_current_TRL__c"
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
   /* Production used
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
      }*/
  /*  get filledBudgets() {
       
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
      } */
      
    
          /*production used
          get filledMilestones() {
            return this.milestones
                .filter(m =>
                    (m.Milestone_Description__c && m.Milestone_Description__c.trim() !== '') ||
                    (m.Deliverables__c && m.Deliverables__c.trim() !== '') ||
                    (m.Budget_Required__c && m.Budget_Required__c.trim() !== '') ||   
                    (m.Target_Completion_Months__c && m.Target_Completion_Months__c.trim() !== '') ||  
                    (m.Justification__c && m.Justification__c.trim() !== '')
                )
                .map(milestone => ({
                    ...milestone,
                    Milestone_Description__c: this.sanitizeRichText(milestone.Milestone_Description__c),
                    Deliverables__c: this.sanitizeRichText(milestone.Deliverables__c),
                    Justification__c: this.sanitizeRichText(milestone.Justification__c)
                }));
        } */
           //  //(m.Target_Completion_Month__c && m.Target_Completion_Month__c.trim() !== '') ||
                   // (m.Milestone_Target_Date__c && m.Milestone_Target_Date__c.trim() !== '') ||
    
    //new lines
    get filledBudgets() {
    return this.budgets.filter(b =>
        b.Name?.trim() ||
        b.Total_Amount__c ||
        b.Total_Amount_INR__c ||
        b.Justification__c?.trim()
    ).map(b => ({
        ...b,
        Justification__c: this.sanitizeRichText(b.Justification__c)
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
    
   /* get sanitizedMilestones() {
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
    
    }*/
   //new lines
   get sanitizedMilestones() {
    return this.filledMilestones.map(milestone => ({
        ...milestone,
        Milestone_Description__c: this.sanitizeRichText(milestone.Milestone_Description__c),
        Output_and_Deliverables__c: this.sanitizeRichText(milestone.Output_and_Deliverables__c),
        Activities_under_this_Milestone__c: this.sanitizeRichText(milestone.Activities_under_this_Milestone__c)
    }));
}

get sanitizedBudgets() {
    return this.filledBudgets.map(budget => ({
        ...budget,
        Justification__c: this.sanitizeRichText(budget.Justification__c)
    }));

}
    
     //Using this now        
            validateRichTextFields() {
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
                            { name: 'Key_Problem_Being_Solved__c', label: 'Key Problem being Solved' },
                            { name: 'Proposed_Solution__c', label: 'Proposed Solution' },
                            { name: 'Novelty_of_the_Project__c', label: 'Novelty of the Project' },
                            { name: 'Objectives_of_the_Project__c', label: 'Objectives of the Project' },
                            { name: 'Current_status_of_the_Project_Work_und__c', label: 'Current status of the Project / Work undertaken so far' },
                            { name: 'Work_undertaken_supporting_current_TRL__c', label: 'Work undertaken for supporting current TRL' },
                            { name: 'Project_Approach_and_Work_Plan__c', label: 'Project Approach and Work Plan' },
                            { name: 'Competitive_Advantage__c', label: 'Competitive Advantage' },
                            { name: 'Details_of_IPR_Filed_Granted__c', label: 'Details of IPR Filed / Granted' }                            
                        );
                        break;
            
                    case 4:
                        requiredFields.push(
                           { name: 'Target_Market_Industry_Application__c', label: 'Target Market, Market Demand and Plans to Expand it Further' },
                            { name: 'Customer_and_Beneficiaries__c', label: 'Details of Customers, End-users, and Beneficiaries' },
                            { name: 'Plan_for_Commercialization__c', label: 'Plan for Commercialization and Market Entry' },
                            { name: 'Business_Model_for_Commercialization__c', label: 'Business Model for Commercialization' },
                            { name: 'Project_Revenue_Strategy__c', label: 'Potential Revenue Generation Strategy for Project' },
                            { name: 'Strategy_for_raising_funds_from_Investor__c ', label: 'Strategy for Raising Funds from Investor' }

                        );
                        break; 
            
                    case 5:
                        requiredFields.push(
                            { name: 'Previous_Funding_Details__c', label: 'Details of Prior Funding received / approved under this Project' }
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
                        "Project_Team_Members__c",
                        "Expertise_and_Experience_of_Team_in_Spec__c"
                    ],
                    3: [
                        "Project_Summary__c", //Project_Summary_Max_500_words__c
                        "Key_Problem_Being_Solved__c",
                        "Proposed_Solution__c",
                        "Novelty_of_the_Project__c",
                        "Objectives_of_the_Project__c",
                        "Work_undertaken_supporting_current_TRL__c",
                        "Current_status_of_the_Project_Work_und__c",
                        "Project_Approach_and_Work_Plan__c",
                        "Competitive_Advantage__c",
                        "Details_of_IPR_Filed_Granted__c",
                        "Details_of_Ethical_Received__c",
                         "Full_Proposal_Citations__c"               
                    ],
                    4: [
                        "Target_Market_Industry_Application__c",
                        "Customer_and_Beneficiaries__c",
                        "Plan_for_Commercialization__c",
                        "Business_Model_for_Commercialization__c",
                        "Project_Revenue_Strategy__c",
                         "Main_Risks_and_Barriers__c",
                         "Relevant_Partnerships__c",
                         "Potential_for_Startup_Formation__c",
                         "Incubator_Association_Details__c",
                         "Strategy_for_transfer_of_technology__c",
                         "Strategy_for_raising_funds_from_Investor__c "
                         
                    ],
                    5: [
                        "Previous_Funding_Details__c",
                       //"Additional_Funding_Plans__c",
                        "WIN_Support__c"
                    ],
                    7: [
                        "Proposed_Outcomes_Deliverables_under_t__c",
                        "Envisioned_Project_Impact__c",
                        "Future_Plan_for_next_3_5_on_comple__c"
                    ]
                };
                
               // const fields = pageFields[pageToUse] || [];
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

     get formattedWork() {
        return this.cleanRichText(this.applicationData.Work_undertaken_supporting_current_TRL__c);
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
        return this.cleanRichText(this.applicationData.Competitive_Advantage__c);
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
        return this.cleanRichText(this.applicationData.Plan_for_Commercialization__c);
    }
    
    get formattedBusiness() {
        return this.cleanRichText(this.applicationData.Business_Model_for_Commercialization__c);
    }
    
    get formattedPotentialRevenue() {
        return this.cleanRichText(this.applicationData.Project_Revenue_Strategy__c);
    }
    get formattedStrategy() {
        return this.cleanRichText(this.applicationData.Strategy_for_transfer_of_technology__c);
    }
     get formattedStrategyFunds() {
        return this.cleanRichText(this.applicationData.Strategy_for_raising_funds_from_Investor__c );
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
        return this.cleanRichText(this.applicationData.Previous_Funding_Details__c);
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
    
    
    
  /*  handleSaveDraft() {
        console.log('💾 Save Draft clicked');
        this.updateCustomRichTextFields(); 
        // 1) Metadata
        this.applicationData.ApplicationType = 'WIN Project Proposal';
        this.applicationData.Category       = 'Grant Application';
        this.applicationData.Status         = 'Draft';
        this.applicationData.recordTypeId   = '012F6000000UQbBIAW'; //012GA000000nZOnYAM 012F6000000UQbBIAW
        // ensure we have the right lookups
        // (these were set by getLoggedInUserDetails on init)
        this.applicationData.AccountId       = this.applicationData.AccountId;
        this.applicationData.ContactId       = this.applicationData.ContactId;
    
    
        
    
        // 2) Convert multi‑picklist to semicolon string
        let payload = { ...this.applicationData };
        if (Array.isArray(payload.Sub_Focus_Area__c)) {
            payload.Sub_Focus_Area__c = payload.Sub_Focus_Area__c.join(';');
        }
    
       /* const fmt = ds => (ds && ds !== '') ? ds.split('T')[0] : null;
        payload.Project_Start_Date__c = fmt(payload.Project_Start_Date__c);
        payload.Project_End_Date__c   = fmt(payload.Project_End_Date__c);
        */
    
        // 4) Filter out empty child rows
    
  /*    using  
  const draftMilestones = this.milestones
      .filter(m =>
          m.Milestone_Description__c?.trim() ||
          m.Deliverables__c?.trim() ||
          m.Budget_Required__c?.toString().trim() ||  
          m.Target_Completion_Month__c?.trim() ||
          //m.Milestone_Target_Date__c?.trim() ||
          m.Justification__c?.trim()
      )
      .map(m => {
          const { uniqueId, ...cleanMilestone } = m; // 🚨 Strip `uniqueId`
          return cleanMilestone;
      }); */
    
        /*const draftMilestones = this.milestones.filter(m =>
            m.Milestone_Description__c?.trim() ||
            m.Deliverables__c?.trim() ||
            m.Budget_Required__c?.toString().trim() ||
            m.Milestone_Target_Date__c?.trim() ||
            m.Justification__c?.trim()
        ); */
    
      //old
     /*  const draftBudgets = this.budgets
        .filter(b =>
            b.Name?.trim() ||
            b.Amount?.toString().trim() ||
            b.Justification__c?.trim()
        )
        .map(b => {
            const { uniqueId, ...cleanBudget } = b; // 🧼 Remove frontend-only `uniqueId`
            return cleanBudget;
        }); */

    /*  new
     const draftBudgets = this.budgets
    .filter(b =>
        b.Name?.trim() ||
        b.Amount?.toString().trim() ||
        b.Justification__c?.trim()
    )
    .map(b => {
        const cleanBudget = { ...b };
        delete cleanBudget.uniqueId; // ⛔ Only remove UI-only field
        return cleanBudget;          // ✅ Keep Id if exists
    });

console.log('💾 Clean Budgets to save:', JSON.stringify(draftBudgets, null, 2)); */

    
    
        /*const draftBudgets = this.budgets.filter(b =>
            b.Name?.trim() ||
            b.Amount?.toString().trim() ||
            b.Justification__c?.trim()
        ); */
    
        // 5) Call Apex
    /*    saveDraftApplication({
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
  handleSaveDraft() {
    console.log('💾 Save Draft clicked');
    this.updateCustomRichTextFields(); 

    // 1️⃣ Set metadata
    this.applicationData.ApplicationType = 'WIN Project Proposal';
    this.applicationData.Category        = 'Grant Application';
    this.applicationData.Status          = 'Draft';
    this.applicationData.recordTypeId    = '012F6000000UQbBIAW'; //012GA000000nZOnYAM 012F6000000UQbBIAW

    // 2️⃣ Flatten multi-picklist
    let payload = { ...this.applicationData };
    if (Array.isArray(payload.Sub_Focus_Area__c)) {
        payload.Sub_Focus_Area__c = payload.Sub_Focus_Area__c.join(';');
    }

    // 3️⃣ Ensure all budget rows have Name fallback
    this.budgets = this.budgets.map((b, i) => ({
        ...b,
        Name: b.Name?.trim() || `Unnamed Budget ${i + 1}`
    }));
   // 4️⃣ Prepare draftBudgets
 /* Production code
   const draftBudgets = this.budgets
    .filter(b =>
        b.Name?.trim() ||
        b.Year_1__c || b.Year_2__c || b.Year_3_USD__c ||
        b.Justification__c?.trim()
    )
    .map((b, i) => {
        const clean = { ...b };
        delete clean.uniqueId;

        // Fallback defaults to 0 if empty or invalid
        const y1 = parseFloat(b.Year_1__c) || 0;
        const y2 = parseFloat(b.Year_2__c) || 0;
        const y3 = parseFloat(b.Year_3_USD__c) || 0;
        clean.Year_1__c = y1;
        clean.Year_2__c = y2;
        clean.Year_3_USD__c = y3;
        clean.Total_Amount__c = y1 + y2 + y3;

        // Ensure Name has value
        clean.Name = b.Name?.trim() || `Unnamed Budget ${i + 1}`;

        return clean;
    });*/

//new lines
      const draftBudgets = this.budgets
        .filter(b =>
            b.Name?.trim() ||
            b.Total_Amount__c ||
            b.Total_Amount_INR__c ||
            b.Justification__c?.trim()
        )
        .map(b => {
            const clean = { ...b };

            clean.Total_Amount__c = parseInt(clean.Total_Amount__c) || 0;
            clean.Total_Amount_INR__c = parseInt(clean.Total_Amount_INR__c) || 0;

            delete clean.uniqueId;
            return clean;
        });


    console.log('📤 Budgets going to Apex:', JSON.stringify(draftBudgets, null, 2));
    // 4️⃣ Prepare draftBudgets
   /* const draftBudgets = this.budgets
        .filter(b =>
            b.Name?.trim() ||
            b.Amount?.toString().trim() ||
            b.Justification__c?.trim()
        )
        .map(b => {
            const clean = { ...b };
            delete clean.uniqueId;
            return clean;
        });

    console.log('📤 Budgets going to Apex:', JSON.stringify(draftBudgets, null, 2));*/
   /* Production code
    const draftMilestones = this.milestones
    .filter(m =>
        m.Milestone_Description__c?.trim() ||
        m.Deliverables__c?.trim() ||
        m.Budget_Required__c?.toString().trim() ||    
        m.Target_Completion_Months__c?.trim() ||
        m.Justification__c?.trim()
    )
    .map(m => {
        const clean = { ...m };
        clean.Milestone_Description__c = clean.Milestone_Description__c?.trim();
        delete clean.uniqueId;
        return clean;
    }); */

    //new lines
      const seenMilestones = new Set();
    const draftMilestones = this.milestones
        .filter(m =>
            (m.Milestone_Description__c && m.Milestone_Description__c.trim() !== '') ||
            (m.Activities_under_this_Milestone__c && m.Activities_under_this_Milestone__c.trim() !== '') ||
            (m.Output_and_Deliverables__c && m.Output_and_Deliverables__c.trim() !== '') ||
            (m.Project_Start_Date__c && m.Project_Start_Date__c !== '') ||
            (m.Project_End_Date__c && m.Project_End_Date__c !== '') ||
            (m.Budget_Required__c && m.Budget_Required__c.toString().trim() !== '') ||
            (m.Budget_Required_INR__c && m.Budget_Required_INR__c.toString().trim() !== '')
        )
        .map(m => {
            const clean = { ...m };
            delete clean.uniqueId;

            clean.Milestone_Description__c = clean.Milestone_Description__c?.trim();

            // Normalize dates
            if (clean.Project_Start_Date__c) {
                clean.Project_Start_Date__c = clean.Project_Start_Date__c.split('T')[0];
            }
            if (clean.Project_End_Date__c) {
                clean.Project_End_Date__c = clean.Project_End_Date__c.split('T')[0];
            }

            // Map installment label to API name
            if (m.uniqueId === 1) clean.Installment_of_Funds_1__c = m.InstallmentLabel;
            if (m.uniqueId === 2) clean.Installment_of_Funds_2__c = m.InstallmentLabel;
            if (m.uniqueId === 3) clean.Installment_of_Funds_3__c = m.InstallmentLabel;
            if (m.uniqueId === 4) clean.Installment_of_Funds_4__c = m.InstallmentLabel;

            return clean;
        })
        .filter(m => {
            const key = (m.Milestone_Description__c || '').toLowerCase();
            if (!key || seenMilestones.has(key)) return false;
            seenMilestones.add(key);
            return true;
        });

     
    console.log('📤 Milestone going to Apex:', JSON.stringify(draftMilestones, null, 2));
    // 5️⃣ Prepare draftMilestones
  /*  const draftMilestones = this.milestones
        .filter(m =>
            m.Milestone_Description__c?.trim() ||
            m.Deliverables__c?.trim() ||
            m.Budget_Required__c?.toString().trim() ||
            m.Target_Completion_Month__c?.trim() ||
            m.Justification__c?.trim()
        )
        .map(m => {
            const { uniqueId, ...clean } = m;
            return clean;
        }); */

    // 6️⃣ Save to Apex
    saveDraftApplication({
        applicationId:   this.recordId,
        applicationData: payload,
        milestones:      draftMilestones,
        budgets:         draftBudgets,
        recordTypeId:    payload.recordTypeId,
        category:        payload.Category
    })
    .then((response) => {
        if (!response || !response.applicationId) {
            throw new Error('⚠️ Invalid server response: Missing applicationId');
        }

        console.log('🧾 Apex Response - savedBudgets:', JSON.stringify(response.savedBudgets, null, 2));

        // 7️⃣ Update local budgets with returned Ids
        this.budgets = this.budgets.map(local => {
            const match = response.savedBudgets.find(saved =>
                saved.Name === local.Name &&
               saved.Total_Amount__c == (local.Total_Amount__c || 0)
            );
            return match ? { ...local, Id: match.Id } : local;
        });
        // Update milestone Ids after draft save
this.milestones = this.milestones.map(local => {
    const match = response.savedMilestones.find(saved =>
        saved.Milestone_Description__c?.trim() === local.Milestone_Description__c?.trim()
    );
    return match ? { ...local, Id: match.Id } : local;
});


        // 8️⃣ Update recordId and notify
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
    
            return; // Prevent form from hiding
        }
        this.showForm = false;
    
        // 1) Metadata
        this.applicationData.ApplicationType       = 'WIN Project Proposal';
        this.applicationData.Category              = 'Grant Application';
        this.applicationData.Status                = 'Proposal Submitted to COE Admin';
        this.applicationData.recordTypeId          = '012F6000000UQbBIAW';//Prod - 012GA000000nZOnYAM Sandbox - 012F6000000UQbBIAW
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
          const totalBudget = this.budgets
  .filter(b => b.Total_Amount__c != null)
  .reduce((sum, b) => sum + (Number(b.Total_Amount__c) || 0), 0);
   this.applicationData.Total_Budget__c = totalBudget;
   /*     const totalBudget = this.budgets
          .filter(b => b.Amount != null && String(b.Amount).trim() !== '')
          .reduce((sum, b) => sum + Number(b.Amount), 0);
        this.applicationData.Total_Budget__c = totalBudget; */
    
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
        m.Justification__c?.trim()
    );
    
      //m.Target_Completion_Month__c?.trim() ||
        //m.Milestone_Target_Date__c?.trim() ||
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
            milestones:      cleanedMilestones, // filledMilestones
            budgets:         filledBudgets,
            fileIds:         this.uploadedFiles.map(f => f.documentId)
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
            setTimeout(() => {
                window.location.href = 'https://wadhwanifoundation.my.site.com/coe/s/';
            }, 1500); 
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