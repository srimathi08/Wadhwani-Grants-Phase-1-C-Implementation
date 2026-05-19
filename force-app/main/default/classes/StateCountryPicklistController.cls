public class StateCountryPicklistController {
   /* @RemoteAction
    public static Map<String, Object> getCountryStatePicklists() {
        Map<String, Object> picklistValues = new Map<String, Object>();
        List<String> countries = new List<String>();
        Map<String, List<String>> states = new Map<String, List<String>>();

        Schema.DescribeFieldResult countryFieldDescribe = Account.BillingCountryCode.getDescribe();
        if (countryFieldDescribe == null || countryFieldDescribe.getPicklistValues() == null) {
            System.debug('BillingCountryCode picklist is null or empty.');
            return picklistValues; // Return empty map to avoid null reference
        }

        // Get Country Picklist Values
        for (Schema.PicklistEntry countryEntry : countryFieldDescribe.getPicklistValues()) {
            if (countryEntry != null) {
                countries.add(countryEntry.getLabel());
                states.put(countryEntry.getLabel(), new List<String>());
            }
        }
        picklistValues.put('countries', countries);

        // Get States from Custom Metadata
        List<Country_State_Mapping__mdt> mappings = [SELECT Country__c, State__c FROM Country_State_Mapping__mdt];
        if (mappings.isEmpty()) {
            System.debug('No records found in Country_State_Mapping__mdt.');
        } else {
            for (Country_State_Mapping__mdt mapping : mappings) {
                if (states.containsKey(mapping.Country__c)) {
                    states.get(mapping.Country__c).add(mapping.State__c);
                }
            }
        }
        picklistValues.put('states', states);

        return picklistValues;
    }*/
}