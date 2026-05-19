import { LightningElement, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getProjects from '@salesforce/apex/CoeProjectController.getProjects';

export default class CoeProjectList extends NavigationMixin(LightningElement) {

    projects = [];
    summary = { total:0, pending:0, win:0, approved:0 };

    @wire(getProjects)
    wired({ data }) {
        if (data) {
            this.projects = data;
            this.summary.total = data.length;
            this.summary.pending = data.filter(p=>p.Status==='Proposal Submitted to COE Admin').length;
            this.summary.win = data.filter(p=>p.Status==='Proposal Submitted to WIN Admin').length;
            this.summary.approved = data.filter(p=>p.Status==='Proposal Approved for Funding').length;
        }
    }

    viewDetails(e) {
        this[NavigationMixin.Navigate]({
            type:'standard__recordPage',
            attributes:{
                recordId:e.target.dataset.id,
                objectApiName:'IndividualApplication',
                actionName:'view'
            }
        });
    }
}