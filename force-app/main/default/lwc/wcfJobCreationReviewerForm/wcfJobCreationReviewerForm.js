import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import { CurrentPageReference } from 'lightning/navigation';
import RATE_STABILITY from '@salesforce/schema/ApplicationReview.Rate_financial_stability_over_3_years__c';
import CREDIBLE_RECORDS from '@salesforce/schema/ApplicationReview.Financial_records_credible_complete__c';
import SUSTAINABILITY_VISION from '@salesforce/schema/ApplicationReview.How_strong_is_the_sustainability_vision__c';
import PROGRAM_ALIGNMENT from '@salesforce/schema/ApplicationReview.Program_alignment_with_WCF_priorities__c';
import ORG_SCALE from '@salesforce/schema/ApplicationReview.Org_scale_vs_funding_goals__c';
import PLAN_CLEAR from '@salesforce/schema/ApplicationReview.X1M_plan_clear_feasible_linked__c';
import ESTD_JOB_PLACEMENTS from '@salesforce/schema/ApplicationReview.Estimated_Jobs_with_WCF_Funding__c';
import GENAI_ADOPTION from '@salesforce/schema/ApplicationReview.GenieAI_adoption_potential__c';
import SKILLING_MODEL from '@salesforce/schema/ApplicationReview.Skilling_model_clarity_innovation__c';
import ENROLLMENT_PLACEMENT from '@salesforce/schema/ApplicationReview.X3yr_enrollment_placement_credibility__c';
import COST_PLACEMENT from '@salesforce/schema/ApplicationReview.Cost_placement_vs_benchmark__c';
import EVIDENCE_VALIDATION from '@salesforce/schema/ApplicationReview.Evidence_of_validation_long_term_jobs__c';
import RECOMMEND_FOR_CEO from '@salesforce/schema/ApplicationReview.Recommend_for_CEO_review__c';
import BUSINESS_CREATION_GROWTH from '@salesforce/schema/ApplicationReview.Business_Creation_Growth_Effectiveness__c';
import STRENGTH_RECOMMENDATION from '@salesforce/schema/ApplicationReview.Strength_of_recommendation__c';
import STRENGTH_NO_RECOMMENDATION from '@salesforce/schema/ApplicationReview.Strength_of_non_recommendation__c';

import APPLICATION_REVIEW from '@salesforce/schema/ApplicationReview';
import saveApplicationReview from '@salesforce/apex/WCF_ReviewFormController.saveApplicationReview';
import getIndividualApplication from '@salesforce/apex/WCF_ReviewFormController.getIndividualApplication';
import hasAlreadyReviewed from '@salesforce/apex/WCF_ReviewFormController.hasAlreadyReviewed';
import getDraftReviewRecord from '@salesforce/apex/WCF_ReviewFormController.getDraftReviewRecord';
import saveDraftReview from '@salesforce/apex/WCF_ReviewFormController.saveDraftReview';



export default class wcfJobCreationReviewerForm extends (LightningElement) {
   //@api recordId;
   @track recordId;
    logoUrl = WIN_LOGO;
   // @track showForm1 = true;
   @track showForm = false;
   @track alreadyReviewed = false;

    @track institutionName = '';
    @track subFocusValues = [];
   // @track isLoading = true;
    @track reviewData = {
               ApplicationId: '',
               Rate_financial_stability_over_3_years__c: '',
               Rate_financial_stability_over_3_years_comment__c: '',
               Financial_records_credible_complete__c: '',
               Financial_Records_Comments__c: '',
               How_strong_is_the_sustainability_vision__c: '',
               Sustainability_Plan_Comments__c: '',
               Program_alignment_with_WCF_priorities__c: '',
               Program_Job_Alignment_WCF_Comments__c: '',
               Org_scale_vs_funding_goals__c: '',
               Org_Scale_vs_WCF_Strategy_Comments__c: '',
               X1M_plan_clear_feasible_linked__c: '',
               Proposed_1M_Funding_Use_Comments__c: '',
               Estimated_Jobs_with_WCF_Funding__c: '',
               Estd_job_placements_comments__c: '',
               Rationale_for_added_placements__c: '',
               Rationale_for_Added_Placements_Comments__c: '',
               GenieAI_adoption_potential__c: '',
               GenieAI_Adoption_Strength_Comments__c: '',
               Skilling_model_clarity_innovation__c: '',
               Model_Articulation_Innovation_Comments__c: '',
               X3yr_enrollment_placement_credibility__c: '',
               Enrollment_Placement_Credibility_Comment__c: '',
               Cost_placement_vs_benchmark__c: '',
               Cost_Per_Placement_Benchmarks_Comments__c: '',
               Evidence_of_validation_long_term_jobs__c: '',
               Evidence_of_Validation_Jobs_Comments__c: '',
               Recommend_for_CEO_review__c: '',
               Strength_of_recommendation__c: '',
               Top_3_proposal_strengths_ranked__c: '',
               Top_3_proposal_weaknesses_ranked__c: '',
               Strength_of_non_recommendation__c: '',
               Top_3_proposal_strengths_ranked__c: '',
               Top_3_proposal_weaknesses_ranked__c:'',
    };




@track showCeoRecommendationYes = false; //showMilestoneJustification
@track showCeoRecommendationNo = false; //showMilestoneRemarks

