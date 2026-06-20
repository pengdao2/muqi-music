package com.muqi.music

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * JavaScript ↔ Native 桥接接口
 * Web 端通过 window.AndroidBridge 调用
 */
class WebAppInterface(
    private val activity: MainActivity,
    private val webView: WebView
) {
    companion object {
        private const val TAG = "MuqiBridge"
    }

    private var musicService: MusicService? = null

    /**
     * 歌词/全屏播放界面是否打开（由前端同步状态）
     * 用于返回键处理：优先关闭歌词界面，而非回退 WebView 路由
     */
    @Volatile
    var musicFullOpen: Boolean = false
        private set

    fun setMusicService(service: MusicService?) {
        musicService = service
        // 注册通知按钮回调：通过 WebView JS 分发到前端
        service?.setPlayCallback {
            webView.post { webView.evaluateJavascript("if(window.__muqi_mediaAction)window.__muqi_mediaAction('play');", null) }
        }
        service?.setPauseCallback {
            webView.post { webView.evaluateJavascript("if(window.__muqi_mediaAction)window.__muqi_mediaAction('pause');", null) }
        }
        service?.setNextCallback {
            webView.post { webView.evaluateJavascript("if(window.__muqi_mediaAction)window.__muqi_mediaAction('next');", null) }
        }
        service?.setPrevCallback {
            webView.post { webView.evaluateJavascript("if(window.__muqi_mediaAction)window.__muqi_mediaAction('prev');", null) }
        }
        service?.setSeekCallback { pos ->
            webView.post { webView.evaluateJavascript("if(window.__muqi_mediaAction)window.__muqi_mediaAction('seek', $pos);", null) }
        }
    }

    // ==================== 暴露给 JS 的接口 ====================

    /**
     * 请求后台播放（当 Web 端 play() 失败时调用）
     */
    @JavascriptInterface
    fun requestPlayback() {
        activity.runOnUiThread {
            // 只启动前台服务，不带动作（避免触发 playCallback 导致循环暂停）
            val intent = Intent(activity, MusicService::class.java)
            activity.startForegroundService(intent)
            // 通过 WebView 注入：标记可以强制播放
            webView.evaluateJavascript("window.__muqi_force_play = true;", null)
        }
    }

    /**
     * 更新通知栏信息
     * @param title 歌曲名
     * @param artist 歌手
     * @param albumArt 专辑（可选）
     */
    @JavascriptInterface
    fun updateNotification(title: String, artist: String, albumArt: String) {
        activity.runOnUiThread {
            musicService?.updateMetadata(title, artist, albumArt)
        }
    }

    /**
     * 更新播放状态
     * @param isPlaying true=播放中, false=暂停
     */
    @JavascriptInterface
    fun updatePlaybackState(isPlaying: Boolean) {
        activity.runOnUiThread {
            musicService?.updatePlaybackState(isPlaying)
        }
    }

    /**
     * 更新播放进度（前端定时调用，用于通知栏进度条）
     * @param position 当前播放位置（毫秒）
     * @param duration 总时长（毫秒）
     */
    @JavascriptInterface
    fun updatePlaybackPosition(position: Long, duration: Long) {
        activity.runOnUiThread {
            musicService?.updatePlaybackPosition(position, duration)
        }
    }

    /**
     * 日志输出（供 JS 端调试）
     */
    @JavascriptInterface
    fun log(message: String) {
        Log.d(TAG, message)
    }

    /**
     * 获取平台信息
     */
    @JavascriptInterface
    fun getPlatform(): String {
        return "Android"
    }

    /**
     * 获取版本号
     */
    @JavascriptInterface
    fun getAppVersion(): String {
        return try {
            val pkgInfo = activity.packageManager.getPackageInfo(activity.packageName, 0)
            pkgInfo.versionName ?: "5.1.0"
        } catch (e: Exception) {
            "5.1.0"
        }
    }

    /**
     * 设置歌词界面打开状态（供前端同步，用于返回键处理）
     * @param open true=歌词界面打开, false=关闭
     */
    @JavascriptInterface
    fun setMusicFullOpen(open: Boolean) {
        musicFullOpen = open
        Log.d(TAG, "歌词界面状态: ${if (open) "打开" else "关闭"}")
    }

    /**
     * 检查是否为原生 App 环境
     */
    @JavascriptInterface
    fun isNativeApp(): Boolean {
        return true
    }

    /**
     * 获取 API 服务器地址
     */
    @JavascriptInterface
    fun getApiUrl(): String {
        return activity.getApiUrl()
    }

    /**
     * 设置 API 服务器地址
     * @param url 新的 API 服务器地址，格式如 http://ip:port
     */
    @JavascriptInterface
    fun setApiUrl(url: String) {
        activity.runOnUiThread {
            activity.setApiUrl(url)
        }
    }

    /**
     * 使用自定义文件名下载文件（解决跨域下载文件名乱码问题）
     * @param url 下载链接
     * @param fileName 自定义文件名（含扩展名）
     * @param picUrl 封面图 URL（可选）
     * @param songInfoJson 歌曲信息 JSON（包含 name/artist/id 等，用于记录）
     */
    @JavascriptInterface
    fun downloadFile(url: String, fileName: String, picUrl: String, songInfoJson: String) {
        activity.runOnUiThread {
            activity.handleNamedDownload(url, fileName, picUrl, songInfoJson)
        }
    }

    /**
     * 获取下载目录路径
     */
    @JavascriptInterface
    fun getDownloadPath(): String {
        return activity.getDownloadDir()
    }

    /**
     * 获取下载记录列表（JSON 数组字符串）
     */
    @JavascriptInterface
    fun getDownloadRecords(): String {
        return activity.getDownloadRecords()
    }

    /**
     * 扫描下载目录，返回所有音乐文件（JSON 数组字符串）
     * 当 SharedPreferences 中无记录时，直接扫描文件夹作为兜底
     */
    @JavascriptInterface
    fun scanDownloadDir(): String {
        return activity.scanDownloadDir()
    }

    /**
     * 获取文件 content:// URI（供 WebView 播放本地文件）
     * @param filePath 文件的绝对路径
     * @return content:// URI 字符串，失败返回空字符串
     */
    @JavascriptInterface
    fun getContentUri(filePath: String): String {
        return activity.getContentUriForFile(filePath)
    }

    /**
     * 读取音频文件返回 Base64 Data URL
     * @param filePath 文件的绝对路径
     * @return data:audio/xxx;base64,... 格式的字符串，失败返回空字符串
     */
    @JavascriptInterface
    fun readAudioFileAsDataUrl(filePath: String): String {
        return activity.readAudioFileAsDataUrl(filePath)
    }

    /**
     * 使用系统文件管理器打开下载目录
     */
    @JavascriptInterface
    fun openDownloadDir() {
        activity.runOnUiThread {
            activity.openDownloadDir()
        }
    }

    /**
     * 通过 SAF 选择下载目录
     */
    @JavascriptInterface
    fun selectDownloadDir() {
        activity.runOnUiThread {
            activity.selectDownloadDirSAF()
        }
    }

    /**
     * 读取 assets 中的文件内容（用于读取内置脚本等资源）
     * @param relativePath 相对于 assets 目录的路径，例如 "public/lxmusic/manifest.json"
     * @return 文件内容字符串，失败返回空字符串
     */
    @JavascriptInterface
    fun readAssetFile(relativePath: String): String {
        return try {
            activity.assets.open(relativePath).bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            Log.e(TAG, "读取 asset 文件失败: $relativePath", e)
            ""
        }
    }
}
