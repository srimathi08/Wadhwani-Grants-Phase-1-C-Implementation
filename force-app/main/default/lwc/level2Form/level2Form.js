import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import { CurrentPageReference } from 'lightning/navigation';
import FOCUS from '@salesforce/schema/ApplicationReview.Focus_Area__c';
import SUB_FOCUS from '@salesforce/schema/ApplicationReview.Sub_Focus_Area__c';
import FOCUS_SUB_FOCUS from '@salesforce/schema/ApplicationReview.Does_the_Focus_and_Sub_Focus_area_fall_w__c';
import COMMERCIAL_VIABILITY from '@salesforce/schema/ApplicationReview.Commercial_Viability__c';
import MARKET_POTENTIAL from '@salesforce/schema/ApplicationReview.Market_Potential__c';
import SOCIAL_IMPACT from '@salesforce/schema/ApplicationReview.Social_Impact__c';
import TEAM_STRENGTH from '@salesforce/schema/ApplicationReview.Team_Strength_and_Expertise__c';
import EXTERNAL_FUNDING from '@salesforce/schema/ApplicationReview.External_Funding_Potential__c';
import MILESTONE_PLANNING from '@salesforce/schema/ApplicationReview.Milestone_Planning__c';
import BUDGET_REQUISITE from '@salesforce/schema/ApplicationReview.Budget_Requisite__c';
import FINAL_RECOMMENDATION from '@salesforce/schema/ApplicationReview.Final_recommendation_ExternalReviewer__c';
import INNOVATION_NOVELTY from '@salesforce/schema/ApplicationReview.Innovation_Novelty__c';

import APPLICATION_REVIEW from '@salesforce/schema/ApplicationReview';
import saveApplicationReview from '@salesforce/apex/ApplicationReviewExternalController.saveApplicationReview';
import getIndividualApplication from '@salesforce/apex/ApplicationReviewExternalController.getIndividualApplication';
import hasAlreadyReviewed from '@salesforce/apex/ApplicationReviewExternalController.hasAlreadyReviewed';
import getDraftReviewRecord from '@salesforce/apex/ApplicationReviewExternalController.getDraftReviewRecord';
import saveDraftReview from '@salesforce/apex/ApplicationReviewExternalController.saveDraftReview';



export default class Level2Form extends (LightningElement) {
   //@api recordId;
   @track recordId;
    logoUrl = WIN_LOGO;
   // @track showForm1 = true;
   @track showForm = false;
   @track alreadyReviewed = false;

    @track institutionName = '';
    @track subFocusValues = [];
   // @track isLoading = true;
    @track Level2Data = {
        Institution_Name__c: '',
        Title: '',
        ApplicationId: '',
        Focus_Area__c: '',
        Sub_Focus_Area__c: [],
        Does_the_Focus_and_Sub_Focus_area_fall_w__c: '',
        Innovation_Novelty__c: '',
        PI_Name__c: '',
        Co_Principal_Investigator_Co_PI__c: '',
        Commercial_Viability__c: '',
        Commercial_Viability_justification__c: '',
        Market_Potential__c: '',
        Justify_Market_Potential__c: '',
        Social_Impact__c: '',
        Social_Impact_Justification__c: '',
        Team_Strength_and_Expertise__c: '',
        Team_Strength_Expertise_justification__c: '',
        External_Funding_Potential__c: '',
        Milestone_Planning__c: '',
        Milestone_Planning_Justification__c: '',
        Budget_Requisite__c: '',
        Budget_Requisite_Justification__c: '',
        CommunicateToPI__c: '',
        ForWINTeam__c: '',
        Final_recommendation_Not_recommended__c: '',
        Final_recommendation_ExternalReviewer__c: '',
        Total_Score__c: '',
        Overall_Remarks__c: '',
        Rationale_for_Scoring__c: '',
        Commercial_viability_Rationale__c: '',
        Market_Potential_Rationale__c: '',
        Social_Impact_Rationale__c: '',
        External_Funding_Potential_Rationale__c: '',
        Team_Strength_and_Expertise_Rationale__c: '',
        Milestone_Planning_Remarks__c: '',
        Budget_Adequacy_Remarks__c: '',
        Milestone_Planning_Justification_NWP__c: '',
        Budget_Requisite_Justification_UB__c: ''
    };

