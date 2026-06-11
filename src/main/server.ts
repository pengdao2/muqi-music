import { ipcMain } from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { type Platform, unblockMusic } from './unblockMusic';

// 必须在 import netease-cloud-music-api-alger 之前创建 anonymous_token 文件
// 否则模块加载时 readFileSync 会因文件不存在而崩溃
if (!fs.existsSync(path.resolve(os.tmpdir(), 'anonymous_token'))) {
  fs.writeFileSync(path.resolve(os.tmpdir(), 'anonymous_token'), '', 'utf-8');
}

let store: Store;
let unblockMusicInitialized = false;

/**
 * 初始化音乐解析 IPC handler
 * 使用 guard 防止因模块被重复加载导致的重复注册
 */
function initializeUnblockMusic(): void {
  if (unblockMusicInitialized) return;
  unblockMusicInitialized = true;

  store = new Store();

  ipcMain.handle('unblock-music', async (_event, id, songData, enabledSources) => {
    try {
      // 本地音乐（local:// 协议）不需要在线解析，直接返回空
      if (songData?.playMusicUrl?.startsWith('local://')) {
        return { error: '本地音乐无需在线解析' };
      }
      const result = await unblockMusic(id, songData, 1, enabledSources as Platform[]);
      return result;
    } catch (error) {
      console.debug('音乐解析失败:', error);
      return { error: (error as Error).message || '未知错误' };
    }
  });
}

/**
 * 检查端口是否可用
 */
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net
      .createServer()
      .once('error', () => {
        resolve(false);
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port);
  });
}

async function startMusicApi(): Promise<void> {
  console.log('MUSIC API STARTING...');

  const settings = store.get('set') as any;
  let port = settings?.musicApiPort || 30488;
  const maxRetries = 10;

  // 检查端口是否可用，如果不可用则尝试下一个端口
  for (let i = 0; i < maxRetries; i++) {
    const isAvailable = await checkPortAvailable(port);
    if (isAvailable) {
      break;
    }
    console.log(`端口 ${port} 被占用，尝试切换到端口 ${port + 1}`);
    port++;
  }

  // 如果端口发生变化，保存新端口到配置
  const originalPort = settings?.musicApiPort || 30488;
  if (port !== originalPort) {
    console.log(`端口从 ${originalPort} 切换到 ${port}`);
    store.set('set', { ...settings, musicApiPort: port });
  }

  try {
    const server = require('netease-cloud-music-api-alger/server');
    await server.serveNcmApi({
      port,
      // 监听所有网络接口，允许局域网其他设备访问
      host: '0.0.0.0'
    });
    console.log(`MUSIC API STARTED on port ${port}`);
  } catch (error) {
    console.error(`MUSIC API 启动失败:`, error);
    throw error;
  }
}

export { initializeUnblockMusic, startMusicApi };
