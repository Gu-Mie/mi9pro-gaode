$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskCache = Join-Path $taskRoot '.local\downloads'
$taskDestination = Join-Path $taskRoot 'android\app\libs\xms-wearable-lib_1.4_release.aar'
$taskExpected = '9C40FD1C5409BB948523D503AF71E2978AE522C35636AFE7D64F474C0F6BC195'
if (Test-Path -LiteralPath $taskDestination) {
    if ((Get-FileHash -LiteralPath $taskDestination -Algorithm SHA256).Hash -eq $taskExpected) { Write-Output 'Xiaomi SDK already verified.'; return }
    throw 'An unexpected SDK file exists. Preserve it and inspect before replacing.'
}
New-Item -ItemType Directory -Force -Path $taskCache,(Split-Path -Parent $taskDestination) | Out-Null
$taskArchive = Join-Path $taskCache 'interconnect-demo.zip'
Invoke-WebRequest -UseBasicParsing -Uri 'https://cdn.cnbj3-fusion.fds.api.mi-img.com/quickapp-vela/interconnect_dev_test_demo.zip' -OutFile $taskArchive
$taskZip = [IO.Compression.ZipFile]::OpenRead($taskArchive)
try {
    $taskEntry = $taskZip.GetEntry('interconnect_dev_test_demo/libs/xms-wearable-lib_1.4_release.aar')
    if (-not $taskEntry) { throw 'Official archive no longer contains the expected SDK.' }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($taskEntry, $taskDestination, $false)
} finally { $taskZip.Dispose() }
if ((Get-FileHash -LiteralPath $taskDestination -Algorithm SHA256).Hash -ne $taskExpected) { throw 'SDK checksum mismatch; do not build with this file.' }
Write-Output 'Official Xiaomi SDK downloaded and verified.'

