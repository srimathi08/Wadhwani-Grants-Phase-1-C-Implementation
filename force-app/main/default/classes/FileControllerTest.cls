@isTest
public class FileControllerTest {
    @isTest
    static void testGetFiles() {
        // Create a test Account (or any SObject to link files)
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;

        // Create a ContentVersion (represents the uploaded file)
        ContentVersion version = new ContentVersion(
            Title = 'TestFile',
            PathOnClient = 'TestFile.pdf',
            VersionData = Blob.valueOf('This is test content'),
            IsMajorVersion = true
        );
        insert version;

        // Get the ContentDocument Id from the inserted ContentVersion
        ContentVersion insertedVersion = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :version.Id];
        
        // Link the file to the test account
        ContentDocumentLink link = new ContentDocumentLink(
            ContentDocumentId = insertedVersion.ContentDocumentId,
            LinkedEntityId = testAccount.Id,
            ShareType = 'V',
            Visibility = 'AllUsers'
        );
        insert link;

        // Call the method to test
        Test.startTest();
        List<FileController.FileWrapper> result = FileController.getFiles(testAccount.Id);
        Test.stopTest();

        // Assert the results
        System.assertEquals(1, result.size(), 'Expected one file to be returned');
        System.assertEquals('TestFile', result[0].title, 'File title mismatch');
        System.assertNotEquals(null, result[0].id, 'File ID should not be null');
        
    }
}