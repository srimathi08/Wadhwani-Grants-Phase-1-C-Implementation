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

    for (ApplicationReview review : newList) {

        // Skip if update and none of the question fields changed
        if (oldMap != null) {

            Boolean questionChanged = false;

            for (Integer i = 1; i <= 20; i++) {

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

        List<String> comments = new List<String>();

        for (Integer i = 1; i <= 20; i++) {

            String fieldName = 'Question_Number_' + i + '__c';

            Object valueObj = review.get(fieldName);

            if (valueObj != null && !String.isBlank(String.valueOf(valueObj))) {
                comments.add('Question ' + i + ': ' + String.valueOf(valueObj));
            }
        }

        review.Consolidated_Return_Comments__c =
            comments.isEmpty() ? null : String.join(comments, '\n\n');
    }
}
}