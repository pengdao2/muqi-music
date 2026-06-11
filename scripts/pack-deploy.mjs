/**
 * Muqi Music - Linux Web 部署打包脚本
 * 将运行时所需文件打包为 tar.gz，不包含源代码
 *
 * 使用: node scripts/pack-deploy.mjs
 * 输出: dist/muqi-music-web.tar.gz
 */

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEPLOY_DIR = path.join(ROOT, 'dist', 'muqi-music-web');

// 清理并创建部署目录
if (fs.existsSync(DEPLOY_DIR)) {
  fs.rmSync(DEPLOY_DIR, { recursive: true });
}
fs.mkdirSync(DEPLOY_DIR, { recursive: true });

console.log('📦 打包 Muqi Music Web 部署包...\n');

// ====== 1. 检查构建产物 ======
const outRenderer = path.join(ROOT, 'out', 'renderer');
if (!fs.existsSync(path.join(outRenderer, 'index.html'))) {
  console.error('❌ 未找到构建产物，请先运行: npm run build');
  process.exit(1);
}

// ====== 2. 复制必要文件 ======
console.log('[1/4] 复制前端静态文件...');
copyDir(outRenderer, path.join(DEPLOY_DIR, 'out', 'renderer'));

console.log('[2/4] 复制启动脚本...');
fs.mkdirSync(path.join(DEPLOY_DIR, 'scripts'), { recursive: true });
fs.copyFileSync(
  path.join(ROOT, 'scripts', 'start-web.mjs'),
  path.join(DEPLOY_DIR, 'scripts', 'start-web.mjs')
);

console.log('[3/4] 创建精简 package.json...');
const fullPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

// 只保留运行必需的字段
const deployPkg = {
  name: fullPkg.name,
  version: fullPkg.version,
  description: fullPkg.description,
  scripts: {
    start: 'node scripts/start-web.mjs'
  },
  // 只保留运行时必需的依赖
  dependencies: {
    'netease-cloud-music-api-alger': fullPkg.dependencies['netease-cloud-music-api-alger']
  }
};

fs.writeFileSync(
  path.join(DEPLOY_DIR, 'package.json'),
  JSON.stringify(deployPkg, null, 2)
);

// ====== 3. 创建 .env 文件 ======
console.log('[4/4] 创建配置文件...');
fs.writeFileSync(
  path.join(DEPLOY_DIR, '.env'),
  `# Muqi Music Web 配置
API_PORT=30488
WEB_PORT=3000
`
);

// ====== 4. 创建 README ======
fs.writeFileSync(
  path.join(DEPLOY_DIR, 'README.md'),
  `# Muqi Music - Web 部署包

## 部署步骤

### 1. 上传到服务器
将整个 muqi-music-web 目录上传到 Linux 服务器。

### 2. 安装依赖
\`\`\`bash
cd muqi-music-web
npm install --production
\`\`\`

### 3. 启动服务
\`\`\`bash
npm start
\`\`\`

### 4. 访问
浏览器打开 \`http://服务器IP:3000\`

### 5. 后台运行（推荐）
\`\`\`bash
# 使用 nohup
nohup npm start > app.log 2>&1 &

# 或使用 pm2
pm2 start npm --name muqi-music -- start
pm2 save
\`\`\`

### 自定义端口
\`\`\`bash
API_PORT=8888 WEB_PORT=8080 npm start
\`\`\`

## 端口说明
- 3000: 前端页面
- 30488: 音乐 API（需防火墙放行）
`
);

// ====== 5. 统计 ======
const getSize = (dir) => {
  let size = 0;
  const files = fs.readdirSync(dir, { recursive: true });
  for (const f of files) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isFile()) size += fs.statSync(fp).size;
  }
  return size;
};

const totalSize = getSize(DEPLOY_DIR);
console.log(`\n✅ 部署包已生成: dist/muqi-music-web/`);
console.log(`   大小: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`\n📋 部署命令:`);
console.log(`   1. 上传到服务器`);
console.log(`   2. npm install --production`);
console.log(`   3. npm start`);
console.log(`\n💡 提示: 可以用 tar 打包传输:`);
console.log(`   tar -czf muqi-music-web.tar.gz dist/muqi-music-web/`);

// ====== 辅助函数 ======
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
