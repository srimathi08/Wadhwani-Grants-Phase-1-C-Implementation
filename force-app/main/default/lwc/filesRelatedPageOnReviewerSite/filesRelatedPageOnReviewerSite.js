import { LightningElement } from 'lwc';
import getFiles from '@salesforce/apex/FileController.getFiles';

export default class FilesRelatedPageOnReviewerSite extends LightningElement {
    recordId;
    files = [];
    error;

    connectedCallback() {
        try {
            console.log('Inside connected callback');

            // Extract record ID from the URL
            const pathParts = window.location.pathname.split('/');
            const recordIdFromUrl = pathParts[pathParts.length - 2];
            console.log('Parsed recordId:', recordIdFromUrl);

            if (recordIdFromUrl && recordIdFromUrl.startsWith('0iT')) {
                this.recordId = recordIdFromUrl;

                // Extract site path before /s/
                const sitePrefix = window.location.pathname.split('/s/')[0];
                console.log('Resolved site prefix:', sitePrefix);

                getFiles({ recordId: this.recordId })
                    .then(result => {
                        this.files = result.map(file => {
                            const fileUrl = `${window.location.origin}${sitePrefix}/sfc/servlet.shepherd/document/download/${file.id}`;
                            console.log(`Generated file URL for "${file.title}":`, fileUrl);
                            return {
                                ...file,
                                url: fileUrl
                            };
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching files:', error);
                        this.error = error;
                    });
            } else {
                const msg = 'Record ID not found or invalid in URL.';
                console.error(msg);
                this.error = { message: msg };
            }
        } catch (e) {
            console.error('Error parsing record ID from URL:', e);
            this.error = { message: 'Error parsing record ID from URL.' };
        }
    }
}