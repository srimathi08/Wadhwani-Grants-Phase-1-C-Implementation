import { LightningElement, track } from 'lwc';
import getApplicationStatusForUser from '@salesforce/apex/WCFFormController.getApplicationStatusForUser';
import { NavigationMixin } from 'lightning/navigation';

// ── Custom Labels (grouped by the status sections in your notepad) ─────────

// DRAFT
import CL_DRAFT from '@salesforce/label/c.CL_DRAFT';
import CL_Application_FAQ from '@salesforce/label/c.CL_Application_FAQ';
import CL_Eligibility_criteria from '@salesforce/label/c.CL_Eligibility_criteria';
import CL_Useful_links from '@salesforce/label/c.CL_Useful_links';
import CL_Resume_application from '@salesforce/label/c.CL_Resume_application';
import CL_Auto_saves_on_every_field_blur from '@salesforce/label/c.CL_Auto_saves_on_every_field_blur';
import CL_Started from '@salesforce/label/c.CL_Started';
import CL_Last_saved from '@salesforce/label/c.CL_Last_saved';

// Submitted
import CL_SUBMITTED from '@salesforce/label/c.CL_SUBMITTED';
import CL_Read_only from '@salesforce/label/c.CL_Read_only';
import CL_View_submission from '@salesforce/label/c.CL_View_submission';
import CL_While_you_wait from '@salesforce/label/c.CL_While_you_wait';
import CL_Our_team_will_review_your_application_within_thirty_working_days_You_ll_hear from '@salesforce/label/c.CL_Our_team_will_review_your_application_within_thirty_working_days_You_ll_hear';
import CL_Application from '@salesforce/label/c.CL_Application';

// Under Validation (Revision Requested)
import CL_Action_needed from '@salesforce/label/c.CL_Action_needed';
import CL_Your_application_needs_a_revision from '@salesforce/label/c.CL_Your_application_needs_a_revision';
import CL_REVISION_REQUESTED from '@salesforce/label/c.CL_REVISION_REQUESTED';
import CL_Validator_note from '@salesforce/label/c.CL_Validator_note';
import CL_Open_and_respond from '@salesforce/label/c.CL_Open_and_respond';
import CL_Your_Programme_Lead from '@salesforce/label/c.CL_Your_Programme_Lead';

// Under Review
import CL_Evaluation_in_progress from '@salesforce/label/c.CL_Evaluation_in_progress';
import CL_4_8_weeks from '@salesforce/label/c.CL_4_8_weeks';
import CL_UNDER_REVIEW from '@salesforce/label/c.CL_UNDER_REVIEW';

// Review Completed - Recommended
import CL_Awaiting_final_decision from '@salesforce/label/c.CL_Awaiting_final_decision';
import CL_Evaluation_complete from '@salesforce/label/c.CL_Evaluation_complete';

// Review Completed - Not Recommended / Not Recommend for Fund / Reviewer Rejected
import CL_Review_Completed_Not_Recommended from '@salesforce/label/c.CL_Review_Completed_Not_Recommended';
import CL_Final_decision from '@salesforce/label/c.CL_Final_decision';
import CL_Thank_you_for_applying from '@salesforce/label/c.CL_Thank_you_for_applying';
import CL_After_careful_review_your_application_was_not_selected_for_funding_at_this_t from '@salesforce/label/c.CL_After_careful_review_your_application_was_not_selected_for_funding_at_this_t';
import CL_Not_Recommend_for_Fund from '@salesforce/label/c.CL_Not_Recommend_for_Fund';
import CL_Reviewer_Rejected from '@salesforce/label/c.CL_Reviewer_Rejected';

// Application Resubmitted
import CL_RESUBMITTED from '@salesforce/label/c.CL_RESUBMITTED';
import CL_Awaiting_re_validation from '@salesforce/label/c.CL_Awaiting_re_validation';
import CL_Resubmission_received from '@salesforce/label/c.CL_Resubmission_received';
import CL_Your_revised_application_is_with_our_validation_team_We_ll_notify_you_of_the from '@salesforce/label/c.CL_Your_revised_application_is_with_our_validation_team_We_ll_notify_you_of_the';

