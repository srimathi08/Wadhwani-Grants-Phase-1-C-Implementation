/*  NOT USED - Intead of LWC we use Screen FLow */
public with sharing class volody_screenController {
    @AuraEnabled
    public static void createVolodyContract(Map<String, String> contractDetails) {
        try {
            Volody_Contract__c contract = new Volody_Contract__c();
            contract.Contact__c = contractDetails.get('contactId');
           // contract.Account__c = contractDetails.get('accountId'); 
            contract.Email_Address_of_the_Requestor__c = contractDetails.get('requesterEmail');
            contract.Name_of_the_Counterparty__c = contractDetails.get('counterpartyName');
         
            
            insert contract;
        } catch (Exception e) {
            System.debug('Error creating contract: ' + e.getMessage());
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }
}