# Deep audit of all flows and email alerts
$flows = Get-ChildItem -Path 'force-app/main/default/flows' -Filter '*.flow-meta.xml'
$results = @()

foreach ($fl in $flows) {
    [xml]$xml = Get-Content $fl.FullName -Raw
    $flowName = $fl.BaseName
    
    # Check actionCalls
    if ($xml.Flow.actionCalls) {
        foreach ($action in $xml.Flow.actionCalls) {
            $results += [PSCustomObject]@{
                Flow = $flowName
                Type = 'ActionCall'
                Name = $action.name
                ActionName = $action.actionName
                ActionType = $action.actionType
                Details = ($action.inputParameters | ForEach-Object { "$($_.name)=$($_.value.stringValue)" }) -join '; '
            }
        }
    }
}

$results | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
$results | Export-Csv -Path 'flow_actions_audit.csv' -NoTypeInformation
