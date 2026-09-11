import { LightningElement, track } from 'lwc';
    import getMyPLOrganizations from '@salesforce/apex/PLOfRecordController.getMyPLOrganizations';

    export default class WcfPLOfRecord extends LightningElement {

        @track plOrgRows = [];

        connectedCallback() {
            this.loadPLOfRecord();
        }

        async loadPLOfRecord() {
            try {
                const orgs = await getMyPLOrganizations();
                this.plOrgRows = (orgs || []).map((o, i) => ({
                    rowNum:    i + 1,
                    orgId:     o.orgId,
                    orgName:   o.orgName,
                    roleLabel: o.isCoPl ? 'Co-PL' : 'PL of Record',
                    roleClass: o.isCoPl ? 'sc-chip sc-chip-wcf' : 'sc-chip sc-chip-wsn'
                }));
            } catch (e) {
                console.error('PL of Record load error:', e);
            }
        }

        get noPLOrgRows() {
            return !this.plOrgRows || this.plOrgRows.length === 0;
        }

        get plOrgCountLabel() {
            const n = this.plOrgRows.length;
            return `${n} organisation${n === 1 ? '' : 's'}`;
        }
    }