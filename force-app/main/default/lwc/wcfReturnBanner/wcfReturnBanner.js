import { LightningElement, api } from 'lwc';
import CL_View_original_submission from '@salesforce/label/c.CL_View_original_submission';
import CL_Action_Required from '@salesforce/label/c.CL_Action_Required';
import CL_Feedback_on_your_application from '@salesforce/label/c.CL_Feedback_on_your_application';
import CL_Update_and_resubmit from '@salesforce/label/c.CL_Update_and_resubmit';
import CL_Your_validator_has_requested_changes_Please_open_the_form_to_review_and_resu from '@salesforce/label/c.CL_Your_validator_has_requested_changes_Please_open_the_form_to_review_and_resu';

export default class WcfReturnBanner extends LightningElement {
    label = {
        CL_View_original_submission,
        CL_Action_Required,
        CL_Feedback_on_your_application,
        CL_Update_and_resubmit,
        CL_Your_validator_has_requested_changes_Please_open_the_form_to_review_and_resu
    };

    @api reviewNotes = [];
    @api questionReturnNotes = [];
    @api applicationNumber;
    @api programmeLeadName;
    @api programmeLeadEmail;

    get sortedNotes() {
        return [...(this.questionReturnNotes || [])]
            .sort((a, b) => a.questionNum - b.questionNum);
    }

    get hasNotes() {
        return this.sortedNotes.length > 0;
    }

    // Single-line {{validator_comment}} for the required banner text.
    // Joins per-question notes; falls back to the generic label if none exist.
    get combinedComment() {
        if (!this.hasNotes) {
            return this.label.CL_Your_validator_has_requested_changes_Please_open_the_form_to_review_and_resu;
        }
        return this.sortedNotes.map(n => n.returnText).join('; ');
    }

    get hasProgrammeLead() {
        return !!this.programmeLeadName;
    }

    get programmeLeadMailto() {
        return this.programmeLeadEmail ? `mailto:${this.programmeLeadEmail}` : '#';
    }

    handleViewOriginal() {
        this.dispatchEvent(new CustomEvent('vieworiginal'));
    }
}