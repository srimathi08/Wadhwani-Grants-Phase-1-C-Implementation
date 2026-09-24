$templates = Get-ChildItem -Path "force-app/main/default/email/WCF_Folder" -Filter "*.email"
$results = @()

foreach ($t in $templates) {
    $relPath = "force-app/main/default/email/WCF_Folder/" + $t.Name
    $lines = git log --follow --format="%h|%ad|%an|%s" --date=iso-local -- $relPath
    $commits = @($lines -split "`r?`n" | Where-Object { $_ -ne '' -and $_ -match '\|' })
    
    $firstParts = $commits[-1] -split '\|'
    $lastParts  = $commits[0]  -split '\|'
    
    $results += [PSCustomObject]@{
        TemplateName       = $t.BaseName
        TotalCommits       = $commits.Count
        CreatedCommit      = $firstParts[0]
        CreatedDate        = $firstParts[1]
        LastModifiedCommit = $lastParts[0]
        LastModifiedDate   = $lastParts[1]
        LastCommitSubject  = $lastParts[3]
    }
}

$results | Export-Csv -Path "email_template_git_audit_clean.csv" -NoTypeInformation
$results | Format-Table -AutoSize
