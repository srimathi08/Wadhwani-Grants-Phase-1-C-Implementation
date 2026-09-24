# Clean parser for Wadhwani_Grants_Phase1_Email_Map_2026-08-12.html
Add-Type -AssemblyName System.Web -ErrorAction SilentlyContinue

$html = Get-Content -Path 'Wadhwani_Grants_Phase1_Email_Map_2026-08-12.html' -Raw

# Match all table rows
$pattern = '(?si)<tr>(.*?)</tr>'
$rowMatches = [regex]::Matches($html, $pattern)

$rowsData = @()
foreach ($rm in $rowMatches) {
    $rowHtml = $rm.Groups[1].Value
    $cellMatches = [regex]::Matches($rowHtml, '(?si)<t[dh][^>]*>(.*?)</t[dh]>')
    $cells = @()
    foreach ($cm in $cellMatches) {
        $text = [regex]::Replace($cm.Groups[1].Value, '<[^>]+>', ' ')
        $text = [System.Net.WebUtility]::HtmlDecode($text)
        $text = [regex]::Replace($text, '\s+', ' ').Trim()
        $cells += $text
    }
    if ($cells.Count -gt 0) {
        $rowsData += ,$cells
    }
}

Write-Host "Extracted $($rowsData.Count) rows."

# Let's find rows where first or second column starts with 'E-'
$emailRows = @()
foreach ($r in $rowsData) {
    $foundCode = $null
    foreach ($cell in $r) {
        if ($cell -match '^E-\d{2}$') {
            $foundCode = $cell
            break
        }
    }
    if ($foundCode) {
        $emailRows += [PSCustomObject]@{
            Code = $foundCode
            RawCells = $r
        }
    }
}

Write-Host "Found $($emailRows.Count) email template rows."

$emailRows | ForEach-Object {
    Write-Host "[$($_.Code)] $($_.RawCells -join ' | ')"
}

$emailRows | ConvertTo-Json -Depth 5 | Set-Content -Path 'parsed_emails.json' -Encoding utf8
