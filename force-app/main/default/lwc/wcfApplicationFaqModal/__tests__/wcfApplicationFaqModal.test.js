import { createElement } from 'lwc';
import WcfApplicationFaqModal from 'c/wcfApplicationFaqModal';

jest.mock(
    '@salesforce/apex/wcfApplicationFaqController.getApplicationFaqs',
    () => {
        return {
            default: jest.fn().mockResolvedValue([
                {
                    Id: 'a0m001',
                    Question__c: 'What is Wadhwani Grants?',
                    Description__c: '<p>Grant making program</p>',
                    Sort_Order__c: 1
                }
            ])
        };
    },
    { virtual: true }
);

jest.mock(
    '@salesforce/apex/wcfApplicationFaqController.getLatestApplicationFaqs',
    () => {
        return {
            default: jest.fn().mockResolvedValue([
                {
                    Id: 'a0m001',
                    Question__c: 'What is Wadhwani Grants?',
                    Description__c: '<p>Grant making program</p>',
                    Sort_Order__c: 1
                }
            ])
        };
    },
    { virtual: true }
);

describe('c-wcf-application-faq-modal', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders FAQ cards fetched dynamically from Application_FAQ__c', async () => {
        const element = createElement('c-wcf-application-faq-modal', {
            is: WcfApplicationFaqModal
        });
        element.isOpen = true;
        element.standalone = true;
        document.body.appendChild(element);

        await Promise.resolve();

        const firstQuestion = element.shadowRoot.querySelector('.faq-question-text');
        expect(firstQuestion).not.toBeNull();
    });
});