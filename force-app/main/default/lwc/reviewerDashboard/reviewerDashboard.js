import { LightningElement, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
 
import isReviewerRegistered from '@salesforce/apex/ReviewerUserHelper.isReviewerRegistered';
import getNdaStatus from '@salesforce/apex/ReviewerUserHelper.getNdaStatus';
import getReviewSummary from '@salesforce/apex/ReviewSummaryController.getReviewSummary';
 
export default class ReviewerDashboard extends LightningElement {
 
    /* =========================
       Onboarding Status
       ========================= */
    @track reviewerRegistered = false;
    @track reviewerOnboardingStatusText = 'Yet to Start';
    @track ndaStatusText = 'Yet to Start';
    @track ndaCompleted = false;
   // @track showStartReview = false; -- Previous Logic  - working
    @track activeStatusText = 'Pending';
 
    /* =========================
       Review Summary Metrics
       ========================= */
    @track totalAssigned = 0;
    @track submitted = 0;
    @track draftCount = 0;
    @track yetToStart = 0;
 
    /* =========================
       Recent Activity
       ========================= */
    @track recentActivities = [];
 
    /* =========================
       Error Handling
       ========================= */
    @track error;
 
    /* =========================
       URLs
       ========================= */
    registrationUrl =
       'https://wadhwanifoundation--wfdev.sandbox.my.site.com/ProposallReviewerPortal/s/reviewer-registration-form';
 
    applicationsUrl =
    'https://wadhwanifoundation--wfdev.sandbox.my.site.com/ProposallReviewerPortal/s/total-assigned-proposal';
 
 
    reviewedUrl =
        'https://wadhwanifoundation--wfdev.sandbox.my.site.com/ProposallReviewerPortal/s/applicationReview/ApplicationReview/Default?ApplicationReview-filterId=Submitted_Reviews%27;'
 
    /*yetToStartUrl =
        'https://wadhwanifoundation.my.site.com/reviewportal/s/yet-to-start-reviews';
 
    inProgressUrl =
        'https://wadhwanifoundation.my.site.com/reviewportal/s/in-progress-reviews';*/
 
    /* =========================
       Wire Result Holders
       ========================= */
    wiredReviewerResult;
    wiredNdaResult;
    wiredSummaryResult;
 
    /* =========================
       WIRE 1: Reviewer Registration
       ========================= */
       //Working - Previous Logic
  /*  @wire(isReviewerRegistered)
    wiredReviewer(response) {
        this.wiredReviewerResult = response;
        const { data, error } = response;
 
        if (data !== undefined) {
            this.reviewerRegistered = data;
            this.reviewerOnboardingStatusText = data ? 'Completed' : 'Yet to Start';
        } else if (error) {
            this.reviewerOnboardingStatusText = 'Error';
            this.error = error;
        }
    } */
   @wire(isReviewerRegistered)
wiredReviewer(response) {
    this.wiredReviewerResult = response;
    const { data, error } = response;
 
    if (data !== undefined) {
        this.reviewerRegistered = data;
        this.reviewerOnboardingStatusText = data ? 'Completed' : 'Yet to Start';
        //this.activeStatusText = data ? 'Active' : 'Pending';
 
        // 🔥 NEW LOGIC - Working - Previous logic
      this.showStartReview = data;
      //  this.activeStatusText = data ? 'Active' : 'Pending';
 
    } else if (error) {
        this.reviewerOnboardingStatusText = 'Error';
        this.showStartReview = false;
        this.error = error;
    }
}
 
//new lines
get showStartReview() {
    return this.reviewerRegistered && this.ndaCompleted;
}

 
 
    /* =========================
       WIRE 2: NDA Status
       ========================= */
       //Working - Previous Logic
   /* @wire(getNdaStatus)
    wiredNda(response) {
        this.wiredNdaResult = response;
        const { data, error } = response;
 
        if (data) {
            this.ndaStatusText = data.ndaStatus;
            this.ndaCompleted = data.ndaStatus === 'Executed';
            this.showStartReview = this.ndaCompleted;
            this.activeStatusText = this.ndaCompleted ? 'Active' : 'Pending';
        } else if (error) {
            this.ndaStatusText = 'Error';
            this.showStartReview = false;
            this.error = error;
        }
    }*/
   @wire(getNdaStatus)
wiredNda(response) {
    this.wiredNdaResult = response;
    const { data, error } = response;
 
    if (data) {
        this.ndaStatusText = data.ndaStatus;
        this.ndaCompleted = data.ndaStatus === 'Executed';
 
        // ❌ DO NOT control dashboard visibility here anymore
 
    } else if (error) {
        this.ndaStatusText = 'Error';
        this.error = error;
    }
}
 
 
    /* =========================
       WIRE 3: Review Summary
       ========================= */
    @wire(getReviewSummary)
    wiredSummary(response) {
        this.wiredSummaryResult = response;
        const { data, error } = response;
 
        if (data) {
            this.totalAssigned = data.totalAssigned;
            this.submitted = data.submitted;
            this.draftCount = data.draft;
            this.yetToStart = data.yetToStart;
 
            this.generateRecentActivity();
        } else if (error) {
            this.error = error;
        }
    }
 
    /* =========================
       🔥 CRITICAL FIX:
       Refresh dashboard after Draft save
       ========================= */
    connectedCallback() {
        this._focusHandler = () => {
            if (this.wiredSummaryResult) {
                refreshApex(this.wiredSummaryResult);
            }
        };
        window.addEventListener('focus', this._focusHandler);
    }
 
    disconnectedCallback() {
        window.removeEventListener('focus', this._focusHandler);
    }
 
    /* =========================
       Recent Activity Generator
       ========================= */
    generateRecentActivity() {
        const activities = [];
 
        if (this.submitted > 0) {
            activities.push({
                id: '1',
                description: 'Completed review submission',
                timeAgo: 'Recently',
                icon: 'utility:success',
                statusClass: 'activity-status status-success'
            });
        }
 
        if (this.draftCount > 0) {
            activities.push({
                id: '2',
                description: 'Saved draft review',
                timeAgo: 'Today',
                icon: 'utility:edit',
                statusClass: 'activity-status status-draft'
            });
        }
 
        if (this.ndaCompleted) {
            activities.push({
                id: '3',
                description: 'NDA signed and approved',
                timeAgo: 'This week',
                icon: 'utility:check',
                statusClass: 'activity-status status-success'
            });
        }
 
        if (this.reviewerRegistered) {
            activities.push({
                id: '4',
                description: 'Registration completed',
                timeAgo: 'This month',
                icon: 'utility:user',
                statusClass: 'activity-status status-info'
            });
        }
 
        this.recentActivities = activities.slice(0, 5);
    }
 
    /* =========================
       Step UI Helpers
       ========================= */
    get registrationStepClass() {
        return this.reviewerRegistered
            ? 'step-circle step-completed'
            : 'step-circle step-current';
    }
 
    get ndaStepClass() {
        if (this.ndaCompleted) return 'step-circle step-completed';
        if (this.reviewerRegistered) return 'step-circle step-current';
        return 'step-circle step-pending';
    }
 
   get activeStepClass() {
    if (this.reviewerRegistered && this.ndaCompleted) {
        return 'step-circle step-completed';
    }
    if (this.reviewerRegistered) {
        return 'step-circle step-current';
    }
    return 'step-circle step-pending';
}

 
    get step1LineClass() {
        return this.reviewerRegistered
            ? 'step-line line-completed'
            : 'step-line line-pending';
    }
 
    get step2LineClass() {
        return this.ndaCompleted
            ? 'step-line line-completed'
            : 'step-line line-pending';
    }
 
    get hasActivity() {
        return this.recentActivities?.length > 0;
    }
    get showDashboard() {
    return this.reviewerRegistered;
}

 
    /* =========================
       Navigation
       ========================= */
    handleRegistrationClick() {
        window.location.href = this.registrationUrl;
    }
 
    handleTotalClick() {
        window.location.href = this.applicationsUrl;
    }
 
    handleYetToStartClick() {
        window.location.href = this.yetToStartUrl;
    }
 
    handleInProgressClick() {
        window.location.href = this.inProgressUrl;
    }
 
    handleDraftClick() {
        window.location.href = this.applicationsUrl;
    }
 
    handleReviewedClick() {
        window.location.href = this.reviewedUrl;
    }
}