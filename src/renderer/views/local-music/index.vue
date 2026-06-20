<template>
  <div class="local-music-page h-full w-full bg-white dark:bg-black transition-colors duration-500">
    <n-scrollbar class="h-full">
      <div class="local-music-content pb-32">
        <!-- Hero Section -->
        <section class="hero-section relative overflow-hidden rounded-tl-2xl">
          <div class="hero-bg absolute inset-0 -top-20">
            <div
              class="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-3xl opacity-50 dark:opacity-30"
            ></div>
            <div
              class="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-black/80 dark:to-black"
            ></div>
          </div>

          <div class="hero-content relative z-10 page-padding-x pt-6 pb-4">
            <div class="flex items-center gap-5">
              <div
                class="cover-container relative w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg ring-2 ring-white/50 dark:ring-neutral-800/50 shrink-0"
              >
                <i class="ri-folder-music-fill text-4xl text-primary opacity-80" />
              </div>
              <div class="info-content min-w-0">
                <h1
                  class="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight"
                >
                  {{ t('localMusic.title') }}
                </h1>
                <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {{ t('localMusic.songCount', { count: currentList.length }) }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Tab Bar + Actions -->
        <section
          class="action-bar sticky top-0 z-20 page-padding-x py-3 md:py-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-800/50"
        >
          <div class="flex items-center justify-between gap-4">
            <!-- Tabs -->
            <div class="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl">
              <button
                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="
                  currentTab === 'download'
                    ? 'bg-white dark:bg-neutral-800 text-primary shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                "
                @click="currentTab = 'download'"
              >
                下载的音乐
              </button>
              <button
                v-if="isElectron"
                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="
                  currentTab === 'local'
                    ? 'bg-white dark:bg-neutral-800 text-primary shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                "
                @click="currentTab = 'local'"
              >
                本地文件
              </button>
            </div>

            <!-- 搜索 + 操作 -->
            <div class="flex items-center gap-3">
              <div class="flex-1 max-w-xs hidden sm:block">
                <n-input
                  v-model:value="searchKeyword"
                  :placeholder="t('localMusic.search')"
                  clearable
                  size="small"
                  round
                >
                  <template #prefix>
                    <i class="ri-search-line text-neutral-400" />
                  </template>
                </n-input>
              </div>

              <button
                v-if="currentList.length > 0"
                class="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all bg-primary text-white hover:bg-primary/90"
                @click="handlePlayAll"
              >
                <i class="ri-play-fill text-lg" />
                <span class="hidden md:inline">{{ t('localMusic.playAll') }}</span>
              </button>

              <!-- Android: 重新扫描本地目录 -->
              <button
                v-if="!isElectron"
                class="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                :disabled="scanning"
                @click="handleRescan"
              >
                <i class="ri-refresh-line text-lg" :class="{ 'animate-spin': scanning }" />
              </button>

              <!-- 本地文件: 扫描/添加文件夹 (Electron) -->
              <button
                v-if="isElectron && currentTab === 'local'"
                class="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                :disabled="localMusicStore.scanning"
                @click="handleScan"
              >
                <i class="ri-refresh-line text-lg" :class="{ 'animate-spin': localMusicStore.scanning }" />
              </button>
              <button
                v-if="isElectron && currentTab === 'local'"
                class="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                @click="handleAddFolder"
              >
                <i class="ri-folder-add-line text-lg" />
              </button>
              <button
                v-if="isElectron && currentTab === 'local' && localMusicStore.folderPaths.length > 0"
                class="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                @click="showFolderManager = true"
              >
                <i class="ri-folder-settings-line text-lg" />
              </button>
            </div>
          </div>

          <!-- 移动端搜索 -->
          <div class="sm:hidden mt-3" v-if="currentList.length > 0">
            <n-input
              v-model:value="searchKeyword"
              :placeholder="t('localMusic.search')"
              clearable
              size="small"
              round
            >
              <template #prefix>
                <i class="ri-search-line text-neutral-400" />
              </template>
            </n-input>
          </div>
        </section>

        <!-- 扫描进度 -->
        <section v-if="localMusicStore.scanning && currentTab === 'local'" class="page-padding-x mt-6">
          <div class="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
            <n-spin size="small" />
            <div>
              <p class="text-sm font-medium text-neutral-900 dark:text-white">{{ t('localMusic.scanning') }}</p>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {{ t('localMusic.songCount', { count: localMusicStore.scanProgress }) }}
              </p>
            </div>
          </div>
        </section>

        <!-- 歌曲列表 -->
        <section class="list-section page-padding-x mt-6">
          <div
            v-if="currentList.length === 0 && !localMusicStore.scanning"
            class="empty-state py-20 text-center"
          >
            <i class="ri-folder-music-fill text-5xl mb-4 text-neutral-200 dark:text-neutral-800" />
            <p class="text-neutral-400">
              {{ currentTab === 'download' ? '暂无下载的音乐，去歌单中下载吧' : t('localMusic.emptyState') }}
            </p>
            <button
              v-if="isElectron && currentTab === 'local'"
              class="mt-6 px-6 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all"
              @click="handleAddFolder"
            >
              <i class="ri-folder-add-line mr-2" />
              {{ t('localMusic.scanFolder') }}
            </button>
          </div>

          <div v-else-if="currentList.length > 0" class="song-list-container">
            <song-item
              v-for="(item, index) in currentList"
              :key="item.id"
              :index="index"
              :item="item"
              @play="handlePlaySong"
            />
          </div>
        </section>
      </div>
    </n-scrollbar>

    <!-- 文件夹管理抽屉 -->
    <n-drawer v-if="isElectron" v-model:show="showFolderManager" :width="Math.min(400, window.innerWidth - 16)" placement="right">
      <n-drawer-content :title="t('localMusic.removeFolder')" closable>
        <div class="space-y-3 py-4">
          <div
            v-for="folder in localMusicStore.folderPaths"
            :key="folder"
            class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <i class="ri-folder-line text-lg text-primary flex-shrink-0" />
              <span class="text-sm text-neutral-700 dark:text-neutral-300 truncate">{{ folder }}</span>
            </div>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0 ml-2"
              @click="handleRemoveFolder(folder)"
            >
              <i class="ri-delete-bin-line" />
            </button>
          </div>
          <div v-if="localMusicStore.folderPaths.length === 0" class="text-center py-8">
            <i class="ri-folder-line text-4xl text-neutral-200 dark:text-neutral-800" />
            <p class="text-sm text-neutral-400 mt-2">{{ t('localMusic.emptyState') }}</p>
          </div>
        </div>
        <template #footer>
          <n-button type="primary" block @click="handleAddFolder">
            <template #icon><i class="ri-folder-add-line" /></template>
            {{ t('localMusic.scanFolder') }}
          </n-button>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { createDiscreteApi } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import SongItem from '@/components/common/SongItem.vue';
import { useDownloadStore } from '@/store/modules/download';
import { useLocalMusicStore } from '@/store/modules/localMusic';
import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import { filterByKeyword, toSongResult } from '@/utils/localMusicUtils';

const { t } = useI18n();
const { message } = createDiscreteApi(['message']);
const localMusicStore = useLocalMusicStore();
const downloadStore = useDownloadStore();
const playerStore = usePlayerStore();

const currentTab = ref<'download' | 'local'>('download');
const searchKeyword = ref('');
const showFolderManager = ref(false);
const scanning = ref(false);

/**
 * 用稳定的 hash 生成 ID（不会每次 computed 变化）
 */
function stableId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return 'dl_' + (hash >>> 0).toString(16);
}

