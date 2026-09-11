@IsTest
public class WCF_TestDataFactory {
    private static Integer sequence = 0;

    public class Bundle {
        public Account account;
        public Contact contact;
        public IndividualApplication application;
        public ApplicationReview validatorReview;
        public ApplicationReview reviewerReview;
        public Historical_Data__c historical;
        public Current_fiscal_year_data__c fiscal;
        public Outcomes_Data__c outcome;
        public ContentVersion contentVersion;
        public Id contentDocumentId;
    }

    public static Bundle createBundle() {
        Bundle b = new Bundle();

        UserRole ur = new UserRole(DeveloperName = 'Test_Owner_Role_' + nextToken().replace('-', '_'), Name = 'Test Owner Role');
        insert ur;

        Profile adminProfile = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1];
        User sysAdmin = new User(
            FirstName = 'Test',
            LastName = 'Admin',
            Username = 'testadmin_' + nextToken().replace('-', '') + '@example.com',
            Email = 'testadmin@example.com',
            Alias = 'tadm',
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = adminProfile.Id,
            UserRoleId = ur.Id
        );
        insert sysAdmin;

        List<PermissionSetAssignment> psas = new List<PermissionSetAssignment>();
        Set<String> psNames = new Set<String>{
            'Grantmaking_Manager', 'GrantmakingManager'
        };
        for (PermissionSet ps : [SELECT Id FROM PermissionSet WHERE Name IN :psNames]) {
            psas.add(new PermissionSetAssignment(
                AssigneeId = sysAdmin.Id,
                PermissionSetId = ps.Id
            ));
        }
        if (!psas.isEmpty()) {
            insert psas;
        }

        User portalUser;
        System.runAs(sysAdmin) {
            b.account = createAccount(false);
            insert b.account;

            b.contact = createContact(b.account.Id, false);
            insert b.contact;
        }

        Profile p = [SELECT Id FROM Profile WHERE Name = 'COE User Profile' LIMIT 1];   //COE User Profile WG Partners
        portalUser = new User(
            FirstName = 'Dyn',
            LastName = 'PortalUser',
            Username = 'dynportaluser_' + nextToken().replace('-', '') + '@example.com',
            Email = 'dynportal@example.com',
            Alias = 'dypu',
            CommunityNickname = 'dypu_' + nextToken().replace('-', ''),
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ContactId = b.contact.Id
        );
        System.runAs(sysAdmin) {
            insert portalUser;
        }

        System.runAs(sysAdmin) {
            b.application = createApplication(b.account.Id, b.contact.Id, 'Draft', false);
            b.application.OwnerId = portalUser.Id;
            b.application.PI__c = portalUser.Id;
            b.application.Principal_Investigator_PI__c = b.contact.Id;
            b.application.COE_Admin__c = b.contact.Id;
            b.application.CO_PI_Contact__c = b.contact.Id;
            insert b.application;

            b.validatorReview = createApplicationReview(b.application.Id, 'Draft', 'WCF_Validator', false);
            insert b.validatorReview;

            b.reviewerReview = createApplicationReview(b.application.Id, 'Draft', 'WCF_Job_Creation_Review', false);
            insert b.reviewerReview;

            updateFields(b.reviewerReview, new Map<String, Object>{
                'Recommend_for_CEO_review__c' => pickValue('ApplicationReview', 'Recommend_for_CEO_review__c', 'Yes'),
                'Status' => pickValue('ApplicationReview', 'Status', 'Review Submitted')
            });

            b.historical = (Historical_Data__c) createChildRecord('Historical_Data__c', b.application.Id, true);
            b.fiscal = (Current_fiscal_year_data__c) createChildRecord('Current_fiscal_year_data__c', b.application.Id, true);
            b.outcome = (Outcomes_Data__c) createChildRecord('Outcomes_Data__c', b.application.Id, true);
            b.contentVersion = createContentVersion(true);
            b.contentDocumentId = [
                SELECT ContentDocumentId
                FROM ContentVersion
                WHERE Id = :b.contentVersion.Id
            ].ContentDocumentId;
            insert new ContentDocumentLink(
                ContentDocumentId = b.contentDocumentId,
                LinkedEntityId = b.outcome.Id,
                ShareType = 'V',
                Visibility = 'AllUsers'
            );
        }

