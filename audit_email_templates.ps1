$emailFiles = Get-ChildItem -Path 'force-app/main/default/email/WCF_Folder' -Filter '*.email' | Select-Object -ExpandProperty BaseName
$flows = Get-ChildItem -Path 'force-app/main/default/flows' -Filter '*.flow-meta.xml'

$templates = @(
  @{ Code='E-15'; Name='Verify your email address'; Cat='Partner'; Keys=@('Verify_Email_Address','E_15_OTP') },
  @{ Code='E-01'; Name='Welcome to Wadhwani Grants'; Cat='Partner'; Keys=@('Welcome_to_Wadhwani_Grants_your_account_is_ready','Wadhwani_Grants_Welcome_Email_for_Applicant') },
  @{ Code='E-02'; Name='Your draft has been saved'; Cat='Partner'; Keys=@('Draft_Saved') },
  @{ Code='E-03'; Name='We have received your application'; Cat='Partner'; Keys=@('Application_Received','Proposal_Submission_Confirmation') },
  @{ Code='E-04'; Name='Action required: update your application'; Cat='Partner'; Keys=@('Action_Required_Update_Application','Application_Revision_Requested') },
  @{ Code='E-52'; Name='Reminder on a pending return (30/60/90 days)'; Cat='Partner'; Keys=@('Additional_Information_Reminder','Additional_Information_Reminder_60days','Additional_Information_Reminder_90days') },
  @{ Code='E-28'; Name='Your updated application is in'; Cat='Partner'; Keys=@('Resubmission_Received_Partner','Resubmission_Received') },
  @{ Code='E-05'; Name='Your application is now being reviewed'; Cat='Partner'; Keys=@('Application_Validated_Under_Review') },
  @{ Code='E-08'; Name='Application approved'; Cat='Partner'; Keys=@('Application_Approved') },
  @{ Code='E-10'; Name='Application declined'; Cat='Partner'; Keys=@('Application_Decision_Declined') },
  @{ Code='E-12'; Name='Compliance documents requested'; Cat='Partner'; Keys=@('Compliance_Documents_Requested') },
  @{ Code='E-62'; Name='Your document upload has started'; Cat='Partner'; Keys=@('Compliance_your_document_upload_has_started','Compliance_Documents_Draft_Saved') },
  @{ Code='E-24'; Name='Compliance document updates needed'; Cat='Partner'; Keys=@('Compliance_Revision_Requested') },
  @{ Code='E-56'; Name='Reminder on compliance documents (30/60/90 days)'; Cat='Partner'; Keys=@('Compliance_Documents_Reminder','Compliance_Documents_Reminder_60_days','Compliance_Documents_Reminder_90_days') },
  @{ Code='E-25'; Name='We have received your documents'; Cat='Partner'; Keys=@('We_have_received_your_compliance_documents','Compliance_Documents_Submitted') },
  @{ Code='E-63'; Name='Your compliance documents are approved'; Cat='Partner'; Keys=@('Compliance_Documents_Approved') },
  @{ Code='E-23'; Name='Your onboarding is complete'; Cat='Partner'; Keys=@('Onboarding_Complete_Partner','Your_onboarding_with_Wadhwani_Grants_is_complete') },
  @{ Code='E-53'; Name='We are closing your application (Day 100 timeout)'; Cat='Partner'; Keys=@('We_are_closing_your_application_for_now','Application_Closed_Timeout') },
  @{ Code='E-59'; Name='Your account is suspended'; Cat='Partner'; Keys=@('Your_account_is_suspended') },
  @{ Code='E-60'; Name='We have paused your onboarding (Day 100 timeout)'; Cat='Partner'; Keys=@('We_have_paused_your_onboarding') },
  @{ Code='E-17'; Name='New application to check'; Cat='Validator'; Keys=@('New_Application_Validator_Queue') },
  @{ Code='E-18'; Name='Validation due soon'; Cat='Validator'; Keys=@('Validation_Due_Soon') },
  @{ Code='E-48'; Name='The reviewer needs more information'; Cat='Validator'; Keys=@('Additional_Information_Requested') },
  @{ Code='E-57'; Name='An email to the applicant bounced'; Cat='Validator'; Keys=@('Email_Bounced_Validator_Alert') },
  @{ Code='E-58'; Name='This organization may already be on record'; Cat='Validator'; Keys=@('Duplicate_Organization_Validator_Alert') },
  @{ Code='E-06'; Name='New evaluation assigned'; Cat='Reviewer'; Keys=@('New_Evaluation_Assigned') },
  @{ Code='E-46'; Name='Passed to review, with a flagged concern'; Cat='Reviewer'; Keys=@('Passed_to_Review_Flagged_Concern','Passed_to_review_with_a_flagged_concern') },
  @{ Code='E-07'; Name='Your evaluation is due soon'; Cat='Reviewer'; Keys=@('Evaluation_Due_Soon') },
  @{ Code='E-31'; Name='Decision recorded'; Cat='Reviewer'; Keys=@('Decision_Recorded_PL_Alert','Decision_recorded') },
  @{ Code='E-36'; Name='Compliance documents submitted for review'; Cat='Reviewer'; Keys=@('Compliance_Docs_Submitted_Validator','Compliance_documents_submitted_for_review') },
  @{ Code='E-49'; Name='Information located, review can resume'; Cat='Reviewer'; Keys=@('Information_Located_Review_Can_Resume') },
  @{ Code='E-51'; Name='Returned for additional detail'; Cat='Reviewer'; Keys=@('Approver_Further_Detail_Request_PL') },
  @{ Code='E-22'; Name='Ready for decision'; Cat='Approver'; Keys=@('Ready_for_decision','All_Reviews_Complete_Approver_Alert') },
  @{ Code='E-47'; Name='Decline recommended, with reasons'; Cat='Approver'; Keys=@('Decline_recommended_with_reasons') },
  @{ Code='E-55'; Name='A decision is overdue'; Cat='Approver'; Keys=@('A_decision_is_overdue') },
  @{ Code='E-33'; Name='Compliance cleared, ready for approval'; Cat='Approver'; Keys=@('Compliance_Cleared_Approver_Alert','DD_Complete_Ready_for_Deliberation') },
  @{ Code='E-39'; Name='Your password was changed'; Cat='Account'; Keys=@('Password_Changed_Confirmation') },
  @{ Code='E-16'; Name='Reset your password'; Cat='Account'; Keys=@('Reset_Password_Request1') },
  @{ Code='E-38'; Name='Your account is locked'; Cat='Account'; Keys=@('Account_Locked') },
  @{ Code='E-27'; Name='Activate your platform account'; Cat='Account'; Keys=@('Internal_User_Account_Activation') }
)

$out = @()
foreach ($item in $templates) {
    $foundTemplate = 'MISSING'
    foreach ($k in $item.Keys) {
        if ($emailFiles -contains $k) {
            $foundTemplate = $k
            break
        }
    }
    
    $foundFlows = @()
    if ($foundTemplate -ne 'MISSING') {
        foreach ($fl in $flows) {
            $content = Get-Content -Path $fl.FullName -Raw
            if ($content.Contains($foundTemplate) -or $content.Contains($item.Code)) {
                $foundFlows += $fl.BaseName
            }
        }
    }
    $flowsStr = if ($foundFlows.Count -gt 0) { ($foundFlows -join ', ') } else { 'NONE' }
    $out += [PSCustomObject]@{
        Code = $item.Code
        Category = $item.Cat
        Name = $item.Name
        Template = $foundTemplate
        Flow = $flowsStr
    }
}

$out | Format-Table -AutoSize
