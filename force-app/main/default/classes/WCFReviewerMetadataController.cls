/**
 * @description Controller to serve dynamic Reviewer Form v5 metadata (7 Categories, 22 Questions, Ladders & Track Descriptions)
 */
public without sharing class WCFReviewerMetadataController {

    public class ReviewerCategoryWrapper {
        @AuraEnabled public Integer categoryNumber { get; set; }
        @AuraEnabled public String title { get; set; }
        @AuraEnabled public String lede { get; set; }
        @AuraEnabled public Integer sequence { get; set; }
        @AuraEnabled public List<ReviewerQuestionWrapper> questions { get; set; }
    }

    public class TrackDescriptionItem {
        @AuraEnabled public String trackKey { get; set; }
        @AuraEnabled public String trackLabel { get; set; }
        @AuraEnabled public String text { get; set; }
    }

    public class ReviewerQuestionWrapper {
        @AuraEnabled public String questionId { get; set; }
        @AuraEnabled public Integer categoryNumber { get; set; }
        @AuraEnabled public String categoryTitle { get; set; }
        @AuraEnabled public String questionText { get; set; }
        @AuraEnabled public Boolean trackAware { get; set; }
        @AuraEnabled public List<String> ladder { get; set; }
        @AuraEnabled public Map<String, String> ladderMap { get; set; }
        @AuraEnabled public String descriptionCommon { get; set; }
        @AuraEnabled public String descriptionJobFulfillment { get; set; }
        @AuraEnabled public String descriptionJobCreation { get; set; }
        @AuraEnabled public String descriptionLivelihoodUpliftment { get; set; }
        @AuraEnabled public String resolvedDescription { get; set; }
        @AuraEnabled public List<TrackDescriptionItem> trackDescriptions { get; set; }
        @AuraEnabled public Integer sequence { get; set; }
    }

    /**
     * @description Retrieves the 7 categories and 22 questions with ladders and track descriptions resolved.
     * @param trackName Name or list of tracks (e.g. 'Job Fulfillment Only', 'Job Creation Only', 'Livelihood Upliftment')
     * @return Map containing categories list, totalQuestions count, and track metadata.
     */
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getReviewerFormV5Metadata(String trackName) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            // Query 7 Categories
            List<Reviewer_Category_v5__mdt> catRecords = [
                SELECT Id, MasterLabel, DeveloperName, Category_Number__c, Title__c, Lede__c, Sequence__c, Is_Active__c
                FROM Reviewer_Category_v5__mdt
                WHERE Is_Active__c = true
                ORDER BY Sequence__c ASC NULLS LAST
            ];

            // Query 22 Questions
            List<Reviewer_Question_v5__mdt> qRecords = [
                SELECT Id, MasterLabel, DeveloperName, Category_Number__c, Category_Title__c,
                       Question_Id__c, Question_Text__c, Track_Aware__c,
                       Ladder_Level_1__c, Ladder_Level_2__c, Ladder_Level_3__c, Ladder_Level_4__c, Ladder_Level_5__c,
                       Description_Common__c, Description_Job_Fulfillment__c, Description_Job_Creation__c, Description_Livelihood_Upliftment__c,
                       Sequence__c, Is_Active__c
                FROM Reviewer_Question_v5__mdt
                WHERE Is_Active__c = true
                ORDER BY Category_Number__c ASC, Sequence__c ASC NULLS LAST
            ];

            // Resolve active tracks set
            Set<String> activeTracks = resolveActiveTracks(trackName);
            String normalizedTrack = normalizeTrackName(trackName);

            // Group questions by Category Number
            Map<Integer, List<ReviewerQuestionWrapper>> questionsByCat = new Map<Integer, List<ReviewerQuestionWrapper>>();
            Integer totalQCount = 0;

            for (Reviewer_Question_v5__mdt q : qRecords) {
                Integer catNum = q.Category_Number__c != null ? Integer.valueOf(q.Category_Number__c) : 1;
                if (!questionsByCat.containsKey(catNum)) {
                    questionsByCat.put(catNum, new List<ReviewerQuestionWrapper>());
                }

                ReviewerQuestionWrapper qw = new ReviewerQuestionWrapper();
                qw.questionId = q.Question_Id__c;
                qw.categoryNumber = catNum;
                qw.categoryTitle = q.Category_Title__c;
                qw.questionText = q.Question_Text__c;
                qw.trackAware = q.Track_Aware__c == true;
                qw.sequence = q.Sequence__c != null ? Integer.valueOf(q.Sequence__c) : 1;

                // 5-point ladder
                qw.ladder = new List<String>{
                    q.Ladder_Level_1__c != null ? q.Ladder_Level_1__c : '1  Very Poor',
                    q.Ladder_Level_2__c != null ? q.Ladder_Level_2__c : '2  Poor',
                    q.Ladder_Level_3__c != null ? q.Ladder_Level_3__c : '3  Adequate',
                    q.Ladder_Level_4__c != null ? q.Ladder_Level_4__c : '4  Strong',
                    q.Ladder_Level_5__c != null ? q.Ladder_Level_5__c : '5  Very Strong'
                };

                qw.ladderMap = new Map<String, String>{
                    '1' => qw.ladder[0],
                    '2' => qw.ladder[1],
                    '3' => qw.ladder[2],
                    '4' => qw.ladder[3],
                    '5' => qw.ladder[4]
                };

                qw.descriptionCommon = q.Description_Common__c;
                qw.descriptionJobFulfillment = q.Description_Job_Fulfillment__c;
                qw.descriptionJobCreation = q.Description_Job_Creation__c;
                qw.descriptionLivelihoodUpliftment = q.Description_Livelihood_Upliftment__c;

                // Build track descriptions list for display
                qw.trackDescriptions = new List<TrackDescriptionItem>();
                if (qw.trackAware) {
                    if (String.isNotBlank(q.Description_Job_Fulfillment__c) && (activeTracks.contains('JF') || activeTracks.contains('ALL'))) {
                        TrackDescriptionItem tItem = new TrackDescriptionItem();
                        tItem.trackKey = 'JF';
                        tItem.trackLabel = 'Job Fulfillment';
                        tItem.text = q.Description_Job_Fulfillment__c;
                        qw.trackDescriptions.add(tItem);
                    }
                    if (String.isNotBlank(q.Description_Job_Creation__c) && (activeTracks.contains('JC') || activeTracks.contains('ALL'))) {
                        TrackDescriptionItem tItem = new TrackDescriptionItem();
                        tItem.trackKey = 'JC';
                        tItem.trackLabel = 'Job Creation';
                        tItem.text = q.Description_Job_Creation__c;
                        qw.trackDescriptions.add(tItem);
                    }
                    if (String.isNotBlank(q.Description_Livelihood_Upliftment__c) && (activeTracks.contains('LU') || activeTracks.contains('ALL'))) {
                        TrackDescriptionItem tItem = new TrackDescriptionItem();
                        tItem.trackKey = 'LU';
                        tItem.trackLabel = 'Livelihood Upliftment';
                        tItem.text = q.Description_Livelihood_Upliftment__c;
                        qw.trackDescriptions.add(tItem);
                    }
                }

                // Resolve primary description
                if (!qw.trackAware) {
                    qw.resolvedDescription = q.Description_Common__c;
                } else if (!qw.trackDescriptions.isEmpty()) {
                    List<String> descList = new List<String>();
                    for (TrackDescriptionItem item : qw.trackDescriptions) {
                        descList.add(item.trackLabel + ': ' + item.text);
                    }
                    qw.resolvedDescription = String.join(descList, '\n');
                } else {
                    qw.resolvedDescription = q.Description_Common__c;
                }

                questionsByCat.get(catNum).add(qw);
                totalQCount++;
            }

            // Build categories list
            List<ReviewerCategoryWrapper> categories = new List<ReviewerCategoryWrapper>();
            for (Reviewer_Category_v5__mdt cat : catRecords) {
                Integer catNum = cat.Category_Number__c != null ? Integer.valueOf(cat.Category_Number__c) : 1;
                ReviewerCategoryWrapper cw = new ReviewerCategoryWrapper();
                cw.categoryNumber = catNum;
                cw.title = cat.Title__c;
                cw.lede = cat.Lede__c;
                cw.sequence = cat.Sequence__c != null ? Integer.valueOf(cat.Sequence__c) : 1;
                cw.questions = questionsByCat.containsKey(catNum) ? questionsByCat.get(catNum) : new List<ReviewerQuestionWrapper>();
                categories.add(cw);
            }

            result.put('success', true);
            result.put('formVersion', 'v5');
            result.put('categories', categories);
            result.put('totalQuestions', totalQCount);
            result.put('trackName', trackName);
            result.put('normalizedTrack', normalizedTrack);
            result.put('activeTracks', new List<String>(activeTracks));
        } catch (Exception ex) {
            result.put('success', false);
            result.put('errorMessage', ex.getMessage());
            result.put('stackTrace', ex.getStackTraceString());
        }
        return result;
    }

    /**
     * @description Resolves set of active track codes: JF, JC, LU
     */
    public static Set<String> resolveActiveTracks(String trackName) {
        Set<String> tracks = new Set<String>();
        if (String.isBlank(trackName) || trackName.equalsIgnoreCase('ALL')) {
            tracks.add('JF');
            tracks.add('JC');
            tracks.add('LU');
            return tracks;
        }

        String lower = trackName.toLowerCase();
        if (lower.contains('fulfillment') || lower.contains('fulfilment') || lower.contains('jf')) {
            tracks.add('JF');
        }
        if (lower.contains('creation') || lower.contains('jc')) {
            tracks.add('JC');
        }
        if (lower.contains('livelihood') || lower.contains('upliftment') || lower.contains('lu')) {
            tracks.add('LU');
        }
        if (lower.contains('both')) {
            tracks.add('JF');
            tracks.add('JC');
        }

        if (tracks.isEmpty()) {
            tracks.add('JF');
            tracks.add('JC');
            tracks.add('LU');
        }
        return tracks;
    }

    /**
     * @description Normalizes raw track string into single code, combo code, or ALL
     */
    public static String normalizeTrackName(String trackName) {
        Set<String> active = resolveActiveTracks(trackName);
        if (active.size() >= 3) {
            return 'ALL';
        }
        List<String> listTracks = new List<String>(active);
        listTracks.sort();
        return String.join(listTracks, ',');
    }
}