    showFundingAmountField = false;

//@track showTeamStrengthJustification = false;
@track showMilestoneJustification = false;
@track showBudgetJustification = false;
@track showForWINTeamField = false;
@track showCommunicateToPIField = false;
@track showMilestoneRemarks = false;
@track showBudgetRemarks = false;
@track showMilestoneJustificationNWP = false;
@track showBudgetJustificationUB = false;




    // Picklist Options
    FocusAreaOptions;
    SubFocusAreaOptions;
    FallWithinWinOptions;
    ComericalOptions;
    MarketOptions;
    SocialOptions;
    TeamStrengthOptions;
    ExternalFundingOptions;
    MilestonePlanningOptions;
    BudgetOptions;
    FinalRecommendationOptions;
    InnovationOptions;

 @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.state.recordId;
            console.log('Received IndividualApplication ID from URL:', this.recordId);
             this.checkIfAlreadyReviewed();
             this.fetchIndividualApplication(); // ✅ fetch immediately after setting recordId
        }
    }


    connectedCallback() {
       // this.fetchIndividualApplication();
        console.log('Connected Callback Triggered');
        console.log('Record ID:', this.recordId);

    }

   /* checkIfAlreadyReviewed() {
    hasAlreadyReviewed({ applicationId: this.recordId })
        .then((result) => {
            if (result) {
                this.alreadyReviewed = true;
                this.showForm = false;
            } else {
                this.showForm = true;
            }
        })
        .catch(error => {
            console.error('Error checking review status:', error);
        });
}*/
checkIfAlreadyReviewed() {
    hasAlreadyReviewed({ applicationId: this.recordId })
        .then((result) => {
            if (result) {
                this.alreadyReviewed = true;
                this.showForm = false;
            } else {
                this.showForm = true;
                this.loadDraftReview(); // 🔥 Load draft only if not already submitted
            }
        })
        .catch(error => {
            console.error('Error checking review status:', error);
        });
}
loadDraftReview() {
    getDraftReviewRecord({ applicationId: this.recordId })
        .then((review) => {
            if (review) {
                // Pre-fill the form from the draft review record
                this.Level2Data = {
                    ...this.Level2Data,
                    ...review,
                    Sub_Focus_Area__c: review.Sub_Focus_Area__c
                        ? review.Sub_Focus_Area__c.split(';')
                        : []
                };

                // ✅ Institution Name from nested relationship
                this.institutionName = review.Institution_Name__r?.Name || '';

                // ✅ Manually show justification fields
                const milestoneValue = review.Milestone_Planning__c;
                this.showMilestoneRemarks = milestoneValue === 'Well Planned';
                this.showMilestoneJustification = milestoneValue === 'Partially Planned';
                this.showMilestoneJustificationNWP = milestoneValue === 'Not Well Planned';

                   

                const budgetValue = review.Budget_Requisite__c;
                this.showBudgetRemarks = budgetValue === 'Appropriate';
                this.showBudgetJustification = budgetValue === 'Over-Budget';
                this.showBudgetJustificationUB = budgetValue === 'Under-Budget';
                   
                const recommendation = review.Final_recommendation_ExternalReviewer__c;
                 this.showForWINTeamField = recommendation === 'Recommended for Funding' ; //|| recommendation === 'Not Recommended for Funding'
                   this.showCommunicateToPIField = recommendation === 'Not Recommended for Funding';
    
            }
        })
        .catch((error) => {
            console.error('Error loading draft review record:', error);
        });
}




    @wire(getObjectInfo, { objectApiName: APPLICATION_REVIEW })
    objectInfo;

    /*handleExternalReview() {
        this.showForm1 = true;
    } */

    fetchIndividualApplication() {
        if (this.recordId) {
            getIndividualApplication({ recordId: this.recordId })
                .then(result => {
                    if (result) {

                         // ✅ Check if RecordTypeId matches expected
                      /*   if (result.recordTypeId !== '012GA000000nZOnYAM') { //012F6000000UQbBIAW
                            console.warn('Record Type does not match. Hiding form.');
                            this.showForm2 = false;
                            this.isLoading = false;
                            return;
                        } */
                    //  this.showForm2 = true;
                        // Parse sub focus values into array
                        this.subFocusValues = result.subFocusArea
                            ? result.subFocusArea.split(';').map(val => val.trim())
                            : [];

                        this.Level2Data = {
                            ...this.Level2Data,
                            Title: result.projectTitle,
                            ApplicationId: this.recordId,
                            Institution_Name__c: result.institutionId,
                            PI_Name__c: result.principalInvestigatorName,
                            Co_Principal_Investigator_Co_PI__c: result.coPrincipalInvestigator,
                            Focus_Area__c: result.primaryFocusArea,
                            Sub_Focus_Area__c: this.subFocusValues
                        };

                        this.institutionName = result.institutionName;
                       
                    }
                   // this.isLoading = false;
                })
                .catch(error => {
                    console.error('Error fetching Individual Application:', error);
                   // this.isLoading = false;
                    //this.showForm2 = false;
                });
        }
    }

    handleInstitutionChange(event) {
        this.institutionName = event.detail.value;
        this.Level2Data.Institution_Name__c = event.target.dataset.id;
        console.log('Institution ID:', this.Level2Data.Institution_Name__c);
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: FOCUS })
    wiredFocusPicklist({ data, error }) {
        if (data) {
            this.FocusAreaOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SUB_FOCUS })
    wiredSubFocusPicklist({ data, error }) {
        if (data) {
            this.SubFocusAreaOptions = data.values;

            // If values are not set yet, reassign
            if (!this.Level2Data.Sub_Focus_Area__c.length && this.subFocusValues.length > 0) {
                this.Level2Data.Sub_Focus_Area__c = this.subFocusValues;
            }
        } else {
            console.error('Error loading Sub Focus picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: INNOVATION_NOVELTY })
    wiredInnovationPicklist({ data, error }) {
        if (data) {
            this.InnovationOptions = data.values;
        } else {
            console.error('Error loading Fall Within WIN picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: FOCUS_SUB_FOCUS })
    wiredFallWithinWINPicklist({ data, error }) {
        if (data) {
            this.FallWithinWinOptions = data.values;
        } else {
            console.error('Error loading Fall Within WIN picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: COMMERCIAL_VIABILITY })
    wiredComericalPicklist({ data, error }) {
        if (data) {
            this.ComericalOptions = data.values;
        } else {
            console.error('Error loading Commercial picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: MARKET_POTENTIAL })
    wiredMarketPicklist({ data, error }) {
        if (data) {
            this.MarketOptions = data.values;
        } else {
            console.error('Error loading Market picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SOCIAL_IMPACT })
    wiredSocialPicklist({ data, error }) {
        if (data) {
            this.SocialOptions = data.values;
        } else {
            console.error('Error loading Social picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: TEAM_STRENGTH })
    wiredTeamStrengthPicklist({ data, error }) {
        if (data) {
            this.TeamStrengthOptions = data.values;
        } else {
            console.error('Error loading Team Strength picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: EXTERNAL_FUNDING })
    wiredExternalFundingPicklist({ data, error }) {
        if (data) {
            this.ExternalFundingOptions = data.values;
        } else {
            console.error('Error loading External Funding picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: MILESTONE_PLANNING })
    wiredMilestonePlanningPicklist({ data, error }) {
        if (data) {
            this.MilestonePlanningOptions = data.values;
        } else {
            console.error('Error loading Milestone Planning picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: BUDGET_REQUISITE })
    wiredBudgetPicklist({ data, error }) {
        if (data) {
            this.BudgetOptions = data.values;
        } else {
            console.error('Error loading Budget picklist:', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: FINAL_RECOMMENDATION })
    wiredFinalRecommendationPicklist({ data, error }) {
        if (data) {
            this.FinalRecommendationOptions = data.values;
        } else {
            console.error('Error loading Final Recommendation picklist:', error);
        }
    }

    handleInputChange(event) {
        const fieldName = event.target.name;
        let fieldValue = event.target.value;

        if (fieldName === 'If_yes_how_much_in_USD__c') {
            fieldValue = fieldValue ? parseFloat(fieldValue) : null;
        }

        if (fieldName === 'Prior_Research_Funding_raised__c') {
            this.showFundingAmountField = fieldValue === 'Yes';
        }

  /*  if (fieldName === 'Team_Strength_and_Expertise__c') {
        this.showTeamStrengthJustification = (fieldValue === 'Moderate' || fieldValue === 'Weak');
    } */

    if (fieldName === 'Milestone_Planning__c') {
        this.showMilestoneRemarks = (fieldValue === 'Well Planned');
        this.showMilestoneJustification = (fieldValue === 'Partially Planned');
        this.showMilestoneJustificationNWP = fieldValue === 'Not Well Planned';
    }

    if (fieldName === 'Budget_Requisite__c') {
        this.showBudgetRemarks = (fieldValue === 'Appropriate');
        this.showBudgetJustification = (fieldValue === 'Over-Budget');
        this.showBudgetJustificationUB = fieldValue === 'Under-Budget';
    }

   /* if (fieldName === 'Final_recommendation_ExternalReviewer__c') {
    //this.showForWINTeamField = fieldValue === 'Recommended for Funding';
     this.showForWINTeamField = true;
    this.showCommunicateToPIField = fieldValue === 'Not Recommended for Funding';
}*/
if (fieldName === 'Final_recommendation_ExternalReviewer__c') {
    this.showForWINTeamField = fieldValue === 'Recommended for Funding';
    this.showCommunicateToPIField = fieldValue === 'Not Recommended for Funding';
}



        this.Level2Data = {
            ...this.Level2Data,
            [fieldName]: fieldValue
        };

         // If one of the scoring fields was changed, recalculate
    const scoringFields = [
        'Commercial_Viability__c',
        'Market_Potential__c',
        'Social_Impact__c',
        'External_Funding_Potential__c',
        'Innovation_Novelty__c',
        'Team_Strength_and_Expertise__c'
    ];

    if (scoringFields.includes(fieldName)) {
        this.calculateFinalRatingScore();
    }
    }

    calculateFinalRatingScore() {
        const fields = [
            this.Level2Data.Commercial_Viability__c,
            this.Level2Data.Market_Potential__c,
            this.Level2Data.Social_Impact__c,
            this.Level2Data.External_Funding_Potential__c,
            this.Level2Data.Innovation_Novelty__c,
            this.Level2Data.Team_Strength_and_Expertise__c
        ];
    
        let total = 0;
    
        fields.forEach(value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
                total += numericValue;
            }
        });
    
        this.Level2Data = {
            ...this.Level2Data,
            Total_Score__c: total
        };
    }
  
validateCurrentPageFields() {
    const inputs = this.template.querySelectorAll(
        'lightning-input, lightning-combobox, lightning-textarea'
    );
    let isValid = true;

    inputs.forEach(input => {
        // Only validate visible fields (if you use conditional rendering)
        if (input.required && input.offsetParent !== null && !input.disabled) {
            if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
            }
        }
    });

    return isValid;
}
    
    handleSaveDraft() {
    const dataToSave = {
        ...this.Level2Data,
        Sub_Focus_Area__c: Array.isArray(this.Level2Data.Sub_Focus_Area__c)
            ? this.Level2Data.Sub_Focus_Area__c.join(';')
            : this.Level2Data.Sub_Focus_Area__c
    };

    saveDraftReview({ Level2DataJson: JSON.stringify(dataToSave) })
        .then(result => {
            this.Level2Data.Id = result.Id;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Draft Saved',
                    message: 'Your draft was saved successfully.',
                    variant: 'success'
                })
            );
        })
        .catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Saving Draft',
                    message: error.body?.message || 'Unknown error',
                    variant: 'error'
                })
            );
        });
}

 handleSubmit() {
        console.log('Submitting Data:', JSON.stringify(this.Level2Data));

          // 🔥 Run field validation first!
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

        if (!this.Level2Data.Institution_Name__c) {
            this.showToast('Error', 'Please select a valid Institution (Account).', 'error');
            return;
        }

        if (!this.Level2Data.Title) {
            this.showToast('Error', 'Title is required.', 'error');
            return;
        }

        const dataToSave = {
            ...this.Level2Data,
            Sub_Focus_Area__c: Array.isArray(this.Level2Data.Sub_Focus_Area__c)
                ? this.Level2Data.Sub_Focus_Area__c.join(';')
                : this.Level2Data.Sub_Focus_Area__c,
                 Status: 'Submitted',
                  ApplicationId: this.recordId // ✅ add this line
        };

        if (this.Level2Data.Id) {
    dataToSave.Id = this.Level2Data.Id;
}

        saveApplicationReview({ Level2DataJson: JSON.stringify(dataToSave) })
            .then(() => {
                console.log('Record saved successfully:', JSON.stringify(dataToSave));

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Record saved successfully',
                        variant: 'success'
                    })
                );
                // Reset the form fields after submit
                  this.resetForm();

// ✅ Redirect to the desired URL
window.location.href = 'https://wadhwanifoundation.my.site.com/reviewportal/s/individualapplication/IndividualApplication/Default?IndividualApplication-filterId=__Recent';
})
// https://wadhwanifoundation--wfdev.sandbox.my.site.com/ProposallReviewerPortal/s/individualapplication/IndividualApplication/00BGA00000KFvgw2AD

            
            .catch(error => {
                console.error('Error saving record:', error);

                let errorMessage = 'Failed to save record';
                if (error && error.body && error.body.message) {
                    errorMessage = error.body.message;
                }

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: errorMessage,
                        variant: 'error'
                    })
                );
            });
    }

    resetForm() {
        this.Level2Data = {
            Institution_Name__c: '',
            Title: '',
            ApplicationId: this.recordId, // Keep the Application Id if you still need it
            Focus_Area__c: '',
            Sub_Focus_Area__c: [],
            Does_the_Focus_and_Sub_Focus_area_fall_w__c: '',
            PI_Name__c: '',
            Co_Principal_Investigator_Co_PI__c: '',
            Commercial_Viability__c: '',
            Commercial_Viability_justification__c: '',
            Market_Potential__c: '',
            Justify_Market_Potential__c: '',
            Social_Impact__c: '',
            Social_Impact_Justification__c: '',
            Team_Strength_and_Expertise__c: '',
            Team_Strength_Expertise_justification__c: '',
            External_Funding_Potential__c: '',
            Milestone_Planning__c: '',
            Milestone_Planning_Justification__c: '',
            Budget_Requisite__c: '',
            Budget_Requisite_Justification__c: '',
            Final_recommendation_ExternalReviewer__c: '',
            CommunicateToPI__c: '',
            ForWINTeam__c: '',
            Final_recommendation_Not_recommended__c: '',
            Overall_Remarks__c: '',
            Rationale_for_Scoring__c: '',
            Commercial_viability_Rationale__c: '',
            Market_Potential_Rationale__c: '',
            Social_Impact_Rationale__c: '',
            External_Funding_Potential_Rationale__c: '',
            Team_Strength_and_Expertise_Rationale__c: '',
            Milestone_Planning_Remarks__c: '',
            Budget_Adequacy_Remarks__c: '',
            Milestone_Planning_Justification_NWP__c: '',
            Budget_Requisite_Justification_UB__c: ''
        };
    
        this.institutionName = '';
        this.subFocusValues = [];
        this.showFundingAmountField = false;

         // 🔥 Fetch again to repopulate the default values
    this.fetchIndividualApplication();
    
        // If you also want to reset any UI fields manually (like input elements), you can do that here
        const inputFields = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea');
        if (inputFields) {
            inputFields.forEach(field => {
                field.value = undefined;
            });
        }
    }
    

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    } 

}