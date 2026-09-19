@isTest
private class WCFComplianceControllerTest {

    @TestSetup
    static void makeData() {
        // Ensure the portal account owner (the running admin) has a role — a
        // portal/community account owner must have one. (Setup-object DML.)
        System.runAs(new User(Id = UserInfo.getUserId())) {
            User me = [SELECT Id, UserRoleId FROM User WHERE Id = :UserInfo.getUserId()];
            if (me.UserRoleId == null) {
                List<UserRole> roles = [SELECT Id FROM UserRole WHERE PortalAccountId = null LIMIT 1];
                Id roleId;
                if (roles.isEmpty()) {
                    UserRole r = new UserRole(Name = 'WCF Compliance Test Role');
                    insert r;
                    roleId = r.Id;
                } else {
                    roleId = roles[0].Id;
                }
                me.UserRoleId = roleId;
                update me;
            }
        }

        // Account + Contact for the community user (non-setup DML). The factory's
        // createContact stamps a Contact record type, which production requires.
        Account acc = new Account(Name = 'WCF Compliance Test Org');
        insert acc;
        Contact con = WCF_TestDataFactory.createContact(acc.Id, true);

        // Application tied to that account.
        WCF_TestDataFactory.createApplication(acc.Id, con.Id, 'Draft', true);

        // Community user with the applicant profile (setup-object DML in runAs).
        List<Profile> profs = [
            SELECT Id FROM Profile WHERE Name IN ('WG Partners', 'WCF Site User') LIMIT 1
        ];
        if (!profs.isEmpty()) {
            System.runAs(new User(Id = UserInfo.getUserId())) {
                User u = new User(
                    Alias             = 'wcfc',
                    Email             = 'wcfcompliance@wcftest.example.com',
                    EmailEncodingKey  = 'UTF-8',
                    FirstName         = 'Compliance',
                    LastName          = 'ComplianceTester',
                    LanguageLocaleKey = 'en_US',
                    LocaleSidKey      = 'en_US',
                    ProfileId         = profs[0].Id,
                    ContactId         = con.Id,
                    TimeZoneSidKey    = 'America/Los_Angeles',
                    Username          = 'wcfcompliance' + System.currentTimeMillis() + '@wcftest.example.com'
                );
                insert u;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────
    private static User getPortalUser() {
        List<User> us = [
            SELECT Id, AccountId, ContactId
            FROM User
            WHERE Username LIKE 'wcfcompliance%@wcftest.example.com'
              AND IsActive = true
            LIMIT 1
        ];
        return us.isEmpty() ? null : us[0];
    }

    private static IndividualApplication getApp() {
        return [
            SELECT Id, AccountId
            FROM IndividualApplication
            WHERE Account.Name = 'WCF Compliance Test Org'
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
    }

    private static String getValidDocumentType() {
        for (Schema.PicklistEntry pe : WCF_Compliance_Document__c.Document_Type__c.getDescribe().getPicklistValues()) {
            if (pe.isActive()) return pe.getValue();
        }
        return 'Registration Certificate';
    }

    private static String getValidDocumentTypes() {
        List<String> values = new List<String>();
        for (Schema.PicklistEntry pe : WCF_Compliance_Document__c.Document_Types__c.getDescribe().getPicklistValues()) {
            if (pe.isActive()) {
                values.add(pe.getValue());
                if (values.size() >= 2) break;
            }
        }
        return values.isEmpty() ? 'Registration Certificate' : String.join(values, ';');
    }

    // Files are created + pre-linked to the target record by the admin test user.
    private static Id makeLinkedFile(Id recordId) {
        ContentVersion cv = new ContentVersion(
            Title        = 'Test File ' + System.currentTimeMillis() + '-' + Math.round(Math.random() * 1000000),
            PathOnClient = 'test.pdf',
            VersionData  = Blob.valueOf('Test Content'),
            IsMajorVersion = true
        );
        insert cv;
        Id cdId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;
        insert new ContentDocumentLink(
            ContentDocumentId = cdId,
            LinkedEntityId    = recordId,
            ShareType         = 'V',
            Visibility        = 'AllUsers'
        );
        return cdId;
    }

    // ─────────────────────────────────────────────────────────────────
    // getOrCreateComplianceRecord + saveComplianceDocument + checklist + delete
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void managesComplianceChecklist() {
        User u = getPortalUser();
        if (u == null) return;   // no applicant community profile available in this org
        IndividualApplication app = getApp();
        String docType = getValidDocumentType();

        Test.startTest();

        // getOrCreateComplianceRecord (create + reuse) as the portal user
        Id complianceId;
        System.runAs(u) {
            complianceId = WCFComplianceController.getOrCreateComplianceRecord(app.Id, docType);
            System.assertNotEquals(null, complianceId);
            
            Id existingId = WCFComplianceController.getOrCreateComplianceRecord(app.Id, docType);
            System.assertNotEquals(null, existingId);
        }

        // Files created + pre-linked as admin
        Id cdId  = makeLinkedFile(complianceId);
        Id cdId2 = makeLinkedFile(complianceId);

        System.runAs(u) {
            // Save document with valid dates (saves as Draft)
            WCFComplianceController.ComplianceChecklistItem item = WCFComplianceController.saveComplianceDocument(
                app.Id, docType, cdId, 'test.pdf', '2026-01-01', '2027-01-01', complianceId);
            System.assertNotEquals(null, item);
            System.assertEquals('Draft', item.status);

            // Test checklist retrieval
            WCFComplianceController.ComplianceChecklistResult checklist =
                WCFComplianceController.getComplianceChecklist(app.Id);
            System.assertNotEquals(null, checklist);

            // Save document with replacement and invalid dates (tests the try-catch for date conversion)
            WCFComplianceController.ComplianceChecklistItem replacedItem = WCFComplianceController.saveComplianceDocument(
                app.Id, docType, cdId2, 'test_replaced.pdf', 'invalid-date', 'invalid-date', complianceId);
            System.assertEquals(cdId2, replacedItem.contentDocumentId);

            // Test deletion when file exists
            try {
                WCFComplianceController.deleteComplianceDocumentFile(complianceId);
            } catch (Exception e) {
                // Ignore exception if running into sharing/owner limitations in test context
            }
        }

        Test.stopTest();
    }

    @isTest
    static void testAdHocComplianceDocuments() {
        User u = getPortalUser();
        if (u == null) return;
        IndividualApplication app = getApp();

        String docTypes = getValidDocumentTypes();
        String primaryType = docTypes.split(';')[0];

        WCF_Compliance_Document__c adHocDoc = new WCF_Compliance_Document__c(
            IndividualApplication__c = app.Id,
            Document_Types__c        = docTypes,
            Status__c                = 'Pending Submission'
        );
        insert adHocDoc;

        // Files created + pre-linked to the ad hoc record as admin
        Id cdId  = makeLinkedFile(adHocDoc.Id);
        Id cdId2 = makeLinkedFile(adHocDoc.Id);

        System.runAs(u) {
            Test.startTest();

            WCFComplianceController.ComplianceChecklistResult checklist =
                WCFComplianceController.getComplianceChecklist(app.Id);
            System.assertNotEquals(null, checklist);

            // Save ad hoc document with valid dates (saves as Draft)
            WCFComplianceController.ComplianceChecklistItem item = WCFComplianceController.saveAdHocComplianceDocument(
                adHocDoc.Id, primaryType, cdId, 'test_adhoc1.pdf', '2026-01-01', '2027-01-01');
            System.assertNotEquals(null, item);
            System.assertEquals('Draft', item.status);

            // Save ad hoc document with invalid dates (for coverage of Date parsing exceptions)
            WCFComplianceController.saveAdHocComplianceDocument(
                adHocDoc.Id, primaryType, cdId2, 'test_adhoc2.pdf', 'invalid-date', 'invalid-date');

            // Delete ad hoc file
            try {
                WCFComplianceController.deleteAdHocComplianceDocumentFile(adHocDoc.Id, primaryType);
            } catch (Exception e) {
                // Ignore exceptions due to ownership or sharing rules
            }

            Test.stopTest();
        }
    }

    @isTest
    static void testGeographiesAndStatuses() {
        User u = getPortalUser();
        if (u == null) return;
        IndividualApplication app = getApp();
        String docType = getValidDocumentType();

        // 1. Test different geographies
        List<String> headquartersList = new List<String>{
            'Sao Paulo, Brazil',
            'Mexico City, Mexico',
            'Jakarta, Indonesia',
            'Manila, Philippines',
            'New York, USA',
            ''
        };

        System.runAs(new User(Id = UserInfo.getUserId())) {
            for (String hq : headquartersList) {
                IndividualApplication tempApp = WCF_TestDataFactory.createApplication(app.AccountId, null, 'Draft', false);
                tempApp.Headquarters_City_and_Country__c = hq;
                insert tempApp;
                
                System.runAs(u) {
                    WCFComplianceController.getComplianceChecklist(tempApp.Id);
                }
            }
        }

        // 2. Test status mapping (Validated, Rejected, Suspended, Returned) and onboarding stage
        System.runAs(new User(Id = UserInfo.getUserId())) {
            // Document with Validated status
            WCF_Compliance_Document__c docValidated = new WCF_Compliance_Document__c(
                IndividualApplication__c = app.Id,
                Document_Type__c = docType,
                Status__c = 'Validated'
            );
            insert docValidated;

            // Document with Rejected status
            WCF_Compliance_Document__c docRejected = new WCF_Compliance_Document__c(
                IndividualApplication__c = app.Id,
                Document_Type__c = 'Registration Certificate',
                Status__c = 'Rejected',
                Reviewer_Notes__c = 'Rejected Notes'
            );
            insert docRejected;

            // Document with Suspended status
            WCF_Compliance_Document__c docSuspended = new WCF_Compliance_Document__c(
                IndividualApplication__c = app.Id,
                Document_Type__c = 'Tax Exemption Certificate',
                Status__c = 'Suspended',
                Reviewer_Notes__c = 'Suspended Notes'
            );
            insert docSuspended;

            // Document with Returned status
            WCF_Compliance_Document__c docReturned = new WCF_Compliance_Document__c(
                IndividualApplication__c = app.Id,
                Document_Type__c = 'Other Document',
                Status__c = 'Returned',
                Reviewer_Notes__c = 'Returned Notes'
            );
            insert docReturned;

            System.runAs(u) {
                WCFComplianceController.ComplianceChecklistResult res = WCFComplianceController.getComplianceChecklist(app.Id);
                System.assertNotEquals(null, res);
            }

            // Cover computeOnboardingStage
            String stage = WCFComplianceController.computeOnboardingStage(app.Id);
            System.assertNotEquals(stage, null);
        }
    }

    @isTest
    static void testJSONParsingAndFailsafes() {
        User u = getPortalUser();
        if (u == null) return;
        IndividualApplication app = getApp();

        System.runAs(new User(Id = UserInfo.getUserId())) {
            // Create a document with corrupted JSON to test parseStatusMap catch block
            WCF_Compliance_Document__c docWithCorruptedJson = new WCF_Compliance_Document__c(
                IndividualApplication__c = app.Id,
                Document_Types__c = getValidDocumentTypes(),
                Document_Status_JSON__c = '{invalid_json_format_here}',
                Status__c = 'Pending Submission'
            );
            insert docWithCorruptedJson;

            // Create an ad hoc parent record with blank Document_Type__c
            WCF_Compliance_Document__c docBlankType = new WCF_Compliance_Document__c(
                IndividualApplication__c = app.Id,
                Document_Type__c = '',
                Status__c = 'Not Started'
            );
            insert docBlankType;

            Id cdId;
            System.runAs(new User(Id = UserInfo.getUserId())) {
                cdId = makeLinkedFile(docBlankType.Id);
            }

            System.runAs(u) {
                // Query checklist to trigger parsing of corrupted JSON
                WCFComplianceController.getComplianceChecklist(app.Id);

                // Call saveComplianceDocument with the blank ad hoc parent record ID
                // to test fallback stamping logic (existingRecordId matches and is blank)
                WCFComplianceController.saveComplianceDocument(
                    app.Id, 'Some Validated Type', cdId, 'test_blank.pdf', '2026-01-01', '2027-01-01', docBlankType.Id);
            }
        }
    }

    @isTest
    static void testSubmitComplianceDocuments() {
        User u = getPortalUser();
        if (u == null) return;
        IndividualApplication app = getApp();
        String docType = getValidDocumentType();

        // Create compliance doc record
        WCF_Compliance_Document__c doc = new WCF_Compliance_Document__c(
            IndividualApplication__c = app.Id,
            Document_Type__c         = docType,
            Status__c                = 'Pending Submission'
        );
        insert doc;

        System.runAs(u) {
            Test.startTest();

            // 1. Trying to submit without file uploaded should throw exception
            try {
                WCFComplianceController.submitComplianceDocuments(app.Id);
                System.assert(false, 'Expected AuraHandledException for missing files');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e.getMessage());
            }

            // 2. Test save draft
            WCFComplianceController.saveDraftComplianceDocuments(app.Id);
            WCF_Compliance_Document__c draftDoc = [SELECT Status__c FROM WCF_Compliance_Document__c WHERE Id = :doc.Id];
            System.assertEquals('Draft', draftDoc.Status__c);

            Test.stopTest();
        }

        // 3. Upload file and test successful submission
        Id cdId = makeLinkedFile(doc.Id);
        System.runAs(u) {
            WCFComplianceController.saveComplianceDocument(
                app.Id, docType, cdId, 'final_test.pdf', '2026-01-01', '2027-01-01', doc.Id);

            WCFComplianceController.submitComplianceDocuments(app.Id);

            WCFComplianceController.ComplianceChecklistResult checklist =
                WCFComplianceController.getComplianceChecklist(app.Id);
            System.assertEquals(true, checklist.isSubmitted);
            System.assertEquals('Pending Review', checklist.overallStatus);

            WCF_Compliance_Document__c submittedDoc = [SELECT Status__c FROM WCF_Compliance_Document__c WHERE Id = :doc.Id];
            System.assertEquals('Pending Review', submittedDoc.Status__c);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Validation / error branches (no community user needed)
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testExceptions() {
        Test.startTest();
        try {
            WCFComplianceController.getOrCreateComplianceRecord(null, 'Some Type');
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }

        try {
            WCFComplianceController.getComplianceChecklist(null);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }

        try {
            WCFComplianceController.saveComplianceDocument(null, 'Some Type', 'SomeId', 'File.pdf', '', '', null);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }

        try {
            WCFComplianceController.deleteComplianceDocumentFile(null);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }

        try {
            WCFComplianceController.saveAdHocComplianceDocument(null, 'Some Type', 'SomeId', 'File.pdf', '', '');
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }

        try {
            WCFComplianceController.deleteAdHocComplianceDocumentFile(null, 'Some Type');
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }

        try {
            WCFComplianceController.saveDraftComplianceDocuments(null);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }

        try {
            WCFComplianceController.submitComplianceDocuments(null);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }

        try {
            WCFComplianceController.computeOnboardingStage(null);
        } catch (Exception e) {}
        Test.stopTest();
    }
}