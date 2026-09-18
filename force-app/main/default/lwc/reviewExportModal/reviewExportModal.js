import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCsvExport from '@salesforce/apex/ProposalReviewExportController.getCsvExport';

export default class ReviewExportModal extends NavigationMixin(LightningElement) {
    @api recordId;

    isLoading = false;
    selectedFormat = 'pdf';

    formatOptions = [
        { label: 'PDF', value: 'pdf' },
        { label: 'Word Document', value: 'word' },
        { label: 'Excel (CSV)', value: 'excel' }
    ];

    handleFormatChange(event) {
        this.selectedFormat = event.detail.value;
    }

    handleExport() {
        if (this.selectedFormat === 'pdf') {
            this.openVfPage('ProposalReviewPDF');
        } else if (this.selectedFormat === 'word') {
            this.openVfPage('ProposalReviewDoc');
        } else if (this.selectedFormat === 'excel') {
            this.exportCsv();
        }
    }

    // PDF and Word are rendered by Visualforce pages — open in a new tab
    openVfPage(pageName) {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/apex/' + pageName + '?id=' + this.recordId
            }
        });
    }

    // Excel/CSV is generated in Apex and downloaded client-side
    exportCsv() {
        this.isLoading = true;

        getCsvExport({ recordId: this.recordId })
            .then((base64Data) => {
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'text/csv;charset=utf-8;' });

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'ProposalReview_' + this.recordId + '.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                this.isLoading = false;
            })
            .catch((error) => {
                this.isLoading = false;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Export Failed',
                        message: error?.body?.message || 'Unable to generate CSV export',
                        variant: 'error'
                    })
                );
            });
    }
}