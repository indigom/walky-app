# Walky API — Railway 연동 (GitHub repo: indigom/walky-app, Root Directory: server)
# 사전: https://railway.app 가입 · GitHub 연동
#
# 방법 A — 대시보드 (권장, GitHub 자동 배포)
#   1. New Project → Deploy from GitHub repo → walky-app
#   2. Settings → Root Directory = server
#   3. Networking → Generate Domain
#   4. /health 확인 후 .env URL 갱신
#
# 방법 B — CLI (이 스크립트)
#   cd c:\work\walky-app\server
#   .\deploy\railway-setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Railway CLI 로그인 (브라우저가 열립니다)..." -ForegroundColor Cyan
npx --yes @railway/cli@4.59.0 login

Write-Host "`n프로젝트 생성/연결..." -ForegroundColor Cyan
npx @railway/cli init --name walky-api

Write-Host "`n배포 중..." -ForegroundColor Cyan
npx @railway/cli up --detach

Write-Host "`n공개 도메인 생성..." -ForegroundColor Cyan
npx @railway/cli domain

Write-Host "`n헬스체크 (도메인을 위 출력에서 확인 후):" -ForegroundColor Yellow
Write-Host "  curl https://<your-domain>.up.railway.app/health"
