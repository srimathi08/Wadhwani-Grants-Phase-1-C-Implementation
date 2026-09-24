$templates = Get-ChildItem -Path "force-app/main/default/email/WCF_Folder" -Filter "*.email"
$results = @()

foreach ($t in $templates) {
    $relPath = "force-app/main/default/email/WCF_Folder/" + $t.Name
    $log = git log --follow --format="%h|%ad|%an|%s" --date=iso-local -- $relPath
    $commits = $log -split "`r?`n" | Where-Object { $_ -ne '' }
    
    $created = $commits[-1] -split '\|'
    $lastMod = $commits[0] -split '\|'
    
    $results += [PSCustomObject]@{
        TemplateName       = $t.BaseName
        TotalCommits       = $commits.Count
        CreatedDate        = $created[1]
        CreatedCommit      = $created[0]
        CreatedSubject     = $created[3]
        LastModifiedDate   = $lastMod[1]
        LastModifiedCommit = $lastMod[0]
        LastCommitSubject  = $lastMod[3]
    }
}

$results | Export-Csv -Path "email_template_git_audit.csv" -NoTypeInformation
$results | Format-Table TemplateName, TotalCommits, CreatedDate, LastModifiedDate, LastModifiedCommit, LastCommitSubject -AutoSize
