import { LightningElement, wire, track } from 'lwc';
import getPIContacts from '@salesforce/apex/PiContactController.getPIContacts';
import deleteContact from '@salesforce/apex/PiContactController.deleteContact';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';

const COLUMNS = [
    { label: 'Name', fieldName: 'recordLink', type: 'url',
        typeAttributes: { label: { fieldName: 'Name' }, target: '_blank' } 
    },
    { label: 'Account Name', fieldName: 'accountName' },
    { label: 'Phone', fieldName: 'Phone', type: 'phone' },
    { label: 'Email', fieldName: 'Email', type: 'email' },
    {
        type: 'action',
        typeAttributes: {
            rowActions: [
                { label: 'Edit', name: 'edit' },
                { label: 'Delete', name: 'delete' }
            ]
        }
    }
];

export default class PiContactList extends NavigationMixin(LightningElement) {

    @track data = [];
    @track filteredData = [];
    @track paginatedData = [];

    columns = COLUMNS;
    wiredResult;

    // Pagination
    pageSize = 5;
    pageNumber = 1;
    totalRecords = 0;
    totalPages = 0;

    searchKey = '';

    @wire(getPIContacts)
    wiredContacts(result) {
        this.wiredResult = result;

        if (result.data) {
            this.data = result.data.map(row => ({
                ...row,
                accountName: row.Account ? row.Account.Name : '',
                recordLink: `/WadhwaniOrg/s/detail/${row.Id}`
            }));

            this.totalRecords = this.data.length;
            this.applyFilter();
        }
    }

    // 🔍 SEARCH
    handleSearch(event) {
        this.searchKey = event.target.value.toLowerCase();
        this.applyFilter();
    }

    applyFilter() {
        if (this.searchKey) {
            this.filteredData = this.data.filter(row =>
                row.Name?.toLowerCase().includes(this.searchKey) ||
                row.Email?.toLowerCase().includes(this.searchKey)
            );
        } else {
            this.filteredData = [...this.data];
        }

        this.totalRecords = this.filteredData.length;
        this.pageNumber = 1;
        this.setupPagination();
    }

    // 📄 PAGINATION
    setupPagination() {
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);

        const start = (this.pageNumber - 1) * this.pageSize;
        const end = start + this.pageSize;

        this.paginatedData = this.filteredData.slice(start, end);
    }

    handleNext() {
        if (this.pageNumber < this.totalPages) {
            this.pageNumber++;
            this.setupPagination();
        }
    }

    handlePrev() {
        if (this.pageNumber > 1) {
            this.pageNumber--;
            this.setupPagination();
        }
    }

    // 🎯 ACTIONS
    handleRowAction(event) {
        const action = event.detail.action.name;
        const row = event.detail.row;

        if (action === 'edit') {
            this.navigateToEdit(row.Id);
        } else if (action === 'delete') {
            this.confirmDelete(row.Id);
        }
    }

    navigateToEdit(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId,
                objectApiName: 'Contact',
                actionName: 'edit'
            }
        });
    }

    // ⚠️ DELETE CONFIRM
    confirmDelete(recordId) {
        if (confirm('Are you sure you want to delete this PI?')) {
            this.handleDelete(recordId);
        }
    }

    handleDelete(recordId) {
        deleteContact({ contactId: recordId })
            .then(() => {
                this.showToast('Success', 'Contact deleted', 'success');
                return refreshApex(this.wiredResult);
            })
            .then(() => {
                this.applyFilter(); // refresh UI properly
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            });
    }

    // 🔔 TOAST
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}