import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// ── Dashboard / URL filter token → readable label ────────────────
// Matches the tile labels in wcfApplicationList.
const FILTER_LABELS = {
    validate          : 'To Validate',
    resume            : 'In Progress',
    resubmit          : 'Revalidate',
    returnedByReviewer: 'Returned by Reviewer',
    awaiting          : 'Awaiting Applicant',
    validated         : 'Validated',
};

export default class WcfValidatorContainer extends NavigationMixin(LightningElement) {

    @track showValidator     = false;
    @track currentRecordId   = null;
    @track currentRecordName = '';
    @track showPreview       = true;
    @track statusFilter      = null;  // null = show all, array = filtered from dashboard
    @api autoOpenRecordId    = null;
    @api autoOpenRecordName  = null;
    @track leftCollapsed     = false;
    @track rightCollapsed    = false;

    // ── Drag state ───────────────────────────────────────────────
    _dragging   = false;
    _startX     = 0;
    _startWidth = 0;
    _boundMove  = null;
    _boundUp    = null;

    // ── Read URL query param set by dashboard navigation ─────────
    @wire(CurrentPageReference)
    handlePageRef(pageRef) {
        if (pageRef?.state?.statusFilter) {
            const token = pageRef.state.statusFilter.trim();
            this.statusFilter = [token];
        } else {
            this.statusFilter = null;
        }

        // Auto-open split-pane when coming from dashboard preview click
        const rid   = pageRef?.state?.recordId;
        const rname = pageRef?.state?.recordName;
        if (rid) {
            this.currentRecordId   = rid;
            this.currentRecordName = rname || rid;
            this.showValidator     = true;
        }
    }

    // ── Computed properties for filter banner ────────────────────
    get hasStatusFilter() {
        return this.statusFilter && this.statusFilter.length > 0;
    }

    // FIX: was the raw token ("resume"); now the readable tile label
    get activeFilterLabel() {
        return this.statusFilter
            ? this.statusFilter.map(t => FILTER_LABELS[t] || t).join(', ')
            : '';
    }

    clearFilter() {
        this.statusFilter = null;
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'ValidatorPortal__c' },
            state: {}
        });
    }

    // ── Lifecycle ────────────────────────────────────────────────
    connectedCallback() {
        this._boundMove = this._onMouseMove.bind(this);
        this._boundUp   = this._onMouseUp.bind(this);
        if (this.autoOpenRecordId) {
            this.currentRecordId   = this.autoOpenRecordId;
            this.currentRecordName = this.autoOpenRecordName || this.autoOpenRecordId;
            this.showValidator     = true;
        }
    }

    renderedCallback() {
        const divider = this.template.querySelector('[data-id="divider"]');
        if (divider && !divider._wcfBound) {
            divider._wcfBound = true;
            divider.addEventListener('mousedown', this._onMouseDown.bind(this));
        }
    }

    disconnectedCallback() {
        // Safety: never leave document listeners / body styles behind
        this._onMouseUp();
    }

    // ── Drag handlers ────────────────────────────────────────────
    _onMouseDown(e) {
        this._dragging   = true;
        this._startX     = e.clientX;
        const left       = this.template.querySelector('[data-id="leftPanel"]');
        this._startWidth = left.offsetWidth;
        document.addEventListener('mousemove', this._boundMove);
        document.addEventListener('mouseup',   this._boundUp);
        document.body.style.cursor     = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }

    _onMouseMove(e) {
        if (!this._dragging) return;
        const shell = this.template.querySelector('[data-id="splitBody"]');
        const left  = this.template.querySelector('[data-id="leftPanel"]');
        if (!shell || !left) return;
        const delta = e.clientX - this._startX;
        const total = shell.offsetWidth - 6;
        const newW  = Math.min(
            Math.max(this._startWidth + delta, 280),
            total - 240
        );
        left.style.width      = newW + 'px';
        left.style.maxWidth   = 'none';
        left.style.flexShrink = '0';
    }

    _onMouseUp() {
        this._dragging = false;
        if (this._boundMove) document.removeEventListener('mousemove', this._boundMove);
        if (this._boundUp)   document.removeEventListener('mouseup',   this._boundUp);
        document.body.style.cursor     = '';
        document.body.style.userSelect = '';
    }

    // ── Event handlers ───────────────────────────────────────────
    handleValidateClick(evt) {
        this.currentRecordId   = evt.detail.recordId;
        this.currentRecordName = evt.detail.recordName || evt.detail.recordId;
        this.showValidator     = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    handleBack() {
        this.showValidator     = false;
        this.currentRecordId   = null;
        this.currentRecordName = '';
    }

    handleSealComplete(evt) {
        this.dispatchEvent(new ShowToastEvent({
            title  : 'Validator Record Validated',
            message: 'Decision: ' + (evt.detail.decision || '') + ' — record saved successfully.',
            variant: 'success',
        }));
        this.showValidator   = false;
        this.currentRecordId = null;
    }

    // ── Toggle handlers (never both collapsed) ───────────────────
    handleToggleLeftPane() {
        if (this.leftCollapsed) {
            this.leftCollapsed = false;
            return;
        }
        if (this.rightCollapsed) return;
        this.leftCollapsed = true;
    }

    handleToggleRightPane() {
        if (this.rightCollapsed) {
            this.rightCollapsed = false;
            return;
        }
        if (this.leftCollapsed) return;
        this.rightCollapsed = true;
    }

    handleBackToProposals() {
        this.dispatchEvent(new CustomEvent('backtolist'));
    }

    // ── Template getters ─────────────────────────────────────────
    get isListMode()  { return !this.showValidator; }
    get isLeftOpen()  { return !this.leftCollapsed; }
    get isRightOpen() { return !this.rightCollapsed; }

    get leftPaneClass() {
        return this.leftCollapsed ? 'wcf-left-panel wcf-pane-collapsed' : 'wcf-left-panel';
    }
    get rightPaneClass() {
        return this.rightCollapsed ? 'wcf-right-panel wcf-pane-collapsed' : 'wcf-right-panel';
    }
    get leftToggleIcon() {
        return this.leftCollapsed ? 'utility:chevronright' : 'utility:chevronleft';
    }
    get rightToggleIcon() {
        return this.rightCollapsed ? 'utility:chevronleft' : 'utility:chevronright';
    }
    get leftToggleTitle() {
        return this.leftCollapsed ? 'Show application preview' : 'Hide application preview';
    }
    get rightToggleTitle() {
        return this.rightCollapsed ? 'Show validator form' : 'Hide validator form';
    }
    get showResizer() {
        return !this.leftCollapsed && !this.rightCollapsed;
    }
}