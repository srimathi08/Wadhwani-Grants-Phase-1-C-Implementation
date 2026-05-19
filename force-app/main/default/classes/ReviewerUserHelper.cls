public without sharing class ReviewerUserHelper {
    
    /**
     * Check if the current user is registered as a reviewer
     * @return Boolean indicating registration status
     */
    @AuraEnabled(cacheable=true)
    public static Boolean isReviewerRegistered() {
        try {
            User currentUser = [
                SELECT Contact.Account.Reviewer_Registered__c 
                FROM User 
                WHERE Id = :UserInfo.getUserId() 
                LIMIT 1
            ];
            
            return currentUser.Contact.Account.Reviewer_Registered__c;
        } catch (Exception e) {
            System.debug('Error fetching reviewer registration status: ' + e.getMessage());
            return false;
        }
    }
    
    /**
     * Get the NDA status for the current user
     * @return NdaInfo object containing the NDA status
     */
    @AuraEnabled(cacheable=true)
    public static NdaInfo getNdaStatus() {
        NdaInfo result = new NdaInfo();
        
        try {
            User currentUser = [
                SELECT AccountId, Contact.AccountId 
                FROM User 
                WHERE Id = :UserInfo.getUserId() 
                LIMIT 1
            ];
            
            if (currentUser.Contact.AccountId != null) {
                System.debug('Account ID: ' + currentUser.Contact.AccountId);
                
                List<Volody_Contract__c> ndaContracts = [
                    SELECT clm_status__c
                    FROM Volody_Contract__c
                    WHERE Account__c = :currentUser.Contact.AccountId
                    ORDER BY CreatedDate DESC
                    LIMIT 1
                ];
                
                if (!ndaContracts.isEmpty()) {
                    result.ndaStatus = ndaContracts[0].clm_status__c;
                } else {
                    result.ndaStatus = 'Yet to Start';
                }
            } else {
                result.ndaStatus = 'Yet to Start';
            }
        } catch (Exception e) {
            System.debug('Error fetching NDA status: ' + e.getMessage());
            result.ndaStatus = 'Error';
        }
        
        return result;
    }
    
    /**
     * Wrapper class for NDA information
     */
    public class NdaInfo {
        @AuraEnabled
        public String ndaStatus { get; set; }
    }
}