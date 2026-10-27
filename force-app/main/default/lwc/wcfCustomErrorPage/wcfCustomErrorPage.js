import { LightningElement } from 'lwc';

export default class WcfCustomErrorPage extends LightningElement {
    get currentPathDisplay() {
        // Displays the current URL path in the tab (e.g., .../wcf/s/no-such-page-uat)
        const path = window.location.pathname || '/wcf/s/page-not-found';
        return `...${path}`;
    }

    handleGoHome() {
        window.location.href = '/wcf/s/';
    }
}