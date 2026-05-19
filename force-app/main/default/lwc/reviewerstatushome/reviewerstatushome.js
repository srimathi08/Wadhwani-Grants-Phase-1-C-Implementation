import { LightningElement, track, wire } from 'lwc';
import isReviewerRegistered from '@salesforce/apex/ReviewerUserHelper.isReviewerRegistered';
import getNdaStatus from '@salesforce/apex/ReviewerUserHelper.getNdaStatus';

export default class ReviewerOnboarding extends LightningElement {
    @track reviewerRegistered = false;
    @track reviewerOnboardingStatusText = 'Yet to Start';
    @track reviewerOnboardingIcon = '⏳'; // Hourglass emoji
    @track registrationUrl = 'https://wadhwanifoundation--wfdev.sandbox.my.site.com/ProposallReviewerPortal/s/reviewer-registration-form'; // Hardcoded URL
    @track ndaStatusText = 'Yet to Submit';  // Default NDA status
    @track ndaStatusIcon = '📝';        // Default NDA icon
    @track ndaRecordExists = false;
    wiredReviewerResult;
    wiredNdaResult;

    @wire(isReviewerRegistered)
    wiredReviewer(response) {
        this.wiredReviewerResult = response;
        const { data, error } = response;
        if (data !== undefined) {
            this.reviewerRegistered = data;
            this.reviewerOnboardingStatusText = data ? 'Registration Completed' : 'Yet to Start';
            this.reviewerOnboardingIcon = data ? '✅' : '⏳'; // Use checkmark when registered
        } else if (error) {
            console.error('Error fetching reviewer registration status:', error);
            this.reviewerOnboardingStatusText = 'Error'; // Set status text
            this.reviewerOnboardingIcon = '❌';       // show error
        }
    }

    @wire(getNdaStatus)
    wiredNda(response) {
        this.wiredNdaResult = response;
        const { data, error } = response;
        if (data) {
            this.ndaStatusText = data.ndaStatus;
            this.ndaStatusIcon = this.getNdaIcon(data.ndaStatus);
            // Display in browser's console:
            console.log('NDA Status:', data.ndaStatus);
        } else if (error) {
            console.error('Error fetching NDA status:', error);
            this.ndaStatusText = 'Error';
            this.ndaStatusIcon = '❌';
        }
    }

    getNdaIcon(status) {
        switch (status) {
            case 'In Request':
                return '📝';
            case 'Executed':
                return '✅';
            case 'Pending Approval':
                return '⏳';
            case 'Pending Legal':
                return '⚖️';
            case 'Pending e-Stamp':
                return '🗃️';
            case 'Further Processing':
                return '⚙️';
            case 'Pending Signature':
                return '✍️';
            default:
                return '❓';
        }
    }
}