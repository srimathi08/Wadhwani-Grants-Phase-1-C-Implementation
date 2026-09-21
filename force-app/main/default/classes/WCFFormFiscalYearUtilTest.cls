@IsTest
private class WCFFormFiscalYearUtilTest {

    @IsTest
    static void testCalculateFiscalYearsNumeric() {
        Test.startTest();
        WCFFormFiscalYearUtil.FiscalYearInfo info = WCFFormFiscalYearUtil.calculateFiscalYears('03', '31');
        Test.stopTest();
        
        System.assertNotEquals(null, info, 'FiscalYearInfo should not be null');
        System.assertNotEquals(null, info.currentFyEndDate, 'currentFyEndDate should be calculated');
        System.assertNotEquals(null, info.fy1EndDate, 'fy1EndDate should be calculated');
        System.assertNotEquals(null, info.fy2EndDate, 'fy2EndDate should be calculated');
        System.assertNotEquals(null, info.fy3EndDate, 'fy3EndDate should be calculated');
        System.assert(info.currentFyLabel.startsWith('FY'), 'Label should start with FY');
    }

    @IsTest
    static void testCalculateFiscalYearsMonthNamesAndDefaults() {
        Test.startTest();
        WCFFormFiscalYearUtil.FiscalYearInfo infoMar = WCFFormFiscalYearUtil.calculateFiscalYears('March', '31');
        WCFFormFiscalYearUtil.FiscalYearInfo infoDec = WCFFormFiscalYearUtil.calculateFiscalYears('December', '31');
        WCFFormFiscalYearUtil.FiscalYearInfo infoBlank = WCFFormFiscalYearUtil.calculateFiscalYears('', '');
        Test.stopTest();
        
        System.assertNotEquals(null, infoMar);
        System.assertNotEquals(null, infoDec);
        System.assertNotEquals(null, infoBlank);
    }
}