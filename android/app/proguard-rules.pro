# MuqiMusic ProGuard Rules

# Keep WebView JavaScript interface
-keepclassmembers class com.muqi.music.WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep MusicService
-keep class com.muqi.music.MusicService { *; }

# Keep MediaSession
-keep class android.support.v4.media.** { *; }
-keep class androidx.media.** { *; }

# WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}


