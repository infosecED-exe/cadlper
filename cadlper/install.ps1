param(
    [Parameter(Mandatory = $false)]
    [string]$ExtensionId
)

$ErrorActionPreference = "Stop"

$HostName = "com.cadlper.agent"

# Script location
$SourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceHostExe = Join-Path $SourceRoot "native-host\host.exe"

# Target paths (per-user, no admin required)
$InstallRoot   = Join-Path $env:LOCALAPPDATA "DlpAgent"
$NativeHostDir = Join-Path $InstallRoot "native-host"
$LogsDir       = Join-Path $InstallRoot "logs"

$TargetHostExe = Join-Path $NativeHostDir "host.exe"
$HostManifest  = Join-Path $NativeHostDir "$HostName.json"

Write-Host ""
Write-Host "=== CADLPER ==="
Write-Host ""
if ([string]::IsNullOrWhiteSpace($ExtensionId)) {
    $ExtensionId = Read-Host "Enter the Chrome extension ID"
}

if ([string]::IsNullOrWhiteSpace($ExtensionId)) {
    throw "Extension ID is required."
}
if (!(Test-Path $SourceHostExe)) {
    throw "host.exe not found: $SourceHostExe"
}

New-Item -ItemType Directory -Force -Path $InstallRoot   | Out-Null
New-Item -ItemType Directory -Force -Path $NativeHostDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogsDir       | Out-Null

Write-Host "Directories created:"
Write-Host "  $InstallRoot"
Write-Host "  $NativeHostDir"
Write-Host "  $LogsDir"

Copy-Item $SourceHostExe $TargetHostExe -Force

Write-Host ""
Write-Host "host.exe installed:"
Write-Host "  $TargetHostExe"
$EscapedPath = $TargetHostExe -replace '\\', '\\'

$json = @"
{
  "name": "$HostName",
  "description": "DLP Native Messaging Host",
  "path": "$EscapedPath",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$ExtensionId/"
  ]
}
"@

[System.IO.File]::WriteAllText(
    $HostManifest,
    $json,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Native host manifest created:"
Write-Host "  $HostManifest"
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\$HostName" /ve /t REG_SZ /d "$HostManifest" /f | Out-Null

Write-Host ""
Write-Host "Registry configured:"
Write-Host "  HKCU\Software\Google\Chrome\NativeMessagingHosts\$HostName"
Write-Host ""
Write-Host "Installation completed successfully."
Write-Host ""
Write-Host "Extension ID:"
Write-Host "  $ExtensionId"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Restart Chrome"
Write-Host "  2. Open chrome://extensions"
Write-Host "  3. Open the extension Service Worker console"
Write-Host "  4. Test copy / paste / file selection"
Write-Host ""
Write-Host "Logs directory:"
Write-Host "  $LogsDir"
Write-Host ""
