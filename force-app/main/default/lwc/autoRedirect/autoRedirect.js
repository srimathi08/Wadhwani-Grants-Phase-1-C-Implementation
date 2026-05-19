import { LightningElement, api } from 'lwc';

export default class AutoRedirect extends LightningElement {
    @api redirectUrl;

    connectedCallback() {
        if(this.redirectUrl) {
            window.location.href = this.redirectUrl;
        }
    }
}