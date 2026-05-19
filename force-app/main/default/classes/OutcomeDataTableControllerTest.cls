@isTest
public class OutcomeDataTableControllerTest {
    @isTest
    public static void getOutcomeDataTest(){
        Account acc = new Account();
        acc.Name = 'Test Account';
        insert acc;
        
        IndividualApplication ia = new IndividualApplication();
        ia.AccountId = acc.Id;
        ia.Category = 'Grant Application';
        ia.Status = 'Submitted';
        ia.Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only';
        insert ia;
        
        Outcomes_Data__c od = new Outcomes_Data__c();
        od.Proposal__c = ia.Id;
        od.Skills_Duration_CFY__c = 'abc';
        od.Skills_Duration_FY_1__c = 'test';
        od.Skills_Duration_FY_2__c = 'test2';
        od.Skills_Duration_FY_3__c = 'test 3';
        od.Projected_Learner_Enrollments_CFY__c = '23';
        od.Projected_Learner_Enrollments_FY_1__c = '40';
        insert od;
        
        Test.startTest();
        OutcomeDataTableController.getOutcomeData(ia.Id);
        Test.stopTest();
               
    }

}