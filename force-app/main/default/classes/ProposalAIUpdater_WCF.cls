public with sharing class ProposalAIUpdater_WCF {
    public class Request {
        @InvocableVariable(required=true)
        public Id proposalId;
        
        @InvocableVariable(required=true)
        public String aiJson;
    }

    @InvocableMethod(label='Update Proposal with AI Results')
    public static void updateProposal(List<Request> requests) {
        List<IndividualApplication> toUpdate = new List<IndividualApplication>();
        for (Request req : requests) {
            if (String.isBlank(req.aiJson)) continue;

            // 1️⃣ Clean JSON - remove leading/trailing whitespace and non-breaking spaces
            String cleanJson = req.aiJson.trim()
                .replaceAll('[\\u00A0]', '') // removes non-breaking spaces
                .replaceAll('[\\u200B\\u200C\\u200D]', ''); // removes zero-width chars if any

            System.debug('💡 Cleaned JSON: ' + cleanJson);

            Map<String, Object> parsed;
            try {
                parsed = (Map<String, Object>) JSON.deserializeUntyped(cleanJson);
            } catch (Exception ex) {
                System.debug('❌ JSON Parse Failed: ' + ex.getMessage());
                continue;
            }

            IndividualApplication p = new IndividualApplication(Id = req.proposalId);

            // Example: parsing Legal Structure
            if (parsed.containsKey('legalStructure')) {
                Map<String, Object> legal = (Map<String, Object>) parsed.get('legalStructure');
                p.Legal_Rating__c = (String) legal.get('rating');
                p.Legal_Structure_Strength__c = (String) legal.get('strengths');
                p.Legal_Structure_Weakness__c = (String) legal.get('weaknesses');
                p.Legal_Structure_Summary__c = (String) legal.get('summary');
            }

            // Organizational Sustainability
            if (parsed.containsKey('organizationalSustainability')) {
                Map<String,Object> org = (Map<String,Object>) parsed.get('organizationalSustainability');
                p.Organizational_Stability_Rating__c = (String) org.get('rating');
                p.Organizational_Stability_Strength__c = (String) org.get('strengths');
                p.Organizational_Stability_Weakness__c = (String) org.get('weaknesses');
                p.Organizational_Stability_Summary__c = (String) org.get('summary');
            }

            // Use of Funds
            if (parsed.containsKey('useOfFunds')) {
                Map<String,Object> funds = (Map<String,Object>) parsed.get('useOfFunds');
                p.Use_of_Funds_Rating__c = (String) funds.get('rating');
                p.Use_of_Funds_Strength__c = (String) funds.get('strengths');
                p.Use_of_Funds_Weakness__c = (String) funds.get('weaknesses');
                p.Use_of_Funds_Summary__c = (String) funds.get('summary');
            }

            // Operational Synergies
            if (parsed.containsKey('operationalSynergies')) {
                Map<String,Object> ops = (Map<String,Object>) parsed.get('operationalSynergies');
                p.Operational_Synergies_Rating__c = (String) ops.get('rating');
                p.Operational_Synergies_Strength__c = (String) ops.get('strengths');
                p.Operational_Synergies_Weakness__c = (String) ops.get('weaknesses');
                p.Operational_Synergies_Summary__c = (String) ops.get('summary');
            }

            toUpdate.add(p);
        }

        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
    }
}