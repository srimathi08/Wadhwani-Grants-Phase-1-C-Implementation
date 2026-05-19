import { LightningElement, api } from 'lwc';

export default class ProposalEvaluateButton extends LightningElement {
    @api recordId;

    handleClick() {
        const baseUrl = window.location.origin;
        const formPageUrl = `${baseUrl}/WadhwaniOrg/s/proposal-submission-page?applicationId=${this.recordId}`;
        window.open(formPageUrl, '_blank');
    }
}