import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import getPersonAccountAndContactId from '@salesforce/apex/externalController.getPersonAccountAndContactId';
import getPersonAccountDetails from '@salesforce/apex/externalController.getPersonAccountDetails';
import updatePersonAccount from '@salesforce/apex/externalController.updatePersonAccount';
import markReviewerRegistered from '@salesforce/apex/externalController.markReviewerRegistered';

export default class ExternalReviewerForm extends LightningElement {
    winLogoUrl = WIN_LOGO;

    accountId;
    @track uploadedFileName = '';
    @track cvUploaded = false;
    @track showThankYouMessage = false;

    @track salutation = '';
    @track firstName = '';
    //@track middleName = '';
    @track lastName = '';
    @track phone = '';
    @track personEmail = '';
    @track emailCustom = '';
    @track currentOrganization = '';
    @track currentRole = '';
    @track fieldOfSpecialization = [];
    @track profileExecutiveSummary = '';
    @track billingStreet = '';
    @track billingCity = '';
    @track billingCountry = '';
    @track billingState = '';
    @track billingPostalCode = '';
    @track panNumber = '';
    @track bankAccountName = '';
    @track accountNumber = '';
    @track bankName = '';
    @track branchName = '';
    @track ifscCode = '';
    @track linkedInUrl = '';


    @track countryOptions = [
        { label: 'India', value: 'IN' },
        { label: 'United States', value: 'US' }
       
    ];

