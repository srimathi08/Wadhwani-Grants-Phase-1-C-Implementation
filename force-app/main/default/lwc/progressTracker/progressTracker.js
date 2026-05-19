import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getProgressData from '@salesforce/apex/ProgressTrackerController.getProgressData';

export default class ProgressTracker extends NavigationMixin(LightningElement) {
    @track institutionCompleted = false;
    @track proposalCompleted = false;
    @track coeStatus = '';
    @track subStage = '';

    @wire(getProgressData)
    wiredData({ error, data }) {
        if (data) {
            console.log('Progress data:', data);
            this.subStage = data.subStage;
            this.coeStatus = data.coeStatus;
            this.institutionCompleted =
                data.subStage && data.subStage !== '' && data.subStage !== null;
            this.proposalCompleted =
                data.coeStatus && data.coeStatus !== '' && data.coeStatus !== null;
        } else if (error) {
            console.error('Error loading progress:', error);
        }
    }

    navigateToInstitutionRegister() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/WadhwaniOrg/s/institute-register'// Replace with your site prefix
            }
        });
    }

    navigateToCOEProposal() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/WadhwaniOrg/s/proposal-submission-page' // Replace with your site prefix
            }
        });
    }

    navigateToProjectApplication() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/WadhwaniOrg/s/project-application' // Replace with your site prefix
            }
        });
    }
}