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
        @AuraEnabled public Id adHocParentId;
    }

    public class ComplianceChecklistResult {
        @AuraEnabled public Id     applicationId;
        @AuraEnabled public String geography;
        @AuraEnabled public List<ComplianceChecklistItem> items;
        @AuraEnabled public Integer totalRequired;
        @AuraEnabled public Integer totalValidated;
        @AuraEnabled public Integer totalUploaded;
        @AuraEnabled public Boolean isSubmitted;
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
    // to 'Draft'.
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

        Map<String, WCF_Compliance_Document__c> existingByType =
            new Map<String, WCF_Compliance_Document__c>();
        List<WCF_Compliance_Document__c> adHocRequests = new List<WCF_Compliance_Document__c>();

        List<WCF_Compliance_Document__c> allDocs = [
            SELECT Id, OwnerId, Document_Type__c, Document_Types__c, Status__c,
                   ContentDocumentId__c, File_Name__c, Issue_Date__c, Expiry_Date__c,
                   Reviewer_Notes__c, Uploaded_Date__c, Due_Date__c, Document_Status_JSON__c
            FROM   WCF_Compliance_Document__c
            WHERE  IndividualApplication__c = :applicationId
            WITH   SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
        ];

        Boolean isSubmitted = false;

        for (WCF_Compliance_Document__c doc : allDocs) {
            if (String.isNotBlank(doc.Document_Type__c)) {
                existingByType.put(doc.Document_Type__c, doc);
            } else if (String.isNotBlank(doc.Document_Types__c)) {
                adHocRequests.add(doc); // reviewer-raised ad hoc request
            }

            if (doc.Status__c == 'Submitted' || doc.Status__c == 'Validated'
                    || doc.Status__c == 'Under Review' || doc.Status__c == 'Received'
                    || doc.Status__c == 'Pending Review' || doc.Status__c == 'Pass'
                    || doc.Status__c == 'Approved') {
                isSubmitted = true;
            }
        }

        // ── Pre-process ad-hoc requests into a map to prevent duplicates ───────
        Map<String, ComplianceChecklistItem> adHocItemsByLabel = new Map<String, ComplianceChecklistItem>();
        for (WCF_Compliance_Document__c doc : adHocRequests) {
            Boolean docIsSubmitted = (doc.Status__c == 'Submitted' || doc.Status__c == 'Validated'
                || doc.Status__c == 'Under Review' || doc.Status__c == 'Received'
                || doc.Status__c == 'Pending Review' || doc.Status__c == 'Pass');

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
                    item.status            = (fulfilled.Status__c == 'Pending Submission' && String.isNotBlank(fulfilled.ContentDocumentId__c) && !isSubmitted)
                                             ? 'Draft' : fulfilled.Status__c;
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

                    if (entry != null && String.isNotBlank(entry.contentDocumentId)) {
                        if (String.isNotBlank(entry.status)) {
                            item.status = entry.status;
                        } else {
                            item.status = docIsSubmitted ? 'Pending Review' : 'Draft';
                        }
                    } else {
                        item.status = (doc.Status__c == 'Draft') ? 'Draft' : 'Pending Submission';
                    }

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
                item.documentType      = label;
                item.documentLabel     = label;
                item.description       = 'Compliance Document.';
                item.required          = true;
                item.recordId          = doc.Id;
                item.status            = (doc.Status__c == 'Pending Submission' && String.isNotBlank(doc.ContentDocumentId__c) && !isSubmitted)
                                         ? 'Draft' : doc.Status__c;
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
        Integer totalRequired      = 0;
        Integer totalValidated     = 0;
        Integer totalUploaded      = 0;
        Boolean anyRefreshRequired = false;
        Boolean anyDraft           = false;

        for (ComplianceChecklistItem item : result.items) {
            if (item.required) {
                totalRequired++;
                if (item.status == 'Validated' || item.status == 'Pass') {
                    totalValidated++;
                }
                if (String.isNotBlank(item.contentDocumentId)) {
                    totalUploaded++;
                }
            }
            if (item.status == 'Refresh Required') {
                anyRefreshRequired = true;
            }
            if (item.status == 'Draft') {
                anyDraft = true;
            }
        }

        for (WCF_Compliance_Document__c doc : allDocs) {
            if (doc.Status__c == 'Draft') {
                anyDraft = true;
            }
        }

        result.totalRequired  = totalRequired;
        result.totalValidated = totalValidated;
        result.totalUploaded  = totalUploaded;
        result.isSubmitted    = isSubmitted;

        // Calculate decision status and notes
        String compStatus = 'Pending';
        String reviewerNotes = '';

        Boolean hasRejected = false;
        Boolean hasSuspended = false;
        Boolean hasReturned = false;
        String returnedNotes = '';
        String rejectedNotes = '';
        String suspendedNotes = '';

        for (WCF_Compliance_Document__c doc : allDocs) {
            if (doc.Status__c == 'Rejected' || doc.Status__c == 'Reject') {
                hasRejected = true;
                if (String.isNotBlank(doc.Reviewer_Notes__c)) {
                    rejectedNotes = doc.Reviewer_Notes__c;
                }
            } else if (doc.Status__c == 'Suspended' || doc.Status__c == 'Suspend') {
                hasSuspended = true;
                if (String.isNotBlank(doc.Reviewer_Notes__c)) {
                    suspendedNotes = doc.Reviewer_Notes__c;
                }
            } else if (doc.Status__c == 'Returned' || doc.Status__c == 'Return') {
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

        if (anyRefreshRequired) {
            result.overallStatus = 'Refresh Required';
        } else if (totalRequired > 0 && totalValidated >= totalRequired) {
            result.overallStatus = 'Complete';
        } else if (hasRejected) {
            result.overallStatus = 'Rejected';
        } else if (hasSuspended) {
            result.overallStatus = 'Suspended';
        } else if (hasReturned) {
            result.overallStatus = 'Returned';
        } else if (isSubmitted) {
            result.overallStatus = 'Pending Review';
        } else if (totalUploaded > 0 || anyDraft) {
            result.overallStatus = 'Draft';
        } else {
            result.overallStatus = 'Pending Submission';
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
        } else if (isSubmitted) {
            compStatus = 'Pending Review';
        } else if (totalUploaded > 0 || anyDraft) {
            compStatus = 'Draft';
        } else {
            compStatus = 'In Progress';
        }

        result.complianceStatus = compStatus;
        result.reviewerNotes = reviewerNotes;

        return result;
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — donee uploads or re-uploads a document (saves as Draft)
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static ComplianceChecklistItem saveComplianceDocument(
        Id     applicationId,
        String documentType,
        String contentDocumentId,
        String fileName,
        String issueDate,
        String expiryDate,
        Id     existingRecordId
    ) {
        if (applicationId == null || String.isBlank(documentType)
                || String.isBlank(contentDocumentId)) {
            throw new AuraHandledException('Missing required upload details.');
        }

        validateOwnership(applicationId);

        WCF_Compliance_Document__c doc;

        if (existingRecordId != null) {
            List<WCF_Compliance_Document__c> byId = [
                SELECT Id, Document_Type__c, ContentDocumentId__c, File_Name__c, Status__c,
                       Issue_Date__c, Expiry_Date__c, Uploaded_Date__c, Reviewer_Notes__c
                FROM   WCF_Compliance_Document__c
                WHERE  Id = :existingRecordId
                WITH   SYSTEM_MODE LIMIT 1
            ];
            if (!byId.isEmpty()) {
                if (byId[0].Document_Type__c == documentType 
                        || String.isBlank(byId[0].Document_Type__c)) {
                    doc = byId[0];
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
        // Keep as Draft upon upload — only explicit submit flips to Pending Review
        if (doc.Status__c != 'Returned' && doc.Status__c != 'Submitted' && doc.Status__c != 'Pending Review' && doc.Status__c != 'Validated' && doc.Status__c != 'Pass' && doc.Status__c != 'Approved') {
            doc.Status__c = 'Draft';
        }
        doc.Uploaded_Date__c     = DateTime.now();
        doc.Reviewer_Notes__c    = null; // clear on re-upload

        if (String.isNotBlank(previousContentDocumentId)
                && previousContentDocumentId != contentDocumentId) {
            try {
                delete [SELECT Id FROM ContentDocument WHERE Id = :previousContentDocumentId];
            } catch (Exception e) { }
        }  

        if (String.isNotBlank(issueDate))  { try { doc.Issue_Date__c  = Date.valueOf(issueDate);  } catch (Exception e) {} }
        if (String.isNotBlank(expiryDate)) { try { doc.Expiry_Date__c = Date.valueOf(expiryDate); } catch (Exception e) {} }

        upsert doc;
        linkFileIfNeeded(doc.Id, contentDocumentId);

        ComplianceChecklistItem item = new ComplianceChecklistItem();
        item.recordId          = doc.Id;
        item.documentType      = doc.Document_Type__c;
        item.status            = (doc.Status__c == 'Pending Submission' || doc.Status__c == 'Not Started' || doc.Status__c == 'Draft') ? 'Draft' : doc.Status__c;
        item.contentDocumentId = doc.ContentDocumentId__c;
        item.fileName          = doc.File_Name__c;
        item.issueDate         = doc.Issue_Date__c   != null ? String.valueOf(doc.Issue_Date__c)        : null;
        item.expiryDate        = doc.Expiry_Date__c  != null ? String.valueOf(doc.Expiry_Date__c)       : null;
        item.submittedDate     = doc.Uploaded_Date__c != null ? String.valueOf(doc.Uploaded_Date__c.date()) : null;
        return item;
    }

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
            SELECT Id, ContentDocumentId__c, IndividualApplication__c, Status__c
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
        doc.Status__c            = 'Pending Submission';
        update doc;
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — upload/replace a file for one ad hoc document type.
    // Saves the document in Draft state without flipping record status to
    // Partially Submitted or Submitted for the Reviewer.
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
            SELECT Id, IndividualApplication__c, Document_Status_JSON__c, Document_Types__c, Status__c
            FROM   WCF_Compliance_Document__c
            WHERE  Id = :adHocRecordId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (docs.isEmpty()) {
            throw new AuraHandledException('Compliance request not found.');
        }

        WCF_Compliance_Document__c doc = docs[0];
        validateOwnership(doc.IndividualApplication__c);

        Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
        DocStatusEntry entry = statusMap.get(documentLabel);
        String previousContentDocumentId = entry != null ? entry.contentDocumentId : null;

        if (entry == null) entry = new DocStatusEntry();
        // Save as Draft — only explicit submit moves to Pending Review
        entry.status             = 'Draft';
        entry.contentDocumentId  = contentDocumentId;
        entry.fileName           = fileName;
        entry.uploadedDate       = String.valueOf(Date.today());
        entry.reviewerNotes      = null; // clear on re-upload
        if (String.isNotBlank(issueDate))  entry.issueDate  = issueDate;
        if (String.isNotBlank(expiryDate)) entry.expiryDate = expiryDate;

        statusMap.put(documentLabel, entry);
        doc.Document_Status_JSON__c = JSON.serialize(statusMap);
        
        // Keep doc.Status__c in Draft / Returned until explicit submit
        if (doc.Status__c != 'Returned' && doc.Status__c != 'Submitted' && doc.Status__c != 'Pending Review' && doc.Status__c != 'Validated' && doc.Status__c != 'Pass' && doc.Status__c != 'Approved') {
            doc.Status__c = 'Draft';
        }
        update doc;

        // Attach the file to the parent record's Notes & Attachments
        linkFileIfNeeded(doc.Id, contentDocumentId);

        // Clean up old file on replace
        if (String.isNotBlank(previousContentDocumentId)
                && previousContentDocumentId != contentDocumentId) {
            try {
                delete [SELECT Id FROM ContentDocument WHERE Id = :previousContentDocumentId];
            } catch (Exception e) { }
        }

        ComplianceChecklistItem item = new ComplianceChecklistItem();
        item.recordId          = doc.Id;
        item.documentType      = documentLabel;
        item.status            = entry.status;
        item.contentDocumentId = entry.contentDocumentId;
        item.fileName          = entry.fileName;
        item.issueDate         = entry.issueDate;
        item.expiryDate        = entry.expiryDate;
        item.submittedDate     = entry.uploadedDate;
        return item;
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — applicant removes an ad hoc document file.
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void deleteAdHocComplianceDocumentFile(Id adHocRecordId, String documentLabel) {
        if (adHocRecordId == null || String.isBlank(documentLabel)) {
            throw new AuraHandledException('Missing document reference.');
        }
        List<WCF_Compliance_Document__c> docs = [
            SELECT Id, IndividualApplication__c, Document_Status_JSON__c, Document_Types__c, Status__c
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
        update doc;
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — Explicit Save Draft of all Compliance Documents
    // Updates active unsubmitted compliance document records to Status__c = 'Draft'
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void saveDraftComplianceDocuments(Id applicationId) {
        if (applicationId == null) {
            throw new AuraHandledException('Missing application ID.');
        }

        validateOwnership(applicationId);

        List<WCF_Compliance_Document__c> allDocs = [
            SELECT Id, Document_Type__c, Document_Types__c, Status__c,
                   ContentDocumentId__c, Document_Status_JSON__c, Uploaded_Date__c
            FROM   WCF_Compliance_Document__c
            WHERE  IndividualApplication__c = :applicationId
            WITH   SYSTEM_MODE
        ];

        if (allDocs.isEmpty()) {
            return;
        }

        List<WCF_Compliance_Document__c> docsToUpdate = new List<WCF_Compliance_Document__c>();

        for (WCF_Compliance_Document__c doc : allDocs) {
            // Do not override terminal/decision statuses
            if (doc.Status__c == 'Validated' || doc.Status__c == 'Pass' 
                    || doc.Status__c == 'Approved' || doc.Status__c == 'Rejected' 
                    || doc.Status__c == 'Suspended' || doc.Status__c == 'Pending Review'
                    || doc.Status__c == 'Submitted') {
                continue;
            }

            Boolean isChanged = false;

            if (String.isNotBlank(doc.Document_Types__c)) {
                Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
                for (String label : statusMap.keySet()) {
                    DocStatusEntry entry = statusMap.get(label);
                    if (entry != null && String.isNotBlank(entry.contentDocumentId)) {
                        if (entry.status != 'Validated' && entry.status != 'Pass' && entry.status != 'Approved' && entry.status != 'Rejected' && entry.status != 'Suspended' && entry.status != 'Pending Review') {
                            entry.status = 'Draft';
                            isChanged = true;
                        }
                    }
                }
                if (isChanged) {
                    doc.Document_Status_JSON__c = JSON.serialize(statusMap);
                }
            }

            if (doc.Status__c != 'Draft') {
                doc.Status__c = 'Draft';
                isChanged = true;
            }

            if (isChanged) {
                doc.Uploaded_Date__c = (doc.Uploaded_Date__c != null) ? doc.Uploaded_Date__c : DateTime.now();
                docsToUpdate.add(doc);
            }
        }

        if (!docsToUpdate.isEmpty()) {
            update docsToUpdate;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — Explicit Final Submit of all Compliance Documents
    // Validates that all requested documents have been uploaded, sets
    // internal statuses to Pending Review, and updates Status__c to Pending Review.
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void submitComplianceDocuments(Id applicationId) {
        if (applicationId == null) {
            throw new AuraHandledException('Missing application ID.');
        }

        validateOwnership(applicationId);

        List<WCF_Compliance_Document__c> allDocs = [
            SELECT Id, Document_Type__c, Document_Types__c, Status__c,
                   ContentDocumentId__c, Document_Status_JSON__c, Uploaded_Date__c
            FROM   WCF_Compliance_Document__c
            WHERE  IndividualApplication__c = :applicationId
            WITH   SYSTEM_MODE
        ];

        if (allDocs.isEmpty()) {
            throw new AuraHandledException('No compliance request found for this application.');
        }

        List<WCF_Compliance_Document__c> docsToUpdate = new List<WCF_Compliance_Document__c>();
        List<String> missingDocs = new List<String>();

        for (WCF_Compliance_Document__c doc : allDocs) {
            // Case 1: Ad-hoc request with multiple Document_Types__c
            if (String.isNotBlank(doc.Document_Types__c)) {
                Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
                List<String> requiredLabels = new List<String>();
                for (String s : doc.Document_Types__c.split(';')) {
                    if (String.isNotBlank(s)) requiredLabels.add(s.trim());
                }

                for (String label : requiredLabels) {
                    DocStatusEntry entry = statusMap.get(label);
                    if (entry == null || String.isBlank(entry.contentDocumentId)) {
                        missingDocs.add(label);
                    } else {
                        // Flip draft item to Pending Review upon submit
                        if (entry.status == 'Draft' || String.isBlank(entry.status) || entry.status == 'Pending Submission') {
                            entry.status = 'Pending Review';
                        }
                    }
                }

                doc.Document_Status_JSON__c = JSON.serialize(statusMap);
                doc.Status__c = 'Pending Review';
                doc.Uploaded_Date__c = DateTime.now();
                docsToUpdate.add(doc);
            } 
            // Case 2: Dedicated compliance document record
            else if (String.isNotBlank(doc.Document_Type__c)) {
                if (String.isBlank(doc.ContentDocumentId__c)) {
                    missingDocs.add(doc.Document_Type__c);
                } else {
                    doc.Status__c = 'Pending Review';
                    doc.Uploaded_Date__c = DateTime.now();
                    docsToUpdate.add(doc);
                }
            }
        }

        if (!missingDocs.isEmpty()) {
            throw new AuraHandledException('Please upload all required compliance documents before submitting. Missing: ' + String.join(missingDocs, ', '));
        }

        if (!docsToUpdate.isEmpty()) {
            update docsToUpdate;
        }
    }

    private static Map<String, DocStatusEntry> parseStatusMap(String jsonStr) {
        Map<String, DocStatusEntry> result = new Map<String, DocStatusEntry>();
        if (String.isBlank(jsonStr)) return result;
        try {
            result = (Map<String, DocStatusEntry>) JSON.deserialize(jsonStr, Map<String, DocStatusEntry>.class);
        } catch (Exception e) { }
        return result;
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