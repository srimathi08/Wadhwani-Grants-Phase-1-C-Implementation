import { LightningElement, api  } from 'lwc';

export default class CustomRichTextArea extends LightningElement {
    @api value = '';  // Holds the text value
    @api fieldName;   // Field name for tracking
    @api label = '';  // Label for the input field
    @api helpText = ''; // Help text for the input field

    handleInput(event) {
        let cleanedHtml = event.target.innerHTML;

        // Dispatch a custom event to notify the parent component
        this.dispatchEvent(
            new CustomEvent("richtextchange", {
                detail: { field: this.fieldName, value: cleanedHtml }
            })
        );
    }

    boldText() {
        document.execCommand('bold', false, null);
    }

    italicText() {
        document.execCommand('italic', false, null);
    }

    underlineText() {
        document.execCommand('underline', false, null);
    }

    alignLeft() {
        document.execCommand('justifyLeft', false, null);
    }

    alignCenter() {
        document.execCommand('justifyCenter', false, null);
    }

    alignRight() {
        document.execCommand('justifyRight', false, null);
    }

    changeFont(event) {
        document.execCommand('fontName', false, event.target.value);
    }

    changeFontSize(event) {
        document.execCommand('fontSize', false, event.target.value);
    }
}