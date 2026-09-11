@IsTest
public class WinProjectProposalFormControllerTest {

    private static final String PI_USERNAME  = 'win.pi.user@example.com.wintest';
    private static final String COE_USERNAME = 'win.coe.user@example.com.wintest';

    // ─────────────────────────────────────────────────────────────
    //  TEST SETUP
    // ─────────────────────────────────────────────────────────────
    @TestSetup
    static void setupData() {

        Account acc = new Account(Name = 'Draft Test Institution');
        insert acc;

        // ── Fix for CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY, record type missing ──
        // In orgs with multiple active Contact Record Types, the deploying/running
        // user's profile may have no default Record Type set for Contact, causing
        // insert to fail. Resolve an active Record Type dynamically and assign it
        // explicitly so this test is portable across sandboxes and production.
        Id contactRTId = getDefaultContactRecordTypeId();

        Contact piContact = new Contact(
            FirstName = 'PI',
            LastName  = 'Admin',
            Email     = 'admin@example.com',
            AccountId = acc.Id
        );

        Contact coeContact = new Contact(
            FirstName     = 'COE',
            LastName      = 'Admincoe',
            Email         = 'coeadmin@example.com',
            COE_Admin__c  = true,
            AccountId     = acc.Id
        );

        if (contactRTId != null) {
            piContact.RecordTypeId  = contactRTId;
            coeContact.RecordTypeId = contactRTId;
        }

        insert new List<Contact>{ piContact, coeContact };

        // Funding Opportunity inserted BEFORE the User DML to avoid MIXED_DML_OPERATION
        insert new FundingOpportunity(
            Name       = 'Active FO',
            Status     = 'Active',
            FO_Type__c = 'Project Proposal'
        );

        Profile p = [SELECT Id FROM Profile WHERE Name = 'COE User Profile' LIMIT 1];

        User piUser = new User(
            FirstName         = 'Draft',
            LastName          = 'User',
            Username          = PI_USERNAME,
            Email             = 'draftuser@example.com',
            Alias             = 'duser',
            CommunityNickname = 'duser01',
            ProfileId         = p.Id,
            TimeZoneSidKey    = 'America/Los_Angeles',
            LocaleSidKey      = 'en_US',
            EmailEncodingKey  = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId         = piContact.Id
        );

        // A User tied to the COE_Admin__c contact so the COE_Approver__c
        // auto-assignment branch is exercised instead of falling through.
        User coeUser = new User(
            FirstName         = 'Coe',
            LastName          = 'Approver',
            Username          = COE_USERNAME,
            Email             = 'coeuser@example.com',
            Alias             = 'cuser',
            CommunityNickname = 'cuser01',
            ProfileId         = p.Id,
            TimeZoneSidKey    = 'America/Los_Angeles',
            LocaleSidKey      = 'en_US',
            EmailEncodingKey  = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId         = coeContact.Id
        );

        System.runAs(new User(Id = UserInfo.getUserId())) {
            insert new List<User>{ piUser, coeUser };
        }
    }

    /**
     * Returns an active Record Type Id for Contact, if the org has any defined.
     * Returns null when Contact only has the implicit Master record type
     * (i.e. no rows in RecordType for Contact), so callers can skip assignment
     * without breaking orgs that don't use Contact record types at all.
     */
    private static Id getDefaultContactRecordTypeId() {
        List<RecordType> rts = [
            SELECT Id
            FROM RecordType
            WHERE SObjectType = 'Contact' AND IsActive = true
            ORDER BY CreatedDate ASC
            LIMIT 1
        ];
        return rts.isEmpty() ? null : rts[0].Id;
    }

    // ─────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────
    private static User portalUser() {
        return [
            SELECT Id, ContactId, AccountId
            FROM User
            WHERE Username = :PI_USERNAME
            LIMIT 1
        ];
    }

    private static Id recordTypeId() {
        return WinProjectProposalFormController.getIndividualApplicationRecordTypeId();
    }

