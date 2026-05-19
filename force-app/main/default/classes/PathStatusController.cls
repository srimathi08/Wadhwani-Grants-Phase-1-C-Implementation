//Commented for checking

/*public with sharing class PathStatusController {
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getStatuses() {
        Map<String, Object> result = new Map<String, Object>();

        // Initialize default values in case no data is found
        result.put('accountStage', ''); // Default empty value for account stage
        result.put('accountSubStage', ''); // Default empty value for account sub-stage
        result.put('coeStatus', ''); // Default empty value for COE Proposal status
        result.put('winStatus', ''); // Default empty value for WIN Project Proposal status
        result.put('kanbanUrl', ''); // Default empty URL
        result.put('reviewStatus', ''); // Default empty value for Application Review status

        try {
            // Query for the current user's contact
            Contact userContact = [SELECT AccountId FROM Contact WHERE Id = :UserInfo.getUserId() LIMIT 1];
            System.debug('User Contact: ' + userContact); // Debug statement for userContact

            if (userContact != null && userContact.AccountId != null) {
                Id accountId = userContact.AccountId;
                System.debug('Account ID: ' + accountId); // Debug statement for accountId

                // Account (Institution Register)
                Account acc = [SELECT Stage__c, Sub_Stage__c FROM Account WHERE Id = :accountId LIMIT 1];
                System.debug('Account Data: ' + acc); // Debug statement for Account data

                result.put('accountStage', acc.Stage__c);
                result.put('accountSubStage', acc.Sub_Stage__c);

                // COE Proposal
                List<IndividualApplication> coeApps = [
                    SELECT Id, Status FROM IndividualApplication
                    WHERE Institution_Name__c = :accountId AND ApplicationType = 'COE Proposal' LIMIT 1];

                if (!coeApps.isEmpty()) {
                    System.debug('COE Proposal Status: ' + coeApps[0].Status); // Debug statement for COE status
                    result.put('coeStatus', coeApps[0].Status);
                } else {
                    System.debug('No COE Proposal found for account ID: ' + accountId); // Debug if no COE proposal found
                }

                // WIN Project Proposal
                List<IndividualApplication> winApps = [
                    SELECT Id, Status FROM IndividualApplication 
                    WHERE Institution_Name__c = :accountId AND ApplicationType = 'WIN Project Proposal' LIMIT 1];
                if (!winApps.isEmpty()) {
                    System.debug('WIN Project Proposal Status: ' + winApps[0].Status); // Debug statement for WIN status
                    result.put('winStatus', winApps[0].Status);
                } else {
                    System.debug('No WIN Project Proposal found for account ID: ' + accountId); // Debug if no WIN proposal found
                }

                // Kanban List View URL
                String kanbanUrl = '/lightning/o/IndividualApplication__c/list?filterName=00BXXXXXXXXXXXX';
                System.debug('Kanban URL: ' + kanbanUrl); // Debug statement for kanban URL
                result.put('kanbanUrl', kanbanUrl);

                // Application Review
                List<ApplicationReview> reviews = [SELECT Status FROM ApplicationReview 
                                                    WHERE Institution_Name__c = :accountId LIMIT 1 ];

                if (!reviews.isEmpty()) {
                    System.debug('Application Review Status: ' + reviews[0].Status); // Debug statement for Application Review status
                    result.put('reviewStatus', reviews[0].Status);
                } else {
                    System.debug('No Application Review found for account ID: ' + accountId); // Debug if no application review found
                }
            } else {
                System.debug('User does not have an associated Contact or Account.'); // Debug if no Contact or Account found
            }
        } catch (QueryException e) {
            // Log the exception but don't stop execution, as we want to return default data
            System.debug('Error retrieving contact data: ' + e.getMessage());
        }

        // Return the result even if no contact or related data was found
        System.debug('Returning Result: ' + result); // Debug statement for final result
        System.debug('Final result from Apex: ' + JSON.serialize(result));
        return result;
    }
}*/



