$path = Resolve-Path "pages\Assets.tsx"
$lines = [System.IO.File]::ReadAllLines($path.Path)
$keepList = New-Object System.Collections.Generic.List[string]
$skipStart = 493
$skipEnd = 599
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -lt $skipStart -or $i -ge $skipEnd) {
        $keepList.Add($lines[$i])
    }
}
[System.IO.File]::WriteAllLines($path.Path, $keepList)
Write-Host "Done. Lines remaining: $($keepList.Count)"
