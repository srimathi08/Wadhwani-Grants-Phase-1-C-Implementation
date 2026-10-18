public without sharing class WCFComplianceDocumentTriggerHandler {

    // ─────────────────────────────────────────────────────────────
    // Synchronize IndividualApplication.Status based on reviewer
    // compliance decisions and executed grant agreements:
    //   - Any doc Rejected   -> 'Onboarding Rejected'
    //   - Any doc Suspended  -> 'Onboarding Suspended'
    //   - All Validated:
    //       - Active Grant Agreement exists -> 'Onboarded'
    //       - Otherwise                     -> 'Onboarding Approved'
    // ─────────────────────────────────────────────────────────────
    public static void syncOnboardedStatus(Set<Id> applicationIds) {
        if (applicationIds == null || applicationIds.isEmpty()) return;

        List<IndividualApplication> toUpdate = new List<IndividualApplication>();

        List<IndividualApplication> apps = [
            SELECT Id, Status
            FROM   IndividualApplication
            WHERE  Id IN :applicationIds
            WITH   SYSTEM_MODE
        ];

        // Query all compliance documents for these applications
        Map<Id, List<WCF_Compliance_Document__c>> docsByApp = new Map<Id, List<WCF_Compliance_Document__c>>();
        for (WCF_Compliance_Document__c doc : [
            SELECT Id, Status__c, Document_Status_JSON__c, IndividualApplication__c
            FROM   WCF_Compliance_Document__c
            WHERE  IndividualApplication__c IN :applicationIds
            WITH   SYSTEM_MODE
        ]) {
            if (!docsByApp.containsKey(doc.IndividualApplication__c)) {
                docsByApp.put(doc.IndividualApplication__c, new List<WCF_Compliance_Document__c>());
            }
            docsByApp.get(doc.IndividualApplication__c).add(doc);
        }

        // Query active agreements
        Set<Id> appsWithActiveAgreement = new Set<Id>();
        for (WCF_Executed_Agreement__c ag : [
            SELECT IndividualApplication__c
            FROM   WCF_Executed_Agreement__c
            WHERE  IndividualApplication__c IN :applicationIds
              AND  Status__c = 'Active'
            WITH   SYSTEM_MODE
        ]) {
            appsWithActiveAgreement.add(ag.IndividualApplication__c);
        }

        for (IndividualApplication app : apps) {
            List<WCF_Compliance_Document__c> appDocs = docsByApp.get(app.Id);
            if (appDocs == null || appDocs.isEmpty()) continue;

            Boolean hasRejected  = false;
            Boolean hasSuspended = false;
            Boolean anyValidated = false;

            for (WCF_Compliance_Document__c doc : appDocs) {
                if (doc.Status__c == 'Rejected') {
                    hasRejected = true;
                } else if (doc.Status__c == 'Suspended') {
                    hasSuspended = true;
                } else if (doc.Status__c == 'Validated') {
                    anyValidated = true;
                }

                // Check inside ad hoc JSON entries if present
                if (String.isNotBlank(doc.Document_Status_JSON__c)) {
                    try {
                        Map<String, Object> statusMap = (Map<String, Object>) JSON.deserializeUntyped(doc.Document_Status_JSON__c);
                        for (Object entryObj : statusMap.values()) {
                            if (entryObj instanceof Map<String, Object>) {
                                Map<String, Object> entry = (Map<String, Object>) entryObj;
                                String st = (String) entry.get('status');
                                if (st == 'Rejected' || st == 'Reject') hasRejected = true;
                                if (st == 'Suspended' || st == 'Suspend') hasSuspended = true;
                            }
                        }
                    } catch (Exception e) {}
                }
            }

            String targetStatus = null;

            if (hasRejected) {
                targetStatus = 'Onboarding Rejected';
            } else if (hasSuspended) {
                targetStatus = 'Onboarding Suspended';
            } else {
                String stage = WCFComplianceController.computeOnboardingStage(app.Id);
                Boolean allValidated = (stage == 'Onboarding Approved' || stage == 'Onboarded' || anyValidated);

                if (allValidated) {
                    if (appsWithActiveAgreement.contains(app.Id)) {
                        targetStatus = 'Onboarded';
                    } else {
                        targetStatus = 'Onboarding Approved';
                    }
                }
            }

            if (String.isNotBlank(targetStatus) && app.Status != targetStatus) {
                toUpdate.add(new IndividualApplication(
                    Id     = app.Id,
                    Status = targetStatus
                ));
            }
        }

        if (!toUpdate.isEmpty()) {
            update as system toUpdate;
        }
    }
}