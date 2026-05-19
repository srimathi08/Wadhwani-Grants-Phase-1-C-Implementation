import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

import getProposals from '@salesforce/apex/ProposalExplorerController.getProposals';
import getCOEs from '@salesforce/apex/ProposalExplorerController.getCOEs';

export default class ProposalExplorer extends NavigationMixin(LightningElement) {

proposals = [];
coeOptions = [];

selectedCOE = null;
fromDate = null;
toDate = null;
searchKey = '';

isLoading = false;
searchTimeout;

columns = [

{
label: 'Proposal ID',
fieldName: 'recordUrl',
type: 'url',
typeAttributes: {
label: { fieldName: 'proposalId' },
target: '_self'
}
},

{ label: 'Project Title', fieldName: 'projectTitle', sortable:true },

{ label: 'COE', fieldName: 'coeName', sortable:true },

{ label: 'Focus Area', fieldName: 'focusArea' },

{ label: 'Applied Date', fieldName: 'appliedDate', type:'date', sortable:true }

];


connectedCallback(){
this.loadCOEs();
this.loadProposals();
}

get proposalCount(){
return this.proposals.length;
}


loadCOEs(){

getCOEs()
.then(result => {

let options = [];

options.push({label:'All COEs', value:null});

result.forEach(acc => {
options.push({
label:acc.Name,
value:acc.Id
});
});

this.coeOptions = options;

});
}


loadProposals(){

this.isLoading = true;

getProposals({
coeId:this.selectedCOE,
fromDate:this.fromDate,
toDate:this.toDate,
searchKey:this.searchKey
})
.then(result => {

this.proposals = result.map(row => {

return {
...row,
recordUrl: '/' + row.recordId
};

});

this.isLoading = false;

})
.catch(error=>{
console.error(error);
this.isLoading = false;
});

}


handleCOEChange(event){
this.selectedCOE = event.detail.value;
this.loadProposals();
}

handleFromDate(event){
this.fromDate = event.target.value;
this.loadProposals();
}

handleToDate(event){
this.toDate = event.target.value;
this.loadProposals();
}

handleSearch(event){

clearTimeout(this.searchTimeout);

this.searchTimeout = setTimeout(()=>{

this.searchKey = event.target.value;
this.loadProposals();

},500);

}

}