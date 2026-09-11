import { LightningElement, api, wire, track } from 'lwc';
import getApplicationFaqsByCategory from '@salesforce/apex/wcfApplicationFaqController.getApplicationFaqsByCategory';

export default class WcfApplicationFaqModal extends LightningElement {
    _isOpen = false;

    @api standalone = false;
    @api Category;
    @api category;

    @track faqItems = [];
    @track isLoading = true;

    get activeCategory() {
        return this.Category || this.category || '';
    }

    @api
    get isOpen() {
        return this._isOpen;
    }
    set isOpen(value) {
        this._isOpen = value;
        if (value) {
            this.loadFaqsFromDatabase();
        }
    }

    connectedCallback() {
        if (this.standalone) {
            this._isOpen = true;
        }
        this.loadFaqsFromDatabase();
    }

    @wire(getApplicationFaqsByCategory, { Category: '$activeCategory' })
    wiredFaqs({ error, data }) {
        if (data && data.length > 0) {
            this.processRecords(data);
            this.isLoading = false;
        } else if (error) {
            console.error('Wired Apex getApplicationFaqs error:', error);
            this.loadFaqsFromDatabase();
        }
    }

    loadFaqsFromDatabase() {
        this.isLoading = true;
        const cat = this.activeCategory;
        getApplicationFaqsByCategory({ Category: cat })
            .then(data => {
                if (data && data.length > 0) {
                    this.processRecords(data);
                }
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Apex getApplicationFaqs error:', error);
                this.isLoading = false;
            });
    }

    processRecords(records) {
        if (!records || records.length === 0) {
            this.faqItems = [];
            return;
        }
        this.faqItems = records.map((item, index) => {
            const isFirst = index === 0;
            return {
                id: item.Id || `faq-${index}`,
                question: item.Question__c || item.Name || 'FAQ Question',
                description: this.formatDescription(item.Description__c || ''),
                sortOrder: item.Sort_Order__c || (index + 1),
                isExpanded: isFirst,
                toggleIcon: isFirst ? '–' : '+',
                cardClass: isFirst ? 'faq-card expanded' : 'faq-card'
            };
        });
    }

    formatDescription(desc) {
        if (!desc) return '';
        if (desc.includes('faq-example-box') || desc.includes('<blockquote')) {
            return desc;
        }
        // Match Example. or Example: in text
        const exampleIndex = desc.search(/(?:<strong>)?Example[\.:]?(?:<\/strong>)?/i);
        if (exampleIndex !== -1) {
            const mainPart = desc.substring(0, exampleIndex).trim();
            let examplePart = desc.substring(exampleIndex).trim();
            // Clean up leading Example text tags
            examplePart = examplePart.replace(/^(?:<p>)?\s*(?:<strong>)?Example[\.:]?(?:<\/strong>)?\s*/i, '');
            examplePart = examplePart.replace(/<\/p>\s*$/, '');

            const formattedExample = `<div class="faq-example-box"><strong>Example.</strong> ${examplePart}</div>`;
            return mainPart ? `${mainPart}<br/>${formattedExample}` : formattedExample;
        }
        return desc;
    }


    handleToggle(event) {
        const id = event.currentTarget.dataset.id;
        this.faqItems = this.faqItems.map((item) => {
            if (item.id === id) {
                const nextExpanded = !item.isExpanded;
                return {
                    ...item,
                    isExpanded: nextExpanded,
                    toggleIcon: nextExpanded ? '–' : '+',
                    cardClass: nextExpanded ? 'faq-card expanded' : 'faq-card'
                };
            }
            return item;
        });
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleBackdropClick() {
        this.handleClose();
    }

    stopPropagation(event) {
        event.stopPropagation();
    }
}