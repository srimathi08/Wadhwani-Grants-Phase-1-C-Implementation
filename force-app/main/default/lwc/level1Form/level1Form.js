import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';

import APPLICATION_REVIEW from '@salesforce/schema/ApplicationReview';
import FOCUS_SUB_FOCUS from '@salesforce/schema/ApplicationReview.Does_the_Focus_and_Sub_Focus_area_fall_w__c';
import TRL from '@salesforce/schema/ApplicationReview.Technology_Readiness_Level__c';
import MILESTONE from '@salesforce/schema/ApplicationReview.Milestones__c';
import BUDGET from '@salesforce/schema/ApplicationReview.Budgets__c';
import PROJECT_PROPOSAL from '@salesforce/schema/ApplicationReview.Project_proposal__c';
import PRIOR_RESEARCH from '@salesforce/schema/ApplicationReview.Prior_Research_Funding_raised__c';
import FINAL_RECOMMENDATION from '@salesforce/schema/ApplicationReview.Final_recommendation__c';

import saveApplicationReview from '@salesforce/apex/ApplicationReviewController.saveApplicationReview';
import getIndividualApplication from '@salesforce/apex/ApplicationReviewController.getIndividualApplication';

import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';

export default class Level1Form extends LightningElement {
    @api recordId;

    /* ================= STATE ================= */
    @track isLoading = true;
    institutionName = '';
    winLogoUrl = WIN_LOGO;

    recordTypeId;

    /* ================= PICKLIST OPTIONS (MUST BE DECLARED) ================= */
    @track FallWithinWinOptions = [];
    @track TRLOptions = [];
    @track MilestoneOptions = [];
    @track BudgetOptions = [];
    @track ProjectProposalOptions = [];
    @track PriorResearchFundingOptions = [];
    @track FinalRecommendationOptions = [];

    /* ================= FORM DATA ================= */
    @track level1Data = {
        ApplicationId: '',
        Title: '',
        PI_Name__c: '',
        Co_Principal_Investigators_PI__c: '',
        Does_the_Focus_and_Sub_Focus_area_fall_w__c: '',
        Technology_Readiness_Level__c: '',
        Project_s_TRL_with_a_brief_justification__c: '',
        Milestones__c: '',
        Budgets__c: '',
        Project_proposal__c: '',
        Prior_Research_Funding_raised__c: '',
        If_yes_how_much_in_USD__c: null,
        Final_recommendation__c: ''
    };

    /* ================= OBJECT INFO + RECORD TYPE ================= */
    @wire(getObjectInfo, { objectApiName: APPLICATION_REVIEW })
    wiredObjectInfo({ data, error }) {
        console.log('📌 getObjectInfo fired');

        if (data) {
            const rtInfos = data.recordTypeInfos;

            Object.keys(rtInfos).forEach(rtId => {
                console.log(`➡ RT NAME: ${rtInfos[rtId].name} | ID: ${rtId}`);
            });

            // ✅ EXACT LABEL MATCH (from your console output)
            this.recordTypeId = Object.keys(rtInfos).find(
                rtId => rtInfos[rtId].name === 'CEO Admin Project Proposal Review'
            );

            console.log('🔥 FINAL recordTypeId:', this.recordTypeId);
        }

        if (error) {
            console.error('❌ getObjectInfo error:', error);
        }
    }

    /* ================= PICKLIST WIRES (GATED) ================= */

    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: FOCUS_SUB_FOCUS
    })
    wiredFocus({ data, error }) {
        if (!this.recordTypeId) return;

        if (data) {
            this.FallWithinWinOptions = data.values;
            console.log('✅ Focus/Sub-Focus:', data.values);
        }
        if (error) {
            console.error('❌ Focus/Sub-Focus error:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: TRL
    })
    wiredTRL({ data, error }) {
        if (!this.recordTypeId) return;

        if (data) {
            this.TRLOptions = data.values;
            console.log('✅ TRL:', data.values);
        }
        if (error) {
            console.error('❌ TRL error:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: MILESTONE
    })
    wiredMilestones({ data, error }) {
        if (!this.recordTypeId) return;

        if (data) {
            this.MilestoneOptions = data.values;
            console.log('✅ Milestones:', data.values);
        }
        if (error) {
            console.error('❌ Milestones error:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: BUDGET
    })
    wiredBudgets({ data, error }) {
        if (!this.recordTypeId) return;

        if (data) {
            this.BudgetOptions = data.values;
            console.log('✅ Budgets:', data.values);
        }
        if (error) {
            console.error('❌ Budgets error:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: PROJECT_PROPOSAL
    })
    wiredProjectProposal({ data, error }) {
        if (!this.recordTypeId) return;

        if (data) {
            this.ProjectProposalOptions = data.values;
            console.log('✅ Project Proposal:', data.values);
        }
        if (error) {
            console.error('❌ Project Proposal error:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: PRIOR_RESEARCH
    })
    wiredPriorResearch({ data, error }) {
        if (!this.recordTypeId) return;

        if (data) {
            this.PriorResearchFundingOptions = data.values;
            console.log('✅ Prior Research:', data.values);
        }
        if (error) {
            console.error('❌ Prior Research error:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: FINAL_RECOMMENDATION
    })
    wiredFinalRecommendation({ data, error }) {
        if (!this.recordTypeId) return;

        if (data) {
            this.FinalRecommendationOptions = data.values;
            console.log('✅ Final Recommendation:', data.values);
        }
        if (error) {
            console.error('❌ Final Recommendation error:', error);
        }
    }

    /* ================= LOAD APPLICATION ================= */
    connectedCallback() {
        this.level1Data.ApplicationId = this.recordId;
        this.loadApplication();
    }

    loadApplication() {
        getIndividualApplication({ recordId: this.recordId })
            .then(result => {
                this.institutionName = result.institutionName;
                this.level1Data.Title = result.projectTitle;
                this.level1Data.PI_Name__c = result.principalInvestigatorName;
            })
            .catch(error => {
                console.error(error);
                this.showToast('Error', 'Failed to load application', 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /* ================= HANDLERS ================= */
    handleInputChange(event) {
        const { name, value } = event.target;
        this.level1Data = { ...this.level1Data, [name]: value };
    }

    get showFundingAmountField() {
        return this.level1Data.Prior_Research_Funding_raised__c === 'Yes';
    }

    validateForm() {
        let valid = true;
        this.template
            .querySelectorAll('lightning-input, lightning-combobox, lightning-textarea')
            .forEach(el => {
                if (!el.checkValidity()) {
                    el.reportValidity();
                    valid = false;
                }
            });
        return valid;
    }

    /* ================= SUBMIT ================= */
    handleSubmit() {
        if (!this.validateForm()) return;

        this.isLoading = true;

        saveApplicationReview({ Level1Data: this.level1Data })
            .then(() => {
                this.dispatchEvent(
                    new CustomEvent('reviewcompleted', {
                        bubbles: true,
                        composed: true
                    })
                );
            })
            .catch(error => {
                console.error(error);
                this.showToast(
                    'Error',
                    error?.body?.message || 'Error saving review',
                    'error'
                );
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /* ================= TOAST ================= */
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}