@isTest
public class ApplicationWrapperTest {

    @isTest
    static void testWrapperFieldsAssignCorrectly() {

        // Minimal IndividualApplication instance (not inserted — just used to populate the wrapper)
        IndividualApplication app = new IndividualApplication(
            Project_Title__c = 'Wrapper Test App'
        );

        Milestone__c ms = new Milestone__c(
            Milestone_Description__c = 'Wrapper Test Milestone'
        );

        Budget bd = new Budget(
            Name = 'Wrapper Test Budget'
        );

        Co_Founder__c cf = new Co_Founder__c(
            Designation__c = 'CTO'
        );

        List<String> urls = new List<String>{ 'https://example.com/file1' };

        Test.startTest();
        ApplicationWrapper wrapper = new ApplicationWrapper();
        wrapper.application = app;
        wrapper.milestones = new List<Milestone__c>{ ms };
        wrapper.budgets = new List<Budget>{ bd };
        wrapper.fileUrls = urls;
        wrapper.coFounders = new List<Co_Founder__c>{ cf };
        Test.stopTest();

        // Assert every field round-trips as expected
        System.assertEquals('Wrapper Test App', wrapper.application.Project_Title__c, 'application field mismatch');

        System.assertEquals(1, wrapper.milestones.size(), 'milestones size mismatch');
        System.assertEquals('Wrapper Test Milestone', wrapper.milestones[0].Milestone_Description__c, 'milestone content mismatch');

        System.assertEquals(1, wrapper.budgets.size(), 'budgets size mismatch');
        System.assertEquals('Wrapper Test Budget', wrapper.budgets[0].Name, 'budget content mismatch');

        System.assertEquals(1, wrapper.fileUrls.size(), 'fileUrls size mismatch');
        System.assertEquals('https://example.com/file1', wrapper.fileUrls[0], 'fileUrls content mismatch');

        System.assertEquals(1, wrapper.coFounders.size(), 'coFounders size mismatch');
        System.assertEquals('CTO', wrapper.coFounders[0].Designation__c, 'coFounder content mismatch');
    }

    @isTest
    static void testWrapperDefaultsAreNull() {
        Test.startTest();
        ApplicationWrapper wrapper = new ApplicationWrapper();
        Test.stopTest();

        System.assertEquals(null, wrapper.application, 'application should default to null');
        System.assertEquals(null, wrapper.milestones, 'milestones should default to null');
        System.assertEquals(null, wrapper.budgets, 'budgets should default to null');
        System.assertEquals(null, wrapper.fileUrls, 'fileUrls should default to null');
        System.assertEquals(null, wrapper.coFounders, 'coFounders should default to null');
    }
}