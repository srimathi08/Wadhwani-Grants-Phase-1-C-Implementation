import { LightningElement, api, wire, track } from 'lwc';
import getFiles from '@salesforce/apex/OutcomeDataFilesController.getFiles';

export default class OutcomeDataFiles extends LightningElement {
    @api recordId; 
    @track files;
    columns = [
        { label: 'Title', fieldName: 'title', type: 'text' },
        { label: 'Type', fieldName: 'type', type: 'text' },
        { label: 'Download', fieldName: 'url', type: 'url', typeAttributes: { label: 'Download', target: '_blank' } }
    ];

    @wire(getFiles, { individualAppId: '$recordId' })
    wiredFiles({ data, error }) {
        if (data) {
            this.files = data.map(f => ({
                id: f.ContentDocumentId,
                title: f.ContentDocument.Title,
                type: f.ContentDocument.FileType,
                url: `/sfc/servlet.shepherd/version/download/${f.ContentDocument.LatestPublishedVersionId}`
            }));
        } else if (error) {
            console.error(error);
            this.files = [];
        }
    }
      // Getter: true if no files
    get noFiles() {
        return !this.files || this.files.length === 0;
    }
}