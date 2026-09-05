/**
 * kioskShortcut.ts
 * Generates Windows desktop shortcut installer for silent USB thermal printing (zero-dialog kiosk mode).
 */

export function getKioskUrl(): string {
  if (typeof window === "undefined") return "http://localhost:8080/qsr-pos";
  return `${window.location.origin}/qsr-pos`;
}

export function generateKioskBatchScript(url?: string, appName = "TastyBite POS"): string {
  const targetUrl = url || getKioskUrl();
  return `@echo off
setlocal
echo ============================================================
echo   Creating ${appName} Silent Direct Print Shortcut
echo ============================================================
echo.

set "BROWSER_PATH="
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
) else if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
) else if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
    set "BROWSER_PATH=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"
) else if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set "BROWSER_PATH=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
) else if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set "BROWSER_PATH=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"
)

if "%BROWSER_PATH%"=="" (
    echo [ERROR] Neither Google Chrome nor Microsoft Edge was found on this computer.
    echo Please install Chrome or Edge first.
    pause
    exit /b 1
)

set "VBS_SCRIPT=%TEMP%\\create_pos_shortcut_%RANDOM%.vbs"
(
    echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
    echo sLink = oWS.SpecialFolders^("Desktop"^) ^& "\\${appName} (Direct Print).lnk"
    echo Set oLink = oWS.CreateShortcut^(sLink^)
    echo oLink.TargetPath = "%BROWSER_PATH%"
    echo oLink.Arguments = "--kiosk-printing --app=${targetUrl}"
    echo oLink.Description = "${appName} with Silent USB Thermal Printing"
    echo oLink.Save
) > "%VBS_SCRIPT%"

cscript /nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%"

echo.
echo ============================================================
echo   [SUCCESS] Shortcut created on your Desktop:
echo   "${appName} (Direct Print)"
echo ============================================================
echo.
echo URL: ${targetUrl}
echo Mode: Silent Kiosk Printing (Zero Dialog Window)
echo.
echo Launch POS using this desktop shortcut for instant direct printing!
echo.
pause
`;
}

export function downloadKioskShortcut(url?: string, appName = "TastyBite POS"): void {
  const content = generateKioskBatchScript(url, appName);
  const blob = new Blob([content], { type: "application/bat;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `Create_${appName.replace(/[^a-zA-Z0-9]/g, "_")}_Direct_Print_Shortcut.bat`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

export function getKioskPowerShellCommand(url?: string, appName = "TastyBite POS"): string {
  const targetUrl = url || getKioskUrl();
  return `$ws = New-Object -ComObject WScript.Shell; $d = $ws.SpecialFolders("Desktop"); $s = $ws.CreateShortcut("$d\\${appName} (Direct Print).lnk"); $chrome = if (Test-Path "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe") { "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe" } elseif (Test-Path "$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe") { "$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe" } else { "\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe" }; $s.TargetPath = $chrome; $s.Arguments = "--kiosk-printing --app=${targetUrl}"; $s.Save(); Write-Host "Direct Print Shortcut created on Desktop!" -ForegroundColor Green`;
}