// Recommend for Fund (Approved)
import CL_Your_application_has_been_approved from '@salesforce/label/c.CL_Your_application_has_been_approved';
import CL_Complete_the_three_steps_below_to_begin_your_partnership_with_Wadhwani_Grants from '@salesforce/label/c.CL_Complete_the_three_steps_below_to_begin_your_partnership_with_Wadhwani_Grants';
import CL_APPROVED from '@salesforce/label/c.CL_APPROVED';
import CL_Three_steps_to_activate_your_partnership from '@salesforce/label/c.CL_Three_steps_to_activate_your_partnership';
import CL_Grant_Agreement from '@salesforce/label/c.CL_Grant_Agreement';
import CL_Your_Grant_Agreement_of_Understanding_will_be_shared_via_Volody_for_e_signatu from '@salesforce/label/c.CL_Your_Grant_Agreement_of_Understanding_will_be_shared_via_Volody_for_e_signatu';
import CL_Grant_Agreement_will_be_shared_by_your_Programme_Lead_shortly from '@salesforce/label/c.CL_Grant_Agreement_will_be_shared_by_your_Programme_Lead_shortly';
import CL_AWAITING_SIGNATURE from '@salesforce/label/c.CL_AWAITING_SIGNATURE';
import CL_IN_PROGRESS from '@salesforce/label/c.CL_IN_PROGRESS';
import CL_Compliance_Documents from '@salesforce/label/c.CL_Compliance_Documents';
import CL_Upload_your_organisation_s_compliance_documents from '@salesforce/label/c.CL_Upload_your_organisation_s_compliance_documents';
import CL_Required_documents_depend_on_your_geography from '@salesforce/label/c.CL_Required_documents_depend_on_your_geography';
import CL_documents_complete from '@salesforce/label/c.CL_documents_complete';
import CL_Manage_compliance_documents from '@salesforce/label/c.CL_Manage_compliance_documents';
import CL_Programme_Setup from '@salesforce/label/c.CL_Programme_Setup';
import CL_Your_Programme_Lead_will_configure_your_programme_details_funding_model_and from '@salesforce/label/c.CL_Your_Programme_Lead_will_configure_your_programme_details_funding_model_and';
import CL_COMING_SOON from '@salesforce/label/c.CL_COMING_SOON';
import CL_Your_Programme_Lead_will_be_in_touch_to_share_the_Grant_Agreement_for_signatu from '@salesforce/label/c.CL_Your_Programme_Lead_will_be_in_touch_to_share_the_Grant_Agreement_for_signatu';
import CL_Next_step from '@salesforce/label/c.CL_Next_step';
import CL_For_any_queries from '@salesforce/label/c.CL_For_any_queries';

// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX NOTES
// ─────────────────────────────────────────────────────────────────────────────
// 1. isRevisionRequested was used both as a @track property (set from Apex)
//    AND as a getter that checks normalizedStatus. This caused a conflict:
//    the getter shadowed the @track, so revision-mode={isRevisionRequested}
//    always read the getter (a boolean) but could never be set imperatively.
//    FIX: Renamed the getter to isRevisionRequestedStatus (used in template
//    for the view toggle). Added a separate isRevisionMode getter used only
//    for the revision-mode prop on c-resume-draft-wcf-form.
//
// 2. isRevisionRequested as @track was unused — removed.
//
// 3. Added isApproved state for Stage 4 (BRD: Decided / Approved).
//
// 4. Added compliance data properties and computed getters for the
//    three-track Approved card.
//
// 5. Added showComplianceView flag and its handlers.
// ─────────────────────────────────────────────────────────────────────────────

export default class WcfApplicantDashboard extends NavigationMixin(LightningElement) {

    // ── Loading / status ─────────────────────────────────────────────
    @track isLoading = true;
    @track normalizedStatus = 'NotStarted';

    // ── Application data ─────────────────────────────────────────────
    @track recordId;
    @track applicationName;
    @track organizationName;
    @track headquarters;
    @track selectedFundingArea;
    @track submitterName;
    @track lastModified;
    @track createdDate;
    @track lastPage;

    // ── Programme Lead ────────────────────────────────────────────────
    @track programmeLeadName;
    @track programmeLeadEmail;

    // ── Revision data ─────────────────────────────────────────────────
    @track reviewNotes = [];
    @track flaggedQuestionNumbers = [];

