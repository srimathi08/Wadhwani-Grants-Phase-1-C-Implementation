@IsTest
private class WCFApproverListControllerTest {

    @TestSetup
    static void setup() {
        // Create a dedicated test admin user instead of relying on an existing
        // org user matching a naming convention. The old query
        // (WHERE Username LIKE 'testadmin_%') happened to match a leftover /
        // seeded user in sandbox, but no such user exists in production,
        // which caused "List has no rows for assignment to SObject".
        Profile adminProfile = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1];

        User sysAdmin = new User(
            FirstName         = 'WCF',
            LastName          = 'TestAdmin',
            Alias             = 'wcfadm',
            Email             = 'wcf.test.admin@example.com',
            Username          = 'wcf.test.admin' + DateTime.now().getTime() + '@example.com',
            ProfileId         = adminProfile.Id,
            TimeZoneSidKey    = 'America/Los_Angeles',
            LocaleSidKey      = 'en_US',
            EmailEncodingKey  = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );
        insert sysAdmin;

        // ApplicationReview / IndividualApplication / ApplicationDecision are
        // standard "Grants Management" objects gated behind a Permission Set
        // License. A brand-new user only has the System Administrator PROFILE,
        // which is not enough — without this license/permission set the
        // objects are invisible to the user and any SOQL against them throws
        // "sObject type 'X' is not supported". Assign whatever permission
        // set(s) carry that license so this user can see the objects.
        //
        // NOTE: 'Grant' is a guess at the license name pattern. If this
        // finds nothing, run the diagnostic anonymous Apex below against a
        // user who can currently query these objects successfully, then
        // hardcode the exact PermissionSet.Name here instead:
        //
        //   SELECT PermissionSet.Name, PermissionSet.LicenseId
        //   FROM PermissionSetAssignment
        //   WHERE Assignee.Profile.Name = 'System Administrator'
        Set<Id> grantLicenseIds = new Set<Id>();
        for (PermissionSetLicense psl : [
            SELECT Id
            FROM PermissionSetLicense
            WHERE MasterLabel LIKE '%Grant%'
        ]) {
            grantLicenseIds.add(psl.Id);
        }

        List<PermissionSet> grantsPermSets = [
            SELECT Id, Name
            FROM PermissionSet
            WHERE LicenseId IN :grantLicenseIds
               OR Name LIKE '%Grant%'
        ];
        if (!grantsPermSets.isEmpty()) {
            List<PermissionSetAssignment> assignments = new List<PermissionSetAssignment>();
            for (PermissionSet ps : grantsPermSets) {
                assignments.add(new PermissionSetAssignment(
                    AssigneeId       = sysAdmin.Id,
                    PermissionSetId  = ps.Id
                ));
            }
            // Partial success: some Grants-related permission sets (e.g. the
            // "Experience Cloud for Grantmaking" one) carry a license scoped
            // to portal/Experience Cloud users and can NEVER be assigned to
            // an internal Salesforce user, regardless of profile. Assign
            // whichever ones ARE compatible and skip the rest rather than
            // failing the whole insert.
            Database.insert(assignments, false);
        }

        System.runAs(sysAdmin) {
            WCF_TestDataFactory.createBundle();

            Id personAccountRecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('Reviewer').getRecordTypeId();
            Account reviewerAccount = new Account(
                RecordTypeId    = personAccountRecordTypeId,
                LastName        = 'TestReviewerAccount',
                WCF_Reviewer__c = true,
                PersonEmail     = 'reviewer@example.com'
            );
            insert reviewerAccount;
        }
    }

    private static User getSysAdmin() {
        // Match the fixed prefix used above. This is reliable because no
        // real org data will ever use this synthetic username.
        return [
            SELECT Id
            FROM User
            WHERE Username LIKE 'wcf.test.admin%'
            LIMIT 1
        ];
    }

    @IsTest
    static void testApproverFlows() {
        User sysAdmin = getSysAdmin();
        IndividualApplication app = [SELECT Id, Status, AccountId, OwnerId FROM IndividualApplication LIMIT 1];
        Account personAcc = [SELECT Id FROM Account WHERE IsPersonAccount = true LIMIT 1];

        System.runAs(sysAdmin) {
            Id proposalRtId = Schema.SObjectType.IndividualApplication.getRecordTypeInfosByDeveloperName().get('WCF_Job_Creation_Proposals').getRecordTypeId();
            app.RecordTypeId = proposalRtId;
            app.AccountId = personAcc.Id;
            app.Status = 'Under Review';
            update app;

            // Update the existing test review to Submitted
            ApplicationReview review = [SELECT Id, Status FROM ApplicationReview LIMIT 1];
            review.Status = 'Review Submitted';
            review.Recommend_for_CEO_review__c = WCF_TestDataFactory.pickValue('ApplicationReview', 'Recommend_for_CEO_review__c', 'Recommend');
            update review;

            // Fetch Approver Queue and Count
            System.assertNotEquals(null, WCFApproverListController.getApproverQueue());
            System.assert(WCFApproverListController.getApproverQueueCount() >= 0);

            // Fetch Options
            System.assertNotEquals(null, WCFApproverListController.getApproverRejectionReasonOptions());

            // Fetch Comment
            System.assertEquals(null, WCFApproverListController.getReviewerCommentForApprover(app.Id));

            // Fetch Summary
            System.assertNotEquals(null, WCFApproverListController.getApproverSummary());

            // Get Review Data
            System.assertNotEquals(null, WCFApproverListController.getReviewData(review.Id));

            // Test Save Decision - Decline
            WCFApproverListController.saveDecision(app.Id, review.Id, 'Decline', 'Declined comment', null);
            System.assertNotEquals(null, WCFApproverListController.getExistingDecision(app.Id));

            // Test Revoke Decision (within 7 days)
            WCFApproverListController.revokeDecision(app.Id);

            // Test Save Decision - Return
            String validRejectionReason = WCF_TestDataFactory.pickValue('ApplicationDecision', 'Rejection_Reasons__c', 'Other');
            WCFApproverListController.saveDecision(app.Id, review.Id, 'Return', 'Need more info', validRejectionReason);

            // Fetch Existing Decision (will test Returned and Approved with Resubmission)
            System.assertNotEquals(null, WCFApproverListController.getExistingDecision(app.Id));

            // Change application status to verify closed loop branch in getExistingDecision
            app.Status = 'Under Review';
            update app;
            System.assertNotEquals(null, WCFApproverListController.getExistingDecision(app.Id));
        }
    }

    @IsTest
    static void testApproverErrors() {
        User sysAdmin = getSysAdmin();
        IndividualApplication app = [SELECT Id FROM IndividualApplication LIMIT 1];

        System.runAs(sysAdmin) {
            // Null getExistingDecision
            System.assertEquals(null, WCFApproverListController.getExistingDecision(app.Id));

            // Revoke exception
            try {
                WCFApproverListController.revokeDecision(app.Id);
                System.assert(false, 'Should throw error when no decision exists');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e);
            }

            // Save decision validation exceptions
            try {
                WCFApproverListController.saveDecision(app.Id, null, 'Conditionally Approve', null, null);
                System.assert(false, 'Should throw error when comment is empty');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e);
            }

            try {
                WCFApproverListController.saveDecision(app.Id, null, 'Return', 'Some comment', null);
                System.assert(false, 'Should throw error when rejection reasons is empty');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e);
            }
        }
    }
}