package com.muqi.music

import android.app.Application
import android.webkit.WebView

class MuqiApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // 提前初始化 WebView 进程，加速首次加载
        WebView(this).destroy()
    }
}
