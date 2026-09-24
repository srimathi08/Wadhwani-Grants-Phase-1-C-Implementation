$flows = Get-ChildItem -Path 'force-app/main/default/flows' -Filter '*.flow-meta.xml'
$targetStrings = @(
    'Passed_to_Review_Flagged_Concern', 'Passed_to_review_with_a_flagged_concern',
    'Compliance_your_document_upload_has_started', 'Compliance_Documents_Draft_Saved',
    'We_have_received_your_compliance_documents', 'Compliance_Documents_Submitted',
    'Your_account_is_suspended', 'We_have_paused_your_onboarding',
    'Account_Locked', 'Reset_Password_Request1', 'Password_Changed_Confirmation',
    'Internal_User_Account_Activation', 'We_are_closing_your_application_for_now',
    'Compliance_Cleared_Approver_Alert', 'DD_Complete_Ready_for_Deliberation',
    'Email_Bounced_Validator_Alert', 'Duplicate_Organization_Validator_Alert',
    'Verify_Email_Address', 'E_15_OTP', 'Approver_Further_Detail_Request_PL',
    'Decision_Recorded_PL_Alert', 'Decision_recorded', 'Ready_for_decision',
    'Decline_recommended_with_reasons', 'A_decision_is_overdue'
)

foreach ($str in $targetStrings) {
    $foundIn = @()
    foreach ($fl in $flows) {
        $txt = Get-Content $fl.FullName -Raw
        if ($txt.Contains($str)) {
            $foundIn += $fl.BaseName
        }
    }
    $res = if ($foundIn.Count -gt 0) { $foundIn -join ', ' } else { 'NOT FOUND IN ANY FLOW' }
    Write-Host "$str => $res"
}
