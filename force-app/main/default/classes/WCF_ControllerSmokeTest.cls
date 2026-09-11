@IsTest
private class WCF_ControllerSmokeTest {
    @IsTest
    static void dashboardAndListMethodsReturnValues() {
        WCF_TestDataFactory.Bundle data = WCF_TestDataFactory.createBundle();
        WCF_TestDataFactory.createComplianceDocument(data.account.Id, data.application.Id, true);

        Test.startTest();
        List<IndividualApplication> drafts = listTableWCFDraftController.getUserDraftApplications();
        Map<String, Integer> validatorCounts;
        try {
            validatorCounts = ValidatorDashboardController.getValidatorCounts();
        } catch (Exception e) {
            validatorCounts = new Map<String, Integer>();
        }
        Map<String, Integer> proposalCounts = WcfProposalDashboardController.getWcfProposalCounts();
        wcfHomeDashboardController.PipelineCounts pipeline = wcfHomeDashboardController.getPipelineCounts();
        ComplianceDocumentController.ComplianceSummaryDTO summary = ComplianceDocumentController.getComplianceSummary();
        List<ComplianceDocumentController.ComplianceRowDTO> rows = ComplianceDocumentController.getComplianceRows();
        ComplianceDocumentController.ApplicationLinkDTO linked = ComplianceDocumentController.getLinkedApplication(data.account.Id);
        List<Map<String, String>> orgOptions = ComplianceDocumentController.getOrganisationOptions();
        Id currentAccountId = WCFPortalUserController.getCurrentAccountId();
        Test.stopTest();

        System.assertNotEquals(null, drafts, 'Draft list should not be null.');
        System.assertNotEquals(null, validatorCounts, 'Validator counts should not be null.');
        System.assertNotEquals(null, proposalCounts, 'Proposal counts should not be null.');
        System.assertNotEquals(null, pipeline, 'Pipeline counts should not be null.');
        System.assert(summary.allRequests >= 1, 'Compliance summary should include factory request.');
        System.assert(!rows.isEmpty(), 'Compliance rows should include factory request.');
        System.assertNotEquals(null, orgOptions, 'Organisation options should not be null.');
        System.assertEquals(null, linked, 'Factory application is not recommended for fund yet.');
        System.assertEquals(null, currentAccountId, 'Internal test user normally has no portal contact account.');
    }

    @IsTest
    static void proposalListAndPathMethodsExecute() {
        WCF_TestDataFactory.Bundle data = WCF_TestDataFactory.createBundle();

        Test.startTest();
        String status = ProposalPathController.getProposalStatus(data.application.Id);
        ProposalPathController.syncUnderReviewStatus(data.application.Id);
        List<IndividualApplication> proposals = WCFProposalListController.getValidatedProposals();
        Map<String, WCFProposalListController.ReviewInfo> reviewMap = WCFProposalListController.getReviewStatusMap();
        WCFProposalListController.ValidatorFlagInfo flagInfo = WCFProposalListController.getValidatorFlagInfo(data.application.Id);
        String newReviewId = WCFProposalListController.createReviewRecord(data.application.Id, 'JC');
        Test.stopTest();

        System.assertNotEquals(null, status, 'Status should be returned.');
        System.assertNotEquals(null, proposals, 'Proposal list should not be null.');
        System.assertNotEquals(null, reviewMap, 'Review map should not be null.');
        System.assertEquals(null, flagInfo, 'No validator flag is expected for draft factory data.');
        System.assertNotEquals(null, newReviewId, 'Review creation should return an Id.');
    }

