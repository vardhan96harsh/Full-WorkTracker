@echo off
echo ========================================================
echo        Work Tracker - Automated Production Build
echo ========================================================
echo.

echo [1/2] Building Frontend Vite assets...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed!
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [2/2] Packaging Desktop Electron Application (NSIS Installer)...
cd electron
call npm run dist
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Electron packaging failed!
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo ========================================================
echo [SUCCESS] Build completed successfully!
echo Setup file is available in: electron\dist\
echo ========================================================
echo.
pause
