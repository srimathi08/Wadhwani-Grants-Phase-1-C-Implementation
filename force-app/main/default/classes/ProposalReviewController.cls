public without sharing class ProposalReviewController {
     private static final Set<String> DECIDED_STATUSES = new Set<String>{
        'Approved - Level 1',
        'Rejected - Level 1',
        'Approved for Funding',
        'Rejected for Funding',
        'Shortlisted',
        'Under Review - Level 2',
        'Funded',
        'Closed'
    };

    /* =====================================================
       ENV-SPECIFIC FIELD RESOLUTION (Sandbox vs Production)
       Sandbox: Reviewer__c   |   Production (Person Accounts): Reviewer__pc
    ===================================================== */
    private static String reviewerFieldApiName;

    private static String getReviewerFieldApiName() {
        if (reviewerFieldApiName == null) {
            Map<String, Schema.SObjectField> acctFields =
                Schema.SObjectType.Account.fields.getMap();

            reviewerFieldApiName = acctFields.containsKey('reviewer__pc')
                ? 'Reviewer__pc'
                : 'Reviewer__c';
        }
        return reviewerFieldApiName;
    }

    /* =====================================================
       WRAPPERS
    ===================================================== */
    public class ProposalWrapper {
        @AuraEnabled public Id proposalId;
        @AuraEnabled public String proposalName;
        @AuraEnabled public String projectTitle;
        @AuraEnabled public String primaryFocusArea;
        @AuraEnabled public List<ReviewWrapper> reviews;
        @AuraEnabled public Boolean disableApprove;
        @AuraEnabled public Boolean decisionTaken;
        @AuraEnabled public String finalDecision;
    }

    public class ReviewWrapper {
        @AuraEnabled public String reviewerName;
        @AuraEnabled public String reviewStatus;
        @AuraEnabled public String reviewStatusClass;
    }

    /* =====================================================
       FETCH COE ACCOUNTS (Dropdown)
    ===================================================== */
    @AuraEnabled(cacheable=true)
    public static List<Account> getCOEAccounts() {

        Id coeRtId = Schema.SObjectType.Account
            .getRecordTypeInfosByName()
            .get('COE')
            .getRecordTypeId();

        return [
            SELECT Id, Name
            FROM Account
            WHERE RecordTypeId = :coeRtId
            AND IsDeleted = false
            ORDER BY Name ASC
        ];
    }

    /* =====================================================
       FETCH PROJECT PROPOSALS
    ===================================================== */
    @AuraEnabled(cacheable=true)
    public static List<ProposalWrapper> getSubmittedProposals(Id coeId) {

        Id rtId = Schema.SObjectType.IndividualApplication
            .getRecordTypeInfosByName()
            .get('Project Proposal')
            .getRecordTypeId();

        List<IndividualApplicationShare> shares = [
            SELECT ParentId, UserOrGroupId
            FROM IndividualApplicationShare
            WHERE Parent.RecordTypeId = :rtId
        ];

        if (shares.isEmpty()) return new List<ProposalWrapper>();

        Set<Id> proposalIds   = new Set<Id>();
        Set<Id> sharedUserIds = new Set<Id>();

        for (IndividualApplicationShare s : shares) {
            if (String.valueOf(s.UserOrGroupId).startsWith('005')) {
                proposalIds.add(s.ParentId);
                sharedUserIds.add(s.UserOrGroupId);
            }
        }

        if (proposalIds.isEmpty()) return new List<ProposalWrapper>();

        Map<Id, User> reviewerMap = new Map<Id, User>();

        // Dynamic SOQL: reviewer flag field name differs between orgs
        // (Reviewer__c in Sandbox, Reviewer__pc in Production/Person Accounts).
        String reviewerField = 'Contact.Account.' + getReviewerFieldApiName();

        String userQuery =
            'SELECT Id, Name, ContactId, Contact.Name, ' + reviewerField +
            ' FROM User' +
            ' WHERE Id IN :sharedUserIds' +
            ' AND IsActive = true';

        for (User u : Database.query(userQuery)) {
            if (u.Contact != null && u.Contact.Account != null) {
                Object reviewerVal = u.Contact.Account.get(getReviewerFieldApiName());
                if (reviewerVal == true) {
                    reviewerMap.put(u.Id, u);
                }
            }
        }

        if (reviewerMap.isEmpty()) return new List<ProposalWrapper>();

        // Fetch proposals with optional COE filter
        List<IndividualApplication> proposalList;

        if (coeId != null) {
            proposalList = [
                SELECT Id, Name, Status,
                       Project_Title__c, Primary_Focus_Area__c,
                       WIN_Level1_Decision_Label__c
                FROM IndividualApplication
                WHERE Id IN :proposalIds
                AND RecordTypeId = :rtId
                AND AccountId = :coeId
            ];
        } else {
            proposalList = [
                SELECT Id, Name, Status,
                       Project_Title__c, Primary_Focus_Area__c,
                       WIN_Level1_Decision_Label__c
                FROM IndividualApplication
                WHERE Id IN :proposalIds
                AND RecordTypeId = :rtId
            ];
        }

        Map<Id, IndividualApplication> proposalMap =
            new Map<Id, IndividualApplication>(proposalList);

        if (proposalMap.isEmpty()) return new List<ProposalWrapper>();

        Map<String, ApplicationReview> reviewMap = new Map<String, ApplicationReview>();

        for (ApplicationReview ar : [
            SELECT ApplicationId, ReviewedById,
                   Final_recommendation_ExternalReviewer__c, CreatedDate
            FROM ApplicationReview
            WHERE ApplicationId IN :proposalMap.keySet()
            ORDER BY CreatedDate DESC
        ]) {
            String key = ar.ReviewedById + '-' + ar.ApplicationId;
            if (!reviewMap.containsKey(key)) {
                reviewMap.put(key, ar);
            }
        }

        Map<Id, ProposalWrapper> resultMap = new Map<Id, ProposalWrapper>();

        for (IndividualApplicationShare s : shares) {

            Id proposalId = s.ParentId;
            Id reviewerId = s.UserOrGroupId;

            if (!proposalMap.containsKey(proposalId)) continue;
            if (!reviewerMap.containsKey(reviewerId)) continue;

            if (!resultMap.containsKey(proposalId)) {

                IndividualApplication app = proposalMap.get(proposalId);

                // The Level-1 decision label is stamped ONCE at approve/reject time
                // and never overwritten afterwards, so it stays static even as
                // Status__c keeps progressing through later stages.
                Boolean hasLevel1Decision = String.isNotBlank(app.WIN_Level1_Decision_Label__c);

                ProposalWrapper pw      = new ProposalWrapper();
                pw.proposalId           = app.Id;
                pw.proposalName         = app.Name;
                pw.projectTitle         = app.Project_Title__c;
                pw.primaryFocusArea     = app.Primary_Focus_Area__c;
                pw.reviews              = new List<ReviewWrapper>();
                pw.decisionTaken        = hasLevel1Decision;
                pw.finalDecision        = hasLevel1Decision ? app.WIN_Level1_Decision_Label__c : null;
                pw.disableApprove       = false;

                resultMap.put(proposalId, pw);
            }

            ProposalWrapper pw = resultMap.get(proposalId);
            ReviewWrapper rw   = new ReviewWrapper();

            User u          = reviewerMap.get(reviewerId);
            rw.reviewerName = (u.ContactId != null) ? u.Contact.Name : u.Name;

            String key = reviewerId + '-' + proposalId;

            // This is the RAW stored API Name value from the picklist field.
            // Renaming the picklist Label in Setup does NOT change what SOQL
            // returns here -- SOQL always returns the API Name, not the Label.
            String recommendation = reviewMap.containsKey(key)
                ? reviewMap.get(key).Final_recommendation_ExternalReviewer__c
                : null;

            // Map the raw API Name to the desired display label.
            // Keep comparisons below against the ORIGINAL API Name values --
            // only what gets shown on screen (reviewStatus) changes.
            String displayRecommendation = recommendation;
            if (recommendation == 'Recommended for Funding') {
                displayRecommendation = 'Shortlisted';
            } else if (recommendation == 'Not Recommended for Funding') {
                displayRecommendation = 'Not Shortlisted';
            }

            rw.reviewStatus = displayRecommendation;

            if (recommendation == 'Recommended for Funding') {
                rw.reviewStatusClass = 'status-recommended';
            } else if (recommendation == 'Not Recommended for Funding') {
                rw.reviewStatusClass = 'status-rejected';
            } else {
                rw.reviewStatusClass = '';
                pw.disableApprove    = true;
            }

            pw.reviews.add(rw);
        }

        return resultMap.values();
    }

    /* =====================================================
       UPDATE STATUS + CREATE HISTORY + SEND EMAIL
    ===================================================== */
    @AuraEnabled
    public static void updateProposalStatus(
        Id proposalId,
        String actionType,
        String comments
    ) {

        IndividualApplication app = [
            SELECT Id, Status, Name, Project_Title__c, AccountId, Coe_Approver__c,
                   WIN_Level1_Decision_Label__c
            FROM IndividualApplication
            WHERE Id = :proposalId
            LIMIT 1
        ];

        // Guard: Level-1 decision is a one-time, permanent action
        if (String.isNotBlank(app.WIN_Level1_Decision_Label__c)) {
            return;
        }

        String historyStatus;
        String historyNamePrefix;

        if (actionType == 'approve') {
            app.Status                        = 'Approved - Level 1';
            app.WIN_Level1_Decision_Label__c  = 'Shortlisted for presentation';
            historyStatus                     = 'Approved';
            historyNamePrefix                 = 'Approved by ';

        } else if (actionType == 'reject') {
            app.Status                        = 'Rejected - Level 1';
            app.WIN_Level1_Decision_Label__c  = 'Not shortlisted for presentation';
            historyStatus                     = 'Rejected';
            historyNamePrefix                 = 'Rejected by ';
        }

        // Store modal comments on the Proposal record
        app.WIN_Approval_Comments__c = comments;

        update app;

        // Store modal comments in Comments__c on Approval History
        Approval_History__c history = new Approval_History__c(
            Name           = historyNamePrefix + UserInfo.getName(),
            Status__c      = historyStatus,
            Assigned_To__c = UserInfo.getUserId(),
            Proposal__c    = proposalId,
            Comments__c    = comments
        );
        insert history;

        // Share Approval History with COE Approver
        if (app.Coe_Approver__c != null) {
            try {
                Approval_History__Share sh = new Approval_History__Share();
                sh.ParentId      = history.Id;
                sh.UserOrGroupId = app.Coe_Approver__c;
                sh.AccessLevel   = 'Read';
                sh.RowCause      = Schema.Approval_History__Share.RowCause.Manual;
                insert sh;
            } catch (Exception e) {
                System.debug('Error creating share: ' + e.getMessage());
            }
        }

        /* ================= EMAIL ================= 
        if (actionType == 'approve') {

            List<Contact> coeAdmins = [
                SELECT Name, Email
                FROM Contact
                WHERE AccountId = :app.AccountId
                AND COE_Admin__c = true
                LIMIT 1
            ];

            if (!coeAdmins.isEmpty() && coeAdmins[0].Email != null) {

                Contact coeAdmin = coeAdmins[0];

                String logoUrl = 'https://wadhwanifoundation--wfdev.sandbox.my.salesforce.com/resource/1742137566000/WIN_Logo';

                String subject = 'Application Shortlisted for Presentation – '
                                 + app.Name + ': ' + app.Project_Title__c;

                String projectTitle = app.Project_Title__c != null
                                      ? app.Project_Title__c
                                      : app.Name;

                String body =
                    '<div style="background:#f4f6f9; padding:20px; text-align:center;">' +
                        '<img src="' + logoUrl + '" style="width:200px; margin-bottom:20px;" />' +
                        '<div style="background:white; padding:25px; text-align:left; border-radius:6px;">' +
                            '<p>Dear ' + coeAdmin.Name + ',</p>' +
                            '<p>We are pleased to inform you that the application titled "<b>'
                                + projectTitle +
                            '</b>" submitted by your Center of Excellence (COE) has been shortlisted for presentation before the Selection Committee.</p>' +
                            '<p>This shortlisting reflects the strength and potential of your proposal. Further details regarding the presentation schedule, guidelines, and next steps will be shared with you shortly.</p>' +
                            '<p>We congratulate the entire COE team on reaching this important stage and wish you the very best for the upcoming presentation.</p>' +
                            '<br/>' +
                            '<p>Sincerely,<br/>Wadhwani Foundation</p>' +
                        '</div>' +
                    '</div>';

                Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
                mail.setToAddresses(new List<String>{ coeAdmin.Email });
                mail.setSubject(subject);
                mail.setHtmlBody(body);
                mail.setSaveAsActivity(true);
                mail.setReplyTo('no-reply@wadhwanifoundation.org');
                mail.setSenderDisplayName('Wadhwani Foundation');

                Messaging.SendEmailResult[] results =
                    Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ mail });

                if (results != null && results.size() > 0) {
                    if (!results[0].isSuccess()) {
                        System.debug('EMAIL FAILED: ' + results[0].getErrors()[0].getMessage());
                    } else {
                        System.debug('EMAIL SENT SUCCESSFULLY');
                    }
                }

            } else {
                System.debug('NO COE ADMIN FOUND OR EMAIL EMPTY');
            } 
        }*/
    }
}