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
            if (String.isBlank(fieldApiName) || String.isBlank(submitterName)) {
                throw new AuraHandledException('Missing field or submitter name.');
            }
        
            List<AI_Feedback__c> recs = [
                SELECT Id FROM AI_Feedback__c WHERE Submitter_Name__c = :submitterName WITH SYSTEM_MODE LIMIT 1
            ];
        
            AI_Feedback__c rec;
            if (recs.isEmpty()) {
                rec = new AI_Feedback__c(Submitter_Name__c = submitterName);
            } else {
                rec = recs[0];
            }
        
            // NOW validate the field exists
            Map<String, Schema.SObjectField> fields = Schema.SObjectType.AI_Feedback__c.fields.getMap();
            if (fieldApiName != null && !fields.containsKey(fieldApiName.toLowerCase())) {
        
            throw new AuraHandledException(
                'Field not found on AI_Feedback__c: ' + fieldApiName
            );
        }
        
            rec.put(fieldApiName, fieldValue);
            upsert rec;
            return rec.Id;
        }
            
            @AuraEnabled //(cacheable=true)
            public static Map<String, Object> getAIFeedbackRecord(String submitterName) {
                
                // Fetch the AI_Feedback__c record for this submitter
                AI_Feedback__c rec = [SELECT Id, Submitter_Name__c, Legal_Structure_FR__c, Organizational_Sustainability_FR__c,
                                      Use_of_Additional_Funding_FR__c, Operational_Synergies_with_WOF_FR__c, Operational_Synergies_with_WOF__c,
                                      Use_of_Additional_Funding__c, Operational_Synergies_with_WOF_JC__c, Operational_Synergies_with_WOF_JC_FR__c,
                                      Operational_Synergies_with_WOF_Both__c, Operational_Synergies_with_WOF_Both_FR__c,Job_Creation_Approach_FR__c, Skilling_Approach_FR__c,Revenue_Explanation_FR__c,Job_Creation_Approach__c, Skilling_Approach__c,Revenue_Explanation__c,
                                      Livelihood_Approach__c, Livelihood_Approach_FR__c
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
                data.put('Skilling_Approach_FR__c', rec.Skilling_Approach_FR__c);
                data.put('Livelihood_Approach_FR__c', rec.Livelihood_Approach_FR__c);
                data.put('Revenue_Explanation_FR__c', rec.Revenue_Explanation_FR__c);
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
                 @AuraEnabled public List<WCF_Skilling_Domain__c> skillingDomains;
                 @AuraEnabled public List<WCF_Business_Sector__c> businessSectors;
                 @AuraEnabled public List<WCF_Livelihood_Program__c> livelihoodPrograms;
                 @AuraEnabled public List<WCF_Community__c> communities;
            }
            
            // Helper to validate SF Id
            public static Boolean isValidId(Object val) {
                return val != null && String.valueOf(val).length() >= 15 &&
                    Pattern.matches('^[a-zA-Z0-9]{15,18}$', String.valueOf(val));
            }

            public static String formatMultiSelectFundingArea(List<String> tracksInput) {
                if (tracksInput == null || tracksInput.isEmpty()) {
                    return null;
                }
                Set<String> formatted = new Set<String>();
                for (String trk : tracksInput) {
                    if (String.isBlank(trk)) continue;
                    String tUpper = trk.trim().toUpperCase();
                    if (tUpper.contains('FULFILLMENT')) {
                        formatted.add('Job Fulfillment');
                    } else if (tUpper.contains('CREATION')) {
                        formatted.add('Job Creation');
                    } else if (tUpper.contains('LIVELIHOOD')) {
                        formatted.add('Livelihood');
                    } else {
                        formatted.add(trk.trim());
                    }
                }
                return String.join(new List<String>(formatted), ';');
            }
        
            
           @AuraEnabled
        public static SaveDraftResponse saveWCFDraftApplication(
            String orgDataJson,
            Map<String, Object> historicalData,
            Map<String, Object> fiscalData,
            Map<String, Object> outcomeData,
            String selectedFundingArea,
            Id applicationId,
            List<String> uploadedFileIds,
            String skillingDomainsJson,    // ← CHANGED to String
            String businessSectorsJson     // ← CHANGED to String
            
        ) {
            System.debug('Afrose Test ' + outcomeData);
            SaveDraftResponse response = new SaveDraftResponse();
            Map<String, Object> orgData = (Map<String, Object>) JSON.deserializeUntyped(orgDataJson);
            
            try {
                User currentUser = [SELECT Id, ContactId, AccountId FROM User WHERE Id = :UserInfo.getUserId()];
                Id accountId = currentUser.AccountId;
                
                // WCF RFI applications exclusively use the Wadhwani Grants Record Type
                RecordType wgRt = [
                    SELECT Id FROM RecordType 
                    WHERE SObjectType = 'IndividualApplication' AND DeveloperName = 'Wadhwani_Grants' 
                    LIMIT 1
                ];
                String rtId = wgRt.Id;
                
                Boolean isNew = (applicationId == null);
                IndividualApplication app;
                
                if (isNew) {
                    app = new IndividualApplication(
                        AccountId = accountId,
                        OwnerId = currentUser.Id,
                        Category = 'WCF Grant Application'
                    );
                    if (rtId != null) {
                        app.RecordTypeId = rtId;
                    }
                } else {
                    app = [SELECT Id, RecordTypeId FROM IndividualApplication WHERE Id = :applicationId WITH SYSTEM_MODE LIMIT 1];
                     // ✅ Always update RecordTypeId in case funding area changed
                    if (rtId != null) {
                    app.RecordTypeId = rtId;
                    }
                }
                
                app.Status = 'Draft';
                
                Map<String, Schema.SObjectField> appFields = Schema.SObjectType.IndividualApplication.fields.getMap();
                for (String f : orgData.keySet()) {
                    if (f == 'Id' || f.equalsIgnoreCase('Organizational_Area_s_for_Funding_Inves__c') || !appFields.containsKey(f)) continue;
                    Object val = orgData.get(f);
                    if (val == null) continue;
                    try {
                        Schema.DisplayType type = appFields.get(f).getDescribe().getType();
                        if (type == Schema.DisplayType.DATE && val instanceof String && String.isNotBlank((String)val)) {
                            app.put(f, Date.valueOf((String)val));
                        } else if (type == Schema.DisplayType.CURRENCY
                    || type == Schema.DisplayType.DOUBLE
                    || type == Schema.DisplayType.PERCENT) {
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
                
                if (orgData.containsKey('Last_Page__c') && orgData.get('Last_Page__c') != null) {
                    app.put('Last_Page__c', Integer.valueOf(String.valueOf(orgData.get('Last_Page__c'))));
                }
                
                if (String.isNotBlank(selectedFundingArea)) {
                    List<String> trackList = selectedFundingArea.split(';');
                    String formattedTracks = formatMultiSelectFundingArea(trackList);
                    if (String.isNotBlank(formattedTracks)) {
                        app.Organizational_Area_s_for_Funding_Inves1__c = formattedTracks;
                    }
                }
                
                if (isNew) {
                    insert app;
                } else {
                    update app;
                }
                response.applicationId = app.Id;
        
                // ================== Historical ==================
                if (historicalData != null && !historicalData.isEmpty()) {
                    Id histId = historicalData.get('Id') != null ? (Id)historicalData.get('Id') : null;
                    if (histId != null) {
                        List<Historical_Data__c> existing = [
                            SELECT Id, Proposal__c FROM Historical_Data__c WHERE Id = :histId WITH SYSTEM_MODE LIMIT 1
                        ];
                        if (!existing.isEmpty() && existing[0].Proposal__c != app.Id) {
                            histId = null;
                        }
                    }
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
                            if (type == Schema.DisplayType.CURRENCY || type == Schema.DisplayType.DOUBLE || type == Schema.DisplayType.PERCENT) {
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
                if (fiscalData != null && !fiscalData.isEmpty()) {
                    Id fiscalId = fiscalData.get('Id') != null ? (Id)fiscalData.get('Id') : null;
                    if (fiscalId != null) {
                        List<Current_fiscal_year_data__c> existing = [
                            SELECT Id, Proposal__c FROM Current_fiscal_year_data__c WHERE Id = :fiscalId LIMIT 1
                        ];
                        if (!existing.isEmpty() && existing[0].Proposal__c != app.Id) {
                            fiscalId = null;
                        }
                    }
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
                            if (type == Schema.DisplayType.CURRENCY || type == Schema.DisplayType.DOUBLE || type == Schema.DisplayType.PERCENT) {
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
               // ================== Outcome ==================
    if (outcomeData != null && !outcomeData.isEmpty()) {
        Id outId = outcomeData.get('Id') != null ? (Id)outcomeData.get('Id') : null;
        if (outId != null) {
            List<Outcomes_Data__c> existing = [
                SELECT Id, Proposal__c FROM Outcomes_Data__c WHERE Id = :outId
     WITH SYSTEM_MODE
     LIMIT 1
            ];
            if (!existing.isEmpty() && existing[0].Proposal__c != app.Id) {
                outId = null;
            }
        }
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
            
            String strVal = String.valueOf(val);
            if (String.isBlank(strVal) || strVal == 'null') continue; // ← skip blanks
            
            try {
                Schema.DisplayType type = outFields.get(f).getDescribe().getType();
                if (type == Schema.DisplayType.CURRENCY 
                    || type == Schema.DisplayType.DOUBLE 
                    || type == Schema.DisplayType.PERCENT
                    || type == Schema.DisplayType.INTEGER) {
                    // ALL numeric types go through Decimal conversion
                    Decimal numVal = Decimal.valueOf(strVal);
                    out.put(f, numVal);
                } else if (type == Schema.DisplayType.BOOLEAN) {
                    out.put(f, Boolean.valueOf(strVal));
                } else if (type == Schema.DisplayType.DATE && String.isNotBlank(strVal)) {
                    out.put(f, Date.valueOf(strVal));
                } else if (type == Schema.DisplayType.PICKLIST 
                           || type == Schema.DisplayType.STRING
                           || type == Schema.DisplayType.TEXTAREA) {
                    out.put(f, strVal);
                } else {
                    out.put(f, strVal);
                }
            } catch (Exception e) {
                System.debug('⚠️ Outcome field error: ' + f + ' => ' + e.getMessage() + ' val=' + strVal);
            }
        }
       upsert as system out;
        response.outcomeId = out.Id;
        // ... rest of file attachment code unchanged
                    
                    // Attach uploaded files
                    if (uploadedFileIds != null && !uploadedFileIds.isEmpty()) {
                        Set<Id> alreadyLinkedDocIds = new Set<Id>();
                        for (ContentDocumentLink lnk : [
                            SELECT ContentDocumentId FROM ContentDocumentLink 
                            WHERE LinkedEntityId = :out.Id AND ContentDocumentId IN :uploadedFileIds WITH SYSTEM_MODE
                        ]) {
                            alreadyLinkedDocIds.add(lnk.ContentDocumentId);
                        }
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
                        if (!linksToInsert.isEmpty()) insert linksToInsert;
                    }
                }  // ================== Skilling Domains ==================
if (String.isNotBlank(skillingDomainsJson)) {
    List<Object> skillingDomains = (List<Object>) JSON.deserializeUntyped(skillingDomainsJson);
    if (!skillingDomains.isEmpty()) {
        List<WCF_Skilling_Domain__c> domainRows = new List<WCF_Skilling_Domain__c>();
        for (Object item : skillingDomains) {
                    Map<String, Object> row = (Map<String, Object>) item;
                    String domainName = (String) row.get('domain');
                    if (String.isBlank(domainName)) continue;
        
                    WCF_Skilling_Domain__c d = new WCF_Skilling_Domain__c();
                    d.Proposal__c = app.Id;
                    d.Domain_Programme_Name__c = domainName;
                    if (row.get('hours') != null && String.isNotBlank(String.valueOf(row.get('hours'))))
                        d.Hours_of_Training__c = Decimal.valueOf(String.valueOf(row.get('hours')));
                    if (row.get('duration') != null && String.isNotBlank(String.valueOf(row.get('duration'))))
                        d.Duration_Months__c = Decimal.valueOf(String.valueOf(row.get('duration')));
                    if (row.get('startDate') != null && String.isNotBlank(String.valueOf(row.get('startDate'))))
                        d.Programme_Start_Date__c = Date.valueOf((String) row.get('startDate'));
                    if (row.get('yearlyEnrolment') != null && String.isNotBlank(String.valueOf(row.get('yearlyEnrolment'))))
                        d.Yearly_Enrolment__c = Decimal.valueOf(String.valueOf(row.get('yearlyEnrolment')));
                    domainRows.add(d);
        }
        if (!domainRows.isEmpty()) {
            delete [SELECT Id FROM WCF_Skilling_Domain__c WHERE Proposal__c = :app.Id];
            insert domainRows;
        }
    }
}
                // ================== Business Sectors ==================
             if (String.isNotBlank(businessSectorsJson)) {
    List<Object> businessSectors = (List<Object>) JSON.deserializeUntyped(businessSectorsJson);
    if (!businessSectors.isEmpty()) {
        List<WCF_Business_Sector__c> sectorRows = new List<WCF_Business_Sector__c>();
                for (Object item : businessSectors) {
                    Map<String, Object> row = (Map<String, Object>) item;
                    String sectorName = (String) row.get('sector');
                    if (String.isBlank(sectorName)) continue;
        
                  WCF_Business_Sector__c s = new WCF_Business_Sector__c();
                    s.Proposal__c = app.Id;
                    s.Sector_c__c = sectorName;
                    if (row.get('sectorOther') != null && String.isNotBlank(String.valueOf(row.get('sectorOther'))))
                        s.Business_Sector_Other__c = (String) row.get('sectorOther');
                        if (row.get('supportTypeOther') != null && String.isNotBlank(String.valueOf(row.get('supportTypeOther'))))
        s.Support_Type_Other__c = (String) row.get('supportTypeOther');
                    if (row.get('supportBegin') != null && String.isNotBlank(String.valueOf(row.get('supportBegin'))))
                        s.Support_Begin_Date__c = Date.valueOf((String) row.get('supportBegin'));
                    if (row.get('yearlyEnrolment') != null && String.isNotBlank(String.valueOf(row.get('yearlyEnrolment'))))
                        s.Yearly_Enrolment__c = Decimal.valueOf(String.valueOf(row.get('yearlyEnrolment')));
                    if (row.get('supportTypes') != null) {
                        List<Object> types = (List<Object>) row.get('supportTypes');
                        List<String> typeStrings = new List<String>();
                        for (Object t : types) typeStrings.add(String.valueOf(t));
                        s.Support_Types__c = String.join(typeStrings, ';');
                    }
                   sectorRows.add(s);
        }
        if (!sectorRows.isEmpty()) {
            delete [SELECT Id FROM WCF_Business_Sector__c WHERE Proposal__c = :app.Id];
            insert sectorRows;
        }
    }
}
                // After inserting domainRows and sectorRows, query them back and set on response:
        response.skillingDomains = [
            SELECT Id, Domain_Programme_Name__c, Hours_of_Training__c,
                   Duration_Months__c, Programme_Start_Date__c, Yearly_Enrolment__c
            FROM WCF_Skilling_Domain__c
            WHERE Proposal__c = :app.Id
            ORDER BY CreatedDate ASC
        ];
        
        response.businessSectors = [
            SELECT Id, Sector_c__c, Business_Sector_Other__c, Support_Begin_Date__c,
                   Support_Types__c, Support_Type_Other__c , Yearly_Enrolment__c
            FROM WCF_Business_Sector__c
            WHERE Proposal__c = :app.Id
            ORDER BY CreatedDate ASC
        ];

        response.livelihoodPrograms = [
            SELECT Id, Program_Name__c, Support_Type_Provided__c, Duration_Man_Hours__c, Annual_Enrollment__c
            FROM WCF_Livelihood_Program__c
            WHERE Proposal__c = :app.Id
            ORDER BY CreatedDate ASC
        ];

        response.communities = [
            SELECT Id, State__c, District_Area__c, Households_FY3__c, Households_FY2__c, Households_FY1__c, Households_Projected__c
            FROM WCF_Community__c
            WHERE Proposal__c = :app.Id
            ORDER BY CreatedDate ASC
        ];
        
                return response;
                
            } catch (Exception e) {
                System.debug('❌ saveWCFDraftApplication error: ' + e.getMessage() + ' | Line: ' + e.getLineNumber());
                throw new AuraHandledException('⚠️ Save Draft Failed: ' + e.getMessage());
            }
        }
        
            @AuraEnabled
            public static String submitWCFApplication(
                String orgDataJson,
                Map<String, Object> historicalData,
                Map<String, Object> fiscalData,
                Map<String, Object> outcomeData,
                List<String> uploadedFileIds,
                String selectedFundingArea,
                Id recordId,
                String skillingDomainsJson,
                String businessSectorsJson
            ) {
                Id appId;
                Map<String, Object> orgData = (Map<String, Object>) JSON.deserializeUntyped(orgDataJson);
                List<Object> skillingDomains = String.isNotBlank(skillingDomainsJson) 
                    ? (List<Object>) JSON.deserializeUntyped(skillingDomainsJson) : new List<Object>();
                List<Object> businessSectors = String.isNotBlank(businessSectorsJson) 
                    ? (List<Object>) JSON.deserializeUntyped(businessSectorsJson) : new List<Object>();
                try {
                    // WCF RFI applications exclusively use the Wadhwani Grants Record Type
                    RecordType wgRt = [
                        SELECT Id FROM RecordType 
                        WHERE SObjectType = 'IndividualApplication' AND DeveloperName = 'Wadhwani_Grants' 
                        LIMIT 1
                    ];
                    String rtId = wgRt.Id;
                    
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
    List<Contact> existingContacts = [
        SELECT Id, IsPersonAccount, FirstName, LastName, Title, Phone
        FROM Contact WHERE Email = :submitterEmail LIMIT 1
    ];

    if (!existingContacts.isEmpty()) {
        submitterContact = existingContacts[0];

        // Do NOT touch LastName on an existing Contact — on a Person Account
        // it silently renames the Account (Account.Name = FirstName + LastName).
        Boolean dirty = false;
        if (!submitterContact.IsPersonAccount) {
            if (String.isBlank(submitterContact.Title) && String.isNotBlank(submitterTitle)) {
                submitterContact.Title = submitterTitle; dirty = true;
            }
            if (String.isBlank(submitterContact.Phone) && String.isNotBlank(submitterPhone)) {
                submitterContact.Phone = submitterPhone; dirty = true;
            }
        }
        if (dirty) update submitterContact;

    } else {
        submitterContact = new Contact(LastName = submitterName, Email = submitterEmail);
        if (!isPersonAccount) submitterContact.AccountId = accountId;
        if (String.isNotBlank(submitterTitle)) submitterContact.Title = submitterTitle;
        if (String.isNotBlank(submitterPhone)) submitterContact.Phone = submitterPhone;
        insert submitterContact;
    }
}
                Id submitterContactId = submitterContact != null ? submitterContact.Id : null;
        
                    
                    /*--- Upsert IndividualApplication -----
                    IndividualApplication app = recordId != null
                        //? [SELECT Id FROM IndividualApplication WHERE Id = :recordId LIMIT 1]
                        ? [SELECT Id, Initial_Submission_Date__c 
           FROM IndividualApplication 
           WHERE Id = :recordId 
           LIMIT 1]
                        : new IndividualApplication();*/
                        IndividualApplication app = recordId != null
            ? [SELECT Id,
                      Initial_Submission_Date__c,
                      Last_Resubmission_Date__c
               FROM IndividualApplication
               WHERE Id = :recordId
               LIMIT 1]
            : new IndividualApplication();
                    
                    // Map orgData fields
                    Map<String, Schema.SObjectField> appFields = Schema.IndividualApplication.SObjectType.getDescribe().fields.getMap();
                    for (String f : orgData.keySet()) {
                        if (f.equalsIgnoreCase('Organizational_Area_s_for_Funding_Inves__c') || !appFields.containsKey(f)) continue;
                        Object val = orgData.get(f);
                        if (val == null) continue;
                        try {
                            Schema.DisplayType type = appFields.get(f).getDescribe().getType();
                            if (type == Schema.DisplayType.DATE && val instanceof String && String.isNotBlank((String)val)) {
                                app.put(f, Date.valueOf((String)val));
                            }  else if (type == Schema.DisplayType.CURRENCY
                    || type == Schema.DisplayType.DOUBLE
                    || type == Schema.DisplayType.PERCENT) {
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
                    if (String.isNotBlank(selectedFundingArea)) {
                        List<String> trackList = selectedFundingArea.split(';');
                        String formattedTracks = formatMultiSelectFundingArea(trackList);
                        if (String.isNotBlank(formattedTracks)) {
                            app.Organizational_Area_s_for_Funding_Inves1__c = formattedTracks;
                        }
                    }
        
                    // Stamp submission dates
        if (app.Initial_Submission_Date__c == null) {
            // First ever submission
            app.Initial_Submission_Date__c = System.now();
     app.Status = 'Submitted';
        } else {
            // Resubmission after validator review
            app.Last_Resubmission_Date__c = System.now();
    app.Status = 'Application Resubmitted';
        }
                    
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
              // In submitWCFApplication — fix outcome upsert
    Map<String, Schema.SObjectField> outcomeFields = 
        Schema.Outcomes_Data__c.SObjectType.getDescribe().fields.getMap();
    for (String f : outcomeData.keySet()) {
        if (f == 'Id' || !outcomeFields.containsKey(f)) continue;
        Object val = outcomeData.get(f);
        if (val == null) continue;
        
        String strVal = String.valueOf(val);
        if (String.isBlank(strVal) || strVal == 'null') continue;
        
        try {
            Schema.DisplayType type = outcomeFields.get(f).getDescribe().getType();
            if (type == Schema.DisplayType.CURRENCY 
                || type == Schema.DisplayType.DOUBLE 
                || type == Schema.DisplayType.PERCENT
                || type == Schema.DisplayType.INTEGER) {
                out.put(f, Decimal.valueOf(strVal));
            } else if (type == Schema.DisplayType.BOOLEAN) {
                out.put(f, Boolean.valueOf(strVal));
            } else if (type == Schema.DisplayType.DATE && String.isNotBlank(strVal)) {
                out.put(f, Date.valueOf(strVal));
            } else {
                out.put(f, strVal);
            }
        } catch (Exception e) {
            System.debug('⚠️ Outcome field error: ' + f + ' => ' + e.getMessage());
        }
    }
    upsert as system out;
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
        
                // ================== Skilling Domains ==================
if (skillingDomains != null && !skillingDomains.isEmpty()) {
    List<WCF_Skilling_Domain__c> domainRows = new List<WCF_Skilling_Domain__c>();
            for (Object item : skillingDomains) {
                Map<String, Object> row = (Map<String, Object>) item;
                String domainName = (String) row.get('domain');
                if (String.isBlank(domainName)) continue;
        
                WCF_Skilling_Domain__c d = new WCF_Skilling_Domain__c();
                d.Proposal__c              = appId;
                d.Domain_Programme_Name__c = domainName;
        
                if (row.get('hours') != null && String.isNotBlank(String.valueOf(row.get('hours'))))
                    d.Hours_of_Training__c = Decimal.valueOf(String.valueOf(row.get('hours')));
                if (row.get('duration') != null && String.isNotBlank(String.valueOf(row.get('duration'))))
                    d.Duration_Months__c = Decimal.valueOf(String.valueOf(row.get('duration')));
                if (row.get('startDate') != null && String.isNotBlank(String.valueOf(row.get('startDate'))))
                    d.Programme_Start_Date__c = Date.valueOf((String) row.get('startDate'));
                if (row.get('yearlyEnrolment') != null && String.isNotBlank(String.valueOf(row.get('yearlyEnrolment'))))
                    d.Yearly_Enrolment__c = Decimal.valueOf(String.valueOf(row.get('yearlyEnrolment')));
        
                domainRows.add(d);
            }
if (!domainRows.isEmpty()) {
        delete [SELECT Id FROM WCF_Skilling_Domain__c WHERE Proposal__c = :appId];
        insert domainRows;
    }
}
        
        // ================== Business Sectors ==================
        if (businessSectors != null && !businessSectors.isEmpty()) {
    List<WCF_Business_Sector__c> sectorRows = new List<WCF_Business_Sector__c>();
            for (Object item : businessSectors) {
                Map<String, Object> row = (Map<String, Object>) item;
                String sectorName = (String) row.get('sector');
                if (String.isBlank(sectorName)) continue;
        
              WCF_Business_Sector__c s = new WCF_Business_Sector__c();
                s.Proposal__c   = appId;
                s.Sector_c__c     = sectorName;
        
                if (row.get('sectorOther') != null && String.isNotBlank(String.valueOf(row.get('sectorOther'))))
                    s.Business_Sector_Other__c = (String) row.get('sectorOther');
                if (row.get('supportBegin') != null && String.isNotBlank(String.valueOf(row.get('supportBegin'))))
                    s.Support_Begin_Date__c = Date.valueOf((String) row.get('supportBegin'));
                if (row.get('supportTypeOther') != null && String.isNotBlank(String.valueOf(row.get('supportTypeOther'))))
        s.Support_Type_Other__c = (String) row.get('supportTypeOther');
                if (row.get('supportBegin') != null && String.isNotBlank(String.valueOf(row.get('supportBegin'))))
                    s.Support_Begin_Date__c = Date.valueOf((String) row.get('supportBegin'));
                if (row.get('yearlyEnrolment') != null && String.isNotBlank(String.valueOf(row.get('yearlyEnrolment'))))
                    s.Yearly_Enrolment__c = Decimal.valueOf(String.valueOf(row.get('yearlyEnrolment')));
                if (row.get('supportTypes') != null) {
                    List<Object> types = (List<Object>) row.get('supportTypes');
                    List<String> typeStrings = new List<String>();
                    for (Object t : types) typeStrings.add(String.valueOf(t));
                    s.Support_Types__c = String.join(typeStrings, ';');
                }
                sectorRows.add(s);
            }
if (!sectorRows.isEmpty()) {
        delete [SELECT Id FROM WCF_Business_Sector__c WHERE Proposal__c = :appId];
        insert sectorRows;
    }
}
                
               // Return the auto-number Name instead of the Id
    IndividualApplication submitted = [
        SELECT Name 
        FROM IndividualApplication 
        WHERE Id = :appId 
        WITH SYSTEM_MODE
        LIMIT 1
    ];
    return submitted.Name;
            }
            
            
            public class WCFDraftWrapper {
                @AuraEnabled public IndividualApplication application;
                @AuraEnabled public Historical_Data__c historical;
                @AuraEnabled public Current_fiscal_year_data__c fiscal;
                @AuraEnabled public Outcomes_Data__c outcome;
                 @AuraEnabled public List<WCF_Skilling_Domain__c> skillingDomains;
                 @AuraEnabled public List<WCF_Business_Sector__c> businessSectors;
                 @AuraEnabled public List<WCF_Livelihood_Program__c> livelihoodPrograms;
                 @AuraEnabled public List<WCF_Community__c> communities;
                 @AuraEnabled public Map<String, List<Map<String, String>>> uploadedFilesByCell;
            
            }
            @AuraEnabled
        public static void setLanguage(String languageCode) {
        try{
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
        }catch (Exception e) {
                throw new AuraHandledException('Unable to update language: ' + e.getMessage());
            }
        }
            @AuraEnabled
            public static WCFDraftWrapper getDraftWCFApplication(Id recordId) {
                WCFDraftWrapper wrapper = new WCFDraftWrapper();
                
                if (recordId == null) return wrapper;
                
                // Parent record
                wrapper.application = [
                    SELECT Id, RecordTypeId, Status, AccountId, OwnerId, Organizational_Area_s_for_Funding_Inves1__c, Organizational_Area_s_for_Funding_Inves__c,
                    Category, Organization_Name__c, Headquarters_City_and_Country__c,Language__c, 
                    Primary_Service_Regions__c, Leader_Name__c, Leader_Title__c,
                   Submitter_Name__c, Job_Title__c, Work_Email_ID__c, Phone__c, WG_Phone_Country_Code__c, Last_Page__c,    
                    Legal_Structure__c, Current_fiscal_year_s_end_date__c,Organizational_Sustainability__c, 
                    Use_of_Additional_Funding__c, Operational_Synergies_with_WOF__c,Operational_Synergies_with_WOF_Both__c,
                    Use_of_Additional_Funding_JC__c, Operational_Synergies_with_WOF_JC__c,Job_Creation_Approach__c,
                    Reference_1_Name__c, Reference_1_Role__c, Reference_1_Email__c,
                    Reference_2_Name__c, Reference_2_Role__c, Reference_2_Email__c, Attesting_User_Name__c, Attesting_User_Title__c,
            Legal_Type__c, Legal_Type_Other__c, Registration_Jurisdiction__c, Registration_Jurisdiction_Other__c, Incorporation_Date__c,
            Funder_1_Name__c, Funder_1_Amount__c, Funder_1_Period_Start__c,
            Funder_1_Period_End__c, Funder_1_Type__c,
            Funder_2_Name__c, Funder_2_Amount__c, Funder_2_Period_Start__c,
            Funder_2_Period_End__c, Funder_2_Type__c,
            Funder_3_Name__c, Funder_3_Amount__c, Funder_3_Period_Start__c,
            Funder_3_Period_End__c, Funder_3_Type__c,
            Skilling_Approach__c, GenieAI_Interest_Level__c,
            Business_Sectors_JSON__c,Leader_Tenure__c
                    FROM IndividualApplication
                    WHERE Id = :recordId
                    WITH SYSTEM_MODE
                    LIMIT 1
                ];
                
                // Related child: Historical Data
              List<Historical_Data__c> historicals = [
    SELECT Id, Proposal__c, Status__c,
    CY1_Balance_Start_CFY_1__c, CY2_Balance_Start_CFY_2__c, CY3_Balance_Start_CFY_3__c,
    CY1_Revenue__c, CY2_Revenue__c, CY3_Revenue__c,
    CY1_Capital_Expenditure__c, CY2_Capital_Expenditure__c, CY3_Capital_Expenditure__c,
    CY1_Operating_Expenditure__c, CY2_Operating_Expenditure__c, CY3_Operating_Expenditure__c,
    CY1_Expense__c, CY2_Expense__c, CY3_Expense__c,
    CY1_Balance_End__c, CY2_Balance_End__c, CY3_Balance_End__c
    FROM Historical_Data__c
    WHERE Proposal__c = :recordId
    WITH SYSTEM_MODE
    LIMIT 1
];
                wrapper.historical = historicals.isEmpty() ? null : historicals[0];
                
                // Related child: Current Fiscal Year
                List<Current_fiscal_year_data__c> fiscals = [
                    SELECT Id, Proposal__c, Status__c,
                    Revenue_Budget__c, Revenue_Projection__c, Revenue_Variance__c, Revenue_Explanation__c,
                    //Expense_Budget__c, Expense_Projection__c, Expense_Variance__c, Expense_Explanation__c,
                    Capital_Expenditure_Budget__c, Capital_Expenditure_Projection__c, Capital_Expenditure_Variance__c,
Operating_Expenditure_Budget__c, Operating_Expenditure_Projection__c, Operating_Expenditure_Variance__c,
                    Net_Budget__c, Net_Projection__c, Net_Variance__c, Net_Position_Explanation__c
                    FROM Current_fiscal_year_data__c
                    WHERE Proposal__c = :recordId
                    WITH SYSTEM_MODE
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
                                X3rd_party_verification_details_CFY__c, X3rd_party_verification_details_FY1__c, X3rd_party_verification_details_FY2__c, X3rd_party_verification_details_FY3__c, Manual_Avg_Cost_per_Placement_CFY__c,
                                Manual_Avg_Cost_per_Placement_FY_1__c,
                                Manual_Avg_Cost_per_Placement_FY_2__c,
                                Manual_Avg_Cost_per_Placement_FY_3__c,
                                Manual_Avg_Cost_per_Job_CFY__c,
                                Manual_Avg_Cost_per_Job_FY_1__c,
                                Manual_Avg_Cost_per_Job_FY_2__c,
                                Manual_Avg_Cost_per_Job_FY_3__c
                                FROM Outcomes_Data__c
                    WHERE Proposal__c = :recordId 
                    WITH SYSTEM_MODE
                    ORDER BY CreatedDate DESC
                    
                    LIMIT 1
                ];
        
                wrapper.outcome = outcomes.isEmpty() ? null : outcomes[0];
                // Related child: Skilling Domains
        wrapper.skillingDomains = [
            SELECT Id, Domain_Programme_Name__c, Hours_of_Training__c,
                   Duration_Months__c, Programme_Start_Date__c, Yearly_Enrolment__c
            FROM WCF_Skilling_Domain__c
            WHERE Proposal__c = :recordId
            WITH SYSTEM_MODE
            ORDER BY CreatedDate ASC
        ];
        
        // Related child: Business Sectors
        wrapper.businessSectors = [
            SELECT Id, Sector_c__c, Business_Sector_Other__c, Support_Begin_Date__c,
                   Support_Types__c, Support_Type_Other__c, Yearly_Enrolment__c
            FROM WCF_Business_Sector__c
            WHERE Proposal__c = :recordId
            WITH SYSTEM_MODE
            ORDER BY CreatedDate ASC
        ];

        wrapper.livelihoodPrograms = [
            SELECT Id, Program_Name__c, Support_Type_Provided__c, Duration_Man_Hours__c, Annual_Enrollment__c
            FROM WCF_Livelihood_Program__c
            WHERE Proposal__c = :recordId
            WITH SYSTEM_MODE
            ORDER BY CreatedDate ASC
        ];

        wrapper.communities = [
            SELECT Id, State__c, District_Area__c, Households_FY3__c, Households_FY2__c, Households_FY1__c, Households_Projected__c
            FROM WCF_Community__c
            WHERE Proposal__c = :recordId
            WITH SYSTEM_MODE
            ORDER BY CreatedDate ASC
        ];
               
                // ...after wrapper.outcome is set
                wrapper.uploadedFilesByCell = new Map<String, List<Map<String, String>>>();
                
                if (wrapper.outcome != null && wrapper.outcome.Id != null) {
                    Id outcomeId = wrapper.outcome.Id;
                    
                    // Query all ContentDocumentLinks for this Outcomes_Data__c record
                   // Query ContentDocumentLinks and get cellKey from ContentVersion Description
        List<ContentDocumentLink> cdls = [
            SELECT ContentDocumentId,
                   ContentDocument.LatestPublishedVersion.Title,
                   ContentDocument.LatestPublishedVersion.FileExtension,
                   ContentDocument.LatestPublishedVersion.Description
            FROM ContentDocumentLink
           
            WHERE LinkedEntityId = :outcomeId
             WITH SYSTEM_MODE
        ];
        
        Map<String, List<Map<String, String>>> filesByCell = new Map<String, List<Map<String, String>>>();
        
        for (ContentDocumentLink cdl : cdls) {
            // Read cellKey from ContentVersion Description (set by setFileCellKey)
            String cellKey = cdl.ContentDocument.LatestPublishedVersion?.Description;
            if (String.isBlank(cellKey)) continue;
        
            if (!filesByCell.containsKey(cellKey)) {
                filesByCell.put(cellKey, new List<Map<String, String>>());
            }
        
            String title = cdl.ContentDocument.LatestPublishedVersion?.Title ?? 'File';
            String ext   = cdl.ContentDocument.LatestPublishedVersion?.FileExtension ?? '';
            String name  = String.isBlank(ext) ? title : title + '.' + ext;
        
            filesByCell.get(cellKey).add(new Map<String, String>{
                'documentId' => cdl.ContentDocumentId,
                'name'       => name
            });
        }
        
        wrapper.uploadedFilesByCell = filesByCell;   }
        
        
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
        
        
        // ─── Application Status Wrapper ───────────────────────────────────────────────
        public class ApplicationStatusWrapper {
            @AuraEnabled public String  status;
            @AuraEnabled public Id      recordId;
            @AuraEnabled public String  applicationName;
            @AuraEnabled public String  organizationName;
            @AuraEnabled public String  headquarters;
            @AuraEnabled public String  selectedFundingArea;
            @AuraEnabled public String  submitterName;
            @AuraEnabled public String  lastModified;
            @AuraEnabled public String  createdDate;
            @AuraEnabled public Integer lastPage;
            @AuraEnabled public String  programmeLeadName;
            @AuraEnabled public String  programmeLeadEmail;
     @AuraEnabled public String rawStatus;   // ← ADD
            @AuraEnabled public List<ReviewNoteWrapper> reviewNotes;
            @AuraEnabled public String  flaggedQuestions;
    @AuraEnabled public List<QuestionReturnNote> questionReturnNotes;  // ← NEW
             @AuraEnabled public String reviewerReturnComment;
             @AuraEnabled public String complianceStatus;
             @AuraEnabled public String complianceReviewerNotes;
             @AuraEnabled public Integer complianceUploaded;
             @AuraEnabled public Integer complianceTotal;
        }
    
    
        
        public class ReviewNoteWrapper {
            @AuraEnabled public Integer questionNumber;
            @AuraEnabled public String  reason;
        }
        
        // ─── Get Application Status For Current Portal User ───────────────────────────
        @AuraEnabled
        public static ApplicationStatusWrapper getApplicationStatusForUser() {
            ApplicationStatusWrapper result = new ApplicationStatusWrapper();
            result.status      = 'NotStarted';
            result.reviewNotes = new List<ReviewNoteWrapper>(); 
        
           try {
        // 1. Get the current portal user's AccountId + Contact name + Account org name
        User currentUser = [    
            SELECT Id, AccountId, Contact.FirstName, Contact.LastName,
                   Account.Name, Account.IsPersonAccount, Account.WCF_Organizational_Name__c,
                   Contact.Current_Organization__c
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];
    
        // Set the display name immediately so it's available even before
        // any IndividualApplication exists (fixes blank name on empty-state dashboard)
        if (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.FirstName)) {
            result.submitterName = currentUser.Contact.FirstName;
        }

        if (currentUser.Account != null) {
            if (String.isNotBlank(currentUser.Account.WCF_Organizational_Name__c)) {
                result.organizationName = currentUser.Account.WCF_Organizational_Name__c;
            } else if (currentUser.Contact != null && String.isNotBlank(currentUser.Contact.Current_Organization__c)) {
                result.organizationName = currentUser.Contact.Current_Organization__c;
            } else if (!currentUser.Account.IsPersonAccount && String.isNotBlank(currentUser.Account.Name)) {
                result.organizationName = currentUser.Account.Name;
            }
        }

        Id userAccountId = currentUser.AccountId;
        List<IndividualApplication> apps = new List<IndividualApplication>();

        if (userAccountId != null) {
            apps = [
                SELECT Id,
                       Name,
                       Status,
                       Review_Status__c,
                       AccountId,
                       Organization_Name__c,
                       Headquarters_City_and_Country__c,
                       Organizational_Area_s_for_Funding_Inves1__c,
                       Organizational_Area_s_for_Funding_Inves__c,
                       Submitter_Name__c,
                       Last_Page__c,
                       LastModifiedDate,
                       CreatedDate,
                       Owner.Name,
                       Owner.Email
                FROM IndividualApplication
                WHERE AccountId = :userAccountId
                  AND Category   = 'WCF Grant Application'
                WITH SYSTEM_MODE
                ORDER BY LastModifiedDate DESC
                LIMIT 1
            ];
        } else {
            apps = [
                SELECT Id,
                       Name,
                       Status,
                       Review_Status__c,
                       AccountId,
                       Organization_Name__c,
                       Headquarters_City_and_Country__c,
                       Organizational_Area_s_for_Funding_Inves1__c,
                       Organizational_Area_s_for_Funding_Inves__c,
                       Submitter_Name__c,
                       Last_Page__c,
                       LastModifiedDate,
                       CreatedDate,
                       Owner.Name,
                       Owner.Email
                FROM IndividualApplication
                WHERE (OwnerId = :currentUser.Id OR Category = 'WCF Grant Application')
                WITH SYSTEM_MODE
                ORDER BY LastModifiedDate DESC
                LIMIT 1
            ];
        }

        if (apps.isEmpty()) {
            return result;
        }

        IndividualApplication app = apps[0];
        Id targetAccId = app.AccountId != null ? app.AccountId : userAccountId;

        // After fetching the app, get the Account's PL of Record
        List<Account> accounts = new List<Account>();
        if (targetAccId != null) {
            accounts = [
                SELECT Id, PL__c
                FROM Account
                WHERE Id = :targetAccId
                WITH SYSTEM_MODE
                LIMIT 1
            ];
        }

        // 3. Map Status → normalizedStatus
            //    Review_Status__c drives Sealed/UnderReview/ReviewSubmitted
            String sfStatus    = app.Status;
            String reviewStatus = app.Review_Status__c;
               Set<String> reviewerOnlyStatuses = new Set<String>{
    'Review Completed - Not Recommended',
    'Review Completed - Recommended',
    'Reviewer Rejected',
    'Recommended',
    'Not Recommended'
};
            String normalized;
        
          if (reviewerOnlyStatuses.contains(sfStatus)) {
    normalized = 'UnderReview';
} else if (sfStatus == 'Draft') {
                normalized = 'Draft';
            } else if (sfStatus == 'Revision Requested') {
                normalized = 'RevisionRequested';
            } else if (sfStatus == 'Submitted') {
                // Check Review_Status__c to distinguish sub-states
                if (reviewStatus == 'Sealed') {
                    normalized = 'Sealed';
                } else if (reviewStatus == 'Under Review' || reviewStatus == 'In Review') {
                    normalized = 'UnderReview';
                } else if (reviewStatus == 'Review Submitted') {
                    normalized = 'ReviewSubmitted';
                } else {
                    normalized = 'Submitted';
                }
            } else if (sfStatus == 'Under Review' || sfStatus == 'In Review') {
                normalized = 'UnderReview';
            } else if (sfStatus == 'Recommend for Fund' || sfStatus == 'Onboarded') {
                normalized = 'Approved';
            } else if (sfStatus == 'Not Recommend for Fund'
                    || sfStatus == 'Rejected - Level 1'
                    || sfStatus == 'Rejected - Level 2'
                    || sfStatus == 'Denied') {      // ← ADD   {
                normalized = 'Decided';
            } else if (sfStatus == 'Approved - Level 1'
                    || sfStatus == 'Approved - Level 2'
                    || sfStatus == 'Funded') {
                normalized = 'Decided';
            } else if (sfStatus == 'Recommended'
                    || sfStatus == 'Not Recommended') {
                normalized = 'ReviewSubmitted';
            } else if (sfStatus == 'Application Resubmitted') {
                normalized = 'ApplicationResubmitted';
                } else if (sfStatus == 'Additional Info Requested') {
        normalized = 'AdditionalInfoRequested';
            } else if (sfStatus == 'In Review') {
                normalized = 'InReview';
            } else if (sfStatus == 'Review Completed - Recommended') {
                normalized = 'ReviewSubmitted';
            } else if (String.isNotBlank(sfStatus)) {
                // Any other status that exists = at minimum Submitted
                normalized = 'Submitted';
            } else {
                normalized = 'NotStarted';
            }
        
            result.status              = normalized;
               result.rawStatus = reviewerOnlyStatuses.contains(sfStatus) ? null : sfStatus;
            result.recordId            = app.Id;
            result.applicationName     = app.Name;
            String orgName = app.Organization_Name__c;
            if (String.isBlank(orgName) || (currentUser.Account != null && currentUser.Account.IsPersonAccount && orgName == currentUser.Account.Name && String.isNotBlank(currentUser.Account.WCF_Organizational_Name__c))) {
                orgName = String.isNotBlank(currentUser.Account.WCF_Organizational_Name__c) ? currentUser.Account.WCF_Organizational_Name__c : '';
            }
            result.organizationName    = orgName;
            result.headquarters        = app.Headquarters_City_and_Country__c;
            result.selectedFundingArea = String.isNotBlank(app.Organizational_Area_s_for_Funding_Inves1__c)
                                           ? app.Organizational_Area_s_for_Funding_Inves1__c
                                           : app.Organizational_Area_s_for_Funding_Inves__c;
            result.submitterName       = app.Submitter_Name__c;
            result.lastModified        = app.LastModifiedDate != null
                                           ? String.valueOf(app.LastModifiedDate) : null;
            result.createdDate         = app.CreatedDate != null
                                           ? String.valueOf(app.CreatedDate) : null;
            result.lastPage            = app.Last_Page__c != null
                                           ? Integer.valueOf(app.Last_Page__c) : 1;
    
            // Programme lead — resolved from PL__c (Person Account lookup)
            if (!accounts.isEmpty() && accounts[0].PL__c != null) {
                List<Account> plAccounts = [
                    SELECT Id, Name, PersonEmail
                    FROM Account
                    WHERE Id = :accounts[0].PL__c
                    WITH SYSTEM_MODE
                    LIMIT 1
                ];
                if (!plAccounts.isEmpty()) {
                    result.programmeLeadName  = plAccounts[0].Name;
                    result.programmeLeadEmail = plAccounts[0].PersonEmail;
                } else {
                    result.programmeLeadName  = app.Owner.Name;
                    result.programmeLeadEmail = app.Owner.Email;
                }
            } else {
                // Fallback to app owner if no PL assigned
                result.programmeLeadName  = app.Owner.Name;
                result.programmeLeadEmail = app.Owner.Email;
            }
        
                // 4. Revision notes — pulled from ApplicationReview
                //    Using Field_level_checklist_for_the_Partner__c which exists in WCFValidatorController
    if (normalized == 'RevisionRequested' || normalized == 'ApplicationResubmitted') {
        List<ApplicationReview> reviews = [
            SELECT Id,
                   Field_level_checklist_for_the_Partner__c,
                   Question_Number_1__c,  Question_Number_2__c,
                   Question_Number_3__c,  Question_Number_4__c,
                   Question_Number_5__c,  Question_Number_6__c,
                   Question_Number_7__c,  Question_Number_8__c,
                   Question_Number_9__c,  Question_Number_10__c,
                   Question_Number_11__c, Question_Number_12__c,
                   Question_Number_13__c, Question_Number_14__c,
                   Question_Number_15__c, Question_Number_16__c,
                   Question_Number_17__c, Question_Number_18__c,
                   Question_Number_19__c, Question_Number_20__c, Question_Number_21__c,
                   Question_Number_22__c, Question_Number_23__c, Question_Number_24__c,
                   Question_Number_25__c, Question_Number_26__c, Question_Number_27__c,
                   Question_Number_28__c
            FROM ApplicationReview
            WHERE ApplicationId = :app.Id
            WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];
    
        if (!reviews.isEmpty()) {
            ApplicationReview rev = reviews[0];
    
            // ── Per-question return notes from Question_Number_N__c fields ──
            Map<Integer, String> qFieldMap = new Map<Integer, String>{
                1  => rev.Question_Number_1__c,
                2  => rev.Question_Number_2__c,
                3  => rev.Question_Number_3__c,
                4  => rev.Question_Number_4__c,
                5  => rev.Question_Number_5__c,
                6  => rev.Question_Number_6__c,
                7  => rev.Question_Number_7__c,
                8  => rev.Question_Number_8__c,
                9  => rev.Question_Number_9__c,
                10 => rev.Question_Number_10__c,
                11 => rev.Question_Number_11__c,
                12 => rev.Question_Number_12__c,
                13 => rev.Question_Number_13__c,
                14 => rev.Question_Number_14__c,
                15 => rev.Question_Number_15__c,
                16 => rev.Question_Number_16__c,
                17 => rev.Question_Number_17__c,
                18 => rev.Question_Number_18__c,
                19 => rev.Question_Number_19__c,
                20 => rev.Question_Number_20__c,
                21 => rev.Question_Number_21__c,
                22 => rev.Question_Number_22__c,
                23 => rev.Question_Number_23__c,
                24 => rev.Question_Number_24__c,
                25 => rev.Question_Number_25__c,
                26 => rev.Question_Number_26__c,
                27 => rev.Question_Number_27__c,
                28 => rev.Question_Number_28__c
            };
    
            // ── Dynamic Track Question Mapping ──
            String fundingArea = String.isNotBlank(app.Organizational_Area_s_for_Funding_Inves1__c)
                ? app.Organizational_Area_s_for_Funding_Inves1__c
                : app.Organizational_Area_s_for_Funding_Inves__c;
            if (fundingArea == null) fundingArea = '';

            Boolean hasJF = fundingArea.contains('Job Fulfillment') || fundingArea == 'Job Fulfillment Only' || fundingArea == 'Both Job Fulfillment and Job Creation';
            Boolean hasJC = fundingArea.contains('Job Creation') || fundingArea == 'Job Creation Only' || fundingArea == 'Both Job Fulfillment and Job Creation';
            Boolean hasLiv = fundingArea.contains('Livelihood');

            Map<String, Integer> qNumMap = new Map<String, Integer>();
            Integer currNum = 1;
            for (Integer i = 1; i <= 10; i++) {
                qNumMap.put('Q' + i, currNum++);
            }
            if (hasJF) {
                qNumMap.put('Q11', currNum++);
                qNumMap.put('Q12', currNum++);
                qNumMap.put('Q13', currNum++);
                qNumMap.put('Q14', currNum++);
            }
            if (hasJC) {
                qNumMap.put('Q15', currNum++);
                qNumMap.put('Q16', currNum++);
                qNumMap.put('Q17', currNum++);
                qNumMap.put('Q18', currNum++);
            }
            if (hasLiv) {
                qNumMap.put('Q19', currNum++);
                qNumMap.put('Q20', currNum++);
                qNumMap.put('Q21', currNum++);
                qNumMap.put('Q22', currNum++);
                qNumMap.put('Q23', currNum++);
            }
            qNumMap.put('Q24', currNum++);
            qNumMap.put('Q25', currNum++);
            qNumMap.put('Q26', currNum++);
            qNumMap.put('Q27', currNum++);
            qNumMap.put('Q28', currNum++);

            result.questionReturnNotes = new List<QuestionReturnNote>();
            
            for (Integer canonicalNum : qFieldMap.keySet()) {
                String txt = qFieldMap.get(canonicalNum);
                if (String.isNotBlank(txt)) {
                    String canonicalKey = 'Q' + canonicalNum;
                    Integer displayNum = qNumMap.containsKey(canonicalKey) ? qNumMap.get(canonicalKey) : canonicalNum;
                    result.questionReturnNotes.add(
                        new QuestionReturnNote(displayNum, canonicalKey, txt)
                    );
                }
            }
            
            // Sort ascending by question number
            result.questionReturnNotes.sort();
    
            result.flaggedQuestions = null;
        }
    }
               if (normalized == 'AdditionalInfoRequested') {
        List<ApplicationReview> reviewerReturns = [
            SELECT Id, Reviewer_Return_Comment__c
            FROM ApplicationReview
            WHERE ApplicationId = :app.Id
            WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];
        if (!reviewerReturns.isEmpty()
            && String.isNotBlank(reviewerReturns[0].Reviewer_Return_Comment__c)) {
            result.reviewerReturnComment = reviewerReturns[0].Reviewer_Return_Comment__c;
        }
    }
                // Compliance decision status
                String compStatus = 'Pending';
                String compNotes = '';
                List<WCF_Compliance_Document__c> allDocs = [
                    SELECT Id, Status__c, Reviewer_Notes__c, Document_Type__c, Document_Types__c, Document_Status_JSON__c
                    FROM WCF_Compliance_Document__c
                    WHERE IndividualApplication__c = :app.Id
                    WITH SYSTEM_MODE
                    ORDER BY LastModifiedDate DESC
                ];

                Boolean hasRejected = false;
                Boolean hasSuspended = false;
                Boolean hasReturned = false;
                String returnedNotes = '';
                String rejectedNotes = '';
                String suspendedNotes = '';

                for (WCF_Compliance_Document__c doc : allDocs) {
                    if (doc.Status__c == 'Rejected') {
                        hasRejected = true;
                        if (String.isNotBlank(doc.Reviewer_Notes__c)) {
                            rejectedNotes = doc.Reviewer_Notes__c;
                        }
                    } else if (doc.Status__c == 'Suspended') {
                        hasSuspended = true;
                        if (String.isNotBlank(doc.Reviewer_Notes__c)) {
                            suspendedNotes = doc.Reviewer_Notes__c;
                        }
                    } else if (doc.Status__c == 'Returned') {
                        hasReturned = true;
                        if (String.isNotBlank(doc.Reviewer_Notes__c)) {
                            if (String.isNotBlank(returnedNotes)) {
                                returnedNotes += '; ' + doc.Reviewer_Notes__c;
                            } else {
                                returnedNotes = doc.Reviewer_Notes__c;
                            }
                        }
                    }
                }

                Integer totalRequired = 0;
                Integer totalValidated = 0;
                
                Set<String> adHocLabels = new Set<String>();
                List<WCF_Compliance_Document__c> adHocRequests = new List<WCF_Compliance_Document__c>();
                Map<String, WCF_Compliance_Document__c> existingByType = new Map<String, WCF_Compliance_Document__c>();

                for (WCF_Compliance_Document__c doc : allDocs) {
                    if (String.isNotBlank(doc.Document_Type__c)) {
                        existingByType.put(doc.Document_Type__c, doc);
                    } else if (String.isNotBlank(doc.Document_Types__c)) {
                        adHocRequests.add(doc);
                    }
                }

                for (WCF_Compliance_Document__c doc : adHocRequests) {
                    for (String label : doc.Document_Types__c.split(';')) {
                        label = label.trim();
                        if (String.isBlank(label)) continue;
                        adHocLabels.add(label);

                        totalRequired++;
                        WCF_Compliance_Document__c fulfilled = existingByType.get(label);
                        if (fulfilled != null && fulfilled.Status__c == 'Validated') {
                            totalValidated++;
                        } else if (fulfilled == null) {
                            Map<String, Object> statusMap = new Map<String, Object>();
                            if (String.isNotBlank(doc.Document_Status_JSON__c)) {
                                try {
                                    statusMap = (Map<String, Object>) JSON.deserializeUntyped(doc.Document_Status_JSON__c);
                                } catch(Exception ex){}
                            }
                            Map<String, Object> entry = (Map<String, Object>) statusMap.get(label);
                            if (entry != null && entry.get('status') == 'Validated') {
                                totalValidated++;
                            }
                        }
                    }
                }

                for (String label : existingByType.keySet()) {
                    if (!adHocLabels.contains(label)) {
                        totalRequired++;
                        WCF_Compliance_Document__c doc = existingByType.get(label);
                        if (doc.Status__c == 'Validated') {
                            totalValidated++;
                        }
                    }
                }

                result.complianceUploaded = totalValidated;
                result.complianceTotal    = totalRequired;

                if (hasRejected) {
                    compStatus = 'Rejected';
                    compNotes = rejectedNotes;
                } else if (hasSuspended) {
                    compStatus = 'Suspended';
                    compNotes = suspendedNotes;
                } else if (hasReturned) {
                    compStatus = 'Returned';
                    compNotes = returnedNotes;
                } else if (totalRequired > 0 && totalValidated >= totalRequired) {
                    compStatus = 'Validated';
                } else {
                    compStatus = 'In Progress';
                }

                result.complianceStatus = compStatus;
                result.complianceReviewerNotes = compNotes;

            } catch (Exception e) {
                System.debug('getApplicationStatusForUser error: ' + e.getMessage()
                             + ' line ' + e.getLineNumber());
                result.status = 'NotStarted';
            }
        
            return result;
        }
    public class QuestionReturnNote implements Comparable {
        @AuraEnabled public Integer questionNum;
        @AuraEnabled public String  questionKey;
        @AuraEnabled public String  returnText;
        
        public QuestionReturnNote(Integer n, String t) {
            this.questionNum = n;
            this.questionKey = 'Q' + n;
            this.returnText  = t;
        }

        public QuestionReturnNote(Integer n, String k, String t) {
            this.questionNum = n;
            this.questionKey = k;
            this.returnText  = t;
        }
        
        public Integer compareTo(Object other) {
            QuestionReturnNote o = (QuestionReturnNote) other;
            return this.questionNum - o.questionNum;
        }
    }
    
    @AuraEnabled
    public static void saveRfiResponse(Id applicationId, String updatedFieldsJson) {
        try {
            Map<String, Object> fieldsMap =
                (Map<String, Object>) JSON.deserializeUntyped(updatedFieldsJson);
    
            // ── Separate the prefixed keys from orgData fields ────────────────
            Map<String, Object> orgFields      = new Map<String, Object>();
            Map<String, Object> histFields     = new Map<String, Object>();
            Map<String, Object> fiscalFields   = new Map<String, Object>();
            Map<String, Object> outcomeFields  = new Map<String, Object>();
            String skillingDomainsJson = null;
            String businessSectorsJson = null;
    
            for (String key : fieldsMap.keySet()) {
                if (key == 'Id') continue;
                Object val = fieldsMap.get(key);
    
                if (key.startsWith('_hist_')) {
                    histFields.put(key.removeStart('_hist_'), val);
                } else if (key.startsWith('_fiscal_')) {
                    fiscalFields.put(key.removeStart('_fiscal_'), val);
                } else if (key.startsWith('_outcome_')) {
                    outcomeFields.put(key.removeStart('_outcome_'), val);
                } else if (key == '_skillingDomainsJson') {
                    skillingDomainsJson = (String) val;
                } else if (key == '_businessSectorsJson') {
                    businessSectorsJson = (String) val;
                } else {
                    orgFields.put(key, val);
                }
            }
    
            // ── 1. Update IndividualApplication (orgData fields) ─────────────
     IndividualApplication app = new IndividualApplication(Id = applicationId);
                Map<String, Schema.SObjectField> appFieldsMeta =
                    Schema.SObjectType.IndividualApplication.fields.getMap();
            if (!orgFields.isEmpty()) {
               
    
                for (String fieldName : orgFields.keySet()) {
                    if (!appFieldsMeta.containsKey(fieldName)) continue;
                    Object val = orgFields.get(fieldName);
                    if (val == null) continue;
                    Schema.DisplayType dt = appFieldsMeta.get(fieldName).getDescribe().getType();
                    try {
                        if (dt == Schema.DisplayType.DATE && val instanceof String
                                && String.isNotBlank((String) val)) {
                            app.put(fieldName, Date.valueOf((String) val));
                        } else if (dt == Schema.DisplayType.CURRENCY
                                || dt == Schema.DisplayType.DOUBLE
                                || dt == Schema.DisplayType.PERCENT) {
                            app.put(fieldName, Decimal.valueOf(String.valueOf(val)));
                        } else if (dt == Schema.DisplayType.INTEGER) {
                            app.put(fieldName, Integer.valueOf(String.valueOf(val)));
                        } else {
                            app.put(fieldName, val);
                        }
                    } catch (Exception fe) {
                        System.debug('RFI org field error: ' + fieldName + ' => ' + fe.getMessage());
                    }
                }
    
                
            }
            app.Status = 'Application Resubmitted';
                app.Last_Resubmission_Date__c = System.now();
                update as system app;
    
            // ── 2. Update Historical_Data__c (Q12) ───────────────────────────
            if (!histFields.isEmpty()) {
                List<Historical_Data__c> hists = [
                    SELECT Id FROM Historical_Data__c
                    WHERE Proposal__c = :applicationId
                    WITH SYSTEM_MODE LIMIT 1
                ];
                if (!hists.isEmpty()) {
                    Historical_Data__c hist = hists[0];
                    Map<String, Schema.SObjectField> histMeta =
                        Schema.SObjectType.Historical_Data__c.fields.getMap();
                    for (String f : histFields.keySet()) {
                        if (!histMeta.containsKey(f)) continue;
                        Object val = histFields.get(f);
                        if (val == null) continue;
                        Schema.DisplayType dt = histMeta.get(f).getDescribe().getType();
                        try {
                            if (dt == Schema.DisplayType.CURRENCY || dt == Schema.DisplayType.DOUBLE
                                    || dt == Schema.DisplayType.PERCENT || dt == Schema.DisplayType.INTEGER) {
                                hist.put(f, Decimal.valueOf(String.valueOf(val)));
                            } else {
                                hist.put(f, val);
                            }
                        } catch (Exception fe) {
                            System.debug('RFI hist field error: ' + f + ' => ' + fe.getMessage());
                        }
                    }
                    update as system hist;
                }
            }
    
            // ── 3. Update Current_fiscal_year_data__c (Q13) ──────────────────
            if (!fiscalFields.isEmpty()) {
                List<Current_fiscal_year_data__c> fiscals = [
                    SELECT Id FROM Current_fiscal_year_data__c
                    WHERE Proposal__c = :applicationId
                    WITH SYSTEM_MODE LIMIT 1
                ];
                if (!fiscals.isEmpty()) {
                    Current_fiscal_year_data__c fiscal = fiscals[0];
                    Map<String, Schema.SObjectField> fiscalMeta =
                        Schema.SObjectType.Current_fiscal_year_data__c.fields.getMap();
                    for (String f : fiscalFields.keySet()) {
                        if (!fiscalMeta.containsKey(f)) continue;
                        Object val = fiscalFields.get(f);
                        if (val == null) continue;
                        Schema.DisplayType dt = fiscalMeta.get(f).getDescribe().getType();
                        try {
                            if (dt == Schema.DisplayType.CURRENCY || dt == Schema.DisplayType.DOUBLE
                                    || dt == Schema.DisplayType.PERCENT || dt == Schema.DisplayType.INTEGER) {
                                fiscal.put(f, Decimal.valueOf(String.valueOf(val)));
                            } else {
                                fiscal.put(f, val);
                            }
                        } catch (Exception fe) {
                            System.debug('RFI fiscal field error: ' + f + ' => ' + fe.getMessage());
                        }
                    }
                    update as system fiscal;
                }
            }
    
            // ── 4. Update Outcomes_Data__c (Q15–Q18) ─────────────────────────
            if (!outcomeFields.isEmpty()) {
                List<Outcomes_Data__c> outcomes = [
                    SELECT Id FROM Outcomes_Data__c
                    WHERE Proposal__c = :applicationId
                    WITH SYSTEM_MODE
                    ORDER BY CreatedDate DESC LIMIT 1
                ];
                if (!outcomes.isEmpty()) {
                    Outcomes_Data__c out = outcomes[0];
                    Map<String, Schema.SObjectField> outMeta =
                        Schema.SObjectType.Outcomes_Data__c.fields.getMap();
                    for (String f : outcomeFields.keySet()) {
                        if (!outMeta.containsKey(f)) continue;
                        Object val = outcomeFields.get(f);
                        if (val == null) continue;
                        String strVal = String.valueOf(val);
                        if (String.isBlank(strVal) || strVal == 'null') continue;
                        Schema.DisplayType dt = outMeta.get(f).getDescribe().getType();
                        try {
                            if (dt == Schema.DisplayType.CURRENCY || dt == Schema.DisplayType.DOUBLE
                                    || dt == Schema.DisplayType.PERCENT || dt == Schema.DisplayType.INTEGER) {
                                out.put(f, Decimal.valueOf(strVal));
                            } else if (dt == Schema.DisplayType.BOOLEAN) {
                                out.put(f, Boolean.valueOf(strVal));
                            } else if (dt == Schema.DisplayType.DATE && String.isNotBlank(strVal)) {
                                out.put(f, Date.valueOf(strVal));
                            } else {
                                out.put(f, strVal);
                            }
                        } catch (Exception fe) {
                            System.debug('RFI outcome field error: ' + f + ' => ' + fe.getMessage());
                        }
                    }
                    update as system out;
                }
            }
    
            // ── 5. Replace Skilling Domains (Q9) ─────────────────────────────
            if (String.isNotBlank(skillingDomainsJson)) {
                List<Object> domainRows = (List<Object>) JSON.deserializeUntyped(skillingDomainsJson);
                delete [SELECT Id FROM WCF_Skilling_Domain__c WHERE Proposal__c = :applicationId];
                List<WCF_Skilling_Domain__c> toInsert = new List<WCF_Skilling_Domain__c>();
                for (Object item : domainRows) {
                    Map<String, Object> row = (Map<String, Object>) item;
                    String domainName = (String) row.get('domain');
                    if (String.isBlank(domainName)) continue;
                    WCF_Skilling_Domain__c d = new WCF_Skilling_Domain__c();
                    d.Proposal__c              = applicationId;
                    d.Domain_Programme_Name__c = domainName;
                    if (row.get('hours') != null && String.isNotBlank(String.valueOf(row.get('hours'))))
                        d.Hours_of_Training__c = Decimal.valueOf(String.valueOf(row.get('hours')));
                    if (row.get('duration') != null && String.isNotBlank(String.valueOf(row.get('duration'))))
                        d.Duration_Months__c = Decimal.valueOf(String.valueOf(row.get('duration')));
                    if (row.get('startDate') != null && String.isNotBlank(String.valueOf(row.get('startDate'))))
                        d.Programme_Start_Date__c = Date.valueOf((String) row.get('startDate'));
                    if (row.get('yearlyEnrolment') != null && String.isNotBlank(String.valueOf(row.get('yearlyEnrolment'))))
                        d.Yearly_Enrolment__c = Decimal.valueOf(String.valueOf(row.get('yearlyEnrolment')));
                    toInsert.add(d);
                }
                if (!toInsert.isEmpty()) insert toInsert;
            }
    
            // ── 6. Replace Business Sectors (Q11) ────────────────────────────
            if (String.isNotBlank(businessSectorsJson)) {
                List<Object> sectorRows = (List<Object>) JSON.deserializeUntyped(businessSectorsJson);
                delete [SELECT Id FROM WCF_Business_Sector__c WHERE Proposal__c = :applicationId];
                List<WCF_Business_Sector__c> toInsert = new List<WCF_Business_Sector__c>();
                for (Object item : sectorRows) {
                    Map<String, Object> row = (Map<String, Object>) item;
                    String sectorName = (String) row.get('sector');
                    if (String.isBlank(sectorName)) continue;
                   WCF_Business_Sector__c s = new WCF_Business_Sector__c();
                    s.Proposal__c = applicationId;
                    s.Sector_c__c = sectorName;
                    if (row.get('sectorOther') != null && String.isNotBlank(String.valueOf(row.get('sectorOther'))))
                        s.Business_Sector_Other__c = (String) row.get('sectorOther');
                    if (row.get('supportTypeOther') != null && String.isNotBlank(String.valueOf(row.get('supportTypeOther'))))
        s.Support_Type_Other__c = (String) row.get('supportTypeOther');
                    if (row.get('supportBegin') != null && String.isNotBlank(String.valueOf(row.get('supportBegin'))))
                        s.Support_Begin_Date__c = Date.valueOf((String) row.get('supportBegin'));
                    if (row.get('yearlyEnrolment') != null && String.isNotBlank(String.valueOf(row.get('yearlyEnrolment'))))
                        s.Yearly_Enrolment__c = Decimal.valueOf(String.valueOf(row.get('yearlyEnrolment')));
                    if (row.get('supportTypes') != null) {
                        List<Object> types = (List<Object>) row.get('supportTypes');
                        List<String> typeStrings = new List<String>();
                        for (Object t : types) typeStrings.add(String.valueOf(t));
                        s.Support_Types__c = String.join(typeStrings, ';');
                    }
                    toInsert.add(s);
                }
                if (!toInsert.isEmpty()) insert toInsert;
            }
    
        } catch (Exception e) {
            throw new AuraHandledException('RFI save failed: ' + e.getMessage());
        }
    }
 @AuraEnabled
public static void deleteUploadedFile(String contentDocumentId) {
    try {
        List<ContentDocument> docs = [
            SELECT Id FROM ContentDocument WHERE Id = :contentDocumentId WITH SYSTEM_MODE LIMIT 1
        ];
        if (!docs.isEmpty()) {
            delete docs[0];
            Database.emptyRecycleBin(new List<Id>{ docs[0].Id }); // ← purge, actually frees storage
        }
    } catch (Exception e) {
        throw new AuraHandledException('Error deleting file: ' + e.getMessage());
    }
}
        @AuraEnabled(cacheable=false)
    public static List<Map<String,String>> getApplicationAttachments(Id applicationId) {
        List<Map<String,String>> result = new List<Map<String,String>>();
        if (applicationId == null) return result;
    
        for (ContentDocumentLink cdl : [
            SELECT ContentDocumentId,
                    ContentDocument.LatestPublishedVersionId,
                   ContentDocument.LatestPublishedVersion.Title,
                   ContentDocument.LatestPublishedVersion.FileExtension
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :applicationId
            WITH SYSTEM_MODE
        ]) {
            String title = cdl.ContentDocument.LatestPublishedVersion?.Title ?? 'File';
            String ext   = cdl.ContentDocument.LatestPublishedVersion?.FileExtension ?? '';
            String fullName = title;
            if (String.isNotBlank(ext) && !title.toLowerCase().endsWith('.' + ext.toLowerCase())) {
                fullName = title + '.' + ext;
            }
            result.add(new Map<String,String>{
                'documentId' => cdl.ContentDocumentId,
                 'versionId'   => cdl.ContentDocument.LatestPublishedVersionId,
                'name'       => fullName
            });
        }
        return result;
    }
        
@AuraEnabled(cacheable=false)
public static Map<String, List<Map<String,String>>> getApplicationAttachmentsByCell(Id applicationId) {
    Map<String, List<Map<String,String>>> filesByCell = new Map<String, List<Map<String,String>>>();
    if (applicationId == null) return filesByCell;

    Set<Id> linkedEntityIds = new Set<Id>{ applicationId };
    for (Outcomes_Data__c o : [
        SELECT Id FROM Outcomes_Data__c WHERE Proposal__c = :applicationId WITH SYSTEM_MODE
    ]) { linkedEntityIds.add(o.Id); }

    for (ContentDocumentLink cdl : [
        SELECT ContentDocumentId,
               LinkedEntityId,
               ContentDocument.LatestPublishedVersion.Title,
               ContentDocument.LatestPublishedVersion.FileExtension,
               ContentDocument.LatestPublishedVersion.Description
        FROM ContentDocumentLink
        WHERE LinkedEntityId IN :linkedEntityIds
        WITH SYSTEM_MODE
    ]) {
        String cellKey = cdl.ContentDocument.LatestPublishedVersion?.Description;

        // Legacy fallback: files uploaded before cell-key tagging was fixed have
        // no Description. Only the Q21 uploader ever links a file directly to the
        // Application (every other cell links to Outcomes_Data__c), so an
        // untagged file linked straight to the Application is safe to treat as
        // an orphaned Q21 upload from before the fix.
        if (String.isBlank(cellKey)) {
            if (cdl.LinkedEntityId == applicationId) {
                cellKey = 'Q21';
            } else {
                continue;
            }
        }

        if (!filesByCell.containsKey(cellKey)) filesByCell.put(cellKey, new List<Map<String,String>>());
        String title = cdl.ContentDocument.LatestPublishedVersion?.Title ?? 'File';
        String ext   = cdl.ContentDocument.LatestPublishedVersion?.FileExtension ?? '';
        filesByCell.get(cellKey).add(new Map<String,String>{
            'documentId' => cdl.ContentDocumentId,
            'name'       => String.isBlank(ext) ? title : title + '.' + ext
        });
    }
    return filesByCell;
}
    
    @AuraEnabled
public static List<FileValidationResult> validateUploadedFile(List<Id> contentDocumentIds) {
    List<FileValidationResult> results = new List<FileValidationResult>();
    if (contentDocumentIds == null || contentDocumentIds.isEmpty()) return results;

    final Long MAX_FILE_SIZE_BYTES = 50L * 1024L * 1024L; // 50 MB
    final Set<String> ALLOWED_EXTENSIONS = new Set<String>{
        'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'
    };

    Map<Id, ContentVersion> latestByDocId = new Map<Id, ContentVersion>();
    for (ContentVersion cv : [
        SELECT Id, ContentDocumentId, Title, FileExtension, ContentSize
        FROM ContentVersion
        WHERE ContentDocumentId IN :contentDocumentIds
        AND IsLatest = true
        WITH SYSTEM_MODE
    ]) {
        latestByDocId.put(cv.ContentDocumentId, cv);
    }

    for (Id docId : contentDocumentIds) {
        FileValidationResult r = new FileValidationResult();
        r.contentDocumentId = docId;

        ContentVersion cv = latestByDocId.get(docId);
        if (cv == null) {
            r.isValid = false;
            r.fileName = 'Unknown file';
            r.reason = 'File record not found.';
            results.add(r);
            continue;
        }

        String ext = String.isNotBlank(cv.FileExtension) ? cv.FileExtension.toLowerCase() : '';
        r.fileName = String.isNotBlank(ext) ? cv.Title + '.' + ext : cv.Title;

        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            r.isValid = false;
            r.reason = 'File type not allowed. Accepted formats: PDF, Word, PowerPoint, Excel.';
            results.add(r);
            continue;
        }

        if (cv.ContentSize != null && cv.ContentSize > MAX_FILE_SIZE_BYTES) {
            r.isValid = false;
            r.reason = 'File exceeds the 50 MB size limit.';
            results.add(r);
            continue;
        }

        if (!performMalwareScan(cv)) {
            r.isValid = false;
            r.reason = 'File failed the malware scan.';
            results.add(r);
            continue;
        }

        r.isValid = true;
        results.add(r);
    }

    return results;
}

// Hook for your malware-scanning service. Returns true (pass-through) as a
// placeholder — replace with a real callout to your AV provider before this
// ships. If the scanner is async, switch this whole flow to: accept the
// upload as "Pending Scan", fire a Queueable/Platform Event callout, and
// have the callback update the ContentVersion (or a status field) once the
// verdict comes back — a synchronous AuraEnabled method can't wait on that.
private static Boolean performMalwareScan(ContentVersion cv) {
    return true;
}

public class FileValidationResult {
    @AuraEnabled public Id contentDocumentId;
    @AuraEnabled public String fileName;
    @AuraEnabled public Boolean isValid;
    @AuraEnabled public String reason;
}
        }