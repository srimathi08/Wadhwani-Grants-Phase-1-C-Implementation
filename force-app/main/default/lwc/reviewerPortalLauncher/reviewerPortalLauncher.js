import { LightningElement } from 'lwc';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';

export default class ReviewerPortalLauncher extends LightningElement {
    logoUrl = WIN_LOGO;

    handleOpenPortal() {
        window.open('/s/', '_self');
    }
}