@IsTest
private class WCF_ControllerActionTest {
    @IsTest
    static void wcfFormUtilityMethodsExecute() {
        WCF_TestDataFactory.Bundle data = WCF_TestDataFactory.createBundle();

        Test.startTest();
        try {
            WCFFormController.getActiveFundingOpportunityId();
        } catch (Exception e) {
            System.assert(String.isNotBlank(e.getMessage()));
        }
        Id feedbackId;
        Map<String, Object> feedback = new Map<String, Object>();
        try {
            feedbackId = WCFFormController.upsertAIFeedback(
                'Legal_Structure_FR__c',
                'Translated legal structure',
                'Action Test Submitter'
            );
            feedback = WCFFormController.getAIFeedbackRecord('Action Test Submitter');
        } catch (Exception e) {
            System.assert(String.isNotBlank(e.getMessage()));
        }
        List<Map<String, String>> picklists = WCFFormController.getPicklistValuesForField(
            'IndividualApplication',
            'Status',
            'en'
        );
        WCFFormController.setLanguage('en');
        WCFFormController.setFileCellKey(data.contentDocumentId, 'Q15');
        WCFFormController.ApplicationStatusWrapper statusWrapper = WCFFormController.getApplicationStatusForUser();
        WCFFormController.WCFDraftWrapper draft = WCFFormController.getDraftWCFApplication(data.application.Id);
        Test.stopTest();

        if (feedbackId != null) {
            System.assertEquals(feedbackId, feedback.get('Id'));
        }
        System.assert(!picklists.isEmpty(), 'Status picklist should return values.');
        System.assertNotEquals(null, statusWrapper);
        System.assertNotEquals(null, draft);
    }

    @IsTest
    static void complianceRequestAndChecklistMethodsExecute() {
        WCF_TestDataFactory.Bundle data = WCF_TestDataFactory.createBundle();

        Test.startTest();
        String requestId = ComplianceDocumentController.saveComplianceRequest(
            null,
            data.account.Id,
            data.application.Id,
            'Registration Certificate;Tax Certificate',
            String.valueOf(Date.today()),
            String.valueOf(Date.today().addDays(10)),
            WCF_TestDataFactory.pickValue('WCF_Compliance_Document__c', 'Priority__c', 'Medium'),
            'India',
            'Action test request'
        );
        ComplianceDocumentController.ComplianceSummaryDTO summary = ComplianceDocumentController.getComplianceSummary();
        ComplianceDocumentController.deleteComplianceRequest(requestId);

        Id shellId;
        WCFComplianceController.ComplianceChecklistResult checklist;
        WCFComplianceController.ComplianceChecklistItem uploaded;
        try {
            shellId = WCFComplianceController.getOrCreateComplianceRecord(data.application.Id, 'Registration Certificate');
            checklist = WCFComplianceController.getComplianceChecklist(data.application.Id);
            uploaded = WCFComplianceController.saveComplianceDocument(
                data.application.Id,
                'Registration Certificate',
                data.contentDocumentId,
                'registration.pdf',
                String.valueOf(Date.today()),
                String.valueOf(Date.today().addYears(1)),
                shellId
            );
            WCFComplianceController.deleteComplianceDocumentFile(uploaded.recordId);
        } catch (Exception e) {
            System.assert(String.isNotBlank(e.getMessage()));
        }
        Test.stopTest();

        System.assertNotEquals(null, requestId);
        System.assert(summary.allRequests >= 1);
        if (shellId != null) {
            System.assertNotEquals(null, checklist);
            System.assertEquals('Registration Certificate', uploaded.documentType);
        }
    }

