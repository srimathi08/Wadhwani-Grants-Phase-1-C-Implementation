public with sharing class IndividualApplicationExportController {

    @AuraEnabled(cacheable=true)
    public static List<AppWrapper> getApplicationsWithFiles() {

        List<IndividualApplication> apps = [
            SELECT Id, Name, Coe_Approver__r.Name, Account.Name FROM IndividualApplication 
            Where Status  = 'Proposal Submitted to COE Admin' ];

         Map<Id, List<String>> fileMap = new Map<Id, List<String>>();

        for (ContentDocumentLink cdl : [
            SELECT LinkedEntityId, ContentDocument.Title
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN :apps
        ]) {
            if (!fileMap.containsKey(cdl.LinkedEntityId)) {
                fileMap.put(cdl.LinkedEntityId, new List<String>());
            }
            fileMap.get(cdl.LinkedEntityId).add(cdl.ContentDocument.Title);
        }

        List<AppWrapper> results = new List<AppWrapper>();


        for (IndividualApplication app : apps) {
            results.add(new AppWrapper(
                app.Id,
                app.Name,
                app.Coe_Approver__r != null ? app.Coe_Approver__r.Name : '',
                app.Coe_Approver__r != null &&
                app.Coe_Approver__r.Contact != null
                    ? app.Coe_Approver__r.Contact.Account.Name
                    : '',
                fileMap.containsKey(app.Id)
                    ? String.join(fileMap.get(app.Id), '; ')
                    : 'No Files'
            ));
        }

        return results;
    }

    public class AppWrapper {
        @AuraEnabled public Id recordId;
        @AuraEnabled public String appName;
        @AuraEnabled public String approverName;
        @AuraEnabled public String accountName;
        @AuraEnabled public String files;

        public AppWrapper(
            Id recordId,
            String appName,
            String approverName,
            String accountName,
            String files
        ) {
            this.recordId = recordId;
            this.appName = appName;
            this.approverName = approverName;
            this.accountName = accountName;
            this.files = files;
        }
    }
}