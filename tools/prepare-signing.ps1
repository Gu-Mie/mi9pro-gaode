$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskJdk = $env:JAVA_HOME
if (-not $taskJdk) {
    $taskJdk = (Get-ChildItem -LiteralPath "$taskRoot\.local\jdk" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
}
if (-not $taskJdk -or -not (Test-Path -LiteralPath "$taskJdk\bin\java.exe")) { throw 'Install JDK 17+ and set JAVA_HOME first.' }
New-Item -ItemType Directory -Force -Path "$taskRoot\signing" | Out-Null
if (-not (Test-Path -LiteralPath "$taskRoot\signing\development.p12")) {
    & "$taskJdk\bin\keytool.exe" -genkeypair -keystore "$taskRoot\signing\development.p12" -storetype PKCS12 -storepass android -keypass android -alias wrist-navigation -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=Wrist Navigation Development, O=Local Development, C=CN'
    if ($LASTEXITCODE -ne 0) { throw 'Signing identity generation failed.' }
}
& "$taskJdk\bin\java.exe" "$PSScriptRoot\ExportSigning.java" $taskRoot
if ($LASTEXITCODE -ne 0) { throw 'PEM export failed.' }

