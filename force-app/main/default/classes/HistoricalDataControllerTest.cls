@isTest
public class HistoricalDataControllerTest {
    @isTest
    public static void getHistoricalDataTest(){
        Account acc = new Account();
        acc.Name = 'Test Account';
        insert acc;
        
        IndividualApplication ia = new IndividualApplication();
        ia.AccountId = acc.Id;
        ia.Category = 'Grant Application';
        ia.Status = 'Submitted';
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
        
        Test.startTest();
        HistoricalDataController.getHistoricalData(ia.Id);
        Test.stopTest();
    }

}