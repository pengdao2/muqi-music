/**
 * Web 端构建脚本 - 使用 Vite build API
 */
import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const configFile = path.resolve(root, 'vite.web.config.ts');

console.log('[build-web] 项目目录:', root);
console.log('[build-web] 配置文件:', configFile);

try {
  await build({
    configFile,
    mode: 'production'
  });
  console.log('[build-web] ✅ 构建成功!');
  console.log('[build-web]   输出目录:', path.resolve(root, 'dist-web'));
} catch (err) {
  console.error('[build-web] ❌ 构建失败:', err.message);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
}
