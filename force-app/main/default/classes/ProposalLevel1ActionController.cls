public without sharing class ProposalLevel1ActionController {

    // ⚠️ TEMP TEST FLAG — set to false before going live.
    // When true, skips the actual email send so no mail reaches the PI,
    // but still runs the status update logic so you can test that alone.
    private static final Boolean SKIP_EMAIL_SEND_FOR_TESTING = true;

    @AuraEnabled(cacheable=true)
    public static String getStatus(Id recordId) {
        try {
            return [
                SELECT Status
                FROM IndividualApplication
                WHERE Id = :recordId
                LIMIT 1
            ].Status;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch status: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void escalateToPI(Id recordId, String coeComments) {
        try {
            IndividualApplication app = [
                SELECT Id, Status, PI__c
                FROM IndividualApplication
                WHERE Id = :recordId
                LIMIT 1
            ];

            if (app.PI__c == null) {
                throw new AuraHandledException('PI is not linked to this application.');
            }

            // Save COE comments to the record field BEFORE sending email
            app.COE_Comments__c = coeComments;
            update app;

            User piUser = [
                SELECT Id, Email, ContactId
                FROM User
                WHERE Id = :app.PI__c
                LIMIT 1
            ];

            if (piUser.ContactId == null && piUser.Email == null) {
                throw new AuraHandledException('PI has no Contact or Email.');
            }

            String templateDevName;
            if (app.Status == 'Approved - Level 1') {
                templateDevName = 'Level_1_shortlisted_proposal_to_PI';
            } else if (app.Status == 'Rejected - Level 1') {
                templateDevName = 'Level_1_Not_shortlisted_proposal_to_PI';
            } else if (app.Status == 'Asked for Resubmission by WIN Admin') {
                templateDevName = 'WIN_asks_for_resubmission_Email_to_PI';
            } else {
                throw new AuraHandledException('No template for status: ' + app.Status);
            }

            Boolean emailSentSuccessfully;

            if (SKIP_EMAIL_SEND_FOR_TESTING) {
                // Pretend the send succeeded — no actual email goes out
                System.debug('SKIP_EMAIL_SEND_FOR_TESTING is true — email send skipped for template: ' + templateDevName);
                emailSentSuccessfully = true;
            } else {
                EmailTemplate tmpl = [
                    SELECT Id FROM EmailTemplate
                    WHERE DeveloperName = :templateDevName
                    LIMIT 1
                ];

                List<OrgWideEmailAddress> owaList = [
                    SELECT Id FROM OrgWideEmailAddress
                    WHERE Address LIKE '%wadhwanifoundation%'
                    LIMIT 1
                ];

                Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
                mail.setTemplateId(tmpl.Id);
                mail.setWhatId(app.Id);
                mail.setSaveAsActivity(false);

                if (!owaList.isEmpty()) {
                    mail.setOrgWideEmailAddressId(owaList[0].Id);
                }

                if (piUser.ContactId != null) {
                    mail.setTargetObjectId(piUser.ContactId);
                    mail.setTreatTargetObjectAsRecipient(true);
                } else {
                    mail.setTargetObjectId(piUser.Id);
                    mail.setToAddresses(new List<String>{ piUser.Email });
                }

                Messaging.SendEmailResult[] results = Messaging.sendEmail(
                    new Messaging.SingleEmailMessage[]{ mail }
                );

                emailSentSuccessfully = results[0].isSuccess();

                if (!emailSentSuccessfully) {
                    throw new AuraHandledException(
                        'Email failed: ' + results[0].getErrors()[0].getMessage()
                    );
                }
            }

            // Status transition only fires on confirmed (or simulated) success,
            // and only for the resubmission case — Approved/Rejected untouched
            if (emailSentSuccessfully && app.Status == 'Asked for Resubmission by WIN Admin') {
                app.Status = 'Asked for Resubmission by COE Admin';
                update app;
            }

        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Unexpected error: ' + e.getMessage());
        }
    }
}