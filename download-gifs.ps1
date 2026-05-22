# Download GIFs from UjjwalSaini07 (same assets) so you can host them in your repo.
# Run in PowerShell: .\download-gifs.ps1
# Then commit the GIFs and push. Your README will link to you, not Ujjwal.

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = "https://raw.githubusercontent.com/UjjwalSaini07/UjjwalSaini07/main/Assets_Used/Gifs"
$gifs = @(
    "Port_Shocking.gif",
    "Port_EyeFlikiring.gif",
    "Port_AngerVolcano.gif",
    "Port_ShowingAnger.gif",
    "Port_Msg.gif",
    "Port_ShowingLove.gif",
    "Port_Laptop.gif",
    "Port_ThumbUp.gif",
    "Port_HandShake.gif"
)
$dest = $PSScriptRoot
$curl = Get-Command curl.exe -ErrorAction SilentlyContinue
foreach ($g in $gifs) {
    $url = "$base/$g"
    $out = Join-Path $dest $g
    $ok = $false
    try {
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        $ok = $true
    }
    catch { }
    if (-not $ok -and $curl) {
        & curl.exe -L -s -o $out $url
        if (Test-Path $out) { $ok = (Get-Item $out).Length -gt 0 }
    }
    if ($ok) { Write-Host "OK: $g" } else { Write-Host "FAIL: $g" }
}
Write-Host "`nDone. Check *.gif in this folder, then commit and push."