    @track allStateOptions = {
    IN: [
        { label: 'Andaman and Nicobar Islands', value: 'AN' },
        { label: 'Andhra Pradesh', value: 'AP' },
        { label: 'Arunachal Pradesh', value: 'AR' },
        { label: 'Assam', value: 'AS' },
        { label: 'Bihar', value: 'BR' },
        { label: 'Chandigarh', value: 'CH' },
        { label: 'Chhattisgarh', value: 'CT' },
        { label: 'Daman and Diu', value: 'DD' },
        { label: 'Delhi', value: 'DL' },
        { label: 'Dadra and Nagar Haveli', value: 'DN' },
        { label: 'Goa', value: 'GA' },
        { label: 'Gujarat', value: 'GJ' },
        { label: 'Himachal Pradesh', value: 'HP' },
        { label: 'Haryana', value: 'HR' },
        { label: 'Jharkhand', value: 'JH' },
        { label: 'Jammu and Kashmir', value: 'JK' },
        { label: 'Karnataka', value: 'KA' },
        { label: 'Kerala', value: 'KL' },
        { label: 'Lakshadweep', value: 'LD' },
        { label: 'Maharashtra', value: 'MH' },
        { label: 'Meghalaya', value: 'ML' },
        { label: 'Manipur', value: 'MN' },
        { label: 'Madhya Pradesh', value: 'MP' },
        { label: 'Mizoram', value: 'MZ' },
        { label: 'Nagaland', value: 'NL' },
        { label: 'Odisha', value: 'OR' },
        { label: 'Punjab', value: 'PB' },
        { label: 'Puducherry', value: 'PY' },
        { label: 'Rajasthan', value: 'RJ' },
        { label: 'Sikkim', value: 'SK' },
        { label: 'Telangana', value: 'TG' },
        { label: 'Tamil Nadu', value: 'TN' },
        { label: 'Tripura', value: 'TR' },
        { label: 'Uttar Pradesh', value: 'UP' },
        { label: 'Uttarakhand', value: 'UT' },
        { label: 'West Bengal', value: 'WB' }
    ],
    US: [
        { label: 'Armed Forces Americas', value: 'AA' },
        { label: 'Armed Forces Europe', value: 'AE' },
        { label: 'Alaska', value: 'AK' },
        { label: 'Alabama', value: 'AL' },
        { label: 'Armed Forces Pacific', value: 'AP' },
        { label: 'Arkansas', value: 'AR' },
        { label: 'American Samoa', value: 'AS' },
        { label: 'Arizona', value: 'AZ' },
        { label: 'California', value: 'CA' },
        { label: 'Colorado', value: 'CO' },
        { label: 'Connecticut', value: 'CT' },
        { label: 'District of Columbia', value: 'DC' },
        { label: 'Delaware', value: 'DE' },
        { label: 'Florida', value: 'FL' },
        { label: 'Federated States of Micronesia', value: 'FM' },
        { label: 'Georgia', value: 'GA' },
        { label: 'Guam', value: 'GU' },
        { label: 'Hawaii', value: 'HI' },
        { label: 'Iowa', value: 'IA' },
        { label: 'Idaho', value: 'ID' },
        { label: 'Illinois', value: 'IL' },
        { label: 'Indiana', value: 'IN' },
        { label: 'Kansas', value: 'KS' },
        { label: 'Kentucky', value: 'KY' },
        { label: 'Louisiana', value: 'LA' },
        { label: 'Massachusetts', value: 'MA' },
        { label: 'Maryland', value: 'MD' },
        { label: 'Maine', value: 'ME' },
        { label: 'Marshall Islands', value: 'MH' },
        { label: 'Michigan', value: 'MI' },
        { label: 'Minnesota', value: 'MN' },
        { label: 'Missouri', value: 'MO' },
        { label: 'Northern Mariana Islands', value: 'MP' },
        { label: 'Mississippi', value: 'MS' },
        { label: 'Montana', value: 'MT' },
        { label: 'North Carolina', value: 'NC' },
        { label: 'North Dakota', value: 'ND' },
        { label: 'Nebraska', value: 'NE' },
        { label: 'New Hampshire', value: 'NH' },
        { label: 'New Jersey', value: 'NJ' },
        { label: 'New Mexico', value: 'NM' },
        { label: 'Nevada', value: 'NV' },
        { label: 'New York', value: 'NY' },
        { label: 'Ohio', value: 'OH' },
        { label: 'Oklahoma', value: 'OK' },
        { label: 'Oregon', value: 'OR' },
        { label: 'Pennsylvania', value: 'PA' },
        { label: 'Puerto Rico', value: 'PR' },
        { label: 'Palau', value: 'PW' },
        { label: 'Rhode Island', value: 'RI' },
        { label: 'South Carolina', value: 'SC' },
        { label: 'South Dakota', value: 'SD' },
        { label: 'Tennessee', value: 'TN' },
        { label: 'Texas', value: 'TX' },
        { label: 'United States Minor Outlying Islands', value: 'UM' },
        { label: 'Utah', value: 'UT' },
        { label: 'Virginia', value: 'VA' },
        { label: 'U.S. Virgin Islands', value: 'VI' },
        { label: 'Vermont', value: 'VT' },
        { label: 'Washington', value: 'WA' },
        { label: 'Wisconsin', value: 'WI' },
        { label: 'West Virginia', value: 'WV' },
        { label: 'Wyoming', value: 'WY' }
       
    ]
};

@track stateOptions = [];  //newly added for country and state dependent

    @track fieldOptions = [
        { label: 'Health tech', value: 'Health tech' },
        { label: 'Bio-tech and Bio-engineering', value: 'Bio-tech and Bio-engineering' },
        { label: 'Investment/ Business', value: 'Investment/ Business' },
        { label: 'Quantum', value: 'Quantum' },
        { label: 'Space Tech', value: 'Space Tech' },
        { label: 'Advance Computing and AI', value: 'Advance Computing and AI' },
        { label: 'Critical Minerals and Mining', value: 'Critical Minerals and Mining' }
    ];

