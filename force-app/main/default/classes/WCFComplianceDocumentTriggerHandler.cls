public without sharing class WCFComplianceDocumentTriggerHandler {

    // ─────────────────────────────────────────────────────────────
    // When every required compliance document for an application has
    // been marked 'Pass', flip IndividualApplication.Status to
    // 'Onboarding Approved'. Runs after any compliance doc status change.
    // ─────────────────────────────────────────────────────────────
    public static void syncOnboardedStatus(Set<Id> applicationIds) {
        List<IndividualApplication> toUpdate = new List<IndividualApplication>();

        List<IndividualApplication> apps = [
            SELECT Id, Status
            FROM   IndividualApplication
            WHERE  Id IN :applicationIds
            WITH   SYSTEM_MODE
        ];

        for (IndividualApplication app : apps) {
            if (app.Status == 'Onboarding Approved' || app.Status == 'Onboarded') continue; // already done, skip

            String stage = WCFComplianceController.computeOnboardingStage(app.Id);
            if (stage == 'Onboarding Approved' || stage == 'Onboarded') {
                toUpdate.add(new IndividualApplication(
                    Id     = app.Id,
                    Status = 'Onboarding Approved'
                ));
            }
        }

        if (!toUpdate.isEmpty()) {
            update as system toUpdate;
        }
    }
}