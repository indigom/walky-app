# 영상 = 가비아(walky.co.kr) · API = Railway

가비아 **웹호스팅**(Node 불가) + Walky **근처 산책 API** 를 나누는 방법입니다.

**PPT:** `Walky-API-필요구간-정리.pptx` (같은 폴더) — API·배포·**알림(로컬 vs 서버 푸시)**. 재생성: `npm run generate:ppt:api`

| 구분 | 주소 예시 | 올리는 곳 |
|------|-----------|-----------|
| 견종 영상·manifest | `https://walky.co.kr/dogs/corgi/manifest.json` | 가비아 FTP → 웹 루트 `dogs/` |
| 근처 산책 API | `https://xxxx.up.railway.app/api/nearby/presence` | Railway (`server/` 폴더) |

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

### 2-2. GitHub에 `server` 올리기 (처음 한 번)

**방법 A — walky-app 전체 repo**

1. GitHub에 저장소 생성 (예: `walky-app`)
2. PC CMD:

```cmd
cd /d c:\work\walky-app
git init
git add server package.json
git commit -m "Add walky server API"
git branch -M main
git remote add origin https://github.com/본인아이디/walky-app.git
git push -u origin main
```

**방법 B — API만 작은 repo**

`server` 폴더만 복사해 새 repo `walky-api` 로 push 해도 됩니다.

### 2-3. Railway에서 프로젝트 만들기

1. Railway → **New Project** → **Deploy from GitHub repo**
2. 방금 repo 선택
3. 서비스 클릭 → **Settings**
   - **Root Directory**: `server`  ← **중요** (monorepo일 때)
   - **Start Command**: `npm start` (기본값이면 그대로)
4. **Settings → Networking → Generate Domain**  
   예: `walky-api-production.up.railway.app`

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

---

## 요약

- **가비아**: Node 없음 → **파일(dogs)만**
- **Railway**: `server/` → **Node API만**
- **앱**: `.env` 로 두 주소를 각각 지정
