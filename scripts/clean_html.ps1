$filePath = "force-app/main/default/lwc/wcfRfiResponsePage/wcfRfiResponsePage.html"
$rawBytes = [System.IO.File]::ReadAllBytes($filePath)
$str = [System.Text.Encoding]::UTF8.GetString($rawBytes)
# Replace non-ascii with simple hyphen
$clean = [System.Text.RegularExpressions.Regex]::Replace($str, "[^\x09\x0A\x0D\x20-\x7E]", "")
[System.IO.File]::WriteAllText($filePath, $clean, [System.Text.Encoding]::UTF8)
Write-Host "Successfully cleaned wcfRfiResponsePage.html"
