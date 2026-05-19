import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import FOCUS_AREA1 from '@salesforce/schema/IndividualApplication.Primary_Focus_Area__c';
import SUB_FOCUS_AREA1 from '@salesforce/schema/IndividualApplication.Sub_Focus_Area__c';
import FOCUS_AREA2 from '@salesforce/schema/IndividualApplication.Focus_Area_2__c';
import SUB_FOCUS_AREA2 from '@salesforce/schema/IndividualApplication.Sub_Focus_Area_Focus_area_2__c';
import FOCUS_AREA3 from '@salesforce/schema/IndividualApplication.Focus_Area_3__c';
import SUB_FOCUS_AREA3 from '@salesforce/schema/IndividualApplication.Sub_Focus_Area_Focus_area_3__c';
import INDIVIDUAL_APPLICATION_OBJECT from '@salesforce/schema/IndividualApplication';
import getLoggedInUserDetails from '@salesforce/apex/proposalController.getLoggedInUserDetails';
import createProposal from '@salesforce/apex/proposalController.createProposal';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import { NavigationMixin } from 'lightning/navigation';

export default class ProposalForm extends NavigationMixin(LightningElement)  {
    @track institutionName;
    @track institutionId;
    @track proposalId;
    @track uploadedFileName;
    @track uploadedDocIds;
    @track showform = true;
    @track showThankYou = false;
    winLogoUrl = WIN_LOGO;

    @track ProposalData = {
        Primary_Focus_Area__c: '',
        Sub_Focus_Area__c: [],
        Focus_Area_2__c: '',
        Sub_Focus_Area_Focus_area_2__c: [],
        Focus_Area_3__c: '',
        Sub_Focus_Area_Focus_area_3__c: []
    };

    @track showSubFocus1 = false;
    @track showSubFocus2 = false;
    @track showSubFocus3 = false;

    @track FocusArea1Options = [];
    @track FocusArea2Options = [];
    @track FocusArea3Options = [];
    @track subFocusArea1Options = [];
    @track subFocusArea2Options = [];
    @track subFocusArea3Options = [];

    fullSubFocusArea1Data;
    fullSubFocusArea2Data;
    fullSubFocusArea3Data;

    @wire(getObjectInfo, { objectApiName: INDIVIDUAL_APPLICATION_OBJECT })
    objectInfo;

