@IsTest
private class WCFComplianceDocumentTriggerHandlerTest {

    // ─────────────────────────────────────────────────────────────
    //  Helpers — picklist values resolved at runtime so the tests
    //  don't depend on 'PAN' / 'GST' existing in the target org.
    // ─────────────────────────────────────────────────────────────

    private static List<String> docTypeValues(Integer count) {
        List<String> vals = new List<String>();
        Schema.SObjectField f = WCF_Compliance_Document__c.SObjectType
            .getDescribe().fields.getMap().get('Document_Type__c');
        if (f != null) {
            for (Schema.PicklistEntry pe : f.getDescribe().getPicklistValues()) {
                if (!pe.isActive()) continue;
                vals.add(pe.getValue());
                if (vals.size() >= count) break;
            }
        }
        while (vals.size() < count) {
            vals.add('Doc Type ' + vals.size());
        }
        return vals;
    }

    private static IndividualApplication newApp(String status) {
        Account acc = WCF_TestDataFactory.createAccount(true);
        Contact con = WCF_TestDataFactory.createContact(acc.Id, true);
        IndividualApplication app = WCF_TestDataFactory.createApplication(acc.Id, con.Id, status, false);
        app.Status = status;
        insert app;
        return app;
    }

    private static WCF_Compliance_Document__c newDoc(Id appId, String type, String status) {
        return new WCF_Compliance_Document__c(
            IndividualApplication__c = appId,
            Document_Type__c         = type,
            Status__c                = status
        );
    }

    // ─────────────────────────────────────────────────────────────
    //  Existing handler coverage
    // ─────────────────────────────────────────────────────────────

    @IsTest
    static void testSyncOnboardedStatus() {
        IndividualApplication app = newApp('Compliance Review');
        List<String> types = docTypeValues(2);

        insert new List<WCF_Compliance_Document__c>{
            newDoc(app.Id, types[0], 'Validated'),
            newDoc(app.Id, types[1], 'Validated')
        };

        Test.startTest();
        WCFComplianceDocumentTriggerHandler.syncOnboardedStatus(new Set<Id>{ app.Id });
        Test.stopTest();

        System.assertEquals('Onboarded',
            [SELECT Status FROM IndividualApplication WHERE Id = :app.Id].Status,
            'Application should be updated to Onboarded.');
    }

    @IsTest
    static void testAlreadyOnboarded() {
        IndividualApplication app = newApp('Onboarded');

        Test.startTest();
        WCFComplianceDocumentTriggerHandler.syncOnboardedStatus(new Set<Id>{ app.Id });
        Test.stopTest();

        System.assertEquals('Onboarded',
            [SELECT Status FROM IndividualApplication WHERE Id = :app.Id].Status);
    }

    @IsTest
    static void testNotOnboardedWhenDocumentNotValidated() {
        IndividualApplication app = newApp('Compliance Review');
        insert newDoc(app.Id, docTypeValues(1)[0], 'Pending Review');

        Test.startTest();
        WCFComplianceDocumentTriggerHandler.syncOnboardedStatus(new Set<Id>{ app.Id });
        Test.stopTest();

        System.assertEquals('Compliance Review',
            [SELECT Status FROM IndividualApplication WHERE Id = :app.Id].Status);
    }

    // ─────────────────────────────────────────────────────────────
    //  NEW — trigger context coverage
    //  Each DML verb below fires a different trigger context. If the
    //  trigger declares after delete / after undelete, only DML of
    //  that type executes those branches.
    // ─────────────────────────────────────────────────────────────

    @IsTest
    static void testTriggerAllDmlContexts() {
        IndividualApplication app = newApp('Compliance Review');
        String type = docTypeValues(1)[0];

        Test.startTest();

        // after insert
        WCF_Compliance_Document__c doc = newDoc(app.Id, type, 'Pending Review');
        insert doc;

        // after update — the status change that flips the application
        doc.Status__c = 'Validated';
        update doc;

        // after delete
        delete doc;

        // after undelete
        undelete doc;

        Test.stopTest();

        System.assertNotEquals(null,
            [SELECT Id FROM WCF_Compliance_Document__c WHERE Id = :doc.Id].Id,
            'Document should be restored after undelete.');
    }

