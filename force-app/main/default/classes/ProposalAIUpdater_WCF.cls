public with sharing class ProposalAIUpdater_WCF {
   public class Request {

    @InvocableVariable(required=true)
    public Id proposalId;

    @InvocableVariable(required=true)
    public String aiJson;

    @InvocableVariable
    public String aiJson2;
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

           Map<String, Object> parsed = new Map<String, Object>();

try {
    // First Prompt JSON
    Map<String, Object> parsed1 =
        (Map<String, Object>) JSON.deserializeUntyped(cleanJson);

    parsed.putAll(parsed1);

    // Second Prompt JSON
    if (!String.isBlank(req.aiJson2)) {

        String cleanJson2 = req.aiJson2.trim()
            .replaceAll('[\\u00A0]', '')
            .replaceAll('[\\u200B\\u200C\\u200D]', '');

        Map<String, Object> parsed2 =
            (Map<String, Object>) JSON.deserializeUntyped(cleanJson2);

        parsed.putAll(parsed2);
    }

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
            // Skilling Approach
if (parsed.containsKey('SkillingApproach')) {

    Map<String,Object> skill =
        (Map<String,Object>) parsed.get('SkillingApproach');

    p.Skilling_Approach_Rating__c =
        (String) skill.get('rating');

    p.Skilling_Approach_Strength__c =
        (String) skill.get('strengths');

    p.Skilling_Approach_Weakness__c =
        (String) skill.get('weaknesses');

    p.Skilling_Approach_Summary__c =
        (String) skill.get('summary');
}
            // Job Creation Approach
            if (parsed.containsKey('jobCreationApproach')) {

            Map<String,Object> jc =
                (Map<String,Object>) parsed.get('jobCreationApproach');

            p.Job_Creation_Rating__c =
                (String) jc.get('rating');

                p.Job_Creation_Strength__c =
                (String) jc.get('strengths');

            p.Job_Creation_Weakness__c =
            (String) jc.get('weaknesses');

            p.Job_Creation_Summary__c =
            (String) jc.get('summary');
        }
            toUpdate.add(p);
        }

        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
    }
}