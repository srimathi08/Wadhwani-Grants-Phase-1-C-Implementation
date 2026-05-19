import { LightningElement, track, wire } from 'lwc';
import getUserDetails from '@salesforce/apex/AccountController.getUserDetails';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import ACCOUNT_OBJECT from '@salesforce/schema/Account';
import CONTACT_OBJECT from '@salesforce/schema/Contact';
import COUNTRY_CODE from '@salesforce/schema/Contact.SPOC_Country_Code__c';
import FCRA_COMPLIANT from '@salesforce/schema/Account.Are_you_FCRA_exempted_compliant__c';
import EQUIVALENCY_DETERMINATION from '@salesforce/schema/Account.Have_you_cleared_Equivalency_Determinat__c';
import US501C3_ORGANISARION from '@salesforce/schema/Account.Do_you_have_a_US_501_c_3_organization__c';
import updateUserRecords from '@salesforce/apex/AccountController.updateUserRecords';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import linkFilesToAccount from '@salesforce/apex/AccountController.linkFilesToAccount';
import { NavigationMixin } from 'lightning/navigation';

export default class InstituteRegister_Form extends NavigationMixin(LightningElement) {
    @track account = {};
    @track contact = {};
    @track accountId;
    @track contactId;
    @track showForm = true;
    @track showThankYou = false;
    @track formAlreadySubmitted = false;  

    @track uploadedFileIds = []; // Store uploaded file IDs

    //Picklist Values declaration
    @track countryCodeValues = [];
    @track fcraComplianceValues = [];
    @track equivalencyDeterminationValues = [];
    @track us501c3orgValues = [];

     // Track Picklist Selection
     @track isFCRAExempted = false;
     @track has501C3Organization = false;
     @track isEquivalencyCleared = false;

     
    // File Names for Uploaded Documents
    @track fcraFileNames = [];
    @track equivalencyFileNames = [];

    // Load user details when component is initialized
    connectedCallback() {
        this.loadUserDetails();
    }

    // Get the Object Info for Contact Object
    @wire(getObjectInfo, { objectApiName: CONTACT_OBJECT })
    objectInfo;

