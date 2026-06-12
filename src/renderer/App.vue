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

  // 如果没有落雪音源脚本，尝试从默认 URL 拉取
  const lxMusicScripts = settingsStore.setData?.lxMusicScripts || [];
  if (lxMusicScripts.length === 0) {
    const defaultScriptUrl = settingsStore.setData?.defaultLxMusicScriptUrl;
    if (defaultScriptUrl) {
      console.log('[App] 检测到默认落雪脚本 URL，尝试拉取...');
      try {
        const res = await fetch(defaultScriptUrl);
        if (res.ok) {
          const scriptContent = await res.text();
          const scriptInfo = parseScriptInfo(scriptContent);
          // 先初始化 runner 获取 sources
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

          // 自动确认（默认脚本）
          localStorage.setItem(LX_SCRIPT_CONFIRMED_KEY, scriptId);
          console.log('[App] 默认落雪音源已自动配置:', scriptInfo.name);

          // runner 已在上面初始化，无需再次初始化
        }
      } catch (err) {
        console.warn('[App] 拉取默认落雪脚本失败:', err);
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
