# 영상 = 가비아(walky.co.kr) · API = Railway

가비아 **웹호스팅**(Node 불가) + Walky **근처 산책 API** 를 나누는 방법입니다.

**PPT:** `Walky-API-필요구간-정리.pptx` (같은 폴더) — API·배포·**알림(로컬 vs 서버 푸시)**. 재생성: `npm run generate:ppt:api`

| 구분 | 주소 예시 | 올리는 곳 |
|------|-----------|-----------|
| 견종 영상·manifest | `https://walky.co.kr/dogs/corgi/manifest.json` | 가비아 FTP → 웹 루트 `dogs/` |
| 근처 산책 API | `https://xxxx.up.railway.app/api/nearby/presence` | Railway (`server/` 폴더) |
| 프로필 사진 | `https://pub-….r2.dev/profiles/w_….jpg` | **Cloudflare R2** (가비아 SFTP 차단 시) → [`README-R2.md`](./README-R2.md) |

---

## 1. 가비아 — `dogs` 만 (이미 하시던 것)

1. My가비아 → 호스팅 → **FTP / 파일관리자**
2. 웹 문서 루트(`www`, `public_html` 등) 아래에 `dogs` 폴더 업로드  
   (`walky-asset` 의 `dogs/corgi`, `dogs/shiba` …)
3. 브라우저에서 확인:  
   `https://walky.co.kr/dogs/corgi/manifest.json`

SSL(HTTPS)은 가비아 패널에서 `walky.co.kr` 인증서 적용.

---

## 2. Railway — API 배포

### 2-1. 준비

- [railway.app](https://railway.app) 가입 (GitHub 연동 권장)
- PC에 **Git** 설치
- `walky-app/server/` 안에 다음 3파일이 있는지 확인:  
  `index.js`, `nearbyPresence.js`, `package.json`

### 2-2. GitHub — **완료됨**

| 항목 | 값 |
|------|-----|
| 저장소 | https://github.com/indigom/walky-app |
| 브랜치 | `master` |
| API 소스 | `server/` (`index.js`, `nearbyPresence.js`, `nearbySocial.js`, `railway.toml`) |

추가 push만 하면 Railway가 자동으로 재배포합니다 (GitHub 연동 후).

### 2-3. Railway에서 프로젝트 만들기 (대시보드)

1. [railway.app/new/github](https://railway.app/new/github) → GitHub 연동(처음이면)
2. **`indigom/walky-app`** 선택 → Deploy
3. 생성된 **서비스** 클릭 → **Settings**
   - **Root Directory**: `server`  ← **필수** (monorepo)
   - **Start Command**: `npm start` (`server/railway.toml` 과 동일)
4. **Settings → Networking → Generate Domain**  
   예: `walky-api-production.up.railway.app`
5. **Deployments** 탭에서 빌드·실행 로그가 초록인지 확인

**CLI로 할 때** (GitHub 자동 배포 대신 직접 업로드):

```powershell
cd c:\work\walky-app\server
.\deploy\railway-setup.ps1
```

### 2-4. 동작 확인

브라우저 또는 CMD:

```cmd
curl https://walky-api-production.up.railway.app/health
```

`{"ok":true,"service":"walky-api"}` 가 나오면 성공.

API 주소 (앱에서 쓸 URL):

```
https://walky-api-production.up.railway.app/api/nearby/presence
```

(Railway가 준 도메인으로 바꿔 넣기)

---

## 3. PC 앱 설정 (`.env`)

`c:\work\walky-app\.env` 파일:

```env
EXPO_PUBLIC_WALKY_ORIGIN=https://walky.co.kr
EXPO_PUBLIC_NEARBY_WALKER_API_URL=https://walky-api-production.up.railway.app/api/nearby/presence
```

Railway 도메인을 **본인 것**으로 교체.

Expo 재시작:

```cmd
cd /d c:\work\walky-app
npx expo start --clear
```

---

## 4. 앱에서 확인

1. 홈 → **근처 산책자 알림** 켜기 (성별 입력되어 있어야 함)
2. 산책 시작 → GPS 잡힌 뒤 API 호출
3. Railway 대시보드 → **Deployments → Logs** 에 요청이 보이는지 확인

---

## 5. (선택) 나중에 `api.walky.co.kr` 로 바꾸기

1. Railway Networking에서 **Custom Domain** 추가: `api.walky.co.kr`
2. 가비아 DNS에 **CNAME**  
   - 호스트: `api`  
   - 값: Railway가 안내하는 주소
3. `.env` 수정:

```env
EXPO_PUBLIC_NEARBY_WALKER_API_URL=https://api.walky.co.kr/api/nearby/presence
```

---

## 6. Railway 무료 한도

- 소규모 테스트에는 보통 충분
- 사용량·슬립 정책은 Railway 요금제 확인
- API는 **메모리 저장** — 재시작 시 근처 유저 목록이 초기화됨 (테스트용으로는 OK)

---

## 7. 문제 해결

| 증상 | 확인 |
|------|------|
| Railway 빌드 실패 | Root Directory = `server` 인지 |
| `/health` 404 | 도메인 뒤에 `/health` 정확히 |
| 앱만 API 실패 | `.env` URL, `npx expo start --clear` |
| manifest 안 열림 | 가비아 `dogs/` 경로·HTTPS |
| **`/health`에 Walky 앱 화면** | Root Directory가 비어 있음 → 루트(Expo) 배포됨 → `server`로 변경 후 Redeploy |
| **Application failed to respond** | 아래 「502 / failed to respond」 참고 |

### 502 / Application failed to respond

Railway가 **프로세스에 연결하지 못할 때** 나옵니다. **Deployments → 최신 배포 → View Logs** (또는 **Deploy Logs** / **HTTP Logs**)를 먼저 봅니다.

**로그에 이렇게 나오면 성공:**

```text
Walky API listening on http://0.0.0.0:XXXX
```

**Settings 다시 확인:**

| 항목 | 값 |
|------|-----|
| Source Repo | `indigom/walky-app` ( `/server` 붙이지 않음 ) |
| **Root Directory** | `server` |
| **Start Command** | `node index.js` (또는 비움 — `server/Dockerfile` 사용) |
| Variables `PORT` | **직접 넣지 않음** (Railway가 자동 주입) |

**Target Port (502가 계속될 때):**

1. Deploy Logs에서 `Walky API listening on http://0.0.0.0:XXXX` 의 **XXXX** 확인 (8080·8081 등 **배포마다 다를 수 있음**)
2. **Settings → Networking** → 도메인 **Target Port** = **그 XXXX와 동일**
3. 안 되면 Target Port를 **비우거나 Auto**로 두고 Redeploy (Dockerfile 배포 시 자동 맞춤되는 경우 많음)
4. 도메인 `walky-app-production-….railway.app` 이 **API 서비스**(로그에 Walky API)에 붙었는지 확인 — 다른 프로젝트(`truthful-elegance` 등)에 붙으면 502

**자주 하는 실수**

- Root Directory = `server` 인데 Start Command를 `expo start` 로 둠 → 크래시
- Root Directory 비움 → 예전처럼 Expo가 떠서 `/health`가 앱 화면
- 도메인이 **옛 서비스**(Expo)에 연결됨 → 서비스 하나만 두고 API 서비스에 Generate Domain

**수정 후:** Deployments → **Redeploy** → 1~2분 뒤 `/health` 재시도.

공식 문서: [Application Failed to Respond](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond)

---

## 요약

- **가비아**: Node 없음 → **파일(dogs)만**
- **Railway**: `server/` → **Node API만**
- **앱**: `.env` 로 두 주소를 각각 지정
