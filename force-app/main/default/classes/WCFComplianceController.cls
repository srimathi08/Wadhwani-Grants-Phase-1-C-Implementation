public without sharing class WCFComplianceController {

    // ─────────────────────────────────────────────────────────────────
    // Wrapper classes
    // ─────────────────────────────────────────────────────────────────

    public class ComplianceChecklistItem {
        @AuraEnabled public Id     recordId;
        @AuraEnabled public String documentType;
        @AuraEnabled public String documentLabel;
        @AuraEnabled public String description;
        @AuraEnabled public Boolean required;
        @AuraEnabled public String status;
        @AuraEnabled public String contentDocumentId;
        @AuraEnabled public String fileName;
        @AuraEnabled public String issueDate;
        @AuraEnabled public String expiryDate;
        @AuraEnabled public String returnReason;
        @AuraEnabled public String submittedDate;
@AuraEnabled public Id adHocParentId;  // NEW
    }

    public class ComplianceChecklistResult {
        @AuraEnabled public Id     applicationId;
        @AuraEnabled public String geography;
        @AuraEnabled public List<ComplianceChecklistItem> items;
        @AuraEnabled public Integer totalRequired;
        @AuraEnabled public Integer totalValidated;
        @AuraEnabled public String  overallStatus;
        @AuraEnabled public String  complianceStatus;
        @AuraEnabled public String  reviewerNotes;
    }

    private class DocTypeTemplate {
        String  apiName;
        String  label;
        String  description;
        Boolean required;
        DocTypeTemplate(String apiName, String label, String description, Boolean required) {
            this.apiName     = apiName;
            this.label       = label;
            this.description = description;
            this.required    = required;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Geography → checklist template
    // BRD B.4: "Compliance Checklist is geography-driven. The required
    // documents for India differ from Brazil, Mexico, Indonesia, and
    // Philippines. Each geography has its own checklist template."
    // ─────────────────────────────────────────────────────────────────
    private static List<DocTypeTemplate> getTemplateForGeography(String geography) {
        return new List<DocTypeTemplate>();
    }

    private static String resolveGeography(String headquarters) {
        if (String.isBlank(headquarters)) return 'Other';
        String h = headquarters.toLowerCase();
        if (h.contains('india'))                                   return 'India';
        if (h.contains('brazil') || h.contains('brasil'))         return 'Brazil';
        if (h.contains('mexico') || h.contains('méxico'))         return 'Mexico';
        if (h.contains('indonesia'))                               return 'Indonesia';
        if (h.contains('philippines') || h.contains('filipinas')) return 'Philippines';
        return 'Other';
    }

    // ─────────────────────────────────────────────────────────────────
    // NEW METHOD — getOrCreateComplianceRecord
    //
    // Called by handlePrepareUpload in the LWC when a "Not Started" row
    // has no existing WCF_Compliance_Document__c record yet.
    //
    // Returns the Id of the (existing or newly created) shell record so
    // lightning-file-upload has a valid, community-user-accessible record-id.
    //
    // The record is created with Status__c = 'Not Started'. Once the
    // donee uploads a file, handleUploadFinished calls saveComplianceDocument
    // which upserts the same record with the file details and flips status
    // to 'Pending Review'.
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static Id getOrCreateComplianceRecord(Id applicationId, String documentType) {
        if (applicationId == null || String.isBlank(documentType)) {
            throw new AuraHandledException('Missing application or document type.');
        }

        validateOwnership(applicationId);

        // Check if a record already exists
       List<WCF_Compliance_Document__c> existing = [
    SELECT Id,
           Document_Type__c,
           ContentDocumentId__c,
           File_Name__c,
           Status__c,
           Issue_Date__c,
           Expiry_Date__c,
           Uploaded_Date__c,
           Reviewer_Notes__c
    FROM   WCF_Compliance_Document__c
    WHERE  IndividualApplication__c = :applicationId
    AND    Document_Type__c         = :documentType
    WITH   SYSTEM_MODE
    LIMIT  1
];

        if (!existing.isEmpty()) {
            return existing[0].Id;
        }

        // Create the shell record — status Not Started, no file yet
        WCF_Compliance_Document__c shell = new WCF_Compliance_Document__c(
            IndividualApplication__c = applicationId,
            Document_Type__c         = documentType,
            Status__c                = 'Not Started'
        );
        insert shell;
        return shell.Id;
    }

    // ─────────────────────────────────────────────────────────────────
    // READ — full checklist
    // BRD B.4: geography-driven document set, status per row
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static ComplianceChecklistResult getComplianceChecklist(Id applicationId) {
        if (applicationId == null) {
            throw new AuraHandledException('Missing application record.');
        }

        IndividualApplication app = validateOwnership(applicationId);

        ComplianceChecklistResult result = new ComplianceChecklistResult();
        result.applicationId = applicationId;
        result.geography     = resolveGeography(app.Headquarters_City_and_Country__c);
        result.items         = new List<ComplianceChecklistItem>();

        List<DocTypeTemplate> template = getTemplateForGeography(result.geography);
Map<String, WCF_Compliance_Document__c> existingByType =
    new Map<String, WCF_Compliance_Document__c>();
List<WCF_Compliance_Document__c> adHocRequests = new List<WCF_Compliance_Document__c>();

for (WCF_Compliance_Document__c doc : [
    SELECT Id,OwnerId, Document_Type__c, Document_Types__c, Status__c,
           ContentDocumentId__c, File_Name__c, Issue_Date__c, Expiry_Date__c,
           Reviewer_Notes__c, Uploaded_Date__c, Due_Date__c,Document_Status_JSON__c
    FROM   WCF_Compliance_Document__c
    WHERE  IndividualApplication__c = :applicationId
    WITH   SYSTEM_MODE
]) {
    if (String.isNotBlank(doc.Document_Type__c)) {
        existingByType.put(doc.Document_Type__c, doc);
    } else if (String.isNotBlank(doc.Document_Types__c)) {
        adHocRequests.add(doc); // reviewer-raised ad hoc request, not in any geo template
    }

}

        Integer totalRequired      = 0;
        Integer totalValidated     = 0;
        Boolean anyRefreshRequired = false;

        // ── Pre-process ad-hoc requests into a map to prevent duplicates ───────
        Map<String, ComplianceChecklistItem> adHocItemsByLabel = new Map<String, ComplianceChecklistItem>();
        for (WCF_Compliance_Document__c doc : adHocRequests) {
            for (String label : doc.Document_Types__c.split(';')) {
                label = label.trim();
                if (String.isBlank(label)) continue;

                WCF_Compliance_Document__c fulfilled = existingByType.get(label);
                ComplianceChecklistItem item = new ComplianceChecklistItem();
                item.documentType  = label;
                item.documentLabel = label;
                item.description   = 'Requested by the compliance team'
                    + (doc.Due_Date__c != null ? ' — due ' + doc.Due_Date__c.format() : '') + '.';
                item.required = true;

                if (fulfilled != null) {
                    item.recordId          = fulfilled.Id;
                    item.status            = fulfilled.Status__c;
                    item.contentDocumentId = fulfilled.ContentDocumentId__c;
                    item.fileName          = fulfilled.File_Name__c;
                    item.returnReason      = fulfilled.Reviewer_Notes__c;
                    item.issueDate         = fulfilled.Issue_Date__c  != null ? String.valueOf(fulfilled.Issue_Date__c)  : null;
                    item.expiryDate        = fulfilled.Expiry_Date__c != null ? String.valueOf(fulfilled.Expiry_Date__c) : null;
                    item.submittedDate     = fulfilled.Uploaded_Date__c != null ? String.valueOf(fulfilled.Uploaded_Date__c.date()) : null;
                } else {
                    Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
                    DocStatusEntry entry = statusMap.get(label);

                    item.recordId          = doc.Id;
                    item.adHocParentId     = doc.Id;
                    item.status            = (entry != null && String.isNotBlank(entry.status))
                                             ? entry.status : 'Pending Submission';
                    item.contentDocumentId = entry != null ? entry.contentDocumentId : null;
                    item.fileName          = entry != null ? entry.fileName          : null;
                    item.returnReason      = (entry != null && String.isNotBlank(entry.reviewerNotes))
                                             ? entry.reviewerNotes : doc.Reviewer_Notes__c;
                    item.issueDate         = entry != null ? entry.issueDate         : null;
                    item.expiryDate        = entry != null ? entry.expiryDate        : null;
                    item.submittedDate     = entry != null ? entry.uploadedDate      : null;
                }
                adHocItemsByLabel.put(label, item);
            }
        }

        // ── Add all ad-hoc requested items ──────────────────────────────
        for (ComplianceChecklistItem item : adHocItemsByLabel.values()) {
            result.items.add(item);
        }

        // ── Add remaining existing dedicated documents not in ad-hoc ─────
        for (String label : existingByType.keySet()) {
            if (!adHocItemsByLabel.containsKey(label)) {
                WCF_Compliance_Document__c doc = existingByType.get(label);
                ComplianceChecklistItem item = new ComplianceChecklistItem();
                item.documentType  = label;
                item.documentLabel = label;
                item.description   = 'Compliance Document.';
                item.required      = true;
                item.recordId          = doc.Id;
                item.status            = doc.Status__c;
                item.contentDocumentId = doc.ContentDocumentId__c;
                item.fileName          = doc.File_Name__c;
                item.returnReason      = doc.Reviewer_Notes__c;
                item.issueDate         = doc.Issue_Date__c != null ? String.valueOf(doc.Issue_Date__c) : null;
                item.expiryDate        = doc.Expiry_Date__c != null ? String.valueOf(doc.Expiry_Date__c) : null;
                item.submittedDate     = doc.Uploaded_Date__c != null ? String.valueOf(doc.Uploaded_Date__c.date()) : null;
                
                result.items.add(item);
            }
        }

        // ── Calculate progress and metrics ────────────────────────────────────
        for (ComplianceChecklistItem item : result.items) {
            if (item.required) {
                totalRequired++;
                if (item.status == 'Validated') {
                    totalValidated++;
                }
            }
            if (item.status == 'Refresh Required') {
                anyRefreshRequired = true;
            }
        }

        result.totalRequired  = totalRequired;
        result.totalValidated = totalValidated;
        result.overallStatus  = anyRefreshRequired
            ? 'Refresh Required'
            : (totalRequired > 0 && totalValidated >= totalRequired
                ? 'Complete' : 'In Progress');

        // Calculate decision status and notes
        String compStatus = 'Pending';
        String reviewerNotes = '';

        List<WCF_Compliance_Document__c> allDocs = [
            SELECT Id, Status__c, Reviewer_Notes__c, Document_Type__c, Document_Types__c
            FROM WCF_Compliance_Document__c
            WHERE IndividualApplication__c = :applicationId
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

        if (hasRejected) {
            compStatus = 'Rejected';
            reviewerNotes = rejectedNotes;
        } else if (hasSuspended) {
            compStatus = 'Suspended';
            reviewerNotes = suspendedNotes;
        } else if (hasReturned) {
            compStatus = 'Returned';
            reviewerNotes = returnedNotes;
        } else if (totalRequired > 0 && totalValidated >= totalRequired) {
            compStatus = 'Validated';
        } else {
            compStatus = 'In Progress';
        }

        result.complianceStatus = compStatus;
        result.reviewerNotes = reviewerNotes;

        return result;
    }



    // ─────────────────────────────────────────────────────────────────
    // WRITE — donee uploads or re-uploads a document
    // ─────────────────────────────────────────────────────────────────
@AuraEnabled
public static ComplianceChecklistItem saveComplianceDocument(
    Id     applicationId,
    String documentType,
    String contentDocumentId,
    String fileName,
    String issueDate,
    String expiryDate,
    Id     existingRecordId   // NEW — optional
) {
    if (applicationId == null || String.isBlank(documentType)
            || String.isBlank(contentDocumentId)) {
        throw new AuraHandledException('Missing required upload details.');
    }

    validateOwnership(applicationId);

    WCF_Compliance_Document__c doc;

    // Prefer the exact record the LWC already knows about — avoids any
    // text-matching mismatch between ad hoc multi-select labels and the
    // singular Document_Type__c value. Only trust it if it's already
    // dedicated to this exact type (not the shared ad hoc parent record,
    // which has Document_Type__c blank and may bundle several types).
if (existingRecordId != null) {
    List<WCF_Compliance_Document__c> byId = [
        SELECT Id, Document_Type__c, ContentDocumentId__c, File_Name__c, Status__c,
               Issue_Date__c, Expiry_Date__c, Uploaded_Date__c, Reviewer_Notes__c
        FROM   WCF_Compliance_Document__c
        WHERE  Id = :existingRecordId
        WITH   SYSTEM_MODE LIMIT 1
    ];
    if (!byId.isEmpty()) {
        // FIX: Accept the record if it matches the type OR if it's the
        // ad hoc parent (Document_Type__c is blank — we'll set it now)
        if (byId[0].Document_Type__c == documentType 
                || String.isBlank(byId[0].Document_Type__c)) {
            doc = byId[0];
            // If this was the blank ad hoc parent, stamp the type on it
            if (String.isBlank(doc.Document_Type__c)) {
                doc.Document_Type__c = documentType;
            }
        }
    }
}
    if (doc == null) {
        List<WCF_Compliance_Document__c> existing = [
            SELECT Id, Document_Type__c, ContentDocumentId__c, File_Name__c, Status__c,
                   Issue_Date__c, Expiry_Date__c, Uploaded_Date__c, Reviewer_Notes__c
            FROM   WCF_Compliance_Document__c
            WHERE  IndividualApplication__c = :applicationId
            AND    Document_Type__c         = :documentType
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        doc = existing.isEmpty()
            ? new WCF_Compliance_Document__c(
                  IndividualApplication__c = applicationId,
                  Document_Type__c         = documentType)
            : existing[0];
    }

String previousContentDocumentId = doc.ContentDocumentId__c;

        doc.ContentDocumentId__c = contentDocumentId;
        doc.File_Name__c         = fileName;
        doc.Status__c            = 'Pending Review';
        doc.Uploaded_Date__c     = DateTime.now();
        doc.Reviewer_Notes__c    = null; // clear on re-upload

        // If this is a genuine replace (a different file than what was
        // already stored), delete the old file so it doesn't linger as
        // an orphaned duplicate in Notes & Attachments.
        if (String.isNotBlank(previousContentDocumentId)
                && previousContentDocumentId != contentDocumentId) {
            try {
                delete [SELECT Id FROM ContentDocument WHERE Id = :previousContentDocumentId];
            } catch (Exception e) {
                // Deletion failing shouldn't block the new upload from saving —
                // surface it only if you want stricter cleanup guarantees.
            }
        }  

    if (String.isNotBlank(issueDate))  { try { doc.Issue_Date__c  = Date.valueOf(issueDate);  } catch (Exception e) {} }
    if (String.isNotBlank(expiryDate)) { try { doc.Expiry_Date__c = Date.valueOf(expiryDate); } catch (Exception e) {} }

    upsert doc;
    linkFileIfNeeded(doc.Id, contentDocumentId);

    ComplianceChecklistItem item = new ComplianceChecklistItem();
    item.recordId          = doc.Id;
    item.documentType      = doc.Document_Type__c;
    item.status            = doc.Status__c;
    item.contentDocumentId = doc.ContentDocumentId__c;
    item.fileName          = doc.File_Name__c;
    item.issueDate         = doc.Issue_Date__c   != null ? String.valueOf(doc.Issue_Date__c)        : null;
    item.expiryDate        = doc.Expiry_Date__c  != null ? String.valueOf(doc.Expiry_Date__c)       : null;
    item.submittedDate     = doc.Uploaded_Date__c != null ? String.valueOf(doc.Uploaded_Date__c.date()) : null;
    return item;
}

    // ─────────────────────────────────────────────────────────────────
    // Helper — grant the applicant Edit access to a reviewer-owned
    // ad hoc compliance request, so lightning-file-upload (which runs
    // under the logged-in user's actual sharing access, not SYSTEM_MODE)
    // can attach the file.
    // ─────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────
    // Helper — link uploaded file to the compliance record
    // ─────────────────────────────────────────────────────────────────
    private static void linkFileIfNeeded(Id complianceDocId, Id contentDocumentId) {
        List<ContentDocumentLink> existingLinks = [
            SELECT Id FROM ContentDocumentLink
            WHERE  LinkedEntityId    = :complianceDocId
            AND    ContentDocumentId = :contentDocumentId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (existingLinks.isEmpty()) {
            insert new ContentDocumentLink(
                ContentDocumentId = contentDocumentId,
                LinkedEntityId    = complianceDocId,
                ShareType         = 'V',
                Visibility        = 'AllUsers'
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Security — community user's Account must match the application
    // ─────────────────────────────────────────────────────────────────
    private static IndividualApplication validateOwnership(Id applicationId) {
        User currentUser = [
            SELECT Id, AccountId FROM User WHERE Id = :UserInfo.getUserId()
        ];
        List<IndividualApplication> apps = [
            SELECT Id, AccountId, Headquarters_City_and_Country__c
            FROM   IndividualApplication
            WHERE  Id = :applicationId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (apps.isEmpty()) {
            throw new AuraHandledException('Application not found.');
        }
        IndividualApplication app = apps[0];
        if (currentUser.AccountId == null || app.AccountId != currentUser.AccountId) {
            throw new AuraHandledException('You do not have access to this application.');
        }
        return app;
    }
// ─────────────────────────────────────────────────────────────────
    // WRITE — applicant removes a previously uploaded file without
    // immediately re-uploading. Resets the row back to "requested".
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void deleteComplianceDocumentFile(Id recordId) {
        if (recordId == null) {
            throw new AuraHandledException('Missing document record.');
        }

        List<WCF_Compliance_Document__c> docs = [
            SELECT Id, ContentDocumentId__c, IndividualApplication__c
            FROM   WCF_Compliance_Document__c
            WHERE  Id = :recordId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (docs.isEmpty()) {
            throw new AuraHandledException('Document not found.');
        }

        WCF_Compliance_Document__c doc = docs[0];
        validateOwnership(doc.IndividualApplication__c);

        if (String.isNotBlank(doc.ContentDocumentId__c)) {
            try {
                delete [SELECT Id FROM ContentDocument WHERE Id = :doc.ContentDocumentId__c];
            } catch (Exception e) {
                throw new AuraHandledException('Could not delete the file: ' + e.getMessage());
            }
        }

        doc.ContentDocumentId__c = null;
        doc.File_Name__c         = null;
        doc.Issue_Date__c        = null;
        doc.Expiry_Date__c       = null;
        doc.Uploaded_Date__c     = null;
        doc.Status__c            = 'Pending Submission'; // back to "Document Requested"
        update doc;
    }
// ─────────────────────────────────────────────────────────────────
    // WRITE — upload/replace a file for one document type WITHOUT
    // creating a separate record. Everything is stored on the single
    // ad hoc parent record (adHocRecordId), keyed by label inside the
    // Document_Status_JSON__c map. The file itself is linked directly
    // to that same parent record's Notes & Attachments.
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static ComplianceChecklistItem saveAdHocComplianceDocument(
        Id     adHocRecordId,
        String documentLabel,
        String contentDocumentId,
        String fileName,
        String issueDate,
        String expiryDate
    ) {
        if (adHocRecordId == null || String.isBlank(documentLabel) || String.isBlank(contentDocumentId)) {
            throw new AuraHandledException('Missing required upload details.');
        }

        List<WCF_Compliance_Document__c> docs = [
            SELECT Id, IndividualApplication__c, Document_Status_JSON__c,Document_Types__c
            FROM   WCF_Compliance_Document__c
            WHERE  Id = :adHocRecordId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (docs.isEmpty()) {
            throw new AuraHandledException('Compliance request not found.');
        }
System.debug('Current user: ' + UserInfo.getUserId());
System.debug('adHocRecordId: ' + adHocRecordId);
        WCF_Compliance_Document__c doc = docs[0];
        validateOwnership(doc.IndividualApplication__c);

        Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
        DocStatusEntry entry = statusMap.get(documentLabel);
        String previousContentDocumentId = entry != null ? entry.contentDocumentId : null;

        if (entry == null) entry = new DocStatusEntry();
        entry.status        = 'Pending Review';
        entry.contentDocumentId = contentDocumentId;
        entry.fileName       = fileName;
        entry.uploadedDate   = String.valueOf(Date.today());
        entry.reviewerNotes  = null; // clear on re-upload
        if (String.isNotBlank(issueDate))  entry.issueDate  = issueDate;
        if (String.isNotBlank(expiryDate)) entry.expiryDate = expiryDate;

        statusMap.put(documentLabel, entry);
        doc.Document_Status_JSON__c = JSON.serialize(statusMap);
        doc.Status__c = computeAdHocStatus(doc, statusMap);
        update doc;

        // Attach the file to the SAME parent record's Notes & Attachments
        linkFileIfNeeded(doc.Id, contentDocumentId);

        // Clean up the old file on replace
        if (String.isNotBlank(previousContentDocumentId)
                && previousContentDocumentId != contentDocumentId) {
            try {
                delete [SELECT Id FROM ContentDocument WHERE Id = :previousContentDocumentId];
            } catch (Exception e) { /* don't block the new upload */ }
        }

        ComplianceChecklistItem item = new ComplianceChecklistItem();
        item.recordId          = doc.Id;
        item.documentType      = documentLabel;
        item.status             = entry.status;
        item.contentDocumentId  = entry.contentDocumentId;
        item.fileName           = entry.fileName;
        item.issueDate          = entry.issueDate;
        item.expiryDate         = entry.expiryDate;
        item.submittedDate      = entry.uploadedDate;
        return item;
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — applicant removes a file for one document type, without
    // touching the other types' entries on the same parent record.
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void deleteAdHocComplianceDocumentFile(Id adHocRecordId, String documentLabel) {
        if (adHocRecordId == null || String.isBlank(documentLabel)) {
            throw new AuraHandledException('Missing document reference.');
        }
        List<WCF_Compliance_Document__c> docs = [
            SELECT Id, IndividualApplication__c, Document_Status_JSON__c,Document_Types__c
            FROM   WCF_Compliance_Document__c
            WHERE  Id = :adHocRecordId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (docs.isEmpty()) throw new AuraHandledException('Compliance request not found.');
        WCF_Compliance_Document__c doc = docs[0];
        validateOwnership(doc.IndividualApplication__c);

        Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
        DocStatusEntry entry = statusMap.get(documentLabel);
        if (entry != null && String.isNotBlank(entry.contentDocumentId)) {
            try {
                delete [SELECT Id FROM ContentDocument WHERE Id = :entry.contentDocumentId];
            } catch (Exception e) {
                throw new AuraHandledException('Could not delete the file: ' + e.getMessage());
            }
        }
        statusMap.remove(documentLabel);
        doc.Document_Status_JSON__c = JSON.serialize(statusMap);
        doc.Status__c = computeAdHocStatus(doc, statusMap);
        update doc;
    }


private static Map<String, DocStatusEntry> parseStatusMap(String jsonStr) {
    Map<String, DocStatusEntry> result = new Map<String, DocStatusEntry>();
    if (String.isBlank(jsonStr)) return result;
    try {
        result = (Map<String, DocStatusEntry>) JSON.deserialize(jsonStr, Map<String, DocStatusEntry>.class);
    } catch (Exception e) {
        // corrupted/legacy JSON — start fresh rather than failing the whole page
    }
    return result;
}
    
    // ─────────────────────────────────────────────────────────────────
// Helper — recompute the record-level Status__c for an ad hoc
// compliance request based on how many of its required
// Document_Types__c labels have an uploaded file in
// Document_Status_JSON__c. This is what the Reviewer Dashboard's
// getComplianceRows() reads, so this must be kept in sync on every
// ad hoc upload/delete.
// ─────────────────────────────────────────────────────────────────
private static String computeAdHocStatus(WCF_Compliance_Document__c doc, Map<String, DocStatusEntry> statusMap) {
    if (String.isBlank(doc.Document_Types__c)) {
        return doc.Status__c; // not an ad hoc parent — leave untouched
    }

    List<String> requiredLabels = new List<String>();
    for (String s : doc.Document_Types__c.split(';')) {
        if (String.isNotBlank(s)) requiredLabels.add(s.trim());
    }
    if (requiredLabels.isEmpty()) return doc.Status__c;

    Integer uploadedCount = 0;
    for (String label : requiredLabels) {
        DocStatusEntry entry = statusMap.get(label);
        if (entry != null && String.isNotBlank(entry.contentDocumentId)) {
            uploadedCount++;
        }
    }

    if (uploadedCount == 0)                    return 'Pending Submission';
    if (uploadedCount < requiredLabels.size())  return 'Partially Submitted';
    return 'Submitted';
}

    public class DocStatusEntry {
        public String status;
        public String contentDocumentId;
        public String fileName;
        public String issueDate;
        public String expiryDate;
        public String uploadedDate;
        public String reviewerNotes;
    }

    public static String computeOnboardingStage(Id applicationId) {
        if (applicationId == null) return 'Pending';
        
        List<WCF_Compliance_Document__c> docs = [
            SELECT Id, Document_Type__c, Document_Types__c, Status__c, Document_Status_JSON__c
            FROM   WCF_Compliance_Document__c
            WHERE  IndividualApplication__c = :applicationId
            WITH   SYSTEM_MODE
        ];

        Map<String, WCF_Compliance_Document__c> existingByType = new Map<String, WCF_Compliance_Document__c>();
        List<WCF_Compliance_Document__c> adHocRequests = new List<WCF_Compliance_Document__c>();

        for (WCF_Compliance_Document__c doc : docs) {
            if (String.isNotBlank(doc.Document_Type__c)) {
                existingByType.put(doc.Document_Type__c, doc);
            } else if (String.isNotBlank(doc.Document_Types__c)) {
                adHocRequests.add(doc);
            }
        }

        Integer totalRequired = 0;
        Integer totalValidated = 0;

        Set<String> adHocLabels = new Set<String>();
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
                    Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
                    DocStatusEntry entry = statusMap.get(label);
                    if (entry != null && entry.status == 'Validated') {
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

        if (totalRequired > 0 && totalValidated >= totalRequired) {
            return 'Onboarded';
        }
        return 'In Progress';
    }
}