//Working but showing in LWC
public with sharing class PathStatusController {

    @AuraEnabled(cacheable=true)
    public static Map<String, String> getStatuses(Id overrideUserId) {
        Map<String, String> result = new Map<String, String>();

        // Use passed-in UserId for testing, otherwise default to logged-in user
        Id userId = overrideUserId != null ? overrideUserId : UserInfo.getUserId();
        System.debug('Running getStatuses as UserId: ' + userId);

        // Fetch ContactId for the user
        User usr = [SELECT ContactId FROM User WHERE Id = :userId LIMIT 1];
        System.debug('User.ContactId: ' + usr.ContactId);

        if (usr.ContactId == null) {
            System.debug('No ContactId found for this user.');
            return result;
        }

        // Fetch AccountId from related Contact
        Contact con = [SELECT Id, AccountId FROM Contact WHERE Id = :usr.ContactId LIMIT 1];
        System.debug('Contact.AccountId: ' + con.AccountId);

        if (con.AccountId == null) {
            System.debug('No AccountId found for Contact.');
            return result;
        }

        Id accountId = con.AccountId;

        // Get Account Sub Stage
        Account acc = [SELECT Sub_Stage__c FROM Account WHERE Id = :accountId LIMIT 1];
        System.debug('Account.Sub_Stage__c: ' + acc.Sub_Stage__c);
        result.put('accountSubStage', acc.Sub_Stage__c);

        // Get COE Proposal status
        List<IndividualApplication> coeApps = [
            SELECT Status 
    FROM IndividualApplication 
    WHERE ApplicationType = 'COE Proposal' 
    AND AccountId = :accountId
    ORDER BY LastModifiedDate DESC 
    LIMIT 1
        ];
        if (!coeApps.isEmpty()) {
            System.debug('COE Proposal Status: ' + coeApps[0].Status);
            result.put('coeStatus', coeApps[0].Status);
        } else {
            System.debug('No COE Proposal applications found.');
            result.put('coeStatus', ''); // <-- Always send the key
        }
        

        // Get WIN Project Proposal status
        List<IndividualApplication> winApps = [
            SELECT Status 
            FROM IndividualApplication 
            WHERE ApplicationType = 'WIN Project Proposal' AND Institution_Name__c = :accountId 
            ORDER BY LastModifiedDate DESC 
            LIMIT 1
        ];
        if (!winApps.isEmpty()) {
            System.debug('WIN Project Proposal Status: ' + winApps[0].Status);
            result.put('winStatus', winApps[0].Status);
        } else {
            System.debug('No WIN Project Proposal applications found.');
        }

        // Get Application Review status
        List<ApplicationReview> reviews = [
            SELECT Status 
            FROM ApplicationReview 
            WHERE Institution_Name__c = :accountId 
            ORDER BY LastModifiedDate DESC 
            LIMIT 1
        ];
        if (!reviews.isEmpty()) {
            System.debug('Application Review Status: ' + reviews[0].Status);
            result.put('reviewStatus', reviews[0].Status);
        } else {
            System.debug('No Application Reviews found.');
        }

        // Add community Kanban URL
        String communityBaseUrl = 'https://wadhwanifoundation--wfdev.sandbox.my.site.com/WadhwaniOrg/s/individualapplication/IndividualApplication/Default';
        System.debug('Kanban URL: ' + communityBaseUrl);
        result.put('kanbanUrl', communityBaseUrl);

        // Final debug of full map
        System.debug('Final Status Map: ' + result);

        return result;
    }
}




//Checking 2 time
/*public with sharing class PathStatusController {
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getStatuses() {
        Contact userContact = [SELECT AccountId FROM Contact WHERE Id = :UserInfo.getUserId() LIMIT 1];
        Id accountId = userContact.AccountId;

        Map<String, Object> result = new Map<String, Object>();

        // Account (Institution Register)
        Account acc = [SELECT Stage__c, Sub_Stage__c FROM Account WHERE Id = :accountId LIMIT 1];
        result.put('accountStage', acc.Stage__c);
        result.put('accountSubStage', acc.Sub_Stage__c);

        // COE Proposal
        List<IndividualApplication> coeApps = [
            SELECT Id, Status FROM IndividualApplication
            WHERE Institution_Name__c = :accountId AND ApplicationType = 'COE Proposal' LIMIT 1];
                                                         
        if (!coeApps.isEmpty()) {
            result.put('coeStatus', coeApps[0].Status);
        }

        // WIN Project Proposal
        List<IndividualApplication> winApps = [
           SELECT Id, Status FROM IndividualApplication 
            WHERE Institution_Name__c = :accountId AND ApplicationType = 'WIN Project Proposal' LIMIT 1];
        if (!winApps.isEmpty()) {
            result.put('winStatus', winApps[0].Status);
        }

        // Provide your actual Kanban List View ID
        String kanbanUrl = '/lightning/o/IndividualApplication__c/list?filterName=00BXXXXXXXXXXXX'; 
        result.put('kanbanUrl', kanbanUrl);

        // Application Review
        List<ApplicationReview> reviews = [SELECT Status FROM ApplicationReview 
                                            WHERE Institution_Name__c = :accountId LIMIT 1 ];
       
        if (!reviews.isEmpty()) {
            result.put('reviewStatus', reviews[0].Status);
        }

        return result;
    }
}*/











