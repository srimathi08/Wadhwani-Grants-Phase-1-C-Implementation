import { LightningElement, api, track } from 'lwc';
import createQuery from '@salesforce/apex/ReviewerQueryController.createQuery';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';

export default class ReviewerAskQuery extends LightningElement {

    @api recordId;

    @track queryComment = '';
    @track queryId;

    isSubmitting = false;

    // Handle query text change
    handleQueryChange(event) {
        this.queryComment = event.target.value;
    }

    // Disable submit if query empty or submission in progress
    get isSubmitDisabled() {
        return !this.queryComment || this.queryComment.trim() === '' || this.isSubmitting;
    }

    // Disable uploader until query record exists
    get isUploaderDisabled() {
        return !this.queryId;
    }

    // Create query record
    submitQuery() {

        this.isSubmitting = true;

        createQuery({
            proposalId: this.recordId,
            queryComment: this.queryComment
        })
        .then(result => {

            this.queryId = result;
            this.isSubmitting = false;

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Query Created',
                    message: 'You can now upload supporting documents.',
                    variant: 'success'
                })
            );

        })
        .catch(error => {

            this.isSubmitting = false;

            let message = 'Something went wrong';

            if (error?.body?.message) {
                message = error.body.message;
            } else if (error?.message) {
                message = error.message;
            }

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: message,
                    variant: 'error'
                })
            );

            console.error('Query creation error:', error);

        });

    }

    // After files uploaded
    handleUploadFinished(event) {

        const uploadedFiles = event.detail.files;

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Files Uploaded',
                message: uploadedFiles.length + ' file(s) uploaded successfully.',
                variant: 'success'
            })
        );

        // Close modal
        this.dispatchEvent(new CloseActionScreenEvent());

    }

    // Cancel button
    closeAction() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

}