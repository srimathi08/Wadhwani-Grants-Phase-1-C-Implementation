public with sharing class OpenStreetMapService {
    
    @AuraEnabled(cacheable=true)
    public static String searchLocation(String query) {
        try {
            
            String endpoint = 'https://photon.komoot.io/api/?q=' 
                + EncodingUtil.urlEncode(query, 'UTF-8') 
                + '&limit=5&layer=city&lang=en';
            
            Http http = new Http();
            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint);
            req.setMethod('GET');
            req.setHeader('Accept', 'application/json');
            req.setHeader('User-Agent', 'Salesforce-LWC');
            
            HttpResponse res = http.send(req);
            return res.getBody();
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}