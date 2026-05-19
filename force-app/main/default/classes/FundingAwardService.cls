public without sharing class FundingAwardService {

    /* =========================================================
       1. Fetch Milestones Related to Funding Award
    ========================================================= */
    @AuraEnabled(cacheable=true)
    public static List<Milestone__c> getMilestones(Id fundingAwardId) {

        if (fundingAwardId == null) {
            throw new AuraHandledException('Funding Award Id is null');
        }

        FundingAward fa = [
            SELECT IndividualApplicationId
            FROM FundingAward
            WHERE Id = :fundingAwardId
            LIMIT 1
        ];

        Id appId = fa.IndividualApplicationId;

        return [
            SELECT Id, Name, Milestone_Description__c,
                   Budget_Required_INR__c, Project_Start_Date__c, Project_End_Date__c
            FROM Milestone__c
            WHERE Individual_Application__c = :appId
            ORDER BY Project_Start_Date__c
        ];
    }

    /* =========================================================
       2. Get Milestone for Modal Display
    ========================================================= */
    @AuraEnabled(cacheable=true)
    public static Milestone__c getMilestone(Id milestoneId) {
        return [
            SELECT Id, Name
            FROM Milestone__c
            WHERE Id = :milestoneId
            LIMIT 1
        ];
    }

    /* =========================================================
       3. Wrapper classes
    ========================================================= */
    public class DocumentValue {
        @AuraEnabled public String value;
    }

    public class DisbursementPayload {
        @AuraEnabled public Id milestoneId;
        @AuraEnabled public Id fundingAwardId;
        @AuraEnabled public String disbursementDate; // IMPORTANT: Accept as STRING from LWC
        @AuraEnabled public Decimal amount;
        @AuraEnabled public String comments;
        @AuraEnabled public List<DocumentValue> documents;
    }

    /* =========================================================
       4. Create Funding Disbursement + Documents + Update Milestone
    ========================================================= */
    @AuraEnabled
    public static Id createDisbursement(String payloadJson) {
        
        System.debug('RAW JSON: ' + payloadJson);
        
        if (String.isBlank(payloadJson)) {
            throw new AuraHandledException('Empty payload JSON');
        }
        
        DisbursementPayload payload =
            (DisbursementPayload) JSON.deserialize(payloadJson, DisbursementPayload.class);
        
        if (payload.fundingAwardId == null) {
            throw new AuraHandledException('Funding Award Id missing.');
        }
        if (payload.milestoneId == null) {
            throw new AuraHandledException('Milestone Id missing.');
        }
        
        // ---- FIX DATETIME ----
        Datetime finalDT = null;
        if (String.isNotBlank(payload.disbursementDate)) {
            String dt = payload.disbursementDate;
            
            dt = dt.replace('T',' ');
            dt = dt.replace('Z','');
            dt = dt.split('\\.')[0];
            
            System.debug('FINAL DATETIME: ' + dt);
            
            finalDT = Datetime.valueOf(dt);
        }
        
        // ---- 1. CREATE FUNDING DISBURSEMENT ----
        FundingDisbursement fd = new FundingDisbursement(
            FundingAwardId = payload.fundingAwardId,
            Milestone__c = payload.milestoneId,
            DisbursementDate = finalDT,
            Amount = payload.amount,
            Comments__c = payload.comments
        );
        insert fd;
        // ---- 3. CREATE DOCUMENT CHECKLIST RECORDS ----
        List<DocumentChecklistItem> toInsertDocs = new List<DocumentChecklistItem>();
        
        if (payload.documents != null && !payload.documents.isEmpty()) {
            for (DocumentValue dv : payload.documents) {
                if (String.isNotBlank(dv.value)) {
                    toInsertDocs.add(new DocumentChecklistItem(
                        ParentRecordId = fd.Id,
                        Name = dv.value    // or Document_Type__c = dv.value
                    ));
                }
            }
        }
        
        if (!toInsertDocs.isEmpty()) {
            insert toInsertDocs;
        }

        
        // ---- 2. UPDATE MILESTONE AMOUNT + FUND RELEASED (checkbox) ----
        Milestone__c ms = [
            SELECT Id, Amount__c, Funds_Released__c
            FROM Milestone__c
            WHERE Id = :payload.milestoneId
            LIMIT 1
        ];
        
        // Update currency amount
        ms.Amount__c = payload.amount;
        
        // Mark checkbox TRUE
        ms.Funds_Released__c = true;
        
        update ms;
        
        return fd.Id;
    }

}