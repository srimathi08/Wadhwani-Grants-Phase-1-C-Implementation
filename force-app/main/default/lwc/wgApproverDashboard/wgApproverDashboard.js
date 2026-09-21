import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getApproverQueue   from '@salesforce/apex/WCFApproverListController.getApproverQueue';
import getApproverSummary from '@salesforce/apex/WCFApproverListController.getApproverSummary';

export default class WcfApproverDashboard extends NavigationMixin(LightningElement) {

    @track approverCards       = [];
    @track approverPreviewRows = [];

    connectedCallback() {
        this.loadApproverData();
    }

    async loadApproverData() {
        try {
            const [rows, summary] = await Promise.all([
                getApproverQueue(),
                getApproverSummary()
            ]);
            this._buildCards(rows || [], summary || {});
            this._buildPreviewRows(rows || []);
        } catch (e) {
            console.error('Approver dashboard error:', e);
        }
    }

    /**
     * KPI tiles — same order, labels and colors as the Approver Queue tiles.
     *  - pending / approved / declined / returned / backFromReviewer come from
     *    getApproverSummary() (authoritative)
     *  - recYes / recNo are client-computed from the queue rows (unchanged)
     */
    _buildCards(rows, summary) {
        const recYes = rows.filter(r => r.recommendation === 'Yes').length;
        const recNo  = rows.filter(r => r.recommendation === 'No').length;

        const defs = [
            { id: 'pending',          label: 'Pending Decisions',    subtitle: 'Reviewed proposals awaiting your decision',   count: summary.pending || 0,          tone: 'brand',    alertWhenPositive: true },
            { id: 'backFromReviewer', label: 'Back from Reviewer',   subtitle: 'Reviewer responded — ready for your final decision', count: summary.backFromReviewer || 0, tone: 'warning', alertWhenPositive: true },
            { id: 'returned',         label: 'Returned to Reviewer', subtitle: 'Sent back to the Reviewer for clarification', count: summary.returned || 0,         tone: 'returned' },
            { id: 'recYes',           label: 'Recommended',          subtitle: 'Proposals recommended for approval',          count: recYes,                        tone: 'info' },
            { id: 'recNo',            label: 'Not Recommended',      subtitle: 'Proposals not recommended for approval',      count: recNo,                         tone: 'neutral' },
            { id: 'approved',         label: 'Approved',             subtitle: 'Proposals approved and finalised',            count: summary.approved || 0,         tone: 'success' },
            { id: 'declined',         label: 'Declined',             subtitle: 'Proposals declined after review',             count: summary.declined || 0,         tone: 'error' }
        ];

        this.approverCards = defs.map(d => ({
            id      : d.id,
            label   : d.label,
            subtitle: d.subtitle,
            count   : d.count,
            status  : d.id,
            kpiClass: 'wg-stat' + (d.alertWhenPositive && d.count > 0 ? ' wg-stat--alert' : ''),
            dotClass: 'wg-stat-dot wg-stat-dot--' + d.tone
        }));
    }

