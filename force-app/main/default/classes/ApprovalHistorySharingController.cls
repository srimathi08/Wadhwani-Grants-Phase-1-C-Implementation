public without sharing class ApprovalHistorySharingController {

    @AuraEnabled
    public static String shareWithPI(Id approvalHistoryId) {
        System.debug('Approval History record Id ' + approvalHistoryId);

        // 1. Get Approval History + Proposal + PI User + Comments + Status + PI Contact
        Approval_History__c ah = [
            SELECT Id,
                   Comments__c,
                   Status__c,
                   Proposal__c,
                   Proposal__r.Project_Title__c,
                   Proposal__r.PI__c,
                   Proposal__r.PI__r.Email,
                   Proposal__r.PI__r.Contact.Id,
                   Proposal__r.PI__r.Contact.Name
            FROM Approval_History__c
            WHERE Id = :approvalHistoryId
            LIMIT 1
        ];

        // Safety check
        if (ah.Proposal__r.PI__c == null || ah.Proposal__r.PI__r.Email == null) {
            throw new AuraHandledException('No PI user email found on this Proposal.');
        }

        // 2. Create Share record to PI user
        try {
            Approval_History__Share shareRecord = new Approval_History__Share();
            shareRecord.ParentId = ah.Id;
            shareRecord.UserOrGroupId = ah.Proposal__r.PI__c;
            shareRecord.AccessLevel = 'Read';
            shareRecord.RowCause = Schema.Approval_History__Share.RowCause.Manual;
            insert shareRecord;
        }
        catch (DmlException e) {
            throw new AuraHandledException(
                'Error while sharing with PI: ' + e.getMessage()
            );
        }

        // 3. Send Dynamic Email
        sendEmailToPI(
            ah.Proposal__r.PI__r.Email,
            ah.Proposal__r.PI__r.Contact.Name,
            ah.Proposal__r.Project_Title__c,
            ah.Comments__c,
            ah.Proposal__r.PI__r.Contact.Id,
            ah.Status__c
        );

        return 'SUCCESS';
    }

    // -----------------------------
    // Email Helper Method (Dynamic)
    // -----------------------------
    private static void sendEmailToPI(
        String toEmail,
        String piName,
        String projectTitle,
        String comments,
        Id contactId,
        String status
    ) {

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();

        mail.setToAddresses(new String[] { toEmail });
        mail.setTargetObjectId(contactId);
        mail.setSaveAsActivity(true);

        String subject;
        String body;

        // -----------------------------
        // STATUS BASED EMAIL LOGIC
        // -----------------------------
        if (status == 'Approved') {

            subject = 'Proposal Approved';

            body =
                'Hello ' + piName + ',\n\n' +
                'We are pleased to inform you that your application titled "' + projectTitle + '" has been approved.\n\n' +
                'Congratulations!\n\n' +
                'Regards,\n' +
                'WIN Team';

        } else if (status == 'Rejected') {

            subject = 'Proposal Rejected';

            body =
                'Hello ' + piName + ',\n\n' +
                'Following the review of the application titled "' + projectTitle + '", ' +
                'we regret to inform you that it has been rejected.\n\n' +
                'Comments:\n' +
                (comments != null ? comments : 'No comments provided') + '\n\n' +
                'Regards,\n' +
                'WIN Team';

        } else if (status == 'Resubmit' || status == 'Resubmitted Back') {

            subject = 'Proposal Resubmitted – Action Required';

            body =
                'Hello ' + piName + ',\n\n' +
                'Following the review of the application titled "' + projectTitle + '", ' +
                'the WIN COE has requested resubmission addressing the below mentioned comments:\n\n' +
                'Comments:\n' +
                (comments != null ? comments : 'No comments provided') + '\n\n' +
                'Regards,\n' +
                'WIN Team';

        } else if (status == 'Submitted') {

            subject = 'Proposal Submitted';

            body =
                'Hello ' + piName + ',\n\n' +
                'Your application titled "' + projectTitle + '" has been successfully submitted.\n\n' +
                'It is currently under review.\n\n' +
                'Regards,\n' +
                'WIN Team';

        } else {

            subject = 'Proposal Update - ' + status;

            body =
                'Hello ' + piName + ',\n\n' +
                'There is an update on your application titled "' + projectTitle + '".\n\n' +
                'Comments:\n' +
                (comments != null ? comments : 'No comments provided') + '\n\n' +
                'Regards,\n' +
                'WIN Team';
        }

        mail.setSubject(subject);
        mail.setPlainTextBody(body);

        Messaging.sendEmail(
            new Messaging.SingleEmailMessage[] { mail }
        );
    }

    // -----------------------------
    // EXISTING METHOD (UNCHANGED)
    // -----------------------------
    @AuraEnabled
    public static String askToWIN(Id approvalHistoryId, String comment) {
        System.debug('Approval History record Id ' + approvalHistoryId);

        Approval_History__c ah = [
            SELECT Id, Status__c, Question_from_Coe__c
            FROM Approval_History__c
            WHERE Id = :approvalHistoryId
            LIMIT 1
        ];

        ah.Status__c = 'Question from Coe';
        ah.Question_from_Coe__c = comment;

        update ah;

        return 'SUCCESS';
    }
}