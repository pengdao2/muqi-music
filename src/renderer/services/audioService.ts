import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';

/**
 * 将 local:// 协议 URL 转换为 Electron 可播放的 file:// 协议 URL
 * Electron 的 HTML Audio 元素不支持自定义协议，需要转换为 file:// 协议
 * @param url 原始 URL（可能是 local:///C:/path/to/file.mp3 格式）
 * @returns 转换后的 URL（file:///C:/path/to/file.mp3 格式）
 */
function convertLocalUrlToFileUrl(url: string): string {
  if (!url || !url.startsWith('local://')) {
    return url;
  }

  try {
    // local:///C:/Users/xxx.mp3 → C:/Users/xxx.mp3
    let filePath = decodeURIComponent(url.replace('local:///', ''));

    // 兼容 local:///C:/Users/xxx.mp3 这种情况（开头多了一个斜杠）
    if (/^\/[a-zA-Z]:\//.test(filePath)) {
      filePath = filePath.slice(1);
    }

    // 统一使用正斜杠作为路径分隔符
    filePath = filePath.replace(/\\/g, '/');

    // 构建 file:// URL
    // Windows: file:///C:/path/to/file.mp3
    // Unix: file:///path/to/file.mp3
    const fileUrl = `file:///${filePath.replace(/^\//, '')}`;

    console.log(`[audioService] 转换本地 URL: ${url.substring(0, 60)}... → ${fileUrl.substring(0, 60)}...`);
    return fileUrl;
  } catch (error) {
    console.error('[audioService] 转换 local:// URL 失败:', error);
    return url; // 返回原始 URL 作为 fallback
  }
}

class AudioService {
  private audio: HTMLAudioElement;
  private currentTrack: SongResult | null = null;

  private context: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private bypass = false;

  private playbackRate = 1.0;
  private currentSinkId: string = 'default';
  private _isLoading = false;

  private operationLock = false;
  private operationLockTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  private defaultEQSettings: { [key: string]: number } = {
    '31': 0,
    '62': 0,
    '125': 0,
    '250': 0,
    '500': 0,
    '1000': 0,
    '2000': 0,
    '4000': 0,
    '8000': 0,
    '16000': 0
  };

  // Event system
  private callbacks: { [key: string]: Function[] } = {};

  constructor() {
    // Create persistent audio element
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    // Bind native DOM events
    this.bindAudioEvents();

    if ('mediaSession' in navigator) {
      this.initMediaSession();
    }

    // Restore EQ bypass state
    const bypassState = localStorage.getItem('eqBypass');
    this.bypass = bypassState ? JSON.parse(bypassState) : false;

    this.forceResetOperationLock();
    window.addEventListener('beforeunload', () => this.forceResetOperationLock());
  }

  // ==================== Native DOM Event Binding ====================

  private bindAudioEvents() {
    this.audio.addEventListener('play', () => {
      this.updateMediaSessionState(true);
      this.emit('play');
    });

    this.audio.addEventListener('pause', () => {
      this.updateMediaSessionState(false);
      this.emit('pause');
    });

    this.audio.addEventListener('ended', () => {
      this.emit('end');
    });

    this.audio.addEventListener('seeked', () => {
      this.updateMediaSessionPositionState();
      this.emit('seek');
    });

    this.audio.addEventListener('timeupdate', () => {
      // Consumers can listen to this if needed; mainly for MediaSession sync
    });

    this.audio.addEventListener('waiting', () => {
      this._isLoading = true;
    });

    this.audio.addEventListener('canplay', () => {
      this._isLoading = false;
    });

    this.audio.addEventListener('error', () => {
      const error = this.audio.error;
      console.error('Audio element error:', error?.code, error?.message);
      this.emit('audio_error', { type: 'media_error', error });
    });
  }

  // ==================== MediaSession ====================

