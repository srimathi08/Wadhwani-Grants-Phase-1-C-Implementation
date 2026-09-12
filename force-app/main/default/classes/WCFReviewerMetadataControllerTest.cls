/**
 * @description Test class for WCFReviewerMetadataController
 */
@IsTest
private class WCFReviewerMetadataControllerTest {

    @IsTest
    static void testGetReviewerFormV5Metadata() {
        Test.startTest();
        Map<String, Object> resJF = WCFReviewerMetadataController.getReviewerFormV5Metadata('Job Fulfillment Only');
        Map<String, Object> resJC = WCFReviewerMetadataController.getReviewerFormV5Metadata('Job Creation Only');
        Map<String, Object> resLU = WCFReviewerMetadataController.getReviewerFormV5Metadata('Livelihood Upliftment');
        Map<String, Object> resAll = WCFReviewerMetadataController.getReviewerFormV5Metadata(null);
        Test.stopTest();

        System.assertNotEquals(null, resJF, 'Result should not be null');
        System.assertEquals('v5', resJF.get('formVersion'), 'Version should be v5');
        System.assertEquals('JF', resJF.get('normalizedTrack'), 'Should normalize to JF');
        System.assertEquals('JC', resJC.get('normalizedTrack'), 'Should normalize to JC');
        System.assertEquals('LU', resLU.get('normalizedTrack'), 'Should normalize to LU');
    }
}
