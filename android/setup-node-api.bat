@echo off
REM ============================================
REM  安装 MuqiMusic Android 内嵌 API 依赖
REM  在 nodejs-project 目录中 npm install
REM ============================================

set "NODE_PROJECT=%~dp0app\src\main\assets\nodejs-project"

echo [MuqiAPI] Installing Node.js dependencies for bundled API server...
echo [MuqiAPI] Directory: %NODE_PROJECT%

cd /d "%NODE_PROJECT%"

if exist "node_modules\" (
    echo [MuqiAPI] node_modules already exists, skipping install.
    echo [MuqiAPI] To reinstall, delete node_modules and run this script again.
    goto :done
)

echo [MuqiAPI] Running npm install...
call npm install --production --no-audit --no-fund --loglevel=error

if %ERRORLEVEL% NEQ 0 (
    echo [MuqiAPI] WARNING: npm install failed! The app will fall back to remote API.
    echo [MuqiAPI] You can retry by running: npm install --production
    echo [MuqiAPI] in the directory: %NODE_PROJECT%
) else (
    echo [MuqiAPI] Dependencies installed successfully!
    echo [MuqiAPI] API server will be bundled into the APK.
)

:done
echo.
echo [MuqiAPI] Setup complete.
pause
