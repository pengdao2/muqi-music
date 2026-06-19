/**
 * Muqi Music Web Server (CommonJS)
 *
 * 同时提供网易云音乐 API 服务和前端静态文件服务
 *
 * 使用:
 *   npm install
 *   node server.js
 *
 * 环境变量:
 *   API_PORT  - API 服务端口 (默认 30488)
 *   WEB_PORT  - 前端服务端口 (默认 3000)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');

// ====== 配置 ======
const API_PORT = parseInt(process.env.API_PORT || '30488', 10);
const WEB_PORT = parseInt(process.env.WEB_PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');

// ====== 确保 anonymous_token 文件存在 ======
const tokenPath = path.join(os.tmpdir(), 'anonymous_token');
if (!fs.existsSync(tokenPath)) {
  fs.writeFileSync(tokenPath, '', 'utf-8');
}

// ====== MIME 类型映射 ======
const MIME_TYPES = {
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
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.gz': 'application/gzip',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.xml': 'application/xml; charset=utf-8',
};

// ====== 端口检查 ======
function checkPort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '0.0.0.0');
  });
}

// ====== 前端静态文件服务 ======
function startWebServer() {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');

  if (!fs.existsSync(indexPath)) {
    console.error('[WEB] 错误: 未找到 public/index.html，请检查部署包是否完整');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0].split('#')[0];

    // 安全：规范化路径，防止目录穿越攻击
    urlPath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

    const filePath = path.join(PUBLIC_DIR, urlPath);

    // 安全检查：确保请求路径在 public 目录内
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    // 处理文件不存在或目录请求 → SPA fallback
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      // 文件不存在，回退到 index.html (SPA)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    if (stat.isDirectory()) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    // 正常文件请求
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // 优先返回 gzip 压缩版本
    if (acceptEncoding.includes('gzip') && fs.existsSync(filePath + '.gz')) {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip',
        'Cache-Control': 'public, max-age=86400',
      });
      fs.createReadStream(filePath + '.gz').pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  server.listen(WEB_PORT, '0.0.0.0', () => {
    console.log('[WEB] 前端服务已启动: http://0.0.0.0:' + WEB_PORT);
  });

  return server;
}

// ====== 启动 API 服务器 ======
async function startApiServer() {
  const available = await checkPort(API_PORT);
  if (!available) {
    console.log('[API] 端口 ' + API_PORT + ' 已被占用，复用已有服务');
    return;
  }

  try {
    // 使用 netease-cloud-music-api-alger 的 serveNcmApi
    const ncmModule = require('netease-cloud-music-api-alger/server');
    if (typeof ncmModule.serveNcmApi === 'function') {
      await ncmModule.serveNcmApi({ port: API_PORT, host: '0.0.0.0' });
      console.log('[API] 音乐 API 服务器已启动: http://0.0.0.0:' + API_PORT);
    } else {
      console.error('[API] serveNcmApi 方法不可用，请检查 netease-cloud-music-api-alger 版本');
    }
  } catch (e) {
    console.error('[API] 启动失败:', e.message);
    console.error('[API] 请确保已安装 netease-cloud-music-api-alger 依赖 (npm install)');
  }
}

// ====== 主入口 ======
(async () => {
  console.log('');
  console.log('========================================');
  console.log('  Muqi Music Web Server');
  console.log('========================================');
  console.log('');

  // 先启动 API，再启动前端
  await startApiServer();

  startWebServer();

  console.log('');
  console.log('访问地址:');

  // 显示局域网地址
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log('  http://' + iface.address + ':' + WEB_PORT);
      }
    }
  }

  console.log('  http://localhost:' + WEB_PORT);
  console.log('');
  console.log('API 端口: ' + API_PORT);
  console.log('');
  console.log('按 Ctrl+C 停止服务');
  console.log('');
})();