/**
 * 已下载音乐 → SongResult
 */
const downloadedSongs = computed<SongResult[]>(() => {
  return downloadStore.completedList.map((item: any, index: number) => {
    const artistName = (item.ar || []).map((a: any) => a.name || '').join(', ') || '未知歌手';
    const songName = item.displayName || item.filename || '未知歌曲';
    // 优先使用 songInfo.id（真实歌曲 API ID），否则用 filePath 生成稳定 hash
    const uid = (item.songInfo?.id && item.songInfo.id !== 0)
      ? String(item.songInfo.id)
      : (item.id && item.id !== 0)
        ? String(item.id)
        : stableId(item.filePath || item.path || `downloaded_${index}`);
    return {
      id: uid,
      name: songName,
      picUrl: item.picUrl || '',
      // @ts-ignore - 本地文件需要 filePath 用于读取音频数据
      filePath: item.filePath || '',
      ar: (item.ar || [{ name: artistName }]).map((a: any) => ({
        name: a.name || '',
        id: 0, picId: 0, img1v1Id: 0, briefDesc: '', picUrl: '',
        img1v1Url: '', albumSize: 0, alias: [], trans: '',
        musicSize: 0, topicPerson: 0
      })),
      al: {
        name: '',
        id: 0, picUrl: item.picUrl || '', pic: 0, picId: 0,
        type: '', size: 0, blurPicUrl: '', companyId: 0,
        publishTime: 0, description: '', tags: '', company: '',
        briefDesc: '', artist: { name: artistName, id: 0, picId: 0, img1v1Id: 0,
          briefDesc: '', picUrl: '', img1v1Url: '', albumSize: 0, alias: [],
          trans: '', musicSize: 0, topicPerson: 0 },
        songs: [], alias: [], status: 0, copyrightId: 0,
        commentThreadId: '', artists: [], subType: '',
        transName: null, onSale: false, mark: 0, picId_str: ''
      },
      // 优先使用本地 content:// URI（Android 扫描文件），否则由 API 获取在线地址
      playMusicUrl: (item.playMusicUrl || item.contentUri) as any,
      source: 'netease' as const,
      count: 0
    } as SongResult;
  });
});