    // ── Approval / Stage 4 data ────────────────────────────────────────
    @track approvalDate;
    @track mouStatus       = 'Pending';   // Pending | Active | Expired
    @track mouVolodyLink;
    @track complianceUploaded = 0;
    @track complianceTotal    = 6;        // Default; overridden from Apex
    @track complianceStatus;
    @track complianceReviewerNotes;
    @track complianceDocStatus;              // ← ADD
@track complianceHasUploads = false;     // ← ADD

    // ── View flags ────────────────────────────────────────────────────
    @track showWelcomeView    = false;
    @track showFormView       = false;
    @track showRevisionView   = false;
    @track showPreviewView    = false;
    @track showComplianceView = false;
    @track selectedLanguage   = 'en_US';

    @track questionReturnNotes = [];

    @track showEligibilityModal = false;
    @track showFaqModal = false;
    @track rawStatus;
    @track reviewerReturnComment;   

    pageSequence = [1, 2, 4, 6, 7];

    // ── Custom Labels exposed to the template ──────────────────────────
    labels = {
        // DRAFT
        CL_DRAFT,
        CL_Application_FAQ,
        CL_Eligibility_criteria,
        CL_Useful_links,
        CL_Resume_application,
        CL_Auto_saves_on_every_field_blur,
        CL_Started,
        CL_Last_saved,

        // Submitted
        CL_SUBMITTED,
        CL_Read_only,
        CL_View_submission,
        CL_While_you_wait,
        CL_Our_team_will_review_your_application_within_thirty_working_days_You_ll_hear,
        CL_Application,

        // Under Validation (Revision Requested)
        CL_Action_needed,
        CL_Your_application_needs_a_revision,
        CL_REVISION_REQUESTED,
        CL_Validator_note,
        CL_Open_and_respond,
        CL_Your_Programme_Lead,

        // Under Review
        CL_Evaluation_in_progress,
        CL_4_8_weeks,
        CL_UNDER_REVIEW,

        // Review Completed - Recommended
        CL_Awaiting_final_decision,
        CL_Evaluation_complete,

        // Review Completed - Not Recommended / Not Recommend / Rejected
        CL_Review_Completed_Not_Recommended,
        CL_Final_decision,
        CL_Thank_you_for_applying,
        CL_After_careful_review_your_application_was_not_selected_for_funding_at_this_t,
        CL_Not_Recommend_for_Fund,
        CL_Reviewer_Rejected,

        // Application Resubmitted
        CL_RESUBMITTED,
        CL_Awaiting_re_validation,
        CL_Resubmission_received,
        CL_Your_revised_application_is_with_our_validation_team_We_ll_notify_you_of_the,

        // Recommend for Fund (Approved)
        CL_Your_application_has_been_approved,
        CL_Complete_the_three_steps_below_to_begin_your_partnership_with_Wadhwani_Grants,
        CL_APPROVED,
        CL_Three_steps_to_activate_your_partnership,
        CL_Grant_Agreement,
        CL_Your_Grant_Agreement_of_Understanding_will_be_shared_via_Volody_for_e_signatu,
        CL_Grant_Agreement_will_be_shared_by_your_Programme_Lead_shortly,
        CL_Compliance_Documents,
        CL_Upload_your_organisation_s_compliance_documents,
        CL_Required_documents_depend_on_your_geography,
        CL_documents_complete,
        CL_Manage_compliance_documents,
        CL_Programme_Setup,
        CL_Your_Programme_Lead_will_configure_your_programme_details_funding_model_and,
        CL_COMING_SOON,
        CL_For_any_queries,
        CL_Your_Programme_Lead_will_be_in_touch_to_share_the_Grant_Agreement_for_signatu,
        CL_Next_step,
    };

    // ── rawStatus → decided badge label map ─────────────────────────────
    // NOTE: adjust the KEYS below to match the exact picklist API values
    // returned by Apex as `rawStatus` for these two "Decided/rejected"
    // outcomes. The VALUES are the Custom Labels from your notepad.
    decidedStatusLabelMap = {
        'Not Recommend for Fund': CL_Not_Recommend_for_Fund,
        'Reviewer Rejected':      CL_Reviewer_Rejected,
    };

