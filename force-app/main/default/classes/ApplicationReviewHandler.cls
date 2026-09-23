public class ApplicationReviewHandler {
    
    // Public so the trigger can call it
    public static Date addWorkingDays(Date startDate, Integer workingDaysToAdd) {
        Date result = startDate;
        Integer daysAdded = 0;
        
        while (daysAdded < workingDaysToAdd) {
            result = result.addDays(1);
            DateTime dt = DateTime.newInstance(result, Time.newInstance(0, 0, 0, 0));
            String dayName = dt.format('EEEE'); // 'Monday', 'Saturday', etc.
            
            if (dayName != 'Saturday' && dayName != 'Sunday') {
                daysAdded++;
            }
        }
        
        return result;
    }   

    public static void populateConsolidatedComments(
        List<ApplicationReview> newList,
        Map<Id, ApplicationReview> oldMap
    ) {
        Set<Id> appIds = new Set<Id>();
        for (ApplicationReview review : newList) {
            if (review.ApplicationId != null) {
                appIds.add(review.ApplicationId);
            }
        }

        Map<Id, IndividualApplication> appMap = new Map<Id, IndividualApplication>();
        if (!appIds.isEmpty()) {
            appMap = new Map<Id, IndividualApplication>([
                SELECT Id, Organizational_Area_s_for_Funding_Inves__c, Organizational_Area_s_for_Funding_Inves1__c
                FROM IndividualApplication
                WHERE Id IN :appIds
                WITH SYSTEM_MODE
            ]);
        }

        for (ApplicationReview review : newList) {

            // Skip if update and none of the question fields changed
            if (oldMap != null) {
                Boolean questionChanged = false;

                for (Integer i = 1; i <= 28; i++) {
                    String fieldName = 'Question_Number_' + i + '__c';
                    Object oldValue = oldMap.get(review.Id).get(fieldName);
                    Object newValue = review.get(fieldName);

                    if (String.valueOf(oldValue) != String.valueOf(newValue)) {
                        questionChanged = true;
                        break;
                    }
                }

                if (!questionChanged) {
                    continue;
                }
            }

            IndividualApplication app = review.ApplicationId != null ? appMap.get(review.ApplicationId) : null;
            String fundingArea = '';
            if (app != null) {
                fundingArea = String.isNotBlank(app.Organizational_Area_s_for_Funding_Inves1__c)
                    ? app.Organizational_Area_s_for_Funding_Inves1__c
                    : app.Organizational_Area_s_for_Funding_Inves__c;
                if (fundingArea == null) fundingArea = '';
            }

            Boolean hasJF = fundingArea.contains('Job Fulfillment') || fundingArea == 'Job Fulfillment Only' || fundingArea == 'Both Job Fulfillment and Job Creation';
            Boolean hasJC = fundingArea.contains('Job Creation') || fundingArea == 'Job Creation Only' || fundingArea == 'Both Job Fulfillment and Job Creation';
            Boolean hasLiv = fundingArea.contains('Livelihood');

            Map<String, Integer> qNumMap = new Map<String, Integer>();
            Integer currNum = 1;
            for (Integer i = 1; i <= 10; i++) {
                qNumMap.put('Q' + i, currNum++);
            }
            if (hasJF) {
                qNumMap.put('Q11', currNum++);
                qNumMap.put('Q12', currNum++);
                qNumMap.put('Q13', currNum++);
                qNumMap.put('Q14', currNum++);
            }
            if (hasJC) {
                qNumMap.put('Q15', currNum++);
                qNumMap.put('Q16', currNum++);
                qNumMap.put('Q17', currNum++);
                qNumMap.put('Q18', currNum++);
            }
            if (hasLiv) {
                qNumMap.put('Q19', currNum++);
                qNumMap.put('Q20', currNum++);
                qNumMap.put('Q21', currNum++);
                qNumMap.put('Q22', currNum++);
                qNumMap.put('Q23', currNum++);
            }
            qNumMap.put('Q24', currNum++);
            qNumMap.put('Q25', currNum++);
            qNumMap.put('Q26', currNum++);
            qNumMap.put('Q27', currNum++);
            qNumMap.put('Q28', currNum++);

            List<String> comments = new List<String>();

            for (Integer i = 1; i <= 28; i++) {
                String fieldName = 'Question_Number_' + i + '__c';
                Object valueObj = review.get(fieldName);

                if (valueObj != null && !String.isBlank(String.valueOf(valueObj))) {
                    String canonicalKey = 'Q' + i;
                    Integer displayNum = qNumMap.containsKey(canonicalKey) ? qNumMap.get(canonicalKey) : i;
                    comments.add('Question ' + displayNum + ': ' + String.valueOf(valueObj));
                }
            }

            review.Consolidated_Return_Comments__c =
                comments.isEmpty() ? null : String.join(comments, '\n\n');
        }
    }
}