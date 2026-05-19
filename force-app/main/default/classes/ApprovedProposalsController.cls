public with sharing class ApprovedProposalsController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getApprovedProposals(Integer pageNumber, Integer pageSize) {

        System.debug('--- getApprovedProposals START ---');
        System.debug('pageNumber: ' + pageNumber + ', pageSize: ' + pageSize);

        Map<String, Object> result = new Map<String, Object>();
        Integer offsetValue = (pageNumber - 1) * pageSize;
        System.debug('offsetValue: ' + offsetValue);

        // Fetch proposals
        List<IndividualApplication> apps = [
            SELECT Id, Name, Project_Title__c, Status,
                   Account.Name, COE_Approver__r.Email, PI_User_email__c
            FROM IndividualApplication
            WHERE Status = 'Approved - Level 1'
               OR Status = 'Submitted Back - Approved for Funding Resubmission'
            ORDER BY CreatedDate DESC
            LIMIT :pageSize OFFSET :offsetValue
        ];

        System.debug('Fetched Applications size: ' + apps.size());

        List<Map<String, Object>> recordsList = new List<Map<String, Object>>();

        for (IndividualApplication app : apps) {
            System.debug('Processing Application Id: ' + app.Id);

            Map<String, Object> rec = new Map<String, Object>();
            rec.put('Id', app.Id);
            rec.put('Name', app.Name);
            rec.put('Project_Title__c', app.Project_Title__c);
            rec.put('Status', app.Status);
            rec.put('AccountName', app.Account != null ? app.Account.Name : '');

            recordsList.add(rec);
        }

        result.put('records', recordsList);

        // Pagination count
        Integer totalRecords = [
            SELECT count()
            FROM IndividualApplication
            WHERE Status = 'Approved - Level 1'
        ];

        System.debug('totalRecords: ' + totalRecords);

        result.put(
            'totalPages',
            (Integer)Math.ceil((Double)totalRecords / pageSize)
        );

        // Card counts
        result.put('approvedCount', totalRecords);
        result.put(
            'fundingCount',
            [SELECT count() FROM IndividualApplication WHERE Status = 'Approved for Funding']
        );
        result.put(
            'notRecommendedCount',
            [SELECT count() FROM IndividualApplication WHERE Status = 'Not Recommended for Funding']
        );
        result.put(
            'resubmissionCount',
            [SELECT count() FROM IndividualApplication WHERE Status = 'Approved with Resubmission']
        );

        System.debug('--- getApprovedProposals END ---');
        return result;
    }

    // ---------------------------------------------

    @AuraEnabled
    public static void handleProposalAction(Id recordId, String actionValue, String comments) {

        System.debug('--- handleProposalAction START ---');
        System.debug('recordId: ' + recordId);
        System.debug('actionValue: ' + actionValue);
        System.debug('comments: ' + comments);

        IndividualApplication app = [
            SELECT Id, Name, Status,
                   COE_Approver__r.Email,
                   PI_User_email__c,
                   Funding_Year__c
            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ];

        System.debug('Fetched Application: ' + app);

        // Existing logic
        app.Status = actionValue;

        // ✅ Capture Funding Year as TEXT when Approved for Funding
        if (actionValue == 'Approved for Funding' && app.Funding_Year__c == null) {
            app.Funding_Year__c = String.valueOf(Date.today().year());
            System.debug('Funding Year set to: ' + app.Funding_Year__c);
        }

        if (actionValue == 'Approved with Resubmission') {
            app.Funding_Approval_Resubmission__c = true;
            System.debug('Set Funding_Approval_Resubmission__c = true');
        }

        update app;
        System.debug('Application updated successfully');

        ApplicationDecision decision = new ApplicationDecision(
            ApplicationId = recordId,
            ApplicationDecision = actionValue,
            Comment = comments
        );

        insert decision;
        System.debug('ApplicationDecision inserted');

        sendNotificationEmail(app, actionValue, comments);

        System.debug('--- handleProposalAction END ---');
    }

    // ---------------------------------------------

    private static void sendNotificationEmail(
        IndividualApplication app,
        String status,
        String comments
    ) {
        System.debug('--- sendNotificationEmail START ---');

        List<String> recipients = new List<String>();

        if (app.COE_Approver__r != null && app.COE_Approver__r.Email != null) {
            recipients.add(app.COE_Approver__r.Email);
        }

        if (app.PI_User_email__c != null) {
            recipients.add(app.PI_User_email__c);
        }

        System.debug('Email Recipients: ' + recipients);

        if (recipients.isEmpty()) {
            System.debug('No recipients found. Skipping email.');
            return;
        }

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(recipients);
        mail.setSubject('Funding Decision Notification');
        mail.setPlainTextBody(
            'Application ' + app.Name +
            ' is ' + status +
            ' with comments: ' + comments
        );

        Messaging.sendEmail(
            new Messaging.SingleEmailMessage[] { mail }
        );

        System.debug('Email sent successfully');
        System.debug('--- sendNotificationEmail END ---');
    }
}