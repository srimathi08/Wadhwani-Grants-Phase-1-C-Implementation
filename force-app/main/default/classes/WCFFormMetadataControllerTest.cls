@IsTest
private class WCFFormMetadataControllerTest {

    @IsTest
    static void testGetFormMetadata() {
        Test.startTest();
        WCFFormMetadataController.FormMetadataPayload payload = WCFFormMetadataController.getFormMetadata('en_US', '03', '31');
        Test.stopTest();

        System.assertNotEquals(null, payload, 'Payload should not be null');
        System.assertNotEquals(null, payload.tracks, 'Tracks should be populated');
        System.assert(payload.tracks.size() >= 3, 'At least 3 tracks expected');
        System.assertNotEquals(null, payload.sections, 'Sections should be populated');
        System.assertNotEquals(null, payload.questions, 'Questions should be populated');
        System.assertNotEquals(null, payload.dependencyRules, 'Dependency rules should be populated');
        System.assertNotEquals(null, payload.fiscalYears, 'Fiscal years should be calculated');
    }

    @IsTest
    static void testGetFormMetadataWithBlankLanguage() {
        Test.startTest();
        WCFFormMetadataController.FormMetadataPayload payload = WCFFormMetadataController.getFormMetadata('', '12', '31');
        Test.stopTest();

        System.assertNotEquals(null, payload);
    }
}