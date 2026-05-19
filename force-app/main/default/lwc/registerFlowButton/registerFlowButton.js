import { LightningElement, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';

const USER_FIELDS = ['User.ContactId'];
const CONTACT_FIELDS = ['Contact.Category_of_Applicant__c'];

export default class RegisterFlowButton extends LightningElement {
  // Visibility flag
  showButton = false;

  // Keep results to derive visibility
  userContactId;

  // Step 1: Get the logged-in user to read ContactId
  @wire(getRecord, { recordId: USER_ID, fields: USER_FIELDS })
  wiredUser({ data, error }) {
    if (data) {
      this.userContactId = data.fields.ContactId?.value || null;
    } else if (error) {
      // If user cannot be read, safest is hide button
      this.userContactId = null;
    }
  }

  // Step 2: When ContactId is known, read the Contact.Category_of_Applicant__c
  @wire(getRecord, {
    recordId: '$userContactId',
    fields: CONTACT_FIELDS
  })
  wiredContact({ data, error }) {
    if (data) {
      const category = data.fields.Category_of_Applicant__c?.value;
      // Business rule:
      // - If Category_of_Applicant__c is NOT null -> DO NOT show Register button
      // - If null/empty -> show Register button
      this.showButton = !category;
    } else if (error) {
      // On error, default to hide to avoid exposing action improperly
      this.showButton = false;
    }
  }
}