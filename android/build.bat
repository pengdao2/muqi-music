@echo off
chcp 65001 >nul
setlocal

set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "ANDROID_HOME=C:\Users\pengdao\AppData\Local\Android\Sdk"
set "GRADLE_HOME=%USERPROFILE%\gradle-8.7"
set "PATH=%JAVA_HOME%\bin;%GRADLE_HOME%\bin;%PATH%"

cd /d "%~dp0"

echo ============================================
echo   MuqiMusic Android Build
echo ============================================
echo.
echo JAVA_HOME: %JAVA_HOME%
java --version
echo.
echo ANDROID_HOME: %ANDROID_HOME%
echo GRADLE_HOME: %GRADLE_HOME%
echo.

(echo sdk.dir=C\:\\Users\\pengdao\\AppData\\Local\\Android\\Sdk) > local.properties

echo [Step 1/1] Building Release + Debug APK...
echo.

rem 先清理旧的未签名 APK
if exist "app\build\outputs\apk\release\app-release-unsigned.apk" del "app\build\outputs\apk\release\app-release-unsigned.apk"

call "%GRADLE_HOME%\bin\gradle.bat" assembleRelease assembleDebug

if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================
    echo   BUILD SUCCESS!
    echo ============================================
    echo.
    echo Release APK (signed):
    dir /s /b "app\build\outputs\apk\release\app-release.apk" 2>nul
    echo.
    echo Debug APK (auto-signed, for testing):
    dir /s /b "app\build\outputs\apk\debug\app-debug.apk" 2>nul
    echo.
    echo ============================================
    echo Install debug APK on phone:
    echo   adb install app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Or copy APK to phone and install directly
    echo ============================================
) else (
    echo.
    echo ============================================
    echo   BUILD FAILED!
    echo   Check the errors above.
    echo ============================================
)
pause
endlocal