  private initMediaSession() {
    navigator.mediaSession.setActionHandler('play', () => {
      this.audio.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.audio.pause();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      this.stop();
    });

    navigator.mediaSession.setActionHandler('seekto', (event) => {
      if (event.seekTime !== undefined) {
        this.seek(event.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (event) => {
      this.seek(this.audio.currentTime - (event.seekOffset || 10));
    });

    navigator.mediaSession.setActionHandler('seekforward', (event) => {
      this.seek(this.audio.currentTime + (event.seekOffset || 10));
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.emit('previoustrack');
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.emit('nexttrack');
    });
  }

  private updateMediaSessionMetadata(track: SongResult) {
    try {
      if (!('mediaSession' in navigator)) return;

      const artists = track.ar
        ? track.ar.map((a) => a.name)
        : track.song.artists?.map((a) => a.name);
      const album = track.al ? track.al.name : track.song.album.name;
      const artwork = ['96', '128', '192', '256', '384', '512'].map((size) => ({
        src: `${track.picUrl}?param=${size}y${size}`,
        type: 'image/jpg',
        sizes: `${size}x${size}`
      }));

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.name || '',
        artist: artists ? artists.join(',') : '',
        album: album || '',
        artwork
      });
    } catch (error) {
      console.error('更新媒体会话元数据时出错:', error);
    }
  }

  private updateMediaSessionState(isPlaying: boolean) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    this.updateMediaSessionPositionState();
  }

