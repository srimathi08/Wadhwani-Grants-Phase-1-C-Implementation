List<FlowDefinitionView> flows = [SELECT Id, ApiName, Label, ProcessType FROM FlowDefinitionView];
System.debug('=== FLOW DEFINITION VIEWS ===');
for (FlowDefinitionView f : flows) {
    if (f.ApiName.contains('Individual') || f.Label.contains('Individual') || f.ApiName.contains('Wadhwani') || f.Label.contains('Wadhwani')) {
        System.debug('Flow: ' + f.ApiName + ' | Label: ' + f.Label + ' | ProcessType: ' + f.ProcessType);
    }
}