        return b;
    }

    public static Account createAccount(Boolean doInsert) {
        Account acc = new Account(Name = 'WCF Test Org ' + nextToken());
        putIfAvailable(acc, 'WCF_Organizational_Name__c', 'WCF Test Org');
        fillRequired(acc);
        if (doInsert) insert acc;
        return acc;
    }

    public static Contact createContact(Id accountId, Boolean doInsert) {
        Contact con = new Contact(
            LastName = 'WCF Tester ' + nextToken(),
            AccountId = accountId,
            Email = 'wcf.tester.' + nextToken().replace('-', '') + '@example.com'
        );
        Id rtId = getRecordTypeId('Contact', 'WCF');
        if (rtId == null) rtId = getAnyRecordTypeId('Contact');
        if (rtId != null) con.RecordTypeId = rtId;
        fillRequired(con);
        if (doInsert) insert con;
        return con;
    }

    public static IndividualApplication createApplication(Id accountId, String status, Boolean doInsert) {
        return createApplication(accountId, null, status, doInsert);
    }

    public static IndividualApplication createApplication(Id accountId, Id contactId, String status, Boolean doInsert) {
        IndividualApplication app = new IndividualApplication();
        app.AccountId = accountId;
        app.OwnerId = UserInfo.getUserId();
        if (contactId != null) app.ContactId = contactId;
        app.Category = pickValue('IndividualApplication', 'Category', 'WCF Grant Application');
        app.Status = pickValue('IndividualApplication', 'Status', status);
        Id rtId = getRecordTypeId('IndividualApplication', 'WCF_Job_Creation_Proposals');
        if (rtId == null) rtId = getAnyRecordTypeId('IndividualApplication');
        if (rtId != null) app.RecordTypeId = rtId;

        putIfAvailable(app, 'ApplicationType', pickValue('IndividualApplication', 'ApplicationType', 'WCF Grant Application'));
        putIfAvailable(app, 'Organization_Name__c', 'WCF Test Org');
        putIfAvailable(app, 'Headquarters_City_and_Country__c', 'Bengaluru, India');
        putIfAvailable(app, 'Submitter_Name__c', 'Test Submitter');
        putIfAvailable(app, 'Organizational_Area_s_for_Funding_Inves__c', 'Job Creation Only');
        putIfAvailable(app, 'Primary_Service_Regions__c', 'India');
        putIfAvailable(app, 'Leader_Name__c', 'Test Leader');
        putIfAvailable(app, 'Leader_Title__c', 'CEO');
        putIfAvailable(app, 'Job_Title__c', 'Program Lead');
        putIfAvailable(app, 'Work_Email_ID__c', 'submitter@example.com');
        putIfAvailable(app, 'Phone__c', '9999999999');
        putIfAvailable(app, 'Review_Status__c', pickValue('IndividualApplication', 'Review_Status__c', 'Under Review'));
        putIfAvailable(app, 'Due_Date__c', Date.today().addDays(7));
        putIfAvailable(app, 'Initial_Submission_Date__c', Date.today());
        putIfAvailable(app, 'Draft_Email_Sent__c', true);
        putIfAvailable(app, 'Attesting_User_Name__c', 'Test Attestor');
        putIfAvailable(app, 'Attesting_User_Title__c', 'Director');
        putIfAvailable(app, 'Principal_Investigator_PI__c', contactId);
        putIfAvailable(app, 'COE_Admin__c', contactId);
        putIfAvailable(app, 'PI__c', UserInfo.getUserId());
        putIfAvailable(app, 'COE_Approver__c', UserInfo.getUserId());
        putIfAvailable(app, 'Legal_Structure__c', 'Test legal structure');
        putIfAvailable(app, 'Organizational_Sustainability__c', 'Test sustainability');
        putIfAvailable(app, 'Use_of_Additional_Funding__c', 'Test use of funds');
        putIfAvailable(app, 'Operational_Synergies_with_WOF__c', 'Test synergy');
        putIfAvailable(app, 'Skilling_Approach__c', 'Test skilling approach');
        putIfAvailable(app, 'Job_Creation_Approach__c', 'Test job creation approach');
        fillRequired(app);
        if (doInsert) insert app;
        return app;
    }
