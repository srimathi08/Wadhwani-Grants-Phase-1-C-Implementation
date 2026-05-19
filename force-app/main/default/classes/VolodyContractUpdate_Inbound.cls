@RestResource(urlMapping='/VolodyContractUpdate/')
global with sharing class VolodyContractUpdate_Inbound {

    @HttpPost
    global static String updateContractStatuses() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            // Parse request body as a list of records
            String requestBody = req.requestBody.toString();
            List<Object> records = (List<Object>) JSON.deserializeUntyped(requestBody);
            system.debug('Response >>'+ records);

            if (records.isEmpty()) {
                res.statusCode = 400;
                return 'Error: Empty payload';
            }

            List<Volody_contract__c> contractsToUpdate = new List<Volody_contract__c>();

            for (Object obj : records) {
                Map<String, Object> recordData = (Map<String, Object>) obj;
                
                String clmReferenceId = (String) recordData.get('clm_reference_id');
                String clmStatus = (String) recordData.get('clm_Status');
                String crmReferenceId = (String) recordData.get('crm_unique_ref_id');
                String requestorEmail = (String) recordData.get('requestor_email');

                if (String.isEmpty(clmReferenceId) || String.isEmpty(clmStatus) || 
                    String.isEmpty(crmReferenceId) || String.isEmpty(requestorEmail)) {
                    continue; // Skip incomplete records
                }
                
                List<Volody_contract__c> foundContracts = [SELECT Id, clm_status__c, crm_unique_ref_id__c, Email_Address_of_the_Requestor__c FROM Volody_contract__c 
                    WHERE crm_unique_ref_id__c = :crmReferenceId AND Email_Address_of_the_Requestor__c = :requestorEmail LIMIT 1  ];
                
                if (!foundContracts.isEmpty()) {
                    Volody_contract__c contract = foundContracts[0];
                    contract.clm_status__c = clmStatus;
                    contract.clm_reference_id__c = clmReferenceId;
                    contractsToUpdate.add(contract);
                } else {
                    System.debug('No contract found for crm_reference_id: ' + crmReferenceId + ' and email: ' + requestorEmail);
                }

            }

            if (!contractsToUpdate.isEmpty()) {
                update contractsToUpdate;
                res.statusCode = 200;
                return 'Success: ' + contractsToUpdate.size() + ' contract(s) updated';
            } else {
                res.statusCode = 404;
                return 'Error: No valid contract records to update';
            }
        } catch (Exception e) {
            res.statusCode = 500;
            return 'Error: ' + e.getMessage();
        }
    }
}




/*global with sharing class VolodyContractUpdate_Inbound {

    @HttpPost
   global static String updateContractStatus() {
        // Get request and response context
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        
        try {
            // Parse the request body
            String requestBody = req.requestBody.toString();
            Map<String, Object> requestData = (Map<String, Object>) JSON.deserializeUntyped(requestBody);

            // Extract required fields
            String clmReferenceId = (String) requestData.get('clm_reference_id');
            String clmStatus = (String) requestData.get('clm_Status');
            String crmReferenceId = (String) requestData.get('crm_unique_ref_id__c');
            String requestorEmail = (String) requestData.get('requestor_email');

            // Validate required fields
            if (String.isEmpty(clmReferenceId) || String.isEmpty(clmStatus) || 
                String.isEmpty(crmReferenceId) || String.isEmpty(requestorEmail)) {
                // 
                res.statusCode = 400;
                return 'Error: Missing required fields';
            }

            // Query the Contract object to find the matching record
            List<Volody_contract__c> contractRecords = [
                SELECT Id, clm_status__c, crm_unique_ref_id__c, Contact_Email__c
                FROM Volody_contract__c
                WHERE crm_unique_ref_id__c = :crmReferenceId AND Contact_Email__c = :requestorEmail  
                LIMIT 1
            ];

            if (contractRecords.isEmpty()) {
                res.statusCode = 404;
                return 'Error: Contract record not found';
            }

            // Update contract status
            Volody_contract__c contractRecord = contractRecords[0];
            contractRecord.clm_status__c = clmStatus;
            contractRecord.clm_reference_id__c = clmReferenceId;
            update contractRecord;

            res.statusCode = 200;
            return 'Success: Contract status updated';
        } catch (Exception e) {
            res.statusCode = 500;
            return 'Error: ' + e.getMessage();
        }
    } 
} */