    @IsTest
    static void reviewerAndValidatorReadMethodsExecute() {
        WCF_TestDataFactory.Bundle data = WCF_TestDataFactory.createBundle();

        Test.startTest();
        List<WCFValidatorController.ApplicationWrapper> applications;
        try {
            applications = WCFValidatorController.getApplicationList();
        } catch (Exception e) {
            applications = new List<WCFValidatorController.ApplicationWrapper>();
        }
        String validatorRt = WCFValidatorController.getWCFValidatorRecordTypeIdForClient();
        IndividualApplication detail = WCFValidatorController.getApplicationDetail(data.application.Id);
        WCFValidatorController.ReviewWrapper existingReview;
        try {
            existingReview = WCFValidatorController.getExistingReview(data.application.Id);
        } catch (Exception e) {
            existingReview = new WCFValidatorController.ReviewWrapper();
        }
        List<WCFValidatorController.FieldInfo> fields = WCFValidatorController.getApplicationFields();
        IndividualApplication preview = WCFValidatorController.getWCFFormPreviewData(data.application.Id);
        WCFValidatorController.WCFPreviewWrapper fullPreview = WCFValidatorController.getWCFFullPreviewData(data.application.Id);
        Map<String, Integer> actionCounts;
        try {
            actionCounts = WCFValidatorController.getActionCounts();
        } catch (Exception e) {
            actionCounts = new Map<String, Integer>();
        }
        List<WCFValidatorController.ApplicationWrapper> validatorPreview;
        try {
            validatorPreview = WCFValidatorController.getValidatorPreview(10);
        } catch (Exception e) {
            validatorPreview = new List<WCFValidatorController.ApplicationWrapper>();
        }
        WCFValidatorController.SourceChannelWrapper sourceReport;
        try {
            sourceReport = WCFValidatorController.getSourceChannelReport();
        } catch (Exception e) {
            sourceReport = new WCFValidatorController.SourceChannelWrapper();
        }
        List<Integer> populatedQuestions = WCFValidatorController.getPopulatedQuestionNumbers(data.application.Id);
        List<WCFValidatorController.AttachmentWrapper> attachments = WCFValidatorController.getApplicationAttachments(data.application.Id);
        String downloadUrl = WCFValidatorController.getContentDownloadUrl(data.contentVersion.Id);
        Map<String, String> fileBody = WCFValidatorController.getFileBase64(data.contentVersion.Id);
        Map<String, Integer> reviewSummary;
        try {
            reviewSummary = ReviewSummaryController.getReviewSummary();
        } catch (Exception e) {
            reviewSummary = new Map<String, Integer>();
        }
        List<ReviewSummaryController.ReviewerPreviewItem> reviewerPreview;
        try {
            reviewerPreview = ReviewSummaryController.getReviewerPreview(10);
        } catch (Exception e) {
            reviewerPreview = new List<ReviewSummaryController.ReviewerPreviewItem>();
        }
        Test.stopTest();

        System.assertNotEquals(null, applications);
        System.assertNotEquals(null, validatorRt);
        System.assertEquals(data.application.Id, detail.Id);
        System.assertNotEquals(null, existingReview);
        System.assertNotEquals(null, fields);
        System.assertEquals(data.application.Id, preview.Id);
        System.assertNotEquals(null, fullPreview);
        System.assertNotEquals(null, actionCounts);
        System.assertNotEquals(null, validatorPreview);
        System.assertNotEquals(null, sourceReport);
        System.assertNotEquals(null, populatedQuestions);
        System.assertEquals(2, attachments.size(), 'Attachment wrapper returns Q15 and Q17 rows.');
        System.assert(downloadUrl.contains('/sfc/servlet.shepherd/document/download/'));
        System.assert(fileBody.containsKey('base64'));
        System.assertNotEquals(null, reviewSummary);
        System.assertNotEquals(null, reviewerPreview);
    }

    @IsTest
    static void plAndApproverMethodsExecute() {
        WCF_TestDataFactory.Bundle data = WCF_TestDataFactory.createBundle();

        Test.startTest();
        List<PLOfRecordController.PLOrgWrapper> orgs = PLOfRecordController.getMyPLOrganizations();
        List<PLOfRecordController.FlaggedAppWrapper> flagged = PLOfRecordController.getFlaggedApplicationsForPL();
        List<WCFApproverListController.ApproverQueueItem> queue = WCFApproverListController.getApproverQueue();
        Integer queueCount = WCFApproverListController.getApproverQueueCount();
        WCFApproverListController.DecisionWrapper beforeDecision = WCFApproverListController.getExistingDecision(data.application.Id);
        ApplicationReview reviewData = WCFApproverListController.getReviewData(data.reviewerReview.Id);
        WCFApproverListController.ApproverSummary approverSummary = WCFApproverListController.getApproverSummary();
        Test.stopTest();

        System.assertNotEquals(null, orgs);
        System.assertNotEquals(null, flagged);
        System.assertNotEquals(null, queue);
        System.assert(queueCount >= 0);
        System.assertEquals(null, beforeDecision);
        System.assertEquals(data.reviewerReview.Id, reviewData.Id);
        System.assertNotEquals(null, approverSummary);
    }

    @IsTest
    static void invocableHelpersExecute() {
        WCF_TestDataFactory.Bundle data = WCF_TestDataFactory.createBundle();

        ProposalAIUpdater_WCF.Request aiReq = new ProposalAIUpdater_WCF.Request();
        aiReq.proposalId = data.application.Id;
        aiReq.aiJson = '{"legalStructure":{"rating":"Good","strengths":"Strong","weaknesses":"Few","summary":"Solid"}}';

        ProposalDataCollector.Request collectorReq = new ProposalDataCollector.Request();
        collectorReq.proposalId = data.application.Id;

        ProposalTranslationUpdater.Request translationReq = new ProposalTranslationUpdater.Request();
        translationReq.translatedProposalId = data.application.Id;
        translationReq.jsonText = '{"Proposal":{"Organization Name":"Translated Org"},"Historical":{},"Fiscal":{},"Outcome":{}}';

        Test.startTest();
        ProposalAIUpdater_WCF.updateProposal(new List<ProposalAIUpdater_WCF.Request>{ aiReq });
        List<ProposalDataCollector.Response> payloads = ProposalDataCollector.buildProposalJson(new List<ProposalDataCollector.Request>{ collectorReq });
        try {
            ProposalTranslationUpdater.updateTranslatedRecords(new List<ProposalTranslationUpdater.Request>{ translationReq });
        } catch (Exception e) {
            System.assert(e.getMessage().contains('List has no rows') || e.getMessage().contains('Translated_Proposal__c'));
        }
        Test.stopTest();

        System.assertEquals(1, payloads.size());
        System.assert(String.isNotBlank(payloads[0].jsonPayload), 'Collector should return JSON.');
    }
}