#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "需要 Node.js 20+：https://nodejs.org/"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "需要 Python 3 用于静态服务器。"
  exit 1
fi

mkdir -p .local
if [ ! -f .local/netease-api/package.json ]; then
  echo "正在获取 NeteaseCloudMusicApiEnhanced..."
  git clone --depth 1 https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git .local/netease-api
fi

if [ ! -d .local/netease-api/node_modules ]; then
  echo "首次运行：安装网易云 API 依赖..."
  (cd .local/netease-api && npm install --no-audit --no-fund)
fi

echo "启动网易云 API :3000..."
(cd .local/netease-api && PORT=3000 npm start > ../../api.log 2>&1 &)
sleep 5

echo "启动播放器 :8080..."
python3 -m http.server 8080 >/dev/null 2>&1 &
sleep 1

URL="http://localhost:8080/"
if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
else
  echo "请打开 $URL"
fi

echo "QQ 音乐 API 需要另行部署到 http://localhost:3200。"
