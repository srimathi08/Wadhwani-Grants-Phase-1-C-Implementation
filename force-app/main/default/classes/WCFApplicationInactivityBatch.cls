public without sharing class WCFApplicationInactivityBatch implements Database.Batchable<sObject>, Database.Stateful, Schedulable {

    public static final String STATUS_DRAFT              = 'Draft';
    public static final String STATUS_REVISION_REQUESTED = 'Revision Requested';
    public static final String STATUS_SUSPENDED          = 'Application Suspended';

    public static final String REASON_DRAFT_100    = 'Draft Inactivity (100 Days)';
    public static final String REASON_REVISION_100 = 'Revision Requested Inactivity (100 Days)';

    private static final String ORG_WIDE_EMAIL = 'grants.support@wadhwanifoundation.org';
    private static final String DRAFT_TEMPLATE = 'Application_Suspended_Draft_Inactivity';
    private static final String REVISION_TEMPLATE = 'Application_Suspended_Revision_Inactivity';

    private Integer daysThreshold;

    public WCFApplicationInactivityBatch() {
        this(100);
    }

    public WCFApplicationInactivityBatch(Integer days) {
        this.daysThreshold = (days != null && days > 0) ? days : 100;
    }

    // ── Schedulable execution ──
    public void execute(SchedulableContext sc) {
        Database.executeBatch(new WCFApplicationInactivityBatch(100), 50);
    }

    // ── Batchable start ──
    public Database.QueryLocator start(Database.BatchableContext bc) {
        DateTime cutoff = System.now().addDays(-this.daysThreshold);
        return Database.getQueryLocator([
            SELECT Id, Name, Status, Organization_Name__c, AccountId,
                   Account.IsPersonAccount, Account.PersonContactId,
                   ContactId, CreatedById, OwnerId, Submitter_Name__c, LastModifiedDate, CreatedDate,
                   Revision_Requested_Date__c, Suspension_Reason__c, Suspension_Date__c
            FROM IndividualApplication
            WHERE Status IN (:STATUS_DRAFT, :STATUS_REVISION_REQUESTED)
            WITH SYSTEM_MODE
        ]);
    }

    // ── Batchable execute ──
    public void execute(Database.BatchableContext bc, List<IndividualApplication> scope) {
        DateTime cutoff = System.now().addDays(-this.daysThreshold);
        List<IndividualApplication> toSuspend = new List<IndividualApplication>();
        Map<Id, String> emailTemplateMap = new Map<Id, String>();

        for (IndividualApplication app : scope) {
            Boolean shouldSuspend = false;
            String reason = null;
            String templateName = null;

            if (app.Status == STATUS_DRAFT) {
                // Inactivity on Draft: 100 days since last modification
                if (app.LastModifiedDate != null && app.LastModifiedDate <= cutoff) {
                    shouldSuspend = true;
                    reason = REASON_DRAFT_100;
                    templateName = DRAFT_TEMPLATE;
                }
            } else if (app.Status == STATUS_REVISION_REQUESTED) {
                // Inactivity on Revision: 100 days since revision requested (or last modified)
                DateTime revDate = app.Revision_Requested_Date__c != null ? app.Revision_Requested_Date__c : app.LastModifiedDate;
                if (revDate != null && revDate <= cutoff) {
                    shouldSuspend = true;
                    reason = REASON_REVISION_100;
                    templateName = REVISION_TEMPLATE;
                }
            }

            if (shouldSuspend) {
                app.Status = STATUS_SUSPENDED;
                app.Suspension_Reason__c = reason;
                app.Suspension_Date__c = System.today();
                toSuspend.add(app);
                emailTemplateMap.put(app.Id, templateName);
            }
        }

        if (!toSuspend.isEmpty()) {
            update as system toSuspend;
            sendSuspensionEmails(toSuspend, emailTemplateMap);
        }
    }

    // ── Batchable finish ──
    public void finish(Database.BatchableContext bc) {
        System.debug(LoggingLevel.INFO, 'WCFApplicationInactivityBatch completed.');
    }

    // ── Helper: Send HTML notification emails on the 100th day ──
    private static void sendSuspensionEmails(List<IndividualApplication> apps, Map<Id, String> templateMap) {
        Map<String, Id> templatesByName = new Map<String, Id>();
        for (EmailTemplate et : [
            SELECT Id, DeveloperName 
            FROM EmailTemplate 
            WHERE DeveloperName IN (:DRAFT_TEMPLATE, :REVISION_TEMPLATE)
        ]) {
            templatesByName.put(et.DeveloperName, et.Id);
        }

        Id oweaId = null;
        List<OrgWideEmailAddress> oweaList = [
            SELECT Id FROM OrgWideEmailAddress WHERE Address = :ORG_WIDE_EMAIL LIMIT 1
        ];
        if (!oweaList.isEmpty()) {
            oweaId = oweaList[0].Id;
        }

        List<Messaging.SingleEmailMessage> emailsToSend = new List<Messaging.SingleEmailMessage>();

        for (IndividualApplication app : apps) {
            String tName = templateMap.get(app.Id);
            Id templateId = templatesByName.get(tName);
            if (templateId == null) continue;

            Id targetRecipientId = app.ContactId;
            if (targetRecipientId == null && app.Account != null && app.Account.IsPersonAccount) {
                targetRecipientId = app.Account.PersonContactId;
            }
            if (targetRecipientId == null) {
                targetRecipientId = app.CreatedById != null ? app.CreatedById : app.OwnerId;
            }

            if (targetRecipientId != null) {
                Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
                mail.setTemplateId(templateId);
                mail.setTargetObjectId(targetRecipientId);
                mail.setWhatId(app.Id);
                mail.setSaveAsActivity(false);
                if (oweaId != null) {
                    mail.setOrgWideEmailAddressId(oweaId);
                }
                emailsToSend.add(mail);
            }
        }

        if (!emailsToSend.isEmpty()) {
            try {
                Messaging.sendEmail(emailsToSend, false);
            } catch (Exception e) {
                System.debug(LoggingLevel.ERROR, 'Error sending suspension emails: ' + e.getMessage());
            }
        }
    }

    // ── Convenience launcher for Anonymous Apex / Testing ──
    public static Id runNow() {
        return Database.executeBatch(new WCFApplicationInactivityBatch(100), 50);
    }
}