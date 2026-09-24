# Inspect actions in WF_Compliance_Document_flow, Wadhwani_Grants_Email, and other key flows
$targetFlows = @(
    'WF_Compliance_Document_flow',
    'Compliance_Documents_Wadhwani_Grants',
    'Wadhwani_Grants_Email',
    'Wadhwani_Grants_Welcome_Email_for_Applicant',
    'Reviewer_Email_Alert_Wadhwani_Grants',
    'WCF_Application_Decision_Flow',
    'WCF_Approver_Email_Alert_Flow'
)

foreach ($flName in $targetFlows) {
    $path = "force-app/main/default/flows/$flName.flow-meta.xml"
    if (Test-Path $path) {
        Write-Host "========================================================="
        Write-Host "FLOW: $flName"
        [xml]$xml = Get-Content $path -Raw
        
        # Trigger details
        $triggerType = $xml.Flow.start.triggerType
        $obj = $xml.Flow.start.object
        $recordTriggerType = $xml.Flow.start.recordTriggerType
        Write-Host "  Trigger: Object=$obj, Type=$triggerType, RecordTrigger=$recordTriggerType"
        
        # Action calls
        if ($xml.Flow.actionCalls) {
            foreach ($act in $xml.Flow.actionCalls) {
                $tmpl = ""
                $recip = ""
                foreach ($inp in $act.inputParameters) {
                    if ($inp.name -eq 'emailTemplateName') {
                        $tmpl = $inp.value.setupReference
                    }
                    if ($inp.name -eq 'recipientAddresses') {
                        $recip = $inp.value.collectionElements
                    }
                }
                Write-Host "  Action: Name=$($act.name), Label=$($act.label), Template=$tmpl, Recip=$recip"
            }
        }
    }
}
