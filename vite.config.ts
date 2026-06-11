import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import { createRequire } from 'module';
import net from 'net';
import os from 'os';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';

const API_PORT = 30488;
const _require = createRequire(import.meta.url);

// 自动启动网易云 API 服务器（仅开发模式）
function autoStartMusicApi() {
  return {
    name: 'auto-start-music-api',
    async configureServer() {
      // 必须在 require 之前创建 anonymous_token 文件
      const tokenPath = resolve(os.tmpdir(), 'anonymous_token');
      if (!fs.existsSync(tokenPath)) {
        fs.writeFileSync(tokenPath, '', 'utf-8');
      }

      // 检查端口是否已被占用（复用已有进程）
      await new Promise<void>((resolvePort, rejectPort) => {
        const tester = net.createServer();
        tester.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            console.log('[dev:web] 网易云 API 服务器已在运行: http://0.0.0.0:' + API_PORT);
            resolvePort();
          } else {
            rejectPort(err);
          }
        });
        tester.once('listening', () => {
          // 端口空闲，启动 API 服务器
          tester.close();
          try {
            const { serveNcmApi } = _require('netease-cloud-music-api-alger/server');
            serveNcmApi({ port: API_PORT, host: '0.0.0.0' });
            console.log('[dev:web] 网易云 API 服务器已启动: http://0.0.0.0:' + API_PORT);
          } catch (e) {
            console.error('[dev:web] 启动 API 服务器失败:', e);
          }
          resolvePort();
        });
        tester.listen(API_PORT, '0.0.0.0');
      });
    }
  };
}

export default defineConfig({
  base: './',
  // 项目src
  root: resolve('src/renderer'),
  // .env 文件在项目根目录，不在 root 目录下
  envDir: resolve('.'),
  resolve: {
    alias: {
      '@': resolve('src/renderer'),
      '@renderer': resolve('src/renderer'),
      '@i18n': resolve('src/i18n')
    }
  },
  plugins: [
    vue(),
    viteCompression(),
    VueDevTools(),
    autoStartMusicApi(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
        }
      ]
    }),
    Components({
      resolvers: [NaiveUiResolver()]
    })
  ],
  publicDir: resolve('resources'),
  server: {
    host: '0.0.0.0',
    proxy: {}
  }
});
