import { LightningElement, api, track, wire } from 'lwc';

import getTrancheHistoryByAccount from '@salesforce/apex/AwardeeModuleController.getTrancheHistoryByAccount';
import createFundingAward from '@salesforce/apex/AwardeeModuleController.createFundingAward';

import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

import TYPE_OF_FUND_FIELD from '@salesforce/schema/FundingAward.Type_of_Fund__c';
import FUNDING_AWARD_OBJECT from '@salesforce/schema/FundingAward';

export default class DisburseFundModal extends LightningElement {

    // ✅ FIX: use getter/setter so when parent sets id, we reload history
    _selectedAccountId;

    @api
    get selectedAccountId() {
        return this._selectedAccountId;
    }
    set selectedAccountId(value) {
        this._selectedAccountId = value;
        this.loadHistory();  // ✅ reload whenever account id is received
    }

    @track faName;
    @track amount;
    @track AwardedDate;
    @track comments;
    @track fundingType;

    @track trancheHistory = [];
    @track fundingOptions = [];

    columns = [
        { label: 'Name', fieldName: 'Name' },
        { label: 'Amount', fieldName: 'Amount' },
        { label: 'Awarded Date', fieldName: 'Awarded_Date__c' },
        { label: 'Status', fieldName: 'Status' },
        { label: 'Comments', fieldName: 'Comments__c' }
    ];

    @wire(getObjectInfo, { objectApiName: FUNDING_AWARD_OBJECT })
    objectInfo;

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: TYPE_OF_FUND_FIELD
    })
    wiredPicklist({ data }) {
        if (data) {
            this.fundingOptions = data.values;
        }
    }

    loadHistory() {
        if (!this._selectedAccountId) {
            this.trancheHistory = [];
            return;
        }

        getTrancheHistoryByAccount({ accountId: this._selectedAccountId })
            .then(res => {
                this.trancheHistory = res || [];
            })
            .catch(err => {
                console.error('History Load Error', err);
                this.trancheHistory = [];
            });
    }

    handleChange(event) {
        const field = event.target.label;
        if (field === "Name") this.faName = event.target.value;
        if (field === "Amount") this.amount = event.target.value;
        if (field === "Awarded Date") this.AwardedDate = event.target.value;
        if (field === "Comments") this.comments = event.target.value;
    }

    handleFundingTypeChange(event) {
        this.fundingType = event.detail.value;
    }

    closeModal() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

    submitForm() {
        if (!this._selectedAccountId) {
            alert('Account Id missing. Cannot create Funding Award.');
            return;
        }

        const fa = {
            sobjectType: 'FundingAward',
            Name: this.faName,
            Amount: this.amount,
            Awarded_Date__c: this.AwardedDate,
            Type_of_Fund__c: this.fundingType,
            Comments__c: this.comments,
            Status: 'New Fund'
        };

        createFundingAward({ fa, accountId: this._selectedAccountId })
            .then(() => {
                this.dispatchEvent(new CustomEvent('recordsaved'));
            })
            .catch(err => {
                console.error('Save error', err);
            });
    }
}