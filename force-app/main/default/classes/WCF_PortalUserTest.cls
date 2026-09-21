@IsTest
public class WCF_PortalUserTest {
    @IsTest(SeeAllData=true)
    static void testGetActionCounts() {
        User portalUser = [SELECT Id, Name, Profile.Name FROM User WHERE Profile.Name LIKE '%Community%' AND IsActive = true LIMIT 1];
        System.runAs(portalUser) {
            Map<String, Integer> counts = WCFValidatorController.getActionCounts();
            System.assertNotEquals(null, counts);
        }
    }

    @IsTest(SeeAllData=true)
    static void testGetApplicationList() {
        User portalUser = [SELECT Id, Name, Profile.Name FROM User WHERE Profile.Name LIKE '%Community%' AND IsActive = true LIMIT 1];
        System.runAs(portalUser) {
            Object apps = WCFValidatorController.getApplicationList();
            System.assertNotEquals(null, apps);
        }
    }

    @IsTest(SeeAllData=true)
    static void testGetPipelineCounts() {
        User portalUser = [SELECT Id, Name, Profile.Name FROM User WHERE Profile.Name LIKE '%Community%' AND IsActive = true LIMIT 1];
        System.runAs(portalUser) {
            Object pipeline = wcfHomeDashboardController.getPipelineCounts();
            System.assertNotEquals(null, pipeline);
        }
    }

    @IsTest(SeeAllData=true)
    static void testRecordTypeFilter() {
        Set<Id> allowedIds = RecordTypeHelper.individualApplicationAllowedIds();
        System.assertEquals(1, allowedIds.size(), 'Should only have Wadhwani Grants record type');
    }
}