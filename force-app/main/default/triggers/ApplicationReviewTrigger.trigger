/*trigger ApplicationReviewTrigger on ApplicationReview (before insert, before update, after insert, after update) {

    if (Trigger.isBefore) {
        for (ApplicationReview ar : Trigger.new) {

            ApplicationReview oldRec = Trigger.isUpdate ? Trigger.oldMap.get(ar.Id) : null;

            Boolean justSealed = ar.Status == 'Validated'
                && (oldRec == null || oldRec.Status != 'Validated');

            // ── Set submission date & due date ──
            if (justSealed && ar.Validator_Submission_Date__c == null) {
                Date today = Date.today();
                ar.Validator_Submission_Date__c = today;
                ar.DueDate = ApplicationReviewHandler.addWorkingDays(today, 10);
            }

            // ── NEW: Override Status based on Validator decision ──
            if (justSealed) {
                Id validatorRtId = Schema.SObjectType.ApplicationReview
                    .getRecordTypeInfosByDeveloperName()
                    .get('WCF_Validator')
                    .getRecordTypeId();

                if (ar.RecordTypeId == validatorRtId) {
                    String decision = ar.Decision_Final_Decision_from_Sec_1_2__c;
                    if (decision == 'Flag') {
                        ar.Status = 'Flagged';
                    } else if (decision == 'Return') {
                        ar.Status = 'Revision Request';
                    }
                    // 'Pass' stays 'Sealed'
                }
            }
        }
    }

    if (Trigger.isAfter) {

        Id validatorRtId = Schema.SObjectType.ApplicationReview
            .getRecordTypeInfosByDeveloperName()
            .get('WCF_Validator')
            .getRecordTypeId();

        Set<Id> returnAppIds   = new Set<Id>();
        Set<Id> passAppIds     = new Set<Id>();
        Set<Id> flagAppIds     = new Set<Id>();
        Set<Id> reviewedAppIds = new Set<Id>();

        for (ApplicationReview ar : Trigger.new) {
            ApplicationReview oldRec = Trigger.isUpdate ? Trigger.oldMap.get(ar.Id) : null;

            // ── Validator: detect the transition (old was 'Sealed', new may be 'Flaged'/'Revision Request'/'Sealed') ──
            Boolean wasJustProcessed = ar.RecordTypeId == validatorRtId
                && (oldRec == null || oldRec.Status != ar.Status)
                && (ar.Status == 'Validated' || ar.Status == 'Flagged' || ar.Status == 'Revision Request');

            if (wasJustProcessed && ar.ApplicationId != null) {
                String decision = ar.Decision_Final_Decision_from_Sec_1_2__c;
                if (decision == 'Return') {
                    returnAppIds.add(ar.ApplicationId);
                } else if (decision == 'Pass') {
                    passAppIds.add(ar.ApplicationId);
                } else if (decision == 'Flag') {
                    flagAppIds.add(ar.ApplicationId);
                }
            }

            Boolean justReviewed = ar.RecordTypeId != validatorRtId
                && ar.Status == 'Review Submitted'
                && (oldRec == null || oldRec.Status != 'Review Submitted');

            if (justReviewed && ar.ApplicationId != null) {
                reviewedAppIds.add(ar.ApplicationId);
            }
        }

        Set<Id> allAppIds = new Set<Id>();
        allAppIds.addAll(returnAppIds);
        allAppIds.addAll(passAppIds);
        allAppIds.addAll(flagAppIds);
        allAppIds.addAll(reviewedAppIds);

        if (!allAppIds.isEmpty()) {
            List<IndividualApplication> appsToUpdate = [
                SELECT Id, Status, Validated__c, Flagged__c
                FROM IndividualApplication
                WHERE Id IN :allAppIds
            ];

            for (IndividualApplication app : appsToUpdate) {
                if (returnAppIds.contains(app.Id)) {
                    app.Status = 'Revision Requested';
                }
                if (passAppIds.contains(app.Id)) {
                    app.Validated__c = true;
                }
                if (flagAppIds.contains(app.Id)) {
                    app.Flagged__c = true;
                    
                }
                if (reviewedAppIds.contains(app.Id)) {
                    app.Status = 'Review Completed - Recommended';
                }
            }

            Database.SaveResult[] results = Database.update(appsToUpdate, false);
            for (Database.SaveResult sr : results) {
                if (!sr.isSuccess()) {
                    for (Database.Error err : sr.getErrors()) {
                        System.debug('Trigger update error: ' + err.getMessage());
                    }
                }
            }
        }
    }
} */