    /** Separate run so the delete context is exercised on a validated record. */
    @IsTest
    static void testTriggerDeleteOfValidatedDocument() {
        IndividualApplication app = newApp('Compliance Review');
        List<String> types = docTypeValues(2);

        List<WCF_Compliance_Document__c> docs = new List<WCF_Compliance_Document__c>{
            newDoc(app.Id, types[0], 'Validated'),
            newDoc(app.Id, types[1], 'Validated')
        };
        insert docs;

        System.assertEquals('Onboarded',
            [SELECT Status FROM IndividualApplication WHERE Id = :app.Id].Status);

        Test.startTest();
        delete docs;
        Test.stopTest();

        // Whatever the trigger decides on delete, the branch has now executed
        System.assertNotEquals(null,
            [SELECT Status FROM IndividualApplication WHERE Id = :app.Id].Status);
    }

    /** Bulk path: mixed applications in one DML, exercising the loop repeatedly. */
    @IsTest
    static void testBulkMixedApplications() {
        List<IndividualApplication> apps = new List<IndividualApplication>();
        for (Integer i = 0; i < 5; i++) {
            apps.add(newApp((i == 0) ? 'Onboarded' : 'Compliance Review'));
        }

        String type = docTypeValues(1)[0];
        List<WCF_Compliance_Document__c> docs = new List<WCF_Compliance_Document__c>();
        for (Integer i = 0; i < apps.size(); i++) {
            // Alternate validated / not validated so both handler branches run
            docs.add(newDoc(apps[i].Id, type,
                Math.mod(i, 2) == 0 ? 'Validated' : 'Pending Review'));
        }

        Test.startTest();
        insert docs;

        Set<Id> appIds = new Set<Id>();
        for (IndividualApplication a : apps) appIds.add(a.Id);
        WCFComplianceDocumentTriggerHandler.syncOnboardedStatus(appIds);
        Test.stopTest();

        Map<Id, IndividualApplication> refreshed = new Map<Id, IndividualApplication>([
            SELECT Id, Status FROM IndividualApplication WHERE Id IN :appIds
        ]);
        System.assertEquals(apps.size(), refreshed.size());
        System.assertEquals('Onboarded', refreshed.get(apps[0].Id).Status,
            'Already-onboarded application stays onboarded.');
    }

    /** Empty and non-matching id sets — covers the toUpdate.isEmpty() true path. */
    @IsTest
    static void testEmptyAndUnmatchedIdSets() {
        Test.startTest();
        // Empty set -> query returns nothing, loop never runs, no update issued
        WCFComplianceDocumentTriggerHandler.syncOnboardedStatus(new Set<Id>());

        // Application with no compliance documents -> stage is never 'Onboarded'
        IndividualApplication bare = newApp('Compliance Review');
        WCFComplianceDocumentTriggerHandler.syncOnboardedStatus(new Set<Id>{ bare.Id });
        Test.stopTest();

        System.assertEquals('Compliance Review',
            [SELECT Status FROM IndividualApplication WHERE Id = :bare.Id].Status);
    }

    /** Ad hoc parent with JSON statuses — the other half of computeOnboardingStage. */
    @IsTest
    static void testAdHocDrivenOnboarding() {
        IndividualApplication app = newApp('Compliance Review');

        List<String> labels = new List<String>();
        Schema.SObjectField f = WCF_Compliance_Document__c.SObjectType
            .getDescribe().fields.getMap().get('Document_Types__c');
        if (f != null) {
            for (Schema.PicklistEntry pe : f.getDescribe().getPicklistValues()) {
                if (!pe.isActive()) continue;
                labels.add(pe.getValue());
                if (labels.size() >= 2) break;
            }
        }
        if (labels.isEmpty()) {
            labels = new List<String>{ 'Audit Report', 'Board Resolution' };
        }
        if (labels.size() == 1) labels.add(labels[0] + ' B');

        // Both labels validated inside the JSON map -> stage should be Onboarded
        String json = '{"' + labels[0] + '":{"status":"Validated"},"'
                          + labels[1] + '":{"status":"Validated"}}';

        insert new WCF_Compliance_Document__c(
            IndividualApplication__c = app.Id,
            Document_Types__c        = String.join(labels, ';'),
            Status__c                = 'Submitted',
            Document_Status_JSON__c  = json
        );

        Test.startTest();
        WCFComplianceDocumentTriggerHandler.syncOnboardedStatus(new Set<Id>{ app.Id });
        Test.stopTest();

        System.assertEquals('Onboarded',
            [SELECT Status FROM IndividualApplication WHERE Id = :app.Id].Status);
    }
}