WCFFormEngineController.DynamicDraftWrapper wrap = WCFFormEngineController.getDynamicDraft(null);
System.debug('WRAPPER isSuccess: ' + wrap.isSuccess);
System.debug('WRAPPER recordId: ' + wrap.recordId);
System.debug('WRAPPER formValues: ' + JSON.serializePretty(wrap.formValues));
