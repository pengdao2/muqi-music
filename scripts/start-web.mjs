/**
 * Muqi Music Web 生产模式启动脚本
 * 一条命令启动 API 服务器 + 前端静态文件服务
 *
 * 使用: node scripts/start-web.mjs [port]
 *   默认: API=30488, 前端=3000
 *   示例: node scripts/start-web.mjs --port 3000
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

// ====== 1. 确保 anonymous_token 文件存在 ======
const tokenPath = path.resolve(os.tmpdir(), 'anonymous_token');
if (!fs.existsSync(tokenPath)) {
  fs.writeFileSync(tokenPath, '', 'utf-8');
}

// ====== 2. 检查端口是否可用 ======
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

// ====== 3. 启动 API 服务器 ======
async function startApiServer() {
  const available = await checkPort(API_PORT);
  if (!available) {
    console.log(`[API] 端口 ${API_PORT} 已被占用，复用已有服务`);
    return;
  }

  try {
    const { serveNcmApi } = _require('netease-cloud-music-api-alger/server');
    await serveNcmApi({ port: API_PORT, host: '0.0.0.0' });
    console.log(`[API] 音乐 API 服务器已启动: http://0.0.0.0:${API_PORT}`);
  } catch (e) {
    console.error('[API] 启动失败:', e.message);
  }
}

// ====== 4. 启动前端静态文件服务 ======
function startWebServer() {
  const outDir = path.resolve(__dirname, '..', 'out', 'renderer');

  if (!fs.existsSync(path.join(outDir, 'index.html'))) {
    console.error('[WEB] 错误: 未找到构建产物，请先运行 npm run build');
    console.error(`[WEB] 期望路径: ${outDir}`);
    process.exit(1);
  }

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
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

    const filePath = path.join(outDir, urlPath);

    // 安全检查：防止目录遍历
    if (!filePath.startsWith(outDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // SPA fallback：非文件请求返回 index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const indexHtml = path.join(outDir, 'index.html');
      const ext = '.html';
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(indexHtml).pipe(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // 如果有 .gz 版本且客户端支持 gzip
    if (acceptEncoding.includes('gzip') && fs.existsSync(filePath + '.gz')) {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip'
      });
      fs.createReadStream(filePath + '.gz').pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  server.listen(WEB_PORT, '0.0.0.0', () => {
    console.log(`[WEB] 前端服务已启动: http://0.0.0.0:${WEB_PORT}`);
  });
}

// ====== 5. 启动 ======
console.log('========================================');
console.log('  Muqi Music - Web 生产模式');
console.log('========================================\n');

await startApiServer();
startWebServer();

console.log('\n📱 局域网访问地址:');
const interfaces = os.networkInterfaces();
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name] || []) {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`   http://${iface.address}:${WEB_PORT}`);
    }
  }
}
console.log(`\n🌐 本机访问: http://localhost:${WEB_PORT}`);
console.log('\n按 Ctrl+C 停止服务\n');
