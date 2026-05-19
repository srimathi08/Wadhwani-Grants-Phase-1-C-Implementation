@IsTest
public class WCFFormControllerTest {

    // ---------- helpers ----------
    public static Id createActiveFO() {
        // Needs an RT named WCF_Project_Proposal in your org
        RecordType rt = [
            SELECT Id FROM RecordType
            WHERE SobjectType = 'FundingOpportunity' AND DeveloperName = 'WCF_Project_Proposal'
            LIMIT 1
        ];
        FundingOpportunity fo = new FundingOpportunity(
            Name = 'Active WCF FO',
            Status = 'Active',
            FO_Type__c = 'WCF Proposal',
            RecordTypeId = rt.Id
        );
        insert fo;
        return fo.Id;
    }

    private static ContentVersion makeFile(String title, String ext, String descOnDocument) {
        // create a file and (optionally) set ContentDocument.Description for cell-key
        ContentVersion cv = new ContentVersion(
            Title = title,
            PathOnClient = title + '.' + ext,
            VersionData = Blob.valueOf('test file bytes')
        );
        insert cv;
        ContentVersion reloaded = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion WHERE Id = :cv.Id
        ];
        if (!String.isBlank(descOnDocument)) {
            ContentDocument cd = [
                SELECT Id, Description FROM ContentDocument WHERE Id = :reloaded.ContentDocumentId
            ];
            cd.Description = descOnDocument; // this is what getDraftWCFApplication reads
            update cd;
        }
        return reloaded;
    }

    private static Id makeExistingDraftApp() {
        Account acc = new Account(Name = 'Draft Acc');
        insert acc;
        // minimal app we can update in draft/save flow
        IndividualApplication ia = new IndividualApplication(
            AccountId = acc.Id,
            Category  = 'WCF Grant Application',
            Status    = 'Draft'
        );
        insert ia;
        return ia.Id;
    }

    // ---------- tests ----------

    @IsTest
    static void test_getActiveFundingOpportunityId_success() {
        Id foId = createActiveFO();
        Test.startTest();
        Id got = WCFFormController.getActiveFundingOpportunityId();
        Test.stopTest();
        System.assertEquals(foId, got);
    }

    @IsTest
    static void test_getActiveFundingOpportunityId_none() {
        Boolean threw = false;
        try {
            Test.startTest();
            WCFFormController.getActiveFundingOpportunityId();
            Test.stopTest();
        } catch (AuraHandledException e) {
            threw = true;
           // System.assert(e.getMessage().contains('No active funding opportunity'), 'Should report missing FO');
        }
        System.assert(threw, 'Expected exception when no active FO exists.');
    }

    @IsTest
    static void test_upsertAIFeedback_and_get() {
        // insert via upsert
        Test.startTest();
        Id id1 = WCFFormController.upsertAIFeedback('Use_of_Additional_Funding__c', 'Initial use', 'Alice');
        // update same row (same submitter)
        Id id2 = WCFFormController.upsertAIFeedback('Use_of_Additional_Funding__c', 'Updated use', 'Alice');
        Map<String, Object> fetched = WCFFormController.getAIFeedbackRecord('Alice');
        Test.stopTest();

        System.assertEquals(id1, id2, 'Should update same AI_Feedback__c');
        System.assertEquals('Updated use', (String)fetched.get('Use_of_Additional_Funding__c'));
    }

    @IsTest
    static void test_getPicklistValuesForField() {
        Test.startTest();
        List<Map<String,String>> opts = WCFFormController.getPicklistValuesForField('IndividualApplication', 'Status');
        Test.stopTest();
        System.assertNotEquals(0, opts.size(), 'Should return picklist options for Status');
        System.assert(opts[0].containsKey('label') && opts[0].containsKey('value'));
    }

    @IsTest
    static void test_saveWCFDraftApplication_and_getDraft_withFiles() {
        Id appId = makeExistingDraftApp();

        // create a file and mark its cell key on ContentDocument.Description
        ContentVersion cv = makeFile('evidence', 'pdf', 'cell-A1');
        Id docId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

        // minimal org/hist/fiscal/outcome maps
        Map<String, Object> orgData     = new Map<String, Object>{ 'Organization_Name__c' => 'Org X' };
        Map<String, Object> histData    = new Map<String, Object>{ 'CY1_Revenue__c' => 100, 'CY1_Expense__c' => 40 };
        Map<String, Object> fiscalData  = new Map<String, Object>{ 'Revenue_Budget__c' => 200, 'Expense_Budget__c' => 150 };
        Map<String, Object> outcomeData = new Map<String, Object>{ 'Skills_Duration_CFY__c' => '3m' };

        Test.startTest();
        WCFFormController.SaveDraftResponse resp = WCFFormController.saveWCFDraftApplication(
            orgData, histData, fiscalData, outcomeData,
            'Job Fulfillment Only', // selectedFundingArea (record type logic is not enforced in update path)
            appId,                  // existing -> update path (no dependency on currentUser.AccountId)
            new List<String>{ String.valueOf(docId) }
        );
        WCFFormController.WCFDraftWrapper wrap = WCFFormController.getDraftWCFApplication(appId);
        Test.stopTest();

        System.assertEquals(appId, resp.applicationId);
        System.assertNotEquals(null, resp.historicId);
        System.assertNotEquals(null, resp.fiscalId);
        System.assertNotEquals(null, resp.outcomeId);

        // verify child data saved
        Historical_Data__c hist = [SELECT CY1_Revenue__c, CY1_Expense__c FROM Historical_Data__c WHERE Id = :resp.historicId];
        System.assertEquals(100, hist.CY1_Revenue__c);
        System.assertEquals(40,  hist.CY1_Expense__c);

        // verify wrapper populated + files grouped under our cell key
        System.assertNotEquals(null, wrap.application);
        System.assertNotEquals(null, wrap.historical);
        System.assertNotEquals(null, wrap.fiscal);
        System.assertNotEquals(null, wrap.outcome);
        System.assert(wrap.uploadedFilesByCell.containsKey('cell-A1'), 'Expected files grouped by cell-A1');
        System.assertEquals(1, wrap.uploadedFilesByCell.get('cell-A1').size());
    }

    @IsTest
    static void test_setFileCellKey_setsVersionDescription() {
        ContentVersion cv = makeFile('to-tag', 'txt', null);
        Id docId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

        Test.startTest();
        WCFFormController.setFileCellKey(docId, 'cell-B3');
        Test.stopTest();

        ContentVersion latest = [
            SELECT Description
            FROM ContentVersion
            WHERE ContentDocumentId = :docId
            ORDER BY VersionNumber DESC
            LIMIT 1
        ];
        System.assertEquals('cell-B3', latest.Description, 'setFileCellKey should stamp latest version description');
    }

    @IsTest
    static void test_submitWCFApplication_existingRecord_safePath() {
        // Prepare an active FO for the method to find
        createActiveFO();

        // existing app we will "submit" (method will overwrite fields/status)
        Id appId = makeExistingDraftApp();

        // Minimal maps; DO NOT provide email so the method skips Contact creation
        Map<String, Object> orgData     = new Map<String, Object>{ 'Organization_Name__c' => 'Submit Org' };
        Map<String, Object> histData    = new Map<String, Object>{ 'CY1_Revenue__c' => 111 };
        Map<String, Object> fiscalData  = new Map<String, Object>{ 'Revenue_Budget__c' => 222 };
        Map<String, Object> outcomeData = new Map<String, Object>{ 'Skills_Duration_CFY__c' => '2m' };

        // a file to attach to outcome on submit
        ContentVersion cv = makeFile('submit-proof', 'pdf', 'cell-S1');
        Id docId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

        Test.startTest();
        Id returnedId = WCFFormController.submitWCFApplication(
            orgData, histData, fiscalData, outcomeData,
            new List<String>{ String.valueOf(docId) },
            null,        // selectedFundingArea -> keep RT logic neutral (no hardcoded RT Ids)
            appId        // existing record path
        );
        Test.stopTest();

        System.assertEquals(appId, returnedId, 'Should submit the same application');

        IndividualApplication app = [
            SELECT Status, IsSubmitted, Category, FundingOpportunityId
            FROM IndividualApplication WHERE Id = :appId
        ];
        System.assertEquals('Submitted', app.Status);
        System.assertEquals(true, app.IsSubmitted);
        System.assertEquals('WCF Grant Application', app.Category);
        System.assertNotEquals(null, app.FundingOpportunityId);

        // verify one outcome exists & got the link
        Outcomes_Data__c out = [
            SELECT Id FROM Outcomes_Data__c WHERE Proposal__c = :appId LIMIT 1
        ];
        Integer linkCount = [
            SELECT COUNT() FROM ContentDocumentLink
            WHERE LinkedEntityId = :out.Id
        ];
        System.assertEquals(1, linkCount, 'Expected one file linked to the outcome on submit');
    }
}