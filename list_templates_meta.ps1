$items = Get-ChildItem -Path 'force-app/main/default/email/WCF_Folder' -Filter '*.email-meta.xml'
$list = @()
foreach ($item in $items) {
    [xml]$xml = Get-Content $item.FullName -Raw
    $list += [PSCustomObject]@{
        BaseName = $item.BaseName.Replace('.email', '')
        TemplateName = $xml.EmailTemplate.name
    }
}
$list | Sort-Object BaseName | Format-Table -AutoSize
