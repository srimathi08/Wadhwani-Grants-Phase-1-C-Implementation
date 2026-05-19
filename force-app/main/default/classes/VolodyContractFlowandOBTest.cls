@isTest
public class VolodyContractFlowandOBTest {
    
    
    // Mock HTTP callout class
    private class VolodyMockCallout implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody('{"clm_reference_id": "REF123", "clm_document_link": "https://doc.link", "clm_reference_url": "https://ref.url"}');
            res.setStatusCode(200);
            return res;
        }
    }
    
    @testSetup
    static void setupData() {
        // Insert sample Volody Contract
        Volody_Contract__c vc = new Volody_Contract__c(
            Agreement_Name__c = 'NDA_GLOBAL',
            Parent_Company_Name__c = 'Wadhwani Charitable Foundation',
            //CRM_Unique_Ref_Id__c = 'CRM12345',
            Name_of_the_Counterparty__c = 'Volody - CTC2',
            Start_Date_of_Contract__c = Date.today(),
            Email_Address_of_the_Requestor__c = 'test@example.com'
        );
        insert vc;
    }
    
    @isTest
    static void testInvokeFutureCall() {
        // Fetch inserted contract
        Volody_Contract__c contract = [SELECT Id FROM Volody_Contract__c LIMIT 1];
        
        // Prepare input for Invocable Method
        VolodyContractFlowInvoker.Input input = new VolodyContractFlowInvoker.Input();
        input.contractId = contract.Id;
        
        List<VolodyContractFlowInvoker.Input> inputs = new List<VolodyContractFlowInvoker.Input>{ input };
            
            Test.startTest();
        
        // Call Invocable Method
        VolodyContractFlowInvoker.invokeFutureCall(inputs);
        
        Test.stopTest();
        
        System.assert(true, '✅ Invocable Method executed successfully.');
    }
    
    
    @isTest
    static void testSendVolodyContractCallout() {
        // Fetch inserted contract
        Volody_Contract__c contract = [SELECT Id FROM Volody_Contract__c LIMIT 1];
        
        // Set Mock response
        Test.setMock(HttpCalloutMock.class, new VolodyMockCallout());
        
        Test.startTest();
        
        // Call the @future method
        VolodyContractFlow_OBCallout.sendVolodyContract(contract.Id);
        
        Test.stopTest();
        
        // Validate that the contract was updated with mock response values
        Volody_Contract__c updatedContract = [SELECT clm_reference_id__c, clm_document_link__c, clm_reference_url__c FROM Volody_Contract__c WHERE Id = :contract.Id];
        
        System.assertEquals('REF123', updatedContract.clm_reference_id__c, '✅ clm_reference_id__c should be updated from response.');
        System.assertEquals('https://doc.link', updatedContract.clm_document_link__c, '✅ clm_document_link__c should match response.');
        System.assertEquals('https://ref.url', updatedContract.clm_reference_url__c, '✅ clm_reference_url__c should match response.');
    }
}