  private updateMediaSessionPositionState() {
    try {
      if (!('mediaSession' in navigator)) return;
      if (!this.audio.duration || !isFinite(this.audio.duration)) return;

      if ('setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration,
          playbackRate: this.playbackRate,
          position: this.audio.currentTime
        });
      }
    } catch (error) {
      console.error('更新媒体会话位置状态时出错:', error);
    }
  }

  // ==================== Event Emitter ====================

  private emit(event: string, ...args: any[]) {
    const eventCallbacks = this.callbacks[event];
    if (eventCallbacks) {
      eventCallbacks.forEach((callback) => callback(...args));
    }
  }

  on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event: string, callback: Function) {
    const eventCallbacks = this.callbacks[event];
    if (eventCallbacks) {
      this.callbacks[event] = eventCallbacks.filter((cb) => cb !== callback);
    }
  }

  clearAllListeners() {
    this.callbacks = {};
  }

  // ==================== EQ ====================

  private setupEQ() {
    if (this.sourceNode) return; // Already initialized

    try {
      this.context = new AudioContext();

      // 尝试将 audio 元素连接到 AudioContext
      // AudioContext 路由的音频在移动端后台更不容易被暂停
      try {
        this.sourceNode = this.context.createMediaElementSource(this.audio);
      } catch (mediaSourceError) {
        // CORS 或其他原因导致 createMediaElementSource 失败
        // 回退：AudioContext 不做音频路由，但仍可用于监控和恢复
        console.warn('[audioService] createMediaElementSource 失败（可能因CORS），使用直通模式:', mediaSourceError);
        this.sourceNode = null;
        this.context = null;
        this.bypass = true;

        // 注册用户交互时自动重新尝试创建 AudioContext
        this.setupUserInteractionRetry();
        return;
      }

      this.gainNode = this.context.createGain();

      if (isElectron) {
        // Electron 环境：创建 10 段 EQ 滤波器链
        const savedSettings = this.loadEQSettings();
        this.filters = this.frequencies.map((freq) => {
          const filter = this.context!.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1;
          filter.gain.value = savedSettings[freq.toString()] || 0;
          return filter;
        });
      } else {
        // Web 环境：不创建 EQ 滤波器，但走 AudioContext 路由以支持后台播放
        this.bypass = true;
      }

      // Wire up the graph
      this.applyBypassState();

      // Apply saved volume
      const savedVolume = localStorage.getItem('volume');
      this.applyVolume(savedVolume ? parseFloat(savedVolume) : 1);

      // Monitor context state（后台恢复关键）
      this.setupContextStateMonitoring();

      // Restore saved audio device
      this.restoreSavedAudioDevice();

      if (isElectron) {
        console.log('EQ initialization successful');
      } else {
        console.log('[audioService] AudioContext 已初始化（后台播放支持）');
      }
    } catch (error) {
      console.error('AudioContext initialization failed:', error);
      this.sourceNode = null;
      this.context = null;
      this.bypass = true;
    }
  }

  /**
   * Web 环境：注册用户交互监听，在用户操作时重试创建 AudioContext
   * 移动端浏览器要求 AudioContext 必须在用户手势中创建/恢复
   */
  private setupUserInteractionRetry() {
    const retrySetup = () => {
      if (this.sourceNode) {
        // 已经成功了，清理监听
        cleanup();
        return;
      }
      console.log('[audioService] 用户交互检测，重试创建 AudioContext...');
      this.setupEQ();
      if (this.sourceNode) {
        cleanup();
      }
    };

    const events = ['click', 'touchstart', 'keydown'] as const;
    const cleanup = () => {
      events.forEach((event) => {
        document.removeEventListener(event, retrySetup, { capture: true });
      });
    };

    events.forEach((event) => {
      document.addEventListener(event, retrySetup, { capture: true, once: false });
    });
  }

  private applyBypassState() {
    if (!this.sourceNode || !this.gainNode || !this.context) return;

    try {
      // Disconnect all
      try {
        this.sourceNode.disconnect();
      } catch {
        /* already disconnected */
      }
      this.filters.forEach((filter) => {
        try {
          filter.disconnect();
        } catch {
          /* already disconnected */
        }
      });
      try {
        this.gainNode.disconnect();
      } catch {
        /* already disconnected */
      }

      if (this.bypass) {
        // EQ disabled: source -> gain -> destination
        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
      } else {
        // EQ enabled: source -> filters[0] -> ... -> filters[9] -> gain -> destination
        this.sourceNode.connect(this.filters[0]);
        this.filters.forEach((filter, index) => {
          if (index < this.filters.length - 1) {
            filter.connect(this.filters[index + 1]);
          }
        });
        this.filters[this.filters.length - 1].connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
      }
    } catch (error) {
      console.error('Error applying EQ state, attempting fallback:', error);
      try {
        if (this.sourceNode && this.context) {
          this.sourceNode.connect(this.context.destination);
        }
      } catch (fallbackError) {
        console.error('Fallback connection also failed:', fallbackError);
        this.emit('audio_error', { type: 'graph_disconnected', error: fallbackError });
      }
    }
  }

  public isEQEnabled(): boolean {
    return !this.bypass;
  }

  public setEQEnabled(enabled: boolean) {
    this.bypass = !enabled;
    localStorage.setItem('eqBypass', JSON.stringify(this.bypass));

    if (this.sourceNode && this.gainNode && this.context) {
      this.applyBypassState();
    }
  }

  public setEQFrequencyGain(frequency: string, gain: number) {
    const filterIndex = this.frequencies.findIndex((f) => f.toString() === frequency);
    if (filterIndex !== -1 && this.filters[filterIndex]) {
      this.filters[filterIndex].gain.setValueAtTime(gain, this.context?.currentTime || 0);
      this.saveEQSettings(frequency, gain);
    }
  }

  public resetEQ() {
    this.filters.forEach((filter) => {
      filter.gain.setValueAtTime(0, this.context?.currentTime || 0);
    });
    localStorage.removeItem('eqSettings');
  }

  public getAllEQSettings(): { [key: string]: number } {
    return this.loadEQSettings();
  }

  public getCurrentPreset(): string | null {
    return localStorage.getItem('currentPreset');
  }

  public setCurrentPreset(preset: string): void {
    localStorage.setItem('currentPreset', preset);
  }

  private saveEQSettings(frequency: string, gain: number) {
    const settings = this.loadEQSettings();
    settings[frequency] = gain;
    localStorage.setItem('eqSettings', JSON.stringify(settings));
  }

  private loadEQSettings(): { [key: string]: number } {
    const savedSettings = localStorage.getItem('eqSettings');
    return savedSettings ? JSON.parse(savedSettings) : { ...this.defaultEQSettings };
  }

  // ==================== Operation Lock ====================

  private setOperationLock(): boolean {
    if (this.operationLock) {
      return false;
    }
    this.operationLock = true;

    if (this.operationLockTimer) clearTimeout(this.operationLockTimer);
    this.operationLockTimer = setTimeout(() => {
      console.warn('操作锁超时自动释放');
      this.releaseOperationLock();
    }, 5000);

    return true;
  }

  public releaseOperationLock(): void {
    this.operationLock = false;
    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }
  }

  public forceResetOperationLock(): void {
    this.operationLock = false;
    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }
  }

  // ==================== Playback Control ====================

  public play(
    url: string,
    track: SongResult,
    isPlay: boolean = true,
    seekTime: number = 0,
    _existingSound?: HTMLAudioElement
  ): Promise<HTMLAudioElement> {
    // 将 local:// 协议转换为 file:// 协议（HTML Audio 不支持自定义协议）
    url = convertLocalUrlToFileUrl(url);

    // Resume current playback if no new URL/track provided
    if (this.audio.src && !url && !track) {
      this.audio.play();
      return Promise.resolve(this.audio);
    }

    this.forceResetOperationLock();
    this.setOperationLock();

    if (!url || !track) {
      this.releaseOperationLock();
      return Promise.reject(new Error('缺少必要参数: url和track'));
    }

    // Check if same URL — just resume/seek
    const currentSrc = this.audio.src;
    const isSameUrl = currentSrc && currentSrc === url;

    if (isSameUrl) {
      this.currentTrack = track;
      if (seekTime > 0) this.audio.currentTime = seekTime;
      if (isPlay) this.audio.play();
      this.updateMediaSessionMetadata(track);
      this.releaseOperationLock();
      return Promise.resolve(this.audio);
    }

    return new Promise<HTMLAudioElement>((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 1;

      const tryPlay = () => {
        this._isLoading = true;
        this.currentTrack = track;

        // Ensure EQ/AudioContext is set up (only runs once)
        this.setupEQ();

        // Resume AudioContext if suspended (user gesture requirement)
        if (this.context && this.context.state === 'suspended') {
          this.context.resume().catch((e) => console.warn('Failed to resume AudioContext:', e));
        }

        const onCanPlay = () => {
          cleanup();
          this._isLoading = false;

          if (seekTime > 0) {
            this.audio.currentTime = seekTime;
          }

          if (isPlay) {
            const isAndroidNative = !!(window as any).AndroidBridge?.isNativeApp?.();
            if (!isAndroidNative && (document.hidden || document.visibilityState === 'hidden')) {
              // 浏览器环境页面隐藏中：不调用 play()（必然被浏览器拒绝），延迟到可见时播放
              console.log('[audioService] 页面隐藏中，将在可见时自动播放:', track.name);
              this.setupBackgroundPlayRetry(track);
            } else {
              // Android 原生环境或页面可见：直接尝试播放
              this.audio.play().catch((err) => {
                const isNotAllowed = err instanceof DOMException && err.name === 'NotAllowedError';
                if (isNotAllowed) {
                  if (isAndroidNative) {
                    // Android 原生：也尝试延迟重试，且标记需要恢复播放
                    console.warn('[audioService] Android 播放被阻止，启动重试机制');
                    this.setupBackgroundPlayRetry(track);
                  } else {
                    console.warn('[audioService] 播放被阻止，将在用户交互时自动恢复');
                    this.setupBackgroundPlayRetry(track);
                  }
                } else {
                  console.error('Audio play failed:', err);
                  this.emit('playerror', { track, error: err });
                }
              });
            }
          }

          // Apply volume (use GainNode if available, else direct)
          const savedVolume = localStorage.getItem('volume');
          this.applyVolume(savedVolume ? parseFloat(savedVolume) : 1);

          this.audio.playbackRate = this.playbackRate;
          this.updateMediaSessionMetadata(track);
          this.updateMediaSessionPositionState();
          this.emit('load');
          this.releaseOperationLock();
          resolve(this.audio);
        };

        const onError = () => {
          cleanup();
          this._isLoading = false;
          const error = this.audio.error;
          console.error('Audio load error:', error?.code, error?.message);
          this.emit('loaderror', { track, error });

          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
            setTimeout(tryPlay, 1000 * retryCount);
          } else {
            this.emit('url_expired', track);
            this.releaseOperationLock();
            reject(new Error('音频加载失败，请尝试切换其他歌曲'));
          }
        };

        const cleanup = () => {
          this.audio.removeEventListener('canplay', onCanPlay);
          this.audio.removeEventListener('error', onError);
        };

        this.audio.addEventListener('canplay', onCanPlay, { once: true });
        this.audio.addEventListener('error', onError, { once: true });

        // Change source and load
        this.audio.src = url;
        this.audio.load();
      };

      tryPlay();
    }).finally(() => {
      this.releaseOperationLock();
    });
  }

  public pause() {
    this.forceResetOperationLock();
    try {
      this.audio.pause();
    } catch (error) {
      console.error('暂停音频失败:', error);
    }
  }

  public stop() {
    this.forceResetOperationLock();
    try {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load(); // Reset the element
    } catch (error) {
      console.error('停止音频失败:', error);
    }
    this.currentTrack = null;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }

  public seek(time: number) {
    this.forceResetOperationLock();
    try {
      this.emit('seek_start', time);
      this.audio.currentTime = Math.max(0, time);
      this.updateMediaSessionPositionState();
    } catch (error) {
      console.error('Seek操作失败:', error);
    }
  }

  public setVolume(volume: number) {
    this.applyVolume(volume);
  }

  private applyVolume(volume: number) {
    const normalizedVolume = Math.max(0, Math.min(1, volume));

    if (this.gainNode && this.context) {
      this.gainNode.gain.cancelScheduledValues(this.context.currentTime);
      this.gainNode.gain.setValueAtTime(normalizedVolume, this.context.currentTime);
    } else {
      // Fallback: direct volume (no Web Audio context)
      this.audio.volume = normalizedVolume;
    }

    localStorage.setItem('volume', normalizedVolume.toString());
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    this.audio.playbackRate = rate;
    this.updateMediaSessionPositionState();
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  // ==================== State Queries ====================

  getCurrentSound(): HTMLAudioElement | null {
    return this.audio.src ? this.audio : null;
  }

  getCurrentTrack(): SongResult | null {
    return this.currentTrack;
  }

  isLoading(): boolean {
    return this._isLoading || this.operationLock;
  }

  isActuallyPlaying(): boolean {
    if (!this.audio.src) return false;
    try {
      const isPlaying = !this.audio.paused && !this.audio.ended;
      const contextOk = !this.context || this.context.state === 'running';
      return isPlaying && !this._isLoading && contextOk;
    } catch (error) {
      console.error('检查播放状态出错:', error);
      return false;
    }
  }

  // ==================== Audio Output Devices ====================

  public async getAudioOutputDevices(): Promise<AudioOutputDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

      return audioOutputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Speaker ${index + 1}`,
        isDefault: device.deviceId === 'default' || device.deviceId === ''
      }));
    } catch (error) {
      console.error('枚举音频设备失败:', error);
      return [{ deviceId: 'default', label: 'Default', isDefault: true }];
    }
  }

  public async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      if (this.context && typeof (this.context as any).setSinkId === 'function') {
        await (this.context as any).setSinkId(deviceId);
        this.currentSinkId = deviceId;
        localStorage.setItem('audioOutputDeviceId', deviceId);
        console.log('音频输出设备已切换:', deviceId);
        return true;
      } else {
        console.warn('AudioContext.setSinkId 不可用');
        return false;
      }
    } catch (error) {
      console.error('设置音频输出设备失败:', error);
      return false;
    }
  }

  public getCurrentSinkId(): string {
    return this.currentSinkId;
  }

  private async restoreSavedAudioDevice(): Promise<void> {
    const savedDeviceId = localStorage.getItem('audioOutputDeviceId');
    if (savedDeviceId && savedDeviceId !== 'default') {
      try {
        await this.setAudioOutputDevice(savedDeviceId);
      } catch (error) {
        console.warn('恢复音频输出设备失败，回退到默认设备:', error);
        localStorage.removeItem('audioOutputDeviceId');
        this.currentSinkId = 'default';
      }
    }
  }

  /**
   * 后台/隐藏页面延迟播放：
   * - 页面不可见时只加载音频，不调用 play()
   * - 页面恢复可见时启动重试循环（每 300ms），直到用户触摸屏幕触发真正播放
   * - 用户真实交互（pointerdown/touchend/click）时立即尝试
   */
  private setupBackgroundPlayRetry(track: SongResult) {
    let cleaned = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 30; // 30 × 300ms = 9 秒
    const RETRY_INTERVAL = 300;

    const doPlay = () => {
      if (cleaned) return;
      if (!this.currentTrack || this.currentTrack.id !== track.id) {
        cleanup();
        return;
      }
      if (!this.audio.paused) {
        cleanup();
        return;
      }
      // 确保音频有 src
      if (!this.audio.src || this.audio.src === window.location.href) {
        return; // 音频尚未加载完成，等下次重试
      }

      this.audio.play().then(() => {
        console.log('[audioService] 延迟播放成功:', track.name);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
        // 同步 Android 通知：播放成功，更新状态
        const ab = (window as any).AndroidBridge;
        if (ab?.updatePlaybackState) {
          ab.updatePlaybackState(true);
        }
        cleanup();
      }).catch((e) => {
        const isNotAllowed = e instanceof DOMException && e.name === 'NotAllowedError';
        if (isNotAllowed) {
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(doPlay, RETRY_INTERVAL);
          } else {
            console.warn('[audioService] 重试次数用尽，请手动点击播放');
            cleanup();
          }
        } else {
          console.warn('[audioService] 延迟播放失败:', e?.name || e);
          cleanup();
        }
      });
    };

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      ['pointerdown', 'click', 'touchend'].forEach((evt) => {
        document.removeEventListener(evt, onUserGesture, { capture: true });
      });
    };

    // 页面恢复可见：重置计数，启动重试循环
    const onVisibilityChange = () => {
      if (!document.hidden && !cleaned) {
        console.log('[audioService] 页面恢复可见，启动重试循环:', track.name);
        retryCount = 0;
        doPlay();
      }
    };

    // pageshow（移动端从冻结恢复）
    const onPageShow = () => {
      if (!cleaned) {
        console.log('[audioService] pageshow，重置重试');
        retryCount = 0;
        doPlay();
      }
    };

    // 用户真实触摸/点击：这是真正的用户手势，立刻重试
    const onUserGesture = () => {
      if (!cleaned) {
        retryCount = 0; // 重置计数，用户手势来了
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        doPlay();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    ['pointerdown', 'click', 'touchend'].forEach((evt) => {
      document.addEventListener(evt, onUserGesture, { capture: true });
    });

    // 如果调用时页面已经可见，或者是 Android 原生环境，直接开始重试
    const isAndroidNative = !!(window as any).AndroidBridge?.isNativeApp?.();
    if (!document.hidden || isAndroidNative) {
      console.log('[audioService] 启动重试循环:', track.name, isAndroidNative ? '(Android原生)' : '(页面可见)');
      doPlay();
    } else {
      console.log('[audioService] 页面隐藏，等待可见时播放:', track.name);
    }
  }

  private setupContextStateMonitoring() {
    if (!this.context) return;

    this.context.addEventListener('statechange', async () => {
      console.log('AudioContext state changed:', this.context?.state);

      if (this.context?.state === 'suspended' && !this.audio.paused) {
        console.log('AudioContext suspended while playing, attempting to resume...');
        try {
          await this.context.resume();
          console.log('AudioContext resumed successfully');
        } catch (e) {
          console.error('Failed to resume AudioContext:', e);
          this.emit('audio_error', { type: 'context_suspended', error: e });
        }
      } else if (this.context?.state === 'closed') {
        console.warn('AudioContext was closed unexpectedly');
        this.emit('audio_error', { type: 'context_closed' });
      }
    });
  }
}

export const audioService = new AudioService();
