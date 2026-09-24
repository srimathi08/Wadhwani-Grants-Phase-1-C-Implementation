# Script to parse Wadhwani_Grants_Phase1_Email_Map_2026-08-12.html and output structured json/text
$html = Get-Content -Path 'Wadhwani_Grants_Phase1_Email_Map_2026-08-12.html' -Raw

# Extract all table rows
$pattern = '(?s)<tr>(.*?)</tr>'
$matches = [regex]::Matches($html, $pattern)

Write-Host "Total rows found: $($matches.Count)"

$allRows = @()
foreach ($m in $matches) {
    $rowContent = $m.Groups[1].Value
    $colMatches = [regex]::Matches($rowContent, '(?s)<t[dh][^>]*>(.*?)</t[dh]>')
    $cols = @()
    foreach ($cm in $colMatches) {
        $cleanCol = [regex]::Replace($cm.Groups[1].Value, '<[^>]+>', '').Trim()
        $cleanCol = [System.Web.HttpUtility]::HtmlDecode($cleanCol)
        $cols += $cleanCol
    }
    if ($cols.Count -gt 0) {
        $allRows += ,$cols
    }
}

$outputFile = 'extracted_email_map.json'
$allRows | ConvertTo-Json -Depth 5 | Set-Content -Path $outputFile -Encoding utf8
Write-Host "Saved extracted rows to $outputFile"
