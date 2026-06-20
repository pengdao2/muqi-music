@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ============================================================
echo   MuqiMusic Android 环境一键安装
echo ============================================================
echo.

:: ========== Step 1: 安装 JDK 17 ==========
echo [Step 1/4] 安装 JDK 17...

where java >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('java -version 2^>^&1 ^| findstr /i "version"') do set JV=%%i
    echo !JV! | findstr "17" >nul
    if !ERRORLEVEL! equ 0 (
        echo   [√] JDK 17 已安装
        goto :skip_jdk
    )
)

echo   正在通过 winget 安装 JDK 17...
winget install EclipseAdoptium.Temurin.17.JDK --accept-source-agreements --accept-package-agreements --silent
if %ERRORLEVEL% equ 0 (
    echo   [√] JDK 17 安装成功
    echo   请重新打开命令行窗口使环境变量生效
    echo   然后重新运行此脚本
    pause
    exit /b 0
)

echo   [×] winget 安装失败，请手动安装:
echo   1. 下载 JDK 17: https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jdk/x64/windows/
echo   2. 解压到: C:\Android\jdk17
echo   3. 重新运行此脚本
pause
exit /b 1

:skip_jdk

:: ========== Step 2: 下载 Android SDK 命令行工具 ==========
echo.
echo [Step 2/4] 安装 Android SDK Command-line Tools...

set SDK_HOME=C:\Android\sdk
set SDK_ZIP=C:\Android\sdk_tools.zip

if exist "%SDK_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo   [√] Android SDK 已安装
    goto :skip_sdk
)

echo   下载中...
curl -L -o "%SDK_ZIP%" "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" 2>&1
if %ERRORLEVEL% neq 0 (
    curl -L -o "%SDK_ZIP%" "https://dl.google.com/android/repository/commandlinetools-win-10406996_latest.zip" 2>&1
)

if not exist "%SDK_ZIP%" (
    echo   [×] SDK 下载失败
    pause
    exit /b 1
)

echo   解压中...
mkdir "%SDK_HOME%\cmdline-tools" 2>nul
powershell -NoProfile -Command "Expand-Archive -Path '%SDK_ZIP%' -DestinationPath '%SDK_HOME%\cmdline-tools\tmp' -Force"
if exist "%SDK_HOME%\cmdline-tools\tmp\cmdline-tools" (
    move "%SDK_HOME%\cmdline-tools\tmp\cmdline-tools" "%SDK_HOME%\cmdline-tools\latest"
) else (
    move "%SDK_HOME%\cmdline-tools\tmp" "%SDK_HOME%\cmdline-tools\latest"
)
rmdir /s /q "%SDK_HOME%\cmdline-tools\tmp" 2>nul
del "%SDK_ZIP%" 2>nul

if not exist "%SDK_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo   [×] SDK 安装验证失败
    pause
    exit /b 1
)
echo   [√] SDK 安装成功

:skip_sdk

:: ========== Step 3: 安装 SDK 组件 ==========
echo.
echo [Step 3/4] 安装 Android SDK 组件...

set "SDKMANAGER=%SDK_HOME%\cmdline-tools\latest\bin\sdkmanager.bat"

echo   安装 platform-tools...
call "%SDKMANAGER%" --sdk_root="%SDK_HOME%" "platform-tools" "build-tools;34.0.0" "platforms;android-34" 2>&1 | findstr /v "^$"

echo   接受许可协议...
echo y | call "%SDKMANAGER%" --sdk_root="%SDK_HOME%" --licenses 2>&1 >nul

echo   [√] SDK 组件安装完成

:: ========== Step 4: 配置项目 ==========
echo.
echo [Step 4/4] 配置项目...

set "PROJECT_DIR=%~dp0"
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

:: 创建 local.properties
echo sdk.dir=%SDK_HOME:\=\\%> "%PROJECT_DIR%\local.properties"
echo   [√] 已创建 local.properties

:: 配置 gradle.properties - JDK 路径
findstr /c:"org.gradle.java.home" "%PROJECT_DIR%\gradle.properties" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    for /f "tokens=*" %%i in ('where java 2^>nul') do (
        set JAVA_PATH=%%i
        set JAVA_PATH=!JAVA_PATH:\bin\java.exe=!
    )
    if defined JAVA_PATH (
        echo org.gradle.java.home=!JAVA_PATH:\=\\!>> "%PROJECT_DIR%\gradle.properties"
        echo   [√] 已配置 JAVA_HOME
    )
)

:: 复制 Web 资源
echo.
echo ============================================================
echo   环境安装完成，开始编译 APK...
echo ============================================================

cd /d "%PROJECT_DIR%"
call "%PROJECT_DIR%\build-release.bat"
