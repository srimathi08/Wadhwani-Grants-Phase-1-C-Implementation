# Comprehensive audit script for Wadhwani Grants Phase 1 Email Templates
$emailFiles = Get-ChildItem -Path 'force-app/main/default/email/WCF_Folder' -Filter '*.email'
$flows = Get-ChildItem -Path 'force-app/main/default/flows' -Filter '*.flow-meta.xml'

$templatesSpec = @(
    # Partner (20)
    @{ Code='E-15'; Name='Verify your email address'; Cat='Partner'; Target='Verify_Email_Address'; Fallbacks=@('E_15_OTP'); Trigger='Registration sign-up OTP/verification'; Recipient='Applicant' },
    @{ Code='E-01'; Name='Welcome to Wadhwani Grants'; Cat='Partner'; Target='Welcome_to_Wadhwani_Grants_your_account_is_ready'; Fallbacks=@('Wadhwani_Grants_Welcome_Email_for_Applicant'); Trigger='Account activated'; Recipient='Applicant' },
    @{ Code='E-02'; Name='Your draft has been saved'; Cat='Partner'; Target='Draft_Saved'; Fallbacks=@(); Trigger='First save of RFI draft'; Recipient='Applicant' },
    @{ Code='E-03'; Name='We have received your application'; Cat='Partner'; Target='Application_Received'; Fallbacks=@('Proposal_Submission_Confirmation'); Trigger='Applicant submits RFI'; Recipient='Applicant' },
    @{ Code='E-04'; Name='Action required: update your application'; Cat='Partner'; Target='Action_Required_Update_Application'; Fallbacks=@('Application_Revision_Requested'); Trigger='Validator returns for fixes (Flag 2)'; Recipient='Applicant' },
    @{ Code='E-52'; Name='Reminder on a pending return (30/60/90 days)'; Cat='Partner'; Target='Additional_Information_Reminder'; Fallbacks=@('Additional_Information_Reminder_60days','Additional_Information_Reminder_90days'); Trigger='30, 60, 90 days in Returned for fixes'; Recipient='Applicant' },
    @{ Code='E-28'; Name='Your updated application is in'; Cat='Partner'; Target='Resubmission_Received_Partner'; Fallbacks=@('Resubmission_Received'); Trigger='Applicant resubmits after return'; Recipient='Applicant' },
    @{ Code='E-05'; Name='Your application is now being reviewed'; Cat='Partner'; Target='Application_Validated_Under_Review'; Fallbacks=@(); Trigger='Validator passes application (Flag 3)'; Recipient='Applicant' },
    @{ Code='E-08'; Name='Application approved'; Cat='Partner'; Target='Application_Approved'; Fallbacks=@(); Trigger='Approver approves (Flag 5)'; Recipient='Applicant' },
    @{ Code='E-10'; Name='Application declined'; Cat='Partner'; Target='Application_Decision_Declined'; Fallbacks=@(); Trigger='Approver declines OR Compliance rejected (Flag 11)'; Recipient='Applicant' },
    @{ Code='E-12'; Name='Compliance documents requested'; Cat='Partner'; Target='Compliance_Documents_Requested'; Fallbacks=@(); Trigger='Reviewer requests compliance (Flag 6)'; Recipient='Applicant' },
    @{ Code='E-62'; Name='Your document upload has started'; Cat='Partner'; Target='Compliance_your_document_upload_has_started'; Fallbacks=@('Compliance_Documents_Draft_Saved'); Trigger='First save of compliance docs (Flag 7)'; Recipient='Applicant' },
    @{ Code='E-24'; Name='Compliance document updates needed'; Cat='Partner'; Target='Compliance_Revision_Requested'; Fallbacks=@(); Trigger='Compliance revision requested (Loop D)'; Recipient='Applicant' },
    @{ Code='E-56'; Name='Reminder on compliance documents (30/60/90 days)'; Cat='Partner'; Target='Compliance_Documents_Reminder'; Fallbacks=@('Compliance_Documents_Reminder_60_days','Compliance_Documents_Reminder_90_days'); Trigger='30, 60, 90 days in Onboarding in Progress'; Recipient='Applicant' },
    @{ Code='E-25'; Name='We have received your documents'; Cat='Partner'; Target='We_have_received_your_compliance_documents'; Fallbacks=@('Compliance_Documents_Submitted'); Trigger='Applicant submits compliance docs (Flag 8)'; Recipient='Applicant' },
    @{ Code='E-63'; Name='Your compliance documents are approved'; Cat='Partner'; Target='Compliance_Documents_Approved'; Fallbacks=@(); Trigger='Reviewer approves compliance (Flag 9)'; Recipient='Applicant' },
    @{ Code='E-23'; Name='Your onboarding is complete'; Cat='Partner'; Target='Onboarding_Complete_Partner'; Fallbacks=@('Your_onboarding_with_Wadhwani_Grants_is_complete'); Trigger='Reviewer uploads executed agreement (Flag 10)'; Recipient='Applicant' },
    @{ Code='E-53'; Name='We are closing your application (Day 100 timeout)'; Cat='Partner'; Target='We_are_closing_your_application_for_now'; Fallbacks=@('Application_Closed_Timeout'); Trigger='Day 100 timeout before approval (Flag 11)'; Recipient='Applicant' },
    @{ Code='E-59'; Name='Your account is suspended'; Cat='Partner'; Target='Your_account_is_suspended'; Fallbacks=@(); Trigger='Account suspended manually (Flag 12)'; Recipient='Applicant' },
    @{ Code='E-60'; Name='We have paused your onboarding (Day 100 timeout)'; Cat='Partner'; Target='We_have_paused_your_onboarding'; Fallbacks=@(); Trigger='Day 100 timeout after approval (Flag 12)'; Recipient='Applicant' },

    # Validator (5)
    @{ Code='E-17'; Name='New application to check'; Cat='Validator'; Target='New_Application_Validator_Queue'; Fallbacks=@(); Trigger='Applicant submits RFI or resubmission'; Recipient='Validator' },
    @{ Code='E-18'; Name='Validation due soon'; Cat='Validator'; Target='Validation_Due_Soon'; Fallbacks=@(); Trigger='80% SLA timer in Completeness check'; Recipient='Validator' },
    @{ Code='E-48'; Name='The reviewer needs more information'; Cat='Validator'; Target='Additional_Information_Requested'; Fallbacks=@(); Trigger='Reviewer returns application to validator (Loop B)'; Recipient='Validator' },
    @{ Code='E-57'; Name='An email to the applicant bounced'; Cat='Validator'; Target='Email_Bounced_Validator_Alert'; Fallbacks=@(); Trigger='Post-submission bounced email'; Recipient='Validator' },
    @{ Code='E-58'; Name='This organization may already be on record'; Cat='Validator'; Target='Duplicate_Organization_Validator_Alert'; Fallbacks=@(); Trigger='Duplicate organization match'; Recipient='Validator' },

    # Reviewer (7)
    @{ Code='E-06'; Name='New evaluation assigned'; Cat='Reviewer'; Target='New_Evaluation_Assigned'; Fallbacks=@(); Trigger='Validator passes application (Flag 3)'; Recipient='Reviewer' },
    @{ Code='E-46'; Name='Passed to review, with a flagged concern'; Cat='Reviewer'; Target='Passed_to_review_with_a_flagged_concern'; Fallbacks=@('Passed_to_Review_Flagged_Concern'); Trigger='Validator passes with flag (Flag 3)'; Recipient='Reviewer' },
    @{ Code='E-07'; Name='Your evaluation is due soon'; Cat='Reviewer'; Target='Evaluation_Due_Soon'; Fallbacks=@(); Trigger='80% SLA timer in Review'; Recipient='Reviewer' },
    @{ Code='E-31'; Name='Decision recorded'; Cat='Reviewer'; Target='Decision_Recorded_PL_Alert'; Fallbacks=@('Decision_recorded'); Trigger='Approver records decision (Accept/Reject)'; Recipient='Reviewer' },
    @{ Code='E-36'; Name='Compliance documents submitted for review'; Cat='Reviewer'; Target='Compliance_Docs_Submitted_Validator'; Fallbacks=@('Compliance_documents_submitted_for_review'); Trigger='Applicant submits compliance docs (Flag 8)'; Recipient='Reviewer' },
    @{ Code='E-49'; Name='Information located, review can resume'; Cat='Reviewer'; Target='Information_Located_Review_Can_Resume'; Fallbacks=@(); Trigger='Validator resolves query -> Under Review (Loop B)'; Recipient='Reviewer' },
    @{ Code='E-51'; Name='Returned for additional detail'; Cat='Reviewer'; Target='Approver_Further_Detail_Request_PL'; Fallbacks=@(); Trigger='Approver returns to reviewer / asks question (Loop C)'; Recipient='Reviewer' },

    # Approver (4)
    @{ Code='E-22'; Name='Ready for decision'; Cat='Approver'; Target='Ready_for_decision'; Fallbacks=@('All_Reviews_Complete_Approver_Alert'); Trigger='Reviewer completes review & recommends approval (Flag 4)'; Recipient='Approver' },
    @{ Code='E-47'; Name='Decline recommended, with reasons'; Cat='Approver'; Target='Decline_recommended_with_reasons'; Fallbacks=@(); Trigger='Reviewer submits review recommending decline (Flag 4)'; Recipient='Approver' },
    @{ Code='E-55'; Name='A decision is overdue'; Cat='Approver'; Target='A_decision_is_overdue'; Fallbacks=@(); Trigger='Decision sits past 3-day window in Flag 4'; Recipient='Approver' },
    @{ Code='E-50'; Name='The detail you asked for'; Cat='Approver'; Target='The_detail_you_asked_for'; Fallbacks=@('Compliance_Cleared_Approver_Alert','DD_Complete_Ready_for_Deliberation'); Trigger='Reviewer/Validator answers approvers query (Loop C)'; Recipient='Approver' },

    # Account / Security (4)
    @{ Code='E-39'; Name='Your password was changed'; Cat='Account'; Target='Password_Changed_Confirmation'; Fallbacks=@(); Trigger='User changes password'; Recipient='User' },
    @{ Code='E-16'; Name='Reset your password'; Cat='Account'; Target='Reset_Password_Request1'; Fallbacks=@(); Trigger='User requests password reset'; Recipient='User' },
    @{ Code='E-38'; Name='Your account is locked'; Cat='Account'; Target='Account_Locked'; Fallbacks=@(); Trigger='Account locks after failed sign-ins'; Recipient='User' },
    @{ Code='E-27'; Name='Activate your platform account'; Cat='Account'; Target='Internal_User_Account_Activation'; Fallbacks=@(); Trigger='New internal user account created'; Recipient='Internal User' },

    # Retired (2)
    @{ Code='E-11'; Name='Your decision is under review'; Cat='Retired'; Target='Your_decision_is_under_review'; Fallbacks=@(); Trigger='Retired / Switched off'; Recipient='Applicant' },
    @{ Code='E-29'; Name='Evaluation submitted'; Cat='Retired'; Target='Evaluation_submitted'; Fallbacks=@(); Trigger='Retired / Not built in Phase 1'; Recipient='Reviewer' }
)