    connectedCallback() {
        getPersonAccountAndContactId().then(result => {
            this.accountId = result.accountId;
            return getPersonAccountDetails({ accountId: this.accountId });
        }).then(account => {
            this.salutation = account.Salutation;
            this.firstName = account.FirstName;
           // this.middleName = account.MiddleName;
            this.lastName = account.LastName;
            this.phone = account.Phone;
            this.personEmail = account.PersonEmail;
            this.emailCustom = account.EmailCustom__c;
            this.currentOrganization = account.Current_Organization__pc;
            this.currentRole = account.Current_Role__pc;
            this.fieldOfSpecialization = account.Field_of_specialization__pc ? account.Field_of_specialization__pc.split(';') : [];
            this.profileExecutiveSummary = account.Profile_Executive_Summary__pc;
            this.billingStreet = account.BillingStreet;
            this.billingCity = account.BillingCity;
            this.billingCountry = account.BillingCountryCode;
            this.billingState = account.BillingStateCode;
            this.billingPostalCode = account.BillingPostalCode;
            this.panNumber = account.PAN_Number__pc;
            this.bankAccountName = account.Bank_Account_Name__pc;
            this.accountNumber = account.Account_Number__pc;
            this.bankName = account.Bank_Name__pc;
            this.branchName = account.Branch_Name__pc;
            this.ifscCode = account.IFSC_Code__pc;
            this.linkedInUrl = account.LinkedIn_Profile_URL__c;

 // 🔥 Set stateOptions dynamically based on selected country
            this.stateOptions = this.allStateOptions[this.billingCountry] || [];

        }).catch(error => {
            this.showToast('Error', 'Could not fetch account.', 'error');
            console.error(error);
        });
    }

    handleInputChange(e) {
        this[e.target.name] = e.detail.value || e.target.value;
    }

    //newly added for country and state dependent
handleCountryChange(e) {
    this.billingCountry = e.detail.value;
    this.stateOptions = this.allStateOptions[this.billingCountry] || [];
    this.billingState = ''; // Clear state if country changes
}


    handleMultiPicklistChange(e) {
        this.fieldOfSpecialization = e.detail.value;
    }

    handleUploadFinished(e) {
        if (e.detail.files.length > 0) {
            this.cvUploaded = true;
            this.showToast('Success', 'CV uploaded.', 'success');
        }
    }

    handleSubmit() {
        let allValid = true;
        this.template.querySelectorAll('lightning-input, lightning-combobox').forEach(input => {
            if (!input.checkValidity()) {
                input.reportValidity();
                allValid = false;
            }
        });

        if (!this.fieldOfSpecialization.length) {
            this.showToast('Error', 'Select at least one Field of Specialization.', 'error');
            allValid = false;
        }

        if (!allValid) return;

        updatePersonAccount({
            accountId: this.accountId,
            salutation: this.salutation,
            firstName: this.firstName,
           // middleName: this.middleName,
            lastName: this.lastName,
            phone: this.phone,
            personEmail: this.personEmail,
            emailCustom: this.emailCustom,
            currentOrganization: this.currentOrganization,
            currentRole: this.currentRole,
            fieldOfSpecialization: this.fieldOfSpecialization.join(';'),
            profileExecutiveSummary: this.profileExecutiveSummary,
            billingStreet: this.billingStreet,
            billingCity: this.billingCity,
            billingCountry: this.billingCountry,
            billingState: this.billingState,
            billingPostalCode: this.billingPostalCode,
            panNumber: this.panNumber,
            bankAccountName: this.bankAccountName,
            accountNumber: this.accountNumber,
            bankName: this.bankName,
            branchName: this.branchName,
            ifscCode: this.ifscCode,
            linkedInUrl: this.linkedInUrl 

        }).then(() => {
            this.showToast('Success', 'Information saved.', 'success');
            this.showThankYouMessage = true;
            return markReviewerRegistered({ accountId: this.accountId });
        }).then(() => {
           // window.location.href = 'https://wadhwanifoundation--wfdev.sandbox.my.site.com/ProposallReviewerPortal/s/';
           window.location.href = 'https://wadhwanifoundation.my.site.com/reviewportal/s/'; // Production
        }).catch(e => {
            this.showToast('Error', 'Could not save.', 'error');
            console.error(e);
        });
    }

handleUploadFinished(event) {
    const uploadedFiles = event.detail.files;
    if (uploadedFiles.length > 0) {
        this.uploadedFileName = uploadedFiles[0].name;
        this.cvUploaded = true;
        this.showToast('Success', 'CV uploaded successfully.', 'success');
    }
}




    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}



