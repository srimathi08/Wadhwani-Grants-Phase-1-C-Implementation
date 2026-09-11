import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
// ── NEW: resolves to '/reviewersite/s' in sandbox and '/internal/s' in production ──
import COMMUNITY_BASE_PATH from '@salesforce/community/basePath';
import getValidatedProposals from '@salesforce/apex/WCFProposalListController.getValidatedProposals';
import getReviewStatusMap    from '@salesforce/apex/WCFProposalListController.getReviewStatusMap';
import getReviewerPreview    from '@salesforce/apex/ReviewSummaryController.getReviewerPreview';
import getApproverReturnQueueCount from '@salesforce/apex/WCFProposalListController.getApproverReturnQueueCount';

import getAcceptedApplicationsCount from '@salesforce/apex/WCFProposalListController.getAcceptedApplicationsCount';
import getAcceptedApplicationsQueue from '@salesforce/apex/WCFProposalListController.getAcceptedApplicationsQueue';

export default class WcfReviewerDashboard extends NavigationMixin(LightningElement) {

    // ─── State ────────────────────────────────────────────────────
    @track reviewerTotal      = 0;
    @track reviewerReviewed   = 0;
    @track reviewerInProgress = 0;
    @track reviewerNotStarted = 0;
    @track reviewerReturnedByApprover = 0;
    @track reviewerPreviewRows = [];

    // ── add to @track state ──
@track reviewerAcceptedCount     = 0;
@track acceptedApplicationRows   = [];

    // ─────────────────────────────────────────────────────────────
    // SITE BASE PATH (environment-independent navigation)
    // ─────────────────────────────────────────────────────────────
    // Same fix as wcfProposalListView: never hardcode '/reviewersite/s'.
    // Experience Cloud prefixes the site base path onto a standard__webPage
    // URL unless the URL already starts with it — which is why the literal
    // worked in sandbox ('/reviewersite/s') and produced
    // '/internal/s/reviewersite/s/...' => "Invalid Page" in production.
    get sitePath() {
        return COMMUNITY_BASE_PATH || '';
    }

    /**
     * Build a site-relative URL.
     * @param {string} page   page URL name, e.g. 'review-forms'
     * @param {object} params optional query params (values are URI-encoded)
     */
    _siteUrl(page, params) {
        const path = String(page || '').replace(/^\/+/, '');
        let url    = `${this.sitePath}/${path}`;
        if (params) {
            const qs = Object.keys(params)
                .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
                .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
                .join('&');
            if (qs) url += `?${qs}`;
        }
        return url;
    }

    // ─── Lifecycle ────────────────────────────────────────────────
    connectedCallback() {
        this.loadReviewerCounts();
        this.loadReviewerPreview();
        this.loadApproverReturnCount();
         this.loadAcceptedApplications(); 
    }

    async loadAcceptedApplications() {
    try {
        this.reviewerAcceptedCount = await getAcceptedApplicationsCount();
        const rows = await getAcceptedApplicationsQueue();
        this.acceptedApplicationRows = (rows || []).map((r, i) => ({
            id: r.applicationId,
            rowNum: i + 1,
            applicationId: r.applicationId,
            appName: r.appName,
            organizationName: r.organizationName || '—',
            approverComment: r.approverComment,
            decisionDateFormatted: r.decisionDate
                ? new Date(r.decisionDate).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })
                : '—'
        }));
    } catch (e) {
        console.error('Accepted applications error:', e);
    }
}

handleCreateComplianceRequest(event) {
    const applicationId = event.currentTarget.dataset.id;
    const appName       = event.currentTarget.dataset.appname;
    this[NavigationMixin.Navigate]({
        type: 'standard__webPage',
        attributes: {
            // CHANGED: was `/reviewersite/s/wg-compliance-documents?...`
            url: this._siteUrl('wg-compliance-documents', {
                applicationId : applicationId,
                appName       : appName
            })
        }
    });
}