    // ─────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────

connectedCallback() {
    const shouldResume = sessionStorage.getItem('wcf_resume_after_redirect');
    if (shouldResume === 'true') {
        sessionStorage.removeItem('wcf_resume_after_redirect');
        this._pendingResume = true;
        
    }
    this.loadStatus();
    this.resolvePageUrls();
}

resolvePageUrls() {
        this[NavigationMixin.GenerateUrl]({
            type: 'comm__namedPage',
            attributes: { name: 'ApplicationFAQ__c' } // must match the page's exact API name
        }).then((url) => { this.faqUrl = url; });

        this[NavigationMixin.GenerateUrl]({
            type: 'comm__namedPage',
            attributes: { name: 'EligiblityCri__c' } // must match the page's exact API name
        }).then((url) => { this.eligibilityUrl = url; });
    }

    loadStatus() {
        this.isLoading = true;
       return  getApplicationStatusForUser()
            .then(result => {
                console.log('FULL RESULT:', JSON.stringify(result));

                this.normalizedStatus    = result.status;
                this.recordId            = result.recordId;
                this.applicationName     = result.applicationName;
                this.organizationName    = result.organizationName;
                this.headquarters        = result.headquarters;
                this.selectedFundingArea = result.selectedFundingArea;
                this.submitterName       = result.submitterName;
                this.lastModified        = result.lastModified;
                this.createdDate         = result.createdDate;
                this.lastPage            = result.lastPage;
                this.programmeLeadName   = result.programmeLeadName;
                this.programmeLeadEmail  = result.programmeLeadEmail;
                this.rawStatus = result.rawStatus;

                // Revision data
                if (result.reviewNotes) {
                    this.reviewNotes = result.reviewNotes;
                }
                if (result.flaggedQuestions) {
                    this.flaggedQuestionNumbers = result.flaggedQuestions
                        .split(';')
                        .filter(v => v.trim() !== '')
                        .map(v => parseInt(v.trim(), 10));
                }
                if (result.questionReturnNotes) {
                    this.questionReturnNotes = result.questionReturnNotes;
                }
                if (result.reviewerReturnComment) {
    this.reviewerReturnComment = result.reviewerReturnComment;
}

                // Stage 4 Approval data
                // Apex should return these when status === 'Approved'
                if (result.approvalDate)       { this.approvalDate       = result.approvalDate; }
                if (result.mouStatus)          { this.mouStatus          = result.mouStatus; }
                if (result.mouVolodyLink)      { this.mouVolodyLink      = result.mouVolodyLink; }
                if (result.complianceUploaded != null) { this.complianceUploaded = result.complianceUploaded; }
                if (result.complianceTotal    != null) { this.complianceTotal    = result.complianceTotal; }
                this.complianceStatus = result.complianceStatus;
                this.complianceReviewerNotes = result.complianceReviewerNotes;
                this.complianceDocStatus     = result.complianceDocStatus;              // ← ADD
this.complianceHasUploads    = result.complianceHasUploads === true;    // ← ADD
            })
            .catch(error => {
                console.error('Error loading application status', error);
                this.normalizedStatus = 'NotStarted';
            })
            .finally(() => {
                this.isLoading = false;
                if (this._pendingResume) {
                this._pendingResume = false;
                this.showFormView = true;   // only flip AFTER recordId is populated
            }
            });
    }

    // ─────────────────────────────────────────────────────────────────
    // Status getters
    // ─────────────────────────────────────────────────────────────────
    get formattedReturnNotes() {
        return (this.questionReturnNotes || [])
            .slice()
            .sort((a, b) => a.questionNum - b.questionNum)
            .map(n => ({
                key  : n.questionNum,
                label: `Q${n.questionNum} — ${n.returnText}`
            }));
    }

    get hasReturnNotes() {
        return this.formattedReturnNotes.length > 0;
    }

    get isOverlayOpen() {
        return this.showFormView || this.showPreviewView || this.showComplianceView || this.showWelcomeView || this.showRevisionView;
    }

    get isNotStarted() {
        return this.normalizedStatus === 'NotStarted' && !this.isOverlayOpen;
    }
    get isDraft() {
        return this.normalizedStatus === 'Draft' && !this.isOverlayOpen;
    }
    get isSubmitted() {
        return this.normalizedStatus === 'Submitted' && !this.isOverlayOpen;
    }

    get isRevisionRequestedStatus() {
        return this.normalizedStatus === 'RevisionRequested' && !this.isOverlayOpen;
    }
    get isAdditionalInfoRequestedStatus() {
        return this.normalizedStatus === 'AdditionalInfoRequested' && !this.isOverlayOpen;
    }

