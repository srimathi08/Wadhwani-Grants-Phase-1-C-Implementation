public without sharing class WCFFormController {
    
    @AuraEnabled(cacheable=true)
    public static Id getActiveFundingOpportunityId() {
        try {
            FundingOpportunity fo = [ SELECT Id FROM FundingOpportunity WHERE Status = 'Active' AND FO_Type__c = 'WCF Proposal'
                                     AND RecordType.DeveloperName = 'WCF_Project_Proposal'  LIMIT 1];       
            return fo.Id;
        } catch (Exception e) {
            throw new AuraHandledException('No active funding opportunity found.');
        }
    }
    
    //New AI Feedback Logic
    @AuraEnabled
public static Id upsertAIFeedback(String fieldApiName, String fieldValue, String submitterName) {
    
    System.debug('=== Method Start: upsertAIFeedback ===');
    System.debug('Field API Name: ' + fieldApiName);
    System.debug('Field Value: ' + fieldValue);
    System.debug('Submitter Name: ' + submitterName);

    if (String.isBlank(fieldApiName) || String.isBlank(submitterName)) {
        System.debug('Error: Missing fieldApiName or submitterName');
        throw new AuraHandledException('Missing field or submitter name.');
    }

    // Try to find a record for this submitter
    List<AI_Feedback__c> recs = [
        SELECT Id FROM AI_Feedback__c WHERE Submitter_Name__c = :submitterName LIMIT 1
    ];
    
    System.debug('Records found: ' + recs.size());

    AI_Feedback__c rec;

    if (recs.isEmpty()) {
        System.debug('No existing record found. Creating new record.');
        rec = new AI_Feedback__c(Submitter_Name__c = submitterName);
    } else {
        System.debug('Existing record found. ID: ' + recs[0].Id);
        rec = recs[0];
    }

    // Set the correct field dynamically
    System.debug('Setting field dynamically...');
    rec.put(fieldApiName, fieldValue);

    System.debug('Record before upsert: ' + rec);

    upsert rec;

    System.debug('Record upserted successfully. ID: ' + rec.Id);
    System.debug('=== Method End ===');

    return rec.Id;
}
    
    @AuraEnabled //(cacheable=true)
    public static Map<String, Object> getAIFeedbackRecord(String submitterName) {
        
        // Fetch the AI_Feedback__c record for this submitter
        AI_Feedback__c rec = [SELECT Id, Submitter_Name__c, Legal_Structure_FR__c, Organizational_Sustainability_FR__c,
                              Use_of_Additional_Funding_FR__c, Operational_Synergies_with_WOF_FR__c, Operational_Synergies_with_WOF__c,
                              Use_of_Additional_Funding__c, Operational_Synergies_with_WOF_JC__c, Operational_Synergies_with_WOF_JC_FR__c,
                              Operational_Synergies_with_WOF_Both__c, Operational_Synergies_with_WOF_Both_FR__c,Job_Creation_Approach_FR__c
                              FROM AI_Feedback__c      
                              WHERE Submitter_Name__c = :submitterName LIMIT 1];
        
        Map<String, Object> data = new Map<String, Object>();
        data.put('Id', rec.Id);
        data.put('Legal_Structure_FR__c', rec.Legal_Structure_FR__c);
        data.put('Organizational_Sustainability_FR__c', rec.Organizational_Sustainability_FR__c);
        data.put('Use_of_Additional_Funding__c', rec.Use_of_Additional_Funding__c);
        data.put('Use_of_Additional_Funding_FR__c', rec.Use_of_Additional_Funding_FR__c);
        data.put('Operational_Synergies_with_WOF__c', rec.Operational_Synergies_with_WOF__c);
        data.put('Operational_Synergies_with_WOF_FR__c', rec.Operational_Synergies_with_WOF_FR__c);
        data.put('Operational_Synergies_with_WOF_JC__c', rec.Operational_Synergies_with_WOF_JC__c);
        data.put('Operational_Synergies_with_WOF_JC_FR__c', rec.Operational_Synergies_with_WOF_JC_FR__c);
        data.put('Operational_Synergies_with_WOF_Both__c', rec.Operational_Synergies_with_WOF_Both__c);
        data.put('Operational_Synergies_with_WOF_Both_FR__c', rec.Operational_Synergies_with_WOF_Both_FR__c);
        data.put('Job_Creation_Approach_FR__c', rec.Job_Creation_Approach_FR__c);
        return data;
    }
    
   /* @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getPicklistValuesForField(String objectApiName, String fieldApiName, String languageCode) {
       Schema.SObjectType targetType = Schema.getGlobalDescribe().get(objectApiName);
        if (targetType == null) return new List<Map<String, String>>();
        
        Schema.DescribeSObjectResult describeResult = targetType.getDescribe();
        Schema.DescribeFieldResult fieldResult = describeResult.fields.getMap().get(fieldApiName).getDescribe();
        
        List<Map<String, String>> options = new List<Map<String, String>>();
        for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            options.add(new Map<String, String>{
                'label' => entry.getLabel(),
                    'value' => entry.getValue()
                    });
        }
        return options;
     
    }*/
     @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getPicklistValuesForField(
        String objectApiName,
        String fieldApiName,
        String languageCode
    ) {
        Schema.SObjectType objType = Schema.getGlobalDescribe().get(objectApiName);
        if (objType == null) {
            throw new AuraHandledException('Invalid object: ' + objectApiName);
        }

        Schema.DescribeSObjectResult objDescribe = objType.getDescribe();
        Schema.DescribeFieldResult fieldDescribe = objDescribe.fields.getMap().get(fieldApiName).getDescribe();

        List<Map<String, String>> results = new List<Map<String, String>>();

        for (Schema.PicklistEntry entry : fieldDescribe.getPicklistValues()) {
            String apiValue = entry.getValue();
            String label = entry.getLabel(); // default label (in user’s Salesforce language)

            // 🔑 Override label with manual translations
            if (languageCode != null) {
                label = translatePicklistValue(apiValue, languageCode, label);
            }

            results.add(new Map<String, String>{
                'value' => apiValue,
                'label' => label
            });
        }

        return results;
    }

    // Helper method INSIDE the class (after the method above, but before the final class brace)
  private static String translatePicklistValue(String apiValue, String lang, String defaultLabel) {
    if (String.isBlank(lang)) return defaultLabel;

    // 🔑 Normalize language input (handles 'Portuguese', 'pt_BR', 'es_MX', etc.)
    lang = lang.toLowerCase();
    if (lang.startsWith('pt') || lang.contains('portuguese')) lang = 'pt';
    if (lang.startsWith('es') || lang.contains('spanish')) lang = 'es';
    if (lang.startsWith('en') || lang.contains('english')) lang = 'en';

    Map<String, Map<String, String>> translations = new Map<String, Map<String, String>>{
        'Job Fulfillment Only' => new Map<String, String>{
            'es' => 'Solo cumplimiento de empleo',
            'pt' => 'Apenas cumprimento de emprego'
        },
        'Job Creation Only' => new Map<String, String>{
            'es' => 'Solo creación de empleo',
            'pt' => 'Apenas criação de emprego'
        },
        'Both Job Fulfillment and Job Creation' => new Map<String, String>{
            'es' => 'Cumplimiento y creación de empleo',
            'pt' => 'Cumprimento e criação de emprego'
        },
              // Generic Yes/No (used by multiple fields)
        'Yes' => new Map<String, String>{
            'es' => 'Sí',
            'pt' => 'Sim'
        },
        'No' => new Map<String, String>{
            'es' => 'No',
            'pt' => 'Não'
        }
    };

    if (translations.containsKey(apiValue) && translations.get(apiValue).containsKey(lang)) {
        return translations.get(apiValue).get(lang);
    }
    return defaultLabel; // fallback to English if no translation found
}

   
    
   /* @AuraEnabled
    public static String getFieldFeedback(String fieldLabel, String fieldValue) {
        try {
            ConnectApi.WrappedValue question = new ConnectApi.WrappedValue();
            question.value = fieldLabel;
            
            ConnectApi.WrappedValue response = new ConnectApi.WrappedValue();
            response.value = fieldValue;
            
            Map<String, ConnectApi.WrappedValue> inputParams = new Map<String, ConnectApi.WrappedValue>{
                'Input:question' => question,
                    'Input:response' => response
                    };
                        
                        ConnectApi.EinsteinPromptTemplateGenerationsInput input = new ConnectApi.EinsteinPromptTemplateGenerationsInput();
            input.inputParams = inputParams;
            
            input.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
            input.additionalConfig.numGenerations = 1;
            input.additionalConfig.enablePiiMasking = true;
            input.additionalConfig.applicationName = 'PromptTemplateGenerationsInvocable';
            input.isPreview = false;
            
            ConnectApi.EinsteinPromptTemplateGenerationsRepresentation output =
                ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate('Grant_Field_Feedback_Template', input);
            
            return output.generations[0].text;
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }*/
    /*@AuraEnabled(cacheable=true)
public static Map<String, List<FileInfo>> getOutcomeFilesByCell(Id outcomeId) {
Map<String, List<FileInfo>> filesByCell = new Map<String, List<FileInfo>>();

// Get all ContentDocumentLinks for this outcome record
List<ContentDocumentLink> links = [
SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.Description, Id
FROM ContentDocumentLink
WHERE LinkedEntityId = :outcomeId
];

for (ContentDocumentLink link : links) {
// ⚡️ Assume you store cellKey in Description or Title (during upload, see below)
String cellKey = link.ContentDocument.Description;
if (String.isBlank(cellKey)) cellKey = 'default'; // fallback

if (!filesByCell.containsKey(cellKey)) filesByCell.put(cellKey, new List<FileInfo>());
filesByCell.get(cellKey).add(new FileInfo(
link.ContentDocumentId,
link.ContentDocument.Title,
cellKey
));
}
return filesByCell;
}*/
    
    public class SaveDraftResponse {
        @AuraEnabled public Id applicationId;
        @AuraEnabled public Id outcomeId;
        @AuraEnabled public Id fiscalId;
        @AuraEnabled public Id historicId;
    }
    
    // Helper to validate SF Id
    public static Boolean isValidId(Object val) {
        return val != null && String.valueOf(val).length() >= 15 &&
            Pattern.matches('^[a-zA-Z0-9]{15,18}$', String.valueOf(val));
    }

    
    @AuraEnabled
    public static SaveDraftResponse saveWCFDraftApplication(
        Map<String, Object> orgData,
        Map<String, Object> historicalData,
        Map<String, Object> fiscalData,
        Map<String, Object> outcomeData,
        String selectedFundingArea,
        Id recordId,
        List<String> uploadedFileIds
    ) {
        SaveDraftResponse response = new SaveDraftResponse();
        
        try {
            User currentUser = [SELECT Id, ContactId, AccountId FROM User WHERE Id = :UserInfo.getUserId()];
            Id accountId = currentUser.AccountId;
            
            String key = selectedFundingArea != null ? selectedFundingArea.toLowerCase() : '';
            String rtId = key.contains('fulfillment') && key.contains('creation') ? '012F6000000USNlIAO' :
            key.contains('fulfillment') ? '012F6000000USMsIAO' :
            key.contains('creation') ? '012F6000000USNgIAO' : null;
            
            Boolean isNew = (recordId == null);
            IndividualApplication app = isNew
                ? new IndividualApplication(AccountId = accountId, OwnerId = currentUser.Id, RecordTypeId = rtId, Category = 'WCF Grant Application')
                : [SELECT Id FROM IndividualApplication WHERE Id = :recordId LIMIT 1];
                    
                    app.Status = 'Draft';
            
            // Map orgData fields with type conversion
            Map<String, Schema.SObjectField> appFields = Schema.SObjectType.IndividualApplication.fields.getMap();
            for (String f : orgData.keySet()) {
                if (f == 'Id' || !appFields.containsKey(f)) continue;
                Object val = orgData.get(f);
                if (val == null) continue;
                try {
                    Schema.DisplayType type = appFields.get(f).getDescribe().getType();
                    if (type == Schema.DisplayType.DATE && val instanceof String && String.isNotBlank((String)val)) {
                        app.put(f, Date.valueOf((String)val));
                    } else if (type == Schema.DisplayType.CURRENCY) {
                        app.put(f, Decimal.valueOf(String.valueOf(val)));
                    } else if (type == Schema.DisplayType.INTEGER) {
                        app.put(f, Integer.valueOf(String.valueOf(val)));
                    } else {
                        app.put(f, val);
                    }
                } catch (Exception e) {
                    System.debug('⚠️ App field error: ' + f + ' => ' + e.getMessage());
                }
            }
             // Inside saveWCFDraftApplication, after mapping orgData fields:
if (orgData.containsKey('Last_Page__c')) {
    app.put('Last_Page__c', Integer.valueOf(String.valueOf(orgData.get('Last_Page__c'))));
}
            if (isNew) insert app; else update app;
            response.applicationId = app.Id;
            
            // ================== Historical ==================
            // if (!historicalData.isEmpty()) {
            if (historicalData != null && !historicalData.isEmpty()) {
                Id histId = (Id) historicalData.get('Id');
                Historical_Data__c hist = new Historical_Data__c(
                    Id = histId,
                    Proposal__c = app.Id,
                    Status__c = 'Draft'
                );
                Map<String, Schema.SObjectField> histFields = Schema.SObjectType.Historical_Data__c.fields.getMap();
                for (String f : historicalData.keySet()) {
                    if (f == 'Id' || !histFields.containsKey(f)) continue;
                    Object val = historicalData.get(f);
                    if (val == null) continue;
                    try {
                        Schema.DisplayType type = histFields.get(f).getDescribe().getType();
                        if (type == Schema.DisplayType.CURRENCY) {
                            hist.put(f, Decimal.valueOf(String.valueOf(val)));
                        } else if (type == Schema.DisplayType.INTEGER) {
                            hist.put(f, Integer.valueOf(String.valueOf(val)));
                        } else {
                            hist.put(f, val);
                        }
                    } catch (Exception e) {
                        System.debug('⚠️ Hist field error: ' + f + ' => ' + e.getMessage());
                    }
                }
                upsert hist;
                response.historicId = hist.Id;
            }
            
            // ================== Fiscal ==================
            // if (!fiscalData.isEmpty()) {
            if (fiscalData != null && !fiscalData.isEmpty()) {
                Id fiscalId = (Id) fiscalData.get('Id');
                Current_fiscal_year_data__c fiscal = new Current_fiscal_year_data__c(
                    Id = fiscalId,
                    Proposal__c = app.Id,
                    Status__c = 'Draft'
                );
                Map<String, Schema.SObjectField> fiscalFields = Schema.SObjectType.Current_fiscal_year_data__c.fields.getMap();
                for (String f : fiscalData.keySet()) {
                    if (f == 'Id' || !fiscalFields.containsKey(f)) continue;
                    Object val = fiscalData.get(f);
                    if (val == null) continue;
                    try {
                        Schema.DisplayType type = fiscalFields.get(f).getDescribe().getType();
                        if (type == Schema.DisplayType.CURRENCY) {
                            fiscal.put(f, Decimal.valueOf(String.valueOf(val)));
                        } else if (type == Schema.DisplayType.INTEGER) {
                            fiscal.put(f, Integer.valueOf(String.valueOf(val)));
                        } else {
                            fiscal.put(f, val);
                        }
                    } catch (Exception e) {
                        System.debug('⚠️ Fiscal field error: ' + f + ' => ' + e.getMessage());
                    }
                }
                upsert fiscal;
                response.fiscalId = fiscal.Id;
            }
           
            // ================== Outcome ==================
            //if (!outcomeData.isEmpty()) {
            if (outcomeData != null && !outcomeData.isEmpty()) {
                Id outId = (Id) outcomeData.get('Id');
                Outcomes_Data__c out = new Outcomes_Data__c(
                    Id = outId,
                    Proposal__c = app.Id,
                    Status__c = 'Draft'
                );
                Map<String, Schema.SObjectField> outFields = Schema.SObjectType.Outcomes_Data__c.fields.getMap();
                for (String f : outcomeData.keySet()) {
                    if (f == 'Id' || !outFields.containsKey(f)) continue;
                    Object val = outcomeData.get(f);
                    if (val == null) continue;
                    try {
                        Schema.DisplayType type = outFields.get(f).getDescribe().getType();
                        if (type == Schema.DisplayType.CURRENCY) {
                            out.put(f, Decimal.valueOf(String.valueOf(val)));
                        } else if (type == Schema.DisplayType.INTEGER) {
                            out.put(f, Integer.valueOf(String.valueOf(val)));
                        } else {
                            out.put(f, val);
                        }
                    } catch (Exception e) {
                        System.debug('⚠️ Outcome field error: ' + f + ' => ' + e.getMessage());
                    }
                }
                upsert out;
                response.outcomeId = out.Id;
                
                // ==== Attach uploaded files to outcome (DRAFT mode) ====
                /*  if (uploadedFileIds != null && !uploadedFileIds.isEmpty()) {
List<ContentDocumentLink> links = new List<ContentDocumentLink>();
for (String docId : uploadedFileIds) {
links.add(new ContentDocumentLink(
ContentDocumentId = docId,
LinkedEntityId = out.Id,
ShareType = 'V',
Visibility = 'AllUsers'
));
}
insert links;
}*/
                if (uploadedFileIds != null && !uploadedFileIds.isEmpty()) {
                    // Query all already-linked ContentDocumentIds for this Outcome record
                    Set<Id> alreadyLinkedDocIds = new Set<Id>();
                    for (ContentDocumentLink lnk : [
                        SELECT ContentDocumentId 
                        FROM ContentDocumentLink 
                        WHERE LinkedEntityId = :out.Id
                        AND ContentDocumentId IN :uploadedFileIds
                    ]) {
                        alreadyLinkedDocIds.add(lnk.ContentDocumentId);
                    }
                    // Insert only those not already linked
                    List<ContentDocumentLink> linksToInsert = new List<ContentDocumentLink>();
                    for (String docId : uploadedFileIds) {
                        if (!alreadyLinkedDocIds.contains(docId)) {
                            linksToInsert.add(new ContentDocumentLink(
                                ContentDocumentId = docId,
                                LinkedEntityId = out.Id,
                                ShareType = 'V',
                                Visibility = 'AllUsers'
                            ));
                        }
                    }
                    if (!linksToInsert.isEmpty()) {
                        insert linksToInsert;
                    }
                }
                
            }
            
            return response;
            
        } catch (Exception e) {
            throw new AuraHandledException('⚠️ Save Draft Failed: ' + e.getMessage());
        }
    }
    @AuraEnabled
    public static Id submitWCFApplication(
        Map<String, Object> orgData,
        Map<String, Object> historicalData,
        Map<String, Object> fiscalData,
        Map<String, Object> outcomeData,
        List<String> uploadedFileIds,
        String selectedFundingArea,
        Id recordId
    ) {
        Id appId;
        try {
            // ----- Determine Record Type -----
            String key = selectedFundingArea != null ? selectedFundingArea.toLowerCase() : '';
            Boolean isFulfillment = key.contains('fulfillment') || key.contains('cumplimiento') || key.contains('cumprimento');
            Boolean isCreation = key.contains('creation') || key.contains('creación') || key.contains('criação');
            String rtId;
            if (isFulfillment && isCreation) {
                rtId = '012F6000000USNlIAO'; // Both
            } else if (isFulfillment) {
                rtId = '012F6000000USMsIAO'; // Fulfillment Only
            } else if (isCreation) {
                rtId = '012F6000000USNgIAO'; // Creation Only
            }
            
            //User currentUser = [SELECT Id, ContactId, AccountId FROM User WHERE Id = :UserInfo.getUserId()];
            //Id accountId = currentUser.AccountId;
            User currentUser = [SELECT Id, ContactId, AccountId, Account.IsPersonAccount
                                FROM User WHERE Id = :UserInfo.getUserId() ];           
            Id accountId = currentUser.AccountId;
            Boolean isPersonAccount = currentUser.Account != null && currentUser.Account.IsPersonAccount;


            
            //Funding Opportunity
            FundingOpportunity fo = [ SELECT Id FROM FundingOpportunity WHERE Status = 'Active' AND FO_Type__c = 'WCF Proposal'
                                     AND RecordType.DeveloperName = 'WCF_Project_Proposal'  LIMIT 1];
            // --- 1. Upsert Submitter Contact ---
        String submitterName   = (String)orgData.get('Submitter_Name__c'); // as LastName
        String submitterTitle  = (String)orgData.get('Job_Title__c');
        String submitterEmail  = (String)orgData.get('Work_Email_ID__c');
        String submitterPhone  = (String)orgData.get('Phone__c');
        Contact submitterContact;
            
        if (!String.isBlank(submitterEmail)) {
            List<Contact> existingContacts = [ SELECT Id FROM Contact WHERE Email = :submitterEmail AND AccountId = :accountId LIMIT 1 ];
                         
            if (!existingContacts.isEmpty()) {
                submitterContact = existingContacts[0];
                submitterContact.LastName = submitterName;
                if (!String.isBlank(submitterTitle)) submitterContact.Title = submitterTitle;
                if (!String.isBlank(submitterPhone)) submitterContact.Phone = submitterPhone;
                update submitterContact;
            } else {
                submitterContact = new Contact(
                    LastName = submitterName,
                    Email = submitterEmail
                    //AccountId = accountId
                );
                if (!isPersonAccount) {
                    submitterContact.AccountId = accountId;
                }
                
                if (!String.isBlank(submitterTitle)) submitterContact.Title = submitterTitle;
                if (!String.isBlank(submitterPhone)) submitterContact.Phone = submitterPhone;
                insert submitterContact;
            }
        }
        Id submitterContactId = submitterContact != null ? submitterContact.Id : null;

            
            // ----- Upsert IndividualApplication -----
            IndividualApplication app = recordId != null
                ? [SELECT Id FROM IndividualApplication WHERE Id = :recordId LIMIT 1]
                : new IndividualApplication();
            
            // Map orgData fields
            Map<String, Schema.SObjectField> appFields = Schema.IndividualApplication.SObjectType.getDescribe().fields.getMap();
            for (String f : orgData.keySet()) {
                if (!appFields.containsKey(f)) continue;
                Object val = orgData.get(f);
                if (val == null) continue;
                try {
                    Schema.DisplayType type = appFields.get(f).getDescribe().getType();
                    if (type == Schema.DisplayType.DATE && val instanceof String && String.isNotBlank((String)val)) {
                        app.put(f, Date.valueOf((String)val));
                    } else if (type == Schema.DisplayType.CURRENCY) {
                        app.put(f, Decimal.valueOf(String.valueOf(val)));
                    } else if (type == Schema.DisplayType.INTEGER) {
                        app.put(f, Integer.valueOf(String.valueOf(val)));
                    } else {
                        app.put(f, val);
                    }
                } catch (Exception e) {
                    System.debug('⚠️ App field error: ' + f + ' => ' + e.getMessage());
                }
            }
            
            app.RecordTypeId = rtId;
            app.AccountId = accountId;
            app.OwnerId = UserInfo.getUserId();
            app.Status = 'Submitted';
            app.IsSubmitted = true;
            app.Category = 'WCF Grant Application';
            app.FundingOpportunityId = fo.Id;
            app.ContactId = submitterContactId;
            
            upsert app;
            appId = app.Id;
            
            // ----- Upsert Historical_Data__c -----
            if (historicalData != null && !historicalData.isEmpty()) {
                Id histId = (Id) historicalData.get('Id');
                Historical_Data__c hist = new Historical_Data__c(
                    Id = histId,
                    Proposal__c = appId,
                    Status__c = 'Submitted'
                );
                Map<String, Schema.SObjectField> histFields = Schema.Historical_Data__c.SObjectType.getDescribe().fields.getMap();
                for (String f : historicalData.keySet()) {
                    if (f == 'Id' || !histFields.containsKey(f)) continue;
                    Object val = historicalData.get(f);
                    if (val == null) continue;
                    try {
                        Schema.DisplayType type = histFields.get(f).getDescribe().getType();
                        if (type == Schema.DisplayType.CURRENCY) {
                            hist.put(f, Decimal.valueOf(String.valueOf(val)));
                        } else if (type == Schema.DisplayType.INTEGER) {
                            hist.put(f, Integer.valueOf(String.valueOf(val)));
                        } else {
                            hist.put(f, val);
                        }
                    } catch (Exception e) {
                        System.debug('⚠️ Hist field error: ' + f + ' => ' + e.getMessage());
                    }
                }
                upsert hist;
            }
            
            // ----- Upsert Current_fiscal_year_data__c -----
            if (fiscalData != null && !fiscalData.isEmpty()) {
                Id fiscalId = (Id) fiscalData.get('Id');
                Current_fiscal_year_data__c fiscal = new Current_fiscal_year_data__c(
                    Id = fiscalId,
                    Proposal__c = appId,
                    Status__c = 'Submitted'
                );
                Map<String, Schema.SObjectField> fiscalFields = Schema.Current_fiscal_year_data__c.SObjectType.getDescribe().fields.getMap();
                for (String f : fiscalData.keySet()) {
                    if (f == 'Id' || !fiscalFields.containsKey(f)) continue;
                    Object val = fiscalData.get(f);
                    if (val == null) continue;
                    try {
                        Schema.DisplayType type = fiscalFields.get(f).getDescribe().getType();
                        if (type == Schema.DisplayType.CURRENCY) {
                            fiscal.put(f, Decimal.valueOf(String.valueOf(val)));
                        } else if (type == Schema.DisplayType.INTEGER) {
                            fiscal.put(f, Integer.valueOf(String.valueOf(val)));
                        } else {
                            fiscal.put(f, val);
                        }
                    } catch (Exception e) {
                        System.debug('⚠️ Fiscal field error: ' + f + ' => ' + e.getMessage());
                    }
                }
                upsert fiscal;
            }
            
            // ----- Upsert Outcomes_Data__c -----
            Outcomes_Data__c out = null;
            if (outcomeData != null && !outcomeData.isEmpty()) {
                Id outId = (Id) outcomeData.get('Id');
                out = new Outcomes_Data__c(
                    Id = outId,
                    Proposal__c = appId,
                    Status__c = 'Submitted'
                );
                Map<String, Schema.SObjectField> outcomeFields = Schema.Outcomes_Data__c.SObjectType.getDescribe().fields.getMap();
                for (String f : outcomeData.keySet()) {
                    if (f == 'Id' || !outcomeFields.containsKey(f)) continue;
                    Object val = outcomeData.get(f);
                    if (val == null) continue;
                    try {
                        Schema.DisplayType type = outcomeFields.get(f).getDescribe().getType();
                        if (type == Schema.DisplayType.CURRENCY) {
                            out.put(f, Decimal.valueOf(String.valueOf(val)));
                        } else if (type == Schema.DisplayType.INTEGER) {
                            out.put(f, Integer.valueOf(String.valueOf(val)));
                        } else {
                            out.put(f, val);
                        }
                    } catch (Exception e) {
                        System.debug('⚠️ Outcome field error: ' + f + ' => ' + e.getMessage());
                    }
                }
                upsert out;
            }
            
            // ----- Attach files to Outcomes_Data__c -----
            /* if (out != null && uploadedFileIds != null && !uploadedFileIds.isEmpty()) {
List<ContentDocumentLink> links = new List<ContentDocumentLink>();
for (String docId : uploadedFileIds) {
links.add(new ContentDocumentLink(
ContentDocumentId = docId,
LinkedEntityId = out.Id,
ShareType = 'V',
Visibility = 'AllUsers'
));
}
insert links;
}*/
            if (uploadedFileIds != null && !uploadedFileIds.isEmpty()) {
                // Query all already-linked ContentDocumentIds for this Outcome record
                Set<Id> alreadyLinkedDocIds = new Set<Id>();
                for (ContentDocumentLink lnk : [
                    SELECT ContentDocumentId 
                    FROM ContentDocumentLink 
                    WHERE LinkedEntityId = :out.Id
                    AND ContentDocumentId IN :uploadedFileIds
                ]) {
                    alreadyLinkedDocIds.add(lnk.ContentDocumentId);
                }
                // Insert only those not already linked
                List<ContentDocumentLink> linksToInsert = new List<ContentDocumentLink>();
                for (String docId : uploadedFileIds) {
                    if (!alreadyLinkedDocIds.contains(docId)) {
                        linksToInsert.add(new ContentDocumentLink(
                            ContentDocumentId = docId,
                            LinkedEntityId = out.Id,
                            ShareType = 'V',
                            Visibility = 'AllUsers'
                        ));
                    }
                }
                if (!linksToInsert.isEmpty()) {
                    insert linksToInsert;
                }
            }  
        } catch (Exception e) {
            throw new AuraHandledException('⚠️ Error submitting application: ' + e.getMessage());
        }
        
        return appId;
    }
    
    
    public class WCFDraftWrapper {
        @AuraEnabled public IndividualApplication application;
        @AuraEnabled public Historical_Data__c historical;
        @AuraEnabled public Current_fiscal_year_data__c fiscal;
        @AuraEnabled public Outcomes_Data__c outcome;
        @AuraEnabled public Map<String, List<Map<String, String>>> uploadedFilesByCell; // new line
    
    }
    @AuraEnabled
public static void setLanguage(String languageCode) {

    User u = [
        SELECT Id, LanguageLocaleKey, LocaleSidKey
        FROM User
        WHERE Id = :UserInfo.getUserId()
        LIMIT 1
    ];

    if(languageCode == 'en_US') {
        u.LanguageLocaleKey = 'en_US';
        u.LocaleSidKey = 'en_US';
    }
    else if(languageCode == 'es') {
        u.LanguageLocaleKey = 'es';
        u.LocaleSidKey = 'es_ES';
    }
    else if(languageCode == 'pt_BR') {
        u.LanguageLocaleKey = 'pt_BR';
        u.LocaleSidKey = 'pt_BR';
    }

    update u;
}
    @AuraEnabled
    public static WCFDraftWrapper getDraftWCFApplication(Id recordId) {
        WCFDraftWrapper wrapper = new WCFDraftWrapper();
        
        if (recordId == null) return wrapper;
        
        // Parent record
        wrapper.application = [
            SELECT Id, RecordTypeId, Status, AccountId, OwnerId,Organizational_Area_s_for_Funding_Inves__c,
            Category, Organization_Name__c, Headquarters_City_and_Country__c,Language__c, 
            Primary_Service_Regions__c, Leader_Name__c, Leader_Title__c,
            Submitter_Name__c, Job_Title__c, Work_Email_ID__c, Phone__c,Last_Page__c,
            Legal_Structure__c, Current_fiscal_year_s_end_date__c,Organizational_Sustainability__c, 
            Use_of_Additional_Funding__c, Operational_Synergies_with_WOF__c,Operational_Synergies_with_WOF_Both__c,
            Use_of_Additional_Funding_JC__c, Operational_Synergies_with_WOF_JC__c,Job_Creation_Approach__c,
            Business_Sectors_JSON__c
            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ];
        
        // Related child: Historical Data
        List<Historical_Data__c> historicals = [
            SELECT Id, Proposal__c, Status__c,
            CY1_Balance_Start_CFY_1__c, CY2_Balance_Start_CFY_2__c, CY3_Balance_Start_CFY_3__c,
            CY1_Revenue__c, CY2_Revenue__c, CY3_Revenue__c,
            CY1_Expense__c, CY2_Expense__c, CY3_Expense__c,
            CY1_Balance_End__c, CY2_Balance_End__c, CY3_Balance_End__c
            FROM Historical_Data__c
            WHERE Proposal__c = :recordId
            LIMIT 1
        ];
        wrapper.historical = historicals.isEmpty() ? null : historicals[0];
        
        // Related child: Current Fiscal Year
        List<Current_fiscal_year_data__c> fiscals = [
            SELECT Id, Proposal__c, Status__c,
            Revenue_Budget__c, Revenue_Projection__c, Revenue_Variance__c, Revenue_Explanation__c,
            Expense_Budget__c, Expense_Projection__c, Expense_Variance__c, Expense_Explanation__c,
            Net_Budget__c, Net_Projection__c, Net_Variance__c, Net_Position_Explanation__c
            FROM Current_fiscal_year_data__c
            WHERE Proposal__c = :recordId
            LIMIT 1
        ];
        wrapper.fiscal = fiscals.isEmpty() ? null : fiscals[0];
        
        // Related child: Outcomes Data
        List<Outcomes_Data__c> outcomes = [
           SELECT Id, Name,Proposal__c, Skills_Duration_CFY__c, Skills_Duration_FY_1__c, Skills_Duration_FY_2__c, Skills_Duration_FY_3__c,
                        Projected_Learner_Enrollments_CFY__c, Projected_Learner_Enrollments_FY_1__c, Projected_Learner_Enrollments_FY_2__c, 
                        Projected_Learner_Enrollments_FY_3__c, Projected_Learner_Placements_CFY__c, Projected_Learner_Placements_FY_1__c, 
                        Projected_Learner_Placements_FY_2__c, Projected_Learner_Placements_FY_3__c, Projected_Learner_placement_CFY__c,
                        Projected_Learner_placement_FY_1__c, Projected_Learner_placement_FY_2__c, Projected_Learner_placement_FY_3__c, 
                        Avg_Cost_per_Placement_CFY__c, Avg_Cost_per_Placement_FY_1__c, Avg_Cost_per_Placement_FY_2__c, Avg_Cost_per_Placement_FY_3__c, 
                        X3rd_Party_Placement_Verification_CFY__c, X3rd_Party_Placement_Verification_FY_1__c, X3rd_Party_Placement_Verification_FY_2__c, 
                        X3rd_Party_Placement_Verification_FY_3__c, X3rd_Party_Verification_Description_CFY__c, Outcome_Tracking_Details_CFY__c,
                        X3rd_Party_Verification_Description_FY_1__c, X3rd_Party_Verification_Description_FY_2__c, X3rd_Party_Verification_Description_FY_3__c,
                        Long_Term_Outcomes_CFY__c, Long_Term_Outcomes_FY_1__c, Long_Term_Outcomes_FY_2__c, Long_Term_Outcomes_FY_3__c,
                        Outcome_Tracking_Details_FY_1__c, Outcome_Tracking_Details_FY_2__c, Outcome_Tracking_Details_FY_3__c,
                        Target_Business_Sectors_CFY__c, Target_Business_Sectors_FY_1__c, Target_Business_Sectors_FY_2__c, Target_Business_Sectors_FY_3__c,
                        Projected_New_Businesses_CFY__c, Projected_New_Businesses_FY_1__c, Projected_New_Businesses_FY_2__c, Projected_New_Businesses_FY_3__c,
                        Projected_Jobs_from_New_Businesses_CFY__c, Projected_Jobs_from_New_Businesses_FY1__c, Projected_Jobs_from_New_Businesses_FY2__c, 
                        Projected_Jobs_from_New_Businesses_FY3__c, Growing_Businesses_Supported_CFY__c, Growing_Businesses_Supported_FY_1__c, 
                        Growing_Businesses_Supported_FY_2__c, Growing_Businesses_Supported_FY_3__c, Jobs_from_Growing_Businesses_CFY__c, 
                        Jobs_from_Growing_Businesses_FY_1__c, Jobs_from_Growing_Businesses_FY_2__c, Jobs_from_Growing_Businesses_FY_3__c, 
                        Avg_Cost_per_Job_CFY__c, Avg_Cost_per_Job_FY_1__c, Avg_Cost_per_Job_FY_2__c, Avg_Cost_per_Job_FY_3__c, 
                        Job_Verification_3rd_Party_CFY__c, Job_Verification_3rd_Party_FY1__c, Job_Verification_3rd_Party_FY2__c, Job_Verification_3rd_Party_FY3__c,
                        X3rd_party_verification_details_CFY__c, X3rd_party_verification_details_FY1__c, X3rd_party_verification_details_FY2__c, X3rd_party_verification_details_FY3__c
                        FROM Outcomes_Data__c
            WHERE Proposal__c = :recordId
            LIMIT 1
        ];
        wrapper.outcome = outcomes.isEmpty() ? null : outcomes[0];
       
        // ...after wrapper.outcome is set
        wrapper.uploadedFilesByCell = new Map<String, List<Map<String, String>>>();
        
        if (wrapper.outcome != null && wrapper.outcome.Id != null) {
            Id outcomeId = wrapper.outcome.Id;
            
            // Query all ContentDocumentLinks for this Outcomes_Data__c record
            List<ContentDocumentLink> cdls = [
                SELECT ContentDocumentId, ContentDocument.LatestPublishedVersion.Title, ContentDocument.LatestPublishedVersion.FileExtension, 
                ContentDocument.Description  // (optional, if you store cell-key here)
                FROM ContentDocumentLink
                WHERE LinkedEntityId = :outcomeId
            ];
            
            // Map: cellKey (your data-cell-key) -> files
            // (You must store cellKey in Description or another field when you upload the file)
            Map<String, List<Map<String, String>>> filesByCell = new Map<String, List<Map<String, String>>>();
            
            for (ContentDocumentLink cdl : cdls) {
                // Assume you save cellKey in Description when uploading
                String cellKey = cdl.ContentDocument.Description;
                if (String.isBlank(cellKey)) continue; // Ignore files not mapped to a table cell
                
                if (!filesByCell.containsKey(cellKey)) filesByCell.put(cellKey, new List<Map<String, String>>());
                filesByCell.get(cellKey).add(new Map<String, String>{
                    'documentId' => cdl.ContentDocumentId,
                        'name' => cdl.ContentDocument.LatestPublishedVersion.Title + '.' + cdl.ContentDocument.LatestPublishedVersion.FileExtension
                        });
            }
            
            wrapper.uploadedFilesByCell = filesByCell;
        }


        return wrapper;
    }

@AuraEnabled
public static void setFileCellKey(Id contentDocumentId, String cellKey) {
    List<ContentVersion> versions = [SELECT Id FROM ContentVersion WHERE ContentDocumentId = :contentDocumentId ORDER BY VersionNumber DESC LIMIT 1];
    if (!versions.isEmpty()) {
        ContentVersion cv = versions[0];
        cv.Description = cellKey;
        update cv;
    }
}
    
    
}