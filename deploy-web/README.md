# Muqi Music Web Edition

## 部署步骤

### 1. 安装依赖
```bash
cd deploy-web
npm install
```

### 2. 启动服务
```bash
npm start
```

访问 http://localhost:3000

### 自定义端口
```bash
API_PORT=30488 WEB_PORT=3000 npm start
```

### 使用 PM2 后台运行
```bash
npm install -g pm2
pm2 start server.mjs --name muqi-music
pm2 save
pm2 startup
```

### 使用 Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY deploy-web/ /app/
RUN npm install
EXPOSE 3000 30488
CMD ["node", "server.mjs"]
```
