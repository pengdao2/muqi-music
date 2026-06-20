import { useMessage } from 'naive-ui';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getMusicLrc } from '@/api/music';
import { useDownloadStore } from '@/store/modules/download';
import { getSongUrl } from '@/store/modules/player';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';

import type { DownloadSongInfo } from '../../shared/download';

const ipcRenderer = isElectron ? window.electron.ipcRenderer : null;

/**
 * 检测是否运行在 Android WebView 中
 */
const isAndroidWebView = (): boolean => {
  return !!(window as any).AndroidBridge?.isNativeApp?.();
};

/**
 * Map a SongResult to the minimal DownloadSongInfo shape required by the download store.
 */
function toDownloadSongInfo(song: SongResult): DownloadSongInfo {
  return {
    id: song.id as number,
    name: song.name,
    picUrl: song.picUrl ?? song.al?.picUrl ?? '',
    ar: (song.ar || song.song?.artists || []).map((a: { name: string }) => ({ name: a.name })),
    al: {
      name: song.al?.name ?? '',
      picUrl: song.al?.picUrl ?? ''
    }
  };
}

/**
 * 构建下载文件名
 */
function buildFileName(song: SongResult, type: string): string {
  const artistNames = (song.ar || [])
    .map((a: { name: string }) => a.name)
    .join(', ');
  const safeArtist = artistNames.replace(/[/\\?%*:|"<>]/g, '_');
  const safeName = song.name.replace(/[/\\?%*:|"<>]/g, '_');
  const ext = type || 'mp3';
  return `${safeName} - ${safeArtist}.${ext}`;
}

/**
 * 从 localStorage 保存已完成下载记录（供下载管理页面读取）
 */
function saveCompletedRecord(song: SongResult, fileName: string, filePath: string) {
  try {
    const records = JSON.parse(localStorage.getItem('download_completed') || '[]');
    records.unshift({
      id: song.id,
      displayName: `${song.name} - ${(song.ar || []).map((a: { name: string }) => a.name).join(', ')}`,
      filename: fileName,
      picUrl: song.picUrl ?? song.al?.picUrl ?? '',
      ar: (song.ar || []).map((a: { name: string }) => ({ name: a.name })),
      path: filePath,
      filePath: filePath,
      size: 0,
      timestamp: Date.now()
    });
    // 最多保留 1000 条
    if (records.length > 1000) {
      records.length = 1000;
    }
    localStorage.setItem('download_completed', JSON.stringify(records));
  } catch (e) {
    console.error('保存下载记录失败:', e);
  }
}

export const useDownload = () => {
  const { t } = useI18n();
  const message = useMessage();
  const downloadStore = useDownloadStore();
  const isDownloading = ref(false);

  /**
   * Download a single song.
   * Electron: delegates to download store (IPC).
   * Android WebView: uses AndroidBridge.downloadFile for custom filename.
   * Web: uses fetch+blob for proper filename.
   */
  const downloadMusic = async (song: SongResult) => {
    if (isDownloading.value) {
      message.warning(t('songItem.message.downloading'));
      return;
    }

    try {
      isDownloading.value = true;

      const musicUrl = (await getSongUrl(song.id as number, song, true)) as any;
      if (!musicUrl) {
        throw new Error(t('songItem.message.getUrlFailed'));
      }

      const url = typeof musicUrl === 'string' ? musicUrl : musicUrl.url;
      const type = typeof musicUrl === 'string' ? '' : (musicUrl.type ?? '');
      const fileName = buildFileName(song, type);

      if (isElectron) {
        const songInfo = toDownloadSongInfo(song);
        await downloadStore.addDownload(songInfo, url, type);
        message.success(t('songItem.message.downloadQueued'));
      } else if (isAndroidWebView()) {
        // Android: use native DownloadManager with custom filename
        const songInfoJson = JSON.stringify({
          id: song.id,
          name: song.name,
          artist: (song.ar || []).map((a: { name: string }) => a.name).join(', ')
        });
        const picUrl = song.picUrl ?? song.al?.picUrl ?? '';
        (window as any).AndroidBridge.downloadFile(url, fileName, picUrl, songInfoJson);

        const downloadPath = (window as any).AndroidBridge.getDownloadPath?.() || '/sdcard/Download/MuqiMusic';
        saveCompletedRecord(song, fileName, `${downloadPath}/${fileName}`);
        message.success(t('songItem.message.downloading'));
      } else {
        // Web: fetch as blob for proper filename (cross-origin <a download> is ignored)
        message.info('正在准备下载...');
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
          saveCompletedRecord(song, fileName, fileName);
          message.success(t('songItem.message.downloading'));
        } catch (fetchErr) {
          // 降级：直接使用 <a> 标签
          console.warn('Blob 下载失败，降级为直接下载:', fetchErr);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          saveCompletedRecord(song, fileName, fileName);
          message.success(t('songItem.message.downloading'));
        }
      }
    } catch (error: any) {
      console.error('Download error:', error);
      message.error(error.message || t('songItem.message.downloadFailed'));
    } finally {
      isDownloading.value = false;
    }
  };

  /**
   * Batch download multiple songs.
   * Electron: pre-resolves URLs in batches of 5, then delegates to download store.
   * Non-Electron: downloads one by one with delays.
   */
  const batchDownloadMusic = async (songs: SongResult[]) => {
    if (isDownloading.value) {
      message.warning(t('favorite.downloading'));
      return;
    }

    if (songs.length === 0) {
      message.warning(t('favorite.selectSongsFirst'));
      return;
    }

    try {
      isDownloading.value = true;

      if (isElectron) {
        // Electron: upload to download store
        message.success(t('favorite.downloading'));

        const BATCH_SIZE = 5;
        const resolvedItems: Array<{ songInfo: DownloadSongInfo; url: string; type: string }> = [];

        for (let i = 0; i < songs.length; i += BATCH_SIZE) {
          const chunk = songs.slice(i, i + BATCH_SIZE);
          const chunkResults = await Promise.all(
            chunk.map(async (song) => {
              try {
                const data = (await getSongUrl(song.id as number, song, true)) as any;
                const url = typeof data === 'string' ? data : (data?.url ?? '');
                const type = typeof data === 'string' ? '' : (data?.type ?? '');
                if (!url) return null;
                return { songInfo: toDownloadSongInfo(song), url, type };
              } catch (error) {
                console.error(`获取歌曲 ${song.name} 下载链接失败:`, error);
                return null;
              }
            })
          );
          for (const item of chunkResults) {
            if (item) resolvedItems.push(item);
          }
        }

        if (resolvedItems.length > 0) {
          await downloadStore.batchDownload(resolvedItems);
        }
      } else {
        // Non-Electron (Android/Web): download one by one with delays
        message.info(`开始批量下载 ${songs.length} 首歌曲...`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < songs.length; i++) {
          const song = songs[i];
          try {
            const musicUrl = (await getSongUrl(song.id as number, song, true)) as any;
            if (!musicUrl) {
              failCount++;
              continue;
            }
            const url = typeof musicUrl === 'string' ? musicUrl : musicUrl.url;
            const type = typeof musicUrl === 'string' ? '' : (musicUrl.type ?? '');
            const fileName = buildFileName(song, type);

            if (isAndroidWebView()) {
              const songInfoJson = JSON.stringify({
                id: song.id,
                name: song.name,
                artist: (song.ar || []).map((a: { name: string }) => a.name).join(', ')
              });
              const picUrl = song.picUrl ?? song.al?.picUrl ?? '';
              (window as any).AndroidBridge.downloadFile(url, fileName, picUrl, songInfoJson);

              const downloadPath = (window as any).AndroidBridge.getDownloadPath?.() || '/sdcard/Download/MuqiMusic';
              saveCompletedRecord(song, fileName, `${downloadPath}/${fileName}`);
            } else {
              try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
              } catch {
                // 降级：直接链接下载
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
              saveCompletedRecord(song, fileName, fileName);
            }
            successCount++;
          } catch (error) {
            console.error(`下载 ${song.name} 失败:`, error);
            failCount++;
          }

          // 间隔 300ms 避免请求过快
          if (i < songs.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        message.success(`批量下载完成：成功 ${successCount} 首${failCount > 0 ? `，失败 ${failCount} 首` : ''}`);
      }
    } catch (error) {
      console.error('下载失败:', error);
      message.destroyAll();
      message.error(t('favorite.downloadFailed'));
    } finally {
      isDownloading.value = false;
    }
  };

  /**
   * Download the lyric (.lrc) for a single song.
   */
  const downloadLyric = async (song: SongResult) => {
    try {
      const res = await getMusicLrc(song.id as number);
      const lyricData = res?.data;

      if (!lyricData?.lrc?.lyric) {
        message.warning(t('songItem.message.noLyric'));
        return;
      }

      let lrcContent = lyricData.lrc.lyric;
      if (lyricData.tlyric?.lyric) {
        lrcContent = mergeLrcWithTranslation(lyricData.lrc.lyric, lyricData.tlyric.lyric);
      }

      const artistNames = (song.ar || song.song?.artists)
        ?.map((a: { name: string }) => a.name)
        .join(',');
      const filename = `${song.name} - ${artistNames}`;

      const result = await ipcRenderer?.invoke('save-lyric-file', { filename, lrcContent });

      if (result?.success) {
        message.success(t('songItem.message.lyricDownloaded'));
      } else {
        message.error(t('songItem.message.lyricDownloadFailed'));
      }
    } catch (error) {
      console.error('Download lyric error:', error);
      message.error(t('songItem.message.lyricDownloadFailed'));
    }
  };

  return {
    isDownloading,
    downloadMusic,
    downloadLyric,
    batchDownloadMusic
  };
};

function mergeLrcWithTranslation(originalText: string, translationText: string): string {
  const originalMap = parseLrcText(originalText);
  const translationMap = parseLrcText(translationText);

  const mergedLines: string[] = [];

  for (const [timeTag, content] of originalMap.entries()) {
    mergedLines.push(`${timeTag}${content}`);
    const translated = translationMap.get(timeTag);
    if (translated) {
      mergedLines.push(`${timeTag}${translated}`);
    }
  }

  mergedLines.sort((a, b) => {
    const ta = a.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    const tb = b.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    return ta.localeCompare(tb);
  });

  return mergedLines.join('\n');
}

function parseLrcText(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split('\n')) {
    const tags = line.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g);
    if (!tags) continue;
    const content = line.replace(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g, '').trim();
    if (!content) continue;
    for (const tag of tags) {
      map.set(tag, content);
    }
  }
  return map;
}
