import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { isElectron } from '@/utils';

import {
  createDefaultDownloadSettings,
  DOWNLOAD_TASK_STATE,
  type DownloadSettings,
  type DownloadTask
} from '../../../shared/download';

const DEFAULT_COVER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="#888"><rect width="200" height="200" rx="16" fill="#2a2a2a"/><text x="100" y="110" text-anchor="middle" font-size="72" fill="#555">♪</text></svg>'
  );

function validatePicUrl(url?: string): string {
  if (!url || url === '' || url.startsWith('/')) return DEFAULT_COVER;
  return url.replace(/^http:\/\//, 'https://');
}

export const useDownloadStore = defineStore(
  'download',
  () => {
    // ── State ──────────────────────────────────────────────────────────────
    const tasks = ref(new Map<string, DownloadTask>());
    const completedList = ref<any[]>([]);
    const settings = ref<DownloadSettings>(createDefaultDownloadSettings());
    const isLoadingCompleted = ref(false);

    // Track whether IPC listeners have been registered
    let listenersInitialised = false;

    // ── Computed ───────────────────────────────────────────────────────────
    const downloadingList = computed(() => {
      const active = [
        DOWNLOAD_TASK_STATE.queued,
        DOWNLOAD_TASK_STATE.downloading,
        DOWNLOAD_TASK_STATE.paused
      ] as string[];
      return [...tasks.value.values()]
        .filter((t) => active.includes(t.state))
        .sort((a, b) => a.createdAt - b.createdAt);
    });

    const downloadingCount = computed(() => downloadingList.value.length);

    const totalProgress = computed(() => {
      const list = downloadingList.value;
      if (list.length === 0) return 0;
      const sum = list.reduce((acc, t) => acc + t.progress, 0);
      return sum / list.length;
    });

    // ── Actions ────────────────────────────────────────────────────────────
    const addDownload = async (songInfo: DownloadTask['songInfo'], url: string, type: string) => {
      if (!isElectron) return;
      const validatedInfo = {
        ...songInfo,
        picUrl: validatePicUrl(songInfo.picUrl)
      };
      const artistNames = validatedInfo.ar?.map((a) => a.name).join(',') ?? '';
      const filename = `${validatedInfo.name} - ${artistNames}`;
      await window.api.downloadAdd({ url, filename, songInfo: validatedInfo, type });
    };

    const batchDownload = async (
      items: Array<{ songInfo: DownloadTask['songInfo']; url: string; type: string }>
    ) => {
      if (!isElectron) return;
      const validatedItems = items.map((item) => {
        const validatedInfo = {
          ...item.songInfo,
          picUrl: validatePicUrl(item.songInfo.picUrl)
        };
        const artistNames = validatedInfo.ar?.map((a) => a.name).join(',') ?? '';
        const filename = `${validatedInfo.name} - ${artistNames}`;
        return { url: item.url, filename, songInfo: validatedInfo, type: item.type };
      });
      await window.api.downloadAddBatch({ items: validatedItems });
    };

    const pauseTask = async (taskId: string) => {
      if (!isElectron) return;
      await window.api.downloadPause(taskId);
    };

    const resumeTask = async (taskId: string) => {
      if (!isElectron) return;
      await window.api.downloadResume(taskId);
    };

    const cancelTask = async (taskId: string) => {
      if (!isElectron) return;
      await window.api.downloadCancel(taskId);
      tasks.value.delete(taskId);
    };

    const cancelAll = async () => {
      if (!isElectron) return;
      await window.api.downloadCancelAll();
      tasks.value.clear();
    };

    const updateConcurrency = async (n: number) => {
      if (!isElectron) return;
      const clamped = Math.min(5, Math.max(1, n));
      settings.value = { ...settings.value, maxConcurrent: clamped };
      await window.api.downloadSetConcurrency(clamped);
    };

    const refreshCompleted = async () => {
      isLoadingCompleted.value = true;
      try {
        if (isElectron) {
          const list = await window.api.downloadGetCompleted();
          completedList.value = list;
        } else {
          // Web/Android: 扫描和原生记录作为基准真相，localStorage 作为元数据补充
          const merged: any[] = [];
          const mergedPaths = new Set<string>();

          // 第1步：原生下载记录（通过系统 DownloadManager 下载的）
          if ((window as any).AndroidBridge?.getDownloadRecords) {
            try {
              const nativeRecords = JSON.parse((window as any).AndroidBridge.getDownloadRecords());
              for (const r of nativeRecords) {
                r.displayName = r.fileName;
                r.filename = r.fileName;
                if (r.songInfo && typeof r.songInfo === 'object') {
                  r.ar = [{ name: r.songInfo.artist || '' }];
                }
                r.size = r.size || 0;
                merged.push(r);
                mergedPaths.add(r.filePath);
              }
            } catch { /* 忽略 */ }
          }

          // 第2步：扫描下载目录 — 文件夹实际内容作为基准
          if ((window as any).AndroidBridge?.scanDownloadDir) {
            try {
              const scannedFiles = JSON.parse((window as any).AndroidBridge.scanDownloadDir());
              for (const f of scannedFiles) {
                if (mergedPaths.has(f.filePath)) {
                  // 已有原生记录：用扫描得到的元数据补充（大小、URI、歌手、封面）
                  const existing = merged.find((m) => m.filePath === f.filePath);
                  if (existing) {
                    if (!existing.size && f.size) existing.size = f.size;
                    if (!existing.contentUri && f.contentUri) {
                      existing.contentUri = f.contentUri;
                      existing.playMusicUrl = f.contentUri;
                    }
                    // 用扫描得到的专辑封面补充
                    if (!existing.picUrl && f.picUrl) existing.picUrl = f.picUrl;
                    // 用扫描得到的元数据补充缺失的歌手/专辑信息
                    if (f.songInfo?.artist && (!existing.ar || existing.ar.length === 0 ||
                        (existing.ar.length === 1 && existing.ar[0]?.name === ''))) {
                      existing.ar = [{ name: f.songInfo.artist }];
                    }
                    if (f.songInfo?.name && !existing.songInfo?.name) {
                      if (!existing.songInfo) existing.songInfo = {};
                      existing.songInfo.name = f.songInfo.name;
                    }
                    if (f.songInfo?.album && !existing.songInfo?.album) {
                      if (!existing.songInfo) existing.songInfo = {};
                      existing.songInfo.album = f.songInfo.album;
                    }
                  }
                  continue;
                }
                mergedPaths.add(f.filePath);
                f.displayName = f.fileName;
                f.filename = f.fileName;
                f.ar = f.songInfo?.artist ? [{ name: f.songInfo.artist }] : [{ name: '未知歌手' }];
                if (f.contentUri) {
                  f.playMusicUrl = f.contentUri;
                }
                merged.push(f);
              }
            } catch { /* 扫描失败 */ }
          }

          // 第3步：localStorage 中已有的记录作为元数据补充（仅增强已有文件的 songInfo）
          try {
            const oldRecords = JSON.parse(localStorage.getItem('download_completed') || '[]');
            for (const r of oldRecords) {
              if (mergedPaths.has(r.filePath)) {
                // 已有文件：用旧记录中更丰富的元数据补充
                const existing = merged.find((m) => m.filePath === r.filePath);
                if (existing && r.songInfo?.name && !existing.songInfo?.name) {
                  existing.songInfo = r.songInfo;
                  existing.ar = r.ar;
                }
              }
              // 注意：不再把旧记录中「磁盘已不存在的文件」加回来
            }
          } catch { /* 忽略 */ }

          completedList.value = merged;

          // 保存当前真实列表到 localStorage
          try {
            const toSave = merged.map((item: any) => ({
              filePath: item.filePath,
              fileName: item.fileName || item.filename,
              displayName: item.displayName,
              contentUri: item.contentUri,
              size: item.size,
              timestamp: item.timestamp,
              songInfo: item.songInfo || null,
              ar: item.ar?.map((a: any) => ({ name: a.name })) || undefined
            }));
            localStorage.setItem('download_completed', JSON.stringify(toSave));
          } catch { /* localStorage 可能满了 */ }
        }
      } finally {
        isLoadingCompleted.value = false;
      }
    };

    const deleteCompleted = async (filePath: string) => {
      if (isElectron) {
        await window.api.downloadDeleteCompleted(filePath);
      } else {
        // Web/Android: 从 localStorage 删除
        const records = JSON.parse(localStorage.getItem('download_completed') || '[]');
        const filtered = records.filter((r: any) => r.filePath !== filePath && r.path !== filePath);
        localStorage.setItem('download_completed', JSON.stringify(filtered));
        completedList.value = completedList.value.filter(
          (item) => (item.path || item.filePath) !== filePath
        );
        return;
      }
      completedList.value = completedList.value.filter((item) => item.filePath !== filePath);
    };

    const clearCompleted = async () => {
      if (isElectron) {
        await window.api.downloadClearCompleted();
      } else {
        // Web/Android: 清除 localStorage 记录
        localStorage.setItem('download_completed', '[]');
      }
      completedList.value = [];
    };

    const loadPersistedQueue = async () => {
      if (!isElectron) return;
      const queue = await window.api.downloadGetQueue();
      tasks.value.clear();
      for (const task of queue) {
        tasks.value.set(task.taskId, task);
      }
    };

    const initListeners = () => {
      if (!isElectron || listenersInitialised) return;
      listenersInitialised = true;

      window.api.onDownloadProgress((event) => {
        const task = tasks.value.get(event.taskId);
        if (task) {
          tasks.value.set(event.taskId, {
            ...task,
            progress: event.progress,
            loaded: event.loaded,
            total: event.total
          });
        }
      });

      window.api.onDownloadStateChange((event) => {
        const { taskId, state, task } = event;
        if (state === DOWNLOAD_TASK_STATE.completed || state === DOWNLOAD_TASK_STATE.cancelled) {
          tasks.value.delete(taskId);
          if (state === DOWNLOAD_TASK_STATE.completed) {
            setTimeout(() => {
              refreshCompleted();
            }, 500);
          }
        } else {
          tasks.value.set(taskId, task);
        }
      });

      window.api.onDownloadBatchComplete((_event) => {
        // no-op: main process handles the desktop notification
      });

      window.api.onDownloadRequestUrl(async (event) => {
        try {
          const { getSongUrl } = await import('@/store/modules/player');
          const result = (await getSongUrl(event.songInfo.id, event.songInfo as any, true)) as any;
          const url = typeof result === 'string' ? result : (result?.url ?? '');
          await window.api.downloadProvideUrl(event.taskId, url);
        } catch (err) {
          console.error('[downloadStore] onDownloadRequestUrl failed:', err);
          await window.api.downloadProvideUrl(event.taskId, '');
        }
      });
    };

    const cleanup = () => {
      if (!isElectron) return;
      window.api.removeDownloadListeners();
      listenersInitialised = false;
    };

    return {
      // state
      tasks,
      completedList,
      settings,
      isLoadingCompleted,
      // computed
      downloadingList,
      downloadingCount,
      totalProgress,
      // actions
      addDownload,
      batchDownload,
      pauseTask,
      resumeTask,
      cancelTask,
      cancelAll,
      updateConcurrency,
      refreshCompleted,
      deleteCompleted,
      clearCompleted,
      loadPersistedQueue,
      initListeners,
      cleanup
    };
  },
  {
    persist: {
      key: 'download-settings',
      // WARNING: Do NOT add 'tasks' — Map doesn't serialize with JSON.stringify
      pick: ['settings']
    }
  }
);
