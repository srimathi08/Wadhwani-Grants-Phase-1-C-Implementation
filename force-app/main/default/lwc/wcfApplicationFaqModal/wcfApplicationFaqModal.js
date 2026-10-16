import { LightningElement, api, wire, track } from 'lwc';
import getApplicationFaqsByCategory from '@salesforce/apex/wcfApplicationFaqController.getApplicationFaqsByCategory';

const DEFAULT_RFI_TRACK_FAQS = [
    {
        Id: 'rfi-faq-1',
        Question__c: 'Job Fulfillment (Skilling and Placement)',
        Description__c: 'Job Fulfillment means training someone, then helping them get a paid job. The outcome is one placement: one person you trained, now working for one employer.<div class="faq-example-box"><strong>Example.</strong> An organization trains someone to operate machines. That person gets a job as a machine operator at a factory. That\'s one Job Fulfillment outcome.</div>',
        Sort_Order__c: 1
    },
    {
        Id: 'rfi-faq-2',
        Question__c: 'Job Creation (SME / Enterprise Support)',
        Description__c: 'Job Creation means helping another business grow so it can hire more people. You might give money, advice, mentoring, or help finding buyers. The outcome is a new job at that business, not at yours.<div class="faq-example-box"><strong>Example.</strong> An organization gives a small factory money and new buyers. The factory hires three more workers to keep up. That\'s three Job Creation outcomes.</div>',
        Sort_Order__c: 2
    },
    {
        Id: 'rfi-faq-3',
        Question__c: 'Livelihood Upliftment',
        Description__c: 'Livelihood upliftment means working with people who already earn their own money, like a farmer or someone running a small shop, and helping them earn more. No one is placed in a job. No new business is registered. Only their income changes. A household counts as a Livelihood outcome only when both of these are true: yearly income is now Rs 1,00,000 or more, and that\'s at least 30% higher than when the household joined. Both must be true for the same household, measured from when it joined, not from last year. Count each household once, the first year both are true, and never again.<div class="faq-example-box"><strong>Example.</strong> A household joins earning Rs 84,000 a year. Three years later it earns Rs 1,20,000 a year: over Rs 1,00,000, and about 43% higher than when it joined. Both rules are met, so this household counts as one Livelihood outcome, that year only.</div>',
        Sort_Order__c: 3
    }
];

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
        if (data) {
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
                this.processRecords(data || []);
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Apex getApplicationFaqs error:', error);
                this.processRecords([]);
                this.isLoading = false;
            });
    }

    processRecords(records) {
        let finalRecords = records;
        if (!finalRecords || finalRecords.length === 0) {
            if (this.activeCategory === 'RFI Track FAQ') {
                finalRecords = DEFAULT_RFI_TRACK_FAQS;
            } else {
                this.faqItems = [];
                return;
            }
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