    /**
     * getDraftApplication() builds applicationData from Schema fields.getMap().keySet(),
     * whose keys are NOT guaranteed to keep the declared API-name casing. A plain
     * Map<String,Object>.get() is case-sensitive, so we look the value up leniently here.
     */
    private static Object valueOfField(Map<String, Object> data, String apiName) {
        if (data == null) {
            return null;
        }
        for (String k : data.keySet()) {
            if (k.equalsIgnoreCase(apiName)) {
                return data.get(k);
            }
        }
        return null;
    }

    private static Boolean fieldExists(String apiName) {
        return Schema.SObjectType.IndividualApplication.fields.getMap().containsKey(apiName);
    }

    private static Map<String, Object> buildAppData(String title) {
        return new Map<String, Object>{
            'Project_Title__c'                      => title,
            'PI_Email__c'                           => 'pi@draft.com',
            'PI_Name__c'                            => 'Dr Draft',
            'PI_Phone__c'                           => '1111111',
            'PI_Designation__c'                     => 'Scientist',
            'RecordTypeId'                          => String.valueOf(recordTypeId()),
            'Status'                                => 'Draft',
            'Category'                              => 'Grant Application',
            'ApplicationType'                       => 'WIN Project Proposal',
            'Target_Market_Industry_Application__c' => 'HealthTech',
            'Project_Start_Date__c'                 => String.valueOf(Date.today()),
            'Project_End_Date__c'                   => String.valueOf(Date.today().addMonths(3))
        };
    }

    private static List<Map<String, Object>> buildMilestones(String description) {
        return new List<Map<String, Object>>{
            new Map<String, Object>{
                'Milestone_Description__c'           => description,
                'Budget_Required__c'                 => 3000,
                'Budget_Required_INR__c'             => 15000,
                'Project_Start_Date__c'              => String.valueOf(Date.today()),
                'Project_End_Date__c'                => String.valueOf(Date.today().addMonths(1)),
                'Installment_of_Funds_1__c'          => 'Instalment 1 - 30%',
                'Installment_of_Funds_2__c'          => 'Instalment 2 - 30%',
                'Installment_of_Funds_3__c'          => 'Instalment 3 - 30%',
                'Installment_of_Funds_4__c'          => 'Instalment 4 - 10%',
                'Output_and_Deliverables__c'         => 'Sample',
                'Activities_under_this_Milestone__c' => 'Sample 1',
                'Status__c'                          => 'Draft'
            },
            // all-blank row: exercises the "skip empty row" branch
            new Map<String, Object>{
                'Milestone_Description__c' => '',
                'Output_and_Deliverables__c' => ''
            }
        };
    }

