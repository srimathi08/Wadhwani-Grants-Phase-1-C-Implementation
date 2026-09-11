import { LightningElement, api } from 'lwc';

export default class WcfEligibilityModal extends LightningElement {
    @api isOpen = false;
    @api standalone = false;

    connectedCallback() {
        if (this.standalone) {
            this.isOpen = true;
        }
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleBackdropClick() {
        this.handleClose();
    }

    stopPropagation(event) {
        event.stopPropagation();
    }
}