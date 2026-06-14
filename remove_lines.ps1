$file = 'c:\Users\TagenLab-Web3\Desktop\RhizaWebWallet\pages\Transfer.tsx'
$lines = [System.IO.File]::ReadAllLines($file)
$keep = [System.Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt $lines.Length; $i++) {
  $lineNum = $i + 1
  if ($lineNum -lt 997 -or $lineNum -gt 1175) {
    $keep.Add($lines[$i])
  }
}
[System.IO.File]::WriteAllLines($file, $keep)
Write-Host "Done. Lines kept: $($keep.Count)"
