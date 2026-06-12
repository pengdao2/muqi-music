/**
 * Muqi Music Web 端打包脚本
 * 将前端构建产物 + API 服务器打包为可部署目录
 *
 * 使用: node scripts/pack-web.mjs
 * 输出: deploy-web/ 目录
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distWebDir = path.resolve(rootDir, 'dist-web');
const deployDir = path.resolve(rootDir, 'deploy-web');

console.log('========================================');
console.log('  Muqi Music - Web 部署包打包');
console.log('========================================\n');

// 1. 检查构建产物
if (!fs.existsSync(path.join(distWebDir, 'index.html'))) {
  console.error('错误: 未找到构建产物，请先运行 npm run build:web');
  process.exit(1);
}

// 2. 清理旧的部署目录
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true });
}
fs.mkdirSync(deployDir, { recursive: true });
fs.mkdirSync(path.join(deployDir, 'public'), { recursive: true });

// 3. 复制前端静态文件到 public/
console.log('[1/5] 复制前端静态文件...');
copyDir(distWebDir, path.join(deployDir, 'public'));

// 4. 创建服务端入口文件
console.log('[2/5] 创建服务端入口...');
const serverCode = `/**
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
`;

fs.writeFileSync(path.join(deployDir, 'server.mjs'), serverCode, 'utf-8');

// 5. 创建 package.json
console.log('[3/5] 创建部署 package.json...');
const deployPkg = {
  name: 'muqi-music-web',
  version: '1.0.0',
  description: 'Muqi Music Player - Web Edition',
  type: 'module',
  scripts: {
    start: 'node server.mjs',
    'start:api': 'node server.mjs --api-only',
    'start:web': 'node server.mjs --web-only'
  },
  dependencies: {
    'netease-cloud-music-api-alger': '^4.30.0'
  }
};

fs.writeFileSync(
  path.join(deployDir, 'package.json'),
  JSON.stringify(deployPkg, null, 2),
  'utf-8'
);

// 6. 创建 README
console.log('[4/5] 创建部署说明...');
const readme = `# Muqi Music Web Edition

## 部署步骤

### 1. 安装依赖
\`\`\`bash
cd deploy-web
npm install
\`\`\`

### 2. 启动服务
\`\`\`bash
npm start
\`\`\`

访问 http://localhost:3000

### 自定义端口
\`\`\`bash
API_PORT=30488 WEB_PORT=3000 npm start
\`\`\`

### 使用 PM2 后台运行
\`\`\`bash
npm install -g pm2
pm2 start server.mjs --name muqi-music
pm2 save
pm2 startup
\`\`\`

### 使用 Docker
\`\`\`dockerfile
FROM node:20-alpine
WORKDIR /app
COPY deploy-web/ /app/
RUN npm install
EXPOSE 3000 30488
CMD ["node", "server.mjs"]
\`\`\`
`;

fs.writeFileSync(path.join(deployDir, 'README.md'), readme, 'utf-8');

// 7. 创建 Dockerfile
console.log('[5/5] 创建 Dockerfile...');
const dockerfile = `FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY public/ ./public/
COPY server.mjs ./

EXPOSE 3000 30488

CMD ["node", "server.mjs"]
`;

fs.writeFileSync(path.join(deployDir, 'Dockerfile'), dockerfile, 'utf-8');

// 完成
console.log('\n========================================');
console.log('  打包完成!');
console.log('========================================');
console.log('');
console.log('部署目录: ' + deployDir);
console.log('');

// 显示文件结构
function listFiles(dir, prefix = '') {
  const items = fs.readdirSync(dir);
  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    console.log(prefix + (isLast ? '└── ' : '├── ') + item + (stat.isDirectory() ? '/' : ''));
    if (stat.isDirectory()) {
      listFiles(itemPath, prefix + (isLast ? '    ' : '│   '));
    }
  });
}
listFiles(deployDir);

console.log('');
console.log('启动命令:');
console.log('  cd deploy-web');
console.log('  npm install');
console.log('  npm start');
console.log('');

/**
 * 递归复制目录
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
