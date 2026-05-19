import { LightningElement, wire, track } from 'lwc';
import getFundingAwards from '@salesforce/apex/FundingAwardService.getFundingAwards';

export default class FundingAwardList extends LightningElement {

    @track awards = [];

    @wire(getFundingAwards)
    wiredAwards({ data }) {
        if (data) {
            this.awards = data.map(a => ({
                ...a,
                link: '/' + a.Id
            }));
        }
    }

    navigateToDetail(event) {
        const awardId = event.target.dataset.id;
        window.location.href = '/' + awardId;
    }
}