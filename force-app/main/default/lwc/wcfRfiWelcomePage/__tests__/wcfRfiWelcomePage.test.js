import { createElement } from 'lwc';
import WcfRfiWelcomePage from 'c/wcfRfiWelcomePage';

describe('c-wcf-rfi-welcome-page', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders header, title, logo and all 4 section cards', () => {
        const element = createElement('c-wcf-rfi-welcome-page', {
            is: WcfRfiWelcomePage
        });
        document.body.appendChild(element);

        const subHeader = element.shadowRoot.querySelector('.sub-header-title');
        expect(subHeader.textContent).toBe('Wadhwani Grants – Request for Information (RFI)');

        const mainTitle = element.shadowRoot.querySelector('.main-title');
        expect(mainTitle.textContent).toBe('Before you start');

        const cards = element.shadowRoot.querySelectorAll('.rfi-card');
        expect(cards.length).toBe(4);
    });

    it('dispatches startapplication event when start button is clicked', () => {
        const element = createElement('c-wcf-rfi-welcome-page', {
            is: WcfRfiWelcomePage
        });
        element.showStartButton = true;
        document.body.appendChild(element);

        const handler = jest.fn();
        element.addEventListener('startapplication', handler);

        const button = element.shadowRoot.querySelector('.btn-start');
        button.click();

        expect(handler).toHaveBeenCalled();
    });
});
