@isTest
public class CurrentFiscalYearDataControllerTest {
    @isTest
    public static void getCurrentFiscalYearDataTest(){
        Account acc = new Account();
        acc.Name = 'Test Account';
        insert acc;
        
        IndividualApplication ia = new IndividualApplication();
        ia.AccountId = acc.Id;
        ia.Category = 'Grant Application';
        ia.Status = 'Submitted';
        insert ia;
   
        Current_fiscal_year_data__c cy = new Current_fiscal_year_data__c();
        cy.Revenue_Budget__c = 140;
        cy.Revenue_Projection__c = 40;
        cy.Revenue_Explanation__c = 'sample explanation';
        cy.Expense_Budget__c = 120;
        cy.Expense_Projection__c = 20;
        cy.Expense_Explanation__c = 'Sample Expense Explanation';
        cy.Net_Position_Explanation__c = 'Net Sample Explanation';
        insert cy;
        
        Test.startTest();
        CurrentFiscalYearDataController.getCurrentFiscalYearData(ia.Id);
        Test.stopTest();
        
    }

}