get noAcceptedApplicationRows() {
    return !this.acceptedApplicationRows || this.acceptedApplicationRows.length === 0;
}
    // ─── Data loading ─────────────────────────────────────────────
    async loadReviewerCounts() {
        try {
            const [proposals, reviewMap] = await Promise.all([
                getValidatedProposals(),
                getReviewStatusMap()
            ]);

            const map = reviewMap || {};
            let reviewed = 0, inProgress = 0, notStarted = 0;

            // Every proposal — whether the Validator passed it or flagged it —
            // is counted the same way: by the reviewer's own progress on it.
            for (const p of (proposals || [])) {
                const info = map[p.Id] || {};

                if (info.isSubmitted || info.status === 'Review Submitted') {
                    reviewed++;
                } else if (info.status === 'In Progress') {
                    inProgress++;
                } else {
                    notStarted++;
                }
            }

            this.reviewerTotal      = reviewed + inProgress + notStarted;
            this.reviewerReviewed   = reviewed;
            this.reviewerInProgress = inProgress;
            this.reviewerNotStarted = notStarted;

        } catch (e) {
            console.error('Reviewer counts error:', e);
        }
    }

    async loadApproverReturnCount() {
        try {
            this.reviewerReturnedByApprover = await getApproverReturnQueueCount();
        } catch (e) {
            console.error('Approver return count error:', e);
        }
    }

    async loadReviewerPreview() {
        try {
            const rows = await getReviewerPreview({ maxRows: 20 });
            const mapped = (rows || []).map(r => {
                const rtName = r.recordTypeName || '';
                const track  = rtName.includes('Creation') && rtName.includes('Fulfillment')
                    ? 'JF/JC'
                    : rtName.includes('Creation') ? 'JC' : 'JF';
                const isInProgress = r.status === 'In Progress';
                const dueDateRaw   = r.dueDate || null;
                return {
                    id:           r.reviewId || r.appRecordId,
                    appId:        r.appName,
                    appRecordId:  r.appRecordId,
                    reviewId:     r.reviewId || null,
                    headquarters: r.headquarters || '',
                    account:      r.accountName || '—',
                    track,
                    dueDateRaw,
                    dueDate: dueDateRaw
                        ? this._parseDate(dueDateRaw).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })
                        : '—',
                    dueDateClass: this._computeDueDateClass(dueDateRaw),
                    status:       isInProgress ? 'In Progress' : 'Not Started',
                    statusClass:  isInProgress ? 'status-pill status-inprogress' : 'status-pill status-notstarted',
                    action:       isInProgress ? 'Resume Review' : 'Start Review',
                    reviewAction: isInProgress ? 'resume' : 'start'
                };
            });

            mapped.sort((a, b) => {
                if (!a.dueDateRaw && !b.dueDateRaw) return 0;
                if (!a.dueDateRaw) return 1;
                if (!b.dueDateRaw) return -1;
                return this._parseDate(a.dueDateRaw) - this._parseDate(b.dueDateRaw);
            });

            this.reviewerPreviewRows = mapped.slice(0, 5).map((r, i) => ({ ...r, rowNum: i + 1 }));
        } catch (e) {
            console.error('Reviewer preview error:', e);
        }
    }

    // ─── Handlers ─────────────────────────────────────────────────
    handleReviewerTileClick(event) {
        const filter = event.currentTarget.dataset.filter;
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'WCF_Reviewer_Application_List__c' },
            state: { reviewFilter: filter }
        });
    }

    handleViewAllReviewerQueue() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'WCF_Reviewer_Application_List__c' }
        });
    }

    handleReviewerRowAction(event) {
        const proposalId   = event.currentTarget.dataset.id;
        const appName      = event.currentTarget.dataset.appname;
        const reviewId     = event.currentTarget.dataset.reviewId;
        const action       = event.currentTarget.dataset.action;
        const headquarters = event.currentTarget.dataset.headquarters;
        const track        = event.currentTarget.dataset.track;
        this._navigateReviewer(proposalId, appName, reviewId, action, headquarters, track);
    }

    // ─── Getters ──────────────────────────────────────────────────
    get noReviewerPreviewRows() {
        return !this.reviewerPreviewRows || this.reviewerPreviewRows.length === 0;
    }

    get greeting() {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }

    get todayDate() {
        return new Date().toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // ─── Navigation helper ────────────────────────────────────────
    _navigateReviewer(proposalId, appName, reviewId, action, headquarters, track) {
        const hq = (headquarters || '').toLowerCase();
        const isNonEnglish = hq.includes('mexico') || hq.includes('brazil');

        if (isNonEnglish) {
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    // CHANGED: was `/reviewersite/s/individualapplication/...`
                    url: this._siteUrl(
                        `individualapplication/${proposalId}/${(appName || '').toLowerCase()}`
                    )
                }
            });
            return;
        }

        if ((action === 'resume' || action === 'view') && reviewId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    // CHANGED: was `/reviewersite/s/review-forms?...`
                    url: this._siteUrl('review-forms', {
                        recordId      : reviewId,
                        applicationId : proposalId
                    })
                }
            });
            return;
        }

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                // CHANGED: was `/reviewersite/s/review-forms?recordId=new...`
                url: this._siteUrl('review-forms', {
                    recordId      : 'new',
                    applicationId : proposalId,
                    track         : track
                })
            }
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────
    _parseDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return new Date(
                parseInt(parts[0], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[2], 10)
            );
        }
        return new Date(dateStr);
    }

    _computeDueDateClass(dueDate) {
        if (!dueDate) return 'due-date';
        const due      = this._parseDate(dueDate);
        const today    = new Date(); today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due - today) / 86400000);
        if (diffDays < 0)  return 'due-date due-overdue';
        if (diffDays <= 3) return 'due-date due-urgent';
        return 'due-date';
    }
}