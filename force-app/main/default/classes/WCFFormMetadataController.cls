/**
 * @description Controller responsible for loading dynamic RFI form metadata configuration
 * (Tracks, Sections, Questions, Dependency Rules, Validation Rules, and Translations)
 * localized for the applicant's selected language.
 */
public without sharing class WCFFormMetadataController {

    public class TrackWrapper {
        @AuraEnabled public String code;
        @AuraEnabled public String label;
        @AuraEnabled public String description;
        @AuraEnabled public Integer sequence;
        @AuraEnabled public Boolean isActive;
    }

    public class SectionWrapper {
        @AuraEnabled public String code;
        @AuraEnabled public String title;
        @AuraEnabled public String description;
        @AuraEnabled public Integer sequence;
        @AuraEnabled public List<String> applicableTracks;
    }

    public class PicklistOption {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        public PicklistOption(String label, String value) {
            this.label = label;
            this.value = value;
        }
    }

    public class QuestionWrapper {
        @AuraEnabled public String key;
        @AuraEnabled public String sectionCode;
        @AuraEnabled public Integer sequence;
        @AuraEnabled public String displayType;
        @AuraEnabled public String targetObject;
        @AuraEnabled public String targetField;
        @AuraEnabled public String label;
        @AuraEnabled public String helpText;
        @AuraEnabled public String placeholder;
        @AuraEnabled public Boolean isRequired;
        @AuraEnabled public List<String> applicableTracks;
        @AuraEnabled public String picklistSource;
        @AuraEnabled public Integer maxWordCount;
        @AuraEnabled public List<PicklistOption> picklistOptions;
        @AuraEnabled public Boolean isCustom;
    }

    public class RuleWrapper {
        @AuraEnabled public String targetQuestionKey;
        @AuraEnabled public String sourceQuestionKey;
        @AuraEnabled public String operator;
        @AuraEnabled public String value;
        @AuraEnabled public String action;
    }

    public class FormMetadataPayload {
        @AuraEnabled public List<TrackWrapper> tracks;
        @AuraEnabled public List<SectionWrapper> sections;
        @AuraEnabled public List<QuestionWrapper> questions;
        @AuraEnabled public List<RuleWrapper> dependencyRules;
        @AuraEnabled public Map<String, String> translations;
        @AuraEnabled public WCFFormFiscalYearUtil.FiscalYearInfo fiscalYears;
    }

    /**
     * @description Fetches all dynamic form metadata localized by language code.
     * @param languageCode Language code e.g. "en_US", "es", "pt_BR"
     * @param fiscalMonth Organization fiscal month string e.g. "03"
     * @param fiscalDay Organization fiscal day string e.g. "31"
     * @return FormMetadataPayload payload containing tracks, sections, questions, rules, translations
     */
    @AuraEnabled
    public static FormMetadataPayload getFormMetadata(String languageCode, String fiscalMonth, String fiscalDay) {
        if (String.isBlank(languageCode)) {
            languageCode = 'en_US';
        }
        
        FormMetadataPayload payload = new FormMetadataPayload();
        payload.tracks = getTracks(languageCode);
        payload.sections = getSections(languageCode);
        payload.questions = getQuestions(languageCode);
        payload.dependencyRules = getDependencyRules();
        payload.translations = getTranslations(languageCode);
        payload.fiscalYears = WCFFormFiscalYearUtil.calculateFiscalYears(fiscalMonth, fiscalDay);
        
        return payload;
    }

    private static List<TrackWrapper> getTracks(String languageCode) {
        List<TrackWrapper> tracks = new List<TrackWrapper>();
        List<RFI_Track__mdt> records = [
            SELECT MasterLabel, DeveloperName, Track_Code__c, Sequence__c, Is_Active__c
            FROM RFI_Track__mdt
            WHERE Is_Active__c = true
            ORDER BY Sequence__c ASC NULLS LAST, DeveloperName ASC
        ];
        
        if (!records.isEmpty()) {
            Integer seq = 1;
            for (RFI_Track__mdt r : records) {
                TrackWrapper t = new TrackWrapper();
                t.code = String.isNotBlank(r.Track_Code__c) ? r.Track_Code__c : r.DeveloperName;
                t.label = String.isNotBlank(r.MasterLabel) ? r.MasterLabel : t.code;
                t.description = t.label;
                t.sequence = r.Sequence__c != null ? Integer.valueOf(r.Sequence__c) : seq++;
                t.isActive = r.Is_Active__c;
                tracks.add(t);
            }
            return tracks;
        }

        // Default tracks fallback
        TrackWrapper t1 = new TrackWrapper();
        t1.code = 'JOB_FULFILLMENT';
        t1.label = 'Job Fulfillment';
        t1.description = 'Skilling, training, and direct placement into wage employment.';
        t1.sequence = 1;
        t1.isActive = true;
        tracks.add(t1);
        
        TrackWrapper t2 = new TrackWrapper();
        t2.code = 'JOB_CREATION';
        t2.label = 'Job Creation';
        t2.description = 'Supporting business creation, self-employment, and micro-enterprises.';
        t2.sequence = 2;
        t2.isActive = true;
        tracks.add(t2);
        
        TrackWrapper t3 = new TrackWrapper();
        t3.code = 'LIVELIHOOD';
        t3.label = 'Livelihood upliftment';
        t3.description = 'Increasing household income for micro-entrepreneurs and artisans.';
        t3.sequence = 3;
        t3.isActive = true;
        tracks.add(t3);
        
        return tracks;
    }

    private static List<SectionWrapper> getSections(String languageCode) {
        List<SectionWrapper> sections = new List<SectionWrapper>();
        List<RFI_Section__mdt> records = [
            SELECT MasterLabel, DeveloperName, Section_Code__c, Track_Code__c, Sequence__c
            FROM RFI_Section__mdt
            ORDER BY Sequence__c ASC NULLS LAST, DeveloperName ASC
        ];
        
        if (!records.isEmpty()) {
            Integer seq = 1;
            for (RFI_Section__mdt r : records) {
                SectionWrapper s = new SectionWrapper();
                s.code = String.isNotBlank(r.Section_Code__c) ? r.Section_Code__c : r.DeveloperName;
                s.title = String.isNotBlank(r.MasterLabel) ? r.MasterLabel : s.code;
                s.description = s.title;
                s.sequence = r.Sequence__c != null ? Integer.valueOf(r.Sequence__c) : seq++;
                s.applicableTracks = new List<String>();
                if (String.isNotBlank(r.Track_Code__c)) {
                    s.applicableTracks.add(r.Track_Code__c);
                }
                sections.add(s);
            }
            return sections;
        }
        
        SectionWrapper s1 = new SectionWrapper();
        s1.code = 'SEC_ABOUT_ORG';
        s1.title = '1. About Your Organization';
        s1.description = 'Basic organizational profile, track selection, and legal registration details.';
        s1.sequence = 1;
        s1.applicableTracks = new List<String>();
        sections.add(s1);
        
        SectionWrapper s2 = new SectionWrapper();
        s2.code = 'SEC_JOB_FULFILLMENT';
        s2.title = '2. What You Do';
        s2.description = 'Core programmatic operations, skilling domains, and business sectors.';
        s2.sequence = 2;
        s2.applicableTracks = new List<String>();
        sections.add(s2);
        
        SectionWrapper s3 = new SectionWrapper();
        s3.code = 'SEC_OUTCOMES';
        s3.title = '3. What You Have Delivered';
        s3.description = 'Historical financials (4 years), historical outcomes, and current fiscal year budget.';
        s3.sequence = 3;
        s3.applicableTracks = new List<String>();
        sections.add(s3);
        
        SectionWrapper s4 = new SectionWrapper();
        s4.code = 'SEC_WHY_WADHWANI';
        s4.title = '4. Why Wadhwani Grants';
        s4.description = 'Strategic alignment, proposed project budget, and leadership references.';
        s4.sequence = 4;
        s4.applicableTracks = new List<String>();
        sections.add(s4);
        
        SectionWrapper s5 = new SectionWrapper();
        s5.code = 'SEC_REVIEW_SUBMIT';
        s5.title = '5. Review and Submit';
        s5.description = 'Review all inputs, complete attestation, and submit your proposal.';
        s5.sequence = 5;
        s5.applicableTracks = new List<String>();
        sections.add(s5);
        
        return sections;
    }

    private static List<QuestionWrapper> getQuestions(String languageCode) {
        List<QuestionWrapper> questions = new List<QuestionWrapper>();
        
        // Built-in question keys for tracking
        Set<String> builtInKeys = new Set<String>{
            'Q1_SELECTED_TRACKS', 'Q2_ORG_NAME', 'Q2_HQ_LOCATION', 'Q2_PRIMARY_REGIONS', 'Q2_LEADER_NAME', 'Q2_LEADER_TITLE', 'Q2_LEADER_TENURE',
            'Q3_SUBMITTER_NAME', 'Q3_JOB_TITLE', 'Q3_WORK_EMAIL', 'Q3_PHONE',
            'Q4_LEGAL_TYPE', 'Q4_JURISDICTION', 'Q4_INCORP_DATE', 'Q4_GOVERNANCE_DESC',
            'Q5_US_501C3', 'Q5_ED_STATUS', 'Q5_FCRA_STATUS', 'Q5_WILLING_ED',
            'Q6_FISCAL_MONTH', 'Q6_FISCAL_DAY', 'Q7_TOP_FUNDERS', 'Q8_REFERENCES',
            'Q9_HIST_FINANCIALS', 'Q10_CURRENT_FY',
            'Q11_SKILLING_APPROACH', 'Q12_SKILLING_DOMAINS', 'Q13_JF_HIST_OUTCOMES', 'Q14_JF_PROJ_OUTCOMES',
            'Q15_JOB_CREATION_APPROACH', 'Q16_BUSINESS_SECTORS', 'Q17_JC_HIST_OUTCOMES', 'Q18_JC_PROJ_OUTCOMES',
            'Q19_LIVELIHOOD_APPROACH', 'Q20_LIVELIHOOD_PROGRAMS', 'Q21_COMMUNITIES_SERVED', 'Q22_LIVELIHOOD_ACTUALS', 'Q23_LIVELIHOOD_PROJ',
            'Q24_INDEPENDENT_VERIFICATION', 'Q24_OPERATIONAL_SYNERGIES',
            'Q25_SUSTAINABILITY_PLAN', 'Q26_ADDITIONAL_FUNDING', 'Q27_GENIE_AI', 'Q28_SUPPORTING_DOCS'
        };

        Map<String, Schema.SObjectField> appFieldMap = Schema.SObjectType.IndividualApplication.fields.getMap();

        List<RFI_Question__mdt> records = [
            SELECT DeveloperName, Question_Code__c, Section_Code__c, Field_API_Name__c,
                   Target_Object__c, Display_Type__c, Label__c, Sequence__c
            FROM RFI_Question__mdt
            ORDER BY Sequence__c ASC NULLS LAST, DeveloperName ASC
        ];
        
        if (!records.isEmpty()) {
            Integer seq = 1;
            for (RFI_Question__mdt r : records) {
                QuestionWrapper q = new QuestionWrapper();
                q.key = String.isNotBlank(r.Question_Code__c) ? r.Question_Code__c : r.DeveloperName;
                q.sectionCode = String.isNotBlank(r.Section_Code__c) ? r.Section_Code__c : 'SEC_ABOUT_ORG';
                q.sequence = r.Sequence__c != null ? Integer.valueOf(r.Sequence__c) : seq++;
                q.targetObject = String.isNotBlank(r.Target_Object__c) ? r.Target_Object__c : 'IndividualApplication';
                q.targetField = r.Field_API_Name__c;
                q.label = r.Label__c;
                q.isRequired = false;
                q.applicableTracks = new List<String>();
                q.picklistOptions = new List<PicklistOption>();
                q.isCustom = !builtInKeys.contains(q.key);

                // Auto-describe field if on IndividualApplication
                String fieldNameLower = String.isNotBlank(q.targetField) ? q.targetField.toLowerCase() : '';
                if (q.targetObject == 'IndividualApplication' && appFieldMap.containsKey(fieldNameLower)) {
                    Schema.DescribeFieldResult dfr = appFieldMap.get(fieldNameLower).getDescribe();
                    if (String.isBlank(q.label)) {
                        q.label = dfr.getLabel();
                    }
                    if (String.isBlank(q.helpText)) {
                        q.helpText = dfr.getInlineHelpText();
                    }
                    q.isRequired = !dfr.isNillable();

                    // Detect Display Type if blank or Auto
                    if (String.isBlank(r.Display_Type__c) || r.Display_Type__c.equalsIgnoreCase('Auto')) {
                        Schema.DisplayType dt = dfr.getType();
                        if (dt == Schema.DisplayType.PICKLIST) q.displayType = 'Picklist';
                        else if (dt == Schema.DisplayType.TEXTAREA) q.displayType = dfr.isHtmlFormatted() ? 'RichText' : 'TextArea';
                        else if (dt == Schema.DisplayType.BOOLEAN) q.displayType = 'Checkbox';
                        else if (dt == Schema.DisplayType.DATE) q.displayType = 'Date';
                        else if (dt == Schema.DisplayType.DATETIME) q.displayType = 'DateTime';
                        else if (dt == Schema.DisplayType.INTEGER || dt == Schema.DisplayType.DOUBLE || dt == Schema.DisplayType.CURRENCY || dt == Schema.DisplayType.PERCENT) q.displayType = 'Number';
                        else if (dt == Schema.DisplayType.EMAIL) q.displayType = 'Email';
                        else if (dt == Schema.DisplayType.PHONE) q.displayType = 'Phone';
                        else q.displayType = 'Text';
                    } else {
                        q.displayType = r.Display_Type__c;
                    }

                    // Populate picklist options if applicable
                    if (dfr.getType() == Schema.DisplayType.PICKLIST) {
                        for (Schema.PicklistEntry pe : dfr.getPicklistValues()) {
                            if (pe.isActive()) {
                                q.picklistOptions.add(new PicklistOption(pe.getLabel(), pe.getValue()));
                            }
                        }
                    }
                } else {
                    q.displayType = String.isNotBlank(r.Display_Type__c) ? r.Display_Type__c : 'Text';
                }

                if (String.isBlank(q.label)) {
                    q.label = r.DeveloperName;
                }

                questions.add(q);
            }
            return questions;
        }

        // Default questions fallback
        QuestionWrapper qTrack = new QuestionWrapper();
        qTrack.key = 'Q_SELECTED_TRACKS';
        qTrack.sectionCode = 'SEC_ABOUT_ORG';
        qTrack.sequence = 1;
        qTrack.displayType = 'MultiSelectCard';
        qTrack.targetObject = 'IndividualApplication';
        qTrack.targetField = 'Selected_Funding_Tracks__c';
        qTrack.label = 'Select Funding Track(s)';
        qTrack.helpText = 'You may select one or more tracks that apply to your organization.';
        qTrack.isRequired = true;
        qTrack.applicableTracks = new List<String>();
        qTrack.isCustom = false;
        questions.add(qTrack);
        
        QuestionWrapper qName = new QuestionWrapper();
        qName.key = 'Q_ORG_NAME';
        qName.sectionCode = 'SEC_ABOUT_ORG';
        qName.sequence = 2;
        qName.displayType = 'Text';
        qName.targetObject = 'IndividualApplication';
        qName.targetField = 'Organization_Name__c';
        qName.label = 'Legal Organization Name';
        qName.placeholder = 'Enter full registered legal name';
        qName.isRequired = true;
        qName.applicableTracks = new List<String>();
        qName.isCustom = false;
        questions.add(qName);
        
        QuestionWrapper qHistFin = new QuestionWrapper();
        qHistFin.key = 'Q_HIST_FINANCIALS';
        qHistFin.sectionCode = 'SEC_OUTCOMES';
        qHistFin.sequence = 1;
        qHistFin.displayType = 'FinancialGrid';
        qHistFin.targetObject = 'Historical_Data__c';
        qHistFin.label = 'Historical Financial Performance';
        qHistFin.helpText = 'Provide audited financial figures across the 3 prior fiscal years.';
        qHistFin.isRequired = true;
        qHistFin.applicableTracks = new List<String>();
        qHistFin.isCustom = false;
        questions.add(qHistFin);

        QuestionWrapper qOutcomes = new QuestionWrapper();
        qOutcomes.key = 'Q_OUTCOMES';
        qOutcomes.sectionCode = 'SEC_OUTCOMES';
        qOutcomes.sequence = 2;
        qOutcomes.displayType = 'OutcomeGrid';
        qOutcomes.targetObject = 'Outcomes_Data__c';
        qOutcomes.label = 'Programmatic Outcomes';
        qOutcomes.helpText = 'Historical and current projected outcomes for your selected tracks.';
        qOutcomes.isRequired = true;
        qOutcomes.applicableTracks = new List<String>();
        qOutcomes.isCustom = false;
        questions.add(qOutcomes);

        return questions;
    }


    private static List<RuleWrapper> getDependencyRules() {
        List<RuleWrapper> rules = new List<RuleWrapper>();
        
        RuleWrapper r1 = new RuleWrapper();
        r1.targetQuestionKey = 'Q_JOB_PLACEMENT_DETAILS';
        r1.sourceQuestionKey = 'Q_SELECTED_TRACKS';
        r1.operator = 'TRACK_INCLUDES';
        r1.value = 'JOB_FULFILLMENT';
        r1.action = 'SHOW';
        rules.add(r1);

        RuleWrapper r2 = new RuleWrapper();
        r2.targetQuestionKey = 'Q_JOB_CREATION_DETAILS';
        r2.sourceQuestionKey = 'Q_SELECTED_TRACKS';
        r2.operator = 'TRACK_INCLUDES';
        r2.value = 'JOB_CREATION';
        r2.action = 'SHOW';
        rules.add(r2);

        return rules;
    }

    private static Map<String, String> getTranslations(String languageCode) {
        Map<String, String> transMap = new Map<String, String>();
        transMap.put('BTN_NEXT', 'Next');
        transMap.put('BTN_PREV', 'Previous');
        transMap.put('BTN_SAVE_DRAFT', 'Save Draft');
        transMap.put('BTN_SUBMIT', 'Submit Application');
        return transMap;
    }
}
