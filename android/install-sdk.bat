@echo off
chcp 65001 >nul
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=C:\Users\pengdao\AppData\Local\Android\Sdk

echo ============================================
echo   MuqiMusic - 安装 Android SDK 组件
echo ============================================
echo.
echo JAVA_HOME: %JAVA_HOME%
echo ANDROID_HOME: %ANDROID_HOME%
echo.

echo [1/3] 接受许可协议...
"%JAVA_HOME%\bin\java.exe" -Dcom.android.sdklib.toolsdir="%ANDROID_HOME%\cmdline-tools\latest" -classpath "%ANDROID_HOME%\cmdline-tools\latest\lib\sdkmanager-classpath.jar" com.android.sdklib.tool.sdkmanager.SdkManagerCli --sdk_root="%ANDROID_HOME%" --licenses
echo.

echo [2/3] 下载 SDK 组件（platform-tools + build-tools + android-34）...
echo 这可能需要几分钟，请耐心等待...
"%JAVA_HOME%\bin\java.exe" -Dcom.android.sdklib.toolsdir="%ANDROID_HOME%\cmdline-tools\latest" -classpath "%ANDROID_HOME%\cmdline-tools\latest\lib\sdkmanager-classpath.jar" com.android.sdklib.tool.sdkmanager.SdkManagerCli --sdk_root="%ANDROID_HOME%" "platform-tools" "build-tools;34.0.0" "platforms;android-34"
echo.

echo [3/3] 验证安装...
if exist "%ANDROID_HOME%\platforms\android-34\android.jar" (
    echo [OK] android-34 platform 已安装
) else (
    echo [FAIL] android-34 platform 未安装
)
if exist "%ANDROID_HOME%\build-tools\34.0.0\aapt.exe" (
    echo [OK] build-tools 34.0.0 已安装
) else (
    echo [FAIL] build-tools 34.0.0 未安装
)
if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    echo [OK] platform-tools 已安装
) else (
    echo [FAIL] platform-tools 未安装
)

echo.
echo ============================================
echo   安装完成！
echo   请关闭此窗口，然后运行 build-release.bat
echo ============================================
pause
