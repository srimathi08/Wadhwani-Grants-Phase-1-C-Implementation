ApexClass metaClass = [SELECT Id, Name FROM ApexClass WHERE Name = 'WCFReviewerMetadataController' LIMIT 1];

// Profiles
List<Profile> profs = [SELECT Id, Name FROM Profile WHERE Name IN ('WCF Reviewer', 'WCF Site User', 'Standard User', 'System Administrator')];
for (Profile p : profs) {
    List<PermissionSet> psets = [SELECT Id FROM PermissionSet WHERE ProfileId = :p.Id];
    if (!psets.isEmpty()) {
        Id psId = psets[0].Id;
        List<SetupEntityAccess> exists = [SELECT Id FROM SetupEntityAccess WHERE ParentId = :psId AND SetupEntityId = :metaClass.Id];
        if (exists.isEmpty()) {
            try {
                SetupEntityAccess sea = new SetupEntityAccess(
                    ParentId = psId,
                    SetupEntityId = metaClass.Id
                );
                insert sea;
                System.debug('Granted access to profile: ' + p.Name);
            } catch (Exception ex) {
                System.debug('Error on profile ' + p.Name + ': ' + ex.getMessage());
            }
        } else {
            System.debug('Already has access: ' + p.Name);
        }
    }
}

// Permission Sets
List<PermissionSet> permSets = [SELECT Id, Name, Label FROM PermissionSet WHERE Name IN (
    'WCF_Reviewer_Access', 'WINGrantmakingExternalReviewers', 'Reviewer_Proposal_Access', 
    'GrantmakingExternalReviewer', 'GrantmakingExternalReviewerClone', 'Application_review_access', 
    'WCF_Approver_Access', 'WCF_Validator_Access'
)];

for (PermissionSet ps : permSets) {
    List<SetupEntityAccess> exists = [SELECT Id FROM SetupEntityAccess WHERE ParentId = :ps.Id AND SetupEntityId = :metaClass.Id];
    if (exists.isEmpty()) {
        try {
            SetupEntityAccess sea = new SetupEntityAccess(
                ParentId = ps.Id,
                SetupEntityId = metaClass.Id
            );
            insert sea;
            System.debug('Granted access to PermSet: ' + ps.Name);
        } catch (Exception ex) {
            System.debug('PermSet ' + ps.Name + ' skipped: ' + ex.getMessage());
        }
    } else {
        System.debug('PermSet already has access: ' + ps.Name);
    }
}
