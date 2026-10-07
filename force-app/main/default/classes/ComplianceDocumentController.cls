public without sharing class ComplianceDocumentController {
private static final Set<String> CLOSED_STATUSES =
    new Set<String>{ 'Validated', 'Returned', 'Rejected', 'Suspended' };

    // ─── NEW: review record lookup config ────────────────────────────────────
    // !! Set these to the SAME object / field API names that
    // !! ReviewSummaryController.getReviewerPreview uses to produce "reviewId".
    // !! Dynamic SOQL is used so this class still compiles if a name is wrong.
    private static final String REVIEW_OBJECT           = 'ApplicationReview';
    private static final String REVIEW_APPLICATION_FIELD = 'ApplicationId';
    // Optional: set to e.g. 'Review Submitted' to return only submitted reviews. Leave blank for any.
    private static final String REVIEW_STATUS_FIELD     = 'Status__c';
    private static final String REVIEW_STATUS_FILTER    = '';

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
        @AuraEnabled public String agreementStatus  { get; set; }
        @AuraEnabled public Boolean isAgreementLocked { get; set; }
        @AuraEnabled public Boolean isAwaitingAgreement { get; set; }
        @AuraEnabled public Boolean isAgreementExecuted { get; set; }
        @AuraEnabled public String agreementContentDocumentId { get; set; }
        @AuraEnabled public String agreementFileName { get; set; }
        @AuraEnabled public String executedDate     { get; set; }
        @AuraEnabled public String effectiveDate    { get; set; }
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
            if (rec.Status__c == 'Received' || rec.Status__c == 'Validated') {
                dto.received++;
            } else if (rec.Status__c == 'Rejected' || rec.Status__c == 'Suspended') {
                // decided, so it counts in All only
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

        List<WCF_Compliance_Document__c> records = [
            SELECT Id,
                   Name,
                   Organisation__c,
                   Organisation__r.Name,
                   Organisation__r.WCF_Organizational_Name__c,
                   IndividualApplication__c,
                   IndividualApplication__r.Name,
                   IndividualApplication__r.AccountId,
                   IndividualApplication__r.Account.Name,
                   IndividualApplication__r.Account.WCF_Organizational_Name__c,
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
        ];

        Set<Id> appIds = new Set<Id>();
        for (WCF_Compliance_Document__c r : records) {
            if (r.IndividualApplication__c != null) {
                appIds.add(r.IndividualApplication__c);
            }
        }

        Map<Id, WCF_Executed_Agreement__c> activeAgreementsByAppId = new Map<Id, WCF_Executed_Agreement__c>();
        Map<Id, Integer> versionCountByAppId = new Map<Id, Integer>();
        Set<Id> agreementIds = new Set<Id>();

        if (!appIds.isEmpty()) {
            for (WCF_Executed_Agreement__c ag : [
                SELECT Id, IndividualApplication__c, Status__c, Executed_Date__c, Expiry_Date__c, CreatedDate
                FROM WCF_Executed_Agreement__c
                WHERE IndividualApplication__c IN :appIds
                WITH SYSTEM_MODE
                ORDER BY CreatedDate ASC
            ]) {
                Integer count = versionCountByAppId.containsKey(ag.IndividualApplication__c) ? versionCountByAppId.get(ag.IndividualApplication__c) + 1 : 1;
                versionCountByAppId.put(ag.IndividualApplication__c, count);
                if (ag.Status__c == 'Active' || ag.Status__c == 'Signed' || (ag.Status__c != 'Superseded' && ag.Status__c != 'Expired')) {
                    activeAgreementsByAppId.put(ag.IndividualApplication__c, ag);
                    agreementIds.add(ag.Id);
                }
            }
        }

        Map<Id, ContentDocumentLink> cdlByAgreementId = new Map<Id, ContentDocumentLink>();
        if (!agreementIds.isEmpty()) {
            for (ContentDocumentLink cdl : [
                SELECT Id, LinkedEntityId, ContentDocumentId, ContentDocument.Title, ContentDocument.FileExtension, ContentDocument.CreatedDate
                FROM ContentDocumentLink
                WHERE LinkedEntityId IN :agreementIds
                WITH SYSTEM_MODE
                ORDER BY SystemModstamp DESC
            ]) {
                if (!cdlByAgreementId.containsKey(cdl.LinkedEntityId)) {
                    cdlByAgreementId.put(cdl.LinkedEntityId, cdl);
                }
            }
        }

        for (WCF_Compliance_Document__c rec : records) {
            ComplianceRowDTO dto = new ComplianceRowDTO();

            dto.requestId       = rec.Name;
            dto.recordId        = rec.Id;

            String orgName = '—';
            String orgId = rec.Organisation__c != null ? String.valueOf(rec.Organisation__c) : '';

            if (rec.Organisation__r != null) {
                orgName = String.isNotBlank(rec.Organisation__r.WCF_Organizational_Name__c)
                    ? rec.Organisation__r.WCF_Organizational_Name__c
                    : rec.Organisation__r.Name;
            } else if (rec.IndividualApplication__r != null && rec.IndividualApplication__r.Account != null) {
                orgName = String.isNotBlank(rec.IndividualApplication__r.Account.WCF_Organizational_Name__c)
                    ? rec.IndividualApplication__r.Account.WCF_Organizational_Name__c
                    : rec.IndividualApplication__r.Account.Name;
                if (String.isBlank(orgId) && rec.IndividualApplication__r.AccountId != null) {
                    orgId = String.valueOf(rec.IndividualApplication__r.AccountId);
                }
            }

            dto.orgName         = orgName;
            dto.orgId           = orgId;
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

            // Agreement status mapping
            Boolean isValidated = (rec.Status__c == 'Validated');
            Id appId = rec.IndividualApplication__c;

            if (!isValidated) {
                dto.agreementStatus     = 'Locked';
                dto.isAgreementLocked   = true;
                dto.isAwaitingAgreement = false;
                dto.isAgreementExecuted = false;
            } else {
                if (appId != null && activeAgreementsByAppId.containsKey(appId)) {
                    WCF_Executed_Agreement__c ag = activeAgreementsByAppId.get(appId);
                    Integer vNum = versionCountByAppId.containsKey(appId) ? versionCountByAppId.get(appId) : 1;
                    dto.agreementStatus     = 'Executed - v' + vNum;
                    dto.isAgreementExecuted = true;
                    dto.isAgreementLocked   = false;
                    dto.isAwaitingAgreement = false;
                    dto.executedDate        = formatDate(ag.Executed_Date__c);
                    dto.effectiveDate       = formatDate(ag.Expiry_Date__c);
                    if (cdlByAgreementId.containsKey(ag.Id)) {
                        ContentDocumentLink link = cdlByAgreementId.get(ag.Id);
                        dto.agreementContentDocumentId = link.ContentDocumentId;
                        dto.agreementFileName = link.ContentDocument.Title + (String.isNotBlank(link.ContentDocument.FileExtension) ? '.' + link.ContentDocument.FileExtension : '');
                    }
                } else {
                    dto.agreementStatus     = 'Awaiting signed copy';
                    dto.isAwaitingAgreement = true;
                    dto.isAgreementLocked   = false;
                    dto.isAgreementExecuted = false;
                }
            }

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
            WITH SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 10
        ];

        if (apps.isEmpty()) return null;

        IndividualApplication chosenApp = apps[0];
        for (IndividualApplication app : apps) {
            if (app.Status == 'Recommend for Fund' || app.Status == 'Approved'|| app.Status == 'Onboarding Approved') {
                chosenApp = app;
                break;
            }
        }

        ApplicationLinkDTO dto = new ApplicationLinkDTO();
        dto.recordId        = chosenApp.Id;
        dto.applicationName = chosenApp.Name;
        return dto;
    }

    // ─── NEW: latest review record for an application ───────────────────────
    // Used by the Application Number hyperlink (reviewer dashboard + compliance list)
    // to open the read-only Reviewer container: review-forms?recordId=<reviewId>&applicationId=<id>&action=view

    @AuraEnabled(cacheable=false)
    public static String getLatestReviewId(Id applicationId) {
        if (applicationId == null) return null;

        String soql = 'SELECT Id FROM ' + REVIEW_OBJECT
                    + ' WHERE ' + REVIEW_APPLICATION_FIELD + ' = :applicationId';
        if (String.isNotBlank(REVIEW_STATUS_FILTER) && String.isNotBlank(REVIEW_STATUS_FIELD)) {
            soql += ' AND ' + REVIEW_STATUS_FIELD + ' = :statusFilter';
        }
        soql += ' ORDER BY CreatedDate DESC LIMIT 1';

        String statusFilter = REVIEW_STATUS_FILTER;
        try {
            List<SObject> reviews = Database.query(soql, AccessLevel.SYSTEM_MODE);
            return reviews.isEmpty() ? null : String.valueOf(reviews[0].Id);
        } catch (Exception e) {
            throw new AuraHandledException(
                'Could not look up the review record. Check the REVIEW_* constants in ComplianceDocumentController. ' + e.getMessage()
            );
        }
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

        rec.Organisation__c          = String.isNotBlank(organisationId) ? organisationId : null;
        rec.IndividualApplication__c = String.isNotBlank(applicationId) ? applicationId : null;
        
        // Auto-link organisation from application if missing
        if (rec.Organisation__c == null && rec.IndividualApplication__c != null) {
            List<IndividualApplication> linkedApps = [
                SELECT AccountId FROM IndividualApplication 
                WHERE Id = :rec.IndividualApplication__c 
                WITH SYSTEM_MODE LIMIT 1
            ];
            if (!linkedApps.isEmpty() && linkedApps[0].AccountId != null) {
                rec.Organisation__c = linkedApps[0].AccountId;
            }
        }

        rec.Document_Types__c        = documentTypes;
        rec.Requested_Date__c        = parseDate(requestedDate);
        rec.Due_Date__c              = parseDate(dueDate);
        rec.Priority__c              = priority;
        if (String.isBlank(recordId) && String.isBlank(rec.Status__c)) {
            rec.Status__c            = 'Pending Submission';
        }
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

    @AuraEnabled(cacheable=false)
    public static List<Map<String, String>> getOrganisationOptions() {
        List<Map<String, String>> opts = new List<Map<String, String>>();

        Set<Id> appsWithDocs = new Set<Id>();
        for (WCF_Compliance_Document__c doc : [
            SELECT IndividualApplication__c 
            FROM WCF_Compliance_Document__c 
            WHERE IndividualApplication__c != null
            WITH SYSTEM_MODE
        ]) {
            appsWithDocs.add(doc.IndividualApplication__c);
        }

        for (Account a : [
            SELECT Id, Name, WCF_Organizational_Name__c
            FROM Account
            WHERE Id IN (
                SELECT AccountId 
                FROM IndividualApplication 
                WHERE Status IN ('Recommend for Fund', 'Approved')
                  AND Id NOT IN :appsWithDocs
            )
            WITH SYSTEM_MODE
            ORDER BY Name ASC
        ]) {
            String label = String.isNotBlank(a.WCF_Organizational_Name__c)
                ? a.WCF_Organizational_Name__c
                : a.Name;
            opts.add(new Map<String, String>{
                'value' => a.Id,
                'label' => label
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
    if (String.isBlank(reviewerNotes)) {
        throw new AuraHandledException('A decision comment is required.');
    }

    Map<String, String> decisionToStatus = new Map<String, String>{
        'Pass'    => 'Validated',
        'Return'  => 'Returned',
        'Reject'  => 'Rejected',
        'Suspend' => 'Suspended'
    };
    if (!decisionToStatus.containsKey(decision)) {
        throw new AuraHandledException('Invalid decision: ' + decision);
    }
    String targetStatus = decisionToStatus.get(decision);
    String notOpenMsg = 'No document is open for review. A decision has already been recorded, or no file has been uploaded.';

    // FOR UPDATE locks the request, so a double-click or a second reviewer is queued and then rejected below
    WCF_Compliance_Document__c request = [
        SELECT Id, Document_Type__c, Document_Types__c, Status__c, ContentDocumentId__c,
               Reviewer_Notes__c, IndividualApplication__c, Document_Status_JSON__c
        FROM   WCF_Compliance_Document__c
        WHERE  Id = :recordId
        WITH   SYSTEM_MODE
        LIMIT  1
        FOR UPDATE
    ];

    // Case A: the request itself is the single document
    if (String.isNotBlank(request.Document_Type__c)) {
        if (String.isBlank(request.ContentDocumentId__c) || CLOSED_STATUSES.contains(request.Status__c)) {
            throw new AuraHandledException(notOpenMsg);
        }
        request.Status__c         = targetStatus;
        request.Reviewer_Notes__c = reviewerNotes;
        update request;
        return;
    }

    // Case B: request holds several document types
    if (String.isBlank(request.Document_Types__c)) {
        throw new AuraHandledException(notOpenMsg);
    }

    List<String> labels = new List<String>();
    for (String s : request.Document_Types__c.split(';')) {
        if (String.isNotBlank(s)) labels.add(s.trim());
    }

    Map<String, WCF_Compliance_Document__c> dedicatedMap = new Map<String, WCF_Compliance_Document__c>();
    if (request.IndividualApplication__c != null) {
        for (WCF_Compliance_Document__c doc : [
            SELECT Id, Document_Type__c, ContentDocumentId__c, Status__c, Reviewer_Notes__c
            FROM   WCF_Compliance_Document__c
            WHERE  IndividualApplication__c = :request.IndividualApplication__c
              AND  Document_Type__c IN :labels
            WITH   SYSTEM_MODE
        ]) {
            dedicatedMap.put(doc.Document_Type__c, doc);
        }
    }

    Map<String, Object> statusMap = new Map<String, Object>();
    if (String.isNotBlank(request.Document_Status_JSON__c)) {
        try {
            statusMap = (Map<String, Object>) JSON.deserializeUntyped(request.Document_Status_JSON__c);
        } catch (Exception e) {}
    }

    // Work out which documents are still open (file uploaded, no final decision)
    Map<String, String> currentStatus = new Map<String, String>();
    Set<String> openLabels = new Set<String>();
    for (String label : labels) {
        String st = 'Pending Submission';
        Boolean hasFile = false;
        if (dedicatedMap.containsKey(label)) {
            WCF_Compliance_Document__c d = dedicatedMap.get(label);
            st      = d.Status__c;
            hasFile = String.isNotBlank(d.ContentDocumentId__c);
        } else if (statusMap.containsKey(label)) {
            Map<String, Object> e = (Map<String, Object>) statusMap.get(label);
            st      = (String) e.get('status');
            hasFile = String.isNotBlank((String) e.get('contentDocumentId'));
        }
        currentStatus.put(label, st);
        if (hasFile && !CLOSED_STATUSES.contains(st)) openLabels.add(label);
    }

    if (openLabels.isEmpty()) {
        throw new AuraHandledException(notOpenMsg);
    }

    // Decide which documents this decision applies to
    Set<String> targets = new Set<String>();
    if (decision == 'Return') {
        if (returnLabels == null || returnLabels.isEmpty()) {
            throw new AuraHandledException('Select at least one document to return.');
        }
        for (String l : returnLabels) {
            if (openLabels.contains(l)) targets.add(l);
        }
        if (targets.isEmpty()) {
            throw new AuraHandledException('None of the selected documents are open for review.');
        }
    } else {
        targets = openLabels;
    }

    // Apply
    List<WCF_Compliance_Document__c> docsToUpdate = new List<WCF_Compliance_Document__c>();
    for (String label : targets) {
        currentStatus.put(label, targetStatus);
        if (dedicatedMap.containsKey(label)) {
            WCF_Compliance_Document__c d = dedicatedMap.get(label);
            d.Status__c         = targetStatus;
            d.Reviewer_Notes__c = reviewerNotes;
            docsToUpdate.add(d);
        } else {
            Map<String, Object> e = (Map<String, Object>) statusMap.get(label);
            e.put('status', targetStatus);
            e.put('reviewerNotes', reviewerNotes);
        }
    }

    // Parent status: Pass only marks the request Validated once every document is Validated
    if (decision == 'Pass') {
        Boolean allValidated = true;
        for (String s : currentStatus.values()) {
            if (s != 'Validated') allValidated = false;
        }
        if (allValidated) request.Status__c = 'Validated';
    } else {
        request.Status__c = targetStatus;
    }
    request.Reviewer_Notes__c       = reviewerNotes;
    request.Document_Status_JSON__c = JSON.serialize(statusMap);
    update request;

    if (!docsToUpdate.isEmpty()) update docsToUpdate;
}

    // ─── Grant Agreement DTO & Methods ───────────────────────────────────────

    public class GrantAgreementDTO {
        @AuraEnabled public Boolean isUploaded       { get; set; }
        @AuraEnabled public String  fileName         { get; set; }
        @AuraEnabled public String  contentDocumentId{ get; set; }
        @AuraEnabled public String  uploadedDate     { get; set; }
        @AuraEnabled public String  orgId            { get; set; }
        @AuraEnabled public String  orgName          { get; set; }
        @AuraEnabled public String  applicationId    { get; set; }
        @AuraEnabled public String  applicationName  { get; set; }
        @AuraEnabled public String  executionDate    { get; set; }
        @AuraEnabled public String  effectiveDate    { get; set; }
    }

    @AuraEnabled(cacheable=false)
    public static GrantAgreementDTO getGrantAgreementDetails(Id complianceRequestId) {
        GrantAgreementDTO dto = new GrantAgreementDTO();
        dto.isUploaded = false;
        if (complianceRequestId == null) return dto;

        WCF_Compliance_Document__c req = [
            SELECT Id, Organisation__c, Organisation__r.Name, Organisation__r.WCF_Organizational_Name__c,
                   IndividualApplication__c, IndividualApplication__r.Name,
                   IndividualApplication__r.AccountId, IndividualApplication__r.Account.Name,
                   IndividualApplication__r.Account.WCF_Organizational_Name__c
            FROM WCF_Compliance_Document__c
            WHERE Id = :complianceRequestId
            WITH SYSTEM_MODE
            LIMIT 1
        ];

        Id orgId = req.Organisation__c != null ? req.Organisation__c : req.IndividualApplication__r.AccountId;
        String orgName = '';
        if (req.Organisation__r != null) {
            orgName = String.isNotBlank(req.Organisation__r.WCF_Organizational_Name__c) ? req.Organisation__r.WCF_Organizational_Name__c : req.Organisation__r.Name;
        } else if (req.IndividualApplication__r != null && req.IndividualApplication__r.Account != null) {
            orgName = String.isNotBlank(req.IndividualApplication__r.Account.WCF_Organizational_Name__c) ? req.IndividualApplication__r.Account.WCF_Organizational_Name__c : req.IndividualApplication__r.Account.Name;
        }

        Id appId = req.IndividualApplication__c;
        String appName = req.IndividualApplication__r != null ? req.IndividualApplication__r.Name : '';

        dto.orgId           = orgId != null ? String.valueOf(orgId) : '';
        dto.orgName         = orgName;
        dto.applicationId   = appId != null ? String.valueOf(appId) : '';
        dto.applicationName = appName;

        if (appId != null) {
            List<WCF_Executed_Agreement__c> agreements = [
                SELECT Id, Status__c, Executed_Date__c, Expiry_Date__c
                FROM WCF_Executed_Agreement__c
                WHERE IndividualApplication__c = :appId
                  AND Status__c != 'Superseded'
                WITH SYSTEM_MODE
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];

            if (!agreements.isEmpty()) {
                dto.executionDate = formatDate(agreements[0].Executed_Date__c);
                dto.effectiveDate = formatDate(agreements[0].Expiry_Date__c);
                List<ContentDocumentLink> links = [
                    SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileExtension, ContentDocument.CreatedDate
                    FROM ContentDocumentLink
                    WHERE LinkedEntityId = :agreements[0].Id
                    WITH SYSTEM_MODE
                    ORDER BY SystemModstamp DESC
                    LIMIT 1
                ];
                if (!links.isEmpty()) {
                    dto.isUploaded = true;
                    dto.contentDocumentId = links[0].ContentDocumentId;
                    dto.fileName = links[0].ContentDocument.Title + (String.isNotBlank(links[0].ContentDocument.FileExtension) ? '.' + links[0].ContentDocument.FileExtension : '');
                    dto.uploadedDate = formatDate(Date.valueOf(links[0].ContentDocument.CreatedDate));
                }
            }
        }
        return dto;
    }

    @AuraEnabled
    public static void saveGrantAgreementFile(
        Id complianceRequestId,
        Id contentDocumentId,
        String executionDate,
        String effectiveDate,
        String remarks,
        Boolean isReplace
    ) {
        if (complianceRequestId == null || contentDocumentId == null) {
            throw new AuraHandledException('Missing request or document ID.');
        }

        WCF_Compliance_Document__c req = [
            SELECT Id, Organisation__c, IndividualApplication__c, IndividualApplication__r.AccountId, Notes__c
            FROM WCF_Compliance_Document__c
            WHERE Id = :complianceRequestId
            WITH SYSTEM_MODE
            LIMIT 1
        ];

        Id orgId = req.Organisation__c != null ? req.Organisation__c : req.IndividualApplication__r.AccountId;
        Id appId = req.IndividualApplication__c;

        if (String.isNotBlank(remarks)) {
            req.Notes__c = (String.isNotBlank(req.Notes__c) ? req.Notes__c + '\n' : '') + '[Grant Agreement]: ' + remarks;
            update req;
        }

        // 1. Link to Account (Organisation)
        if (orgId != null) {
            List<ContentDocumentLink> existingOrgLinks = [
                SELECT Id FROM ContentDocumentLink
                WHERE ContentDocumentId = :contentDocumentId AND LinkedEntityId = :orgId
                WITH SYSTEM_MODE
                LIMIT 1
            ];
            if (existingOrgLinks.isEmpty()) {
                insert new ContentDocumentLink(
                    ContentDocumentId = contentDocumentId,
                    LinkedEntityId    = orgId,
                    ShareType         = 'V',
                    Visibility        = 'AllUsers'
                );
            }
        }

        // 2. Link to IndividualApplication & Upsert Executed Agreement
        if (appId != null) {
            List<ContentDocumentLink> existingAppLinks = [
                SELECT Id FROM ContentDocumentLink
                WHERE ContentDocumentId = :contentDocumentId AND LinkedEntityId = :appId
                WITH SYSTEM_MODE
                LIMIT 1
            ];
            if (existingAppLinks.isEmpty()) {
                insert new ContentDocumentLink(
                    ContentDocumentId = contentDocumentId,
                    LinkedEntityId    = appId,
                    ShareType         = 'V',
                    Visibility        = 'AllUsers'
                );
            }

            if (isReplace == true) {
                List<WCF_Executed_Agreement__c> oldAgreements = [
                    SELECT Id, Status__c
                    FROM WCF_Executed_Agreement__c
                    WHERE IndividualApplication__c = :appId
                      AND Status__c != 'Superseded'
                    WITH SYSTEM_MODE
                ];
                for (WCF_Executed_Agreement__c oldAg : oldAgreements) {
                    oldAg.Status__c = 'Superseded';
                }
                if (!oldAgreements.isEmpty()) {
                    update oldAgreements;
                }
            }

            WCF_Executed_Agreement__c agreement = new WCF_Executed_Agreement__c(
                IndividualApplication__c = appId,
                Agreement_Type__c        = 'Master MoU',
                Status__c                = 'Active',
                Has_Signed_PDF__c        = true,
                Executed_Date__c         = parseDate(executionDate),
                Expiry_Date__c           = parseDate(effectiveDate)
            );
            insert agreement;

            // 3. Link file directly to the Executed Agreement record
            List<ContentDocumentLink> existingAgreementLinks = [
                SELECT Id FROM ContentDocumentLink
                WHERE ContentDocumentId = :contentDocumentId AND LinkedEntityId = :agreement.Id
                WITH SYSTEM_MODE
                LIMIT 1
            ];
            if (existingAgreementLinks.isEmpty()) {
                insert new ContentDocumentLink(
                    ContentDocumentId = contentDocumentId,
                    LinkedEntityId    = agreement.Id,
                    ShareType         = 'V',
                    Visibility        = 'AllUsers'
                );
            }

            // 4. Update Application status to Onboarded
            update new IndividualApplication(
                Id     = appId,
                Status = 'Onboarded'
            );
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