$auditReport = @()

foreach ($t in $templatesSpec) {
    $existingFile = $null
    $allKeys = @($t.Target) + $t.Fallbacks
    foreach ($k in $allKeys) {
        $matched = $emailFiles | Where-Object { $_.BaseName -eq $k }
        if ($matched) {
            $existingFile = $matched.BaseName
            break
        }
    }
    
    $wiredFlows = @()
    foreach ($fl in $flows) {
        $content = Get-Content $fl.FullName -Raw
        foreach ($k in $allKeys) {
            if ($content.Contains($k)) {
                $wiredFlows += $fl.BaseName
                break
            }
        }
    }
    
    $status = 'PENDING'
    if ($t.Cat -eq 'Retired') {
        if ($wiredFlows.Count -eq 0) {
            $status = 'RETIRED (INACTIVE)'
        } else {
            $status = 'RETIRED (WARNING: STILL WIRED IN FLOW)'
        }
    } elseif ($existingFile -ne $null -and $wiredFlows.Count -gt 0) {
        $status = 'CONFIGURED'
    } elseif ($existingFile -ne $null -and $wiredFlows.Count -eq 0) {
        $status = 'TEMPLATE EXISTS, FLOW PENDING'
    } else {
        $status = 'TEMPLATE & FLOW MISSING'
    }
    
    $auditReport += [PSCustomObject]@{
        Code = $t.Code
        Category = $t.Cat
        Name = $t.Name
        Recipient = $t.Recipient
        TriggerEvent = $t.Trigger
        TemplateFound = if ($existingFile) { $existingFile } else { 'MISSING' }
        FlowFound = if ($wiredFlows.Count -gt 0) { ($wiredFlows -join ', ') } else { 'NONE' }
        Status = $status
    }
}

$auditReport | Format-Table -AutoSize | Out-String -Width 240 | Write-Host
$auditReport | Export-Csv -Path 'comprehensive_email_audit.csv' -NoTypeInformation
