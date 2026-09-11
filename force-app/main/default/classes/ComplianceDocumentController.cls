public without sharing class ComplianceDocumentController {

    // ─── DTOs ────────────────────────────────────────────────────────────────

    public class ComplianceSummaryDTO {
        @AuraEnabled public Integer allRequests { get; set; }
        @AuraEnabled public Integer pending     { get; set; }
        @AuraEnabled public Integer overdue     { get; set; }
        @AuraEnabled public Integer received    { get; set; }
    }

    public class ComplianceRowDTO {
        @AuraEnabled public String requestId        { get; set; }
        @AuraEnabled public String recordId         { get; set; }
        @AuraEnabled public String orgName          { get; set; }
        @AuraEnabled public String orgId            { get; set; }
        @AuraEnabled public String applicationId    { get; set; }
        @AuraEnabled public String applicationName  { get; set; }
        @AuraEnabled public List<String> documents  { get; set; }
        @AuraEnabled public String requestedDate    { get; set; }
        @AuraEnabled public String dueDate          { get; set; }
        @AuraEnabled public String priority         { get; set; }
        @AuraEnabled public String status           { get; set; }
        @AuraEnabled public String geography        { get; set; }
        @AuraEnabled public String notes            { get; set; }
    }

    public class ApplicationLinkDTO {
        @AuraEnabled public String recordId        { get; set; }
        @AuraEnabled public String applicationName { get; set; }
    }

    public class ReviewItemDTO {
        @AuraEnabled public String documentLabel { get; set; }
        @AuraEnabled public String status { get; set; }
        @AuraEnabled public Boolean hasFile { get; set; }
        @AuraEnabled public String fileName { get; set; }
        @AuraEnabled public String downloadUrl { get; set; }
        @AuraEnabled public String reviewerNotes { get; set; }
        @AuraEnabled public String contentDocumentId { get; set; }
        @AuraEnabled public String contentVersionId { get; set; }
    }

    // ─── KPI Summary ────────────────────────────────────────────────────────

    @AuraEnabled(cacheable=false)
    public static ComplianceSummaryDTO getComplianceSummary() {
        Date today = Date.today();
        ComplianceSummaryDTO dto = new ComplianceSummaryDTO();
        dto.allRequests = 0;
        dto.pending     = 0;
        dto.overdue     = 0;
        dto.received    = 0;

        for (WCF_Compliance_Document__c rec : [
            SELECT Status__c, Due_Date__c
            FROM WCF_Compliance_Document__c
           WITH SYSTEM_MODE
        ]) {
            dto.allRequests++;
            if (rec.Status__c == 'Received') {
                dto.received++;
            } else if (rec.Due_Date__c != null && rec.Due_Date__c < today) {
                dto.overdue++;
            } else {
                dto.pending++;
            }
        }

        return dto;
    }

    // ─── Row List ───────────────────────────────────────────────────────────

    @AuraEnabled(cacheable=false)
    public static List<ComplianceRowDTO> getComplianceRows() {
        List<ComplianceRowDTO> rows = new List<ComplianceRowDTO>();

        for (WCF_Compliance_Document__c rec : [
            SELECT Id,
                   Name,
                   Organisation__c,
                   Organisation__r.Name,
                   Organisation__r.WCF_Organizational_Name__c,
                   IndividualApplication__c,
                   IndividualApplication__r.Name,
                   Document_Types__c,
                   Requested_Date__c,
                   Due_Date__c,
                   Priority__c,
                   Status__c,
                   Geography__c,
                   Notes__c
            FROM WCF_Compliance_Document__c
              WITH SYSTEM_MODE
            ORDER BY Due_Date__c ASC NULLS LAST, Name ASC
        ]) {
            ComplianceRowDTO dto = new ComplianceRowDTO();

            dto.requestId       = rec.Name;
            dto.recordId        = rec.Id;
            dto.orgName         = rec.Organisation__r != null
                                ? (String.isNotBlank(rec.Organisation__r.WCF_Organizational_Name__c)
                                    ? rec.Organisation__r.WCF_Organizational_Name__c
                                    : rec.Organisation__r.Name)
                                : '—';
            dto.orgId           = rec.Organisation__c;
            dto.applicationId   = rec.IndividualApplication__c;
            dto.applicationName = rec.IndividualApplication__r != null
                                ? rec.IndividualApplication__r.Name
                                : '';
            dto.documents       = parseDocumentTypes(rec.Document_Types__c);
            dto.requestedDate   = formatDate(rec.Requested_Date__c);
            dto.dueDate         = formatDate(rec.Due_Date__c);
            dto.priority        = String.isNotBlank(rec.Priority__c)
                                ? rec.Priority__c : '—';
            dto.status          = String.isNotBlank(rec.Status__c)
                                ? rec.Status__c : '—';
            dto.geography       = String.isNotBlank(rec.Geography__c)
                                ? rec.Geography__c : '—';
            dto.notes           = rec.Notes__c;

            rows.add(dto);
        }

        return rows;
    }

    // ─── Fetch latest approved proposal for an org ──────────────────────────

    @AuraEnabled(cacheable=false)
    public static ApplicationLinkDTO getLinkedApplication(String organisationId) {
        if (String.isBlank(organisationId)) return null;

        List<IndividualApplication> apps = [
            SELECT Id, Name, AccountId, Status
            FROM IndividualApplication
            WHERE AccountId = :organisationId
              AND Status = 'Recommend for Fund'
             WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];

        if (apps.isEmpty()) return null;

        ApplicationLinkDTO dto = new ApplicationLinkDTO();
        dto.recordId        = apps[0].Id;
        dto.applicationName = apps[0].Name;
        return dto;
    }

    // ─── Save / Upsert ──────────────────────────────────────────────────────

    @AuraEnabled
    public static String saveComplianceRequest(
        String recordId,
        String organisationId,
        String applicationId,
        String documentTypes,
        String requestedDate,
        String dueDate,
        String priority,
        String geography,
        String notes
    ) {
        WCF_Compliance_Document__c rec = String.isBlank(recordId)
            ? new WCF_Compliance_Document__c()
            : new WCF_Compliance_Document__c(Id = recordId);

        rec.Organisation__c          = organisationId;
        rec.IndividualApplication__c = String.isNotBlank(applicationId)
                                     ? applicationId : null;
        rec.Document_Types__c        = documentTypes;
        rec.Requested_Date__c        = parseDate(requestedDate);
        rec.Due_Date__c              = parseDate(dueDate);
        rec.Priority__c              = priority;
        rec.Status__c                = 'Pending Submission';
        rec.Geography__c             = geography;
        rec.Notes__c                 = notes;

        upsert rec;

        return rec.Id;
    }

    // ─── Delete ─────────────────────────────────────────────────────────────

    @AuraEnabled
    public static void deleteComplianceRequest(String recordId) {
        delete new WCF_Compliance_Document__c(Id = recordId);
    }

    // ─── Organisation Dropdown ──────────────────────────────────────────────

 @AuraEnabled(cacheable=true)
public static List<Map<String, String>> getOrganisationOptions() {
    List<Map<String, String>> opts = new List<Map<String, String>>();

    Set<Id> appsWithDocs = new Set<Id>();
    for (WCF_Compliance_Document__c doc : [
        SELECT IndividualApplication__c 
        FROM WCF_Compliance_Document__c 
        WHERE IndividualApplication__c != null
        WITH SECURITY_ENFORCED
    ]) {
        appsWithDocs.add(doc.IndividualApplication__c);
    }

    for (Account a : [
        SELECT Id, Name, WCF_Organizational_Name__c
        FROM Account
        WHERE Id IN (
            SELECT AccountId 
            FROM IndividualApplication 
            WHERE Status = 'Recommend for Fund'
              AND Id NOT IN :appsWithDocs
        )
        WITH SECURITY_ENFORCED
        ORDER BY Name ASC
    ]) {
        opts.add(new Map<String, String>{
            'value' => a.Id,
            'label' => String.isNotBlank(a.WCF_Organizational_Name__c)
                       ? a.WCF_Organizational_Name__c
                       : a.Name
        });
    }

    return opts;
}

    // ─── Document Review Details & Decisions ────────────────────────────────

    @AuraEnabled(cacheable=false)
    public static List<ReviewItemDTO> getComplianceDocumentReviewItems(Id recordId) {
        List<ReviewItemDTO> items = new List<ReviewItemDTO>();
        if (recordId == null) return items;

        WCF_Compliance_Document__c request = [
            SELECT Id, Document_Type__c, Document_Types__c, Status__c, ContentDocumentId__c, 
                   File_Name__c, Reviewer_Notes__c, IndividualApplication__c, Document_Status_JSON__c
            FROM   WCF_Compliance_Document__c
            WHERE  Id = :recordId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];

        if (String.isNotBlank(request.Document_Type__c)) {
            ReviewItemDTO dto = new ReviewItemDTO();
            dto.documentLabel = request.Document_Type__c;
            dto.status = request.Status__c;
            dto.hasFile = String.isNotBlank(request.ContentDocumentId__c);
            dto.fileName = request.File_Name__c;
            dto.contentDocumentId = request.ContentDocumentId__c;
            dto.downloadUrl = dto.hasFile ? '/sfc/servlet.shepherd/document/download/' + request.ContentDocumentId__c : null;
            dto.reviewerNotes = request.Reviewer_Notes__c;
            items.add(dto);
        } else if (String.isNotBlank(request.Document_Types__c)) {
            List<String> labels = new List<String>();
            for (String s : request.Document_Types__c.split(';')) {
                if (String.isNotBlank(s)) labels.add(s.trim());
            }

            Map<String, WCF_Compliance_Document__c> dedicatedDocs = new Map<String, WCF_Compliance_Document__c>();
            if (request.IndividualApplication__c != null) {
                for (WCF_Compliance_Document__c doc : [
                    SELECT Id, Document_Type__c, ContentDocumentId__c, File_Name__c, Status__c, Reviewer_Notes__c
                    FROM   WCF_Compliance_Document__c
                    WHERE  IndividualApplication__c = :request.IndividualApplication__c
                      AND  Document_Type__c IN :labels
                    WITH   SYSTEM_MODE
                ]) {
                    dedicatedDocs.put(doc.Document_Type__c, doc);
                }
            }

            Map<String, Object> statusMap = new Map<String, Object>();
            if (String.isNotBlank(request.Document_Status_JSON__c)) {
                try {
                    statusMap = (Map<String, Object>) JSON.deserializeUntyped(request.Document_Status_JSON__c);
                } catch (Exception e) {}
            }

            for (String label : labels) {
                ReviewItemDTO dto = new ReviewItemDTO();
                dto.documentLabel = label;

                if (dedicatedDocs.containsKey(label)) {
                    WCF_Compliance_Document__c doc = dedicatedDocs.get(label);
                    dto.status = doc.Status__c;
                    dto.hasFile = String.isNotBlank(doc.ContentDocumentId__c);
                    dto.fileName = doc.File_Name__c;
                    dto.contentDocumentId = doc.ContentDocumentId__c;
                    dto.downloadUrl = dto.hasFile ? '/sfc/servlet.shepherd/document/download/' + doc.ContentDocumentId__c : null;
                    dto.reviewerNotes = doc.Reviewer_Notes__c;
                } else {
                    Map<String, Object> entry = statusMap.containsKey(label) ? (Map<String, Object>) statusMap.get(label) : null;
                    if (entry != null) {
                        dto.status = (String) entry.get('status');
                        String contentDocId = (String) entry.get('contentDocumentId');
                        dto.hasFile = String.isNotBlank(contentDocId);
                        dto.fileName = (String) entry.get('fileName');
                        dto.contentDocumentId = contentDocId;
                        dto.downloadUrl = dto.hasFile ? '/sfc/servlet.shepherd/document/download/' + contentDocId : null;
                        dto.reviewerNotes = (String) entry.get('reviewerNotes');
                    } else {
                        dto.status = 'Pending Submission';
                        dto.hasFile = false;
                    }
                }
                items.add(dto);
            }
        }

        Set<Id> docIds = new Set<Id>();
        for (ReviewItemDTO dto : items) {
            if (dto.hasFile && String.isNotBlank(dto.contentDocumentId)) {
                try {
                    docIds.add((Id) dto.contentDocumentId);
                } catch (Exception e) {}
            }
        }
        if (!docIds.isEmpty()) {
            Map<Id, Id> docToVersionMap = new Map<Id, Id>();
            for (ContentVersion cv : [
                SELECT Id, ContentDocumentId 
                FROM   ContentVersion 
                WHERE  ContentDocumentId IN :docIds 
                  AND  IsLatest = true
                WITH   SYSTEM_MODE
            ]) {
                docToVersionMap.put(cv.ContentDocumentId, cv.Id);
            }
            for (ReviewItemDTO dto : items) {
                if (dto.hasFile && String.isNotBlank(dto.contentDocumentId)) {
                    dto.contentVersionId = docToVersionMap.get((Id) dto.contentDocumentId);
                }
            }
        }

        return items;
    }

    @AuraEnabled
    public static void saveComplianceRequestDecision(Id recordId, String decision, String reviewerNotes, List<String> returnLabels) {
        if (recordId == null || String.isBlank(decision)) {
            throw new AuraHandledException('Missing required decision parameters.');
        }

        WCF_Compliance_Document__c request = [
            SELECT Id, Document_Type__c, Document_Types__c, Status__c, Reviewer_Notes__c, 
                   IndividualApplication__c, Document_Status_JSON__c
            FROM   WCF_Compliance_Document__c
            WHERE  Id = :recordId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];

        String parentStatus = '';
        String targetItemStatus = '';

        if (decision == 'Pass') {
            parentStatus = 'Validated';
            targetItemStatus = 'Validated';
        } else if (decision == 'Return') {
            parentStatus = 'Returned';
            targetItemStatus = 'Returned';
        } else if (decision == 'Reject') {
            parentStatus = 'Rejected';
            targetItemStatus = 'Rejected';
        } else if (decision == 'Suspend') {
            parentStatus = 'Suspended';
            targetItemStatus = 'Suspended';
        }

        request.Status__c = parentStatus;
        request.Reviewer_Notes__c = reviewerNotes;

        if (String.isNotBlank(request.Document_Type__c)) {
            update request;
        } else if (String.isNotBlank(request.Document_Types__c)) {
            List<String> labels = new List<String>();
            for (String s : request.Document_Types__c.split(';')) {
                if (String.isNotBlank(s)) labels.add(s.trim());
            }

            List<WCF_Compliance_Document__c> docsToUpdate = new List<WCF_Compliance_Document__c>();
            if (request.IndividualApplication__c != null) {
                docsToUpdate = [
                    SELECT Id, Document_Type__c, Status__c, Reviewer_Notes__c
                    FROM   WCF_Compliance_Document__c
                    WHERE  IndividualApplication__c = :request.IndividualApplication__c
                      AND  Document_Type__c IN :labels
                    WITH   SYSTEM_MODE
                ];
            }
            Map<String, WCF_Compliance_Document__c> dedicatedMap = new Map<String, WCF_Compliance_Document__c>();
            for (WCF_Compliance_Document__c doc : docsToUpdate) {
                dedicatedMap.put(doc.Document_Type__c, doc);
            }

            Map<String, Object> statusMap = new Map<String, Object>();
            if (String.isNotBlank(request.Document_Status_JSON__c)) {
                try {
                    statusMap = (Map<String, Object>) JSON.deserializeUntyped(request.Document_Status_JSON__c);
                } catch (Exception e) {}
            }

            for (String label : labels) {
                Boolean shouldUpdateThisItem = false;
                if (decision == 'Return') {
                    shouldUpdateThisItem = returnLabels != null && returnLabels.contains(label);
                } else {
                    shouldUpdateThisItem = true;
                }

                if (shouldUpdateThisItem) {
                    if (dedicatedMap.containsKey(label)) {
                        WCF_Compliance_Document__c doc = dedicatedMap.get(label);
                        doc.Status__c = targetItemStatus;
                        doc.Reviewer_Notes__c = reviewerNotes;
                    } else if (statusMap.containsKey(label)) {
                        Map<String, Object> entry = (Map<String, Object>) statusMap.get(label);
                        entry.put('status', targetItemStatus);
                        entry.put('reviewerNotes', reviewerNotes);
                    }
                }
            }

            request.Document_Status_JSON__c = JSON.serialize(statusMap);
            update request;

            if (!docsToUpdate.isEmpty()) {
                update docsToUpdate;
            }
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static List<String> parseDocumentTypes(String raw) {
        if (String.isBlank(raw)) return new List<String>();
        List<String> out = new List<String>();
        for (String s : raw.split(';')) {
            if (String.isNotBlank(s)) out.add(s.trim());
        }
        return out;
    }

   private static String formatDate(Date d) {
    return d == null ? null : String.valueOf(d); // ISO yyyy-MM-dd, unambiguous
}

    private static Date parseDate(String s) {
        if (String.isBlank(s)) return null;
        try {
            return Date.valueOf(s);
        } catch (Exception e) {
            return null;
        }
    }
}