    private static List<Map<String, Object>> buildBudgets(String name) {
        return new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name'                => name,
                'Total_Amount__c'     => 800,
                'Total_Amount_INR__c' => 100,
                'Justification__c'    => 'Equipments',
                'Status'              => 'Draft'
            },
            new Map<String, Object>{
                'Name'             => '',
                'Justification__c' => ''
            }
        };
    }

    private static List<Map<String, Object>> buildCoFounders(String name) {
        return new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name'            => name,
                'Designation__c'  => 'CTO',
                'Institution__c'  => 'Draft Test Institution',
                'Mobile__c'       => '9876543210',
                'Email__c'        => 'cofounder@example.com'
            },
            new Map<String, Object>{
                'Name'           => '',
                'Designation__c' => ''
            }
        };
    }

    // ─────────────────────────────────────────────────────────────
    //  SIMPLE READ METHODS
    // ─────────────────────────────────────────────────────────────
    @IsTest
    static void testGetLoggedInUserDetails() {
        System.runAs(portalUser()) {
            Test.startTest();
            Map<String, String> res = WinProjectProposalFormController.getLoggedInUserDetails();
            Test.stopTest();

            System.assertNotEquals(null, res, 'User details map should not be null');
            System.assertNotEquals(null, res.get('UserId'), 'UserId should be populated');
            System.assertEquals('User', res.get('LastName'), 'LastName should match the test user');
        }
    }

    @IsTest
    static void testGetActiveFundingOpportunityId() {
        Test.startTest();
        Id foId = WinProjectProposalFormController.getActiveFundingOpportunityId();
        Test.stopTest();

        System.assertNotEquals(null, foId, 'An active Funding Opportunity should be found');
    }

    @IsTest
    static void testGetActiveFundingOpportunityIdNoRecord() {
        delete [SELECT Id FROM FundingOpportunity];

        Boolean thrown = false;
        Test.startTest();
        try {
            WinProjectProposalFormController.getActiveFundingOpportunityId();
        } catch (Exception e) {
            thrown = true;
        }
        Test.stopTest();

        System.assert(thrown, 'An exception is expected when no active FO exists');
    }

    @IsTest
    static void testGetIndividualApplicationRecordTypeId() {
        Test.startTest();
        Id rtId = WinProjectProposalFormController.getIndividualApplicationRecordTypeId();
        Test.stopTest();

        System.assertNotEquals(null, rtId, 'RFP_Applicants record type should resolve');
    }

    // ─────────────────────────────────────────────────────────────
    //  DRAFT SAVE + RE-SAVE (dedupe branches) + DRAFT READ
    // ─────────────────────────────────────────────────────────────
    @IsTest
    static void testSaveDraftAndGetDraft() {
        System.runAs(portalUser()) {

            Id rtId = recordTypeId();

            Test.startTest();

            // 1) First save → creates parent + children
            WinProjectProposalFormController.SaveDraftResponse draftResponse =
                WinProjectProposalFormController.saveDraftApplication(
                    null,
                    buildAppData('Draft App'),
                    buildMilestones('Planning'),
                    buildBudgets('Infra'),
                    buildCoFounders('Co Founder One'),
                    rtId,
                    'Grant Application'
                );

            Id draftId = draftResponse.applicationId;

            // 2) Second save with the SAME names → hits the dedupe/update branches
            Map<String, Object> appDataUpdate = buildAppData('Draft App Updated');
            WinProjectProposalFormController.SaveDraftResponse secondResponse =
                WinProjectProposalFormController.saveDraftApplication(
                    draftId,
                    appDataUpdate,
                    buildMilestones('Planning'),
                    buildBudgets('Infra'),
                    buildCoFounders('Co Founder One'),
                    rtId,
                    'Grant Application'
                );

            // 3) Read the draft back
            WinProjectProposalFormController.DraftWrapper draftWrap =
                WinProjectProposalFormController.getDraftApplication(draftId);

            Test.stopTest();

            System.assertNotEquals(null, draftId, 'Draft application Id should not be null');
            System.assertEquals(draftId, secondResponse.applicationId, 'Re-save should update the same record');

            System.assertNotEquals(null, draftResponse.savedMilestones, 'savedMilestones should not be null');
            System.assertEquals(1, draftResponse.savedMilestones.size(), 'One milestone should be saved');
            System.assertEquals('Planning', draftResponse.savedMilestones[0].Milestone_Description__c,
                'Milestone description should match');
            System.assertEquals(3000, draftResponse.savedMilestones[0].Budget_Required__c,
                'Milestone budget should match');

            System.assertEquals(1, draftResponse.savedBudgets.size(), 'One budget should be saved');
            System.assertEquals(1, secondResponse.savedMilestones.size(),
                'Re-save must reuse the milestone, not duplicate it');
            System.assertEquals(1, secondResponse.savedBudgets.size(),
                'Re-save must reuse the budget, not duplicate it');

            System.assertNotEquals(null, draftWrap, 'DraftWrapper should not be null');
            System.assertEquals(draftId, draftWrap.Id, 'Wrapper should carry the draft Id');
            System.assert(!draftWrap.applicationData.isEmpty(), 'applicationData should be populated');
            System.assertNotEquals(null, valueOfField(draftWrap.applicationData, 'AccountName'),
                'AccountName should be resolved from AccountId');

            if (fieldExists('Project_Title__c')) {
                System.assertEquals('Draft App Updated',
                    valueOfField(draftWrap.applicationData, 'Project_Title__c'),
                    'Project title should reflect the latest save');

                // Same check straight off the record, independent of map-key casing
                IndividualApplication onRecord = [
                    SELECT Project_Title__c FROM IndividualApplication WHERE Id = :draftId LIMIT 1
                ];
                System.assertEquals('Draft App Updated', onRecord.Project_Title__c,
                    'Project title should be persisted on the record');
            }
            System.assertEquals(1, draftWrap.milestones.size(), 'One milestone expected in wrapper');
            System.assertEquals(1, draftWrap.budgets.size(), 'One budget expected in wrapper');
            System.assertEquals(1, draftWrap.coFounders.size(), 'One co-founder expected in wrapper');
        }
    }

    @IsTest
    static void testSaveDraftWithNullChildCollections() {
        System.runAs(portalUser()) {
            Test.startTest();
            WinProjectProposalFormController.SaveDraftResponse res =
                WinProjectProposalFormController.saveDraftApplication(
                    null,
                    buildAppData('No Children Draft'),
                    null,
                    null,
                    null,
                    recordTypeId(),
                    'Grant Application'
                );
            Test.stopTest();

            System.assertNotEquals(null, res.applicationId, 'Application should still be created');
            System.assertEquals(0, res.savedMilestones.size(), 'No milestones expected');
            System.assertEquals(0, res.savedBudgets.size(), 'No budgets expected');
        }
    }

    @IsTest
    static void testSaveDraftApplicationFailure() {
        System.runAs(portalUser()) {
            // Non-existent Id forces the SOQL in the try-block to fail → catch branch
            Id fakeId = IndividualApplication.SObjectType.getDescribe().getKeyPrefix() + '000000000AAA';

            Boolean thrown = false;
            Test.startTest();
            try {
                WinProjectProposalFormController.saveDraftApplication(
                    fakeId,
                    buildAppData('Bad Draft'),
                    buildMilestones('X'),
                    buildBudgets('Y'),
                    buildCoFounders('Z'),
                    recordTypeId(),
                    'Grant Application'
                );
            } catch (Exception e) {
                thrown = true;
            }
            Test.stopTest();

            System.assert(thrown, 'Saving against a non-existent application should throw');
        }
    }

    @IsTest
    static void testGetDraftApplicationReturnsNullWhenNotDraft() {
        System.runAs(portalUser()) {
            Id fakeId = IndividualApplication.SObjectType.getDescribe().getKeyPrefix() + '000000000AAA';

            Test.startTest();
            WinProjectProposalFormController.DraftWrapper wrap =
                WinProjectProposalFormController.getDraftApplication(fakeId);
            Test.stopTest();

            System.assertEquals(null, wrap, 'No draft should be returned for an unknown Id');
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  FINAL SUBMISSION (insert + update + files)
    // ─────────────────────────────────────────────────────────────
    @IsTest
    static void testSaveApplicationWithMilestonesInsertAndUpdate() {
        System.runAs(portalUser()) {

            Map<String, Object> appData = buildAppData('Final Submission');
            appData.put('CO_PI_Email__c', 'copi-final@test.com');
            appData.put('CO_PI_Institution__c', 'Final CoPI Institute');
            appData.put('Co_Principal_Investigator_Co_PI__c', 'Dr Final CoPI');
            appData.put('CO_PI_Phone__c', '8888888');
            appData.put('CO_PI_Designation__c', 'Scientist');

            List<Map<String, Object>> milestones = buildMilestones('Phase A');
            List<Map<String, Object>> budgets    = buildBudgets('Infra Final');
            List<Map<String, Object>> coFounders = buildCoFounders('Final Co Founder');

            Test.startTest();

            // 1) INSERT flow, no files
            Id insertedAppId = WinProjectProposalFormController.saveApplicationWithMilestones(
                appData, milestones, new List<Id>(), budgets, coFounders
            );
            System.assertNotEquals(null, insertedAppId, 'Inserted Application Id should not be null');

            System.assertEquals(1,
                [SELECT COUNT() FROM Milestone__c WHERE Individual_Application__c = :insertedAppId],
                'One milestone expected after insert');
            System.assertEquals(1,
                [SELECT COUNT() FROM Co_Founder__c WHERE Individual_Application__c = :insertedAppId],
                'One co-founder expected after insert');
            System.assertEquals(1,
                [SELECT COUNT() FROM Budget WHERE Proposal__c = :insertedAppId],
                'One budget expected after insert');

            // 2) UPDATE flow. Children are passed as null here on purpose:
            //    saveApplicationWithMilestones has no dedupe logic, so re-sending the
            //    same child maps without Ids would create duplicates.
            appData.put('Id', insertedAppId);
            appData.put('Status', 'Submitted');

            Id updatedAppId = WinProjectProposalFormController.saveApplicationWithMilestones(
                appData, null, null, null, null
            );

            Test.stopTest();

            System.assertEquals(insertedAppId, updatedAppId, 'Updated App Id should match the inserted one');

            IndividualApplication saved = [
                SELECT Id, Status, COE_Approver__c, AppliedDate
                FROM IndividualApplication
                WHERE Id = :insertedAppId
                LIMIT 1
            ];
            System.assertEquals('Submitted', saved.Status, 'Status should be Submitted after the update');
            System.assertNotEquals(null, saved.AppliedDate, 'AppliedDate should be stamped');
            System.assertNotEquals(null, saved.COE_Approver__c, 'COE approver should be auto-assigned');

            System.assertEquals(1,
                [SELECT COUNT() FROM Milestone__c WHERE Individual_Application__c = :insertedAppId],
                'Update with null children must not duplicate milestones');
        }
    }

    /**
     * File linking is tested outside System.runAs(). A Community/portal user in a test
     * context has no NetworkId, so inserting a ContentVersion as that user fails with
     * INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY [NetworkId].
     */
    @IsTest
    static void testSaveApplicationWithFiles() {

        Id appId;
        System.runAs(portalUser()) {
            appId = WinProjectProposalFormController.saveApplicationWithMilestones(
                buildAppData('File Attachment Submission'), null, null, null, null
            );
        }
        System.assertNotEquals(null, appId, 'Application should exist before attaching files');

        ContentVersion cv = new ContentVersion(
            Title        = 'Proposal Attachment',
            PathOnClient = 'proposal.txt',
            VersionData  = Blob.valueOf('Sample proposal content')
        );
        insert cv;

        Id docId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1].ContentDocumentId;

        Map<String, Object> appData = buildAppData('File Attachment Submission');
        appData.put('Id', appId);
        appData.put('Status', 'Submitted');

        Test.startTest();
        Id updatedId = WinProjectProposalFormController.saveApplicationWithMilestones(
            appData, null, new List<Id>{ docId }, null, null
        );
        Test.stopTest();

        System.assertEquals(appId, updatedId, 'Update should return the same application Id');
        System.assertEquals(1,
            [SELECT COUNT() FROM ContentDocumentLink WHERE LinkedEntityId = :appId],
            'One file should be linked to the application');
    }

    @IsTest
    static void testSaveApplicationWithMilestonesNullChildren() {
        System.runAs(portalUser()) {
            Test.startTest();
            Id appId = WinProjectProposalFormController.saveApplicationWithMilestones(
                buildAppData('No Children Submission'), null, null, null, null
            );
            Test.stopTest();

            System.assertNotEquals(null, appId, 'Application should be created without child records');
        }
    }

    @IsTest
    static void testSaveApplicationWithMilestonesInvalidDate() {
        System.runAs(portalUser()) {
            Map<String, Object> appData = buildAppData('Bad Date Submission');
            appData.put('Project_Start_Date__c', 'not-a-real-date');

            Boolean thrown = false;
            Test.startTest();
            try {
                WinProjectProposalFormController.saveApplicationWithMilestones(
                    appData, null, null, null, null
                );
            } catch (Exception e) {
                thrown = true;
            }
            Test.stopTest();

            System.assert(thrown, 'An invalid date should surface an AuraHandledException');
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  DELETE METHODS
    // ─────────────────────────────────────────────────────────────
    @IsTest
    static void testDeleteBudgetRecord() {
        System.runAs(portalUser()) {

            WinProjectProposalFormController.SaveDraftResponse response =
                WinProjectProposalFormController.saveDraftApplication(
                    null,
                    buildAppData('Delete Budget Test'),
                    new List<Map<String, Object>>(),
                    buildBudgets('Test Delete Budget'),
                    new List<Map<String, Object>>(),
                    recordTypeId(),
                    'Grant Application'
                );

            List<Budget> budgetList = [SELECT Id FROM Budget WHERE Proposal__c = :response.applicationId LIMIT 1];
            System.assert(!budgetList.isEmpty(), 'Budget record should exist before deletion');

            Test.startTest();
            WinProjectProposalFormController.deleteBudgetRecord(budgetList[0].Id);
            Test.stopTest();

            System.assertEquals(0, [SELECT COUNT() FROM Budget WHERE Id = :budgetList[0].Id],
                'Budget should be deleted');
        }
    }

    @IsTest
    static void testDeleteMilestoneRecord() {
        System.runAs(portalUser()) {

            WinProjectProposalFormController.SaveDraftResponse response =
                WinProjectProposalFormController.saveDraftApplication(
                    null,
                    buildAppData('Delete Milestone Test'),
                    buildMilestones('Delete Test Milestone'),
                    new List<Map<String, Object>>(),
                    new List<Map<String, Object>>(),
                    recordTypeId(),
                    'Grant Application'
                );

            List<Milestone__c> msList = [
                SELECT Id FROM Milestone__c WHERE Individual_Application__c = :response.applicationId LIMIT 1
            ];
            System.assert(!msList.isEmpty(), 'Milestone record should exist before deletion');

            Test.startTest();
            WinProjectProposalFormController.deleteMilestoneRecord(msList[0].Id);
            Test.stopTest();

            System.assertEquals(0, [SELECT COUNT() FROM Milestone__c WHERE Id = :msList[0].Id],
                'Milestone should be deleted');
        }
    }

    @IsTest
    static void testDeleteCoFounderRecord() {
        System.runAs(portalUser()) {

            WinProjectProposalFormController.SaveDraftResponse response =
                WinProjectProposalFormController.saveDraftApplication(
                    null,
                    buildAppData('Delete Co Founder Test'),
                    new List<Map<String, Object>>(),
                    new List<Map<String, Object>>(),
                    buildCoFounders('Delete Co Founder'),
                    recordTypeId(),
                    'Grant Application'
                );

            List<Co_Founder__c> cfList = [
                SELECT Id FROM Co_Founder__c WHERE Individual_Application__c = :response.applicationId LIMIT 1
            ];
            System.assert(!cfList.isEmpty(), 'Co-founder record should exist before deletion');

            Test.startTest();
            WinProjectProposalFormController.deleteCoFounderRecord(cfList[0].Id);
            Test.stopTest();

            System.assertEquals(0, [SELECT COUNT() FROM Co_Founder__c WHERE Id = :cfList[0].Id],
                'Co-founder should be deleted');
        }
    }

    @IsTest
    static void testDeleteMethodsFailurePaths() {
        System.runAs(portalUser()) {

            Id fakeBudgetId    = Budget.SObjectType.getDescribe().getKeyPrefix() + '000000000AAA';
            Id fakeMilestoneId = Milestone__c.SObjectType.getDescribe().getKeyPrefix() + '000000000AAA';
            Id fakeCoFounderId = Co_Founder__c.SObjectType.getDescribe().getKeyPrefix() + '000000000AAA';

            Integer failures = 0;

            Test.startTest();
            try { WinProjectProposalFormController.deleteBudgetRecord(fakeBudgetId); }
            catch (Exception e) { failures++; }

            try { WinProjectProposalFormController.deleteMilestoneRecord(fakeMilestoneId); }
            catch (Exception e) { failures++; }

            try { WinProjectProposalFormController.deleteCoFounderRecord(fakeCoFounderId); }
            catch (Exception e) { failures++; }
            Test.stopTest();

            System.assertEquals(3, failures, 'All three delete methods should throw for unknown Ids');
        }
    }
}