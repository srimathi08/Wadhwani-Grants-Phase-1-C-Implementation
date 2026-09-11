List<Flow> flows = [SELECT Id, DeveloperName, Status, MasterLabel FROM Flow WHERE DeveloperName LIKE '%IndividualApplication%' OR DeveloperName LIKE '%Wadhwani%'];
for (Flow f : flows) {
    System.debug('FLOW: ' + f.DeveloperName + ' | Status: ' + f.Status);
}
