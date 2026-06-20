<template>
  <div class="app-container h-full w-full" :class="{ mobile: isMobile, noElectron: !isElectron }">
    <n-config-provider :theme="theme === 'dark' ? darkTheme : lightTheme">
      <n-dialog-provider>
        <n-message-provider>
          <router-view></router-view>
          <traffic-warning-drawer v-if="!isElectron"></traffic-warning-drawer>
        </n-message-provider>
      </n-dialog-provider>
    </n-config-provider>
  </div>
</template>

<script setup lang="ts">
import { cloneDeep } from 'lodash';
import { createDiscreteApi, darkTheme, lightTheme } from 'naive-ui';
import { computed, nextTick, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import TrafficWarningDrawer from '@/components/TrafficWarningDrawer.vue';
import { usePlayerStore } from '@/store/modules/player';
import { usePlayerCoreStore } from '@/store/modules/playerCore';
import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';
import { isElectron, isLyricWindow } from '@/utils';
import { checkLoginStatus } from '@/utils/auth';

import { initAudioListeners, initMusicHook } from './hooks/MusicHook';
import { audioService } from './services/audioService';
import { initLxMusicRunner, parseScriptInfo } from './services/LxMusicSourceRunner';
import { isMobile } from './utils';
import { useAppShortcuts } from './utils/appShortcuts';

const { locale } = useI18n();
const settingsStore = useSettingsStore();
const playerStore = usePlayerStore();
const playerCoreStore = usePlayerCoreStore();
const userStore = useUserStore();
const router = useRouter();

// 监听语言变化
watch(
  () => settingsStore.setData.language,
  (newLanguage) => {
    if (newLanguage && newLanguage !== locale.value) {
      locale.value = newLanguage;
    }
  },
  { immediate: true }
);

const theme = computed(() => {
  return settingsStore.theme;
});

// 监听字体变化并应用
watch(
  () => [settingsStore.setData.fontFamily, settingsStore.setData.fontScope],
  ([newFont, fontScope]) => {
    const appElement = document.body;
    if (newFont && fontScope === 'global') {
      appElement.style.fontFamily = newFont;
    } else {
      appElement.style.fontFamily = '';
    }
  }
);

const handleSetLanguage = (value: string) => {
  console.log('应用语言变更:', value);
  if (value) {
    locale.value = value;
  }
};

if (!isLyricWindow.value) {
  settingsStore.initializeSettings();
  settingsStore.initializeTheme();
  settingsStore.initializeSystemFonts();

  // 初始化登录状态 - 从 localStorage 恢复用户信息和登录类型
  const loginInfo = checkLoginStatus();
  if (loginInfo.isLoggedIn) {
    if (loginInfo.user && !userStore.user) {
      userStore.setUser(loginInfo.user);
    }
    if (loginInfo.loginType && !userStore.loginType) {
      userStore.setLoginType(loginInfo.loginType);
    }
  }
}

handleSetLanguage(settingsStore.setData.language);

// 监听迷你模式状态
if (isElectron) {
  window.api.onLanguageChanged(handleSetLanguage);
  window.electron.ipcRenderer.on('mini-mode', (_, value) => {
    settingsStore.setMiniMode(value);
    if (value) {
      // 存储当前路由
      localStorage.setItem('currentRoute', router.currentRoute.value.path);
      router.push('/mini');
    } else {
      // 清理迷你模式下设置的 body 样式
      document.body.style.height = '';
      document.body.style.overflow = '';
      // 恢复当前路由
      const currentRoute = localStorage.getItem('currentRoute');
      if (currentRoute) {
        router.push(currentRoute);
        localStorage.removeItem('currentRoute');
      } else {
        router.push('/');
      }
    }
  });
}

// 使用应用内快捷键
useAppShortcuts();

onMounted(async () => {
  playerStore.setIsPlay(false);
  if (isLyricWindow.value) {
    return;
  }

  // 检查网络状态，离线时自动跳转到本地音乐页面
  if (!navigator.onLine) {
    router.push('/local-music');
  }

  // 监听网络状态变化，断网时跳转到本地音乐页面
  const handleOffline = () => {
    router.push('/local-music');
  };
  window.addEventListener('offline', handleOffline);
  onUnmounted(() => {
    window.removeEventListener('offline', handleOffline);
  });

  // 初始化 MusicHook，注入 playerStore
  initMusicHook(playerStore);
  // 设置 URL 过期自动续播处理器
  const { setupUrlExpiredHandler } = await import('@/services/playbackController');
  setupUrlExpiredHandler();
  // 初始化播放状态
  await playerStore.initializePlayState();

  // 初始化音频设备变化监听器
  playerCoreStore.initAudioDeviceListener();

  // 初始化落雪音源（如果有激活的音源）
  const LX_SCRIPT_CONFIRMED_KEY = 'lx_script_confirmed_id';
  const activeLxApiId = settingsStore.setData?.activeLxMusicApiId;
  if (activeLxApiId) {
    const lxMusicScripts = settingsStore.setData?.lxMusicScripts || [];
    const activeScript = lxMusicScripts.find((script: any) => script.id === activeLxApiId);
    if (activeScript && activeScript.script) {
      const confirmedId = localStorage.getItem(LX_SCRIPT_CONFIRMED_KEY);

      if (confirmedId === activeLxApiId) {
        // 已确认过的脚本，直接初始化，无需弹窗
        try {
          console.log('[App] 自动初始化落雪音源:', activeScript.name);
          await initLxMusicRunner(activeScript.script);
        } catch (error) {
          console.error('[App] 初始化落雪音源失败:', error);
        }
      } else {
        // 首次使用或脚本已变更，需要用户确认
        setTimeout(async () => {
          const { dialog } = createDiscreteApi(['dialog']);
          dialog.warning({
            title: '请对脚本确认',
            content: `检测到激活的落雪音源「${activeScript.name}」，该脚本由第三方提供，可能在沙箱中执行代码。是否允许加载？`,
            positiveText: '允许加载',
            negativeText: '禁用',
            onPositiveClick: async () => {
              try {
                console.log('[App] 用户确认，初始化落雪音源:', activeScript.name);
                localStorage.setItem(LX_SCRIPT_CONFIRMED_KEY, activeLxApiId);
                await initLxMusicRunner(activeScript.script);
              } catch (error) {
                console.error('[App] 初始化落雪音源失败:', error);
              }
            },
            onNegativeClick: () => {
              console.log('[App] 用户拒绝加载落雪音源，已禁用');
              settingsStore.setData.activeLxMusicApiId = undefined;
            }
          });
        }, 2000);
      }
    }
  }

  // 如果没有落雪音源脚本，尝试从内置 lxmusic 目录批量导入
  const lxMusicScripts = settingsStore.setData?.lxMusicScripts || [];
  if (lxMusicScripts.length === 0) {
    console.log('[App] 未找到落雪音源脚本，尝试从内置 lxmusic 目录导入...');
    try {
      // Android WebView: 使用 Bridge 读取 assets（fetch 无法读取 file:// 本地文件）
      // Electron/Web: 使用 fetch 读取相对路径
      const bridge = (window as any).AndroidBridge;
      const isNative = typeof bridge?.isNativeApp === 'function' && bridge.isNativeApp();
      const assetBase = isNative ? 'public/lxmusic' : './lxmusic';

      let manifestText: string;
      if (isNative) {
        manifestText = bridge.readAssetFile(`${assetBase}/manifest.json`);
        if (!manifestText) throw new Error('Bridge 返回空');
      } else {
        const manifestRes = await fetch(`${assetBase}/manifest.json`);
        if (!manifestRes.ok) throw new Error(`HTTP ${manifestRes.status}`);
        manifestText = await manifestRes.text();
      }

      const fileList: string[] = JSON.parse(manifestText);
      console.log('[App] 发现内置脚本:', fileList);

      const importedScripts: any[] = [];
      for (const fileName of fileList) {
        try {
          let scriptContent: string;
          if (isNative) {
            scriptContent = bridge.readAssetFile(`${assetBase}/${fileName}`);
            if (!scriptContent) {
              console.warn(`[App] 跳过无法加载的脚本: ${fileName}`);
              continue;
            }
          } else {
            const scriptRes = await fetch(`${assetBase}/${fileName}`);
            if (!scriptRes.ok) {
              console.warn(`[App] 跳过无法加载的脚本: ${fileName}`);
              continue;
            }
            scriptContent = await scriptRes.text();
          }

          // 校验脚本头部格式
          if (!/^\/\*+[\s\S]*?@name/.test(scriptContent)) {
            console.warn(`[App] 跳过格式不符的脚本: ${fileName}`);
            continue;
          }

          const scriptInfo = parseScriptInfo(scriptContent);
          const tmpRunner = await initLxMusicRunner(scriptContent);
          const sources = tmpRunner.getSources();
          const sourceKeys = Object.keys(sources);
          const scriptId = `lx_builtin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

          importedScripts.push({
            id: scriptId,
            name: scriptInfo.name || fileName,
            script: scriptContent,
            info: scriptInfo,
            sources: sourceKeys,
            enabled: true,
            createdAt: Date.now()
          });
          console.log(`[App] 内置脚本已导入: ${scriptInfo.name}`);
        } catch (fileErr) {
          console.warn(`[App] 导入脚本失败 ${fileName}:`, fileErr);
        }
      }

      if (importedScripts.length > 0) {
        // 自动激活第一个脚本
        const activeId = importedScripts[0].id;
        settingsStore.setSetData({
          lxMusicScripts: importedScripts,
          activeLxMusicApiId: activeId
        });
        localStorage.setItem(LX_SCRIPT_CONFIRMED_KEY, activeId);
        console.log(`[App] 内置脚本导入完成，共 ${importedScripts.length} 个，激活: ${importedScripts[0].name}`);
      }
    } catch (err) {
      console.log('[App] 内置 lxmusic 目录不可用，尝试默认 URL...');
    }

    // 如果内置也没导入成功，尝试从默认 URL 拉取
    const currentScripts = settingsStore.setData?.lxMusicScripts || [];
    if (currentScripts.length === 0) {
      const defaultScriptUrl = settingsStore.setData?.defaultLxMusicScriptUrl;
      if (defaultScriptUrl) {
        console.log('[App] 检测到默认落雪脚本 URL，尝试拉取...');
        try {
          const res = await fetch(defaultScriptUrl);
          if (res.ok) {
            const scriptContent = await res.text();
            const scriptInfo = parseScriptInfo(scriptContent);
            const tmpRunner = await initLxMusicRunner(scriptContent);
            const sources = tmpRunner.getSources();
            const sourceKeys = Object.keys(sources);
            const scriptId = `lx_default_${Date.now()}`;

            const newScript = {
              id: scriptId,
              name: scriptInfo.name || '默认音源',
              script: scriptContent,
              info: scriptInfo,
              sources: sourceKeys,
              enabled: true,
              createdAt: Date.now()
            };

            settingsStore.setSetData({
              lxMusicScripts: [newScript],
              activeLxMusicApiId: scriptId
            });

            localStorage.setItem(LX_SCRIPT_CONFIRMED_KEY, scriptId);
            console.log('[App] 默认落雪音源已自动配置:', scriptInfo.name);
          }
        } catch (err) {
          console.warn('[App] 拉取默认落雪脚本失败:', err);
        }
      }
    }
  }

  // 如果有正在播放的音乐，则初始化音频监听器
  if (playerStore.playMusic && playerStore.playMusic.id) {
    // 使用 nextTick 确保 DOM 更新后再初始化
    await nextTick();
    initAudioListeners();
    if (isElectron) {
      window.api.sendSong(cloneDeep(playerStore.playMusic));
    }
  }

  audioService.releaseOperationLock();

  // ====== 移动端后台播放支持 ======
  // 监听页面可见性变化，防止切后台/锁屏后音频被暂停
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // 页面隐藏时：如果正在播放，主动保持 AudioContext 运行
      if (playerStore.isPlay) {
        // 尝试通过 MediaSession 告知系统这是活跃音频
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
        console.log('[App] 页面隐藏，保持播放状态');
      }
    } else {
      // 页面恢复可见时：检查播放状态，若音频被暂停则恢复
      if (playerStore.isPlay && playerStore.playMusic) {
        const audio = audioService.getCurrentSound();
        if (audio && audio.paused && audio.src) {
          console.log('[App] 页面恢复可见，尝试恢复播放...');
          audio.play().catch((err) => {
            console.warn('[App] 恢复播放失败:', err);
          });
        }
        // 同步 MediaSession 状态
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 额外监听 pageshow/pagehide（处理移动端浏览器冻结页面）
  const handlePageShow = () => {
    if (playerStore.isPlay && playerStore.playMusic) {
      const audio = audioService.getCurrentSound();
      if (audio && audio.paused && audio.src) {
        audio.play().catch(() => {});
      }
    }
  };
  window.addEventListener('pageshow', handlePageShow);

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pageshow', handlePageShow);
  });
});
</script>

<style lang="scss" scoped>
.app-container {
  user-select: none;
}

.mobile {
  .text-base {
    font-size: 14px !important;
  }
}

.html:has(.mobile) {
  font-size: 14px;
}
</style>
