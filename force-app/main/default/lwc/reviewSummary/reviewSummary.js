import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getValidatedProposals from '@salesforce/apex/WCFProposalListController.getValidatedProposals';
import getReviewStatusMap    from '@salesforce/apex/WCFProposalListController.getReviewStatusMap';

export default class ReviewSummary extends NavigationMixin(LightningElement) {
    @track total      = 0;
    @track reviewed   = 0;
    @track inProgress = 0;
    @track notStarted = 0;
    @track flagged    = 0;   // NEW
    @track error      = null;

    _proposals        = [];
    _reviewMap        = null;
    _proposalsLoaded  = false;
    _mapLoaded        = false;

    @wire(getValidatedProposals)
    wiredProposals({ data, error }) {
        if (data) {
            this._proposals      = data;
            this._proposalsLoaded = true;
            this._computeCounts();
        } else if (error) {
            this.error = error;
            console.error('ReviewSummary - proposals error:', error);
        }
    }

    @wire(getReviewStatusMap)
    wiredReviewMap({ data, error }) {
        if (data) {
            this._reviewMap = data;
            this._mapLoaded = true;
            this._computeCounts();
        } else if (error) {
            this.error = error;
            console.error('ReviewSummary - reviewMap error:', error);
        }
    }

    _computeCounts() {
        if (!this._proposalsLoaded || !this._mapLoaded) return;

        const map = this._reviewMap || {};
        let reviewed = 0, inProgress = 0, notStarted = 0, flagged = 0;

        for (const p of this._proposals) {
            const info = map[p.Id] || {};

            // Count flagged separately (a flagged proposal can also be not-started from reviewer side)
            if (info.isFlagged) {
                flagged++;
            }

            if (info.isSubmitted || info.status === 'Review Submitted') {
                reviewed++;
            } else if (info.status === 'In Progress') {
                inProgress++;
            } else {
                notStarted++;
            }
        }

        this.total      = this._proposals.length;
        this.reviewed   = reviewed;
        this.inProgress = inProgress;
        this.notStarted = notStarted;
        this.flagged    = flagged;
    }

    navigate(filter) {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/reviewersite/s/wcf-reviewer-application-list?reviewFilter=${filter}`
            }
        });
    }

    handleTotalClick()      { this.navigate('all');      }
    handleReviewedClick()   { this.navigate('reviewed'); }
    handleInProgressClick() { this.navigate('inProgress'); }
    handleNotStartedClick() { this.navigate('notStarted'); }
    handleFlaggedClick()    { this.navigate('flagged');  }  // NEW
}