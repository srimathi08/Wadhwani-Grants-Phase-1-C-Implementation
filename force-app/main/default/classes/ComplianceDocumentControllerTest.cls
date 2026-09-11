@IsTest
private class ComplianceDocumentControllerTest {
    private static User getAdminUser() {
        return [SELECT Id FROM User WHERE Profile.Name = 'System Administrator' AND IsActive = true LIMIT 1];
    }

    private static Account createTestPersonAccount() {
        Id personRtId = [
            SELECT Id FROM RecordType
            WHERE SObjectType = 'Account' AND IsPersonType = true
            LIMIT 1
        ].Id;
        Account pa = new Account(
            LastName = 'Test Person Account',
            PersonEmail = 'testpa@example.com',
            RecordTypeId = personRtId
        );
        insert pa;
        return [SELECT Id, PersonContactId FROM Account WHERE Id = :pa.Id];
    }

    @IsTest static void exercisesComplianceRequests() {
        User adminUser = getAdminUser();
        Account acc;
        IndividualApplication app;
        String requestId;

        System.runAs(adminUser) {
            acc = createTestPersonAccount();
            app = WCF_TestDataFactory.createApplication(acc.Id, acc.PersonContactId, 'Recommend for Fund', false);
            insert app;
        }

        // Test getLinkedApplication
        System.assertNotEquals(null, ComplianceDocumentController.getLinkedApplication(acc.Id));
        System.assertEquals(null, ComplianceDocumentController.getLinkedApplication(null));

        // Before request is created, it should show in options
        List<Map<String, String>> optionsBefore = ComplianceDocumentController.getOrganisationOptions();
        System.assertNotEquals(null, optionsBefore);
        System.assert(!optionsBefore.isEmpty());

        System.runAs(adminUser) {
            requestId = ComplianceDocumentController.saveComplianceRequest(
                null, acc.Id, app.Id, 'Registration Certificate', 
                '2026-01-01', 'invalid-date', 
                WCF_TestDataFactory.pickValue('WCF_Compliance_Document__c', 'Priority__c', 'Medium'), 
                'India', 'Test request'
            );
        }

        System.assert(ComplianceDocumentController.getComplianceSummary().allRequests > 0);
        System.assert(!ComplianceDocumentController.getComplianceRows().isEmpty());
        
        // After request is created, it should be removed from options
        List<Map<String, String>> optionsAfter = ComplianceDocumentController.getOrganisationOptions();
        System.assertNotEquals(null, optionsAfter);
        Boolean found = false;
        for (Map<String, String> opt : optionsAfter) {
            if (opt.get('value') == acc.Id) {
                found = true;
                break;
            }
        }
        System.assert(!found, 'Organization with created request should not be in the dropdown options');

        System.runAs(adminUser) {
            ComplianceDocumentController.deleteComplianceRequest(requestId);
        }
    }

    @IsTest static void testReviewItemsAndDecision() {
        User adminUser = getAdminUser();
        Account acc;
        IndividualApplication app;
        String requestId;

        System.runAs(adminUser) {
            acc = createTestPersonAccount();
            app = WCF_TestDataFactory.createApplication(acc.Id, acc.PersonContactId, 'Recommend for Fund', false);
            insert app;

            requestId = ComplianceDocumentController.saveComplianceRequest(
                null, acc.Id, app.Id, '80G Certificate; FCRA Certificate', 
                String.valueOf(Date.today()), String.valueOf(Date.today().addDays(5)), WCF_TestDataFactory.pickValue('WCF_Compliance_Document__c', 'Priority__c', 'Medium'), 'India', 'Test request'
            );
        }

        List<ComplianceDocumentController.ReviewItemDTO> items = ComplianceDocumentController.getComplianceDocumentReviewItems(requestId);
        System.assertNotEquals(0, items.size());

        // Call again with a dummy JSON status map populated to cover JSON parsing
        System.runAs(adminUser) {
            WCF_Compliance_Document__c doc = [SELECT Id FROM WCF_Compliance_Document__c WHERE Id = :requestId];
            doc.Document_Status_JSON__c = '{"80G Certificate":{"status":"Pending Submission","contentDocumentId":"069e00000000000AAA","fileName":"test.pdf","reviewerNotes":"Notes"}}';
            update doc;
        }

        items = ComplianceDocumentController.getComplianceDocumentReviewItems(requestId);
        System.assertNotEquals(0, items.size());

        System.runAs(adminUser) {
            // Test Pass decision
            ComplianceDocumentController.saveComplianceRequestDecision(requestId, 'Pass', 'Approved all docs', null);
            
            // Test Return decision with specific labels
            ComplianceDocumentController.saveComplianceRequestDecision(requestId, 'Return', 'Please re-upload', new List<String>{'80G Certificate'});

            // Test Reject decision
            ComplianceDocumentController.saveComplianceRequestDecision(requestId, 'Reject', 'Rejected', null);

            // Test Suspend decision
            ComplianceDocumentController.saveComplianceRequestDecision(requestId, 'Suspend', 'Suspended', null);
        }

        WCF_Compliance_Document__c request = [SELECT Status__c, Reviewer_Notes__c FROM WCF_Compliance_Document__c WHERE Id = :requestId];
        System.assertEquals('Suspended', request.Status__c);
    }

    @IsTest static void testExceptions() {
        // Test validation exceptions on invalid parameters
        try {
            ComplianceDocumentController.saveComplianceRequestDecision(null, null, null, null);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }

        try {
            WCFComplianceController.getOrCreateComplianceRecord(null, 'Some Type');
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }

        try {
            WCFComplianceController.getComplianceChecklist(null);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }

        try {
            WCFComplianceController.saveComplianceDocument(null, 'Some Type', 'SomeId', 'File.pdf', '', '', null);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }

        try {
            WCFComplianceController.deleteComplianceDocumentFile(null);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }

        try {
            WCFComplianceController.saveAdHocComplianceDocument(null, 'Some Type', 'SomeId', 'File.pdf', '', '');
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }

        try {
            WCFComplianceController.deleteAdHocComplianceDocumentFile(null, 'Some Type');
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }
    }
}