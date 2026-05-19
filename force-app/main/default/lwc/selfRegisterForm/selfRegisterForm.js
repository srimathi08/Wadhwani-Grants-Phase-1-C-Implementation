import { LightningElement, track } from 'lwc';
import registerUser from '@salesforce/apex/SelfRegistrationController.registerUser';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class SelfRegisterComponent extends LightningElement {
    @track firstName = '';
    @track lastName = '';
    @track email = '';
    @track password = '';

    handleChange(event) {
        this[event.target.name] = event.target.value;
    }

    handleRegister() {
        registerUser({ 
            firstName: this.firstName, 
            lastName: this.lastName, 
            email: this.email, 
            password: this.password 
        })
        .then(result => {
            this.dispatchEvent(new ShowToastEvent({
                title: "Success",
                message: "User Registered Successfully!",
                variant: "success"
            }));
        })
        .catch(error => {
            this.dispatchEvent(new ShowToastEvent({
                title: "Error",
                message: error.body.message,
                variant: "error"
            }));
        });
    }
}