    get isRevisionMode() {
        return this.normalizedStatus === 'RevisionRequested' || this.normalizedStatus === 'ApplicationResubmitted' || this.normalizedStatus === 'AdditionalInfoRequested';
    }

    get isSealed() {
        return this.normalizedStatus === 'Sealed' && !this.isOverlayOpen;
    }
    get isUnderReview() {
        return this.normalizedStatus === 'UnderReview' && !this.isOverlayOpen;
    }
    get isReviewSubmitted() {
        return this.normalizedStatus === 'ReviewSubmitted' && !this.isOverlayOpen;
    }
    get isApplicationResubmitted() {
        return this.normalizedStatus === 'ApplicationResubmitted' && !this.isOverlayOpen;
    }

    get isInReview() {
        return this.normalizedStatus === 'InReview' && !this.isOverlayOpen;
    }

    get isApproved() {
        return this.normalizedStatus === 'Approved' && !this.isOverlayOpen;
    }

    get isDecided() {
        return this.normalizedStatus === 'Decided' && !this.isOverlayOpen;
    }

    // ─────────────────────────────────────────────────────────────────
    // Display helpers — general
    // ─────────────────────────────────────────────────────────────────

    get submitterFirstName() {
        if (!this.submitterName) return '';
        return this.submitterName.split(' ')[0];
    }

    get lastModifiedFormatted() {
        return this._formatDate(this.lastModified);
    }

    get createdDateFormatted() {
        return this._formatDate(this.createdDate);
    }

    get approvalDateFormatted() {
        return this._formatDate(this.approvalDate);
    }

    _formatDate(dateVal) {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }

    get currentStepNumber() {
        if (!this.lastPage) return 1;
        const idx = this.pageSequence.indexOf(Number(this.lastPage));
        return idx === -1 ? 1 : idx + 1;
    }

    get totalSteps() {
        return this.pageSequence.length;
    }

    get progressPercent() {
        return Math.round((this.currentStepNumber / this.totalSteps) * 100);
    }

