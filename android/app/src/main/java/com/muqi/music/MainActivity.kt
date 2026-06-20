package com.muqi.music

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ServiceConnection
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.IBinder
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.view.KeyEvent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler
import androidx.webkit.WebViewClientCompat
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    companion object {
        private const val PREFS_NAME = "muqi_settings"
        private const val KEY_API_URL = "api_url"
        private const val LOCAL_API_URL = "http://127.0.0.1:30488"
        private const val DEFAULT_REMOTE_URL = "http://8.134.23.217:30488"
        private const val LOCAL_INDEX = "file:///android_asset/public/index.html"
        private const val REQUEST_STORAGE_PERMISSION = 1001
    }

    private lateinit var webView: WebView
    private lateinit var prefs: SharedPreferences
    private var musicService: MusicService? = null
    private var serviceBound = false
    private var jsInterface: WebAppInterface? = null
    private lateinit var safDirPickerLauncher: ActivityResultLauncher<Uri?>
    private var localApiAvailable: Boolean = false
    private var localApiUrl: String? = null  // 实际可用的本地 URL（可能是 127.0.0.1 或网络 IP）

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as MusicService.LocalBinder
            musicService = binder.getService()
            serviceBound = true
            jsInterface?.setMusicService(musicService)
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            musicService = null
            serviceBound = false
            jsInterface?.setMusicService(null)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 初始化 SharedPreferences
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // 异步检测本地 API 服务是否可用（端口 30488）
        // 扫描 127.0.0.1 + WiFi/Cellular IP（支持 Termux 方案）
        checkLocalApiAsync()

        // 创建并配置 WebView
        webView = WebView(this).apply {
            setupWebView()
        }
        setContentView(webView)

        // 全屏沉浸式（必须在 setContentView 之后）
        setupFullScreen()

        // 绑定 MusicService
        bindMusicService()

        // 加载页面（从本地 assets 直接加载，不依赖远程服务器）
        webView.loadUrl(LOCAL_INDEX)

        // 返回键处理
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // 优先处理：如果歌词/全屏播放界面打开，先关闭它
                if (jsInterface?.musicFullOpen == true) {
                    webView.evaluateJavascript(
                        "if(window.__muqi_closeMusicFull)window.__muqi_closeMusicFull();", null
                    )
                    return
                }
                // 其次：WebView 路由回退
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true) // 按 Home 键效果
                }
            }
        })

        // 注册 SAF 文件夹选择器
        safDirPickerLauncher = registerForActivityResult(
            ActivityResultContracts.OpenDocumentTree()
        ) { uri ->
            if (uri != null) {
                val path = getPathFromTreeUri(uri)
                if (path != null) {
                    // 持久化权限
                    contentResolver.takePersistableUriPermission(
                        uri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    )
                    // 保存到 SharedPreferences 并回调 JS
                    prefs.edit().putString("download_path", path).apply()
                    val escaped = path.replace("'", "\\'")
                    webView.evaluateJavascript(
                        "if(window.__onDownloadDirSelected)window.__onDownloadDirSelected('$escaped');",
                        null
                    )
                }
            }
        }

        // 请求存储权限（读取下载的音乐文件）
        requestStoragePermission()
    }

    /**
     * 从 SAF tree URI 提取文件系统路径
     */
    private fun getPathFromTreeUri(uri: Uri): String? {
        return try {
            val docId = DocumentsContract.getTreeDocumentId(uri)
            val split = docId.split(":")
            if (split.size >= 2) {
                when {
                    split[0].equals("primary", ignoreCase = true) ->
                        "/storage/emulated/0/${split[1]}"
                    else ->
                        "/storage/${split[0]}/${split[1]}"
                }
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private fun requestStoragePermission() {
        val perm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Manifest.permission.READ_MEDIA_AUDIO
        } else {
            Manifest.permission.READ_EXTERNAL_STORAGE
        }
        if (checkSelfPermission(perm) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(perm), REQUEST_STORAGE_PERMISSION)
        }
    }

    private fun setupFullScreen() {
        // 状态栏浅色图标（深色背景用白色图标），Android 6+ 支持
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun WebView.setupWebView() {
        val settings = this.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            mediaPlaybackRequiresUserGesture = false  // 关键：允许自动播放
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            // 缓存优化
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            // 禁止缩放
            builtInZoomControls = false
            displayZoomControls = false
            // 硬件加速
            setRenderPriority(android.webkit.WebSettings.RenderPriority.HIGH)
        }

        // 跨域 Cookie 支持
        CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

        // JS 桥接
        val iface = WebAppInterface(this@MainActivity, this)
        jsInterface = iface
        addJavascriptInterface(iface, "AndroidBridge")

        // WebViewClient：拦截资源加载
        webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                // 尝试从本地 assets 加载
                return tryLoadFromAssets(request.url) ?: super.shouldInterceptRequest(view, request)
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                // 页面加载完成后注入自动播放脚本
                injectAutoPlaySupport()
            }
        }

        // WebChromeClient
        webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                android.util.Log.d("MuqiWebView", "[${consoleMessage.messageLevel()}] ${consoleMessage.message()}")
                return true
            }
        }

        // 长按禁用（提升体验）
        setOnLongClickListener { true }

        // 下载监听器（处理 WebView 中的文件下载）
        setDownloadListener(DownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
            handleDownload(url, userAgent, contentDisposition, mimetype)
        })
    }

    /**
     * 使用系统 DownloadManager 处理下载
     */
    private fun handleDownload(url: String, userAgent: String, contentDisposition: String, mimetype: String) {
        try {
            val fileName = URLUtil.guessFileName(url, contentDisposition, mimetype)
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mimetype)
                addRequestHeader("User-Agent", userAgent)
                setTitle(fileName)
                setDescription("正在下载...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "MuqiMusic/$fileName")
            }
            val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(request)
            Toast.makeText(this@MainActivity, "开始下载: $fileName", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            android.util.Log.e("MuqiDownload", "下载失败: ${e.message}")
            Toast.makeText(this@MainActivity, "下载失败", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * JS 触发的自定义文件名下载（解决 Android WebView 跨域下载文件名乱码问题）
     */
    fun handleNamedDownload(url: String, fileName: String, picUrl: String, songInfoJson: String) {
        try {
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle(fileName)
                setDescription("MuqiMusic 下载")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "MuqiMusic/$fileName")
            }
            val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val downloadId = dm.enqueue(request)

            // 记录下载信息到 SharedPreferences，供 Web 端读取
            saveDownloadRecord(downloadId, fileName, picUrl, songInfoJson, getDownloadDir() + "/$fileName")

            Toast.makeText(this@MainActivity, "开始下载: $fileName", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            android.util.Log.e("MuqiDownload", "自定义下载失败: ${e.message}")
            Toast.makeText(this@MainActivity, "下载失败: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * 保存下载记录到 SharedPreferences
     */
    private fun saveDownloadRecord(id: Long, fileName: String, picUrl: String, songInfoJson: String, filePath: String) {
        val records = prefs.getString("download_records", "[]") ?: "[]"
        val list = org.json.JSONArray(records)
        val record = org.json.JSONObject().apply {
            put("id", id)
            put("fileName", fileName)
            put("picUrl", picUrl)
            put("songInfo", org.json.JSONObject(songInfoJson))
            put("filePath", filePath)
            put("timestamp", System.currentTimeMillis())
        }
        list.put(record)
        // 只保留最近 500 条记录
        if (list.length() > 500) {
            val trimmed = org.json.JSONArray()
            for (i in list.length() - 500 until list.length()) {
                trimmed.put(list.get(i))
            }
            prefs.edit().putString("download_records", trimmed.toString()).apply()
        } else {
            prefs.edit().putString("download_records", list.toString()).apply()
        }
    }

    /**
     * 获取下载目录
     */
    fun getDownloadDir(): String {
        return Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            .absolutePath + "/MuqiMusic"
    }

    /**
     * 通过 FileProvider 获取 content:// URI（供 WebView 播放本地文件）
     */
    fun getContentUriForFile(filePath: String): String {
        return try {
            val file = java.io.File(filePath)
            if (!file.exists()) return ""
            val uri = FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                file
            )
            uri.toString()
        } catch (e: Exception) {
            android.util.Log.e("MuqiDownload", "getContentUri failed: ${e.message}", e)
            ""
        }
    }

    /**
     * 读取音频文件并返回 Base64 Data URL（供 HTML5 Audio 播放）
     */
    fun readAudioFileAsDataUrl(filePath: String): String {
        return try {
            val file = java.io.File(filePath)
            if (!file.exists()) return ""
            val bytes = file.readBytes()
            val ext = file.extension.lowercase()
            val mimeType = when (ext) {
                "mp3" -> "audio/mpeg"
                "flac" -> "audio/flac"
                "wav" -> "audio/wav"
                "ogg" -> "audio/ogg"
                "aac" -> "audio/aac"
                "m4a" -> "audio/mp4"
                "wma" -> "audio/x-ms-wma"
                else -> "audio/mpeg"
            }
            val base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
            "data:$mimeType;base64,$base64"
        } catch (e: Exception) {
            android.util.Log.e("MuqiDownload", "readAudioFileAsDataUrl failed: ${e.message}", e)
            ""
        }
    }

    /**
     * 获取下载记录
     */
    fun getDownloadRecords(): String {
        return prefs.getString("download_records", "[]") ?: "[]"
    }

    /**
     * 扫描下载目录，返回所有音乐文件列表（JSON 数组）
     * 主路径：直接扫描文件夹 + MediaMetadataRetriever 提取元数据
     * 降级：MediaStore API（用于文件访问受限的设备）
     * 提取完整的元数据：歌手、专辑、标题、封面图
     */
    fun scanDownloadDir(): String {
        val tag = "MuqiScan"
        val musicExts = setOf("mp3", "flac", "wav", "ogg", "aac", "m4a", "wma")
        val result = org.json.JSONArray()

        // 主路径：直接扫描文件夹（java.io.File）
        try {
            val dir = java.io.File(getDownloadDir())
            android.util.Log.d(tag, "扫描目录: ${dir.absolutePath}, 存在: ${dir.exists()}, 可读: ${dir.canRead()}")
            if (dir.exists() && dir.isDirectory) {
                val files = dir.listFiles()?.sortedByDescending { it.lastModified() } ?: emptyList()
                android.util.Log.d(tag, "找到 ${files.size} 个文件/目录")
                for (file in files) {
                    if (!file.isFile) continue
                    val ext = file.extension.lowercase()
                    if (ext !in musicExts) continue

                    // 用直接 ID3v2 字节解析提取元数据（绕过 MediaMetadataRetriever 的 scoped storage 限制）
                    val id3Result = parseID3Tags(file.absolutePath)
                    var songName = id3Result.title
                    var artistName = id3Result.artist
                    var albumName = id3Result.album
                    var picUrl = id3Result.coverUri

                    android.util.Log.d(tag, "文件: ${file.name} → ID3 歌手: '$artistName', 专辑: '$albumName', 标题: '$songName', 封面: ${if (picUrl.isNotEmpty()) "有(${id3Result.coverSize}bytes)" else "无"}")

                    // 兜底：从文件名解析 "歌名 - 歌手.mp3" 格式
                    if (artistName.isEmpty() || songName.isEmpty()) {
                        val parsed = parseFilenameForMetadata(file.nameWithoutExtension)
                        if (songName.isEmpty() && parsed.first.isNotEmpty()) {
                            songName = parsed.first
                            android.util.Log.d(tag, "  从文件名解析到歌名: '$songName'")
                        }
                        if (artistName.isEmpty() && parsed.second.isNotEmpty()) {
                            artistName = parsed.second
                            android.util.Log.d(tag, "  从文件名解析到歌手: '$artistName'")
                        }
                    }
                    if (songName.isEmpty()) songName = file.nameWithoutExtension

                    val contentUri = getContentUriForFile(file.absolutePath)

                    val entry = org.json.JSONObject().apply {
                        put("fileName", file.name)
                        put("filePath", file.absolutePath)
                        put("size", file.length())
                        put("timestamp", file.lastModified())
                        put("picUrl", picUrl)
                        put("contentUri", contentUri)
                        put("songInfo", org.json.JSONObject().apply {
                            put("id", 0)
                            put("name", songName)
                            put("artist", artistName)
                            put("album", albumName)
                        })
                    }
                    result.put(entry)
                }
            }
            if (result.length() > 0) {
                android.util.Log.d(tag, "文件扫描完成，共 ${result.length()} 首")
                return result.toString()
            }
        } catch (e: Exception) {
            android.util.Log.e(tag, "文件扫描失败: ${e.message}", e)
        }

        // 降级：MediaStore API（文件访问受限时）
        try {
            android.util.Log.d(tag, "回退到 MediaStore 扫描")
            val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            } else {
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            }

            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.RELATIVE_PATH,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ALBUM_ID
            )

            // 用 RELATIVE_PATH 过滤（Android 10+），回退 DATA LIKE
            val selection: String
            val selectionArgs: Array<String>
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                selection = "${MediaStore.Audio.Media.RELATIVE_PATH} LIKE ?"
                selectionArgs = arrayOf("Download/MuqiMusic/%")
            } else {
                selection = "${MediaStore.Audio.Media.DATA} LIKE ?"
                selectionArgs = arrayOf("%/Download/MuqiMusic/%")
            }
            val sortOrder = "${MediaStore.Audio.Media.DATE_MODIFIED} DESC"

            val cursor = contentResolver.query(collection, projection, selection, selectionArgs, sortOrder)
            cursor?.use { c ->
                val idIdx = c.getColumnIndex(MediaStore.Audio.Media._ID)
                val nameIdx = c.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME)
                val dataIdx = c.getColumnIndex(MediaStore.Audio.Media.DATA)
                val sizeIdx = c.getColumnIndex(MediaStore.Audio.Media.SIZE)
                val dateIdx = c.getColumnIndex(MediaStore.Audio.Media.DATE_MODIFIED)
                val artistIdx = c.getColumnIndex(MediaStore.Audio.Media.ARTIST)
                val albumIdx = c.getColumnIndex(MediaStore.Audio.Media.ALBUM)
                val titleIdx = c.getColumnIndex(MediaStore.Audio.Media.TITLE)
                val albumIdIdx = c.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID)

                while (c.moveToNext()) {
                    val id = c.getLong(if (idIdx >= 0) idIdx else 0)
                    val fileName = c.getString(if (nameIdx >= 0) nameIdx else 0) ?: continue
                    var filePath = if (dataIdx >= 0) c.getString(dataIdx) else null
                    val ext = fileName.substringAfterLast('.', "").lowercase()
                    if (ext !in musicExts) continue

                    // 如果 DATA 为空，从 MediaStore URI 构建路径
                    if (filePath.isNullOrEmpty()) {
                        filePath = getDownloadDir() + "/" + fileName
                    }

                    val artist = if (artistIdx >= 0) (c.getString(artistIdx) ?: "") else ""
                    val album = if (albumIdx >= 0) (c.getString(albumIdx) ?: "") else ""
                    val title = if (titleIdx >= 0) c.getString(titleIdx)?.takeIf { it.isNotEmpty() && it != "<unknown>" } else null
                    val albumId = if (albumIdIdx >= 0) c.getLong(albumIdIdx) else 0L

                    android.util.Log.d(tag, "MediaStore: $fileName → 歌手: '$artist', 专辑: '$album', 封面ID: $albumId")

                    // 封面图：优先 MediaStore 专辑封面，否则从文件读取内嵌图片
                    var picUrl = ""
                    if (albumId > 0) {
                        picUrl = "content://media/external/audio/albumart/$albumId"
                    }
                    if (picUrl.isEmpty() && filePath.isNotEmpty()) {
                        picUrl = extractEmbeddedCover(filePath, fileName)
                    }

                    val songName = title ?: fileName.substringBeforeLast('.')
                    val entry = org.json.JSONObject().apply {
                        put("fileName", fileName)
                        put("filePath", filePath)
                        put("size", if (sizeIdx >= 0) c.getLong(sizeIdx) else 0L)
                        put("timestamp", (if (dateIdx >= 0) c.getLong(dateIdx) else 0L) * 1000L)
                        put("picUrl", picUrl)
                        put("contentUri", getContentUriForFile(filePath))
                        put("songInfo", org.json.JSONObject().apply {
                            put("id", 0)
                            put("name", songName)
                            put("artist", artist)
                            put("album", album)
                        })
                    }
                    result.put(entry)
                }
            }
            android.util.Log.d(tag, "MediaStore 扫描完成，共 ${result.length()} 首")
        } catch (e: Exception) {
            android.util.Log.e(tag, "MediaStore 扫描失败: ${e.message}", e)
        }

        return result.toString()
    }

    /**
     * 使用 MediaMetadataRetriever 通过 content:// URI 提取元数据（兼容 Android 10+）
     */
    data class AudioMeta(val title: String, val artist: String, val album: String)

    /**
     * 从文件名解析歌名和歌手（兜底方案）
     * 支持格式: "歌名 - 歌手", "歌手 - 歌名", "歌名"
     */
    private fun parseFilenameForMetadata(nameWithoutExt: String): Pair<String, String> {
        // 尝试 "A - B" 格式：较长的作为歌名，较短的作为歌手
        val separators = listOf(" - ", "-", " – ", " –", "– ")
        for (sep in separators) {
            val idx = nameWithoutExt.indexOf(sep)
            if (idx > 0 && idx < nameWithoutExt.length - sep.length) {
                val part1 = nameWithoutExt.substring(0, idx).trim()
                val part2 = nameWithoutExt.substring(idx + sep.length).trim()
                if (part1.isNotEmpty() && part2.isNotEmpty()) {
                    // 通常 "歌名 - 歌手"，歌名在前，歌手在后
                    return Pair(part1, part2)
                }
            }
        }
        // 无法解析，整串作为歌名
        return Pair(nameWithoutExt, "")
    }

    data class ID3Result(val title: String, val artist: String, val album: String, val coverUri: String, val coverSize: Int)

    /**
     * 直接解析 ID3v2 标签字节（绕过 MediaMetadataRetriever 的 scoped storage 限制）
     * 从文件字节中提取 TIT2(标题), TPE1(歌手), TALB(专辑), APIC(封面图)
     */
    private fun parseID3Tags(filePath: String): ID3Result {
        val tagLog = "MuqiScan"
        return try {
            val file = java.io.File(filePath)
            if (!file.exists() || file.length() < 10) return ID3Result("", "", "", "", 0)

            val data = file.readBytes()
            // 检查 ID3v2 魔数 "ID3"
            if (data.size < 10 || data[0] != 0x49.toByte() || data[1] != 0x44.toByte() || data[2] != 0x33.toByte()) {
                android.util.Log.d(tagLog, "  无 ID3v2 标签")
                return ID3Result("", "", "", "", 0)
            }

            val majorVersion = data[3].toInt() and 0xFF
            val flags = data[5].toInt() and 0xFF
            // 读取同步安全整数（synchsafe integer）：每个字节只用低 7 位
            val tagSize = ((data[6].toInt() and 0x7F) shl 21) or
                ((data[7].toInt() and 0x7F) shl 14) or
                ((data[8].toInt() and 0x7F) shl 7) or
                (data[9].toInt() and 0x7F)

            val headerSize = 10
            // 检查是否有扩展头 (bit 6 of flags)
            var offset = headerSize
            val hasExtendedHeader = (flags and 0x40) != 0
            if (hasExtendedHeader && offset + 4 <= data.size) {
                val extSize = ((data[offset].toInt() and 0x7F) shl 21) or
                    ((data[offset + 1].toInt() and 0x7F) shl 14) or
                    ((data[offset + 2].toInt() and 0x7F) shl 7) or
                    (data[offset + 3].toInt() and 0x7F)
                offset += extSize
            }
            // ID3v2.4 帧头 size 也是 synchsafe，旧版是普通大端
            val synchsafeFrames = majorVersion >= 4

            var title = ""
            var artist = ""
            var album = ""
            var coverData: ByteArray? = null

            while (offset + 10 <= data.size) {
                val frameId = String(data, offset, 4, Charsets.ISO_8859_1)
                offset += 4
                if (frameId[0] == '\u0000') break // padding

                val frameSize = if (synchsafeFrames) {
                    ((data[offset].toInt() and 0x7F) shl 21) or
                        ((data[offset + 1].toInt() and 0x7F) shl 14) or
                        ((data[offset + 2].toInt() and 0x7F) shl 7) or
                        (data[offset + 3].toInt() and 0x7F)
                } else {
                    ((data[offset].toInt() and 0xFF) shl 24) or
                        ((data[offset + 1].toInt() and 0xFF) shl 16) or
                        ((data[offset + 2].toInt() and 0xFF) shl 8) or
                        (data[offset + 3].toInt() and 0xFF)
                }
                offset += 4 // size
                val frameFlags = ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
                offset += 2 // flags

                if (frameSize <= 0 || offset + frameSize > data.size) break

                when (frameId) {
                    "TIT2" -> title = readID3Text(data, offset, frameSize)
                    "TPE1" -> artist = readID3Text(data, offset, frameSize)
                    "TALB" -> album = readID3Text(data, offset, frameSize)
                    "APIC" -> { if (coverData == null) coverData = readID3Picture(data, offset, frameSize) }
                }
                offset += frameSize
            }

            // 封面存入缓存
            var coverUri = ""
            var coverSz = 0
            if (coverData != null && coverData.isNotEmpty()) {
                val artDir = java.io.File(cacheDir, "albumart")
                if (!artDir.exists()) artDir.mkdirs()
                val artFile = java.io.File(artDir, "id3_${file.name.hashCode()}.jpg")
                artFile.writeBytes(coverData)
                coverUri = FileProvider.getUriForFile(this, "$packageName.fileprovider", artFile).toString()
                coverSz = coverData.size
            }
            ID3Result(title, artist, album, coverUri, coverSz)
        } catch (e: Exception) {
            android.util.Log.e(tagLog, "  ID3 解析异常: ${e.javaClass.simpleName}: ${e.message}")
            ID3Result("", "", "", "", 0)
        }
    }

    /** 读取 ID3 文本帧（T*** 帧），处理多种编码 */
    private fun readID3Text(data: ByteArray, offset: Int, size: Int): String {
        if (size <= 1) return ""
        return try {
            val enc = data[offset].toInt() and 0xFF
            val bytes = data.copyOfRange(offset + 1, offset + size)
            val str = when (enc) {
                0 -> String(bytes, 0, bytes.size, Charsets.ISO_8859_1)
                1 -> { // UTF-16 with BOM
                    if (bytes.size >= 2 && bytes[0] == 0xFE.toByte() && bytes[1] == 0xFF.toByte())
                        String(bytes, 2, bytes.size - 2, Charsets.UTF_16BE)
                    else if (bytes.size >= 2 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xFE.toByte())
                        String(bytes, 2, bytes.size - 2, Charsets.UTF_16LE)
                    else String(bytes, 0, bytes.size, Charsets.UTF_16)
                }
                2 -> String(bytes, 0, bytes.size, Charsets.UTF_16BE) // UTF-16BE
                3 -> String(bytes, 0, bytes.size, Charsets.UTF_8)    // UTF-8
                else -> String(bytes, 0, bytes.size, Charsets.ISO_8859_1)
            }
            str.trimEnd('\u0000')
        } catch (e: Exception) {
            ""
        }
    }

    /** 读取 APIC 帧中的封面图片数据 */
    private fun readID3Picture(data: ByteArray, offset: Int, size: Int): ByteArray? {
        if (size <= 1) return null
        return try {
            val enc = data[offset].toInt() and 0xFF
            var p = offset + 1
            // 跳过 MIME type (null-terminated)
            while (p < offset + size) {
                if (data[p] == 0.toByte()) { p++; if (enc in 1..2 && p < offset + size && data[p] == 0.toByte()) p++; break }
                p++
            }
            p++ // 跳过 picture type byte
            if (p >= offset + size) return null
            // 跳过 description (null-terminated)
            while (p < offset + size) {
                if (data[p] == 0.toByte()) { p++; if (enc in 1..2 && p < offset + size && data[p] == 0.toByte()) p++; break }
                p++
            }
            if (p >= offset + size) return null
            data.copyOfRange(p, offset + size)
        } catch (e: Exception) {
            null
        }
    }

    private fun extractMetadataFromUri(uri: android.net.Uri): AudioMeta {
        return try {
            val pfd = contentResolver.openFileDescriptor(uri, "r")
                ?: throw java.io.FileNotFoundException("Cannot open file descriptor for $uri")
            val retriever = android.media.MediaMetadataRetriever()
            retriever.setDataSource(pfd.fileDescriptor)
            pfd.close()
            val titleRaw = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_TITLE)
            val artistRaw = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_ARTIST)
            val albumRaw = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_ALBUM)
            retriever.release()
            val title = titleRaw?.takeIf { it.isNotEmpty() && it != "<unknown>" } ?: ""
            val artist = artistRaw?.takeIf { it.isNotEmpty() && it != "<unknown>" } ?: ""
            val album = albumRaw?.takeIf { it.isNotEmpty() && it != "<unknown>" } ?: ""
            android.util.Log.d("MuqiScan", "  [Uri-FD] raw: title='$titleRaw' artist='$artistRaw' album='$albumRaw' → title='$title' artist='$artist' album='$album'")
            AudioMeta(title, artist, album)
        } catch (e: Exception) {
            android.util.Log.e("MuqiScan", "  [Uri-FD] 异常: ${e.javaClass.simpleName}: ${e.message}")
            AudioMeta("", "", "")
        }
    }

    private fun extractMetadataFromPath(filePath: String): AudioMeta {
        return try {
            val fis = java.io.FileInputStream(filePath)
            val retriever = android.media.MediaMetadataRetriever()
            retriever.setDataSource(fis.fd)
            val titleRaw = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_TITLE)
            val artistRaw = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_ARTIST)
            val albumRaw = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_ALBUM)
            retriever.release()
            fis.close()
            val title = titleRaw?.takeIf { it.isNotEmpty() && it != "<unknown>" } ?: ""
            val artist = artistRaw?.takeIf { it.isNotEmpty() && it != "<unknown>" } ?: ""
            val album = albumRaw?.takeIf { it.isNotEmpty() && it != "<unknown>" } ?: ""
            android.util.Log.d("MuqiScan", "  [Path-FD] raw: title='$titleRaw' artist='$artistRaw' album='$albumRaw' → title='$title' artist='$artist' album='$album'")
            AudioMeta(title, artist, album)
        } catch (e: Exception) {
            android.util.Log.e("MuqiScan", "  [Path-FD] 异常: ${e.javaClass.simpleName}: ${e.message}")
            AudioMeta("", "", "")
        }
    }

    /**
     * 通过 Uri 提取内嵌专辑封面，保存到缓存目录并返回 content:// URI
     */
    private fun extractEmbeddedCoverFromUri(uri: android.net.Uri, fileName: String): String {
        return try {
            val pfd = contentResolver.openFileDescriptor(uri, "r")
                ?: throw java.io.FileNotFoundException("Cannot open file descriptor for $uri")
            val retriever = android.media.MediaMetadataRetriever()
            retriever.setDataSource(pfd.fileDescriptor)
            pfd.close()
            val picture = retriever.embeddedPicture
            retriever.release()

            if (picture != null && picture.isNotEmpty()) {
                val artCacheDir = java.io.File(cacheDir, "albumart")
                if (!artCacheDir.exists()) artCacheDir.mkdirs()
                val artFile = java.io.File(artCacheDir, "scan_${fileName.hashCode()}.jpg")
                artFile.writeBytes(picture)
                val artUri = FileProvider.getUriForFile(this, "$packageName.fileprovider", artFile)
                android.util.Log.d("MuqiScan", "  [Uri-FD] 提取到内嵌封面: ${picture.size} bytes")
                artUri.toString()
            } else {
                android.util.Log.d("MuqiScan", "  [Uri-FD] 无内嵌封面 (embeddedPicture is ${if (picture == null) "null" else "empty"})")
                ""
            }
        } catch (e: Exception) {
            android.util.Log.e("MuqiScan", "  [Uri-FD] extractEmbeddedCover 异常: ${e.javaClass.simpleName}: ${e.message}")
            ""
        }
    }

    /**
     * 通过文件路径提取内嵌专辑封面
     */
    private fun extractEmbeddedCover(filePath: String, fileName: String): String {
        return try {
            val fis = java.io.FileInputStream(filePath)
            val retriever = android.media.MediaMetadataRetriever()
            retriever.setDataSource(fis.fd)
            val picture = retriever.embeddedPicture
            retriever.release()
            fis.close()

            if (picture != null && picture.isNotEmpty()) {
                val artCacheDir = java.io.File(cacheDir, "albumart")
                if (!artCacheDir.exists()) artCacheDir.mkdirs()
                val artFile = java.io.File(artCacheDir, "scan_${fileName.hashCode()}.jpg")
                artFile.writeBytes(picture)
                val artUri = FileProvider.getUriForFile(this, "$packageName.fileprovider", artFile)
                android.util.Log.d("MuqiScan", "  [Path-FD] 提取到内嵌封面: ${picture.size} bytes")
                artUri.toString()
            } else {
                android.util.Log.d("MuqiScan", "  [Path-FD] 无内嵌封面 (embeddedPicture is ${if (picture == null) "null" else "empty"})")
                ""
            }
        } catch (e: Exception) {
            android.util.Log.e("MuqiScan", "  [Path-FD] extractEmbeddedCover 异常: ${e.javaClass.simpleName}: ${e.message}")
            ""
        }
    }

    /**
     * 打开下载目录（通过系统文件管理器）
     */
    fun openDownloadDir() {
        try {
            val dir = java.io.File(getDownloadDir())
            if (!dir.exists()) dir.mkdirs()

            // 使用 content:// URI 打开文件管理器
            val uri = Uri.parse("content://com.android.externalstorage.documents/tree/primary%3ADownload%2FMuqiMusic/document/primary%3ADownload%2FMuqiMusic")
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, DocumentsContract.Document.MIME_TYPE_DIR)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(intent, "打开文件夹"))
        } catch (e: Exception) {
            // 降级：打开系统下载应用
            try {
                startActivity(Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                })
            } catch (e2: Exception) {
                Toast.makeText(this, "下载目录: ${getDownloadDir()}", Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * 通过 SAF 选择下载目录
     */
    fun selectDownloadDirSAF() {
        try {
            safDirPickerLauncher.launch(null)
        } catch (e: Exception) {
            Toast.makeText(this, "无法打开文件夹选择器", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * 注入脚本支持自动播放：覆盖 Web 端的 autoplay 限制
     */
    private fun injectAutoPlaySupport() {
        val js = """
(function() {
    // 劫持 Audio 构造函数，移除 user gesture 限制
    var OrigAudio = window.Audio;
    window.Audio = function(src) {
        var audio = new OrigAudio(src);
        // 标记为已通过用户手势
        Object.defineProperty(audio, 'play', {
            value: function() {
                var self = this;
                return OrigAudio.prototype.play.call(self).catch(function(e) {
                    if (e.name === 'NotAllowedError') {
                        // 通过 Native Bridge 请求后台播放
                        if (window.AndroidBridge) {
                            window.AndroidBridge.requestPlayback();
                        }
                        // 延迟重试
                        return new Promise(function(resolve, reject) {
                            setTimeout(function() {
                                OrigAudio.prototype.play.call(self).then(resolve).catch(reject);
                            }, 200);
                        });
                    }
                    return Promise.reject(e);
                });
            },
            configurable: true
        });
        return audio;
    };

    // 劫持 HTMLAudioElement.prototype.play
    var origPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function() {
        if (window.__muqi_force_play) {
            return origPlay.call(this).catch(function(e) {
                if (e.name === 'NotAllowedError') {
                    if (window.AndroidBridge) {
                        window.AndroidBridge.requestPlayback();
                    }
                    return new Promise(function(resolve, reject) {
                        setTimeout(function() {
                            origPlay.call(this).then(resolve).catch(function() {
                                // 最终降级：让 Native 层的 MediaSession 帮助播放
                                if (window.AndroidBridge) {
                                    window.AndroidBridge.requestPlayback();
                                }
                                resolve();
                            });
                        }.bind(this), 200);
                    }.bind(this));
                }
                return Promise.reject(e);
            });
        }
        return origPlay.call(this);
    };

    console.log('[MuqiNative] Auto-play support injected');
})();
        """.trimIndent()

        webView.evaluateJavascript(js, null)
    }

    /**
     * 尝试从本地 assets 加载资源
     */
    private fun tryLoadFromAssets(uri: Uri): WebResourceResponse? {
        val path = uri.path?.removePrefix("/") ?: return null
        // 只处理相对路径的静态资源，不处理 API 请求
        if (path.startsWith("http") || uri.host?.contains("api") == true) {
            return null
        }
        return try {
            val mimeType = when {
                path.endsWith(".js") -> "application/javascript"
                path.endsWith(".css") -> "text/css"
                path.endsWith(".html") -> "text/html"
                path.endsWith(".json") -> "application/json"
                path.endsWith(".png") -> "image/png"
                path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
                path.endsWith(".svg") -> "image/svg+xml"
                path.endsWith(".woff2") -> "font/woff2"
                path.endsWith(".woff") -> "font/woff"
                path.endsWith(".ttf") -> "font/ttf"
                path.endsWith(".ico") -> "image/x-icon"
                else -> null
            } ?: return null

            val inputStream = assets.open("public/$path")
            WebResourceResponse(mimeType, "UTF-8", inputStream)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * 获取 API 服务器地址（智能降级）
     * 优先级：用户手动设置 > 本地端口可用 > 远程默认
     */
    fun getApiUrl(): String {
        // 1. 用户显式设置了 URL → 始终优先
        val userUrl = prefs.getString(KEY_API_URL, "")?.takeIf { it.isNotEmpty() }
        if (userUrl != null) return userUrl
        // 2. 本地服务可用 → 使用发现的 URL
        if (localApiAvailable && localApiUrl != null) return localApiUrl!!
        if (localApiAvailable) return LOCAL_API_URL
        // 3. 降级到远程默认
        return DEFAULT_REMOTE_URL
    }

    /**
     * 设置 API 服务器地址（持久化保存）
     */
    fun setApiUrl(url: String) {
        prefs.edit().putString(KEY_API_URL, url).apply()
    }

    /**
     * 异步检测本地 :30488 端口是否可用（带重试，等待 Node.js 启动）
     * 扫描顺序：127.0.0.1 → WiFi IP → Cellular IP
     */
    private fun checkLocalApiAsync() {
        thread {
            // 收集所有候选 IP
            val candidateIps = mutableListOf("127.0.0.1")
            try {
                val ifaces = java.util.Collections.list(java.net.NetworkInterface.getNetworkInterfaces())
                for (iface in ifaces) {
                    if (!iface.isLoopback && iface.isUp) {
                        val addrs = java.util.Collections.list(iface.inetAddresses)
                        for (addr in addrs) {
                            if (addr is java.net.Inet4Address && !addr.isLoopbackAddress) {
                                candidateIps.add(addr.hostAddress!!)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.w("MainActivity", "获取网络接口失败: ${e.message}")
            }
            android.util.Log.d("MainActivity", "API 探测候选 IP: $candidateIps")

            // 最多重试 15 次，每次间隔 1.5 秒
            repeat(15) { attempt ->
                for (ip in candidateIps) {
                    val testUrl = "http://$ip:30488"
                    try {
                        val conn = (java.net.URL(testUrl).openConnection() as java.net.HttpURLConnection)
                        conn.connectTimeout = 1500
                        conn.readTimeout = 1500
                        conn.requestMethod = "HEAD"
                        conn.connect()
                        val code = conn.responseCode
                        conn.disconnect()
                        if (code in 200..599) {
                            localApiAvailable = true
                            localApiUrl = testUrl
                            android.util.Log.d("MainActivity", "本地API检测($testUrl): 可用 (HTTP $code, 第${attempt+1}次)")
                            return@thread
                        }
                    } catch (e: Exception) {
                        // 尝试下一个 IP
                    }
                }
                android.util.Log.d("MainActivity", "本地API检测: 第${attempt+1}次全部不可用")
                if (attempt < 14) Thread.sleep(1500)
            }
            localApiAvailable = false
            android.util.Log.d("MainActivity", "本地API检测: 最终不可用")
        }
    }

    private fun bindMusicService() {
        val intent = Intent(this, MusicService::class.java)
        bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        if (serviceBound) {
            unbindService(serviceConnection)
            serviceBound = false
        }
        webView.destroy()
        super.onDestroy()
    }

    // 音量键控制
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            // 传递给系统默认处理
            return super.onKeyDown(keyCode, event)
        }
        return super.onKeyDown(keyCode, event)
    }
}
