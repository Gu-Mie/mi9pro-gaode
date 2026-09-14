param([string]$Serial)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskAdb = Join-Path $taskRoot '.local\adb\platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $taskAdb)) { $taskAdb = (Get-Command adb -ErrorAction Stop).Source }
$taskAdbArgs = @()
if ($Serial) { $taskAdbArgs = @('-s', $Serial) }
# Some OEMs ignore dumpsys package filters. Filter again locally before displaying or saving.
# The unfiltered response stays in memory and is never written to a file.
$taskDump = (& $taskAdb @taskAdbArgs shell dumpsys notification --noredact --package com.autonavi.minimap | Out-String)
if ($LASTEXITCODE -ne 0) { throw 'ADB could not read notification state.' }
$taskRecords = [regex]::Matches($taskDump, '(?ms)^\s{4}NotificationRecord\(.*?(?=^\s{4}NotificationRecord\(|^\s{2}\S|\z)')
$taskAmap = @($taskRecords | Where-Object { $_.Value.Split([char]10)[0] -match 'pkg=com\.autonavi\.minimap\b' })
if ($taskAmap.Count -eq 0) { Write-Output 'No active Gaode notification found. Start navigation and switch to the home screen.'; return }
$taskSampleDir = Join-Path $taskRoot '.local\samples'
New-Item -ItemType Directory -Force -Path $taskSampleDir | Out-Null
$taskOutput = Join-Path $taskSampleDir ('amap-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
$taskSelected = ($taskAmap | ForEach-Object { $_.Value }) -join "`n"
[IO.File]::WriteAllText($taskOutput, $taskSelected, [Text.UTF8Encoding]::new($false))
Write-Output ('Saved Gaode-only sample: ' + $taskOutput)
$taskSelected -split '\r?\n' | Where-Object { $_ -match 'NotificationRecord\(|android\.(title|text|bigText|subText|textLines)|tickerText=|contentView=|bigContentView=|mUpdateTimeMs=' }