/* Working But Picklist is not showing
import { LightningElement, track } from 'lwc';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import getPersonAccountAndContactId from '@salesforce/apex/externalController.getPersonAccountAndContactId';
import getPersonAccountDetails from '@salesforce/apex/externalController.getPersonAccountDetails';
import updatePersonAccount from '@salesforce/apex/externalController.updatePersonAccount';
import markReviewerRegistered from '@salesforce/apex/externalController.markReviewerRegistered';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ReviewerForm extends LightningElement {
    winLogoUrl = WIN_LOGO;
    accountId;
    @track uploadedFileName = '';
    @track cvUploaded = false;
    @track showThankYouMessage = false;

    // all tracked properties
    @track salutation = ''; @track firstName = ''; @track middleName = ''; @track lastName = '';
    @track phone = ''; @track personEmail = ''; @track emailCustom = ''; @track currentOrganization = '';
    @track currentRole = ''; @track fieldOfSpecialization = ''; @track profileExecutiveSummary = '';
    @track billingStreet = ''; @track billingCity = ''; @track billingCountry = ''; @track billingState = ''; @track billingPostalCode = '';
    @track panNumber = ''; @track bankAccountName = ''; @track accountNumber = ''; @track bankName = ''; @track branchName = ''; @track ifscCode = '';

    connectedCallback() {
        getPersonAccountAndContactId()
        .then(res => {
            this.accountId = res.accountId;
            return getPersonAccountDetails({ accountId: this.accountId });
        }).then(acc => {
            this.salutation=acc.Salutation; this.firstName=acc.FirstName; this.middleName=acc.MiddleName; this.lastName=acc.LastName;
            this.phone=acc.Phone; this.personEmail=acc.PersonEmail; this.emailCustom=acc.EmailCustom__c; this.currentOrganization=acc.Current_Organization__pc;
            this.currentRole=acc.Current_Role__pc; this.fieldOfSpecialization=acc.Field_of_specialization__pc; this.profileExecutiveSummary=acc.Profile_Executive_Summary__pc;
            this.billingStreet=acc.BillingStreet; this.billingCity=acc.BillingCity; this.billingCountry=acc.BillingCountryCode; this.billingState=acc.BillingStateCode; this.billingPostalCode=acc.BillingPostalCode;
            this.panNumber=acc.PAN_Number__pc; this.bankAccountName=acc.Bank_Account_Name__pc; this.accountNumber=acc.Account_Number__pc; this.bankName=acc.Bank_Name__pc; this.branchName=acc.Branch_Name__pc; this.ifscCode=acc.IFSC_Code__pc;
        }).catch(e=>{this.showToast('Error','Failed to load','error'); console.error(e);});
    }

    handleInputChange(e){ this[e.target.name]=e.target.value; }

    handleUploadFinished(e){ if(e.detail.files.length>0){ this.cvUploaded=true; this.showToast('Success','CV uploaded','success'); } }

    handleSubmit(){
        if(!this.cvUploaded){ this.showToast('Error','Upload your CV','error'); return; }

        let allValid = true;
        this.template.querySelectorAll('lightning-input').forEach(input=>{
            if(!input.checkValidity()){ input.reportValidity(); allValid=false; }
        });
        if(!allValid){ this.showToast('Error','Fill all fields','error'); return; }

        updatePersonAccount({
            accountId:this.accountId, salutation:this.salutation, firstName:this.firstName, middleName:this.middleName, lastName:this.lastName,
            phone:this.phone, personEmail:this.personEmail, emailCustom:this.emailCustom, currentOrganization:this.currentOrganization, currentRole:this.currentRole,
            fieldOfSpecialization:this.fieldOfSpecialization, profileExecutiveSummary:this.profileExecutiveSummary, billingStreet:this.billingStreet,
            billingCity:this.billingCity, billingCountry:this.billingCountry, billingState:this.billingState, billingPostalCode:this.billingPostalCode,
            panNumber:this.panNumber, bankAccountName:this.bankAccountName, accountNumber:this.accountNumber, bankName:this.bankName, branchName:this.branchName, ifscCode:this.ifscCode
        }).then(()=>{
            this.showToast('Success','Saved','success'); this.showThankYouMessage=true;
            return markReviewerRegistered({ accountId:this.accountId });
        }).catch(e=>{this.showToast('Error','Save failed','error'); console.error(e);});
    }

    showToast(title,message,variant){ this.dispatchEvent(new ShowToastEvent({title,message,variant})); }
}
*/