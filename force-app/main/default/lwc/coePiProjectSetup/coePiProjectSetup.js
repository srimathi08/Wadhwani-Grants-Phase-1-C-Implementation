import { LightningElement, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getPiCounts from '@salesforce/apex/CoeHomeSectionController.getPiCounts';

export default class CoePiProjectSetup extends NavigationMixin(LightningElement) {

    addedPiCount = 0;
    registeredPiCount = 0;

    @wire(getPiCounts)
    wiredCounts({ data, error }) {
        if (data) {
            this.addedPiCount      = data.addedPiCount      || 0;
            this.registeredPiCount = data.registeredPiCount || 0;
        } else if (error) {
            console.error('getPiCounts error =>', JSON.stringify(error));
        }
    }

    // Step 1: Add PI → Flow form
    navigateToAddPI() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: '/WadhwaniOrg/s/pi-form' }
        });
    }

    // Step 2 & 3: Registered PI / Manage PI → custom LWC list page
    navigateToRegisteredPIs() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: '/WadhwaniOrg/s/pi-list-coe' }
        });
    }

    navigateToManagePI() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: '/WadhwaniOrg/s/pi-list-coe' }
        });
    }
}