trigger ApplicationReviewTrigger on ApplicationReview (before insert, before update, after insert, after update) {

    if (Trigger.isBefore) {

        // Populate Consolidated Return Comments field
        ApplicationReviewHandler.populateConsolidatedComments(
            Trigger.new,
            Trigger.isUpdate ? Trigger.oldMap : null
        );

        for (ApplicationReview ar : Trigger.new) {

            ApplicationReview oldRec = Trigger.isUpdate ? Trigger.oldMap.get(ar.Id) : null;

            Boolean justSealed = ar.Status == 'Validated'
                && (oldRec == null || oldRec.Status != 'Validated');

            // Set submission date & due date
            if (justSealed && ar.Validator_Submission_Date__c == null) {
                Date today = Date.today();
                ar.Validator_Submission_Date__c = today;
                ar.DueDate = ApplicationReviewHandler.addWorkingDays(today, 10);
            }

            // Override Status based on Validator decision
            if (justSealed) {
                Id validatorRtId = Schema.SObjectType.ApplicationReview
                    .getRecordTypeInfosByDeveloperName()
                    .get('WCF_Validator')
                    .getRecordTypeId();

                if (ar.RecordTypeId == validatorRtId) {
                    String decision = ar.Decision_Final_Decision_from_Sec_1_2__c;

                    if (decision == 'Flag') {
                        ar.Status = 'Flagged';
                    } else if (decision == 'Return') {
                        ar.Status = 'Revision Request';
                    }
                    // Pass remains Validated
                }
            }
        }
    }

    if (Trigger.isAfter) {

        Id validatorRtId = Schema.SObjectType.ApplicationReview
            .getRecordTypeInfosByDeveloperName()
            .get('WCF_Validator')
            .getRecordTypeId();

        Set<Id> returnAppIds = new Set<Id>();
        Set<Id> passAppIds = new Set<Id>();
        Set<Id> flagAppIds = new Set<Id>();
        

        for (ApplicationReview ar : Trigger.new) {

            ApplicationReview oldRec = Trigger.isUpdate ? Trigger.oldMap.get(ar.Id) : null;

            Boolean wasJustProcessed = ar.RecordTypeId == validatorRtId
                && (oldRec == null || oldRec.Status != ar.Status)
                && (ar.Status == 'Validated'
                    || ar.Status == 'Flagged'
                    || ar.Status == 'Revision Request');

            if (wasJustProcessed && ar.ApplicationId != null) {

                String decision = ar.Decision_Final_Decision_from_Sec_1_2__c;

                if (decision == 'Return') {
                    returnAppIds.add(ar.ApplicationId);
                } else if (decision == 'Pass') {
                    passAppIds.add(ar.ApplicationId);
                } else if (decision == 'Flag') {
                    flagAppIds.add(ar.ApplicationId);
                }
            }

        }

        Set<Id> allAppIds = new Set<Id>();
        allAppIds.addAll(returnAppIds);
        allAppIds.addAll(passAppIds);
        allAppIds.addAll(flagAppIds);
      

        if (!allAppIds.isEmpty()) {

            List<IndividualApplication> appsToUpdate = [
                SELECT Id,
                       Status,
                       Validated__c,
                       Flagged__c
                FROM IndividualApplication
                WHERE Id IN :allAppIds
            ];

            for (IndividualApplication app : appsToUpdate) {

                if (returnAppIds.contains(app.Id)) {
                    app.Status = 'Revision Requested';
                    app.WG_Validator_Name__c = UserInfo.getName();
                }

                if (passAppIds.contains(app.Id)) {
                    app.Validated__c = true;
                    app.WG_Validator_Name__c = UserInfo.getName();
                }

                if (flagAppIds.contains(app.Id)) {
                    app.Flagged__c = true;
                    app.WG_Validator_Name__c = UserInfo.getName();
                }

              
            }

            Database.SaveResult[] results = Database.update(appsToUpdate, false);

            for (Database.SaveResult sr : results) {
                if (!sr.isSuccess()) {
                    for (Database.Error err : sr.getErrors()) {
                        System.debug('Trigger update error: ' + err.getMessage());
                    }
                }
            }
        }
    }
}