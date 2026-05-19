public with sharing class FileController {
    @AuraEnabled(cacheable=true)
    public static List<FileWrapper> getFiles(Id recordId) {
        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileType
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :recordId
        ];

        List<FileWrapper> files = new List<FileWrapper>();
        for (ContentDocumentLink link : links) {
            files.add(new FileWrapper(
                link.ContentDocumentId,
                link.ContentDocument.Title,
                link.ContentDocument.FileType
            ));
        }
        return files;
    }

    public class FileWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String title;
        @AuraEnabled public String type;

        public FileWrapper(String id, String title, String type) {
            this.id = id;
            this.title = title;
            this.type = type;
        }
    }
}