@IsTest
private class WCF_ReviewFormJFControllerTest {

    @TestSetup
    static void setup() {
        WCF_TestDataFactory.createBundle();
        
        User sysAdmin = [SELECT Id FROM User WHERE Profile.Name = 'System Administrator' AND Username LIKE 'testadmin_%' LIMIT 1];
        System.runAs(sysAdmin) {
            Id personAccountRecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('Reviewer').getRecordTypeId();
            Account reviewerAccount = new Account(
                RecordTypeId = personAccountRecordTypeId,
                LastName = 'TestReviewerAccount',
                WCF_Reviewer__c = true,
                PersonEmail = 'reviewer@example.com'
            );
            insert reviewerAccount;
        }
    }

    private static User getSysAdmin() {
        return [
            SELECT Id 
            FROM User 
            WHERE Profile.Name = 'System Administrator' 
              AND Username LIKE 'testadmin_%'
            LIMIT 1
        ];
    }

    @IsTest
    static void testReviewFormFlows() {
        User sysAdmin = getSysAdmin();
        IndividualApplication app = [SELECT Id, Status, AccountId, OwnerId FROM IndividualApplication LIMIT 1];
        Account personAcc = [SELECT Id FROM Account WHERE IsPersonAccount = true LIMIT 1];
        
        System.runAs(sysAdmin) {
            String fulfillmentVal = WCF_TestDataFactory.pickValue('IndividualApplication', 'Organizational_Area_s_for_Funding_Inves__c', 'Fulfillment');
            String creationVal = WCF_TestDataFactory.pickValue('IndividualApplication', 'Organizational_Area_s_for_Funding_Inves__c', 'Creation');
            String bothVal = WCF_TestDataFactory.pickValue('IndividualApplication', 'Organizational_Area_s_for_Funding_Inves__c', 'Both');

            app.AccountId = personAcc.Id;
            app.Organizational_Area_s_for_Funding_Inves__c = fulfillmentVal;
            update app;

            // 1. Test getIndividualApplication
            WCF_ReviewFormJFController.IndividualApplicationWrapper wrap = WCF_ReviewFormJFController.getIndividualApplication(app.Id);
            System.assertNotEquals(null, wrap);
            System.assertEquals(app.Id, wrap.recordId);

            // Test resolveOutcomeDevName tracks
            app.Organizational_Area_s_for_Funding_Inves__c = creationVal;
            update app;
            WCF_ReviewFormJFController.getIndividualApplication(app.Id);

            app.Organizational_Area_s_for_Funding_Inves__c = bothVal;
            update app;
            WCF_ReviewFormJFController.getIndividualApplication(app.Id);

            // 2. Test saveDraftReview (Insert & Update branches)
            ApplicationReview draftReview = new ApplicationReview(
                ApplicationId = app.Id,
                Status = 'In Progress'
            );
            String draftJson = JSON.serialize(draftReview);
            
            ApplicationReview savedDraft = WCF_ReviewFormJFController.saveDraftReview(draftJson);
            System.assertNotEquals(null, savedDraft.Id);

            // Call again with ID to cover update path
            draftReview.Id = savedDraft.Id;
            WCF_ReviewFormJFController.saveDraftReview(JSON.serialize(draftReview));

            // Test getDraftReviewRecord
            ApplicationReview retrievedDraft = WCF_ReviewFormJFController.getDraftReviewRecord(app.Id);
            System.assertNotEquals(null, retrievedDraft);

            // Test hasAlreadyReviewed (False state)
            System.assertEquals(false, WCF_ReviewFormJFController.hasAlreadyReviewed(app.Id));

            // 3. Test saveApplicationReview
            ApplicationReview submitReview = new ApplicationReview(
                ApplicationId = app.Id,
                Recommend_for_CEO_review__c = WCF_TestDataFactory.pickValue('ApplicationReview', 'Recommend_for_CEO_review__c', 'Recommend')
            );
            WCF_ReviewFormJFController.saveApplicationReview(JSON.serialize(submitReview));

            // Test hasAlreadyReviewed (True state)
            System.assertEquals(true, WCF_ReviewFormJFController.hasAlreadyReviewed(app.Id));

            // Get options
            System.assertNotEquals(null, WCF_ReviewFormJFController.getRejectionReasonOptions());
        }
    }

    @IsTest
    static void testFileAttachments() {
        User sysAdmin = getSysAdmin();
        IndividualApplication app = [SELECT Id FROM IndividualApplication LIMIT 1];

        System.runAs(sysAdmin) {
            ApplicationReview ar = new ApplicationReview(
                ApplicationId = app.Id,
                Status = 'In Progress'
            );
            insert ar;

            // Create attachment file
            ContentVersion cv = new ContentVersion(
                Title = 'Review Note',
                PathOnClient = 'note.txt',
                VersionData = Blob.valueOf('Review contents'),
                IsMajorVersion = true
            );
            insert cv;

            Id cdId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

            // Link file to review record
            ContentDocumentLink cdl = new ContentDocumentLink(
                ContentDocumentId = cdId,
                LinkedEntityId = ar.Id,
                ShareType = 'V'
            );
            insert cdl;

            // Fetch attached files
            List<Map<String,String>> files = WCF_ReviewFormJFController.getAttachedFiles(ar.Id);
            System.assertEquals(1, files.size());

            // Delete uploaded file
            WCF_ReviewFormJFController.deleteUploadedFile(cdId);
        }
    }

    @IsTest
    static void testExceptions() {
        User sysAdmin = getSysAdmin();

        System.runAs(sysAdmin) {
            // Null parameters exceptions
            try {
                WCF_ReviewFormJFController.saveDraftReview(null);
                System.assert(false);
            } catch (AuraHandledException e) {}

            try {
                WCF_ReviewFormJFController.saveDraftReview('{"Status":"In Progress"}');
                System.assert(false);
            } catch (AuraHandledException e) {}

            try {
                WCF_ReviewFormJFController.saveApplicationReview(null);
                System.assert(false);
            } catch (AuraHandledException e) {}

            try {
                WCF_ReviewFormJFController.saveApplicationReview('{"Status":"Submitted"}');
                System.assert(false);
            } catch (AuraHandledException e) {}

            try {
                WCF_ReviewFormJFController.getIndividualApplication(null);
                System.assert(false);
            } catch (AuraHandledException e) {}

            try {
                WCF_ReviewFormJFController.deleteUploadedFile(null);
                System.assert(false);
            } catch (AuraHandledException e) {}
        }
    }
}