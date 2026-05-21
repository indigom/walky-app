#!/bin/bash
# 가비아 서버에 SSH 접속한 뒤 실행 (walky-api 설치)
# 사용: bash gabia-ssh-setup.sh

set -e

INSTALL_DIR="${WALKY_API_DIR:-$HOME/walky-api}"
PORT="${WALKY_API_PORT:-3001}"

echo "Installing to $INSTALL_DIR (port $PORT)"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js가 없습니다. 가비아 패널에서 Node 설치 또는 nvm으로 설치 후 다시 실행하세요."
  exit 1
fi

echo "Node: $(node -v)"

npm install --production

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete walky-api 2>/dev/null || true
  PORT="$PORT" pm2 start index.js --name walky-api
  pm2 save
  echo "Started with pm2. Check: pm2 logs walky-api"
else
  echo "pm2 없음 — 테스트: PORT=$PORT node index.js"
  echo "운영 권장: npm install -g pm2 후 pm2 start index.js --name walky-api"
fi

echo "Health: curl -s http://127.0.0.1:$PORT/health"
