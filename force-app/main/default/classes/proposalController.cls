public with sharing class proposalController {

    // Wrapper to return User's Institution (Account) info to LWC
    public class UserInstitutionWrapper {
        @AuraEnabled public String accountId;
        @AuraEnabled public String accountName;
    }

    /**
     * Fetches logged-in user's related Account (Institution)
     */
    @AuraEnabled(cacheable=true)
    public static UserInstitutionWrapper getLoggedInUserDetails() {
        User u = [
            SELECT Id, AccountId, Account.Name
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        UserInstitutionWrapper wrap = new UserInstitutionWrapper();
        if (u.AccountId != null) {
            wrap.accountId = u.AccountId;
            wrap.accountName = u.Account.Name;
        }
        return wrap;
    }

    /**
     * Creates an IndividualApplication record with optional file linking
     */
    @AuraEnabled(cacheable=false)
    public static Id createProposal(Map<String, Object> data) {
        if (data == null) {
            throw new AuraHandledException('No data received');
        }
        if (!data.containsKey('AccountId')) {
            throw new AuraHandledException('Missing AccountId (Account Lookup)');
        }

        // Create proposal record
        IndividualApplication proposal = new IndividualApplication();

         // --- Set Status to 'Submitted' ---
        proposal.Status = 'Submitted';

      
           // Set Record Type
        proposal.RecordTypeId = '012F6000000UQbGIAW';

        // --- Set Type to 'COE Proposal' ---
        proposal.ApplicationType = 'COE Proposal';

        // --- Set Category to 'Grant Application' ---
         proposal.Category ='Grant Application';

         proposal.IsSubmitted= true;

        // --- Mandatory Field ---
       // proposal.Institution_Name__c = (String) data.get('Institution_Name__c');
        proposal.AccountId = (String) data.get('AccountId');

        // --- Optional Picklist Fields ---
        if (data.containsKey('Primary_Focus_Area__c')) {
            proposal.Primary_Focus_Area__c = (String) data.get('Primary_Focus_Area__c');
        }
        if (data.containsKey('Sub_Focus_Area__c')) {
            proposal.Sub_Focus_Area__c = (String) data.get('Sub_Focus_Area__c');
        }
        if (data.containsKey('Focus_Area_2__c')) {
            proposal.Focus_Area_2__c = (String) data.get('Focus_Area_2__c');
        }
        if (data.containsKey('Sub_Focus_Area_2__c')) {
            proposal.Sub_Focus_Area_2__c = (String) data.get('Sub_Focus_Area_2__c');
        }
        if (data.containsKey('Focus_Area_3__c')) {
            proposal.Focus_Area_3__c = (String) data.get('Focus_Area_3__c');
        }
        if (data.containsKey('Sub_Focus_Area_3__c')) {
            proposal.Sub_Focus_Area_3__c = (String) data.get('Sub_Focus_Area_3__c');
        }

        // Add more fields if needed here
        // if (data.containsKey('Some_Other_Field__c')) { ... }

// --- Link to active COE-type Funding Opportunity ---
List<FundingOpportunity> fundingList = [
    SELECT Id
    FROM FundingOpportunity 
    WHERE FO_Type__c = 'COE'
    AND Status = 'Active'
    LIMIT 1
];

if (!fundingList.isEmpty()) {
    proposal.FundingOpportunityId = fundingList[0].Id;
}


        insert proposal;

        // --- Handle File Attachments ---
        if (data.containsKey('documentIds')) {
            // Safe cast as List<Object> first
            List<Object> docIdObjects = (List<Object>) data.get('documentIds');
            List<String> docIds = new List<String>();

            for (Object docObj : docIdObjects) {
                if (docObj != null) {
                    docIds.add((String) docObj);
                }
            }

            if (!docIds.isEmpty()) {
                List<ContentDocumentLink> links = new List<ContentDocumentLink>();
                for (String docId : docIds) {
                    links.add(new ContentDocumentLink(
                        ContentDocumentId = docId,
                        LinkedEntityId = proposal.Id,
                        ShareType = 'V',
                        Visibility = 'AllUsers'
                    ));
                }
                insert links;
            }
        }

        return proposal.Id;
    }





}