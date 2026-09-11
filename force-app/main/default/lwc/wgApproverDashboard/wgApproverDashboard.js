import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getApproverQueue   from '@salesforce/apex/WCFApproverListController.getApproverQueue';
import getApproverSummary from '@salesforce/apex/WCFApproverListController.getApproverSummary';   // ← NEW

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
     * Build KPI tile counts.
     *  - pending / approved / declined / returned come from getApproverSummary()
     *    (authoritative — correctly excludes Returned apps from "pending")
     *  - recYes stays client-computed from the queue rows (different metric:
     *    "recommended Yes" regardless of decision state)
     */
    _buildCards(rows, summary) {
        const recYes = rows.filter(r => r.recommendation === 'Yes').length;
    const recNo  = rows.filter(r => r.recommendation === 'No').length;   // ← NEW

        this.approverCards = [
            {
                id:       'pending',
                label:    'Pending Decisions',
                subtitle: 'Reviewed proposals awaiting your decision',
                count:    summary.pending || 0,
                status:   'pending',
                kpiClass: (summary.pending || 0) > 0 ? 'kpi-card kpi-card-alert' : 'kpi-card',
                dotClass: 'kpi-dot kpi-dot-red'
            },
            {
                id:       'recYes',
                label:    'Recommended',
                subtitle: 'Proposals recommended for approval',
                count:    recYes,
                status:   'recYes',
                kpiClass: 'kpi-card',
                dotClass: 'kpi-dot kpi-dot-green'
            },
            {
                id:       'recNo',
                label:    'Not Recommended',
                subtitle: 'Proposals not recommended for approval',
                count:    recNo,
                status:   'recNo',
                kpiClass: 'kpi-card',
                dotClass: 'kpi-dot kpi-dot-red'
            },
            {
                id:       'approved',
                label:    'Approved',
                subtitle: 'Proposals approved and finalised',
                count:    summary.approved || 0,
                status:   'approved',
                kpiClass: 'kpi-card',
                dotClass: 'kpi-dot kpi-dot-blue'
            },
            {
                id:       'declined',
                label:    'Declined',
                subtitle: 'Proposals declined after review',
                count:    summary.declined || 0,
                status:   'declined',
                kpiClass: 'kpi-card',
                dotClass: 'kpi-dot kpi-dot-amber'
            },
            {
                id:       'returned',
                label:    'Returned',
                subtitle: 'Sent back to Reviewer for clarification',
                count:    summary.returned || 0,
                status:   'returned',
                kpiClass: 'kpi-card kpi-card-returned',
                dotClass: 'kpi-dot kpi-dot-navy'
            },
             {
            id:       'backFromReviewer',
            label:    'Back from Reviewer',
            subtitle: 'Reviewer responded — ready for your final decision',
            count:    summary.backFromReviewer || 0,
            status:   'backFromReviewer',
            kpiClass: (summary.backFromReviewer || 0) > 0 ? 'kpi-card kpi-card-highlight' : 'kpi-card',
            dotClass: 'kpi-dot kpi-dot-purple'
        }
        ];
    }

    // ── _buildPreviewRows and everything below is UNCHANGED ──
    _buildPreviewRows(rows) {
        const mapped = rows.map(row => {

             const isClearedReturn =
            row.existingDecision === 'Approved with Resubmission'
            && row.applicationStatus !== 'Returned by Approver';

            
        const hasDecision = !!row.existingDecision && !isClearedReturn;
        const isReady      = !!row.reviewId;

            let trackPillClass = 'track-pill';
            if      (row.track === 'Both') trackPillClass += ' track-both';
            else if (row.track === 'JF')   trackPillClass += ' track-jf';
            else if (row.track === 'JC')   trackPillClass += ' track-jc';

            const rec = row.recommendation || '';
            let recPillClass = 'rec-pill';
            if      (rec === 'Yes') recPillClass += ' rec-yes';
            else if (rec === 'No')  recPillClass += ' rec-no';
            else                    recPillClass += ' rec-none';

            let statusPillClass = 'status-pill';
            let decisionLabel;
            if (row.existingDecision === 'Approve') {
                statusPillClass += ' status-approved';
                decisionLabel    = 'Approved';
            } else if (row.existingDecision === 'Decline') {
                statusPillClass += ' status-declined';
                decisionLabel    = 'Declined';
            } else if (row.existingDecision === 'Approved with Resubmission' && !isClearedReturn) {
                statusPillClass += ' status-returned';   // ← NEW pill state
                decisionLabel    = 'Returned to Reviewer';
            } else if (isClearedReturn) {
            statusPillClass += ' status-pending';
            decisionLabel    = 'Back from Reviewer';   // ← NEW distinct label
        }
            else if (isReady) {
                statusPillClass += ' status-pending';
                decisionLabel    = 'Pending Decision';
            } else {
                statusPillClass += ' status-decided';
                decisionLabel    = 'Not Ready';
            }

            return {
                ...row,
                hasDecision,
                isReady,
                trackPillClass,
                recPillClass,
                statusPillClass,
                decisionLabel,
                recommendation: rec || '—'
            };
        });

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
        const reviewId       = event.currentTarget.dataset.reviewId;
        if (!applicationId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: this._siteUrl('approvercontainer', { applicationId, appName, reviewId })
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