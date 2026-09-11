public without sharing class WinProjectProposalFormController {

    // ────────────────────────────────────────────────────────────────────────────
    // Helper: throws an AuraHandledException whose getMessage() actually returns
    // the message you pass in. By default, AuraHandledException.getMessage()
    // ALWAYS returns the literal string "Script-thrown exception" unless
    // setMessage() is called explicitly before throwing — this is a documented
    // Salesforce quirk. Route every AuraHandledException through this helper.
    // ────────────────────────────────────────────────────────────────────────────
    private static AuraHandledException buildError(String msg) {
        AuraHandledException ex = new AuraHandledException(msg);
        ex.setMessage(msg);
        return ex;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Helper: true if a value is null OR an empty/blank string. Prevents blank
    // strings (e.g. an unfilled Date field sent as "") from reaching type
    // conversion code like Date.valueOf(''), which throws.
    // ────────────────────────────────────────────────────────────────────────────
    private static Boolean isBlankValue(Object raw) {
        if (raw == null) return true;
        if (raw instanceof String && String.isBlank((String) raw)) return true;
        return false;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, String> getLoggedInUserDetails() {
        User u = [
            SELECT Id, FirstName, LastName, Email, Phone, AccountId
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];
        
        Map<String, String> userDetails = new Map<String, String>();
        userDetails.put('FirstName', u.FirstName);
        userDetails.put('LastName', u.LastName);
        userDetails.put('Email', u.Email);
        userDetails.put('Phone', u.Phone);
        userDetails.put('UserId', u.Id);
        
        if (u.AccountId != null) {
            Account acc = [SELECT Id, Name FROM Account WHERE Id = :u.AccountId LIMIT 1];
            userDetails.put('AccountId', acc.Id);
            userDetails.put('AccountName', acc.Name);
        }
        
        return userDetails;
    }

    @AuraEnabled(cacheable=true)
    public static Id getActiveFundingOpportunityId() {
        try {
            FundingOpportunity fo = [
                SELECT Id
                FROM FundingOpportunity
                WHERE Status    = 'Active'
                AND FO_Type__c = 'Project Proposal'
                LIMIT 1
            ];
            return fo.Id;
        } catch (Exception e) {
            throw buildError('No active funding opportunity found.');
        }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Record Type resolution for IndividualApplication.
    // NOTE: Developer Name is NOT consistent across orgs for this Record Type
    // (production = "Project_Proposal", wfdev sandbox = "RFP_Applicants") even
    // though the Label is the same ("Project Proposal") in both. Resolving by
    // Label via SOQL avoids hardcoding an org-specific Developer Name, and also
    // avoids getRecordTypeInfosByDeveloperName()'s profile-visibility filtering.
    // ────────────────────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static Id getIndividualApplicationRecordTypeId() {
        List<RecordType> rts = [
            SELECT Id
            FROM RecordType
            WHERE SObjectType = 'IndividualApplication'
            AND Name = 'Project Proposal'
            AND IsActive = true
            LIMIT 1
        ];

        if (rts.isEmpty()) {
            throw buildError(
                'Record Type "Project Proposal" was not found or is not active ' +
                'on IndividualApplication in this org.'
            );
        }
        return rts[0].Id;
    }
    
    public class DraftWrapper {
        @AuraEnabled public Id                        Id;
        @AuraEnabled public Map<String, Object>       applicationData;
        @AuraEnabled public List<Map<String, Object>> milestones;
        @AuraEnabled public List<Map<String, Object>> budgets;
        @AuraEnabled public List<Map<String, Object>> coFounders;
    }
    
    public class SaveDraftResponse {
        @AuraEnabled public Id applicationId;
        @AuraEnabled public List<Budget> savedBudgets;
        @AuraEnabled public List<Milestone__c> savedMilestones;
    }

    
    // ────────────────────────────────────────────────────────────────────────────
    @AuraEnabled           //(cacheable=true)
    public static DraftWrapper getDraftApplication(Id recordId) {
        // 1) Build a full list of all API names on IndividualApplication
        Map<String, Schema.SObjectField> fieldMap = 
            Schema.SObjectType.IndividualApplication.fields.getMap();
        List<String> allFields = new List<String>(fieldMap.keySet());
        
        // 2) Inline the current user's Id into the SOQL string
        String userId = UserInfo.getUserId();
        String soql = 
            'SELECT ' + String.join(allFields, ',') +
            ' FROM IndividualApplication' +
            ' WHERE CreatedById = \'' + userId + '\'' +
            ' AND Id = \'' + recordId + '\'' +
            '   AND Status = \'Draft\'' +
            ' LIMIT 1';
        
        System.debug('▶️ getDraftApplication SOQL: ' + soql);
        IndividualApplication draft;
        try {
            draft = (IndividualApplication) Database.query(soql);
        } catch (Exception e) {
            // No draft found or other error
            return null;
        }
        
        // 3) Build wrapper
        DraftWrapper wrap = new DraftWrapper();
        wrap.Id = draft.Id;
        wrap.applicationData = new Map<String, Object>();
        
        // 4) Copy every field into the map
        for (String apiName : allFields) {
            wrap.applicationData.put(apiName, draft.get(apiName));
        }
        
        // 4b) Add AccountName from AccountId
        if (draft.AccountId != null) {
            Account acc = [SELECT Name FROM Account WHERE Id = :draft.AccountId LIMIT 1];
            wrap.applicationData.put('AccountName', acc.Name);
        }
        
        // 5) Load child Milestones
        List<Milestone__c> msList = [
            SELECT Id, 	Installment_of_Funds_2__c, 	Installment_of_Funds_3__c, 
            Milestone_Description__c,Project_Start_Date__c, Project_End_Date__c, 
            Deliverables__c, Activities_under_this_Milestone__c, Budget_Required_INR__c,
            Budget_Required__c, Output_and_Deliverables__c, Installment_of_Funds_1__c,
            Target_Completion_Months__c, Installment_of_Funds_4__c, Installment_of_Funds_5__c,   
            Justification__c,Status__c, Installment_of_Funds_6__c
            FROM Milestone__c
            WHERE Individual_Application__c = :draft.Id
        ];
        wrap.milestones = new List<Map<String, Object>>();
        for (Milestone__c m : msList) {
            wrap.milestones.add(new Map<String, Object>{
                'Id'                        => m.Id,
                    'Milestone_Description__c'  => m.Milestone_Description__c,
                    'Installment_of_Funds_1__c' => m.Installment_of_Funds_1__c,
                    'Installment_of_Funds_2__c' => m.Installment_of_Funds_2__c,
                    'Installment_of_Funds_3__c' => m.Installment_of_Funds_3__c,
                    'Installment_of_Funds_4__c' => m.Installment_of_Funds_4__c,
                    'Installment_of_Funds_5__c' => m.Installment_of_Funds_5__c,
                    'Installment_of_Funds_6__c' => m.Installment_of_Funds_6__c,
                    'Activities_under_this_Milestone__c'=> m.Activities_under_this_Milestone__c,
                    'Output_and_Deliverables__c'        => m.Output_and_Deliverables__c,
                    'Project_Start_Date__c' => m.Project_Start_Date__c,
                    'Project_End_Date__c' => m.Project_End_Date__c,
                    'Budget_Required__c'        => m.Budget_Required__c,
                    'Budget_Required_INR__c'    => m.Budget_Required_INR__c,
                    'Status__c'                 => m.Status__c
                    });
        }

        // 6) Load child Budgets
        List<Budget> bdList = [
            SELECT Id, Name, Justification__c, Status, Year_1__c, Year_2__c, Year_3_USD__c, Total_Amount__c, Amount,Total_Amount_INR__c
            FROM Budget
            WHERE Proposal__c = :draft.Id
        ];
        wrap.budgets = new List<Map<String, Object>>();
        for (Budget b : bdList) {
            wrap.budgets.add(new Map<String, Object>{
                    'Id'               => b.Id,
                    'Name'             => b.Name,
                    'Justification__c' => b.Justification__c,
                    'Status'           => b.Status,
                     'Total_Amount_INR__c'   => b.Total_Amount_INR__c,
                    'Total_Amount__c'   => b.Total_Amount__c
                    });
        }

        // 7) Load child Co-Founders
        List<Co_Founder__c> cfList = [
            SELECT Id, Name, Designation__c, Institution__c, Mobile__c, Email__c
            FROM Co_Founder__c
            WHERE Individual_Application__c = :draft.Id
        ];
        wrap.coFounders = new List<Map<String, Object>>();
        for (Co_Founder__c cf : cfList) {
            wrap.coFounders.add(new Map<String, Object>{
                'Id' => cf.Id,
                'Name' => cf.Name,
                'Designation__c' => cf.Designation__c,
                'Institution__c' => cf.Institution__c,
                'Mobile__c' => cf.Mobile__c,
                'Email__c' => cf.Email__c
            });
        }

        return wrap;
    }
  
    @AuraEnabled
    public static SaveDraftResponse saveDraftApplication(
        Id applicationId,
        Map<String, Object> applicationData,
        List<Map<String, Object>> milestones,
        List<Map<String, Object>> budgets,
        List<Map<String, Object>> coFounders,
        Id recordTypeId,
        String category
    ) {
        SaveDraftResponse response = new SaveDraftResponse();
        
        try {
            User current = [SELECT ContactId, AccountId FROM User WHERE Id = :UserInfo.getUserId()];
            
            Boolean isNew = (applicationId == null);
            IndividualApplication app = isNew
                ? new IndividualApplication(ContactId = current.ContactId, AccountId = current.AccountId)
                : [SELECT Id FROM IndividualApplication WHERE Id = :applicationId];
                    
            Map<String, Schema.SObjectField> parentFields = Schema.SObjectType.IndividualApplication.fields.getMap();
            for (String fld : applicationData.keySet()) {
                if (fld == 'Id' || !parentFields.containsKey(fld)) continue;
                Object raw = applicationData.get(fld);
                // Skip null AND blank-string values so empty inputs (e.g. an
                // unfilled Date field sent as "") never reach type conversion.
                if (isBlankValue(raw)) continue;

                Schema.DisplayType dt = parentFields.get(fld).getDescribe().getType();
                switch on dt {
                    when Date {
                        if (raw instanceof Date) {
                            app.put(fld, (Date) raw);
                        } else if (raw instanceof String) {
                            String dateStr = (String) raw;
                            if (!String.isBlank(dateStr) && Pattern.matches('\\d{4}-\\d{2}-\\d{2}', dateStr)) {
                                app.put(fld, Date.valueOf(dateStr));
                            }
                        }
                    }
                    when Integer, Double, Currency, Percent {
                        String s = String.valueOf(raw).replaceAll('[^0-9\\.-]', '');
                        if (Pattern.matches('^-?\\d+(\\.\\d+)?$', s)) {
                            app.put(fld, Decimal.valueOf(s));
                        }
                    }
                    when Boolean {
                        app.put(fld, Boolean.valueOf(String.valueOf(raw)));
                    }
                    when Reference {
                        String idStr = String.valueOf(raw);
                        if (Pattern.matches('^[a-zA-Z0-9]{15,18}$', idStr)) {
                            app.put(fld, idStr);
                        }
                    }
                    when else {
                        app.put(fld, raw);
                    }
                }
            }

            // PI Contact Mapping
            String piEmail       = (String)applicationData.get('PI_Email__c');
            String piName        = (String)applicationData.get('PI_Name__c');
            String piPhone       = (String)applicationData.get('PI_Phone__c');
            String piDesignation = (String)applicationData.get('PI_Designation__c');

            // PI Contact Mapping — Use logged-in user's ContactId directly
            if (current.ContactId != null) {
                app.COE_Admin__c = current.ContactId;
            } else if (!String.isBlank(piEmail)) {
                // Fallback: if somehow the logged-in user has no ContactId, find existing Contact by email
                List<Contact> existingPI = [
                    SELECT Id FROM Contact
                    WHERE Email = :piEmail AND COE_PI__c = TRUE
                    LIMIT 1
                ];
                if (!existingPI.isEmpty()) {
                    app.COE_Admin__c = existingPI[0].Id; //COE_Admin__c ApiName but 'Label - PI Contact'
                }
            }

            app.Status       = 'Draft';
            app.RecordTypeId = recordTypeId;
            app.Category     = category;

            if (isNew) insert app; else update app;

            // ────────────────────────
            // ⛳ Milestone Upsert with Deduplication
            // ────────────────────────
            Map<String, Milestone__c> existingMilestonesMap = new Map<String, Milestone__c>();
            for (Milestone__c m : [
                SELECT Id, Milestone_Description__c, Deliverables__c, Budget_Required__c, Target_Completion_Months__c, Justification__c, Activities_under_this_Milestone__c,
         Installment_of_Funds_1__c, Installment_of_Funds_2__c, Installment_of_Funds_3__c,  Output_and_Deliverables__c, Project_End_Date__c, Project_Start_Date__c, 
         Budget_Required_INR__c, Installment_of_Funds_4__c, Installment_of_Funds_6__c, Installment_of_Funds_5__c
                FROM Milestone__c
                WHERE Individual_Application__c = :app.Id
            ]) {
                if (m.Milestone_Description__c != null) {
                    existingMilestonesMap.put(m.Milestone_Description__c.trim().toLowerCase(), m);
                }
            }
            
            List<Milestone__c> msRecs = new List<Milestone__c>();
            if (milestones != null && !milestones.isEmpty()) {
                for (Map<String, Object> m : milestones) {
                    Boolean allBlank = true;
                    for (Object v : m.values()) {
                        if (v != null && String.valueOf(v).trim() != '') {
                            allBlank = false;
                            break;
                        }
                    }
                    if (allBlank) continue;
                    
                    String descp = (String)m.get('Milestone_Description__c');
                    Milestone__c ms;
                    if (descp != null && descp.trim() != '') {
                        String key = descp.trim().toLowerCase();
                        if (existingMilestonesMap.containsKey(key)) {
                            ms = existingMilestonesMap.get(key);
                        }
                    }

                    if (ms == null) {
                        Id msId = (m.containsKey('Id') && m.get('Id') != null) ? (Id)m.get('Id') : null;
                        ms = msId != null
                            ? new Milestone__c(Id = msId, Individual_Application__c = app.Id)
                            : new Milestone__c(Individual_Application__c = app.Id);
                    }

                    for (String key : m.keySet()) {
                        if (key == 'Id') continue;
                        Object val = m.get(key);
                        if (isBlankValue(val)) continue;

                        try { 
                            // ✔️ DATE FIELDS HANDLED HERE
                            if (key.endsWith('_Date__c')) {
                                ms.put(key, String.valueOf(val));
                            }
                            else if (
                                key.contains('Amount') || key.contains('Budget') ||
                                 key.contains('Year')
                            ) {
                                ms.put(key, Decimal.valueOf(String.valueOf(val)));
                            } else {
                                ms.put(key, val);
                            }
                        } catch (Exception ex) {
                            System.debug('⚠️ Skipped milestone field ' + key + ': ' + ex.getMessage());
                        }
                    }

                    ms.Status__c = 'Draft';
                    msRecs.add(ms);
                }
                if (!msRecs.isEmpty()) upsert msRecs;
            }


            // ────────────────────────
            // 💰 Budget Upsert with Deduplication
            // ────────────────────────
            Map<String, Budget> existingBudgetsMap = new Map<String, Budget>();
            for (Budget b : [
                SELECT Id,  Name, Amount, Justification__c, Proposal__c,Year_1__c, Year_2__c, Year_3_USD__c, Total_Amount__c, Total_Amount_INR__c FROM Budget
                WHERE Proposal__c = :app.Id
            ]) {
                if (b.Name != null) {
                    existingBudgetsMap.put(b.Name.trim().toLowerCase(), b);
                }
            }

            List<Budget> bdRecs = new List<Budget>();
            if (budgets != null && !budgets.isEmpty()) {
                for (Map<String, Object> b : budgets) {
                    Boolean allBlank = true;
                    for (Object v : b.values()) {
                        if (v != null && String.valueOf(v).trim() != '') {
                            allBlank = false;
                            break;
                        }
                    }
                    if (allBlank) continue;

                    String bName = (String)b.get('Name');
                    Budget bud;

                    if (!String.isBlank(bName)) {
                        String key = bName.trim().toLowerCase();
                        if (existingBudgetsMap.containsKey(key)) {
                            bud = existingBudgetsMap.get(key);
                        }
                    }

                    if (bud == null) {
                        bud = (b.containsKey('Id') && b.get('Id') != null)
                            ? new Budget(Id = (Id)b.get('Id'), Proposal__c = app.Id)
                            : new Budget(Proposal__c = app.Id);
                    }

                    Decimal usd  = (b.containsKey('Total_Amount__c') && b.get('Total_Amount__c') != null)
                        ? Decimal.valueOf(String.valueOf(b.get('Total_Amount__c')))
                        : 0;
                    
                    Decimal inr  = (b.containsKey('Total_Amount_INR__c') && b.get('Total_Amount_INR__c') != null)
                        ? Decimal.valueOf(String.valueOf(b.get('Total_Amount_INR__c')))
                        : 0;
                    
                    bud.Total_Amount__c     = usd;
                    bud.Total_Amount_INR__c = inr;

                    if (b.containsKey('Justification__c')) {
                        bud.Justification__c = String.valueOf(b.get('Justification__c')).trim();
                    }

                    bud.Name = bName;
                    bud.Status = 'Draft';
                    bdRecs.add(bud);
                }

                if (!bdRecs.isEmpty()) {
                    upsert bdRecs;
                }
            }

            // ────────────────────────
            // 👥 Co-Founder Upsert with Deduplication
            // ────────────────────────
            Map<String, Co_Founder__c> existingCoFoundersMap = new Map<String, Co_Founder__c>();
            for (Co_Founder__c cf : [
                SELECT Id, Name, Designation__c, Institution__c, Mobile__c, Email__c
                FROM Co_Founder__c WHERE Individual_Application__c = :app.Id
            ]) {
                if (cf.Name != null) existingCoFoundersMap.put(cf.Name.trim().toLowerCase(), cf);
            }

            List<Co_Founder__c> cfRecs = new List<Co_Founder__c>();
            if (coFounders != null && !coFounders.isEmpty()) {
                for (Map<String, Object> c : coFounders) {
                    Boolean allBlank = true;
                    for (Object v : c.values()) {
                        if (v != null && String.valueOf(v).trim() != '') { allBlank = false; break; }
                    }
                    if (allBlank) continue;

                    String cName = (String)c.get('Name');
                    Co_Founder__c cfRec;
                    if (!String.isBlank(cName) && existingCoFoundersMap.containsKey(cName.trim().toLowerCase())) {
                        cfRec = existingCoFoundersMap.get(cName.trim().toLowerCase());
                    } else {
                        cfRec = (c.containsKey('Id') && c.get('Id') != null)
                            ? new Co_Founder__c(Id = (Id)c.get('Id'), Individual_Application__c = app.Id)
                            : new Co_Founder__c(Individual_Application__c = app.Id);
                    }
                    cfRec.Name = cName;
                    cfRec.Designation__c = (String)c.get('Designation__c');
                    cfRec.Institution__c = (String)c.get('Institution__c');
                    cfRec.Mobile__c = (String)c.get('Mobile__c');
                    cfRec.Email__c = (String)c.get('Email__c');
                    cfRecs.add(cfRec);
                }
                if (!cfRecs.isEmpty()) upsert cfRecs;
            }

            // 🔁 Return updated saved budgets
            response.applicationId = app.Id;
            response.savedBudgets = [
                SELECT Id, Name, Amount, Justification__c, Proposal__c,Year_1__c, Year_2__c, Year_3_USD__c, Total_Amount__c, Total_Amount_INR__c
                FROM Budget
                WHERE Proposal__c = :app.Id
            ];
            response.savedMilestones = [
          SELECT Id, Milestone_Description__c, Deliverables__c, Budget_Required__c, Target_Completion_Months__c, Justification__c, Activities_under_this_Milestone__c,
         Installment_of_Funds_1__c, Installment_of_Funds_2__c, Installment_of_Funds_3__c, Installment_of_Funds_5__c, Output_and_Deliverables__c,  
         Budget_Required_INR__c, Installment_of_Funds_4__c, Project_End_Date__c, Project_Start_Date__c, Installment_of_Funds_6__c
        FROM Milestone__c
        WHERE Individual_Application__c = :app.Id
    ];

            return response;
        } catch (Exception e) {
            throw buildError('Draft save failed: ' + e.getMessage());
        }
    }

   
    @AuraEnabled
    public static void deleteBudgetRecord(Id budgetId) {
        try {
            Budget b = [SELECT Id FROM Budget WHERE Id = :budgetId LIMIT 1];
            delete b;
        } catch (Exception e) {
            throw buildError('Failed to delete budget: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void deleteMilestoneRecord(Id milestoneId) {
        try {
            Milestone__c m = [SELECT Id FROM Milestone__c WHERE Id = :milestoneId LIMIT 1];
            delete m;
        } catch (Exception e) {
            throw buildError('Failed to delete milestone: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteCoFounderRecord(Id coFounderId) {
        try {
            Co_Founder__c cf = [SELECT Id FROM Co_Founder__c WHERE Id = :coFounderId LIMIT 1];
            delete cf;
        } catch (Exception e) {
            throw buildError('Failed to delete co-founder: ' + e.getMessage());
        }
    }

 
    @AuraEnabled
    public static Id saveApplicationWithMilestones(
        Map<String, Object> applicationData,
        List<Map<String, Object>> milestones,
        List<Id> fileIds,
        List<Map<String, Object>> budgets,
        List<Map<String, Object>> coFounders
    ) {
        try {
            User currentUser = [
                SELECT Id, ContactId, AccountId
                FROM User
                WHERE Id = :UserInfo.getUserId()
            ];
            
            Boolean isInsert = String.isBlank((String)applicationData.get('Id'));
            IndividualApplication appRecord = isInsert
                ? new IndividualApplication(AccountId = currentUser.AccountId, ContactId = currentUser.ContactId)
                : [SELECT Id FROM IndividualApplication WHERE Id = :((String)applicationData.get('Id')) LIMIT 1];
                    
            Map<String, Schema.SObjectField> parentFields = Schema.SObjectType.IndividualApplication.fields.getMap();
            
            for (String fld : applicationData.keySet()) {
                if (fld == 'Id' || !parentFields.containsKey(fld)) continue;
                Object raw = applicationData.get(fld);
                // Skip null AND blank-string values so empty inputs (e.g. an
                // unfilled Date field sent as "") never reach type conversion —
                // this was the exact cause of the "Script-thrown exception" on
                // submit (Date.valueOf('') throwing on a blank date field).
                if (isBlankValue(raw)) continue;
                
                Schema.DisplayType dt = parentFields.get(fld).getDescribe().getType();
                
                switch on dt {
                    when Date {
                        try {
                            appRecord.put(fld, Date.valueOf(String.valueOf(raw)));
                        } catch (Exception e) {
                            throw buildError('Invalid date for field: ' + fld + ' → ' + raw);
                        }
                    }
                    
                    when DateTime {
                        try {
                            appRecord.put(fld, Datetime.valueOfGmt(String.valueOf(raw)));
                        } catch (Exception e) {
                            throw buildError('Invalid datetime for field: ' + fld + ' → ' + raw);
                        }
                    }
                    when Integer, Double, Currency, Percent {
                        String s = String.valueOf(raw).replaceAll('[^0-9\\.-]', '');
                        if (Pattern.matches('^-?\\d+(\\.\\d+)?$', s)) {
                            appRecord.put(fld, Decimal.valueOf(s));
                        }
                    }
                    when Boolean {
                        appRecord.put(fld, Boolean.valueOf(String.valueOf(raw)));
                    }
                    when Reference {
                        String idStr = String.valueOf(raw);
                        if (Pattern.matches('^[a-zA-Z0-9]{15,18}$', idStr)) {
                            appRecord.put(fld, idStr);
                        }
                    }
                    when else {
                        appRecord.put(fld, raw);
                    }
                }
            }
           appRecord.AppliedDate = DateTime.now();
            
            //Auto-assign COE Approver based on logged-in user's Account
            if (currentUser.AccountId != null) {
                // Find COE Contact (with COE_Admin__c = TRUE) under the same Account
                List<Contact> coeContacts = [SELECT Id, Name FROM Contact
                                             WHERE AccountId = :currentUser.AccountId AND COE_Admin__c = TRUE  LIMIT 1];
                
                if (!coeContacts.isEmpty()) {
                    Contact coeContact = coeContacts[0];
                    
                    // Find the corresponding User for this COE Contact
                    List<User> coeUsers = [SELECT Id, Name FROM User WHERE ContactId = :coeContact.Id AND IsActive = TRUE LIMIT 1];
                    
                    if (!coeUsers.isEmpty()) {
                        appRecord.COE_Approver__c = coeUsers[0].Id; // ✅ assign COE user as approver
                    } else {
                        System.debug('⚠️ No active User found for COE Contact: ' + coeContact.Id);
                    }
                } else {
                    System.debug('⚠️ No COE contact found for AccountId: ' + currentUser.AccountId);
                }
            } else {
                System.debug('⚠️ User has no AccountId, skipping COE assignment.');
            }
            
            if (isInsert) insert appRecord;
            else update appRecord;
            
            // Save Milestones
            if (milestones != null && !milestones.isEmpty()) {
                List<Milestone__c> msRecs = new List<Milestone__c>();
                for (Map<String, Object> m : milestones) {
                    Boolean allBlank = true;
                    for (Object v : m.values()) {
                        if (v != null && String.valueOf(v).trim() != '') {
                            allBlank = false;
                            break;
                        }
                    }
                    if (allBlank) continue;
                    
                    Id msId = (m.containsKey('Id') && m.get('Id') != null) ? (Id)m.get('Id') : null;
                    Milestone__c ms = msId != null
                        ? new Milestone__c(Id = msId, Individual_Application__c = appRecord.Id)
                        : new Milestone__c(Individual_Application__c = appRecord.Id);
                    
                    for (String fld : m.keySet()) {
                        if (fld == 'Id') continue;
                        Object v = m.get(fld);
                        if (isBlankValue(v) || !fld.endsWith('__c')) continue;
                        try { 
                            if (
                                fld.contains('Amount') || fld.contains('Cost') ||
                                fld.contains('Budget') || fld.contains('Year') 
                            ) {
                                ms.put(fld, Decimal.valueOf(String.valueOf(v)));
                            } else if (v instanceof List<Object>) {
                                List<String> tmp = new List<String>();
                                for (Object o : (List<Object>)v) tmp.add(String.valueOf(o));
                                ms.put(fld, String.join(tmp, ';'));
                            } else if (v instanceof String && fld.endsWith('_Date__c')) {
                                ms.put(fld, String.valueOf(v));
                            } else {
                                ms.put(fld, v);
                            }
                        } catch (Exception ex) {
                            System.debug('⚠️ Skipped milestone field ' + fld + ': ' + ex.getMessage());
                        }
                    }
                    ms.Status__c = (String)applicationData.get('Status__c');
                    ms.Status__c = 'Submitted';
                    msRecs.add(ms);
                }
                if (!msRecs.isEmpty()) upsert msRecs;
            }
            
            // Save Budgets
            if (budgets != null && !budgets.isEmpty()) {
                List<Budget> bdRecs = new List<Budget>();
                for (Map<String, Object> b : budgets) {
                    Boolean allBlank = true;
                    for (Object v : b.values()) {
                        if (v != null && String.valueOf(v).trim() != '') {
                            allBlank = false;
                            break;
                        }
                    }
                    if (allBlank) continue;
                    
                    Id bdId = (b.containsKey('Id') && b.get('Id') != null) ? (Id)b.get('Id') : null;
                    Budget bud = bdId != null
                        ? new Budget(Id = bdId, Proposal__c = appRecord.Id)
                        : new Budget(Proposal__c = appRecord.Id);
                    
                    for (String fld : b.keySet()) {
                        if (fld == 'Id') continue;
                        Object v = b.get(fld);
                        if (isBlankValue(v)) continue;
                        try {
                            if (fld.endsWith('_Date__c') && v instanceof String) {
                                bud.put(fld, Date.valueOf((String)v));
                            } else if (
                                fld.contains('Amount') || fld.contains('Cost') ||
                                fld.contains('Budget') || fld.contains('Year')
                            ) {
                                bud.put(fld, Decimal.valueOf(String.valueOf(v)));
                            } else {
                                bud.put(fld, v);
                            }
                        } catch (Exception e) {
                            System.debug('⚠️ Skipped budget field ' + fld + ': ' + e.getMessage());
                        }
                    }
                    bud.Status = (String)applicationData.get('Status__c');
                    bud.Status = 'Submitted';
                    bdRecs.add(bud);
                }
                if (!bdRecs.isEmpty()) upsert bdRecs;
            }

            // Save Co-Founders
            if (coFounders != null && !coFounders.isEmpty()) {
                List<Co_Founder__c> coFounderRecords = new List<Co_Founder__c>();
                for (Map<String, Object> c : coFounders) {
                    Boolean allBlank = true;
                    for (Object v : c.values()) {
                        if (v != null && String.valueOf(v).trim() != '') {
                            allBlank = false;
                            break;
                        }
                    }
                    if (allBlank) continue;

                    Id coFounderId = (c.containsKey('Id') && c.get('Id') != null) ? (Id)c.get('Id') : null;

                    Co_Founder__c cf = coFounderId != null
                        ? new Co_Founder__c(Id = coFounderId, Individual_Application__c = appRecord.Id)
                        : new Co_Founder__c(Individual_Application__c = appRecord.Id);

                    cf.Name = (String)c.get('Name');
                    cf.Designation__c = (String)c.get('Designation__c');
                    cf.Institution__c = (String)c.get('Institution__c');
                    cf.Mobile__c = (String)c.get('Mobile__c');
                    cf.Email__c = (String)c.get('Email__c');

                    coFounderRecords.add(cf);
                }
                if (!coFounderRecords.isEmpty()) {
                    upsert coFounderRecords;
                }
            }
            
            // Attach Files
            if (fileIds != null && !fileIds.isEmpty()) {
                List<ContentDocumentLink> links = new List<ContentDocumentLink>();
                for (Id docId : fileIds) {
                    links.add(new ContentDocumentLink(
                        ContentDocumentId = docId,
                        LinkedEntityId = appRecord.Id,
                        ShareType = 'V'
                    ));
                }
                insert links;
            }
            
            return appRecord.Id;
        }
        catch (Exception e) {
            throw buildError('Submission failed: ' + e.getMessage());
        }
    }
    
    // ────────────────────────────────────────────────────────────────────────────
    private without sharing class CoPIAccountHelper {
        public Account findOrCreate(String instName) {
            for (Account a : [
                SELECT Id FROM Account WHERE Name = :instName LIMIT 1
            ]) return a;
            Account acct = new Account(Name = instName);
            insert acct;
            return acct;
        }
    }
}