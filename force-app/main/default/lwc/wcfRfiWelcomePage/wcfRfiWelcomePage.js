import { LightningElement, api } from 'lwc';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';

export default class WcfRfiWelcomePage extends LightningElement {
    @api winLogoUrl = WIN_LOGO;
    @api showStartButton = false;
    @api startButtonLabel = 'Begin Application';

    handleStartClick() {
        this.dispatchEvent(new CustomEvent('startapplication'));
    }
}
