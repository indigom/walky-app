# 가비아(walky.co.kr) — API만 서버에 올리기

## 보안 (필수)

- 관리 비밀번호는 **채팅·Git에 넣지 마세요.**
- 이미 노출됐다면 **My가비아에서 즉시 비밀번호 변경**하세요.

## manifest.json 깨짐 (견종 선택 다운로드 실패)

`https://walky.co.kr/dogs/corgi/manifest.json` 에  
`<<<<<<<` / `=======` / `>>>>>>>` 가 보이면 Git 병합 충돌이 그대로 올라간 것입니다.

FTP로 `server/deploy/manifests/corgi.manifest.json` 내용을  
`dogs/corgi/manifest.json` 에 덮어쓰고, manifest에 적힌 **mp4 파일도** 같은 폴더에 있어야 합니다.

## 서버에 올릴 파일

`walky-app/server/` 폴더 전체:

- `index.js`
- `nearbyPresence.js`
- `package.json`
- (`deploy/` 는 참고용, 서버에 없어도 됨)

## 방법 A — SSH (211.47.74.48, 포트 22 열림)

### 1) PC CMD에서 서버로 복사

```cmd
cd /d c:\work\walky-app\server
scp -r index.js nearbyPresence.js package.json walkygom@211.47.74.48:~/walky-api/
```

비밀번호는 **화면에 직접 입력** (채팅에 다시 적지 마세요).

### 2) SSH 접속

```cmd
ssh walkygom@211.47.74.48
```

### 3) 서버에서 실행

```bash
cd ~/walky-api
npm install --production
PORT=3001 node index.js
```

백그라운드 운영:

```bash
npm install -g pm2
PORT=3001 pm2 start index.js --name walky-api
pm2 save
curl http://127.0.0.1:3001/health
```

`deploy/gabia-ssh-setup.sh` 를 같이 올렸다면:

```bash
cd ~/walky-api
bash gabia-ssh-setup.sh
```

### 4) 가비아에서 `/api` 연결

패널에 **리버스 프록시 / URL 프록시**가 있으면:

- 경로: `/api`
- 대상: `http://127.0.0.1:3001`

없으면 고객센터에  
「`walky.co.kr/api/` 를 내부 3001 포트 Node로 프록시 가능한지」 문의.

## 방법 B — FTP만 되는 웹호스팅

- `dogs/` 영상은 FTP로 웹 루트에 업로드 가능
- **Node API는 FTP만으로는 실행 불가** → 가비아 **클라우드/VPS** 또는 SSH 가능 상품 필요

## PC 개발 + 서버 분리

PC `c:\work\walky-app\.env`:

```
EXPO_PUBLIC_WALKY_ORIGIN=https://walky.co.kr
EXPO_PUBLIC_NEARBY_WALKER_API_URL=https://walky.co.kr/api/nearby/presence
```

```cmd
npx expo start --clear
```

## 확인

- `https://walky.co.kr/dogs/corgi/manifest.json`
- `https://walky.co.kr/health` (프록시 설정 후)
- `https://walky.co.kr/api/nearby/presence` (POST, 앱 산책 중)
