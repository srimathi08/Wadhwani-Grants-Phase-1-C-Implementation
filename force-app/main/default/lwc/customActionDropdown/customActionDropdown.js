import { LightningElement, api, track } from 'lwc';

export default class CustomActionDropdown extends LightningElement {
    @api recordId;
    @track selectedValue;

    options = [
        { label: 'Approved for Funding', value: 'Approved for Funding' },
        { label: 'Not Recommended for Funding', value: 'Not Recommended for Funding' },
        { label: 'Approved with Resubmission', value: 'Approved with Resubmission' }
    ];

    handleChange(event) {
        this.selectedValue = event.detail.value;
        this.dispatchEvent(
            new CustomEvent('cellchange', {
                detail: { recordId: this.recordId, value: this.selectedValue }
            })
        );
    }
}