import { LightningElement, wire, track } from 'lwc';
import getUserProfile from '@salesforce/apex/ProfileController.getUserProfile';

export default class UserProfile extends LightningElement {

    @track profileData;
    @track isLoading = true;
    @track error;

    @wire(getUserProfile)
    wiredProfile({ data, error }) {
        console.log('Profile data:', data);

        if (data) {
            this.profileData = data;
            this.isLoading = false;
        } else if (error) {
            console.error('Profile error:', error);
            this.error = error.body?.message || 'Failed to load profile';
            this.isLoading = false;
        }
    }

    get initials() {
        if (!this.profileData?.Name) return '';
        const p = this.profileData.Name.split(' ');
        return p.length > 1
            ? p[0][0] + p[p.length - 1][0]
            : p[0].substring(0, 2).toUpperCase();
    }

    get location() {
        return [
            this.profileData?.BillingCity,
            this.profileData?.BillingState,
            this.profileData?.BillingCountry
        ].filter(Boolean).join(', ');
    }
}