@isTest
public class WcfPdfGeneratorControllerTest {
    @isTest
    public static void getWCFApplicationWithRelatedDataTest(){
         Account acc = new Account();
        acc.Name = 'Test Account';
        insert acc;
        
        IndividualApplication ia = new IndividualApplication();
        ia.AccountId = acc.Id;
        ia.Category = 'Grant Application';
        ia.Status = 'Submitted';
        ia.Organizational_Area_s_for_Funding_Inves__c = 'Job Fulfillment Only';
        insert ia;
        
        Historical_Data__c hd = new Historical_Data__c();
        hd.Proposal__c = ia.Id;
        hd.CY1_Balance_Start_CFY_1__c = 24;
        hd.CY1_Expense__c = 10;
        hd.CY1_Revenue__c = 100;
        hd.CY2_Balance_Start_CFY_2__c = 10;
        hd.CY2_Expense__c = 30;
        hd.CY2_Revenue__c = 120;
        hd.CY3_Balance_Start_CFY_3__c = 20;
        hd.CY3_Expense__c = 20;
        hd.CY3_Revenue__c = 200;
        insert hd;
        
        Current_fiscal_year_data__c cy = new Current_fiscal_year_data__c();
        cy.Revenue_Budget__c = 140;
        cy.Revenue_Projection__c = 40;
        cy.Revenue_Explanation__c = 'sample explanation';
        cy.Expense_Budget__c = 120;
        cy.Expense_Projection__c = 20;
        cy.Expense_Explanation__c = 'Sample Expense Explanation';
        cy.Net_Position_Explanation__c = 'Net Sample Explanation';
        insert cy;
        
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
        WcfPdfGeneratorController.getWCFApplicationWithRelatedData(ia.Id);
        Test.stopTest();
    }

}