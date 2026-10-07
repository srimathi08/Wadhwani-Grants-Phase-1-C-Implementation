public without sharing class WCFComplianceController {

    // ─────────────────────────────────────────────────────────────────
    // EDIT RULES (single source of truth — the LWC mirrors these)
    //
    //   Reviewer decision   | Applicant can…
    //   ────────────────────┼──────────────────────────────────────────
    //   Pass / Validated    | view & download only (locked)
    //   Reject              | nothing — whole checklist frozen
    //   Suspend             | nothing — whole checklist frozen
    //   Return              | replace the returned file (not delete)
    //   Refresh Required    | replace the expired file (not delete)
    //   Pending Review /    | view only — it is with the reviewer
    //   Flagged             |
    //   Not Started /       | upload, replace, delete, submit
    //   Pending Submission /|
    //   Draft               |
    //
    // Raw statuses (dedicated Status__c or ad hoc JSON entry.status) are
    // normalised first, so 'Pass', 'Approved', 'Reject', 'Suspend',
    // 'Return', 'Submitted', 'Under Review', 'Received' all map onto the
    // canonical values above.
    // ─────────────────────────────────────────────────────────────────

    private static final Map<String, String> STATUS_ALIASES = new Map<String, String>{
        'pass'               => 'Validated',
        'approved'           => 'Validated',
        'validated'          => 'Validated',
        'reject'             => 'Rejected',
        'rejected'           => 'Rejected',
        'suspend'            => 'Suspended',
        'suspended'          => 'Suspended',
        'return'             => 'Returned',
        'returned'           => 'Returned',
        'submitted'          => 'Pending Review',
        'under review'       => 'Pending Review',
        'received'           => 'Pending Review',
        'pending review'     => 'Pending Review',
        'draft'              => 'Draft',
        'not started'        => 'Not Started',
        'pending submission' => 'Pending Submission',
        'refresh required'   => 'Refresh Required',
        'flagged'            => 'Flagged'
    };

    /** Statuses in which the applicant may upload / replace a file. */
    private static final Set<String> EDITABLE_STATUSES = new Set<String>{
        'Not Started', 'Pending Submission', 'Draft', 'Returned', 'Refresh Required'
    };

    /** Statuses in which the applicant may delete the file on record. */
    private static final Set<String> DELETABLE_STATUSES = new Set<String>{
        'Not Started', 'Pending Submission', 'Draft'
    };

    /** Reviewer sent the row back: a new file is required before resubmission. */
    private static final Set<String> REUPLOAD_REQUIRED_STATUSES = new Set<String>{
        'Returned', 'Refresh Required'
    };

    /** Statuses that represent a reviewer decision on a row. */
    private static final Set<String> REVIEWER_DECISION_STATUSES = new Set<String>{
        'Validated', 'Rejected', 'Suspended', 'Returned', 'Refresh Required', 'Flagged'
    };

    /** A decision in this set freezes the whole checklist for the applicant. */
    private static final Set<String> FREEZE_STATUSES = new Set<String>{
        'Rejected', 'Suspended'
    };

    /** Rows already with (or decided by) the reviewer — Submit leaves them alone. */
    private static final Set<String> WITH_REVIEWER_STATUSES = new Set<String>{
        'Pending Review', 'Validated', 'Flagged'
    };

    /** Raw record statuses that mean "the applicant has submitted at least once". */
    private static final Set<String> SUBMITTED_STATUSES = new Set<String>{
        'Pending Review', 'Validated', 'Flagged'
    };

    // ─────────────────────────────────────────────────────────────────
    // Wrapper classes
    // ─────────────────────────────────────────────────────────────────

    public class ComplianceChecklistItem {
        @AuraEnabled public Id      recordId;
        @AuraEnabled public String  documentType;
        @AuraEnabled public String  documentLabel;
        @AuraEnabled public String  description;
        @AuraEnabled public Boolean required;
        @AuraEnabled public String  status;
        @AuraEnabled public String  contentDocumentId;
        @AuraEnabled public String  fileName;
        @AuraEnabled public String  issueDate;
        @AuraEnabled public String  expiryDate;
        @AuraEnabled public String  returnReason;
        @AuraEnabled public String  submittedDate;
        @AuraEnabled public String  dueDate;
        @AuraEnabled public Id      adHocParentId;
        @AuraEnabled public Boolean isEditable;   // applicant may upload / replace
        @AuraEnabled public Boolean canDelete;    // applicant may delete the file
    }

    public class ComplianceChecklistResult {
        @AuraEnabled public Id      applicationId;
        @AuraEnabled public String  geography;
        @AuraEnabled public List<ComplianceChecklistItem> items;
        @AuraEnabled public Integer totalRequired;
        @AuraEnabled public Integer totalValidated;
        @AuraEnabled public Integer totalUploaded;
        @AuraEnabled public Boolean isSubmitted;
        @AuraEnabled public String  overallStatus;
        @AuraEnabled public String  complianceStatus;
        @AuraEnabled public String  reviewerNotes;
        @AuraEnabled public Boolean isLocked;     // nothing on the checklist is editable
        @AuraEnabled public String  lockReason;   // 'Rejected' | 'Suspended' | 'Validated' | null
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

    public class DocStatusEntry {
        public String status;
        public String contentDocumentId;
        public String fileName;
        public String issueDate;
        public String expiryDate;
        public String uploadedDate;
        public String reviewerNotes;
    }

    // ─────────────────────────────────────────────────────────────────
    // Geography → checklist template
    // BRD B.4: "Compliance Checklist is geography-driven."
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
    // Prepare upload — shell record so lightning-file-upload has a
    // community-accessible record-id.
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static Id getOrCreateComplianceRecord(Id applicationId, String documentType) {
        if (applicationId == null || String.isBlank(documentType)) {
            throw new AuraHandledException('Missing application or document type.');
        }
        validateOwnership(applicationId);

        List<WCF_Compliance_Document__c> allDocs = queryDocs(applicationId);
        List<ComplianceChecklistItem> items = buildItems(allDocs, computeIsSubmitted(allDocs));
        assertEditable(items, findItem(items, documentType, null), false);

        for (WCF_Compliance_Document__c doc : allDocs) {
            if (doc.Document_Type__c == documentType) {
                return doc.Id;
            }
        }

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
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static ComplianceChecklistResult getComplianceChecklist(Id applicationId) {
        if (applicationId == null) {
            throw new AuraHandledException('Missing application record.');
        }

        IndividualApplication app = validateOwnership(applicationId);

        List<WCF_Compliance_Document__c> allDocs = queryDocs(applicationId);
        Boolean isSubmitted = computeIsSubmitted(allDocs);
        List<ComplianceChecklistItem> items = buildItems(allDocs, isSubmitted);

        ComplianceChecklistResult result = new ComplianceChecklistResult();
        result.applicationId = applicationId;
        result.geography     = resolveGeography(app.Headquarters_City_and_Country__c);
        result.items         = items;

        Integer totalRequired  = 0;
        Integer totalValidated = 0;
        Integer totalUploaded  = 0;
        Boolean anyRefresh     = false;
        Boolean anyDraft       = false;
        Boolean hasRejected    = false;
        Boolean hasSuspended   = false;
        Boolean hasReturned    = false;
        List<String> rejectedNotes  = new List<String>();
        List<String> suspendedNotes = new List<String>();
        List<String> returnedNotes  = new List<String>();

        for (ComplianceChecklistItem item : items) {
            if (item.required) {
                totalRequired++;
                if (item.status == 'Validated') totalValidated++;
                if (String.isNotBlank(item.contentDocumentId)
                        && !REUPLOAD_REQUIRED_STATUSES.contains(item.status)) {
                    totalUploaded++;
                }
            }
            if (item.status == 'Refresh Required') anyRefresh = true;
            if (item.status == 'Draft')            anyDraft   = true;
            if (item.status == 'Rejected')  { hasRejected  = true; addNote(rejectedNotes,  item.returnReason); }
            if (item.status == 'Suspended') { hasSuspended = true; addNote(suspendedNotes, item.returnReason); }
            if (item.status == 'Returned')  { hasReturned  = true; addNote(returnedNotes,  item.returnReason); }
        }

        Boolean allValidated = totalRequired > 0 && totalValidated >= totalRequired;

        result.totalRequired  = totalRequired;
        result.totalValidated = totalValidated;
        result.totalUploaded  = totalUploaded;
        result.isSubmitted    = isSubmitted;

        // Overall (row-driven) status — final decisions first.
        if (hasRejected) {
            result.overallStatus = 'Rejected';
        } else if (hasSuspended) {
            result.overallStatus = 'Suspended';
        } else if (allValidated) {
            result.overallStatus = 'Complete';
        } else if (anyRefresh) {
            result.overallStatus = 'Refresh Required';
        } else if (hasReturned) {
            result.overallStatus = 'Returned';
        } else if (isSubmitted) {
            result.overallStatus = 'Pending Review';
        } else if (totalUploaded > 0 || anyDraft) {
            result.overallStatus = 'Draft';
        } else {
            result.overallStatus = 'Pending Submission';
        }

        // Compliance decision + the notes that go with it.
        if (hasRejected) {
            result.complianceStatus = 'Rejected';
            result.reviewerNotes    = String.join(rejectedNotes, '; ');
        } else if (hasSuspended) {
            result.complianceStatus = 'Suspended';
            result.reviewerNotes    = String.join(suspendedNotes, '; ');
        } else if (hasReturned) {
            result.complianceStatus = 'Returned';
            result.reviewerNotes    = String.join(returnedNotes, '; ');
        } else if (allValidated) {
            result.complianceStatus = 'Validated';
            result.reviewerNotes    = '';
        } else if (isSubmitted) {
            result.complianceStatus = 'Pending Review';
            result.reviewerNotes    = '';
        } else if (totalUploaded > 0 || anyDraft) {
            result.complianceStatus = 'Draft';
            result.reviewerNotes    = '';
        } else {
            result.complianceStatus = 'In Progress';
            result.reviewerNotes    = '';
        }

        // Lock state for the applicant.
        if (hasRejected) {
            result.lockReason = 'Rejected';
        } else if (hasSuspended) {
            result.lockReason = 'Suspended';
        } else if (allValidated) {
            result.lockReason = 'Validated';
        }
        result.isLocked = result.lockReason != null;

        return result;
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — upload / re-upload a dedicated document (lands as Draft)
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

        List<WCF_Compliance_Document__c> allDocs = queryDocs(applicationId);
        List<ComplianceChecklistItem> items = buildItems(allDocs, computeIsSubmitted(allDocs));
        assertEditable(items, findItem(items, documentType, null), false);

        // Resolve the target record only from this application's documents
        // (so a foreign existingRecordId can never be written to), and never
        // turn an ad hoc request record into a dedicated one.
        WCF_Compliance_Document__c doc;
        if (existingRecordId != null) {
            for (WCF_Compliance_Document__c d : allDocs) {
                if (d.Id == existingRecordId
                        && String.isBlank(d.Document_Types__c)
                        && (d.Document_Type__c == documentType || String.isBlank(d.Document_Type__c))) {
                    doc = d;
                    break;
                }
            }
        }
        if (doc == null) {
            for (WCF_Compliance_Document__c d : allDocs) {   // newest first
                if (d.Document_Type__c == documentType) {
                    doc = d;
                    break;
                }
            }
        }
        if (doc == null) {
            doc = new WCF_Compliance_Document__c(IndividualApplication__c = applicationId);
        }
        if (String.isBlank(doc.Document_Type__c)) {
            doc.Document_Type__c = documentType;
        }

        String previousContentDocumentId = doc.ContentDocumentId__c;

        doc.ContentDocumentId__c = contentDocumentId;
        doc.File_Name__c         = fileName;
        // Every permitted upload (first upload, or re-upload after Return /
        // Refresh Required) lands as Draft. Only Submit moves it on.
        doc.Status__c            = 'Draft';
        doc.Uploaded_Date__c     = DateTime.now();
        doc.Reviewer_Notes__c    = null;

        if (String.isNotBlank(issueDate))  { try { doc.Issue_Date__c  = Date.valueOf(issueDate);  } catch (Exception e) {} }
        if (String.isNotBlank(expiryDate)) { try { doc.Expiry_Date__c = Date.valueOf(expiryDate); } catch (Exception e) {} }

        upsert doc;
        linkFileIfNeeded(doc.Id, contentDocumentId);

        if (String.isNotBlank(previousContentDocumentId)
                && previousContentDocumentId != contentDocumentId) {
            try {
                delete [SELECT Id FROM ContentDocument WHERE Id = :previousContentDocumentId];
            } catch (Exception e) { }
        }

        ComplianceChecklistItem item = new ComplianceChecklistItem();
        item.recordId          = doc.Id;
        item.documentType      = doc.Document_Type__c;
        item.status            = 'Draft';
        item.contentDocumentId = doc.ContentDocumentId__c;
        item.fileName          = doc.File_Name__c;
        item.issueDate         = doc.Issue_Date__c    != null ? String.valueOf(doc.Issue_Date__c)             : null;
        item.expiryDate        = doc.Expiry_Date__c   != null ? String.valueOf(doc.Expiry_Date__c)            : null;
        item.submittedDate     = doc.Uploaded_Date__c != null ? String.valueOf(doc.Uploaded_Date__c.date())   : null;
        item.isEditable        = true;
        item.canDelete         = true;
        return item;
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — delete the file on a dedicated document (Draft only)
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void deleteComplianceDocumentFile(Id recordId) {
        if (recordId == null) {
            throw new AuraHandledException('Missing document record.');
        }

        List<WCF_Compliance_Document__c> docs = [
            SELECT Id, IndividualApplication__c
            FROM   WCF_Compliance_Document__c
            WHERE  Id = :recordId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (docs.isEmpty()) {
            throw new AuraHandledException('Document not found.');
        }
        Id applicationId = docs[0].IndividualApplication__c;
        validateOwnership(applicationId);

        List<WCF_Compliance_Document__c> allDocs = queryDocs(applicationId);
        List<ComplianceChecklistItem> items = buildItems(allDocs, computeIsSubmitted(allDocs));

        ComplianceChecklistItem target;
        for (ComplianceChecklistItem i : items) {
            if (i.recordId == recordId && i.adHocParentId == null) { target = i; break; }
        }
        assertEditable(items, target, true);

        WCF_Compliance_Document__c doc;
        for (WCF_Compliance_Document__c d : allDocs) {
            if (d.Id == recordId) { doc = d; break; }
        }

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
    // WRITE — upload / replace a file for one ad hoc document type
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

        Id applicationId = applicationIdOf(adHocRecordId);
        validateOwnership(applicationId);

        List<WCF_Compliance_Document__c> allDocs = queryDocs(applicationId);
        WCF_Compliance_Document__c doc = findAdHocRequest(allDocs, adHocRecordId, documentLabel);

        List<ComplianceChecklistItem> items = buildItems(allDocs, computeIsSubmitted(allDocs));
        assertEditable(items, findItem(items, documentLabel, adHocRecordId), false);

        Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
        pinParentDecision(doc, statusMap);

        DocStatusEntry entry = statusMap.get(documentLabel);
        String previousContentDocumentId = entry != null ? entry.contentDocumentId : null;
        if (entry == null) entry = new DocStatusEntry();

        entry.status            = 'Draft';   // only Submit moves it to Pending Review
        entry.contentDocumentId = contentDocumentId;
        entry.fileName          = fileName;
        entry.uploadedDate      = String.valueOf(Date.today());
        entry.reviewerNotes     = null;
        if (String.isNotBlank(issueDate))  entry.issueDate  = issueDate;
        if (String.isNotBlank(expiryDate)) entry.expiryDate = expiryDate;
        statusMap.put(documentLabel, entry);

        doc.Document_Status_JSON__c = JSON.serialize(statusMap);
        doc.Status__c = aggregateAdHocStatus(doc, statusMap, dedicatedByType(allDocs).keySet());
        update doc;

        linkFileIfNeeded(doc.Id, contentDocumentId);

        if (String.isNotBlank(previousContentDocumentId)
                && previousContentDocumentId != contentDocumentId) {
            try {
                delete [SELECT Id FROM ContentDocument WHERE Id = :previousContentDocumentId];
            } catch (Exception e) { }
        }

        ComplianceChecklistItem item = new ComplianceChecklistItem();
        item.recordId          = doc.Id;
        item.adHocParentId     = doc.Id;
        item.documentType      = documentLabel;
        item.status            = entry.status;
        item.contentDocumentId = entry.contentDocumentId;
        item.fileName          = entry.fileName;
        item.issueDate         = entry.issueDate;
        item.expiryDate        = entry.expiryDate;
        item.submittedDate     = entry.uploadedDate;
        item.isEditable        = true;
        item.canDelete         = true;
        return item;
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — delete an ad hoc document file (Draft only)
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void deleteAdHocComplianceDocumentFile(Id adHocRecordId, String documentLabel) {
        if (adHocRecordId == null || String.isBlank(documentLabel)) {
            throw new AuraHandledException('Missing document reference.');
        }

        Id applicationId = applicationIdOf(adHocRecordId);
        validateOwnership(applicationId);

        List<WCF_Compliance_Document__c> allDocs = queryDocs(applicationId);
        WCF_Compliance_Document__c doc = findAdHocRequest(allDocs, adHocRecordId, documentLabel);

        List<ComplianceChecklistItem> items = buildItems(allDocs, computeIsSubmitted(allDocs));
        assertEditable(items, findItem(items, documentLabel, adHocRecordId), true);

        Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
        pinParentDecision(doc, statusMap);

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
        doc.Status__c = aggregateAdHocStatus(doc, statusMap, dedicatedByType(allDocs).keySet());
        update doc;
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — clean up a file that lightning-file-upload stored but the
    // save was refused for (e.g. the reviewer locked the row while the
    // applicant had the page open). Only deletes a file the current user
    // owns, that is linked to this application's compliance records and
    // that is NOT on record for any compliance document.
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void discardUploadedFile(Id applicationId, String contentDocumentId) {
        if (applicationId == null || String.isBlank(contentDocumentId)) return;
        validateOwnership(applicationId);

        Id cdId;
        try {
            cdId = Id.valueOf(contentDocumentId);
        } catch (Exception e) {
            return;
        }
        String key = String.valueOf(cdId).left(15);

        Set<Id> complianceIds = new Set<Id>();
        for (WCF_Compliance_Document__c doc : queryDocs(applicationId)) {
            complianceIds.add(doc.Id);
            if (String.isNotBlank(doc.ContentDocumentId__c)
                    && doc.ContentDocumentId__c.left(15).equals(key)) {
                return; // on record — never delete
            }
            if (String.isNotBlank(doc.Document_Status_JSON__c)
                    && doc.Document_Status_JSON__c.contains(key)) {
                return; // on record in an ad hoc entry — never delete
            }
        }
        if (complianceIds.isEmpty()) return;

        List<ContentDocumentLink> links = [
            SELECT Id FROM ContentDocumentLink
            WHERE  ContentDocumentId = :cdId
            AND    LinkedEntityId IN :complianceIds
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (links.isEmpty()) return;

        List<ContentDocument> files = [
            SELECT Id, OwnerId FROM ContentDocument
            WHERE  Id = :cdId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (!files.isEmpty() && files[0].OwnerId == UserInfo.getUserId()) {
            try { delete files; } catch (Exception e) { /* best effort */ }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — explicit Save Draft. Only promotes uploaded rows that have
    // not been touched by the reviewer; never downgrades a decision.
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void saveDraftComplianceDocuments(Id applicationId) {
        if (applicationId == null) {
            throw new AuraHandledException('Missing application ID.');
        }
        validateOwnership(applicationId);

        List<WCF_Compliance_Document__c> allDocs = queryDocs(applicationId);
        if (allDocs.isEmpty()) return;

        List<ComplianceChecklistItem> items = buildItems(allDocs, computeIsSubmitted(allDocs));
        for (ComplianceChecklistItem i : items) {
            if (FREEZE_STATUSES.contains(i.status)) return; // frozen — nothing to save
        }

        Set<String> dedicatedTypes = dedicatedByType(allDocs).keySet();
        List<WCF_Compliance_Document__c> docsToUpdate = new List<WCF_Compliance_Document__c>();

        for (WCF_Compliance_Document__c doc : allDocs) {
            if (String.isNotBlank(doc.Document_Type__c)) {
                String s = normalizeStatus(doc.Status__c);
                if (String.isNotBlank(doc.ContentDocumentId__c)
                        && (s == null || s == 'Not Started' || s == 'Pending Submission')) {
                    doc.Status__c = 'Draft';
                    docsToUpdate.add(doc);
                }
            } else if (String.isNotBlank(doc.Document_Types__c)) {
                Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
                pinParentDecision(doc, statusMap);
                Boolean changed = false;
                for (String label : splitLabels(doc.Document_Types__c)) {
                    if (dedicatedTypes.contains(label)) continue;
                    DocStatusEntry entry = statusMap.get(label);
                    if (entry == null || String.isBlank(entry.contentDocumentId)) continue;
                    String s = normalizeStatus(entry.status);
                    if (s == null || s == 'Not Started' || s == 'Pending Submission') {
                        entry.status = 'Draft';
                        changed = true;
                    }
                }
                if (changed) {
                    doc.Document_Status_JSON__c = JSON.serialize(statusMap);
                    doc.Status__c = aggregateAdHocStatus(doc, statusMap, dedicatedTypes);
                    docsToUpdate.add(doc);
                }
            }
        }

        if (!docsToUpdate.isEmpty()) {
            update docsToUpdate;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // WRITE — Submit. Moves only the applicant's open rows (Draft /
    // re-uploaded) to Pending Review. Rows already Validated, Pending
    // Review or Flagged are left exactly as the reviewer set them.
    // ─────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void submitComplianceDocuments(Id applicationId) {
        if (applicationId == null) {
            throw new AuraHandledException('Missing application ID.');
        }
        validateOwnership(applicationId);

        List<WCF_Compliance_Document__c> allDocs = queryDocs(applicationId);
        if (allDocs.isEmpty()) {
            throw new AuraHandledException('No compliance request found for this application.');
        }

        Boolean isSubmitted = computeIsSubmitted(allDocs);
        List<ComplianceChecklistItem> items = buildItems(allDocs, isSubmitted);
        for (ComplianceChecklistItem i : items) {
            if (FREEZE_STATUSES.contains(i.status)) {
                throw new AuraHandledException(lockedMessage(i.status, false));
            }
        }

        Map<String, WCF_Compliance_Document__c> dedicated = dedicatedByType(allDocs);
        Set<String> dedicatedTypes = dedicated.keySet();

        List<WCF_Compliance_Document__c> docsToUpdate = new List<WCF_Compliance_Document__c>();
        List<String> missingDocs = new List<String>();
        Integer movedToReview = 0;

        // Case 1: ad hoc requests (Document_Types__c)
        for (WCF_Compliance_Document__c doc : allDocs) {
            if (String.isNotBlank(doc.Document_Type__c) || String.isBlank(doc.Document_Types__c)) continue;

            Map<String, DocStatusEntry> statusMap = parseStatusMap(doc.Document_Status_JSON__c);
            pinParentDecision(doc, statusMap);
            Integer movedHere = 0;

            for (String label : splitLabels(doc.Document_Types__c)) {
                if (dedicatedTypes.contains(label)) continue; // handled as a dedicated record below
                DocStatusEntry entry = statusMap.get(label);
                String s = resolveAdHocStatus(doc, entry);

                if (WITH_REVIEWER_STATUSES.contains(s)) continue;

                if (entry == null || String.isBlank(entry.contentDocumentId)) {
                    missingDocs.add(label);
                } else if (REUPLOAD_REQUIRED_STATUSES.contains(s)) {
                    missingDocs.add(label + ' (new copy requested)');
                } else {
                    entry.status = 'Pending Review';
                    movedHere++;
                }
            }

            String newParentStatus = aggregateAdHocStatus(doc, statusMap, dedicatedTypes);
            if (movedHere > 0 || newParentStatus != normalizeStatus(doc.Status__c)) {
                doc.Document_Status_JSON__c = JSON.serialize(statusMap);
                doc.Status__c = newParentStatus;
                if (movedHere > 0) doc.Uploaded_Date__c = DateTime.now();
                docsToUpdate.add(doc);
            }
            movedToReview += movedHere;
        }

        // Case 2: dedicated records (newest record per type)
        for (WCF_Compliance_Document__c doc : dedicated.values()) {
            String s = dedicatedStatus(doc, isSubmitted);
            if (WITH_REVIEWER_STATUSES.contains(s)) continue;

            if (String.isBlank(doc.ContentDocumentId__c)) {
                missingDocs.add(doc.Document_Type__c);
            } else if (REUPLOAD_REQUIRED_STATUSES.contains(s)) {
                missingDocs.add(doc.Document_Type__c + ' (new copy requested)');
            } else {
                doc.Status__c        = 'Pending Review';
                doc.Uploaded_Date__c = DateTime.now();
                docsToUpdate.add(doc);
                movedToReview++;
            }
        }

        if (!missingDocs.isEmpty()) {
            throw new AuraHandledException(
                'Please upload all required compliance documents before submitting. Missing: '
                + String.join(missingDocs, ', '));
        }
        if (movedToReview == 0) {
            throw new AuraHandledException(
                'There is nothing new to submit. Your documents are already with the compliance team.');
        }

        update docsToUpdate;
    }

    // ─────────────────────────────────────────────────────────────────
    // Onboarding stage (used elsewhere)
    // ─────────────────────────────────────────────────────────────────
    public static String computeOnboardingStage(Id applicationId) {
        if (applicationId == null) return 'Pending';

        List<WCF_Compliance_Document__c> docs = queryDocs(applicationId);
        List<ComplianceChecklistItem> items = buildItems(docs, computeIsSubmitted(docs));

        Integer totalRequired  = 0;
        Integer totalValidated = 0;
        for (ComplianceChecklistItem item : items) {
            if (!item.required) continue;
            totalRequired++;
            if (item.status == 'Validated') totalValidated++;
        }
        return (totalRequired > 0 && totalValidated >= totalRequired) ? 'Onboarding Approved' : 'In Progress';
    }

    // ═════════════════════════════════════════════════════════════════
    // Internals
    // ═════════════════════════════════════════════════════════════════

    private static String normalizeStatus(String status) {
        if (String.isBlank(status)) return null;
        String s = status.trim();
        String canonical = STATUS_ALIASES.get(s.toLowerCase());
        return canonical != null ? canonical : s;
    }

    private static List<WCF_Compliance_Document__c> queryDocs(Id applicationId) {
        return [
            SELECT Id, IndividualApplication__c, Document_Type__c, Document_Types__c, Status__c,
                   ContentDocumentId__c, File_Name__c, Issue_Date__c, Expiry_Date__c,
                   Reviewer_Notes__c, Uploaded_Date__c, Due_Date__c, Document_Status_JSON__c
            FROM   WCF_Compliance_Document__c
            WHERE  IndividualApplication__c = :applicationId
            WITH   SYSTEM_MODE
            ORDER BY LastModifiedDate DESC
        ];
    }

    private static Id applicationIdOf(Id complianceDocId) {
        List<WCF_Compliance_Document__c> docs = [
            SELECT Id, IndividualApplication__c
            FROM   WCF_Compliance_Document__c
            WHERE  Id = :complianceDocId
            WITH   SYSTEM_MODE
            LIMIT  1
        ];
        if (docs.isEmpty()) {
            throw new AuraHandledException('Compliance request not found.');
        }
        return docs[0].IndividualApplication__c;
    }

    private static WCF_Compliance_Document__c findAdHocRequest(
            List<WCF_Compliance_Document__c> allDocs, Id adHocRecordId, String documentLabel) {
        for (WCF_Compliance_Document__c d : allDocs) {
            if (d.Id == adHocRecordId) {
                if (String.isBlank(d.Document_Types__c)
                        || !splitLabels(d.Document_Types__c).contains(documentLabel)) {
                    throw new AuraHandledException('This document is not part of the compliance request.');
                }
                return d;
            }
        }
        throw new AuraHandledException('Compliance request not found.');
    }

    private static Boolean computeIsSubmitted(List<WCF_Compliance_Document__c> docs) {
        for (WCF_Compliance_Document__c doc : docs) {
            if (SUBMITTED_STATUSES.contains(normalizeStatus(doc.Status__c))) return true;
        }
        return false;
    }

    /** Newest dedicated record per Document_Type__c (docs are ordered newest first). */
    private static Map<String, WCF_Compliance_Document__c> dedicatedByType(List<WCF_Compliance_Document__c> allDocs) {
        Map<String, WCF_Compliance_Document__c> byType = new Map<String, WCF_Compliance_Document__c>();
        for (WCF_Compliance_Document__c doc : allDocs) {
            if (String.isNotBlank(doc.Document_Type__c) && !byType.containsKey(doc.Document_Type__c)) {
                byType.put(doc.Document_Type__c, doc);
            }
        }
        return byType;
    }

    private static List<String> splitLabels(String multi) {
        List<String> labels = new List<String>();
        if (String.isBlank(multi)) return labels;
        for (String part : multi.split(';')) {
            String label = part.trim();
            if (String.isNotBlank(label) && !labels.contains(label)) labels.add(label);
        }
        return labels;
    }

    private static String dedicatedStatus(WCF_Compliance_Document__c doc, Boolean isSubmitted) {
        String s = normalizeStatus(doc.Status__c);
        if (String.isBlank(s)) s = 'Not Started';
        if (s == 'Pending Submission' && String.isNotBlank(doc.ContentDocumentId__c) && !isSubmitted) {
            s = 'Draft';
        }
        return s;
    }

    /**
     * Effective status of one label inside an ad hoc request.
     * Precedence:
     *   1. a row-level reviewer decision on an uploaded file
     *   2. a request-level Reject / Suspend (freezes every row)
     *   3. no file yet → requested (or returned, if the reviewer said so)
     *   4. a fresh Draft (applicant re-uploaded after the decision)
     *   5. a request-level decision for rows still awaiting review
     *   6. whatever the entry says, else Pending Review / Draft
     */
    private static String resolveAdHocStatus(WCF_Compliance_Document__c parent, DocStatusEntry entry) {
        String  parentStatus = normalizeStatus(parent.Status__c);
        Boolean hasFile      = entry != null && String.isNotBlank(entry.contentDocumentId);
        String  entryStatus  = entry != null ? normalizeStatus(entry.status) : null;

        if (hasFile && REVIEWER_DECISION_STATUSES.contains(entryStatus)) return entryStatus;
        if (FREEZE_STATUSES.contains(parentStatus))                      return parentStatus;
        if (!hasFile) {
            return REUPLOAD_REQUIRED_STATUSES.contains(entryStatus) ? entryStatus : 'Pending Submission';
        }
        if (entryStatus == 'Draft')                                      return 'Draft';
        //if (REVIEWER_DECISION_STATUSES.contains(parentStatus))           return parentStatus;
        if (parentStatus == 'Validated' || parentStatus == 'Flagged')    return parentStatus;
        if (String.isNotBlank(entryStatus))                              return entryStatus;
        return parentStatus == 'Pending Review' ? 'Pending Review' : 'Draft';
    }

    /**
     * Before the parent status is rewritten, copy a request-level decision
     * onto the entries that were inheriting it, so changing one row never
     * silently changes another row's status.
     */
    private static void pinParentDecision(WCF_Compliance_Document__c parent, Map<String, DocStatusEntry> statusMap) {
        for (String label : splitLabels(parent.Document_Types__c)) {
            DocStatusEntry entry = statusMap.get(label);
            if (entry == null || String.isBlank(entry.contentDocumentId)) continue;
            String effective = resolveAdHocStatus(parent, entry);
            if (effective != normalizeStatus(entry.status)) {
                  if (REUPLOAD_REQUIRED_STATUSES.contains(effective)) continue; // never spread Return/Refresh
                entry.status = effective;
                if (String.isBlank(entry.reviewerNotes)
                        && REVIEWER_DECISION_STATUSES.contains(effective)) {
                    entry.reviewerNotes = parent.Reviewer_Notes__c;
                }
            }
        }
    }

    /** Request-level status derived from its rows (after pinParentDecision). */
    private static String aggregateAdHocStatus(
            WCF_Compliance_Document__c parent, Map<String, DocStatusEntry> statusMap, Set<String> skipLabels) {
        Boolean anyCounted   = false;
        Boolean anyReturned  = false;
        Boolean anyOpen      = false;
        Boolean allValidated = true;

        for (String label : splitLabels(parent.Document_Types__c)) {
            if (skipLabels != null && skipLabels.contains(label)) continue;
            anyCounted = true;
            String s = resolveAdHocStatus(parent, statusMap.get(label));
            if (FREEZE_STATUSES.contains(s)) return s;
            if (REUPLOAD_REQUIRED_STATUSES.contains(s)) {
                anyReturned = true;
            } else if (s == 'Draft' || s == 'Not Started' || s == 'Pending Submission') {
                anyOpen = true;
            }
            if (s != 'Validated') allValidated = false;
        }

        if (!anyCounted)  return parent.Status__c;
        if (anyReturned)  return 'Returned';
        if (anyOpen)      return 'Draft';
        if (allValidated) return 'Validated';
        return 'Pending Review';
    }

    /** Builds the checklist rows and stamps isEditable / canDelete on each. */
    private static List<ComplianceChecklistItem> buildItems(
            List<WCF_Compliance_Document__c> allDocs, Boolean isSubmitted) {

        Map<String, WCF_Compliance_Document__c> dedicated = dedicatedByType(allDocs);
        Map<String, ComplianceChecklistItem> adHocByLabel = new Map<String, ComplianceChecklistItem>();
        List<ComplianceChecklistItem> items = new List<ComplianceChecklistItem>();

        // Reviewer-raised ad hoc requests (newest request wins per label)
        for (WCF_Compliance_Document__c req : allDocs) {
            if (String.isNotBlank(req.Document_Type__c) || String.isBlank(req.Document_Types__c)) continue;

            Map<String, DocStatusEntry> statusMap = parseStatusMap(req.Document_Status_JSON__c);

            for (String label : splitLabels(req.Document_Types__c)) {
                if (adHocByLabel.containsKey(label)) continue;

                ComplianceChecklistItem item = new ComplianceChecklistItem();
                item.documentType  = label;
                item.documentLabel = label;
                item.description   = 'Requested by the compliance team';
                item.dueDate       = req.Due_Date__c != null ? String.valueOf(req.Due_Date__c) : null;
                item.required      = true;

                WCF_Compliance_Document__c fulfilled = dedicated.get(label);
                if (fulfilled != null) {
                    fillFromDedicated(item, fulfilled, isSubmitted);
                } else {
                    DocStatusEntry entry = statusMap.get(label);
                    item.recordId          = req.Id;
                    item.adHocParentId     = req.Id;
                    item.status            = resolveAdHocStatus(req, entry);
                    item.contentDocumentId = entry != null ? entry.contentDocumentId : null;
                    item.fileName          = entry != null ? entry.fileName          : null;
                    item.returnReason = (entry != null && String.isNotBlank(entry.reviewerNotes))
    ? entry.reviewerNotes
    : ((FREEZE_STATUSES.contains(item.status) || REUPLOAD_REQUIRED_STATUSES.contains(item.status))
        ? req.Reviewer_Notes__c : null);
                    item.issueDate         = entry != null ? entry.issueDate    : null;
                    item.expiryDate        = entry != null ? entry.expiryDate   : null;
                    item.submittedDate     = entry != null ? entry.uploadedDate : null;
                }
                adHocByLabel.put(label, item);
                items.add(item);
            }
        }

        // Dedicated documents not covered by an ad hoc request
        for (String label : dedicated.keySet()) {
            if (adHocByLabel.containsKey(label)) continue;
            ComplianceChecklistItem item = new ComplianceChecklistItem();
            item.documentType  = label;
            item.documentLabel = label;
            item.description   = 'Compliance Document.';
            item.required      = true;
            fillFromDedicated(item, dedicated.get(label), isSubmitted);
            items.add(item);
        }

        // Edit rules
        Boolean frozen = false;
        for (ComplianceChecklistItem item : items) {
            if (FREEZE_STATUSES.contains(item.status)) { frozen = true; break; }
        }
        for (ComplianceChecklistItem item : items) {
            item.isEditable = !frozen && EDITABLE_STATUSES.contains(item.status);
            item.canDelete  = item.isEditable
                && DELETABLE_STATUSES.contains(item.status)
                && String.isNotBlank(item.contentDocumentId);
        }
        return items;
    }

    private static void fillFromDedicated(
            ComplianceChecklistItem item, WCF_Compliance_Document__c doc, Boolean isSubmitted) {
        item.recordId          = doc.Id;
        item.status            = dedicatedStatus(doc, isSubmitted);
        item.contentDocumentId = doc.ContentDocumentId__c;
        item.fileName          = doc.File_Name__c;
        item.returnReason      = doc.Reviewer_Notes__c;
        item.issueDate         = doc.Issue_Date__c    != null ? String.valueOf(doc.Issue_Date__c)           : null;
        item.expiryDate        = doc.Expiry_Date__c   != null ? String.valueOf(doc.Expiry_Date__c)          : null;
        item.submittedDate     = doc.Uploaded_Date__c != null ? String.valueOf(doc.Uploaded_Date__c.date()) : null;
    }

    private static ComplianceChecklistItem findItem(
            List<ComplianceChecklistItem> items, String documentType, Id adHocParentId) {
        for (ComplianceChecklistItem i : items) {
            if (i.documentType == documentType
                    && (adHocParentId == null || i.adHocParentId == adHocParentId)) {
                return i;
            }
        }
        return null;
    }

    /** Throws a friendly AuraHandledException when the change isn't allowed. */
    private static void assertEditable(
            List<ComplianceChecklistItem> items, ComplianceChecklistItem target, Boolean isDelete) {
        for (ComplianceChecklistItem i : items) {
            if (FREEZE_STATUSES.contains(i.status)) {
                throw new AuraHandledException(lockedMessage(i.status, false));
            }
        }
        if (target == null) return; // brand-new document type, nothing on record yet
        Set<String> allowed = isDelete ? DELETABLE_STATUSES : EDITABLE_STATUSES;
        if (!allowed.contains(target.status)) {
            throw new AuraHandledException(lockedMessage(target.status, isDelete));
        }
    }

    private static String lockedMessage(String status, Boolean isDelete) {
        if (status == 'Rejected') {
            return 'The compliance team has rejected this compliance submission, so documents can no longer be changed.';
        }
        if (status == 'Suspended') {
            return 'This compliance submission is suspended pending further review. Documents cannot be changed until the compliance team lifts the suspension.';
        }
        if (status == 'Validated') {
            return 'This document has been validated by the compliance team and can no longer be changed.';
        }
        if (status == 'Pending Review' || status == 'Flagged') {
            return 'This document is with the compliance team for review and cannot be changed right now. You will be able to update it if the team returns it to you.';
        }
        if (isDelete && REUPLOAD_REQUIRED_STATUSES.contains(status)) {
            return 'A returned document can be replaced but not deleted. Please upload a corrected copy instead.';
        }
        return 'This document cannot be changed in its current status (' + status + ').';
    }

    private static void addNote(List<String> notes, String note) {
        if (String.isNotBlank(note) && !notes.contains(note)) notes.add(note);
    }

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

    // Security — community user's Account must match the application
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

    private static Map<String, DocStatusEntry> parseStatusMap(String jsonStr) {
        Map<String, DocStatusEntry> result = new Map<String, DocStatusEntry>();
        if (String.isBlank(jsonStr)) return result;
        try {
            result = (Map<String, DocStatusEntry>) JSON.deserialize(jsonStr, Map<String, DocStatusEntry>.class);
        } catch (Exception e) { }
        return result;
    }
}