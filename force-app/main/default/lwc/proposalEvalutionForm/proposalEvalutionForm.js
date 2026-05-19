import { LightningElement, wire, track } from 'lwc';
import getCurrentUserInfo from '@salesforce/apex/ProposalEvaluationController.getUserDetails';
import saveEvaluation from '@salesforce/apex/ProposalEvaluationController.saveEvaluation';
import hasAlreadyReviewed from '@salesforce/apex/ProposalEvaluationController.hasAlreadyReviewed';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
const cleanObject = (obj) => JSON.parse(JSON.stringify(obj)); 

import APPLICATION_REVIEW_OBJECT from '@salesforce/schema/ApplicationReview';
import RESEARCH_RATING from '@salesforce/schema/ApplicationReview.Demonstration_of_overall_research_trans__c';
import SUB_AREA_RATING from '@salesforce/schema/ApplicationReview.Sub_Area_Rating__c';
import ECOSYSTEM_RATING from '@salesforce/schema/ApplicationReview.Ecosystem_Infra_Rating__c';
import PROJECT_LIST_RATING from '@salesforce/schema/ApplicationReview.Project_List_Quality_rating__c';
import FACILITIES_RATING from '@salesforce/schema/ApplicationReview.Facilities_Faculty_Rating__c';
import { NavigationMixin } from 'lightning/navigation';


export default class ProposalEvaluationForm extends (LightningElement) {
    @track formData = {
        ResearchRating: '',
        ResearchRemarks: '',
        SubAreaRating: '',
        SubAreaRemarks: '',
        EcosystemRating: '',
        EcosystemRemarks: '',
        ProjectRating: '',
        ProjectRemarks: '',
        FacilitiesRating: '',
        FacilitiesRemarks: '',
        OtherWeakness: '',
        OverallRemarks: ''
    };
    @track accountName = '';
    @track contactName = '';

    @track accountId;
    @track contactId;

    @track researchOptions = [];
    @track subAreaOptions = [];
    @track ecosystemOptions = [];
    @track projectOptions = [];
    @track facilitiesOptions = [];

    @track recordId;  //ApplicationId
    @track showForm = false;
    @track alreadyReviewed = false;


    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.state.recordId;
            console.log('Received IndividualApplication ID from URL:', this.recordId);
        }
    }

    connectedCallback() {
    // Delay until URL param loads
    setTimeout(() => {
        if (this.recordId) {
            this.checkIfReviewed();
        }
    }, 100);
}

    @wire(getObjectInfo, { objectApiName: APPLICATION_REVIEW_OBJECT })
    objectInfo;

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: RESEARCH_RATING
    })
    wiredResearch({ data, error }) {
        if (data) this.researchOptions = data.values;
    }

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: SUB_AREA_RATING
    })
    wiredSubArea({ data }) {
        if (data) this.subAreaOptions = data.values;
    }

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: ECOSYSTEM_RATING
    })
    wiredEcosystem({ data }) {
        if (data) this.ecosystemOptions = data.values;
    }

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: PROJECT_LIST_RATING
    })
    wiredProject({ data }) {
        if (data) this.projectOptions = data.values;
    }

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: FACILITIES_RATING
    })
    wiredFacilities({ data }) {
        if (data) this.facilitiesOptions = data.values;
    }

    @wire(getCurrentUserInfo)
    wiredUser({ data, error }) {
        if (data) {
            this.accountId = data.accountId;
            this.contactId = data.contactId;
            this.accountName = data.accountName;
            this.contactName = data.contactName;
        } else if (error) {
            console.error('Error fetching user info', error);
        }
    }
    
   checkIfReviewed() {
    hasAlreadyReviewed({ applicationId: this.recordId })
        .then((result) => {
            if (result) {
                this.alreadyReviewed = true;
                this.showForm = false;
            } else {
                this.showForm = true;
            }
        })
        .catch((error) => {
            console.error('Error checking review status:', error);
        });
}
   
    handleChange(event) {
        this.formData[event.target.name] = event.target.value;
    }

    handleSubmit() {
        console.log('accountName:', this.accountName); 
        console.log('contactName:', this.contactName);

        if (!this.recordId || !this.accountId || !this.contactId) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Missing required IDs.',
                variant: 'error'
            }));
            return;
        }
    
        saveEvaluation({
            applicationId: this.recordId,
            accountId: this.accountId,
            contactId: this.contactId,
            researchRating: this.formData.ResearchRating,
            researchRemarks: this.formData.ResearchRemarks,
            subAreaRating: this.formData.SubAreaRating,
            subAreaRemarks: this.formData.SubAreaRemarks,
            ecosystemRating: this.formData.EcosystemRating,
            ecosystemRemarks: this.formData.EcosystemRemarks,
            projectRating: this.formData.ProjectRating,
            projectRemarks: this.formData.ProjectRemarks,
            facilitiesRating: this.formData.FacilitiesRating,
            facilitiesRemarks: this.formData.FacilitiesRemarks,
            otherWeakness: this.formData.OtherWeakness,
            overallRemarks: this.formData.OverallRemarks
        })
        .then(() => {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Proposal Evaluation submitted successfully!',
                variant: 'success'
            }));
             setTimeout(() => {
        window.location.href = 'https://wadhwanifoundation.my.site.com/reviewportal/s/individualapplication/IndividualApplication/Default';
    }, 1500); // Delay for user to see the toast
            this.formData = {}; // reset form if needed
        })
        .catch(error => {
            let errorMessage = error.body?.message || 'An error occurred during submission.';
            console.error('❌ Save Error:', JSON.stringify(error));
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: errorMessage,
                variant: 'error'
            }));
        });
    }
    
    
    
}