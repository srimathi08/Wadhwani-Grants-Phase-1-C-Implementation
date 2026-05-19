public with sharing class VolodyContractFlow_OBCallout {

    @future(callout=true)
    public static void sendVolodyContract(Id contractId) {
        System.debug(' Future Method Starting Volody callout for record: ' + contractId);

        try {
            Volody_Contract__c vc = [SELECT Id, Agreement_Name__c, Parent_Company_Name__c,CRM_Unique_Ref_Id__c,
                                      Name_of_the_Counterparty__c,Start_Date_of_Contract__c, clm_document_link__c,
                                      Email_Address_of_the_Requestor__c, clm_reference_id__c, clm_reference_Url__c
                                      FROM Volody_Contract__c WHERE Id = :contractId  LIMIT 1];
                       
            //HTTP Request
            HttpRequest req = new HttpRequest();
          //req.setEndpoint('callout:Volody_NC/api/v1/crm_contract');
            req.setEndpoint('https://wfglobal.volody.com/api/v1/crm_contract');// https://test-wadhwani.volody.com/api/v1/crm_contract
            req.setMethod('POST');
            req.setHeader('Authorization', 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczpcL1wvdWF0LWJkby52b2xvZHkuY29tXC9hcGlcL3YxXC9sb2dpbiIsImlhdCI6MTczOTc5MzMzOCwiZXhwIjoxNzM5Nzk2OTM4LCJuYmYiOjE3Mzk3OTMzMzgsImp0aSI6IlZKMVR3OTlaQXFTd1lnUlciLCJzdWIiOjIsInBydiI6IjIzYmQ1Yzg5NDlmNjAwYWRiMzllNzAxYzQwMDg3MmRiN2E1OTc2ZjcifQ.h5eHGzAxZldZDsatc9k2RtETBhqL0rWvkd5XlBZSkg0');
            req.setHeader('Content-Type', 'application/json');            
            req.setTimeout(20000);

            Map<String, Object> payload = new Map<String, Object>{
                'agreement_name' => vc.Agreement_Name__c,
                'parent_company_name' => vc.Parent_Company_Name__c,
                'crm_unqiue_ref_id' => vc.CRM_Unique_Ref_Id__c,
                'counter_party_name' => vc.Name_of_the_Counterparty__c,
                'start_date' => vc.Start_Date_of_Contract__c != null ? String.valueOf(vc.Start_Date_of_Contract__c) : null,
                'req_user_email' => vc.Email_Address_of_the_Requestor__c
            };

            String requestBody = JSON.serialize(payload);
            req.setBody(requestBody);
            System.debug(' Sending request to Volody:\n' + requestBody);

            HttpResponse res = new Http().send(req);
            System.debug(' Volody response status: ' + res.getStatusCode());
            System.debug(' Volody response body: ' + res.getBody());

            if (res.getStatusCode() == 200) {
                Map<String, Object> responseBody = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());

                vc.clm_reference_id__c   = String.valueOf(responseBody.get('clm_reference_id'));
                vc.clm_document_link__c  = String.valueOf(responseBody.get('clm_document_link'));
                vc.clm_reference_Url__c  = String.valueOf(responseBody.get('clm_reference_url'));

                update vc;
                System.debug('Volody Contract updated successfully.');
            } else {
                System.debug(' Volody API error: ' + res.getStatusCode() + ' Body: ' + res.getBody());
            }

        } catch (Exception e) {
            System.debug(' Volody callout failed: ' + e.getMessage());
        }
    }
}


















/*public with sharing class VolodyContractFlow_OBCallout {

    public class ContractInput {
        @InvocableVariable(required=true)
        public Id contractId;
    }

    @InvocableMethod(label='Create Volody Contract')
    public static void createVolodyContract(List<ContractInput> requestList) {
        System.debug(' Starting Volody Contract Flow callout...');

        for (ContractInput input : requestList) {
            System.debug(' Processing Contract ID: ' + input.contractId);

            try {
                Volody_Contract__c vc = [
                    SELECT Id, Agreement_Name__c, Parent_Company_Name__c, CRM_Unique_Ref_Id__c,
                           Name_of_the_Counterparty__c, Start_Date_of_Contract__c,
                           Email_Address_of_the_Requestor__c, clm_reference_id__c                           
                    FROM Volody_Contract__c
                    WHERE Id = :input.contractId
                ]; //CLM_Document_Link__c, CLM_Reference_Url__c
             
                HttpRequest req = new HttpRequest();
                req.setEndpoint('callout:Volody_NC/api/v1/crm_contract'); // Named Credential
                req.setMethod('POST');
                req.setHeader('Content-Type', 'application/json');

                Map<String, Object> body = new Map<String, Object>{
                    'agreement_name' => vc.Agreement_Name__c,
                    'parent_company_name' => vc.Parent_Company_Name__c,
                    'crm_unqiue_ref_id' => vc.CRM_Unique_Ref_Id__c,
                    'counter_party_name' => vc.Name_of_the_Counterparty__c,
                    'start_date' => vc.Start_Date_of_Contract__c != null ? String.valueOf(vc.Start_Date_of_Contract__c) : null,
                    'req_user_email' => vc.Email_Address_of_the_Requestor__c
                };

                String requestBody = JSON.serialize(body);
                System.debug(' Request Body to Volody:\n' + requestBody);

                req.setBody(requestBody);

                Http http = new Http();
                HttpResponse res = http.send(req);

                System.debug(' Response Status: ' + res.getStatusCode());
                System.debug(' Response Body: ' + res.getBody());

                if (res.getStatusCode() == 200) {
                    Map<String, Object> resBody = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());

                    vc.clm_reference_id__c = String.valueOf(resBody.get('clm_reference_id'));
                    //vc.CLM_Document_Link__c = String.valueOf(resBody.get('clm_document_link'));
                    //vc.CLM_Reference_Url__c = String.valueOf(resBody.get('clm_reference_url'));

                    update vc;
                    System.debug(' Updated Volody Contract record with response data.');
                } else {
                    System.debug(' Volody API returned non-200 response');
                    throw new FlowException('Volody API failed: ' + res.getBody());
                }

            } catch (Exception e) {
                System.debug(' Exception during Volody callout: ' + e.getMessage());
                throw new FlowException('Error in Volody Contract Flow Callout: ' + e.getMessage());
            }
        }

        System.debug('Completed all contract callouts.');
    }
} */