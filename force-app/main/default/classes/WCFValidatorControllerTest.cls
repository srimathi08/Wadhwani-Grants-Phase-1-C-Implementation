@IsTest
private class WCFValidatorControllerTest {

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

    private static User getPortalUser() {
        List<User> users = [
            SELECT Id, AccountId, ContactId, LastName 
            FROM User 
            WHERE ContactId != null 
            LIMIT 1
        ];
        if (!users.isEmpty()) {
            return users[0];
        }
        return [
            SELECT Id, AccountId, ContactId, LastName 
            FROM User 
            WHERE Profile.Name = 'System Administrator' AND Username LIKE 'testadmin_%' 
            LIMIT 1
        ];
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

    private static WCF_TestDataFactory.Bundle createValidBundle() {
        WCF_TestDataFactory.Bundle data = new WCF_TestDataFactory.Bundle();
        data.account = [SELECT Id FROM Account WHERE IsPersonAccount = false LIMIT 1];
        data.contact = [SELECT Id FROM Contact LIMIT 1];
        data.application = [SELECT Id, AccountId, OwnerId, PI__c, COE_Admin__c, CO_PI_Contact__c, Attesting_User_Name__c, Attesting_User_Title__c, Status FROM IndividualApplication LIMIT 1];
        List<ContentVersion> cvs = [SELECT Id FROM ContentVersion LIMIT 1];
        if (!cvs.isEmpty()) {
            data.contentVersion = cvs[0];
        }
        return data;
    }

    @IsTest
    static void readsValidatorData() {
        WCF_TestDataFactory.Bundle data = createValidBundle();
        User sysAdmin = getSysAdmin();
        
        System.runAs(sysAdmin) {
            System.assertNotEquals(null, WCFValidatorController.getApplicationDetail(data.application.Id));
            System.assertNotEquals(null, WCFValidatorController.getApplicationFields());
            System.assertNotEquals(null, WCFValidatorController.getApplicationAttachments(data.application.Id));
            if (data.contentVersion != null) {
                System.assertNotEquals(null, WCFValidatorController.getFileBase64(data.contentVersion.Id));
                System.assertNotEquals(null, WCFValidatorController.getContentDownloadUrl(data.contentVersion.Id));
            }
            System.assertNotEquals(null, WCFValidatorController.getWCFFormPreviewData(data.application.Id));
            System.assertNotEquals(null, WCFValidatorController.getWCFFullPreviewData(data.application.Id));
            System.assertNotEquals(null, WCFValidatorController.getPopulatedQuestionNumbers(data.application.Id));
            System.assertNotEquals(null, WCFValidatorController.getWCFValidatorRecordTypeIdForClient());
        }
    }

    @IsTest
    static void testGetExistingReview() {
        WCF_TestDataFactory.Bundle data = createValidBundle();
        User sysAdmin = getSysAdmin();
        
        System.runAs(sysAdmin) {
            WCFValidatorController.ReviewWrapper wrapper = WCFValidatorController.getExistingReview(data.application.Id);
            System.assertNotEquals(null, wrapper);
        }
    }

    @IsTest
    static void listAndReportMethodsExecute() {
        WCF_TestDataFactory.Bundle data = createValidBundle();
        User sysAdmin = getSysAdmin();
        
        System.runAs(sysAdmin) {
            System.assertNotEquals(null, WCFValidatorController.getApplicationList());
            System.assertNotEquals(null, WCFValidatorController.getActionCounts());
            System.assertNotEquals(null, WCFValidatorController.getValidatorPreview(20));
            System.assertNotEquals(null, WCFValidatorController.getSourceChannelReport());
        }
    }

    @IsTest
    static void savesValidatorRecord() {
        WCF_TestDataFactory.Bundle data = createValidBundle();
        User sysAdmin = getSysAdmin();

        Map<String, Object> draftPayload = WCF_TestDataFactory.baseValidatorReviewJson(data.application.Id);
        draftPayload.put('status', 'Draft');
        
        draftPayload.put('s1_1_confirm', WCF_TestDataFactory.pickValue('ApplicationReview', 'Mandatory_fields__c', 'Yes'));
        draftPayload.put('s1_2_confirm', WCF_TestDataFactory.pickValue('ApplicationReview', 'Verification_reports__c', 'Yes'));
        draftPayload.put('s1_3_confirm', WCF_TestDataFactory.pickValue('ApplicationReview', 'Attestation__c', 'Yes'));
        draftPayload.put('s2_1', WCF_TestDataFactory.pickValue('ApplicationReview', 'Geography_Within_WCF_Operating_Cluster__c', 'Yes'));
        draftPayload.put('s2_2', WCF_TestDataFactory.pickValue('ApplicationReview', 'Mandate_fitFits_Job_CreationFulfilment__c', 'Yes'));
        draftPayload.put('s2_3', WCF_TestDataFactory.pickValue('ApplicationReview', 'Blocking_concern_Blocking_Identified__c', 'No'));
        draftPayload.put('s3_3', WCF_TestDataFactory.pickValue('ApplicationReview', 'Flag_rationale_Flagging_Criteria__c', 'Flag rationale'));
        draftPayload.put('s4_1', WCF_TestDataFactory.pickValue('ApplicationReview', 'Source_Channel_Source_of_Application__c', 'WCF Direct'));
        draftPayload.put('s4_2', WCF_TestDataFactory.pickValue('ApplicationReview', 'Budget_Range_Annual_Budget_Range__c', 'Under 100K'));

        System.runAs(sysAdmin) {
            Account personAcc = [SELECT Id FROM Account WHERE IsPersonAccount = true LIMIT 1];
            update new IndividualApplication(
                Id = data.application.Id,
                AccountId = personAcc.Id
            );
        }

        System.runAs(sysAdmin) {
            try {
                String reviewId1 = WCFValidatorController.saveValidatorRecord(JSON.serialize(draftPayload));
                System.assertNotEquals(null, reviewId1);

                Map<String, Object> passPayload = WCF_TestDataFactory.baseValidatorReviewJson(data.application.Id);
                passPayload.put('Id', reviewId1);
                passPayload.put('status', 'Validated');
                passPayload.put('s3_1', 'Pass');
                passPayload.put('questionTexts', '{"1":"Q1 text","2":"Q2 text","20":"Q20 text"}');
                
                passPayload.put('s1_1_confirm', WCF_TestDataFactory.pickValue('ApplicationReview', 'Mandatory_fields__c', 'Yes'));
                passPayload.put('s1_2_confirm', WCF_TestDataFactory.pickValue('ApplicationReview', 'Verification_reports__c', 'Yes'));
                passPayload.put('s1_3_confirm', WCF_TestDataFactory.pickValue('ApplicationReview', 'Attestation__c', 'Yes'));
                passPayload.put('s2_1', WCF_TestDataFactory.pickValue('ApplicationReview', 'Geography_Within_WCF_Operating_Cluster__c', 'Yes'));
                passPayload.put('s2_2', WCF_TestDataFactory.pickValue('ApplicationReview', 'Mandate_fitFits_Job_CreationFulfilment__c', 'Yes'));
                passPayload.put('s2_3', WCF_TestDataFactory.pickValue('ApplicationReview', 'Blocking_concern_Blocking_Identified__c', 'No'));
                passPayload.put('s3_3', WCF_TestDataFactory.pickValue('ApplicationReview', 'Flag_rationale_Flagging_Criteria__c', 'Flag rationale'));
                passPayload.put('s4_1', WCF_TestDataFactory.pickValue('ApplicationReview', 'Source_Channel_Source_of_Application__c', 'WCF Direct'));
                passPayload.put('s4_2', WCF_TestDataFactory.pickValue('ApplicationReview', 'Budget_Range_Annual_Budget_Range__c', 'Under 100K'));

                String reviewId2 = WCFValidatorController.saveValidatorRecord(JSON.serialize(passPayload));
                System.assertNotEquals(null, reviewId2);
                
                Map<String, Object> returnPayload = WCF_TestDataFactory.baseValidatorReviewJson(data.application.Id);
                returnPayload.put('status', 'Validated');
                returnPayload.put('s3_1', 'Return');
                
                returnPayload.put('s1_1_confirm', WCF_TestDataFactory.pickValue('ApplicationReview', 'Mandatory_fields__c', 'Yes'));
                returnPayload.put('s1_2_confirm', WCF_TestDataFactory.pickValue('ApplicationReview', 'Verification_reports__c', 'Yes'));
                returnPayload.put('s1_3_confirm', WCF_TestDataFactory.pickValue('ApplicationReview', 'Attestation__c', 'Yes'));
                returnPayload.put('s2_1', WCF_TestDataFactory.pickValue('ApplicationReview', 'Geography_Within_WCF_Operating_Cluster__c', 'Yes'));
                returnPayload.put('s2_2', WCF_TestDataFactory.pickValue('ApplicationReview', 'Mandate_fitFits_Job_CreationFulfilment__c', 'Yes'));
                returnPayload.put('s2_3', WCF_TestDataFactory.pickValue('ApplicationReview', 'Blocking_concern_Blocking_Identified__c', 'No'));
                returnPayload.put('s3_3', WCF_TestDataFactory.pickValue('ApplicationReview', 'Flag_rationale_Flagging_Criteria__c', 'Flag rationale'));
                returnPayload.put('s4_1', WCF_TestDataFactory.pickValue('ApplicationReview', 'Source_Channel_Source_of_Application__c', 'WCF Direct'));
                returnPayload.put('s4_2', WCF_TestDataFactory.pickValue('ApplicationReview', 'Budget_Range_Annual_Budget_Range__c', 'Under 100K'));

                String reviewId3 = WCFValidatorController.saveValidatorRecord(JSON.serialize(returnPayload));
                System.assertNotEquals(null, reviewId3);
            } catch (Exception e) {
                System.assert(false, e.getMessage() + ' | Stack: ' + e.getStackTraceString());
            }
        }
    }

    @IsTest
    static void testGetPopulatedQuestionNumbersDifferentAreas() {
        WCF_TestDataFactory.Bundle data = createValidBundle();
        User u = getPortalUser();
        User sysAdmin = getSysAdmin();

        System.runAs(sysAdmin) {
            IndividualApplication appJF = WCF_TestDataFactory.createApplication(data.account.Id, data.contact.Id, 'Draft', false);
            appJF.Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only';
            appJF.Skilling_Approach__c = 'JF approach';
            appJF.Operational_Synergies_with_WOF__c = 'JF synergy';
            appJF.AccountId = u.AccountId;
            appJF.OwnerId = u.Id;
            appJF.PI__c = u.Id;
            appJF.COE_Admin__c = u.ContactId;
            appJF.CO_PI_Contact__c = u.ContactId;
            insert appJF;

            WCF_Skilling_Domain__c sd = new WCF_Skilling_Domain__c(Proposal__c = appJF.Id);
            insert sd;

            Outcomes_Data__c outcomeJF = new Outcomes_Data__c(
                Proposal__c = appJF.Id,
                Projected_Learner_Enrollments_FY_1__c = '100',
                Projected_Learner_Enrollments_CFY__c = '50'
            );
            insert outcomeJF;

            List<Integer> populatedJF = WCFValidatorController.getPopulatedQuestionNumbers(appJF.Id);
            System.assertNotEquals(null, populatedJF);
            System.assert(populatedJF.contains(1));
            System.assert(populatedJF.contains(11));
            System.assert(populatedJF.contains(12));
            System.assert(populatedJF.contains(15)); // Q24 is continuous number 15 on JF only

            IndividualApplication appBoth = WCF_TestDataFactory.createApplication(data.account.Id, data.contact.Id, 'Draft', false);
            appBoth.Organizational_Area_s_for_Funding_Inves__c = 'Both Job Fulfillment and Job Creation';
            appBoth.Operational_Synergies_with_WOF_Both__c = 'Both synergy';
            appBoth.AccountId = u.AccountId;
            appBoth.OwnerId = u.Id;
            appBoth.PI__c = u.Id;
            appBoth.COE_Admin__c = u.ContactId;
            appBoth.CO_PI_Contact__c = u.ContactId;
            insert appBoth;

            List<Integer> populatedBoth = WCFValidatorController.getPopulatedQuestionNumbers(appBoth.Id);
            System.assertNotEquals(null, populatedBoth);
            System.assert(populatedBoth.contains(1));
            System.assert(populatedBoth.contains(11));
            System.assert(populatedBoth.contains(19)); // Q24 is continuous number 19 on JF+JC
        }
    }

    @IsTest
    static void testForceExceptions() {
        try {
            WCFValidatorController.getFileBase64(null);
            System.assert(false, 'Should throw exception on null ID');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e);
        }

        try {
            WCFValidatorController.saveValidatorRecord('{}');
            System.assert(false, 'Should throw exception on empty JSON');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e);
        }
    }

    @IsTest
    static void testValidatorFormMetadata() {
        User sysAdmin = getSysAdmin();
        System.runAs(sysAdmin) {
            WCFValidatorController.ValidatorFormMetadataPayload payload = WCFValidatorController.getValidatorFormMetadata('Job Creation Only');
            System.assertNotEquals(null, payload);
            System.assertEquals(true, payload.success);
            System.assertNotEquals(null, payload.sections);
            System.assert(payload.sections.size() > 0);
        }
    }
}