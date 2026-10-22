@echo off
:: Work Tracker - Complete Clean Uninstall Helper
:: Terminates any running Work Tracker instances, unregisters auto-start & uninstall entries, and removes installation folders & shortcuts.

echo ======================================================================
echo             Work Tracker - Clean Uninstall Helper
echo ======================================================================
echo.

echo 1. Stopping any running Work Tracker processes...
taskkill /F /IM "Work Tracker.exe" /T 2>nul
taskkill /F /IM "Uninstall Work Tracker.exe" /T 2>nul
taskkill /F /FI "IMAGENAME eq Un_*.exe" 2>nul
timeout /t 1 /nobreak >nul

echo 2. Removing startup and uninstall registry entries...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "electron.app.Work Tracker" /f 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\2be62e81-0dda-5eb4-877c-763c5a4afb6e" /f 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\com.worktracker.desktop" /f 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\employee-work-tracker" /f 2>nul

echo 3. Removing desktop and start menu shortcuts...
if exist "%USERPROFILE%\Desktop\Work Tracker.lnk" del /f /q "%USERPROFILE%\Desktop\Work Tracker.lnk" 2>nul
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Work Tracker.lnk" del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Work Tracker.lnk" 2>nul

echo 4. Removing installed program files...
if exist "%LOCALAPPDATA%\Programs\employee-work-tracker" (
    rmdir /s /q "%LOCALAPPDATA%\Programs\employee-work-tracker" 2>nul
)

echo 5. Removing application cache & settings...
if exist "%APPDATA%\employee-work-tracker" (
    rmdir /s /q "%APPDATA%\employee-work-tracker" 2>nul
)
if exist "%APPDATA%\worktracker" (
    rmdir /s /q "%APPDATA%\worktracker" 2>nul
)
if exist "%LOCALAPPDATA%\employee-work-tracker-updater" (
    rmdir /s /q "%LOCALAPPDATA%\employee-work-tracker-updater" 2>nul
)

echo 6. Cleaning temporary NSIS uninstaller artifacts...
if exist "%TEMP%\~nsu.tmp" (
    rmdir /s /q "%TEMP%\~nsu.tmp" 2>nul
)

echo.
echo ======================================================================
echo [SUCCESS] Work Tracker has been cleanly and completely removed!
echo ======================================================================
echo.
pause