    // Picklist Options
  RateStabilityOptions;
 CredibleRecordsOptions;
 SustainabilityVisionOption;
 ProgramAligmentOptions;
 OrgScaleOptions;
 PlanClearOptions;
 EstdJobPlacementsOptions;
 RationaleOptions;
 GenAIOptions;
 SkillingModelOptions;
 EnrollmentPlacementOptions;
 CostPlacementOptions;
 EvidenceValidationOptions;
 recommendForCeoOptions;
 BusinessCreationGrowthOptions;
 StrengthRecommendationOptions;
 StrengthNoRecommendationOptions;

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

checkIfAlreadyReviewed() {
    hasAlreadyReviewed({ applicationId: this.recordId })
        .then((result) => {
            if (result) {
                this.alreadyReviewed = true;
                this.showForm = false;
            } else {
                this.showForm = true;
                this.loadDraftReview(); 
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
                 this.reviewData = {
                    ...this.reviewData,
                    ...review
                 };
                // ✅ Manually show justification fields
                const recommendvalue = review.Recommend_for_CEO_review__c;
                this.showCeoRecommendationNo = recommendvalue === 'No';
                this.showCeoRecommendationYes = recommendvalue === 'Yes';
            
    
            }
        })
        .catch((error) => {
            console.error('Error loading draft review record:', error);
        });
}




    @wire(getObjectInfo, { objectApiName: APPLICATION_REVIEW })
    objectInfo;



    fetchIndividualApplication() {
        if (this.recordId) {
            getIndividualApplication({ recordId: this.recordId })
                .then(result => {
                    if (result) {
                          this.reviewData = {
                            ...this.reviewData,
                     ApplicationId: this.recordId
                    };
                }
                })
                .catch(error => {
                    console.error('Error fetching Individual Application:', error);
                
                });
        }
    }

