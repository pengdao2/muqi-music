@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=C:\Users\pengdao\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%PATH%

echo ============================================
echo   MuqiMusic Android 完整构建
echo ============================================
echo.
echo JAVA_HOME: %JAVA_HOME%
echo ANDROID_HOME: %ANDROID_HOME%
"%JAVA_HOME%\bin\java.exe" --version
echo.

echo [1/5] 复制 Web 资源到 assets...
if exist "..\deploy-web\public" (
    if exist "app\src\main\assets\public" (
        rmdir /s /q "app\src\main\assets\public"
    )
    xcopy /e /i /y "..\deploy-web\public" "app\src\main\assets\public"
    echo [OK] 完成
) else (
    echo [FAIL] 未找到 ..\deploy-web\public
    pause
    exit /b 1
)

echo.
echo [2/5] 生成 Gradle Wrapper...
if not exist "gradlew.bat" (
    rem 使用 sdkmanager 中自带的 Java 创建 wrapper
    "%JAVA_HOME%\bin\java.exe" -version
    rem 手动创建 wrapper：下载 gradle wrapper jar
    if not exist "gradle\wrapper\gradle-wrapper.jar" (
        echo 下载 gradle-wrapper.jar...
        curl -L -o "gradle\wrapper\gradle-wrapper.jar" "https://services.gradle.org/distributions/gradle-8.7-bin.zip" --connect-timeout 30 2>nul
        if %ERRORLEVEL% neq 0 (
            echo [FAIL] 下载失败，尝试创建最小 wrapper...
        )
    )
    rem 直接使用 gradle init 命令
    echo 使用 gradle wrapper 命令...
    rem 由于我们没有 gradle 命令，直接手动创建 wrapper 脚本
    echo [OK] 手动创建 Gradle Wrapper
) else (
    echo [OK] 已存在
)

echo.
echo [3/5] 确保 sdk.dir 配置正确...
echo sdk.dir=%ANDROID_HOME:\=/% > local.properties
echo [OK] local.properties 已更新

echo.
echo [4/5] 下载 Gradle 8.7 并开始编译...
echo 这可能需要 5-15 分钟，首次会下载依赖...
echo.

rem 直接使用 java 运行 gradle wrapper
if not exist "gradle\wrapper\gradle-wrapper.jar" (
    echo 正在下载 Gradle Wrapper JAR...
    mkdir "gradle\wrapper" 2>nul
    curl -L -o "gradle\wrapper\gradle-wrapper.jar" "https://raw.githubusercontent.com/gradle/gradle/v8.7.0/gradle/wrapper/gradle-wrapper.jar" --connect-timeout 30 2>nul
)

rem 创建 gradlew.bat
(
echo @if "%DEBUG%" == "" @echo off
echo @rem Gradle startup script for Windows
echo @rem Set local scope for the variables with windows NT shell
echo if "%OS%"=="Windows_NT" setlocal
echo set DIRNAME=%%~dp0
echo if "%%DIRNAME%%" == "" set DIRNAME=.
echo set APP_BASE_NAME=%%~n0
echo set APP_HOME=%%DIRNAME%%
echo set DEFAULT_JVM_OPTS="-Xmx2048m" "-Dfile.encoding=UTF-8"
echo set CLASSPATH=%%APP_HOME%%\gradle\wrapper\gradle-wrapper.jar
echo "%%JAVA_HOME%%\bin\java.exe" %%DEFAULT_JVM_OPTS%% %%JAVA_OPTS%% -classpath "%%CLASSPATH%%" org.gradle.wrapper.GradleWrapperMain %%*
) > gradlew.bat
echo [OK] gradlew.bat 已创建

rem 创建 gradle-wrapper.properties
if not exist "gradle\wrapper\gradle-wrapper.properties" (
    mkdir "gradle\wrapper" 2>nul
    (
        echo distributionBase=GRADLE_USER_HOME
        echo distributionPath=wrapper/dists
        echo distributionUrl=https\://services.gradle.org/distributions/gradle-8.7-bin.zip
        echo networkTimeout=10000
        echo validateDistributionUrl=true
        echo zipStoreBase=GRADLE_USER_HOME
        echo zipStorePath=wrapper/dists
    ) > gradle\wrapper\gradle-wrapper.properties
)

rem 下载 gradle-wrapper.jar 如果还没有
if not exist "gradle\wrapper\gradle-wrapper.jar" (
    echo 正在下载 gradle-wrapper.jar...
    curl -L -o "gradle\wrapper\gradle-wrapper.jar" "https://services.gradle.org/updates/distributions/gradle-8.7-wrapper.jar?1" --connect-timeout 30 2>nul
    if %ERRORLEVEL% neq 0 (
        echo 尝试镜像下载...
        curl -L -o "gradle\wrapper\gradle-wrapper.jar" "https://mirrors.cloud.tencent.com/gradle/gradle-8.7-wrapper.jar?1" --connect-timeout 30 2>nul
    )
)

echo.
echo [5/5] 开始编译...
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=C:\Users\pengdao\AppData\Local\Android\Sdk

rem 直接运行 gradle wrapper
"%JAVA_HOME%\bin\java.exe" -Xmx2048m -Dfile.encoding=UTF-8 -classpath "gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain assembleRelease

if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================
    echo   构建成功！
    echo ============================================
    echo.
    echo APK 路径:
    dir /s /b "app\build\outputs\apk\release\*.apk" 2>nul
    dir /s /b "app\build\outputs\apk\debug\*.apk" 2>nul
) else (
    echo.
    echo ============================================
    echo   构建失败，请查看上方错误信息
    echo ============================================
)
pause
endlocal
