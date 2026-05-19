public without sharing class winFormSaveDraft {
    // ────────────────────────────────────────────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getLoggedInUserDetails() {
        User u = [SELECT Id, ContactId, AccountId FROM User WHERE Id = :UserInfo.getUserId()];
        Map<String, String> userDetails = new Map<String, String>();
        if (u.ContactId != null) {
            Contact c = [SELECT Id, Name, AccountId FROM Contact  WHERE Id = :u.ContactId  AND COE_Admin__c = TRUE LIMIT 1 ];
            userDetails.put('ContactId',   c.Id);
            userDetails.put('ContactName', c.Name);
            userDetails.put('AccountId',   c.AccountId);
            if (c.AccountId != null) {
                Account a = [SELECT Id, Name FROM Account WHERE Id = :c.AccountId];
                userDetails.put('AccountName', a.Name);
            }
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
            throw new AuraHandledException('No active funding opportunity found.');
        }
    }
    
    public class DraftWrapper {
        @AuraEnabled public Id                        Id;
        @AuraEnabled public Map<String, Object>       applicationData;
        @AuraEnabled public List<Map<String, Object>> milestones;
        @AuraEnabled public List<Map<String, Object>> budgets;
    }
    
    // ────────────────────────────────────────────────────────────────────────────
    @AuraEnabled           //(cacheable=true)
    public static DraftWrapper getDraftApplication(Id recordId) {
        // 1) Build a full list of all API names on IndividualApplication
        Map<String, Schema.SObjectField> fieldMap = 
            Schema.SObjectType.IndividualApplication.fields.getMap();
        List<String> allFields = new List<String>(fieldMap.keySet());
         String whereClause;
        
        
        // 2) Inline the current user's Id into the SOQL string
        String userId = UserInfo.getUserId();
         // whereClause = 'CreatedById = \'' + userId + '\' AND Status = \'Draft\' ORDER BY LastModifiedDate DESC LIMIT 1';
       String soql = 
            'SELECT ' + String.join(allFields, ',') +
            ' FROM IndividualApplication' +
            ' WHERE CreatedById = \'' + userId + '\'' +
            ' AND Id = \'' + recordId + '\'' +
            '   AND Status = \'Draft\'' +
           ' LIMIT 1';
           // ' ORDER BY LastModifiedDate DESC' +
            
          
      
          /* String soql = 'SELECT ' + String.join(allFields, ',') +
                  ' FROM IndividualApplication' +
                  ' WHERE ' + whereClause;    */    
        
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
            SELECT Id,
            Milestone_Description__c,
            Deliverables__c,
            Budget_Required__c,
            Milestone_Target_Date__c,
            Justification__c,
            Status__c
            FROM Milestone__c
            WHERE Individual_Application__c = :draft.Id
        ];
        wrap.milestones = new List<Map<String, Object>>();
        for (Milestone__c m : msList) {
            wrap.milestones.add(new Map<String, Object>{
                'Id'                        => m.Id,
                    'Milestone_Description__c'  => m.Milestone_Description__c,
                    'Deliverables__c'           => m.Deliverables__c,
                    'Budget_Required__c'        => m.Budget_Required__c,
                    'Milestone_Target_Date__c'  => m.Milestone_Target_Date__c,
                    'Justification__c'          => m.Justification__c,
                    'Status__c'                 => m.Status__c
                    });
        }
        
        // 6) Load child Budgets
        List<Budget> bdList = [
            SELECT Id, Name, Amount, Justification__c, Status
            FROM Budget
            WHERE Proposal__c = :draft.Id
        ];
        wrap.budgets = new List<Map<String, Object>>();
        for (Budget b : bdList) {
            wrap.budgets.add(new Map<String, Object>{
                'Id'               => b.Id,
                    'Name'             => b.Name,
                    'Amount'           => b.Amount,
                    'Justification__c' => b.Justification__c,
                    'Status'           => b.Status
                    });
        }
        
        return wrap;
    }
    
    
    @AuraEnabled
    public static Id saveDraftApplication(
        Id                       applicationId,
        Map<String, Object>      applicationData,
        List<Map<String, Object>> milestones,
        List<Map<String, Object>> budgets,
        Id                       recordTypeId,
        String                   category
    ) {
        try {
            // 1) Current user
            User current = [SELECT ContactId, AccountId FROM User WHERE Id = :UserInfo.getUserId()];
            
            // 2) Parent insert vs update
            Boolean isNew = (applicationId == null);
            IndividualApplication app = isNew
                ? new IndividualApplication(ContactId = current.ContactId, AccountId = current.AccountId)
                : [SELECT Id FROM IndividualApplication WHERE Id = :applicationId];
                    
                    // 3) Schema-driven field mapping
                    Map<String, Schema.SObjectField> parentFields = Schema.SObjectType.IndividualApplication.fields.getMap();
            for (String fld : applicationData.keySet()) {
                if (fld == 'Id' || !parentFields.containsKey(fld)) continue;
                Object raw = applicationData.get(fld);
                if (raw == null) continue;
                
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
            
            // 4) PI Contact Mapping
            String piEmail       = (String)applicationData.get('PI_Email__c');
            String piName        = (String)applicationData.get('PI_Name__c');
            String piPhone       = (String)applicationData.get('PI_Phone__c');
            String piDesignation = (String)applicationData.get('PI_Designation__c');
            
            if (!String.isBlank(piEmail)) {
                List<Contact> existingPI = [
                    SELECT Id FROM Contact
                    WHERE Email = :piEmail AND AccountId = :current.AccountId
                    LIMIT 1
                ];
                if (!existingPI.isEmpty()) {
                    app.COE_Admin__c = existingPI[0].Id;
                } else {
                    Contact newPI = new Contact(
                        LastName       = piName,
                        Email          = piEmail,
                        COE_PI__c      = true,
                        Phone          = piPhone,
                        Designation__c = piDesignation,
                        AccountId      = current.AccountId
                    );
                    insert newPI;
                    app.COE_Admin__c = newPI.Id;
                }
            }
            
            // 5) Co-PI Contact Mapping
            String coPIEmail       = (String)applicationData.get('CO_PI_Email__c');
            String coPIName        = (String)applicationData.get('Co_Principal_Investigator_Co_PI__c');
            String coPIInst        = (String)applicationData.get('CO_PI_Institution__c');
            String coPIPhone       = (String)applicationData.get('CO_PI_Phone__c');
            String coPIDesignation = (String)applicationData.get('CO_PI_Designation__c');
            
            if (!String.isBlank(coPIEmail)) {
                List<Contact> existingCoPI = [
                    SELECT Id FROM Contact
                    WHERE Email = :coPIEmail
                    LIMIT 1
                ];
                if (!existingCoPI.isEmpty()) {
                    app.CO_PI_Contact__c = existingCoPI[0].Id;
                } else {
                    Account coPIAccount;
                    List<Account> accList = [SELECT Id FROM Account WHERE Name = :coPIInst LIMIT 1];
                    if (!accList.isEmpty()) {
                        coPIAccount = accList[0];
                    } else {
                        coPIAccount = new Account(Name = coPIInst);
                        insert coPIAccount;
                    }
                    Contact newCoPI = new Contact(
                        LastName       = coPIName,
                        Email          = coPIEmail,
                        AccountId      = coPIAccount.Id,
                        COE_CO_PI__c   = true,
                        Phone          = coPIPhone,
                        Designation__c = coPIDesignation
                    );
                    insert newCoPI;
                    app.CO_PI_Contact__c = newCoPI.Id;
                }
            }
            
            // 6) Metadata
            app.Status       = 'Draft';
            app.RecordTypeId = recordTypeId;
            app.Category     = category;
            
            // 7) Save parent
            if (isNew) insert app; else update app;
            
            // 8) Upsert Milestones
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
                        ? new Milestone__c(Id = msId, Individual_Application__c = app.Id)
                        : new Milestone__c(Individual_Application__c = app.Id);
                    for (String key : m.keySet()) {
                        if (key == 'Id') continue;
                        
                        Object val = m.get(key);
                        if (key == 'Milestone_Target_Date__c' && val != null) {
                            if (val instanceof Date) {
                                ms.put(key, (Date)val);
                            } else if (val instanceof String && Pattern.matches('\\d{4}-\\d{2}-\\d{2}', (String)val)) {
                                ms.put(key, Date.valueOf((String)val));
                            }
                        } else {
                            ms.put(key, val);
                        }
                    }
                    ms.Status__c = 'Draft';
                    msRecs.add(ms);
                }
                if (!msRecs.isEmpty()) upsert msRecs;
            }
            
            // 9) Upsert Budgets
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
                        ? new Budget(Id = bdId, Proposal__c = app.Id)
                        : new Budget(Proposal__c = app.Id);
                    for (String key : b.keySet()) {
                        if (key == 'Id') continue;
                        bud.put(key, b.get(key));
                    }
                    bud.Status = 'Draft';
                    bdRecs.add(bud);
                }
                if (!bdRecs.isEmpty()) upsert bdRecs;
            }
            
            return app.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Draft save failed: ' + e.getMessage());
        }
    }
    
    
    @AuraEnabled
    public static Id saveApplicationWithMilestones(
        Map<String, Object> applicationData,
        List<Map<String, Object>> milestones,
        List<Id> fileIds,
        List<Map<String, Object>> budgets
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
                if (raw == null) continue;
                
                Schema.DisplayType dt = parentFields.get(fld).getDescribe().getType();
                
                switch on dt {
                    when Date {
                        try {
                            appRecord.put(fld, Date.valueOf(String.valueOf(raw)));
                        } catch (Exception e) {
                            throw new AuraHandledException('Invalid date for field: ' + fld + ' → ' + raw);
                        }
                    }
                    
                    when DateTime {
                        try {
                            appRecord.put(fld, Datetime.valueOfGmt(String.valueOf(raw)));
                        } catch (Exception e) {
                            throw new AuraHandledException('Invalid datetime for field: ' + fld + ' → ' + raw);
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
                        if (v == null || !fld.endsWith('__c')) continue;
                        try {
                            if (
                                fld.contains('Amount') || fld.contains('Cost') ||
                                fld.contains('Budget') || fld.contains('Year') ||
                                fld.contains('Month')
                            ) {
                                ms.put(fld, Decimal.valueOf(String.valueOf(v)));
                            } else if (v instanceof List<Object>) {
                                List<String> tmp = new List<String>();
                                for (Object o : (List<Object>)v) tmp.add(String.valueOf(o));
                                ms.put(fld, String.join(tmp, ';'));
                            } else if (v instanceof String && fld.endsWith('_Date__c')) {
                                ms.put(fld, Date.valueOf((String)v));
                            } else {
                                ms.put(fld, v);
                            }
                        } catch (Exception ex) {
                            System.debug('⚠️ Skipped milestone field ' + fld + ': ' + ex.getMessage());
                        }
                    }
                    ms.Status__c = (String)applicationData.get('Status__c');
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
                        if (v == null) continue;
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
                    bdRecs.add(bud);
                }
                if (!bdRecs.isEmpty()) upsert bdRecs;
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
            throw new AuraHandledException('Submission failed: ' + e.getMessage());
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