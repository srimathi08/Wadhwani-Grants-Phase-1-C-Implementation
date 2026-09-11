@IsTest
private class OutcomeDataFilesControllerTest {

    @IsTest
    static void testGetFiles_NoOutcomeData() {

        // Create Proposal (replace required fields if needed)
        IndividualApplication proposal = new IndividualApplication(
            Category ='WCF Grant Application'
        );
        insert proposal;

        Test.startTest();
        List<ContentDocumentLink> result =
            OutcomeDataFilesController.getFiles(proposal.Id);
        Test.stopTest();

        System.assertEquals(0, result.size());
    }

    @IsTest
    static void testGetFiles_WithFiles() {

        // Create Proposal (replace required fields if needed)
        IndividualApplication proposal = new IndividualApplication(
             Category ='WCF Grant Application'
        );
        insert proposal;

        // Create Outcome Data
        Outcomes_Data__c outcome = new Outcomes_Data__c(
            Proposal__c = proposal.Id
        );
        insert outcome;

        // Create File
        ContentVersion cv = new ContentVersion(
            Title = 'Test File',
            PathOnClient = 'Test.pdf',
            VersionData = Blob.valueOf('Unit Test')
        );
        insert cv;

        // Get ContentDocumentId
        cv = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE Id = :cv.Id
        ];

        // Link File to Outcome Data
        ContentDocumentLink cdl = new ContentDocumentLink(
            LinkedEntityId = outcome.Id,
            ContentDocumentId = cv.ContentDocumentId,
            ShareType = 'V',
            Visibility = 'AllUsers'
        );
        insert cdl;

        Test.startTest();
        List<ContentDocumentLink> result =
            OutcomeDataFilesController.getFiles(proposal.Id);
        Test.stopTest();

        System.assertEquals(1, result.size());
        System.assertEquals(cv.ContentDocumentId, result[0].ContentDocumentId);
        System.assertEquals('Test File', result[0].ContentDocument.Title);
    }
}