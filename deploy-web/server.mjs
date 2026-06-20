/**
 * Muqi Music Web Server
 * 同时提供 API 服务和前端静态文件服务
 *
 * 使用: node server.mjs [options]
 *   默认: API=30488, 前端=3000
 *   环境变量: API_PORT, WEB_PORT
 */

import { createRequire } from 'module';
import { createServer } from 'net';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);

const API_PORT = parseInt(process.env.API_PORT || '30488', 10);
const WEB_PORT = parseInt(process.env.WEB_PORT || '3000', 10);

// ====== 确保 anonymous_token 文件存在 ======
const tokenPath = path.resolve(os.tmpdir(), 'anonymous_token');
if (!fs.existsSync(tokenPath)) {
  fs.writeFileSync(tokenPath, '', 'utf-8');
}

// ====== 检查端口 ======
function checkPort(port) {
  return new Promise((resolve) => {
    const tester = createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '0.0.0.0');
  });
}

// ====== 启动 API 服务器 ======
async function startApiServer() {
  const available = await checkPort(API_PORT);
  if (!available) {
    console.log('[API] 端口 ' + API_PORT + ' 已被占用，复用已有服务');
    return;
  }

  try {
    const { serveNcmApi } = _require('netease-cloud-music-api-alger/server');
    await serveNcmApi({ port: API_PORT, host: '0.0.0.0' });
    console.log('[API] 音乐 API 服务器已启动: http://0.0.0.0:' + API_PORT);
  } catch (e) {
    console.error('[API] 启动失败:', e.message);
    console.error('[API] 请确保已安装 netease-cloud-music-api-alger 依赖');
  }
}

// ====== 启动前端静态文件服务 ======
function startWebServer() {
  const publicDir = path.resolve(__dirname, 'public');

  if (!fs.existsSync(path.join(publicDir, 'index.html'))) {
    console.error('[WEB] 错误: 未找到 index.html，请检查 public 目录');
    process.exit(1);
  }

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.gz': 'application/gzip',
    '.map': 'application/json'
  };

  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(publicDir, urlPath);

    // 安全检查
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // SPA fallback
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(publicDir, 'index.html');
      const ext = '.html';
      const ct = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const ct = mimeTypes[ext] || 'application/octet-stream';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // 优先返回 gzip 版本
    if (acceptEncoding.includes('gzip') && fs.existsSync(filePath + '.gz')) {
      res.writeHead(200, { 'Content-Type': ct, 'Content-Encoding': 'gzip' });
      fs.createReadStream(filePath + '.gz').pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': ct });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  server.listen(WEB_PORT, '0.0.0.0', () => {
    console.log('[WEB] 前端服务已启动: http://0.0.0.0:' + WEB_PORT);
  });
}

// ====== 启动 ======
console.log('========================================');
console.log('  Muqi Music Web Server');
console.log('========================================');
console.log('');

await startApiServer();
startWebServer();

console.log('');
const interfaces = os.networkInterfaces();
console.log('局域网访问地址:');
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name] || []) {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log('  http://' + iface.address + ':' + WEB_PORT);
    }
  }
}
console.log('');
console.log('本机访问: http://localhost:' + WEB_PORT);
console.log('API 端口: ' + API_PORT);
console.log('');
console.log('按 Ctrl+C 停止服务');