/**
 * 本地文件（Electron only）
 */
const localFileSongs = computed<SongResult[]>(() => {
  return filterByKeyword(localMusicStore.musicList, searchKeyword.value).map(toSongResult);
});

/**
 * 当前 tab 显示列表
 */
const currentList = computed<SongResult[]>(() => {
  if (currentTab.value === 'local' && isElectron) {
    return localFileSongs.value;
  }
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase();
    return downloadedSongs.value.filter(
      (s) => s.name.toLowerCase().includes(kw) ||
        (s.ar || []).some((a: any) => (a.name || '').toLowerCase().includes(kw))
    );
  }
  return downloadedSongs.value;
});

// 播放单曲
const handlePlaySong = async (_song: SongResult) => {
  try {
    playerStore.setPlayList(currentList.value);
  } catch (e) {
    console.error('播放失败:', e);
  }
};

// 播放全部
const handlePlayAll = async () => {
  if (currentList.value.length === 0) return;
  const firstSong = currentList.value[0];

  if (isElectron && currentTab.value === 'local') {
    const entry = localMusicStore.musicList[0];
    if (entry) {
      try {
        const exists = await window.electron.ipcRenderer.invoke('check-file-exists', entry.filePath);
        if (!exists) {
          message.error(t('localMusic.fileNotFound'));
          return;
        }
      } catch { /* ignore */ }
    }
  }

  playerStore.setPlayList(currentList.value);
  try {
    await playerStore.setPlay(firstSong);
  } catch (e) {
    console.error('播放失败:', e);
  }
};

// Android: 重新扫描本地目录
const handleRescan = async () => {
  if (scanning.value) return;
  scanning.value = true;
  try {
    await downloadStore.refreshCompleted();
    message.success(t('localMusic.scanComplete') || '扫描完成');
  } catch (e) {
    console.error('扫描失败:', e);
    message.error('扫描失败');
  } finally {
    scanning.value = false;
  }
};

// 扫描/添加文件夹
const handleScan = async () => {
  if (!isElectron) return;
  if (localMusicStore.folderPaths.length === 0) {
    await handleAddFolder();
    return;
  }
  await localMusicStore.scanFolders();
};

const handleAddFolder = async () => {
  if (!isElectron) return;
  try {
    const result = await window.electron.ipcRenderer.invoke('select-directory');
    if (result && !result.canceled && result.filePaths?.length > 0) {
      localMusicStore.addFolder(result.filePaths[0]);
      await localMusicStore.scanFolders();
    }
  } catch (error) {
    console.error('选择文件夹失败:', error);
    message.error(String(error));
  }
};

const handleRemoveFolder = (folder: string) => {
  localMusicStore.removeFolder(folder);
};

onMounted(async () => {
  downloadStore.refreshCompleted();
  if (isElectron) {
    await localMusicStore.loadFromCache();
  }
});

watch(currentTab, (val) => {
  if (val === 'download') {
    downloadStore.refreshCompleted();
  }
});
</script>

<style scoped>
.hero-section {
  min-height: 180px;
}
</style>
