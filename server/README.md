# walky.co.kr 서버 배치 가이드

앱(`walky-app`)과 **분리**해서 서버에 올립니다. Vercel `api/` 폴더는 더 이상 사용하지 않습니다.

## 개발 PC + 서버 분리 (권장)

| 어디 | 무엇 |
|------|------|
| **내 PC** | `npx expo start` — React Native 앱만 실행·수정 |
| **walky.co.kr** | `dogs/` 영상·manifest + (가능하면) Node API |

PC 프로젝트 루트에 `.env`:

```
EXPO_PUBLIC_WALKY_ORIGIN=https://walky.co.kr
EXPO_PUBLIC_NEARBY_WALKER_API_URL=https://walky.co.kr/api/nearby/presence
```

앱은 로컬에서 돌고, manifest·mp4·근처 산책 API만 서버를 호출합니다.  
서버에 앱 전체를 올릴 필요는 없습니다.

## PPT 자료 (`server/deploy/`)

| 파일 | 내용 |
|------|------|
| **`Walky-API-필요구간-정리.pptx`** | API·배포 + **알림(로컬 vs 서버 푸시)**·푸시 로드맵 |
| **`Walky-프로필사진-업로드API.pptx`** | 프로필·닉네임 SFTP 업로드 설계 |

재생성 (프로젝트 루트):

```bash
npm install
npm run generate:ppt:api
npm run generate:ppt:profile
```

## 서버 디렉터리 구조 (권장)

```
/var/www/walky.co.kr/          ← nginx 정적 루트 (document root)
├── dogs/
│   ├── corgi/
│   │   ├── manifest.json
│   │   └── *.mp4
│   ├── shiba/
│   └── retriever/
└── rewards/                   ← 리워드 영상 (선택)

/opt/walky-api/                ← Node API (이 repo의 server/ 폴더)
├── index.js
├── nearbyPresence.js
├── nearbySocial.js
├── package.json
└── node_modules/
```

| 경로 | 내용 |
|------|------|
| `/var/www/walky.co.kr/dogs/` | 예전 `walky-asset` 의 `dogs/` 내용 (HTTPS로 제공) |
| `/opt/walky-api/` | **이 폴더 전체** (`walky-app/server/` 복사) |

앱이 호출하는 URL:

- 에셋: `https://walky.co.kr/dogs/{breed}/manifest.json`
- API: `https://walky.co.kr/api/nearby/presence` (또는 Railway)
- 노크·대화: `/api/nearby/social`
- **프로필:** `POST /api/profile` (닉네임 + 사진 또는 `profilePhotoUrl`)

### 프로필 사진 저장 (가비아 SFTP 차단 시)

**`server/deploy/README-PROFILE-STORAGE.md`** — R2(S3), 가비아 HTTPS, 앱 직접 업로드.

| `PROFILE_STORAGE` | 용도 |
|-------------------|------|
| `s3` | Cloudflare R2 등 (Railway 권장) |
| `gabia-http` | Railway → `walky.co.kr` HTTPS 업로드 API |
| `sftp` | PC FileZilla만 되고 Railway는 막힐 때 비권장 |

진단: `GET /api/admin/storage-test` (헤더 `x-walky-admin-key`)

운영자 목록 예:

```bash
curl -H "x-walky-admin-key: YOUR_KEY" https://YOUR-RAILWAY.up.railway.app/api/admin/profiles
```

## API 설치 (Linux)

```bash
cd /opt/walky-api
npm install --production
PORT=3001 node index.js
```

운영에서는 **pm2** 등 사용:

```bash
pm2 start index.js --name walky-api
pm2 save
```

## nginx 예시

```nginx
server {
    listen 443 ssl http2;
    server_name walky.co.kr;

    # SSL 인증서 설정 (certbot 등) ...

    root /var/www/walky.co.kr;

    location /dogs/ {
        try_files $uri $uri/ =404;
    }

    location /rewards/ {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

헬스체크: `curl https://walky.co.kr/health` → `{"ok":true,"service":"walky-api"}`

## api 폴더는 어디에?

| 위치 | 용도 |
|------|------|
| **`walky-app/server/`** (레포) | 소스·Git 관리, 서버에 `/opt/walky-api` 로 배포 |
| **`walky-app/api/`** | Vercel용 **삭제해도 됨** (레거시) |
| **서버 `/opt/walky-api/`** | 실제로 돌아가는 Node 프로세스 |

정적 파일과 API는 **같은 도메인**(`walky.co.kr`)이면 앱 설정 변경 없이 동작합니다.

## 주의

- API는 현재 **메모리 저장**입니다. 서버 재시작·다중 인스턴스 시 Redis 등으로 교체하세요.
- HTTPS 필수 (앱은 `https://walky.co.kr` 기준).
