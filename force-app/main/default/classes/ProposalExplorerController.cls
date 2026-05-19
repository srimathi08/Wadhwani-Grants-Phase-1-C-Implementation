public with sharing class ProposalExplorerController {

    public class ProposalWrapper {

        @AuraEnabled public Id recordId;
        @AuraEnabled public String proposalId;
        @AuraEnabled public String projectTitle;
        @AuraEnabled public String coeName;
        @AuraEnabled public String focusArea;
        @AuraEnabled public Datetime appliedDate;

    }

    @AuraEnabled(cacheable=true)
    public static List<ProposalWrapper> getProposals(
        Id coeId,
        Date fromDate,
        Date toDate,
        String searchKey
    ){

        String query =
        'SELECT Id, Name, Project_Title__c, Primary_Focus_Area__c,' +
        ' Account.Name, AppliedDate ' +
        'FROM IndividualApplication WHERE Id != null';

        if(coeId != null){
            query += ' AND AccountId = :coeId';
        }

        if(fromDate != null){
            query += ' AND AppliedDate >= :fromDate';
        }

        if(toDate != null){
            query += ' AND AppliedDate <= :toDate';
        }

        if(String.isNotBlank(searchKey)){
            query += ' AND (Name LIKE \'%' + searchKey + '%\' ' +
                     'OR Project_Title__c LIKE \'%' + searchKey + '%\')';
        }

        query += ' ORDER BY AppliedDate DESC LIMIT 200';

        List<IndividualApplication> records = Database.query(query);

        List<ProposalWrapper> result = new List<ProposalWrapper>();

        for(IndividualApplication r : records){

            ProposalWrapper w = new ProposalWrapper();

            w.recordId = r.Id;
            w.proposalId = r.Name;
            w.projectTitle = r.Project_Title__c;
            w.focusArea = r.Primary_Focus_Area__c;
            w.appliedDate = r.AppliedDate;

            if(r.Account != null){
                w.coeName = r.Account.Name;
            }

            result.add(w);

        }

        return result;
    }



    // ----------------------------------------------------
    // GET ONLY COE ACCOUNTS (Accounts that have proposals)
    // ----------------------------------------------------

    @AuraEnabled(cacheable=true)
    public static List<Account> getCOEs(){

        return [
            SELECT Id, Name
            FROM Account
            WHERE Id IN (
                SELECT AccountId
                FROM IndividualApplication
                WHERE AccountId != NULL
            )
            ORDER BY Name
        ];
    }

}