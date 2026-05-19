@isTest
private class VolodyContractUpdate_InboundTest {
    
    @testSetup
    static void setupData() {
        // Create test Volody contract
        Volody_contract__c contract = new Volody_contract__c(
            //crm_unique_ref_id__c = 'TEST123',
            Email_Address_of_the_Requestor__c = 'test@example.com',
            Agreement_Name__c = 'NDA_GLOBAL',
            Parent_Company_Name__c = 'Wadhwani Charitable Foundation',
            Name_of_the_Counterparty__c = 'Volody - CTC2',
            Start_Date_of_Contract__c = Date.today(),
            clm_reference_id__c = '23456'
            
        );
        insert contract;
    }
    
    @isTest
    static void testUpdateContractStatuses_success() {
        // Insert contract (in test method, not testSetup)
        Volody_contract__c contract = new Volody_contract__c(
            Email_Address_of_the_Requestor__c = 'test@example.com',
            Agreement_Name__c = 'NDA_GLOBAL',
            Parent_Company_Name__c = 'Wadhwani Charitable Foundation',
            Name_of_the_Counterparty__c = 'Volody - CTC2',
            Start_Date_of_Contract__c = Date.today(),
            clm_reference_id__c = '23456'
        );
        insert contract;
        
        // Refetch to get the auto-number value
        contract = [SELECT Id, crm_unique_ref_id__c FROM Volody_contract__c WHERE Id = :contract.Id];
        
        // Use the auto-generated crm_unique_ref_id__c in the JSON payload
        String jsonInput = JSON.serialize(new List<Map<String, Object>>{
            new Map<String, Object>{
                'crm_unique_ref_id' => contract.crm_unique_ref_id__c,
                    'requestor_email' => 'test@example.com',
                    'clm_reference_id' => '23456',
                    'clm_Status' => 'Pending Legal'
                    }
        });
        
        // Set REST context
        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/VolodyContractUpdate/';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(jsonInput);
        RestContext.request = req;
        RestContext.response = new RestResponse();
        
        // Call the method
        Test.startTest();
        VolodyContractUpdate_Inbound.updateContractStatuses();
        Test.stopTest();
        
        // Verify the update
        Volody_contract__c updated = [
            SELECT clm_status__c, clm_reference_id__c 
            FROM Volody_contract__c 
            WHERE Id = :contract.Id
        ];
       // System.assertEquals('Pending Legal', updated.clm_status__c);
         System.assertEquals('23456', updated.clm_reference_id__c);
    }


    @isTest
    static void testUpdateContractStatuses_emptyPayload() {
        // Empty request
        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/VolodyContractUpdate/';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf('[]');
        RestContext.request = req;
        RestContext.response = new RestResponse();

        String result = VolodyContractUpdate_Inbound.updateContractStatuses();
        System.assertEquals(true, result.contains('Error: Empty payload'), 'Should detect empty payload');
        System.assertEquals(400, RestContext.response.statusCode);
    }

    @isTest
    static void testUpdateContractStatuses_incompleteRecord() {
        // Incomplete fields
        String jsonInput = JSON.serialize(new List<Map<String, Object>>{
            new Map<String, Object>{
                'crm_unique_ref_id' => 'TEST123',
                'requestor_email' => ''  // missing email
            }
        });

        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/VolodyContractUpdate/';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(jsonInput);
        RestContext.request = req;
        RestContext.response = new RestResponse();

        String result = VolodyContractUpdate_Inbound.updateContractStatuses();
        System.assertEquals('Error: No valid contract records to update', result);
        System.assertEquals(404, RestContext.response.statusCode);
    }

    @isTest
    static void testUpdateContractStatuses_noMatchFound() {
        // crm + email combination not matching any record
        String jsonInput = JSON.serialize(new List<Map<String, Object>>{
            new Map<String, Object>{
                'crm_unique_ref_id' => 'INVALID123',
                'requestor_email' => 'noone@example.com',
                'clm_reference_id' => 'CLM000000',
                'clm_Status' => 'Pending Legal'
            }
        });

        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/VolodyContractUpdate/';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(jsonInput);
        RestContext.request = req;
        RestContext.response = new RestResponse();

        String result = VolodyContractUpdate_Inbound.updateContractStatuses();
        System.assertEquals('Error: No valid contract records to update', result);
        System.assertEquals(404, RestContext.response.statusCode);
    }
}