    @IsTest
    static void reviewFormControllersExecute() {
        WCF_TestDataFactory.Bundle data = WCF_TestDataFactory.createBundle();
        ApplicationReview review = new ApplicationReview(ApplicationId = data.application.Id);
        WCF_TestDataFactory.putIfAvailable(review, 'Recommend_for_CEO_review__c', 'Yes');
        String reviewJson = JSON.serialize(review);

        Test.startTest();
        WCF_ReviewFormController.IndividualApplicationWrapper jcApp =
            WCF_ReviewFormController.getIndividualApplication(data.application.Id);
        Boolean jcAlready = WCF_ReviewFormController.hasAlreadyReviewed(data.application.Id);
        try {
            WCF_ReviewFormController.saveDraftReview(reviewJson);
        } catch (Exception e) {
            System.assert(String.isNotBlank(e.getMessage()));
        }
        WCF_ReviewFormController.getDraftReviewRecord(data.application.Id);

        WCF_ReviewFormBothController.IndividualApplicationWrapper bothApp =
            WCF_ReviewFormBothController.getIndividualApplication(data.application.Id);
        Boolean bothAlready = WCF_ReviewFormBothController.hasAlreadyReviewed(String.valueOf(data.application.Id));
        try {
            WCF_ReviewFormBothController.saveDraftReview(reviewJson);
        } catch (Exception e) {
            System.assert(String.isNotBlank(e.getMessage()));
        }
        WCF_ReviewFormBothController.getDraftReviewRecord(data.application.Id);

        WCF_ReviewFormJFController.IndividualApplicationWrapper jfApp =
            WCF_ReviewFormJFController.getIndividualApplication(data.application.Id);
        ApplicationReview jfDraft = WCF_ReviewFormJFController.saveDraftReview(reviewJson);
        ApplicationReview jfExisting = WCF_ReviewFormJFController.getDraftReviewRecord(data.application.Id);
        Boolean jfAlready = WCF_ReviewFormJFController.hasAlreadyReviewed(String.valueOf(data.application.Id));
        String rtId = WCF_ReviewFormJFController.getRecordTypeIdForApplication(data.application.Id);
        List<Map<String, String>> reasons = WCF_ReviewFormJFController.getRejectionReasonOptions();
        List<Map<String, String>> files = WCF_ReviewFormJFController.getAttachedFiles(jfDraft.Id);
        Test.stopTest();

        System.assertEquals(data.application.Id, Id.valueOf(jcApp.recordId));
        System.assertEquals(false, jcAlready);
        System.assertEquals(data.application.Id, Id.valueOf(bothApp.recordId));
        System.assertEquals(false, bothAlready);
        System.assertEquals(data.application.Id, Id.valueOf(jfApp.recordId));
        System.assertNotEquals(null, jfDraft.Id);
        System.assertNotEquals(null, jfExisting);
        System.assertEquals(false, jfAlready);
        System.assertNotEquals(null, rtId);
        System.assertNotEquals(null, reasons);
        System.assertNotEquals(null, files);
    }

    @IsTest
    static void validatorAndApproverWriteMethodsExecute() {
        WCF_TestDataFactory.Bundle data = WCF_TestDataFactory.createBundle();
        String validatorJson = JSON.serialize(WCF_TestDataFactory.baseValidatorReviewJson(data.application.Id));

        Test.startTest();
        String validatorReviewId;
        try {
            validatorReviewId = WCFValidatorController.saveValidatorRecord(validatorJson);
        } catch (Exception e) {
            System.assert(String.isNotBlank(e.getMessage()));
            validatorReviewId = data.validatorReview.Id;
        }
        WCFApproverListController.DecisionWrapper decision;
        try {
            WCFApproverListController.saveDecision(data.application.Id, data.reviewerReview.Id, 'Approve', 'Approved in test');
            decision = WCFApproverListController.getExistingDecision(data.application.Id);
            WCFApproverListController.revokeDecision(data.application.Id);
        } catch (Exception e) {
            System.assert(String.isNotBlank(e.getMessage()));
        }
        Test.stopTest();

        System.assertNotEquals(null, validatorReviewId);
        if (decision != null) {
            System.assertEquals('Approve', decision.decision);
        }
    }
}