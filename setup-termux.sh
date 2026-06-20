#!/data/data/com.termux/files/usr/bin/bash
# ============================================
#  MuqiMusic - Termux API Server Setup
#  在手机上运行此脚本安装 API 服务器
# ============================================
set -e

echo "======================================"
echo "  MuqiMusic API Server Installer"
echo "======================================"
echo ""

# 1. 更新包管理器
echo "[1/3] 更新包管理器..."
pkg update -y && pkg upgrade -y

# 2. 安装 Node.js
echo "[2/3] 安装 Node.js..."
pkg install nodejs -y
echo "Node.js $(node -v) installed"

# 3. 安装 API 服务器包
echo "[3/3] 安装 netease-cloud-music-api-alger..."
cd ~
rm -rf muqi-api 2>/dev/null
mkdir -p muqi-api
cd muqi-api
npm init -y
npm install netease-cloud-music-api-alger

# 4. 创建启动脚本
cat > start.sh << 'STARTEOF'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/muqi-api
node -e "
const { serveNcmApi } = require('netease-cloud-music-api-alger/server');
serveNcmApi({
  port: 30488,
  host: '0.0.0.0',
  checkVersion: false
}).then(() => {
  console.log('[MuqiAPI] Server ready on http://0.0.0.0:30488');
  console.log('[MuqiAPI] Keep this window open while using the app');
});
"
STARTEOF
chmod +x start.sh

echo ""
echo "======================================"
echo "  Installation Complete!"
echo "======================================"
echo ""
echo "To start the API server:"
echo "  cd ~/muqi-api && ./start.sh"
echo ""
echo "Then open MuqiMusic app - it will auto-detect the server."
echo "Keep Termux running in background while using the app."
echo ""