/*
    public static ApplicationReview createApplicationReview(Id applicationId, String status, String recordTypeDeveloperName, Boolean doInsert) {
        ApplicationReview review = new ApplicationReview();
        review.ApplicationId = applicationId;
        review.Status = pickValue('ApplicationReview', 'Status', status);
        Id rtId = getRecordTypeId('ApplicationReview', recordTypeDeveloperName);
        if (rtId == null) rtId = getAnyRecordTypeId('ApplicationReview');
        if (rtId != null) review.RecordTypeId = rtId;
        putIfAvailable(review, 'ReviewedById', UserInfo.getUserId());
        putIfAvailable(review, 'IsSubmitted', status == 'Review Submitted');
        putIfAvailable(review, 'Decision_Final_Decision_from_Sec_1_2__c', pickValue('ApplicationReview', 'Decision_Final_Decision_from_Sec_1_2__c', 'Flagged'));
        putIfAvailable(review, 'Decision_rationale__c', 'Test rationale');
        putIfAvailable(review, 'Flag__c', pickValue('ApplicationReview', 'Flag__c', 'Reject'));
    //    putIfAvailable(review, 'Flag__c', 'Reject');
        putIfAvailable(review, 'Source_Channel_Source_of_Application__c', 'WCF Direct Research');
        putIfAvailable(review, 'Budget_Range_Annual_Budget_Range__c', '$5M – $10M');
        fillRequired(review);
        if (doInsert) insert review;
        return review;
    }
*/  
/*
public static ApplicationReview createApplicationReview(Id applicationId, String status, String recordTypeDeveloperName, Boolean doInsert) {
    ApplicationReview review = new ApplicationReview();
    review.ApplicationId = applicationId;
    review.Status = pickValue('ApplicationReview', 'Status', status);
    Id rtId = getRecordTypeId('ApplicationReview', recordTypeDeveloperName);
    if (rtId == null) rtId = getAnyRecordTypeId('ApplicationReview');
    if (rtId != null) review.RecordTypeId = rtId;
    putIfAvailable(review, 'ReviewedById', UserInfo.getUserId());
    putIfAvailable(review, 'IsSubmitted', status == 'Review Submitted');

    // Keep controlling + dependent picklist values consistent
    String decision = 'Flag';                 // controlling field value
    String flag = 'Reject';                       // valid only when decision = 'Flagged'
    putIfAvailable(review, 'Decision_Final_Decision_from_Sec_1_2__c', decision);
    putIfAvailable(review, 'Flag__c', flag);

    putIfAvailable(review, 'Decision_rationale__c', 'Test rationale');
    putIfAvailable(review, 'Source_Channel_Source_of_Application__c', 'WCF Direct Research');
    putIfAvailable(review, 'Budget_Range_Annual_Budget_Range__c', '$5M – $10M');
    fillRequired(review);
    if (doInsert) insert review;
    return review;
}
*/   
public static ApplicationReview createApplicationReview(
    Id applicationId,
    String status,
    String recordTypeDeveloperName,
    Boolean doInsert
) {
    ApplicationReview review = new ApplicationReview();
    review.ApplicationId = applicationId;
    review.Status = pickValue('ApplicationReview', 'Status', status);
 
    Id rtId = getRecordTypeId('ApplicationReview', recordTypeDeveloperName);
    if (rtId == null) {
        rtId = getAnyRecordTypeId('ApplicationReview');
    }
    if (rtId != null) {
        review.RecordTypeId = rtId;
    }
 
    putIfAvailable(review, 'ReviewedById', UserInfo.getUserId());
    putIfAvailable(review, 'IsSubmitted', status == 'Review Submitted');
 
    // Set dependent picklist only when Status = Flagged
    if (status == 'Flagged') {
        putIfAvailable(review, 'Flagged_Status__c', 'Reject');
    }
 
    putIfAvailable(review, 'Decision_rationale__c', 'Test rationale');
    putIfAvailable(review, 'Source_Channel_Source_of_Application__c', 'WCF Direct Research');
    putIfAvailable(review, 'Budget_Range_Annual_Budget_Range__c', '$5M – $10M');
 
    fillRequired(review);
 
    if (doInsert) {
        insert review;
    }
 
    return review;
}


    public static WCF_Compliance_Document__c createComplianceDocument(Id accountId, Id applicationId, Boolean doInsert) {
        WCF_Compliance_Document__c rec = new WCF_Compliance_Document__c();
        putIfAvailable(rec, 'Organisation__c', accountId);
        putIfAvailable(rec, 'IndividualApplication__c', applicationId);
        putIfAvailable(rec, 'Document_Types__c', 'Registration Certificate');
        putIfAvailable(rec, 'Requested_Date__c', Date.today());
        putIfAvailable(rec, 'Due_Date__c', Date.today().addDays(5));
        putIfAvailable(rec, 'Priority__c', pickValue('WCF_Compliance_Document__c', 'Priority__c', 'Medium'));
        putIfAvailable(rec, 'Status__c', pickValue('WCF_Compliance_Document__c', 'Status__c', 'Pending Submission'));
        putIfAvailable(rec, 'Geography__c', 'India');
        putIfAvailable(rec, 'Notes__c', 'Test notes');
        fillRequired(rec);
        if (doInsert) insert rec;
        return rec;
    }

    public static ContentVersion createContentVersion(Boolean doInsert) {
        ContentVersion cv = new ContentVersion(
            Title = 'WCF Test File ' + nextToken(),
            PathOnClient = 'wcf-test.txt',
            VersionData = Blob.valueOf('test file body')
        );
        cv.Description = 'Q15';
        if (doInsert) insert cv;
        return cv;
    }

    public static SObject createChildRecord(String objectApiName, Id proposalId, Boolean doInsert) {
        SObject sob = Schema.getGlobalDescribe().get(objectApiName).newSObject();
        putIfAvailable(sob, 'Proposal__c', proposalId);
        putIfAvailable(sob, 'Status__c', 'Draft');
        putIfAvailable(sob, 'Revenue_Budget__c', 1000);
        putIfAvailable(sob, 'Revenue_Projection__c', 1200);
        putIfAvailable(sob, 'Expense_Budget__c', 500);
        putIfAvailable(sob, 'Expense_Projection__c', 600);
        putIfAvailable(sob, 'Skills_Duration_CFY__c', '3 months');
        putIfAvailable(sob, 'X3rd_Party_Placement_Verification_FY_1__c', 'Yes');
        putIfAvailable(sob, 'Job_Verification_3rd_Party_FY1__c', 'Yes');
        fillRequired(sob);
        if (doInsert) insert sob;
        return sob;
    }

    public static Map<String, Object> baseValidatorReviewJson(Id appId) {
        return new Map<String, Object>{
            'applicationId' => appId,
            'status' => 'Draft',
            's1_1_confirm' => 'Yes',
            's1_2_confirm' => 'Yes',
            's1_3_confirm' => 'Yes',
            's1_4_text' => 'No gap',
            's2_1' => 'Yes',
            's2_2' => 'Yes',
            's2_3' => 'No',
            's2_3_text' => '',
            's3_1' => 'Pass',
            's3_2' => 'Rationale',
            's3_3' => 'Flag rationale',
            's3_4' => '',
            's3_5' => 'Checklist',
            's4_1' => 'WCF Direct',
            's4_2' => 'Under 100K',
            's5_1' => 'Notes',
            'selectedQuestions' => '1;2'
        };
    }

    public static String pickValue(String objectApiName, String fieldApiName, String preferred) {
        Schema.DescribeFieldResult d = describeField(objectApiName, fieldApiName);
        if (d == null || d.getType() != Schema.DisplayType.Picklist && d.getType() != Schema.DisplayType.MultiPicklist) {
            return preferred;
        }
        for (Schema.PicklistEntry pe : d.getPicklistValues()) {
            if (pe.isActive() && pe.getValue() == preferred) return preferred;
        }
        for (Schema.PicklistEntry pe : d.getPicklistValues()) {
            if (pe.isActive()) return pe.getValue();
        }
        return preferred;
    }

    public static Id getRecordTypeId(String objectApiName, String developerName) {
        List<RecordType> rts = [
            SELECT Id
            FROM RecordType
            WHERE SObjectType = :objectApiName
            AND DeveloperName = :developerName
            LIMIT 1
        ];
        return rts.isEmpty() ? null : rts[0].Id;
    }

    public static Id getAnyRecordTypeId(String objectApiName) {
        List<RecordType> rts = [
            SELECT Id
            FROM RecordType
            WHERE SObjectType = :objectApiName
            LIMIT 1
        ];
        return rts.isEmpty() ? null : rts[0].Id;
    }

    public static void updateFields(SObject sob, Map<String, Object> valuesByField) {
        for (String fieldApiName : valuesByField.keySet()) {
            putIfAvailable(sob, fieldApiName, valuesByField.get(fieldApiName));
        }
        update sob;
    }

    public static void putIfAvailable(SObject sob, String fieldApiName, Object value) {
        if (value == null) return;
        Schema.DescribeFieldResult d = describeField(String.valueOf(sob.getSObjectType()), fieldApiName);
        if (d == null || (!d.isCreateable() && !d.isUpdateable())) return;
        sob.put(fieldApiName, coerceValue(d, value));
    }

    private static void fillRequired(SObject sob) {
        String objectApiName = String.valueOf(sob.getSObjectType());
        Map<String, Schema.SObjectField> fields = Schema.getGlobalDescribe().get(objectApiName).getDescribe().fields.getMap();
        for (String fieldName : fields.keySet()) {
            Schema.DescribeFieldResult d = fields.get(fieldName).getDescribe();
            if (!d.isCreateable() || d.isNillable() || d.isDefaultedOnCreate() || d.isAutoNumber()) continue;
            if (fieldName == 'OwnerId' || fieldName == 'RecordTypeId') continue;
            if (sob.get(fieldName) != null) continue;
            Object val = sampleValue(d);
            if (val != null) sob.put(fieldName, val);
        }
    }

    private static Schema.DescribeFieldResult describeField(String objectApiName, String fieldApiName) {
        Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
        if (objectType == null) return null;
        Schema.SObjectField fieldToken = objectType.getDescribe().fields.getMap().get(fieldApiName);
        return fieldToken == null ? null : fieldToken.getDescribe();
    }

    private static Object coerceValue(Schema.DescribeFieldResult d, Object value) {
        if (value == null) return null;
        Schema.DisplayType t = d.getType();
        if (t == Schema.DisplayType.Picklist || t == Schema.DisplayType.MultiPicklist) return String.valueOf(value);
        if (t == Schema.DisplayType.Boolean) return value instanceof Boolean ? value : Boolean.valueOf(String.valueOf(value));
        if (t == Schema.DisplayType.Date) return value instanceof Date ? value : Date.valueOf(String.valueOf(value));
        if (t == Schema.DisplayType.DateTime) return value instanceof Datetime ? value : Datetime.valueOf(String.valueOf(value));
        if (t == Schema.DisplayType.Integer) return Integer.valueOf(String.valueOf(value));
        if (t == Schema.DisplayType.Currency || t == Schema.DisplayType.Double || t == Schema.DisplayType.Percent) {
            return Decimal.valueOf(String.valueOf(value));
        }
        return value;
    }

    private static Object sampleValue(Schema.DescribeFieldResult d) {
        Schema.DisplayType t = d.getType();
        if (t == Schema.DisplayType.String || t == Schema.DisplayType.TextArea || t == Schema.DisplayType.Email || t == Schema.DisplayType.Phone || t == Schema.DisplayType.Url) {
            return 'Test ' + nextToken();
        }
        if (t == Schema.DisplayType.Picklist || t == Schema.DisplayType.MultiPicklist) {
            for (Schema.PicklistEntry pe : d.getPicklistValues()) {
                if (pe.isActive()) return pe.getValue();
            }
        }
        if (t == Schema.DisplayType.Boolean) return false;
        if (t == Schema.DisplayType.Date) return Date.today();
        if (t == Schema.DisplayType.DateTime) return Datetime.now();
        if (t == Schema.DisplayType.Integer) return 1;
        if (t == Schema.DisplayType.Currency || t == Schema.DisplayType.Double || t == Schema.DisplayType.Percent) return 1;
        if (t == Schema.DisplayType.Reference) {
            List<Schema.SObjectType> refs = d.getReferenceTo();
            if (!refs.isEmpty() && String.valueOf(refs[0]) == 'User') return UserInfo.getUserId();
        }
        return null;
    }

    private static String nextToken() {
        sequence++;
        return String.valueOf(DateTime.now().getTime()) + '-' + sequence;
    }
}