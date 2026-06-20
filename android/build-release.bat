@echo off
chcp 65001 >nul
echo =============================================
echo   MuqiMusic Android 构建脚本
echo =============================================
echo.

:: 检查 Java/Android SDK 环境
where java >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到 Java，请安装 JDK 17
    echo 下载地址: https://adoptium.net/
    pause
    exit /b 1
)

:: 复制 Web 资源
echo [1/4] 复制 Web 资源到 assets...
if exist "..\deploy-web\public" (
    if exist "app\src\main\assets\public" rmdir /s /q "app\src\main\assets\public"
    xcopy /e /i /y "..\deploy-web\public" "app\src\main\assets\public"
    echo [完成] Web 资源已复制
) else (
    echo [错误] 未找到 ..\deploy-web\public 目录
    echo 请先运行项目的 Web 构建: npm run build:web
    pause
    exit /b 1
)

:: 生成 Gradle Wrapper（如果不存在）
echo.
echo [2/4] 检查 Gradle Wrapper...
if not exist "gradlew.bat" (
    echo 首次构建，正在生成 Gradle Wrapper...
    gradle wrapper --gradle-version 8.7 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [提示] 未安装 Gradle，将尝试使用 Android Studio
        echo 请用 Android Studio 打开此项目目录
        pause
        exit /b 1
    )
    echo [完成] Gradle Wrapper 已生成
) else (
    echo [完成] Gradle Wrapper 已存在
)

:: 构建
echo.
echo [3/4] 开始编译 Release APK...

:: 尝试找到 local.properties 并设置 SDK 路径
if not exist "local.properties" (
    echo # Android SDK 路径 > local.properties
    echo sdk.dir=%ANDROID_HOME% >> local.properties
    echo sdk.dir=%ANDROID_SDK_ROOT% >> local.properties
)

call gradlew.bat assembleRelease 2>&1 | findstr /v "^$"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [错误] 构建失败，请检查上方错误信息
    pause
    exit /b 1
)

:: 输出 APK 路径
echo.
echo [4/4] 构建完成！
echo.
echo APK 文件路径:
dir /s /b app\build\outputs\apk\release\*.apk 2>nul
echo.
echo =============================================
echo   构建成功！
echo   将上述 APK 文件安装到 Android 设备即可
echo =============================================
pause
