import { LightningElement, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getFundProjects from '@salesforce/apex/CoeFundController.getFundProjects';
import createFundRequest from '@salesforce/apex/CoeFundController.createFundRequest';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class CoeFundOverview extends NavigationMixin(LightningElement) {

    /* ================================
       STATE
    ================================= */
    summary = {};
    projects = [];
    isFundModalOpen = false;

    fundAmount;
    fundDate;
    fundComment;

    wiredResult;

    /* ================================
       LOAD DATA
    ================================= */
    @wire(getFundProjects)
    wiredData(result) {
        this.wiredResult = result;

        if (result.data) {

            // ✅ summary now includes new fields automatically
            this.summary = {
                ...result.data.summary
            };

            this.projects = result.data.projects.map(p => {
                const totalBudget = p.totalBudget || 0;
                const disbursed = p.disbursed || 0;

                const progress =
                    totalBudget > 0
                        ? (disbursed / totalBudget) * 100
                        : 0;

                return { ...p, progress };
            });

            requestAnimationFrame(() => {
                this.applyProgressBars();
            });

        } else if (result.error) {
            this.showToast(
                'Error',
                result.error.body?.message || 'Failed to load fund projects',
                'error'
            );
        }
    }

    /* ================================
       PROGRESS BARS
    ================================= */
    applyProgressBars() {

        const summaryFill = this.template.querySelector('.summary-fill');
        if (summaryFill && this.summary.total) {
            const percent =
                (this.summary.disbursed / this.summary.total) * 100;
            summaryFill.style.width = `${percent}%`;
        }

        this.projects.forEach(p => {
            const el = this.template.querySelector(
                `.project-fill[data-id="${p.proposalId}"]`
            );
            if (el) {
                el.style.width = `${p.progress}%`;
            }
        });
    }

    /* ================================
       NAVIGATION
    ================================= */
    manage(event) {
        const proposalId = event.currentTarget.dataset.id;

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/WadhwaniOrg/s/coe-milestones?appId=${proposalId}`
            }
        });
    }


    /* ================================
       NAVIGATE TO REPORT / GENERATE DOCUMENT
    ================================= */
    navigateToReport() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/WadhwaniOrg/s/report`
            }
        });
    }
    /* ================================
       MODAL CONTROL
    ================================= */
    openFundModal() {
        this.isFundModalOpen = true;
    }

    closeFundModal() {
        this.isFundModalOpen = false;
        this.fundAmount = null;
        this.fundDate = null;
        this.fundComment = null;
    }

    /* ================================
       INPUT HANDLERS
    ================================= */
    handleAmountChange(event) {
        let value = event.target.value;

        if (value) {
            value = value.toString().replace(/,/g, '');
        }

        this.fundAmount = value;
    }

    handleDateChange(event) {
        this.fundDate = event.target.value;
    }

    handleCommentChange(event) {
        this.fundComment = event.target.value;
    }

    /* ================================
       SUBMIT FUND REQUEST
    ================================= */
    submitFundRequest() {

        if (!this.fundAmount || !this.fundDate) {
            this.showToast(
                'Error',
                'Amount and Date are required',
                'error'
            );
            return;
        }

        createFundRequest({
            amount: Number(this.fundAmount),
            requestDate: this.fundDate,
            comment: this.fundComment
        })
        .then(() => {
            this.showToast(
                'Success',
                'Fund request submitted successfully',
                'success'
            );
            this.closeFundModal();
            refreshApex(this.wiredResult);
        })
        .catch(error => {
            console.error(JSON.stringify(error));
            this.showToast(
                'Error',
                error.body?.message || 'Failed to submit request',
                'error'
            );
        });
    }

    /* ================================
       TOAST
    ================================= */
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant })
        );
    }
}