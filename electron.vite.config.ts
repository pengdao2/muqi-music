import vue from '@vitejs/plugin-vue';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          'electron-store',
          'form-data',
          'axios',
          'express',
          'cors',
          'node-fetch',
          'music-metadata',
          'node-id3',
          'file-type',
          'flac-tagger',
          'node-machine-id',
          '@unblockneteasemusic/server',
          'electron-updater',
          'electron-window-state',
          'crypto-js'
        ]
      })
    ]
  },
  preload: {},
  renderer: {
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
      port: 2389
    }
  }
});
