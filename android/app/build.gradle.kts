plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Gradle JDK Toolchain: 如果没有系统 JDK，Gradle 会自动从 Adoptium 下载 JDK 17
kotlin {
    jvmToolchain(17)
}
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

android {
    namespace = "com.muqi.music"
    compileSdk = 34

    signingConfigs {
        create("release") {
            storeFile = file("${rootProject.projectDir}/muqi-release.keystore")
            storePassword = "muqi123"
            keyAlias = "muqi"
            keyPassword = "muqi123"
        }
    }

    defaultConfig {
        applicationId = "com.muqi.music"
        minSdk = 23
        targetSdk = 34
        versionCode = 1
        versionName = "5.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
            // 去掉 .debug 后缀，保持包名一致以便访问之前下载的文件
            // applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

// Task: copy web assets into APK before build
tasks.register<Copy>("copyWebAssets") {
    from("${rootProject.projectDir}/../deploy-web/public")
    into("${projectDir}/src/main/assets/public")
    include("**/*")
}

tasks.whenTaskAdded {
    if (name.contains("preDebugBuild") || name.contains("preReleaseBuild")) {
        dependsOn("copyWebAssets")
    }
}

dependencies {
    // AndroidX
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")

    // WebView
    implementation("androidx.webkit:webkit:1.11.0")

    // Media
    implementation("androidx.media:media:1.7.0")

    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.3")
    implementation("androidx.lifecycle:lifecycle-service:2.8.3")

    // Material Design
    implementation("com.google.android.material:material:1.12.0")
}
