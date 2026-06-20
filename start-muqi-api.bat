@echo off
title MuqiMusic - API Server & ADB Reverse
setlocal enabledelayedexpansion

set "ADB=C:\Users\pengdao\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "NODE=node"
set "API_PORT=30488"
set "PROJECT_DIR=%~dp0"

echo ========================================
echo   MuqiMusic - Local API Server Starter
echo ========================================
echo.

:: Check adb
if not exist "%ADB%" (
    echo [ERROR] adb not found at: %ADB%
    echo Please update the ADB path in this script.
    pause
    exit /b 1
)

:: Check device connection
echo [1/3] Checking device...
"%ADB%" devices 2>nul | findstr "device$" >nul
if errorlevel 1 (
    echo [ERROR] No device connected via USB.
    echo Please connect your Android device and enable USB debugging.
    pause
    exit /b 1
)
echo [OK] Device connected

:: Start API server in background
echo [2/3] Starting API server on port %API_PORT%...
cd /d "%PROJECT_DIR%"
start "MuqiAPI" /MIN cmd /c "node -e \"const {serveNcmApi}=require('./node_modules/netease-cloud-music-api-alger/server');serveNcmApi({port:%API_PORT%,host:'0.0.0.0',checkVersion:false}).then(()=>console.log('[MuqiAPI] Server ready on :%API_PORT%'));\"  && echo [MuqiAPI] Server stopped. && pause"

:: Wait for server to start
echo Waiting for API server to start...
for /l %%i in (1,1,10) do (
    timeout /t 1 /nobreak >nul
    curl -s -o NUL --connect-timeout 1 http://127.0.0.1:%API_PORT%/ >nul 2>&1
    if not errorlevel 1 (
        echo [OK] API server is running
        goto :api_ready
    )
    echo.
)
echo [WARN] API server may not be ready yet, continuing...

:api_ready
:: Setup adb reverse
echo [3/3] Setting up ADB reverse (phone:30488 -^> PC:30488)...
"%ADB%" reverse --remove tcp:%API_PORT% >nul 2>&1
"%ADB%" reverse tcp:%API_PORT% tcp:%API_PORT%
if errorlevel 1 (
    echo [ERROR] adb reverse failed
    pause
    exit /b 1
)
echo [OK] adb reverse set up

:: Verify on device
echo.
echo Verifying API on device...
"%ADB%" shell "curl -s --connect-timeout 2 http://127.0.0.1:%API_PORT%/" >nul 2>&1
if errorlevel 1 (
    echo [WARN] API not reachable on device yet (may need a moment)
) else (
    echo [OK] API reachable on device!
)

echo.
echo ========================================
echo   Setup Complete!
echo   API Server: PC -^> http://127.0.0.1:%API_PORT%
echo   Device:     adb reverse -^> :%API_PORT%
echo ========================================
echo.
echo You can now open the MuqiMusic app on your phone.
echo The app will auto-detect the local API server.
echo.
echo Keep this window open. Close it to stop the API server.
echo.

:: Keep window open and monitor
echo Press Ctrl+C to stop the API server and exit...
pause >nul
