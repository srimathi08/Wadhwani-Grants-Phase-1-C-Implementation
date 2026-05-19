public with sharing class ProposalAiFeedbackService {

    public class SectionFeedback {
        public String rating;
        public List<String> strengths;
        public List<String> weaknesses;
        public String summary;
    }

    public class AllFeedback {
        public SectionFeedback LegalStructure;
        public SectionFeedback OrganizationalSustainability;
        public SectionFeedback UseOfFunds;
        public SectionFeedback OperationalSynergies;
    }

    public class FlowInput {
        @InvocableVariable(required=true)
        public String aiResponse;
    }

    public class FlowOutput {
        @InvocableVariable public String Legal_Rating;
        @InvocableVariable public String Legal_Strengths;
        @InvocableVariable public String Legal_Weaknesses;
        @InvocableVariable public String Legal_Summary;

        @InvocableVariable public String Org_Rating;
        @InvocableVariable public String Org_Strengths;
        @InvocableVariable public String Org_Weaknesses;
        @InvocableVariable public String Org_Summary;

        @InvocableVariable public String Funds_Rating;
        @InvocableVariable public String Funds_Strengths;
        @InvocableVariable public String Funds_Weaknesses;
        @InvocableVariable public String Funds_Summary;

        @InvocableVariable public String Ops_Rating;
        @InvocableVariable public String Ops_Strengths;
        @InvocableVariable public String Ops_Weaknesses;
        @InvocableVariable public String Ops_Summary;
    }

    @InvocableMethod(label='Parse Proposal AI Feedback')
    public static List<FlowOutput> parse(List<FlowInput> inputs) {
        List<FlowOutput> results = new List<FlowOutput>();

        for (FlowInput input : inputs) {
            System.debug('⚡ Received AI Response JSON: ' + input.aiResponse);
            // Sanitize response
            String cleaned = input.aiResponse != null ? input.aiResponse.trim() : '';
            cleaned = cleaned.replaceAll('[^\\x20-\\x7E\\r\\n\\t]', '');
            
            System.debug('✨ Cleaned AI Response: ' + cleaned);
            
            FlowOutput fo = new FlowOutput();
            try {
                AllFeedback fb = (AllFeedback) JSON.deserialize(cleaned, AllFeedback.class);//input.aiResponse
                 System.debug('✅ Successfully deserialized AI response: ' + JSON.serializePretty(fb));

                if (fb.LegalStructure != null) {
                    fo.Legal_Rating    = fb.LegalStructure.rating;
                    fo.Legal_Strengths = String.join(fb.LegalStructure.strengths, '\n');
                    fo.Legal_Weaknesses= String.join(fb.LegalStructure.weaknesses, '\n');
                    fo.Legal_Summary   = fb.LegalStructure.summary;
                    System.debug('📌 Legal Structure Feedback: ' + JSON.serializePretty(fb.LegalStructure));
                }
                if (fb.OrganizationalSustainability != null) {
                    fo.Org_Rating    = fb.OrganizationalSustainability.rating;
                    fo.Org_Strengths = String.join(fb.OrganizationalSustainability.strengths, '\n');
                    fo.Org_Weaknesses= String.join(fb.OrganizationalSustainability.weaknesses, '\n');
                    fo.Org_Summary   = fb.OrganizationalSustainability.summary;
                    System.debug('📌 Org Sustainability Feedback: ' + JSON.serializePretty(fb.OrganizationalSustainability));
                }
                if (fb.UseOfFunds != null) {
                    fo.Funds_Rating    = fb.UseOfFunds.rating;
                    fo.Funds_Strengths = String.join(fb.UseOfFunds.strengths, '\n');
                    fo.Funds_Weaknesses= String.join(fb.UseOfFunds.weaknesses, '\n');
                    fo.Funds_Summary   = fb.UseOfFunds.summary;
                    System.debug('📌 Use of Funds Feedback: ' + JSON.serializePretty(fb.UseOfFunds)); 
                }
                if (fb.OperationalSynergies != null) {
                    fo.Ops_Rating    = fb.OperationalSynergies.rating;
                    fo.Ops_Strengths = String.join(fb.OperationalSynergies.strengths, '\n');
                    fo.Ops_Weaknesses= String.join(fb.OperationalSynergies.weaknesses, '\n');
                    fo.Ops_Summary   = fb.OperationalSynergies.summary;
                     System.debug('📌 Operational Synergies Feedback: ' + JSON.serializePretty(fb.OperationalSynergies));
                }

            } catch (Exception e) {
                System.debug('Parse error: ' + e.getMessage());
            }
            results.add(fo);
             System.debug('➡️ Final FlowOutput for this record: ' + JSON.serializePretty(fo));
        }
          System.debug('🎯 All FlowOutputs: ' + JSON.serializePretty(results));
        return results;
    }
}