import { LightningElement, wire } from 'lwc';
import getCoeName from '@salesforce/apex/CoeWelcomeController.getCoeName';

export default class CoeWelcomeHeader extends LightningElement {
    coeName = 'Your COE Portal';

    @wire(getCoeName)
    wiredName({ data, error }) {
        if (data) {
            this.coeName = data;
        } else if (error) {
            console.error('getCoeName error =>', JSON.stringify(error));
            // fallback stays as 'Your COE Portal'
        }
    }
}