   @wire(getObjectInfo, { objectApiName: APPLICATION_REVIEW })
    objectInfo;
  @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: RATE_STABILITY })
    wiredRateStabilityPicklist({ data, error }) {
        if (data) {
            this.RateStabilityOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

 @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: CREDIBLE_RECORDS })
    wiredCrediblePicklist({ data, error }) {
        if (data) {
            this.CredibleRecordsOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

 @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SUSTAINABILITY_VISION })
    wiredSustainabilityPicklist({ data, error }) {
        if (data) {
            this.SustainabilityVisionOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: PROGRAM_ALIGNMENT })
    wiredProgramAligmentPicklist({ data, error }) {
        if (data) {
            this.ProgramAligmentOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: ORG_SCALE })
    wiredOrgScalePicklist({ data, error }) {
        if (data) {
            this.OrgScaleOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: PLAN_CLEAR })
    wiredPlanClearPicklist({ data, error }) {
        if (data) {
            this.PlanClearOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: ESTD_JOB_PLACEMENTS })
    wiredEstdJobPicklist({ data, error }) {
        if (data) {
            this.EstdJobPlacementsOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: GENAI_ADOPTION })
    wiredGenAIPicklist({ data, error }) {
        if (data) {
            this.GenAIOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SKILLING_MODEL })
    wiredSkillingModelPicklist({ data, error }) {
        if (data) {
            this.SkillingModelOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: ENROLLMENT_PLACEMENT })
    wiredEnrollmentPlacementPicklist({ data, error }) {
        if (data) {
            this.EnrollmentPlacementOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: COST_PLACEMENT })
    wiredCostPlacementPicklist({ data, error }) {
        if (data) {
            this.CostPlacementOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: EVIDENCE_VALIDATION })
     wiredEvidenceValidationPicklist({ data, error }) {
        if (data) {
            this.EvidenceValidationOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: RECOMMEND_FOR_CEO })
     wiredRecommendPicklist({ data, error }) {
        if (data) {
            this.recommendForCeoOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: BUSINESS_CREATION_GROWTH })
     wiredBusinessCreationPicklist({ data, error }) {
        if (data) {
            this.BusinessCreationGrowthOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: STRENGTH_RECOMMENDATION })
     wiredStrengthRecommendationPicklist({ data, error }) {
        if (data) {
            this.StrengthRecommendationOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }
@wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: STRENGTH_NO_RECOMMENDATION })
     wiredStrengthNoRecommendationPicklist({ data, error }) {
        if (data) {
            this.StrengthNoRecommendationOptions = data.values;
        } else {
            console.error('Error loading Focus Area picklist:', error);
        }
    }

    handleInputChange(event) {
        const fieldName = event.target.name;
        let fieldValue = event.target.value;


    if (fieldName === 'Recommend_for_CEO_review__c') {
        this.showCeoRecommendationNo = (fieldValue === 'No');
        this.showCeoRecommendationYes = (fieldValue === 'Yes')
    }


        this.reviewData = {
            ...this.reviewData,
            [fieldName]: fieldValue
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
    console.log('Inside Save Draft');
    //this.reviewData.ApplicationId = this.recordId;
    console.log('this.reviewData', this.reviewData);
    const dataToSave = {
        ...this.reviewData,
    };
    saveDraftReview({ reviewDataJson: JSON.stringify(dataToSave) })
        .then(result => {
            this.reviewData.Id = result.Id;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Draft Saved',
                    message: 'Your draft was saved successfully.',
                    variant: 'success'
                })
            );
        })
        .catch(error => {
            // Log full error details in the browser console for debugging
            console.error('Error saving draft:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Saving Draft',
                    message: error.body?.message || error.message || 'Unknown error',
                    variant: 'error'
                })
            );
        });
}
    

 handleSubmit() {
   // this.reviewData.ApplicationId = this.recordId;
        console.log('Submitting Data:', JSON.stringify(this.reviewData));

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


        const dataToSave = {
            ...this.reviewData,
                 Status: 'Submitted',
                  ApplicationId: this.recordId // ✅ add this line
        };

        if (this.reviewData.Id) {
    dataToSave.Id = this.reviewData.Id;
}

        saveApplicationReview({ reviewDataJson: JSON.stringify(dataToSave) })
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
        this.reviewData = {
         ApplicationId: this.recordId, // Keep the Application Id if you still need it
        Rate_financial_stability_over_3_years__c: '',
        Rate_financial_stability_over_3_years_comment__c: '',
        Financial_records_credible_complete__c: '',
        Financial_Records_Comments__c: '',
        How_strong_is_the_sustainability_vision__c: '',
        Sustainability_Plan_Comments__c: '',
        Program_alignment_with_WCF_priorities__c: '',
        Program_Job_Alignment_WCF_Comments__c: '',
        Org_scale_vs_funding_goals__c: '',
        Org_Scale_vs_WCF_Strategy_Comments__c: '',
        X1M_plan_clear_feasible_linked__c: '',
        Proposed_1M_Funding_Use_Comments__c: '',
        Estimated_Jobs_with_WCF_Funding__c: '',
        Estd_job_placements_comments__c: '',
        Rationale_for_added_placements__c: '',
        Rationale_for_Added_Placements_Comments__c: '',
        GenieAI_adoption_potential__c: '',
        GenieAI_Adoption_Strength_Comments__c: '',
        Skilling_model_clarity_innovation__c: '',
        Model_Articulation_Innovation_Comments__c: '',
        X3yr_enrollment_placement_credibility__c: '',
        Enrollment_Placement_Credibility_Comment__c: '',
        Cost_placement_vs_benchmark__c: '',
        Cost_Per_Placement_Benchmarks_Comments__c: '',
        Evidence_of_validation_long_term_jobs__c: '',
        Evidence_of_Validation_Jobs_Comments__c: '',
        Recommend_for_CEO_review__c: '',
        Strength_of_recommendation__c: '',
        Top_3_proposal_strengths_ranked__c: '',
        Top_3_proposal_weaknesses_ranked__c: '',
        Strength_of_non_recommendation__c: '',
        Top_3_proposal_strengths_ranked__c: '',
        Top_3_proposal_weaknesses_ranked__c:''
        };
    
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