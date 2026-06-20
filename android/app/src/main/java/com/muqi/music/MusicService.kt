package com.muqi.music

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaMetadata
import android.os.Binder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationCompat
import java.net.URL
import kotlin.concurrent.thread

/**
 * 前台服务：保证 App 在后台不被系统杀死，实现流畅的背景音乐播放
 */
class MusicService : Service() {

    companion object {
        const val CHANNEL_ID = "muqi_music_playback"
        const val CHANNEL_NAME = "MuqiMusic 播放"
        const val NOTIFICATION_ID = 1001
        const val ACTION_PLAY = "com.muqi.music.ACTION_PLAY"
        const val ACTION_PAUSE = "com.muqi.music.ACTION_PAUSE"
        const val ACTION_NEXT = "com.muqi.music.ACTION_NEXT"
        const val ACTION_PREV = "com.muqi.music.ACTION_PREV"
    }

    inner class LocalBinder : Binder() {
        fun getService(): MusicService = this@MusicService
    }

    private val binder = LocalBinder()
    private lateinit var mediaSession: MediaSessionCompat
    private lateinit var audioManager: AudioManager
    private var wakeLock: PowerManager.WakeLock? = null
    // 分别的回调：播放/暂停/下一首/上一首/拖动进度
    private var playCallback: (() -> Unit)? = null
    private var pauseCallback: (() -> Unit)? = null
    private var nextCallback: (() -> Unit)? = null
    private var prevCallback: (() -> Unit)? = null
    private var seekCallback: ((Long) -> Unit)? = null
    // 缓存的元数据用于通知展示
    private var cachedTitle: String = ""
    private var cachedArtist: String = ""
    private var cachedIsPlaying: Boolean = false
    private var cachedPosition: Long = PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN
    private var cachedDuration: Long = 0
    private var cachedAlbumArt: Bitmap? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        createNotificationChannel()
        setupMediaSession()
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> playCallback?.invoke()
            ACTION_PAUSE -> pauseCallback?.invoke()
            ACTION_NEXT -> nextCallback?.invoke()
            ACTION_PREV -> prevCallback?.invoke()
        }
        startForeground(NOTIFICATION_ID, buildNotification())
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onDestroy() {
        releaseWakeLock()
        mediaSession.release()
        super.onDestroy()
    }

    /**
     * 由 WebAppInterface 调用来更新通知信息
     * @param title 歌曲名
     * @param artist 歌手
     * @param albumArtUrl 专辑封面图片URL（http/https链接或base64 data URL）
     */
    fun updateMetadata(title: String?, artist: String?, albumArtUrl: String?) {
        cachedTitle = title ?: ""
        cachedArtist = artist ?: ""
        val metadataBuilder = MediaMetadataCompat.Builder()
        if (!cachedTitle.isEmpty()) metadataBuilder.putString(MediaMetadata.METADATA_KEY_TITLE, cachedTitle)
        if (!cachedArtist.isEmpty()) metadataBuilder.putString(MediaMetadata.METADATA_KEY_ARTIST, cachedArtist)
        if (cachedDuration > 0) metadataBuilder.putLong(MediaMetadata.METADATA_KEY_DURATION, cachedDuration)
        mediaSession.setMetadata(metadataBuilder.build())

        // 异步加载专辑封面
        if (!albumArtUrl.isNullOrEmpty()) {
            loadAlbumArt(albumArtUrl)
        } else {
            cachedAlbumArt = null
            rebuildNotification()
        }
    }

    /**
     * 更新播放进度（前端定时调用）
     * @param position 当前播放位置（毫秒）
     * @param duration 总时长（毫秒）
     */
    fun updatePlaybackPosition(position: Long, duration: Long) {
        cachedPosition = position
        if (duration > 0) {
            cachedDuration = duration
            // 更新 metadata 中的时长，使通知栏进度条能显示总时长
            val metadataBuilder = MediaMetadataCompat.Builder()
            if (cachedTitle.isNotEmpty()) metadataBuilder.putString(MediaMetadata.METADATA_KEY_TITLE, cachedTitle)
            if (cachedArtist.isNotEmpty()) metadataBuilder.putString(MediaMetadata.METADATA_KEY_ARTIST, cachedArtist)
            metadataBuilder.putLong(MediaMetadata.METADATA_KEY_DURATION, duration)
            mediaSession.setMetadata(metadataBuilder.build())
        }
        val state = if (cachedIsPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
        val pb = PlaybackStateCompat.Builder()
            .setState(state, position, 1.0f, SystemClock.elapsedRealtime())
            .setActions(
                PlaybackStateCompat.ACTION_PLAY
                    or PlaybackStateCompat.ACTION_PAUSE
                    or PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                    or PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                    or PlaybackStateCompat.ACTION_SEEK_TO
                    or PlaybackStateCompat.ACTION_STOP
            )
            .build()
        mediaSession.setPlaybackState(pb)
    }

    fun updatePlaybackState(isPlaying: Boolean) {
        cachedIsPlaying = isPlaying
        val state = if (isPlaying) {
            PlaybackStateCompat.STATE_PLAYING
        } else {
            PlaybackStateCompat.STATE_PAUSED
        }
        val pb = PlaybackStateCompat.Builder()
            .setState(state, cachedPosition, 1.0f, SystemClock.elapsedRealtime())
            .setActions(
                PlaybackStateCompat.ACTION_PLAY
                    or PlaybackStateCompat.ACTION_PAUSE
                    or PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                    or PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                    or PlaybackStateCompat.ACTION_SEEK_TO
                    or PlaybackStateCompat.ACTION_STOP
            )
            .build()
        mediaSession.setPlaybackState(pb)

        // 确保 metadata 中有时长
        if (cachedDuration > 0) {
            val metadataBuilder = MediaMetadataCompat.Builder()
            if (cachedTitle.isNotEmpty()) metadataBuilder.putString(MediaMetadata.METADATA_KEY_TITLE, cachedTitle)
            if (cachedArtist.isNotEmpty()) metadataBuilder.putString(MediaMetadata.METADATA_KEY_ARTIST, cachedArtist)
            metadataBuilder.putLong(MediaMetadata.METADATA_KEY_DURATION, cachedDuration)
            mediaSession.setMetadata(metadataBuilder.build())
        }

        // 更新通知
        rebuildNotification()
    }

    /**
     * 重新构建并发送通知
     */
    private fun rebuildNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildNotification(cachedIsPlaying))
    }

    /**
     * 设置 WebView 回调（由 WebAppInterface 绑定）
     */
    fun setPlayCallback(cb: () -> Unit) { playCallback = cb }
    fun setPauseCallback(cb: () -> Unit) { pauseCallback = cb }
    fun setNextCallback(cb: () -> Unit) { nextCallback = cb }
    fun setPrevCallback(cb: () -> Unit) { prevCallback = cb }
    fun setSeekCallback(cb: (Long) -> Unit) { seekCallback = cb }

    private fun setupMediaSession() {
        mediaSession = MediaSessionCompat(this, "MuqiMusic")

        mediaSession.setCallback(object : MediaSessionCompat.Callback() {
            override fun onPlay() { playCallback?.invoke() }
            override fun onPause() { pauseCallback?.invoke() }
            override fun onSkipToNext() { nextCallback?.invoke() }
            override fun onSkipToPrevious() { prevCallback?.invoke() }
            override fun onStop() { pauseCallback?.invoke() }
            override fun onSeekTo(pos: Long) { seekCallback?.invoke(pos) }
        })

        mediaSession.isActive = true
    }

    private fun buildNotification(isPlaying: Boolean = false): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val playPauseAction = if (isPlaying) {
            NotificationCompat.Action(
                android.R.drawable.ic_media_pause, "暂停",
                buildActionIntent(ACTION_PAUSE)
            )
        } else {
            NotificationCompat.Action(
                android.R.drawable.ic_media_play, "播放",
                buildActionIntent(ACTION_PLAY)
            )
        }

        val title = cachedTitle.ifEmpty { "MuqiMusic" }
        val subtText = if (cachedArtist.isNotEmpty()) "$cachedArtist ${if (isPlaying) "· 正在播放" else "· 已暂停"}" else if (isPlaying) "正在播放..." else "已暂停"

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(subtText)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(
                android.R.drawable.ic_media_previous, "上一首",
                buildActionIntent(ACTION_PREV)
            )
            .addAction(playPauseAction)
            .addAction(
                android.R.drawable.ic_media_next, "下一首",
                buildActionIntent(ACTION_NEXT)
            )
            .setStyle(
                androidx.media.app.NotificationCompat.MediaStyle()
                    .setMediaSession(mediaSession.sessionToken)
                    .setShowActionsInCompactView(0, 1, 2)
            )
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)

        // 设置专辑封面大图标
        if (cachedAlbumArt != null) {
            builder.setLargeIcon(cachedAlbumArt)
        }

        return builder.build()
    }

    private fun buildActionIntent(action: String): PendingIntent {
        val intent = Intent(this, MusicService::class.java).apply {
            this.action = action
        }
        return PendingIntent.getService(
            this, action.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * 异步从 URL 加载专辑封面 Bitmap
     * 支持 http/https URL 和 base64 data URL
     */
    private fun loadAlbumArt(url: String) {
        thread {
            try {
                val bitmap = if (url.startsWith("data:")) {
                    // Base64 data URL
                    val base64 = url.substringAfter("base64,")
                    val bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                } else {
                    // HTTP/HTTPS URL
                    val connection = URL(url).openConnection()
                    connection.connectTimeout = 8000
                    connection.readTimeout = 8000
                    BitmapFactory.decodeStream(connection.getInputStream())
                }
                cachedAlbumArt = bitmap
            } catch (e: Exception) {
                android.util.Log.w("MusicService", "加载专辑封面失败: ${e.message}")
                cachedAlbumArt = null
            }
            // 切回主线程更新通知
            mainHandler.post { rebuildNotification() }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "MuqiMusic 音乐播放通知"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "MuqiMusic::PlaybackWakeLock"
            )
            wakeLock?.acquire(10 * 60 * 1000L) // 10分钟
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) it.release()
            wakeLock = null
        }
    }
}
