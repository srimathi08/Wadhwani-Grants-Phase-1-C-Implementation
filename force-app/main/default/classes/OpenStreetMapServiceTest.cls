@IsTest
private class OpenStreetMapServiceTest {
    private class PhotonSuccessMock implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest request) {
            System.assertEquals('GET', request.getMethod());
            System.assert(request.getEndpoint().contains('photon.komoot.io/api/'));
            System.assert(request.getEndpoint().contains('q=Bengaluru'));
            HttpResponse response = new HttpResponse();
            response.setStatusCode(200);
            response.setBody('{"features":[{"properties":{"name":"Bengaluru"}}]}');
            return response;
        }
    }

    private class CalloutFailureMock implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest request) {
            throw new CalloutException('Mock callout failure');
        }
    }

    @TestSetup static void setup() { WCF_TestDataFactory.createBundle(); }

    @IsTest static void returnsPhotonResponseForEncodedQuery() {
        Test.setMock(HttpCalloutMock.class, new PhotonSuccessMock());
        Test.startTest();
        String body = OpenStreetMapService.searchLocation('Bengaluru');
        Test.stopTest();
        System.assert(body.contains('Bengaluru'));
    }

    @IsTest static void wrapsCalloutErrorsForAuraClients() {
        Test.setMock(HttpCalloutMock.class, new CalloutFailureMock());
        try {
            OpenStreetMapService.searchLocation('New York');
            System.assert(false, 'The mocked callout must fail.');
        } catch (AuraHandledException e) {
            System.assert(String.isNotBlank(e.getMessage()));
        }
    }
}