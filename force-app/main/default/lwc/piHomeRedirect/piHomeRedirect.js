import { LightningElement, api } from 'lwc';

export default class PiHomeRedirect extends LightningElement {
      @api redirectUrl;

    connectedCallback() {
        if (this.redirectUrl) {
            window.location.href = this.redirectUrl;
        }
    }
}