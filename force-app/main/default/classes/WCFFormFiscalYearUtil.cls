/**
 * @description Utility class for calculating dynamic fiscal year labels and end dates
 * based on an organization's Fiscal_Month__c and Fiscal_Day__c fields.
 */
public with sharing class WCFFormFiscalYearUtil {

    public class FiscalYearInfo {
        @AuraEnabled public Integer currentFiscalYear;
        @AuraEnabled public Date currentFyEndDate;
        @AuraEnabled public Date fy1EndDate;
        @AuraEnabled public Date fy2EndDate;
        @AuraEnabled public Date fy3EndDate;
        
        @AuraEnabled public String currentFyLabel;
        @AuraEnabled public String fy1Label;
        @AuraEnabled public String fy2Label;
        @AuraEnabled public String fy3Label;
    }

    /**
     * @description Calculates 4-year fiscal dates (CFY, FY-1, FY-2, FY-3) based on fiscal month and day strings.
     * @param monthStr Month string e.g. "03" or "3" or "March"
     * @param dayStr Day string e.g. "31" or "31"
     * @return FiscalYearInfo object containing dates and formatted year labels
     */
    public static FiscalYearInfo calculateFiscalYears(String monthStr, String dayStr) {
        Integer monthVal = parseMonth(monthStr);
        Integer dayVal = parseDay(dayStr);
        
        Date today = Date.today();
        Integer currentYear = today.year();
        
        // Find the fiscal year end date for the current year
        Integer daysInM = Date.daysInMonth(currentYear, monthVal);
        Integer actualDay = Math.min(dayVal, daysInM);
        Date candidateEndDate = Date.newInstance(currentYear, monthVal, actualDay);
        
        Date cfyEndDate;
        Integer cfyYear;
        
        // If candidate date in current year hasn't occurred yet or is current, CFY ends in currentYear.
        // If past, depending on fiscal alignment, CFY end date is candidateEndDate or next year.
        if (today <= candidateEndDate) {
            cfyEndDate = candidateEndDate;
            cfyYear = currentYear;
        } else {
            Integer nextYear = currentYear + 1;
            daysInM = Date.daysInMonth(nextYear, monthVal);
            actualDay = Math.min(dayVal, daysInM);
            cfyEndDate = Date.newInstance(nextYear, monthVal, actualDay);
            cfyYear = nextYear;
        }
        
        FiscalYearInfo info = new FiscalYearInfo();
        info.currentFiscalYear = cfyYear;
        info.currentFyEndDate = cfyEndDate;
        
        // Compute prior years
        info.fy1EndDate = addYearsToFiscalDate(cfyEndDate, monthVal, dayVal, -1);
        info.fy2EndDate = addYearsToFiscalDate(cfyEndDate, monthVal, dayVal, -2);
        info.fy3EndDate = addYearsToFiscalDate(cfyEndDate, monthVal, dayVal, -3);
        
        info.currentFyLabel = 'FY' + String.valueOf(cfyYear);
        info.fy1Label = 'FY' + String.valueOf(cfyYear - 1);
        info.fy2Label = 'FY' + String.valueOf(cfyYear - 2);
        info.fy3Label = 'FY' + String.valueOf(cfyYear - 3);
        
        return info;
    }
    
    private static Date addYearsToFiscalDate(Date baseDate, Integer monthVal, Integer dayVal, Integer yearOffset) {
        Integer targetYear = baseDate.year() + yearOffset;
        Integer daysInM = Date.daysInMonth(targetYear, monthVal);
        Integer actualDay = Math.min(dayVal, daysInM);
        return Date.newInstance(targetYear, monthVal, actualDay);
    }
    
    private static Integer parseMonth(String monthStr) {
        if (String.isBlank(monthStr)) return 3; // Default March
        try {
            return Integer.valueOf(monthStr.trim());
        } catch (Exception e) {
            // Check month names
            String lower = monthStr.trim().toLowerCase();
            if (lower.startsWith('jan')) return 1;
            if (lower.startsWith('feb')) return 2;
            if (lower.startsWith('mar')) return 3;
            if (lower.startsWith('apr')) return 4;
            if (lower.startsWith('may')) return 5;
            if (lower.startsWith('jun')) return 6;
            if (lower.startsWith('jul')) return 7;
            if (lower.startsWith('aug')) return 8;
            if (lower.startsWith('sep')) return 9;
            if (lower.startsWith('oct')) return 10;
            if (lower.startsWith('nov')) return 11;
            if (lower.startsWith('dec')) return 12;
            return 3;
        }
    }
    
    private static Integer parseDay(String dayStr) {
        if (String.isBlank(dayStr)) return 31;
        try {
            return Integer.valueOf(dayStr.trim());
        } catch (Exception e) {
            return 31;
        }
    }
}