    renderedCallback() {
        // Draft progress bar
        if (this.isDraft) {
            const draftFill = this.template.querySelector('.dash-progress-fill');
            if (draftFill) {
                draftFill.style.width = `${this.progressPercent}%`;
            }
        }

        // Compliance progress bar — uses its own class so it doesn't
        // collide with the draft progress bar's querySelector above.
        if (this.isApproved) {
            const compFill = this.template.querySelector('.dash-compliance-fill');
            if (compFill) {
                const pct = this.complianceTotal > 0
                    ? Math.min(Math.round((this.complianceUploaded / this.complianceTotal) * 100), 100)
                    : 0;
                compFill.style.width = `${pct}%`;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Display helpers — Stage 4 Approved card
    // ─────────────────────────────────────────────────────────────────
    get decidedStatusLabel() {
    return this.decidedStatusLabelMap[this.rawStatus] || 'DECISION MADE';
}

    get hasMouLink() {
        return !!this.mouVolodyLink;
    }

    get hasProgrammeLead() {
        return !!this.programmeLeadName;
    }

    get programmeLeadMailto() {
        return this.programmeLeadEmail ? `mailto:${this.programmeLeadEmail}` : '#';
    }

    // MoU status badge class
    get mouStatusBadgeClass() {
        const map = {
            'Active'  : 'dash-track-badge dash-track-badge--active',
            'Expired' : 'dash-track-badge dash-track-badge--expired',
            'Pending' : 'dash-track-badge dash-track-badge--pending'
        };
        return map[this.mouStatus] || map['Pending'];
    }

    // MoU status display label
    get mouStatusLabel() {
        const map = {
            'Active'  : 'SIGNED',
            'Expired' : 'EXPIRED',
            'Pending' : CL_AWAITING_SIGNATURE
        };
        return map[this.mouStatus] || CL_AWAITING_SIGNATURE;
    }

    // Compliance progress pill class
    get complianceStatusBadgeClass() {
        if (this.complianceStatus === 'Rejected') {
            return 'dash-track-badge dash-track-badge--rejected';
        }
        if (this.complianceStatus === 'Suspended') {
            return 'dash-track-badge dash-track-badge--suspended';
        }
        if (this.complianceStatus === 'Returned') {
            return 'dash-track-badge dash-track-badge--returned';
        }
        if (this.complianceStatus === 'Validated') {
            return 'dash-track-badge dash-track-badge--active';
        }
        if (this.complianceTotal === 0) return 'dash-track-badge dash-track-badge--pending';
        if (this.complianceUploaded >= this.complianceTotal) {
            return 'dash-track-badge dash-track-badge--active';
        }
        if (this.complianceUploaded > 0) {
            return 'dash-track-badge dash-track-badge--inprogress';
        }
        return 'dash-track-badge dash-track-badge--pending';
    }

    get complianceProgressLabel() {
        if (this.complianceStatus === 'Rejected') return 'REJECTED';
        if (this.complianceStatus === 'Suspended') return 'SUSPENDED';
        if (this.complianceStatus === 'Returned') return 'ACTION NEEDED';
        if (this.complianceStatus === 'Validated') return 'COMPLETE';
        if (this.complianceTotal === 0) return 'NOT STARTED';
        if (this.complianceUploaded >= this.complianceTotal) return 'COMPLETE';
        return CL_IN_PROGRESS;
    }

    get showPassedBanner() {
        return this.complianceStatus === 'Validated';
    }

    get showRejectedBanner() {
        return this.complianceStatus === 'Rejected';
    }

    get showSuspendedBanner() {
        return this.complianceStatus === 'Suspended';
    }

    get showReturnedBanner() {
        return this.complianceStatus === 'Returned';
    }

    // Inline style for compliance progress bar fill
    get complianceProgressStyle() {
        if (this.complianceTotal === 0) return 'width: 0%';
        const pct = Math.min(
            Math.round((this.complianceUploaded / this.complianceTotal) * 100),
            100
        );
        return `width: ${pct}%`;
    }

    // ─────────────────────────────────────────────────────────────────
    // Actions — language redirect
    // ─────────────────────────────────────────────────────────────────

    handleLanguageRedirect(event) {
        const { redirectUrl } = event.detail;
        sessionStorage.setItem('wcf_resume_after_redirect', 'true');
        window.location.href = redirectUrl;
    }

    // ─────────────────────────────────────────────────────────────────
    // Actions — form overlays
    // ─────────────────────────────────────────────────────────────────

    handleResumeApplication() {
        this.showFormView = true;
    }

    handleOpenRevision() {
        this.showRevisionView = true;
    }

    handleRevisionSubmitted() {
        this.showRevisionView = false;
        this.loadStatus();
    }

    handleOpenAdditionalInfo() {
        this.showFormView = true;
    }

    handleViewSubmission() {
        console.log('recordId being passed to preview:', this.recordId);
        this.showPreviewView = true;
    }

    handleViewOriginal() {
        this.showPreviewView = true;
    }

    handleBackToDashboard() {
        this.showWelcomeView = false;
        this.showFormView = false;
        this.showRevisionView = false;
        this.loadStatus();
    }

    handleBackFromPreview() {
        this.showPreviewView = false;
    }

    // ─────────────────────────────────────────────────────────────────
    // Actions — Stage 4 Compliance docs overlay
    // ─────────────────────────────────────────────────────────────────

    handleOpenComplianceDocs() {
        this.showComplianceView = true;
    }

    handleBackFromCompliance() {
        this.showComplianceView = false;
        this.loadStatus();
    }

    handleComplianceUpdate(event) {
        if (event.detail) {
            this.complianceUploaded = event.detail.uploaded ?? this.complianceUploaded;
            this.complianceTotal    = event.detail.total    ?? this.complianceTotal;
        }
    }

handleOpenEligibility(event) {
    if (event) event.preventDefault();
    this.showEligibilityModal = true;
}

handleCloseEligibility() {
    this.showEligibilityModal = false;
}

handleOpenFaq(event) {
    if (event) event.preventDefault();
    this.showFaqModal = true;
}

handleCloseFaq() {
    this.showFaqModal = false;
}


    get isNotStartedMode() {
        return this.normalizedStatus === 'NotStarted';
    }

    handleStartApplication(event) {
        if (event && event.detail && event.detail.lang) {
            this.selectedLanguage = event.detail.lang;
        }
        this.showWelcomeView = true;
        this.showFormView = false;
    }

    handleBeginForm() {
        this.showWelcomeView = false;
        this.showFormView = true;
    }
}