    //Get the Picklist value for the Country Code from Contact Object
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: COUNTRY_CODE })
        wiredCountryCodePicklistValues({ error, data }) {
            if (data) {
                this.countryCodeValues = data.values;
            } else if (error) {
                console.error('Error fetching picklist values:', error);
            }
        }
    
    // Get the Object Info for Account Object    
    @wire(getObjectInfo, { objectApiName: ACCOUNT_OBJECT })
        accountObjectInfo;   

    // Get Picklist Values for FCRA Compliance (Account)
    @wire(getPicklistValues, { recordTypeId: '$accountObjectInfo.data.defaultRecordTypeId', fieldApiName: FCRA_COMPLIANT })
    wiredFCRAPicklistValues({ error, data }) {
        if (data) {
            this.fcraComplianceValues = data.values;
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }
    
      // Get Picklist Values for Equivalency Determination (Account)
      @wire(getPicklistValues, { recordTypeId: '$accountObjectInfo.data.defaultRecordTypeId', fieldApiName: EQUIVALENCY_DETERMINATION })
      wiredEquivalencyPicklistValues({ error, data }) {
          if (data) {
              this.equivalencyDeterminationValues = data.values;
          } else if (error) {
              console.error('Error fetching picklist values:', error);
          }
      }

      // Get Picklist Values for Do you have a US 501(c)(3) organization? (Account)
      @wire(getPicklistValues, { recordTypeId: '$accountObjectInfo.data.defaultRecordTypeId', fieldApiName: US501C3_ORGANISARION })
      wiredUs501c3PicklistValues({ error, data }) {
          if (data) {
              this.us501c3orgValues = data.values;
          } else if (error) {
              console.error('Error fetching picklist values:', error);
          }
      }

    loadUserDetails() {
        getUserDetails()
            .then(data => {
                // Populate only required fields
                this.account = {
                    Id: data.account.Id,
                    Name: data.account.Name,
                   /* Phone: data.account.Phone,
                    BillingStreet: data.account.BillingStreet,
                    BillingCity: data.account.BillingCity,
                    BillingState: data.account.BillingState,
                    BillingPostalCode: data.account.BillingPostalCode,
                    BillingCountry: data.account.BillingCountry */
                };

                this.contact = {
                    Id: data.contact.Id,
                    Name: data.contact.Name,
                    Email: data.contact.Email,
                    SPOC_Designation__c: data.contact.SPOC_Designation__c,
                    Institute_Country_Code__c: data.contact.SPOC_Country_Code__c
                };

                // Reset all other fields to blank
                this.clearAdditionalFields();
                // Set the Account ID to use in file upload
            this.accountId = data.account.Id;
            
            if (this.account.Institution_Registered__c) {
                this.formAlreadySubmitted = true;  // ✅ If registered, show message
            } else {
                this.showForm = true;  // ✅ Else, show form
            }

            })
            .catch(error => {
                console.error('Error fetching user details:', error);
            });
    }

    // Clear all fields except the required ones
    clearAdditionalFields() {
        this.account.Are_you_FCRA_exempted_compliant__c = '';
        this.account.Do_you_have_a_US_501_c_3_organization__c = '';
        this.account.X501_c_3_name__c = '';
        this.account.X501_c_3_phone_number__c = '';
        this.account.X501_c_3_Email_ID__c = '';
        this.account.Have_you_cleared_Equivalency_Determinat__c = '';

        this.contact.SPOC_Designation__c = '';
        this.contact.Phone = '';
    }

    // Capture changes to form inputs dynamically
    handleInputChange(event) {
        const field = event.target.dataset.field;
        if (event.target.dataset.object === 'account') {
            this.account[field] = event.target.value;
        } else if (event.target.dataset.object === 'contact') {
            this.contact[field] = event.target.value;
        }
    }

    handleCountryCodeChange(event) {
        this.contact.SPOC_Country_Code__c = event.detail.value; // Fetch selected value properly
    }

    handleFCRAPicklistChange(event) {
        this.account.Are_you_FCRA_exempted_compliant__c = event.detail.value; // Correctly fetch selected picklist value
        this.isFCRAExempted = event.detail.value === 'Yes';
    }

    handleEquivalencyPicklistChange(event) {
        this.account.Have_you_cleared_Equivalency_Determinat__c = event.detail.value; // Correctly fetch selected picklist value
        this.isEquivalencyCleared = event.detail.value === 'Yes';
    }

    handleUS501C3PicklistChange(event) {
        this.account.Do_you_have_a_US_501_c_3_organization__c = event.detail.value;
        this.has501C3Organization = event.detail.value === 'Yes';
    }

    // Capture file upload event and store file IDs
    handleFileUpload(event) {
        const uploadedFiles = event.detail.files;
        const uploadType = event.target.dataset.id; // Get the data-id of the upload button
    
        uploadedFiles.forEach(file => {
            this.uploadedFileIds.push(file.documentId); // Store file IDs
        });
    
        // Store file names based on which file input triggered the upload
        if (uploadType === 'fcra') {
            this.fcraFileNames = uploadedFiles.map(file => file.name);
        } else if (uploadType === 'equivalency') {
            this.equivalencyFileNames = uploadedFiles.map(file => file.name);
        }
    }
    
    

    // Handle form submission
    handleSubmit() {


        // Validate required fields
    let isValid = true;
    this.template.querySelectorAll('lightning-input, lightning-combobox').forEach(input => {
        if (input.required && !input.value) {
            input.setCustomValidity('This field is required');
            input.reportValidity();
            isValid = false;
        } else {
            input.setCustomValidity('');
            input.reportValidity();
        }
    });

    if (!isValid) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error',
            message: 'Please fill all required fields before submitting.',
            variant: 'error'
        }));
        return;
    }
        console.log('Submitting Account:', JSON.stringify(this.account));
        console.log('Submitting Contact:', JSON.stringify(this.contact));
        console.log('Uploaded File IDs:', JSON.stringify(this.uploadedFileIds));
    
        updateUserRecords({ updatedAccount: this.account, updatedContact: this.contact })
            .then(() => {
                console.log('✅ Records updated successfully.');
                
                if (this.uploadedFileIds.length > 0) {
                    console.log('✅ Attaching files to Account...');
                    return linkFilesToAccount({ fileIds: this.uploadedFileIds, accountId: this.accountId });
                }
            })
            .then(() => {
                console.log('✅ Files attached successfully.');
                
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Records updated and files attached successfully!',
                        variant: 'success'
                    })
                );
    
                this.showForm = false;
                this.showThankYou = true;

                 // → redirect after 2s to let the toast render
            setTimeout(() => {
                window.location.href = 'https://wadhwanifoundation.my.site.com/coe/s/';
            }, 2000);
            })
            .catch(error => {
                console.error('❌ Error updating records or attaching files:', error);
                
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body?.message || 'Failed to update records or attach files.',
                        variant: 'error'
                    })
                );
            });
    }
    
    
}