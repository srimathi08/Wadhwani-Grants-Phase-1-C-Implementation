import { LightningElement, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';

import isReviewerRegistered from '@salesforce/apex/ReviewerUserHelper.isReviewerRegistered';
import getNdaStatus from '@salesforce/apex/ReviewerUserHelper.getNdaStatus';
import getReviewSummary from '@salesforce/apex/ReviewSummaryController.getReviewSummary';

export default class ReviewerDashboard extends NavigationMixin(LightningElement) {

    /* =========================
       Onboarding Status
       ========================= */
    @track reviewerRegistered = false;
    @track reviewerOnboardingStatusText = 'Yet to Start';
    @track ndaStatusText = 'Yet to Start';
    @track ndaCompleted = false;

    /* =========================
       Review Summary Metrics
       ========================= */
    @track totalAssigned = 0;
    @track submitted = 0;
    @track draftCount = 0;
    @track yetToStart = 0;
    @track rejected = 0;

    /* =========================
       Recent Activity
       ========================= */
    @track recentActivities = [];

    /* =========================
       Error Handling
       ========================= */
    @track error;

    /* =========================================================
       FIX: URLs are now built dynamically from the CURRENT site's
       origin (window.location.origin) instead of being hardcoded
       to the production domain. This means:
         - In production  -> https://wadhwanifoundation.my.site.com/reviewportal/...
         - In sandbox      -> https://wadhwanifoundation--wfdev.sandbox.my.site.com/reviewportal/...
       No more manual URL swaps when moving the component between orgs.
       ========================================================= */
    get baseUrl() {
        // e.g. https://wadhwanifoundation--wfdev.sandbox.my.site.com
        return window.location.origin;
    }

    get siteBasePath() {
        // The Experience Cloud site path segment, e.g. /reviewportal or /ProposalReviewerPortal
        // window.location.pathname looks like: /reviewportal/s/... or /ProposalReviewerPortal/s/...
        // We grab everything before "/s/" (or before "/s" at the end).
        const path = window.location.pathname;
        const marker = '/s/';
        const idx = path.indexOf(marker);
        if (idx !== -1) {
            return path.substring(0, idx);
        }
        // Fallback: if we're on a page ending in just "/s"
        if (path.endsWith('/s')) {
            return path.substring(0, path.length - 2);
        }
        return '';
    }

    get registrationUrl() {
        return `${this.baseUrl}${this.siteBasePath}/s/reviewer-registration-form`;
    }

    get applicationsUrl() {
        return `${this.baseUrl}${this.siteBasePath}/s/total-assigned-proposal`;
    }

    get reviewedUrl() {
        return `${this.baseUrl}${this.siteBasePath}/s/applicationReview/ApplicationReview/Default?ApplicationReview-filterId=Submitted_Reviews`;
    }

    get yetToStartUrl() {
        return `${this.baseUrl}${this.siteBasePath}/s/yet-to-start-reviews`;
    }

    get inProgressUrl() {
        return `${this.baseUrl}${this.siteBasePath}/s/in-progress-reviews`;
    }

    /* =========================
       Wire Result Holders
       ========================= */
    wiredReviewerResult;
    wiredNdaResult;
    wiredSummaryResult;

    /* =========================
       WIRE 1: Reviewer Registration
       ========================= */
    @wire(isReviewerRegistered)
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
    }

    get showStartReview() {
        return this.reviewerRegistered && this.ndaCompleted;
    }

    /* =========================
       WIRE 2: NDA Status
       ========================= */
    @wire(getNdaStatus)
    wiredNda(response) {
        this.wiredNdaResult = response;
        const { data, error } = response;

        if (data) {
            this.ndaStatusText = data.ndaStatus;
            this.ndaCompleted = data.ndaStatus === 'Executed';
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
            this.rejected = data.rejected ?? 0;

            this.generateRecentActivity();
        } else if (error) {
            this.error = error;
        }
    }

    /* =========================
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

    get activeStatusText() {
        return this.showStartReview ? 'Active' : 'Pending';
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

    handleRejectedClick() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Application_Review__c'
            }
        });
    }
}