    @wire(getLoggedInUserDetails)
    wiredUserData({ error, data }) {
        if (data) {
            this.institutionName = data.accountName;
            this.institutionId = data.accountId;
        } else if (error) {
            this.showToast('Error', 'Error fetching user details.', 'error');
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: FOCUS_AREA1 })
    wiredFocus1PicklistValues({ data }) {
        if (data) this.FocusArea1Options = data.values;
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SUB_FOCUS_AREA1 })
    wiredSubFocus1PicklistValues({ data }) {
        if (data) this.fullSubFocusArea1Data = data;
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: FOCUS_AREA2 })
    wiredFocus2PicklistValues({ data }) {
        if (data) this.FocusArea2Options = data.values;
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SUB_FOCUS_AREA2 })
    wiredSubFocus2PicklistValues({ data }) {
        if (data) this.fullSubFocusArea2Data = data;
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: FOCUS_AREA3 })
    wiredFocus3PicklistValues({ data }) {
        if (data) this.FocusArea3Options = data.values;
    }

    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SUB_FOCUS_AREA3 })
    wiredSubFocus3PicklistValues({ data }) {
        if (data) this.fullSubFocusArea3Data = data;
    }

    handleInputChange(event) {
        const { name, value } = event.target;
        this.ProposalData[name] = value;

        if (name === 'Primary_Focus_Area__c') {
            this.showSubFocus1 = !!value;
            this.updateSubFocusOptions(value, this.fullSubFocusArea1Data, 'subFocusArea1Options', 'Sub_Focus_Area__c');
        }
        if (name === 'Focus_Area_2__c') {
            this.showSubFocus2 = !!value;
            this.updateSubFocusOptions(value, this.fullSubFocusArea2Data, 'subFocusArea2Options', 'Sub_Focus_Area_Focus_area_2__c');
        }
        if (name === 'Focus_Area_3__c') {
            this.showSubFocus3 = !!value;
            this.updateSubFocusOptions(value, this.fullSubFocusArea3Data, 'subFocusArea3Options', 'Sub_Focus_Area_Focus_area_3__c');
        }
    }

    updateSubFocusOptions(value, fullData, optionListName, subFocusFieldName) {
        if (!value) {
            this[optionListName] = [];
            this.ProposalData[subFocusFieldName] = [];
        } else {
            const controllerKey = fullData.controllerValues[value];
            this[optionListName] = fullData.values.filter(opt => opt.validFor.includes(controllerKey));
        }
    }

    handleFileUpload(event) {
        const uploadedFiles = event.detail.files;
        if (uploadedFiles.length > 0) {
            this.uploadedFileName = uploadedFiles[0].name;
            this.uploadedDocIds = uploadedFiles.map(file => file.documentId);
        }
    }

    handleSubmit() {
        let isValid = true;
        let errorMsg = '';
    
        // Validate Focus Area 1 + Sub Focus Area 1
        if (!this.ProposalData.Primary_Focus_Area__c) {
            isValid = false;
            errorMsg = 'Focus Area 1 is required.';
        } else if (this.ProposalData.Sub_Focus_Area__c.length === 0) {
            isValid = false;
            errorMsg = 'Sub Focus Area 1 is required.';
        }
    
    
        // Validate file upload
        if (isValid && (!this.uploadedDocIds || this.uploadedDocIds.length === 0)) {
            isValid = false;
            errorMsg = 'Please upload at least one proposal document.';
        }
    
        if (!isValid) {
            this.showToast('Validation Error', errorMsg, 'error');
            return;
        }
    
        // Proceed with payload creation
        const payload = {
            AccountId: this.institutionId,
            Primary_Focus_Area__c: this.ProposalData.Primary_Focus_Area__c,
            Sub_Focus_Area__c: this.ProposalData.Sub_Focus_Area__c?.join(';') || '',
            Focus_Area_2__c: this.ProposalData.Focus_Area_2__c,
            Sub_Focus_Area_Focus_area_2__c: this.ProposalData.Sub_Focus_Area_Focus_area_2__c?.join(';') || '',
            Focus_Area_3__c: this.ProposalData.Focus_Area_3__c,
            Sub_Focus_Area_Focus_area_3__c: this.ProposalData.Sub_Focus_Area_Focus_area_3__c?.join(';') || '',
            documentIds: this.uploadedDocIds && this.uploadedDocIds.length > 0 ? this.uploadedDocIds : []
        };
    
        console.log('Submitting Proposal Payload:', JSON.stringify(payload, null, 2));
    
        createProposal({ data: payload })
            .then(result => {
                console.log('Proposal Submission Result:', result);
                this.showToast('Success', 'Proposal submitted successfully!', 'success');
                this.showThankYou = true;
                this.showform = false;



                // Navigate to Home after 2 seconds (Added till 203)
                // Redirect to your Experience Site home URL after a short delay
        setTimeout(() => {
            window.location.href = 'https://wadhwanifoundation.my.site.com/coe/s/';
        }, 2000); // 2‑second delay to let the toast display
    })

           
            .catch(error => {
                console.error('Error submitting proposal:', error);
                this.showToast('Error', 'Error submitting proposal.', 'error');
            });
    }
    


showToast(title, message, variant) {
console.log(`Toast fired - ${variant}: ${title} - ${message}`);
const evt = new ShowToastEvent({
title: title,
message: message,
variant: variant,
});
this.dispatchEvent(evt);
}

}