    _buildPreviewRows(rows) {
        const SM = ' wg-btn-sm';
        const TAGS = {
            JF  : { label: 'Job Fulfillment',       cls: 'wg-tag wg-tag--info' },
            JC  : { label: 'Job Creation',          cls: 'wg-tag wg-tag--warning' },
            LU  : { label: 'Livelihood Upliftment', cls: 'wg-tag wg-tag--success' },
            Both: { label: 'JF + JC',               cls: 'wg-tag' }
        };

        const mapped = rows.map(row => {
            const isClearedReturn =
                row.existingDecision === 'Approved with Resubmission'
                && row.applicationStatus !== 'Returned by Approver';

            const hasDecision = !!row.existingDecision && !isClearedReturn;
            const isReady     = !!row.reviewId;

            const trackBadges = (row.track || '').split(',').filter(Boolean).map(code => {
                const trimmed = code.trim();
                const t = TAGS[trimmed] || { label: trimmed, cls: 'wg-tag' };
                return { code: trimmed, label: t.label, pillClass: t.cls };
            });

            const rec = row.recommendation || '';
            let recPillClass = 'wg-pill wg-pill--neutral';
            if      (rec === 'Yes') recPillClass = 'wg-pill wg-pill--success';
            else if (rec === 'No')  recPillClass = 'wg-pill wg-pill--error';

            // Status pill (same meaning-colors as the queue)
            let statusPillClass;
            let decisionLabel;
            if (row.existingDecision === 'Approve' || row.existingDecision === 'Accept') {
                // FIX (display): 'Accept' — the value the decision screen sends —
                // previously fell through to "Pending Decision".
                statusPillClass = 'wg-pill wg-pill--success';
                decisionLabel   = 'Approved';
            } else if (row.existingDecision === 'Decline') {
                statusPillClass = 'wg-pill wg-pill--error';
                decisionLabel   = 'Declined';
            } else if (row.existingDecision === 'Approved with Resubmission' && !isClearedReturn) {
                statusPillClass = 'wg-pill wg-pill--returned';
                decisionLabel   = 'Returned to Reviewer';
            } else if (isClearedReturn) {
                statusPillClass = 'wg-pill wg-pill--warning';
                decisionLabel   = 'Back from Reviewer';
            } else if (isReady) {
                statusPillClass = 'wg-pill wg-pill--info';
                decisionLabel   = 'Pending Decision';
            } else {
                statusPillClass = 'wg-pill wg-pill--neutral';
                decisionLabel   = 'Not Ready';
            }

            // Action button — same wording as the queue
            let actionLabel, actionClass, actionIcon, actionDisabled = false;
            if (hasDecision) {
                actionLabel = 'View Decision';
                actionClass = 'neutral-btn' + SM;
                actionIcon  = 'utility:preview';
            } else if (isClearedReturn) {
                actionLabel = 'Start Reapprove';
                actionClass = 'primary-btn' + SM;
                actionIcon  = 'utility:refresh';
            } else if (isReady) {
                actionLabel = 'Start Approve';
                actionClass = 'primary-btn' + SM;
                actionIcon  = 'utility:approval';
            } else {
                actionLabel    = 'Not Ready';
                actionClass    = 'neutral-btn' + SM;
                actionIcon     = 'utility:block_visitor';
                actionDisabled = true;
            }

            return {
                ...row,
                hasDecision,
                isReady,
                trackBadges,
                recPillClass,
                statusPillClass,
                decisionLabel,
                actionLabel,
                actionClass,
                actionIcon,
                actionDisabled,
                rowClass: isClearedReturn ? 'wg-row--attention' : '',
                recommendation: rec || '—'
            };
        });

        // Sort (unchanged): pending first → recommended first → approved first
        mapped.sort((a, b) => {
            const aPending = !a.hasDecision && a.isReady;
            const bPending = !b.hasDecision && b.isReady;
            if (aPending !== bPending) return aPending ? -1 : 1;

            if (aPending && bPending) {
                if (a.recommendation === 'Yes' && b.recommendation !== 'Yes') return -1;
                if (a.recommendation !== 'Yes' && b.recommendation === 'Yes') return 1;
                return 0;
            }

            if (a.existingDecision === 'Approve' && b.existingDecision !== 'Approve') return -1;
            if (a.existingDecision !== 'Approve' && b.existingDecision === 'Approve') return 1;

            return 0;
        });

        this.approverPreviewRows = mapped
            .slice(0, 5)
            .map((r, i) => ({ ...r, rowNum: i + 1 }));
    }

    // ── Navigation (unchanged) ────────────────────────────────────
    _basePath() {
        const parts = window.location.pathname.split('/');
        const sIdx  = parts.indexOf('s');
        if (sIdx !== -1) return parts.slice(0, sIdx + 1).join('/');
        return '';
    }

    _siteUrl(page, params = {}) {
        const base        = this._basePath();
        const queryString = Object.keys(params).length
            ? '?' + Object.entries(params)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join('&')
            : '';
        return `${base}/${page}${queryString}`;
    }

    handleApproverTileClick(event) {
        const status = event.currentTarget.dataset.status;
        if (!status) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: this._siteUrl('approverlistview', { statusFilter: status }) }
        });
    }

    handleViewAllApproverQueue() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: this._siteUrl('approverlistview') }
        });
    }

    handlePreviewApprove(event) {
        const applicationId = event.currentTarget.dataset.id;
        const appName       = event.currentTarget.dataset.appname;
        const reviewId      = event.currentTarget.dataset.reviewId;
        const track         = event.currentTarget.dataset.track;
        const trackLabel    = event.currentTarget.dataset.trackLabel;
        if (!applicationId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: this._siteUrl('approvercontainer', { applicationId, appName, reviewId, track, trackLabel })
            }
        });
    }

    get noApproverPreviewRows() {
        return !this.approverPreviewRows || this.approverPreviewRows.length === 0;
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
}