/*public with sharing class PathStatusController {
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getStatuses() {
        Id userId = UserInfo.getUserId();
        User u;
        Account userAccount;

        try {
            u = [SELECT Id, ContactId, AccountId, Name FROM User WHERE Id = :userId LIMIT 1];
        } catch (Exception e) {
            System.debug('No user found: ' + userId);
            return new Map<String, String>();
        }

        try {
            userAccount = [SELECT Id, Status__c FROM Account WHERE Id =: u.AccountId LIMIT 1];
            System.debug('Acc>' + userAccount);
        } catch (Exception e) {
            System.debug('No account found for user: ' + userId);
            return new Map<String, String>();
        }

        Map<String, String> statusMap = new Map<String, String>();

        if (userAccount != null) {
            System.debug('Institution Register Status: ' + userAccount.Status__c);
            statusMap.put('InstitutionRegister', userAccount.Status__c);
        }

        try {
            IndividualApplication coeProposal = [SELECT Id, Status FROM IndividualApplication
                                                 WHERE Institution_Name__c = :userAccount.Id AND ApplicationType = 'COE Proposal'
                                                 LIMIT 1]; 
            statusMap.put('COEProposal', coeProposal != null ? coeProposal.Status : 'Invited');
            System.debug('COE Proposal Status: ' + coeProposal.Status);
        } catch (Exception e) {
            System.debug('No COE Proposal found');
            statusMap.put('COEProposal', 'Invited');
        }

        try {
            IndividualApplication winApplication = [SELECT Id, Status FROM IndividualApplication 
                                                    WHERE Institution_Name__c = :userAccount.Id AND ApplicationType = 'WIN Project Proposal' 
                                                    LIMIT 1];
            statusMap.put('WinApplication', winApplication != null ? winApplication.Status : 'Invited');
            System.debug('WIN Application Status: ' + winApplication.Status);
        } catch (Exception e) {
            System.debug('No WIN Application found');
            statusMap.put('WinApplication', 'Invited');
        }

        try {
            ApplicationReview review = [SELECT Status FROM ApplicationReview WHERE Institution_Name__c = :userAccount.Id LIMIT 1];
            statusMap.put('ApplicationReview', review != null ? review.Status : 'Not Started');
            System.debug('Application Review Status: ' + review.Status);
        } catch (Exception e) {
            System.debug('No Application Review found');
            statusMap.put('ApplicationReview', 'Not Started');
        }

        System.debug('Final Status Map: ' + statusMap);
        return statusMap;
    }
} */




















/*public with sharing class PathStatusController {
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getStatuses() {
        Id userId = UserInfo.getUserId();
        User u;
        Account userAccount;
        
        try {
            u = [SELECT Id, ContactId, AccountId, Name FROM User WHERE Id = :userId LIMIT 1];
        } catch (Exception e) {
            System.debug('No user found: ' + userId);
            return new Map<String, String>();
        }

        try {
            userAccount = [SELECT Id, Status__c FROM Account WHERE Id =: u.AccountId LIMIT 1];
            system.debug('Acc>' + userAccount);
        } catch (Exception e) {
            System.debug('No account found for user: ' + userId);
            return new Map<String, String>();
        }

        Map<String, String> statusMap = new Map<String, String>();

        if (userAccount != null) {
            System.debug('Institution Register Status: ' + userAccount.Status__c);
            statusMap.put('InstitutionRegister', userAccount.Status__c);
        }

        try {
            IndividualApplication coeProposal = [SELECT Id, Status FROM IndividualApplication
                                                 WHERE Institution_Name__c = :userAccount.Id AND ApplicationType = 'COE Proposal'
                                                 LIMIT 1]; 
            statusMap.put('COEProposal', coeProposal != null ? coeProposal.Status : 'Invited');
            System.debug('COE Proposal Status: ' + coeProposal.Status);
        } catch (Exception e) {
            System.debug('No COE Proposal found');
            statusMap.put('COEProposal', 'Invited');
        }

        try {
            IndividualApplication winApplication = [SELECT Id, Status, ApplicationType,Institution_Name__c FROM IndividualApplication 
                                                    WHERE Institution_Name__c = :userAccount.Id AND ApplicationType = 'WIN Project Proposal' 
                                                    LIMIT 1];
            statusMap.put('WinApplication', winApplication != null ? winApplication.Status : 'Invited');
            System.debug('WIN Application Status: ' + winApplication.Status);
        } catch (Exception e) {
            System.debug('No WIN Application found');
            statusMap.put('WinApplication', 'Invited');
        }

        try {
            ApplicationReview review = [SELECT Status,Institution_Name__c FROM ApplicationReview WHERE Institution_Name__c = :userAccount.Id LIMIT 1];
            statusMap.put('ApplicationReview', review != null ? review.Status : 'Not Started');
            System.debug('Application Review Status: ' + review.Status);
        } catch (Exception e) {
            System.debug('No Application Review found');
            statusMap.put('ApplicationReview', 'Not Started');
        }

        System.debug('Final Status Map: ' + statusMap);
        return statusMap;
    }
}*/